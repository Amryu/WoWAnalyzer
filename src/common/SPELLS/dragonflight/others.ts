import Spell from '../Spell';

const others = {
  DRACONIC_AUGMENT_RUNE: {
    id: 393438,
    name: 'Draconic Augment Rune',
    icon: 'inv_10_jewelcrafting3_rainbowprism_color2',
  },
  WAFTING_DEVOTION: {
    id: 390357,
    name: 'Wafting Devotion',
    icon: 'inv_10_elementalcombinedfoozles_air',
  },
  POWER_BEYOND_IMAGINATION: {
    id: 409447,
    name: 'Power Beyond Imagination',
    icon: 'inv_cosmicvoid_debuff',
  },
  // 'Disintegrate' ability from The Forgotten Experiements encounter
  RIONTHUS_DISINTEGRATE: {
    id: 405457,
    name: 'Disintegrate',
    icon: 'ability_evoker_disintegrate',
  },
} satisfies Record<string, Spell>;

export default others;
