enum SortState {
  up = 'up',
  down = 'down',
}

enum EditorMode {
  Trajectory = 'Trajectory',
  Series = 'Series',
  PhraseDiv = 'PhraseDiv',
  Meter = 'Meter',
  Chikari = 'Chikari',
  Region = 'Region',
  None = 'None',
}

enum Instrument {
  Sitar = 'Sitar',
  Sarangi = 'Sarangi',
  Vocal_M = 'Vocal (M)',
  Vocal_F = 'Vocal (F)',
  Bansuri = 'Bansuri',
  Esraj = 'Esraj',
  Rabab = 'Rabab',
  Santoor = 'Santoor',
  Sarod = 'Sarod',
  Shehnai = 'Shehnai',
  Surbahar = 'Surbahar',
  Veena_Saraswati = 'Veena (Saraswati)',
  Veena_Vichitra = 'Veena (Vichitra)',
  Veena_Rudra_Bin = 'Veena (Rudra Bin)',
  Violin = 'Violin',
  Harmonium = 'Harmonium',
}

enum ControlsMode {
  Display = 'Display',
  Tag = 'Tag',
  Meter = 'Meter',
  Download = 'Download',
  Tuning = 'Tuning',
  Synthesis = 'Synthesis',
  None = 'None',
}



export {
  SortState,
  EditorMode,
  Instrument,
  ControlsMode
}