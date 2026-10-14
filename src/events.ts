import type { Game, Season } from './game'

export interface EventChoice {
  label: string
  hint: string
  ok?: (g: Game) => boolean
  run: (g: Game) => string
}
export interface EventCard {
  id: string
  title: string
  text: string
  seasons: Season[]
  choices: [EventChoice, EventChoice]
}

const ALL: Season[] = ['spring', 'summer', 'autumn', 'winter']

export const EVENTS: EventCard[] = [
  {
    id: 'merchant',
    title: '旅の商人',
    text: '荷車を引いた商人が、村の入口で足を止めた。',
    seasons: ['spring', 'summer', 'autumn'],
    choices: [
      {
        label: '取引する',
        hint: '食料 -3 / 木材 +5',
        ok: (g) => g.food >= 3,
        run: (g) => {
          g.addFood(-3)
          g.addWood(5)
          return '干し肉と引き換えに、良い木材を手に入れた。'
        },
      },
      { label: '見送る', hint: '何も起きない', run: () => '商人は手を振って去っていった。' },
    ],
  },
  {
    id: 'rain',
    title: '長雨',
    text: '空が低く、雨が何日も降り続いている。',
    seasons: ['spring', 'summer'],
    choices: [
      {
        label: '雨乞いを止める祈り',
        hint: '祈り -1',
        ok: (g) => g.prayer >= 1,
        run: (g) => {
          g.addPrayer(-1)
          return '祈りが通じ、雲が割れた。被害はなかった。'
        },
      },
      {
        label: 'じっと耐える',
        hint: '食料 -3',
        run: (g) => {
          g.addFood(-3)
          return '蔵が湿り、食料が傷んだ。'
        },
      },
    ],
  },
  {
    id: 'stray',
    title: '迷い人',
    text: 'やせた旅人が、村の端でうずくまっている。',
    seasons: ['spring', 'summer', 'autumn'],
    choices: [
      {
        label: '迎え入れる',
        hint: '食料 -2 / 村人 +1',
        ok: (g) => g.food >= 2 && g.realVillagers.length < 8,
        run: (g) => {
          g.addFood(-2)
          const v = g.addVillager()
          return v ? `${v.name}と名乗る旅人が、村の一員になった。` : '村はこれ以上増えられなかった。'
        },
      },
      { label: '見送る', hint: '何も起きない', run: () => '旅人は、夕暮れの道へ消えていった。' },
    ],
  },
  {
    id: 'fire',
    title: '野火',
    text: '乾いた風にあおられて、山のほうから火が迫っている。',
    seasons: ['summer', 'autumn'],
    choices: [
      {
        label: '総出で消す',
        hint: '木材 -2',
        ok: (g) => g.wood >= 2,
        run: (g) => {
          g.addWood(-2)
          return '火のついた枝を払い、なんとか食い止めた。'
        },
      },
      {
        label: 'なすすべなく見守る',
        hint: '畑か家が 1 つ焼ける',
        run: (g) => {
          const lost = g.burnOne()
          if (lost) return `${lost}がひとつ焼け落ちた。`
          g.addFood(-2)
          return '幸い焼ける建物はなかったが、蓄えを少し失った。'
        },
      },
    ],
  },
  {
    id: 'fish',
    title: '豊漁の知らせ',
    text: '川下の村から、魚が上ってきたと知らせが届いた。',
    seasons: ['spring', 'summer', 'autumn'],
    choices: [
      {
        label: '総出で獲る',
        hint: '食料 +4',
        run: (g) => {
          g.addFood(4)
          return 'かごいっぱいの魚が蔵を満たした。'
        },
      },
      {
        label: '感謝の宴を開く',
        hint: '食料 +2 / 祈り +1',
        run: (g) => {
          g.addFood(2)
          g.addPrayer(1)
          return '魚を分け合い、川に感謝を捧げた。'
        },
      },
    ],
  },
  {
    id: 'bandit',
    title: '山賊の影',
    text: '夜、丘の上に火が見えた。見知らぬ男たちが村を窺っている。',
    seasons: ['summer', 'autumn', 'winter'],
    choices: [
      {
        label: '贈り物で帰ってもらう',
        hint: '木材 -3',
        ok: (g) => g.wood >= 3,
        run: (g) => {
          g.addWood(-3)
          return '男たちは木材を担ぎ、夜の山へ戻っていった。'
        },
      },
      {
        label: '立ち向かう',
        hint: '半々で、村人 -1 / 食料 -2',
        run: (g) => {
          if (g.rng() < 0.5) {
            g.addPrayer(1)
            return '村人の声に驚き、男たちは逃げていった。祈り +1'
          }
          g.addFood(-2)
          const v = g.loseVillager()
          return v ? `食料を奪われ、${v.name}が傷つき村を出た。` : '食料を奪われた。'
        },
      },
    ],
  },
  {
    id: 'sick',
    title: '流行り病',
    text: '咳をする者が、ひとり、またひとりと増えていく。',
    seasons: ['autumn', 'winter'],
    choices: [
      {
        label: '祈りで癒す',
        hint: '祈り -2',
        ok: (g) => g.prayer >= 2,
        run: (g) => {
          g.addPrayer(-2)
          return '祈りの夜が明けると、熱は引いていた。'
        },
      },
      {
        label: '寝かせて様子を見る',
        hint: '次のターン、働ける人が 1 人減る',
        run: (g) => {
          g.apPenalty += 1
          return '村人のひとりが、しばらく床についた。'
        },
      },
    ],
  },
  {
    id: 'birds',
    title: '鳥の群れ',
    text: '黒い鳥が、実りかけた畑の上を旋回している。',
    seasons: ['spring', 'summer'],
    choices: [
      {
        label: '案山子を立てる',
        hint: '木材 -2 / 秋の畑の実りが +1',
        ok: (g) => g.wood >= 2,
        run: (g) => {
          g.addWood(-2)
          g.scarecrow = true
          return '立派な案山子が畑を見守ることになった。'
        },
      },
      {
        label: 'あきらめる',
        hint: '食料 -2',
        run: (g) => {
          g.addFood(-2)
          return '鳥たちは満足して去っていった。'
        },
      },
    ],
  },
  {
    id: 'festival',
    title: '祭りの誘い',
    text: '誰かが言った。「そろそろ、祭りをやらないか」',
    seasons: ['spring', 'autumn', 'winter'],
    choices: [
      {
        label: '祭りを開く',
        hint: '食料 -3 / 祈り +3',
        ok: (g) => g.food >= 3,
        run: (g) => {
          g.addFood(-3)
          g.addPrayer(3)
          return '笛と太鼓が夜通し響いた。祈りが満ちていく。'
        },
      },
      { label: '見送る', hint: '何も起きない', run: () => '静かな夜が過ぎた。' },
    ],
  },
  {
    id: 'oldwell',
    title: '古い井戸跡',
    text: '畑の端で、土が崩れて古い石組みが顔を出した。',
    seasons: ALL,
    choices: [
      {
        label: '掘ってみる',
        hint: '木材 -2 / 6割で食料 +5',
        ok: (g) => g.wood >= 2,
        run: (g) => {
          g.addWood(-2)
          if (g.rng() < 0.6) {
            g.addFood(5)
            return '昔の人が残した蔵だった。保存食 +5'
          }
          return '何も出てこなかった。ただの石だ。'
        },
      },
      {
        label: '祈って埋める',
        hint: '祈り +1',
        run: (g) => {
          g.addPrayer(1)
          return '土を戻し、手を合わせた。'
        },
      },
    ],
  },
  {
    id: 'stars',
    title: '星降る夜',
    text: '夜空に、いくつもの光が尾を引いて流れていく。',
    seasons: ['summer', 'autumn', 'winter'],
    choices: [
      {
        label: '願いごとをする',
        hint: '祈り +2',
        run: (g) => {
          g.addPrayer(2)
          return '誰もが同じ空を見上げていた。祈り +2'
        },
      },
      {
        label: '早く寝て備える',
        hint: '次のターン、手が 1 人分増える',
        run: (g) => {
          g.apBonus += 1
          return '翌朝、村はいつもより早く動き出した。'
        },
      },
    ],
  },
  {
    id: 'frost',
    title: '霜の朝',
    text: '朝、あたり一面が白く光っていた。井戸の水も固い。',
    seasons: ['winter'],
    choices: [
      {
        label: '薪をくべる',
        hint: '木材 -2',
        ok: (g) => g.wood >= 2,
        run: (g) => {
          g.addWood(-2)
          return '家々に火が入り、静かな朝になった。'
        },
      },
      {
        label: '身を寄せて耐える',
        hint: '食料 -3',
        run: (g) => {
          g.addFood(-3)
          return '体を温めるために、いつもより多く食べた。'
        },
      },
    ],
  },
]
