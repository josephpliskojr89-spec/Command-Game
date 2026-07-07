// The general's personal life. The design rule: everything here reaches
// the battlefield through ONE number — resolve, the steadiness of the
// hand that writes the orders — and through the choices it pressures.
// A worried man writes muddy orders. A man with nothing to lose writes
// cold clear ones, and other kinds of mistakes.

import { makeRng, type Rng } from './rng.ts';
import { ERAS, type Era } from './era.ts';
import type {
  CampaignEvent, CampaignState, FamilyMember, HouseholdChoice, Officer,
  OutcomeKind, PersonalState, Report, Romance,
} from './types.ts';
import { addLog } from './campaign.ts';

// ---------------------------------------------------------------- family helpers

export function youngChildren(c: CampaignState): FamilyMember[] {
  return c.personal.family.filter((f) => f.role === 'child' && f.age < 13);
}

export function eligibleAide(c: CampaignState): FamilyMember | undefined {
  return c.personal.family.find((f) => f.sex === 'm' && f.role === 'child' && f.age >= 13 && f.age < 17);
}

export function eligibleCommandSon(c: CampaignState): FamilyMember | undefined {
  return c.personal.family.find((f) => f.sex === 'm' && (f.role === 'child' || f.role === 'aide') && f.age >= 17);
}

export function eligibleDaughter(c: CampaignState): FamilyMember | undefined {
  return c.personal.family.find((f) => f.sex === 'f' && f.role === 'child' && f.age >= 15);
}

export function currentAide(c: CampaignState): FamilyMember | undefined {
  return c.personal.family.find((f) => f.id === c.personal.aideId && f.role === 'aide');
}

// A son on your staff: your orders leave the tent through his hands,
// checked, sealed, and legible.
export function aideClarityBonus(c: CampaignState): number {
  return currentAide(c) ? 3 : 0;
}

// Turn a grown son into an Officer with a command. His traits are his
// own — but you RAISED him, so you start with true observations no other
// officer would ever grant you.
export function commissionSon(c: CampaignState, member: FamilyMember): Officer {
  const rng = makeRng(c.seed).fork(8000 + member.id.length + member.age);
  const t = (base: number, spread: number) => Math.max(5, Math.min(95, Math.round(base + rng.range(-spread, spread))));
  const traits = {
    competence: t(48, 20), // green, whatever his gifts
    initiative: t(55, 25),
    aggression: t(58, 22), // young men lean forward
    caution: t(40, 20),
    loyalty: 90,
    ambition: t(60, 20),
    pride: t(60, 20),
    discipline: t(50, 20),
    courage: t(60, 25),
    trust: 88,
  };
  const officer: Officer = {
    id: `off-son-${member.id}`,
    name: member.name,
    title: 'Your Son',
    epithet: 'The men watch him for signs of you, and he knows it.',
    background: `Your son, ${member.age} years old, holding his first command. Every officer in the army is watching how you use him — and how he bears it.`,
    traits,
    reputation: { ...traits, competence: t(60, 15), courage: t(70, 15) }, // the army assumes the blood runs true
    observations: [
      traits.courage > 60
        ? 'You raised him: his nerve is real — he broke his arm at nine and did not cry until it was set.'
        : 'You raised him: he feels fear hard, and hides it well. Watch him in his first real press.',
      traits.competence > 55
        ? 'You raised him: he thinks before he moves, even when he was small.'
        : 'You raised him: he is greener than he believes. He will need plain orders.',
      traits.pride > 60
        ? 'You raised him: he would rather die than embarrass you, which is exactly the problem.'
        : 'You raised him: he takes correction well. Better than you ever did.',
    ],
    grudges: [],
    specialty: rng.chance(0.5) ? 'cavalry' : 'infantry',
    confidence: 60,
    deeds: [],
    perf: { ordersReceived: 0, faithful: 0, deviations: 0, heroics: 0, blunders: 0 },
    familyId: member.id,
  };
  member.role = 'junior-officer';
  member.notes.push('Given his first command under his father.');
  return officer;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function shiftResolve(c: CampaignState, amount: number) {
  c.personal.resolve = clamp(c.personal.resolve + amount);
}

// ---------------------------------------------------------------- setup

export interface HouseholdOption {
  id: HouseholdChoice;
  title: string;
  detail: string;
  flavor: string;
}

export function householdOptions(c: CampaignState): HouseholdOption[] {
  const era = ERAS[c.era];
  const rng = makeRng(c.seed).fork(2001);
  // A saga war: the family already exists; the only question is where
  // they weather this one.
  if (c.personal?.career?.warsFought > 0) {
    const p = c.personal;
    if (p.spouseName) {
      const kidsText = p.family.filter((f) => f.role === 'child' || f.role === 'aide').map((f) => f.name).join(', ');
      return [
        {
          id: 'home',
          title: `${p.spouseName} keeps the household`,
          detail: 'Your family waits at home this war.',
          flavor: `${p.spouseName}${kidsText ? ` and ${kidsText}` : ''} stay behind. She has done this before; the goodbye is practiced now, which does not make it easier. It makes it worse, and quieter.`,
        },
        {
          id: 'camp',
          title: `${p.spouseName} travels with the baggage`,
          detail: 'The family rides with the army again.',
          flavor: `${p.spouseName} declares the household will travel before you finish asking. The quartermaster, who remembers her from the last war, requisitions an extra wagon and hides the good wine.`,
        },
      ];
    }
    return [{
      id: 'alone',
      title: 'You march alone, as ever',
      detail: 'Nothing waits behind you — still.',
      flavor: 'Another war, the same empty tent at the end of the column. The court finds it more suspicious every year. So, some nights, do you.',
    }];
  }
  const spouse = rng.pick(era.womenNames);
  const kids = [rng.pick(era.sonNames), rng.chance(0.5) ? rng.pick(era.sonNames.slice(1)) : rng.pick(era.daughterNames)];
  return [
    {
      id: 'home',
      title: `${spouse} keeps ${era.homeWord}`,
      detail: `Married; your family waits at home.`,
      flavor: `Your wife ${spouse} and your children, ${kids[0]} and ${kids[1]}, remain behind. Letters will follow the army — some of them will be the kind you reread at night, and not all of that is good for a commanding mind. What happens at court in your absence is also a kind of front.`,
    },
    {
      id: 'camp',
      title: `${spouse} travels with the baggage`,
      detail: `Married; your family rides with the army.`,
      flavor: `Your wife ${spouse} and the children travel with the train, as some commanders' families do. Their nearness steadies you, and ${spouse} sees things in your officers that dispatches never carry. But they will sleep a mile from the enemy — and if the camp is ever overrun, it will not be tents you are losing.`,
    },
    {
      id: 'alone',
      title: 'You march alone',
      detail: `Unmarried; nothing waits behind you.`,
      flavor: `No wife, no children, no letters worth rereading. The court finds this suspicious in a man of your rank and will say so. The road is long, the country has people in it, and campaigns have a way of introducing you to someone precisely when you can least afford the distraction.`,
    },
  ];
}

export function initPersonal(c: CampaignState, situation: HouseholdChoice): void {
  const era = ERAS[c.era];
  const rng = makeRng(c.seed).fork(2001);
  const spouse = rng.pick(era.womenNames);
  // the eldest is a son (the saga needs its heir); the second may be either
  const secondIsSon = rng.chance(0.5);
  const kids: { name: string; sex: 'm' | 'f' }[] = [
    { name: rng.pick(era.sonNames), sex: 'm' },
    { name: secondIsSon ? rng.pick(era.sonNames.slice(1)) : rng.pick(era.daughterNames), sex: secondIsSon ? 'm' : 'f' },
  ];
  const priorCareer = c.personal?.career; // preserved across wars in a saga
  const priorFamily = c.personal?.family;
  c.personal = {
    situation,
    spouseName: situation === 'alone' ? undefined : (c.personal?.spouseName ?? spouse),
    spouseBond: c.personal?.spouseName ? c.personal.spouseBond : 55 + rng.int(0, 20),
    family: priorFamily && priorFamily.length > 0
      ? priorFamily
      : situation === 'alone'
        ? []
        : kids.map((k, i) => ({
            id: `fam-${i}`,
            name: k.name,
            sex: k.sex,
            age: 8 + i * 4 + rng.int(0, 3),
            role: 'child' as const,
            notes: [],
          })),
    career: priorCareer ?? { age: 30 + rng.int(0, 6), warsFought: 0, warsWon: 0, chronicle: [] },
    resolve: priorCareer && priorCareer.warsFought > 0
      ? Math.min(100, c.personal.resolve + (situation === 'camp' ? 5 : 0))
      : situation === 'camp' ? 70 : situation === 'home' ? 62 : 56,
    aideId: c.personal?.aideId,
    arcFlags: c.personal?.arcFlags?.filter((f) => f.startsWith('saga:')) ?? [],
    romance: c.personal?.romance,
  };
  if (situation === 'home') {
    addLog(c, 'personal', `${spouse} stood at the gate with the children as the column formed. She did not weep — she never does where the men can see — and you carried that with you for the first ten miles.`);
  } else if (situation === 'camp') {
    addLog(c, 'personal', `${spouse} and the children ride with the baggage, three wagons back. The men think it a good omen: a commander who brings his family expects to win. You hope they are right about what it means.`);
  } else {
    addLog(c, 'personal', `You ride at the head of the column with nothing behind you but the army. The quartermaster's wife has already tried to introduce you to her niece. It will not be the last attempt.`);
  }
}

export function resolveWord(p: PersonalState): string {
  const r = p.resolve;
  if (r > 78) return 'Your mind is clear as winter air. Orders come out of you exactly as you mean them.';
  if (r > 60) return 'You are steady. The work has your full attention.';
  if (r > 42) return 'You are carrying things. Now and then, mid-sentence, you lose the thread of an order.';
  if (r > 25) return 'You sleep badly and it shows. Your dispatches have needed correcting twice this week.';
  return 'You are a man holding himself together with both hands, and the army can tell.';
}

// The one mechanical bridge: resolve feeds order clarity.
export function resolveClarityMod(p: PersonalState): number {
  return Math.round((p.resolve - 55) / 4); // roughly -14..+11
}

// ---------------------------------------------------------------- events

// Personal events use the same CampaignEvent shape as army events; the
// apply keys route to applyPersonalChoice below via the 'p:' prefix.

interface PEventDef {
  id: string;
  when: (c: CampaignState, rng: Rng) => boolean;
  once?: boolean; // never repeats across the whole war
  build: (c: CampaignState, rng: Rng) => CampaignEvent;
  resolve: Record<string, (c: CampaignState, rng: Rng) => void>;
}

function fired(c: CampaignState, id: string): boolean {
  return c.personal.arcFlags.includes(id);
}
function markFired(c: CampaignState, id: string) {
  c.personal.arcFlags.push(id);
}

const PERSONAL_EVENTS: PEventDef[] = [
  // ------------------------------------------------ family at home
  {
    id: 'p-letter-fever',
    once: true,
    when: (c) => c.personal.situation === 'home' && c.day >= 2 && youngChildren(c).length > 0,
    build: (c) => {
      const child = youngChildren(c)[0];
      return {
        id: 'p-letter-fever',
        title: 'A Letter From Home',
        text: `A letter from ${c.personal.spouseName}, four days old. ${child.name} has a fever — "not the worst he has had, but I did not like the look of the physician's face." The rest of the letter is ordinary on purpose. You know her handwriting well enough to see where the pen pressed too hard.`,
        options: [
          { label: 'Send your own physician back with the courier', detail: 'The army loses its best doctor for a fortnight. Your mind comes back to the war.', apply: 'p:fever:physician' },
          { label: 'Write back tonight and carry on', detail: 'It is a fever. Children have fevers. You have a war.', apply: 'p:fever:write' },
          { label: 'Seal it away and work', detail: 'Do not touch the wound. There is no version of worrying that helps.', apply: 'p:fever:seal' },
        ],
      };
    },
    resolve: {
      'p:fever:physician': (c, rng) => {
        c.supplies = clamp(c.supplies - 8);
        shiftResolve(c, +8);
        addLog(c, 'personal', 'Your physician rides for home within the hour, insulted to be spared and secretly pleased to be trusted. The army will set its own bones for a while. You sleep that night.');
      },
      'p:fever:write': (c, rng) => {
        shiftResolve(c, +3);
        addLog(c, 'personal', 'You write until the candle drowns — half of it instructions she will ignore, half of it things you would not say aloud. Sending it does something. Not enough, but something.');
      },
      'p:fever:seal': (c, rng) => {
        if (rng.chance(0.5)) {
          shiftResolve(c, -8);
          addLog(c, 'personal', 'You seal the letter in the camp chest and drown yourself in returns and rosters. It works all day. It stops working at night, every night, at the same hour.');
        } else {
          shiftResolve(c, -2);
          addLog(c, 'personal', 'You seal it away. A week from now a second letter will tell you the fever broke. Until then there is the war, and you make the war be enough.');
        }
      },
    },
  },
  {
    id: 'p-court-whisper',
    once: true,
    when: (c) => c.personal.situation === 'home' && c.day >= 3,
    build: (c) => ({
      id: 'p-court-whisper',
      title: 'What They Say At Court',
      text: `${c.personal.spouseName} writes carefully — she knows letters are read. Between the lines: a rival at court has been asking pointed questions about the cost of your army, and twice now has been seen dining with men who owe you nothing. "You have friends here," she writes, "but friends tire."`,
      options: [
        { label: 'Write a full accounting to the throne', detail: 'A night of paperwork instead of sleep. Defend yourself before you are accused.', apply: 'p:court:defend' },
        { label: 'Ask her to work the wives and the dinners', detail: 'She is better at that war than you are at yours.', apply: 'p:court:spouse' },
        { label: 'Ignore it — victories are the only letter that matters', detail: 'Every hour spent on courtiers is an hour taken from the enemy.', apply: 'p:court:ignore' },
      ],
    }),
    resolve: {
      'p:court:defend': (c) => {
        c.rulerPatience = clamp(c.rulerPatience + 7);
        c.fatigue = clamp(c.fatigue + 3);
        shiftResolve(c, -3);
        addLog(c, 'personal', 'You write until dawn: costs, musters, the arithmetic of why armies eat. It is dull enough to be believed. Your eyes are sand all the next day.');
      },
      'p:court:spouse': (c, rng) => {
        if (c.personal.spouseBond > 55 || rng.chance(0.5)) {
          c.rulerPatience = clamp(c.rulerPatience + 9);
          c.personal.spouseBond = clamp(c.personal.spouseBond + 6);
          shiftResolve(c, +4);
          addLog(c, 'personal', `Three weeks later you learn your rival's dinner guests have stopped coming — ${c.personal.spouseName} discovered their wives owed her mother favors going back a decade. You married better than you deserve and you know it.`);
        } else {
          shiftResolve(c, -4);
          addLog(c, 'personal', `${c.personal.spouseName} does what she can, but her letters grow shorter. Court is a battle too, and you have left her to fight it alone for a long time now.`);
        }
      },
      'p:court:ignore': (c) => {
        c.rulerPatience = clamp(c.rulerPatience - 6);
        addLog(c, 'personal', 'You feed the letter to the brazier. Win, and none of it matters. Lose, and it would not have mattered anyway. This is either wisdom or exhaustion wearing its coat.');
      },
    },
  },
  // ------------------------------------------------ family in camp
  {
    id: 'p-camp-fever',
    once: true,
    when: (c, rng) => c.personal.situation === 'camp' && c.day >= 3 && youngChildren(c).length > 0 && (c.weather === 'rain' || rng.chance(0.5)),
    build: (c) => {
      const kids = youngChildren(c);
      const child = kids[kids.length - 1];
      return {
        id: 'p-camp-fever',
        title: 'Fever in the Baggage Train',
        text: `${c.personal.spouseName} finds you at the map table, which she never does. ${child.name} has taken a camp fever — the wet, the wagons, the water. The physician says the child needs a dry bed and a day of stillness. The army needs neither of those things.`,
        options: [
          { label: 'Halt the army for a day', detail: 'The whole war waits for one small fever. The men will draw their own conclusions.', apply: 'p:campfever:halt' },
          { label: 'Press on; ride back to the wagons each evening', detail: 'The column keeps its schedule. You keep two vigils.', apply: 'p:campfever:press' },
        ],
      };
    },
    resolve: {
      'p:campfever:halt': (c, rng) => {
        c.distance += 1;
        c.fatigue = clamp(c.fatigue - 8);
        shiftResolve(c, +7);
        c.personal.spouseBond = clamp(c.personal.spouseBond + 8);
        addLog(c, 'personal', 'You call it a rest day and let the army believe the wagons needed repair. The men mend kit and sleep. The fever breaks by evening. Some of the older sergeants know exactly what the halt was for, and think better of you for lying about it.');
      },
      'p:campfever:press': (c, rng) => {
        c.fatigue = clamp(c.fatigue + 4);
        if (rng.chance(0.65)) {
          shiftResolve(c, -4);
          addLog(c, 'personal', 'You press on. Each night you ride back down the column in the dark, and each night the small face is a little less flushed. By the third evening the fever is done — and so, nearly, are you.');
        } else {
          shiftResolve(c, -10);
          c.personal.spouseBond = clamp(c.personal.spouseBond - 8);
          addLog(c, 'personal', `You press on, and the fever worsens for two days before it turns. ${c.personal.spouseName} says nothing at all, which is the loudest thing she has ever said to you.`);
        }
      },
    },
  },
  {
    id: 'p-spouse-counsel',
    when: (c) => c.personal.situation === 'camp' && c.day >= 2 && !fired(c, `p-spouse-counsel-op${c.operation}`),
    build: (c) => {
      // she has been watching your officers across fires and suppers —
      // and she reads men without the armor of reputation in the way
      const rng = makeRng(c.seed).fork(3300 + c.operation);
      const target = pickMisjudgedOfficer(c, rng);
      return {
        id: 'p-spouse-counsel',
        title: 'What She Sees',
        text: `${c.personal.spouseName}, brushing out her hair: "Your ${target.title.toLowerCase()} — ${shortNameOf(target.name)}. You listen when he talks and you watch him like you believe the songs." A pause. "${spouseRead(target)}" She shrugs. "You asked me once to tell you what I see. That is what I see."`,
        options: [
          { label: 'Take it seriously', detail: 'Add her reading to what you know of the man.', apply: `p:counsel:accept:${target.id}` },
          { label: 'Kiss her and change the subject', detail: 'Suppers are not battlefields.', apply: 'p:counsel:decline' },
        ],
      };
    },
    resolve: {}, // handled dynamically in applyPersonalChoice (needs the officer id)
  },
  // ------------------------------------------------ the next generation
  {
    id: 'p-son-command',
    when: (c) => !!eligibleCommandSon(c) && c.day >= 2 && !fired(c, `p-son-command-war${c.personal.career.warsFought}`),
    build: (c) => {
      const son = eligibleCommandSon(c)!;
      return {
        id: 'p-son-command',
        title: `${son.name} Asks For a Command`,
        text: `Your son ${son.name} — ${son.age} now, and a head taller than when this war started being his whole world — stands in front of your map table with his helmet under his arm and asks for a command. He has rehearsed this. "Any formation. The reserve, even. I did not come on campaign to guard your correspondence." Every officer in the army will read whatever you answer as a statement about nepotism, about trust, or about fear.`,
        options: [
          { label: 'Give him a command', detail: 'He becomes one of your officers — with your name on his back and green hands on the reins. You know exactly what he is; you raised him.', apply: 'p:son:command' },
          { label: 'Keep him on your staff', detail: 'Your orders keep his careful hands. His ambition keeps a lid on it. For now.', apply: 'p:son:staff' },
          { label: 'Refuse — he stays with the baggage', detail: 'Alive, furious, and learning what his father thinks of him.', apply: 'p:son:refuse' },
        ],
      };
    },
    resolve: {
      'p:son:command': (c) => {
        const son = eligibleCommandSon(c)!;
        const officer = commissionSon(c, son);
        c.officers.push(officer);
        if (c.personal.aideId === son.id) c.personal.aideId = undefined;
        shiftResolve(c, +4);
        addLog(c, 'personal', `You give ${son.name} a command. The council takes it quietly — every one of them asked a father for the same thing once. He salutes you like a stranger, which is correct, and grins on the way out, which is not. Assign him a formation at the next deployment.`, true);
      },
      'p:son:staff': (c) => {
        const son = eligibleCommandSon(c)!;
        son.role = 'aide';
        c.personal.aideId = son.id;
        son.notes.push('Kept on his father\'s staff when he asked for a command.');
        addLog(c, 'personal', `You keep him on the staff. "Your orders reach the wings legible because of you," you tell him, which is true, and he hears the other half of it anyway. He seals the evening dispatches with unnecessary force.`);
      },
      'p:son:refuse': (c) => {
        const son = eligibleCommandSon(c)!;
        son.notes.push('Refused a command by his father, in front of no one, which somehow made it worse.');
        shiftResolve(c, -4);
        addLog(c, 'personal', `You refuse. He takes it standing, the way you taught him, and asks to be excused, the way you taught him. Through the tent wall you hear his horse leave the lines at a gallop and come back an hour later, walking. He is polite at supper. You would rather he had shouted.`);
      },
    },
  },
  {
    id: 'p-aide-scouts',
    when: (c, rng) => !!currentAide(c) && c.day >= 3 && !fired(c, `p-aide-scouts-war${c.personal.career.warsFought}`) && rng.chance(0.7),
    build: (c) => {
      const aide = currentAide(c)!;
      return {
        id: 'p-aide-scouts',
        title: 'The Aide Wants the Dark',
        text: `${aide.name} asks — correctly, through the chief of scouts, everything by the book — for a place on tonight's forward patrol. He is ${aide.age}. The patrol is real work over real ground with the real enemy on it, and he knows you can forbid it, and he knows what it costs him if you do, and so do you.`,
        options: [
          { label: 'Let him ride', detail: 'The patrol comes back with better eyes — or does not come back whole.', apply: 'p:aide:ride' },
          { label: 'Forbid it', detail: 'He stays. Something between you goes a little quieter.', apply: 'p:aide:forbid' },
        ],
      };
    },
    resolve: {
      'p:aide:ride': (c, rng) => {
        const aide = currentAide(c)!;
        markFired(c, `p-aide-scouts-war${c.personal.career.warsFought}`);
        if (rng.chance(0.18)) {
          aide.notes.push('Wounded on a night patrol he begged to join.');
          c.personal.family.find((f) => f.id === aide.id)!.role = 'child'; // off the staff to heal
          c.personal.aideId = undefined;
          shiftResolve(c, -12);
          c.intel = Math.min(100, c.intel + 6);
          addLog(c, 'personal', `The patrol comes back at dawn with good maps and your son over a saddle — a spear graze along the ribs, wet but shallow. The physician calls it a lesson priced fairly. You do not trust yourself to speak until noon. ${c.personal.spouseName ? c.personal.spouseName + ' does not say the thing she has every right to say, which is worse than saying it.' : ''}`, true);
        } else {
          aide.notes.push('Rode a night patrol and came back with the best sketch of the enemy lines anyone produced all war.');
          shiftResolve(c, +5);
          c.intel = Math.min(100, c.intel + 12);
          addLog(c, 'personal', `He comes back muddy, frozen, and eleven feet tall, with a sketch of the enemy picket lines better than anything the scouts have produced this war. You critique the sketch. He hears the pride under it. Both of you pretend otherwise.`, true);
        }
      },
      'p:aide:forbid': (c) => {
        const aide = currentAide(c)!;
        markFired(c, `p-aide-scouts-war${c.personal.career.warsFought}`);
        aide.notes.push('Forbidden the night patrol.');
        shiftResolve(c, -2);
        addLog(c, 'personal', `You forbid it. He copies the evening orders in a hand so perfectly controlled it is a form of insolence. The chief of scouts, who has sons of his own, finds a reason to be elsewhere.`);
      },
    },
  },
  {
    id: 'p-daughter-suitor',
    once: true,
    when: (c) => !!eligibleDaughter(c) && c.day >= 3,
    build: (c) => {
      const daughter = eligibleDaughter(c)!;
      const rng = makeRng(c.seed).fork(8800);
      const suitor = c.officers
        .filter((o) => !o.dead && !o.familyId)
        .sort((a, b) => b.traits.ambition - a.traits.ambition)[0];
      markFired(c, `p-suitor:${suitor.id}`);
      return {
        id: 'p-daughter-suitor',
        title: 'A Formal Call',
        text: `${suitor.title} ${shortNameOf(suitor.name)} requests a private word, arrives in his best coat, and asks — with a soldier's directness wrapped around a boy's terror — for your daughter ${daughter.name}'s hand. It is a good match on paper: his family, his record, his prospects if this war goes well. It would also bind one of your officers to you by blood. You know what his epithet says. You also know what you have SEEN.`,
        options: [
          { label: 'Give your blessing', detail: 'An officer becomes kin. Kin does not waver — usually.', apply: 'p:suitor:bless' },
          { label: 'After the war', detail: 'Neither yes nor no. He fights this whole campaign courting your opinion.', apply: 'p:suitor:defer' },
          { label: 'Refuse him', detail: 'Politely, finally, and he will remember it in his hands.', apply: 'p:suitor:refuse' },
        ],
      };
    },
    resolve: {
      'p:suitor:bless': (c) => {
        const daughter = eligibleDaughter(c)!;
        const suitorId = flagValue(c, 'p-suitor')!;
        const suitor = c.officers.find((o) => o.id === suitorId)!;
        daughter.role = 'wed-officer';
        daughter.weddedTo = suitor.id;
        daughter.notes.push(`Betrothed to ${suitor.title} ${shortNameOf(suitor.name)} in the middle of a war.`);
        suitor.kinById = daughter.id;
        suitor.traits.loyalty = Math.min(95, suitor.traits.loyalty + 15);
        suitor.traits.trust = Math.min(95, suitor.traits.trust + 12);
        suitor.background += ' He is your son-in-law now — or will be, the day the army goes home.';
        shiftResolve(c, +5);
        addLog(c, 'personal', `You give your blessing. The camp finds out by nightfall and the man's own formation cheers him at the morning muster, which he pretends to quell. An officer bound by blood reads your orders differently — the way a man reads letters from home.`, true);
      },
      'p:suitor:defer': (c) => {
        const suitorId = flagValue(c, 'p-suitor')!;
        const suitor = c.officers.find((o) => o.id === suitorId)!;
        suitor.traits.ambition = Math.min(95, suitor.traits.ambition + 8);
        suitor.confidence = Math.min(100, suitor.confidence + 5);
        addLog(c, 'personal', `"After the war," you say, which both of you understand to mean: show me. He salutes like a man who has just been handed a ladder. Expect him to reach for glory — he is courting you now on every field.`);
      },
      'p:suitor:refuse': (c) => {
        const suitorId = flagValue(c, 'p-suitor')!;
        const suitor = c.officers.find((o) => o.id === suitorId)!;
        suitor.traits.trust = Math.max(5, suitor.traits.trust - 10);
        suitor.traits.pride = Math.min(95, suitor.traits.pride + 8);
        addLog(c, 'personal', `You refuse — kindly, which does not help. He thanks you for your candor with a face like a shut door. It will not make him disloyal. It will make him exact.`);
      },
    },
  },
  // ------------------------------------------------ the romance arc
  {
    id: 'p-romance-meet',
    once: true,
    when: (c, rng) => !c.personal.romance && c.day >= 2 && (c.personal.situation === 'alone' || rng.chance(0.4)),
    build: (c, rng) => {
      const era = ERAS[c.era];
      const name = rng.pick(era.womenNames.filter((n) => n !== c.personal.spouseName));
      const village = rng.pick(era.villageNames);
      markFired(c, `p-romance-name:${name}`);
      markFired(c, `p-romance-village:${village}`);
      return {
        id: 'p-romance-meet',
        title: 'The Woman at the Well',
        text: `A requisition dispute at ${village}: your quartermaster claims the grain was bought, the village claims it was taken, and the woman arguing the village's case — ${name}, a widow who keeps the mill accounts — has your quartermaster's arithmetic in pieces in front of both armies' worth of onlookers. She is right, which is rare. She knows it, which is rarer. When you rule in the village's favor she looks at you the way people look at weather that surprises them.`,
        options: [
          { label: 'Pay the village fairly and ride on', detail: 'Justice, distance, discipline.', apply: 'p:meet:ride-on' },
          { label: 'Stay an hour. Talk to her', detail: 'The army can water the horses. You have not talked to anyone in weeks.', apply: 'p:meet:stay' },
        ],
      };
    },
    resolve: {
      'p:meet:ride-on': (c) => {
        c.disciplineTone = clamp(c.disciplineTone - 3);
        shiftResolve(c, +2);
        addLog(c, 'personal', 'You pay in silver, post an order against requisition abuses, and ride on. The village watches the column leave with something short of hatred, which in this war counts as friendship. You think about the mill accounts for a day and a half, which you decide means nothing.');
      },
      'p:meet:stay': (c, rng) => {
        const era = ERAS[c.era];
        const name = flagValue(c, 'p-romance-name') ?? rng.pick(era.womenNames);
        const village = flagValue(c, 'p-romance-village') ?? rng.pick(era.villageNames);
        c.personal.romance = {
          name,
          origin: `She took your quartermaster apart with arithmetic at ${village}, and you stayed an hour to lose an argument on purpose.`,
          home: village,
          stage: 0,
          affair: c.personal.situation !== 'alone',
          bond: 25 + rng.int(0, 15),
        };
        shiftResolve(c, +5);
        addLog(c, 'personal', `The hour becomes two. ${name} feeds you bread you suspect the village could not spare and corrects your geography of her valley. Riding out, you catch yourself composing what you should have said instead of what you said, which is a symptom you recognize from books you used to think were exaggerating.`, true);
      },
    },
  },
  {
    id: 'p-romance-grows',
    once: true,
    when: (c, rng) => !!c.personal.romance && c.personal.romance.stage === 0 && !c.personal.romance.lost && rng.chance(0.7),
    build: (c) => {
      const r = c.personal.romance!;
      return {
        id: 'p-romance-grows',
        title: r.affair ? 'A Door You Should Not Open' : 'She Comes to the Camp',
        text: `${r.name} arrives at the pickets with two mules of milled flour the army contracted for — she has appointed herself the village's factor, on the sound theory that no one cheats a supplier the general is known to like. The sentries send for you. The flour is a pretext and both of you know it, and neither of you says so.${r.affair ? ` You are a married man. The pickets have eyes, and your officers have wives who write letters.` : ''}`,
        options: [
          { label: 'Bring her under the army\'s protection', detail: r.affair ? 'Cross the line. Everything after this has a cost.' : 'Openly, honorably — the army will know, and that is the point.', apply: 'p:grows:bind' },
          { label: 'Pay for the flour and send her home with an escort', detail: 'End it while it is still a story about flour.', apply: 'p:grows:end' },
        ],
      };
    },
    resolve: {
      'p:grows:bind': (c, rng) => {
        const r = c.personal.romance!;
        r.stage = 2;
        r.bond = clamp(r.bond + 25);
        shiftResolve(c, +8);
        if (r.affair) {
          addLog(c, 'personal', `${r.name} stays with the train. You tell yourself it is a supply arrangement. The army, which has seen ten thousand supply arrangements, begins deciding how loudly to know about this one.`, true);
        } else {
          addLog(c, 'personal', `${r.name} stays, openly and with her accounts book, and within a week has caught two sutlers watering the wine. The men approve of her the way soldiers approve of anyone who fights the quartermasters on their behalf. You sleep better than you have all campaign.`, true);
        }
      },
      'p:grows:end': (c) => {
        const r = c.personal.romance!;
        r.stage = -1;
        shiftResolve(c, -4);
        addLog(c, 'personal', `You pay above the contract, mount an escort, and stand at the pickets while the mules diminish down the valley road. She does not look back, which you respect and which ruins your evening. The word for what you feel is one you decline to look up.`);
        c.personal.romance = undefined;
      },
    },
  },
  {
    id: 'p-village-burned',
    once: true,
    when: (c) =>
      !!c.personal.romance && c.personal.romance.stage >= 0 && !c.personal.romance.lost &&
      c.operation >= 2 && c.day >= 2,
    build: (c) => {
      const r = c.personal.romance!;
      const rng = makeRng(c.seed).fork(4400);
      const foes = c.enemyOfficers.filter((o) => !o.dead);
      const raider = rng.pick(foes);
      markFired(c, `p-raider:${raider.id}`);
      return {
        id: 'p-village-burned',
        title: `Smoke Over ${capitalize(r.home)}`,
        text: `The scouts report it before you smell it: enemy foragers under ${raider.name} swept the valley two days ago, and ${r.home} is burned — the mill too. ${r.stage === 2 ? `${r.name} is safe with the train, and has not spoken since the rider came in. Her mother kept that mill.` : `No word of ${r.name}. Refugees on the road say some of the village got into the woods. Some.`}`,
        options: [
          { label: 'Swear it, quietly, to yourself', detail: `${raider.name}. You will remember the name.`, apply: 'p:burned:vengeance' },
          { label: 'Grief is a luxury; war is arithmetic', detail: 'Note it in the ledger of the enemy\'s cruelties and keep your mind on the campaign.', apply: 'p:burned:stoic' },
        ],
      };
    },
    resolve: {
      'p:burned:vengeance': (c, rng) => {
        const r = c.personal.romance!;
        const raiderId = flagValue(c, 'p-raider')!;
        const raider = c.enemyOfficers.find((o) => o.id === raiderId)!;
        r.lost = r.stage !== 2;
        c.personal.vengeance = {
          enemyOfficerId: raider.id,
          enemyName: raider.name,
          note: `Burned ${r.home}${r.lost ? `, and ${r.name} has not been found` : `, ${r.name}'s home`}.`,
        };
        shiftResolve(c, r.lost ? -14 : -6);
        if (r.lost) c.personal.romance = undefined;
        addLog(c, 'personal', `You write the name in your campaign book, alone at the bottom of a page: ${raider.name}. You are aware this is not strategy. You write it anyway.`, true);
      },
      'p:burned:stoic': (c, rng) => {
        const r = c.personal.romance!;
        if (r.stage !== 2 && rng.chance(0.5)) {
          r.lost = true;
          shiftResolve(c, -10);
          addLog(c, 'personal', `You file it with the other burned villages. Weeks later you will learn ${r.name} got her people into the woods and out the far side of the valley, and by then she will be a hundred miles of war away from you, which is a distance no courier crosses.`);
          c.personal.romance = undefined;
        } else {
          shiftResolve(c, -5);
          addLog(c, 'personal', `You treat it as one more entry in the enemy's account, which is what it is. ${r.stage === 2 ? `${r.name} watches you decide not to feel it, and something in how she looks at you is revised.` : ''}`);
          if (r.stage === 2) r.bond = clamp(r.bond - 10);
        }
      },
    },
  },
  // ------------------------------------------------ the affair discovered
  {
    id: 'p-scandal',
    once: true,
    when: (c, rng) =>
      !!c.personal.romance && c.personal.romance.affair && c.personal.romance.stage === 2 &&
      !c.personal.scandal && rng.chance(0.5),
    build: (c) => ({
      id: 'p-scandal',
      title: 'The Camp Knows',
      text: `It arrives the way these things arrive: a joke that stops when you enter the tent, a chaplain who has begun praying pointedly for "the households of the mighty," and finally your oldest sergeant, who tells you straight because he has carried you off two fields and has the right. The army knows about ${c.personal.romance!.name}. Which means ${c.personal.spouseName} will know within the month.`,
      options: [
        { label: 'End it now, and write to your wife first', detail: 'The letter reaches her before the rumor. Barely.', apply: 'p:scandal:end' },
        { label: 'Brazen it out', detail: 'Commanders have done worse and been forgiven for winning.', apply: 'p:scandal:brazen' },
      ],
    }),
    resolve: {
      'p:scandal:end': (c) => {
        const r = c.personal.romance!;
        c.personal.scandal = true;
        c.personal.romance = undefined;
        c.personal.spouseBond = clamp(c.personal.spouseBond - 18);
        shiftResolve(c, -8);
        addLog(c, 'personal', `You end it in one conversation that is worse than any battle this campaign, and write the letter home the same night with the same hand. ${r.name} leaves with the northbound sutlers. The reply from ${c.personal.spouseName}, when it comes, is four lines long and perfectly courteous, and you would rather she had burned the house down.`, true);
      },
      'p:scandal:brazen': (c) => {
        c.personal.scandal = true;
        c.personal.spouseBond = clamp(c.personal.spouseBond - 30);
        c.rulerPatience = clamp(c.rulerPatience - 8);
        shiftResolve(c, -4);
        for (const o of c.officers) {
          if (!o.dead && o.traits.discipline > 60) o.traits.trust = clamp(o.traits.trust - 6);
        }
        addLog(c, 'personal', 'You brazen it. The camp adjusts, as camps do — but your stricter officers now hold their salutes a half-second short, and somewhere at court a rival has just been handed a gift. Winning will fix most of this. Only winning.', true);
      },
    },
  },
  // ------------------------------------------------ the unmarried court pressure
  {
    id: 'p-marry-letter',
    once: true,
    when: (c) => c.personal.situation === 'alone' && c.operation >= 2,
    build: (c) => {
      const era = ERAS[c.era];
      return {
        id: 'p-marry-letter',
        title: 'A Proposal, of Sorts',
        text: `A letter under the ruler's seal, in a secretary's hand, on the subject of your unmarried state. A name is mentioned — well-dowered, well-connected, of impeccable family — along with the observation that "a commander with heirs gives the crown fewer anxieties." It is phrased as concern for your happiness. It is not concern for your happiness.`,
        options: [
          { label: 'Agree to the match, after the war', detail: 'The crown sleeps easier; something in you goes quiet.', apply: 'p:marry:agree' },
          { label: 'Decline with elaborate gratitude', detail: 'Freedom has a price and you keep choosing to pay it.', apply: 'p:marry:decline' },
        ],
      };
    },
    resolve: {
      'p:marry:agree': (c) => {
        c.rulerPatience = clamp(c.rulerPatience + 10);
        shiftResolve(c, c.personal.romance ? -10 : -4);
        if (c.personal.romance) {
          addLog(c, 'personal', `You write your acceptance with ${c.personal.romance.name}'s accounts book sitting on the corner of your table. You are a man of rank; rank is a debt; this is how it is paid. You tell yourself she will understand it that way. You do not believe yourself.`, true);
          c.personal.romance.bond = clamp(c.personal.romance.bond - 20);
        } else {
          addLog(c, 'personal', 'You accept, contingent on surviving. The crown is pleased. The described lady is, by every account, admirable. You feel like a province that has been annexed politely.');
        }
      },
      'p:marry:decline': (c) => {
        c.rulerPatience = clamp(c.rulerPatience - 6);
        shiftResolve(c, +4);
        addLog(c, 'personal', 'You decline in prose so grateful it takes two readings to notice the refusal. The secretary will notice on the first. You add it to the list of things only victory can pay for.');
      },
    },
  },
];

// ---------------------------------------------------------------- driver

// Called from resolveMarchDay; fires the first eligible personal beat.
// The caller decides pacing against army events.
export function maybePersonalEvent(c: CampaignState, rng: Rng): boolean {
  if (c.pendingEvent || c.pendingEngagement) return false;
  for (const def of PERSONAL_EVENTS) {
    if (def.once && fired(c, def.id)) continue;
    if (def.id === 'p-spouse-counsel' && fired(c, `p-spouse-counsel-op${c.operation}`)) continue;
    if (!def.when(c, rng.fork(def.id.length * 7 + c.day))) continue;
    c.pendingEvent = def.build(c, rng.fork(999));
    if (def.once) markFired(c, def.id);
    if (def.id === 'p-spouse-counsel') markFired(c, `p-spouse-counsel-op${c.operation}`);
    return true;
  }
  return false;
}

export function applyPersonalChoice(c: CampaignState, apply: string): boolean {
  if (!apply.startsWith('p:')) return false;
  const rng = makeRng(c.seed).fork(5000 + c.day * 13 + apply.length);
  // spouse-counsel carries the officer id in the key
  if (apply.startsWith('p:counsel:accept:')) {
    const officerId = apply.slice('p:counsel:accept:'.length);
    const o = c.officers.find((x) => x.id === officerId);
    if (o) {
      const line = spouseObservation(o);
      if (!o.observations.includes(line)) o.observations.push(line);
      shiftResolve(c, +2);
      addLog(c, 'personal', `You add it to what you know of ${shortNameOf(o.name)}. Her readings have been wrong before — twice, in fourteen years. You remember both times because they were the times you argued.`);
    }
    c.pendingEvent = undefined;
    return true;
  }
  if (apply === 'p:counsel:decline') {
    addLog(c, 'personal', 'You kiss her and change the subject. She lets you, which is not the same as agreeing to it.');
    c.pendingEvent = undefined;
    return true;
  }
  for (const def of PERSONAL_EVENTS) {
    const fn = def.resolve[apply];
    if (fn) {
      fn(c, rng);
      c.pendingEvent = undefined;
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- battle hooks

// Reports at battle start about the state of the man.
export function personalBattleReports(c: CampaignState): Report[] {
  const out: { kind: Report['kind']; text: string; important?: boolean }[] = [];
  if (c.personal.situation === 'camp') {
    out.push({
      kind: 'personal',
      text: `${c.personal.spouseName} and the children are with the baggage behind your line. You placed the camp yourself. You check its position on the map twice anyway.`,
    });
  }
  if (c.personal.resolve < 38) {
    out.push({
      kind: 'personal',
      text: 'You slept three hours and dreamed of home. This morning your first two orders needed rewriting before they were fit to send. Steady. Steady.',
      important: true,
    });
  } else if (c.personal.resolve > 78) {
    out.push({ kind: 'personal', text: 'Your mind is clear today. The orders come out whole.' });
  }
  const v = c.personal.vengeance;
  if (v && !v.settled && c.enemyOfficers.some((o) => o.id === v.enemyOfficerId && !o.dead)) {
    out.push({
      kind: 'personal',
      text: `Somewhere across that field is ${v.enemyName}. ${v.note} You find your hands are perfectly steady. That worries you more than trembling would.`,
      important: true,
    });
  }
  return out.map((r, i) => ({ id: -1000 - i, tick: 0, kind: r.kind, text: r.text, important: r.important }));
}

// The enemy reached your camp — and your family is in it.
export function personalCampSacked(c: CampaignState): string | undefined {
  if (c.personal.situation !== 'camp') return undefined;
  shiftResolve(c, -18);
  return `Your family is in that camp. The thought arrives before discipline can stop it, and for one white moment the battle does not exist. Then it does again, and you are still the general, and the general's hands are needed.`;
}

// Vengeance settlement: called when an enemy officer dies in battle.
export function personalVengeanceCheck(c: CampaignState, deadEnemyOfficerId: string): string | undefined {
  const v = c.personal.vengeance;
  if (!v || v.settled || v.enemyOfficerId !== deadEnemyOfficerId) return undefined;
  v.settled = true;
  shiftResolve(c, +14);
  return `${v.enemyName} is dead. You wait to feel the thing you promised yourself you would feel. What comes instead is quieter and does not have a name, but your shoulders drop half an inch for the first time in weeks.`;
}

// ---------------------------------------------------------------- aftermath

export function personalAfterBattle(c: CampaignState, outcome: OutcomeKind, familyCampSacked: boolean): string[] {
  const notes: string[] = [];
  const p = c.personal;
  const won = outcome.includes('victory');
  shiftResolve(c, won ? +6 : outcome === 'disaster' ? -15 : -7);

  if (familyCampSacked && p.situation === 'camp') {
    if (outcome === 'disaster' || outcome === 'defeat') {
      p.familyCaptured = true;
      shiftResolve(c, -20);
      notes.push(`The enemy took the camp, and the camp held everything. ${p.spouseName} and the children are in enemy hands — prisoners of rank, too valuable to harm and too valuable to release cheaply. The ransom demand will arrive before your dispatch to the throne does.`);
    } else {
      p.spouseBond = clamp(p.spouseBond - 5);
      shiftResolve(c, -6);
      notes.push(`The enemy reached the camp before the line drove them off. ${p.spouseName} got the children into the wagon-fort with the veterans' wives and stood with a knife she knew how to hold. She tells you this the way she'd report weather. Neither of you sleeps.`);
    }
  }
  if (p.familyCaptured && !familyCampSacked) {
    // ransom resolution next battle
    if (won) {
      p.familyCaptured = false;
      shiftResolve(c, +16);
      notes.push(`Among the terms of the enemy's withdrawal: your family, returned without ransom — a courtesy from one commander to another, and a message that they fight the crown, not your children. ${p.spouseName} walks into your tent as if returning from a market day. You do not let go of her for a long time.`);
    } else {
      notes.push(`Your family remains in enemy hands. The war has a second ledger now, and every decision you make is written in both.`);
    }
  }
  const v = p.vengeance;
  if (v && !v.settled) {
    const target = c.enemyOfficers.find((o) => o.id === v.enemyOfficerId);
    if (target && !target.dead) {
      shiftResolve(c, -4);
      notes.push(`${v.enemyName} left the field alive. The page in your campaign book stays open.`);
    }
  } else if (v?.settled && !fired(c, 'p-vengeance-noted')) {
    markFired(c, 'p-vengeance-noted');
    notes.push(`The account with ${v.enemyName} is closed. You are not proud of how much lighter you are.`);
  }
  if (p.romance && p.romance.stage === 2 && !p.romance.lost) {
    p.romance.bond = clamp(p.romance.bond + (won ? 5 : 3));
    if (won) notes.push(`${p.romance.name} hears the outcome before you reach the camp — she always hears everything first — and meets you with the accounts book under her arm and no accounts to discuss.`);
  }
  return notes;
}

// The letter home, chosen from the after-action screen.
export function writeHome(c: CampaignState, style: 'honest' | 'heroic' | 'silent', outcome: OutcomeKind): string {
  const p = c.personal;
  p.wroteHome = style;
  const won = outcome.includes('victory');
  if (style === 'honest') {
    p.spouseBond = clamp(p.spouseBond + 8);
    shiftResolve(c, +5);
    return won
      ? `You write it plainly: what was won, what it cost, which of the men she knows by name will not come home. Her reply, weeks later, will be the only account of this battle that also asks how your knee is holding up.`
      : `You write it plainly: what went wrong, and your own share in it. It is the hardest dispatch of the week and the only one that leaves you lighter. She married the man who writes those letters. It is worth remembering why.`;
  }
  if (style === 'heroic') {
    p.spouseBond = clamp(p.spouseBond + 2);
    c.rulerPatience = clamp(c.rulerPatience + 3);
    shiftResolve(c, -3);
    return `You write the version with the trumpets in it — she will show it to the neighbors, and copies have a way of reaching court, which is half of why you wrote it that way. She will read between the lines anyway. She always does. But the neighbors won't.`;
  }
  p.spouseBond = clamp(p.spouseBond - 9);
  shiftResolve(c, -3);
  return `You do not write. There is no version of the letter you are willing to send, so you send nothing, which is also a letter, and she will read it correctly.`;
}

// ---------------------------------------------------------------- the interlude

// Years pass between wars. Children grow into the story. This is what
// makes families DYNAMIC: time does things to them, and to you.
export interface Interlude {
  years: number;
  beats: string[];
  aideCandidateId?: string;
}

export function interludeYears(c: CampaignState, won: boolean): Interlude {
  const p = c.personal;
  const era = ERAS[c.era];
  const rng = makeRng(c.seed).fork(9000 + p.career.warsFought * 31);
  const years = rng.int(2, 4);
  const beats: string[] = [];

  p.career.warsFought += 1;
  if (won) p.career.warsWon += 1;
  p.career.chronicle.push(
    `${ordinalWord(p.career.warsFought)} war: ${won ? 'won' : 'lost'}, against ${c.enemyName}.`,
  );
  p.career.age += years;
  beats.push(`${years} years pass. You are ${p.career.age} now. The scars ache before rain, and you have opinions about chairs.`);

  // everyone ages
  for (const f of p.family) {
    if (f.role !== 'fallen') f.age += years;
  }

  // the romance resolves: wars end these things or formalize them
  if (p.romance && p.romance.stage === 2 && !p.romance.lost) {
    if (!p.romance.affair && !p.spouseName) {
      p.spouseName = p.romance.name;
      p.spouseBond = Math.min(95, p.romance.bond + 25);
      beats.push(`You married ${p.romance.name} the winter after the war, in her rebuilt village, with two of your officers standing witness and the whole valley drunk for three days. She still keeps the accounts. Including yours.`);
      p.romance = undefined;
    } else if (p.romance.affair) {
      beats.push(`${p.romance.name} did not follow the army home. Some accounts close themselves quietly, out of kindness, and you let this one.`);
      p.romance = undefined;
      shiftResolve(c, -4);
    }
  } else if (p.romance) {
    p.romance = undefined;
  }

  // births
  if (p.spouseName && p.spouseBond > 45 && rng.chance(0.55)) {
    const sex: 'm' | 'f' = rng.chance(0.5) ? 'm' : 'f';
    const pool = sex === 'm' ? era.sonNames : era.daughterNames;
    const name = rng.pick(pool.filter((n) => !p.family.some((f) => f.name === n))) ?? rng.pick(pool);
    p.family.push({
      id: `fam-${p.family.length}-w${p.career.warsFought}`,
      name, sex, age: Math.max(1, years - 1), role: 'child', notes: [],
    });
    beats.push(`A ${sex === 'm' ? 'son' : 'daughter'}, ${name}, born while you were learning to be a civilian again. ${sex === 'm' ? 'He' : 'She'} has your mother's frown.`);
  }

  // daughters of age may marry into the capital between wars
  for (const f of p.family) {
    if (f.sex === 'f' && f.role === 'child' && f.age >= 17 && rng.chance(0.5)) {
      f.role = 'wed-court';
      f.weddedTo = 'a family of standing at court';
      f.notes.push('Married into the capital between the wars.');
      beats.push(`${f.name} married into a family of standing at court — a good match, her own choice, and incidentally a pair of ears at every dinner where your name comes up. Her letters are worth regiments.`);
      markFired(c, 'saga:court-daughter');
      break;
    }
  }

  // unresolved vengeance goes cold
  if (p.vengeance && !p.vengeance.settled) {
    beats.push(`The war ended around the name in your campaign book — ${p.vengeance.enemyName} went home alive. You copied the name into the new book. You are not proud of that, and you did it anyway.`);
    markFired(c, 'saga:vengeance-cold');
    p.vengeance = undefined;
  }

  // the wound that time gives everyone, sometimes
  if (p.family.length > 0 && rng.chance(0.12)) {
    const victim = rng.pick(p.family.filter((f) => f.role === 'child' && f.age < 12));
    if (victim) {
      victim.role = 'fallen';
      victim.notes.push('Taken by a winter fever between the wars.');
      beats.push(`The winter fever came through the district in the second year, and it took ${victim.name}. There is no version of this sentence that does the work. ${p.spouseName ? `${p.spouseName} planted a tree.` : ''} You drill the memory like a formation: daily, and it never gets easier to hold.`);
      shiftResolve(c, -10);
      if (p.spouseName) p.spouseBond = Math.max(0, p.spouseBond - 5);
    }
  }

  // who can serve next war
  const aide = p.family.find((f) => f.sex === 'm' && (f.role === 'child' || f.role === 'aide') && f.age >= 13 && f.age < 17);
  if (aide) {
    beats.push(`${aide.name} is ${aide.age} now, rides like a courier, and has been caught twice practicing your signature — for entirely honorable dispatch-copying reasons, he insists.`);
  }
  const cmdSon = p.family.find((f) => f.sex === 'm' && (f.role === 'child' || f.role === 'aide') && f.age >= 17);
  if (cmdSon) {
    beats.push(`${cmdSon.name} is ${cmdSon.age} — a man now, with a man's seat on a horse and a man's opinions at your table. When the next war comes, he will not accept being left behind. You have already had the argument in your head. You lost.`);
  }
  const sonOfficer = p.family.find((f) => f.role === 'junior-officer');
  if (sonOfficer) {
    beats.push(`${sonOfficer.name} kept his commission between the wars. The men call him by your old nickname, which nobody told him and he has not asked about.`);
  }

  // resolve mostly heals with time
  p.resolve = Math.min(100, Math.max(0, Math.round(p.resolve + (65 - p.resolve) * 0.7)));
  p.familyCaptured = false;
  p.scandal = false;
  p.aideId = p.family.find((f) => f.role === 'aide')?.id;

  return { years, beats, aideCandidateId: aide?.id };
}

export function takeAide(c: CampaignState, familyId: string): void {
  const f = c.personal.family.find((x) => x.id === familyId);
  if (!f) return;
  f.role = 'aide';
  c.personal.aideId = f.id;
  f.notes.push('Serves as his father\'s aide.');
}

// ---------------------------------------------------------------- next op

export function personalNextOperation(c: CampaignState): void {
  const p = c.personal;
  // time closes some distance toward steadiness
  p.resolve = clamp(p.resolve + Math.round((60 - p.resolve) * 0.35));
  p.wroteHome = undefined;
  if (p.situation === 'home' && p.spouseBond > 60) {
    shiftResolve(c, +4);
    addLog(c, 'personal', `A packet of letters catches up with the army — weeks of home in one bundle: the harvest, the children's feuds, a drawing that is either you on horseback or a fortress with legs. You read them out of order and then in order and then once more.`);
  }
  if (p.situation === 'camp' && p.spouseBond > 60) {
    addLog(c, 'personal', `${p.spouseName} has reorganized the baggage train's mess arrangements over the quartermaster's dead body, figuratively so far. Rations reach the rear companies hot now. The army has decided she outranks most of your officers, which is accurate.`);
  }
  if (p.romance && p.romance.stage === 2) {
    addLog(c, 'personal', `${p.romance.name} rides with the train ledger in hand. The sutlers have stopped stealing. Miracles take many forms.`);
  }
}

// ---------------------------------------------------------------- helpers

function pickMisjudgedOfficer(c: CampaignState, rng: Rng) {
  // the officer whose reputation diverges most from truth — she reads
  // the man, not the songs
  const alive = c.officers.filter((o) => !o.dead);
  const divergence = (o: (typeof alive)[0]) =>
    Math.abs(o.traits.courage - o.reputation.courage) +
    Math.abs(o.traits.competence - o.reputation.competence) +
    Math.abs(o.traits.loyalty - o.reputation.loyalty);
  return alive.sort((a, b) => divergence(b) - divergence(a))[0];
}

function spouseRead(o: { traits: { courage: number; competence: number; loyalty: number }; reputation: { courage: number; competence: number; loyalty: number } }): string {
  if (o.traits.courage < o.reputation.courage - 15) return 'His hands shake at supper when the scouts report. Not the wine. I watched.';
  if (o.traits.courage > o.reputation.courage + 15) return 'They call him timid. A timid man does not sit that still when the alarm horn blows. He is saving it for something.';
  if (o.traits.competence < o.reputation.competence - 15) return 'He retells his one clever battle with the details moved around. Men who have more than one story do not polish the first so hard.';
  if (o.traits.competence > o.reputation.competence + 15) return 'He corrects the map when he thinks no one is watching, and he is always right. The quiet ones who are always right are wasted where you have him.';
  if (o.traits.loyalty < o.reputation.loyalty - 15) return 'He praises you a half-beat late, every time. Loyal men are not so punctual about it in either direction.';
  return 'He is exactly what he appears to be, which in this camp makes him the strangest man you employ.';
}

function spouseObservation(o: { name: string; traits: { courage: number; competence: number; loyalty: number }; reputation: { courage: number; competence: number; loyalty: number } }): string {
  if (o.traits.courage < o.reputation.courage - 15) return 'She saw it before you did: his nerve is not what the songs say.';
  if (o.traits.courage > o.reputation.courage + 15) return 'Her reading at supper: there is more iron in him than his reputation admits.';
  if (o.traits.competence < o.reputation.competence - 15) return 'Her reading at supper: the famous story is the only one he has.';
  if (o.traits.competence > o.reputation.competence + 15) return 'Her reading at supper: he is far abler than the army believes.';
  if (o.traits.loyalty < o.reputation.loyalty - 15) return 'Her reading at supper: his loyalty is a garment, not a skin.';
  return 'Her reading at supper: he is exactly what he seems.';
}

function shortNameOf(full: string): string {
  const stripped = full.replace(/^(Sir|Lord)\s+/, '');
  const parts = stripped.split(' ');
  if (parts.includes('of') || parts.includes('de') || parts.includes('the')) return parts[0];
  return parts[parts.length - 1];
}

function flagValue(c: CampaignState, prefix: string): string | undefined {
  const f = c.personal.arcFlags.find((x) => x.startsWith(prefix + ':'));
  return f?.slice(prefix.length + 1);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ordinalWord(n: number): string {
  return ['Zeroth', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'][n] ?? `${n}th`;
}
