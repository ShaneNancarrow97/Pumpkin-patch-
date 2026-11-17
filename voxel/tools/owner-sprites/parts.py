"""Helpers both owners' models share: measuring for painted details, and the parts that are built alike."""
import numpy as np


def ellipse(x, y, cx, cy, rx, ry):
    """Inside an ellipse: values under 1 are inside."""
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def segment(x, y, ax, ay, bx, by):
    """Distance from points to the stroke a-b."""
    dx, dy = bx - ax, by - ay
    t = np.clip(((x - ax) * dx + (y - ay) * dy) / max(dx * dx + dy * dy, 1e-12), 0, 1)
    return np.hypot(x - ax - dx * t, y - ay - dy * t)


def polyline(x, y, pts):
    d = np.full(np.shape(x), 1e9)
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        d = np.minimum(d, segment(x, y, ax, ay, bx, by))
    return d


def soft(d, edge, feather):
    """1 inside a distance `edge`, fading to 0 over `feather` beyond it."""
    return np.clip((edge + feather - d) / max(feather, 1e-9), 0, 1)


def hand(m, wrist, side, skin="skin", tag="hand", curl=0.55, scale=1.0):
    """A relaxed hand hanging from the wrist: palm, curled fingers and a thumb. side is +1 left, -1 right."""
    g, k = f"hand{side}", scale
    m.ellipsoid(wrist.at((0, -0.022 * k, 0.004 * k)), (0.0165 * k, 0.025 * k, 0.0205 * k), skin, tag=tag, group=g, k=0.012)
    m.ellipsoid(wrist.at((0, -0.045 * k, (0.004 + 0.008 * curl) * k)), (0.0155 * k, 0.0145 * k, 0.0185 * k), skin, tag=tag, group=g)
    # The thumb lies along the inside of the palm, towards the body.
    a = wrist.point((-side * 0.011 * k, -0.012 * k, 0.014 * k))
    b = wrist.point((-side * 0.014 * k, -0.036 * k, 0.026 * k))
    m.limb(a, b, 0.0082 * k, 0.0068 * k, skin, tag=tag, group=g)
    return g
