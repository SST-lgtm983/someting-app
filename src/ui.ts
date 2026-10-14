import {
  BUILDING_NAME,
  COST,
  Game,
  SEASON_NAME,
  SKILL_NAME,
  TURNS,
  type Building,
  type Tile,
} from './game'
import { drawMap, drawVillager, MAP_PX, TILE } from './sprites'
import { makePostcard } from './postcard'

const BUILDINGS: Building[] = ['field', 'house', 'well', 'shrine']
const BUILDING_DESC: Record<Building, string> = {
  field: '食料を育てる。井戸・水辺の隣だと実りが増える。冬は実らない。',
  house: '建てると村人が増えられる。人が増えれば手も増える(食べる量も)。',
  well: '隣り合う畑の実りが +1。',
  shrine: '毎ターン祈りが 1 たまる。祈りは出来事を乗り切る力になる。',
}
const TERRAIN_NAME = { grass: '草地', forest: '森', water: '水辺', rock: '岩場' }
const BEST_KEY = 'juni-no-kisetsu:best'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function bestScore(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0)
  } catch {
    return 0
  }
}
function saveBest(n: number) {
  try {
    if (n > bestScore()) localStorage.setItem(BEST_KEY, String(n))
  } catch {
    /* 保存できなくても遊べる */
  }
}

export function mount(root: HTMLElement) {
  let game: Game | null = null
  let sel: { x: number; y: number } | null = null
  let selVid: number | null = null
  let resultMsg: string | null = null
  let card: HTMLCanvasElement | null = null

  root.innerHTML = `
    <div class="game" id="game">
      <header class="bar panel">
        <div class="title">十二の季節</div>
        <div id="season" class="season"></div>
      </header>
      <main class="main">
        <section class="mapcol">
          <div class="mapframe panel"><canvas id="map" width="${MAP_PX}" height="${MAP_PX}"></canvas></div>
          <div id="tile" class="panel tile"></div>
        </section>
        <aside class="side">
          <div id="res" class="panel res"></div>
          <div id="people" class="panel"></div>
          <div id="acts" class="panel"></div>
          <div id="log" class="panel log"></div>
        </aside>
      </main>
    </div>
    <div id="modal" class="modal" hidden></div>
  `
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!
  const gameEl = $('game')
  const canvas = $<HTMLCanvasElement>('map')
  const ctx = canvas.getContext('2d')!

  function freeSel() {
    if (!game) return
    const free = game.freeVillagers
    if (!free.some((v) => v.id === selVid)) selVid = free[0]?.id ?? null
  }

  function tileHtml(t: Tile | null): string {
    if (!game || !sel || !t) return `<p class="dim">マップのマスをタップすると、できることが出ます。</p>`
    const g = game
    const vid = selVid
    const can = g.phase === 'action' && vid !== null
    const head = `<h3>${t.building ? BUILDING_NAME[t.building] : TERRAIN_NAME[t.terrain]} <span class="dim">(${sel.x + 1},${sel.y + 1})</span></h3>`
    if (t.building) {
      let extra = ''
      if (t.building === 'field') extra = `<p>今季の実り: <b>${g.fieldYield(sel.x, sel.y)}</b></p>`
      return head + `<p>${BUILDING_DESC[t.building]}</p>` + extra
    }
    if (t.terrain === 'rock') return head + `<p class="dim">動かせない岩。</p>`
    if (t.terrain === 'forest')
      return head + `<button class="btn" data-act="chop" ${can && g.canChop(sel.x, sel.y, vid!) ? '' : 'disabled'}>木を切る 木材+${vid !== null ? g.chopYield(vid) : 3}<small>切ると草地になる</small></button>`
    if (t.terrain === 'water')
      return head + `<button class="btn" data-act="fish" ${can && g.canFish(sel.x, sel.y, vid!) ? '' : 'disabled'}>魚を獲る 食料+${vid !== null ? g.foodYield(vid, 2) : 2}</button>`
    const opts = BUILDINGS.map((b) => {
      const cost = vid !== null ? g.buildCost(b, vid) : COST[b]
      const ok = can && g.canBuild(sel!.x, sel!.y, b, vid!)
      return `<button class="btn" data-act="build" data-b="${b}" ${ok ? '' : 'disabled'}>${BUILDING_NAME[b]}を建てる<small>木材 ${cost}</small></button>`
    }).join('')
    return head + `<div class="grid2">${opts}</div>`
  }

  function render() {
    const g = game
    if (!g) {
      showTitle()
      return
    }
    freeSel()
    gameEl.dataset.season = g.season
    $('season').innerHTML = `<span class="chip">${SEASON_NAME[g.season]}</span> ${Math.min(g.turn, TURNS)} / ${TURNS} ヶ月`
    drawMap(ctx, g.tiles, g.season, sel)

    $('res').innerHTML = `
      <div class="r"><span class="ico food"></span>食料 <b>${g.food}</b></div>
      <div class="r"><span class="ico wood"></span>木材 <b>${g.wood}</b></div>
      <div class="r"><span class="ico pray"></span>祈り <b>${g.prayer}</b></div>
      <div class="r dim">${esc(g.trait.name)}:${esc(g.trait.desc)}</div>`

    const eat = g.realVillagers.length * (g.season === 'winter' ? 2 : 1)
    $('people').innerHTML = `
      <h3>村人 <span class="dim">(食事 ${eat}/月)</span></h3>
      <div class="people">${g.villagers
        .map(
          (v) =>
            `<button class="vill ${v.busy ? 'busy' : ''} ${v.id === selVid ? 'sel' : ''}" data-vid="${v.id}" ${v.busy ? 'disabled' : ''}><canvas width="8" height="8" data-sk="${v.skill}" data-busy="${v.busy ? 1 : 0}"></canvas><span>${esc(v.name)}</span><small>${SKILL_NAME[v.skill]}</small></button>`,
        )
        .join('')}</div>
      <p class="dim hint">得意な仕事だと +1(建=木材-1)</p>`
    root.querySelectorAll<HTMLCanvasElement>('.vill canvas').forEach((c) => {
      drawVillager(c.getContext('2d')!, c.dataset.sk as never, c.dataset.busy === '1')
    })

    const vid = selVid
    const can = g.phase === 'action' && vid !== null
    $('acts').innerHTML = `
      <div class="grid2">
        <button class="btn" data-act="gather" ${can ? '' : 'disabled'}>採集<small>食料 +${vid !== null ? g.foodYield(vid) : 1}</small></button>
        <button class="btn" data-act="pray" ${can ? '' : 'disabled'}>祈る<small>祈り +${vid !== null ? g.prayYield(vid) : 1}</small></button>
      </div>
      <button class="btn primary wide" data-act="end" ${g.phase === 'action' ? '' : 'disabled'}>${g.turn >= TURNS ? '冬を越す' : '1ヶ月を終える'}</button>`

    $('tile').innerHTML = tileHtml(sel ? g.tiles[sel.y][sel.x] : null)
    const log = $('log')
    log.innerHTML = g.log
      .slice(-7)
      .map((l) => `<div>${esc(l)}</div>`)
      .join('')
    log.scrollTop = log.scrollHeight
    renderModal()
  }

  // ---- modal ----
  const modal = $('modal')
  function setModal(html: string | null) {
    if (html === null) {
      modal.hidden = true
      modal.innerHTML = ''
    } else {
      modal.hidden = false
      modal.innerHTML = `<div class="dialog panel">${html}</div>`
    }
  }

  function showTitle() {
    const best = bestScore()
    setModal(`
      <h1>十二の季節</h1>
      <p>小さな村をひとつ預かり、十二ヶ月を生きのびる。</p>
      <p>春に種をまき、秋に蓄え、冬を越せ。</p>
      <ul class="rules">
        <li>村人に仕事を割り振り、建物を建てる</li>
        <li>毎月ひとつ、出来事が起きる</li>
        <li>冬の食事は倍。蔵をからにしないこと</li>
      </ul>
      ${best ? `<p class="dim">ベストスコア ${best}</p>` : ''}
      <button class="btn primary wide" data-act="start">村をひらく</button>`)
  }

  function renderModal() {
    const g = game
    if (!g) return
    if (g.phase === 'over') {
      showEnd()
      return
    }
    if (resultMsg !== null) {
      setModal(`<h2>${esc(g.log.at(-1)?.match(/^【(.+?)】/)?.[1] ?? '')}</h2><p class="result">${esc(resultMsg)}</p><button class="btn primary wide" data-act="next">つづける</button>`)
      return
    }
    if (g.phase === 'event' && g.event) {
      const e = g.event
      setModal(`
        <div class="evtag">${SEASON_NAME[g.season]} ${g.turn}ヶ月目</div>
        <h2>${esc(e.title)}</h2>
        <p>${esc(e.text)}</p>
        ${e.choices
          .map((c, i) => `<button class="btn wide" data-act="choice" data-i="${i}" ${!c.ok || c.ok(g) ? '' : 'disabled'}>${esc(c.label)}<small>${esc(c.hint)}</small></button>`)
          .join('')}`)
      return
    }
    setModal(null)
  }

  async function showEnd() {
    const g = game!
    if (!g.ending) return
    saveBest(g.ending.score)
    setModal(`<h2>${esc(g.ending.title)}</h2><p>${esc(g.ending.comment)}</p><p class="dim">ポストカードを作っています…</p>`)
    card = await makePostcard(g)
    if (game !== g) return
    setModal(`
      <h2>${g.ending.survived ? '冬を越えた' : '村は終わった'}</h2>
      <div class="card"></div>
      <p class="dim">スコア ${g.ending.score}(ベスト ${bestScore()})</p>
      <div class="grid2">
        <button class="btn" data-act="save">画像を保存</button>
        <button class="btn primary" data-act="restart">もう一度</button>
      </div>`)
    const slot = modal.querySelector('.card')!
    card.className = 'postcard'
    slot.appendChild(card)
  }

  // ---- input ----
  canvas.addEventListener('click', (ev) => {
    if (!game) return
    const r = canvas.getBoundingClientRect()
    const x = Math.floor(((ev.clientX - r.left) / r.width) * (MAP_PX / TILE))
    const y = Math.floor(((ev.clientY - r.top) / r.height) * (MAP_PX / TILE))
    if (x < 0 || y < 0 || x >= MAP_PX / TILE || y >= MAP_PX / TILE) return
    sel = { x, y }
    render()
  })

  root.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act],[data-vid]')
    if (!el || (el as HTMLButtonElement).disabled) return
    const g = game
    if (el.dataset.vid) {
      selVid = Number(el.dataset.vid)
      render()
      return
    }
    const act = el.dataset.act
    if (act === 'start' || act === 'restart') {
      game = new Game((Math.random() * 1e6) >>> 0)
      sel = null
      selVid = null
      resultMsg = null
      card = null
      render()
      return
    }
    if (!g) return
    const vid = selVid
    switch (act) {
      case 'choice':
        resultMsg = g.resolveEvent(Number(el.dataset.i)) || null
        break
      case 'next':
        resultMsg = null
        break
      case 'gather':
        if (vid !== null) g.gather(vid)
        break
      case 'pray':
        if (vid !== null) g.pray(vid)
        break
      case 'chop':
        if (vid !== null && sel) g.chop(sel.x, sel.y, vid)
        break
      case 'fish':
        if (vid !== null && sel) g.fish(sel.x, sel.y, vid)
        break
      case 'build':
        if (vid !== null && sel) g.build(sel.x, sel.y, el.dataset.b as Building, vid)
        break
      case 'end':
        g.endTurn()
        break
      case 'save': {
        if (!card) return
        const a = document.createElement('a')
        a.href = card.toDataURL('image/png')
        a.download = `juni-no-kisetsu-${g.seed}.png`
        a.click()
        return
      }
    }
    render()
  })

  render()
}
