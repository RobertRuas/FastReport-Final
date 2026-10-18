// Fotos de exemplo desenhadas no próprio telemóvel (o protótipo não precisa de rede).
// Imitam fotos de inspeção: torres, betão, ancoragens, flanges, fissuras.

function rng(seed) {
  let s = (seed * 2654435761) % 4294967296;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function noise(ctx, w, h, r, amount, alpha) {
  for (let i = 0; i < amount; i++) {
    const v = Math.floor(r() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
}

function sky(ctx, w, h, r) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const hue = 200 + r() * 20;
  g.addColorStop(0, `hsl(${hue},${55 + r() * 20}%,${45 + r() * 10}%)`);
  g.addColorStop(1, `hsl(${hue},40%,${78 + r() * 10}%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(r() * w, r() * h * 0.5, 60 + r() * 140, 18 + r() * 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function concrete(ctx, w, h, r) {
  const base = 150 + r() * 50;
  ctx.fillStyle = `rgb(${base},${base - 4},${base - 10})`;
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, r, 9000, 0.12);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 2;
  const step = 180 + r() * 120;
  for (let y = step * r(); y < h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

function crack(ctx, w, h, r, width = 3) {
  ctx.strokeStyle = 'rgba(25,20,18,0.85)';
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  let x = w * (0.2 + r() * 0.2), y = h * (0.1 + r() * 0.2);
  ctx.beginPath(); ctx.moveTo(x, y);
  for (let i = 0; i < 40; i++) {
    x += (r() - 0.3) * 30; y += r() * 22;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function tower(ctx, w, h, r) {
  sky(ctx, w, h, r);
  const gy = h * (0.72 + r() * 0.12);
  ctx.fillStyle = `hsl(${80 + r() * 40},${30 + r() * 20}%,${28 + r() * 12}%)`;
  ctx.fillRect(0, gy, w, h - gy);
  noise(ctx, w, h - gy, r, 2000, 0.08);
  const cx = w * (0.35 + r() * 0.3);
  const top = h * (0.12 + r() * 0.1);
  ctx.fillStyle = '#f4f5f6';
  ctx.beginPath();
  ctx.moveTo(cx - 10, top); ctx.lineTo(cx + 10, top);
  ctx.lineTo(cx + 26, gy); ctx.lineTo(cx - 26, gy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(cx, top, 16, gy - top);
  ctx.fillStyle = '#e9eaec';
  ctx.fillRect(cx - 14, top - 16, 52, 24);
  const a = r() * Math.PI * 2;
  ctx.strokeStyle = '#f7f7f7'; ctx.lineCap = 'round'; ctx.lineWidth = 9;
  for (let i = 0; i < 3; i++) {
    const ang = a + (i * Math.PI * 2) / 3;
    ctx.beginPath(); ctx.moveTo(cx - 16, top - 4);
    ctx.lineTo(cx - 16 + Math.cos(ang) * 200, top - 4 + Math.sin(ang) * 200);
    ctx.stroke();
  }
}

function anchors(ctx, w, h, r) {
  concrete(ctx, w, h, r);
  const cols = 3 + Math.floor(r() * 3), rows = 2 + Math.floor(r() * 2);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = (w / (cols + 1)) * (i + 1), y = (h / (rows + 1)) * (j + 1), rad = 46 + r() * 20;
    const g = ctx.createRadialGradient(x - 10, y - 10, 5, x, y, rad);
    g.addColorStop(0, '#d9d4cc'); g.addColorStop(1, `hsl(${20 + r() * 15},${30 + r() * 30}%,${30 + r() * 15}%)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a4542'; ctx.beginPath(); ctx.arc(x, y, rad * 0.35, 0, Math.PI * 2); ctx.fill();
  }
}

function flange(ctx, w, h, r) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, '#5d6670'); g.addColorStop(1, '#14181c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, r, 5000, 0.1);
  const cx = w / 2 + (r() - 0.5) * 120, cy = h * 0.95, R = h * 0.8;
  ctx.strokeStyle = '#8f9aa5'; ctx.lineWidth = 60;
  ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 28; i++) {
    const ang = Math.PI + (i / 27) * Math.PI;
    const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
    ctx.fillStyle = '#c6ccd2'; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b3036'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  }
}

function closeup(ctx, w, h, r) {
  concrete(ctx, w, h, r);
  crack(ctx, w, h, r, 4 + r() * 4);
  ctx.save();
  ctx.translate(w * (0.5 + r() * 0.2), h * 0.15);
  ctx.rotate(0.2 + r() * 0.6);
  ctx.fillStyle = '#ffd400'; ctx.fillRect(0, 0, 600, 48);
  ctx.fillStyle = '#111';
  for (let i = 0; i < 60; i++) ctx.fillRect(i * 10, 0, 2, i % 5 ? 14 : 26);
  ctx.restore();
}

function interior(ctx, w, h, r) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2b2620'); g.addColorStop(1, '#0d0c0b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const lx = w * (0.3 + r() * 0.4);
  const lg = ctx.createRadialGradient(lx, h * 0.2, 5, lx, h * 0.2, w * 0.6);
  lg.addColorStop(0, 'rgba(255,230,170,0.75)'); lg.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b8b0a2'; ctx.lineWidth = 8;
  const x0 = w * (0.4 + r() * 0.2);
  ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.moveTo(x0 + 90, 0); ctx.lineTo(x0 + 90, h); ctx.stroke();
  ctx.lineWidth = 6;
  for (let y = 20; y < h; y += 56) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 90, y); ctx.stroke(); }
  noise(ctx, w, h, r, 6000, 0.08);
}

const SCENES = [tower, anchors, closeup, flange, interior, anchors, tower, closeup];

function stamp(ctx, w, h, i) {
  const hh = 8 + (i % 9), mm = (i * 7) % 60;
  const text = `16/10/2026 ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  ctx.font = `600 ${Math.round(w / 34)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(text, w - 22, h - 22);
  ctx.fillStyle = '#ffb000';
  ctx.fillText(text, w - 24, h - 24);
}

function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

const toBlob = (canvas, q) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));

async function canvasToPhoto(canvas) {
  const full = await toBlob(canvas, 0.85);
  const tw = 256, th = Math.round((256 * canvas.height) / canvas.width);
  const t = document.createElement('canvas');
  t.width = tw; t.height = th;
  t.getContext('2d').drawImage(canvas, 0, 0, tw, th);
  const thumb = await toBlob(t, 0.75);
  return { full, thumb, w: canvas.width, h: canvas.height };
}

export async function makeSamples(count = 36, onProgress = () => {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const portrait = i % 5 === 3;
    const w = portrait ? 768 : 1024, h = portrait ? 1024 : 768;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = rng(i + 7);
    SCENES[i % SCENES.length](ctx, w, h, r);
    vignette(ctx, w, h);
    stamp(ctx, w, h, i);
    out.push(await canvasToPhoto(c));
    onProgress((i + 1) / count);
  }
  return out;
}
