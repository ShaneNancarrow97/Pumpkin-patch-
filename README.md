# Pumpkin Patch — kitchen & hospitality workshop

## Play
Extract Pumpkin-Patch-HTML.zip and open Pumpkin-Patch.html in Chrome or Safari. The full game, art, music and fonts are embedded. Existing fullscreen, save import/export and mobile camera controls remain. Normal starting funds/locks are unchanged: no test state ships in this file.

At level 5, buy Maisie's Midnight Kitchen truck (£900). Order raw ingredients, then buy equipment for the unlocked home kitchen. Choose Mix to discover combinations, or research recipes. Cook one or several batches, and sell the food through Skyla's cabinets. The truck's paid chef can repeat supplied recipes. Visitors can eat at the new tables.

Also included: four animated Renaissance VIPs and their paid entry upgrade, 10–20 visitor rush upgrade every five minutes, larger parties and rare starving guests, Sandy's deluxe recipes/automation, free purple wheelchair look for Natalie, two-tractor hayride and longer scenery routes, and Midnight Moon pumpkins. See the handover for exact gates/costs.

## Claude contractor pickup
Source 2da0f293cc6c4b4b2506a4a27c717099d1226695, branch contractor/kitchen-workshop. Runtime 74c55a23e96c725214f5b99638b28b48c2b28606. Read 46-kitchen-hospitality-workshop.md. Artifact branch contractor/kitchen-workshop-download contains downloads only; do not merge it into source.

Choose exactly ONE patch:
- workshop-from-6138eca.patch: completed Midnight Moon handover 45 base 6138ecae1f670ad49550547cefd5f6f32bee4366.
- workshop-and-midnight-from-121f4cd.patch: completed cooking handover 44 base 121f4cdbb85770de38c3860c2e51647f8bd2c921, if Midnight Moon is absent.

The patches contain playable code, compressed runtime art, tools and handover notes. High-resolution art sources and browser screenshot evidence are kept on the source branch rather than duplicated in the patch ZIP. Fetch those folders from the branch before rerunning sprite preparation tools.

Never apply both. Preserve Claude's private changes and reconcile shared integration files and the unpublished 20-level progression deliberately. No root 2D game change is included. Additive v13 saves keep existing player purchases and data; older executables cannot read the new features, so preserve a save export when moving versions.

## Verification
76 Node test files pass; the final truck visibility adjustment also passes five native truck/delivery checks. The full browser flow passes 28 checks on its pinned build. The exact download passes eight focused visual/animation/layout checks after the visibility adjustment and safe wheelchair startup guard; no browser errors or external assets. Clean committed-source rebuild is byte-identical, and both binary patches pass git apply --cached --check on their stated bases. CI status is recorded separately in the repo verification folder; no result is assumed from an earlier commit.

Physical Fold 7 frame rate, Android file handlers and native OS fullscreen remain unverified. Managed browser checks serve the identical offline HTML on loopback. Default and optional voxel character modes were covered across the two browser passes.

HTML SHA-256: 01212e3ea69b9641edef42c9faa5d0e2b9cfc585eaafca23a3fbf074e580e56f
