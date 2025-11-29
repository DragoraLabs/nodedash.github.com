const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const upload = multer({ dest: 'storage' });
app.use(express.json());
app.use(express.static(__dirname));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// PAGES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/files', (req, res) => res.sendFile(path.join(__dirname, 'filemanager.html')));
app.get('/setup-minecraft', (req, res) => res.sendFile(path.join(__dirname, 'setup.html')));

// PLUGINS
require('./plugins/uptime')(app);
require('./plugins/minecraft')(app);

// FILE MANAGER API
app.get('/api/files/list', async (req, res) => {
  const dir = req.query.dir || '/';
  const full = path.join(__dirname, 'storage', dir === '/' ? '' : dir);
  try {
    const files = await fs.readdir(full);
    const list = await Promise.all(files.map(async name => {
      const p = path.join(full, name);
      const stat = await fs.stat(p);
      return {
        name,
        path: dir === '/' ? `/${name}` : `${dir}/${name}`,
        isDir: stat.isDirectory(),
        size: stat.isDirectory() ? '-' : (stat.size / 1024 / 1024).toFixed(2) + ' MB',
        mtime: stat.mtime
      };
    }));
    res.json(list.sort((a, b) => b.isDir - a.isDir));
  } catch { res.json([]); }
});

app.post('/api/files/upload', upload.array('files'), (req, res) => {
  res.json({ ok: true });
});

app.post('/api/files/delete', async (req, res) => {
  await fs.remove(path.join(__dirname, 'storage', req.body.path));
  res.json({ ok: true });
});

// STATS
setInterval(async () => {
  try {
    const [l, m, d] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]);
    io.emit('stats', {
      cpu: l.currentLoad.toFixed(1),
      ram: ((m.used / m.total) * 100).toFixed(1),
      ramTotal: (m.total / 1024 ** 3).toFixed(1),
      disk: d[0] ? ((d[0].used / d[0].size) * 100).toFixed(1) : 0,
      diskTotal: d[0] ? (d[0].size / 1024 ** 3).toFixed(1) : 0
    });
  } catch (e) { }
}, 2000);

server.listen(3000, () => console.log('LIVE → http://localhost:3000'));
