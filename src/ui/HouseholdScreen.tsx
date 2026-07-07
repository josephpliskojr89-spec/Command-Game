import { householdOptions } from '../sim/personal.ts';
import type { CampaignState } from '../sim/types.ts';
import { actions } from '../store.ts';

// Before the marching orders: who are you, when the armor comes off?
export function HouseholdScreen({ campaign }: { campaign: CampaignState }) {
  const options = householdOptions(campaign);
  return (
    <div className="screen">
      <div className="title-wrap" style={{ margin: '3vh auto 24px' }}>
        <h2 style={{ fontSize: 28 }}>Your Household</h2>
        <div className="tagline">
          A general is also a person. What you carry in your chest will arrive on the
          battlefield in the clarity of your orders — decide what you are carrying.
        </div>
      </div>
      <div className="era-grid" style={{ maxWidth: 960 }}>
        {options.map((o) => (
          <button key={o.id} className="era-card" onClick={() => actions.chooseHousehold(o.id)}>
            <h3>{o.title}</h3>
            <div className="period">{o.detail}</div>
            <p>{o.flavor}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
