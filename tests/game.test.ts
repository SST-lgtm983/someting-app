import { describe, expect, it } from 'vitest'
import { Game, TURNS, type Building } from '../src/game'

// 単純な方針で一周遊ぶボット。バランスと進行の確認用。
function play(seed: number): Game {
  const g = new Game(seed)
  let guard = 0
  while (g.phase !== 'over' && guard++ < 500) {
    if (g.phase === 'event') {
      const ev = g.event!
      const idx = ev.choices.findIndex((c) => !c.ok || c.ok(g))
      g.resolveEvent(idx < 0 ? 1 : idx)
      continue
    }
    for (const v of [...g.freeVillagers]) {
      const wantField = g.count('field') < 3 + Math.floor(g.turn / 4)
      let done = false
      if (g.season !== 'winter' && g.wood >= g.buildCost('field', v.id) && wantField) {
        let target: [number, number] | null = null
        g.eachTile((t, x, y) => {
          if (!target && t.terrain === 'grass' && !t.building) target = [x, y]
        })
        if (target) done = g.build(target[0], target[1], 'field' as Building, v.id)
      }
      if (done) continue
      if (g.wood < 6) {
        let f: [number, number] | null = null
        g.eachTile((t, x, y) => {
          if (!f && t.terrain === 'forest') f = [x, y]
        })
        if (f && g.chop(f[0], f[1], v.id)) continue
      }
      if (g.food < g.realVillagers.length * 6) g.gather(v.id)
      else g.pray(v.id)
    }
    g.endTurn()
  }
  return g
}

describe('game', () => {
  it('同じシードなら同じ村になる', () => {
    const a = new Game(42)
    const b = new Game(42)
    expect(a.tiles).toEqual(b.tiles)
    expect(a.trait.id).toBe(b.trait.id)
  })

  it('12ターンで必ず終わる', () => {
    for (let s = 1; s <= 50; s++) {
      const g = play(s)
      expect(g.phase).toBe('over')
      expect(g.ending).not.toBeNull()
      expect(g.turn).toBeLessThanOrEqual(TURNS)
    }
  })

  it('何もしないと冬を越せない', () => {
    let survived = 0
    for (let s = 1; s <= 30; s++) {
      const g = new Game(s)
      let guard = 0
      while (g.phase !== 'over' && guard++ < 100) {
        if (g.phase === 'event') {
          if (!g.resolveEvent(1)) g.resolveEvent(0)
        } else g.endTurn()
      }
      if (g.ending!.survived) survived++
    }
    expect(survived).toBeLessThan(15)
  })

  it('単純なボットは半分以上が生き残り、全員は生き残らない', () => {
    let survived = 0
    const scores: number[] = []
    for (let s = 1; s <= 200; s++) {
      const g = play(s)
      if (g.ending!.survived) survived++
      scores.push(g.ending!.score)
    }
    console.log('survived', survived, '/200', 'avg score', (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
    expect(survived).toBeGreaterThan(100)
    expect(survived).toBeLessThan(200)
  })
})
