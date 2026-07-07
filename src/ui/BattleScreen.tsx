import { useState } from 'react';
import { dist, visibleReports } from '../sim/battle.ts';
import { orderVerb, shortName } from '../sim/officer.ts';
import { levelWord, ReportLog } from './shared.tsx';
import type { BattleState, CampaignState, OrderType, Urgency } from '../sim/types.ts';
import { actions } from '../store.ts';
import { BattleMap } from './BattleMap.tsx';

interface TargetingState {
  type: OrderType;
  needs: 'point' | 'friendly';
}

const OUTCOME_BLURB: Record<string, string> = {
  'decisive-victory': 'The enemy army has ceased to exist.',
  'costly-victory': 'The field is yours — dearly bought.',
  'narrow-victory': 'The enemy has quit the field in order.',
  'pyrrhic-victory': 'You hold the field. Barely anyone holds it with you.',
  'orderly-withdrawal': 'The army has broken contact intact.',
  'chaotic-retreat': 'The withdrawal became a rout in all but name.',
  defeat: 'The line broke. The day is lost.',
  disaster: 'The army has been destroyed.',
};

export function BattleScreen({ battle, campaign }: { battle: BattleState; campaign: CampaignState }) {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [targeting, setTargeting] = useState<TargetingState | undefined>();
  const [urgency, setUrgency] = useState<Urgency>('measured');

  const selected = battle.units.find((u) => u.id === selectedId);
  const friendlySelected = selected && selected.side === 'friend' && !selected.routed;
  const officer = friendlySelected ? campaign.officers.find((o) => o.id === selected.officerId) : undefined;
  const minutes = Math.floor(battle.tick / 3);

  const startOrder = (type: OrderType, needs?: 'point' | 'friendly') => {
    if (!friendlySelected) return;
    if (needs) {
      setTargeting({ type, needs });
    } else {
      actions.issueOrder(selected.id, type, undefined, undefined, urgency);
    }
  };

  const handleMapClick = (x: number, y: number) => {
    if (!targeting || !friendlySelected) { return; }
    if (targeting.needs === 'friendly') {
      const friend = battle.units
        .filter((u) => u.side === 'friend' && !u.routed && u.id !== selected.id)
        .sort((a, b) => dist(a, { x, y }) - dist(b, { x, y }))[0];
      if (friend && dist(friend, { x, y }) < 60) {
        actions.issueOrder(selected.id, targeting.type, undefined, friend.id, urgency);
        setTargeting(undefined);
      }
      return;
    }
    // point orders may also snap to a known enemy for charge/advance
    const knownEnemies = Object.values(battle.known)
      .filter((k) => k.visibleNow)
      .sort((a, b) => dist(a, { x, y }) - dist(b, { x, y }));
    const snap = knownEnemies[0] && dist(knownEnemies[0], { x, y }) < 40 ? knownEnemies[0] : undefined;
    actions.issueOrder(
      selected.id, targeting.type,
      snap ? { x: snap.x, y: snap.y } : { x, y },
      snap?.unitId, urgency,
    );
    setTargeting(undefined);
  };

  return (
    <div className="screen no-pad">
      <div className="battle-wrap">
        <div className="battle-map-area">
          <div className="time-controls">
            {(['paused', 'slow', 'normal', 'fast'] as const).map((s) => (
              <button key={s} className={battle.speed === s ? 'active' : ''} onClick={() => actions.setSpeed(s)}>
                {s === 'paused' ? '❚❚' : s === 'slow' ? '▶' : s === 'normal' ? '▶▶' : '▶▶▶'}
              </button>
            ))}
            <button
              className="danger"
              disabled={battle.withdrawalOrdered || !!battle.outcome}
              onClick={() => { if (confirm('Order a general withdrawal? There is no countermanding it.')) actions.generalWithdrawal(); }}
            >
              General withdrawal
            </button>
            <span className="clock">minute {minutes}</span>
          </div>
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            {targeting && (
              <div className="targeting-hint" onClick={() => setTargeting(undefined)}>
                {targeting.needs === 'friendly'
                  ? `Click a friendly formation to ${orderVerb(targeting.type)} — or click here to cancel`
                  : `Click the map to mark where they should ${orderVerb(targeting.type)} — or click here to cancel`}
              </div>
            )}
            {battle.outcome && (
              <div className="banner-overlay">
                <h2>{OUTCOME_BLURB[battle.outcome] ? titleOf(battle.outcome) : 'The Battle Ends'}</h2>
                <p>{OUTCOME_BLURB[battle.outcome]}</p>
                <button className="primary" onClick={actions.toAfterAction}>Read the after-action report</button>
              </div>
            )}
            <BattleMap
              battle={battle}
              campaign={campaign}
              selectedId={selectedId}
              mode="battle"
              targeting={!!targeting}
              onSelect={(id) => { if (!targeting) setSelectedId(id); }}
              onMapClick={handleMapClick}
            />
          </div>
        </div>

        <div className="battle-side">
          <div className="panel">
            <h3>Formations</h3>
            {battle.units.filter((u) => u.side === 'friend').map((u) => {
              const o = campaign.officers.find((x) => x.id === u.officerId);
              return (
                <div
                  key={u.id}
                  className={`unit-chip${u.id === selectedId ? ' selected' : ''}`}
                  onClick={() => setSelectedId(u.id)}
                  style={{ opacity: u.routed ? 0.4 : 1 }}
                >
                  <span className="swatch" style={{
                    background: '#5b8fc4',
                    borderRadius: u.cls === 'ranged' ? '50%' : 0,
                    clipPath: u.cls === 'cavalry' ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined,
                  }} />
                  <span>{u.playerLed && '★ '}{o ? shortName(o.name) : '—'} · <span className="small">{u.name}</span></span>
                  <span className="uc-status">{u.routed ? 'fled' : u.status}</span>
                </div>
              );
            })}
          </div>

          {friendlySelected && (
            <div className="panel">
              <h3>
                {selected.name}
                {selected.playerLed ? ' — under your personal command' : officer ? ` — ${officer.title} ${shortName(officer.name)}` : ''}
              </h3>
              <div className="small" style={{ marginBottom: 6 }}>
                About {Math.round(selected.men / 50) * 50} men · spirits {levelWord(selected.morale, 'good-high')} ·
                fatigue {levelWord(selected.fatigue, 'bad-high')} ·
                now: {selected.status}, ordered to {orderVerb(selected.order.type)}
                {selected.pendingOrder ? ' (new order being taken up)' : ''}
              </div>
              {officer && !selected.playerLed && (
                <div className="small" style={{ fontStyle: 'italic', marginBottom: 8 }}>“{officer.epithet}”</div>
              )}
              <div className="choice-group">
                <div className="group-label">Urgency</div>
                <div className="opts">
                  <button className={urgency === 'measured' ? 'active' : ''} onClick={() => setUrgency('measured')}>Measured</button>
                  <button className={urgency === 'urgent' ? 'active' : ''} onClick={() => setUrgency('urgent')}>Urgent (faster, easier to garble)</button>
                </div>
              </div>
              <div className="order-buttons">
                <button onClick={() => startOrder('hold')}>Hold</button>
                <button onClick={() => startOrder('advance', 'point')}>Advance…</button>
                <button onClick={() => startOrder('advance-cautious', 'point')}>Advance cautiously…</button>
                <button onClick={() => startOrder('charge', 'point')}>Charge…</button>
                <button onClick={() => startOrder('take-position', 'point')}>Take position…</button>
                <button onClick={() => startOrder('support', 'friendly')}>Support…</button>
                <button onClick={() => startOrder('screen-flank', 'point')}>Screen flank…</button>
                <button onClick={() => startOrder('harass')}>Harass</button>
                <button onClick={() => startOrder('pursue')}>Pursue</button>
                <button onClick={() => startOrder('rally')}>Rally</button>
                <button onClick={() => startOrder('protect-camp')}>Protect camp</button>
                <button onClick={() => startOrder('withdraw')}>Withdraw</button>
              </div>
              <div className="hint" style={{ marginTop: 8 }}>
                {selected.playerLed
                  ? 'You are with this formation. Your word is executed at once, as given.'
                  : `Orders go by ${'rider'}. They arrive when they arrive, and ${officer ? shortName(officer.name) : 'the officer'} will read them his own way.`}
              </div>
            </div>
          )}

          <div className="panel reports-panel">
            <h3>Reports</h3>
            <ReportLog
              reports={visibleReports(battle)}
              formatWhen={(t) => `${Math.floor(t / 3)}′`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function titleOf(outcome: string): string {
  return outcome.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}
