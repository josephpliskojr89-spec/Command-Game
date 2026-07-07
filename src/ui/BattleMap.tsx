// The 2D battlefield. Simple shapes only: squares for foot, triangles for
// horse, circles for missile troops. Blue is yours; red is theirs — and
// red is only drawn where your army can actually see it.

import type { MouseEvent } from 'react';
import { DEPLOY_Y, MAP_H, MAP_W, playerPosition } from '../sim/battle.ts';
import type { BattleState, CampaignState, TerrainFeature, Unit } from '../sim/types.ts';
import { shortName } from '../sim/officer.ts';

const FRIEND = '#5b8fc4';
const ENEMY = '#c05a45';

interface Props {
  battle: BattleState;
  campaign: CampaignState;
  selectedId?: string;
  mode: 'deploy' | 'battle';
  targeting?: boolean;
  onSelect: (unitId: string | undefined) => void;
  onMapClick: (x: number, y: number) => void;
}

export function BattleMap({ battle, campaign, selectedId, mode, targeting, onSelect, onMapClick }: Props) {
  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    onMapClick(p.x, p.y);
  };

  const selected = battle.units.find((u) => u.id === selectedId);

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      preserveAspectRatio="xMidYMid meet"
      onClick={handleClick}
      style={{ cursor: targeting ? 'crosshair' : 'default' }}
    >
      <defs>
        <pattern id="rough-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#4d4433" strokeWidth="2" />
        </pattern>
      </defs>

      {/* ground */}
      <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#2a3320" />
      {battle.terrain.map((t, i) => <Terrain key={i} t={t} />)}

      {/* deployment zone */}
      {mode === 'deploy' && (
        <>
          <rect x="0" y={DEPLOY_Y} width={MAP_W} height={MAP_H - DEPLOY_Y} fill="#5b8fc4" opacity="0.07" />
          <line x1="0" y1={DEPLOY_Y} x2={MAP_W} y2={DEPLOY_Y} stroke="#5b8fc4" strokeDasharray="10 6" opacity="0.5" />
          <text x={12} y={DEPLOY_Y + 20} fill="#5b8fc4" fontSize="14" opacity="0.8">your deployment ground</text>
        </>
      )}

      {/* order target line for selected unit */}
      {selected && selected.side === 'friend' && selected.order.target && (
        <line
          x1={selected.x} y1={selected.y}
          x2={selected.order.target.x} y2={selected.order.target.y}
          stroke="#d8cdb4" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.55"
        />
      )}

      {/* enemy units: only what is known */}
      {battle.units.filter((u) => u.side === 'enemy').map((u) => {
        const k = battle.known[u.id];
        if (!k || u.routed && !k.visibleNow) return null;
        const ghost = !k.visibleNow;
        return (
          <UnitGlyph
            key={u.id}
            unit={u}
            x={k.x} y={k.y}
            color={ENEMY}
            ghost={ghost}
            identified={k.identified}
            selected={false}
            label={ghost ? (k.identified ? 'last seen' : 'unknown force') : enemyShortLabel(u)}
            onClick={() => onSelect(u.id)}
          />
        );
      })}

      {/* friendly units */}
      {battle.units.filter((u) => u.side === 'friend' && !u.routed).map((u) => {
        const officer = campaign.officers.find((o) => o.id === u.officerId);
        return (
          <UnitGlyph
            key={u.id}
            unit={u}
            x={u.x} y={u.y}
            color={FRIEND}
            ghost={false}
            identified
            selected={u.id === selectedId}
            label={`${officer ? shortName(officer.name) : ''}${u.playerLed ? ' ★' : ''}`}
            sublabel={u.status !== 'idle' ? u.status : undefined}
            onClick={() => onSelect(u.id)}
          />
        );
      })}

      {/* messengers */}
      {battle.messengers.filter((m) => m.state === 'outbound' || m.state === 'returning').map((m) => (
        <g key={m.id} transform={`translate(${m.x} ${m.y})`}>
          <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#e8dcbd" stroke="#16130e" strokeWidth="1" />
        </g>
      ))}
      {battle.messengers.filter((m) => m.state === 'killed' && m.diedTick).map((m) => (
        <text key={m.id} x={m.x} y={m.y} fill="#c0563f" fontSize="16" textAnchor="middle">✕</text>
      ))}

      {/* the general */}
      <GeneralBanner battle={battle} />
    </svg>
  );
}

function enemyShortLabel(u: Unit): string {
  const m = u.name.match(/—\s*(.+)$/);
  return m ? m[1] : u.name;
}

function Terrain({ t }: { t: TerrainFeature }) {
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  switch (t.kind) {
    case 'hill':
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={t.w / 2} ry={t.h / 2} fill="#4a4a33" opacity="0.75" />
          <ellipse cx={cx} cy={cy} rx={t.w / 3.2} ry={t.h / 3.2} fill="#575740" opacity="0.8" />
          <text x={cx} y={cy + 4} textAnchor="middle" fill="#9a8f78" fontSize="12">{t.label}</text>
        </g>
      );
    case 'woods':
      return (
        <g>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="18" fill="#1f2e18" />
          {[0.2, 0.5, 0.8].map((fx) =>
            [0.25, 0.7].map((fy) => (
              <circle key={`${fx}-${fy}`} cx={t.x + t.w * fx} cy={t.y + t.h * fy} r="10" fill="#2c3f20" />
            )),
          )}
          <text x={cx} y={cy + 4} textAnchor="middle" fill="#6f7f5c" fontSize="12">{t.label}</text>
        </g>
      );
    case 'stream':
      return (
        <g>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="#33505e" />
          <text x={t.x + 40} y={cy + 4} fill="#7d9aa8" fontSize="12">{t.label}</text>
        </g>
      );
    case 'ford':
      return (
        <g>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="#4a6472" />
          <text x={cx} y={t.y - 4} textAnchor="middle" fill="#7d9aa8" fontSize="11">{t.label}</text>
        </g>
      );
    case 'road':
      return <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="#4d4433" opacity="0.55" />;
    case 'rough':
      return (
        <g>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="12" fill="url(#rough-hatch)" opacity="0.5" />
          <text x={cx} y={cy + 4} textAnchor="middle" fill="#7a6f58" fontSize="11">{t.label}</text>
        </g>
      );
    case 'camp':
    case 'enemy-camp':
      return (
        <g>
          <rect
            x={t.x} y={t.y} width={t.w} height={t.h}
            fill={t.kind === 'camp' ? '#3a3423' : '#402a20'}
            stroke={t.kind === 'camp' ? '#7a6f45' : '#7a4a3a'}
            strokeDasharray="5 3"
          />
          <text x={cx} y={cy + 4} textAnchor="middle" fill="#9a8f78" fontSize="12">{t.label}</text>
        </g>
      );
  }
}

function UnitGlyph({ unit, x, y, color, ghost, identified, selected, label, sublabel, onClick }: {
  unit: Unit; x: number; y: number; color: string; ghost: boolean; identified: boolean;
  selected: boolean; label?: string; sublabel?: string; onClick: () => void;
}) {
  const size = Math.max(14, Math.sqrt(Math.max(unit.men, 30)) * 1.5);
  const opacity = ghost ? 0.35 : unit.status === 'routing' ? 0.6 : 1;
  const stroke =
    selected ? '#c9a44c'
    : unit.playerLed ? '#e0c060'
    : unit.status === 'wavering' ? '#d9b13b'
    : unit.status === 'routing' ? '#e05a3f'
    : '#111';
  const strokeWidth = selected || unit.playerLed ? 2.5 : 1.2;
  const dash = ghost ? '4 3' : undefined;

  let shape;
  if (!identified) {
    shape = <circle r={size * 0.5} fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 4" />;
  } else if (unit.cls === 'infantry') {
    shape = (
      <rect
        x={-size * 0.75} y={-size * 0.3} width={size * 1.5} height={size * 0.6}
        fill={color} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash}
        transform={`rotate(${(unit.facing * 180) / Math.PI + 90})`}
      />
    );
  } else if (unit.cls === 'cavalry') {
    const s = size * 0.75;
    shape = (
      <polygon
        points={`0,${-s} ${s * 0.9},${s * 0.7} ${-s * 0.9},${s * 0.7}`}
        fill={color} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash}
        transform={`rotate(${(unit.facing * 180) / Math.PI + 90})`}
      />
    );
  } else {
    shape = <circle r={size * 0.45} fill={color} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} />;
  }

  return (
    <g
      transform={`translate(${x} ${y})`}
      opacity={opacity}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ cursor: 'pointer' }}
    >
      {shape}
      {/* facing tick */}
      {identified && !ghost && (
        <line
          x1="0" y1="0"
          x2={Math.cos(unit.facing) * (size * 0.9)}
          y2={Math.sin(unit.facing) * (size * 0.9)}
          stroke="#e8dcbd" strokeWidth="1.5" opacity="0.7"
        />
      )}
      {label && (
        <text y={size * 0.75 + 12} textAnchor="middle" fill="#d8cdb4" fontSize="11" style={{ pointerEvents: 'none' }}>
          {label}
        </text>
      )}
      {sublabel && (
        <text y={size * 0.75 + 24} textAnchor="middle" fill="#9a8f78" fontSize="10" fontStyle="italic" style={{ pointerEvents: 'none' }}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

function GeneralBanner({ battle }: { battle: BattleState }) {
  const p = playerPosition(battle);
  const atHq = !battle.playerUnitId;
  return (
    <g transform={`translate(${p.x} ${p.y - (atHq ? 0 : 26)})`} style={{ pointerEvents: 'none' }}>
      <line x1="0" y1="0" x2="0" y2="-22" stroke="#c9a44c" strokeWidth="2" />
      <polygon points="0,-22 16,-17 0,-12" fill="#c9a44c" />
      {atHq && (
        <text y={14} textAnchor="middle" fill="#c9a44c" fontSize="11">HQ</text>
      )}
    </g>
  );
}
