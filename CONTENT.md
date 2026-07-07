# The General's Burden — Content Bible

A pool of authored content for future implementation, produced in consultation
with two brainstorm advisors: a **social/cultural historian** (armies as
societies: religion, civilians, disease, camp life, the household) and a
**military/campaign historian** (operational warfare: engagements, battle
incidents, enemy commanders, logistics crises). Plus an editor's section
written against the actual code.

**Total pool: ~150 items.** Every item includes: historical basis, trigger
condition (mapped to sim state where possible), a text sketch in the game's
voice, and mechanical effects using existing levers (morale, fatigue,
cohesion, supplies, food, intel, disciplineTone, rulerPatience, resolve,
spouseBond, officer traits/confidence/trust/grudges/observations, weather,
terrain, doctrines, operation kinds).

## How to implement from this document

- **March/camp events** → add to `EVENTS` in `src/sim/campaign.ts` (the
  format matches: id, title, text, options with resolve functions).
- **Personal/family events** → add to `PERSONAL_EVENTS` in
  `src/sim/personal.ts` (same shape plus arc flags).
- **Vanguard engagements** → extend `makeEngagement`/`resolveEngagement`
  in `campaign.ts`; the storm/maneuver texture per item is specified.
- **Operation types** → extend `OpKind` in `types.ts` and the setup/victory
  branches in `battle.ts` (`setupBattle`, `checkEnd`).
- **Battle incidents** → new checks in `battleTick` keyed to the sim-state
  triggers specified per item.
- **Enemy commander archetypes** → extend `Doctrine` or layer personalities
  on top of the four doctrines; parameters specified per item.
- **Officer texture** → name/epithet/background/observation pools in
  `officer.ts` and `era.ts`.

## Suggested implementation tranches

1. **Cheap wins first**: officer texture pools, battle-incident report
   texture, march events (pure event-table entries — no new systems).
2. **The engagement expansion**: 4–6 new vanguard actions with the
   night-raid capture/ransom loop.
3. **Two new operation types** (river crossing + intercept-the-raiders are
   the most distinct tactically).
4. **Enemy commander personalities** layered on doctrines, with the
   named-archetype rumor text.
5. **Saga arcs** (rival general, the son's rivalry, the chronicler).

---

# The General's Burden — Content Bible: Historian's Pool

Vocabulary notes: "storm" = commit fast and hard, resolved on courage/aggression, punished by enemy cunning. "maneuver" = deliberate and indirect, resolved on discipline/caution, punished by enemy aggression. All engagements should feed the observation dossier and the grudge ledger, per existing `resolveEngagement`.

---

## 1. VANGUARD ENGAGEMENTS

**[van-night-raid] The Sleeping Outpost**
- Historical basis: Scipio's night burning of the Carthaginian and Numidian camps at Utica (203 BC); Vlad III's night attack at Târgoviște (1462).
- Trigger: distance 2–3, enemy doctrine known, intel > 40 (scouts have found the outpost). Offered, not forced — declining is safe but wastes the find.
- Text sketch: The scouts have found an enemy outpost a half-night's ride ahead: fires banked low, horses picketed, sentries who trust the dark. Whoever you send will command in a country where no order of yours can reach him. You will learn what happened at dawn, from whoever comes back.
- Mechanics: Storm = fire and rush at the change of watch (courage/aggression vs. foe cunning — a cunning foe sleeps in a second camp beside the lit one). Maneuver = cut the sentries and take prisoners quietly (discipline vs. foe aggression — a hungry foe has doubled his watch hoping for exactly this). Success: intel +12–18, enemy formation led by that foe starts battle at −6 morale, officer gains dossier entry on independent night command. Costly success: intel +8, stragglers. Failure: 40–90 men lost, the foe gains a `triumph`-mirror (his formation +morale), and — uniquely — fog-of-war worsens: the enemy now screens harder (final scout gain halved). Disaster: officer captured (ransom event next day) rather than wounded.

**[van-convoy] The Convoy Through the Woods**
- Historical basis: The Battle of the Herrings (1429), a supply convoy defended in laager; Roman convoy escorts ambushed throughout the Gallic campaigns (BG V–VI).
- Trigger: supplies < 45 or food < 5; a resupply column from the ruler is one day out, and enemy riders have been seen on its road.
- Text sketch: The wagons your quartermaster has been praying for are a day out, and so, say the scouts, are enemy horsemen under a named banner. The convoy's drovers are brave about exactly nothing. Someone must ride out and be the difference.
- Mechanics: Storm = ride to meet the raiders and break them before they reach the wagons. Maneuver = circle the wagons at the ford and fight from behind them (foe aggression feeds him here: he may decline and simply wait you into the dark). Success: food +3, supplies +15, morale +4. Failure: convoy burned — food −2, supplies −10, rulerPatience −4 ("the crown does not send wagons twice"). Officer trait leak: how a man handles drovers and civilians is a discipline observation you cannot get in battle.

**[van-rearguard] The Rearguard at the Narrow Place**
- Historical basis: Roncevaux Pass (778), the Frankish rearguard destroyed in detail; Xenophon's rearguard actions during the Anabasis retreat.
- Trigger: fires only when the army withdraws (post-battle outcome of orderly-withdrawal or worse, on the march away) or when a march event forces a retrograde day. The enemy vanguard is pressing the tail of your column.
- Text sketch: The army is walking away from something, which is when armies are cheapest to kill. The enemy's forward riders are already snapping at the baggage. Someone must stand in the narrow place and be the last man off every ridge, all day, in front of no audience at all.
- Mechanics: Storm = periodic counter-charges to sting the pursuit into caution (courage-heavy; punished if foe is cunning — he baits the charge and slips past). Maneuver = leapfrog withdrawal by stages (discipline-heavy; punished if foe is rash — he simply rides over a line that is half-formed). Success: army escapes clean, cohesion +6, and the dossier entry is gold: "You have seen him command the hardest duty there is, unwatched, and do it well." Failure: stragglers ×2, baggage lost (supplies −12), fatigue +8. This is the highest-trust assignment in the pool — proud officers read it correctly as an honor; ambitious ones read it as exile (confidence −5 if ambition > 70 and told to do it).

**[van-defile] The Race for the Defile**
- Historical basis: The fog-bound fight for the ridge at Cynoscephalae (197 BC) began as two vanguards blundering into each other on the pass; the Amanus Gates.
- Trigger: distance 2, terrain ahead includes hills; both armies want the same gap. Weather = fog raises stakes and noise in resolution.
- Text sketch: There is one good pass through the hills ahead and the maps agree with the enemy's maps. The scouts report their vanguard moving for it now. Whoever holds the defile chooses the ground of the battle after next; whoever loses it attacks uphill for the rest of the week.
- Mechanics: Storm = race them to the crest and take it at a run. Maneuver = the goat path — a local shepherd claims a flanking track (adds a hidden coin-flip: the path is real 70% of the time, less if intel < 30). Success: next battle's terrain generation favors you — you deploy with the hill; morale +5. Failure: opKind for the next battle is forced to 'their-ground' (he has the gap and grows roots), fatigue +6. Ties into operation generation: this is a vanguard fight whose stakes are the next battlefield itself.

**[van-burn-bridge] Burning the Bridge**
- Historical basis: Horatius Cocles at the Pons Sublicius (legendary but doctrinally real); the lone axeman delaying the English at Stamford Bridge (1066); systematic bridge-breaking in the 1216–17 war.
- Trigger: enemy doctrine rash or methodical; scouts report an enemy column that must cross one bridge to reach your flank within two days.
- Text sketch: The enemy's second column is a day and a half away, and every hour of that day and a half crosses one wooden bridge. The pioneers say it will burn if someone holds the far bank long enough for it to catch. The far bank is the wrong side of a burning bridge.
- Mechanics: Storm = seize the bridgehead in daylight and fire it under attack (high casualties, high certainty). Maneuver = a small night party with pitch (low cost, but vs. a cunning foe the bridge is watched and the party is taken). Success: the enemy army at the next battle is 10–15% smaller ("the second column arrived late, wet, and furious"); rulerPatience +3. Failure: men lost AND the detachment is cut off on the far bank → chains directly into [van-rescue] the next day, with the same officer as the man needing rescue. Disaster teaches the player that vanguard fights can compound.

**[van-rescue] The Cut-Off Patrol**
- Historical basis: The relief of Quintus Cicero's besieged camp by Caesar (54 BC), after Sabinus and Cotta's column was annihilated for want of one.
- Trigger: a failed wide-scout roll (the existing "a scouting party fails to return" line becomes, 40% of the time, this engagement the next day), or chained from a failed [van-burn-bridge].
- Text sketch: The patrol that did not come back has been found — alive, forted up in a stone sheepfold with the enemy sitting around them like a lesson. It is thirty men. Thirty men is nothing. Every soldier in your army is watching to learn what thirty men are worth to you.
- Mechanics: Declining is allowed and cheap in supply and blood — and costs morale −8, cohesion −4, and every officer with courage > 60 loses trust ("he leaves men"). Storm = smash through to them (casualties, but fast). Maneuver = feint at the enemy's horse lines to pull the besiegers off (elegant, slow — 25% the patrol is overrun mid-rescue anyway, which is nobody's fault and will not feel that way). Success: morale +9 (outsized — armies love a rescue), rescued patrol adds intel +6. The rescuing officer gains the strongest possible trust-observation.

**[van-cattle] The Cattle Raid**
- Historical basis: The standing economy of border war — Irish and Welsh march raiding, Norse strandhögg; Viriathus' Lusitanian war was won and lost in livestock.
- Trigger: supply choice 'forage' with forageDays >= 2 (the country is eaten out; the enemy's is not); or food < 4.
- Text sketch: The enemy grazes his beef in a water-meadow six miles east, behind a screen of boys and dogs and, presumably, something worse. Your quartermaster has stopped phrasing his reports as reports and started phrasing them as looks. Six miles is nothing. Six miles back, driving cattle, is everything.
- Mechanics: Storm = hit the herd guards at dawn and drive fast. Maneuver = lift the herd at night and ambush the pursuit at a ford of your choosing (the reversal: vs. a rash foe, maneuver is devastating — he chases straight into it; grants the officer a `triumph` grudge and a signature dossier line). Success: food +2.5, morale +5 ("beef tonight"). Failure: men lost for nothing, disciplineTone +6 (hungry men who fought for food and got none start taking it from villages). A cunning foe poisons the well: 20% the "herd" is bait and this resolves as an ambush.

**[van-parley] The Parley Escort**
- Historical basis: Envoy murders and truce-breaking were period-defining risks — the Norman parleys before Hastings; the poisoned negotiations at countless sieges; heralds' immunity honored mostly.
- Trigger: distance 1–2, once per operation; the enemy commander proposes a meeting of heralds between the lines. Doctrine flavors his intent (methodical = genuine reconnaissance-in-talk; cunning = 30% it is cover for something).
- Text sketch: A herald under a green branch: the enemy commander proposes his men and yours water at the same river for one day of grace, terms to be exchanged. It is a chance to look his army in the teeth. It is also a chance for him to look at yours — and the officer you send will be the army's face and its judgment, out of your sight and reach.
- Mechanics: No storm/maneuver here; the axis is WHO. High-pride officer: 25% he answers an insult and breaks the truce (skirmish; morale −5; but a `blood` grudge and a true courage observation). High-competence officer: returns with real intel (+10–15, including a TRUE doctrine confirmation or the enemy cavalry side). Low-competence: returns with confident wrong numbers (intel poisoned as in the deserter event). If the foe is cunning: he uses the day to move his camp — final scout is degraded, but your envoy noticed the wagons if competence > 60. Teaches: parley is a scouting action wearing manners.

**[van-wells] The Wells at the Dry March**
- Historical basis: Saladin's seizure of the springs before Hattin (1187); the entire logic of the dry campaign.
- Trigger: weather = heat for 2+ days; the only water on tomorrow's road is a village well line held by enemy light troops.
- Text sketch: Tomorrow's road is nine miles of white dust, and the only water on it belongs, as of this morning, to the enemy. The men do not know yet. The horses already do.
- Mechanics: Storm = take the wells before they can be fouled (speed matters: success prevents the fouling entirely). Maneuver = demonstrate at the village and water by night in relays (slower; fatigue +6 regardless). Success: negates the heat-fatigue penalty for the next march day; morale +4. Failure: the wells are fouled with carcasses — fatigue +12, morale −6, and next battle (if within 2 days) starts every unit at +10 fatigue. The one vanguard fight where refusing it is almost never right, which makes WHO you send under compulsion the interesting part.

**[van-screen] Blinding the Enemy's Eyes**
- Historical basis: The cavalry screening duels that preceded nearly every set-piece battle; the Ferrybridge action before Towton (1461) as a fight between forward parties over information.
- Trigger: distance 2, scouts 'wide' chosen two days running; your outriders and theirs have started killing each other, and the scouts want cavalry support to win the argument.
- Text sketch: Your riders and theirs have been trading corpses along the ridgeline for two days, politely, professionally. The scout-master says one hard push would sweep their screen off the hills and let him count the enemy's fires himself. The enemy scout-master is presumably saying the same thing.
- Mechanics: Storm = drive their screen in with the cavalry (fast, loud; wins the intel war or loses horses you will want in three days — failure applies −10% cavalry strength at the next battle). Maneuver = ambush their morning patrol route (quiet; vs. rash foe excellent, vs. cunning foe he has rotated the route). Success: intel +15 AND the enemy's pre-battle picture of YOU degrades — the enemy plan's advanceTick gains noise and his cavalry deploys to the wrong side 30% of the time. Failure: your final scout report is the low-intel version regardless of intel stat. Makes intel a two-sided commodity for one fight.

**[van-granary] The Granary Race**
- Historical basis: Scorched-earth denial — Fabius stripping the country before Hannibal; the Crécy campaign's races to unburned towns (1346).
- Trigger: enemy doctrine defensive or methodical; scouts report smoke — the enemy is burning the district's stores ahead of you, and one large tithe-barn is still standing a half-day off the line of march.
- Text sketch: The smoke columns march ahead of you like a second army. One barn in the next valley is still whole — full, say the locals, to the roof-beam. The enemy riders burning their way toward it know exactly where it is too.
- Mechanics: A pure race; storm = gallop and hold the barn against the burners; maneuver = cut the burners' path at the stream crossing and never touch the barn (subtler: protects the whole district — extra +1 food/day forage for two days). Success: food +3 or district saved per approach. Failure: barn burns, and 25% the detachment is caught around it by a larger force → casualties. The locals remember either way: success here gives one free TRUE local-guide event later (see march events).

**[van-payroll] The Pay Chest**
- Historical basis: Armies mutinied over arrears more often than they lost battles — Caesar's legions in 47 BC; the pay-convoy ambushes endemic to every medieval campaign.
- Trigger: operation 2+, disciplineTone > 60 or a prior mutiny event; the ruler has sent the army's back pay under light escort, and everyone — including, somehow, the enemy — knows.
- Text sketch: The pay chest is two days out under forty men and a clerk. Half the camp can tell you its route and the other half can tell you its weight. If the enemy takes it, they will not even have to fight you afterward; they can simply wait.
- Mechanics: Storm/maneuver govern how the reinforced escort meets the (near-certain) ambush: storm = fight through on the road; maneuver = decoy chest on the road, real chest over the hills (vs. cunning foe, he ambushes the hills — he thinks like you). Success: morale +8, disciplineTone −8 (paid men obey), rulerPatience +2. Failure: morale −10, and the mutiny march-event [march-pay-mutiny] is armed to fire within two days with worse options. The rare vanguard fight where failure has a scheduled aftershock.
---

## 2. OPERATION TYPES

**[op-crossing] The Opposed Crossing**
- Historical basis: Alexander at the Hydaspes (326 BC); Edward III forcing the Blanchetaque ford (1346); Stamford Bridge (1066) as a battle bisected by water.
- Trigger: operation generation when the map region includes a major stream; more likely vs. defensive doctrine (he uses the water as a wall).
- Text sketch: The river is the enemy's best officer today. He has drawn up on the far bank at his leisure, and every man you send across will fight wet, uphill, and alone until the man behind him arrives. There are two fords. He can only be wise about one of them at a time.
- Mechanics: Map generation places a stream across mid-field with 1–2 fords (one may be scout-hidden, revealed by intel > 55). Deployment: your six formations start on the near bank; units in a ford fight at −25% power and cannot be supported (frontage 1). Victory condition: hold 3+ formations in good order on the far bank at nightfall. Tactically distinct: sequencing is everything — messenger delays across the water double (riders must use fords too), so pre-battle standing orders and signals matter more than in any other op. The enemy counterattacks bridgeheads at 2:1 aggression; the feigned "undefended second ford" is a cunning doctrine trap. The general crossing personally restores order clarity on the far bank at personal risk (Alexander's choice, mechanized).

**[op-ambush] Ambushed on the March**
- Historical basis: Lake Trasimene (217 BC), an entire consular army destroyed in column; Roncevaux (778).
- Trigger: fires INSTEAD of a normal battle when: intel < 30 at distance 0, scouts 'close' chosen 3+ days, enemy doctrine cunning, and weather fog raises the chance. The player is punished for marching blind — this op IS the punishment, made survivable.
- Text sketch: The fog lifts by a third, which is enough. The hillside above the road is moving, all of it, downhill. Your army is nine hundred paces of marching column, the baggage is in the middle of it, and your battle plan is whatever you can shout in the next two minutes.
- Mechanics: No deployment phase. Units spawn in column along the road, facing march-direction, at cohesion −20; officers act on pure temperament for the first 40 ticks (orders sent before tick 40 suffer double delay and −30 clarity — you are trying to organize a shout). Enemy starts at 'committed'. Victory conditions are downgraded one full step: fighting your way out in a body is a narrow-victory; extracting 60%+ is orderly-withdrawal, and holding the field is nearly impossible. Tactically distinct: it is a rally puzzle, not a plan puzzle — the officer traits that matter are initiative and discipline, and the AAR is a brutal honest census of who kept his head. High-initiative "problem officers" become heroes here; the literal-minded obey their last order (keep marching) into the killing ground.

**[op-relief] The Relief of the Town**
- Historical basis: The relief of Orléans (1429); Caesar at Alesia from the *besieger's* seat shows the two-front geometry.
- Trigger: strategic orders in operation 2+; the ruler's town is besieged with a hold-out clock the player has watched tick down during the march (each march day the town's plight worsens in the log).
- Text sketch: The town has been eating its horses for a week and signaling from the towers for longer. Between you and its gates: the siege lines, and an enemy who has had a month to decide exactly where he will stand when you came. He is not besieging the town anymore. He is besieging your reputation.
- Mechanics: Map: the town (a camp-like terrain feature, friendly) sits behind the ENEMY deployment zone; enemy fights facing you with lines to hold behind him. Victory: break a corridor — get any 2 formations adjacent to the town gate — OR rout the covering army. Town garrison sorties (a small friendly AI unit) when your attack crests, arriving as an uncontrolled ally. Tactically distinct: the enemy is positionally committed (his siege works anchor him; defensive bonus but nearly zero maneuver), so it inverts their-ground: he has good ground he CANNOT leave, making your feints and flank marches actually work — this is the op that teaches maneuver. Failure: the town falls in the AAR, rulerPatience −20.

**[op-night] The Night Attack**
- Historical basis: Epipolae (413 BC), where a winning Athenian night assault dissolved into mutual slaughter by password; Târgoviște (1462).
- Trigger: player-electable at the camp phase (a council option) when opKind is 'their-ground' and the odds look bad — the desperate man's tool; a rash enemy may also inflict it on YOU (camp battle at night) if your camp is unfortified and his scouts found you.
- Text sketch: The council falls silent when you say the word "tonight." Darkness makes armies equal, which is the argument for it. Darkness makes armies equal, which is the argument against.
- Mechanics: Global: order clarity floored at 35, messenger delays ×2, all sighting radii quartered, terrain effects doubled. Friendly-confusion table: any two friendly units adjacent while either is moving roll vs. discipline for a friendly-fire incident (morale −, cohesion −, a report written in the exact voice of a man realizing what he has done). Enemy starts at half-readiness (units at −15 cohesion, no formed line) IF your approach roll (army cohesion + discipline tone) succeeds; otherwise they are awake and it is Epipolae. Victory: standard, but every outcome shifts one step better if achieved (the audacity dividend). Distinct: the only op where disciplineTone strictly dominates — an indulgent army should simply never attempt it, and learns why once.

**[op-withdrawal] The Fighting Withdrawal**
- Historical basis: Xenophon's Anabasis as the genre's textbook; Charles the Bold's failed disengagements as the counterexample.
- Trigger: strategic orders when warScore is negative or the previous battle was lost: the ruler orders the army preserved — break contact and get it home across this valley. The enemy doctrine determines pursuit ferocity (rash = relentless, methodical = deliberate escalade).
- Text sketch: For once the orders are honest: the army matters more than the ground it stands on. Behind you is the pass home. Between here and there, every formation must turn its back on an enemy at some moment of your choosing, and the moment after that is when he charges.
- Mechanics: Victory: exit 4+ formations off your map edge above 50% strength and not routed, before tick ~700. Units moving away from the enemy while unengaged move normally; breaking OFF from contact requires a withdraw order resolved on discipline (failure = the withdrawal becomes a rout — a withdrawal that keeps its shields is not a rout, and this op is built entirely on that line). The map edge is the objective, so the rearguard formation choice is the post of honour INVERTED — the LAST unit out eats the pursuit, and every officer knows which assignment that is. Sworn/oath units (see era flavor) may refuse the withdraw order outright. Distinct: you are spending morale and men to buy geometry; the AAR praises what most AARs punish.

**[op-intercept] The Intercepted Raid**
- Historical basis: Otto I running down the Magyar column at the Lech (955); the pursuit logic of every counter-raid on the Welsh and Scottish marches.
- Trigger: strategic orders variant: the enemy has sacked a district and is walking home heavy with plunder and prisoners; the ruler wants them dead and the stolen people back. Enemy doctrine rash never triggers this (he doesn't leave); cunning and defensive do.
- Text sketch: They are two days from their own border, moving at the speed of stolen cattle. Every mile they make is a village that stays burned. Kill them short of the river and the district calls you deliverer; press them clumsy and they will cut the prisoners' throats and outrun you light.
- Mechanics: Map: enemy starts mid-field already MOVING toward their exit edge, in escort formation around a slow baggage/prisoner blob (their 'camp' unit, mobile). Victory: destroy or halt the baggage before it exits; their combat units exiting is irrelevant. The enemy fights only to buy the convoy time — his rearguard picks fights he intends to lose slowly. Twist: press any escort unit to breaking and a hidden roll (his commander's cunning) decides whether the prisoners are abandoned (morale +10, big patience reward) or killed (morale −8, and the AAR names YOUR haste; rulerPatience still +5 for the destroyed column — the ruler's arithmetic is not your men's). Distinct: a pursuit op where speed and cavalry matter most and a total battlefield victory can still arrive too late.

**[op-pass] The Wall of Spears (Defile Defense)**
- Historical basis: Thermopylae (480 BC); the bridge at Stamford (1066); Clidium's negative example (a defile turned).
- Trigger: opKind variant of 'defense' when the [van-defile] engagement was WON — you hold the gap you fought for; the enemy must come through you.
- Text sketch: The pass is eighty paces wide and the enemy is forty men deep for a mile. Today numbers mean nothing at the front and everything at the back: he can feed his fury all day, and you can only feed yours in ranks of two hundred. Somewhere in these hills there is a path around. There is always a path around.
- Mechanics: Map: frontage physically capped by terrain — only ~2 formations can engage at once per side. Victory: hold until nightfall. The rotation game: units in the gap accrue fatigue fast; swapping a fresh formation in mid-fight is a discipline-resolved maneuver (botched swap = a gap in the gap). The path-around: at a tick determined by enemy cunning, a flanking force appears at your rear map edge UNLESS you spent a formation guarding the goat path all battle (a bet on an invisible threat — the Phocian problem, mechanized). Distinct: the op where the reserve is the whole battle, ammo for ranged units matters double, and one bad rotation loses a fight arithmetic said you'd won.
---

## 3. BATTLE INCIDENTS

**[bi-standard-falls] The Standard Falls**
- Historical basis: The aquilifer of the Tenth leaping into the surf at Caesar's Britain landing (55 BC); the loss of standards as career- and morale-defining catastrophe (Teutoburg).
- Trigger: a unit at status 'wavering' takes officer-down OR drops below 40% strength while engaged; once per battle.
- Text sketch: A rider, out of breath: the standard of the [unit] went down in the press. Someone has it. Nobody can say whose hands.
- Mechanics: The unit rolls courage-weighted: (a) a nobody seizes it and the unit RALLIES (+15 morale, a new named deed, and a candidate replacement officer with one true observation pre-filled), (b) it is lost — unit morale −20, adjacent friendly units −8, and the enemy formation that took it gains +10 for the rest of the war (it appears in later battles' scout reports: "they carry your eagle"). Recovering a lost standard in a later operation is a standing objective worth morale +15 army-wide and rulerPatience +5.

**[bi-storm] The Sky Breaks**
- Historical basis: The thunderstorm before Crécy (1346) that slackened the Genoese crossbow strings; the blinding snow at Towton (1461) that gave one side's arrows the wind.
- Trigger: weather 'clear' or 'rain' + rng, around tick 200–400; announces itself 20 ticks early ("the light goes wrong").
- Text sketch: The light goes green-black and the first fat drops hit the shields like sling stones. Somewhere on the left a thousand bowstrings just became wet wool.
- Mechanics: Weather flips to 'rain' mid-battle: ranged effectiveness −40%, mud slows all movement 20%, messenger delay +25%. The asymmetry is the content: whichever side has more ranged commitment at that moment loses more, and a methodical enemy holds his assault until the worst of it while a rash one attacks INTO it (his doctrine, visible in a single decision). Player counterplay: unstringing bows in time (a standing order issued before the rain lands) preserves half the penalty — scouts' "the light goes wrong" report is a 20-tick fuse for those who have learned to read it.

**[bi-dust] Dust in the South**
- Historical basis: Phantom armies decided real battles — the dust of fleeing camp servants at the Sambre nearly broke Caesar's line; relief-army rumors at every siege.
- Trigger: intel < 45 and any map edge unobserved for 150+ ticks; midgame.
- Text sketch: The lookouts report dust rising beyond the southern ridge — a column's worth, maybe two. No banners visible. Every officer on your right has now seen it, and each is deciding for himself what it means.
- Mechanics: Spawns an unidentified sighting marker (dashed circle) at a map edge. 70% it is nothing (herds, wind, your own stragglers); 20% it is the enemy's hidden reserve arriving; 10% it is friendly (a late allied contingent from the march events). Until resolved by scouting or arrival, officers within sight react by temperament: fearful ones edge away from it (position drift), aggressive ones want to charge it. Sending a messenger to investigate costs a rider and ~60 ticks; NOT sending one lets the phantom command your right wing for free.

**[bi-water-out] The Waterskins Are Dry**
- Historical basis: Hattin (1187): a battle lost the day before it was fought, to thirst.
- Trigger: weather 'heat' + tick > 300 + any unit with fatigue > 65.
- Text sketch: Word from the [unit]: the waterskins are dry, the stream is behind the enemy, and the men have begun to look at it the way men should not look at anything during a battle.
- Mechanics: The afflicted unit gains fatigue at double rate and its officer sends a request: permission to fall back to the stream. Grant it = the unit disengages (a hole in your line, honestly reported); refuse = the officer rolls discipline vs. the request — a failure means he goes anyway (dossier: "You have seen him choose his men's thirst over your line"), a success means the unit holds at accelerating morale cost. If any terrain 'stream' is on YOUR side of the field, none of this fires: camp placement at the river was the counterplay, three days ago.

**[bi-prisoners] The Prisoners Rise**
- Historical basis: Agincourt (1415): the prisoner mass behind the lines, the baggage attack, and Henry's order — the period's most debated command decision.
- Trigger: your side has broken 2+ enemy formations (prisoners accumulate near your camp) AND a new enemy threat develops (escalation, reserve commitment, or cavalry loose in your rear).
- Text sketch: From the camp, at a run: the prisoners — there are more of them back there than there are of the reserve — have seen the enemy's fresh attack and stopped behaving like beaten men. The guard detail is forty men and they are asking, in so many words, what you want done. In so many words, they are asking THAT.
- Mechanics: Three answers. Guard them properly = detach strength from the reserve (−15% reserve unit) for the rest of the battle. Turn them loose unarmed = they stream toward the enemy; 25% they disorder an advancing enemy unit (accidental gift), morale unaffected. The third order = the threat ends; disciplineTone −10, morale −6 among units that can see the camp, the AAR records it forever, rulerPatience: +4 if you go on to win (victors are forgiven), −12 if you lose (the atrocity AND the defeat). Some officers refuse the third order outright (loyalty/discipline roll) — a refusal that is itself a dossier entry you'd rather not have needed.

**[bi-bridge-collapse] The Bridge Gives Way**
- Historical basis: The Milvian Bridge (312): Maxentius' army drowned on its own collapsing pontoon in retreat.
- Trigger: op-crossing or any map with ford/stream terrain; a unit in 'routed' or withdraw status crosses the ford/bridge while another unit is on it.
- Text sketch: You hear it before the report arrives: a sound like a giant's knuckles, then the screaming. The bridge is in the river. So is most of a formation.
- Mechanics: The crossing terrain feature is destroyed for the rest of the battle (fords remain, slower). The unit crossing takes 15–25% drowned losses and its morale floors; any unit WAITING to cross must now be rerouted (its officer improvises by temperament — the disciplined halt and send a rider, the rash swim it, the fearful decide the battle is over). If it fires during YOUR withdrawal, the outcome grade worsens one step; if under the ENEMY's retreat, pursuit becomes annihilation (upgrade toward decisive-victory) but looting/prisoner mechanics moot — the river took the plunder too.

**[bi-camp-fire] Fire in the Camp**
- Historical basis: Camp fires — accidental and enemy-set — as battle-enders; Scipio at Utica made a weapon of exactly this fear.
- Trigger: enemy cavalry within range of your camp for 30+ ticks, OR weather 'heat' + rng; worse if camp unfortified.
- Text sketch: Smoke over your own camp — thick, oily, wrong. Every man in the rear ranks has just done the arithmetic about his kit, his pay, and his woman back there.
- Mechanics: Army-wide morale −6 (−3 if fortified camp: earthworks slow fires and rumors alike). Supplies −10. If the personal-life family is in the baggage train, this fires the family-danger interrupt instead (existing system) — the fire is how the sacked-camp arc announces itself. Any unit ordered to march TOWARD the camp to fight the fire fights internal temptation: indulgent disciplineTone armies lose some men to "salvage" (early looting of their own camp — historically attested and demoralizing to read).

**[bi-omen] The Sun Is Eaten**
- Historical basis: The eclipse that stopped the Battle of the Halys (585 BC); the parhelion at Mortimer's Cross (1461), which Edward declared a sign of victory before it could be declared anything else.
- Trigger: rare (once per WAR, seeded); any tick 150–500.
- Text sketch: The field dims as if a lid were closing. Both armies look up, which is ten thousand men not looking at each other. Somewhere down your line a priest has begun to shout, and you cannot yet hear whether it is terror or triumph. You have perhaps a minute to decide which it will officially be.
- Mechanics: Global 40-tick lull: all units' aggression suppressed, combat winds down (neither AI presses). Player choice via instant announcement (this one time, a free army-wide signal): declare it FOR us = morale roll vs. resolve (success +10 army morale, failure +2 and the men note the general needed it to be true); say nothing = morale −6 and superstitious officers (low-discipline) act erratically for 100 ticks. The ENEMY commander makes the same choice — a methodical or cunning one exploits the lull to redeploy (his reserve moves while heaven has the floor), and your scouts may or may not catch it.

**[bi-he-is-dead] "The Duke Is Down!"**
- Historical basis: Hastings (1066): the rumor of William's death nearly broke the Norman army until he rode bareheaded down the line.
- Trigger: EITHER side's commander takes a near-miss: for the enemy, when his commanding unit is engaged and wavers; for you, when generalWounded fires or your personally-led unit takes a bad tick.
- Text sketch (enemy version): Prisoners and shouting men agree on one thing: the enemy commander's banner went down in the crush on their left. Their whole line has gone loose at the joints, like a puppet with a cut string — unless the string is not cut, and this is the minute to spend everything finding out.
- Mechanics: Enemy version: all enemy units −8 morale for 60 ticks; if FALSE (80%), he "rides the line" at tick +60 and they recover +12 (net gain for them — a rally is worth more than the wobble cost). The window is real either way: attacks pressed during the 60 ticks land on wavering men. Player version: your units that can see HQ take −6 morale until you either show yourself (move HQ marker forward — genuine danger roll) or send riders with denials (each unit rolls trust to believe it). Teaches: rumors of death are attacks, and the counterattack is visibility.

**[bi-pursuit-fever] The Wing Rides Off the World**
- Historical basis: Prince Edward at Lewes (1264), pursuing broken Londoners clean off the battlefield and returning to a lost battle.
- Trigger: an enemy unit routs; the adjacent friendly officer has aggression > 70 or a `triumph`/`humiliation` grudge against its named officer.
- Text sketch: The [unit] has the enemy's horse running and — the rider's face says it before his mouth does — has gone after them. The last man to see them says they were riding well. Nobody says toward what.
- Mechanics: The unit exits pursuit-control: unreachable by messengers for 120–200 ticks (rides off the map edge conceptually), then rolls the officer's discipline to return — early, late, or (5%) not until the AAR. Meanwhile your line is short one formation and the enemy AI knows it (methodical/cunning commanders shift weight toward the gap within 30 ticks). Counterplay is PRE-battle: the standing order "no pursuit past the stream" halves the trigger chance for disciplined officers and does nothing for the grudge-bearer — his grudge note appears verbatim in the report.

**[bi-livery] Friends in the Fog
- Historical basis: Barnet (1471): Oxford's "star with streams" mistaken for Edward's "sun with streams" in the fog; his own side shot at him and the cry of treason broke the line.
- Trigger: weather 'fog' + two friendly units converging on the same objective from different bearings, either one below 60 cohesion.
- Text sketch: Shouting on the left — your left, fighting your left. In this fog the [unit A]'s banners look like nothing on earth except, apparently, the enemy's.
- Mechanics: The two units exchange one combat tick of friendly fire, then both roll discipline: pass = it stops with the dead already made (both −8 morale, −6 cohesion); fail = the word TREASON is loose — the failing unit's morale drops as if flanked, and reports for the next 100 ticks from that wing are unreliable (the officer's account is colored by the conviction someone sold him). Fires only in fog; the counterplay is routing convergent attacks through a shared landmark (orders that name terrain, not bearings) — a subtlety the order UI can quietly reward.

**[bi-arrows-out] The Last Sheaf**
- Historical basis: Arrow supply as the hard clock on missile superiority — Towton's archers scavenging spent shafts from the snow between volleys.
- Trigger: any ranged unit's ammo < 15 while enemy ranged still > 40.
- Text sketch: Word from the archers: they are shooting back the enemy's own arrows now, and the enemy is shooting more of them. The boys who run the sheaves up from the wagons have stopped coming — someone rerouted the wagons, or the boys are hiding, or both.
- Mechanics: A resupply decision: detach a sliver of the reserve to run sheaves (reserve −5% strength, restores 30 ammo over 60 ticks, requires the camp unburned) or let the duel lapse (unit falls back to melee posture; its officer requests withdrawal behind the line — pride-heavy archers' officers instead advance to loose at spitting range, ammo-efficient and lethal to them). If [bi-camp-fire] already fired, the wagons are ash and only the second option exists — incidents compound.

**[bi-rout-contagion] The Stream of the Broken**
- Historical basis: Every pre-modern rout: the beaten do not leave the field in straight lines — they leave THROUGH the unbeaten.
- Trigger: a friendly unit routs with a path that passes within close range of a 'waiting' friendly unit (typically the reserve).
- Text sketch: The reserve stands. The wreck of the [broken unit] is pouring past it, and every runner is an argument: a thousand arguments, each with a face a reserve man knows, each shouting that the day is lost and here is the proof, running.
- Mechanics: The waiting unit takes morale −2 per 10 ticks of contact with routers, tripled if the routing unit was its officer's rival's command (schadenfreude curdles fast into fear). Officer counterplay is automatic by trait: high-discipline officers wheel the formation to open a lane (no morale loss, +1 dossier observation); low-discipline ones absorb the flood. Player counterplay: an early messenger repositioning the reserve out of the likely rout path — which requires having thought about where routs will GO, the mark of an experienced player.

**[bi-stanley] The Watchers on the Hill**
- Historical basis: The Stanleys at Bosworth (1485): an allied contingent that stood on its hill until it had seen which way the battle leaned, then charged — into its own side's king.
- Trigger: only if an allied contingent joined during the march (see [march-allies-late]) with the 'unsworn' flag; it deploys as a 7th unit the player positions but does not fully control.
- Text sketch: The allies have taken the hill you assigned them and are holding it with great firmness against nobody. Their lord returns your messengers with courteous, contentless answers. He is not watching the enemy. He is watching the scales.
- Mechanics: The allied unit obeys movement orders but refuses 'charge'/'engage' until a hidden commitment roll passes; the roll fires when either army's lossFraction > 0.2 and is weighted by which side is winning, the lord's hidden loyalty, and whether the player sent hostages/gifts during the march event. If it commits FOR you: a fresh flank attack at the crisis (often battle-winning). If AGAINST (10–20%): the single worst moment the game can produce, and the march-event choice that allowed it is right there in the log. The AAR names the price of cheap allies.
---

## 4. ENEMY COMMANDER ARCHETYPES

Format: doctrine base + parameter deltas, signature behaviors (what the sim actually does), the rumor (what prisoners say), and the lesson (how a player learns to beat him). These are personalities layered over the four doctrines so the doctrine rumor stays true but incomplete.

**[ec-delayer] The Old Serpent (the Fabian)**
- Historical basis: Fabius Maximus Cunctator vs. Hannibal (217–216 BC): refuse battle, shadow the enemy, starve him of forage and glory.
- Doctrine parameters: defensive base; aggression 15; advanceTick effectively never; counterpunch only at 2:1 local advantage.
- Signature behaviors: declines battle even when you turtle (both armies can refuse — patience becomes the real battlefield); doubles the forage-decay rate in his district (his riders burn ahead of you); triggers extra convoy/forage vanguard engagements; his camp is always entrenched on bad-approach ground.
- Scout-rumor text: "Men who fought him say they never fought him. They marched, and starved, and marched, and one morning a third of them had no boots and he had never once come down from the hills."
- The lesson: you cannot out-wait him — rulerPatience drains while he holds a salary. Beat him by attacking something he must defend (relief-of-town and granary objectives force his hand) and by winning the vanguard war he substitutes for battle. Players who learn to treat his engagements AS the battle thrive; players who keep offering battle go home.

**[ec-trapper] The Smiling Host (the Hannibal)**
- Historical basis: Trasimene and Cannae (217–216 BC): the gift that is a trap, the center that gives way on purpose, the ground chosen weeks ahead.
- Doctrine parameters: cunning base; cunning 90+, competence 80+; feint always armed, sometimes TWO (one obvious, one real); hidden reserve always.
- Signature behaviors: his weakest-looking formation is bait (its visible "wavering" is scripted); his center withdraws under pressure by design, bending into a pocket; op-ambush chance doubled against low intel; he offers your grudge-bearing officers their named enemies as lures (the banner your humiliated officer wants is always, somehow, in front of him).
- Scout-rumor text: "A prisoner laughed at us. 'You have seen his line? Then you have seen what he wants you to do.' He would not stop laughing. We let him go; it seemed to be what he wanted, which worried us afterward."
- The lesson: refuse the gift. Everything that looks free — the open flank, the wavering unit, the undefended ford — is priced. Beat him by keeping the reserve uncommitted past the point of discomfort, by NOT pursuing (standing orders), and by making him improvise: attack the schedule, not the army. His true competence is lower off-script; a night attack or a weather change hurts him double.

**[ec-berserk] The Storm-Crow (the Berserk King)**
- Historical basis: Harald Hardrada's career of front-loaded fury; the first-charge doctrine of every warrior-culture host.
- Doctrine parameters: rash base; aggression 95; advanceTick 5–12; commits reserve by tick 150; personal-combat flag (he fights in the front rank and can DIE there).
- Signature behaviors: attacks everywhere at once at dawn; always answers and always issues champion challenges; never withdraws — his army breaks or wins, no orderly-withdrawal outcomes; his units get +morale for the first 100 ticks (the fury) and −cohesion after 400 (the hangover).
- Scout-rumor text: "He killed his own horse for outrunning his men, or that is the story his men tell, proudly, which is the part that should concern us."
- The lesson: survive the first hour and you win. Fortify camp, refuse the flanks, take the defense op gratefully, hold the reserve for tick 200+. The trap for learned players: he is only PREDICTABLE, not stupid — his aggression is real force, and meeting it head-on with a tired or hungry army loses before noon. Also the archetype most likely to die on the field, decapitating his army — a duel-accepting player has a real, brutal shortcut.

**[ec-engineer] The Man of Works (the Siege Engineer)**
- Historical basis: Demetrius Poliorcetes' machines; Caesar's Alesia lines: commanders who fight with the spade and beat armies with geometry.
- Doctrine parameters: methodical base; competence 85, aggression 30; his advance halts to entrench every 100 ticks (a moving fortress).
- Signature behaviors: his-ground ops always fortified (kill-box terrain around his position); on assault ops he arrives late and dug in by the time you see him; his camp cannot be profitably raided; he targets your camp with methodical siege of YOUR position if you turtle (the only doctrine that wins a mutual-turtle by works).
- Scout-rumor text: "The scouts describe his camp the way men describe a town. Ditch, bank, palisade, towers at the gates — a day old. They asked a local how long his army had been there. One day. They asked again. One day."
- The lesson: never let him finish. He is weakest in the open and in motion — force meeting battles, strike the half-dug line (his entrench-halts are windows: units entrenching fight −20%), win the vanguard fights that carry his tools and timber (a burned engineering train sets him back an operation). Players who give him three quiet days find the battle unwinnable and learn to read "he is digging" as an attack in progress.

**[ec-courtier] The Consul's Nephew (the Political General)**
- Historical basis: The commanders of every court-riddled army — late Roman appointees fighting for dispatches, feudal princes husbanding their retinues for the succession; Nicias at Syracuse, delaying for home opinion until the moon trapped him.
- Doctrine parameters: methodical base with a seasonal spine: aggression starts 55 and DECAYS as winter nears (he will not risk his army — his career — in month five); vanity flag.
- Signature behaviors: fights hard early in the campaign season, then goes defensive as the weather turns (his doctrine appears to CHANGE mid-war — the rumor stays true only for the season it was gathered); overreacts to humiliation: a lost champion duel or a sacked camp makes him rash for one battle (his pride outvotes his caution exactly once); writes to YOUR ruler — captured dispatches show him negotiating, spinning, blaming subordinates.
- Scout-rumor text: "The prisoners say his tent has more clerks than his line has captains. They say he reads letters from the capital before he reads the scouts. They say — and here they lower their voices as if HE could hear — that he has never once been seen in the front third of his own army."
- The lesson: his weakness is the audience. Humiliate him publicly (win duels, burn a camp, parade prisoners) and he lashes out on your terms; alternatively, stall him into winter, when he offers battle on terrible terms just to have SOMETHING for the dispatches. The player must track the calendar as a weapon — the only archetype where TIME fights for you, at the price of your own ruler's patience. Symmetrical pressure, asymmetrical nerve.

**[ec-zealot] The Godstruck (the Crusader)**
- Historical basis: Commanders who timed war by the liturgical calendar and read weather as verdict — the People's Crusade's fatal certainties; omen-driven decisions from Salamis to the Sunday battles debate.
- Doctrine parameters: rash/methodical hybrid: methodical baseline, but SCHEDULED fervor — on holy days (seeded, learnable) his aggression spikes to 90; omen-reactive (eclipse/storm incidents swing his whole plan).
- Signature behaviors: attacks on feast days with fanatic morale (+15 his side) and poor coordination (−15 his cohesion); will not fight on certain days AT ALL (free maneuver days for you, if you've learned the calendar); the [bi-omen] incident affects his army triple; atrocity-prone in victory (his sacks are worse — relief ops against him have crueller failure text).
- Scout-rumor text: "A deserter — he crossed to us on a Friday, he was particular about that — says the host will not march tomorrow, whatever we do. Tomorrow is some saint's day. He could not say which saint. He was very sure about the not marching."
- The lesson: steal his calendar. Interrogate prisoners (intel spent here reveals his fervor days), then offer battle on his fasting days and refuse it on his feast days. The counter-lesson: his fervor days are genuinely dangerous — a player who schedules the battle right but stands carelessly meets the fanatic charge at full force. Faith is a doctrine you can read like a book, and the book has teeth.

**[ec-butcher] The Miller (the Attritionist)**
- Historical basis: The grinding school of command — assault after assault into the same frontage; the Roman way of brute repetition that broke Pyrrhus by receipts.
- Doctrine parameters: methodical base; aggression 70 but NARROW: all weight at your center, always; casualty-indifferent (his morale checks are at −20 sensitivity — his units break late).
- Signature behaviors: no feints, no flanking wing, no tricks: a deep center column that attacks, reforms, and attacks again; rotates fresh units through the grind (the rotation is his one art); targets your best formation deliberately (kill the veterans and the rest is arithmetic); never pursues — he kills what stands in front of him and stops.
- Scout-rumor text: "An old soldier who fought him twice: 'You will beat him all day. You will beat him at noon and at three and at five, and at six you will realize what he has been doing to you the whole time you were beating him. Count your men at dusk. Then you will meet him.'"
- The lesson: never trade with him straight — his exchange rate is priced into his plan. Beat him with geometry (his narrowness begs to be flanked — but he knows, and his flanks bite hard at the shoulders per the anti-ganging rule), with cohesion economy (rotate YOUR center like he rotates his — the player must learn his one art to survive it), and with the fatigue clock: his deep column starves and tires faster (supply-attack vanguard fights hit him double). The archetype that punishes "winning" and teaches the difference between winning ticks and winning wars.

**[ec-fox] The Fox of the Hills (the Raider Chieftain)**
- Historical basis: Viriathus' Lusitanian war (147–139 BC): a decade of Rome beaten by a man who never held ground; every march-country guerrilla since.
- Doctrine parameters: cunning base; never offers or accepts set-piece battle (opKind rolls become intercept/ambush/convoy shapes); his army is smaller (60–70%) but faster; night-raid frequency tripled.
- Signature behaviors: his campaign is fought entirely in the vanguard-engagement and march-event layers — the "battle" ops against him are all intercepts and ambushes; he attacks your stragglers (forced-march stragglers may not catch up, with names); feigned regional retreats that turn (the operational-scale feint: an "abandoned" district that closes behind you); local population reports to HIM unless you kept forage discipline.
- Scout-rumor text: "The herdsmen answer every question the same way: they have seen nothing, they know nothing, and — one added, before his brothers looked at him — the lord of the hills sees you now, this minute, and has since the border."
- The lesson: the war against him is logistical and moral, not tactical. Ration instead of forage (the population is his eyes; a disciplined army blinds him), guard everything (his engagements punish the player who auto-assigns escorts), and bait him: he cannot resist a fat, badly-escorted convoy that is actually a trap — the one time the player gets to be the cunning one, and the campaign's designed victory path.

**[ec-mirror] The Student (the Adaptive)**
- Historical basis: Scipio Africanus, who studied Cannae and then performed it on its authors at Ilipa and Zama: the enemy who learns YOUR book.
- Doctrine parameters: any base doctrine, plus enemyMemory expanded: tracks your last TWO battles (cav side, signal use, passivity, pursuit discipline, favorite op responses) and counter-deploys.
- Signature behaviors: whatever won for you last battle is specifically answered (your winning cavalry side finds refused flank + stakes; your horns find him pre-braced; your feint-baiting finds his pursuit suddenly disciplined); operation 3+ against him should feel like fighting your own reflection; his adaptation is REPORTED if intel > 55 ("their right is doubled — exactly where your horse won at [place]").
- Scout-rumor text: "A captured officer asked more questions than he answered — about our last battle, about the horns, about which of our captains led the pursuit. He was not gathering gossip. He was doing sums."
- The lesson: the player must vary or die — the archetype is the anti-solvability thesis made flesh. Beat him by using his adaptation as a lever: he WILL counter your last trick, which means you know where his weight is going before your scouts do. Feed him a signature move you intend to abandon (win battle one with the horns, then never blow them) and his study becomes your feint. The endgame enemy; recommend gating him to war 2+ in the saga.
---

## 5. MARCH / OPERATIONAL EVENTS

All fit the existing EVENTS table shape (title, text, 2–3 options with resolve effects).

**[march-flood] The River in Spate**
- Historical basis: Weather as the true theater commander — the Adige and Trebia in flood; campaigns lost to a week of rain.
- Trigger: weather 'rain' 2+ consecutive days with a stream/ford ahead on the route.
- Text sketch: The ford the maps promised is gone. In its place: brown water moving like it is paid to, carrying fence posts. The locals say two days, maybe three. The locals also say they have never seen it this high, which locals say every year.
- Mechanics: Options: WAIT (distance +1 per day until a hidden 40%/day recede roll; rulerPatience −2/day; men rest — fatigue −8) / SWIM THE CAVALRY, RAFT THE REST (fatigue +10, 30% lose supplies −12 and 20–60 drowned stragglers, but no delay) / SPLIT: cavalry crosses now to keep the schedule of screening, infantry waits (intel keeps flowing, but if a vanguard engagement fires tomorrow, only cavalry-appropriate officers are eligible — a forced-hand casting decision).

**[march-guide] The Guide**
- Historical basis: Hannibal's guide mishearing "Casinum" as "Casilinum" (217 BC) marched his army into the wrong valley; local guides were both indispensable and unverifiable.
- Trigger: scouts 'close' (you depend on locals) or terrain rough ahead.
- Text sketch: The guide is a charcoal-burner with a face like a closed door. He says the short way through the hills saves a day. Your scout-master, who has never been here, says the man smells wrong. The scout-master has been wrong before too.
- Mechanics: TRUST HIM: 65% honest (distance −1, morale +2); 20% lost, not lying (distance +1, fatigue +8); 15% enemy's man — the "short way" ends at [op-ambush] risk +massively or a canceled march day in a box canyon (intel −5, and you hang him, disciplineTone −4 either way, because the men need the story to end properly). ROADS ONLY: safe, +0, and a small standing intel penalty (locals note you distrust locals). TAKE HIS FAMILY ALONG (the period solution): honest outcomes improve to 80%, disciplineTone −6, and the AAR remembers the hostage-taking if things go wrong. If [van-granary] succeeded, this event's guide is TRUE automatically — the district repays you.

**[march-pay-mutiny] The Arithmetic of Loyalty**
- Historical basis: Caesar's Tenth demanding discharge in 47 BC, broken with one word ("Quirites" — civilians); pay arrears as the operational solvent of every era.
- Trigger: operation 2+, morale < 45 or disciplineTone > 65; worse if [van-payroll] failed.
- Text sketch: It is not a mutiny. Nobody uses the word. It is three cohorts who have decided, with great correctness, that today is a rest day. Their officers stand at the edge of it, choosing their faces carefully. Everyone can count the days since the last pay chest.
- Mechanics: FACE THEM ALONE (the Caesar play): resolve-weighted roll — success is legendary (morale +12, disciplineTone −10, permanent +2 order clarity from awe; the chronicle keeps it); failure in front of everyone (morale −10, rulerPatience −6, resolve −8). PROMISE THE ARREARS FROM PLUNDER: works now (morale +8), sets plunderPromised AND a debt flag — if the next battle yields no enemy camp taken, the mutiny returns armed. HANG THE RINGLEADERS: cohesion +8, morale −12, brittle-obedience deepens (disciplineTone −15), and one officer whose men were hanged takes a permanent trust wound.

**[march-plague] The Camp Sickness**
- Historical basis: Dysentery killed more soldiers than steel in every pre-modern war — Henry V's army at Harfleur (1415) half-destroyed before Agincourt was ever fought.
- Trigger: camp by river 2+ days, or food < 3 (bad water, bad meat), or forageDays 3+ (eating the countryside's leavings).
- Text sketch: The surgeons use the old words — camp fever, the flux — the way sailors name winds. Forty men down yesterday, ninety today. The latrines and the water and the arithmetic are all suddenly everyone's business, including yours.
- Mechanics: QUARANTINE THE SICK (move them with the baggage, strict water discipline): stragglers +80, fatigue +6 (carrying duty), contained 75%. MARCH AWAY FROM IT (leave a hospital camp with guards): distance unaffected, morale −6 ("he leaves the sick"), 90% contained, and the hospital camp becomes a possible [van-rescue]-style target. PRESS ON AND PRAY: 50% it burns out (nothing), 50% army-wide: every unit starts the next battle −8% strength and the battle log includes men falling out of line unwounded. Fires the general's-family variant if household is in the baggage train (existing fever arc hooks here).

**[march-allies-late] The Promised Spears**
- Historical basis: Feudal and coalition warfare ran on contingents that arrived late, short, or not at all; the 40-day service clock; Harold's fyrd dissolving before Hastings by calendar.
- Trigger: operation 2+, or strategic orders mention allies; 2–3 days into the march.
- Text sketch: The allied lord's messenger is magnificent and the allied lord is not here. Eight days, says the messenger, perhaps six. The harvest, says the messenger. The roads. His lord's undying love, says the messenger, at length.
- Mechanics: WAIT FOR THEM: distance frozen 2 days, rulerPatience −5, then they arrive as a 7th unit — but 30% 'unsworn' flag (see [bi-stanley]). MARCH WITHOUT THEM: they arrive mid-battle at a seeded tick (the [bi-dust] 10% friendly resolution) or not at all; morale −3 now. DEMAND HOSTAGES/SURETIES: they arrive on time, sworn (never Stanley), but rulerPatience −3 (the court hears you insulted a friend) and the lord's contingent fights at −5 morale (pressed men). The choice writes the Bosworth incident's odds three days before it can fire.

**[march-defection] The Emptying Tents**
- Historical basis: Coalition armies bled contingents at every setback — the allied desertions after Cannae; condottieri renegotiating mid-campaign.
- Trigger: after any defeat or [van] disaster, if an allied/levy contingent exists or cohesion < 40.
- Text sketch: The [contingent]'s cooking fires last night: sixty. The night before: ninety. Their lord swears every man is present and invites you to count, which is how you know not to.
- Mechanics: CONFRONT THE LORD: loyalty roll — success binds them (cohesion +5), failure and they leave TONIGHT, openly (morale −8, but clean). BUY THEM (supplies −20): they stay, flag 'mercenary' (worse morale checks in any losing battle). LET THEM BLEED: lose 5%/day of that unit, no confrontation, and the men who stay are the good ones (unit shrinks but gains +10 cohesion floor — the ones who remained chose to).

**[march-dispatches] The Captured Dispatches**
- Historical basis: Hasdrubal's intercepted letter to Hannibal put two consular armies at the Metaurus (207 BC) and ended the war's northern front; planted correspondence is exactly as old.
- Trigger: wide scouts + a successful vanguard engagement, or random with intel > 50.
- Text sketch: A courier ridden down at dusk, a wallet of oiled leather, a clerk's neat hand: the enemy's next fortnight, in the enemy's own words. It is either the best thing the scouts have ever brought you or the best thing the enemy has ever written.
- Mechanics: The dispatch is TRUE 70% / PLANTED 30% (cunning doctrine: 50/50). Contents (seeded): the enemy's opKind for next battle, his cavalry side, or a vanguard ambush warning. ACT ON IT: if true, the corresponding advantage is locked (e.g., cavHint guaranteed true, or a [van] engagement gets a free approach bonus); if planted, the OPPOSITE (deployed against a phantom — enemy feint efficiency doubled). VERIFY FIRST (spend 1 day + wide scouts): reveals truth 85% of the time, rulerPatience −2. SELL IT TO THE MEN EITHER WAY (announce "we have his plans"): morale +6 regardless of truth — a lie with a shelf life of one battle.

**[march-thirst] The Dry March**
- Historical basis: The march to Hattin (1187): a day's route with no water, chosen under provocation, ending an army before its battle began.
- Trigger: weather 'heat' 2+ days; the direct route tomorrow has no water; the watered route adds a day.
- Text sketch: Two roads. The short one is nine hours of white dust and no wells — the enemy made sure of the wells. The long one follows the river and adds a day, and the ruler's last letter is on your table with its tone showing.
- Mechanics: THE SHORT ROAD: distance −1 extra, fatigue +18, and if battle occurs within 2 days every unit starts at +10 fatigue and [bi-water-out] is pre-armed. Also 30% chance the enemy contests the dry road's end — HE knows what shape you'll be in ([op-ambush] risk). THE RIVER ROAD: +1 day, rulerPatience −3, fatigue −5, and the enemy learns your route (his deployment is 10% better-informed). WATER DISCIPLINE, SHORT ROAD, NIGHT MARCH: needs disciplineTone < 45 (a harsh army executes it) — arrive intact but cohesion −8 and the men remember the night the general marched them like mules (morale −4, trust of low-courage officers −3). The Hattin choice, with Hattin's stakes.

**[march-winter] The Closing Door**
- Historical basis: Campaign seasons were walls, not suggestions — armies raced the first snows home from time out of mind; Charles XII aside, nobody winters in the field by choice.
- Trigger: operation 3+ within one war, or day count high; a cold snap announces it.
- Text sketch: First frost on the tent ropes this morning. The quartermaster has begun a list titled "winter," and stopped showing it to you. Perhaps three weeks of campaigning weather remain, and the enemy knows the arithmetic to the day.
- Mechanics: A campaign-clock event, not a choice: announces a hard deadline N days out. After it: fatigue +4/day, forage yields halved, morale −2/day in the field. The ruler's patience math inverts — now he punishes RISK less than delay ("end it"). Enemy doctrine reacts: political generals go turtle (see [ec-courtier]), rash ones seek the battle you also suddenly want. Design intent: winter converts both commanders' patience into aggression simultaneously — the war's tempo doubles by mutual consent, historically the most battle-dense weeks of any season.

**[march-pontoon] The Pioneers' Wager**
- Historical basis: Boat-bridges from Xerxes' Hellespont to Caesar's Rhine works: engineering as theater and as gamble.
- Trigger: major river on route, no ford, boats available (river placement + supplies > 50).
- Text sketch: The chief pioneer has that look engineers get. Give him the fishing boats, two hundred men, and a day, and he will hand you a bridge. Give the river one bad night of rain and it will hand the boats back one at a time, downstream.
- Mechanics: BUILD IT: supplies −15, one day; 75% a bridge exists (crossing without the flood event, AND the next operation's map may keep it as terrain — a permanent asset); 25% (raised to 40% in rain) the work fails at half-built (day lost, supplies gone, morale −4, engineer officer's confidence −8 in front of everyone). THE LONG WAY: +2 days, rulerPatience −4, safe. Design note: pairs with [ec-engineer] — against him, ALWAYS build; matching his art visibly steadies the men (morale +4 rider on success vs. that archetype).

**[march-followers] The Second Army**
- Historical basis: Camp followers — sutlers, wives, smiths, priests, the unlisted half of every army — slowed columns and steadied souls in equal measure.
- Trigger: operation 2+ (they accumulate), pace 'forced' chosen while followers are many.
- Text sketch: The muster rolls say four thousand. The road says six. The extra two thousand mend, cook, carry, pray, launder, and slow the column by a fifth, and this morning the vanguard captain asked leave to clear the road with the flats of swords.
- Mechanics: CUT THEM LOOSE (send them to the nearest town under token guard): pace improves (forced march straggler cost halved), morale −8 (their wives), disciplineTone +8, and the smiths and surgeons go too — post-battle recovery worsens (wounded officers heal at 40% not 60%). LET THEM FOLLOW: no change, but if your camp is ever sacked the horror is doubled (they were IN it). ORGANIZE THEM (a day, an officer with high discipline detached): fatigue +2 once, then followers become an asset: +5 supplies/operation, ammo-runner incidents auto-succeed. Nobody in the period did the third one, which is why the ones who did are famous.

**[march-scorched] The Black District**
- Historical basis: Fabius' denial program; the Harrying of the North (1069–70): fighting an enemy who burns his own country to starve you.
- Trigger: enemy doctrine defensive or [ec-fox]/[ec-delayer]; forage chosen while entering his district.
- Text sketch: The first village is ash, and so is the second, and the third is ash with the livestock dead in the pens — killed, not taken, which is a message. The men ride through it in silence. The foragers come back with nothing and a new way of looking at the hills.
- Mechanics: Forage yields → 0 in this district (the eaten-out decay jumps to terminal). Options: PUSH THROUGH FAST (forced pace to cross it — fatigue +14, but out in 2 days) / TURN ASIDE (distance +2, but forage resumes) / MAKE HIM PAY (burn what he missed, salt the retreat — supplies +5 from gleaning, morale +3 (revenge is a ration), rulerPatience −5 and this district can never support a later operation; the war's map remembers). Refugee columns join the road either way: intel +5 (they talk) and food −0.5/day (they eat).

**[march-spy] The Man Who Counts Fires**
- Historical basis: Camp espionage was routine — Scipio's "envoys" surveying Syphax's camp; the mutual embassy-spying of every truce.
- Trigger: intel dropped unexpectedly, or after any parley/deserter event; 50% he exists, and the event fires on the suspicion either way.
- Text sketch: The provost brings it to you sideways, as provosts do: a sutler who pays for gossip in good silver, asks after the horse lines, and was seen at the enemy parley wearing different clothes and a different name. It might be nothing. The provost, whose trade is might-be-nothings, has not slept in two days.
- Mechanics: HANG THE SUTLER: 60% you got him (enemy deployment info about YOU degrades — his battle plan aggression misreads your line); 40% wrong man (morale −4, disciplineTone −5, and the real spy tightens his habits: intel-about-you leak continues, now undetectable). FEED HIM A LIE (let him run, stage false councils): requires intel > 40 to execute; the enemy's next battle plan is warped by your script — his cavalry deploys against a wing you announced and won't use (cavHint-in-reverse: you know where his weight will go because you invited it). WATCH AND WAIT: 50/50 he leads the provost to a courier line (intel +12, THEN hang him both) or slips away with your council's real minutes (enemy counterpunch timing improves next battle).

**[march-stragglers] What the Rearguard Found**
- Historical basis: Stragglers were the raiding war's daily bread; a column's tail was its confession of discipline.
- Trigger: stragglers > 120 accumulated, enemy raiders active ([ec-fox] doubles).
- Text sketch: The rearguard found the day-before-yesterday's stragglers. All of them. The report uses the phrase "left on the road" twice and you do not press for a third way of saying it. By nightfall every man in the column will have heard, with details the rearguard did not include.
- Mechanics: Immediate: morale −6, but forced-march appetite collapses — choosing 'forced' pace again within 3 days costs double morale (the men now believe falling out is death, and march tighter but hate you for the proof). Options: DOUBLE THE REARGUARD (an officer + strength detached from tomorrow's readiness — next [van] engagement excludes him) / SWEEP AND PUNISH (send cavalry back: 55% catch the raiders — a mini-engagement with morale +8 on success; 45% they find nothing and the horses arrive tired) / SAY THE WORDS OVER THEM AND MARCH (nothing; cohesion −3; the honest option, and the log should not editorialize it).
---

## 6. ERA-SPECIFIC TACTICAL FLAVOR

One signature mechanic per era, plus two extras. Eras are skins over one ruleset, so each of these is a small rule-DELTA gated on `era`, not a new system.

**[era-roman-camp] The Camp Is the Doctrine (Roman Republic)**
- Historical basis: Polybius on castrametation: the legions built a fortified camp every single night, identical in layout down to the tent-streets — an army that carried its city on its back.
- Trigger: era 'roman'; modifies the camp phase and the daily march.
- Text sketch: The surveyors go forward at noon and by dusk there is a ditch, a rampart, four gates, and a grid of streets in a field that was barley this morning. The men complain about the digging the way they complain about breathing. An older centurion, asked by a recruit why they dig when no enemy is near: "So that it is boring when he is."
- Mechanics: Roman armies fortify camp at HALF fatigue cost, and the fortified-camp morale shield is stronger (camp-threat morale drain −70% not −50%). The delta with teeth: CHOOSING NOT to fortify is a visible doctrinal violation — cohesion −5, disciplined officers' trust −4 ("the general did not dig"), and night-raid events against you gain +20% success. The other eras get a choice; the Romans inherited an answer, and deviating from it is a statement the whole army reads.

**[era-saxon-oath] The Hearth-Oath (Anglo-Saxon)**
- Historical basis: Maldon (991): the sworn hearth-troop dying to a man around Byrhtnoth's body because leaving was the one thing the oath made impossible.
- Trigger: era 'saxon'; at deployment, the player may administer the oath to ONE formation (typically the center, around the general or the standard).
- Text sketch: They swear it the old way, hands on the lord's sword, each man naming his father. It is not a tactic. It is a sentence: the place where the banner falls is the place where the oath is paid, and every man swearing knows the ground he is looking at might be that place.
- Mechanics: The sworn formation gains rout-immunity while its officer lives (it can waver, never break) and +10 morale — and it treats ALL withdraw/reposition-rearward orders as dishonor: refused outright below a very high trust threshold, and even then executed at −30 clarity with a permanent trust wound. If its officer dies, the oath inverts: the unit fights to the death IN PLACE (uncontrollable, terrifying, and occasionally exactly what saves the army). The fighting-withdrawal op with a sworn unit is a tragedy the player authored at deployment — which is the point.

**[era-viking-ships] The Ships Are the Road (Viking)**
- Historical basis: The Great Heathen Army (865+) and the Seine/Loire raids: strategic mobility by keel — armies that appeared a week early from an impossible direction, at the price of carrying nothing they couldn't row.
- Trigger: era 'viking'; at strategic-orders time, if the objective is within reach of navigable water, offer the ship-borne approach.
- Text sketch: The shipmaster measures the river with his eye the way your quartermaster measures a granary. Three days by keel against five by road, he says, and no straggling — nobody straggles from a ship. He does not mention the wagons, because the wagons are not coming.
- Mechanics: Ship approach: MARCH_DAYS reduced by 2 (fewer event/engagement slots — you arrive under-scouted and under-learned: intel starts −10, one fewer vanguard engagement = one fewer dossier sample), supplies capped at 50 (no wagon train), fatigue low (rowing is the rowers' problem — partly: fatigue −10 net), and the arrival direction surprises the enemy: his deployment is 15% misarranged at battle start (advanceTick +15, one wing out of position). A tempo-versus-preparation trade that makes the Viking era FEEL like tempo without touching the battle rules.

**[era-norman-feint] The Trained Lie (Norman)**
- Historical basis: Hastings (1066): the Norman cavalry's feigned flights that pulled the English right off its ridge — a maneuver requiring drilled cohesion most armies of the period could not risk.
- Trigger: era 'norman'; unlocks the 'feigned flight' order for the player's cavalry, and enemy Norman-flavored armies run the existing feint more often and better.
- Text sketch: The order is one word in the conroi's private language and a hundred hours of drill behind it: run away, together, on purpose, and turn on the count. Done right, it is a scythe. Done by the wrong officer, it is simply running away with extra steps, and no one — including his own men — can tell the difference until the turn does or does not come.
- Mechanics: Player-issued feigned-flight order: executes as intended ONLY if the officer's discipline > 70 AND cohesion > 60 (the existing roadmap item, era-gated as Norman signature). Success: pursuing enemy unit is dragged out of line and counter-charged at +25 power with flank arithmetic. Failure modes are the content: low discipline = the flight is real (the officer's own fear was waiting for permission); mid discipline = the turn comes late and ragged (an ugly, honest melee). The dossier entry for a successful one is the rarest in the game: "You have seen him lie with eight hundred men, in step."

**[era-medieval-bows] The Duel of the Strings (High Medieval)**
- Historical basis: Crécy (1346): Genoese crossbowmen, strings wet, pavises still in the baggage, against English longbows with dry strings and a ridge — the era's ranged arms race in one afternoon.
- Trigger: era 'medieval'; when both armies field ranged units, the battle opens with a formal missile duel phase before lines close.
- Text sketch: The first hour belongs to the strings. Sheaf-arrows against quarrels, each side reading the other's rhythm — the crossbows lulling between volleys as they span, the longbows breathing their faster count. The men in the line have nothing to do but stand under it and listen to both clocks, and every man of them can hear which is ticking faster.
- Mechanics: Medieval ranged units get doubled ammo relevance and a rock-paper texture: longbow-flavored units (yours or theirs by army list) shoot 2x rate, crossbow-flavored hit harder per volley and are 50% weather-proofed IF their pavises are up — but pavises take a setup order (30 ticks stationary), and a rash enemy commander sends his crossbowmen forward WITHOUT them (Crécy, replayed as doctrine tell). Rain (including [bi-storm]) hits longbows −40%, pavised crossbows −15%: mid-battle weather can invert the duel. Winning the duel phase (enemy ranged at <30% effect) grants the line-advance +8 morale; losing it means assaulting under fire the whole way in.

**[era-viking-banner] The Raven Banner (Viking, second)**
- Historical basis: The raven banners of the Ragnarssons and of Sigurd the Stout at Clontarf (1014) — victory to the army it flew over, death to the man who carried it; Sigurd carried it himself when no one else would, and died.
- Trigger: era 'viking'; at deployment, assign the banner to one formation — or refuse to fly it.
- Text sketch: The banner is old, and the women who wove it are older stories still. Victory to the host that flies it; a grave to the man who holds it. Finding a bearer is therefore a conversation between your need and some man's mother's grief, conducted in front of the whole army, in silence, by whoever steps forward.
- Mechanics: The banner formation gains +12 morale and projects +5 to adjacent friendlies (the sacred-standard aura, era-flavored) — and its BEARER dies on a seeded roll whenever the unit fights hard (each engaged 100-tick block: 20%). Each death: the unit rolls courage for a new volunteer (rally +10, a named deed, occasionally a future officer candidate) or a beat of no-volunteer (aura suspended, morale −8, until someone — possibly the officer himself, possibly YOUR SON the aide if he's present, a scripted horror — takes it up). Refusing to fly it at all: morale −5 army-wide, but no one dies of weaving. If the banner unit ROUTS: shock −15 army-wide, and the enemy takes the banner as a war-relic (standing recovery objective, as with lost standards).

**[era-medieval-van] The Quarrel of Precedence (High Medieval, second)**
- Historical basis: Crécy and Nicopolis (1396): the flower of chivalry fighting each other for the honor of fighting first, and losing the battle in the winning of the argument.
- Trigger: era 'medieval'; at deployment, whenever the player does NOT assign his highest-pride officer to the vanguard/forwardmost post.
- Text sketch: The marshal reads the order of battle aloud and the pause after the vanguard's name has weight. [The proud one] hears another man given the front, in public, in an age where the front is a form of payment. He bows precisely. The precision is the message.
- Mechanics: The medieval era doubles the existing post-of-honour system's stakes: the slighted high-pride officer doesn't just start at −confidence — he petitions FOR the van by messenger during deployment (a decision interrupt: grant it late = the original holder is now slighted instead; refuse = his first advance order resolves with +15 aggression drift as he races to be first anyway, the Nicopolis failure mode). Conversely, giving the proudest man the van in this era is worth MORE (+8 morale to his unit, not +4). The era where deployment is most explicitly a court ceremony conducted with a map.

---

## POOL SUMMARY

| Category | Count |
|---|---|
| 1. Vanguard engagements | 12 |
| 2. Operation types | 7 |
| 3. Battle incidents | 14 |
| 4. Enemy commander archetypes | 9 |
| 5. March / operational events | 14 |
| 6. Era-specific tactical flavor | 7 |
| **Total** | **63** |

Cross-cutting design notes for the lead developer:
- **Chaining is deliberate**: [van-burn-bridge] failure feeds [van-rescue]; [van-payroll] failure arms [march-pay-mutiny]; [march-allies-late] writes the odds of [bi-stanley]; [van-granary] success rewrites [march-guide]; [bi-camp-fire] removes [bi-arrows-out]'s good option. Crises should have ancestry the player can trace in the log.
- **Every archetype has a designed counter that the doctrine rumor does NOT give away** — the rumor names the doctrine; the counter must be earned by losing to him once. That is the authored-enemy feel: he has a book, the book is readable, and the first reading costs.
- **Sim-state triggers reuse existing levers only**: weather, intel, fatigue, disciplineTone, forageDays, opKind, doctrine, unit status/ammo, grudges, enemyMemory, personal arcs. No new state variables are strictly required except: allied 7th unit + 'unsworn' flag, banner/standard relic tracking, and the winter clock.
- **Voice check**: every text sketch was written to the house rule that report text is a person's account of the state, not the state — and that the driest sentence in the paragraph should carry the mechanic.



---

# Content Bible — Social Historian's Event Pool

Consulting pool for *The General's Burden*. Conventions used below:
- **disciplineTone** follows the codebase: negative shifts = harsher, positive = more indulgent.
- Effects are suggested magnitudes on the 0–100 scales already in `campaign.ts`; tune freely.
- "Observation" always means a TRUE line appended to an officer's dossier, per the tuning
  principle that nothing revealing a hidden number is free — every leak here costs a decision.
- Era variants are noted inline; unmarked items are era-neutral.

---

## 1. MARCH EVENTS

**[march-holy-day] The Calendar Disagrees**
- Historical basis: Roman *dies nefasti* forbade public business; medieval hosts halted for major feasts and chroniclers (who were clergy) savaged commanders who fought on holy days; Jewish forces at Beth-horon were attacked on the Sabbath precisely because piety was predictable.
- Trigger: mid-march, day 2+, once per operation.
- Text sketch: The chaplain informs you, with the diffidence of a man correcting a superior's arithmetic, that tomorrow is a holy day and the army should not march. The men already know. The men always already know these things a day before you do.
- Options: **Halt and observe** (distance +1, morale +6, rulerPatience −3). **March and be damned** (morale −5; officers with high discipline/piety lean: trust −4 among pious; if next day's weather turns foul, the men call it judgment: extra morale −4). **Declare the march itself a devotion** ("the saint walked; so shall we") — 60% morale +3 and the chaplain co-signs; 40% it lands as sophistry, morale −2.

**[march-relic-peddler] The Finger of Saint Sebastian**
- Historical basis: the relic trade was vast and fraudulent — Guibert of Nogent complained that two churches each owned the complete head of John the Baptist. Roman variant: a Marsian charm-seller with snake amulets; Viking: a wandering völva selling battle-luck knots.
- Trigger: any march day.
- Text sketch: A peddler has attached himself to the column selling a saint's finger-bone, guaranteed against arrows. He is doing excellent business. The bone, your physician remarks, is from a pig.
- Options: **Buy it for the army's standard** (supplies −4, morale +6; flag: if the next battle is lost, the relic is blamed and morale takes −4 more). **Expose him before the men** (50% morale +3, the men laugh him out of camp; 50% morale −5 — they preferred believing). **Let the men buy freely** (morale +4, cohesion −3; a soldier's pay spent on pig bone is a soldier who loots harder later).

**[march-plague-village] The Silent Village**
- Historical basis: dysentery and camp fever killed more pre-modern soldiers than steel; Henry V's army was wrecked by flux at Harfleur; armies routinely detoured around plague towns.
- Trigger: day 2+, once per campaign; likelier in rain.
- Text sketch: The village on the road is silent, and not the ordinary silence of people hiding their pigs. Doors stand open. A dog will not stop barking. The scouts report fresh graves — too many, too shallow, too new.
- Options: **Detour around it** (distance +1, fatigue +5). **March through, touch nothing** (30% disease finds the column anyway: fatigue +10, morale −8, stragglers accumulate; else cohesion +2 — the men note your nerve). **Send foragers in; abandoned larders are still larders** (food +1.5, but 55% disease: as above, and the men know exactly whose order it was).

**[march-followers] The Second Army**
- Historical basis: Scipio Aemilianus expelled some two thousand camp followers at Numantia to restore an army rotted by comfort; every medieval host trailed a tail of sutlers, laundresses, wives, and prostitutes that rivaled the fighting strength.
- Trigger: mid-campaign, fatigue moderate.
- Text sketch: The column is now longer behind the soldiers than in front of them: sutlers, washerwomen, wives lawful and otherwise, and a man with a dancing bear whose presence nobody can account for. Your sterner officers want the tail cut off. The tail, it must be said, does the army's laundry.
- Options: **Expel the followers** (cohesion +8, disciplineTone −6, morale −8; march consumption drops: food −0.3/day less). **Tolerate them** (morale +4, food drain +0.3/day, stragglers likelier). **License and tax them** (supplies +5, morale −2; the quartermaster acquires a small empire and the sutlers acquire a grievance).

**[march-abbey] The Abbey's Granary**
- Historical basis: church lands claimed immunity from requisition, and commanders who violated it fed their armies at the cost of being written into history by the very monks they robbed. Roman variant: a temple of Juno with full storehouses; Viking variant: a monastery is a warehouse with singing in it.
- Trigger: food below half, any march day.
- Text sketch: The abbey's granary is full and its abbot is eloquent on the subject of sacrilege. Your quartermaster is eloquent on the subject of empty wagons. Both men are looking at you.
- Options: **Requisition with a written receipt** (food +2, pious officers trust −5, intel −5 — the district's pulpits now preach against you; the monks who write the chronicles begin misspelling your name on purpose). **Pay in silver** (supplies −8, food +2, intel +5 — monks hear everything and grateful monks repeat it). **Leave it and march hungry** (morale −4 — hungry men passing full barns; pious officers trust +3). *Viking era: valences invert — leaving it costs morale, taking it grants morale and the district's undying hatred.*

**[march-straggler-toll] The Wagon Toll**
- Historical basis: Roman centurions notoriously sold exemptions from duty (*vacationes munerum*) — a core grievance of the Pannonian mutiny of AD 14. Sergeants selling comfort is eternal.
- Trigger: fatigue high.
- Text sketch: A sergeant of the baggage guard has been selling places on the wagons to footsore men at a penny a mile. He has, you learn, a waiting list. His defense, offered without shame, is that the market was already there and someone honest ought to run it.
- Options: **Break him before the column** (cohesion +6, disciplineTone −8, morale −3 in his company — he was, the men point out, fair about the queue). **Confiscate the takings for the widows' fund** (morale +4, cohesion +2; the trade continues at a discreeter price — event may recur). **Ignore it** (stragglers accumulate, cohesion −4; the army learns that rules are prices).

**[march-guide] The Shepherd's Path**
- Historical basis: Ephialtes showed the Persians the Anopaea path around Thermopylae; local guides made and unmade columns in every century since.
- Trigger: distance ≥ 2, once per operation.
- Text sketch: A shepherd offers a path through the hills that will save a day — narrow, he admits, and known mostly to sheep. He wants silver and, oddly, a letter attesting he did NOT help you, in case the other side asks.
- Options: **Take the path** (65%: distance −1, intel +5; 35%: the vanguard is ambushed at the narrows — morale −6, fatigue +5, and a TRUE observation logged for whichever officer led the van, good or bad). **Refuse politely** (nothing; the shepherd sells the same path to the enemy's scouts, intel −3). **Take it, and keep his sons with the baggage until the far side** (85% success odds, disciplineTone −4; the district hears about the hostage-taking, intel −3 later).

**[march-prisoners] Mouths Under Guard**
- Historical basis: prisoners were simultaneously ransom assets, intelligence, and a supply problem; Henry V ordered his prisoners killed at Agincourt when the field seemed to turn. Ransoming back captured foragers was routine business between armies.
- Trigger: after a won vanguard engagement.
- Text sketch: The engagement left you thirty prisoners, and prisoners eat. The quartermaster has begun referring to them, in official returns, as "the deficit." An enemy herald waits at the pickets with a ransom offer that is either generous or a way of putting eyes inside your camp.
- Options: **Ransom them back** (supplies +8; the escort trades gossip in both directions — your intel +3, but flag: the enemy commander's picture of your strength improves). **Keep them and let the questioners work** (food −1, intel +8 over the following days). **Turn them loose stripped and shoeless** (morale +2 — grim laughter down the column; harsh-leaning officers approve, confidence +3; the enemy officer whose men they were takes a grudge against YOU — his formations fight you with feeling).

**[march-wonder] The Sign in the Sky** *(era-specific set)*
- Historical basis: Roman — an eagle alighting on the standards (Livy's stock omen; Marius and the eagle); Norman — the long-haired star of 1066; Saxon/Medieval — the parhelion, three suns at once, as before Mortimer's Cross; Viking — ravens following the column all day, Odin's own birds.
- Trigger: clear weather, any march day; once per campaign.
- Text sketch: *(Roman)* An eagle settles on the foremost standard, considers the army at length, and departs unhurried, as if satisfied. Six thousand men saw it. By evening it will have spoken to several of them personally.
- Options: **Proclaim its meaning yourself** (70% morale +8; 30% morale +2 only — and flag: if the next battle is lost, you spent your credibility on heaven, morale −4 extra). **Let the priests own it** (morale +4; the augurs/chaplains gain standing — future religious events land harder both ways). **Say nothing** (morale −3; the interpretations freelance, and one wing decides the omen doomed *them specifically* — that formation deploys shaken).

**[march-eclipse] The Moon Goes Out**
- Historical basis: the lunar eclipse at Syracuse froze Nicias for twenty-seven fatal days; before Gaugamela, Alexander's diviners read the same eclipse as the doom of Persia and marched.
- Trigger: night, once per campaign.
- Text sketch: The moon goes out like a lamp being shuttered, one bite at a time, and the column's ten thousand private theologies all wake at once. Somewhere down the line a man is weeping. Somewhere else, inevitably, a man is taking bets.
- Options: **Interpret it against the enemy** ("their light fails, not ours") — requires nerve: if resolve > 55, delivered clean, morale +6; if lower, the speech wavers where the men can hear it, morale −2. **Halt a day for rites of purification** (distance +1, morale +4, rulerPatience −3). **Forbid all discussion of it** (disciplineTone −5, cohesion +2, morale −5; the discussion continues in whispers, which are worse).

**[march-harvest-men] The Harvest Is Also a War**
- Historical basis: levy service had limits — the Anglo-Saxon fyrd famously went home when its term (or the harvest) came due, and Alfred had to rotate his fyrd in halves to keep an army in the field at all.
- Trigger: late in an operation; saxon/viking/medieval eras favored.
- Text sketch: Three men of the levy were caught before dawn, walking home. They did not run and they do not lie: the barley is ready, their wives cannot scythe it alone, and a winter without bread kills more surely than any Dane. The oldest of them fought for your father.
- Options: **Hang them as the law allows** (cohesion +5, morale −7, disciplineTone −10; the levy companies go quiet in a way you will remember at the next assault). **Flog them and return them to the ranks** (middle path: cohesion +2, morale −3). **Release the oldest levy men openly, with thanks** (morale +6 among those who remain, cohesion −5, rulerPatience −4; food consumption drops a fraction — fewer mouths).

**[march-fouled-water] What the Army Leaves Behind**
- Historical basis: sanitation was doctrine where armies survived — Roman camps dug latrines by regulation, Deuteronomy legislates where soldiers relieve themselves — and death where they didn't; fouled water meant flux within the week.
- Trigger: camped 2+ days in one district, or after a rest day.
- Text sketch: The army has been drinking from the same stream it has been standing in for two days. The physician presents this fact without further commentary, in the manner of a man laying a corpse on a table.
- Options: **Enforce camp discipline like a tyrant** — latrines dug, water details upstream, floggings posted (fatigue +3, disciplineTone −4, disease averted). **Move camp daily** (fatigue +5, cohesion +2, disease averted; the men curse the packing). **Let it be — the men are tired** (40% dysentery within three days: morale −8, fatigue +10, stragglers).

**[march-broken-men] The Broken Men**
- Historical basis: masterless men shadowed every war — Latin *latrones*, Norse *skógarmenn* (outlaws), the routiers and free companies of the high middle ages — and commanders hired, hanged, or dodged them as occasion served.
- Trigger: any march day, once per operation.
- Text sketch: A dozen broken men come in under a rag of truce: deserters of three armies, outlaws of two kings, and one man who claims, implausibly, to be a defrocked priest. They know every path, ford, and hollow in the district, and they will sell all of it for bread and amnesty.
- Options: **Hire them as scouts** (intel +10, disciplineTone +6; 30% they rob a farmstead wearing your colors — locals hostile, rulerPatience −4). **Hang them for the district's peace** (intel +6 — the grateful villages start talking to your scouts; morale −2 among your own hard cases, who notice the precedent). **Buy the paths, refuse the men** (supplies −4, intel +5, no further liability; they sell the same knowledge to the enemy next week).

**[march-hermit] The Voice on the Hill**
- Historical basis: Tacitus describes the Druids of Mona shrieking curses at Suetonius' legionaries across the strait, and the legionaries freezing; Irish annals are rich in holy men cursing armies with professional specificity.
- Trigger: any march day.
- Text sketch: A hermit stands on the ridge above the road and curses the army — methodically, formation by formation, working down the column like a clerk taking inventory. The men march with their eyes fixed carefully forward. The cursing carries wonderfully in the still air.
- Options: **Send up alms and buy a blessing** (supplies −2, morale +5; the blessing is delivered with poor grace but full ceremony). **Drag him down and gag him** (morale −6, disciplineTone −4; every misfortune for a week is now his curse working). **Ride on and let him hoarse himself** (morale −2; that night the watch reports his fire still burning on the ridge, which reports precisely nothing and unsettles everyone).

**[march-ox-widow] The Widow's Ox**
- Historical basis: petitions against requisition abuse are among the commonest surviving documents of pre-modern war, from Roman Egypt's papyri to Angevin plea rolls; the plow-ox was a family's whole capital.
- Trigger: after any foraging day.
- Text sketch: A widow has walked six miles to tell you that your soldiers took her ox — her only ox, the one that plows. The quartermaster observes that there is no receipt, no witness, and no shortage of widows on this road. She stands in the mud with her document, which is her face.
- Options: **Pay her from the chest** (supplies −3, disciplineTone −3 — the column notes that the rule is real; locals soften, intel +4). **Dismiss the claim** (locals harden, intel −4; the men shrug — armies eat). **Investigate properly** (fatigue +2; the trail ends in one officer's company, and the dossier gains a TRUE observation: either he had already punished the thief before you ever asked — discipline high — or he knew and shrugged — discipline low).

**[march-bones] The Old Field**
- Historical basis: Germanicus halted his campaign to bury the six-year-old bones of Varus' legions at Teutoburg (Tacitus, *Annals* 1.61–62) — an act of piety Tiberius criticized as bad for the army's spirit. Both of them were right.
- Trigger: distance 2–4, once per campaign.
- Text sketch: The road crosses an old battlefield — not yours, not this war's, but nobody buried it. Plows have politely gone around the bones for a generation. The men fall silent by companies as they pass, each man doing the same arithmetic about the whiteness in the grass.
- Options: **Halt and bury them** (distance +1, morale +5, pious officers trust +4, resolve −3 — you dream of it anyway, just once). **March past with eyes forward** (morale −4, cohesion +2, resolve −1). **Let volunteers remain to do it and catch up** (morale +3, cohesion −2, stragglers +; the volunteers rejoin at dusk, quiet and oddly settled).

**[march-magnate] The Lord of the District**
- Historical basis: armies moved through webs of local jurisdiction and owed hospitality-politics at every boundary; billeting rights and the courtesies of passage were negotiated, snubbed, and avenged from Roman *socii* to medieval liberties.
- Trigger: day 2+, once per operation.
- Text sketch: The lord of the district rides out with forty retainers, splendid and unhelpful, to offer the hospitality of his hall — to you and your officers, not, his steward clarifies, to the army. He is owed the courtesy. He is also, your intelligencer notes, second cousin to men on the other side of this war.
- Options: **Dine with him** (fatigue +2, intel +8 — he knows every ford and grudge in the valley; flag: his name enters your campaign's court web, for good or ill). **Send gifts and press on** (supplies −4; safe, forgettable). **Requisition from his tenants without asking** (food +1.5, rulerPatience −5 — he writes superb letters; intel −5 as the district closes its mouth).

---

## 2. CAMP / EVE-OF-BATTLE EVENTS

**[camp-panic] The Terror at Third Watch**
- Historical basis: night panics — "panic" fears, named for the god Pan — swept ancient camps without visible cause; Caesar at Vesontio describes an army so gripped by dread of the Germans that men wept openly and sealed their wills.
- Trigger: eve of battle, night; likelier if morale < 50.
- Text sketch: It begins nowhere, as these things do: a horse screams, a cook-pot falls, and by the time the sound reaches the far pickets it has become the enemy inside the palisade. No one is attacking. Four thousand men are now awake and certain someone is.
- Options: **Walk the fires yourself, all night** (morale +7, personal cost: tomorrow's first orders −2 clarity unless resolve > 60; and you SEE things — a TRUE courage observation for one random officer: who was out steadying his men unbidden, and whose tent stayed laced shut). **Send the priests around with lights and litanies** (morale +4, pious texture; cheap, effective, and the credit is heaven's). **Ignore it — panics burn out** (30% it cascades: morale −8, a handful of desertions before dawn, stragglers +).

**[camp-dice] The Night of Dice**
- Historical basis: gambling was endemic in every camp; the joint ordinance of Richard I and Philip II on crusade (1190) regulated dicing by rank precisely because it could not be stopped, only priced.
- Trigger: eve of battle.
- Text sketch: The night before battle, the dice come out — pay, kit, boots, a man's dead brother's ring. By the second watch, one spearman has lost his shoes and another owns two of everything. The provosts look to you: the regulations exist, in the sense that most things exist somewhere.
- Options: **Ban it tonight** (cohesion +4, disciplineTone −5, morale −4; the games continue silently, which takes the joy out and leaves the losses in). **Let it run** (morale +3; 40% a knife comes out over a disputed throw — cohesion −5, and two companies start tomorrow feuding). **Walk through and lose a little money on purpose** (morale +6, disciplineTone +4; your stricter officers' trust −3 — a general on his knees in the dice-ring is a story that outlives campaigns).

**[camp-rite] The Eve Rite** *(era-specific set)*
- Historical basis: Roman *lustratio* and pre-battle sacrifice; medieval mass and general confession before battle (Agincourt's army confessed at dawn); the Norse blót, where the gods' goodwill was bought in cattle — which are also, inconveniently, food.
- Trigger: eve of battle, always offered.
- Text sketch: The priest asks, practically, how much. A great rite takes oxen the army could eat, and the gods — this is the priest's phrasing, delivered while looking at the middle distance — have lately been shown economy.
- Options: **Lavish rite** (food −1, morale +8, pious officers trust +4). **Modest and correct** (morale +3; nobody's soul is embarrassed). **Sleep is the only sacrament tonight** (fatigue −3, morale −4 among the pious; your impious officers approve visibly, which is itself a leak — note who smirks: minor piety texture logged).

**[camp-wills] The Letter-Writers**
- Historical basis: Caesar's officers at Vesontio sealing testaments; before Agincourt the English confessed and made wills. The eve-of-battle letter is one of the oldest genres of soldier's writing.
- Trigger: eve of battle.
- Text sketch: The camp has gone quiet in a particular way: the scribes are doing the business of the whole army, a penny a letter, and the queue at the chaplain's tent runs forty men deep. It is not fear, exactly. It is bookkeeping, of the kind men do when the sum might come due.
- Options: **Lend your headquarters clerks to the men** (morale +6; tomorrow's first orders are drafted by tired hands — opening order −1 clarity). **Forbid the gloom; order the pipers up** (50% morale +5 — the men wanted permission to stop; 50% morale −5 — they wanted the letters). **Write your own** (resolve +4 and spouseBond +4 if married; the men see the general's candle burning at the letter-hour and take it as they choose: small morale gamble, ±2).

**[camp-spy] The Man Counting Fires**
- Historical basis: camps leaked; Scipio Africanus sent "envoys" to Syphax with centurions dressed as slaves to walk the camp and count. Peddlers, sutlers, and grooms were the standing cover.
- Trigger: eve of battle, intel-flavored; once per operation.
- Text sketch: The provosts bring in a peddler taken at the horse lines after dark, his tray of needles largely unsold, his memory of your dispositions — it emerges under questioning — excellent. He is somebody's clerk. His hands have never carried a pack in their life.
- Options: **Hang him at dawn where their pickets can see** (morale +4, disciplineTone −4; whatever he knew dies with him). **Turn him: send him home with doubled numbers** (a real play: flag — enemy commander opens the battle more cautiously; but 30% he confesses the turning and they learn your true count instead, intel edge lost). **Question him all night, gently** (intel +8, fatigue +2; in the morning he is still alive, which is a problem you have merely postponed).

**[camp-sentries] The Sleeping Watch**
- Historical basis: Polybius 6.37 — the Roman *fustuarium*: a sentry who slept was cudgeled by the comrades his sleep endangered, usually to death. Later armies were gentler in law and identical in sentiment.
- Trigger: eve of battle, night.
- Text sketch: Two sentries were found asleep at the northwest picket — the picket, your provost notes with care, nearest the enemy. The law on this is old, simple, and terrible, and every man in camp knows it by heart. The two are nineteen and twenty. They are awake now.
- Options: **The full ancient penalty** (cohesion +8, morale −8, disciplineTone −12; strict officers' confidence +5; no picket sleeps again this war). **Strip, flog, and spare — battle is tomorrow** (morale +2, disciplineTone +4; 25% the same watch fails again tonight: enemy scouts get close, intel −5 and your deployment is partially known). **Punish the whole watch-company with the dawn double-duty** (that formation deploys with fatigue +3; the two men's names dissolve into the group, which is mercy of a kind).

**[camp-hare] The Hare in the Lines**
- Historical basis: Boudica released a hare before battle and read the omen from its run (Dio); hares, owls, and wolves carried era-specific meanings — the owl on a Roman standard was dire, a wolf heard by Norsemen was Odin's favor.
- Trigger: eve of battle, dusk.
- Text sketch: A hare bolts through the camp at dusk, end to end, through the cook-fires and out past the standards, pursued by three dogs and the army's entire theological attention. By full dark there are four incompatible readings in circulation, and the left wing has convinced itself of the worst one.
- Options: **Rule the omen favorable, personally, tonight** (resolve > 55: morale +6; else the ruling sounds like hope, morale +1). **Have the priests conduct something expiatory** (supplies −2, morale +4; ritual is the tax that superstition collects). **Let each company keep its own reading** (cohesion −3; the left wing deploys tomorrow already believing itself doomed — that formation starts −morale).

**[camp-presentiment] The Man Who Has Seen His Death**
- Historical basis: the soldier's presentiment — "I shall not see tomorrow's sunset" — recurs in memoir and chronicle across every era; wise commanders quietly reassigned such men, because dread is contagious and sometimes correct.
- Trigger: eve of battle.
- Text sketch: An old spearman — three wars, two scars, a face like a boot — asks to speak with you and says, without drama, that he has seen his death in tomorrow's field and would like to meet it with his affairs in order. He is not asking to be excused. He is asking you to witness the paper.
- Options: **Move him to the baggage guard** (morale +3 among the veterans — the general listens; by midnight three more men have seen their deaths, cohesion −3). **Witness the paper, return him to the line** (cohesion +3; and note how his own officer handles him tomorrow — TRUE observation of that officer's compassion or rigidity). **Give him the standard to carry** (60% he stands like a rooted oak and his company with him — morale +5; 40% the weight of the omen breaks him at first contact — his formation opens the battle shaken).

**[camp-fires] Arithmetic of Fires**
- Historical basis: counting enemy cook-fires was the standard night intelligence of the pre-modern world, and inflating one's fires the standard counter — feigned strength by doubled fires appears from Xenophon to the Hundred Years War.
- Trigger: eve of battle.
- Text sketch: The enemy's fires tonight run half again as long as last night's. Either they have been reinforced, or every man of them is tending two fires and grinning at the thought of you on this hillside, counting.
- Options: **Send a picked night patrol for a true count** (75%: intel +10; 25%: the patrol doesn't come back whole — morale −4, intel −3). **Wake your ablest officer and read the fires together** (his guess is recorded, and tomorrow proves it — a TRUE competence observation either way; his fatigue +2 into the battle). **Decide it changes nothing** (resolve > 55: cohesion +2, the staff absorbs your calm; else you lie awake doing arithmetic in the dark, resolve −3).

**[camp-wine] The Captured Tun**
- Historical basis: measured pre-battle drink issues were normal practice, and over-issue was fatal; Norman chroniclers claimed the English sang and drank the night before Hastings while the Normans prayed — propaganda, but instructive propaganda.
- Trigger: eve of battle, after any capture/forage windfall.
- Text sketch: The foragers took a wagon of wine two days ago, and the whole army knows it is sitting under guard behind your tent, thinking about tomorrow. A delegation of sergeants has approached the quartermaster with a theological argument about last rites and thirst.
- Options: **Issue a measured ration** (morale +6, fatigue +2 at dawn; "measured" survives contact with soldiers about 80% of the time). **Lock it and promise it for the victory feast** (morale −3 tonight; flag: +8 after a win — and your own words on record again, redeemable at the worst moment). **Stave the barrels** (morale −6, disciplineTone −6; your strictest officers nod, the men watch the wine go into the mud and file it under things not forgiven).

**[camp-servant] The Servant at the Picket Line**
- Historical basis: officers' households were leaky vessels — servants, grooms, and pages carried debts, letters, and gossip in and out of every camp in history.
- Trigger: eve of battle, night; once per operation.
- Text sketch: The watch takes a servant of [officer]'s household slipping out past the horse lines at moonset with a bundle and a bad story. What the bundle is determines everything: his master's plate (because his master has not paid him since midsummer), a letter in cipher to somebody at court, or dice-debts fleeing their creditor.
- Options: **Question him publicly at the morning muster** (the truth surfaces as a TRUE observation about that officer — his meanness, his secret correspondence, or his household's rot; the officer's pride −6, trust −5: you unstitched him in public). **Return him quietly with a word** (the officer owes you a debt of silence: trust +5; no observation — you paid for goodwill with ignorance). **Let him run** (nothing tonight; 30% he reaches the enemy lines full of camp gossip — the enemy opens tomorrow knowing your watchword and dispositions, small deployment leak).

**[camp-silence] The Singing Across the Water**
- Historical basis: opposing camps in earshot on the eve is a set-piece from the *Iliad*'s eighth book to Bannockburn; what each side heard in the other's noise — or silence — moved real morale.
- Trigger: eve of battle, camps close.
- Text sketch: The wind sets from the enemy camp tonight and carries their singing across the water — not war-songs, just singing, the kind men do at home. Your own camp has gone entirely quiet to listen. It is not fear. It is arithmetic: they sound exactly like you.
- Options: **Order up your own songs** (70% morale +5 — the camps trade verses like artillery and honors end even; 30% the men are too tired to be commanded into joy, morale −2). **Let the silence stand** (morale −2, cohesion +2; the men sleep, having thought their thoughts). **Walk to the pickets with your staff to listen** (intel +3 — you count fires while you're there; morale +3 — the story of the general strolling toward the enemy to enjoy the music does half a speech's work; resolve +2).

---

## 3. PERSONAL / FAMILY EVENTS

**[p-armor] The Armorer Is Diplomatic**
- Historical basis: commanders aged in harness; the topos of the old general's body is universal, from Marius drilling with the recruits at sixty-plus to shame his critics, onward.
- Trigger: career.age ≥ 40, once per war.
- Text sketch: The armorer, refitting your harness for the campaign, suggests — with the delicacy of a man defusing something — that the cuirass could be "eased through the middle, as is often done for gentlemen of experience." He waits. His apprentice studies the ceiling.
- Options: **Dawn drills with the recruits until it fits** (fatigue +2, resolve +4, morale +3 — the army watches its general sweat with the eighteen-year-olds, which is worth speeches). **Let it out and say nothing** (resolve −2; honest, and the mirror keeps its opinion). **Make the joke yourself, loudly** (morale +2, resolve +1; owning the belly costs less than hiding it, and the armorer exhales).

**[p-fathers-ground] Your Father's Ground**
- Historical basis: multi-generational service was the norm; Roman nobiles marched past their families' monuments and battle-sites, and the pressure of ancestral example was a named force in their moral world (*imagines*).
- Trigger: march passes a site of your father's war or your own first war; once per campaign.
- Text sketch: The road bends and the valley opens and you know it before the scouts name it: your father fought here, in the war before yours. You were younger than your aide is now when he told you about it — once, badly, staring at the fire — and never again.
- Options: **Ride the old line alone at dusk** (60% resolve +5 — the ground is just ground, and something long-carried sets itself down; 40% resolve −4 — the dead have questions). **Take your son to see it** (requires aide/son present: resolve +4, family note appended; the telling goes better than your father's did, which is the whole point of sons). **The column keeps its schedule** (resolve −2, small; the valley falls behind, and stays exactly where it is, forever).

**[p-daughter-question] What Fathers Are For**
- Historical basis: soldiers' letters home answering children's questions survive from Vindolanda onward; the gap between the war and the nursery is one of the oldest silences in military life.
- Trigger: household at home, daughter under 12, any march day.
- Text sketch: In the packet from home, folded inside your wife's letter, a smaller letter in enormous careful script: *"Have you killed men? Osgyth says you have killed a hundred men. I said you had NOT."* Your wife's postscript observes, dryly, that she awaits your ruling with professional interest.
- Options: **The truth, in small words** (resolve +4, spouseBond +3; the reply takes you three drafts and costs you an evening, and is the best thing you write this war). **The heroic version** (resolve −2, spouseBond −2 — she must now govern a nursery that believes its father is a dragon-slayer, and says so). **Answer everything else in the letter but that** (resolve −3; the omission is itself an answer, and children, unlike courts, notice omissions).

**[p-beggar-veteran] The Man From Your First War**
- Historical basis: veteran destitution was chronic in every pre-modern polity — Roman veteran-settlement crises, maimed soldiers begging at medieval church doors — and it was the serving soldier's most legible image of his own future.
- Trigger: any march day, warsFought ≥ 1 or career.age ≥ 38; once per war.
- Text sketch: Among the beggars at the town gate, a face — older, ruined, but the same man who stood at your shoulder in your first battle, when you were both someone's frightened juniors. He knows you at once. He does not call out. That is the part you will keep thinking about.
- Options: **Put him on the wagon rolls** (supplies −2, resolve +3, morale +5 among your veterans — the word travels the column by nightfall: the general does not forget his own). **A purse, and his name said loudly in front of witnesses** (morale +2, resolve −1; dignity restored for a week, futures unchanged). **Do not stop** (resolve −4; the memory files itself carefully, and reissues itself at the next low night).

**[p-quarrel] The Argument in the Wagon**
- Historical basis: families did follow pre-modern armies, and the danger to them was real and known — the debate this event stages happened wherever they did.
- Trigger: household in camp, operation ≥ 2 or after any camp-threat event.
- Text sketch: It has been coming for days and it arrives after supper: she wants to know your plan for the children if the camp is ever taken, and "the veterans' wagon-fort" is not, her tone conveys, a plan. You are both right. That is what makes it an argument instead of a conversation.
- Options: **Send them home, mid-campaign** (spouseBond −6 — she reads it as banishment, whatever it is; resolve −4 for a fortnight of empty wagon; removes all family-in-camp risk for the rest of the war). **Promise them the safest ground, and mean it** (spouseBond +4; flag: your next camp choice is constrained toward the defensible option, and fortifying is effectively mandatory). **Have the argument all the way through, once** (spouseBond +6, resolve −2 tonight; nothing changes except that you are allies about it now, which changes everything).

**[p-dream] The Recurring Field**
- Historical basis: commanders' dreams were taken seriously enough to be state business (dream-interpreters accompanied ancient armies); the veteran's recurring dream is as old as testimony gets.
- Trigger: resolve < 45, night, once per operation.
- Text sketch: The dream again: the same field, the same gap opening in the same line, and you unable to say the order that fixes it — your mouth full of something, wool, or years. You wake with the sentence still unsaid and the candle burned to the dish.
- Options: **Keep vigil with the chaplain** (fatigue +2, resolve +5; whatever the rite does or does not do, saying the field's name aloud to another living man does something). **Drown it in returns and rosters** (intel +3 — the paperwork has never been so read; resolve −3, compounding — the dream is patient). **Tell someone who knew you then** (if spouseBond > 50 or romance bond > 50: resolve +7, bond +4; otherwise the telling lands badly, resolve −2 — some doors need the right listener).

**[p-romance-ledger] The Ledger Speaks** *(romance arc, new beat)*
- Historical basis: army supply was the great theater of embezzlement in every era — Greek generals' *strategoi* trials, medieval purveyance scandals — and outsiders who could actually read accounts were rare and dangerous.
- Trigger: romance stage 2, day 3+; once per war.
- Text sketch: She comes to your tent with the army's forage returns — which she should not have, and has — and lays her finger on a column. "Someone buys hay at a price no hay has ever cost, and the same hand signs it every week." The hand belongs to the quartermaster. The countersigning hand belongs to one of your officers.
- Options: **Act on it** (supplies +8, the countersigning officer's trust −6, and a TRUE observation appended: his honesty or negligence, in ink; romance bond +4 — she is taken seriously, which matters to her more than the silver). **Bury it** (romance bond −6 — she watches you choose comfort over arithmetic and revises something; officer corps undisturbed). **Give her your seal and let her audit the train openly** (supplies +5, morale +3 — the men adore anyone who fights the quartermasters; officers' collective pride bruised, cohesion −2; if the romance is an affair, scandal chance +15%).

**[p-romance-salt] Below the Salt** *(romance arc, new beat)*
- Historical basis: camp society had its own precedence wars; the standing of an irregular companion was policed by officers' wives with a rigor field discipline never matched.
- Trigger: romance stage 2, camp suppers occurring; once per war.
- Text sketch: At the senior mess, [officer]'s wife has seated her below the salt, between the chirurgeon and an empty chair — an insult with a pedigree, executed flawlessly. She ate, you learn afterward, with perfect composure and left early. She has not mentioned it. That is how you know.
- Options: **Say nothing** (romance bond −5; she absorbs it, and files where you were while she did). **Reorder the seating yourself at the next supper** (romance bond +6, that officer's pride −4; the camp's wives now have a war of their own, and if this is an affair, scandal chance +15%). **Stop attending the suppers** (resolve −2, cohesion −2 with the officer corps; retreat, dressed as indifference, deceiving no one at either table).

**[p-son-blood] After the Skirmish**
- Historical basis: fathers and sons served together throughout the period; the first kill and what an older man says after it is a scene in sources from the sagas to chivalric biography (the Marshal's early tourneys).
- Trigger: aide exists and a vanguard engagement was fought this operation.
- Text sketch: Your son was at the edge of it — within his orders, barely — and a man came at him, and now the man is dead and your son is sixteen and standing in your tent at midnight having rehearsed several ways to begin, all abandoned. He is not distressed, exactly. He is asking, without asking, what he is now.
- Options: **Sit with him as a father** (resolve +3, family note: *steadied after his first blood*; seeds a future TRUE courage observation if he takes a command — you will know exactly what his nerve is made of). **Answer as a general — "cleanly done; write the report"** (he squares his shoulders and hardens a full year in one night: future son-officer aggression +, and something unsaid stays unsaid; resolve −2). **Send him to the chaplain** (resolve +1; the priest is good at this, and it is also, you are aware, a delegation).

**[p-mother] The Black-Bordered Letter**
- Historical basis: news of family deaths reached commanders weeks stale — Caesar learned of his daughter Julia's death by dispatch in Gaul; the Roman ideal (and the medieval one) made the public bearing of private grief a performance of command itself.
- Trigger: any march day, career.age ≥ 36; once per saga.
- Text sketch: The letter is in your brother's hand, which is how you know before breaking the seal. Your mother died on the fourth of the month, was buried on the sixth, and the army has been eating and marching and quarreling for eleven days in a world that already contained this fact without your knowing it.
- Options: **Announce it; the army observes a mourning day** (distance +1, morale +2 — filial piety reads well in every era; resolve +4; rulerPatience −2). **Tell no one and work** (resolve −6 over the following days; grief unpaid collects interest). **Write the funeral instructions yourself tonight — the stone, the prayers, the disposition of her rings** (fatigue +2, resolve −2 tonight then +4; the letter does the grieving in the only dialect you are fluent in).

**[p-spouse-mirror] She Reads You Too**
- Historical basis: the spouse-as-observer cuts both ways; the best-documented readers of commanders were the people who shared their tents.
- Trigger: household in camp, resolve < 45.
- Text sketch: "You flinch when the courier's horn sounds," she says, not looking up from the mending. "You have stopped eating breakfast. You checked the horse-lines three times last night — the sentries have started saluting preemptively." A pause. "I am not asking. I am reporting."
- Options: **Hear it** (resolve +6, spouseBond +5; being seen accurately turns out to be rest of a kind). **Deflect with the joke about the sentries** (spouseBond −3; she permits the joke; she also stops reporting, and her next officer-reading this war is not offered — future spouse-counsel suppressed). **Snap at her** (spouseBond −8, resolve −3; the apology takes the whole next evening and is accepted with terms).

**[p-faith] The Silent Heaven**
- Historical basis: the crisis of faith after atrocity is quietly present in the sources — penitential ordinances imposed on soldiers after battles (as after Hastings) assume the damage; Roman religiosity had its own dark nights about neglected rites.
- Trigger: after a burned village, a defeat, or family loss; once per war.
- Text sketch: At the morning rite you did not take the offering, and you are aware the chaplain noticed, because he is careful with you now, the way physicians are careful. It is not that you believe nothing. It is that you saw the village, and heaven watched the same thing you did, and only one of you has to answer for it.
- Options: **Take the rite; confess or sacrifice as the era requires** (resolve +5, pious officers trust +2; the forms hold weight even when the hands shake). **Keep the forms, hollow** (resolve −2; sustainable, corrosive, invisible to everyone except the chaplain and you). **Say the true thing aloud to the chaplain** (60% he answers like a man who has heard it before, because he has: resolve +7; 40% he is scandalized and it travels: pious officers trust −3).

**[p-token] The Wooden Horse**
- Historical basis: soldiers of every era carried tokens; amulets, favors, and children's gifts sewn into clothing are attested from Roman phalerae to crusader keepsakes.
- Trigger: family exists, any march day; once per war.
- Text sketch: At the bottom of your kit, wrapped in a stocking that is not yours, a small wooden horse — the one your youngest carries everywhere, or did, until someone packed it here by stealth. Its mane is chewed. There is no note. It is, itself, the note.
- Options: **Carry it into battle** (resolve +4; flag: if the battle is lost while you carry it, resolve −3 extra — the token acquires a debt, and superstition is not optional at your age). **Send it home with the next courier and a letter** (spouseBond +4, resolve +2; the horse has duties at home, you write, guarding its owner). **Keep it in the camp chest and tell no one** (resolve +2; middle path; on bad nights you know exactly where it is).

**[p-anniversary] The Day the Ford Was Lost**
- Historical basis: armies kept private calendars of their disasters; veterans' commemoration of a shared bad day — drink, silence, the dead men's names — is a constant of military society.
- Trigger: warsFought ≥ 1, a marked calendar date; once per war.
- Text sketch: You did not remember the date until you saw the old sergeants gathering at their own fire with that particular quietness, and then you remembered it all at once. Twelve years since the ford. The men who were there do not speak of it. They just sit together, annually, so that nobody sits with it alone.
- Options: **Join their fire, uninvited, with a jar** (morale +6 among veterans, fatigue +2; resolve 60% +4 — the night ends in the good stories; 40% −4 — it ends in the names). **Send the wine over and keep your tent** (morale +3, resolve −1; correct, and slightly lonely in both directions). **Order the chaplain's office for the dead of that day** (morale +4 among veterans, pious officers trust +2, resolve +3; grief conducted in form, which is what forms are for).

---

## 4. INTERLUDE EVENTS (the years between wars)

**[int-honors] The Question of Precedence**
- Historical basis: Roman triumph-hunting and its senatorial obstruction; medieval precedence wars fought over banners and seating (the Scrope–Grosvenor armorial suit consumed years and depositions from half the chivalry of England).
- Trigger: interlude after a won war.
- Text sketch: The honors are voted, granted, or proclaimed — and then the other general's faction argues that his relief column, which arrived after the fighting, should share them equally. The dispute will be settled in rooms you hate, by men who were not there, according to rules that were not written for the people who bleed.
- Options: **Press your claim through the winter** (rulerPatience −6, resolve +4; the rival becomes a named court enemy — flag feeding future court-whisper events with a face on them). **Yield with public grace** (rulerPatience +6, resolve −3; your spouse is furious on your behalf, which is its own comfort: spouseBond +3). **Let your wife's family fight it** (requires spouse; spouseBond +4, outcome 60% favorable — they are better at those rooms than you will ever be).

**[int-steward] The Steward's Arithmetic**
- Historical basis: the absentee landlord's eternal problem; Cato the Elder's *De Agricultura* is one long distrust of stewards, and medieval manorial accounts exist largely because lords assumed theft.
- Trigger: interlude, estate-holding eras.
- Text sketch: Three years of campaign, and the estate's books have developed a poetry all their own: barns that burned twice, oxen sold and resold, a vineyard that has apparently never once produced wine. The steward greets your return with the composure of a man who has been rehearsing longer than you have.
- Options: **Prosecute him** (next war starts supplies −5 — lawyers eat like armies; the district notes that you count; future stewards honest). **Dismiss him quietly, eat the loss** (nothing now; 40% the next steward, having studied the precedent, steals faster). **Hand the books to your spouse permanently** (spouseBond +5; next war starts supplies +5 — she is terrifying at this; the court jokes about who commands at home, resolve −1, and the joke is accurate).

**[int-memoir] The Other Man's Version**
- Historical basis: memoir as advocacy is ancient — Caesar's *Commentaries* are a defense brief in campaign dress; medieval lords paid monastic chroniclers, and the man who funded the scriptorium won the battle a second time, permanently.
- Trigger: interlude, warsFought ≥ 1.
- Text sketch: A rival general's account of your shared campaign is circulating — read aloud at dinners, copied, enjoyed. In it, his counsel was disregarded, his wing saved the day, and you appear chiefly as weather: an obstacle the story's hero moved through. It is well written. That is the intolerable part.
- Options: **Commission your own chronicle** (wealth/supplies −4 next war, rulerPatience +4, resolve +3; your veterans' version enters the record, footnoted with their names). **Answer it once, before the ruler, with the dispatch ledger open** (gamble on your true record: if warsWon ≥ 1, patience +8 and his stock falls; else patience −5 — ledgers are pitiless in all directions). **Silence — the men who were there know** (resolve −2 now; officers who served that campaign trust +3, quietly and forever).

**[int-old-officer] The Old Soldier's Son**
- Historical basis: officer corps reproduced through patronage — Roman *litterae commendaticiae*, medieval household placement; a commander's obligation to old comrades' sons was real, personal, and unwritten.
- Trigger: interlude.
- Text sketch: An officer of your old wars — grayer, thicker, leaning on the fireplace as if it were a shield-wall — visits with his son and asks the thing the visit was always for: a place for the boy, next war. The father was solid. The boy has his mother's chin and, you suspect within the hour, neither parent's sense.
- Options: **Take the boy** (next war: one replacement officer arrives with known lineage — one TRUE starting observation inherited from what you knew of the father, plus the father's dossier note; you owe the past, and the past collects). **A warm letter to another command** (rulerPatience +2; the debt discharged at someone else's expense, a courtier's solution and you know it). **Refuse honestly** (resolve −2; the old man takes it standing, thanks you for your candor, and something twenty years old closes with a click).

**[int-audit] The Cost of You**
- Historical basis: commanders answered for money everywhere — Athenian *euthynai*, Roman provincial accounting, exchequer inquiries into wardrobe and war expenditure; more careers died of audits than of arrows.
- Trigger: interlude, especially after a lost or expensive war.
- Text sketch: The crown's clerks request your campaign accounts, "as a formality," which is a phrase clerks use the way sappers use quiet. Somewhere in three years of receipts is a bridge you paid for twice and a month where the fodder outran the horses. There always is.
- Options: **Attend in person, a season at the capital** (rulerPatience +8, resolve −2 — courts drain you like a wound; spouseBond −3, a season is a season). **Send the accounts with your best clerk** (patience +2; 30% a discrepancy blooms unattended into a scandal: patience −8). **Send the accounts wrapped in a memorial of the victories** (if warsWon ≥ 1: patience +5 — victory is the only receipt that audits itself; else patience −4, and the wrapping is noticed).

**[int-education] What the Boy Will Be**
- Historical basis: the three roads for a well-born son — court page, arms at home, the church — with fosterage and oblation as the standing institutions; each choice was a bet on a different future and a different master.
- Trigger: interlude, son aged 8–12.
- Text sketch: He is old enough now that the question stops being theoretical. The court would take him as a page — polish, connections, and other men's values. Home would make him yours: horses at dawn, letters at night, your own crooked syllabus. The church would make him safe, which is the offer you keep circling back to at odd hours.
- Options: **Court page** (future court-intel events unlocked — the boy's letters; but he comes back with the capital in him: future aide/officer ambition +10, loyalty −5). **Arms at home** (future aide bonus improved — his dispatch-hand is trained by yours: aide clarity +1 extra; spouseBond +2). **The church** (he leaves the saga's officer path forever; pious standing +, one permanent court ally in a generation; resolve −2 and +2, in that order, over years).

**[int-harvest] The Year Without Rain**
- Historical basis: subsistence crises punctuated every pre-modern generation; the lord's choice between remission and enforcement in a famine year was the district's whole politics, and armies were raised from the districts that remembered.
- Trigger: interlude, random.
- Text sketch: The rain failed in the spring and failed again in the summer, and now the reeve stands in your hall with the rent rolls and the harvest figures, which do not meet, and cannot be made to. The tenants are not refusing to pay. They are asking which of their children should.
- Options: **Remit the rents** (next war starts supplies −5 and morale +5, cohesion +3 — the levies of a remembered mercy stand differently). **Enforce, with the customary allowances** (supplies +5 next war, starting morale −4; one tenant's son will desert on the march, with feeling, and be caught, and become an event). **Buy grain at market and resell at cost** (supplies −3, rulerPatience +2 — the crown notices order kept without cruelty; morale +3).

**[int-dedication] The Spoils on the Wall**
- Historical basis: victory paid its debts upward — Roman manubial temples built from spoils, Norse sword-offerings sunk in bogs and rivers, medieval chantries endowed to sing for the dead of a named battle, forever.
- Trigger: interlude after a won war.
- Text sketch: The spoils sit in the strong-room being finite. The priest proposes a dedication; the steward proposes a roof for the great barn; and some evenings you stand in there with a lamp and propose nothing, remembering what several of the objects cost by name.
- Options: **Dedicate lavishly for the fallen** (wealth −; next war starts with pious officers trust +4, morale +3, resolve +4 — the names are sung on a schedule now, and it turns out you needed that). **Keep it against lean years** (supplies +5 next war; whispers of impiety, starting morale −2). **Endow the widows and the maimed of your old army** (next war starting morale +6 among veterans, rulerPatience +2; no temple, no roof, and the best-spent silver of your life).

**[int-wound] The Knee Speaks First**
- Historical basis: the aging commander is a figure in every tradition — Marius in his late consulships, the old kings who had to be lifted to the saddle; physicians advised, and were overruled, in every era.
- Trigger: interlude, career.age ≥ 45 or after a wound flag.
- Text sketch: The physician finishes with the knee, sits back, and delivers the verdict you paid him to deliver honestly and now resent: another campaign will finish it. He recommends dignity, correspondence, and chairs. He is right, which you both agree never to mention again.
- Options: **Hide it and drill through the winter** (next war starts resolve −3 — the knee keeps its own ledger; pride intact, gait convincing until the first wet week). **Acknowledge it openly** (next war: personal frontline command discouraged — flag raises wound risk if you fight at the front; resolve +2 for the honesty; the army adapts faster than your vanity does). **The famous surgeon** (wealth −5; 60% next war clean; 40% worse — fatigue effects amplified, and the surgeon's fee non-refundable in every sense).

**[int-widow-pension] The Widow of the Left Wing**
- Historical basis: petitions from soldiers' widows to commanders survive across the whole period; arrears of pay owed to the dead were a notorious bureaucratic void that only personal patronage reliably crossed.
- Trigger: interlude, an officer or notable soldier died under your command last war.
- Text sketch: She arrives at your hall in traveling clothes with a folder of documents tied in string: her husband's commission, his last letter, and the crown's three replies, each politer and emptier than the last. He died holding your left. She has come, she says, because the crown answers letters and you answered his.
- Options: **Pay the arrears from your own purse, with a deed-letter she can show at need** (supplies −3, resolve +5; the story circulates among your old officers: next war starting trust +2 across the corps). **Take up her case with the crown personally** (rulerPatience −3 — the clerks resent being made to work; 70% she is paid within the year, resolve +3). **Take her son into your household as a ward** (a page in the hall, family note appended; a future aide-candidate not of your blood — texture for the saga; resolve +3, and an obligation that will one day stand in front of you wearing a helmet).

---

## 5. OFFICER TEXTURE

*(Backgrounds and epithets are generation-time texture; quarrel items are events; observation items define TRUE dossier lines keyed to hidden traits, each gated behind a decision per the "no free leaks" rule.)*

**[off-bg-ledger] The Contractor's Son**
- Historical basis: wealth bought military position everywhere — sons of publicani and tax-farmers in Rome, merchants' sons knighted in the later middle ages — and old blood sneered at them in every century.
- Trigger: officer generation; background slot.
- Text sketch: Background: "His father supplied three armies and bought his son a place in this one; the older families say you can smell the counting-house on his commission." Design note: his REPUTATION runs 10–15 below his true competence — snobbery is a systematic bias, and he is a candidate for the campaign's under-rated man.
- Observation lines: *"He does his own fodder arithmetic without moving his lips. The men born to commands cannot."* / *"His companies are paid on time. It is astonishing what that buys."*
- Decision hook (event): the older officers protest his seating at the council table. Seat him by seniority of commission (his confidence +6, their pride −4) or by birth (his trust −8, cohesion +2 among the old names).

**[off-bg-ranks] Risen From the Ranks**
- Historical basis: the primipilaris — the Roman first-spear centurion elevated to equestrian rank; serjeants knighted on the field in the medieval period. Rare, real, and socially radioactive.
- Trigger: officer generation; background slot.
- Text sketch: Background: "Twenty years a serjeant/centurion before the field promotion; he has done, personally, every task he now orders done, and can tell to the ounce when a man is lying about his kit."
- Trait tendencies: discipline high, competence solid, pride prickly precisely and only about birth; tactical horizon narrow — he thinks in hundreds, not thousands.
- Observation lines: *"He inspects feet, not banners."* / *"At the council he goes silent when the talk turns to grand maneuver — and watches the mapmen the way a mason watches architects."*

**[off-bg-hostage] The Returned Hostage**
- Historical basis: hostage-fosterage was standard diplomacy — Aetius raised among the Huns, Norse and Anglo-Saxon fosterage exchanges; the returned hostage knew the enemy intimately and was trusted by nobody.
- Trigger: officer generation; background slot.
- Text sketch: Background: "Seven boyhood years at the enemy's court as a pledge of a treaty since broken; he speaks their tongue in his sleep, the men say, and the men say it where he can hear."
- Design note: the loyalty whisper is usually WRONG — roll his true loyalty independently and high-biased; this background is a machine for teaching players that reputation lies. Mechanical hook: +intel when facing his fostering enemy (he reads their heralds' idioms, their doctrine); the army watches him for the first betrayal that mostly never comes.
- Observation lines: *"He translated the enemy herald's insult accurately, including the part aimed at himself."* / *"When their war-horns sounded he named the call before the scouts did — recognition, not longing, but the men nearest him could not tell the difference, and he knows it."*

**[off-bg-outlaw] The Man Who Served His Exile**
- Historical basis: Norse outlawry for killings (three winters abroad, per the Icelandic pattern); medieval penitential exile and crusade imposed for homicide. Violence, priced and paid.
- Trigger: officer generation; background slot, viking/saxon/norman favored.
- Text sketch: Background: "Outlawed for a killing in his youth, served his term in foreign wars, and came home with a reputation and no one who dares confirm it. There are two versions of the killing. Which one he tells you is a test — of you."
- Observation lines: *"He told you the version where he was wrong. Consider what kind of man volunteers that."* (honesty high) / *"He told you the version the ballad prefers. The old men from his district look at their feet during it."* (honesty low)
- Decision hook: ask him about the killing directly (he answers — TRUE honesty observation; his trust −3, you asked) or never ask (trust +2; no leak).

**[off-bg-scholar] The Man With the Book**
- Historical basis: literate soldiers carried Vegetius through the entire middle ages the way clerks carried psalters; ancient officers quoted Xenophon at councils. The book could be wisdom or a splint for a broken judgment.
- Trigger: officer generation; background slot.
- Text sketch: Background: "He owns a copy of the old manual on war and has read it, which puts him one book ahead of most of the council, as he is aware."
- Observation line (the tell): *"He cites the manual more the closer the enemy comes. On quiet days he has opinions; on loud ones, citations."* — citation frequency tracks his fear: courage low if the quotes cluster before contact; if he quotes it after victories, that is merely vanity.
- Decision hook: at council, ask him what the book says (he shines, confidence +5, and you learn nothing about HIM) or ask what HE says (a TRUE competence observation from a naked answer; his fatigue of soul visible; confidence −2 if he flounders).

**[off-epithets] How Names Lie: An Epithet Table**
- Historical basis: epithets were survivorship bias and ballad economics, not personnel files — "the Hammer," "the Good," "the Unready" (a mistranslated pun); Norse bynames could be ironic, inherited, or simply wrong.
- Trigger: generation-time; assign with deliberate truth-noise per the reputation system.
- Text sketch — the set, each with its designed lie:
  - *"the Hammer"* — earned in one lucky charge nine years ago; may sit atop true aggression 20. The name writes checks the man now dreads cashing.
  - *"the Careful"* — the word does not distinguish wisdom from fear, and neither can the player until a bridge needs holding.
  - *"the Lucky"* — statistically meaningless, socially priceless: his formation gets +morale at deploy, whatever his true traits, because men crowd a lucky standard.
  - *"the Old Man's Shadow"* — his father's epithet, inherited unearned; his true traits rolled fully random against a gilded reputation.
  - *"the Silent"* — says nothing at councils. The army assumes depth. Roll d2: depth, or nothing at all in there; the player finds out at the worst price.

**[off-quarrel-van] The Order of March** *(quarrel event)*
- Historical basis: precedence disputes over the vanguard wrecked councils from the crusades (the perpetual Franco-English van quarrels) back to Roman consuls alternating command by day.
- Trigger: march, two officers with pride > 60.
- Text sketch: Two of your officers each claim tomorrow's vanguard — a post of honor that is also, this week, a post of arrows. Listen to HOW they argue it: one is arguing fodder, roads, and where his scouts already know the ground. The other is arguing his grandfather.
- Options: **Assign by roster, publicly, forever** (cohesion +4, both officers' pride −3; dull as bread and twice as sustaining). **Choose on the merits and say the reasons aloud** (winner confidence +6; loser takes a grudge-adjacent slight — trust −5, and a TRUE observation logged for BOTH: which man argued logistics and which argued ancestry is competence leaking in public). **Split it: van by day, first camp choice by night** (fatigue +1; a compromise both accept and neither respects).

**[off-quarrel-forage] The Forage Districts** *(quarrel event)*
- Historical basis: allocation of foraging grounds and water was the daily politics of any camped army; horses starved by a lazy captain's short forage-runs decided campaigns.
- Trigger: camped or slow march; food/supplies below half.
- Text sketch: Two officers dispute the forage districts: one wants the far valley for his horses and is willing to ride for it; the other has claimed the near fields by seniority and let his remounts thin rather than sweat. The quarrel is about grass. The quarrel is never about grass.
- Options: **Give the far valley to the man willing to ride** (food +1, the seniority man's pride −5; TRUE observation for both: *"He rode two hours for good grass"* — care/competence high — and *"His remounts are ribby and his temper short, in exactly that order"* — low). **Uphold seniority** (cohesion +2, the diligent man's trust −4; the horses vote later, at the charge). **Pool all forage under the quartermaster** (cohesion +3, both officers' pride −3; the quartermaster ascends another rung toward de facto third-in-command).

**[off-quarrel-debt] The Dice Debt** *(quarrel event)*
- Historical basis: officer gambling debts are a constant of camp society in every period; debt between men who must trust each other in line was recognized as a command problem, not a private one.
- Trigger: after any camp gambling event, or random; two officers, one owing the other.
- Text sketch: [A] owes [B] a sum that has stopped being money and become standing. B has begun collecting it in small public humiliations — a chair moved, a toast withheld. A has begun, your provost notes, avoiding B's sector of the line, which on a battlefield is called something worse than avoidance.
- Options: **Pay it yourself, privately** (supplies −3, both trust +4, disciplineTone +3; both men owe YOU now, which is either loyalty or two grudges on layaway). **Annul it by decree — no play-debts on campaign** (creditor's pride −6 and a grudge seeded between them formalizes; debtor's trust +5; the camp's whole credit economy notes the precedent). **Let honor sort it** (30% it sorts itself as a duel-adjacent incident: cohesion −6 and TRUE observations for both — how each man behaves when it comes to points is courage and mercy leaking at once).

**[off-obs-mess] The Supper Index** *(observation channel)*
- Historical basis: eating before battle as a nerve-read is ancient soldier-lore; commanders from antiquity noted who ate and who could not.
- Trigger: eve of battle; delivered via the spouse-counsel channel, the old sergeant, or your own eyes if you dine with the officers (which costs the evening: fatigue +1 — the "no free leaks" fee).
- Text sketch / lines: *"He ate two helpings and was asleep by second watch."* (courage high) / *"He pushed the food around his plate and told his loudest stories."* (fear, masked as noise) / *"He did not come to supper; his servant says he was inspecting pickets."* (diligence — or the inability to sit still; flag as ambiguous, cross-reference required: this line should sometimes be the brave man and sometimes the coward, teaching players that single observations are samples, not verdicts.)

**[off-obs-horse] The Horse Knows** *(observation channel)*
- Historical basis: horsemanship as character-read is period-universal; grooms gossiped, and a man's horse could not be bribed to lie.
- Trigger: march days; surfaces via the master of horse or your own ride down the column (costs a half-day with the column instead of the maps: intel −2 that day).
- Text sketch / lines: *"His horse stands calm under him even when he shouts — old fear, long mastered; the shouting is for the men, not from him."* (courage high, theatrical discipline) / *"Fresh spur-galls on both flanks. Nobody panics a horse like that at a walk. Something happened in the last fight that never reached your reports."* (courage low, and a report that was colored — cross-link to the report-coloring system) / *"He dismounts on the steep ground to spare its legs, and makes his whole troop do the same. His men grumble and their horses last."* (discipline + care high)

**[off-obs-rain] Whose Men Have Dry Feet** *(observation channel)*
- Historical basis: the state of a unit's boots, drainage, and firewood after weather was the readiest audit of its officer in any pre-modern army; inspecting generals from Rome onward read companies this way.
- Trigger: the day after rain weather; delivered as a march report if the player walks the camp (fatigue +1) rather than taking the officers' written returns (free, and colored).
- Text sketch / lines: *"[A]'s companies dug run-off channels last night without being told. [B]'s slept in a pond and his return this morning says 'all in order.'"* (A: discipline/competence high — TRUE observation; B: a documented instance of report-coloring — flag his future "all is well" dispatches) / *"[C] requisitioned the chapel for his own billet and left his men the churchyard."* (pride high, care low; the district's priest is now an enemy of the army, intel −2)
- Decision hook: act on what you saw (censure B now — his pride −6, but the army learns returns are audited: cohesion +4) or bank it silently (no cost; the dossier line is yours alone).

**[off-deeds] The Deed Ledger** *(generation texture + observation channel)*
- Historical basis: deeds lived as ballads and toasts, not records, and inflated in the telling; the escalade that "he led" was often led by a dead man whose family lacked a poet. Veterans knew the true versions and traded them at fires.
- Trigger: generation-time deed strings; the true version surfaces if the player drinks at the veterans' fire (evening cost: fatigue +1, morale +2).
- Text sketch — deed strings with truth-flags:
  - *"First over the wall at [siege]"* — TRUE for some; for others the ballad's version, and the escalade party remembers a different first man. Veterans' fire yields: *"It was Wulfhere's boy who topped the wall. Him behind, and no shame in second — except he never once said so."* (a TRUE honesty/pride observation).
  - *"Held the ford at [river] until the third hour"* — usually true; the interesting question the fire answers is whether he held because he was ordered, or because he could not hear the withdrawal over his own pride.
  - *"Burned the granaries at [district]"* — true, effective, and the district remembers; marching that district again with this officer visible costs intel −3. A deed can be an asset and a liability wearing the same sentence.

---

*End of pool: 17 march, 12 camp, 14 personal, 10 interlude, 13 officer-texture = 66 items.*


---

# Editor's additions (lead dev items, written against the actual systems)

## New order types & command tools

**[order-1] Feign Withdrawal**
- Historical basis: Hastings 1066; standard steppe doctrine.
- Trigger: player-issuable order; requires officer discipline > 60 to execute as intended.
- Mechanics: unit withdraws 150px maintaining cohesion; enemy pursuers gain `pursuing` status and lose cohesion; on signal or proximity trigger, unit turns with charge bonus. Low-discipline officers turn it into a REAL withdrawal (morale bleed, possible rout cascade). The mirror of the enemy's feint — and the same trap for you.

**[order-2] Dress the Line**
- Trigger: player-issuable; unit must be holding.
- Mechanics: 20 ticks immobile; restores cohesion +15, small morale +3; officer discipline adds. Creates a real "do I have time to reform?" decision mid-battle.

**[order-3] Volley Fire / Conserve Shafts**
- Trigger: toggle order for ranged units.
- Mechanics: volley = double missile output for 5 volleys, then ammo exhausted penalties; conserve = half output, ammo lasts. Officers with low discipline ignore conserve orders when threatened.

**[order-4] Send an Officer's Son as Messenger**
- Trigger: when a messenger would be dispatched and an officer's kin serves in the army.
- Mechanics: guaranteed delivery +clarity, but if killed, that officer gains a grudge against YOU (trust collapse) or against the enemy officer whose unit killed him.

**[signal-1] The Second Horn Call**
- Trigger: deployment phase choice: bind ONE additional signal meaning (withdraw / rally / general advance).
- Mechanics: two-signal system; each formation rolls to distinguish WHICH call it heard — in fog or melee they can execute the wrong one. Two prepared strokes, quadruple the ways to garble them.

## After-action & judgment content

**[aar-1] The Field Burial**
- Trigger: after any battle with >15% friendly losses.
- Text sketch: The pyres/graves take all night. The men watch which officers walk the rows.
- Options: walk the rows yourself (+army morale next op, -resolve small: you read every face); delegate to the chaplains (safe); order the march before burials finish (+1 day tempo next op equivalent, -morale, -disciplineTone shifts, veterans remember).

**[aar-2] The Captured Standard**
- Trigger: decisive/costly victory where an enemy unit was destroyed.
- Options: send the standard to the ruler (+patience +8); grant it to the officer whose men took it (+confidence +15, his rival -trust); melt it down for pay (+supplies, everyone slightly appalled).

**[aar-3] The Prisoner Column**
- Trigger: victory with enemy losses > 30%.
- Options: ransom them (supplies +, enemy officers return next op — grudges persist and THEY remember); impress them into the ranks (men +150 to weakest formation, cohesion -10, desertion risk event armed); release them (rulerPatience -4, but next op enemy morale -4: word spreads of your clemency).

## Saga & dynasty arcs

**[saga-1] The Son's Rivalry**
- Trigger: war 2+, son holds a command alongside a carried-over veteran officer.
- Mechanics: the veteran resents the boy's rapid rise (or takes him under his wing — driven by veteran's pride vs. loyalty). Creates rivalId between son and veteran, or a mentor bond (+son competence growth between wars).

**[saga-2] The Old Wound**
- Trigger: general age > 40, was wounded in a prior war.
- Mechanics: resolve baseline -5 in rain weather; new march event where you hide the limp from the men (resolve cost) or ride the wagon (men notice, morale -2, but resolve preserved).

**[saga-3] The Biography Problem**
- Trigger: war 3+, warsWon >= 2.
- Text sketch: A chronicler attaches himself to your staff, writing your life mid-campaign. Officers begin performing for the page.
- Options: give him access (officers' pride +5 army-wide, deviations up — glory-hunting); restrict him to the baggage (safe); dictate your own version (+rulerPatience, -resolve: you read your own legend and know better).

**[saga-4] The Rival General**
- Trigger: interlude after a war with patience < 60.
- Mechanics: a named rival general appears in the saga layer — he gets the OTHER commands, his victories tighten your patience thresholds, court letters track his star. If you're dismissed, he takes your army (and your veteran officers' letters describe serving under him, bitterly or happily — final trait leak).

**[saga-5] The Daughter's Son**
- Trigger: war 3+, daughter wed-officer 4+ years ago.
- Mechanics: a grandson exists; her husband (your officer kin) asks to name him after you; +kin loyalty, and a new stake — that officer now fights with your bloodline's future in his formation.

## Battle report texture (cheap, pure prose pools)

**[texture-1] Sound layer**: reports referencing what the player HEARS at their position: "From the left, the rhythmic crash of shields — the fyrd chant when they are holding well." / "The noise from the right wing has changed pitch. You have heard that change before. It is never good." — keyed to actual unit morale states of nearest fighting units, filtered through distance.

**[texture-2] The men watch the general**: when player at HQ and idle > 100 ticks: "The staff have stopped talking. Everyone near you is very carefully not asking what you are waiting for." — small pressure not to sit; when personally leading: "The man beside you keeps glancing sideways. Your face is the only report on the battle he will get all day."

**[texture-3] Officer voice differentiation**: each officer gets a speech-pattern tag (laconic / florid / pious / profane) applied to his acks and reports — pure text transform, massive characterization value. The laconic man's "Done." vs the florid man's three-clause acknowledgment. Players learn to FEEL who's talking before reading the name.
