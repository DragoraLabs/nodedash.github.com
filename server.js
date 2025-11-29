const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { execSync } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

fs.ensureDirSync('minecraft_server');
const upload = multer({ dest: 'minecraft_server' });

app.use(express.json());
app.use(express.static(__dirname));
app.use('/minecraft_server', express.static('minecraft_server'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/files', (req, res) => res.sendFile(path.join(__dirname, 'filemanager.html')));
app.get('/uptime', (req, res) => res.sendFile(path.join(__dirname, 'uptime.html')));

// File Manager API (works on minecraft_server)
app.get('/api/files', async (req, res) => {
  const dir = req.query.dir || '';
  const fullPath = path.join(__dirname, 'minecraft_server', dir);
  try {
    const files = await fs.readdir(fullPath);
    const list = await Promise.all(files.map(async name => {
      const p = path.join(fullPath, name);
      const stat = await fs.stat(p);
      return {
        name,
        path: dir ? `${dir}/${name}` : name,
        isDir: stat.isDirectory(),
        size: stat.isDirectory() ? '-' : (stat.size / 1024 / 1024).toFixed(2) + ' MB',
        mtime: stat.mtime.toLocaleString()
      };
    }));
    res.json(list);
  } catch { res.json([]); }
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  const target = req.body.dir || '';
  for (let file of req.files) {
    const dest = path.join('minecraft_server', target, file.originalname);
    await fs.move(file.path, dest, { overwrite: true });
  }
  res.json({ ok: true });
});

app.post('/api/delete', async (req, res) => {
  await fs.remove(path.join('minecraft_server', req.body.path));
  res.json({ ok: true });
});

app.post('/api/rename', async (req, res) => {
  const oldP = path.join('minecraft_server', req.body.old);
  const newP = path.join('minecraft_server', req.body.new);
  await fs.rename(oldP, newP);
  res.json({ ok: true });
});

// Minecraft Control
app.get('/api/mc/start', (req, res) => {
  execSync('docker build -t papermc .');
  execSync('docker stop minecraft || true; docker rm minecraft || true');
  execSync('docker run -d --name minecraft -p 25565:25565 -e EULA=TRUE -e MEMORY=4G -v minecraft_server:/data papermc');
  res.json({ ok: true });
});

app.get('/api/mc/stop', (req, res) => {
  execSync('docker stop minecraft || true; docker rm minecraft || true');
  res.json({ ok: true });
});

app.get('/api/mc/status', (req, res) => {
  const running = !!execSync('docker ps --filter name=minecraft --format "{{.Names}}" || true').toString().trim();
  res.json({ running });
});

// System stats
setInterval(async () => {
  try {
    const [load, mem, disk] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]);
    io.emit('stats', {
      cpu: load.currentLoad.toFixed(1),
      ram: ((mem.used / mem.total) * 100).toFixed(1),
      ramTotal: (mem.total / 1024 ** 3).toFixed(1),
      disk: disk[0] ? ((disk[0].used / disk[0].size) * 100).toFixed(1) : 0,
      diskTotal: disk[0] ? (disk[0].size / 1024 ** 3).toFixed(1) : 0
    });
  } catch { }
}, 2000);

server.listen(3000, () => console.log('READY → http://localhost:3000'));
