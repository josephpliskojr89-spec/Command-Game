import { useState } from 'react';
import type { CampaignState } from '../sim/types.ts';
import { actions } from '../store.ts';

// The years between wars: the family grows, ages, marries, and is lost —
// and then a courier arrives with a commission, because it always does.
export function InterludeScreen({ campaign, interlude }: {
  campaign: CampaignState;
  interlude: { years: number; beats: string[]; aideCandidateId?: string };
}) {
  const [bringAide, setBringAide] = useState(true);
  const aide = interlude.aideCandidateId
    ? campaign.personal.family.find((f) => f.id === interlude.aideCandidateId)
    : undefined;
  const p = campaign.personal;

  return (
    <div className="screen">
      <div className="aar-wrap" style={{ maxWidth: 760 }}>
        <h2 style={{ fontSize: 26 }}>The Years Between</h2>
        <div className="aar-outcome-sub">
          {p.career.chronicle[p.career.chronicle.length - 1]} · you have fought {p.career.warsFought} {p.career.warsFought === 1 ? 'war' : 'wars'} and won {p.career.warsWon}
        </div>

        <div className="panel chronicle">
          {interlude.beats.map((b, i) => <p key={i}>{b}</p>)}
          <p>
            And then, because it always does, a courier arrives with a commission bearing
            the ruler's seal. There is a new war. There is always a new war. You read it twice
            at the window{p.spouseName ? `, and ${p.spouseName} watches you read it, already knowing` : ''},
            and you call for your maps.
          </p>
        </div>

        <div className="panel">
          <h3>The Household, Now</h3>
          {p.family.filter((f) => f.role !== 'fallen').map((f) => (
            <div key={f.id} className="key-moment">
              {f.name}, {f.age} — {roleWord(f)}
              {f.notes.length > 0 && <span className="small"> · {f.notes[f.notes.length - 1]}</span>}
            </div>
          ))}
          {p.family.filter((f) => f.role === 'fallen').map((f) => (
            <div key={f.id} className="key-moment" style={{ color: '#d08070' }}>
              {f.name} — {f.notes[f.notes.length - 1] ?? 'gone'}
            </div>
          ))}
          {p.family.length === 0 && <div className="hint">No family. The maps are the household.</div>}
        </div>

        {aide && (
          <div className="panel">
            <h3>{aide.name} Wants to Come</h3>
            <p style={{ fontSize: 14 }}>
              He is {aide.age}, he rides well, and he has practiced your signature. An aide on
              your staff steadies every order you write — and rides real roads through a real war.
            </p>
            <div className="row">
              <button className={bringAide ? 'active' : ''} onClick={() => setBringAide(true)}>
                Bring him as your aide
              </button>
              <button className={!bringAide ? 'active' : ''} onClick={() => setBringAide(false)}>
                He stays home — and will not forgive it quickly
              </button>
            </div>
          </div>
        )}

        <div className="panel" style={{ textAlign: 'center' }}>
          <button
            className="primary"
            onClick={() => actions.startNewWar(aide && bringAide ? aide.id : undefined)}
          >
            Take the commission — a new war begins
          </button>
        </div>
      </div>
    </div>
  );
}

function roleWord(f: { role: string; weddedTo?: string }): string {
  switch (f.role) {
    case 'child': return 'at home';
    case 'aide': return 'serving on your staff';
    case 'junior-officer': return 'holding a commission';
    case 'wed-officer': return 'married into your officer corps';
    case 'wed-court': return 'married at court — your ears in the capital';
    default: return '';
  }
}
