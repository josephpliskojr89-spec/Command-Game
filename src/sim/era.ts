// Era flavor. Eras are skins over one ruleset: they rename ranks, units,
// and the voice of the chronicle, but a heavy infantry block is a heavy
// infantry block whether it is a cohort or a shieldwall.

import type { EraId, UnitClass } from './types.ts';

export interface FormationTemplate {
  id: string;
  role: 'center' | 'left' | 'right' | 'cavalry' | 'ranged' | 'reserve';
  cls: UnitClass;
  men: number;
  nameKey: 'heavy' | 'line' | 'cavalry' | 'ranged' | 'reserve';
}

export interface Era {
  id: EraId;
  label: string;
  period: string;
  blurb: string;
  generalTitle: string;
  rulerTitle: string;
  rulerName: string;
  officerTitles: string[]; // drawn in order of seniority
  officerNames: string[];
  enemyName: string;
  enemyCommander: string;
  placeNames: string[];
  unitNames: Record<'heavy' | 'line' | 'cavalry' | 'ranged' | 'reserve', string>;
  formationLabels: Record<'center' | 'left' | 'right' | 'cavalry' | 'ranged' | 'reserve', string>;
  objective: (place: string) => string;
  strategicOrder: (place: string, ruler: string) => string;
  campName: string;
  messengerWord: string;
}

// One army skeleton shared by all eras. Six formations, six commands.
export const FORMATIONS: FormationTemplate[] = [
  { id: 'f-center', role: 'center', cls: 'infantry', men: 1200, nameKey: 'heavy' },
  { id: 'f-left', role: 'left', cls: 'infantry', men: 800, nameKey: 'line' },
  { id: 'f-right', role: 'right', cls: 'infantry', men: 800, nameKey: 'line' },
  { id: 'f-cavalry', role: 'cavalry', cls: 'cavalry', men: 400, nameKey: 'cavalry' },
  { id: 'f-ranged', role: 'ranged', cls: 'ranged', men: 500, nameKey: 'ranged' },
  { id: 'f-reserve', role: 'reserve', cls: 'infantry', men: 600, nameKey: 'reserve' },
];

export const ERAS: Record<EraId, Era> = {
  roman: {
    id: 'roman',
    label: 'Roman Republic',
    period: 'c. 210 BC',
    blurb:
      'You are a proconsul of the Republic, given legions and told to bring back a triumph or not to come back at all. The Senate watches. Your tribunes watch harder.',
    generalTitle: 'Proconsul',
    rulerTitle: 'the Senate',
    rulerName: 'the Senate and People of Rome',
    officerTitles: ['Legate', 'Tribune', 'Tribune', 'Prefect of Horse', 'Prefect', 'Centurion Primus Pilus', 'Tribune'],
    officerNames: [
      'Gaius Fabricius', 'Marcus Livius', 'Quintus Servilius', 'Titus Manlius',
      'Sextus Atilius', 'Lucius Papirius', 'Appius Verginius', 'Gnaeus Fulvius',
      'Publius Decius', 'Spurius Carvilius',
    ],
    enemyName: 'the Samnite host',
    enemyCommander: 'Gellius the Samnite',
    placeNames: ['the Caudine valley', 'the ford at Aufidena', 'the plain of Luceria'],
    unitNames: {
      heavy: 'First Cohorts',
      line: 'Allied Infantry',
      cavalry: 'Equites',
      ranged: 'Velites',
      reserve: 'Triarii',
    },
    formationLabels: {
      center: 'Center — First Cohorts',
      left: 'Left Wing — Allied Foot',
      right: 'Right Wing — Allied Foot',
      cavalry: 'Cavalry — Equites',
      ranged: 'Skirmish Line — Velites',
      reserve: 'Reserve — Triarii',
    },
    objective: (place) => `Drive the Samnite host from ${place} and open the road south.`,
    strategicOrder: (place, ruler) =>
      `By decree of ${ruler}: the Samnites have cut the road at ${place} and burned two allied towns. You will march, bring them to battle, and break them. A triumph awaits success. Exile awaits the alternative.`,
    campName: 'the marching camp',
    messengerWord: 'rider',
  },
  saxon: {
    id: 'saxon',
    label: 'Anglo-Saxon Kingdom',
    period: 'c. 890 AD',
    blurb:
      'You are the king’s ealdorman, called to drive a raiding army out of the shire. Your fyrd is brave, half-trained, and wants to go home for the harvest.',
    generalTitle: 'Ealdorman',
    rulerTitle: 'the King',
    rulerName: 'King Aethelstan',
    officerTitles: ['Thegn', 'Thegn', 'King’s Reeve', 'Thegn', 'Shire Reeve', 'Thegn', 'Thegn'],
    officerNames: [
      'Wulfstan', 'Aelfric', 'Byrhtnoth', 'Eadric', 'Osric', 'Leofwine',
      'Godwin', 'Aethelred', 'Dunstan', 'Ceolmund',
    ],
    enemyName: 'the Danish raiding army',
    enemyCommander: 'Guthrum Longspear',
    placeNames: ['the ford at Eashing', 'the downs above Wilton', 'the river-meadows at Fearnham'],
    unitNames: {
      heavy: 'Hearth-Troop Shieldwall',
      line: 'Fyrd Levy',
      cavalry: 'Mounted Thegns',
      ranged: 'Bowmen of the Shire',
      reserve: 'Second Fyrd',
    },
    formationLabels: {
      center: 'Center — Hearth-Troop',
      left: 'Left — Fyrd Levy',
      right: 'Right — Fyrd Levy',
      cavalry: 'Mounted Thegns',
      ranged: 'Shire Bowmen',
      reserve: 'Second Fyrd',
    },
    objective: (place) => `Bring the Danish army to battle at ${place} before they reach their ships.`,
    strategicOrder: (place, ruler) =>
      `${ruler} commands: the Danes have sacked three villages and drive stolen cattle toward ${place}. Catch them, break them, and recover what was taken. If they reach their ships unfought, the shire will not forgive it — and neither will the King.`,
    campName: 'the night camp',
    messengerWord: 'rider',
  },
  viking: {
    id: 'viking',
    label: 'Viking Age Norse',
    period: 'c. 870 AD',
    blurb:
      'You are a jarl leading a warband inland for plunder and a name. Your hersirs follow you for luck and silver. Both must keep flowing.',
    generalTitle: 'Jarl',
    rulerTitle: 'the Thing',
    rulerName: 'the assembly of the Thing',
    officerTitles: ['Hersir', 'Hersir', 'Ship-Captain', 'Hersir', 'Ship-Captain', 'Hersir', 'Hersir'],
    officerNames: [
      'Thorvald', 'Ulf', 'Sigurd', 'Halfdan', 'Ketil', 'Grim',
      'Bjorn', 'Orm', 'Steinar', 'Ragnvald',
    ],
    enemyName: 'the Saxon levy-army',
    enemyCommander: 'Ealdorman Ceolwulf',
    placeNames: ['the burh at Readingum', 'the hill of the old fort', 'the crossing at Sceaftesige'],
    unitNames: {
      heavy: 'Hirdmen',
      line: 'Bondi Spears',
      cavalry: 'Horse-Raiders',
      ranged: 'Bowmen',
      reserve: 'Ship-Guard',
    },
    formationLabels: {
      center: 'Center — Hirdmen',
      left: 'Left — Bondi',
      right: 'Right — Bondi',
      cavalry: 'Horse-Raiders',
      ranged: 'Bowmen',
      reserve: 'Ship-Guard',
    },
    objective: (place) => `Defeat the levy-army gathering at ${place} and hold the river crossing.`,
    strategicOrder: (place, ruler) =>
      `The word of ${ruler}: the Saxons gather an army at ${place} to pen you against the river. Strike them before they are ready. Win, and the whole valley pays tribute. Lose, and the ships go home half-crewed.`,
    campName: 'the shore camp',
    messengerWord: 'runner',
  },
  norman: {
    id: 'norman',
    label: 'Norman Conquest',
    period: 'c. 1070 AD',
    blurb:
      'You are the Duke’s marshal, sent to crush a rebellion before it spreads. Your knights are superb and nearly impossible to restrain.',
    generalTitle: 'Marshal',
    rulerTitle: 'the Duke',
    rulerName: 'Duke William',
    officerTitles: ['Castellan', 'Knight-Banneret', 'Knight-Banneret', 'Constable of Horse', 'Serjeant-Captain', 'Knight', 'Castellan'],
    officerNames: [
      'Roger de Montgomery', 'Odo fitzGilbert', 'Walter de Lacy', 'Ralph de Tosny',
      'Hugh de Grandmesnil', 'Robert de Vitot', 'Geoffrey de Mandeville', 'William Malet',
      'Richard fitzOsbern', 'Baldwin de Redvers',
    ],
    enemyName: 'the rebel host',
    enemyCommander: 'Earl Morcar',
    placeNames: ['the marsh-edge at Elyham', 'the ridge of Stanfeld', 'the bridge at Pontfract'],
    unitNames: {
      heavy: 'Dismounted Knights',
      line: 'Spear Serjeants',
      cavalry: 'Mounted Knights',
      ranged: 'Crossbowmen',
      reserve: 'Household Guard',
    },
    formationLabels: {
      center: 'Center — Dismounted Knights',
      left: 'Left — Serjeants',
      right: 'Right — Serjeants',
      cavalry: 'Knights (Mounted)',
      ranged: 'Crossbowmen',
      reserve: 'Household Guard',
    },
    objective: (place) => `Scatter the rebel host at ${place} and take their earl, alive if convenient.`,
    strategicOrder: (place, ruler) =>
      `${ruler} is displeased. Rebels muster at ${place} and burn the King’s manors. You will march, break them, and hang enough of them that the lesson keeps. The Duke rewards speed. He does not reward excuses.`,
    campName: 'the palisade camp',
    messengerWord: 'rider',
  },
  medieval: {
    id: 'medieval',
    label: 'High Medieval Kingdom',
    period: 'c. 1230 AD',
    blurb:
      'You are the Lord Marshal of a feudal host: proud barons, sworn knights, and levies who have never seen blood. Half your battles happen inside your own council tent.',
    generalTitle: 'Lord Marshal',
    rulerTitle: 'the King',
    rulerName: 'King Reginald II',
    officerTitles: ['Baron', 'Baron', 'Knight-Captain', 'Master of Horse', 'Captain of Archers', 'Knight-Captain', 'Baron'],
    officerNames: [
      'Sir Edmund of Harcla', 'Lord Roland de Vere', 'Sir William Mautravers', 'Sir Odo of Brancaster',
      'Sir Hugh Despenser', 'Lord Fulk of Aldingbourne', 'Sir Walter de Grey', 'Sir Miles of Ware',
      'Lord Simon de Roches', 'Sir Geoffrey Peverel',
    ],
    enemyName: 'the Count’s invading army',
    enemyCommander: 'Count Amaury',
    placeNames: ['the vale of Merleburh', 'the ford at Stokebrigge', 'the heath below Caldwell'],
    unitNames: {
      heavy: 'Men-at-Arms',
      line: 'Spear Levy',
      cavalry: 'Knights',
      ranged: 'Longbowmen',
      reserve: 'Rear-Guard',
    },
    formationLabels: {
      center: 'Center — Men-at-Arms',
      left: 'Left Battle — Levy',
      right: 'Right Battle — Levy',
      cavalry: 'Knights',
      ranged: 'Longbowmen',
      reserve: 'Rear-Guard',
    },
    objective: (place) => `Halt the Count’s army at ${place} before it reaches the royal city.`,
    strategicOrder: (place, ruler) =>
      `In the name of ${ruler}: Count Amaury has crossed the border with fire and banners and moves on the royal city through ${place}. You will stop him there. The King reminds you, with affection, that marshals who lose royal armies rarely remain marshals. Or heads.`,
    campName: 'the war camp',
    messengerWord: 'herald',
  },
};

export const ERA_LIST: Era[] = [ERAS.roman, ERAS.saxon, ERAS.viking, ERAS.norman, ERAS.medieval];
