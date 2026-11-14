const $ = id => document.getElementById(id);
const C = '0,217,255';
const pad = n => String(n).padStart(2, '0');
const rnd = (a, b) => a + Math.random() * (b - a);
const walk = (v, s, lo = 5, hi = 95) => Math.min(hi, Math.max(lo, v + rnd(-s, s)));

/* ---------- Clock, date, uptime ---------- */
const start = Date.now();
function tick() {
  const d = new Date();
  $('clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  $('date').textContent = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const s = Math.floor((Date.now() - start) / 1000);
  $('up').textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  const h = d.getHours();
  $('hello').textContent = (h < 12 ? 'GOOD MORNING' : h < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING') + ', SIR';
}
setInterval(tick, 1000); tick();

/* ---------- Bars (system + data) ---------- */
function makeBar(parent, label) {
  const r = document.createElement('div');
  r.className = 'row';
  r.innerHTML = `<span>${label}</span><div class="track"><div class="fill"></div></div><span>0%</span>`;
  parent.appendChild(r);
  const f = r.querySelector('.fill'), t = r.lastElementChild;
  return v => { f.style.width = v + '%'; t.textContent = Math.round(v) + '%'; };
}
const sys = { cpu: makeBar($('sys'), 'CPU'), ram: makeBar($('sys'), 'RAM'), swap: makeBar($('sys'), 'SWAP'), bat: makeBar($('sys'), 'BATT') };
const dataBars = ['ASIA', 'EUROPE', 'AMERICA', 'AFRICA', 'OCEANIA'].map(n => makeBar($('bars'), n));
let cpu = 30, ram = 50, swap = 20;
$('cores').textContent = navigator.hardwareConcurrency || '--';

navigator.getBattery?.().then(b => {
  const u = () => sys.bat(b.level * 100);
  u(); b.addEventListener('levelchange', u);
});
if (!navigator.getBattery) sys.bat(100);

setInterval(() => {
  cpu = walk(cpu, 12); swap = walk(swap, 4);
  ram = performance.memory ? performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100 + 30 : walk(ram, 5);
  sys.cpu(cpu); sys.ram(Math.min(ram, 98)); sys.swap(swap);
  dataBars.forEach(f => f(rnd(25, 95)));
  $('ftemp').textContent = Math.round(35 + cpu * 0.4) + '°C';
  $('ffan').textContent = Math.round(900 + cpu * 14) + ' RPM';
  $('count').textContent = (232425 + Math.floor(rnd(0, 900))).toLocaleString();
  $('growth').textContent = '▲ ' + Math.round(rnd(120, 180)) + '%';
}, 1500);

/* ---------- Weather (browser location + open-meteo) ---------- */
const codes = { 0: 'CLEAR SKY', 1: 'MOSTLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST', 45: 'FOG', 61: 'RAIN', 63: 'RAIN', 65: 'HEAVY RAIN', 80: 'SHOWERS', 95: 'THUNDERSTORM' };
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(async p => {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}&current_weather=true`);
      const w = (await r.json()).current_weather;
      $('temp').textContent = Math.round(w.temperature) + '°C';
      $('wdesc').textContent = (codes[w.weathercode] || 'VARIABLE') + ' · WIND ' + Math.round(w.windspeed) + ' KM/H';
    } catch { $('wdesc').textContent = 'WEATHER OFFLINE'; }
  }, () => $('wdesc').textContent = 'LOCATION ACCESS DENIED');
} else $('wdesc').textContent = 'NO GEOLOCATION';

/* ---------- Canvas helpers ---------- */
function fit(c) {
  const d = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  c.width = w * d; c.height = h * d;
  const g = c.getContext('2d'); g.scale(d, d);
  return { g, w, h };
}
const land = (lat, lon) => Math.sin(lat * 3.1) + Math.cos(lon * 2.3 + lat * 1.7) + Math.sin(lon * 1.3 - lat) > 0.9;

/* ---------- Globe ---------- */
const globe = $('globe');
let G = fit(globe), rot = 0;
const pts = [];
for (let la = -80; la <= 80; la += 4) for (let lo = -180; lo < 180; lo += 4) if (land(la * Math.PI / 180, lo * Math.PI / 180)) pts.push([la * Math.PI / 180, lo * Math.PI / 180]);

function drawGlobe() {
  const { g, w, h } = G, r = Math.min(w, h) / 2 - 4, cx = w / 2, cy = h / 2;
  g.clearRect(0, 0, w, h);
  const bg = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
  bg.addColorStop(0, 'rgba(0,90,160,.35)'); bg.addColorStop(1, 'rgba(0,20,50,.6)');
  g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.strokeStyle = `rgba(${C},.9)`; g.lineWidth = 1.5; g.stroke();
  g.strokeStyle = `rgba(${C},.18)`; g.lineWidth = 1;
  for (let lo = 0; lo < 6.28; lo += Math.PI / 9) {           // meridians
    g.beginPath();
    for (let la = -1.57; la <= 1.57; la += 0.1) {
      const x = Math.cos(la) * Math.sin(lo + rot), z = Math.cos(la) * Math.cos(lo + rot);
      if (z > 0) g.lineTo(cx + x * r, cy - Math.sin(la) * r); else g.moveTo(0, 0);
    }
    g.stroke();
  }
  for (let la = -1.2; la <= 1.2; la += Math.PI / 9) {        // parallels
    g.beginPath(); g.ellipse(cx, cy - Math.sin(la) * r, Math.cos(la) * r, Math.cos(la) * r * 0.02, 0, 0, 7); g.stroke();
  }
  g.fillStyle = `rgba(${C},.9)`;                             // land dots
  for (const [la, lo] of pts) {
    const x = Math.cos(la) * Math.sin(lo + rot), z = Math.cos(la) * Math.cos(lo + rot);
    if (z > 0) g.fillRect(cx + x * r, cy - Math.sin(la) * r, 1.8, 1.8);
  }
  rot += 0.004;
  requestAnimationFrame(drawGlobe);
}
drawGlobe();

/* ---------- World map ---------- */
const map = $('map'); let M = fit(map);
const blips = Array.from({ length: 6 }, () => [rnd(0.1, 0.9), rnd(0.2, 0.8), rnd(0, 6)]);
function drawMap() {
  const { g, w, h } = M; g.clearRect(0, 0, w, h);
  for (let y = 0; y < h; y += 5) for (let x = 0; x < w; x += 5) {
    if (land((0.5 - y / h) * 3, (x / w - 0.5) * 6.28)) { g.fillStyle = `rgba(${C},.55)`; g.fillRect(x, y, 2, 2); }
  }
  const t = Date.now() / 600;
  for (const [bx, by, ph] of blips) {
    g.strokeStyle = `rgba(${C},${1 - ((t + ph) % 3) / 3})`;
    g.beginPath(); g.arc(bx * w, by * h, ((t + ph) % 3) * 6, 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(bx * w - 1, by * h - 1, 3, 3);
  }
  requestAnimationFrame(drawMap);
}
drawMap();

/* ---------- Network line graph ---------- */
const lc = $('line'); let L = fit(lc);
const data = Array(50).fill(50);
setInterval(() => { data.push(walk(data.at(-1), 18, 8, 92)); data.shift(); drawLine(); }, 400);
function drawLine() {
  const { g, w, h } = L; g.clearRect(0, 0, w, h);
  const step = w / (data.length - 1);
  const path = () => { g.beginPath(); data.forEach((v, i) => g[i ? 'lineTo' : 'moveTo'](i * step, h - v / 100 * h)); };
  path(); g.lineTo(w, h); g.lineTo(0, h); g.fillStyle = `rgba(${C},.18)`; g.fill();
  path(); g.strokeStyle = `rgb(${C})`; g.lineWidth = 1.5; g.stroke();
}

/* ---------- Resize ---------- */
addEventListener('resize', () => { G = fit(globe); M = fit(map); L = fit(lc); });

/* ---------- Status text flicker ---------- */
const msgs = ['ALL SYSTEMS NOMINAL', 'SCANNING NETWORK...', 'UPLINK SECURE', 'ANALYZING DATA...', 'STANDING BY'];
setInterval(() => $('status').textContent = msgs[Math.floor(Math.random() * msgs.length)], 4000);
