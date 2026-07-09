// The after-action report: the battle retold as a chronicle, the officers
// judged, and the ruler's verdict delivered. The player should finish
// reading it knowing exactly which human beings won or lost them the day.

import { makeRng } from './rng.ts';
import { ERAS, armyMuster } from './era.ts';
import { shortName } from './officer.ts';
import { lossFraction } from './battle.ts';
import { applyOutcomeToWar } from './campaign.ts';
import { personalAfterBattle } from './personal.ts';
import type {
  AfterAction, BattleState, CampaignState, Officer, OfficerVerdict, OutcomeKind,
} from './types.ts';

const OUTCOME_TITLES: Record<OutcomeKind, string> = {
  'decisive-victory': 'Decisive Victory',
  'costly-victory': 'Costly Victory',
  'narrow-victory': 'The Enemy Driven Off',
  'pyrrhic-victory': 'Pyrrhic Victory',
  'orderly-withdrawal': 'Orderly Withdrawal',
  'chaotic-retreat': 'Chaotic Retreat',
  defeat: 'Defeat',
  disaster: 'Disaster',
};

export function buildAfterAction(bs: BattleState, c: CampaignState): AfterAction {
  const rng = makeRng(c.seed).fork(7777);
  const era = ERAS[c.era];
  const outcome = bs.outcome ?? 'defeat';

  const fUnits = bs.units.filter((u) => u.side === 'friend');
  const eUnits = bs.units.filter((u) => u.side === 'enemy');
  const fStart = fUnits.reduce((s, u) => s + u.menStart, 0);
  const eStart = eUnits.reduce((s, u) => s + u.menStart, 0);
  const fLost = Math.round(fStart * lossFraction(bs, 'friend'));
  const eLost = Math.round(eStart * lossFraction(bs, 'enemy'));

  // ---- key moments: the memorable events, in order --------------------
  const interesting = bs.events.filter((e) =>
    ['clash', 'rout', 'rally', 'destroyed', 'interpretation', 'autonomy', 'withdrawal',
     'messenger-lost', 'officer-killed', 'officer-wounded', 'enemy-officer-killed',
     'looting', 'camp-threatened', 'signal', 'signal-missed', 'grudge-sighted'].includes(e.kind),
  );
  const keyMoments = interesting.slice(0, 16).map((e) => `[${formatTick(e.tick)}] ${e.text}`);

  // ---- officer verdicts ------------------------------------------------
  const officerVerdicts: OfficerVerdict[] = [];
  for (const u of fUnits) {
    const o = c.officers.find((x) => x.id === u.officerId);
    if (!o) continue;
    officerVerdicts.push(judgeOfficer(o, u.playerLed === true, u.routed || u.status === 'routing', bs, rng.next()));
  }

  // ---- chronicle -------------------------------------------------------
  const chronicle: string[] = [];
  chronicle.push(
    `On the ${ordinal(c.day)} day of the campaign, the army of ${era.rulerName} met ${c.enemyName} at ${c.placeName}. ` +
    `${fStart.toLocaleString()} men stood in your line against an enemy of ${eStart.toLocaleString()}. ` +
    weatherLine(bs.weather) +
    (bs.playerUnitId
      ? ` You took personal command of the ${fUnits.find((u) => u.id === bs.playerUnitId)?.name ?? 'line'}, and the rest of the field had to manage on the judgment of its officers.`
      : ` You commanded from headquarters, reading the battle through riders and dust.`),
  );

  const interpEvents = bs.events.filter((e) => e.kind === 'interpretation' || e.kind === 'autonomy');
  if (interpEvents.length) {
    chronicle.push(
      `Your orders did not always arrive as sent, and did not always survive contact with the men who received them. ` +
      interpEvents.slice(0, 3).map((e) => e.text).join(' ') +
      (interpEvents.length > 3 ? ` There were ${interpEvents.length - 3} other such moments.` : ''),
    );
  }

  const routs = bs.events.filter((e) => e.kind === 'rout');
  const rallies = bs.events.filter((e) => e.kind === 'rally');
  if (routs.length || rallies.length) {
    let s = '';
    if (routs.length) s += `${routs.length === 1 ? 'One formation' : `${routs.length} formations`} broke during the fighting. `;
    if (rallies.length) s += rallies.map((e) => e.text).join(' ');
    chronicle.push(s.trim());
  }

  chronicle.push(closingParagraph(outcome, c, fLost, eLost));

  // ---- grudges: scores settled and scores opened -----------------------
  const grudgeNotes: string[] = [];
  for (const e of bs.events) {
    if (e.kind === 'grudge-formed' || e.kind === 'grudge-sighted') grudgeNotes.push(e.text);
  }
  for (const o of c.officers) {
    for (const g of o.grudges) {
      const foe = c.enemyOfficers.find((x) => x.id === g.enemyOfficerId);
      if (foe?.dead && g.kind === 'triumph') {
        grudgeNotes.push(`${o.title} ${shortName(o.name)}'s account with ${g.enemyName} is closed — permanently.`);
      }
    }
  }

  // ---- officers wounded or killed ---------------------------------------
  const casualtyNotes: string[] = [];
  for (const e of bs.events) {
    if (e.kind === 'officer-killed' || e.kind === 'officer-wounded' || e.kind === 'enemy-officer-killed') {
      casualtyNotes.push(e.text);
    }
  }

  // ---- the man inside the general ----------------------------------------
  const personalNotes = personalAfterBattle(c, outcome, bs.campSacked === true);

  // ---- the enemy's war effort bleeds -------------------------------------
  // The fielded army came out of a finite pool. The dead never return;
  // of the scattered, only some find their way back to the standards —
  // fewer still after a decisive rout, when your pursuit owns the roads.
  const eSurvivors = eUnits.reduce((s, u) => s + (u.routed ? 0 : u.men), 0);
  const eScattered = eStart - eSurvivors;
  const returnRate = outcome === 'decisive-victory' ? 0.1 : 0.25;
  c.enemyWarStrength = Math.max(
    0,
    c.enemyWarStrength - eStart + eSurvivors + Math.round(eScattered * returnRate),
  );

  // ---- the record of the war ---------------------------------------------
  c.warRecord.push({
    operation: c.operation,
    day: c.day,
    place: c.placeName,
    outcome,
    outcomeTitle: OUTCOME_TITLES[outcome],
    friendlyLosses: fLost,
    enemyLosses: eLost,
  });

  // ---- the war beyond this field ----------------------------------------
  applyOutcomeToWar(c, outcome);
  // Annihilation is its own verdict: if they cannot field another army,
  // there is no war left to continue, whatever the political score says.
  // (Yardstick: your own full muster — an enemy who cannot raise half of
  // it will not offer battle again.)
  const won = outcome.includes('victory');
  let annihilated = false;
  if (!c.warOver && won && c.enemyWarStrength < armyMuster(ERAS[c.era]) * 0.55) {
    c.warOver = 'triumph';
    annihilated = true;
  }
  const { judgment, strategic } = rulerVerdict(outcome, c, fLost, fStart);
  let warEndText: string | undefined;
  if (c.warOver === 'triumph') {
    warEndText = annihilated
      ? `There is no enemy army anymore. Not a beaten one — none. What you did not kill or capture on this field is walking home in ones and twos, and no muster, however desperate, will make soldiers of them again this generation. The war is over because you have removed the other side of it. The terms will be whatever your ruler feels like writing.`
      : `The war is won. ${capitalize(c.enemyName)} can no longer keep an army in the field, and the terms will be written in your ruler's tent — with you standing at the right hand. The chroniclers will argue about your battles for a century. Your officers will argue about them tonight, which matters more to you than you expected.`;
  } else if (c.warOver === 'dismissed') {
    warEndText = `A courier arrives within the week. Your command is ended — the phrasing is gracious, the meaning is not. Another man will finish this war with your army and your officers, and whatever they accomplish will be measured against what you lost. You are advised to travel. You take the advice.`;
  }

  return {
    outcome,
    outcomeTitle: OUTCOME_TITLES[outcome],
    chronicle,
    keyMoments,
    officerVerdicts,
    friendlyLosses: fLost,
    friendlyStart: fStart,
    enemyLosses: eLost,
    enemyStart: eStart,
    rulerJudgment: judgment,
    strategicResult: strategic,
    grudgeNotes: grudgeNotes.slice(0, 8),
    casualtyNotes,
    canMarchOn: !c.warOver,
    warEnd: c.warOver,
    warEndText,
    personalNotes,
    canWriteHome: c.personal.situation === 'home' && !c.warOver,
  };
}

function judgeOfficer(o: Officer, playerLed: boolean, broke: boolean, bs: BattleState, roll: number): OfficerVerdict {
  const p = o.perf;
  const who = `${o.title} ${shortName(o.name)}`;
  let grade: OfficerVerdict['grade'];
  let verdict: string;

  const refused = bs.events.some((e) => e.officerId === o.id && e.text.includes('refused'));

  if (o.dead) {
    grade = p.blunders > 1 ? 'questionable' : 'distinguished';
    verdict = `${who} fell at the head of his men. ${p.blunders > 1 ? 'Death has settled the questions his conduct raised; the chronicle will be kinder than the facts.' : 'Whatever else is said of this day, that will be said first.'}`;
    return { officerId: o.id, name: o.name, title: o.title, verdict, grade };
  }

  if (playerLed) {
    grade = 'creditable';
    verdict = `${who} served directly under your eye and did what he was told — whatever his private opinions.`;
  } else if (refused) {
    grade = 'disgraced';
    verdict = `${who} refused a direct order in the face of the enemy. Whether he was right is now a political question, which is worse than a military one.`;
  } else if (p.heroics > 0 && p.blunders === 0) {
    grade = 'distinguished';
    verdict = `${who} showed judgment beyond his orders${o.deeds.length ? ` — ${lowerFirst(o.deeds[o.deeds.length - 1])}` : ''} The men will tell stories about it.`;
  } else if (broke && p.heroics === 0) {
    grade = p.blunders > 1 ? 'disgraced' : 'questionable';
    verdict = `${who}'s formation broke under him. ${p.deviations > p.faithful ? 'His handling of orders beforehand did not help his case.' : 'No one yet agrees on whether any officer could have held them.'}`;
  } else if (p.blunders > 0) {
    grade = 'questionable';
    verdict = `${who} acted on his own judgment at least once, and the results did not flatter him.`;
  } else if (p.deviations > p.faithful) {
    grade = 'questionable';
    verdict = `${who} received ${p.ordersReceived} order${p.ordersReceived === 1 ? '' : 's'} and bent most of them into something else. You are still deciding whether that was temperament or incompetence.`;
  } else if (p.ordersReceived === 0) {
    grade = 'creditable';
    verdict = `${who} held his post all day without a single order reaching him — make of that what you will.`;
  } else {
    grade = roll > 0.5 ? 'creditable' : 'creditable';
    verdict = `${who} executed his orders faithfully. Not brilliantly — faithfully. There are worse epitaphs for a subordinate.`;
  }
  return { officerId: o.id, name: o.name, title: o.title, verdict, grade };
}

function closingParagraph(outcome: OutcomeKind, c: CampaignState, fLost: number, eLost: number): string {
  switch (outcome) {
    case 'decisive-victory':
      return `By day's end the enemy army had ceased to exist as a fighting force. Your losses — some ${fLost.toLocaleString()} men — were light against ${eLost.toLocaleString()} of theirs. The road stands open, and the men are calling the field by your name.`;
    case 'costly-victory':
      return `The field is yours, and so are its dead. ${fLost.toLocaleString()} of your men will not march home, against some ${eLost.toLocaleString()} of the enemy. Victory — the kind that must not be repeated too often.`;
    case 'narrow-victory':
      return `The enemy quit the field in reasonable order, leaving you the ground and the argument over what it proved. ${eLost.toLocaleString()} of them fell; ${fLost.toLocaleString()} of yours. They will fight again. So will you.`;
    case 'pyrrhic-victory':
      return `You hold the field, technically. ${fLost.toLocaleString()} of your men bought it. Another such victory and you will be writing to ${c.rulerName} for a new army.`;
    case 'orderly-withdrawal':
      return `The army broke contact and came away intact — bloodied by ${fLost.toLocaleString()} men, but an army still. The mission is unfulfilled; the instrument survives. History is kinder to that choice than rulers are.`;
    case 'chaotic-retreat':
      return `The withdrawal became a scramble. ${fLost.toLocaleString()} men were lost, many of them in the running. The army that reassembles will remember this — and so will everyone else.`;
    case 'defeat':
      return `The line broke, and the day went with it. ${fLost.toLocaleString()} men lost against perhaps ${eLost.toLocaleString()} of the enemy. Defeated armies write the longest reports; you now know why.`;
    case 'disaster':
      return `It was not a battle by the end; it was a harvest. ${fLost.toLocaleString()} men killed, captured, or scattered. The survivors are still coming in by ones and twos, without shields, without officers, without excuses that will matter.`;
  }
}

function rulerVerdict(outcome: OutcomeKind, c: CampaignState, fLost: number, fStart: number): { judgment: string; strategic: string } {
  const era = ERAS[c.era];
  const ruler = era.rulerTitle;
  switch (outcome) {
    case 'decisive-victory':
      return {
        judgment: `Word of the victory travels faster than your dispatch. ${capitalize(ruler)} is delighted — publicly, lavishly, and with the faint unease that powerful men reserve for successful generals.`,
        strategic: `Objective achieved: ${lowerFirst(c.objectiveText)} The enemy cannot field another army this season.`,
      };
    case 'costly-victory':
      return {
        judgment: `${capitalize(ruler)} proclaims a victory and quietly asks for the casualty rolls twice, as if hoping they will improve. Your position is secure. Your next request for reinforcements will be scrutinized.`,
        strategic: `Objective achieved: ${lowerFirst(c.objectiveText)} The army will need the rest of the season to recover.`,
      };
    case 'narrow-victory':
      return {
        judgment: `${capitalize(ruler)} accepts the result as a victory because the alternative is admitting it wasn't. You are thanked. The thanks have a shelf life.`,
        strategic: `The enemy is driven off but not destroyed. The objective is half-achieved, which your enemies at court will round down.`,
      };
    case 'pyrrhic-victory':
      return {
        judgment: `${capitalize(ruler)} reads the butcher's bill before the dispatch. The word 'victory' is used in the official announcement and nowhere else.`,
        strategic: `The field was won and the army nearly spent. Whether the objective survives contact with next season is an open question.`,
      };
    case 'orderly-withdrawal':
      return {
        judgment: `${capitalize(ruler)} observes, coldly, that armies are for using. You saved the army; you did not save the mission. You will spend the winter explaining the difference.`,
        strategic: `Mission failed, army preserved. The enemy holds ${c.placeName}, and the war is now longer than it was.`,
      };
    case 'chaotic-retreat':
      return {
        judgment: `The first reports to reach ${ruler} come from survivors, and survivors embroider. By the time your dispatch arrives, the story has already been decided, and it is not your version.`,
        strategic: `Mission failed. The army survives on paper; its confidence did not. The enemy will move freely for a season.`,
      };
    case 'defeat':
      return {
        judgment: `${capitalize(ruler)} demands an accounting. Old allies of yours have gone quiet; old rivals have become suddenly, warmly available. Every general loses a battle eventually — the political question is whether you are allowed a second one.`,
        strategic: `Mission failed. ${capitalize(c.enemyName)} holds the field and the initiative.`,
      };
    case 'disaster':
      return {
        judgment: `There is no softening this. ${capitalize(ruler)} has lost an army, and someone must be seen to answer for it. The chroniclers are already choosing their adjectives. Your name will carry this field the way a man carries a scar.`,
        strategic: `The army is destroyed. The road to everything it defended is open. What happens next is out of your hands — most things now are.`,
      };
  }
}

function weatherLine(w: string): string {
  switch (w) {
    case 'rain': return 'Rain fell through the day, slowing every wheel and bowstring.';
    case 'fog': return 'Fog covered the field at first light, and much of what followed was fought half-seen.';
    case 'heat': return 'The day was hot, and thirst fought on both sides.';
    default: return 'The day was clear, and every banner could be read at a mile.';
  }
}

function formatTick(t: number): string {
  const mins = Math.floor(t / 3);
  return `${mins}′`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
