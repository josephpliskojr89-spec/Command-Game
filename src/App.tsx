import { useGame } from './store.ts';
import { ERAS } from './sim/era.ts';
import { TitleScreen, EraSelectScreen } from './ui/TitleEraScreens.tsx';
import { HouseholdScreen } from './ui/HouseholdScreen.tsx';
import { CampaignScreen } from './ui/CampaignScreen.tsx';
import { CampScreen } from './ui/CampScreen.tsx';
import { DeploymentScreen } from './ui/DeploymentScreen.tsx';
import { BattleScreen } from './ui/BattleScreen.tsx';
import { AfterActionScreen } from './ui/AfterActionScreen.tsx';

export function App() {
  const game = useGame();
  const era = game.campaign ? ERAS[game.campaign.era] : undefined;

  return (
    <div className="app">
      <div className="masthead">
        <h1>The General's Burden</h1>
        {era && game.campaign && (
          <span className="sub">
            {era.label} · you are {era.generalTitle} of the army of {game.campaign.rulerName}
            {game.campaign.operation > 1 && ` · operation ${game.campaign.operation} of the war`}
          </span>
        )}
      </div>
      {game.phase === 'title' && <TitleScreen />}
      {game.phase === 'era-select' && <EraSelectScreen />}
      {game.phase === 'household' && game.campaign && <HouseholdScreen campaign={game.campaign} />}
      {game.phase === 'march' && game.campaign && <CampaignScreen campaign={game.campaign} />}
      {game.phase === 'camp' && game.campaign && <CampScreen campaign={game.campaign} />}
      {game.phase === 'deployment' && game.campaign && game.battle && game.assignments && (
        <DeploymentScreen
          battle={game.battle}
          campaign={game.campaign}
          assignments={game.assignments}
          personalCommand={game.personalCommand ?? 'hq'}
        />
      )}
      {game.phase === 'battle' && game.campaign && game.battle && (
        <BattleScreen battle={game.battle} campaign={game.campaign} />
      )}
      {game.phase === 'after-action' && game.campaign && game.aar && (
        <AfterActionScreen aar={game.aar} campaign={game.campaign} />
      )}
    </div>
  );
}
