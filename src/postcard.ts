import { SEASON_NAME, type Game } from './game'
import { drawMap, MAP_PX } from './sprites'

const W = 640
const H = 504
const MAP_SCALE = 6

export async function makePostcard(g: Game): Promise<HTMLCanvasElement> {
  try {
    await document.fonts.load('20px DotGothic16', 'あ')
  } catch {
    /* フォントが無くても描ける */
  }
  const font = (px: number) => `${px}px DotGothic16, monospace`
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#f4ead0'
  ctx.fillRect(8, 8, W - 16, H - 16)
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(12, 12, W - 24, H - 24)
  ctx.fillStyle = '#2a2a48'
  ctx.fillRect(16, 16, W - 32, H - 32)

  const map = document.createElement('canvas')
  map.width = MAP_PX
  map.height = MAP_PX
  drawMap(map.getContext('2d')!, g.tiles, 'summer', null)
  const mx = 36
  const my = 36
  const ms = MAP_PX * MAP_SCALE
  ctx.fillStyle = '#f4ead0'
  ctx.fillRect(mx - 4, my - 4, ms + 8, ms + 8)
  ctx.drawImage(map, mx, my, ms, ms)

  const tx = mx + ms + 28
  ctx.fillStyle = '#f4ead0'
  ctx.textBaseline = 'top'
  ctx.font = font(14)
  ctx.fillStyle = '#9aa0c8'
  ctx.fillText('十二の季節', tx, 40)
  ctx.font = font(26)
  ctx.fillStyle = '#f2c94c'
  const title = g.ending?.title ?? ''
  ctx.fillText(title, tx, 64)

  ctx.font = font(18)
  ctx.fillStyle = '#f4ead0'
  const lines = [
    `村人    ${g.realVillagers.length} 人`,
    `家      ${g.count('house')}`,
    `畑      ${g.count('field')}`,
    `井戸    ${g.count('well')}`,
    `祠      ${g.count('shrine')}`,
    `食料    ${g.food}`,
    `祈り    ${g.prayer}`,
  ]
  lines.forEach((l, i) => ctx.fillText(l, tx, 118 + i * 26))
  ctx.font = font(22)
  ctx.fillStyle = '#7fc26b'
  ctx.fillText(`スコア ${g.ending?.score ?? 0}`, tx, 118 + lines.length * 26 + 10)

  ctx.font = font(14)
  ctx.fillStyle = '#c8c8e0'
  ctx.fillText(g.ending?.comment ?? '', mx, my + ms + 22)
  ctx.font = font(12)
  ctx.fillStyle = '#7a7aa0'
  ctx.fillText(`${g.trait.name}の村 / ${SEASON_NAME.winter}${g.ending?.survived ? 'を越えて' : 'に力尽きて'} / #${g.seed}`, mx, my + ms + 46)
  return c
}
