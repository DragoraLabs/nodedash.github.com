// plugins/minecraft.js — FINAL VERSION (works with new server.js)
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const { execSync, spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'minecraft_server');
const PLUGINS_DIR = path.join(SERVER_DIR, 'plugins');
const MODS_DIR = path.join(SERVER_DIR, 'mods');
const CONFIG_FILE = path.join(ROOT, 'minecraft_config.json');
const DOCKERFILE = path.join(ROOT, 'Dockerfile');

fs.ensureDirSync(SERVER_DIR);
fs.ensureDirSync(PLUGINS_DIR);
fs.ensureDirSync(MODS_DIR);

let config = { type: null, version: null };
if (fs.existsSync(CONFIG_FILE)) {
  try { config = fs.readJsonSync(CONFIG_FILE); } catch { }
}

// THIS IS THE CORRECT EXPORT FOR NEW server.js
module.exports = (app) => {
  // Dashboard API
  app.get('/api/mc/installed', async (req, res) => {
    const plugins = await getItems(PLUGINS_DIR);
    const mods = await getItems(MODS_DIR);
    res.json([...plugins, ...mods]);
  });

  app.get('/api/mc/status', (req, res) => {
    const running = !!execSync('docker ps --filter name=^/minecraft$ --format "{{.Names}}" 2>/dev/null || true').toString().trim();
    res.json({ running });
  });

  app.post('/api/mc/install-plugin', async (req, res) => {
    try { await installFromModrinth(req.body.id, PLUGINS_DIR); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/mc/install-mod', async (req, res) => {
    try { await installFromModrinth(req.body.id, MODS_DIR); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/mc/remove', async (req, res) => {
    await fs.remove(path.join(PLUGINS_DIR, req.body.name));
    await fs.remove(path.join(MODS_DIR, req.body.name));
    res.json({ ok: true });
  });

  app.get('/api/mc/start', (req, res) => {
    if (!config.type) return res.status(400).json({ error: 'Not configured' });
    writeDockerfile();
    execSync('docker build -t mc-server .', { stdio: 'ignore' });
    spawn('docker', ['run', '-d', '--name', 'minecraft', '-p', '25565:25565', '-e', 'EULA=TRUE', '-e', 'MEMORY=4G', '-v', `${SERVER_DIR}:/data`, 'mc-server'], { detached: true, stdio: 'ignore' }).unref();
    res.json({ ok: true });
  });

  app.get('/api/mc/stop', (req, res) => {
    execSync('docker stop minecraft 2>/dev/null || true; docker rm minecraft 2>/dev/null || true', { stdio: 'ignore' });
    res.json({ ok: true });
  });

  // One-time setup page
  app.get('/setup-minecraft', (req, res) => {
    if (config.type) return res.redirect('/');
    res.send(setupHTML());
  });

  app.post('/api/mc/setup', (req, res) => {
    config = { type: req.body.type, version: req.body.version || '1.21.3' };
    fs.writeJsonSync(CONFIG_FILE, config);
    writeDockerfile();
    res.json({ ok: true });
  });
};

async function getItems(dir) {
  if (!await fs.pathExists(dir)) return [];
  const files = await fs.readdir(dir);
  return Promise.all(files.filter(f => f.endsWith('.jar')).map(async f => {
    const s = (await fs.stat(path.join(dir, f))).size / 1024 / 1024;
    return { name: f, size: s < 0.01 ? '<0.01 MB' : s.toFixed(2) + ' MB' };
  }));
}

async function installFromModrinth(id, dir) {
  const versions = await (await fetch(`https://api.modrinth.com/v2/project/${id}/version`)).json();
  const v = versions.find(v => v.game_versions.includes(config.version));
  if (!v) throw new Error('No compatible version');
  const file = v.files.find(f => f.primary) || v.files[0];
  const res = await fetch(file.url);
  await require('stream').pipeline(res.body, fs.createWriteStream(path.join(dir, file.filename)));
}

function writeDockerfile() {
  const content = `FROM eclipse-temurin:21-jdk-alpine
RUN apk add --no-cache curl jq tini
WORKDIR /data
VOLUME /data
EXPOSE 25565
ENTRYPOINT ["/sbin/tini","--"]
CMD sh -c '
  echo "eula=true">eula.txt
  ${config.type === 'paper' ? `
    [ -f paper.jar ] || { echo "Downloading Paper ${config.version}..."; BUILD=$(curl -s https://api.papermc.io/v2/projects/paper/versions/${config.version}|jq -r ".builds[-1]"); curl -fsSL -o paper.jar https://api.papermc.io/v2/projects/paper/versions/${config.version}/builds/$BUILD/downloads/paper-${config.version}-$BUILD.jar; }
    java -Xmx$\{MEMORY:-4G\} -jar paper.jar --nogui
  `: 'fabric' === config.type ? `
    [ -f fabric-server.jar ] || { echo "Installing Fabric..."; curl -Lj https://meta.fabricmc.net/v2/versions/loader/${config.version}/0.16.5/1.0.1/server/jar -o fabric-server.jar; java -jar fabric-server.jar nogui --install; }
    java -Xmx$\{MEMORY:-4G\} -jar fabric-server.jar nogui
  `: 'java -Xmx$\{MEMORY:-4G\} -jar server.jar --nogui'}
'
COPY . /data`;
  fs.writeFileSync(DOCKERFILE, content);
}

function setupHTML() {
  return `<!DOCTYPE html><html class="h-full bg-gray-900 text-white"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Setup - NodeDash</title><script src="https://cdn.tailwindcss.com"></script></head><body class="h-screen flex items-center justify-center"><div class="bg-gray-800 p-16 rounded-3xl shadow-2xl max-w-2xl"><h1 class="text-6xl font-bold mb-12 text-center">Minecraft Setup</h1><div class="space-y-8"><div class="grid grid-cols-2 gap-8"><label class="bg-gray-700 p-12 rounded-3xl text-center cursor-pointer"><input type="radio" name="type" value="paper" checked class="hidden"><div class="text-8xl mb-4">Paper</div><p>Plugins</p></label><label class="bg-gray-700 p-12 rounded-3xl text-center cursor-pointer"><input type="radio" name="type" value="fabric" class="hidden"><div class="text-8xl mb-4">Fabric</div><p>Mods</p></label></div><select id="ver" class="w-full p-6 bg-gray-700 rounded-2xl text-2xl"><option>1.21.3</option><option>1.21.1</option><option>1.20.6</option></select><button onclick="fetch('/api/mc/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:document.querySelector('input[name=type]:checked').value,version:document.getElementById('ver').value})}).then(()=>location.href='/')" class="w-full py-8 bg-green-600 hover:bg-green-500 rounded-3xl text-4xl font-bold">Create Server</button></div></div></body></html>`;
}
