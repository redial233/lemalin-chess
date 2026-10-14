import asyncio,sys
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1400,'height':1000})
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto(sys.argv[1]); await pg.wait_for_timeout(1500); ok=True
    # 黑方多一个后
    for fen in ['4k3/8/8/8/8/8/3q4/4K3 b - - 0 1','4k3/8/8/8/8/8/8/q3K3 w - - 0 1','rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3']:
      cp=await pg.evaluate(f'__dbg.setFen("{fen}")')
      for fl in [False,True]:
        await pg.evaluate(f'__dbg.setFlip({str(fl).lower()})'); await pg.wait_for_timeout(700)
        r=await pg.evaluate('''(()=>{const f=document.querySelector('#evalFill'),bar=document.querySelector('#evalBar').getBoundingClientRect(),fr=f.getBoundingClientRect();
          return {white:+document.querySelector('#evalBar').dataset.white, txt:document.querySelector('#evalTxt').textContent, fillTopAtBarTop:Math.abs(fr.top-bar.top)<3, fillH:fr.height, barH:bar.height}})()''')
        # 白方份额应 <50；未翻转时白色在下（靠近白方），翻转时白色在上
        good = cp<0 and r['white']<50 and r['fillH']<r['barH']/2 and r['fillTopAtBarTop']==fl
        ok&=good; print('PASS' if good else 'FAIL',fen.split()[1],'flip' if fl else 'noflip',cp,r)
    print('ALL', 'PASS' if ok else 'FAIL','errs',errs); await b.close()
asyncio.run(main())
