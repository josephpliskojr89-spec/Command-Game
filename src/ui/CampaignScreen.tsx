import { useState } from 'react';
import { ERAS } from '../sim/era.ts';
import { shortName } from '../sim/officer.ts';
import type { CampaignState } from '../sim/types.ts';
import type { EngagementApproach, MarchChoices } from '../sim/campaign.ts';
import { actions } from '../store.ts';
import { OfficerCard, ReportLog, StatBar } from './shared.tsx';

const WEATHER_LABEL: Record<string, string> = {
  clear: 'Clear skies', rain: 'Rain', heat: 'Heat', fog: 'Fog',
};

export function CampaignScreen({ campaign }: { campaign: CampaignState }) {
  const era = ERAS[campaign.era];
  const [pace, setPace] = useState<MarchChoices['pace']>('steady');
  const [supply, setSupply] = useState<MarchChoices['supply']>('ration');
  const [scouts, setScouts] = useState<MarchChoices['scouts']>('close');
  const arrived = campaign.distance <= 0;

  return (
    <div className="screen">
      <div className="cols">
        <div className="col-main">
          <div className="panel">
            <h3>Strategic Orders — from {era.rulerTitle}</h3>
            <p style={{ margin: 0 }}>{campaign.objectiveText}</p>
          </div>

          <div className="panel">
            <h3>
              Day {campaign.day} — {arrived
                ? `the enemy is ahead, near ${campaign.placeName}`
                : `${campaign.distance} day${campaign.distance === 1 ? '' : 's'}' march to ${campaign.placeName}`}
            </h3>
            <div className="row" style={{ marginBottom: 12 }}>
              <span className="small">Weather: {WEATHER_LABEL[campaign.weather]}</span>
              <span className="small">· Food for about {Math.max(0, Math.round(campaign.food))} days</span>
              {campaign.stragglers > 0 && <span className="small">· ~{campaign.stragglers} stragglers lost on the march</span>}
            </div>

            {!arrived && (
              <>
                {campaign.pendingEngagement && <div className="hint" style={{ marginBottom: 10 }}>A fight has found the column. Deal with it before the army can move.</div>}
                <Choice
                  label="Pace"
                  value={pace}
                  onChange={setPace}
                  options={[
                    ['steady', 'Steady march'],
                    ['forced', 'Forced march'],
                    ['rest', 'Rest the army'],
                  ]}
                />
                <Choice
                  label="Supply"
                  value={supply}
                  onChange={setSupply}
                  options={[
                    ['ration', 'Eat from the wagons'],
                    ['forage', 'Send foraging parties'],
                  ]}
                />
                <Choice
                  label="Scouts"
                  value={scouts}
                  onChange={setScouts}
                  options={[
                    ['close', 'Keep scouts close'],
                    ['wide', 'Scout wide'],
                  ]}
                />
                <button
                  className="primary"
                  disabled={!!campaign.pendingEvent || !!campaign.pendingEngagement}
                  onClick={() => actions.marchDay({ pace, supply, scouts })}
                >
                  Give the order — march
                </button>
                {(campaign.pendingEvent || campaign.pendingEngagement) && <span className="small" style={{ marginLeft: 10 }}>A matter requires your decision first.</span>}
              </>
            )}
            {arrived && (
              <>
                <p>
                  The scouts have found {campaign.enemyName}. The army halts within a half-day's
                  march of the enemy. Tonight you must choose your ground.
                </p>
                <button className="primary" onClick={actions.toCampPhase}>Approach and make camp</button>
              </>
            )}
          </div>

          <div className="panel">
            <h3>The Army</h3>
            <StatBar label="Morale" value={campaign.morale} />
            <StatBar label="Cohesion" value={campaign.cohesion} />
            <StatBar label="Supplies" value={campaign.supplies} />
            <StatBar label="Fatigue" value={campaign.fatigue} kind="bad-high" />
            <StatBar label="Intelligence" value={campaign.intel} />
            <div className="hint" style={{ marginTop: 8 }}>
              You know your army the way a rider knows a horse — by feel, not by figures.
            </div>
          </div>
        </div>

        <div className="col-side">
          <div className="panel">
            <h3>Dispatches &amp; The March</h3>
            <ReportLog reports={campaign.log} formatWhen={(d) => `Day ${d}`} />
          </div>
          <div className="panel">
            <h3>Council of Officers</h3>
            {campaign.officers.map((o) => (
              <OfficerCard key={o.id} officer={o} />
            ))}
          </div>
        </div>
      </div>

      {campaign.pendingEvent && !campaign.pendingEngagement && (
        <div className="modal-back">
          <div className="modal">
            <h3>{campaign.pendingEvent.title}</h3>
            <div className="event-text">{campaign.pendingEvent.text}</div>
            {campaign.pendingEvent.options.map((o) => (
              <button key={o.apply} className="event-opt" onClick={() => actions.chooseEventOption(o.apply)}>
                <span className="opt-label">{o.label}</span>
                <span className="opt-detail">{o.detail}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {campaign.pendingEngagement && <EngagementModal campaign={campaign} />}
    </div>
  );
}

// A vanguard action: put a name on the fight, and a manner on the name.
// The man's TRUE quality decides it — his reputation only decides what
// you expected.
function EngagementModal({ campaign }: { campaign: CampaignState }) {
  const eng = campaign.pendingEngagement!;
  const [officerId, setOfficerId] = useState<string | undefined>();
  const [approach, setApproach] = useState<EngagementApproach>('storm');
  const available = campaign.officers.filter((o) => !o.dead && !o.wounded);
  const chosen = campaign.officers.find((o) => o.id === officerId);
  return (
    <div className="modal-back">
      <div className="modal" style={{ maxWidth: 640 }}>
        <h3>{eng.title}</h3>
        <div className="event-text">{eng.text}</div>
        <div className="hint" style={{ marginBottom: 10 }}>{eng.stakes}</div>
        <div className="choice-group">
          <div className="group-label">Who leads the detachment?</div>
          <div className="opts">
            {available.map((o) => (
              <button
                key={o.id}
                className={officerId === o.id ? 'active' : ''}
                onClick={() => setOfficerId(o.id)}
              >
                {o.title} {shortName(o.name)}
              </button>
            ))}
          </div>
          {chosen && (
            <div className="small" style={{ marginTop: 6, fontStyle: 'italic' }}>
              “{chosen.epithet}” {chosen.observations.length > 0 && <span>— though you have seen things the epithet leaves out.</span>}
            </div>
          )}
        </div>
        <div className="choice-group">
          <div className="group-label">In what manner?</div>
          <div className="opts">
            <button className={approach === 'storm' ? 'active' : ''} onClick={() => setApproach('storm')}>
              Storm it — speed and steel
            </button>
            <button className={approach === 'maneuver' ? 'active' : ''} onClick={() => setApproach('maneuver')}>
              Maneuver — patience and ground
            </button>
          </div>
        </div>
        <button
          className="primary"
          disabled={!officerId}
          onClick={() => officerId && actions.resolveEngagement(officerId, approach)}
        >
          Send him
        </button>
      </div>
    </div>
  );
}

function Choice<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <div className="choice-group">
      <div className="group-label">{label}</div>
      <div className="opts">
        {options.map(([v, text]) => (
          <button key={v} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
