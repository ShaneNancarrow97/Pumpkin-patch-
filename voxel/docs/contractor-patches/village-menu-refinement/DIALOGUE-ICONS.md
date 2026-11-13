# Painted dialogue choice icons

`src/ui/dialogue-choice-icons.js` supplies decorative icons for the low dialogue
ribbon and resident action pills. It is pure markup: no DOM, image decoding,
gameplay rules or dependency on dialogue wording.

```js
import { dialogueChoiceIcon, dialogueChoiceKind } from "./dialogue-choice-icons.js";

dialogueChoiceIcon("quest", 32); // decorative i wrapper, 24–64 px
dialogueChoiceKind("warm");     // "chat"
```

| Explicit intent | Existing painted art | Runtime dependency |
| --- | --- | --- |
| `chat` | Ghost speech bubble | `installPremiumIcons()` |
| `quest` | Purple moon quest book | `installVillageUIArt()` |
| `gift` | Warm brass treasure chest | `installPremiumIcons()` |
| `about` | Two neighbours | `installVillageUIArt()` |
| `leave` | Glowing open doorway | `installPremiumIcons()` |
| `continue` | Gold arrow, facing forward | `installPremiumIcons()` |

`talk`, `reply`, `warm`, `curious` and `playful` explicitly alias `chat`;
`info` aliases `about`, and `exit` aliases `leave`. Unknown intents use `chat`.
Pass semantic intent metadata from the action, rather than matching words in
the dialogue. The helper never changes an action or its callback.

The caller retains its text label and button target. Art is `aria-hidden`, and
the outer element is an `i` so `.village-reply > span` still selects the reply
copy. Both wrappers and art are sized consistently; the presenter only needs
to lay out the icon next to its label.

Both installers already run in the full game's initialisation. Reusing their
painted assets adds **zero raster bytes**, no new atlas or image requests and
no additional browser installer. Source art and provenance remain with the
existing premium menu and village UI asset packages.

Validation: inspected the actual speech bubble, doorway, gold arrow, chest and
quest/people artwork; checked all semantic mappings, unknown-intent fallback,
size bounds and hostile strings in Node. JavaScript syntax and whitespace
checks pass. Browser verification belongs to the assembled dialogue pass.
