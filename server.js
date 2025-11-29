const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname));

// Auto redirect to setup if no config
app.get('/', (req, res) => {
  if (!fs.existsSync('minecraft_config.json')) return res.redirect('/setup');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/setup', (req, res) => res.sendFile(path.join(__dirname, 'setup.html')));
app.get('/files', (req, res) => res.sendFile(path.join(__dirname, 'filemanager.html')));
app.get('/plugin/uptime', (req, res) => res.sendFile(path.join(__dirname, 'uptime.html')));

// Minecraft API
app.post('/api/setup', (req, res) => {
  fs.writeJsonSync('minecraft_config.json', req.body);
  fs.writeFileSync('Dockerfile', `FROM eclipse-temurin:21-jdk-alpine
RUN apk add --no-cache curl jq tini
WORKDIR /data
VOLUME /data
EXPOSE 25565
ENTRYPOINT ["/sbin/tini","--"]
CMD sh -c '
echo "eula=true">eula.txt
if [ ! -f paper.jar ]; then
  BUILD=$(curl -s https://api.papermc.io/v2/projects/paper/versions/${req.body.version}|jq -r ".builds[-1]")
  curl -fsSL -o paper.jar https://api.papermc.io/v2/projects/paper/versions/${req.body.version}/builds/$BUILD/downloads/paper-${req.body.version}-$BUILD.jar
fi
java -Xmx4G -jar paper.jar --nogui
'
COPY minecraft_server /data`);
  res.json({ok:true});
});

app.get('/api/status', (req, res) => {
  try {
    const running = execSync('docker ps --filter name=^minecraft$ --format "{{.Names}}"').toString().trim();
    res.json({running: !!running});
  } catch { res.json({running: false}); }
});

app.get('/api/start', (req, res) => {
  execSync('docker build -t mc .');
  execSync('docker run -d --name minecraft -p 25565:25565 -v minecraft_server:/data mc');
  res.json({ok:true});
});

app.get('/api/stop', (req, res) => {
  execSync('docker stop minecraft || true; docker rm minecraft || true');
  res.json({ok:true});
});

// Stats
setInterval(async () => {
  try {
    const [load, mem] = await Promise.all([si.currentLoad(), si.mem()]);
    io.emit('stats', {
      cpu: load.currentLoad.toFixed(1),
      ram: ((mem.used/mem.total)*100).toFixed(1),
      ramTotal: (mem.total/1024**3).toFixed(1)
    });
  } catch {}
}, 2000);

server.listen(3000, () => console.log('LIVE → http://localhost:3000'));
