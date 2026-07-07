import { useState } from 'react';
import { shortName } from '../sim/officer.ts';
import type { AfterAction, CampaignState } from '../sim/types.ts';
import { actions } from '../store.ts';

export function AfterActionScreen({ aar, campaign }: { aar: AfterAction; campaign: CampaignState }) {
  return (
    <div className="screen">
      <div className="aar-wrap">
        <h2>{aar.outcomeTitle}</h2>
        <div className="aar-outcome-sub">
          The battle of {campaign.placeName} — operation {campaign.operation} of the war — as the chronicle will tell it
        </div>

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

            <JudgmentPanel aar={aar} campaign={campaign} />

            {(aar.personalNotes.length > 0 || aar.canWriteHome) && (
              <div className="panel">
                <h3>The Man, Not the General</h3>
                {aar.personalNotes.map((n, i) => (
                  <p key={i} style={{ fontSize: 13.5, margin: '6px 0' }}>{n}</p>
                ))}
                {aar.canWriteHome && !aar.letterSent && (
                  <div style={{ marginTop: 10 }}>
                    <div className="group-label" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 6 }}>
                      A courier leaves for home tonight. What do you write to {campaign.personal.spouseName}?
                    </div>
                    <div className="row">
                      <button onClick={() => actions.writeHome('honest')}>The truth, all of it</button>
                      <button onClick={() => actions.writeHome('heroic')}>The version with trumpets</button>
                      <button onClick={() => actions.writeHome('silent')}>Nothing. Not tonight</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {aar.casualtyNotes.length > 0 && (
              <div className="panel">
                <h3>Officers Fallen</h3>
                {aar.casualtyNotes.map((m, i) => <div key={i} className="key-moment">{m}</div>)}
              </div>
            )}

            {aar.grudgeNotes.length > 0 && (
              <div className="panel">
                <h3>Scores Opened, Scores Settled</h3>
                {aar.grudgeNotes.map((m, i) => <div key={i} className="key-moment">{m}</div>)}
                <div className="hint" style={{ marginTop: 6 }}>
                  Grudges do not end with the battle. The men who carry them will carry them onto the next field.
                </div>
              </div>
            )}

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
              <p className="small" style={{ fontStyle: 'italic' }}>{patienceWord(campaign.rulerPatience)}</p>
            </div>
            <div className="panel" style={{ textAlign: 'center' }}>
              {aar.warEndText ? (
                <>
                  <h3>{aar.warEnd === 'triumph' ? 'The War Is Won' : 'Relieved of Command'}</h3>
                  <p style={{ fontSize: 14, textAlign: 'left' }}>{aar.warEndText}</p>
                  <button className="primary" onClick={actions.newCampaign}>Begin a new war</button>
                </>
              ) : (
                <>
                  <button className="primary" onClick={actions.marchOn}>
                    March on — the war continues
                  </button>
                  <div className="hint" style={{ marginTop: 8 }}>
                    Same officers, same grudges, same memories — replacements for the dead, and an enemy that has learned you.
                  </div>
                  <button style={{ marginTop: 10 }} onClick={actions.newCampaign}>Abandon this war, start anew</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Praise and blame are bets placed on men whose numbers you cannot see.
// A just censure tightens a man; an unjust one curdles him.
function JudgmentPanel({ aar, campaign }: { aar: AfterAction; campaign: CampaignState }) {
  const [mode, setMode] = useState<'commend' | 'censure' | undefined>();
  const living = campaign.officers.filter((o) => !o.dead);
  if (aar.warEnd) return null;
  return (
    <div className="panel">
      <h3>Hand Down Judgment</h3>
      <div className="hint" style={{ marginBottom: 8 }}>
        You may commend one officer and censure one before the army. Both change the men — not always the way you intend.
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        {aar.commendedId === undefined ? (
          <button className={mode === 'commend' ? 'active' : ''} onClick={() => setMode(mode === 'commend' ? undefined : 'commend')}>
            Commend an officer…
          </button>
        ) : (
          <span className="small">Commended: {officerName(campaign, aar.commendedId)}</span>
        )}
        {aar.censuredId === undefined ? (
          <button className={mode === 'censure' ? 'active' : ''} onClick={() => setMode(mode === 'censure' ? undefined : 'censure')}>
            Censure an officer…
          </button>
        ) : (
          <span className="small">Censured: {officerName(campaign, aar.censuredId)}</span>
        )}
      </div>
      {mode && (
        <div className="row">
          {living.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                if (mode === 'commend') actions.commend(o.id);
                else actions.censure(o.id);
                setMode(undefined);
              }}
            >
              {o.title} {shortName(o.name)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function officerName(campaign: CampaignState, id: string): string {
  const o = campaign.officers.find((x) => x.id === id);
  return o ? `${o.title} ${shortName(o.name)}` : '—';
}

function patienceWord(p: number): string {
  if (p > 75) return 'Your standing at court has rarely been higher. Enjoy the feeling; it is made of weather.';
  if (p > 50) return 'Your standing at court holds. Letters still open with your titles.';
  if (p > 25) return 'Your standing at court is thinning. Certain letters now arrive unsigned.';
  return 'Your standing at court hangs by a thread. One more bad field will snap it.';
}
