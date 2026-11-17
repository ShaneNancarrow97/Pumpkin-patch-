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
import everybody from "../../assets/music/everybody-backstreets-back.mid";
import whereIsMyMind from "../../assets/music/where-is-my-mind.mid";
import zombie from "../../assets/music/zombie.mid";
import killerQueen from "../../assets/music/killer-queen.mid";
import creep from "../../assets/music/creep.mid";
import numb from "../../assets/music/numb-tim-dawes-remix.mid";
import crossing_field from "../../assets/music/crossing-field.mid";
import billie_jean from "../../assets/music/billie-jean.mid";
import africa from "../../assets/music/africa.mid";
import still_dre from "../../assets/music/still-dre.mid";
import bohemian_rhapsody from "../../assets/music/bohemian-rhapsody.mid";
import dancingInTheMoonlight from "../../assets/music/dancing-in-the-moonlight.mid";
import bitterSweetSymphony from "../../assets/music/bitter-sweet-symphony.mid";
import duality from "../../assets/music/duality.mid";
import paintItBlack from "../../assets/music/paint-it-black.mid";
import fireflies from "../../assets/music/fireflies.mid";
// Billie Jean and Bohemian Rhapsody include long silent end markers; their
// explicit trim flag finishes playback after the last note without editing MIDI.
// The Numb remix file is one four-bar riff (about 7 seconds), so it plays nine
// times through: about a minute.
export const MUSIC_REPEATS = Object.freeze({ "numb-tim-dawes-remix.mid": 9 });
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
  { id: "everybody", name: "Everybody (Backstreet’s Back)", credit: "Backstreet Boys · your supplied MIDI", bytes: everybody },
  { id: "where-is-my-mind", name: "Where Is My Mind?", credit: "Pixies · your supplied MIDI", bytes: whereIsMyMind },
  { id: "zombie", name: "Zombie", credit: "The Cranberries · your supplied MIDI", bytes: zombie },
  { id: "killer-queen", name: "Killer Queen", credit: "Queen · your supplied MIDI", bytes: killerQueen },
  { id: "creep", name: "Creep", credit: "Radiohead · your supplied MIDI", bytes: creep },
  { id: "numb", name: "Numb (Tim Dawes remix)", credit: "Linkin Park · your supplied riff, looped", bytes: numb, repeat: MUSIC_REPEATS["numb-tim-dawes-remix.mid"] },
  { id: "crossing-field", name: "Crossing Field", credit: "LiSA \u00b7 Sword Art Online opening \u00b7 your supplied MIDI", bytes: crossing_field },
  { id: "billie-jean", name: "Billie Jean", credit: "Michael Jackson \u00b7 your supplied MIDI", bytes: billie_jean, trimTail: true },
  { id: "africa", name: "Africa", credit: "Toto \u00b7 your supplied MIDI", bytes: africa },
  { id: "still-dre", name: "Still D.R.E.", credit: "Dr. Dre \u00b7 your supplied MIDI", bytes: still_dre },
  { id: "bohemian-rhapsody", name: "Bohemian Rhapsody", credit: "Queen \u00b7 your supplied MIDI", bytes: bohemian_rhapsody, trimTail: true },
  { id: "dancing-in-the-moonlight", name: "Dancing in the Moonlight", credit: "Your supplied MIDI", bytes: dancingInTheMoonlight },
  { id: "bitter-sweet-symphony", name: "Bitter Sweet Symphony", credit: "The Verve · your supplied MIDI", bytes: bitterSweetSymphony },
  { id: "duality", name: "Duality", credit: "Slipknot · your supplied MIDI", bytes: duality },
  { id: "paint-it-black", name: "Paint It, Black", credit: "The Rolling Stones · your supplied MIDI", bytes: paintItBlack },
  { id: "fireflies", name: "Fireflies", credit: "Owl City · your supplied MIDI", bytes: fireflies },
];
