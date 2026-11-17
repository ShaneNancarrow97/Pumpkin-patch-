# Narration dependency matrix

| Change | Depends on | Could affect | Review/check |
|---|---|---|---|
| Authored line or speaker | Intro, folk, quests and pure tour content | Clip lookup and cast continuity | Regenerate script, only changed clips, coverage test |
| Voice player | Local clip map, browser media gestures, device voice prefs | Playback cancellation, memory, music duck | Deferred play/ended/error/visibility unit tests; real MP3 browser playback |
| Intro controls | Existing title, text reveal, keyboard/controller focus | Skip/Next, intro completion | Begin, Next and Skip; four viewport screenshots |
| Village conversation | Session owner, explicit per-page speaker, choice callbacks | Wrong portrait/voice, duplicate rewards | Multi-speaker quest and reply, silent choices, replay without callbacks |
| Village tour | Existing camera curve and title callback | Narration cutoff or stalled camera | Hold only while loading/playing, bounded wait, mute/skip/end |
| Music duck | Existing scene gain, jingle duck and MIDI volume | Music failing to recover or saved volume changing | Compositional gain test and independent voice/music settings |
| Settings | Existing preferences and save-file export | Older save compatibility, preview lifecycle | Default missing prefs, clamp volume, stop on close; old save fixtures |
| Offline packaging | esbuild MP3 data URL loader | HTML size and missing remote assets | Build, manifest SHA/duration audit, no external browser requests |
| Contractor integration | Previous village contractor commits; lead's later edits | Shared main/UI/view merge conflicts | Inspect both branches, retain lead changes; no reset of lead checkout |

No changes to simulation rules, currencies, stock, home requirements, level thresholds or village reward claims are needed. The separate explorer shares the same recordings and conversation component but retains its temporary-state behavior.
