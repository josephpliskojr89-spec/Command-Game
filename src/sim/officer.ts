// Officer generation and the order-interpretation engine.
// This is the soul of the game: orders pass through a human being
// before they reach the men, and the human being has opinions.

import type { Rng } from './rng.ts';
import type {
  ActiveOrder, EnemyOfficer, Grudge, Officer, OrderType, PlayerOrder, Traits,
  Unit, UnitClass,
} from './types.ts';
import type { Era } from './era.ts';

const TRAIT_KEYS: (keyof Traits)[] = [
  'competence', 'initiative', 'aggression', 'caution', 'loyalty',
  'ambition', 'pride', 'discipline', 'courage', 'trust',
];

// ---------------------------------------------------------------- generation

// Reputation is what the world says of a man. For most officers it is the
// truth plus gossip-noise. For a few it is dangerously wrong — the hero of
// a battle he did not actually win, the "plodder" who is the best soldier
// you have. The player's epithets and blurbs are generated from THIS.
function distortTraits(truth: Traits, rng: Rng, badlyMisjudged: boolean): Traits {
  const rep = { ...truth };
  for (const k of TRAIT_KEYS) {
    rep[k] = clampTrait(rep[k] + rng.range(-9, 9));
  }
  if (badlyMisjudged) {
    // the world is wrong about the two or three things that define him
    const keys = rng.shuffle(TRAIT_KEYS.filter((k) => k !== 'trust')).slice(0, 3);
    for (const k of keys) {
      const v = truth[k];
      rep[k] = clampTrait(v >= 50 ? v - rng.range(28, 48) : v + rng.range(28, 48));
    }
  }
  return rep;
}

function clampTrait(n: number): number {
  return Math.max(5, Math.min(95, Math.round(n)));
}

function rollTraits(rng: Rng): Traits {
  const t = (base: number, spread: number) =>
    Math.max(5, Math.min(95, Math.round(base + rng.range(-spread, spread))));
  return {
    competence: t(55, 30),
    initiative: t(50, 35),
    aggression: t(50, 35),
    caution: t(50, 35),
    loyalty: t(60, 30),
    ambition: t(50, 35),
    pride: t(50, 35),
    discipline: t(55, 30),
    courage: t(60, 25),
    trust: t(55, 20),
  };
}

// The visible epithet must hint at the hidden numbers without stating them.
// We describe the two most extreme traits.
function describe(traits: Traits, rng: Rng): string {
  const notes: { score: number; text: string }[] = [
    { score: traits.aggression - 50, text: 'hungry for the attack' },
    { score: 50 - traits.aggression, text: 'reluctant to strike first' },
    { score: traits.caution - 50, text: 'careful to a fault' },
    { score: traits.competence - 55, text: 'a sound judge of ground' },
    { score: 45 - traits.competence, text: 'of limited imagination' },
    { score: traits.initiative - 50, text: 'inclined to act on his own judgment' },
    { score: 45 - traits.initiative, text: 'unwilling to move without orders' },
    { score: traits.loyalty - 55, text: 'loyal beyond question' },
    { score: 40 - traits.loyalty, text: 'said to serve his own interests first' },
    { score: traits.ambition - 55, text: 'plainly ambitious' },
    { score: traits.pride - 55, text: 'proud, and quick to feel a slight' },
    { score: traits.discipline - 55, text: 'exacting about order and drill' },
    { score: traits.courage - 60, text: 'utterly fearless' },
    { score: 40 - traits.courage, text: 'rumored to have a weak stomach for slaughter' },
  ];
  notes.sort((a, b) => b.score - a.score);
  const top = notes.slice(0, 4).filter((n) => n.score > 0);
  const picks = rng.shuffle(top).slice(0, 2);
  if (picks.length === 0) return 'Unremarkable in every visible way. That may be the problem.';
  if (picks.length === 1) return capitalize(picks[0].text) + '.';
  return capitalize(picks[0].text) + ', and ' + picks[1].text + '.';
}

const BACKGROUNDS = [
  'Served under your predecessor and speaks of him often — you have not decided whether that is a warning.',
  'Rose from the ranks; the men trust him more than his peers do.',
  'Comes from a powerful family with friends at court. Removing him would cost you politically.',
  'A veteran of three campaigns, two of them defeats. He does not talk about the second one.',
  'Young for his command. Eager to prove it was not a mistake.',
  'Owed money by half the officers of the army, which buys a certain kind of respect.',
  'Was passed over for your position. He has been perfectly correct with you ever since.',
  'Distinguished himself in a skirmish last year and has retold the story enough times that it now has cavalry in it.',
  'Keeps his men in better order than any other command, and never lets anyone forget it.',
  'His family holds land near the enemy line of march. For him this war is personal.',
];

export function generateOfficers(rng: Rng, era: Era): Officer[] {
  const names = rng.shuffle(era.officerNames);
  const backgrounds = rng.shuffle(BACKGROUNDS);
  const specialties: UnitClass[] = ['infantry', 'infantry', 'infantry', 'cavalry', 'ranged', 'infantry', 'cavalry'];
  // Two of the seven are badly misjudged by the world: the famous name who
  // is nothing much, or the plodder who is the best soldier you have.
  const misjudged = new Set(rng.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 2));
  const officers: Officer[] = [];
  for (let i = 0; i < 7; i++) {
    const traits = rollTraits(rng.fork(i + 11));
    const reputation = distortTraits(traits, rng.fork(i + 61), misjudged.has(i));
    officers.push({
      id: `off-${i}`,
      name: names[i],
      title: era.officerTitles[i],
      epithet: describe(reputation, rng.fork(i + 101)),
      background: backgrounds[i % backgrounds.length],
      traits,
      reputation,
      observations: [],
      grudges: [],
      specialty: specialties[i],
      confidence: Math.round(50 + rng.range(-10, 10)),
      deeds: [],
      perf: { ordersReceived: 0, faithful: 0, deviations: 0, heroics: 0, blunders: 0 },
    });
  }
  // One officer is the ruler's appointee: his reputation is gilded at court
  // whatever the truth of him, and how you employ him is a political act.
  const appointee = officers[rng.int(0, 6)];
  appointee.reputation = distortTraits(appointee.traits, rng.fork(303), true);
  appointee.epithet = describe(appointee.reputation, rng.fork(304));
  appointee.background = `Sent to you by ${era.rulerTitle} personally, with a letter praising him in terms no living soldier has earned. How you employ him will be noticed at court.`;
  // one rivalry pair — rivals resent supporting each other
  const [a, b] = rng.shuffle(officers).slice(0, 2);
  a.rivalId = b.id;
  b.rivalId = a.id;
  return officers;
}

// What you have personally seen a man do. The only trustworthy record.
export function observe(o: Officer, text: string) {
  if (o.observations.includes(text)) return;
  o.observations.push(text);
  if (o.observations.length > 7) o.observations.shift();
}

export function addGrudge(o: Officer, g: Grudge) {
  const existing = o.grudges.find((x) => x.enemyOfficerId === g.enemyOfficerId);
  if (existing) {
    // a new humiliation deepens; a triumph erases a humiliation
    if (g.kind === 'humiliation' || g.kind === 'blood') Object.assign(existing, g);
    else if (existing.kind !== 'blood') Object.assign(existing, g);
    return;
  }
  o.grudges.push(g);
}

// ------------------------------------------------------------ enemy officers

const ENEMY_EPITHETS: [keyof EnemyOfficer['traits'], boolean, string][] = [
  ['aggression', true, 'a killer, the prisoners say — first over every wall'],
  ['aggression', false, 'said to be a careful man who counts twice and strikes once'],
  ['competence', true, 'spoken of with respect even by men he has beaten'],
  ['competence', false, 'holds his command through marriage, not merit — they say'],
  ['cunning', true, 'fond of feints and false camps; nothing he shows you is free'],
  ['cunning', false, 'a straight-ahead soldier; what you see is what will come'],
];

export function generateEnemyOfficers(rng: Rng, era: Era): EnemyOfficer[] {
  return era.enemyOfficerNames.map((name, i) => {
    const traits = {
      competence: Math.round(rng.fork(i + 500).range(30, 85)),
      aggression: Math.round(rng.fork(i + 510).range(25, 90)),
      cunning: Math.round(rng.fork(i + 520).range(20, 85)),
    };
    // epithet describes his most extreme quality — scouts' gossip, so it is
    // usually right about enemies (their reputations are earned in raids)
    const scored = ENEMY_EPITHETS.map(([k, high, text]) => ({
      score: high ? traits[k] - 50 : 50 - traits[k], text,
    })).sort((a, b) => b.score - a.score);
    return {
      id: `eoff-${i}`,
      name,
      title: era.enemyOfficerTitle,
      epithet: scored[0].text,
      traits,
      renown: Math.round(rng.fork(i + 530).range(30, 90)),
    };
  });
}

// ---------------------------------------------------------------- clarity

// How legible is this order, before any officer touches it?
export function orderClarity(type: OrderType, urgency: 'measured' | 'urgent', weather: string): number {
  // Simple orders are clear; conditional/spatial ones are muddier.
  const base: Record<OrderType, number> = {
    hold: 90, advance: 75, 'advance-cautious': 70, charge: 80, withdraw: 75,
    'take-position': 60, 'screen-flank': 55, support: 60, harass: 55,
    pursue: 70, rally: 80, 'protect-camp': 85, 'refuse-flank': 50,
    'attack-on-signal': 65, // conditional orders age poorly in a waiting mind
  };
  let c = base[type];
  if (urgency === 'urgent') c -= 10; // haste breeds garbled orders
  if (weather === 'rain') c -= 5;
  if (weather === 'fog') c -= 12;
  return Math.max(20, Math.min(95, c));
}

// ---------------------------------------------------------------- interpretation

export type InterpretKind =
  | 'precise' | 'mostly' | 'delayed' | 'cautious' | 'aggressive'
  | 'wrong-place' | 'halted' | 'opportunist' | 'refused' | 'clarify';

export interface Interpretation {
  kind: InterpretKind;
  order: ActiveOrder;      // what the unit will actually do
  delayTicks: number;      // before it starts doing it
  ackText: string;         // report shown when the messenger arrives
  returnNote?: string;     // sent back to HQ with the rider, if any
  aarNote?: string;        // recorded for the chronicle
}

export interface InterpretContext {
  tick: number;
  armyMorale: number;        // 0..100 rough army mood
  nearbyThreat: number;      // 0..1 how dangerous the ground ahead looks to this officer
  localOpportunity: boolean; // routing/exposed enemy nearby
  rivalInvolved: boolean;    // order asks him to support his rival
  distanceToTarget: number;
  // the named enemy this officer has history with, if his banner is in sight
  grudge?: Grudge;
  disciplineTone: number;    // harsh(0)..indulgent(100) — how you ran the march
  honorSlighted: boolean;    // given a post beneath his dignity at deployment
}

const AGGRESSIVE_SWAP: Partial<Record<OrderType, OrderType>> = {
  advance: 'charge',
  'advance-cautious': 'advance',
  hold: 'advance',
  support: 'charge',
  harass: 'charge',
  'attack-on-signal': 'charge', // "the horn? THIS is the horn" — and he goes now
};

const CAUTIOUS_SWAP: Partial<Record<OrderType, OrderType>> = {
  charge: 'advance',
  advance: 'advance-cautious',
  pursue: 'hold',
  harass: 'hold',
};

export function interpretOrder(
  officer: Officer,
  unit: Unit,
  po: PlayerOrder,
  ctx: InterpretContext,
  rng: Rng,
): Interpretation {
  const t = officer.traits;
  officer.perf.ordersReceived++;

  const faithful = (kind: InterpretKind, ack: string, delay = 0): Interpretation => ({
    kind,
    order: {
      type: po.type, target: po.target, targetUnitId: po.targetUnitId,
      sinceTick: ctx.tick, source: 'player',
    },
    delayTicks: delay,
    ackText: ack,
  });

  const who = `${officer.title} ${shortName(officer.name)}`;
  const harsh = ctx.disciplineTone < 40;   // you flogged your way here
  const indulgent = ctx.disciplineTone > 60; // you looked the other way

  // Effective steadiness: wounds and slighted honor tell on a man.
  const effCourage = t.courage - (officer.wounded ? 12 : 0);

  // --- Refusal: rare, requires a perfect storm -------------------------
  const dangerous = po.type === 'charge' || po.type === 'advance' || po.type === 'pursue';
  if (
    dangerous &&
    ctx.nearbyThreat > 0.7 &&
    ctx.armyMorale < 40 &&
    t.loyalty < 35 &&
    t.trust < 40 &&
    !harsh && // drilled-in obedience holds even here — until the army breaks instead
    rng.chance(0.5)
  ) {
    officer.perf.deviations++;
    officer.deeds.push('Refused a direct order in the face of the enemy.');
    observe(officer, 'You have seen him refuse a direct order outright.');
    return {
      kind: 'refused',
      order: { type: 'hold', sinceTick: ctx.tick, source: 'officer', note: 'refused the order' },
      delayTicks: 0,
      ackText: `${who} has REFUSED the order. His men stand where they are.`,
      returnNote: `${who} sends word: "I will not spend my men on this. Come and see the ground yourself."`,
      aarNote: `${who} refused a direct order to ${orderVerb(po.type)}.`,
    };
  }

  // --- Grudge: the man across the field has a name ---------------------
  if (ctx.grudge && (ctx.grudge.kind === 'humiliation' || ctx.grudge.kind === 'blood')) {
    // Ordered away from his enemy: pride chokes on it.
    if ((po.type === 'withdraw' || po.type === 'hold' || po.type === 'refuse-flank') &&
        t.pride > 55 && rng.chance(0.5)) {
      officer.perf.deviations++;
      observe(officer, `You have seen his feud with ${ctx.grudge.enemyName} outweigh his orders.`);
      return {
        ...faithful('delayed', `${who} receives the order and does not move. He is staring across the field at ${ctx.grudge.enemyName}'s banner.`, rng.int(12, 26)),
        returnNote: `${who} sends back: "Ask me anything but this. Not from HIM."`,
        aarNote: `${who} was slow to ${orderVerb(po.type)} while ${ctx.grudge.enemyName}'s banner stood in sight.`,
      };
    }
    // Ordered toward anything: he goes harder than asked.
    if (dangerous && rng.chance(0.6)) {
      officer.perf.deviations++;
      observe(officer, `You have seen him fight ${ctx.grudge.enemyName} like a man settling a debt.`);
      const newType: OrderType = po.type === 'pursue' ? 'pursue' : 'charge';
      return {
        kind: 'aggressive',
        order: {
          type: newType, target: po.target, targetUnitId: po.targetUnitId,
          sinceTick: ctx.tick, source: 'officer', note: `pressed home against ${ctx.grudge.enemyName}`,
        },
        delayTicks: 0,
        ackText: `${who} does not wait for the ${'rider'} to finish. His whole formation is already moving — at ${ctx.grudge.enemyName}.`,
        aarNote: `${who} turned his orders into a private reckoning with ${ctx.grudge.enemyName}.`,
      };
    }
  }

  // --- Trust latency: a doubting officer wants it in writing -----------
  if (dangerous && ctx.nearbyThreat > 0.45 && t.trust < 42 && !officer.playerEndorsed && rng.chance(0.45)) {
    officer.perf.deviations++;
    observe(officer, 'You have seen him hold an attack while he asked whether you truly meant it.');
    return {
      kind: 'clarify',
      order: { ...unit.order, sinceTick: ctx.tick },
      delayTicks: 0,
      ackText: `${who} reads the order twice and sends the ${'rider'} straight back. He wants confirmation.`,
      returnNote: `${who} asks: "Does the general know what stands in front of me? Confirm the order and I will go."`,
      aarNote: `${who} demanded confirmation before obeying, and the moment aged while he waited.`,
    };
  }

  // --- Request clarification: muddled order + literal-minded officer ---
  if (po.clarity < 55 && t.competence < 45 && t.initiative < 50 && rng.chance(0.5)) {
    officer.perf.deviations++;
    observe(officer, 'You have seen him freeze when orders were not spelled out.');
    return {
      kind: 'clarify',
      order: { ...unit.order, sinceTick: ctx.tick },
      delayTicks: 0,
      ackText: `${who} seems unsure what is intended. He holds his position and sends the ${'rider'} back.`,
      returnNote: `${who} asks for clarification: "Am I to ${orderVerb(po.type)} at once, or await the main body?"`,
      aarNote: `${who} did not understand an order and asked for clarification, losing time.`,
    };
  }

  // --- Fear: shaky officer facing real danger delays or stops short ----
  if (dangerous && ctx.nearbyThreat > 0.5 && effCourage < 40 && rng.chance(0.6)) {
    officer.perf.deviations++;
    observe(officer, officer.wounded
      ? 'You have seen his wound sit heavier on him than he admits.'
      : 'You have seen him hesitate in the face of the enemy.');
    if (rng.chance(0.5)) {
      const delay = rng.int(8, 20);
      return {
        ...faithful('delayed', `${who} acknowledges the order... but his formation is slow to move.`, delay),
        aarNote: `${who} hesitated in the face of the enemy before obeying.`,
      };
    }
    const shortTarget = po.target
      ? lerpPoint({ x: unit.x, y: unit.y }, po.target, 0.5)
      : undefined;
    return {
      kind: 'halted',
      order: {
        type: 'advance-cautious', target: shortTarget, sinceTick: ctx.tick,
        source: 'officer', note: 'stopped short of the objective',
      },
      delayTicks: rng.int(2, 6),
      ackText: `${who} moves forward, but hesitantly — he does not seem to like what he sees ahead.`,
      aarNote: `${who} stopped short of his objective, unwilling to close.`,
    };
  }

  // --- Pride: being told to support a rival stings ---------------------
  if (ctx.rivalInvolved && t.pride > 65 && rng.chance(0.55)) {
    officer.perf.deviations++;
    observe(officer, 'You have seen his quarrels slow the army’s work.');
    const delay = rng.int(10, 25);
    return {
      ...faithful('delayed', `${who} receives the order in silence. His formation is... taking its time.`, delay),
      returnNote: `${who} sends back a single line: "As the ${'general'} wishes."`,
      aarNote: `${who} dragged his feet on an order to support his rival.`,
    };
  }

  // --- Core interpretation roll ----------------------------------------
  // Competence + discipline + clarity + confidence decide how straight
  // the order comes through. The campaign's tone and today's politics
  // put a thumb on the scale.
  const score =
    t.competence * 0.35 +
    t.discipline * 0.2 +
    po.clarity * 0.3 +
    officer.confidence * 0.15 +
    (harsh ? 10 : 0) +                       // drilled obedience: fewer liberties
    (officer.playerEndorsed ? 8 : 0) +       // a trusted man reads you better
    (ctx.honorSlighted ? -10 : 0) +          // a slighted man reads you worse
    (officer.wounded ? -8 : 0) +
    (ctx.grudge?.kind === 'triumph' ? 6 : 0) + // he has beaten this man before
    rng.range(-18, 18);

  // Personality pull: strong temperament bends borderline readings.
  const aggressivePull = (t.aggression - 50) * 0.4 + (t.ambition - 50) * 0.25 + (t.pride - 50) * 0.1;
  const cautiousPull = (t.caution - 50) * 0.45 + (50 - t.courage) * 0.2;

  // Opportunists: high initiative + real local opening = they take it.
  // A harsh campaign beats this out of them; an indulgent one feeds it.
  if (ctx.localOpportunity && t.initiative > 65 && !harsh && rng.chance(indulgent ? 0.5 : 0.4)) {
    officer.perf.deviations++;
    officer.deeds.push('Acted on his own judgment when he saw an opening.');
    observe(officer, 'You have seen him act boldly on his own judgment.');
    const newType: OrderType = unit.cls === 'cavalry' ? 'charge' : 'advance';
    return {
      kind: 'opportunist',
      order: { type: newType, sinceTick: ctx.tick, source: 'officer', note: 'seized a local opportunity instead' },
      delayTicks: 0,
      ackText: `${who} acknowledges — but he sees an opening and is moving on it instead. "Tell the general I will explain after."`,
      aarNote: `${who} set aside his orders to exploit an opening he judged better.`,
    };
  }

  if (score >= 75) {
    officer.perf.faithful++;
    return faithful('precise', `${who} acknowledges the order and begins executing it exactly as given.`);
  }

  if (score >= 55) {
    officer.perf.faithful++;
    // mostly right: slight drift in target if there is one
    const drifted = po.target
      ? {
          x: po.target.x + rng.range(-40, 40),
          y: po.target.y + rng.range(-30, 30),
        }
      : undefined;
    return {
      kind: 'mostly',
      order: {
        type: po.type, target: drifted ?? po.target, targetUnitId: po.targetUnitId,
        sinceTick: ctx.tick, source: 'player',
      },
      delayTicks: rng.int(0, 4),
      ackText: `${who} acknowledges and moves to comply.`,
    };
  }

  if (score >= 40) {
    // temperament decides which way the misreading bends
    if (aggressivePull > cautiousPull && AGGRESSIVE_SWAP[po.type]) {
      officer.perf.deviations++;
      observe(officer, 'You have seen him turn measured orders into attacks.');
      const newType = AGGRESSIVE_SWAP[po.type]!;
      return {
        kind: 'aggressive',
        order: {
          type: newType, target: po.target, targetUnitId: po.targetUnitId,
          sinceTick: ctx.tick, source: 'officer', note: `read "${orderVerb(po.type)}" as "${orderVerb(newType)}"`,
        },
        delayTicks: 0,
        ackText: `${who} raises his arm and his whole formation surges forward — that looks more forceful than what you ordered.`,
        aarNote: `${who} turned an order to ${orderVerb(po.type)} into something far more aggressive.`,
      };
    }
    if (CAUTIOUS_SWAP[po.type]) {
      officer.perf.deviations++;
      observe(officer, 'You have seen him soften sharp orders into careful ones.');
      const newType = CAUTIOUS_SWAP[po.type]!;
      return {
        kind: 'cautious',
        order: {
          type: newType, target: po.target, targetUnitId: po.targetUnitId,
          sinceTick: ctx.tick, source: 'officer', note: `softened "${orderVerb(po.type)}" into "${orderVerb(newType)}"`,
        },
        delayTicks: rng.int(3, 8),
        ackText: `${who} complies — carefully. More carefully than you intended.`,
        aarNote: `${who} executed an order to ${orderVerb(po.type)} with excessive caution.`,
      };
    }
    officer.perf.faithful++;
    return faithful('delayed', `${who} acknowledges, though his formation takes time to shake itself into motion.`, rng.int(5, 12));
  }

  // score < 40: genuinely garbled
  officer.perf.deviations++;
  observe(officer, 'You have seen him mistake his objective entirely.');
  if (po.target && rng.chance(0.6)) {
    const wrong = {
      x: po.target.x + rng.range(-160, 160),
      y: po.target.y + rng.range(-100, 100),
    };
    return {
      kind: 'wrong-place',
      order: { type: po.type, target: wrong, sinceTick: ctx.tick, source: 'officer', note: 'misunderstood the objective' },
      delayTicks: rng.int(2, 8),
      ackText: `${who} acknowledges and moves out — but watching his line of march, you are not certain he understood where.`,
      aarNote: `${who} misunderstood his objective and moved on the wrong ground.`,
    };
  }
  return {
    ...faithful('delayed', `${who} appears confused by the order. His formation stirs, halts, and stirs again.`, rng.int(12, 25)),
    aarNote: `${who} was slow to understand his orders.`,
  };
}

// ---------------------------------------------------------------- autonomy

// Officers act without orders too. Called periodically per un-led unit.
export interface AutonomyResult {
  order: ActiveOrder;
  reportText: string;
  aarNote?: string;
  deed?: string;
  blunder?: boolean;
  heroic?: boolean;
}

export function officerAutonomy(
  officer: Officer,
  unit: Unit,
  ctx: {
    tick: number;
    routingEnemyNearby: boolean;
    threatenedFlank: boolean;
    friendInTroubleId?: string;
    friendInTroubleName?: string;
    heavilyOutnumberedHere: boolean;
    // his personal enemy's unit, if identified and within reach
    grudgeEnemyUnitId?: string;
    grudgeEnemyName?: string;
    disciplineTone: number;
  },
  rng: Rng,
): AutonomyResult | undefined {
  const t = officer.traits;
  const who = `${officer.title} ${shortName(officer.name)}`;
  const harsh = ctx.disciplineTone < 40;
  const indulgent = ctx.disciplineTone > 60;

  // A private war: his enemy's banner is in reach and no one is watching.
  if (
    ctx.grudgeEnemyUnitId &&
    (unit.status === 'holding' || unit.status === 'idle') &&
    unit.order.type !== 'withdraw' &&
    (t.pride + t.aggression) / 2 > 62 &&
    !harsh &&
    rng.chance(0.18)
  ) {
    officer.perf.deviations++;
    observe(officer, `You have seen him break formation to get at ${ctx.grudgeEnemyName}.`);
    return {
      order: {
        type: 'charge', targetUnitId: ctx.grudgeEnemyUnitId,
        sinceTick: ctx.tick, source: 'officer', note: `went at ${ctx.grudgeEnemyName} without orders`,
      },
      reportText: `${who} is moving without orders — straight at ${ctx.grudgeEnemyName}'s banner. This is not your battle plan. It is his.`,
      aarNote: `${who} abandoned his post to settle his account with ${ctx.grudgeEnemyName}.`,
      blunder: true,
    };
  }

  // Glory-hunters pursue broken enemies off the field.
  if (
    ctx.routingEnemyNearby &&
    unit.status !== 'routing' &&
    unit.status !== 'withdrawing' &&
    (unit.order.type === 'hold' || unit.order.type === 'advance' || unit.order.type === 'charge') &&
    (t.aggression + t.ambition) / 2 > 60 &&
    t.discipline < (harsh ? 45 : 60) &&
    rng.chance(indulgent ? 0.4 : 0.3)
  ) {
    officer.perf.deviations++;
    observe(officer, 'You have seen him lose his head in pursuit of a beaten enemy.');
    return {
      order: { type: 'pursue', sinceTick: ctx.tick, source: 'officer', note: 'pursued without orders' },
      reportText: `${who} has taken up the pursuit without waiting for a signal. His formation is leaving its place in the line.`,
      aarNote: `${who} pursued a broken enemy without orders, leaving his position.`,
      blunder: true,
    };
  }

  // Steady officers help a neighbor being mauled. (Rivalry filtering is
  // done by the caller, which decides whose trouble this officer can see.)
  if (
    ctx.friendInTroubleId &&
    unit.order.type === 'hold' &&
    unit.status !== 'fighting' &&
    t.initiative > 60 &&
    t.loyalty > 55 &&
    !harsh && // a flogged army waits for orders while its neighbors die
    rng.chance(indulgent ? 0.32 : 0.25)
  ) {
    officer.perf.deviations++;
    observe(officer, 'You have seen him march to a neighbor’s rescue unbidden.');
    return {
      order: {
        type: 'support', targetUnitId: ctx.friendInTroubleId,
        sinceTick: ctx.tick, source: 'officer', note: 'moved to support a hard-pressed neighbor',
      },
      reportText: `${who} sees ${ctx.friendInTroubleName} hard pressed and is moving to support them on his own authority.`,
      aarNote: `${who} moved unbidden to support ${ctx.friendInTroubleName}.`,
      deed: 'Moved without orders to save a hard-pressed neighboring formation.',
      heroic: true,
    };
  }

  // Nervous officers pull back from bad odds.
  if (
    ctx.heavilyOutnumberedHere &&
    unit.status !== 'fighting' &&
    unit.order.type !== 'withdraw' &&
    t.caution > 65 &&
    t.courage < 55 &&
    rng.chance(0.3)
  ) {
    officer.perf.deviations++;
    observe(officer, 'You have seen him give ground without orders when the odds looked long.');
    return {
      order: { type: 'withdraw', sinceTick: ctx.tick, source: 'officer', note: 'fell back from bad odds without orders' },
      reportText: `${who} is giving ground — he judges the odds in front of him impossible and has not waited to ask.`,
      aarNote: `${who} withdrew his formation without orders when he judged the odds hopeless.`,
      blunder: true,
    };
  }

  return undefined;
}

// ---------------------------------------------------------------- helpers

export function shortName(full: string): string {
  // "Sir Edmund of Harcla" -> "Edmund"; "Gaius Fabricius" -> "Fabricius"
  const stripped = full.replace(/^(Sir|Lord)\s+/, '');
  const parts = stripped.split(' ');
  if (parts.includes('of') || parts.includes('de') || parts.includes('the')) return parts[0];
  return parts[parts.length - 1];
}

export function orderVerb(type: OrderType): string {
  const verbs: Record<OrderType, string> = {
    hold: 'hold position', advance: 'advance', 'advance-cautious': 'advance cautiously',
    charge: 'charge', withdraw: 'withdraw', 'take-position': 'take the position',
    'screen-flank': 'screen the flank', support: 'support', harass: 'harass the enemy',
    pursue: 'pursue', rally: 'rally', 'protect-camp': 'protect the camp',
    'refuse-flank': 'refuse the flank',
    'attack-on-signal': 'stand ready and attack on the signal',
  };
  return verbs[type];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lerpPoint(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
