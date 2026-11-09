# Better Skyla tip upgrades

Skyla's existing thank-you jar now has five purchasable tiers. The original three tiers retain their exact prices, probabilities and payouts. Two later purchases add a clear reason to keep improving hospitality without changing pumpkin prices, visitor traffic or guest wallets.

| Tier | Name | Price | Best tip chance | Basket rate |
| --- | --- | --- | --- | --- |
| 1 | A little thank-you | £250 | 25% | 4% |
| 2 | A warm welcome | £1,000 | 38% | 6.5% |
| 3 | Lovely hospitality | £3,800 | 50% | 9% |
| 4 | Velvet hospitality | £9,500 | 60% | 11.5% |
| 5 | Moonlit generosity | £22,000 | 68% | 14% |

Best chance requires a five-star basket and quick service. The existing quality multiplier, service penalties, quick-service payout bonus and **£25 maximum tip** remain unchanged. Quick service is within four seconds at the farm stall or eight seconds from joining the indoor queue through checkout. Faster checkout upgrades help preserve that full chance; the jar does not secretly change queue speed or pumpkin grading.

Guests pay tips only from money left after their purchases and protected food/wanted-pumpkin allowances. There is no minimum guaranteed payment. Tier 4 makes a quick four-star £100 basket's conditional tip £11 instead of £9; tier 5 raises it to £14. The corresponding four-star chances are 53.4% and 60.52%, below their five-star best chances. These are offers when a guest tips, not average or guaranteed earnings.

## Presentation

The existing `customerCareUpgrades` card shows the next tier's name and ownership count, current → next best chance and a clearly labelled conditional four-star £100-basket example. A short note explains quality, service targets, remaining money and separate accounting. The existing single-tap purchase and `data-care-upgrade="tipJar"` selector remain in place. Both the Skyla shop page and customer-care page use this same card helper.

The rules and menu share `tipJarBenefits(level)` and `tipJarOffer(level, options)`. Reading these helpers never spends money, grants tips or advances the saved sale serial. `quoteCustomerCare` retains its existing deterministic grading and random payment decision.

## Dependencies and saved games

| Change | Depends on | Preserve |
| --- | --- | --- |
| `rules/customer-care.js` tier data and shared offer helper | Existing customer-care transactions and finite wallets | `tipJar` ID and original tiers 0–3; £25 cap; protected shopping allowances |
| `ui/customer-care-sheet.js` upgrade-card function | Existing farm shop/customer-care presenters | Shared purchase selector, single-tap buying and existing menu layout |
| `restoreCustomerCare` | Existing saved integer tier field | Accept tiers 0–5; retain the separate tips/receipt ledger; no schema or version change |
| `settleCustomerCare` | Existing committed pumpkin receipt | Charge once and leave product takings separate from voluntary tips |

Save version remains **18**. The saved shape is unchanged; only the accepted maximum of the existing `customerCare.tipJar` integer increases from three to five. Old tier ownership is preserved. Carrier bags still stop at three tiers. No global price, arrival, sale or progression rule changes.

## Verification

```sh
node --test --test-isolation=none test/skyla-tips.test.mjs test/customer-care.test.mjs test/cooking-sales.test.mjs test/kitchen-bulk-sales.test.mjs test/big-spender.test.mjs
```

All **39 named checks pass**. Coverage includes exact recorded legacy-tier payout totals, later-tier purchase limits and persistence, improved but wallet/cap-bounded tips, unchanged grading, quality/service effects, real mixed sales accounting, protected food allowances and once-only settlement. In a fixed 1,000-sale £42-basket comparison, fast-service totals are £1,106 at tier 3, £1,923 at tier 4 and £2,637 at tier 5; the same sample retains its original tier 0–3 results exactly. These measurements describe that test sample rather than a promised income rate.

Final browser card/purchase screenshots and build checks are owned by the integration pass.
