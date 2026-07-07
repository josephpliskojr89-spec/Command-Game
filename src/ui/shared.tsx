import type { ReactNode } from 'react';
import type { Officer, Report } from '../sim/types.ts';

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

export function OfficerCard({ officer, extra }: { officer: Officer; extra?: ReactNode }) {
  return (
    <div className="officer-card">
      <div className="oc-head">
        <div className="initials">{initialsOf(officer.name)}</div>
        <div>
          <div className="oc-name">{officer.name}</div>
          <div className="oc-title">{officer.title}</div>
        </div>
      </div>
      <div className="epithet">“{officer.epithet}”</div>
      <div className="background">{officer.background}</div>
      {officer.deeds.length > 0 && (
        <div className="deeds">Known for: {officer.deeds[officer.deeds.length - 1]}</div>
      )}
      <div className="mood">{confidenceWord(officer)}</div>
      {extra}
    </div>
  );
}
