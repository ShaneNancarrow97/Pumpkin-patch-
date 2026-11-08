# Spoken Pumpkin Patch & Mothlight — contractor handover

This isolated contractor patch adds pre-recorded ElevenLabs dialogue to the existing farm introduction, Mothlight camera tour and village conversations. It does not change quests, prices, rewards, village gates, save format or the lead's unpublished work.

## Integration base

- Branch: `contractor/mothlight-voices`.
- Parent: `b530974120e43c28f0f97424208cc25d6278d2f9` on `contractor/village-design-and-cast`.
- Last observed lead `voxel-reference`: `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8` (8 November 2026).
- This patch depends on the previous contractor's saved-village integration. Take that branch first if it is not already integrated. Do not cherry-pick the narration adapters onto the older explorer-only village without adapting them.

## Player experience

The introduction keeps its readable captions and Begin/Next/Skip controls. Each village dialogue page uses the correct speaker, including conversations where Elowen and Rowan alternate. Player choices are silent; the neighbour's answer is voiced. Small voice/replay buttons sit alongside the conversation controls. Settings offers independent voice volume, mute and a preview. Voice playback lowers music temporarily without changing the player's music preference.

The village tour waits for each recording to finish, then continues its existing camera route. Muted, missing or autoplay-blocked narration leaves the tour usable. Skip always stops the recording and returns control. Closing a conversation, leaving the village or hiding the browser stops speech; returning to the tab does not unexpectedly restart it.

Recordings are bundled in the single HTML as MP3 data URLs. Gameplay never contacts ElevenLabs and never needs an API key or internet connection. Only the active clip is decoded, and its media source is released after use.

## Scope of the recordings

**Partial recording delivery:** 164 of 332 catalogued lines were generated (9,992 synthesis characters; about 10 minutes 54 seconds). ElevenLabs returned `quota_exceeded`: the supplied key had a 10,000-credit limit and 8 credits left. No automatic retries or account/billing changes were made. The farm introduction and all 11 village tour cues are recorded, along with 104 Elowen and 41 Rowan greeting/chat/gift lines. The 168 remaining lines include the quest dialogue, Vesper and later cast greetings. They remain readable and playable as text; this release does not claim they are voiced. See `recording-status.json` beside the assets for exact missing IDs.

The initial batch reached extended chats before quests. Future generation now prioritises quest dialogue ahead of extra chats, then gifts and later content. Resume after credits are available; verified clips will be reused.

`node tools/voice-script.mjs --summary` reports the current authored catalogue. This includes the farm introduction, all tour stops, Green quest conversations, chat branches, gift responses, Vesper's greetings and six later residents' existing preview greetings. Later quest/completion/favour lines are catalogued separately from reachable gameplay: recording their words does not implement the unfinished systems.

The recordings use stock cast voices, not voice impersonations of Shane or Natalie. See `assets/voices/mothlight-v1/cast.json` and the per-clip manifest for the actual performers, model, settings, duration and checksum. Direction notes describe the intended cast; they are not model instructions or extra words spoken to the player.

## Rebuilding and extending

1. Edit the authored dialogue in `src/content/`, then export the deterministic recording script with `node tools/voice-script.mjs > /tmp/voice-script.json`.
2. Run `python3 tools/generate-voices.py --help`. Its default is a dry run. Generation requires an explicit flag, an environment credential or private credential file, and an explicit character limit. Never put a credential into source, a command argument, this handover or the built HTML.
3. Existing verified recordings are reused. A change to the speaker, caption, spoken text, cast, model or settings invalidates the matching recording. The tool does not automatically retry a possibly billed request.
4. Rebuild the clip import map, run the tests, build the full HTML and run the focused narration browser check. Keep captions usable when a recording is missing.

Text matching uses a stable speaker + Unicode-normalised text key. Stage directions stay in the visible caption/key but are omitted from synthesis. IDs, metadata and content coverage are tested; do not hand-renumber the recordings.

See [DEPENDENCIES.md](DEPENDENCIES.md) for review boundaries and [RELEASE.md](RELEASE.md) for the final verification and downloads.

### Resume the remaining voices

With `ELEVENLABS_API_KEY` securely set in the build environment and sufficient credits (at least 11,258 synthesis characters for the currently missing lines), run from `voxel/`:

```sh
node tools/voice-script.mjs > /tmp/mothlight-voice-script.json
python3 tools/generate-voices.py --script /tmp/mothlight-voice-script.json --cast assets/voices/mothlight-v1/cast.json --out assets/voices/mothlight-v1 --generate --max-characters 12000 --publish-js src/ui/voice-clips.js
node tools/audit-voice-assets.mjs > docs/contractor-patches/mothlight-voices/voice-audit.json
npm test
node build.mjs
node tools/narration-qa.mjs dist/pumpkin-patch-voxel.html
```

The credential can alternatively come from a private file through `--key-file`. The tool refreshes the existing exact coverage status when publishing; it clears the quota blocker only once all authored clips are present. To review a single new line first, add `--limit 1`. Failed or timed-out requests are not silently retried.
