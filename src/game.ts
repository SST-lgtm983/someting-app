import { mulberry32, pick, shuffle, type Rng } from './rng'
import { EVENTS, type EventCard } from './events'

export type Terrain = 'grass' | 'forest' | 'water' | 'rock'
export type Building = 'house' | 'field' | 'well' | 'shrine'
export type Skill = 'farm' | 'wood' | 'pray' | 'build' | 'none'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Phase = 'event' | 'action' | 'over'

export interface Tile {
  terrain: Terrain
  building: Building | null
}
export interface Villager {
  id: number
  name: string
  skill: Skill
  busy: boolean
  temp?: boolean
}
export interface Trait {
  id: string
  name: string
  desc: string
}

export const SIZE = 8
export const TURNS = 12
export const COST: Record<Building, number> = { house: 4, field: 4, well: 3, shrine: 5 }
export const BUILDING_NAME: Record<Building, string> = { house: '家', field: '畑', well: '井戸', shrine: '祠' }
export const SKILL_NAME: Record<Skill, string> = { farm: '農', wood: '木', pray: '祈', build: '建', none: '助' }
export const SEASON_NAME: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }

export const TRAITS: Trait[] = [
  { id: 'fertile', name: '肥えた土', desc: '畑の実りが +1' },
  { id: 'forest', name: '深い森', desc: '伐採で得る木材が +1' },
  { id: 'spring', name: '湧き水', desc: '最初から井戸がある' },
  { id: 'poor', name: '痩せた土', desc: '畑の実りが -1。食料の蓄えが多い' },
  { id: 'cross', name: '街道の村', desc: '木材の蓄えが多い' },
]

const NAMES = ['アキ', 'ハル', 'ソウ', 'ナツ', 'ミオ', 'リク', 'ユイ', 'カイ', 'ヒナ', 'タケ', 'サク', 'ノア']
const SKILLS: Skill[] = ['farm', 'wood', 'pray', 'build']

export const seasonOf = (turn: number): Season =>
  (['spring', 'summer', 'autumn', 'winter'] as const)[Math.min(3, Math.floor((turn - 1) / 3))]

export interface Ending {
  survived: boolean
  score: number
  title: string
  comment: string
}

export class Game {
  readonly seed: number
  readonly rng: Rng
  readonly trait: Trait
  tiles: Tile[][] = []
  villagers: Villager[] = []
  food = 8
  wood = 6
  prayer = 0
  turn = 1
  phase: Phase = 'event'
  log: string[] = []
  event: EventCard | null = null
  ending: Ending | null = null
  apPenalty = 0
  apBonus = 0
  scarecrow = false
  private deck: EventCard[] = []
  private nextId = 1

  constructor(seed: number) {
    this.seed = seed
    this.rng = mulberry32(seed)
    this.trait = pick(this.rng, TRAITS)
    this.makeMap()
    const skills = shuffle(this.rng, SKILLS).slice(0, 3)
    const names = shuffle(this.rng, NAMES)
    for (let i = 0; i < 3; i++) this.addVillager(skills[i], names[i])
    if (this.trait.id === 'poor') this.food += 6
    if (this.trait.id === 'cross') this.wood += 4
    if (this.trait.id === 'spring') {
      const t = this.randomTile((t) => t.terrain === 'grass' && !t.building)
      if (t) t.building = 'well'
    }
    this.deck = shuffle(this.rng, EVENTS)
    this.startTurn()
  }

  // ---- map ----
  private makeMap() {
    const r = this.rng
    const forestCount = this.trait.id === 'forest' ? 16 : 11
    const t: Terrain[] = []
    for (let i = 0; i < SIZE * SIZE; i++) t.push('grass')
    const put = (terrain: Terrain, n: number) => {
      for (let k = 0; k < n; k++) {
        const i = Math.floor(r() * t.length)
        if (t[i] === 'grass') t[i] = terrain
      }
    }
    // water: grow a pond from a seed tile
    const ws = Math.floor(r() * t.length)
    t[ws] = 'water'
    for (let k = 0; k < 6; k++) {
      const base = [...t.keys()].filter((i) => t[i] === 'water')
      const from = pick(r, base)
      const fx = from % SIZE
      const fy = Math.floor(from / SIZE)
      const [dx, dy] = pick(r, [[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
      const nx = fx + dx
      const ny = fy + dy
      if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) t[ny * SIZE + nx] = 'water'
    }
    put('forest', forestCount)
    put('rock', 5)
    for (let y = 0; y < SIZE; y++) {
      this.tiles.push([])
      for (let x = 0; x < SIZE; x++) this.tiles[y].push({ terrain: t[y * SIZE + x], building: null })
    }
  }

  randomTile(pred: (t: Tile, x: number, y: number) => boolean): Tile | null {
    const c: Tile[] = []
    this.eachTile((t, x, y) => {
      if (pred(t, x, y)) c.push(t)
    })
    return c.length ? pick(this.rng, c) : null
  }

  eachTile(fn: (t: Tile, x: number, y: number) => void) {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) fn(this.tiles[y][x], x, y)
  }

  neighbors(x: number, y: number): Tile[] {
    const out: Tile[] = []
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) out.push(this.tiles[ny][nx])
    }
    return out
  }

  count(b: Building): number {
    let n = 0
    this.eachTile((t) => {
      if (t.building === b) n++
    })
    return n
  }

  get season(): Season {
    return seasonOf(this.turn)
  }

  get realVillagers(): Villager[] {
    return this.villagers.filter((v) => !v.temp)
  }

  get freeVillagers(): Villager[] {
    return this.villagers.filter((v) => !v.busy)
  }

  // ---- resources (used by events too) ----
  addFood(n: number) {
    this.food = Math.max(0, this.food + n)
  }
  addWood(n: number) {
    this.wood = Math.max(0, this.wood + n)
  }
  addPrayer(n: number) {
    this.prayer = Math.max(0, this.prayer + n)
  }
  say(msg: string) {
    this.log.push(msg)
    if (this.log.length > 60) this.log.shift()
  }

  addVillager(skill?: Skill, name?: string): Villager | null {
    if (this.realVillagers.length >= 8) return null
    const used = new Set(this.villagers.map((v) => v.name))
    const nm = name ?? (NAMES.filter((n) => !used.has(n))[0] ?? 'ヒト')
    const v: Villager = { id: this.nextId++, name: nm, skill: skill ?? pick(this.rng, SKILLS), busy: false }
    this.villagers.push(v)
    return v
  }

  loseVillager(): Villager | null {
    const real = this.realVillagers
    if (!real.length) return null
    const v = pick(this.rng, real)
    this.villagers = this.villagers.filter((x) => x !== v)
    if (!this.realVillagers.length) this.finish()
    return v
  }

  burnOne(): string {
    const t = this.randomTile((t) => t.building === 'field' || t.building === 'house')
    if (!t) return ''
    const name = BUILDING_NAME[t.building!]
    t.building = null
    return name
  }

  // ---- turn flow ----
  private startTurn() {
    this.villagers = this.villagers.filter((v) => !v.temp)
    for (const v of this.villagers) v.busy = false
    const season = this.season
    if (this.turn === 1 || this.turn % 3 === 1) this.say(`—— ${SEASON_NAME[season]}になった ——`)
    const cap = 3 + this.count('house')
    if (this.turn > 1 && this.realVillagers.length < cap) {
      const v = this.addVillager()
      if (v) this.say(`${v.name}(${SKILL_NAME[v.skill]})が家に住みはじめた。`)
    }
    for (let i = 0; i < this.apBonus; i++) this.villagers.push({ id: this.nextId++, name: '星の子', skill: 'none', busy: false, temp: true })
    this.apBonus = 0
    let sick = this.apPenalty
    this.apPenalty = 0
    for (const v of this.villagers) {
      if (sick > 0 && !v.temp) {
        v.busy = true
        sick--
      }
    }
    this.event = this.drawEvent()
    this.phase = this.event ? 'event' : 'action'
  }

  private drawEvent(): EventCard | null {
    const season = this.season
    const i = this.deck.findIndex((e) => e.seasons.includes(season))
    if (i < 0) return null
    return this.deck.splice(i, 1)[0]
  }

  resolveEvent(choice: number): string {
    if (!this.event || this.phase !== 'event') return ''
    const c = this.event.choices[choice]
    if (!c || (c.ok && !c.ok(this))) return ''
    const msg = c.run(this)
    this.say(`【${this.event.title}】${msg}`)
    this.event = null
    if (this.phase === 'event') this.phase = 'action'
    return msg
  }

  // ---- actions ----
  private skillOf(vid: number): Skill | null {
    const v = this.villagers.find((x) => x.id === vid)
    return v && !v.busy && this.phase === 'action' ? v.skill : null
  }
  private use(vid: number) {
    const v = this.villagers.find((x) => x.id === vid)!
    v.busy = true
  }

  buildCost(type: Building, vid: number): number {
    const s = this.skillOf(vid)
    return Math.max(1, COST[type] - (s === 'build' ? 1 : 0))
  }

  canBuild(x: number, y: number, type: Building, vid: number): boolean {
    const t = this.tiles[y]?.[x]
    return !!t && this.skillOf(vid) !== null && t.terrain === 'grass' && !t.building && this.wood >= this.buildCost(type, vid)
  }

  build(x: number, y: number, type: Building, vid: number): boolean {
    if (!this.canBuild(x, y, type, vid)) return false
    this.addWood(-this.buildCost(type, vid))
    this.tiles[y][x].building = type
    this.use(vid)
    this.say(`${BUILDING_NAME[type]}を建てた。`)
    return true
  }

  canChop(x: number, y: number, vid: number): boolean {
    return this.tiles[y]?.[x]?.terrain === 'forest' && this.skillOf(vid) !== null
  }
  chopYield(vid: number): number {
    return 3 + (this.trait.id === 'forest' ? 1 : 0) + (this.skillOf(vid) === 'wood' ? 1 : 0)
  }
  chop(x: number, y: number, vid: number): boolean {
    if (!this.canChop(x, y, vid)) return false
    const n = this.chopYield(vid)
    this.addWood(n)
    this.tiles[y][x].terrain = 'grass'
    this.use(vid)
    this.say(`木を切った。木材 +${n}`)
    return true
  }

  canFish(x: number, y: number, vid: number): boolean {
    return this.tiles[y]?.[x]?.terrain === 'water' && this.skillOf(vid) !== null
  }
  foodYield(vid: number, base = 1): number {
    const winter = this.season === 'winter' ? 1 : 0
    return Math.max(0, base - winter) + (this.skillOf(vid) === 'farm' ? 1 : 0)
  }
  fish(x: number, y: number, vid: number): boolean {
    if (!this.canFish(x, y, vid)) return false
    const n = this.foodYield(vid, 2)
    this.addFood(n)
    this.use(vid)
    this.say(`魚を獲った。食料 +${n}`)
    return true
  }

  canGather(vid: number): boolean {
    return this.skillOf(vid) !== null
  }
  gather(vid: number): boolean {
    if (!this.canGather(vid)) return false
    const n = this.foodYield(vid)
    this.addFood(n)
    this.use(vid)
    this.say(`木の実や草を集めた。食料 +${n}`)
    return true
  }

  prayYield(vid: number): number {
    return 1 + (this.skillOf(vid) === 'pray' ? 1 : 0)
  }
  pray(vid: number): boolean {
    if (!this.canGather(vid)) return false
    const n = this.prayYield(vid)
    this.addPrayer(n)
    this.use(vid)
    this.say(`祈りを捧げた。祈り +${n}`)
    return true
  }

  // ---- end of turn ----
  fieldYield(x: number, y: number): number {
    const season = this.season
    if (season === 'winter') return 0
    const nb = this.neighbors(x, y)
    let n = 1
    if (this.trait.id === 'fertile') n += 1
    if (this.trait.id === 'poor') n -= 1
    if (nb.some((t) => t.building === 'well')) n += 1
    if (nb.some((t) => t.terrain === 'water')) n += 1
    if (this.scarecrow && season === 'autumn') n += 1
    if (season === 'autumn') n = Math.floor(n * 1.5)
    return Math.max(0, n)
  }

  endTurn(): void {
    if (this.phase !== 'action') return
    let harvest = 0
    this.eachTile((t, x, y) => {
      if (t.building === 'field') harvest += this.fieldYield(x, y)
    })
    if (harvest) {
      this.addFood(harvest)
      this.say(`畑の収穫 食料 +${harvest}`)
    }
    const shrines = this.count('shrine')
    if (shrines) {
      this.addPrayer(shrines)
      this.say(`祠に祈りが集まる。祈り +${shrines}`)
    }
    const per = this.season === 'winter' ? 2 : 1
    const need = this.realVillagers.length * per
    if (this.food >= need) {
      this.food -= need
      this.say(`食事で食料 -${need}`)
    } else {
      const lack = need - this.food
      this.food = 0
      const gone = Math.ceil(lack / 2)
      this.say(`食料が足りない。不足 ${lack}`)
      for (let i = 0; i < gone && (this.phase as Phase) !== 'over'; i++) {
        const v = this.loseVillager()
        if (v) this.say(`${v.name}が村を去った。`)
      }
      if ((this.phase as Phase) === 'over') return
    }
    if (this.turn >= TURNS) {
      this.finish()
      return
    }
    this.turn++
    this.startTurn()
  }

  score(): number {
    let buildings = 0
    this.eachTile((t) => {
      if (t.building) buildings++
    })
    return this.realVillagers.length * 10 + buildings * 2 + Math.floor(this.food / 3) + this.prayer
  }

  finish() {
    this.phase = 'over'
    this.event = null
    const n = this.realVillagers.length
    const score = this.score()
    let title: string
    let comment: string
    if (n === 0) {
      title = '消えた集落'
      comment = '誰もいなくなった村に、風だけが吹いている。'
    } else if (score < 40) {
      title = 'ぎりぎりの越冬'
      comment = '細い煙が、春の空へ立ちのぼる。'
    } else if (score < 60) {
      title = 'ささやかな里'
      comment = '大きくはないが、灯りの絶えない村になった。'
    } else if (score < 80) {
      title = '実りの村'
      comment = '蔵はあたたかく、子どもたちの声が響く。'
    } else {
      title = '語り継がれる里'
      comment = '旅人はこの村の話を、遠い町まで運んでいった。'
    }
    this.ending = { survived: n > 0, score, title, comment }
  }
}
