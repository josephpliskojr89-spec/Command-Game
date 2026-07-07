// Core simulation types. The design rule for the whole project:
// the player sees prose; the simulation keeps the numbers.

export type EraId = 'roman' | 'saxon' | 'viking' | 'norman' | 'medieval';

export type UnitClass = 'infantry' | 'cavalry' | 'ranged';

// ---------------------------------------------------------------- officers

// Hidden mechanical traits, all 0..100. Never shown to the player as
// numbers — they surface only through behavior and prose.
export interface Traits {
  competence: number; // reads orders and ground correctly
  initiative: number; // acts on local opportunity without orders
  aggression: number; // leans attacks forward
  caution: number;    // leans everything backward
  loyalty: number;    // holds under pressure, obeys when afraid
  ambition: number;   // seeks personal glory
  pride: number;      // resents slights, over-commits to save face
  discipline: number; // executes literally, keeps formation
  courage: number;    // personal steadiness under threat
  trust: number;      // faith in the player's judgment (dynamic)
}

export interface Officer {
  id: string;
  name: string;
  title: string;      // era-flavored rank
  epithet: string;    // the visible one-line personality read
  background: string; // longer visible history blurb
  traits: Traits;     // hidden
  specialty: UnitClass;
  confidence: number; // 0..100, dynamic (campaign + battle events)
  deeds: string[];    // notable actions, grows during play
  rivalId?: string;
  // battle bookkeeping for the after-action report
  perf: {
    ordersReceived: number;
    faithful: number;    // executed as intended
    deviations: number;  // reinterpreted / disobeyed / delayed
    heroics: number;     // good outcomes from own judgment
    blunders: number;    // bad outcomes from own judgment
  };
}

// ---------------------------------------------------------------- orders

export type OrderType =
  | 'hold'
  | 'advance'
  | 'advance-cautious'
  | 'charge'
  | 'withdraw'
  | 'take-position'
  | 'screen-flank'
  | 'support'
  | 'harass'
  | 'pursue'
  | 'rally'
  | 'protect-camp'
  | 'refuse-flank';

export type Urgency = 'measured' | 'urgent';

export interface PlayerOrder {
  id: string;
  unitId: string;
  type: OrderType;
  target?: { x: number; y: number };
  targetUnitId?: string; // support target (friendly) or enemy target
  urgency: Urgency;
  clarity: number; // 0..100, derived from order shape + urgency + weather
  issuedTick: number;
}

// The order a unit is actually executing — possibly not what was sent.
export interface ActiveOrder {
  type: OrderType;
  target?: { x: number; y: number };
  targetUnitId?: string;
  sinceTick: number;
  source: 'initial' | 'player' | 'officer' | 'enemy-ai';
  note?: string; // how the officer bent it, for the AAR
}

export type MessengerState = 'outbound' | 'returning' | 'lost' | 'killed' | 'done';

export interface Messenger {
  id: string;
  order: PlayerOrder;
  x: number;
  y: number;
  state: MessengerState;
  // what the officer sent back, delivered when the rider returns to HQ
  returnNote?: string;
  diedTick?: number;
}

// ---------------------------------------------------------------- units

export type UnitStatus =
  | 'idle'
  | 'marching'
  | 'advancing'
  | 'holding'
  | 'fighting'
  | 'wavering'
  | 'routing'
  | 'rallying'
  | 'pursuing'
  | 'withdrawing'
  | 'disordered';

export interface Unit {
  id: string;
  side: 'friend' | 'enemy';
  name: string; // era-flavored formation name
  cls: UnitClass;
  men: number;
  menStart: number;
  morale: number;   // 0..100
  fatigue: number;  // 0..100 (high is bad)
  cohesion: number; // 0..100
  training: number;
  armor: number;
  melee: number;
  missile: number;
  speed: number; // map units per tick
  discipline: number;
  ammo: number;
  x: number;
  y: number;
  facing: number; // radians, 0 = east
  status: UnitStatus;
  officerId?: string;
  playerLed?: boolean;
  order: ActiveOrder;
  // pending order the officer accepted but hasn't started (delay)
  pendingOrder?: { order: ActiveOrder; startTick: number };
  engagedWith?: string;
  chargeBonus: number; // decays after first contact
  routed?: boolean;    // permanently broken / left field
  killsDealt: number;
}

// ---------------------------------------------------------------- terrain

export type TerrainKind =
  | 'hill'
  | 'woods'
  | 'stream'
  | 'ford'
  | 'road'
  | 'rough'
  | 'camp'
  | 'enemy-camp';

export interface TerrainFeature {
  kind: TerrainKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

// ---------------------------------------------------------------- reports

export type ReportKind =
  | 'order' | 'messenger' | 'officer' | 'combat' | 'scout'
  | 'morale' | 'logistics' | 'event' | 'command';

export interface Report {
  id: number;
  tick: number; // battle tick or campaign day
  kind: ReportKind;
  text: string;
  important?: boolean;
}

// Events recorded for the after-action chronicle.
export interface BattleEvent {
  tick: number;
  kind: string;
  text: string;
  officerId?: string;
  unitId?: string;
}

// ---------------------------------------------------------------- battle

export type SpeedSetting = 'paused' | 'slow' | 'normal' | 'fast';

export type OutcomeKind =
  | 'decisive-victory'
  | 'costly-victory'
  | 'narrow-victory'
  | 'pyrrhic-victory'
  | 'orderly-withdrawal'
  | 'chaotic-retreat'
  | 'defeat'
  | 'disaster';

export interface KnownEnemy {
  unitId: string;
  x: number;
  y: number;
  seenTick: number;
  visibleNow: boolean;
  identified: boolean; // do we know class/size, or just "a body of men"
}

export interface EnemyPlan {
  phase: 'waiting' | 'advancing' | 'committed' | 'breaking';
  advanceTick: number; // when the enemy begins its move
  flankSide: 'left' | 'right'; // where their cavalry swings
  aggression: number; // 0..100
  commanderName: string;
}

export interface BattleState {
  tick: number;
  speed: SpeedSetting;
  units: Unit[];
  messengers: Messenger[];
  terrain: TerrainFeature[];
  reports: Report[];
  events: BattleEvent[];
  known: Record<string, KnownEnemy>;
  hqPos: { x: number; y: number };
  playerUnitId?: string; // set when personally commanding a formation
  enemyPlan: EnemyPlan;
  outcome?: OutcomeKind;
  outcomeTick?: number;
  withdrawalOrdered?: boolean;
  nextId: number;
  // ambient conditions carried in from the campaign
  weather: Weather;
  seed: number;
}

// ---------------------------------------------------------------- campaign

export type Weather = 'clear' | 'rain' | 'heat' | 'fog';

export type CampPlacement = 'hill' | 'river' | 'road';

export interface CampaignEventOption {
  label: string;
  detail: string;
  apply: string; // key into the event-resolution table
}

export interface CampaignEvent {
  id: string;
  title: string;
  text: string;
  options: CampaignEventOption[];
}

export type Phase =
  | 'title'
  | 'era-select'
  | 'briefing'
  | 'march'
  | 'camp'
  | 'deployment'
  | 'battle'
  | 'after-action';

export interface CampaignState {
  seed: number;
  era: EraId;
  day: number;
  distance: number; // days of march remaining to the enemy
  // army-level trackers, 0..100 unless noted
  food: number;     // days of food, roughly 0..20
  supplies: number;
  morale: number;
  fatigue: number;
  cohesion: number;
  intel: number;    // quality of enemy picture
  disciplineTone: number; // harsh(0) .. indulgent(100), shifts events
  weather: Weather;
  stragglers: number; // men lost on the march
  officers: Officer[];
  log: Report[];
  pendingEvent?: CampaignEvent;
  heldCouncil?: boolean;
  campPlacement?: CampPlacement;
  fortifiedCamp?: boolean;
  scoutedWide?: boolean;
  objectiveText: string;
  rulerName: string;
  enemyName: string;
  placeName: string;
  nextReportId: number;
}

export interface GameState {
  phase: Phase;
  campaign?: CampaignState;
  battle?: BattleState;
  // deployment scratch: officer assignments chosen before battle
  assignments?: Record<string, string>; // formationId -> officerId
  personalCommand?: string; // formationId or 'hq'
  aar?: AfterAction;
}

export interface OfficerVerdict {
  officerId: string;
  name: string;
  title: string;
  verdict: string; // prose judgment
  grade: 'distinguished' | 'creditable' | 'questionable' | 'disgraced';
}

export interface AfterAction {
  outcome: OutcomeKind;
  outcomeTitle: string;
  chronicle: string[]; // paragraphs
  keyMoments: string[];
  officerVerdicts: OfficerVerdict[];
  friendlyLosses: number;
  friendlyStart: number;
  enemyLosses: number;
  enemyStart: number;
  rulerJudgment: string;
  strategicResult: string;
}
