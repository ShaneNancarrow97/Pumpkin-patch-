// Source MIDI is embedded in the offline build; no remote player or soundfont.
import ghostbusters from "../../assets/music/ghostbusters.mid";
import nightmare from "../../assets/music/nightmare.mid";
import thriller from "../../assets/music/thriller.mid";
import lullaby from "../../assets/music/lullaby-for-a-dead-man.mid";
import lantern from "../../assets/music/lantern-march.mid";
import skyla from "../../assets/music/skylas-midnight-market.mid";
import moon from "../../assets/music/moonlit-mischief.mid";
import parade from "../../assets/music/pumpkin-parade.mid";
export const MUSIC_TRACKS = [
  { id: "lantern", name: "Lantern March", credit: "Original · playful music-box march", bytes: lantern },
  { id: "thriller", name: "Thriller", credit: "Michael Jackson · your supplied MIDI", bytes: thriller },
  { id: "lullaby", name: "Lullaby for a Dead Man", credit: "Elena Siegman · your supplied MIDI", bytes: lullaby },
  { id: "nightmare", name: "Nightmare", credit: "Your supplied MIDI", bytes: nightmare },
  { id: "ghostbusters", name: "Ghostbusters", credit: "Your supplied MIDI", bytes: ghostbusters },
  { id: "skyla", name: "Skyla’s Midnight Market", credit: "Original · spooky shop groove", bytes: skyla },
  { id: "moon", name: "Moonlit Mischief", credit: "Original · gentle haunted bells", bytes: moon },
  { id: "parade", name: "Pumpkin Parade", credit: "Original · retro Halloween dance", bytes: parade },
];
