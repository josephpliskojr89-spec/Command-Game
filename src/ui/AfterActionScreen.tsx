import type { AfterAction, CampaignState } from '../sim/types.ts';
import { actions } from '../store.ts';

export function AfterActionScreen({ aar, campaign }: { aar: AfterAction; campaign: CampaignState }) {
  return (
    <div className="screen">
      <div className="aar-wrap">
        <h2>{aar.outcomeTitle}</h2>
        <div className="aar-outcome-sub">The battle of {campaign.placeName}, as the chronicle will tell it</div>

        <div className="panel chronicle">
          {aar.chronicle.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        <div className="cols">
          <div className="col-main">
            <div className="panel">
              <h3>The Officers, Judged</h3>
              {aar.officerVerdicts.map((v) => (
                <div key={v.officerId} className={`verdict ${v.grade}`}>
                  <div className="v-grade">{v.grade}</div>
                  {v.verdict}
                </div>
              ))}
            </div>
            <div className="panel">
              <h3>Decisive Moments</h3>
              {aar.keyMoments.length === 0 && <div className="hint">A quiet battle, as battles go.</div>}
              {aar.keyMoments.map((m, i) => <div key={i} className="key-moment">{m}</div>)}
            </div>
          </div>

          <div className="col-side">
            <div className="panel">
              <h3>The Cost</h3>
              <table className="casualty-table">
                <tbody>
                  <tr><td>Your army took the field</td><td>{aar.friendlyStart.toLocaleString()} men</td></tr>
                  <tr><td>Killed, scattered, or lost</td><td>{aar.friendlyLosses.toLocaleString()}</td></tr>
                  <tr><td>The enemy took the field</td><td>~{aar.enemyStart.toLocaleString()} men</td></tr>
                  <tr><td>Enemy losses (estimated)</td><td>~{aar.enemyLosses.toLocaleString()}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="panel">
              <h3>The Verdict from Above</h3>
              <p style={{ fontSize: 14 }}>{aar.rulerJudgment}</p>
              <p className="small">{aar.strategicResult}</p>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              <button className="primary" onClick={actions.newCampaign}>Take up a new command</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
