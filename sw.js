/* ==================================================================
   阿蛋西语 · Service Worker（离线优先 + 缓存加速）
   作用：首次联网访问后，把 index.html / data.js / daily_vocab.js /
        sentence_patterns.js 全部缓存到本地；之后打开即时、可离线，
        彻底消除「每次重下 3.73MB」与「弱网下无网络打不开」。
   安全原则：绝不破坏在线行为；任何缓存异常都静默回退到网络。
   ================================================================== */
var SW_CACHE = 'ade-shell-v1';          // 改 data.js / index.html 后请把 v1 改成 v2… 强制刷新缓存
var SHELL = [
  './',
  'index.html',
  'data.js',
  'daily_vocab.js',
  'sentence_patterns.js'
];

self.addEventListener('install', function (e) {
  // 预缓存「外壳」（小文件），data.js 体积大，放到首次成功加载时再补缓存，
  // 避免安装阶段一次性拉 3.73MB 超时导致 SW 安装失败。
  e.waitUntil(
    caches.open(SW_CACHE).then(function (c) {
      return c.addAll(['./', 'index.html', 'daily_vocab.js', 'sentence_patterns.js']).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SW_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = req.url;

  // 仅处理同源静态资源，跨域（在线 TTS 音频等）一律放行，不拦截
  if (url.indexOf(self.location.origin) !== 0) return;

  // 导航请求（打开页面）：网络优先，失败回退缓存壳 → 离线也能开首页
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match('index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  // 静态资源（含 data.js）：缓存优先，命中即秒开且离线可用；
  // 未命中走网络，成功则写入缓存（首次加载 data.js 后自动补缓存）
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(SW_CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
        }
        return res;
      }).catch(function () {
        // 真正离线且未缓存：交还给浏览器默认错误处理（加载器会友好提示）
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
