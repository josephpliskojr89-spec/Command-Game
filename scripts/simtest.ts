// Headless smoke test: runs a full campaign + battle without the UI.
// Usage: npm run sim [seed]
// Verifies the command loop produces a finished battle with believable
// drama: orders interpreted, messengers lost, morale swings, an outcome.

import { newCampaign, resolveMarchDay, resolveEventChoice, resolveCampChoice, finalScout, holdCouncil } from '../src/sim/campaign.ts';
import { setupBattle, battleTick, issuePlayerOrder, visibleReports, lossFraction } from '../src/sim/battle.ts';
import { buildAfterAction } from '../src/sim/aar.ts';
import { FORMATIONS } from '../src/sim/era.ts';

const seed = Number(process.argv[2] ?? 12345);
const campaign = newCampaign('medieval', seed);

// march to contact
let guard = 0;
while (campaign.distance > 0 && guard++ < 20) {
  resolveMarchDay(campaign, { pace: 'steady', supply: 'ration', scouts: 'wide' });
  if (campaign.pendingEvent) {
    resolveEventChoice(campaign, campaign.pendingEvent.options[0].apply);
  }
}
console.log(`— marched ${campaign.day - 1} days; morale ${campaign.morale}, fatigue ${campaign.fatigue}, intel ${campaign.intel}`);

resolveCampChoice(campaign, 'hill', true);
finalScout(campaign);
holdCouncil(campaign);

// deploy with default specialty-matched assignments
const officers = campaign.officers.slice();
const assignments: Record<string, string> = {};
for (const f of FORMATIONS) {
  const idx = officers.findIndex((o) => o.specialty === f.cls);
  assignments[f.id] = (idx >= 0 ? officers.splice(idx, 1)[0] : officers.shift()!).id;
}
const battle = setupBattle(campaign, assignments, 'hq');

// a simple player plan: line advances, cavalry charges the flank at minute 15
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
    issuePlayerOrder(battle, campaign, 'f-cavalry', 'charge', { x: 900, y: 250 }, undefined, 'urgent');
    ordersSent += 1;
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
console.log('\nRuler: ' + aar.rulerJudgment);

if (!battle.outcome) {
  console.error('FAIL: battle never resolved');
  process.exit(1);
}
console.log('\nOK');
