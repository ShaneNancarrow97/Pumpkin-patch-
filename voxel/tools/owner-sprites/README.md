# Owner sprites (work in progress, not used by the game)

A sculptor for Shane's and Natalie's play sprites, started to fix the size changes and awkward frames in their
walk sheets. Each owner is one model of signed-distance shapes hung on a skeleton, drawn from eight sides at
one fixed scale, so every frame has the same proportions.

- `sculpt.py`: shapes, blend groups, the orthographic view, the tracer, materials, painters and `render`.
- `rig.py`: the skeleton (`Dims`, `solve`) and helpers for poses.
- `parts.py`: measuring helpers for painted details, and the hand.
- `shane.py`: Shane at his standing art's proportions, with his idle pose.

Needs Python 3 with numpy and Pillow. Paused in handover 74: Shane's face and jacket need work; Natalie, the
walk, jog and action cycles, baking to atlases and the game's side are not started.
