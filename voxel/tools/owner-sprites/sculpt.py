"""The owners' sprite sculptor: draws a posed character, pixel by pixel, from one authored model.

Shane and Natalie are each described once, as shapes in space (a head, a beanie, a sleeve, a boot) with the
details that make them themselves painted on in the shape's own coordinates (an eye, a pocket flap, a tattoo).
A frame is that one model, posed, seen from one of eight sides and drawn onto a pixel grid at a fixed scale.
Because every frame comes from the same model at the same scale, nobody changes size between frames or
directions, a pocket is always the same pocket, and a walk is a real walk.

How a pixel is decided:
  1. A ray goes straight in from the pixel (the view is orthographic, so size never depends on distance). The
     nearest shape it meets is found by sphere tracing a signed distance field.
  2. The surface there is lit from the upper left of the picture, with the shadow other shapes cast on it and
     the darkening of creases, and that light is cut into a few flat tones from the shape's own palette.
  3. The shape's detail painter may then replace the tone with a detail's colour (an iris, a button, a stitch).
  4. Outlines are inked where the figure ends, where one material meets another and where depth breaks.
Every pixel is exactly one palette colour: there is no blending, so recolouring a jumper is an exact swap.

Units: 1.0 is the character's standing height. x is the character's left, y is up, z is the way they face.
"""
import numpy as np

F = np.float32
BIG = F(1e6)


# ---- Rotations (matrices act on column vectors; a point p in a frame is world = R @ p + t) --------------------
def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=np.float64)


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=np.float64)


def rot_z(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=np.float64)


def deg(a):
    return a * np.pi / 180.0


class Frame:
    """A bone: an orientation and a place. `at` makes a child frame, `point` and `vec` map into the world."""

    def __init__(self, R=None, t=None):
        self.R = np.eye(3) if R is None else np.asarray(R, dtype=np.float64)
        self.t = np.zeros(3) if t is None else np.asarray(t, dtype=np.float64)

    def at(self, offset=(0, 0, 0), R=None):
        return Frame(self.R @ (np.eye(3) if R is None else R), self.t + self.R @ np.asarray(offset, dtype=np.float64))

    def point(self, p):
        return self.t + self.R @ np.asarray(p, dtype=np.float64)

    def vec(self, v):
        return self.R @ np.asarray(v, dtype=np.float64)


# ---- Signed distances, each for points already in the shape's own frame ---------------------------------------
def sd_ellipsoid(x, y, z, r):
    rx, ry, rz = r
    k0 = np.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2)
    k1 = np.sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2)
    return np.where(k1 > 1e-9, k0 * (k0 - 1.0) / np.maximum(k1, 1e-9), -min(rx, ry, rz)).astype(F)


def sd_box(x, y, z, b, r=0.0):
    qx, qy, qz = np.abs(x) - (b[0] - r), np.abs(y) - (b[1] - r), np.abs(z) - (b[2] - r)
    outside = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
    return (outside + np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0) - r).astype(F)


def sd_round_cone(x, y, z, a, b, r1, r2):
    """A limb: a capsule from a to b whose radius runs from r1 to r2 (Inigo Quilez's exact round cone)."""
    ba = b - a
    l2 = float(ba @ ba)
    if l2 < 1e-12:
        return (np.sqrt((x - a[0]) ** 2 + (y - a[1]) ** 2 + (z - a[2]) ** 2) - max(r1, r2)).astype(F)
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pax, pay, paz = x - a[0], y - a[1], z - a[2]
    yy = pax * ba[0] + pay * ba[1] + paz * ba[2]
    zz = yy - l2
    cx, cy, cz = pax * l2 - ba[0] * yy, pay * l2 - ba[1] * yy, paz * l2 - ba[2] * yy
    x2 = cx * cx + cy * cy + cz * cz
    y2 = yy * yy * l2
    z2 = zz * zz * l2
    k = np.sign(rr) * rr * rr * x2
    d_b = np.sqrt(x2 + z2) * il2 - r2
    d_a = np.sqrt(x2 + y2) * il2 - r1
    d_m = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + yy * rr) * il2 - r1
    return np.where(np.sign(zz) * a2 * z2 > k, d_b, np.where(np.sign(yy) * a2 * y2 < k, d_a, d_m)).astype(F)


def sd_torus(x, y, z, R, r, squash=(1.0, 1.0)):
    """A ring lying flat (round the y axis); squash stretches it to an oval in x and z."""
    qx = np.sqrt((x / squash[0]) ** 2 + (z / squash[1]) ** 2) - R
    return (np.sqrt(qx * qx + y * y) - r).astype(F)


def sd_cylinder(x, y, z, R, h, r=0.0, squash=(1.0, 1.0)):
    """An upright cylinder of half-height h, its edges rounded by r; squash makes its section an oval."""
    dx = np.sqrt((x / squash[0]) ** 2 + (z / squash[1]) ** 2) - (R - r)
    dy = np.abs(y) - (h - r)
    return (np.minimum(np.maximum(dx, dy), 0) + np.sqrt(np.maximum(dx, 0) ** 2 + np.maximum(dy, 0) ** 2) - r).astype(F)


def sd_frame_ring(x, y, z, half, corner, thick, depth):
    """A flat rounded-rectangle ring facing z: a spectacle rim."""
    qx, qy = np.abs(x) - (half[0] - corner), np.abs(y) - (half[1] - corner)
    d2 = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - corner
    ring = np.abs(d2) - thick
    dz = np.abs(z) - depth
    return (np.sqrt(np.maximum(ring, 0) ** 2 + np.maximum(dz, 0) ** 2) + np.minimum(np.maximum(ring, dz), 0)).astype(F)


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return (b * (1 - h) + a * h - k * h * (1 - h)).astype(F)


class Prim:
    """One shape of the model. `tag` names it for its detail painter; `mat` is its palette."""

    __slots__ = ("kind", "R", "t", "p", "mat", "tag", "group", "clips", "subs", "bound_c", "bound_r", "shell", "index", "world", "space")

    def __init__(self, kind, frame, p, mat, tag=None, group=None, clips=(), subs=(), shell=0.0, world=False, space=None):
        self.kind, self.p, self.mat, self.tag, self.group = kind, p, mat, tag or mat, group
        self.R, self.t = frame.R.astype(np.float64), frame.t.astype(np.float64)
        self.space = space or frame  # the frame its details are painted in (a whole head shares one)
        self.clips, self.subs, self.shell, self.world = tuple(clips), tuple(subs), shell, world
        self.index = -1
        self._bound()

    def _bound(self):
        k, p = self.kind, self.p
        if k == "ellipsoid":
            c, r = np.zeros(3), max(p["r"])
        elif k == "box":
            c, r = np.zeros(3), float(np.linalg.norm(p["b"]))
        elif k == "cone":
            c, r = (p["a"] + p["b"]) / 2, float(np.linalg.norm(p["b"] - p["a"])) / 2 + max(p["r1"], p["r2"])
        elif k == "torus":
            c, r = np.zeros(3), (p["R"] + p["r"]) * max(p.get("squash", (1, 1)))
        elif k == "cylinder":
            c, r = np.zeros(3), float(np.hypot(p["R"] * max(p.get("squash", (1, 1))), p["h"]))
        elif k == "ring":
            c, r = np.zeros(3), float(np.hypot(p["half"][0], p["half"][1])) + p["thick"]
        else:
            raise ValueError(k)
        self.bound_c = self.t + self.R @ c
        self.bound_r = r + self.shell

    def local(self, P):
        """World points (N, 3) into this shape's frame, as three arrays."""
        Q = (P - self.t.astype(F)) @ self.R.astype(F)
        return Q[:, 0], Q[:, 1], Q[:, 2]

    def sdf(self, P):
        x, y, z = self.local(P)
        k, p = self.kind, self.p
        if k == "ellipsoid":
            d = sd_ellipsoid(x, y, z, p["r"])
        elif k == "box":
            d = sd_box(x, y, z, p["b"], p.get("round", 0.0))
        elif k == "cone":
            d = sd_round_cone(x, y, z, p["a"], p["b"], p["r1"], p["r2"])
        elif k == "torus":
            d = sd_torus(x, y, z, p["R"], p["r"], p.get("squash", (1.0, 1.0)))
        elif k == "cylinder":
            d = sd_cylinder(x, y, z, p["R"], p["h"], p.get("round", 0.0), p.get("squash", (1.0, 1.0)))
        else:
            d = sd_frame_ring(x, y, z, p["half"], p["corner"], p["thick"], p["depth"])
        if self.shell:
            d = np.abs(d) - F(self.shell)
        for n, h in self.clips:  # keep only where n . p < h (in the shape's own frame)
            d = np.maximum(d, (x * n[0] + y * n[1] + z * n[2] - h).astype(F))
        for other in self.subs:  # carve another shape out of this one
            d = np.maximum(d, -other.sdf(P))
        return d


class Model:
    """Shapes gathered into blend groups: shapes in a group melt into one another, groups stay distinct."""

    def __init__(self):
        self.prims, self.groups, self.blend = [], {}, {}

    def add(self, kind, frame, mat, tag=None, group=None, k=None, clips=(), subs=(), shell=0.0, space=None, **p):
        for key in ("a", "b"):
            if key in p:
                p[key] = np.asarray(p[key], dtype=np.float64)
        prim = Prim(kind, frame, p, mat, tag, group, clips, subs, shell, space=space)
        prim.index = len(self.prims)
        self.prims.append(prim)
        g = group if group is not None else f"_{prim.index}"
        prim.group = g
        self.groups.setdefault(g, []).append(prim)
        if k is not None:
            self.blend[g] = k
        return prim

    def cutter(self, kind, frame, **p):
        """A shape used only to carve others; it is never drawn itself."""
        for key in ("a", "b"):
            if key in p:
                p[key] = np.asarray(p[key], dtype=np.float64)
        return Prim(kind, frame, p, "cut")

    def ellipsoid(self, frame, r, mat, **kw):
        return self.add("ellipsoid", frame, mat, r=tuple(r), **kw)

    def box(self, frame, b, mat, round=0.0, **kw):
        return self.add("box", frame, mat, b=tuple(b), round=round, **kw)

    def limb(self, a, b, r1, r2, mat, frame=None, **kw):
        return self.add("cone", frame or Frame(), mat, a=a, b=b, r1=r1, r2=r2, **kw)

    def torus(self, frame, R, r, mat, squash=(1.0, 1.0), **kw):
        return self.add("torus", frame, mat, R=R, r=r, squash=squash, **kw)

    def cylinder(self, frame, R, h, mat, round=0.0, squash=(1.0, 1.0), **kw):
        return self.add("cylinder", frame, mat, R=R, h=h, round=round, squash=squash, **kw)

    def ring(self, frame, half, corner, thick, depth, mat, **kw):
        return self.add("ring", frame, mat, half=tuple(half), corner=corner, thick=thick, depth=depth, **kw)


# ---- The view ------------------------------------------------------------------------------------------------
DIRECTIONS = ("front", "frontRight", "right", "backRight", "back", "backLeft", "left", "frontLeft")


class View:
    """An orthographic camera: `yaw` turns the character (0 faces us, 90 degrees faces the picture's right),
    `pitch` raises the camera to look down a little. The ground point under the character lands on `root`."""

    def __init__(self, yaw, size, root, ppu, pitch=deg(9)):
        self.W, self.H = size
        self.root, self.ppu = root, float(ppu)
        cam = rot_y(-yaw) @ rot_x(-pitch)  # camera axes in the character's space
        self.right, self.up, self.back = cam[:, 0], cam[:, 1], cam[:, 2]  # `back` points from the scene to the eye
        self.fwd = -self.back

    def project(self, P):
        """World points to pixel coordinates (float x, float y) and depth along the view (larger is further)."""
        x = P @ self.right.astype(F) * F(self.ppu) + F(self.root[0])
        y = F(self.root[1]) - P @ self.up.astype(F) * F(self.ppu)
        return x, y, P @ self.fwd.astype(F)

    def origin(self, px, py):
        """The point on the plane through the root for pixel centres (px, py)."""
        u = (px - self.root[0]) / self.ppu
        v = (self.root[1] - py) / self.ppu
        return u[:, None] * self.right[None, :] + v[:, None] * self.up[None, :]


class Tracer:
    """Finds what each pixel sees. Shapes are only tested against rays that pass near them."""

    def __init__(self, model, view, margin=0.03):
        self.model, self.view = model, view
        W, H = view.W, view.H
        self.foot = []  # per shape: which pixels its bounding sphere (plus a margin) covers
        ys, xs = np.mgrid[0:H, 0:W]
        self.px, self.py = (xs.ravel() + 0.5).astype(F), (ys.ravel() + 0.5).astype(F)
        near = np.full(W * H, np.inf, dtype=F)
        for prim in model.prims:
            cx, cy, cz = view.project(prim.bound_c[None, :].astype(F))
            k = model.blend.get(prim.group, 0.0)
            rad = (prim.bound_r + margin + k) * view.ppu
            d2 = (self.px - cx[0]) ** 2 + (self.py - cy[0]) ** 2
            mask = d2 <= rad * rad
            self.foot.append(mask)
            tight = d2 <= (prim.bound_r * view.ppu) ** 2
            enter = cz[0] - np.sqrt(np.maximum(prim.bound_r ** 2 - d2 / view.ppu ** 2, 0))
            near[tight] = np.minimum(near[tight], enter[tight])
        self.near = near
        self.any = np.isfinite(near)

    def pixels_of(self, P):
        x, y, _ = self.view.project(P)
        ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
        ok = (ix >= 0) & (ix < self.view.W) & (iy >= 0) & (iy < self.view.H)
        return np.where(ok, iy * self.view.W + ix, -1)

    def distance(self, P, want_id=False):
        """Distance from each point to the model; with want_id, also which shape is nearest."""
        n = len(P)
        pix = self.pixels_of(P)
        inside = pix >= 0
        best = np.full(n, BIG, dtype=F)
        ident = np.full(n, -1, dtype=np.int32)
        for g, prims in self.model.groups.items():
            k = self.model.blend.get(g, 0.0)
            dg = np.full(n, BIG, dtype=F)
            raw = np.full(n, BIG, dtype=F) if want_id else None
            who = np.full(n, -1, dtype=np.int32) if want_id else None
            for prim in prims:
                sel = np.zeros(n, dtype=bool)
                sel[inside] = self.foot[prim.index][pix[inside]]
                if not sel.any():
                    continue
                d = prim.sdf(P[sel])
                dg[sel] = smin(dg[sel], d, k)
                if want_id:
                    closer = d < raw[sel]
                    idx = np.flatnonzero(sel)[closer]
                    raw[idx] = d[closer]
                    who[idx] = prim.index
            closer = dg < best
            best[closer] = dg[closer]
            if want_id:
                ident[closer] = who[closer]
        return (best, ident) if want_id else best

    def trace(self, steps=48, eps=0.0009):
        """March every candidate ray in. Returns hit mask, hit points, depth and shape index, per pixel."""
        v = self.view
        active = np.flatnonzero(self.any)
        O = v.origin(self.px[active], self.py[active]).astype(F)
        fwd = v.fwd.astype(F)
        t = (self.near[active] - F(0.02)).astype(F)
        far = t + F(1.2)
        hit = np.zeros(len(active), dtype=bool)
        alive = np.ones(len(active), dtype=bool)
        for _ in range(steps):
            idx = np.flatnonzero(alive)
            if not len(idx):
                break
            P = O[idx] + t[idx, None] * fwd[None, :]
            d = self.distance(P)
            got = d < eps
            hit[idx[got]] = True
            alive[idx[got]] = False
            step = np.where(d > 0.5 * BIG, F(0.05), d * F(0.92))  # nothing near: stride on to the next shape
            t[idx] = t[idx] + np.where(got, 0, np.maximum(step, eps * 0.5))
            gone = t[idx] > far[idx]
            alive[idx[gone]] = False
        P = O + t[:, None] * fwd[None, :]
        n = v.W * v.H
        out_hit = np.zeros(n, dtype=bool)
        out_hit[active] = hit
        out_P = np.zeros((n, 3), dtype=F)
        out_P[active] = P
        depth = np.full(n, np.inf, dtype=F)
        depth[active[hit]] = t[hit]
        ident = np.full(n, -1, dtype=np.int32)
        if hit.any():
            _, who = self.distance(P[hit], want_id=True)
            ident[active[hit]] = who
            out_hit[active[hit]] = who >= 0
        return out_hit, out_P, depth, ident

    def normals(self, P, h=0.0012):
        """Surface normals by a tetrahedron of four samples."""
        k = np.array([[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]], dtype=F)
        n = np.zeros_like(P)
        for e in k:
            n += e[None, :] * self.distance(P + e[None, :] * F(h))[:, None]
        length = np.linalg.norm(n, axis=1, keepdims=True)
        return n / np.maximum(length, 1e-9)


# ---- Light, colour and finish -----------------------------------------------------------------------------------
def hexrgb(c):
    if isinstance(c, (tuple, list, np.ndarray)):
        return tuple(int(v) for v in c)
    return ((c >> 16) & 255, (c >> 8) & 255, c & 255)


class Material:
    """How a surface takes the light: a ramp of colours from deepest shadow to full light (so shadows can lean
    cool and lights warm, as painted), how glossy it is, and how much rim light it catches.

    ramp   colours from dark to light; light between them is blended, so shading is smooth
    gloss  strength of the highlight (0 is matt cloth, 1 is patent leather); shine is how tight it is
    rim    how much of the warm back light shows along the far edge
    """

    def __init__(self, ramp, gloss=0.0, shine=28.0, rim=1.0, ink=None):
        self.ramp = np.array([hexrgb(c) for c in ramp], dtype=np.float32)
        self.gloss, self.shine, self.rim = gloss, shine, rim
        self.ink = np.array(hexrgb(ink) if ink is not None else self.ramp[0] * 0.45, dtype=np.float32)

    def colour(self, level):
        """Blend along the ramp for light levels 0..1."""
        k = np.clip(level, 0, 1) * (len(self.ramp) - 1)
        i = np.minimum(k.astype(np.int32), len(self.ramp) - 2)
        f = (k - i)[:, None]
        return self.ramp[i] * (1 - f) + self.ramp[i + 1] * f


# The picture's own light, the same in every frame and from every side, as if each were painted at one easel:
# a key from the upper left and a little towards us, a cool fill from the lower right, a warm rim from behind.
KEY = np.array([-0.50, 0.62, 0.60])
KEY = KEY / np.linalg.norm(KEY)
RIM = np.array([0.70, 0.35, -0.62])
RIM = RIM / np.linalg.norm(RIM)
RIM_COLOUR = np.array([255.0, 214.0, 160.0])
FILL_COLOUR = np.array([150.0, 170.0, 215.0])


class Brush:
    """What a shape's painter is handed: where each visible point lies in the shape's own frame, and ways to
    paint over it. Later strokes cover earlier ones.

      mat(where, name)             these points are another material (an eye's white, a metal button)
      tint(where, colour, amount)  blend a colour over the lit surface (blush, a seam, a tattoo, knit ribs)
      flat(where, colour)          an unlit colour, exactly as given (the spark in an eye)
    """

    def __init__(self, x, y, z, normal, names, base, view_right, view_up):
        self.x, self.y, self.z, self.n = x, y, z, normal
        self._names = names
        self.material = np.array(base, dtype=np.int32) if np.ndim(base) else np.full(len(x), base, dtype=np.int32)
        self.tints = []
        self.flat_mask = np.zeros(len(x), dtype=bool)
        self.flat_rgb = np.zeros((len(x), 3), dtype=np.float32)
        self.right, self.up = view_right, view_up  # the picture's right and up, in this shape's frame

    def mat(self, where, name):
        self.material[np.asarray(where, dtype=bool)] = self._names[name]

    def tint(self, where, colour, amount=1.0):
        where = np.asarray(where)
        strength = (where.astype(np.float32) if where.dtype == bool else np.clip(where, 0, 1).astype(np.float32)) * amount
        self.tints.append((strength, np.array(hexrgb(colour), dtype=np.float32)))

    def flat(self, where, colour):
        where = np.asarray(where, dtype=bool)
        self.flat_mask |= where
        self.flat_rgb[where] = hexrgb(colour)


def render(model, view, materials, painters=None, supersample=2, steps=56, contour=0.5, masks=()):
    """Draw one frame. The model is traced `supersample` times finer than the frame and averaged down, so every
    edge is smooth. Returns an RGBA uint8 image (H, W, 4) and a dict: 'coverage' for each name in `masks` (how
    much of each pixel is that material, for recolouring) and 'depth'."""
    painters = painters or {}
    ss = int(supersample)
    big = View.__new__(View)
    big.__dict__.update(view.__dict__)
    big.W, big.H, big.ppu = view.W * ss, view.H * ss, view.ppu * ss
    big.root = (view.root[0] * ss, view.root[1] * ss)
    tr = Tracer(model, big)
    hit, P, depth, ident = tr.trace(steps=steps, eps=0.0009 / ss + 0.0003)
    W, H = big.W, big.H
    names = {name: i for i, name in enumerate(materials)}
    mats = list(materials.values())
    rgb = np.zeros((H * W, 3), dtype=np.float32)
    alpha = hit.astype(np.float32)
    idx = np.flatnonzero(hit)
    cover = {name: np.zeros(H * W, dtype=np.float32) for name in masks}
    if len(idx):
        Ph = P[idx]
        N = tr.normals(Ph, h=0.0016 / ss + 0.0004)
        back = big.back.astype(F)
        L = (big.right * KEY[0] + big.up * KEY[1] + big.back * KEY[2]).astype(F)
        Rm = (big.right * RIM[0] + big.up * RIM[1] + big.back * RIM[2]).astype(F)
        Hf = L + back
        Hf = Hf / np.linalg.norm(Hf)
        ndl = N @ L
        ndv = np.clip(N @ back, 0, 1)
        # Creases: how open the surface is a little way off it.
        ao = np.clip(tr.distance(Ph + N * F(0.014)) / F(0.014), 0, 1) * 0.4 + np.clip(tr.distance(Ph + N * F(0.04)) / F(0.04), 0, 1) * 0.35 + np.clip(tr.distance(Ph + N * F(0.09)) / F(0.09), 0, 1) * 0.25
        # Cast shadow, soft: how nearly something blocks the way to the key light.
        shadow = np.ones(len(idx), dtype=F)
        for dist in (0.012, 0.026, 0.045, 0.07, 0.105, 0.15, 0.21):
            shadow = np.minimum(shadow, np.clip(tr.distance(Ph + N * F(0.003) + L[None, :] * F(dist)) / F(dist * 0.36), 0, 1))
        shadow = shadow * shadow * (3 - 2 * shadow)
        wrap = np.clip((ndl + 0.42) / 1.42, 0, 1)
        level = wrap * (0.38 + 0.62 * shadow) * (0.55 + 0.45 * ao)
        level = np.clip(0.06 + 0.98 * level, 0, 1)
        spec = np.clip(N @ Hf, 0, 1)
        rim = np.clip(N @ Rm, 0, 1) * (1 - ndv) ** 2.2
        fill = np.clip(-ndl * 0.6 + 0.2, 0, 1) * (1 - ndv) * 0.5
        # Each shape's painter decides what its surface really is, point by point.
        material = np.array([names[model.prims[i].mat] for i in ident[idx]], dtype=np.int32)
        tints, flat_mask, flat_rgb = [], np.zeros(len(idx), dtype=bool), np.zeros((len(idx), 3), dtype=np.float32)
        # Shapes that share a tag and a frame are painted together, as one surface (a head is several shapes).
        surfaces = {}
        for prim in model.prims:
            if prim.tag in painters:
                key = (prim.tag, tuple(np.round(prim.space.R, 6).ravel()), tuple(np.round(prim.space.t, 6)))
                surfaces.setdefault(key, (prim.space, []))[1].append(prim.index)
        hit_prim = ident[idx]
        for (tag, _, _), (space, members) in surfaces.items():
            sel = np.flatnonzero(np.isin(hit_prim, members))
            if not len(sel):
                continue
            R = space.R.astype(F)
            Q = (Ph[sel] - space.t.astype(F)) @ R
            brush = Brush(Q[:, 0], Q[:, 1], Q[:, 2], N[sel] @ R, names, material[sel], big.right.astype(F) @ R, big.up.astype(F) @ R)
            painters[tag](brush)
            material[sel] = brush.material
            for strength, colour in brush.tints:
                full = np.zeros(len(idx), dtype=np.float32)
                full[sel] = strength
                tints.append((full, colour))
            flat_mask[sel] = brush.flat_mask
            flat_rgb[sel] = brush.flat_rgb
        lit = np.zeros((len(idx), 3), dtype=np.float32)
        ink = np.zeros((len(idx), 3), dtype=np.float32)
        for i, m in enumerate(mats):
            sel = material == i
            if not sel.any():
                continue
            c = m.colour(level[sel])
            if m.gloss:
                c = c + (spec[sel] ** m.shine * shadow[sel] * m.gloss)[:, None] * np.array([255.0, 250.0, 240.0]) * 0.9
            c = c + (rim[sel] * m.rim * (0.35 + 0.65 * shadow[sel]))[:, None] * (RIM_COLOUR - c) * 0.5
            c = c + (fill[sel] * 0.18)[:, None] * (FILL_COLOUR - c)
            lit[sel] = c
            ink[sel] = m.ink
        for strength, colour in tints:
            lit = lit + strength[:, None] * (colour[None, :] * (0.35 + 0.65 * level[:, None]) - lit)
        lit[flat_mask] = flat_rgb[flat_mask]
        rgb[idx] = lit
        for name in masks:
            cover[name][idx] = (material == names[name]).astype(np.float32)
        if contour > 0:
            rgb = _contour(rgb, hit, depth, ident, model, ink, idx, ndv, W, H, ss, contour)
    # Average down, weighting colour by coverage so an edge keeps its own colour.
    rgb = (rgb * alpha[:, None]).reshape(view.H, ss, view.W, ss, 3).sum(axis=(1, 3))
    a = alpha.reshape(view.H, ss, view.W, ss).sum(axis=(1, 3))
    out = np.zeros((view.H, view.W, 4), dtype=np.uint8)
    out[..., :3] = np.clip(rgb / np.maximum(a, 1e-6)[..., None] + 0.5, 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(a / (ss * ss) * 255 + 0.5, 0, 255).astype(np.uint8)
    info = {"depth": depth.reshape(H, W)[::ss, ::ss], "coverage": {name: np.clip(c.reshape(view.H, ss, view.W, ss).sum(axis=(1, 3)) / (ss * ss) * 255 + 0.5, 0, 255).astype(np.uint8) for name, c in cover.items()}}
    return out, info


def _contour(rgb, hit, depth, ident, model, ink, idx, ndv, W, H, ss, amount):
    """A soft dark contour: the figure's own edge, and a fainter line wherever one form passes in front of another
    or one material meets the next. It is drawn at the fine scale, so it averages down to about a pixel."""
    hit2, depth2 = hit.reshape(H, W), depth.reshape(H, W)
    mats = np.array([p.mat for p in model.prims] + ["none"], dtype=object)
    mat_id = np.unique(mats, return_inverse=True)[1][ident].reshape(H, W)
    nz = np.zeros(H * W, dtype=F)
    nz[idx] = ndv
    nz = nz.reshape(H, W)
    rim = np.zeros((H, W), dtype=bool)
    step = np.zeros((H, W), dtype=bool)
    seam = np.zeros((H, W), dtype=bool)
    with np.errstate(invalid="ignore"):
        for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
            nb_hit = np.roll(hit2, (dy, dx), axis=(0, 1))
            nb_depth = np.roll(depth2, (dy, dx), axis=(0, 1))
            nb_mat = np.roll(mat_id, (dy, dx), axis=(0, 1))
            rim |= hit2 & ~nb_hit
            slope = (0.0045 + 0.012 * (1.0 - nz) / np.maximum(nz, 0.2)) / ss * 1.6
            both = hit2 & nb_hit
            step |= both & (nb_depth - depth2 > slope)
            seam |= both & (nb_mat != mat_id) & (np.abs(nb_depth - depth2) <= slope)
    def grow(mask, times):
        out = mask.copy()
        for _ in range(times):
            g = out.copy()
            for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
                g |= np.roll(out, (dy, dx), axis=(0, 1))
            out = g & hit2
        return out
    strength = np.zeros((H, W), dtype=np.float32)
    strength[grow(seam, max(0, ss - 2))] = 0.42 * amount
    strength[grow(step, max(0, ss - 1))] = 0.75 * amount
    strength[grow(rim, ss)] = 1.0 * amount
    s = strength.reshape(-1)
    full_ink = np.zeros_like(rgb)
    full_ink[idx] = ink
    return rgb + s[:, None] * (full_ink - rgb)
