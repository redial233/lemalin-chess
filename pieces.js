// 原创棋子：法式哥特剪影 + 月亮/星星点缀
const SH = {
 p:`<circle cx="50" cy="34" r="12"/><path d="M38 48h24l-4 6c6 6 9 14 10 24H32c1-10 4-18 10-24z"/><path d="M26 80h48l3 9H23z"/>`,
 r:`<path d="M30 20h9v7h7v-7h8v7h7v-7h9v16l-6 6v32H36V42l-6-6z"/><path d="M26 80h48l3 9H23z"/><path class="ac" d="M44 54h12v14H44z" opacity=".55"/>`,
 n:`<path d="M34 78c0-14 6-22 14-28-6 1-12 4-16 8l-6-6c2-12 10-22 20-28l2-8 6 7c14 4 22 16 22 34v21z"/><path d="M26 80h48l3 9H23z"/><circle class="ac" cx="45" cy="34" r="3"/><path class="ac" d="M58 26c-2 6 0 12 6 14" fill="none" stroke-width="2.5"/>`,
 b:`<path d="M50 12c-11 10-18 21-16 32 1 6 6 10 6 10h20s5-4 6-10c2-11-5-22-16-32z"/><path d="M40 56h20l4 22H36z"/><path d="M26 80h48l3 9H23z"/><path class="ac" d="M54 24 44 40" fill="none" stroke-width="3"/><circle cx="50" cy="10" r="4"/>`,
 q:`<path d="M24 30l9 30h34l9-30-13 14-5-22-8 18-8-18-5 22z"/><circle cx="24" cy="27" r="4.5"/><circle cx="37" cy="19" r="4.5"/><circle cx="50" cy="14" r="5"/><circle cx="63" cy="19" r="4.5"/><circle cx="76" cy="27" r="4.5"/><path d="M33 62h34l-3 16H36z"/><path d="M26 80h48l3 9H23z"/><path class="ac" d="M50 66l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z"/>`,
 k:`<path d="M56 6a9 9 0 1 0 2 16 11 11 0 0 1-2-16z"/><path d="M30 34c6-6 14-8 20-6 6-2 14 0 20 6 4 6 2 16-4 26H34c-6-10-8-20-4-26z"/><path d="M34 62h32l-2 16H36z"/><path d="M26 80h48l3 9H23z"/><path class="ac" d="M50 32v24M42 44h16" fill="none" stroke-width="3"/>`
};
export function pieceSVG(color, type){
 const w = color==='w';
 const fill = w? 'url(#gw)':'url(#gb)', stroke = w? '#4b5585':'#b49cff', ac = w? '#7c5cff':'#8fe3ff';
 return `<svg class="pc" viewBox="0 0 100 100"><defs>
 <linearGradient id="gw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b9c8e2"/></linearGradient>
 <linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f72"/><stop offset="1" stop-color="#0b0f24"/></linearGradient></defs>
 <g fill="${fill}" stroke="${stroke}" stroke-width="2.6" stroke-linejoin="round">${SH[type].replace(/class="ac"/g,`fill="${ac}" stroke="${ac}"`)}</g></svg>`;
}
// 原创 Q 版小秘书（银发、睡帽、抱枕）
export function avatarSVG(mood='sleepy'){
 const eyes = {
  sleepy:`<path d="M40 64q6 4 12 0M68 64q6 4 12 0" stroke="#3a3f72" stroke-width="2.5" fill="none"/>`,
  happy:`<path d="M40 66q6-6 12 0M68 66q6-6 12 0" stroke="#3a3f72" stroke-width="2.5" fill="none"/>`,
  shock:`<circle cx="46" cy="64" r="5" fill="#7c5cff"/><circle cx="74" cy="64" r="5" fill="#7c5cff"/><circle cx="47.5" cy="62" r="1.6" fill="#fff"/><circle cx="75.5" cy="62" r="1.6" fill="#fff"/>`,
  smug:`<path d="M40 64h12M68 64h12" stroke="#3a3f72" stroke-width="2.5"/><circle cx="46" cy="67" r="3" fill="#7c5cff"/><circle cx="74" cy="67" r="3" fill="#7c5cff"/>`
 }[mood];
 const mouth = mood==='shock'?'<ellipse cx="60" cy="80" rx="3" ry="4" fill="#c86a8a"/>':mood==='happy'?'<path d="M55 78q5 5 10 0" stroke="#c86a8a" stroke-width="2" fill="none"/>':'<path d="M57 79q3 2 6 0" stroke="#c86a8a" stroke-width="2" fill="none"/>';
 return `<svg viewBox="0 0 120 130" width="130" height="130">
 <ellipse cx="60" cy="118" rx="44" ry="10" fill="#b49cff33"/>
 <rect x="18" y="92" width="84" height="30" rx="14" fill="#e8eef7" stroke="#b49cff" stroke-width="2"/><path d="M40 107l3 2-1 3 3-1 2 3 1-3 3 0-2-2 1-3-3 1z" fill="#8fe3ff"/>
 <path d="M24 70c-6-30 10-50 36-50s42 20 36 50l-6 28H30z" fill="#dfe6f3"/>
 <ellipse cx="60" cy="68" rx="28" ry="26" fill="#fff4f1"/>
 <path d="M32 60c4-18 16-26 28-26s24 8 28 26c-8-8-16-12-20-12l-8 8-6-8c-8 2-16 6-22 12z" fill="#e8eef7" stroke="#c9d3e6"/>
 <path d="M26 40c10-22 58-26 70 0l-8 6H34z" fill="#1d2550" stroke="#b49cff" stroke-width="2"/><path d="M90 40c10 4 14 14 10 22" stroke="#1d2550" stroke-width="6" fill="none"/><circle cx="100" cy="64" r="6" fill="#e8eef7"/>
 <path d="M58 28a6 6 0 1 0 4 8 5 5 0 0 1-4-8z" fill="#8fe3ff"/>
 ${eyes}<ellipse cx="42" cy="74" rx="5" ry="3" fill="#ffb6c8" opacity=".6"/><ellipse cx="78" cy="74" rx="5" ry="3" fill="#ffb6c8" opacity=".6"/>${mouth}
 ${mood==='sleepy'?'<text x="92" y="30" fill="#8fe3ff" font-size="14" font-family="serif">z</text><text x="102" y="18" fill="#b49cff" font-size="10">z</text>':''}
 </svg>`;
}
