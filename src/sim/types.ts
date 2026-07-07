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

// A grudge binds one of your officers to a *named enemy officer* they have
// personally fought. Grudges persist across battles and operations.
export interface Grudge {
  enemyOfficerId: string;
  enemyName: string; // display name, so prose survives the enemy's death
  kind: 'humiliation' | 'triumph' | 'blood';
  note: string;      // where it came from, in prose
}

export interface Officer {
  id: string;
  name: string;
  title: string;      // era-flavored rank
  epithet: string;    // the visible one-line read — derived from REPUTATION
  background: string; // longer visible history blurb
  traits: Traits;     // hidden truth
  // What the world says of him. Usually near the truth; for some men,
  // dangerously wrong. The epithet is generated from THIS, not from traits.
  reputation: Traits;
  // Behavior you have personally witnessed — the only reliable record.
  observations: string[];
  grudges: Grudge[];
  specialty: UnitClass;
  confidence: number; // 0..100, dynamic (campaign + battle events)
  deeds: string[];    // notable actions, grows during play
  rivalId?: string;
  wounded?: boolean;  // carried a wound into this operation
  dead?: boolean;
  fresh?: boolean;    // a replacement — no track record at all
  playerEndorsed?: boolean; // you blessed his plan at the council (this battle)
  honorSlighted?: boolean;  // given a post beneath his pride (this battle)
  // battle bookkeeping for the after-action report
  perf: {
    ordersReceived: number;
    faithful: number;    // executed as intended
    deviations: number;  // reinterpreted / disobeyed / delayed
    heroics: number;     // good outcomes from own judgment
    blunders: number;    // bad outcomes from own judgment
  };
}

// The men across the field have names too. Your officers remember them.
export interface EnemyOfficer {
  id: string;
  name: string;
  title: string;
  epithet: string; // what your scouts and prisoners say of him
  traits: { competence: number; aggression: number; cunning: number };
  renown: number;  // 0..100, how much beating (or losing to) him matters
  dead?: boolean;
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
  | 'refuse-flank'
  | 'attack-on-signal'; // standing order: strike when the horns sound

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
  | 'disordered'
  | 'looting';

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
  officerId?: string;      // friendly: Officer id; enemy: EnemyOfficer id
  playerLed?: boolean;
  order: ActiveOrder;
  // pending order the officer accepted but hasn't started (delay)
  pendingOrder?: { order: ActiveOrder; startTick: number };
  engagedWith?: string;
  chargeBonus: number; // decays after first contact
  routed?: boolean;    // permanently broken / left field
  killsDealt: number;
  officerDown?: 'wounded' | 'dead'; // command has devolved to a subordinate
  lootingUntil?: number;            // tick when the men can be dragged out of the enemy camp
  hungry?: boolean;                 // marched to battle on empty wagons
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
  | 'morale' | 'logistics' | 'event' | 'command' | 'personal';

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
  // grudge bookkeeping: officers who have sighted their man across the field
  grudgesSighted: string[]; // officerId:enemyOfficerId keys, reported once
  signalSounded?: boolean;  // the horns have blown (attack-on-signal trigger)
  campSacked?: boolean;     // the enemy got into YOUR camp
  lootingHappened?: boolean; // your men got into THEIRS and stopped fighting
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
  | 'household'
  | 'briefing'
  | 'march'
  | 'camp'
  | 'deployment'
  | 'battle'
  | 'after-action';

// ---------------------------------------------------------------- personal

// The general is a person. What he carries in his chest arrives on the
// battlefield in the clarity of his orders.

export interface Child {
  name: string;
  age: number;
}

export interface Romance {
  name: string;
  origin: string;    // how you met, in prose
  home: string;      // her village
  stage: number;     // 0 = met, 1 = drawn in, 2 = bound, -1 = ended
  affair: boolean;   // true if the general is married
  bond: number;      // 0..100
  lost?: boolean;    // her village burned, her fate with it
}

export type HouseholdChoice = 'home' | 'camp' | 'alone';

export interface PersonalState {
  situation: HouseholdChoice;
  spouseName?: string;
  spouseBond: number; // 0..100 (meaningless if unmarried)
  children: Child[];
  romance?: Romance;
  // The load-bearing number: the general's inner steadiness. It feeds
  // directly into the clarity of every order he writes.
  resolve: number; // 0..100
  // A personal score against a named enemy officer. The general keeps
  // books too.
  vengeance?: { enemyOfficerId: string; enemyName: string; note: string; settled?: boolean };
  scandal?: boolean;          // the affair became camp gossip
  familyCaptured?: boolean;   // the worst outcome of bringing them
  wroteHome?: 'honest' | 'heroic' | 'silent'; // this operation's letter
  arcFlags: string[];         // which personal story beats have fired
}

// A vanguard action on the march: a small detachment fight, led by one
// officer of your choosing, against a named enemy officer. This is where
// you learn who your officers really are — and where grudges are born.
export interface Engagement {
  id: string;
  title: string;
  text: string;
  enemyOfficerId: string;
  stakes: string; // what winning/losing means, in prose
}

// One officer's plan for the coming battle, offered at the council of war.
// Whether the plan is any GOOD depends on his true competence — which you
// cannot see. Endorsing a plan is an act of trust with real consequences.
export interface CouncilProposal {
  officerId: string;
  summary: string;      // the plan, in his voice
  hiddenSound: boolean; // is the man actually right?
  cavClaim: 'left' | 'right'; // where he says the enemy horse will be
}

export interface CampaignState {
  seed: number;
  era: EraId;
  day: number;
  operation: number; // which operation of the war this is (1-based)
  distance: number; // days of march remaining to the enemy
  // army-level trackers, 0..100 unless noted
  food: number;     // days of food, roughly 0..20
  supplies: number;
  morale: number;
  fatigue: number;
  cohesion: number;
  intel: number;    // quality of enemy picture
  disciplineTone: number; // harsh(0) .. indulgent(100), shifts events
  rulerPatience: number;  // 0..100 — your standing with the throne
  weather: Weather;
  stragglers: number; // men lost on the march
  officers: Officer[];
  enemyOfficers: EnemyOfficer[];
  enemyCavSide: 'left' | 'right'; // the truth, decided now, revealed maybe
  log: Report[];
  pendingEvent?: CampaignEvent;
  pendingEngagement?: Engagement;
  engagementsDone: string[];
  // an enemy champion has ridden out before the camp
  pendingChallenge?: { enemyOfficerId: string; volunteerId?: string };
  challengeDone?: boolean;
  plunderPromised?: boolean;
  heldCouncil?: boolean;
  councilProposals?: CouncilProposal[];
  endorsedOfficerId?: string; // whose plan you blessed ('' = none)
  cavHint?: 'left' | 'right'; // what you were TOLD about the enemy horse
  campPlacement?: CampPlacement;
  fortifiedCamp?: boolean;
  scoutedWide?: boolean;
  objectiveText: string;
  rulerName: string;
  enemyName: string;
  placeName: string;
  nextReportId: number;
  // strength carried between operations: formationId -> men (undefined = full)
  unitStrength?: Record<string, number>;
  veteranBlood?: number; // 0..100 how blooded the army is (training bonus)
  warOver?: 'dismissed' | 'triumph'; // set when the war ends
  personal: PersonalState;
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
  grudgeNotes: string[];   // scores settled and scores opened
  casualtyNotes: string[]; // officers wounded or killed
  canMarchOn: boolean;     // the war continues and you still command
  warEnd?: 'dismissed' | 'triumph';
  warEndText?: string;
  commendedId?: string;    // set when the player hands down judgment
  censuredId?: string;
  personalNotes: string[]; // what this battle did to the man, not the general
  canWriteHome: boolean;
  letterSent?: 'honest' | 'heroic' | 'silent';
}
