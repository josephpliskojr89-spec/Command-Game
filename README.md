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

## The depth pass

The second pass adds the systems that make officers worth *learning*
(see `DESIGN.md` for the full design document and roadmap):

- **Reputation vs. truth** — epithets are generated from what the world
  *says* about a man, and for two officers per campaign the world is badly
  wrong. The only reliable record is the "what you have seen" dossier built
  from observed behavior. One officer is the ruler's appointee, gilded at
  court whatever the truth of him.
- **Vanguard engagements** — twice per march a detachment fight forces you
  to pick who leads (on reputation) and learn who he is (from results).
- **Grudges** — your officers remember the *named enemy officers* who beat
  them, bled them, or lost to them. Grudges persist across battles and
  operations, and bend order interpretation: a humiliated man over-executes
  anything pointed at his enemy and chokes on orders that take him away.
- **Named enemy officers** — with temperaments that shape the enemy plan,
  banners your scouts identify, and lives that can end in duels or melee.
- **The council speaks** — officers argue rival battle plans; endorsing one
  is public trust, and his claim about the enemy cavalry is drawn onto your
  map, true or false.
- **The champion's challenge** — answer it, refuse it, or watch a proud
  officer defy you and ride out anyway.
- **Armies that feel their conditions** — loot madness at the enemy camp
  (worse if you promised the men plunder), panic when your own camp is
  threatened, officer casualties with know-nothing deputies, hunger, heat,
  rain, and brittle obedience from harsh campaign discipline.
- **Officers color their reports** — pride hides distress, ambition gilds
  success, fear triples the enemy.
- **Signals** — "attack on signal" standing orders released instantly by
  the horns... for every formation that hears them and chooses to.
- **The post of honour** — deployment is a personnel statement; proud men
  given the rear fight the whole day slighted.
- **The war continues** — commend and censure after each battle, then march
  on: same officers, same grudges, replacements for the dead, a ruler's
  patience meter, and a war won or a command lost in about three operations.

## The personal life

The third pass makes the general a person, on the theory that everything a
commander carries in his chest arrives on the battlefield in the clarity of
his orders. The bridge is **Resolve** — one hidden number for the steadiness
of the hand that writes the dispatches. Grief, worry, scandal, and longing
push it down; love, good letters, and settled scores push it up; and every
order you issue inherits it as a clarity modifier before any officer ever
misreads it.

- **Your household** — chosen at campaign start: family waiting at home
  (letters, court politics fought by proxy, a sick child four days' ride
  away), family traveling with the baggage train (comfort, and a spouse who
  reads your officers better than the dispatches do — but they sleep a mile
  from the enemy), or marching alone (freedom, court suspicion, and a heart
  with an unguarded flank).
- **The spouse as intelligence asset** — if she travels with you, she
  watches your officers across suppers and fires, and her readings pierce
  reputation: "His hands shake at supper when the scouts report. Not the
  wine. I watched."
- **A campaign romance** — a widow with a ledger and better arithmetic than
  your quartermaster. Pursue it or ride on; openly if unmarried, as an
  affair with scandal mechanics if not. And war is war: her village can
  burn, and the *general* gains a vengeance entry against the named enemy
  officer who burned it — a page in your campaign book that only his death
  closes.
- **The family in the sacked camp** — if the enemy reaches your baggage and
  your family is in it, the battle stops being a map for one white moment;
  lose the battle too, and they are prisoners, and the next operation is
  fought in two ledgers.
- **The letter home** — after every battle: the truth, the version with
  trumpets, or silence. Each is read, and each is answered in kind.

## The saga and the unsolvable war

The fourth pass adds **dynamic families** and an anti-solvability overhaul
(built from an adversarial playtest audit — see `DESIGN.md`):

- **The years between** — wars end, the man continues: an interlude ages
  the family, births children, marries daughters into court or into your
  officer corps, and can take a child from you. Your three most trusted
  officers follow you into the next war with their dossiers intact.
- **The next generation** — a son serves as your aide (steadier orders,
  and he begs for the night patrol), then demands a command of his own:
  a real officer whose hidden traits you actually know, because you
  raised him. He can distinguish himself. He can also fall, mid-battle,
  with the line still needing orders.
- **Enemy doctrines** — rash, cunning, defensive, methodical: rumored
  at muster, felt in battle. Cunning commanders hide their reserve and
  bait your eager officers with feigned flights; defensive ones grow
  roots and make you come to them.
- **The enemy learns you** — their horse redeploys opposite where yours
  won last battle; your horns teach them to come early.
- **Operation types** — meeting battles, hold-until-dark defenses, and
  fortified positions that must be taken; no single plan survives a war.
- **No free lunches** — passivity gets your baggage burned, ganging up
  costs frontage, kiting is ignored, stalling drains patience, foraged
  country is eaten out, urgent riders actually gallop, and the general
  himself can be wounded fighting at the front.

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
