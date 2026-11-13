# Pre-final village-menu candidate CF6205

Exact HTML SHA-256: `cf6205ae22ef1602f57db7bc9dec16fc46c797e85cab836023b1e13898e97f3c`. This was an intermediate review, not the final release. Chromium was closed after completion.

**72 of 74 checks passed**, zero page/shader errors and zero external requests. The complete report retains both failing checks:

- **Real controller finding:** Circle correctly restored the parent journal and its scroll, but the controller's new-surface focus logic then replaced the restored Map-button focus. The root is preserving an already-usable focused action when taking ownership of a menu surface.
- **QA input-source staging:** the dock-focus check programmatically moved focus outside the panel while the controller still owned that panel. This deliberately invokes controller containment, rather than isolating a background redraw. The final runner first sends a real keyboard Tab event so the keyboard owns focus, then checks the same redraw behaviour.

Passed flows include keyed fold/scroll/focus preservation after quest insertion, header Back and section switching, current-dock toggle, blocked walking, Find → real collision/controller walk → actual axe gathering, truthful full-material feedback, nearby Rowan chat, Tab containment, once-only reply acceptance, exact workshop price/material spend and capacity increase. All five panels fit phone, unfolded, short landscape and TV fixtures without horizontal scrolling and with 44px targets.

Normal glow/shadow screenshots were reviewed: the phone Farm icon is visible, the satchel prioritises supplies, the journal has one expanded followed story, and the farm shop/truck corner is more open. See [phone](02-phone-satchel.png), [unfolded](01-fold-journal.png), [conversation](03-conversation.png), [TV](04-tv-journal.png), and [farm corner](05-farm-shop-corner.png).

The declared level-20 save and later stall/material staging are fixtures, not earned progression. Functional phases hold renderer/composer draws and step real village input/collision/UI clocks by .05s; normal draws are restored for photos. Controller API and viewports are simulated, without physical hardware or FPS certification. New level-badge/card additions were not in these bytes and need their own final exact-HTML pass.
