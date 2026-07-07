// The campaign layer: a march of several days toward the enemy.
// Its whole job is to shape the battle — tired armies fight worse,
// blind armies deploy against ghosts, and officers remember how
// you treated them on the road.

import { makeRng, type Rng } from './rng.ts';
import { ERAS, type Era } from './era.ts';
import { generateOfficers, shortName } from './officer.ts';
import type {
  CampaignEvent, CampaignState, EraId, Report, Weather,
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
  const c: CampaignState = {
    seed,
    era,
    day: 1,
    distance: MARCH_DAYS,
    food: 12,
    supplies: 70,
    morale: 68,
    fatigue: 20,
    cohesion: 70,
    intel: 25,
    disciplineTone: 50,
    weather: 'clear',
    stragglers: 0,
    officers,
    log: [],
    objectiveText: e.objective(place),
    rulerName: e.rulerName,
    enemyName: e.enemyName,
    placeName: place,
    nextReportId: 1,
  };
  addLog(c, 'event', e.strategicOrder(place, e.rulerName), true);
  addLog(c, 'logistics', `The army musters: some ${totalMuster()} men under arms, ${officers.length} officers of note, and food for roughly twelve days.`);
  return c;
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

  // Supply.
  const consumption = choices.pace === 'rest' ? 0.8 : 1;
  if (choices.supply === 'forage') {
    const gained = rng.range(0.5, 1.8);
    c.food = Math.max(0, c.food - consumption + gained);
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

  // A day event, some days.
  if (!c.pendingEvent && rng.chance(0.65)) {
    c.pendingEvent = pickEvent(c, rng);
  }

  c.day += 1;
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

export function holdCouncil(c: CampaignState): void {
  const rng = rngForDay(c).fork(99);
  c.heldCouncil = true;
  for (const o of c.officers) {
    o.confidence = clamp(o.confidence + rng.int(4, 10));
    o.traits.trust = clamp(o.traits.trust + rng.int(2, 6));
  }
  c.fatigue = clamp(c.fatigue + 2);
  const talkers = rng.shuffle(c.officers).slice(0, 2);
  addLog(
    c, 'command',
    `You hold a council of war. ${talkers[0].title} ${shortName(talkers[0].name)} argues for a strong center; ${talkers[1].title} ${shortName(talkers[1].name)} wants weight on a wing. What matters is that each man leaves the tent believing he was heard.`,
    true,
  );
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
