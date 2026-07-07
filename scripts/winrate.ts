// Winnability harness: a sensible-but-ordinary player bot plays full wars
// across many seeds. Usage: npx tsx scripts/winrate.ts [numSeeds]
// The bot is deliberately NOT exploitative: it contests the field, adapts
// its plan to the operation type, and keeps ordering — like a decent
// first-week player would.

import {
  newCampaign, resolveMarchDay, resolveEventChoice, resolveCampChoice,
  finalScout, buildCouncilProposals, endorseProposal, resolveEngagement,
  maybeChallenge, resolveChallenge, nextOperation,
} from '../src/sim/campaign.ts';
import {
  setupBattle, battleTick, issuePlayerOrder, applyDeploymentPolitics, unit,
} from '../src/sim/battle.ts';
import { buildAfterAction } from '../src/sim/aar.ts';
import { initPersonal } from '../src/sim/personal.ts';
import { FORMATIONS } from '../src/sim/era.ts';
import type { CampaignState, OutcomeKind } from '../src/sim/types.ts';

const N = Number(process.argv[2] ?? 30);

function playBattle(c: CampaignState): OutcomeKind {
  const officers = c.officers.filter((o) => !o.dead).slice();
  const assignments: Record<string, string> = {};
  for (const f of FORMATIONS) {
    const idx = officers.findIndex((o) => o.specialty === f.cls);
    assignments[f.id] = (idx >= 0 ? officers.splice(idx, 1)[0] : officers.shift()!).id;
  }
  const bs = setupBattle(c, assignments, 'hq');
  applyDeploymentPolitics(bs, c);

  const attackY = c.opKind === 'their-ground' ? 260 : 380; // contest the field either way
  for (let t = 0; t < 1500 && !bs.outcome; t++) {
    battleTick(bs, c);
    // opening plan
    if (bs.tick === 25) {
      issuePlayerOrder(bs, c, 'f-left', 'advance', { x: 340, y: attackY }, undefined, 'measured');
      issuePlayerOrder(bs, c, 'f-center', 'advance', { x: 600, y: attackY }, undefined, 'measured');
      issuePlayerOrder(bs, c, 'f-right', 'advance', { x: 860, y: attackY }, undefined, 'measured');
      issuePlayerOrder(bs, c, 'f-ranged', 'harass', undefined, undefined, 'measured');
    }
    if (bs.tick === 60) {
      // cavalry works the flank opposite the reported enemy horse
      const cavX = (c.cavHint ?? c.enemyCavSide) === 'left' ? 980 : 220;
      issuePlayerOrder(bs, c, 'f-cavalry', 'advance', { x: cavX, y: attackY - 60 }, undefined, 'measured');
    }
    // keep the pressure on: every 120 ticks, re-order idle formations
    if (bs.tick > 100 && bs.tick % 120 === 0) {
      for (const id of ['f-left', 'f-center', 'f-right', 'f-cavalry']) {
        const u = unit(bs, id);
        if (!u || u.routed || u.status === 'fighting' || u.status === 'routing' || u.status === 'looting') continue;
        // in a defense op, hold your ground once you have it; otherwise push
        if (c.opKind === 'defense' && u.y < 500) continue;
        const push = c.opKind === 'their-ground' ? 200 : 340;
        issuePlayerOrder(bs, c, id, 'advance', { x: u.x, y: Math.max(push, u.y - 160) }, undefined, 'urgent');
      }
      // commit the reserve when the center is in trouble
      const center = unit(bs, 'f-center');
      const res = unit(bs, 'f-reserve');
      if (center && res && !res.routed && res.status !== 'fighting' &&
          (center.status === 'fighting' || center.status === 'wavering') && res.order.type === 'hold') {
        issuePlayerOrder(bs, c, 'f-reserve', 'support', undefined, 'f-center', 'urgent');
      }
    }
  }
  const aar = buildAfterAction(bs, c);
  // carry survivors like the UI does
  const survivors: Record<string, number> = {};
  for (const u of bs.units) {
    if (u.side === 'friend') survivors[u.id] = u.routed ? Math.round(u.menStart * 0.35) : u.men;
  }
  if (!c.warOver) nextOperation(c, survivors);
  return aar.outcome;
}

const battleCounts: Record<string, number> = {};
const warResults: Record<string, number> = {};
let totalOps = 0;

for (let seed = 1; seed <= N; seed++) {
  const c = newCampaign('medieval', seed * 101);
  initPersonal(c, (['home', 'camp', 'alone'] as const)[seed % 3]);
  let ops = 0;
  while (!c.warOver && ops < 5) {
    ops++;
    totalOps++;
    let guard = 0;
    while (c.distance > 0 && guard++ < 20) {
      resolveMarchDay(c, { pace: 'steady', supply: 'ration', scouts: 'wide' });
      if (c.pendingEngagement) {
        const officer = c.officers.find((o) => !o.dead && !o.wounded)!;
        resolveEngagement(c, officer.id, 'storm');
      }
      if (c.pendingEvent) resolveEventChoice(c, c.pendingEvent.options[0].apply);
    }
    resolveCampChoice(c, 'hill', true);
    maybeChallenge(c);
    if (c.pendingChallenge) resolveChallenge(c, 'refuse');
    finalScout(c);
    buildCouncilProposals(c);
    endorseProposal(c, c.councilProposals![0].officerId);
    const outcome = playBattle(c);
    battleCounts[outcome] = (battleCounts[outcome] ?? 0) + 1;
  }
  const result = c.warOver ?? 'undecided-after-5-ops';
  warResults[result] = (warResults[result] ?? 0) + 1;
}

console.log(`\n=== ${N} wars, ${totalOps} battles ===`);
console.log('battle outcomes:', JSON.stringify(battleCounts, null, 0));
console.log('war results:', JSON.stringify(warResults, null, 0));
const wins = warResults['triumph'] ?? 0;
console.log(`war win rate: ${Math.round((wins / N) * 100)}%`);
