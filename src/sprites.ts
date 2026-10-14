import { SIZE, type Season, type Skill, type Tile } from './game'

export const TILE = 8
export const MAP_PX = SIZE * TILE

type Pal = Record<string, string>

const BASE: Pal = {
  w: '#3b6fb6', W: '#6ea0e0',
  r: '#9aa0a8', R: '#6b7078',
  T: '#6b4a2b',
  h: '#e8d7b0', H: '#b8453a', d: '#5a3b24',
  f: '#7a5230', s: '#a9a9b0', b: '#3b6fb6',
  y: '#f2c94c', k: '#f0c8a0', e: '#2a2a3a',
}

const SEASON_PAL: Record<Season, Pal> = {
  spring: { g: '#7fc26b', G: '#6aad58', t: '#3f8f4a', F: '#a5d86c' },
  summer: { g: '#5fae52', G: '#4c9843', t: '#2d7a3c', F: '#e8d34a' },
  autumn: { g: '#b8a045', G: '#a28a35', t: '#c8672a', F: '#e6a23c' },
  winter: { g: '#dfe9f2', G: '#c4d3e2', t: '#4f7d68', F: '#f4f8fb' },
}

export const palette = (s: Season): Pal => ({ ...BASE, ...SEASON_PAL[s] })

export const SKILL_COLOR: Record<Skill, string> = {
  farm: '#6ab04c',
  wood: '#b07a3c',
  pray: '#9b6bd1',
  build: '#e0803a',
  none: '#e8d34a',
}

const S = {
  forest: [
    'gggttggg',
    'ggttttgg',
    'gtttttgg',
    'ggtttttg',
    'gttttttg',
    'gggTgggg',
    'gggTgggg',
    'gggggggg',
  ],
  water: [
    'wwwwwwww',
    'wWWwwwww',
    'wwwwwwWW',
    'wwwwwwww',
    'wWWwwwww',
    'wwwwwwWW',
    'wwwwwwww',
    'wwWWwwww',
  ],
  rock: [
    'gggggggg',
    'ggrrrggg',
    'grrrrrgg',
    'grrrRrrg',
    'grrRRrrg',
    'gRRRRRRg',
    'gggggggg',
    'gggggggg',
  ],
  house: [
    'gggHHggg',
    'ggHHHHgg',
    'gHHHHHHg',
    'HHHHHHHH',
    'ghhhhhhg',
    'ghhddhhg',
    'ghhddhhg',
    'gggggggg',
  ],
  field: [
    'ffffffff',
    'FfFfFfFf',
    'ffffffff',
    'fFfFfFfF',
    'ffffffff',
    'FfFfFfFf',
    'ffffffff',
    'fFfFfFfF',
  ],
  well: [
    'gggggggg',
    'ggssssgg',
    'gssbbssg',
    'gsbbbbsg',
    'gssbbssg',
    'ggssssgg',
    'gggggggg',
    'gggggggg',
  ],
  shrine: [
    'HHHHHHHH',
    'gHHHHHHg',
    'gHggggHg',
    'gHHHHHHg',
    'gHggggHg',
    'gHggyyHg',
    'gHggggHg',
    'gggggggg',
  ],
} as const

const VILLAGER = [
  '..hhhh..',
  '.hkkkkh.',
  '..kekek.',
  '..kkkk..',
  '.cccccc.',
  '.cccccc.',
  '..cc.cc.',
  '..ee.ee.',
]

function paint(ctx: CanvasRenderingContext2D, rows: readonly string[], pal: Pal, ox: number, oy: number) {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const c = pal[rows[y][x]]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(ox + x, oy + y, 1, 1)
    }
  }
}

export function drawTile(ctx: CanvasRenderingContext2D, tile: Tile, x: number, y: number, season: Season) {
  const pal = palette(season)
  const ox = x * TILE
  const oy = y * TILE
  ctx.fillStyle = pal.g
  ctx.fillRect(ox, oy, TILE, TILE)
  // 草地のちらばり(位置から決まるので毎回同じ)
  const h = (x * 73 + y * 151) % 7
  ctx.fillStyle = pal.G
  ctx.fillRect(ox + ((h * 3) % 6) + 1, oy + ((h * 5) % 6) + 1, 1, 1)
  ctx.fillRect(ox + ((h * 5 + 3) % 6) + 1, oy + ((h * 2 + 4) % 6) + 1, 1, 1)
  const key = tile.building ?? (tile.terrain === 'grass' ? null : tile.terrain)
  if (key) paint(ctx, S[key], pal, ox, oy)
  if (key === 'water' && season === 'winter') {
    ctx.fillStyle = 'rgba(223,233,242,.55)'
    ctx.fillRect(ox, oy, TILE, TILE)
  }
}

export function drawMap(ctx: CanvasRenderingContext2D, tiles: Tile[][], season: Season, sel: { x: number; y: number } | null) {
  ctx.clearRect(0, 0, MAP_PX, MAP_PX)
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) drawTile(ctx, tiles[y][x], x, y, season)
  if (sel) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.strokeRect(sel.x * TILE + 0.5, sel.y * TILE + 0.5, TILE - 1, TILE - 1)
    ctx.strokeStyle = '#1a1a2e'
    ctx.strokeRect(sel.x * TILE + 1.5, sel.y * TILE + 1.5, TILE - 3, TILE - 3)
  }
}

export function drawVillager(ctx: CanvasRenderingContext2D, skill: Skill, busy: boolean) {
  ctx.clearRect(0, 0, 8, 8)
  paint(ctx, VILLAGER, { h: '#4a3426', k: '#f0c8a0', e: busy ? '#5a5a6a' : '#2a2a3a', c: busy ? '#6a6a7a' : SKILL_COLOR[skill] }, 0, 0)
}
