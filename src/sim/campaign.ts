// The campaign layer: a march of several days toward the enemy.
// Its whole job is to shape the battle — tired armies fight worse,
// blind armies deploy against ghosts, and officers remember how
// you treated them on the road.

import { makeRng, type Rng } from './rng.ts';
import { ERAS, type Era } from './era.ts';
import { addGrudge, generateEnemyOfficers, generateOfficers, observe, shortName } from './officer.ts';
import { maybePersonalEvent, applyPersonalChoice, personalNextOperation } from './personal.ts';
import type {
  CampaignEvent, CampaignState, CouncilProposal, Engagement, EnemyOfficer,
  EraId, Officer, OutcomeKind, Report, Weather,
} from './types.ts';

export const MARCH_DAYS = 5;

export interface MarchChoices {
  pace: 'rest' | 'steady' | 'forced';
  supply: 'forage' | 'ration';
  scouts: 'close' | 'wide';
}

export function newCampaign(era: EraId, seed: number): CampaignState {
  const rng = makeRng(seed);
  const e = ERAS[era];
  const place = rng.pick(e.placeNames);
  const officers = generateOfficers(rng.fork(7), e);
  const enemyOfficers = generateEnemyOfficers(rng.fork(9), e);
  const c: CampaignState = {
    seed,
    era,
    day: 1,
    operation: 1,
    distance: MARCH_DAYS,
    food: 12,
    supplies: 70,
    morale: 68,
    fatigue: 20,
    cohesion: 70,
    intel: 25,
    disciplineTone: 50,
    rulerPatience: 60,
    weather: 'clear',
    stragglers: 0,
    officers,
    enemyOfficers,
    enemyCavSide: rng.chance(0.5) ? 'left' : 'right',
    enemyDoctrine: rng.pick(['rash', 'cunning', 'defensive', 'methodical'] as const),
    opKind: 'assault',
    enemyMemory: {},
    log: [],
    engagementsDone: [],
    objectiveText: e.objective(place),
    rulerName: e.rulerName,
    enemyName: e.enemyName,
    placeName: place,
    nextReportId: 1,
    // placeholder until the player chooses a household on the setup screen
    personal: {
      situation: 'alone', spouseBond: 0, family: [], resolve: 60, arcFlags: [],
      career: { age: 32, warsFought: 0, warsWon: 0, chronicle: [] },
    },
  };
  addLog(c, 'event', e.strategicOrder(place, e.rulerName), true);
  addLog(c, 'logistics', `The army musters: some ${totalMuster()} men under arms, ${officers.length} officers of note, and food for roughly twelve days.`);
  addLog(c, 'scout', doctrineRumor(c), true);
  return c;
}

// What the prisoners and old soldiers say about how this commander fights.
// True, but coarse — knowing his doctrine is not the same as beating it.
function doctrineRumor(c: CampaignState): string {
  const cmdr = ERAS[c.era].enemyCommander;
  switch (c.enemyDoctrine) {
    case 'rash':
      return `Men who fought ${cmdr} before say he attacks at dawn, at once, everywhere — 'he thinks a battle is a race.' Expect him early and all in.`;
    case 'cunning':
      return `Men who fought ${cmdr} before say nothing he shows you is free: false camps, false retreats, reserves where reserves should not be. Believe half of what your scouts see, and choose the half carefully.`;
    case 'defensive':
      return `Men who fought ${cmdr} before say he picks his ground and grows roots — 'he wins battles by making you lose them.' If you want him, you will likely have to go and get him.`;
    case 'methodical':
      return `Men who fought ${cmdr} before call him a drillmaster: deliberate, orderly, nothing wasted. He will come, in his own time, in good order.`;
  }
}

function totalMuster(): number {
  return 4300; // 1200+800+800+400+500+600
}

export function addLog(c: CampaignState, kind: Report['kind'], text: string, important = false) {
  c.log.unshift({ id: c.nextReportId++, tick: c.day, kind, text, important });
}

function rngForDay(c: CampaignState): Rng {
  return makeRng(c.seed).fork(1000 + c.day);
}

// ---------------------------------------------------------------- march day

export function resolveMarchDay(c: CampaignState, choices: MarchChoices): void {
  const rng = rngForDay(c);
  const era = ERAS[c.era];

  // Weather drifts.
  const roll = rng.next();
  const prev = c.weather;
  c.weather = roll < 0.55 ? 'clear' : roll < 0.75 ? 'rain' : roll < 0.9 ? 'heat' : 'fog';
  if (c.weather !== prev) {
    const desc: Record<Weather, string> = {
      clear: 'The sky clears; the roads firm up.',
      rain: 'Rain sets in. The baggage wagons begin to lag.',
      heat: 'The day breaks hot and airless. Water discipline will matter.',
      fog: 'A grey fog lies over the country. The scouts can see nothing beyond a bowshot.',
    };
    addLog(c, 'event', desc[c.weather]);
  }

  // Pace.
  if (choices.pace === 'forced') {
    c.distance -= rng.chance(0.75) ? 2 : 1;
    c.fatigue = clamp(c.fatigue + rng.int(14, 22));
    c.cohesion = clamp(c.cohesion - rng.int(4, 9));
    const lost = rng.int(30, 90);
    c.stragglers += lost;
    addLog(c, 'logistics', `Forced march. The column covers double ground, but ${lost} men fall out along the road — most will catch up, some will not.`);
    if (c.fatigue > 60) addLog(c, 'morale', 'The men are grumbling about the pace. Officers report sore feet, short tempers, and shorter rations of sleep.');
  } else if (choices.pace === 'rest') {
    c.fatigue = clamp(c.fatigue - rng.int(12, 20));
    c.morale = clamp(c.morale + rng.int(2, 6));
    c.cohesion = clamp(c.cohesion + rng.int(2, 5));
    addLog(c, 'logistics', 'The army rests. Kit is mended, blisters drained, tempers cooled. The enemy, presumably, does not rest.');
  } else {
    c.distance -= 1;
    c.fatigue = clamp(c.fatigue + rng.int(2, 5));
    addLog(c, 'logistics', 'A steady day’s march. The column keeps good order.');
  }
  if (c.weather === 'rain' && choices.pace !== 'rest') {
    c.fatigue = clamp(c.fatigue + 5);
  }

  // Supply. Foraging the same country twice yields less: it gets eaten out.
  const consumption = choices.pace === 'rest' ? 0.8 : 1;
  if (choices.supply === 'forage') {
    c.forageDays = (c.forageDays ?? 0) + 1;
    const gained = rng.range(0.5, 1.8) * Math.pow(0.8, Math.max(0, c.forageDays - 1));
    c.food = Math.max(0, c.food - consumption + gained);
    if (c.forageDays >= 3) {
      addLog(c, 'logistics', 'The foraging parties range farther for less. This country is eaten out, and its people have learned to bury what they love.');
    }
    if (rng.chance(0.4)) {
      c.disciplineTone = clamp(c.disciplineTone + 6);
      c.cohesion = clamp(c.cohesion - 4);
      addLog(c, 'logistics', 'Foraging parties range wide. They come back with grain, pigs, and complaints from the local people. Some men came back drunk.');
    } else {
      addLog(c, 'logistics', 'Foraging parties bring in a decent haul. The countryside will remember us unkindly.');
    }
    c.morale = clamp(c.morale + 2);
  } else {
    c.food = Math.max(0, c.food - consumption);
    c.cohesion = clamp(c.cohesion + 2);
    addLog(c, 'logistics', 'The army eats from its own wagons and keeps its hands off the villages. Discipline holds; the food dwindles.');
  }
  if (c.food < 3) {
    c.morale = clamp(c.morale - 8);
    addLog(c, 'morale', 'The food is nearly gone. Quartermasters are watering the porridge, and everyone knows it.', true);
  }

  // Scouting.
  if (choices.scouts === 'wide') {
    const gain = c.weather === 'fog' ? rng.int(4, 10) : rng.int(10, 20);
    c.intel = clamp(c.intel + gain);
    c.scoutedWide = true;
    if (rng.chance(0.25)) {
      addLog(c, 'scout', `A scouting party fails to return. The others report ${era.enemyName} has outriders of its own.`, true);
      c.intel = clamp(c.intel - 4);
    } else {
      addLog(c, 'scout', scoutFlavor(c, rng));
    }
  } else {
    c.intel = clamp(c.intel + rng.int(2, 6));
    addLog(c, 'scout', 'The scouts stay within signal distance of the column. Safe, and mostly blind.');
  }

  // Vanguard actions: at fixed points on the march, a small fight finds
  // you, and you must put a NAME on it. This is where you learn your men.
  const vanguardKey = `van-${c.operation}-1`;
  const forageKey = `van-${c.operation}-2`;
  if (c.distance === 3 && !c.engagementsDone.includes(vanguardKey)) {
    c.pendingEngagement = makeEngagement(c, vanguardKey, 'bridge', rng);
  } else if (c.distance === 1 && !c.engagementsDone.includes(forageKey)) {
    c.pendingEngagement = makeEngagement(c, forageKey, 'forage', rng);
  } else if (!c.pendingEvent) {
    // The day's evening belongs to either the army or the man. The
    // personal life gets first claim roughly every other quiet day.
    const personalFirst = rng.chance(0.5);
    if (personalFirst) maybePersonalEvent(c, rng.fork(87));
    if (!c.pendingEvent && rng.chance(0.65)) c.pendingEvent = pickEvent(c, rng);
    if (!c.pendingEvent && !personalFirst) maybePersonalEvent(c, rng.fork(88));
  }

  c.day += 1;
  // Time is not free: a general who dawdles is a general who is questioned.
  if (c.day > MARCH_DAYS + 2 + (c.operation - 1) * (MARCH_DAYS + 3)) {
    c.rulerPatience = clamp(c.rulerPatience - 2);
    if (c.rulerPatience % 10 === 0) {
      addLog(c, 'event', `A letter from ${ERAS[c.era].rulerTitle} inquires, in a tone, why the army is eating and not fighting.`, true);
    }
  }
  if (c.distance <= 0) {
    c.distance = 0;
    addLog(c, 'scout', `Outriders report the enemy in strength ahead, near ${c.placeName}. The next decision is where to camp.`, true);
  }
}

function scoutFlavor(c: CampaignState, rng: Rng): string {
  const lines = [
    `Scouts report dust to the ${rng.pick(['south', 'east', 'southeast'])} — a large body of men, perhaps with cavalry.`,
    `Riders bring in a captured enemy forager. He talks freely and claims ${c.enemyName} is larger than we believed. Prisoners usually exaggerate.`,
    `The scouts find abandoned campfires, two days cold. Counting fire-rings suggests several thousand men.`,
    `Local herdsmen swear the enemy has already crossed the water and moves this way. Their distances are vague.`,
  ];
  return rng.pick(lines);
}

// ---------------------------------------------------------------- events

interface EventDef {
  id: string;
  title: string;
  text: (c: CampaignState) => string;
  options: {
    label: string;
    detail: string;
    resolve: (c: CampaignState, rng: Rng) => void;
  }[];
}

const EVENTS: EventDef[] = [
  {
    id: 'thieves',
    title: 'Discipline in the Ranks',
    text: () =>
      'Two soldiers are caught stealing from the baggage of their own comrades. The men gather to see what you will do. Your officers watch too.',
    options: [
      {
        label: 'Punish them harshly',
        detail: 'Flogging before the assembled army. Discipline over affection.',
        resolve: (c, rng) => {
          c.disciplineTone = clamp(c.disciplineTone - 12);
          c.cohesion = clamp(c.cohesion + 6);
          c.morale = clamp(c.morale - 3);
          bumpConfidence(c, 'discipline', 6, rng);
          addLog(c, 'event', 'The floggings are carried out in silence. The army is quieter afterward — and tighter. Your sterner officers approve.');
        },
      },
      {
        label: 'Overlook it',
        detail: 'Confiscate the goods, say nothing more. Keep the men’s love.',
        resolve: (c, rng) => {
          c.disciplineTone = clamp(c.disciplineTone + 12);
          c.morale = clamp(c.morale + 4);
          c.cohesion = clamp(c.cohesion - 5);
          bumpConfidence(c, 'discipline', -6, rng);
          addLog(c, 'event', 'The matter is quietly dropped. The men appreciate it. Your more exacting officers exchange looks and say nothing.');
        },
      },
    ],
  },
  {
    id: 'plunder',
    title: 'The Promise of Plunder',
    text: (c) =>
      `An officer suggests, delicately, that the men would march harder with a promise of first pick of the enemy camp. ${ERAS[c.era].rulerTitle === 'the Senate' ? 'The Senate' : 'Your ruler'} would prefer the spoils accounted for.`,
    options: [
      {
        label: 'Promise them the enemy camp',
        detail: 'Morale now, discipline problems later — especially in victory.',
        resolve: (c, rng) => {
          c.morale = clamp(c.morale + 10);
          c.disciplineTone = clamp(c.disciplineTone + 15);
          c.plunderPromised = true;
          addLog(c, 'event', 'Word spreads through the column within the hour. The singing starts by afternoon. You hope you will not regret this at the worst moment.');
        },
      },
      {
        label: 'Promise nothing',
        detail: 'Keep the army in hand. Duty is its own reward, allegedly.',
        resolve: (c, rng) => {
          c.cohesion = clamp(c.cohesion + 5);
          c.morale = clamp(c.morale - 3);
          addLog(c, 'event', 'You let the suggestion die. The officer bows. The men march on without singing.');
        },
      },
    ],
  },
  {
    id: 'quarrel',
    title: 'A Quarrel Between Officers',
    text: (c) => {
      const [a, b] = rivalPair(c);
      return `${a.title} ${shortName(a.name)} and ${b.title} ${shortName(b.name)} have quarreled over precedence on the march — loudly, in front of the men. Each demands you rebuke the other.`;
    },
    options: [
      {
        label: 'Rebuke both publicly',
        detail: 'Even-handed, and humiliating for both.',
        resolve: (c, rng) => {
          const [a, b] = rivalPair(c);
          a.confidence = clamp(a.confidence - 8);
          b.confidence = clamp(b.confidence - 8);
          a.traits.trust = clamp(a.traits.trust - 5);
          b.traits.trust = clamp(b.traits.trust - 5);
          c.cohesion = clamp(c.cohesion + 4);
          addLog(c, 'event', 'You dress them both down before the assembled officers. The quarrel stops. So does a certain warmth toward you.');
        },
      },
      {
        label: 'Settle it privately',
        detail: 'Take an evening, hear both out, lose the time.',
        resolve: (c, rng) => {
          const [a, b] = rivalPair(c);
          a.confidence = clamp(a.confidence + 5);
          b.confidence = clamp(b.confidence + 5);
          a.traits.trust = clamp(a.traits.trust + 6);
          b.traits.trust = clamp(b.traits.trust + 6);
          c.fatigue = clamp(c.fatigue + 3);
          addLog(c, 'event', 'A long evening in your tent, and by the end each man believes you secretly agree with him. It will hold. Probably.');
        },
      },
      {
        label: 'Ignore it',
        detail: 'Generals who referee every squabble stop being generals.',
        resolve: (c, rng) => {
          const [a, b] = rivalPair(c);
          a.traits.pride = clamp(a.traits.pride + 5);
          b.traits.pride = clamp(b.traits.pride + 5);
          addLog(c, 'event', 'You let it fester. The two now route their messages so as not to pass each other on the road.');
        },
      },
    ],
  },
  {
    id: 'bridge',
    title: 'The Broken Bridge',
    text: () =>
      'The bridge on the direct road has been broken — recently, and on purpose. The pioneers say a day to repair it. The ford six miles upstream is passable but slow and wet.',
    options: [
      {
        label: 'Repair the bridge',
        detail: 'Lose time, keep the wagons and the men dry.',
        resolve: (c, rng) => {
          c.distance += 1;
          c.supplies = clamp(c.supplies + 5);
          addLog(c, 'event', 'A day of axes and cursing. The bridge holds. The enemy now knows exactly which road you are on.');
        },
      },
      {
        label: 'Take the ford',
        detail: 'Keep moving. Wet men, strained wagons.',
        resolve: (c, rng) => {
          c.fatigue = clamp(c.fatigue + 8);
          c.supplies = clamp(c.supplies - 8);
          if (rng.chance(0.4)) {
            addLog(c, 'event', 'The crossing costs a wagon of biscuit, swept sideways into the deep channel. The men watching learn a new curse.');
            c.food = Math.max(0, c.food - 1.5);
          } else {
            addLog(c, 'event', 'The ford is miserable but passable. The column is across by dusk, wet to the waist and still on schedule.');
          }
        },
      },
    ],
  },
  {
    id: 'deserter',
    title: 'An Enemy Deserter',
    text: (c) =>
      `A deserter from ${c.enemyName} is brought to your tent. He offers the enemy’s strength and camp layout in exchange for protection. Your officers are divided on whether he is a plant.`,
    options: [
      {
        label: 'Trust him',
        detail: 'Real intelligence, if true. A shaped lie, if not.',
        resolve: (c, rng) => {
          if (rng.chance(0.65)) {
            c.intel = clamp(c.intel + 18);
            addLog(c, 'event', 'His account matches what the scouts have pieced together. Numbers, banners, even the name of the enemy rearguard commander. A find.', true);
          } else {
            c.intel = clamp(c.intel - 12);
            addLog(c, 'event', 'His account is detailed, confident, and — you will discover — wrong in exactly the ways that matter.', true);
          }
        },
      },
      {
        label: 'Keep him under guard, trust the scouts',
        detail: 'Safe. No windfall, no poison.',
        resolve: (c, rng) => {
          c.intel = clamp(c.intel + 4);
          addLog(c, 'event', 'He eats your food and tells his story to anyone who will listen. The scouts confirm the dull parts.');
        },
      },
    ],
  },
  {
    id: 'shrine',
    title: 'Omens',
    text: (c) =>
      c.era === 'roman'
        ? 'The sacred chickens refuse to eat. The augur looks at you meaningfully. The men have already heard.'
        : 'The night before last, a comet — or something like one. The men have decided it means something. They are waiting to hear what.',
    options: [
      {
        label: 'Declare it a good omen',
        detail: 'Seize the story before it seizes you.',
        resolve: (c, rng) => {
          if (rng.chance(0.7)) {
            c.morale = clamp(c.morale + 8);
            addLog(c, 'event', 'You announce that the sign favors the army. Cheering. Whether heaven agrees will be discovered shortly.');
          } else {
            c.morale = clamp(c.morale + 3);
            addLog(c, 'event', 'The announcement lands flat — the men suspect an omen that requires a speech. Still, better than silence.');
          }
        },
      },
      {
        label: 'Ignore it',
        detail: 'Soldiers forget omens when the marching is good.',
        resolve: (c, rng) => {
          c.morale = clamp(c.morale - 4);
          addLog(c, 'event', 'You say nothing. In the absence of your version, the men invent worse ones.');
        },
      },
    ],
  },
];

function rivalPair(c: CampaignState) {
  const a = c.officers.find((o) => o.rivalId) ?? c.officers[0];
  const b = c.officers.find((o) => o.id === a.rivalId) ?? c.officers[1];
  return [a, b] as const;
}

function bumpConfidence(c: CampaignState, trait: keyof import('./types.ts').Traits, amount: number, rng: Rng) {
  // Officers whose temperament matches the decision gain confidence in you.
  for (const o of c.officers) {
    const leans = o.traits[trait] > 60;
    o.confidence = clamp(o.confidence + (leans ? amount : -Math.round(amount / 2)));
    o.traits.trust = clamp(o.traits.trust + (leans ? Math.round(amount / 2) : -Math.round(amount / 3)));
  }
}

function pickEvent(c: CampaignState, rng: Rng): CampaignEvent {
  const used = new Set(c.log.filter((l) => l.kind === 'event').map((l) => l.text));
  const pool = EVENTS.filter((e) => !c.log.some((l) => l.text.includes(e.title)));
  const candidates = pool.length ? pool : EVENTS;
  const def = rng.pick(candidates);
  return {
    id: def.id,
    title: def.title,
    text: def.text(c),
    options: def.options.map((o, i) => ({ label: o.label, detail: o.detail, apply: `${def.id}:${i}` })),
  };
}

export function resolveEventChoice(c: CampaignState, apply: string): void {
  if (applyPersonalChoice(c, apply)) return;
  const [id, idxStr] = apply.split(':');
  const def = EVENTS.find((e) => e.id === id);
  if (!def) return;
  const opt = def.options[Number(idxStr)];
  if (!opt) return;
  const rng = rngForDay(c).fork(77);
  opt.resolve(c, rng);
  c.pendingEvent = undefined;
}

// ---------------------------------------------------------------- camp phase

export function resolveCampChoice(c: CampaignState, placement: 'hill' | 'river' | 'road', fortified: boolean): void {
  const rng = rngForDay(c).fork(88);
  c.campPlacement = placement;
  c.fortifiedCamp = fortified;
  const era = ERAS[c.era];
  if (fortified) {
    c.fatigue = clamp(c.fatigue + 8);
    c.cohesion = clamp(c.cohesion + 6);
    addLog(c, 'logistics', `The army digs. By nightfall ${era.campName} has a ditch, a bank, and a proper gate. The men sleep better behind earthworks, even tired ones.`);
  } else {
    c.fatigue = clamp(c.fatigue - 4);
    addLog(c, 'logistics', `A marching camp only — pickets and wagons. The men rest, and the sentries watch the dark a little harder.`);
  }
  const placeText = {
    hill: 'You camp on the high ground. Water must be carried up, but the sentries can see the whole valley, and anyone attacking will do it uphill.',
    river: 'You camp by the water. The men and horses drink well; the ground is soft and the mist off the river will hide the dawn.',
    road: 'You camp astride the road. Supply moves easily, and so would a retreat — a thought you keep to yourself.',
  }[placement];
  addLog(c, 'logistics', placeText);
  if (placement === 'hill') c.morale = clamp(c.morale + 3);
  if (placement === 'river') c.fatigue = clamp(c.fatigue - 3);
  if (placement === 'road') c.supplies = clamp(c.supplies + 6);
}

export function finalScout(c: CampaignState): void {
  const rng = rngForDay(c).fork(111);
  const gain = c.weather === 'fog' ? rng.int(3, 8) : rng.int(8, 16);
  c.intel = clamp(c.intel + gain);
  addLog(c, 'scout', finalScoutText(c, rng), true);
}

function finalScoutText(c: CampaignState, rng: Rng): string {
  if (c.intel > 70) {
    return `The scouts return with a clear picture: ${c.enemyName} is drawn up with its main strength in the center, cavalry held on one wing. Numbers close to your own, perhaps slightly ${rng.pick(['more', 'fewer'])}.`;
  }
  if (c.intel > 45) {
    return `The scouts report ${c.enemyName} in battle order beyond the low ground — a strong center is certain, but their horse could not be counted. Banners suggest their commander, ${ERAS[c.era].enemyCommander}, is present.`;
  }
  return `The scouts return with little: campfire smoke, movement, numbers unknown. ${c.enemyName} keeps its outriders busy. You will learn their strength the hard way.`;
}

// The picture of the enemy the player is shown pre-battle. Its accuracy
// depends on intel. The real enemy army is generated separately in battle.ts.
export function enemyEstimate(c: CampaignState): string[] {
  const rng = makeRng(c.seed).fork(555);
  const real = 4200 + rng.int(-400, 600); // must match battle.ts generation
  const err = Math.round((100 - c.intel) * 18 * (rng.chance(0.5) ? 1 : -1));
  const est = Math.max(1500, real + err);
  const lines: string[] = [];
  lines.push(`Estimated enemy strength: around ${Math.round(est / 100) * 100} men.`);
  if (c.intel > 60) {
    lines.push('Composition: strong heavy infantry center, at least one cavalry wing, archers or slingers screening.');
    lines.push(`Their commander ${ERAS[c.era].enemyCommander} is reported ${rng.pick(['confident', 'cautious but present', 'under pressure from his own council'])}.`);
  } else if (c.intel > 35) {
    lines.push('Composition: mostly infantry; cavalry seen but not counted.');
  } else {
    lines.push('Composition: unknown. The scouts saw smoke and spears, and guessed.');
  }
  return lines;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ============================================================ engagements
// A vanguard action: pick a man, pick a manner, learn the truth of both.

function makeEngagement(c: CampaignState, id: string, kind: 'bridge' | 'forage', rng: Rng): Engagement {
  const alive = c.enemyOfficers.filter((o) => !o.dead);
  const foe = rng.pick(alive);
  if (kind === 'bridge') {
    return {
      id,
      title: 'The Bridge Piquet',
      text: `The scouts find the crossing ahead held against you — a few hundred picked men under ${foe.name}, ${foe.title}. Scouts say he is ${foe.epithet}. The army cannot pass until they are cleared, and the officer you send will be fighting in front of everyone.`,
      enemyOfficerId: foe.id,
      stakes: 'Clear the crossing and the army marches on schedule. Fail, and you lose a day, men, and face.',
    };
  }
  return {
    id,
    title: 'The Foraging Fight',
    text: `Your foraging parties have been caught strung out by enemy riders under ${foe.name}, ${foe.title} — ${foe.epithet}. They are cutting up the wagons piecemeal. Someone must take the escort out and bring the foragers home.`,
    enemyOfficerId: foe.id,
    stakes: 'Bring them in and the wagons stay full. Fail, and the army eats the difference.',
  };
}

export type EngagementApproach = 'storm' | 'maneuver';

export function resolveEngagement(c: CampaignState, officerId: string, approach: EngagementApproach): void {
  const eng = c.pendingEngagement;
  if (!eng) return;
  const officer = c.officers.find((o) => o.id === officerId);
  const foe = c.enemyOfficers.find((o) => o.id === eng.enemyOfficerId);
  if (!officer || !foe) { c.pendingEngagement = undefined; return; }
  const rng = rngForDay(c).fork(313);
  const t = officer.traits;
  const who = `${officer.title} ${shortName(officer.name)}`;

  // The officer's TRUE quality decides this — not his reputation.
  let score =
    t.competence * 0.45 +
    (approach === 'storm' ? t.courage * 0.25 + t.aggression * 0.15 : t.discipline * 0.25 + t.caution * 0.15) +
    rng.range(-22, 22);
  // Manner against temperament: storming into a cunning man's ground is
  // how ambushes happen; maneuvering against a hungry wolf invites the rush.
  let foeScore = foe.traits.competence * 0.5 + rng.range(-15, 15);
  if (approach === 'storm') foeScore += foe.traits.cunning * 0.25;
  else foeScore += foe.traits.aggression * 0.25;

  const margin = score - foeScore;
  const isForage = eng.title === 'The Foraging Fight';

  if (margin > 18) {
    // clean triumph
    c.morale = clamp(c.morale + 7);
    c.intel = clamp(c.intel + 8);
    if (isForage) c.food += 1.5;
    officer.confidence = clamp(officer.confidence + 12);
    officer.deeds.push(isForage ? `Cut his way to the foragers and brought every wagon home under ${foe.name}'s nose.` : `Cleared the crossing from ${foe.name} in under an hour.`);
    observe(officer, approach === 'storm'
      ? 'You have seen him lead an assault in person, and win it.'
      : 'You have seen him handle a detached command with cold precision.');
    addGrudge(officer, { enemyOfficerId: foe.id, enemyName: foe.name, kind: 'triumph', note: `Beat ${foe.name} at ${isForage ? 'the forage fight' : 'the crossing'}.` });
    addLog(c, 'event', `${who} ${isForage ? 'scatters the riders and brings the foragers in singing' : 'takes the crossing at a rush'}. ${foe.name} withdraws with his pride bleeding. The men look at ${shortName(officer.name)} differently tonight.`, true);
  } else if (margin > 0) {
    // costly success
    const lost = rng.int(25, 60);
    c.stragglers += lost;
    c.morale = clamp(c.morale + 2);
    if (isForage) c.food += 0.5;
    officer.confidence = clamp(officer.confidence + 5);
    observe(officer, 'You have seen him finish an ugly fight without losing his grip on it.');
    addLog(c, 'event', `${who} gets it done — at a price. Perhaps ${lost} men will not answer roll tomorrow, and ${foe.name} pulled back in good order, which is not the same as beaten.`, true);
  } else if (margin > -18) {
    // bloody repulse
    const lost = rng.int(50, 110);
    c.stragglers += lost;
    c.morale = clamp(c.morale - 5);
    if (isForage) c.food = Math.max(0, c.food - 1.5);
    else c.distance += 1;
    officer.confidence = clamp(officer.confidence - 10);
    observe(officer, approach === 'storm'
      ? 'You have seen him press an attack past the moment it had failed.'
      : 'You have seen him maneuver so carefully the moment passed him by.');
    addGrudge(officer, { enemyOfficerId: foe.id, enemyName: foe.name, kind: 'humiliation', note: `Beaten by ${foe.name} in front of the whole army.` });
    addLog(c, 'event', `${who} is thrown back. ${foe.name} holds the ground and lets your men carry their wounded off unmolested — a courtesy that stings worse than arrows. ${shortName(officer.name)} will remember that name.`, true);
  } else {
    // disaster
    const lost = rng.int(90, 170);
    c.stragglers += lost;
    c.morale = clamp(c.morale - 9);
    c.cohesion = clamp(c.cohesion - 5);
    if (isForage) c.food = Math.max(0, c.food - 2.5);
    else c.distance += 1;
    officer.confidence = clamp(officer.confidence - 16);
    const woundedRoll = rng.chance(0.4);
    if (woundedRoll) {
      officer.wounded = true;
      observe(officer, 'You have seen him carried back from a fight he should not have lost.');
    } else {
      observe(officer, 'You have seen him mishandle a simple action from start to finish.');
    }
    addGrudge(officer, { enemyOfficerId: foe.id, enemyName: foe.name, kind: 'humiliation', note: `Humiliated by ${foe.name}; ${lost} men lost.` });
    addLog(c, 'event', `A debacle. ${who} is ${woundedRoll ? 'carried back wounded' : 'driven back in confusion'}, ${lost} men are lost, and ${foe.name}'s people are still laughing within earshot of your pickets. The army saw all of it.`, true);
  }
  c.engagementsDone.push(eng.id);
  c.pendingEngagement = undefined;
}

// ============================================================ the council
// Each proposer argues the battle HE would fight. Whether his plan is any
// good depends on the competence you cannot see. Endorsing is an act of
// public trust — and the man you pass over keeps score.

export function buildCouncilProposals(c: CampaignState): void {
  if (c.councilProposals) return;
  const rng = rngForDay(c).fork(99);
  c.heldCouncil = true;
  c.fatigue = clamp(c.fatigue + 2);
  // the three most forward personalities speak up
  const speakers = c.officers
    .filter((o) => !o.dead)
    .sort((a, b) => (b.traits.ambition + b.traits.initiative + b.traits.pride) - (a.traits.ambition + a.traits.initiative + a.traits.pride))
    .slice(0, 3);
  c.councilProposals = speakers.map((o) => {
    const sound = o.traits.competence >= 55;
    // a sound man reads the enemy right most of the time; a fool guesses
    const cavClaim = sound
      ? (rng.chance(0.85) ? c.enemyCavSide : (c.enemyCavSide === 'left' ? 'right' : 'left'))
      : (rng.chance(0.5) ? 'left' : 'right');
    const flavor = o.traits.aggression > 60
      ? `"Strike before they settle. Their horse will come round our ${cavClaim} — meet it moving, not standing."`
      : o.traits.caution > 60
        ? `"Let them come to us and break their teeth. Their horse will show on our ${cavClaim} — refuse that flank and hold the rest."`
        : `"Keep the reserve close and the line short. Watch our ${cavClaim} — that is where their horse will be."`;
    return { officerId: o.id, summary: flavor, hiddenSound: sound, cavClaim };
  });
  const names = speakers.map((o) => `${o.title} ${shortName(o.name)}`).join(', ');
  addLog(c, 'command', `You hold a council of war. ${names} each argue their case. They are watching to see whose judgment you value.`, true);
}

export function endorseProposal(c: CampaignState, officerId: string): void {
  if (!c.councilProposals || c.endorsedOfficerId !== undefined) return;
  c.endorsedOfficerId = officerId;
  if (officerId === '') {
    addLog(c, 'command', 'You thank the council and keep your own counsel. No one is exalted; no one is slighted; no one is sure what the plan is.');
    for (const p of c.councilProposals) {
      const o = c.officers.find((x) => x.id === p.officerId);
      if (o) o.confidence = clamp(o.confidence - 3);
    }
    return;
  }
  const chosen = c.officers.find((o) => o.id === officerId);
  const proposal = c.councilProposals.find((p) => p.officerId === officerId);
  if (!chosen || !proposal) return;
  chosen.playerEndorsed = true;
  chosen.confidence = clamp(chosen.confidence + 12);
  chosen.traits.trust = clamp(chosen.traits.trust + 8);
  c.cavHint = proposal.cavClaim;
  // the men he argued against absorb the verdict
  for (const p of c.councilProposals) {
    if (p.officerId === officerId) continue;
    const o = c.officers.find((x) => x.id === p.officerId);
    if (!o) continue;
    o.confidence = clamp(o.confidence - 4);
    if (o.rivalId === officerId || chosen.rivalId === o.id) {
      o.traits.trust = clamp(o.traits.trust - 8);
      o.traits.pride = clamp(o.traits.pride + 4);
      addLog(c, 'command', `${o.title} ${shortName(o.name)} hears you take his rival's plan over his. He says nothing, which says everything.`);
    }
  }
  addLog(c, 'command', `You endorse ${chosen.title} ${shortName(chosen.name)}'s reading of the battle before the assembled officers. He stands straighter. Now his plan is your plan — and everyone knows whose it was.`, true);
}

// ============================================================ the challenge
// An enemy champion rides out before the camp. Honor cultures keep books.

export function maybeChallenge(c: CampaignState): void {
  if (c.challengeDone || c.pendingChallenge) return;
  const rng = rngForDay(c).fork(414);
  if (!rng.chance(0.6)) { c.challengeDone = true; return; }
  const alive = c.enemyOfficers.filter((o) => !o.dead);
  if (!alive.length) { c.challengeDone = true; return; }
  const champion = alive.sort((a, b) => b.traits.aggression - a.traits.aggression)[0];
  c.pendingChallenge = { enemyOfficerId: champion.id };
  addLog(c, 'event', `A rider comes out from the enemy lines at dusk: ${champion.name}, ${champion.title}, walking his horse the length of your pickets and calling for any officer who dares meet him between the armies. The men are all watching you.`, true);
}

export function resolveChallenge(c: CampaignState, answer: string /* officerId or 'refuse' */): void {
  const ch = c.pendingChallenge;
  if (!ch) return;
  const rng = rngForDay(c).fork(415);
  const champion = c.enemyOfficers.find((o) => o.id === ch.enemyOfficerId)!;

  let fighter: Officer | undefined;
  if (answer === 'refuse') {
    // a proud, hot officer may go anyway — your authority be damned
    const hothead = c.officers.find((o) => !o.dead && !o.wounded && o.traits.pride > 72 && o.traits.aggression > 62);
    if (hothead && rng.chance(0.55)) {
      fighter = hothead;
      ch.volunteerId = hothead.id;
      addLog(c, 'command', `You forbid it. An hour later a horse is missing and so is ${hothead.title} ${shortName(hothead.name)}. He is already out between the lines. The camp empties onto the rampart to watch.`, true);
      observe(hothead, 'You have seen him defy you outright when his honor was in the wind.');
      hothead.traits.trust = clamp(hothead.traits.trust - 5);
      // tolerated defiance is contagious: the general's word is negotiable now
      c.disciplineTone = clamp(c.disciplineTone + 8);
      for (const o of c.officers) {
        if (o.id !== hothead.id && !o.dead && o.traits.pride > 60) {
          o.traits.discipline = clamp(o.traits.discipline - 3);
          o.traits.trust = clamp(o.traits.trust - 3);
        }
      }
      addLog(c, 'command', 'Whatever happens out there, every proud officer in the army has just watched your direct order become a suggestion. That has a price, and it compounds.');
    } else {
      c.morale = clamp(c.morale - 4);
      addLog(c, 'event', `No one answers. ${champion.name} rides the line once more, spits, and trots home. The silence in the camp afterward has a taste.`);
      c.pendingChallenge = undefined;
      c.challengeDone = true;
      return;
    }
  } else {
    fighter = c.officers.find((o) => o.id === answer);
    if (!fighter) { c.pendingChallenge = undefined; c.challengeDone = true; return; }
  }

  const who = `${fighter.title} ${shortName(fighter.name)}`;
  const fScore = fighter.traits.courage * 0.5 + fighter.traits.competence * 0.3 + rng.range(-22, 22);
  const cScore = champion.traits.aggression * 0.4 + champion.traits.competence * 0.4 + rng.range(-18, 18);

  if (fScore >= cScore) {
    champion.dead = true;
    c.morale = clamp(c.morale + 9);
    fighter.confidence = clamp(fighter.confidence + 15);
    fighter.deeds.push(`Slew ${champion.name} in single combat before both armies.`);
    observe(fighter, 'You have seen him kill a champion in single combat.');
    addGrudge(fighter, { enemyOfficerId: champion.id, enemyName: champion.name, kind: 'triumph', note: `Killed ${champion.name} between the lines.` });
    addLog(c, 'event', `They meet between the armies. It is short. ${who} comes back with ${champion.name}'s horse and a roar goes down your whole line that must be heard in their camp. Whoever commands that man's men tomorrow will do it with a hole where their captain was.`, true);
    // if that was the man from your campaign book, the account closes here
    if (c.personal.vengeance && !c.personal.vengeance.settled && c.personal.vengeance.enemyOfficerId === champion.id) {
      c.personal.vengeance.settled = true;
      c.personal.resolve = clamp(c.personal.resolve + 14);
      addLog(c, 'personal', `${champion.name}. That name, out of all of them. You watch ${shortName(fighter.name)} lead the horse back through the cheering and you stand very still, closing a page.`, true);
    }
  } else {
    const dies = rng.chance(0.45);
    c.morale = clamp(c.morale - 8);
    if (dies) {
      fighter.dead = true;
      addLog(c, 'event', `They meet between the armies, and ${who} does not come back. ${champion.name} dips his spear to your lines — the courtesy of a professional — and rides home. The camp is very quiet tonight.`, true);
    } else {
      fighter.wounded = true;
      fighter.confidence = clamp(fighter.confidence - 15);
      observe(fighter, 'You have seen him beaten in single combat and carried home.');
      addGrudge(fighter, { enemyOfficerId: champion.id, enemyName: champion.name, kind: 'blood', note: `Cut down by ${champion.name} between the lines, and lived.` });
      addLog(c, 'event', `${who} is carried back with a spear-wound in his shoulder and murder in his eyes. ${champion.name} rides home untouched. Tomorrow one of your officers fights with one arm and one idea.`, true);
    }
  }
  c.pendingChallenge = undefined;
  c.challengeDone = true;
}

// ============================================================ judgment
// After the chronicle is read, the general hands down praise and blame.
// Both are bets placed on men whose numbers you still cannot see.

export function commendOfficer(c: CampaignState, officerId: string): void {
  const o = c.officers.find((x) => x.id === officerId);
  if (!o) return;
  o.confidence = clamp(o.confidence + 14);
  o.traits.trust = clamp(o.traits.trust + 10);
  // praise feeds the appetites: a praised opportunist opportunizes more
  o.traits.pride = clamp(o.traits.pride + 6);
  o.traits.ambition = clamp(o.traits.ambition + 5);
  o.deeds.push('Publicly commended before the assembled army.');
  const rival = c.officers.find((x) => x.id === o.rivalId);
  if (rival && !rival.dead) {
    rival.traits.trust = clamp(rival.traits.trust - 7);
    rival.traits.pride = clamp(rival.traits.pride + 5);
  }
  addLog(c, 'command', `You commend ${o.title} ${shortName(o.name)} before the army. He will remember it. So will the men who watched and were not named.`, true);
}

export function censureOfficer(c: CampaignState, officerId: string): void {
  const o = c.officers.find((x) => x.id === officerId);
  if (!o) return;
  o.confidence = clamp(o.confidence - 14);
  o.traits.trust = clamp(o.traits.trust - 10);
  if (o.perf.blunders > 0 || o.perf.deviations > o.perf.faithful) {
    // a just censure chastens: he tightens up
    o.traits.discipline = clamp(o.traits.discipline + 8);
    o.traits.initiative = clamp(o.traits.initiative - 5);
    addLog(c, 'command', `You censure ${o.title} ${shortName(o.name)} before his peers. He takes it standing still. Expect him to follow his next orders to the letter — exactly to the letter, and not one step past it.`, true);
  } else {
    // an unjust one festers
    o.traits.pride = clamp(o.traits.pride + 10);
    o.traits.loyalty = clamp(o.traits.loyalty - 8);
    addLog(c, 'command', `You censure ${o.title} ${shortName(o.name)} before his peers. The other officers avoid your eye — the army does not agree he earned it, and neither, visibly, does he.`, true);
  }
}

// ============================================================ the next war
// One battle is not the war. If the ruler's patience holds, the same men
// march again — carrying everything they now are.

const PATIENCE_SHIFT: Record<OutcomeKind, number> = {
  'decisive-victory': 25, 'costly-victory': 14, 'narrow-victory': 8,
  'pyrrhic-victory': -2, 'orderly-withdrawal': -14, 'chaotic-retreat': -24,
  defeat: -26, disaster: -50,
};

export function applyOutcomeToWar(c: CampaignState, outcome: OutcomeKind): void {
  c.rulerPatience = clamp(c.rulerPatience + PATIENCE_SHIFT[outcome]);
  const won = outcome === 'decisive-victory' || outcome === 'costly-victory' || outcome === 'narrow-victory' || outcome === 'pyrrhic-victory';
  if (won && c.operation >= 3) c.warOver = 'triumph';
  else if (outcome === 'decisive-victory' && c.operation >= 2) c.warOver = 'triumph';
  else if (c.rulerPatience <= 0 || outcome === 'disaster') c.warOver = 'dismissed';
}

export function nextOperation(c: CampaignState, survivors: Record<string, number>): void {
  const rng = makeRng(c.seed).fork(6000 + c.operation);
  const era = ERAS[c.era];
  c.operation += 1;
  c.distance = 4;
  // new ground, same war
  const otherPlaces = era.placeNames.filter((p) => p !== c.placeName);
  c.placeName = rng.pick(otherPlaces);
  c.enemyCavSide = rng.chance(0.5) ? 'left' : 'right';
  // The shape of the next operation varies — no single battle plan
  // survives a whole war. Defensive commanders make you come to them.
  const roll = rng.next();
  c.opKind =
    c.enemyDoctrine === 'defensive'
      ? (roll < 0.6 ? 'their-ground' : roll < 0.8 ? 'assault' : 'defense')
      : c.enemyDoctrine === 'rash'
        ? (roll < 0.5 ? 'assault' : roll < 0.85 ? 'defense' : 'their-ground')
        : (roll < 0.4 ? 'assault' : roll < 0.7 ? 'their-ground' : 'defense');
  c.objectiveText =
    c.opKind === 'defense'
      ? `Hold ${c.placeName} against the enemy's advance until nightfall. If the position falls, the road behind it falls with it.`
      : c.opKind === 'their-ground'
        ? `${era.objective(c.placeName)} The enemy has fortified good ground and does not intend to move. You will have to go and take it from him.`
        : era.objective(c.placeName);
  addLog(c, 'event',
    c.opKind === 'defense'
      ? 'This time the enemy is coming to you. The ground you choose to stand on will be the whole battle.'
      : c.opKind === 'their-ground'
        ? 'The scouts agree: he has picked his ground and grown roots. Waiting for him to blunder is a plan; it is not a good one; the ruler is counting days.'
        : 'The armies will meet in open country. The usual rules: whoever blinks first, in front of everyone.',
    true);
  // the army resets what rest can reset, keeps what it cannot forget
  c.food = Math.min(14, c.food + 9);
  c.supplies = clamp(c.supplies + 25);
  c.fatigue = clamp(c.fatigue - 30);
  c.cohesion = clamp(c.cohesion + 10);
  c.intel = 25;
  c.weather = 'clear';
  c.stragglers = 0;
  c.veteranBlood = clamp((c.veteranBlood ?? 0) + 18);
  // replacements: half of losses are made good with green men
  c.unitStrength = {};
  const FULL: Record<string, number> = {
    'f-center': 1200, 'f-left': 800, 'f-right': 800,
    'f-cavalry': 400, 'f-ranged': 500, 'f-reserve': 600,
  };
  for (const [id, full] of Object.entries(FULL)) {
    const now = survivors[id] ?? full;
    c.unitStrength[id] = Math.min(full, Math.round(now + (full - now) * 0.5));
  }
  // officers: wounds either heal or harden; the dead are replaced by unknowns
  for (const o of c.officers) {
    o.playerEndorsed = false;
    o.honorSlighted = false;
    o.perf = { ordersReceived: 0, faithful: 0, deviations: 0, heroics: 0, blunders: 0 };
    if (o.wounded && rng.chance(0.6)) {
      o.wounded = false;
      addLog(c, 'command', `${o.title} ${shortName(o.name)}'s wound has closed. He does not mention it. He mentions the man who gave it to him.`);
    }
  }
  let replaced = 0;
  for (let i = 0; i < c.officers.length; i++) {
    if (!c.officers[i].dead) continue;
    const fallen = c.officers[i];
    const fresh = generateOfficers(rng.fork(700 + i), era)[i];
    fresh.id = fallen.id; // keep formation bindings stable
    fresh.fresh = true;
    fresh.background = `Promoted to fill ${shortName(fallen.name)}'s place. No letters precede him, no songs follow him. You know nothing about this man except that he is now holding a command.`;
    fresh.rivalId = undefined;
    c.officers[i] = fresh;
    replaced++;
    addLog(c, 'command', `${fresh.title} ${shortName(fresh.name)} takes over the late ${shortName(fallen.name)}'s command. An unknown quantity, in the exact place you can least afford one.`, true);
  }
  // enemy losses are made good too; dead champions are not forgotten by name
  for (let i = 0; i < c.enemyOfficers.length; i++) {
    if (!c.enemyOfficers[i].dead) continue;
    const dead = c.enemyOfficers[i];
    const freshFoe = generateEnemyOfficers(rng.fork(800 + i), era)[i];
    freshFoe.id = `eoff-${c.operation}-${i}`;
    freshFoe.name = `${era.enemyOfficerNames[(i + c.operation) % era.enemyOfficerNames.length]} the Younger`;
    c.enemyOfficers[i] = freshFoe;
  }
  // clear one-battle state
  c.pendingEvent = undefined;
  c.pendingEngagement = undefined;
  c.pendingChallenge = undefined;
  c.challengeDone = false;
  c.heldCouncil = false;
  c.councilProposals = undefined;
  c.endorsedOfficerId = undefined;
  c.cavHint = undefined;
  c.campPlacement = undefined;
  c.fortifiedCamp = undefined;
  c.scoutedWide = undefined;
  addLog(c, 'event', `${era.strategicOrder(c.placeName, c.rulerName)}`, true);
  addLog(c, 'logistics', `The army takes the road again — thinner, harder, and carrying its memories with it. Operation ${c.operation} of the war begins.`);
  personalNextOperation(c);
}

// ============================================================ a new war
// The saga: years have passed (the interlude handled the family), a new
// enemy army musters, and the general takes the field again — older,
// carrying his best officers and everything he knows about them.

export function newWar(old: CampaignState): CampaignState {
  const warNo = old.personal.career.warsFought; // interlude already advanced it
  const c = newCampaign(old.era, (old.seed + warNo * 7907) >>> 0);
  // the man and his family persist
  c.personal = old.personal;
  // your standing reflects the career, not a blank slate
  c.rulerPatience = old.warOver === 'triumph' ? 70 : 42;
  // carry over your most trusted living officers — the ones you KNOW.
  // This is where the long game pays: observations ride along.
  const carried = old.officers
    .filter((o) => !o.dead && !o.familyId)
    .sort((a, b) => b.traits.trust - a.traits.trust)
    .slice(0, 3);
  carried.forEach((vet, i) => {
    vet.id = `vet-w${warNo}-${i}`;
    vet.perf = { ordersReceived: 0, faithful: 0, deviations: 0, heroics: 0, blunders: 0 };
    vet.confidence = 60;
    vet.wounded = false;
    vet.playerEndorsed = false;
    vet.honorSlighted = false;
    vet.grudges = []; // the old enemies went home; the new ones are strangers
    vet.rivalId = undefined;
    if (!vet.deeds.includes('Followed you into a second war.')) {
      vet.deeds.push('Followed you into a second war.');
    }
    c.officers[i] = vet; // replaces a freshly generated stranger
  });
  // a son who held a commission keeps it
  const sonOfficers = old.officers.filter((o) => !o.dead && o.familyId);
  for (const son of sonOfficers) {
    son.perf = { ordersReceived: 0, faithful: 0, deviations: 0, heroics: 0, blunders: 0 };
    son.confidence = 62;
    son.wounded = false;
    son.grudges = [];
    c.officers.push(son);
  }
  // kin-by-marriage ties survive the years
  for (const o of c.officers) {
    const wed = c.personal.family.find((f) => f.role === 'wed-officer' && f.weddedTo === o.id);
    if (wed) o.kinById = wed.id;
  }
  // a daughter at court is a standing asset
  if (c.personal.arcFlags.includes('saga:court-daughter')) {
    c.rulerPatience = clamp(c.rulerPatience + 8);
    addLog(c, 'personal', 'Your daughter\'s letters from the capital arrive before your orders do: who is for you, who is against you, and which of the against can be bought with a dinner. You march better-armed at court than you ever have.');
  }
  addLog(c, 'command', `You take the field for the ${ordinalLabel(warNo + 1)} time. ${carried.length ? `${carried.map((o) => `${o.title} ${shortName(o.name)}`).join(', ')} follow${carried.length === 1 ? 's' : ''} you from the last war — men whose measure you have already taken.` : 'None of your old officers could be persuaded back; the roster is strangers.'}`, true);
  return c;
}

function ordinalLabel(n: number): string {
  return ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'][n] ?? `${n}th`;
}
