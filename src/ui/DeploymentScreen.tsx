import { useState } from 'react';
import { FORMATIONS, ERAS } from '../sim/era.ts';
import { shortName } from '../sim/officer.ts';
import type { BattleState, CampaignState } from '../sim/types.ts';
import { actions } from '../store.ts';
import { BattleMap } from './BattleMap.tsx';
import { enemyEstimate } from '../sim/campaign.ts';

export function DeploymentScreen({ battle, campaign, assignments, personalCommand }: {
  battle: BattleState;
  campaign: CampaignState;
  assignments: Record<string, string>;
  personalCommand: string;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const era = ERAS[campaign.era];

  return (
    <div className="screen no-pad">
      <div className="battle-wrap">
        <div className="battle-map-area">
          <div className="time-controls">
            <span className="small">
              Deployment — select a formation, then click the blue ground to place it.
            </span>
            <span className="spacer" />
            <button className="primary" onClick={actions.beginBattle}>Sound the advance — begin the battle</button>
          </div>
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <BattleMap
              battle={battle}
              campaign={campaign}
              selectedId={selectedId}
              mode="deploy"
              onSelect={(id) => {
                if (id && battle.units.find((u) => u.id === id)?.side === 'friend') setSelectedId(id);
              }}
              onMapClick={(x, y) => {
                if (selectedId) actions.moveDeployment(selectedId, x, y);
              }}
            />
          </div>
        </div>

        <div className="battle-side" style={{ overflowY: 'auto' }}>
          <div className="panel">
            <h3>Commands</h3>
            <div className="hint" style={{ marginBottom: 8 }}>
              Assign an officer to each formation. You know these men by reputation and by
              the road behind you — not by numbers.
            </div>
            {FORMATIONS.map((f) => {
              const unit = battle.units.find((u) => u.id === f.id)!;
              const officer = campaign.officers.find((o) => o.id === assignments[f.id]);
              return (
                <div
                  key={f.id}
                  className={`unit-chip${selectedId === f.id ? ' selected' : ''}`}
                  onClick={() => setSelectedId(f.id)}
                >
                  <span className="swatch" style={{
                    background: '#5b8fc4',
                    borderRadius: f.cls === 'ranged' ? '50%' : 0,
                    clipPath: f.cls === 'cavalry' ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined,
                  }} />
                  <span>{era.formationLabels[f.role]} · <span className="small">{unit.men} men</span></span>
                  <span className="spacer" />
                  <select
                    value={assignments[f.id]}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => actions.assignOfficer(f.id, e.target.value)}
                  >
                    {campaign.officers.map((o) => (
                      <option key={o.id} value={o.id}>{o.title} {shortName(o.name)}</option>
                    ))}
                  </select>
                </div>
              );
            })}
            {selectedId && (
              <OfficerPreview campaign={campaign} officerId={assignments[selectedId]} />
            )}
          </div>

          <div className="panel">
            <h3>Your Place in the Line</h3>
            <div className="hint" style={{ marginBottom: 8 }}>
              Command from headquarters and see the whole field through riders — or lead one
              formation yourself. Where you stand, men fight harder and orders are instant.
              Everywhere else, your officers are on their own.
            </div>
            <div className="row">
              <button className={personalCommand === 'hq' ? 'active' : ''} onClick={() => actions.setPersonalCommand('hq')}>
                Remain at headquarters
              </button>
              {FORMATIONS.map((f) => (
                <button
                  key={f.id}
                  className={personalCommand === f.id ? 'active' : ''}
                  onClick={() => actions.setPersonalCommand(f.id)}
                >
                  Lead the {era.formationLabels[f.role].split('—').pop()?.trim()}
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <h3>Intelligence</h3>
            {enemyEstimate(campaign).map((line, i) => (
              <p key={i} style={{ margin: '4px 0', fontSize: 13 }}>{line}</p>
            ))}
            <div className="hint">
              Red markers show the enemy where your scouts last placed them. Faded markers
              are guesses, not facts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfficerPreview({ campaign, officerId }: { campaign: CampaignState; officerId?: string }) {
  const o = campaign.officers.find((x) => x.id === officerId);
  if (!o) return null;
  return (
    <div style={{ marginTop: 8, fontSize: 13 }}>
      <b>{o.title} {o.name}</b>
      <div style={{ fontStyle: 'italic' }}>“{o.epithet}”</div>
      <div className="small">{o.background}</div>
    </div>
  );
}
