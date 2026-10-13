// 原创像素风 Q版「恶毒」：64x64 网格程序化绘制（参考官方配色元素，非描摹）
export const PAL = {
  o:'#2b2342', // 轮廓
  h:'#f4f6fc', H:'#cdd4ec', j:'#9aa3cc', // 头发 亮/中/暗
  s:'#fff1ea', S:'#f6d6cf',             // 皮肤
  w:'#ffffff', b:'#7fa6dc', B:'#4a68a8', d:'#2c3d73', // 眼白/虹膜/瞳孔
  p:'#ff9fb4', m:'#c4546f',             // 腮红 嘴
  n:'#2a3366', N:'#1a2046', c:'#8fe0f5', C:'#4fa9cc', // 洋装 / 蝴蝶结
  W:'#f2f5ff', k:'#e6e9f7', y:'#ffe08a', v:'#b49cff'  // 领子 枕头 月亮 紫
};
const SZ = 64;
function grid(){ return Array.from({ length: SZ }, () => Array(SZ).fill(null)); }
function ell(g, cx, cy, rx, ry, c, cond){ for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1 && (!cond || cond(x, y, g[y][x]))) g[y][x] = c; } }
function rect(g, x0, y0, x1, y1, c){ for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < SZ && x >= 0 && x < SZ) g[y][x] = c; }
function px(g, pts, c){ for (const [x, y] of pts) if (g[y]) g[y][x] = c; }
function outline(g){ const o = g.map(r => r.slice()); for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) if (!g[y][x]) { for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const v = g[y + dy] && g[y + dy][x + dx]; if (v && v !== 'o') { o[y][x] = 'o'; break; } } } return o; }
function mirror(fn){ return (x, ...a) => { fn(x, ...a); }; }

const EX = [24, 40], EY = 28; // 眼睛位置（左上角 x = cx-4）
function eyes(g, mode){
  const E = (cx, look) => { const L = cx - 4, T = EY;
    if (mode === 'yawn') { px(g, [[L,T+5],[L+1,T+6],[L+2,T+6],[L+3,T+6],[L+4,T+6],[L+5,T+6],[L+6,T+6],[L+7,T+5]], 'o'); return; }
    if (mode === 'happy') { px(g, [[L,T+6],[L+1,T+5],[L+2,T+4],[L+3,T+4],[L+4,T+4],[L+5,T+4],[L+6,T+5],[L+7,T+6]], 'o'); px(g, [[L+1,T+6],[L+6,T+6]], 'o'); return; }
    rect(g, L+1, T, L+6, T, 'o'); rect(g, L, T+1, L+7, T+1, 'o');
    if (mode === 'shock') { rect(g, L, T+2, L+7, T+9, 'w'); rect(g, L+3, T+4, L+5, T+7, 'b'); rect(g, L+3, T+5, L+4, T+6, 'd'); px(g, [[L+3,T+4]], 'w'); px(g, [[L-1,T+2],[L+8,T+2],[L-1,T+3],[L+8,T+3]], 'o'); rect(g, L+1, T+10, L+6, T+10, 'o'); return; }
    rect(g, L, T+2, L+7, T+10, 'b'); rect(g, L, T+2, L+7, T+4, 'B'); rect(g, L+1, T+11, L+6, T+11, 'o');
    rect(g, L+2+look, T+4, L+5+look, T+9, 'd'); rect(g, L+1, T+10, L+6, T+10, 'c');
    rect(g, L+1+look, T+2, L+3+look, T+4, 'w'); px(g, [[L+6+look,T+7],[L+5+look,T+8]], 'w');
    px(g, [[L-1,T+1],[L+8,T+1],[L-1,T+2]], 'o');
    if (mode === 'sleepy' || mode === 'smug') { const h = mode === 'smug' ? 3 : 4; rect(g, L-1, T, L+8, T + h, 's'); rect(g, L, T + h + 1, L+7, T + h + 1, 'o'); px(g, [[L-1,T+h+1],[L+8,T+h]], 'o'); }
  };
  const look = mode === 'smug' ? 1 : 0; E(EX[0], look); E(EX[1], look);
  if (mode === 'yawn') px(g, [[46,EY+7],[46,EY+8],[47,EY+8]], 'c');
  if (mode === 'shock') px(g, [[51,20],[51,21],[50,22],[51,22],[52,22],[51,23]], 'c');
}
function mouth(g, mode){ const Y = 42;
  if (mode === 'yawn') { rect(g, 31, Y-1, 33, Y+1, 'm'); px(g, [[30,Y],[34,Y],[31,Y+2],[32,Y+2],[33,Y+2],[31,Y-2],[32,Y-2],[33,Y-2],[30,Y-1],[34,Y-1],[30,Y+1],[34,Y+1]], 'o'); px(g, [[32,Y+1]], 'p'); return; }
  if (mode === 'shock') { px(g, [[32,Y-1],[33,Y-1]], 'o'); rect(g, 32, Y, 33, Y, 'm'); px(g, [[31,Y],[34,Y],[32,Y+1],[33,Y+1]], 'o'); return; }
  if (mode === 'happy') { px(g, [[29,Y-1],[35,Y-1],[30,Y],[34,Y]], 'o'); rect(g, 31, Y, 33, Y, 'm'); rect(g, 31, Y+1, 33, Y+1, 'o'); return; }
  if (mode === 'smug') { px(g, [[30,Y],[31,Y+1],[32,Y+1],[33,Y],[34,Y-1]], 'o'); return; }
  px(g, [[31,Y],[33,Y]], 'o'); px(g, [[32,Y+1]], 'o');
}
export function lemalin(mode = 'sleepy', frame = 0){
  const g = grid();
  // 后发：圆头 + 两侧长发
  ell(g, 32, 30, 25, 25, 'H');
  for (let y = 30; y < 62; y++) { const t = (y - 30) / 32, w = Math.round(7 + 2 * t), x0 = 8 - Math.round(4 * t * t), x1 = 55 + Math.round(4 * t * t);
    rect(g, x0, y, x0 + w, y, 'H'); rect(g, x1 - w, y, x1, y, 'H'); px(g, [[x0 + w, y], [x1 - w, y]], 'j'); if (y > 58) px(g, [[x0 + (y % 2), y], [x1 - (y % 2), y]], null); }
  // 身体
  for (let y = 46; y < 64; y++) { const w = 9 + Math.floor((y - 46) / 2); rect(g, 32 - w, y, 31 + w, y, y > 59 ? 'N' : 'n'); }
  rect(g, 23, 46, 40, 47, 'W'); rect(g, 25, 48, 38, 48, 'W'); rect(g, 28, 49, 35, 49, 'W'); px(g, [[23,48],[40,48]], 'n');
  px(g, [[27,48],[28,48],[27,49],[28,50],[29,50],[29,49],[36,48],[35,48],[36,49],[35,50],[34,50],[34,49],[30,50],[33,50]], 'c'); rect(g, 31, 49, 32, 51, 'C'); px(g, [[30,52],[33,52],[30,51],[33,51]], 'C');
  // 抱枕
  rect(g, 13, 54, 50, 62, 'k'); rect(g, 12, 56, 51, 61, 'k'); rect(g, 13, 61, 50, 62, 'W'); rect(g, 14, 55, 49, 55, 'W');
  px(g, [[22,56],[23,56],[21,57],[21,58],[21,59],[22,60],[23,60],[24,59],[22,57],[22,58],[22,59]], 'y');
  px(g, [[41,56],[40,57],[41,57],[42,57],[41,58],[39,57],[43,57],[41,59]], 'c'); px(g, [[41,57]], 'w'); px(g, [[31,58],[47,60],[16,60],[34,61]], 'v');
  ell(g, 14, 56, 3.5, 3, 's'); ell(g, 49, 56, 3.5, 3, 's'); px(g, [[13,58],[14,58],[49,58],[50,58]], 'S');
  // 脸
  ell(g, 32, 33, 17, 14.5, 's'); rect(g, 22, 46, 41, 46, null); rect(g, 23, 46, 40, 47, 'W');
  // 刘海（清晰发束）：每束底部尖
  const bottom = x => { const p = [0, 2, 4, 5, 4, 2]; return 22 + p[(x + 3) % 6] + (Math.abs(x - 32) > 12 ? 3 : 0); };
  ell(g, 32, 26, 22, 17, 'h', (x, y) => y <= bottom(x)); ell(g, 36, 30, 20, 13, 'H', (x, y, v) => v === 'h' && y <= bottom(x) && y >= 23 && (x + y) % 2 === 0 && y === bottom(x) - 1);
  for (let x = 13; x <= 51; x++) { const b = bottom(x); if (g[b + 1] && g[b + 1][x] === 's') g[b][x] = 'j'; }
  for (let x = 13; x <= 51; x++) if ((x + 3) % 6 === 0) for (let y = 20; y < bottom(x); y++) if (g[y][x] === 'h') g[y][x] = 'H';
  // 丸子头 + 发带 + 呆毛
  ell(g, 32, 8, 7.5, 7, 'j'); ell(g, 32, 8, 6.5, 6, 'h'); ell(g, 33.5, 10, 5, 3.5, 'H', (x, y, v) => v === 'h' && y >= 10); px(g, [[29,4],[30,4],[28,5],[29,5]], 'w'); px(g, [[27,12],[37,12],[26,11],[38,11],[27,10],[37,10]], 'j');
  rect(g, 27, 13, 37, 13, 'n'); px(g, [[24,12],[25,12],[24,14],[25,13],[39,12],[40,12],[39,13],[40,14],[26,13],[38,13]], 'n');
  px(g, [[32,2],[32,1],[33,0],[34,0],[35,1],[35,2]], 'h');
  // 侧发
  for (let y = 26; y < 47; y++) { const e = y > 40 ? 1 : 0; rect(g, 13, y, 16 - e, y, 'h'); rect(g, 47 + e, y, 50, y, 'h'); px(g, [[16 - e, y], [47 + e, y]], 'j'); }
  // 高光 + 星星发饰
  px(g, [[21,16],[22,16],[23,15],[24,15],[25,15],[39,15],[40,15],[41,16]], 'w');
  px(g, [[47,18],[46,19],[47,19],[48,19],[47,20],[45,19],[49,19]], 'c'); px(g, [[47,19]], 'w');
  eyes(g, mode);
  rect(g, 18, 40, 21, 40, 'p'); rect(g, 43, 40, 46, 40, 'p'); px(g, [[19,41],[20,41],[44,41],[45,41]], 'p');
  mouth(g, mode);
  let out = outline(g);
  if (frame) { out = [Array(SZ).fill(null), ...out.slice(0, SZ - 1)]; }
  return out;
}
export function blinkFrame(mode){ const g = lemalin(mode, 0); if (mode === 'happy' || mode === 'yawn') return g; // 眨眼：把眼睛区域换成闭眼线
  for (const cx of EX) { const L = cx - 4; for (let y = EY; y < EY + 11; y++) for (let x = L - 1; x <= L + 8; x++) if (g[y][x] && 'wbBdCo'.includes(g[y][x])) g[y][x] = 's'; for (let x = L; x <= L + 7; x++) g[EY + 6][x] = 'o'; g[EY + 5][L - 1] = 'o'; g[EY + 5][L + 8] = 'o'; }
  return g; }
export function drawGrid(canvas, g, scale = 4){ canvas.width = SZ * scale; canvas.height = SZ * scale; const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) { const c = g[y][x]; if (c) { ctx.fillStyle = PAL[c]; ctx.fillRect(x * scale, y * scale, scale, scale); } } }

// 像素夜空背景（含睡在月亮上的小恶毒）
export function drawBackground(canvas){
  const W = 320, H = 180; canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
  for (let y = 0; y < H; y++) { const t = y / H; ctx.fillStyle = `rgb(${Math.round(7 + 12 * t)},${Math.round(10 + 10 * t)},${Math.round(24 + 28 * t)})`; ctx.fillRect(0, y, W, 1); }
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 140; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * H * .8), b = r(); ctx.fillStyle = b > .9 ? '#ffe08a' : b > .6 ? '#b49cff' : '#e8eef7'; ctx.globalAlpha = .35 + b * .5; ctx.fillRect(x, y, 1, 1); if (b > .93) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } }
  ctx.globalAlpha = 1;
  // 月亮
  const mx = 262, my = 118, R = 22; for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const d = x * x + y * y, d2 = (x + 11) ** 2 + (y - 7) ** 2; if (d <= R * R && d2 > (R - 3) ** 2) { ctx.fillStyle = d > (R - 2) ** 2 ? '#b9c8ef' : (x + y) % 9 === 0 ? '#cfdcfa' : '#e6eeff'; ctx.fillRect(mx + x, my + y, 1, 1); } }
  // 小恶毒睡在月牙上（12x8 像素）
  const tiny = ['....hh......', '...hhhh.....', '.hhhhhhhh...', 'hhhsssshhhh.', 'hhs-s-sshhhhh', '.hssssshhhkkk', '..nnnnnnkkkk', '...nnnn..kk.'];
  const tp = { h: '#f4f6fc', s: '#fff1ea', '-': '#2b2342', n: '#2a3366', k: '#e6e9f7' };
  tiny.forEach((row, y) => [...row].forEach((c, x) => { if (tp[c]) { ctx.fillStyle = tp[c]; ctx.fillRect(mx - 16 + x, my + 10 + y, 1, 1); } }));
  ctx.fillStyle = '#8fe3ff'; ctx.fillRect(mx - 10, my + 8, 2, 1); ctx.fillRect(mx - 9, my + 7, 1, 1); ctx.fillStyle = '#b49cff'; ctx.fillRect(mx - 5, my + 3, 1, 1);
  // 云/枕头山
  ctx.fillStyle = '#1c2450'; for (let x = 0; x < W; x++) { const h = 10 + Math.round(5 * Math.sin(x / 13) + 3 * Math.sin(x / 5.3)); ctx.fillRect(x, H - h, 1, h); }
  ctx.fillStyle = '#141a3c'; for (let x = 0; x < W; x++) { const h = 5 + Math.round(3 * Math.sin(x / 9 + 1)); ctx.fillRect(x, H - h, 1, h); }
}
