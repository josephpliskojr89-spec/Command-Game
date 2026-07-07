// Headless smoke test: runs a full campaign + battle without the UI.
// Usage: npm run sim [seed]
// Verifies the command loop produces a finished battle with believable
// drama: orders interpreted, messengers lost, morale swings, an outcome.

import {
  newCampaign, resolveMarchDay, resolveEventChoice, resolveCampChoice,
  finalScout, buildCouncilProposals, endorseProposal, resolveEngagement,
  maybeChallenge, resolveChallenge, nextOperation, applyOutcomeToWar,
} from '../src/sim/campaign.ts';
import { setupBattle, battleTick, issuePlayerOrder, visibleReports, lossFraction, soundSignal, applyDeploymentPolitics } from '../src/sim/battle.ts';
import { buildAfterAction } from '../src/sim/aar.ts';
import { initPersonal, writeHome } from '../src/sim/personal.ts';
import { FORMATIONS } from '../src/sim/era.ts';

const seed = Number(process.argv[2] ?? 12345);
const campaign = newCampaign('medieval', seed);
const household = (['home', 'camp', 'alone'] as const)[seed % 3];
initPersonal(campaign, household);
console.log(`— household: ${household}, resolve ${campaign.personal.resolve}`);

// march to contact
let guard = 0;
while (campaign.distance > 0 && guard++ < 20) {
  resolveMarchDay(campaign, { pace: 'steady', supply: 'ration', scouts: 'wide' });
  if (campaign.pendingEngagement) {
    const officer = campaign.officers.find((o) => !o.dead && !o.wounded)!;
    console.log(`— engagement: ${campaign.pendingEngagement.title}, sending ${officer.name}`);
    resolveEngagement(campaign, officer.id, 'storm');
  }
  if (campaign.pendingEvent) {
    const ev = campaign.pendingEvent;
    if (ev.id.startsWith('p-')) console.log(`— personal event: ${ev.title}`);
    resolveEventChoice(campaign, ev.options[ev.id.startsWith('p-') ? ev.options.length - 1 : 0].apply);
  }
}
console.log(`— marched ${campaign.day - 1} days; morale ${campaign.morale}, fatigue ${campaign.fatigue}, intel ${campaign.intel}, resolve ${campaign.personal.resolve}`);
const grudged = campaign.officers.filter((o) => o.grudges.length);
console.log(`— grudges after march: ${grudged.map((o) => `${o.name}: ${o.grudges.map((g) => g.kind + ' vs ' + g.enemyName).join('; ')}`).join(' | ') || 'none'}`);

resolveCampChoice(campaign, 'hill', true);
maybeChallenge(campaign);
if (campaign.pendingChallenge) {
  console.log('— challenge issued; answering with the boldest officer');
  const champ = campaign.officers.filter((o) => !o.dead && !o.wounded)[1];
  resolveChallenge(campaign, champ?.id ?? 'refuse');
}
finalScout(campaign);
buildCouncilProposals(campaign);
endorseProposal(campaign, campaign.councilProposals![0].officerId);
console.log(`— council endorsed ${campaign.councilProposals![0].officerId}; cav hint: ${campaign.cavHint} (truth: ${campaign.enemyCavSide})`);

// deploy with default specialty-matched assignments
const officers = campaign.officers.slice();
const assignments: Record<string, string> = {};
for (const f of FORMATIONS) {
  const idx = officers.findIndex((o) => o.specialty === f.cls);
  assignments[f.id] = (idx >= 0 ? officers.splice(idx, 1)[0] : officers.shift()!).id;
}
const battle = setupBattle(campaign, assignments, 'hq');
applyDeploymentPolitics(battle, campaign);

// a simple player plan: line advances, cavalry waits on the horn
let ordersSent = 0;
for (let t = 0; t < 1500 && !battle.outcome; t++) {
  battleTick(battle, campaign);
  if (battle.tick === 30) {
    issuePlayerOrder(battle, campaign, 'f-left', 'advance', { x: 350, y: 350 }, undefined, 'measured');
    issuePlayerOrder(battle, campaign, 'f-right', 'advance', { x: 850, y: 350 }, undefined, 'measured');
    issuePlayerOrder(battle, campaign, 'f-center', 'advance', { x: 600, y: 350 }, undefined, 'measured');
    issuePlayerOrder(battle, campaign, 'f-ranged', 'harass', undefined, undefined, 'measured');
    ordersSent += 4;
  }
  if (battle.tick === 45) {
    issuePlayerOrder(battle, campaign, 'f-cavalry', 'attack-on-signal', { x: 900, y: 250 }, undefined, 'measured');
    ordersSent += 1;
  }
  if (battle.tick === 180) {
    soundSignal(battle, campaign);
  }
  if (battle.tick === 200) {
    issuePlayerOrder(battle, campaign, 'f-reserve', 'support', undefined, 'f-center', 'measured');
    ordersSent += 1;
  }
}

console.log(`— battle ended tick ${battle.tick}: ${battle.outcome ?? 'NO OUTCOME (bug?)'}`);
console.log(`— friendly losses ${(lossFraction(battle, 'friend') * 100).toFixed(0)}%, enemy losses ${(lossFraction(battle, 'enemy') * 100).toFixed(0)}%`);
console.log(`— reports generated: ${battle.reports.length}, events: ${battle.events.length}, orders sent: ${ordersSent}`);

const interp = battle.events.filter((e) => e.kind === 'interpretation' || e.kind === 'autonomy');
console.log(`— officer deviations/interpretations recorded: ${interp.length}`);
for (const e of interp.slice(0, 5)) console.log(`   · ${e.text}`);

console.log('\n=== sample reports ===');
for (const r of visibleReports(battle).slice(0, 12).reverse()) {
  console.log(`  [${Math.floor(r.tick / 3)}′] ${r.text}`);
}

const aar = buildAfterAction(battle, campaign);
console.log(`\n=== AAR: ${aar.outcomeTitle} ===`);
for (const p of aar.chronicle) console.log(p + '\n');
for (const v of aar.officerVerdicts) console.log(`  [${v.grade}] ${v.verdict}`);
if (aar.grudgeNotes.length) console.log('\nGrudges: ' + aar.grudgeNotes.join(' / '));
if (aar.casualtyNotes.length) console.log('Officer casualties: ' + aar.casualtyNotes.join(' / '));
if (aar.personalNotes.length) console.log('Personal: ' + aar.personalNotes.join(' / '));
if (aar.canWriteHome) console.log('Letter home: ' + writeHome(campaign, 'honest', aar.outcome));
console.log(`Resolve after battle: ${campaign.personal.resolve}`);
console.log('\nRuler: ' + aar.rulerJudgment);
console.log(`Patience: ${campaign.rulerPatience}, war over: ${campaign.warOver ?? 'no'}, can march on: ${aar.canMarchOn}`);

if (!battle.outcome) {
  console.error('FAIL: battle never resolved');
  process.exit(1);
}

// --- second operation: prove persistence works ---------------------------
if (aar.canMarchOn) {
  const survivors: Record<string, number> = {};
  for (const u of battle.units) {
    if (u.side === 'friend') survivors[u.id] = u.routed ? Math.round(u.menStart * 0.35) : u.men;
  }
  nextOperation(campaign, survivors);
  console.log(`\n=== OPERATION ${campaign.operation}: ${campaign.objectiveText} ===`);
  let g2 = 0;
  while (campaign.distance > 0 && g2++ < 20) {
    resolveMarchDay(campaign, { pace: 'steady', supply: 'forage', scouts: 'wide' });
    if (campaign.pendingEngagement) {
      const officer = campaign.officers.find((o) => !o.dead && !o.wounded)!;
      resolveEngagement(campaign, officer.id, 'maneuver');
    }
    if (campaign.pendingEvent) resolveEventChoice(campaign, campaign.pendingEvent.options[0].apply);
  }
  resolveCampChoice(campaign, 'road', false);
  const battle2 = setupBattle(campaign, assignments, 'f-cavalry');
  applyDeploymentPolitics(battle2, campaign);
  for (let t = 0; t < 1500 && !battle2.outcome; t++) {
    battleTick(battle2, campaign);
    if (battle2.tick === 40) {
      issuePlayerOrder(battle2, campaign, 'f-center', 'advance', { x: 600, y: 320 }, undefined, 'measured');
      issuePlayerOrder(battle2, campaign, 'f-cavalry', 'charge', { x: 800, y: 250 }, undefined, 'urgent');
    }
  }
  console.log(`— op ${campaign.operation} battle ended tick ${battle2.tick}: ${battle2.outcome}`);
  console.log(`— carried strengths: ${JSON.stringify(campaign.unitStrength)}`);
  const grudgeReports = battle2.reports.filter((r) => r.text.includes('banner across the field') || r.text.includes('sighted'));
  console.log(`— grudge sightings in op 2: ${grudgeReports.length}`);
  const aar2 = buildAfterAction(battle2, campaign);
  console.log(`— op 2 AAR: ${aar2.outcomeTitle}; patience ${campaign.rulerPatience}; war over: ${campaign.warOver ?? 'no'}`);
  if (!battle2.outcome) { console.error('FAIL: op2 battle never resolved'); process.exit(1); }
}
console.log('\nOK');
