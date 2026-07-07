import { ERA_LIST } from '../sim/era.ts';
import { actions } from '../store.ts';

export function TitleScreen() {
  return (
    <div className="screen">
      <div className="title-wrap">
        <h2>The General's Burden</h2>
        <div className="tagline">A game of command friction</div>
        <p className="fantasy">
          “I am not moving an army.<br />I am trying to command one.”
        </p>
        <p>
          You will not control your soldiers. You will issue orders to officers —
          proud, cautious, ambitious, frightened men — and those orders will travel
          by rider, arrive late or not at all, and be interpreted by whoever receives them.
          Your plan is only the first draft of the battle.
        </p>
        <p style={{ marginTop: 28 }}>
          <button className="primary" onClick={actions.toEraSelect}>Begin a Campaign</button>
        </p>
      </div>
    </div>
  );
}

export function EraSelectScreen() {
  return (
    <div className="screen">
      <div className="title-wrap" style={{ margin: '3vh auto 24px' }}>
        <h2 style={{ fontSize: 28 }}>Choose Your Era</h2>
        <div className="tagline">
          The era changes names, titles, and voice — a heavy infantry block is a heavy
          infantry block whether it is a cohort or a shieldwall.
        </div>
      </div>
      <div className="era-grid">
        {ERA_LIST.map((e) => (
          <button key={e.id} className="era-card" onClick={() => actions.startCampaign(e.id)}>
            <h3>{e.label}</h3>
            <div className="period">{e.period} — you are {aOrAn(e.generalTitle)} {e.generalTitle}</div>
            <p>{e.blurb}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function aOrAn(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}
