import { useState } from 'react';
import { ERAS } from '../sim/era.ts';
import { enemyEstimate } from '../sim/campaign.ts';
import { shortName } from '../sim/officer.ts';
import type { CampaignState } from '../sim/types.ts';
import { actions } from '../store.ts';
import { OfficerPickButton, ReportLog, StatBar } from './shared.tsx';

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
              {campaign.councilProposals && campaign.endorsedOfficerId === undefined && (
                <CouncilPanel campaign={campaign} />
              )}
              {campaign.cavHint && (
                <p className="small" style={{ color: 'var(--gold)' }}>
                  The plan you endorsed expects the enemy horse on your {campaign.cavHint}. Your map now says so too.
                </p>
              )}
              <button className="primary" disabled={!!campaign.pendingChallenge} onClick={actions.toDeployment}>
                Dawn — deploy the army
              </button>
              {campaign.pendingChallenge && <span className="small" style={{ marginLeft: 10 }}>There is a man outside the camp who requires an answer first.</span>}
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

      {campaign.pendingChallenge && campChosen && <ChallengeModal campaign={campaign} />}
    </div>
  );
}

// The council of war: three men argue three battles. Endorsing one is a
// public act of trust in a judgment you cannot verify until it is tested.
function CouncilPanel({ campaign }: { campaign: CampaignState }) {
  return (
    <div style={{ margin: '10px 0', padding: '10px 12px', background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: 4 }}>
      <div className="group-label" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 8 }}>
        The council speaks. Whose reading of the battle do you endorse?
      </div>
      {campaign.councilProposals!.map((p) => {
        const o = campaign.officers.find((x) => x.id === p.officerId)!;
        return (
          <OfficerPickButton
            key={p.officerId}
            officer={o}
            className="event-opt council-proposal"
            onClick={() => actions.endorse(p.officerId)}
            label={<>
              <span className="opt-label">{o.title} {shortName(o.name)}</span>
              <span className="opt-detail">{p.summary}</span>
            </>}
          />
        );
      })}
      <button style={{ width: '100%' }} onClick={() => actions.endorse('')}>
        Thank them all and endorse no one
      </button>
      <div className="hint" style={{ marginTop: 6 }}>
        The man you endorse will fight tomorrow with your trust at his back — and his claim about the enemy horse will be drawn onto your map, true or not.
      </div>
    </div>
  );
}

// A champion between the lines. Honor cultures keep books, and the whole
// army is the audience.
function ChallengeModal({ campaign }: { campaign: CampaignState }) {
  const champion = campaign.enemyOfficers.find((o) => o.id === campaign.pendingChallenge!.enemyOfficerId)!;
  const available = campaign.officers.filter((o) => !o.dead && !o.wounded);
  return (
    <div className="modal-back">
      <div className="modal" style={{ maxWidth: 640 }}>
        <h3>A Challenge Between the Lines</h3>
        <div className="event-text">
          {champion.name}, {champion.title}, rides the length of your pickets at a walk, calling for any officer
          who dares meet him alone between the armies. Scouts say he is {champion.epithet}. The men have stopped
          eating to watch what you do.
        </div>
        <div className="choice-group">
          <div className="group-label">Who answers? <span className="small">(hover a name for what you know of him)</span></div>
          <div className="opts">
            {available.map((o) => (
              <OfficerPickButton key={o.id} officer={o} onClick={() => actions.resolveChallenge(o.id)} />
            ))}
          </div>
        </div>
        <button className="danger" style={{ width: '100%' }} onClick={() => actions.resolveChallenge('refuse')}>
          No one. This is theater, and I will not spend an officer on it.
        </button>
        <div className="hint" style={{ marginTop: 6 }}>
          Victory would put fire in the whole army. Defeat would cost you a man and the men their supper's worth of confidence. Refusal is free — unless one of your prouder officers decides it isn't.
        </div>
      </div>
    </div>
  );
}
