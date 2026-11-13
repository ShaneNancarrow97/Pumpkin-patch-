# Supplied MIDI catalogue additions

Ten uploaded MIDI files are retained in the existing offline catalogue, bringing it to 31 tracks. Settings already renders its song selector from this catalogue; existing shuffle bags, manual selection, volume and scene/narration attenuation continue to apply.

- Crossing Field — LiSA / Sword Art Online opening
- Billie Jean — Michael Jackson
- Africa — Toto
- Still D.R.E. — Dr. Dre
- Bohemian Rhapsody — Queen

The second set adds five more songs:

- Dancing in the Moonlight — supplied arrangement; no artist is identified in the uploaded file's metadata
- Bitter Sweet Symphony — The Verve
- Duality — Slipknot
- Paint It, Black — The Rolling Stones
- Fireflies — Owl City

Original MIDI bytes are retained. The source hashes and parsed timing are in `supplied-catalogue-additions.json`. Run `node tools/audit-music-catalogue.mjs` from `voxel/` to check the complete bundled catalogue and every source file without Web Audio or a network service.

Billie Jean and Bohemian Rhapsody carry several minutes of silence after their final notes. Their explicit `trimTail` catalogue flag finishes playback 0.35 seconds after the last decoded note, leaving the source files and all note timings unchanged. The synthesiser's melodic release adds only 0.12 seconds, so the tail is retained. Existing tracks, especially the nine-pass Numb riff, retain their original loop timing.

The five newer songs use their original durations and tempos, with no tail trim or loop. Fireflies uses 15,360 ticks per quarter note; the existing decoder respects that resolution. The additions retain 230,310 source bytes, with durations of 186.7–266.7 seconds and source peaks of 11–24 concurrent notes.

All 31 tracks remain inside the existing 64-voice synthesiser. The supplied tracks have source peaks of 2–28 concurrent notes. The source MIDI arrangements are played through the game's small synthesiser; they are not studio recordings or vocal tracks.
