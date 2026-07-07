// The battle engine. Runs in ticks. Friendly units obey their *officers'*
// version of your orders; the enemy obeys a simple commander of its own.
// Everything the player learns arrives as delayed, positional reports.

import { makeRng, type Rng } from './rng.ts';
import { ERAS, FORMATIONS, type Era } from './era.ts';
import {
  interpretOrder, officerAutonomy, orderClarity, shortName, orderVerb,
  type InterpretContext,
} from './officer.ts';
import type {
  ActiveOrder, BattleState, CampaignState, KnownEnemy, Messenger, Officer,
  OrderType, PlayerOrder, Report, TerrainFeature, Unit, UnitClass, Urgency,
} from './types.ts';

export const MAP_W = 1200;
export const MAP_H = 800;
export const DEPLOY_Y = 560; // friendly units deploy south of this line
const ENGAGE_RANGE = 16;
const MISSILE_RANGE = 100;
const MESSENGER_SPEED = 11;

// ---------------------------------------------------------------- setup

interface ClassStats {
  melee: number; armor: number; missile: number; speed: number; ammo: number;
}
const CLASS_STATS: Record<UnitClass, ClassStats> = {
  infantry: { melee: 10, armor: 7, missile: 0, speed: 3.0, ammo: 0 },
  cavalry: { melee: 11, armor: 7, missile: 0, speed: 7.5, ammo: 0 },
  ranged: { melee: 4, armor: 3, missile: 10, speed: 3.4, ammo: 24 },
};

function makeTerrain(rng: Rng): TerrainFeature[] {
  const feats: TerrainFeature[] = [];
  // A road running the length of the field.
  const roadX = 560 + rng.int(-60, 80);
  feats.push({ kind: 'road', x: roadX, y: 0, w: 46, h: MAP_H, label: 'road' });
  // A hill dominating one side of the middle ground.
  const hillLeft = rng.chance(0.5);
  feats.push({
    kind: 'hill',
    x: hillLeft ? 140 + rng.int(0, 80) : 760 + rng.int(0, 120),
    y: 320 + rng.int(-50, 60),
    w: 230 + rng.int(0, 60), h: 170 + rng.int(0, 40),
    label: 'the hill',
  });
  // Woods on the opposite flank.
  feats.push({
    kind: 'woods',
    x: hillLeft ? 830 + rng.int(0, 120) : 90 + rng.int(0, 90),
    y: 260 + rng.int(-40, 120),
    w: 220 + rng.int(0, 70), h: 200 + rng.int(0, 60),
    label: 'the woods',
  });
  // A stream across part of the enemy third, with a ford at the road.
  if (rng.chance(0.7)) {
    const left = rng.chance(0.5);
    const y = 235 + rng.int(-30, 40);
    if (left) {
      feats.push({ kind: 'stream', x: 0, y, w: roadX - 10, h: 34, label: 'the stream' });
    } else {
      feats.push({ kind: 'stream', x: roadX + 56, y, w: MAP_W - roadX - 56, h: 34, label: 'the stream' });
    }
    feats.push({ kind: 'ford', x: roadX - 10, y, w: 66, h: 34, label: 'the ford' });
  }
  // Rough ground somewhere unhelpful.
  feats.push({
    kind: 'rough',
    x: rng.int(150, 800), y: 430 + rng.int(-40, 60),
    w: 170 + rng.int(0, 60), h: 120 + rng.int(0, 40),
    label: 'rough ground',
  });
  // Camps.
  feats.push({ kind: 'camp', x: roadX - 90, y: MAP_H - 70, w: 190, h: 60, label: 'your camp' });
  feats.push({ kind: 'enemy-camp', x: roadX - 70, y: 8, w: 180, h: 55, label: 'enemy camp' });
  return feats;
}

export interface TerrainEffects {
  moveMult: number;   // movement speed multiplier
  defBonus: number;   // multiplier on defensive resilience
  cavPenalty: number; // multiplier on cavalry effectiveness
  concealed: boolean;
  elevated: boolean;
}

export function terrainAt(terrain: TerrainFeature[], x: number, y: number): TerrainEffects {
  const fx: TerrainEffects = { moveMult: 1, defBonus: 1, cavPenalty: 1, concealed: false, elevated: false };
  for (const f of terrain) {
    if (x < f.x || x > f.x + f.w || y < f.y || y > f.y + f.h) continue;
    switch (f.kind) {
      case 'hill': fx.defBonus *= 1.3; fx.moveMult *= 0.85; fx.elevated = true; break;
      case 'woods': fx.moveMult *= 0.6; fx.concealed = true; fx.cavPenalty *= 0.6; break;
      case 'stream': fx.moveMult *= 0.4; fx.defBonus *= 0.85; break;
      case 'ford': fx.moveMult *= 0.7; break;
      case 'road': fx.moveMult *= 1.25; break;
      case 'rough': fx.moveMult *= 0.8; fx.cavPenalty *= 0.65; break;
      case 'camp': fx.defBonus *= 1.2; break;
      case 'enemy-camp': break;
    }
  }
  return fx;
}

function baseUnit(
  id: string, side: 'friend' | 'enemy', name: string, cls: UnitClass, men: number,
  x: number, y: number, c: { morale: number; fatigue: number; cohesion: number },
): Unit {
  const s = CLASS_STATS[cls];
  return {
    id, side, name, cls, men, menStart: men,
    morale: c.morale, fatigue: c.fatigue, cohesion: c.cohesion,
    training: 60, armor: s.armor, melee: s.melee, missile: s.missile,
    speed: s.speed, discipline: 60, ammo: s.ammo,
    x, y, facing: side === 'friend' ? -Math.PI / 2 : Math.PI / 2,
    status: 'idle',
    order: { type: 'hold', sinceTick: 0, source: 'initial' },
    chargeBonus: cls === 'cavalry' ? 1.7 : 1.25,
    killsDealt: 0,
  };
}

export function setupBattle(
  campaign: CampaignState,
  assignments: Record<string, string>,
  personalCommand: string,
): BattleState {
  const rng = makeRng(campaign.seed).fork(555);
  const era = ERAS[campaign.era];
  const terrain = makeTerrain(rng.fork(3));

  const condition = {
    morale: clamp(40 + campaign.morale * 0.55),
    fatigue: clamp(campaign.fatigue * 0.8),
    cohesion: clamp(30 + campaign.cohesion * 0.6),
  };

  // Friendly formations at default deployment slots; the player can
  // reposition them in the deployment phase.
  const slots: Record<string, { x: number; y: number }> = {
    'f-center': { x: 600, y: 640 },
    'f-left': { x: 330, y: 650 },
    'f-right': { x: 870, y: 650 },
    'f-cavalry': { x: 1040, y: 680 },
    'f-ranged': { x: 600, y: 600 },
    'f-reserve': { x: 600, y: 720 },
  };
  const units: Unit[] = FORMATIONS.map((f) => {
    const u = baseUnit(
      f.id, 'friend', era.unitNames[f.nameKey], f.cls,
      Math.max(100, f.men - Math.round(campaign.stragglers * (f.men / 4300))),
      slots[f.id].x, slots[f.id].y, condition,
    );
    u.officerId = assignments[f.id];
    return u;
  });

  // Enemy army: strength matches what campaign.enemyEstimate() was built on.
  const enemyTotal = 4200 + rng.int(-400, 600);
  const enemyCond = { morale: 62 + rng.int(-6, 8), fatigue: 20 + rng.int(0, 15), cohesion: 62 + rng.int(-8, 8) };
  const eSplit: [string, UnitClass, number, number, number][] = [
    ['e-center', 'infantry', 0.28, 600, 130],
    ['e-left', 'infantry', 0.19, 350, 145],
    ['e-right', 'infantry', 0.19, 850, 145],
    ['e-cavalry', 'cavalry', 0.10, rng.chance(0.5) ? 160 : 1050, 170],
    ['e-ranged', 'ranged', 0.12, 600, 185],
    ['e-reserve', 'infantry', 0.12, 600, 80],
  ];
  const enemyNames: Record<string, string> = {
    'e-center': `${era.enemyName} — main body`,
    'e-left': `${era.enemyName} — left`,
    'e-right': `${era.enemyName} — right`,
    'e-cavalry': `${era.enemyName} — horse`,
    'e-ranged': `${era.enemyName} — skirmishers`,
    'e-reserve': `${era.enemyName} — reserve`,
  };
  for (const [id, cls, frac, x, y] of eSplit) {
    const u = baseUnit(id, 'enemy', enemyNames[id], cls, Math.round(enemyTotal * frac), x + rng.int(-25, 25), y, enemyCond);
    units.push(u);
  }

  // Initial intelligence picture: positions offset by scouting error.
  const known: Record<string, KnownEnemy> = {};
  const err = (100 - campaign.intel) * 2.4;
  for (const u of units.filter((u) => u.side === 'enemy')) {
    if (campaign.intel < 30 && rng.chance(0.35)) continue; // never spotted
    known[u.id] = {
      unitId: u.id,
      x: u.x + rng.range(-err, err),
      y: u.y + rng.range(-err * 0.6, err * 0.6),
      seenTick: 0,
      visibleNow: false,
      identified: campaign.intel > 55 || rng.chance(campaign.intel / 100),
    };
  }

  const bs: BattleState = {
    tick: 0,
    speed: 'paused',
    units,
    messengers: [],
    terrain,
    reports: [],
    events: [],
    known,
    hqPos: { x: 600, y: 755 },
    playerUnitId: personalCommand === 'hq' ? undefined : personalCommand,
    enemyPlan: {
      phase: 'waiting',
      advanceTick: rng.int(25, 70),
      flankSide: (eSplit[3][3] as number) < 600 ? 'left' : 'right',
      aggression: 45 + rng.int(0, 40),
      commanderName: era.enemyCommander,
    },
    nextId: 1,
    weather: campaign.weather,
    seed: campaign.seed,
  };

  if (bs.playerUnitId) {
    const u = unit(bs, bs.playerUnitId);
    if (u) {
      u.playerLed = true;
      u.morale = clamp(u.morale + 10);
    }
  }
  report(bs, 'command', 0, bs.hqPos, `The army is drawn up. ${era.generalTitle}'s banner stands ${bs.playerUnitId ? `with the ${unit(bs, bs.playerUnitId)!.name}` : 'at headquarters'}.`, true);
  if (campaign.weather === 'fog') report(bs, 'scout', 0, bs.hqPos, 'Fog hangs over the field. You will fight half-blind, and so will they.', true);
  if (campaign.weather === 'rain') report(bs, 'scout', 0, bs.hqPos, 'Rain falls steadily. Bowstrings slacken and the ground is turning to paste.');
  return bs;
}

export function unit(bs: BattleState, id: string): Unit | undefined {
  return bs.units.find((u) => u.id === id);
}

// ---------------------------------------------------------------- reports

// Reports travel: an event far from the player's position arrives late.
function report(
  bs: BattleState, kind: Report['kind'], tick: number,
  at: { x: number; y: number }, text: string, important = false, instant = false,
) {
  const playerPos = playerPosition(bs);
  const delay = instant ? 0 : Math.round(dist(at, playerPos) / 45);
  const line = text.charAt(0).toUpperCase() + text.slice(1);
  bs.reports.push({ id: bs.nextId++, tick: tick + delay, kind, text: line, important });
}

export function visibleReports(bs: BattleState): Report[] {
  return bs.reports.filter((r) => r.tick <= bs.tick).sort((a, b) => b.tick - a.tick || b.id - a.id);
}

function event(bs: BattleState, kind: string, text: string, officerId?: string, unitId?: string) {
  bs.events.push({ tick: bs.tick, kind, text, officerId, unitId });
}

export function playerPosition(bs: BattleState): { x: number; y: number } {
  if (bs.playerUnitId) {
    const u = unit(bs, bs.playerUnitId);
    if (u && !u.routed) return { x: u.x, y: u.y };
  }
  return bs.hqPos;
}

// ---------------------------------------------------------------- player orders

export function issuePlayerOrder(
  bs: BattleState,
  campaign: CampaignState,
  unitId: string,
  type: OrderType,
  target: { x: number; y: number } | undefined,
  targetUnitId: string | undefined,
  urgency: Urgency,
): void {
  const u = unit(bs, unitId);
  if (!u || u.side !== 'friend' || u.routed) return;
  const po: PlayerOrder = {
    id: `po-${bs.nextId++}`,
    unitId, type, target, targetUnitId, urgency,
    clarity: orderClarity(type, urgency, bs.weather),
    issuedTick: bs.tick,
  };

  // Personally led formation: no messenger, no interpretation. You are there.
  if (u.playerLed) {
    u.pendingOrder = {
      order: { type, target, targetUnitId, sinceTick: bs.tick, source: 'player' },
      startTick: bs.tick + 1,
    };
    report(bs, 'order', bs.tick, { x: u.x, y: u.y }, `You give the order yourself: ${orderVerb(type)}. The ${u.name} respond at once.`, false, true);
    return;
  }

  const from = playerPosition(bs);
  bs.messengers.push({ id: `m-${bs.nextId++}`, order: po, x: from.x, y: from.y, state: 'outbound' });
  const era = ERAS[campaign.era];
  report(bs, 'messenger', bs.tick, from, `A ${era.messengerWord} gallops off to the ${u.name}: ${orderVerb(type)}${urgency === 'urgent' ? ', with all haste' : ''}.`, false, true);
}

export function orderGeneralWithdrawal(bs: BattleState, campaign: CampaignState): void {
  bs.withdrawalOrdered = true;
  for (const u of bs.units) {
    if (u.side !== 'friend' || u.routed) continue;
    issuePlayerOrder(bs, campaign, u.id, 'withdraw', { x: u.x, y: MAP_H - 60 }, undefined, 'urgent');
  }
  report(bs, 'command', bs.tick, playerPosition(bs), 'You order a general withdrawal. Now it is a race between discipline and panic.', true, true);
  event(bs, 'withdrawal', 'The general ordered a full withdrawal.');
}

// ---------------------------------------------------------------- tick

export function battleTick(bs: BattleState, campaign: CampaignState): void {
  if (bs.outcome) return;
  bs.tick++;
  const rng = makeRng(bs.seed).fork(90000 + bs.tick);

  stepMessengers(bs, campaign, rng.fork(1));
  startPendingOrders(bs);
  enemyCommander(bs, rng.fork(2));
  officerMoments(bs, campaign, rng.fork(3));
  moveUnits(bs, rng.fork(4));
  missileFire(bs, rng.fork(5));
  meleeCombat(bs, rng.fork(6));
  moraleAndRouts(bs, campaign, rng.fork(7));
  updateVisibility(bs);
  ambientReports(bs, rng.fork(8));
  checkEnd(bs, campaign, rng.fork(9));
}

// ---------------------------------------------------------------- messengers

function stepMessengers(bs: BattleState, campaign: CampaignState, rng: Rng) {
  const era = ERAS[campaign.era];
  for (const m of bs.messengers) {
    if (m.state === 'lost' || m.state === 'killed' || m.state === 'done') continue;

    const dest = m.state === 'outbound'
      ? (() => { const u = unit(bs, m.order.unitId); return u ? { x: u.x, y: u.y } : undefined; })()
      : playerPosition(bs);
    if (!dest) { m.state = 'lost'; continue; }

    // Danger: riding near the enemy gets messengers killed.
    const nearEnemy = bs.units.some((u) => u.side === 'enemy' && !u.routed && dist(u, m) < 70);
    if (nearEnemy && rng.chance(0.035)) {
      m.state = 'killed';
      m.diedTick = bs.tick;
      // You don't learn immediately — the report arrives when he's missed.
      bs.reports.push({
        id: bs.nextId++, tick: bs.tick + 25, kind: 'messenger',
        text: `The ${era.messengerWord} sent to the ${unit(bs, m.order.unitId)?.name ?? 'line'} has not returned.`, important: true,
      });
      event(bs, 'messenger-lost', `A ${era.messengerWord} carrying orders was lost.`);
      continue;
    }
    // Getting lost in fog or woods.
    const fx = terrainAt(bs.terrain, m.x, m.y);
    if ((bs.weather === 'fog' || fx.concealed) && rng.chance(0.012)) {
      m.state = 'lost';
      bs.reports.push({
        id: bs.nextId++, tick: bs.tick + 30, kind: 'messenger',
        text: `No acknowledgment has come back from the ${unit(bs, m.order.unitId)?.name ?? 'line'}. The ${era.messengerWord} may have gone astray.`, important: true,
      });
      continue;
    }

    const d = dist(m, dest);
    const step = MESSENGER_SPEED * terrainAt(bs.terrain, m.x, m.y).moveMult;
    if (d > step) {
      m.x += ((dest.x - m.x) / d) * step;
      m.y += ((dest.y - m.y) / d) * step;
      continue;
    }
    m.x = dest.x; m.y = dest.y;

    if (m.state === 'returning') {
      if (m.returnNote) {
        report(bs, 'messenger', bs.tick, dest, m.returnNote, true, true);
      }
      m.state = 'done';
      continue;
    }

    // Arrived at the officer: interpretation happens here.
    m.state = 'done';
    deliverOrder(bs, campaign, m, rng);
  }
  bs.messengers = bs.messengers.filter(
    (m) => m.state === 'outbound' || m.state === 'returning' || (m.diedTick && bs.tick - m.diedTick < 8),
  );
}

function deliverOrder(bs: BattleState, campaign: CampaignState, m: Messenger, rng: Rng) {
  const u = unit(bs, m.order.unitId);
  if (!u || u.routed) return;
  const officer = campaign.officers.find((o) => o.id === u.officerId);
  if (!officer) return;

  if (u.status === 'routing') {
    report(bs, 'messenger', bs.tick, u, `The ${ERAS[campaign.era].messengerWord} reaches the ${u.name} — but they are past taking orders. ${officer.title} ${shortName(officer.name)} is trying to stem the rout.`, true);
    return;
  }

  // Threat assessment: what does the ground ahead look like to this officer?
  const enemies = bs.units.filter((e) => e.side === 'enemy' && !e.routed);
  const target = m.order.target ?? { x: u.x, y: u.y - 200 };
  const threatMen = enemies.filter((e) => dist(e, target) < 180 || dist(e, u) < 140)
    .reduce((s, e) => s + e.men, 0);
  const nearbyThreat = Math.min(1, threatMen / Math.max(200, u.men * 1.6));
  const localOpportunity = enemies.some(
    (e) => dist(e, u) < 200 && (e.status === 'routing' || e.status === 'wavering'),
  );
  const supportTarget = m.order.targetUnitId ? unit(bs, m.order.targetUnitId) : undefined;
  const rivalInvolved = !!(supportTarget && supportTarget.officerId && supportTarget.officerId === officer.rivalId);

  const armyMorale = avgMorale(bs, 'friend');
  const ctx: InterpretContext = {
    tick: bs.tick, armyMorale, nearbyThreat, localOpportunity, rivalInvolved,
    distanceToTarget: m.order.target ? dist(u, m.order.target) : 0,
  };
  // Orders age badly: clarity decays a little with distance from the general.
  m.order.clarity = Math.max(15, m.order.clarity - dist(playerPosition(bs), u) / 60);

  const result = interpretOrder(officer, u, m.order, ctx, rng);
  u.pendingOrder = { order: result.order, startTick: bs.tick + result.delayTicks };
  report(bs, 'officer', bs.tick, u, result.ackText, result.kind !== 'precise' && result.kind !== 'mostly');
  if (result.aarNote) event(bs, 'interpretation', result.aarNote, officer.id, u.id);
  if (result.returnNote) {
    bs.messengers.push({
      id: `m-${bs.nextId++}`,
      order: m.order,
      x: u.x, y: u.y,
      state: 'returning',
      returnNote: result.returnNote,
    });
  }
}

function startPendingOrders(bs: BattleState) {
  for (const u of bs.units) {
    if (u.pendingOrder && bs.tick >= u.pendingOrder.startTick && u.status !== 'routing') {
      u.order = u.pendingOrder.order;
      u.pendingOrder = undefined;
    }
  }
}

// ---------------------------------------------------------------- enemy AI

function enemyCommander(bs: BattleState, rng: Rng) {
  const plan = bs.enemyPlan;
  const enemies = bs.units.filter((u) => u.side === 'enemy' && !u.routed);
  const friends = bs.units.filter((u) => u.side === 'friend' && !u.routed);
  if (!enemies.length || !friends.length) return;

  const give = (id: string, order: ActiveOrder) => {
    const u = unit(bs, id);
    if (u && !u.routed && u.status !== 'routing') {
      // enemy orders also arrive with a small human delay
      u.pendingOrder = { order, startTick: bs.tick + rng.int(2, 8) };
    }
  };
  const nearestFriend = (u: Unit) =>
    friends.reduce((best, f) => (dist(u, f) < dist(u, best) ? f : best), friends[0]);

  if (plan.phase === 'waiting' && bs.tick >= plan.advanceTick) {
    plan.phase = 'advancing';
    for (const id of ['e-center', 'e-left', 'e-right']) {
      const u = unit(bs, id);
      if (!u) continue;
      const tgt = nearestFriend(u);
      give(id, { type: 'advance', target: { x: tgt.x, y: tgt.y }, sinceTick: bs.tick, source: 'enemy-ai' });
    }
    give('e-ranged', { type: 'harass', sinceTick: bs.tick, source: 'enemy-ai' });
    // Cavalry swings wide before turning in.
    const cav = unit(bs, 'e-cavalry');
    if (cav) {
      const edgeX = plan.flankSide === 'left' ? 80 : MAP_W - 80;
      give('e-cavalry', { type: 'take-position', target: { x: edgeX, y: 430 }, sinceTick: bs.tick, source: 'enemy-ai' });
    }
    report(bs, 'scout', bs.tick, { x: 600, y: 200 }, `The enemy line is moving. Drums and horns along their whole front.`, true);
    return;
  }

  if (plan.phase === 'advancing') {
    // refresh advance targets occasionally; commit cavalry when in position
    if (bs.tick % 20 === 0) {
      for (const id of ['e-center', 'e-left', 'e-right']) {
        const u = unit(bs, id);
        if (!u || u.status === 'fighting') continue;
        const tgt = nearestFriend(u);
        give(id, { type: rng.chance(plan.aggression / 130) ? 'charge' : 'advance', target: { x: tgt.x, y: tgt.y }, sinceTick: bs.tick, source: 'enemy-ai' });
      }
    }
    const cav = unit(bs, 'e-cavalry');
    if (cav && !cav.routed && cav.status !== 'fighting' && cav.y > 380) {
      // target the most flankable friendly: ranged or an engaged flank unit
      const soft = friends.find((f) => f.cls === 'ranged') ?? friends[0];
      give('e-cavalry', { type: 'charge', target: { x: soft.x, y: soft.y }, targetUnitId: soft.id, sinceTick: bs.tick, source: 'enemy-ai' });
    }
    if (enemies.some((u) => u.status === 'fighting')) {
      plan.phase = 'committed';
    }
    return;
  }

  if (plan.phase === 'committed' && bs.tick % 15 === 0) {
    const res = unit(bs, 'e-reserve');
    if (res && !res.routed && res.status !== 'fighting' && res.order.type === 'hold') {
      // send reserve at the weakest engaged friendly sector
      const fighting = enemies.filter((u) => u.status === 'fighting' || u.status === 'wavering');
      const weakest = fighting.sort((a, b) => a.morale - b.morale)[0];
      if (weakest && (weakest.morale < 45 || rng.chance(plan.aggression / 200))) {
        give('e-reserve', { type: 'support', targetUnitId: weakest.id, sinceTick: bs.tick, source: 'enemy-ai' });
      }
    }
    // idle enemy formations do not stand around all day — the enemy
    // commander keeps feeding them back into the fight
    for (const u of enemies) {
      if (u.status === 'fighting' || u.status === 'routing' || u.status === 'wavering' || u.pendingOrder) continue;
      if (u.order.type === 'hold' && bs.tick - u.order.sinceTick > 15) {
        const tgt = nearestFriend(u);
        give(u.id, {
          type: rng.chance(plan.aggression / 150) ? 'charge' : 'advance',
          target: { x: tgt.x, y: tgt.y }, targetUnitId: tgt.id, sinceTick: bs.tick, source: 'enemy-ai',
        });
      }
    }
    // enemy breaks off if its army is collapsing
    const eMorale = avgMorale(bs, 'enemy');
    const eLosses = lossFraction(bs, 'enemy');
    if (eMorale < 38 || eLosses > 0.35) {
      plan.phase = 'breaking';
      for (const u of enemies) {
        if (u.status !== 'routing') {
          give(u.id, { type: 'withdraw', target: { x: u.x, y: 30 }, sinceTick: bs.tick, source: 'enemy-ai' });
        }
      }
    }
  }
}

// ---------------------------------------------------------------- officer autonomy

function officerMoments(bs: BattleState, campaign: CampaignState, rng: Rng) {
  for (let i = 0; i < bs.units.length; i++) {
    const u = bs.units[i];
    if (u.side !== 'friend' || u.routed || u.playerLed || !u.officerId) continue;
    if ((bs.tick + i * 3) % 9 !== 0) continue; // staggered checks
    const officer = campaign.officers.find((o) => o.id === u.officerId);
    if (!officer) continue;

    const enemies = bs.units.filter((e) => e.side === 'enemy' && !e.routed);
    const routingEnemyNearby = bs.units.some(
      (e) => e.side === 'enemy' && e.status === 'routing' && !e.routed && dist(e, u) < 160,
    );
    const nearMen = enemies.filter((e) => dist(e, u) < 200).reduce((s, e) => s + e.men, 0);
    const heavilyOutnumberedHere = nearMen > u.men * 2.4;
    // archers do not throw themselves into melee to help; they keep shooting
    const friendInTrouble = u.cls === 'ranged' ? undefined : bs.units.find(
      (f) =>
        f.side === 'friend' && f.id !== u.id && !f.routed &&
        (f.status === 'wavering' || (f.status === 'fighting' && f.morale < 40)) &&
        dist(f, u) < 260 &&
        // rivals do not rush to each other's rescue
        !(f.officerId && f.officerId === officer.rivalId),
    );

    // The farther from the general's eye, the freer officers feel.
    const distFromPlayer = dist(u, playerPosition(bs));
    if (!rng.chance(Math.min(0.9, 0.45 + distFromPlayer / 900))) continue;

    const result = officerAutonomy(officer, u, {
      tick: bs.tick,
      routingEnemyNearby,
      threatenedFlank: false,
      friendInTroubleId: friendInTrouble?.id,
      friendInTroubleName: friendInTrouble?.name,
      heavilyOutnumberedHere,
    }, rng.fork(i));
    if (result) {
      u.order = result.order;
      u.pendingOrder = undefined;
      report(bs, 'officer', bs.tick, u, result.reportText, true);
      if (result.aarNote) event(bs, 'autonomy', result.aarNote, officer.id, u.id);
      if (result.deed) officer.deeds.push(result.deed);
      if (result.heroic) officer.perf.heroics++;
      if (result.blunder) officer.perf.blunders++;
    }
  }
}

// ---------------------------------------------------------------- movement

function moveUnits(bs: BattleState, rng: Rng) {
  for (const u of bs.units) {
    if (u.routed) continue;
    if (u.status === 'routing') { routMove(bs, u); continue; }
    if (u.status === 'fighting') continue; // locked in melee

    const dest = destinationFor(bs, u);
    if (!dest) {
      if (u.status !== 'idle' && u.status !== 'holding') u.status = 'holding';
      recoverInPlace(u);
      continue;
    }
    const d = dist(u, dest);
    if (d < 6) {
      // arrived
      if (u.order.type === 'take-position' || u.order.type === 'advance' || u.order.type === 'advance-cautious' || u.order.type === 'charge') {
        u.order = { type: 'hold', sinceTick: bs.tick, source: u.order.source, note: u.order.note };
        if (u.side === 'friend') {
          report(bs, 'order', bs.tick, u, `The ${u.name} have reached their position and hold.`);
        }
      }
      u.status = 'holding';
      recoverInPlace(u);
      continue;
    }

    const fx = terrainAt(bs.terrain, u.x, u.y);
    let speed = u.speed * fx.moveMult;
    if (u.order.type === 'advance-cautious') speed *= 0.65;
    if (u.order.type === 'charge' && d < 140) speed *= 1.5;
    if (u.order.type === 'withdraw') speed *= 0.9;
    speed *= 1 - (u.fatigue / 100) * 0.45;
    if (bs.weather === 'rain') speed *= 0.9;

    u.x += ((dest.x - u.x) / d) * speed;
    u.y += ((dest.y - u.y) / d) * speed;
    u.facing = Math.atan2(dest.y - u.y, dest.x - u.x);
    u.status =
      u.order.type === 'withdraw' ? 'withdrawing' :
      u.order.type === 'pursue' ? 'pursuing' :
      u.order.type === 'charge' ? 'advancing' :
      u.order.type === 'hold' ? 'marching' : 'advancing';
    // moving costs
    const cost = (u.order.type === 'charge' ? 0.5 : 0.22) * (u.cls === 'cavalry' ? 0.7 : 1);
    u.fatigue = clamp(u.fatigue + cost);
    u.cohesion = clamp(u.cohesion - (u.order.type === 'charge' ? 0.25 : 0.06));
  }
}

function destinationFor(bs: BattleState, u: Unit): { x: number; y: number } | undefined {
  const o = u.order;
  const enemySide = u.side === 'friend' ? 'enemy' : 'friend';
  const foes = bs.units.filter((e) => e.side === enemySide && !e.routed);
  const nearestFoe = foes.length
    ? foes.reduce((b, e) => (dist(u, e) < dist(u, b) ? e : b), foes[0])
    : undefined;

  switch (o.type) {
    case 'hold':
    case 'rally':
      return undefined;
    case 'advance':
    case 'advance-cautious':
    case 'charge':
    case 'take-position': {
      if (o.targetUnitId) {
        const t = unit(bs, o.targetUnitId);
        if (t && !t.routed) return { x: t.x, y: t.y };
      }
      if (o.target) return o.target;
      if (o.type === 'charge' && nearestFoe) return { x: nearestFoe.x, y: nearestFoe.y };
      return undefined;
    }
    case 'withdraw':
      return o.target ?? { x: u.x, y: u.side === 'friend' ? MAP_H - 60 : 40 };
    case 'protect-camp': {
      const camp = bs.terrain.find((t) => t.kind === (u.side === 'friend' ? 'camp' : 'enemy-camp'))!;
      return { x: camp.x + camp.w / 2, y: camp.y + (u.side === 'friend' ? -20 : camp.h + 20) };
    }
    case 'support': {
      const t = o.targetUnitId ? unit(bs, o.targetUnitId) : undefined;
      if (t && !t.routed) {
        // stand just behind / beside the supported unit
        return { x: t.x + (u.x > t.x ? 30 : -30), y: t.y + (u.side === 'friend' ? 25 : -25) };
      }
      return undefined;
    }
    case 'screen-flank':
    case 'refuse-flank': {
      if (o.target) return o.target;
      return undefined;
    }
    case 'pursue': {
      const routing = foes.filter((e) => e.status === 'routing');
      const t = routing.length
        ? routing.reduce((b, e) => (dist(u, e) < dist(u, b) ? e : b), routing[0])
        : nearestFoe;
      return t ? { x: t.x, y: t.y } : undefined;
    }
    case 'harass': {
      if (!nearestFoe) return undefined;
      const d = dist(u, nearestFoe);
      if (u.cls === 'ranged') {
        if (d > MISSILE_RANGE - 15) return { x: nearestFoe.x, y: nearestFoe.y };
        if (d < MISSILE_RANGE - 45) {
          // back away
          const dx = u.x - nearestFoe.x, dy = u.y - nearestFoe.y;
          const n = Math.hypot(dx, dy) || 1;
          return { x: u.x + (dx / n) * 40, y: u.y + (dy / n) * 40 };
        }
        return undefined;
      }
      return d > 60 ? { x: nearestFoe.x, y: nearestFoe.y } : undefined;
    }
  }
}

function recoverInPlace(u: Unit) {
  u.fatigue = clamp(u.fatigue - 0.25);
  u.cohesion = clamp(u.cohesion + 0.2);
  if (u.status === 'holding' && u.morale < 70) u.morale = clamp(u.morale + 0.05);
}

function routMove(bs: BattleState, u: Unit) {
  const edgeY = u.side === 'friend' ? MAP_H + 30 : -30;
  const d = Math.abs(edgeY - u.y) || 1;
  u.y += ((edgeY - u.y) / d) * u.speed * 1.4;
  u.x += (u.x > MAP_W / 2 ? 1 : -1) * 0.3;
  u.fatigue = clamp(u.fatigue + 0.5);
  u.men = Math.max(0, u.men - Math.ceil(u.men * 0.002)); // shedding stragglers
  if (u.y > MAP_H + 10 || u.y < -10 || u.men <= 50) {
    u.routed = true;
    u.status = 'routing';
  }
}

// ---------------------------------------------------------------- combat

function missileFire(bs: BattleState, rng: Rng) {
  for (const u of bs.units) {
    if (u.routed || u.cls !== 'ranged' || u.ammo <= 0 || u.status === 'routing' || u.status === 'fighting') continue;
    const foes = bs.units.filter((e) => e.side !== u.side && !e.routed && dist(u, e) <= MISSILE_RANGE);
    if (!foes.length) continue;
    const target = foes.reduce((b, e) => (dist(u, e) < dist(u, b) ? e : b), foes[0]);
    u.ammo -= 1;
    let power = u.missile * Math.sqrt(u.men) * 0.05;
    if (bs.weather === 'rain') power *= 0.6;
    const fxT = terrainAt(bs.terrain, target.x, target.y);
    if (fxT.concealed) power *= 0.5;
    const fxU = terrainAt(bs.terrain, u.x, u.y);
    if (fxU.elevated) power *= 1.2;
    const kills = Math.max(0, Math.round(power / (target.armor * 0.4 + 3) + rng.range(-1, 2)));
    target.men = Math.max(0, target.men - kills);
    u.killsDealt += kills;
    target.morale = clamp(target.morale - kills / Math.max(1, target.men) * 140 - 0.15);
    if (u.ammo === 0) {
      report(bs, 'combat', bs.tick, u, `The ${u.name} have shot away their last shafts.`, u.side === 'friend');
    }
  }
}

function meleeCombat(bs: BattleState, rng: Rng) {
  // establish engagements
  for (const u of bs.units) {
    if (u.routed || u.status === 'routing') continue;
    if (u.engagedWith) {
      const foe = unit(bs, u.engagedWith);
      if (!foe || foe.routed || foe.status === 'routing' || dist(u, foe) > ENGAGE_RANGE * 2.2) {
        u.engagedWith = undefined;
        if (u.status === 'fighting') u.status = 'holding';
      }
      continue;
    }
    const foe = bs.units.find(
      (e) => e.side !== u.side && !e.routed && e.status !== 'routing' && dist(u, e) <= ENGAGE_RANGE,
    );
    if (foe) {
      u.engagedWith = foe.id;
      if (!foe.engagedWith) foe.engagedWith = u.id;
      const wasCharging = u.order.type === 'charge' || u.order.type === 'pursue';
      if (u.status !== 'fighting') {
        u.status = 'fighting';
        u.facing = Math.atan2(foe.y - u.y, foe.x - u.x);
        if (u.side === 'friend' || foe.side === 'friend') {
          const fr = u.side === 'friend' ? u : foe;
          const en = u.side === 'friend' ? foe : u;
          report(bs, 'combat', bs.tick, fr, `${fr.name} ${wasCharging && u.side === 'friend' ? 'crash into' : 'are engaged with'} ${en.name}. The lines meet with a noise like a falling wall.`, true);
          event(bs, 'clash', `${fr.name} engaged ${en.name}.`, undefined, fr.id);
        }
      }
    }
  }

  // resolve damage pairwise (each unit strikes its engagement partner)
  for (const u of bs.units) {
    if (u.routed || u.status !== 'fighting' || !u.engagedWith) continue;
    const foe = unit(bs, u.engagedWith);
    if (!foe || foe.routed) continue;

    const fxU = terrainAt(bs.terrain, u.x, u.y);
    const fxF = terrainAt(bs.terrain, foe.x, foe.y);
    let power = u.melee * Math.sqrt(u.men) * 0.011;
    power *= 0.55 + (u.morale / 100) * 0.6;
    power *= 1 - (u.fatigue / 100) * 0.5;
    power *= 0.6 + (u.cohesion / 100) * 0.5;
    if (u.cls === 'cavalry') power *= fxU.cavPenalty;
    power *= u.chargeBonus;
    if (u.playerLed) power *= 1.15;
    // flanking: attacker roughly behind the defender's facing
    const angTo = Math.atan2(u.y - foe.y, u.x - foe.x);
    let angDiff = Math.abs(normAngle(angTo - foe.facing));
    const flanked = angDiff > (Math.PI * 2) / 3;
    if (flanked) power *= 1.5;

    const resilience = (foe.armor * 0.5 + 4) * fxF.defBonus;
    const kills = Math.max(0, power / resilience * 5.2 + rng.range(-0.5, 0.8));
    const dead = Math.min(foe.men, kills);
    foe.men = Math.max(0, Math.round(foe.men - dead));
    u.killsDealt += dead;

    const lossFrac = dead / Math.max(1, foe.men);
    foe.morale = clamp(foe.morale - lossFrac * 240 - 0.3 - (flanked ? 0.5 : 0));
    foe.cohesion = clamp(foe.cohesion - 0.25 - (flanked ? 0.3 : 0));
    u.fatigue = clamp(u.fatigue + 0.35);
    // charge impetus decays
    u.chargeBonus = Math.max(1, u.chargeBonus - 0.02);

    if (foe.men <= 40) {
      foe.routed = true;
      foe.status = 'routing';
      report(bs, 'combat', bs.tick, foe, `${foe.name} have been destroyed as a fighting force.`, true);
      event(bs, 'destroyed', `${foe.name} were wiped out.`, undefined, foe.id);
    }
  }
}

// ---------------------------------------------------------------- morale

function moraleAndRouts(bs: BattleState, campaign: CampaignState, rng: Rng) {
  for (const u of bs.units) {
    if (u.routed) continue;

    // ambient morale influences
    const nearRoutFriend = bs.units.some(
      (f) => f.side === u.side && f.id !== u.id && f.status === 'routing' && dist(u, f) < 130,
    );
    if (nearRoutFriend) u.morale = clamp(u.morale - 0.35);
    const nearRoutEnemy = bs.units.some(
      (f) => f.side !== u.side && f.status === 'routing' && dist(u, f) < 160,
    );
    if (nearRoutEnemy) u.morale = clamp(u.morale + 0.2);
    if (u.playerLed) u.morale = clamp(u.morale + 0.1);

    if (u.status === 'routing') {
      // rally chance once clear of enemies
      const nearEnemy = bs.units.some((e) => e.side !== u.side && !e.routed && dist(u, e) < 170);
      if (!nearEnemy && u.men > 80) {
        const officer = campaign.officers.find((o) => o.id === u.officerId);
        const rallyScore = (officer ? officer.traits.courage * 0.5 + officer.traits.competence * 0.3 : 30) + (u.playerLed ? 35 : 0);
        if (rng.chance(rallyScore / 2600)) {
          u.status = 'rallying';
          u.morale = 34;
          u.cohesion = clamp(u.cohesion + 10);
          u.order = { type: 'hold', sinceTick: bs.tick, source: 'officer', note: 'rallied' };
          const who = officer ? `${officer.title} ${shortName(officer.name)}` : 'Its officer';
          report(bs, 'morale', bs.tick, u, `${who} has rallied the ${u.name}. They stand — shaken, thinned, but standing.`, true);
          event(bs, 'rally', `${u.name} rallied after breaking.`, officer?.id, u.id);
          officer?.deeds.push('Rallied a broken formation in the field.');
          if (officer) officer.perf.heroics++;
        }
      }
      continue;
    }
    if (u.status === 'rallying') {
      u.morale = clamp(u.morale + 0.3);
      if (u.morale > 45) u.status = 'holding';
      continue;
    }

    // wavering / breaking
    if (u.morale < 32 && (u.status === 'fighting' || u.status === 'wavering')) {
      if (u.status !== 'wavering') {
        u.status = 'wavering';
        if (u.side === 'friend') {
          report(bs, 'morale', bs.tick, u, `The ${u.name} are wavering. Men in the rear ranks are looking over their shoulders.`, true);
        } else {
          report(bs, 'combat', bs.tick, u, `${u.name} appear to be wavering. Their line is bending.`, true);
        }
        event(bs, 'waver', `${u.name} began to waver.`, undefined, u.id);
      }
      const breakChance = (32 - u.morale) / 100 * (1 - u.discipline / 250) * (u.playerLed ? 0.5 : 1);
      if (u.morale < 20 && rng.chance(breakChance)) {
        u.status = 'routing';
        u.engagedWith = undefined;
        u.pendingOrder = undefined;
        report(bs, u.side === 'friend' ? 'morale' : 'combat', bs.tick, u,
          u.side === 'friend'
            ? `The ${u.name} have BROKEN. They stream toward the rear, throwing down shields as they run.`
            : `${u.name} have broken! They are running.`,
          true);
        event(bs, 'rout', `${u.name} broke and ran.`, undefined, u.id);
        const officer = campaign.officers.find((o) => o.id === u.officerId);
        if (officer) officer.perf.blunders++;
      }
    } else if (u.status === 'wavering' && u.morale >= 34) {
      u.status = u.engagedWith ? 'fighting' : 'holding';
    }
  }
}

// ---------------------------------------------------------------- visibility

function updateVisibility(bs: BattleState) {
  const friends = bs.units.filter((u) => u.side === 'friend' && !u.routed);
  const baseVision = bs.weather === 'fog' ? 110 : 190;
  for (const e of bs.units.filter((u) => u.side === 'enemy')) {
    const k = bs.known[e.id];
    if (e.routed) {
      if (k) k.visibleNow = false;
      continue;
    }
    const fxE = terrainAt(bs.terrain, e.x, e.y);
    const seenBy = friends.some((f) => {
      const fxF = terrainAt(bs.terrain, f.x, f.y);
      let range = baseVision * (fxF.elevated ? 1.3 : 1);
      if (fxE.concealed) range = Math.min(range, 70);
      return dist(f, e) < range;
    });
    if (seenBy) {
      if (!k) {
        bs.known[e.id] = { unitId: e.id, x: e.x, y: e.y, seenTick: bs.tick, visibleNow: true, identified: true };
        report(bs, 'scout', bs.tick, e, `A body of enemy ${e.cls === 'cavalry' ? 'horse' : e.cls === 'ranged' ? 'skirmishers' : 'foot'} has been sighted — ${e.name}.`, true);
      } else {
        k.x = e.x; k.y = e.y; k.seenTick = bs.tick; k.visibleNow = true; k.identified = true;
      }
    } else if (k) {
      k.visibleNow = false;
    }
  }
}

// ---------------------------------------------------------------- ambient reports

function ambientReports(bs: BattleState, rng: Rng) {
  if (bs.tick % 30 !== 0) return;
  const friends = bs.units.filter((u) => u.side === 'friend' && !u.routed);
  const fighting = friends.filter((u) => u.status === 'fighting');
  if (fighting.length && rng.chance(0.5)) {
    const u = rng.pick(fighting);
    const foe = u.engagedWith ? unit(bs, u.engagedWith) : undefined;
    const winning = foe && (u.morale - foe.morale) > 12;
    const losing = foe && (foe.morale - u.morale) > 12;
    const line = winning
      ? `Word from the ${u.name}: they are getting the better of it. The enemy in front of them is giving ground.`
      : losing
        ? `A runner from the ${u.name} reports heavy pressure. They are holding, but the officer asks how long they must.`
        : `The ${u.name} remain hotly engaged. Neither line will give.`;
    report(bs, 'combat', bs.tick, u, line);
  }
  const idle = friends.filter((u) => u.status === 'holding' && u.order.type === 'hold' && bs.tick - u.order.sinceTick > 60);
  if (idle.length && rng.chance(0.35)) {
    const u = rng.pick(idle);
    report(bs, 'officer', bs.tick, u, `The ${u.name} stand idle and await orders.`);
  }
}

// ---------------------------------------------------------------- end conditions

function avgMorale(bs: BattleState, side: 'friend' | 'enemy'): number {
  const us = bs.units.filter((u) => u.side === side && !u.routed && u.status !== 'routing');
  if (!us.length) return 0;
  return us.reduce((s, u) => s + u.morale, 0) / us.length;
}

export function lossFraction(bs: BattleState, side: 'friend' | 'enemy'): number {
  const us = bs.units.filter((u) => u.side === side);
  const start = us.reduce((s, u) => s + u.menStart, 0);
  const now = us.reduce((s, u) => s + (u.routed ? 0 : u.men), 0);
  return 1 - now / start;
}

function sideBroken(bs: BattleState, side: 'friend' | 'enemy'): boolean {
  const us = bs.units.filter((u) => u.side === side);
  const effective = us.filter((u) => !u.routed && u.status !== 'routing' && u.men > 60);
  return effective.length === 0 || lossFraction(bs, side) > 0.55;
}

const NIGHTFALL_TICK = 950;

function checkEnd(bs: BattleState, campaign: CampaignState, rng: Rng) {
  if (bs.outcome || bs.tick < 10) return;

  const fLoss = lossFraction(bs, 'friend');
  const eLoss = lossFraction(bs, 'enemy');

  // Nightfall ends battles that neither side can finish.
  if (bs.tick >= NIGHTFALL_TICK) {
    bs.outcome =
      eLoss - fLoss > 0.15 ? 'narrow-victory' :
      fLoss - eLoss > 0.15 ? 'defeat' : 'orderly-withdrawal';
    bs.outcomeTick = bs.tick;
    report(bs, 'command', bs.tick, playerPosition(bs), 'Darkness ends the fighting. Both armies draw apart to count their dead.', true, true);
    return;
  }

  // Withdrawal resolution: army off the field or safely disengaged.
  if (bs.withdrawalOrdered) {
    const friends = bs.units.filter((u) => u.side === 'friend' && !u.routed);
    const away = friends.every(
      (u) => u.y > MAP_H - 120 || !bs.units.some((e) => e.side === 'enemy' && !e.routed && dist(u, e) < 220),
    );
    if (away || friends.length === 0) {
      const brokenUnits = bs.units.filter((u) => u.side === 'friend' && (u.routed || u.status === 'routing')).length;
      bs.outcome = brokenUnits >= 3 || fLoss > 0.35 ? 'chaotic-retreat' : 'orderly-withdrawal';
      bs.outcomeTick = bs.tick;
      return;
    }
  }

  if (sideBroken(bs, 'enemy') && !sideBroken(bs, 'friend')) {
    bs.outcome = fLoss < 0.14 ? 'decisive-victory' : fLoss < 0.3 ? 'costly-victory' : 'pyrrhic-victory';
    bs.outcomeTick = bs.tick;
    report(bs, 'command', bs.tick, playerPosition(bs), 'The enemy army is broken. The field is yours.', true, true);
    return;
  }
  // Enemy withdrew in order rather than broke.
  if (bs.enemyPlan.phase === 'breaking') {
    const enemiesLeft = bs.units.filter((u) => u.side === 'enemy' && !u.routed);
    if (enemiesLeft.length > 0 && enemiesLeft.every((u) => u.y < 90)) {
      bs.outcome = 'narrow-victory';
      bs.outcomeTick = bs.tick;
      report(bs, 'command', bs.tick, playerPosition(bs), 'The enemy has quit the field in order. Driven off — not destroyed.', true, true);
      return;
    }
  }
  if (sideBroken(bs, 'friend')) {
    bs.outcome = fLoss > 0.5 ? 'disaster' : 'defeat';
    bs.outcomeTick = bs.tick;
    report(bs, 'command', bs.tick, playerPosition(bs), 'The army is breaking. The day is lost.', true, true);
    return;
  }
}

// ---------------------------------------------------------------- utils

export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
