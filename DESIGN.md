# The General's Burden — Design Notes

This document records the depth systems added after the first playable pass,
and the feature roadmap produced by a design consultation with two advisors:
a military historian (pre-modern command practice) and a war-game designer /
command theorist (Clausewitzian friction, van Creveld's *Command in War*,
Keegan's *The Mask of Command*).

The organizing thesis, from the historian:

> A real general's craft was turning noisy social signals — letters, council
> talk, camp gossip, duels, grudges — into a working model of his men.
> Battles of this period were lost **at the moment of victory** and **in the
> rear** far more often than at the point of contact.

And from the designer:

> Make "who do I trust" recur every thirty ticks, not just at order time.
> The player should learn to read men, not messages.

---

## Implemented systems (second pass)

### Reputation vs. truth
Every officer has two trait sets: the hidden truth and a **reputation** the
epithets and blurbs are generated from. Most reputations are truth plus
gossip-noise; two officers per campaign are *badly misjudged* — the famous
name who is nothing much, the plodder who is the best soldier you have. One
officer is the **ruler's appointee**, with a court-gilded reputation whatever
the truth of him.

The correction channel is the **observation dossier**: "What you have seen
with your own eyes" — true behavioral evidence appended whenever an officer
deviates, hesitates, refuses, or shines. Historical basis: *litterae
commendaticiae*, patronage appointments, and the total absence of objective
personnel records.

### Vanguard engagements (small commands, small samples)
Twice per march, a detachment action finds the column — a held bridge, a
foraging fight — against a **named enemy officer** whose scouted epithet is
usually honest. The player picks who leads and in what manner (storm /
maneuver). Resolution runs on the officer's *true* traits, with
rock-paper texture (storming a cunning man's ground invites ambush;
maneuvering against a hungry one invites the rush). Outcomes feed morale,
food, intel, casualties — and the dossier. This is where you learn your men
before the battle does it for you, from a sample size of one.

### The grudge ledger (across the field)
Officers remember the *named* enemy who beat them, bled them, or lost to
them. Grudges are created by engagement defeats, formations broken in
battle, duels, and kills; they carry kind (`humiliation` / `triumph` /
`blood`), persist across operations, and change behavior:
- Sighting the banner produces a report ("He is smiling. He has beaten that
  man before.")
- A humiliated officer over-executes any order pointed at his enemy, drags
  his feet on orders that take him away from him, and may break formation
  entirely to settle it.
- A triumphant one reads your orders with more confidence against that foe.
Historical basis: Tostig at Stamford Bridge, Renaud de Dammartin at
Bouvines, Norse feud culture.

### Named enemy officers with temperaments
Five per campaign, each with competence / aggression / cunning and an
epithet from prisoner gossip. They hold the enemy's commands (boldest gets
the horse, ablest the main body) and perturb the enemy plan — a rash cavalry
captain commits early. They can die (duels, melee), demoralizing their
formations; the dead are replaced by "the Younger" in later operations.

### The council speaks (advice as testimony)
At the eve-of-battle council, the three most forward officers argue the
battles *they* would fight — text generated from temperament, claims about
the enemy cavalry wing generated from **true competence** (a sound man is
right 85% of the time; a fool guesses). Endorsing a plan is public trust:
confidence and trust up for him, down for the men passed over, rivalry
sharpened — and his cavalry claim is drawn onto your map, true or false.

### The champion's challenge
An enemy champion may ride out before the camp. Answer with any officer
(duel on hidden courage/competence; morale swings, a dead champion's command
fights leaderless tomorrow, a dead officer leaves a hole in yours) or refuse
— whereupon a proud, hot officer may ride out anyway, having heard your
order perfectly well. Historical basis: spolia opima, Manlius Torquatus,
holmgang.

### Armies that feel their conditions
- **Loot madness**: friendly units reaching the enemy camp while the enemy
  falters roll discipline; failures stop fighting to plunder (much more
  likely if you **promised the men the camp** on the march — your own words,
  redeemed at the worst moment). Looting can downgrade a decisive victory:
  the pursuit that would have destroyed the enemy never happens. (Cunaxa,
  Lewes.)
- **The camp behind you**: an enemy formation reaching your camp drains
  army-wide morale — less if you dug fortifications. (The Sambre, Manzikert.)
- **Officer casualties**: officers die at the front, brave ones more often;
  command devolves on a literal-minded deputy, and every succession is an
  information catastrophe. The player, personally commanding, survives on
  plot armor that is *reported* as near-misses.
- **Hunger**: marching to battle on empty wagons costs morale and fatigue.
- **Heat**: fatigue accumulates faster; standing in armor is not rest.
  **Rain**: slower, damp bowstrings. **Fog**: blind scouts, garbled orders.
- **Brittle obedience**: a harshly disciplined army (campaign tone) obeys
  more literally — fewer creative deviations, *and* fewer unbidden rescues —
  and shatters more suddenly once morale fails. An indulgent army
  improvises both ways and loots more.

### Officers color their reports
The periodic "word from the line" reports pass through the officer's
personality: pride understates distress, ambition inflates success, fear
triples the enemy. The player learns that one man's "all is well" precedes
routs.

### Signals: the horns
An **attack on signal** standing order plus a **Sound the horns** button:
instant, army-wide, and crude. Formations roll to hear it (distance, woods,
rain, temperament); aggressive officers may jump before the horn ("THIS is
the horn"); the timid may not come at all — and you won't know which until
you watch. The enemy's horns are audible too, reported without translation.

### The post of honour
Deployment is a personnel statement: a proud officer given the reserve or
the archers starts the battle slighted — lower confidence, worse
interpretation — and the report tells you exactly what you did to him.
(Nicopolis, Crécy.)

### The war continues (operations)
After the AAR: **commend one officer, censure one** (praise feeds pride and
ambition; a just censure tightens a man, an unjust one curdles him), then
**march on**. The same officers carry grudges, wounds, observations, and
confidence into the next operation; the dead are replaced by unknown
quantities with no dossier at all; unit survivors are topped up with green
replacements while veterans harden. The ruler's patience is a persistent
meter — win the war in about three operations, or be relieved of command.

---

## Roadmap (advisor proposals not yet implemented)

Ranked roughly by (impact on the command fantasy) / (cost):

1. **Trust latency** *(partially in — confirmation round-trips)*: extend to
   graded latency on all order types.
2. **Query and hold**: an officer's objection arrives as *real intel some
   fraction of the time*; confirm / countermand / ignore, with a timeout
   resolved by his temperament.
3. **Named riders**: 5–6 named messengers with visible-by-reputation speed
   and wit; wit answers clarifications on the spot; deaths carry a name.
4. **The signal kit**: bind 2–3 signals to meanings at deployment;
   rebinding mid-battle requires riders to every formation.
5. **The patron's letter**: attribute each reputation to a named patron
   with a learnable bias (flatters kinsmen / undersells rivals / honest).
6. **Riding the line**: move the general marker across the field at
   cavalry speed (danger rolls apply); proximity emits *true* dossier
   observations — watching a man command beats three battles of dispatches.
7. **The whispering camp**: eve-of-battle fear cascade (Vesontio) — lowest
   hidden courage asks to be excused first, which is itself a trait leak.
8. **Night assault**: clarity floored, delays doubled, friendly-confusion
   table (Epipolae). Survivable only with high-discipline officers.
9. **The oath to stand**: sworn formations gain rout resistance but read
   withdraw orders as dishonor (Maldon).
10. **Feigned flight**: an order only high-discipline officers execute as
    intended; the enemy can attempt it against your impetuous wings
    (Hastings).
11. **The sacred standard**: one formation carries the army's relic; morale
    aura, catastrophic shock if it routs, one heroic rally-on-the-standard
    counterplay.
12. **Dust and phantoms** *(partially in — text phantoms)*: false sighting
    *markers* that decay if unconfirmed, and that your officers also react to.
13. **The chronicle is also a witness**: AAR verdicts built only from what
    could have reached you — blame can land on the wrong man, and censuring
    him compounds it. A survivor-interrogation scene corrects one entry.
14. **The order ledger**: AAR replay map — intended arrows vs. actual paths
    with a tick scrubber. The visual close of the learning loop.
15. **Thirst is a weapon**: water features, heat + distance-from-water
    fatigue, officers requesting permission to fall back to the stream
    (Hattin).
16. **Glory contagion**: a rival's visible heroics flag the other rival
    with battle-long emulation — +aggression and doubled pursuit chance.
17. **Decimation or pardon**: post-AAR discipline theater with era flavor
    (Crassus, Caesar's clemency).

## Tuning principles

- Refusal stays rare; misreading, delay, over-eagerness, and partial
  execution are the texture of every battle.
- Nothing that reveals a hidden number is free: every trait leak costs a
  decision (an endorsement, a detachment command, a duel, a post of honour).
- Report text is never the simulation state; it is a *person's account* of
  the simulation state.
