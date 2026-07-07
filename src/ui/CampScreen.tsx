import { useState } from 'react';
import { ERAS } from '../sim/era.ts';
import { enemyEstimate } from '../sim/campaign.ts';
import type { CampaignState } from '../sim/types.ts';
import { actions } from '../store.ts';
import { ReportLog, StatBar } from './shared.tsx';

export function CampScreen({ campaign }: { campaign: CampaignState }) {
  const era = ERAS[campaign.era];
  const [placement, setPlacement] = useState<'hill' | 'river' | 'road'>('hill');
  const [fortified, setFortified] = useState(true);
  const [scouted, setScouted] = useState(false);
  const campChosen = !!campaign.campPlacement;

  return (
    <div className="screen">
      <div className="cols">
        <div className="col-main">
          <div className="panel">
            <h3>The Eve of Battle</h3>
            <p>
              {campaign.enemyName} lies beyond the low ground near {campaign.placeName}.
              Tomorrow there will be a battle, unless one side loses its nerve tonight.
              The decisions you make now will shape everything that follows.
            </p>
          </div>

          {!campChosen ? (
            <div className="panel">
              <h3>Choose Your Camp</h3>
              <div className="choice-group">
                <div className="opts" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <button className={placement === 'hill' ? 'active' : ''} onClick={() => setPlacement('hill')} style={{ textAlign: 'left' }}>
                    <b>The high ground</b> — sentries see everything; the men sleep confident. Water must be carried.
                  </button>
                  <button className={placement === 'river' ? 'active' : ''} onClick={() => setPlacement('river')} style={{ textAlign: 'left' }}>
                    <b>By the water</b> — men and horses rest well. Soft ground, morning mist.
                  </button>
                  <button className={placement === 'road' ? 'active' : ''} onClick={() => setPlacement('road')} style={{ textAlign: 'left' }}>
                    <b>Astride the road</b> — supply flows easily. So would a retreat.
                  </button>
                </div>
              </div>
              <div className="choice-group">
                <div className="group-label">Fortification</div>
                <div className="opts">
                  <button className={fortified ? 'active' : ''} onClick={() => setFortified(true)}>
                    Dig a fortified camp (tiring, but the men sleep behind a ditch)
                  </button>
                  <button className={!fortified ? 'active' : ''} onClick={() => setFortified(false)}>
                    Marching camp only (rest the men, trust the sentries)
                  </button>
                </div>
              </div>
              <button className="primary" onClick={() => actions.chooseCamp(placement, fortified)}>
                Make camp
              </button>
            </div>
          ) : (
            <div className="panel">
              <h3>The Night Before</h3>
              <p className="hint">The camp is set. What remains of the night is yours to spend.</p>
              <div className="row" style={{ marginBottom: 10 }}>
                <button
                  disabled={scouted}
                  onClick={() => { actions.scoutFinal(); setScouted(true); }}
                >
                  Send out a final scouting party
                </button>
                <button disabled={campaign.heldCouncil} onClick={actions.council}>
                  Hold a council of war with your officers
                </button>
              </div>
              <button className="primary" onClick={actions.toDeployment}>
                Dawn — deploy the army
              </button>
            </div>
          )}

          <div className="panel">
            <h3>What You Know of the Enemy</h3>
            {enemyEstimate(campaign).map((line, i) => (
              <p key={i} style={{ margin: '4px 0' }}>{line}</p>
            ))}
            <div className="hint">
              Estimates are only as good as your scouting. The enemy you deploy against
              tomorrow may not be the enemy on this page.
            </div>
          </div>

          <div className="panel">
            <h3>The Army Tonight</h3>
            <StatBar label="Morale" value={campaign.morale} />
            <StatBar label="Cohesion" value={campaign.cohesion} />
            <StatBar label="Fatigue" value={campaign.fatigue} kind="bad-high" />
            <StatBar label="Intelligence" value={campaign.intel} />
          </div>
        </div>

        <div className="col-side">
          <div className="panel">
            <h3>Dispatches</h3>
            <ReportLog reports={campaign.log} formatWhen={(d) => `Day ${d}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
