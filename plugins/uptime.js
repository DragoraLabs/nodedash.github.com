// plugins/uptime.js  —  $500 PREMIUM UPTIME PAGE
module.exports = (app) => {
  app.get('/plugin/uptime', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html class="h-full bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Uptime • NodeDash</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet"stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .glass { backdrop-filter: blur(16px); background: rgba(20,20,40,0.6); border: 1px solid rgba(120,100,255,.3); }
    .glow { box-shadow: 0 0 60px rgba(120,100,255,.4); }
  </style>
</head>
<body class="h-screen overflow-hidden">

  <!-- Background magic -->
  <div class="fixed inset-0 pointer-events-none">
    <div class="absolute inset-0 bg-gradient-to-t from-purple-900/60 to-transparent"></div>
    <div class="absolute top-10 left-10 w-96 h-96 bg-purple-600 rounded-full blur-3xl blur-3xl opacity-30 animate-pulse"></div>
    <div class="absolute bottom-20 right-20 w-80 h-80 bg-blue-600 rounded-full blur-3xl opacity-25 animate-ping"></div>
  </div>

  <div class="flex h-full relative z-10">
    <!-- Sidebar -->
    <aside class="w-80 glass p-10 border-r border-purple-500/30">
      <h1 class="text-5xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-16">NODEDASH</h1>
      <nav class="space-y-6">
        <a href="/" class="flex items-center gap-5 p-6 rounded-2xl hover:bg-white/10 transition text-xl">Dashboard</a>
        <a href="/files" class="flex items-center gap-5 p-6 rounded-2xl hover:bg-white/10 transition text-xl">File Manager</a>
        <a href="/plugin/uptime" class="flex items-center gap-5 p-6 bg-gradient-to-r from-purple-600/60 rounded-2xl text-xl font-bold glow">Uptime</a>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex items-center justify-center p-12">
      <div class="text-center">
        <div class="mb-16">
          <p class="text-4xl font-light text-gray-400 mb-400 mb-4">Server has been running for</p>
          <div class="text-9xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent" id="uptime">
            00:00:00
          </div>
        </div>

        <div class="glass inline-block px-20 py-12 rounded-3xl glow">
          <p class="text-5xl font-bold text-green-400 flex items-center justify-center gap-6">
            <i class="fas fa-heartbeat animate-pulse text-7xl"></i>
            SERVER IS ALIVE
          </p>
        </div>

        <div class="mt-20 text-2xl text-gray-400">
          Started at <span id="start-time" class="text-cyan-400"></span>
        </div>
      </div>
    </main>
  </div>

  <!-- end flex -->

  <script>
    const start = Date.now();
    const startDate = new Date().toLocaleString();

    document.getElementById('start-time').textContent = startDate;

    setInterval(() => {
      let s = Math.floor((Date.now() - start) / 1000);
      const d = Math.floor(s / 86400);
      s %= 86400;
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      s %= 3600;
      const m = String(Math.floor(s / 60)).padStart(2, '0');
      const sec = String(s % 60).padStart(2, '0');

      document.getElementById('uptime').textContent =
        (d > 0 ? d + 'd ' : '') + h + ':' + m + ':' + sec;
    }, 1000);
  </script>
</body>
</html>
    `);
  });
};
