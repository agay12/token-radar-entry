# Token Radar — token-radar-01 entry

A pre-token protocol launch radar for [make.fun competition token-radar-01](https://make.fun/c/token-radar-01).

`main.ts` reads the sealed DefiLlama snapshot at `/input/snapshot.json`, scores every protocol that records no token with a signal-weighted value model, and writes:

- `/output/board.json` — 200 ranked rows (rank, implied value, full model breakdown, a 7-step farm plan with costs and times each)
- `/output/dashboard/` — the dashboard page (no network, no framework)
- `/output/data.js` — the board as one script the page reads
- `/output/screenshots/` — board, detail and filtered views
- `/output/dossier.json` — the judge's dossier, via `vendor/makefun-board.ts`

## The value model (`lib/model.ts`, `radar-v2-signal`)

```
implied = TVL × 0.3 × sizeMult × growthMult × maturityMult × certaintyMult
sizeMult      = (TVL / $2M)^-0.15         bigger pools dilute a launch
growthMult    = 1 + clamp(7d, −60…+120)/100 × 0.6
maturityMult  = 1.35 − min(age, 1095d)/1095 × 0.6
certaintyMult = 1.20 when TVL, 7d change and listing date are all reported
```

Every protocol is scored by the same function from its snapshot record alone — no hardcoded names. The 40 protocols on the house watchlist are all covered; 160 more early rows below the $50M floor are ranked by TVL; the 24 protocols that already trade a token are set aside in a separate Live market view, never ranked.

## Run it

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

Node 22.18+, standard library only.

## Dashboard

Static page: sortable and filterable board (search, watchlist/early scope, chain, category, sort by value/TVL/growth/age), a detail view per protocol with the model's multiplier bars and a costed, timed farm plan, a Live market view, and a Method page stating the model. Dark console theme, amber-on-slate palette.

[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/c/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/agay12/token-radar-entry/rank.svg)](https://make.fun/c/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/agay12/token-radar-entry/reward.svg)](https://make.fun/c/token-radar-01)

## License

MIT
