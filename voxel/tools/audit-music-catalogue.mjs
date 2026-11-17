// Read the exact bundled catalogue and source files without starting Web Audio.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { decodeMidi, loopClip, trimMidiTail } from "../src/ui/midi.js";

const root = fileURLToPath(new URL("../", import.meta.url)), music = path.join(root, "assets/music");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const sources = new Map(fs.readdirSync(music).filter(f => f.endsWith(".mid")).map(file => {
  const bytes=fs.readFileSync(path.join(music,file)); return [hash(bytes), { file, bytes: bytes.length }];
}));
const bundle = await build({ entryPoints:[path.join(root,"src/ui/music-tracks.js")], bundle:true, platform:"node", format:"cjs", loader:{".mid":"binary"}, write:false });
const sandbox={module:{exports:{}},Buffer};vm.runInNewContext(bundle.outputFiles[0].text,sandbox);
const {MUSIC_TRACKS}=sandbox.module.exports, errors=[], tracks=[];
if(MUSIC_TRACKS.length!==sources.size)errors.push("Catalogue and MIDI source counts differ");
if(new Set(MUSIC_TRACKS.map(t=>t.id)).size!==MUSIC_TRACKS.length)errors.push("Duplicate catalogue IDs");
for(const t of MUSIC_TRACKS){
 const bytes=Buffer.from(t.bytes),sha256=hash(bytes),source=sources.get(sha256);
 if(!source)errors.push(t.id+": no matching original MIDI source");
 const decoded=decodeMidi(bytes),clip=loopClip(t.trimTail?trimMidiTail(decoded):decoded,t.repeat),events=[];
 for(const n of clip.notes)events.push([n.time,1],[n.time+n.duration,-1]);events.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 let active=0,peak=0;for(const [,delta]of events){active+=delta;peak=Math.max(peak,active);}
 if(!Number.isFinite(clip.duration)||clip.duration<=0||!clip.notes.length||clip.notes.some(n=>!Number.isFinite(n.time)||!Number.isFinite(n.duration)||n.duration<=0))errors.push(t.id+": invalid note timing");
 tracks.push({id:t.id,name:t.name,credit:t.credit,file:source?.file,bytes:bytes.length,sha256,sourceEndDuration:decoded.duration,playbackDuration:clip.duration,notes:clip.notes.length,peakSourcePolyphony:peak,trimTrailingSilence:!!t.trimTail,repeat:t.repeat??1});
}
const additions=JSON.parse(fs.readFileSync(path.join(music,"supplied-catalogue-additions.json"),"utf8"));
for(const original of additions.tracks){const actual=tracks.find(t=>t.id===original.id);if(!actual||actual.sha256!==original.sha256||actual.bytes!==original.originalBytes)errors.push(original.id+": uploaded bytes changed");}
console.log(JSON.stringify({passed:!errors.length,errors,totalTracks:tracks.length,totalMidiBytes:tracks.reduce((n,t)=>n+t.bytes,0),engineVoiceCap:64,tracks},null,2));
if(errors.length)process.exitCode=1;
