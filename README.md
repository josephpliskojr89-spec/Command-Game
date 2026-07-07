# The General's Burden

A playable prototype of a historical command simulation about **command friction**.

> *"I am not moving an army. I am trying to command one."*

You are the general of a pre-modern army. You do not control units. You issue
orders to **officers** — proud, cautious, ambitious, frightened men — and those
orders travel by rider, arrive late or not at all, and are interpreted by
whoever receives them. Your plan is only the first draft of the battle.

## Running it

```bash
npm install
npm run dev      # play at http://localhost:5173
npm run build    # typecheck + production build
npm run sim      # headless battle smoke test (npm run sim -- <seed>)
```

## The loop

1. **Choose an era** — Roman Republic, Anglo-Saxon, Viking, Norman, or High
   Medieval. Eras are skins over one ruleset: they change unit names, officer
   titles, and the voice of the chronicle, not the mechanics.
2. **Receive strategic orders** from your ruler and **march** for several days:
   pace, foraging, and scouting decisions, plus events that shape morale,
   fatigue, discipline, and your officers' trust in you.
3. **Camp** on the eve of battle: pick your ground, dig in or rest, send a last
   scouting party, hold a council of war.
4. **Deploy**: place six formations, assign officers to them (you know these
   men only by reputation and behavior — their traits are hidden numbers you
   never see), and choose where *you* stand.
5. **Battle** on a 2D map, in ticks. Orders go out by messenger. Messengers get
   lost, killed, or arrive to find the situation changed. Officers execute
   precisely, misread the objective, soften a charge into a probe, jump early,
   stop short, pursue too far, act on their own initiative — or, rarely, refuse.
6. **Read the after-action report**: a chronicle of what actually happened,
   verdicts on each officer, the butcher's bill, and your ruler's judgment.

## Design notes

- **Officers are the game.** Every formation is commanded by an officer with
  ten hidden traits (competence, initiative, aggression, caution, loyalty,
  ambition, pride, discipline, courage, trust). The player sees only a
  one-line epithet, a background, and behavior over time.
- **Nothing is instant.** Orders travel at rider speed from wherever you are
  standing; acknowledgments and objections travel back the same way. Reports of
  distant events arrive late in proportion to their distance from you.
- **Personal command is a tradeoff.** Lead one formation and it fights harder
  and obeys instantly — while every report from the rest of the field now has
  farther to travel, and distant officers act more freely.
- **Fog of war.** Enemy markers show where your scouts last placed them.
  Faded markers are memories; dashed circles are unidentified sightings.
- **Deterministic.** All randomness flows from one campaign seed
  (`src/sim/rng.ts`), so battles can be replayed and debugged
  (`npm run sim -- 12345`).

## Code layout

```
src/sim/     pure simulation, no UI dependencies
  rng.ts       seeded PRNG
  types.ts     shared vocabulary
  era.ts       era flavor data (names, titles, voice)
  officer.ts   officer generation + order interpretation + autonomy
  campaign.ts  the march: logistics, events, camp, intelligence
  battle.ts    tick engine: messengers, movement, combat, morale, fog, enemy AI
  aar.ts       after-action chronicle and verdicts
src/ui/      React screens (map is plain SVG)
src/store.ts tiny external store + battle clock
scripts/simtest.ts  headless full-campaign smoke test
```
