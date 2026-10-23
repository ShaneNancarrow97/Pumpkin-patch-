// Source MIDI is embedded in the offline build; no remote player or soundfont.
import livingDeadGirl from "../../assets/music/living-dead-girl.mid";
import ghostbusters from "../../assets/music/ghostbusters.mid";
import nightmare from "../../assets/music/nightmare.mid";
import thriller from "../../assets/music/thriller.mid";
import lullaby from "../../assets/music/lullaby-for-a-dead-man.mid";
import lantern from "../../assets/music/lantern-march.mid";
import skyla from "../../assets/music/skylas-midnight-market.mid";
import moon from "../../assets/music/moonlit-mischief.mid";
import parade from "../../assets/music/pumpkin-parade.mid";
import disasterology from "../../assets/music/disasterology.mid";
import crazyTrain from "../../assets/music/crazy-train.mid";
import rebelYell from "../../assets/music/rebel-yell.mid";
import nothingElseMatters from "../../assets/music/nothing-else-matters.mid";
import dontFearTheReaper from "../../assets/music/dont-fear-the-reaper.mid";
import gypsys from "../../assets/music/gypsys-tramps-and-thieves.mid";
export const MUSIC_TRACKS = [
  { id: "lantern", name: "Lantern March", credit: "Original · playful music-box march", bytes: lantern },
  { id: "thriller", name: "Thriller", credit: "Michael Jackson · your supplied MIDI", bytes: thriller },
  { id: "lullaby", name: "Lullaby for a Dead Man", credit: "Elena Siegman · your supplied MIDI", bytes: lullaby },
  { id: "nightmare", name: "Nightmare", credit: "Your supplied MIDI", bytes: nightmare },
  { id: "ghostbusters", name: "Ghostbusters", credit: "Your supplied MIDI", bytes: ghostbusters },
  { id: "living-dead-girl", name: "Living Dead Girl", credit: "Rob Zombie · your supplied MIDI", bytes: livingDeadGirl },
  { id: "skyla", name: "Skyla’s Midnight Market", credit: "Original · spooky shop groove", bytes: skyla },
  { id: "moon", name: "Moonlit Mischief", credit: "Original · gentle haunted bells", bytes: moon },
  { id: "parade", name: "Pumpkin Parade", credit: "Original · retro Halloween dance", bytes: parade },
  { id: "disasterology", name: "Disasterology", credit: "Pierce the Veil · your supplied MIDI", bytes: disasterology },
  { id: "crazy-train", name: "Crazy Train", credit: "Ozzy Osbourne · your supplied MIDI", bytes: crazyTrain },
  { id: "rebel-yell", name: "Rebel Yell", credit: "Billy Idol · your supplied MIDI", bytes: rebelYell },
  { id: "nothing-else-matters", name: "Nothing Else Matters", credit: "Metallica · your supplied MIDI", bytes: nothingElseMatters },
  { id: "dont-fear-the-reaper", name: "(Don’t Fear) The Reaper", credit: "Blue Öyster Cult · your supplied MIDI", bytes: dontFearTheReaper },
  { id: "gypsys-tramps-and-thieves", name: "Gypsys, Tramps & Thieves", credit: "Cher · your supplied MIDI", bytes: gypsys },
];
