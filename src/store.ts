// A tiny external store. The simulation state is mutable; components
// subscribe to a version counter and re-read it on every change.

import { useSyncExternalStore } from 'react';
import type {
  EraId, GameState, OrderType, SpeedSetting, Urgency,
} from './sim/types.ts';
import { newCampaign, resolveMarchDay, resolveEventChoice, resolveCampChoice, holdCouncil, finalScout, type MarchChoices } from './sim/campaign.ts';
import { setupBattle, battleTick, issuePlayerOrder, orderGeneralWithdrawal, DEPLOY_Y, MAP_H, MAP_W } from './sim/battle.ts';
import { buildAfterAction } from './sim/aar.ts';
import { FORMATIONS } from './sim/era.ts';

let state: GameState = { phase: 'title' };
let version = 0;
const listeners = new Set<() => void>();
let clock: ReturnType<typeof setInterval> | undefined;

function notify() {
  version++;
  listeners.forEach((l) => l());
}

export function useGame(): GameState {
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => version,
  );
  return state;
}

// ---------------------------------------------------------------- actions

export const actions = {
  toEraSelect() {
    state = { phase: 'era-select' };
    notify();
  },

  startCampaign(era: EraId, seed?: number) {
    const s = seed ?? ((Math.random() * 0xffffffff) >>> 0);
    state = { phase: 'march', campaign: newCampaign(era, s) };
    notify();
  },

  marchDay(choices: MarchChoices) {
    if (!state.campaign) return;
    resolveMarchDay(state.campaign, choices);
    notify();
  },

  chooseEventOption(apply: string) {
    if (!state.campaign) return;
    resolveEventChoice(state.campaign, apply);
    notify();
  },

  toCampPhase() {
    state.phase = 'camp';
    notify();
  },

  chooseCamp(placement: 'hill' | 'river' | 'road', fortified: boolean) {
    if (!state.campaign) return;
    resolveCampChoice(state.campaign, placement, fortified);
    notify();
  },

  council() {
    if (!state.campaign || state.campaign.heldCouncil) return;
    holdCouncil(state.campaign);
    notify();
  },

  scoutFinal() {
    if (!state.campaign) return;
    finalScout(state.campaign);
    notify();
  },

  toDeployment() {
    if (!state.campaign) return;
    // default officer assignments: match specialties where possible
    const officers = state.campaign.officers.slice();
    const assignments: Record<string, string> = {};
    for (const f of FORMATIONS) {
      const idx = officers.findIndex((o) => o.specialty === f.cls);
      const chosen = idx >= 0 ? officers.splice(idx, 1)[0] : officers.shift()!;
      assignments[f.id] = chosen.id;
    }
    state.assignments = assignments;
    state.personalCommand = 'hq';
    state.phase = 'deployment';
    state.battle = setupBattle(state.campaign, assignments, 'hq');
    notify();
  },

  assignOfficer(formationId: string, officerId: string) {
    if (!state.assignments || !state.battle || state.battle.tick > 0) return;
    // swap if that officer already holds another command
    const current = Object.entries(state.assignments).find(([, oid]) => oid === officerId);
    const prevHolder = state.assignments[formationId];
    if (current) state.assignments[current[0]] = prevHolder;
    state.assignments[formationId] = officerId;
    for (const u of state.battle.units) {
      if (u.side === 'friend') u.officerId = state.assignments[u.id];
    }
    notify();
  },

  setPersonalCommand(target: string) {
    if (!state.battle || state.battle.tick > 0) return;
    state.personalCommand = target;
    for (const u of state.battle.units) {
      const led = u.id === target;
      if (u.playerLed && !led) u.morale = Math.max(0, u.morale - 10);
      if (!u.playerLed && led) u.morale = Math.min(100, u.morale + 10);
      u.playerLed = led;
    }
    state.battle.playerUnitId = target === 'hq' ? undefined : target;
    notify();
  },

  moveDeployment(unitId: string, x: number, y: number) {
    if (!state.battle || state.battle.tick > 0) return;
    const u = state.battle.units.find((u) => u.id === unitId && u.side === 'friend');
    if (!u) return;
    u.x = Math.max(20, Math.min(MAP_W - 20, x));
    u.y = Math.max(DEPLOY_Y + 10, Math.min(MAP_H - 20, y));
    notify();
  },

  beginBattle() {
    if (!state.battle) return;
    state.phase = 'battle';
    actions.setSpeed('normal');
    notify();
  },

  setSpeed(speed: SpeedSetting) {
    if (!state.battle) return;
    state.battle.speed = speed;
    if (clock) { clearInterval(clock); clock = undefined; }
    const ms = speed === 'slow' ? 700 : speed === 'normal' ? 350 : speed === 'fast' ? 120 : 0;
    if (ms > 0) {
      clock = setInterval(() => {
        if (!state.battle || !state.campaign) return;
        battleTick(state.battle, state.campaign);
        if (state.battle.outcome && state.battle.tick > (state.battle.outcomeTick ?? 0) + 12) {
          actions.setSpeed('paused');
        }
        notify();
      }, ms);
    }
    notify();
  },

  issueOrder(unitId: string, type: OrderType, target?: { x: number; y: number }, targetUnitId?: string, urgency: Urgency = 'measured') {
    if (!state.battle || !state.campaign) return;
    issuePlayerOrder(state.battle, state.campaign, unitId, type, target, targetUnitId, urgency);
    notify();
  },

  generalWithdrawal() {
    if (!state.battle || !state.campaign) return;
    orderGeneralWithdrawal(state.battle, state.campaign);
    notify();
  },

  toAfterAction() {
    if (!state.battle || !state.campaign) return;
    if (clock) { clearInterval(clock); clock = undefined; }
    state.aar = buildAfterAction(state.battle, state.campaign);
    state.phase = 'after-action';
    notify();
  },

  newCampaign() {
    if (clock) { clearInterval(clock); clock = undefined; }
    state = { phase: 'era-select' };
    notify();
  },
};
