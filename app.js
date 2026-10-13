import { Chess } from './vendor/chess.js';
import { pieceSVG } from './pieces.js';
import { chibiSVG, backgroundSVG } from './chibi.js';
const $ = s => document.querySelector(s);

/* ---------- Stockfish 引擎（Web Worker，单线程版，不需要 SharedArrayBuffer） ---------- */
class Engine {
  constructor(){ this.w = new Worker('vendor/stockfish-nnue-16-single.js'); this.lis = null; this.q = Promise.resolve();
    this.w.onmessage = e => this.lis && this.lis(String(e.data));
    this.ready = this.cmd(['uci'], l => l === 'uciok').then(() => this.cmd(['isready'], l => l === 'readyok')); }
  cmd(lines, done){ return new Promise(res => { const out = []; this.lis = l => { out.push(l); if (done(l)) { this.lis = null; res(out); } }; lines.forEach(x => this.w.postMessage(x)); }); }
  analyze(fen, { depth, movetime, skill = 20, elo = null } = {}){
    const job = async () => { await this.ready;
      this.w.postMessage('setoption name Skill Level value ' + skill);
      this.w.postMessage('setoption name UCI_LimitStrength value ' + (elo ? 'true' : 'false'));
      if (elo) this.w.postMessage('setoption name UCI_Elo value ' + elo);
      this.w.postMessage('position fen ' + fen);
      const out = await this.cmd([depth ? 'go depth ' + depth : 'go movetime ' + movetime], l => l.startsWith('bestmove'));
      let cp = 0, mate = null, pv = [];
      for (const l of out) if (l.startsWith('info') && l.includes(' score ')) {
        const m = l.match(/score (cp|mate) (-?\d+)/); if (m) { if (m[1] === 'cp') { cp = +m[2]; mate = null; } else { mate = +m[2]; cp = mate > 0 ? 10000 - mate : -10000 - mate; } }
        const p = l.match(/ pv (.+)$/); if (p) pv = p[1].split(' '); }
      const best = out[out.length - 1].split(' ')[1];
      return { best, cp, mate, pv }; };
    const p = this.q.then(job); this.q = p.catch(() => {}); return p; }
}
const analyzer = new Engine(), player = new Engine();

/* ---------- 开局库 ---------- */
let BOOK = [];
fetch('openings.json').then(r => r.json()).then(j => { BOOK = j.map(([eco, fam, v, line]) => ({ eco, fam, v, name: fam + (v ? '·' + v : ''), moves: line ? line.split(' ') : [] })); render(); });

/* ---------- 恶毒台词（誓约后：慵懒、温柔） ---------- */
const L = {
  start: ['哈啊……要开始了吗？指挥官，下慢一点也没关系哦~', '好困……不过陪指挥官下棋的话，我可以醒着哦。', '棋盘准备好了，枕头也准备好了……开始吧~'],
  best: ['这步……和我想的一样哦，指挥官好厉害~', '嗯，完美的一步。奖励你……摸摸头吧~', '哦？指挥官今天很清醒嘛。'],
  good: ['不错的一步哦~', '稳稳的，我喜欢这样的指挥官吧~', '嗯嗯，这样就好。'],
  inacc: ['唔……这步有点松懈哦，是不是也困了？', '还有更好的下法哦，不过没关系吧~'],
  mist: ['哈啊？指挥官，这步不太好哦……', '诶……要不要用悔棋？我假装没看见吧~'],
  blun: ['……指挥官！这步会丢东西的哦，我都被吓醒了。', '呜，这步是大失误……要不要悔棋？我不会说出去的哦。'],
  check: ['将军哦~', '哈啊，被将军了……指挥官小心哦。'],
  giveCheck: ['将军！指挥官好帅哦~', '哦，将军了呢，对面慌了吧~'],
  capture: ['吃掉了哦，嗯……好吃吧~', '指挥官收下了一枚棋子哦。'],
  win: ['指挥官赢了哦！……嘿嘿，那现在可以一起睡午觉了吧~', '胜利！辛苦指挥官了，也辛苦我自己了吧~'],
  lose: ['输了也没关系哦，指挥官……我陪你复盘吧~', '哈啊……这局就当做梦，明天再赢回来吧~'],
  draw: ['和棋哦。平分秋色……也平分枕头吧~'],
  think: ['让我想想……哈啊……', '嗯……对面在想下一步了哦。'],
  hint: m => `指挥官，试试 ${m} 吧……我只说一次哦~`,
  undo: ['悔棋了哦……这次就当没发生吧~'],
  low: ['指挥官，时间不多了哦，快一点吧~']
};
const pick = a => a[Math.floor(Math.random() * a.length)];
function say(t, mood = 'sleepy'){ $('#bubble').textContent = t; $('#avatar').innerHTML = chibiSVG(mood); }

/* ---------- 音效（WebAudio 合成，无外部文件） ---------- */
let ac; function beep(f = 520, d = .08){ if (!$('#snd').checked) return; try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.12, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d * 3); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d * 3); } catch (e) {} }

/* ---------- 状态 ---------- */
let game = new Chess(), me = 'w', flipped = false, sel = null, running = false, token = 0;
let clock = { w: 0, b: 0 }, inc = 0, timed = true, lastTick = 0, lowWarned = false;
let meta = [];           // 每一步: {san, q, by}
let evals = [0];         // 每个局面的白方视角评估（cp）
let arrow = null;
let view = null;          // 复盘时查看的 ply 序号（null=实时局面）
let rv = null;            // 复盘数据
function disp(){ if (view === null) return game; const g = new Chess(startFen); const h = game.history({ verbose: true }); for (let i = 0; i < view; i++) g.move(h[i]); return g; }
let startFen = new Chess().fen();

const QN = { best: ['最佳', 'q-best', '★'], good: ['好棋', 'q-good', '✓'], inacc: ['不精确', 'q-inacc', '?!'], mist: ['错着', 'q-mist', '?'], blun: ['大失误', 'q-blun', '??'], book: ['开局库', 'q-book', '📖'] };

/* ---------- 棋盘渲染 ---------- */
function sqName(i){ const f = i % 8, r = Math.floor(i / 8); return flipped ? 'hgfedcba'[f] + (r + 1) : 'abcdefgh'[f] + (8 - r); }
function render(){
  const b = $('#board'); b.innerHTML = ''; const g = disp();
  const hist = g.history({ verbose: true }), last = hist[hist.length - 1];
  const targets = sel && view === null ? game.moves({ square: sel, verbose: true }) : [];
  let kingSq = null; if (g.inCheck()) for (const row of g.board()) for (const p of row) if (p && p.type === 'k' && p.color === g.turn()) kingSq = p.square;
  for (let i = 0; i < 64; i++) {
    const s = sqName(i), d = document.createElement('div'), f = s.charCodeAt(0) - 97, r = +s[1];
    d.className = 'sq ' + ((f + r) % 2 ? 'l' : 'd'); d.dataset.sq = s;
    if (last && (last.from === s || last.to === s)) d.classList.add('last');
    if (s === sel) d.classList.add('sel'); if (s === kingSq) d.classList.add('chk');
    const t = targets.find(m => m.to === s); if (t) d.classList.add(t.captured ? 'cap' : 'mv');
    const p = g.get(s); if (p) d.innerHTML = pieceSVG(p.color, p.type);
    if (i % 8 === 0) d.innerHTML += `<span class="co r">${s[1]}</span>`; if (i >= 56) d.innerHTML += `<span class="co f">${s[0]}</span>`;
    b.appendChild(d);
  }
  drawArrow(); renderMoves(); renderOpening(); renderClocks(); renderEval();
}
function sqXY(s){ let f = s.charCodeAt(0) - 97, r = 8 - +s[1]; if (flipped) { f = 7 - f; r = 7 - r; } return [f * 100 + 50, r * 100 + 50]; }
function drawArrow(){ const svg = $('#arrows'); svg.innerHTML = `<defs><marker id="ah" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0 0L4 2L0 4z" fill="#8fe3ffcc"/></marker></defs>`;
  if (!arrow) return; const [x1, y1] = sqXY(arrow.slice(0, 2)), [x2, y2] = sqXY(arrow.slice(2, 4));
  svg.innerHTML += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8fe3ffcc" stroke-width="18" stroke-linecap="round" marker-end="url(#ah)"/>`; }
function renderMoves(){ const m = $('#moves'); m.innerHTML = '';
  meta.forEach((x, i) => { if (i % 2 === 0) m.innerHTML += `<span class="n">${i / 2 + 1}.</span>`;
    const q = x.q ? QN[x.q] : null; m.innerHTML += `<span class="m ${q ? q[1] : ''}${view === i + 1 ? ' cur' : ''}" data-ply="${i + 1}" title="${q ? q[0] : ''}">${x.san}${q ? ' ' + q[2] : ''}</span>`; });
  if (meta.length % 2) m.innerHTML += '<span></span>'; m.scrollTop = 1e6; }
function bookMatch(gm = game){ const h = gm.history(); let best = null;
  for (const o of BOOK) if (o.moves.length <= h.length && o.moves.every((x, i) => x === h[i]) && (!best || o.moves.length >= best.moves.length)) best = o;
  const nm = new Map(), cnt = {}; for (const o of BOOK) if (o.moves.length > h.length && h.every((x, i) => x === o.moves[i])) { const m = o.moves[h.length]; cnt[m] = (cnt[m] || 0) + 1; if (!nm.has(m) || o.moves.length === h.length + 1) nm.set(m, o.name); }
  const nextMoves = [...nm].sort((a, b) => cnt[b[0]] - cnt[a[0]]).slice(0, 4);
  return { best, next: nextMoves.map(([m, n]) => m + '（' + n + '）'), nextMoves, inBook: !!best && best.moves.length === h.length && h.length > 0 || (h.length > 0 && nextMoves.length > 0) }; }
function renderOpening(){ const { best, next } = bookMatch(disp());
  $('#opName').textContent = best && best.moves.length ? `${best.eco} · ${best.fam}` : '—'; $('#opVar').textContent = best && best.v ? best.v : '';
  $('#opBook').innerHTML = (best && best.moves.length ? '谱着：' + best.moves.map((x, i) => (i % 2 ? '' : (i / 2 + 1) + '.') + x).join(' ') + '<br>' : '') + (next.length ? '库内后续：<br>' + next.join('<br>') : '已离开开局库'); }
const fmt = ms => { if (!timed) return '∞'; ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return s < 20 && ms < 20000 ? (ms / 1000).toFixed(1) : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function renderClocks(){ const top = flipped ? 'w' : 'b', bot = flipped ? 'b' : 'w';
  for (const [el, c] of [[$('#clockTop'), top], [$('#clockBot'), bot]]) {
    el.querySelector('.who').textContent = (c === 'w' ? '⚪ 白' : '⚫ 黑') + (c === me ? ' · 指挥官' : ' · 恶毒（引擎）');
    el.querySelector('.t').textContent = fmt(clock[c]); el.classList.toggle('active', running && game.turn() === c); el.classList.toggle('low', timed && clock[c] < 20000); } }
function renderEval(){ const cp = evals[evals.length - 1] ?? 0, c = Math.max(-1000, Math.min(1000, cp));
  const pct = 50 + 50 * (2 / (1 + Math.exp(-0.004 * c)) - 1);
  $('#evalFill').style.height = (flipped ? 100 - pct : pct) + '%'; $('#evalFill').style.top = flipped ? '0' : ''; $('#evalFill').style.bottom = flipped ? '' : '0';
  $('#evalTxt').textContent = Math.abs(cp) > 9000 ? '#' + (10000 - Math.abs(cp)) : (cp / 100).toFixed(1); }

/* ---------- 交互 ---------- */
$('#board').addEventListener('click', e => { const d = e.target.closest('.sq'); if (!d || view !== null || !running || game.turn() !== me) return; const s = d.dataset.sq, p = game.get(s);
  if (sel) { const mv = game.moves({ square: sel, verbose: true }).filter(m => m.to === s);
    if (mv.length) { if (mv.length > 1) return promo(sel, s); return playerMove({ from: sel, to: s }); } }
  sel = p && p.color === me ? s : null; render(); });
function promo(from, to){ const box = $('#promo'); box.hidden = false; box.innerHTML = '';
  for (const t of ['q', 'r', 'b', 'n']) { const d = document.createElement('div'); d.innerHTML = pieceSVG(me, t); d.onclick = () => { box.hidden = true; playerMove({ from, to, promotion: t }); }; box.appendChild(d); } }
function playerMove(m){ sel = null; arrow = null; const fenBefore = game.fen(); const mv = game.move(m); if (!mv) return render(); afterMove(mv, true, fenBefore); }

let wasInBook = true;
function bookTalk(mv, byMe){
  const { best, nextMoves, inBook } = bookMatch(); const nm = best ? best.name : '';
  if (inBook && best) {
    const sug = nextMoves.length ? ` 谱着上接下来可以走 ${nextMoves.slice(0, 3).map(x => x[0]).join(' / ')} 吧~` : '';
    if (byMe) say(`指挥官，你走的是${nm}哦~`, 'happy');
    else say(`我回了 ${mv.san}，现在是${nm}哦~${game.turn() === me ? sug : ''}`, 'smug');
  } else if (wasInBook && game.history().length > 1) { wasInBook = false; say(`哈啊……从${byMe ? '指挥官这步' : '这里'}开始就离开谱着了哦，要靠自己想了吧~`, 'yawn'); }
  if (!inBook) wasInBook = false;
}
async function afterMove(mv, byMe, fenBefore){
  const mover = mv.color; if (timed && meta.length >= 1) clock[mover] += inc * 1000;
  const bm = bookMatch(), inBook = bm.best && bm.best.moves.length === game.history().length;
  meta.push({ san: mv.san, q: null, by: byMe }); const idx = meta.length - 1;
  beep(mv.captured ? 330 : 520); render(); const my = token;
  if (game.isGameOver()) return end();
  bookTalk(mv, byMe);
  if (!byMe && game.inCheck()) say(pick(L.check), 'shock');
  // 评估局面（全力分析器）
  const ev = analyzer.analyze(game.fen(), { depth: 12 }).then(r => { if (my !== token) return;
    const cpW = mover === 'w' ? -r.cp : r.cp; // 分析的局面轮到对方走，转换为白方视角
    evals[idx + 1] = cpW; const prev = evals[idx] ?? 0;
    const loss = Math.max(0, mover === 'w' ? prev - cpW : cpW - prev);
    const q = inBook && idx < 20 ? 'book' : loss <= 20 ? 'best' : loss <= 60 ? 'good' : loss <= 150 ? 'inacc' : loss <= 300 ? 'mist' : 'blun';
    meta[idx].q = q; meta[idx].loss = loss; renderMoves(); renderEval();
    if (byMe && $('#liveFb').checked) { const [n, cls] = QN[q];
      $('#fbLast').innerHTML = `你的 <b>${mv.san}</b>：<span class="${cls}">${n}</span>${q !== 'book' && q !== 'best' ? `（损失约 ${(loss / 100).toFixed(1)} 兵）` : ''}`;
      if (q === 'book') {}
      else if (mv.san.includes('+') && (q === 'best' || q === 'good')) say(pick(L.giveCheck), 'happy');
      else if (mv.captured && (q === 'best' || q === 'good')) say(pick(L.capture), 'smug');
      else say(pick(L[q]), q === 'blun' || q === 'mist' ? 'shock' : q === 'best' ? 'happy' : 'sleepy'); }
  });
  if (game.turn() !== me) { await engineMove(my); }
  await ev;
}
async function engineMove(my){
  const lvl = +$('#lvl').value, useElo = $('#useElo').checked;
  const mt = 150 + lvl * 60; await new Promise(r => setTimeout(r, 250));
  const r = await player.analyze(game.fen(), { movetime: mt, skill: lvl, elo: useElo ? +$('#elo').value : null });
  if (my !== token || !running) return;
  const fenBefore = game.fen(), mv = game.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] }); if (mv) await afterMove(mv, false, fenBefore);
}
function tick(){ const now = performance.now(), dt = now - lastTick; lastTick = now; if (!running || !timed || meta.length < 1) return;
  const c = game.turn(); clock[c] -= dt; if (c === me && clock[c] < 20000 && !lowWarned) { lowWarned = true; say(pick(L.low), 'shock'); }
  if (clock[c] <= 0) { clock[c] = 0; end(c === me ? 'lose' : 'win', '超时'); } renderClocks(); }
setInterval(tick, 100);

function end(res, why){
  running = false; token++;
  if (!res) { if (game.isCheckmate()) { res = game.turn() === me ? 'lose' : 'win'; why = '将杀'; }
    else { res = 'draw'; why = game.isStalemate() ? '逼和' : game.isThreefoldRepetition() ? '三次重复' : game.isInsufficientMaterial() ? '子力不足' : '50 步规则'; } }
  say(pick(L[res]), res === 'win' ? 'happy' : res === 'lose' ? 'sleepy' : 'smug'); beep(res === 'win' ? 780 : 260, .2); renderClocks();
  setTimeout(() => summary(res, why), 1500);
}
function summary(res, why){
  const mine = meta.filter(x => x.by && x.q), cnt = {}; mine.forEach(x => cnt[x.q] = (cnt[x.q] || 0) + 1);
  const scored = mine.filter(x => x.q !== 'book'), avg = scored.length ? scored.reduce((a, x) => a + Math.min(x.loss, 1000), 0) / scored.length : 0;
  const acc = Math.max(0, Math.min(100, 103 * Math.exp(-0.0045 * avg) - 3)).toFixed(0);
  const worst = scored.slice().sort((a, b) => b.loss - a.loss)[0];
  const { best } = bookMatch();
  const s = $('#summary'); s.hidden = false;
  s.innerHTML = `<b>对局总结</b>：${{ win: '指挥官胜 🌙', lose: '恶毒胜', draw: '和棋' }[res]}（${why}）<br>开局：${$('#opName').textContent}<br>
  准确度（估）：<b>${acc}%</b>，平均损失 ${(avg / 100).toFixed(2)} 兵<br>` +
  Object.keys(QN).map(k => `<span class="${QN[k][1]}">${QN[k][0]} ${cnt[k] || 0}</span>`).join(' · ') +
  (worst && worst.loss > 100 ? `<br>最需要复盘的一步：<b>${worst.san}</b>` : '') + '<br><button id="goReview">🔍 开始复盘分析</button>' +
  `<br><i>${acc > 85 ? '哈啊……今天的指挥官好清醒，我都不用操心了哦~' : acc > 65 ? '整体还不错哦，几处小失误，下次注意吧~' : '有点迷糊的一局呢……复盘一下再睡吧，指挥官~'}</i>`;
}

$('#newGame').onclick = () => {
  token++; game = new Chess(); startFen = game.fen(); exitReview(); wasInBook = true; meta = []; evals = [0]; sel = null; arrow = null; lowWarned = false; $('#summary').hidden = true; $('#fbLast').textContent = '';
  const sv = $('#side').value; me = sv === 'r' ? (Math.random() < .5 ? 'w' : 'b') : sv; flipped = me === 'b';
  let tc = $('#tc').value; if (tc === 'custom') tc = $('#cMin').value + '+' + $('#cInc').value;
  timed = tc !== 'none'; if (timed) { const [m, i] = tc.split('+').map(Number); clock.w = clock.b = m * 60000; inc = i; }
  running = true; lastTick = performance.now(); say(pick(L.start)); render();
  if (me === 'b') engineMove(token);
};
$('#hint').onclick = async () => { if (view !== null) return; if (!running || game.turn() !== me) return say('现在不是指挥官的回合哦~');
  say('嗯……让我看看……'); const my = token; const r = await analyzer.analyze(game.fen(), { depth: 14 }); if (my !== token) return;
  arrow = r.best; const t = new Chess(game.fen()), m = t.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] });
  say(L.hint(m ? m.san : r.best), 'smug'); drawArrow(); };
$('#undo').onclick = () => { if (view !== null || !meta.length) return; token++; let n = game.turn() === me ? 2 : 1; if (meta.length < n) n = meta.length;
  for (let i = 0; i < n; i++) { game.undo(); meta.pop(); evals.length = meta.length + 1; }
  if (!running) running = true; sel = null; arrow = null; $('#summary').hidden = true; say(pick(L.undo)); render();
  if (game.turn() !== me) engineMove(token); };
$('#flip').onclick = () => { flipped = !flipped; render(); };
$('#resign').onclick = () => { if (running && meta.length && confirm('指挥官，真的要认输吗？')) end('lose', '认输'); };
$('#tc').onchange = () => $('#customTc').hidden = $('#tc').value !== 'custom';
const lvlNames = l => l <= 3 ? '（迷糊）' : l <= 8 ? '（半睡半醒）' : l <= 14 ? '（清醒）' : '（全力·不困了）';
$('#lvl').oninput = () => $('#lvlTxt').textContent = $('#lvl').value + lvlNames(+$('#lvl').value); $('#lvl').oninput();
$('#useElo').onchange = () => { $('#eloRow').hidden = !$('#useElo').checked; $('#lvl').disabled = $('#useElo').checked; };
$('#elo').oninput = () => $('#eloTxt').textContent = $('#elo').value;
document.getElementById('bgArt').innerHTML = backgroundSVG();
say('哈啊……指挥官，要下棋吗？左边选好时制和棋力，点「开始新对局」吧~'); render();

/* ---------- 复盘分析 ---------- */
const wp = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, cp)))) - 1);
function exitReview(){ view = null; rv = null; $('#review').hidden = true; document.body.classList.remove('reviewing'); }
async function startReview(){
  const hist = game.history({ verbose: true }); if (!hist.length) return say('还没有走过棋哦，指挥官~');
  running = false; token++; const my = token; view = hist.length; arrow = null; document.body.classList.add('reviewing');
  $('#review').hidden = false; $('#rvInfo').textContent = ''; $('#rvKeys').innerHTML = ''; $('#rvGraph').innerHTML = '';
  say('哈啊……那我认真看一遍棋谱哦，稍等一下吧~', 'yawn');
  const g = new Chess(startFen), res = [];
  for (let i = 0; i <= hist.length; i++) {
    if (my !== token) return;
    const r = await analyzer.analyze(g.fen(), { depth: 13 });
    const white = g.turn() === 'w' ? r.cp : -r.cp; let bestSan = r.best;
    if (g.isGameOver()) { res.push({ cpW: g.isCheckmate() ? (g.turn() === 'w' ? -10000 : 10000) : 0, best: null, bestSan: '' }); }
    else { const t = new Chess(g.fen()); try { bestSan = t.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] }).san; } catch (e) {} res.push({ cpW: white, best: r.best, bestSan }); }
    $('#rvBar').style.width = (100 * (i + 1) / (hist.length + 1)) + '%'; $('#rvPct').textContent = `分析中 ${i + 1}/${hist.length + 1}`;
    if (i < hist.length) g.move(hist[i]);
  }
  const bk = new Chess(startFen); let book = true;
  const moves = hist.map((m, i) => { bk.move(m); if (book) { const b = bookMatch(bk); book = !!(b.best && b.best.moves.length === i + 1 && startFen === new Chess().fen()); }
    const a = res[i], b = res[i + 1], side = m.color === 'w' ? 1 : -1;
    const loss = Math.max(0, side * (a.cpW - b.cpW)), wl = Math.max(0, side === 1 ? wp(a.cpW) - wp(b.cpW) : wp(-a.cpW) - wp(-b.cpW));
    const accm = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * wl) - 3.1669));
    const q = book ? 'book' : (m.from + m.to + (m.promotion || '')) === a.best || loss <= 15 ? 'best' : wl < 5 ? 'good' : wl < 10 ? 'inacc' : wl < 20 ? 'mist' : 'blun';
    return { san: m.san, color: m.color, loss, wl, acc: accm, q, best: a.best, bestSan: a.bestSan }; });
  const acc = c => { const xs = moves.filter(x => x.color === c); return xs.length ? (xs.reduce((s, x) => s + x.acc, 0) / xs.length).toFixed(1) : '—'; };
  rv = { res, moves, accW: acc('w'), accB: acc('b') };
  $('#rvPct').textContent = `分析完成 · 白方准确度 ${rv.accW}% · 黑方准确度 ${rv.accB}%`;
  drawGraph(); keyMoments(); gotoPly(0);
  const bad = moves.filter(x => (x.q === 'blun' || x.q === 'mist') && x.color === me).length;
  say(bad ? `看完了哦，指挥官有 ${bad} 处比较大的失误，我在下面标出来了，点一下就能跳过去吧~` : '看完了哦……指挥官这局几乎没有大失误，好厉害，我可以安心睡了吧~', bad ? 'smug' : 'happy');
}
function drawGraph(){ const n = rv.res.length, W = 600, H = 120, x = i => i * W / Math.max(1, n - 1), y = cp => H / 2 - (wp(cp) - 50) / 50 * (H / 2 - 4);
  let pts = rv.res.map((r, i) => `${x(i).toFixed(1)},${y(r.cpW).toFixed(1)}`).join(' ');
  let dots = rv.moves.map((m, i) => (m.q === 'blun' || m.q === 'mist') ? `<circle cx="${x(i + 1)}" cy="${y(rv.res[i + 1].cpW)}" r="5" fill="${m.q === 'blun' ? '#ff7aa0' : '#ffb36b'}" data-ply="${i + 1}"/>` : '').join('');
  $('#rvGraph').innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect width="${W}" height="${H}" fill="#1a1f38"/>
   <polygon points="0,${H} ${pts} ${W},${H}" fill="#e8eef7"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#b49cff88" stroke-dasharray="4"/>
   <line id="rvCursor" x1="0" y1="0" x2="0" y2="${H}" stroke="#8fe3ff" stroke-width="2"/>${dots}</svg>`;
  $('#rvGraph svg').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); gotoPly(Math.round((e.clientX - r.left) / r.width * (n - 1))); }; }
function keyMoments(){ $('#rvKeys').innerHTML = rv.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.q === 'blun' || m.q === 'mist').sort((a, b) => b.m.wl - a.m.wl).slice(0, 8)
  .map(({ m, i }) => `<span class="key ${QN[m.q][1]}" data-ply="${i + 1}">${Math.floor(i / 2) + 1}${m.color === 'w' ? '.' : '…'}${m.san} ${QN[m.q][2]}</span>`).join('') || '<i>没有明显的转折点哦~</i>';
  document.querySelectorAll('#rvKeys .key').forEach(el => el.onclick = () => gotoPly(+el.dataset.ply)); }
function gotoPly(p){ if (!rv) return; const n = rv.moves.length; view = Math.max(0, Math.min(n, p)); arrow = null;
  const m = rv.moves[view - 1];
  if (m) { if (m.q !== 'best' && m.q !== 'book' && m.best) arrow = m.best;
    $('#rvInfo').innerHTML = `第 ${Math.floor((view - 1) / 2) + 1} 回合 ${m.color === 'w' ? '白' : '黑'}方 <b>${m.san}</b>：<span class="${QN[m.q][1]}">${QN[m.q][0]}</span>` +
      (m.q !== 'best' && m.q !== 'book' && m.bestSan ? `，更好的是 <b>${m.bestSan}</b>（青色箭头）` : '') + ` · 局面评估 ${fmtEval(rv.res[view].cpW)}`;
    if (m.color === me && (m.q === 'blun' || m.q === 'mist')) say(`这步 ${m.san} 是${QN[m.q][0]}哦……${m.bestSan ? '走 ' + m.bestSan + ' 会好很多' : ''}，下次注意吧~`, 'shock');
    else if (m.color === me && m.q === 'best') say('这步走得好哦，和我想的一样~', 'happy');
  } else $('#rvInfo').textContent = '初始局面 · 用 ← → 或按钮逐步查看';
  const c = document.getElementById('rvCursor'); if (c) { const x = view * 600 / Math.max(1, n); c.setAttribute('x1', x); c.setAttribute('x2', x); }
  evalsView(); render(); }
const fmtEval = cp => Math.abs(cp) > 9000 ? (cp > 0 ? '白' : '黑') + '方将杀' : (cp > 0 ? '+' : '') + (cp / 100).toFixed(2);
function evalsView(){ if (rv) { evals = rv.res.map(r => r.cpW).slice(0, view + 1); meta = rv.moves.map(m => ({ san: m.san, q: m.q, by: m.color === me, loss: m.loss })); } }
$('#rvFirst').onclick = () => gotoPly(0); $('#rvPrev').onclick = () => gotoPly(view - 1); $('#rvNext').onclick = () => gotoPly(view + 1); $('#rvLast').onclick = () => gotoPly(1e9);
$('#rvExit').onclick = () => { exitReview(); evals = rv ? evals : evals; render(); say('复盘结束了哦，再来一局吧~'); };
document.addEventListener('keydown', e => { if (!rv || e.target.tagName === 'TEXTAREA') return; if (e.key === 'ArrowLeft') gotoPly(view - 1); if (e.key === 'ArrowRight') gotoPly(view + 1); });
$('#moves').addEventListener('click', e => { const el = e.target.closest('.m'); if (el && rv) gotoPly(+el.dataset.ply); });
$('#reviewBtn').onclick = startReview;
document.addEventListener('click', e => { if (e.target.id === 'goReview') startReview(); });

/* ---------- PGN 导入 / 导出 ---------- */
$('#pgnBtn').onclick = () => { $('#pgnModal').hidden = false; $('#pgnText').value = game.history().length ? exportPgn() : ''; };
function exportPgn(){ const g = new Chess(startFen); game.history().forEach(m => g.move(m));
  g.header('Event', '恶毒的月夜棋盘', 'Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'), 'White', me === 'w' ? '指挥官' : 'Le Malin (Stockfish)', 'Black', me === 'b' ? '指挥官' : 'Le Malin (Stockfish)');
  const r = game.isCheckmate() ? (game.turn() === 'w' ? '0-1' : '1-0') : game.isDraw() ? '1/2-1/2' : '*'; g.header('Result', r); return g.pgn(); }
$('#pgnCopy').onclick = async () => { $('#pgnText').value = exportPgn(); try { await navigator.clipboard.writeText($('#pgnText').value); } catch (e) {} say('棋谱复制好了哦~'); };
$('#pgnDl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportPgn()], { type: 'application/x-chess-pgn' })); a.download = 'lemalin-game.pgn'; a.click(); };
$('#pgnLoad').onclick = () => { const t = new Chess(); const raw = $('#pgnText').value.trim().replace(/\r/g, '');
  try { try { t.loadPgn(raw); } catch (e1) { t.loadPgn(raw.replace(/^((?:\[[^\n]*\]\s*\n)+)\s*/, '$1\n')); } } catch (e) { return say('这份棋谱我看不懂哦……检查一下格式吧~', 'shock'); }
  token++; running = false; exitReview(); const hdr = t.header(); startFen = hdr.FEN || new Chess().fen(); game = t;
  me = hdr.Black && /指挥官/.test(hdr.Black) ? 'b' : 'w'; flipped = me === 'b'; meta = game.history().map((s, i) => ({ san: s, q: null, by: (i % 2 === 0) === (me === 'w') })); evals = [0];
  $('#pgnModal').hidden = true; render(); startReview(); };
$('#pgnClose').onclick = () => $('#pgnModal').hidden = true;

window.__dbg = { get view(){ return view; }, get rv(){ return rv; }, get game(){ return game; }, get meta(){ return meta; }, get evals(){ return evals; }, clock };
