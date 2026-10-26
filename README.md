# Midnight Moon — Pumpkin Patch

Extract Pumpkin-Patch-HTML.zip and open Pumpkin-Patch.html in Chrome or Safari. All art, fonts and music are embedded. The existing fullscreen button is retained.

Upgrade one plot through Starlight, then buy Midnight Moon seeds for £7,800. Deep navy pumpkins carry golden crescents and stars, grow in 48 seconds and sell for £110 before bonuses. Existing saves keep their four original varieties and gain an empty fifth stock bin. New game defaults are unchanged; no test funds or unlocked crops are shipped.

## Claude handover
Source 6138ecae1f670ad49550547cefd5f6f32bee4366 on contractor/midnight-moon. Runtime ab0fe12e0d0554f1903affdb91bfd3f43452dc27. Read 45-midnight-moon-pumpkin.md.

Apply midnight-moon-from-121f4cd.patch only on completed cooking base 121f4cdbb85770de38c3860c2e51647f8bd2c921; inspect conflicts against your own work. This is a binary git patch. The artifact branch contractor/midnight-moon-download contains downloads only; do not merge it into game source. Larger kitchen/VIP/animation integration is unfinished and separate, not included in this HTML.

Validation: 68 Node test files pass; six actual-browser checks pass on this exact HTML, including seed purchase and reload. Desktop and unfolded Fold screenshots reviewed; clean committed-source build is byte-identical. CI is tracked separately on the runtime commit; no CI result is assumed here. Physical device performance and Android OS fullscreen are not hardware-tested.

HTML SHA-256: 9c8da2415dad4141114479233ea32f6b4c201c715c3195bc3fd9721757d1c4c5
