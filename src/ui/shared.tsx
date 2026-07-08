import { useState, type ReactNode } from 'react';
import type { Officer, Report } from '../sim/types.ts';
import { shortName } from '../sim/officer.ts';

// Army-level trackers are shown as words and bars, never numbers —
// the general knows the mood of his army, not its statistics.
export function levelWord(v: number, kind: 'good-high' | 'bad-high'): string {
  const bands = kind === 'good-high'
    ? ['desperate', 'poor', 'shaky', 'steady', 'good', 'excellent']
    : ['fresh', 'light', 'noticeable', 'heavy', 'severe', 'crippling'];
  const idx = Math.min(5, Math.floor(v / 17));
  return bands[idx];
}

export function StatBar({ label, value, kind = 'good-high' }: {
  label: string; value: number; kind?: 'good-high' | 'bad-high';
}) {
  const pct = Math.max(2, Math.min(100, value));
  const good = kind === 'good-high' ? value : 100 - value;
  const color = good > 60 ? 'var(--good)' : good > 35 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div className="stat-row">
      <span className="label">{label}</span>
      <span className="word">{levelWord(value, kind)}</span>
      <div className="bar"><div style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

export function ReportLog({ reports, formatWhen }: {
  reports: Report[];
  formatWhen: (tick: number) => string;
}) {
  return (
    <div className="log">
      {reports.map((r) => (
        <div key={r.id} className={`log-entry${r.important ? ' important' : ''}`}>
          <span className="when">{formatWhen(r.tick)}</span>
          <span className="kind-tag">{r.kind}</span>
          {r.text}
        </div>
      ))}
    </div>
  );
}

export function confidenceWord(o: Officer): string {
  const c = o.confidence;
  if (c > 75) return 'He seems eager and sure of the plan — and of you.';
  if (c > 55) return 'He seems steady enough about the coming work.';
  if (c > 35) return 'He seems guarded. Something about the plan — or its author — has not convinced him.';
  return 'He seems openly doubtful. Watch how he reads your orders.';
}

export function initialsOf(name: string): string {
  return name
    .replace(/^(Sir|Lord)\s+/, '')
    .split(' ')
    .filter((w) => !['of', 'de', 'the'].includes(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
}

export function officerBadges(o: Officer): ReactNode {
  return (
    <>
      {o.dead && <span className="badge dead"> fallen</span>}
      {!o.dead && o.wounded && <span className="badge wounded"> wounded</span>}
      {o.fresh && <span className="badge fresh"> unknown quantity</span>}
      {o.familyId && <span className="badge kin"> your son</span>}
      {o.kinById && <span className="badge kin"> kin by marriage</span>}
    </>
  );
}

// A compact roster card. Click it to open the full record.
export function OfficerCard({ officer, extra, onOpen }: {
  officer: Officer; extra?: ReactNode; onOpen?: (o: Officer) => void;
}) {
  return (
    <div
      className={`officer-card${onOpen ? ' clickable' : ''}`}
      style={officer.dead ? { opacity: 0.55 } : undefined}
      onClick={onOpen ? () => onOpen(officer) : undefined}
    >
      <div className="oc-head">
        <div className="initials">{initialsOf(officer.name)}</div>
        <div>
          <div className="oc-name">{officer.name}{officerBadges(officer)}</div>
          <div className="oc-title">{officer.title}</div>
        </div>
      </div>
      <div className="epithet">“{officer.epithet}” <span className="rep-tag">— his reputation</span></div>
      <div className="background">{officer.background}</div>
      {officer.observations.length > 0 && (
        <div className="observations">
          <div className="obs-label">What you have seen with your own eyes:</div>
          {officer.observations.slice(-3).map((o, i) => <div key={i} className="obs-line">· {o}</div>)}
          {officer.observations.length > 3 && (
            <div className="obs-line more">· …and {officer.observations.length - 3} more</div>
          )}
        </div>
      )}
      {officer.grudges.length > 0 && (
        <div className="grudges">
          {officer.grudges.slice(-2).map((g, i) => (
            <div key={i} className="grudge-line">
              {g.kind === 'triumph' ? '⚑' : '✕'} {g.note}
            </div>
          ))}
        </div>
      )}
      {officer.deeds.length > 0 && (
        <div className="deeds">Known for: {officer.deeds[officer.deeds.length - 1]}</div>
      )}
      {!officer.dead && <div className="mood">{confidenceWord(officer)}</div>}
      {onOpen && <div className="oc-open-hint">Click for the full record →</div>}
      {extra}
    </div>
  );
}

// The full log: everything you know, everything he has done. No numbers.
export function OfficerDossier({ officer, onClose }: { officer: Officer; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal dossier" onClick={(e) => e.stopPropagation()}>
        <div className="oc-head" style={{ marginBottom: 12 }}>
          <div className="initials">{initialsOf(officer.name)}</div>
          <div>
            <div className="oc-name" style={{ fontSize: 18 }}>{officer.name}{officerBadges(officer)}</div>
            <div className="oc-title">{officer.title}</div>
          </div>
        </div>

        <div className="dossier-section">
          <div className="ds-label">What the world says of him</div>
          <div className="epithet">“{officer.epithet}”</div>
          <div className="background">{officer.background}</div>
        </div>

        <div className="dossier-section">
          <div className="ds-label">What you have seen with your own eyes</div>
          {officer.observations.length > 0 ? (
            officer.observations.map((o, i) => <div key={i} className="obs-line">· {o}</div>)
          ) : (
            <div className="hint">Nothing yet. You have not seen him tested — his reputation is all you have to go on, and reputations lie.</div>
          )}
        </div>

        {officer.grudges.length > 0 && (
          <div className="dossier-section">
            <div className="ds-label">Old scores, kept</div>
            {officer.grudges.map((g, i) => (
              <div key={i} className="grudge-line">{g.kind === 'triumph' ? '⚑' : '✕'} {g.note}</div>
            ))}
          </div>
        )}

        <div className="dossier-section">
          <div className="ds-label">Record of service</div>
          {officer.deeds.length > 0 ? (
            officer.deeds.map((d, i) => <div key={i} className="obs-line">· {d}</div>)
          ) : (
            <div className="hint">No deed worth a chronicler's ink. Not yet.</div>
          )}
        </div>

        {!officer.dead && (
          <div className="dossier-section">
            <div className="ds-label">His mood, as you read it</div>
            <div className="mood">{confidenceWord(officer)}</div>
          </div>
        )}

        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// A floating summary shown when hovering an officer's name in a picker.
function OfficerHoverCard({ officer, rect }: { officer: Officer; rect: DOMRect }) {
  const width = 330;
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 800;
  let left = rect.right + 10;
  if (left + width > vpW - 10) left = rect.left - width - 10;
  if (left < 10) left = 10;
  const maxH = 360;
  let top = rect.top;
  if (top + maxH > vpH - 10) top = Math.max(10, vpH - maxH - 10);
  return (
    <div className="officer-hovercard" style={{ left, top, width }}>
      <div className="hc-name">{officer.name}{officerBadges(officer)}</div>
      <div className="hc-title">{officer.title}</div>
      <div className="epithet" style={{ marginTop: 4 }}>“{officer.epithet}” <span className="rep-tag">— reputation</span></div>
      {officer.observations.length > 0 ? (
        <div className="observations" style={{ marginTop: 6 }}>
          <div className="obs-label">What you remember</div>
          {officer.observations.map((o, i) => <div key={i} className="obs-line">· {o}</div>)}
        </div>
      ) : (
        <div className="hint" style={{ marginTop: 6 }}>You have not seen him tested. His reputation is all you have.</div>
      )}
      {officer.grudges.length > 0 && (
        <div className="grudges" style={{ marginTop: 6 }}>
          {officer.grudges.map((g, i) => (
            <div key={i} className="grudge-line">{g.kind === 'triumph' ? '⚑' : '✕'} {g.note}</div>
          ))}
        </div>
      )}
      {!officer.dead && <div className="mood" style={{ marginTop: 6 }}>{confidenceWord(officer)}</div>}
    </div>
  );
}

// An officer-selection button that reveals your notes on hover.
export function OfficerPickButton({ officer, active, onClick, label, className }: {
  officer: Officer; active?: boolean; onClick: () => void; label?: ReactNode; className?: string;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  return (
    <>
      <button
        className={`${className ?? ''}${active ? ' active' : ''}`.trim()}
        onClick={onClick}
        onMouseEnter={(e) => setRect(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setRect(null)}
      >
        {label ?? <>{officer.title} {shortName(officer.name)}</>}
      </button>
      {rect && <OfficerHoverCard officer={officer} rect={rect} />}
    </>
  );
}
