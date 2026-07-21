import type {
  JoyCapsule,
  WorldScene,
  WorldSceneBiome,
  WorldSceneElement,
} from './joyCapsule'

export function hashWorld(value: string) {
  let result = 5381
  for (const character of value) result = (result * 33) ^ character.charCodeAt(0)
  return result >>> 0
}

function fallbackBiome(capsule: JoyCapsule): WorldSceneBiome {
  const words = `${capsule.visualDirection} ${capsule.story} ${capsule.soundMood}`.toLowerCase()
  if (/sea|ocean|tide|wave|coral|harbour|boat/.test(words)) return 'moonlit-sea'
  if (/forest|garden|flower|moss|leaf|bloom|cloud/.test(words)) return 'cloud-garden'
  if (/star|moon|night|cosmic|planet|comet|space/.test(words)) return 'star-harbor'
  if (/rainbow|sun|gold|bright|citrus|warm/.test(words)) return 'sunrise-meadow'
  return 'night-interior'
}

type FallbackArrangement = {
  backdrop: string
  elements: WorldSceneElement[]
}

// Hand-tuned impossible arrangements used when a capsule arrives without an
// AI-cast scene (for example from a free model that cannot hold the schema).
// Their descriptions still feed the image generator when one is available.
const fallbackArrangements: FallbackArrangement[] = [
  {
    backdrop: 'an upside-down dream sky where soft ocean waves roll along the top of the heavens',
    elements: [
      { description: 'gentle painted ocean waves rolling upside-down across the sky', sprite: 'wave', size: 'grand', x: 50, y: 10, flip: true, motion: 'drift' },
      { description: 'a colossal glowing crescent moon resting low like a heavy pearl', sprite: 'crescent-moon', size: 'colossal', x: 72, y: 66, flip: false, motion: 'float' },
      { description: 'a tiny wooden boat with one warm lantern sailing through open air', sprite: 'lantern-boat', size: 'small', x: 26, y: 30, flip: false, motion: 'bob' },
      { description: 'a small painted star spinning slowly like a pinwheel', sprite: 'star', size: 'tiny', x: 14, y: 62, flip: false, motion: 'spin-slow' },
    ],
  },
  {
    backdrop: 'a garden of enormous soft clouds growing from the ground like hills',
    elements: [
      { description: 'an enormous soft cloud bank growing from the ground like a hillside', sprite: 'cloud', size: 'grand', x: 30, y: 80, flip: false, motion: 'drift' },
      { description: 'a small arched doorway floating alone in the open sky', sprite: 'garden-door', size: 'small', x: 68, y: 26, flip: false, motion: 'float' },
      { description: 'a grand lantern boat sailing across the middle of the air', sprite: 'lantern-boat', size: 'grand', x: 40, y: 52, flip: true, motion: 'bob' },
      { description: 'a tiny golden star turning slowly', sprite: 'star', size: 'tiny', x: 84, y: 70, flip: false, motion: 'spin-slow' },
      { description: 'a tiny silver star drifting upward', sprite: 'star', size: 'tiny', x: 12, y: 18, flip: false, motion: 'float' },
    ],
  },
  {
    backdrop: 'a colossal tide cresting beneath a floating lantern that stands on nothing',
    elements: [
      { description: 'a tiny crescent moon bobbing near the ground like a lost toy', sprite: 'crescent-moon', size: 'tiny', x: 22, y: 74, flip: false, motion: 'bob' },
      { description: 'a colossal painted wave cresting across the whole horizon', sprite: 'wave', size: 'colossal', x: 50, y: 88, flip: false, motion: 'drift' },
      { description: 'a grand stone doorway full of golden light standing on nothing', sprite: 'garden-door', size: 'grand', x: 74, y: 40, flip: true, motion: 'float' },
      { description: 'a small dusk cloud drifting backwards', sprite: 'cloud', size: 'small', x: 18, y: 22, flip: true, motion: 'drift' },
    ],
  },
]

export function resolveScene(capsule: JoyCapsule): WorldScene {
  if (capsule.scene) return capsule.scene
  const seed = hashWorld(`${capsule.worldName}:${capsule.visualDirection}`)
  const arrangement = fallbackArrangements[seed % fallbackArrangements.length]
  const jitter = (index: number, span: number) => ((seed >> (index * 3)) % (span * 2)) - span
  return {
    backdrop: arrangement.backdrop,
    biome: fallbackBiome(capsule),
    elements: arrangement.elements.map((element, index) => ({
      ...element,
      x: Math.min(92, Math.max(8, element.x + jitter(index, 6))),
      y: Math.min(90, Math.max(8, element.y + jitter(index + 1, 5))),
    })),
  }
}
