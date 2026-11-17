"""Shane, as he is in his standing art: a black ribbed beanie over a swept brown fringe, a moustache and goatee,
a washed black denim jacket open over a black hoodie with grey drawstrings, black cargo trousers and black skate
shoes with white soles, laces and side stripes.

`build(J)` hangs his model on a solved skeleton (rig.solve). Every detail is placed in the coordinates of the
part it belongs to, so it is the same detail from every side and in every frame.
"""
import numpy as np
from sculpt import Model, Frame, Material, rot_x, rot_y, rot_z, deg
from rig import Dims, frame_along
from parts import ellipse, segment, polyline, soft, hand

DIMS = Dims(ankle=0.052, shin=0.163, thigh=0.15, knee_bend=0.004, hip_x=0.062, hip_drop=0.02, waist=0.05,
            shoulder=(0.122, 0.262, -0.004), neck=0.29, head=0.128, upper=0.135, fore=0.125, stance=0.016,
            toe_out=deg(14), ball=(0.0, -0.038, 0.068))

INK = 0x1c110c
MATERIALS = {
    "skin": Material([0x9a5238, 0xc87a56, 0xe9a47c, 0xf7c39d, 0xffdcbc], rim=0.8, ink=0x6e3320),
    "hair": Material([0x321b0e, 0x55301a, 0x7a4a27, 0x9a6537, 0xb9844f], gloss=0.15, shine=14, ink=0x24120a),
    "tash": Material([0x3a1f10, 0x5a341b, 0x7b4b28, 0x966136, 0xae7a48], ink=0x2a160c),
    "beanie": Material([0x0c0b0b, 0x1a1716, 0x2b2726, 0x403a38, 0x58504c], ink=0x050404),
    "hoodie": Material([0x0a0909, 0x141211, 0x211e1d, 0x33302e, 0x484341], ink=0x040303),
    "jacket": Material([0x100d0c, 0x1f1a18, 0x322a26, 0x4a3f38, 0x65574d], ink=0x060504),
    "trousers": Material([0x0d0b0b, 0x191615, 0x282321, 0x3a3430, 0x4e4641], ink=0x050404),
    "shoe": Material([0x0c0b0b, 0x171514, 0x262221, 0x383331, 0x4c4541], gloss=0.1, shine=20, ink=0x040303),
    "sole": Material([0x8f887c, 0xbcb5a8, 0xdfd9cc, 0xf3efe5, 0xfcfaf4], ink=0x3b352c),
    "cord": Material([0x5a554f, 0x827c74, 0xa39c92, 0xbfb8ad, 0xd6d0c5], ink=0x2a2622),
    "metal": Material([0x5a554e, 0x8a847a, 0xb5afa4, 0xd8d3c8, 0xf2eee5], gloss=0.7, shine=40, ink=0x2a2622),
    "eyewhite": Material([0xa9a29c, 0xcfc9c3, 0xe9e5df, 0xf7f4ef, 0xfdfcf9], gloss=0.3, shine=60, rim=0.15, ink=0x3a2a22),
    "iris": Material([0x2a3f52, 0x3c5a73, 0x527695, 0x6b90b0, 0x86a9c5], gloss=0.5, shine=70, rim=0.1, ink=0x14202b),
    "tooth": Material([0xc2bbae, 0xdfd9ce, 0xf1ede4, 0xfaf7f0, 0xfefdf9], rim=0.15, ink=0x6a4a3a),
    "mouth": Material([0x3a1412, 0x551d19, 0x6a2620, 0x7a2e27, 0x87372f], rim=0.0, ink=0x2a0e0c),
}
TINT_MASKS = ("beanie",)  # what the wardrobe may recolour

# Where the beanie's rim runs: high on the forehead, low at the nape.
RIM_Y, RIM_SLOPE, CUFF = 0.068, 0.29, 0.024


# ---- Details, painted in each part's own coordinates --------------------------------------------------------
def paint_head(c):
    x, y, z = c.x, c.y, c.z
    front = z > 0.02
    for s in (-1, 1):  # a flush on each cheek
        c.tint(soft(ellipse(x, y, s * 0.066, -0.036, 0.03, 0.02), 0.3, 0.7) * front, 0xee7f68, 0.5)
    c.tint(front * soft(np.hypot(x, y + 0.042), 0.006, 0.01), 0xb5674e, 0.3)  # under the nose
    # The moustache: a thin arc over the lip whose ends turn down round the smile.
    tash = polyline(x, y, [(-0.046, -0.07), (-0.04, -0.057), (-0.02, -0.0505), (0, -0.052), (0.02, -0.0505), (0.04, -0.057), (0.046, -0.07)])
    taper = 0.0068 - 0.0032 * np.clip((np.abs(x) - 0.02) / 0.026, 0, 1)
    # The mouth: an open smile, upper teeth showing.
    w = 0.033
    inside = np.clip(1 - (x / w) ** 2, 0, 1)
    top, bottom = -0.0615 + 0.006 * (1 - inside), -0.0615 - 0.019 * inside
    mouth = front & (np.abs(x) < w) & (y < top) & (y > bottom)
    c.mat(mouth, "mouth")
    c.mat(mouth & (y > top - 0.0095 * (0.35 + 0.65 * inside)), "tooth")
    c.tint(front & (np.abs(x) < w - 0.004) & (y <= bottom) & (y > bottom - 0.005), 0xc0664f, 0.5)  # lower lip
    c.mat(front & (tash < taper), "tash")
    # The goatee: a strip from under the lip widening over the chin.
    half = 0.012 + 0.02 * np.clip((-0.088 - y) / 0.016, 0, 1)
    c.mat(front & (y < -0.086) & (np.abs(x) < half), "tash")
    c.mat(front & (y < -0.098) & (ellipse(x, y, 0, -0.106, 0.04, 0.016) < 1), "tash")
    # Eyes: white, a blue-grey iris ringed darker and shaded under the lid, a pupil, and the light caught in it.
    for s in (-1, 1):
        ex, ey = s * 0.044, 0.003
        e = ellipse(x, y, ex, ey, 0.0215, 0.0158)
        white = (e < 1) & front
        c.mat(white, "eyewhite")
        ix, iy = ex - s * 0.002, ey - 0.0005
        r = np.hypot(x - ix, y - iy)
        iris = white & (r < 0.0128)
        c.mat(iris, "iris")
        c.tint(iris & (r > 0.0102), 0x1a2836, 0.75)
        c.tint(iris * soft(iy + 0.011 - y, 0.005, 0.008), 0x14202b, 0.5)
        c.flat(white & (r < 0.0062), 0x120d0c)
        gx = ix + (-c.right[0] * 0.0052 + c.up[0] * 0.005)
        gy = iy + (-c.right[1] * 0.0052 + c.up[1] * 0.005)
        c.flat(white & (np.hypot(x - gx, y - gy) < 0.0036), 0xffffff)
        c.flat(white & (np.hypot(x - ix - 0.0042, y - iy + 0.0046) < 0.0017), 0xdfe9f2)
        c.tint(white * soft(ey + 0.0145 - y, 0.003, 0.006), 0x3a2a26, 0.4)  # the lid's shadow on the eye
        lid = front & (e >= 1) & (e < 1.62) & (y > ey + 0.002)
        c.flat(lid, 0x2a160e)  # upper lash line
        c.tint(front & (e >= 1) & (e < 1.3) & (y < ey - 0.006), 0xa35f48, 0.35)  # lower lid
        brow = polyline(x, y, [(s * 0.019, 0.0275), (s * 0.044, 0.035), (s * 0.068, 0.027)])
        c.mat(front & (brow < 0.0058 - 0.002 * np.clip((s * x - 0.044) / 0.024, 0, 1)), "tash")


def ribs(c, count, dark=0.36, light=0.17):
    rib = np.sin(np.arctan2(c.x, c.z) * count)
    c.tint(soft(-rib, 0.15, 0.5), 0x040404, dark)
    c.tint(soft(rib, 0.5, 0.4), 0x756b64, light)


def paint_beanie(c):
    ribs(c, 34)


def paint_cuff(c):
    ribs(c, 46, 0.42, 0.2)


def paint_hoodie(c):
    x, y, z = c.x, c.y, c.z
    front = z > 0
    pocket = polyline(x, y, [(-0.075, 0.0), (-0.05, 0.078), (0.05, 0.078), (0.075, 0.0)])
    c.tint(front * soft(pocket, 0.002, 0.003), 0x020202, 0.6)
    c.tint(soft(np.abs(y + 0.012), 0.002, 0.003), 0x020202, 0.5)  # the hem's ribbed band
    c.tint((y < -0.012) * soft(-np.sin(np.arctan2(x, z) * 56.0), 0.1, 0.5), 0x020202, 0.3)


def paint_jacket(c):
    x, y, z = c.x, c.y, c.z
    front, seam, stitch = z > 0, 0x070505, 0x8a7868
    for s in (-1, 1):
        px = s * 0.092
        # Chest pocket: a flap with a pointed lower edge, double-stitched, and a metal button.
        dx = np.abs(x - px)
        flap = 0.176 - 0.014 * np.clip(1 - dx / 0.034, 0, 1)
        box = front & (dx < 0.034) & (y < 0.212) & (y > flap)
        edge = np.minimum(np.minimum(np.abs(dx - 0.034), np.abs(y - 0.212)), np.abs(y - flap))
        near = front * (dx < 0.037) * (y < 0.215) * (y > 0.158)
        c.tint(near * soft(edge, 0.0018, 0.0024), seam, 0.7)
        c.tint(box * soft(np.abs(edge - 0.0055), 0.001, 0.0016), stitch, 0.34)
        c.tint(front * soft(np.abs(y - 0.118), 0.0016, 0.0022) * (dx < 0.032), seam, 0.45)  # the pocket's foot
        c.tint(front * soft(np.abs(dx - 0.032), 0.0014, 0.002) * (y < 0.176) * (y > 0.118), seam, 0.4)
        c.mat(front & (np.hypot(x - px, y - 0.181) < 0.0066), "metal")
        # The seams that run from the pocket to the hem, and the placket with its buttons.
        c.tint(front * soft(np.abs(x - s * 0.078), 0.0015, 0.002) * (y < 0.118) * (y > 0.004), seam, 0.5)
        c.tint(front * soft(np.abs(x - s * 0.084), 0.0009, 0.0014) * (y < 0.118) * (y > 0.004), stitch, 0.24)
        c.tint(front * soft(np.abs(np.abs(x) - 0.06), 0.0014, 0.002) * (y > 0.004), seam, 0.5)
        for by in (0.2, 0.146, 0.092, 0.038):
            c.mat(front & (np.hypot(x - s * 0.051, y - by) < 0.0058), "metal")
    yoke = 0.232 - 0.1 * np.abs(x)
    c.tint(soft(np.abs(y - yoke), 0.0015, 0.002) * (np.abs(x) > 0.045), seam, 0.5)
    for hy, col, amt in ((0.004, seam, 0.6), (-0.003, stitch, 0.22), (-0.012, stitch, 0.22)):  # the waistband
        c.tint(soft(np.abs(y - hy), 0.0013, 0.0018), col, amt)
    c.tint((~front) * soft(np.abs(np.abs(x) - 0.07), 0.0015, 0.002) * (y < 0.2) * (y > 0.004), seam, 0.45)  # back panels


def paint_cuffband(c):
    c.tint(soft(np.abs(c.y - 0.014), 0.0016, 0.002), 0x070505, 0.55)
    c.tint(soft(np.abs(c.y - 0.009), 0.0009, 0.0014), 0x8a7868, 0.22)


def paint_hips(c):
    x, y, z = c.x, c.y, c.z
    front = z > 0
    c.tint(front * soft(np.abs(x), 0.0015, 0.002) * (y < 0.045), 0x030303, 0.55)  # fly
    c.tint(front * soft(np.abs(x - 0.014), 0.001, 0.0016) * (y < 0.045) * (y > -0.03), 0x665c55, 0.22)
    for s in (-1, 1):  # slanted hand pockets
        d = segment(x, y, s * 0.058, 0.06, s * 0.112, 0.0)
        c.tint(front * soft(d, 0.0018, 0.0024), 0x030303, 0.6)


def paint_cargo(c):
    y, z = c.y, c.z
    c.tint(soft(np.abs(y - 0.014), 0.0017, 0.0022), 0x030303, 0.65)  # the flap's edge
    c.tint(soft(np.abs(y - 0.008), 0.0009, 0.0014), 0x665c55, 0.26)
    c.mat((np.hypot(y - 0.024, z) < 0.0056) & (np.abs(c.x) > 0.004), "metal")
    c.tint(soft(np.abs(np.abs(z) - 0.03), 0.001, 0.0016) * (y < 0.014), 0x030303, 0.3)


def paint_shoe(c):
    x, y, z = c.x, c.y, c.z
    side = np.abs(x) > 0.02
    # The side stripe: low at the heel, sweeping up towards the laces.
    t = np.clip((z + 0.04) / 0.125, 0, 1)
    wave = -0.028 + 0.022 * t * t * (3 - 2 * t) + 0.005 * np.sin(t * np.pi)
    c.mat(side & (np.abs(y - wave) < 0.0046) & (z > -0.04) & (z < 0.085), "sole")
    top = (y > -0.024) & (np.abs(x) < 0.025) & (z > 0.012) & (z < 0.09)
    c.mat(top & (np.abs(((z - 0.012) % 0.0145) - 0.005) < 0.0025), "sole")  # laces
    c.tint(soft(np.abs(z - 0.098), 0.0014, 0.002) * (y < -0.004), 0x020202, 0.5)  # toe cap seam
    c.tint(soft(np.abs(y - 0.012), 0.0018, 0.0024) * (z < 0.012), 0x020202, 0.45)  # padded collar


def paint_sole(c):
    c.tint(soft(np.abs(c.y + 0.002), 0.0013, 0.0016), 0x1a1612, 0.75)


PAINTERS = {"head": paint_head, "beanie": paint_beanie, "cuff": paint_cuff, "hoodie": paint_hoodie, "jacket": paint_jacket,
            "cuffband": paint_cuffband, "hips": paint_hips, "cargo": paint_cargo, "shoe": paint_shoe, "sole": paint_sole}


def build(J, options=None):
    """Shane on a solved skeleton. options: {"pocket": "l"} draws that hand tucked into its trouser pocket."""
    options = options or {}
    m = Model()
    head, chest, pelvis, neck = J["head"], J["chest"], J["pelvis"], J["neck"]

    # ---- Head: a round skull, full cheeks, a small chin and nose
    H = dict(tag="head", group="head", space=head)
    m.ellipsoid(head.at((0, 0.012, -0.004)), (0.102, 0.104, 0.104), "skin", k=0.03, **H)
    m.ellipsoid(head.at((0, -0.04, 0.012)), (0.097, 0.072, 0.09), "skin", **H)
    m.ellipsoid(head.at((0, -0.086, 0.046)), (0.04, 0.026, 0.038), "skin", **H)
    m.ellipsoid(head.at((0, -0.03, 0.1)), (0.0145, 0.0125, 0.015), "skin", **H)
    for s in (-1, 1):
        m.ellipsoid(head.at((s * 0.101, -0.014, -0.006)), (0.013, 0.027, 0.019), "skin", tag="ear")
    m.limb(neck.point((0, -0.014, -0.008)), head.point((0, -0.085, -0.014)), 0.043, 0.04, "skin", tag="neck")
    # Hair: a fringe swept to his left under the beanie, the temples, and the back of his head down to the nape.
    m.ellipsoid(head.at((0, 0.012, -0.004)), (0.1085, 0.1105, 0.1105), "hair", tag="hair", group="hair", k=0.012,
                clips=(((-0.3, -1, 0), -0.033), ((0, 0, -1), 0.012)))
    m.ellipsoid(head.at((0, -0.012, -0.03)), (0.103, 0.086, 0.092), "hair", tag="hair", group="hair", clips=(((0, 0, 1), -0.012),))
    for s in (-1, 1):
        m.ellipsoid(head.at((s * 0.097, 0.012, 0.03)), (0.014, 0.036, 0.03), "hair", tag="hair", group="hair")
    # Beanie: a ribbed crown and a turned-up cuff, tilted back.
    tilt = float(np.arctan(RIM_SLOPE))
    m.ellipsoid(head.at((0, 0.05, -0.014)), (0.126, 0.106, 0.124), "beanie", tag="beanie", group="beanie", k=0.03,
                clips=(((0, -1, RIM_SLOPE), -(RIM_Y + CUFF * 0.6)),))
    m.ellipsoid(head.at((0, 0.128, -0.03)), (0.062, 0.03, 0.062), "beanie", tag="beanie", group="beanie")
    m.torus(head.at((0, RIM_Y + CUFF - 0.004, -0.012), rot_x(-tilt)), 0.108, CUFF, "beanie", tag="cuff", squash=(1.03, 1.03))

    # ---- Chest: the hoodie, its hood and cords, and the jacket open over it
    m.ellipsoid(chest.at((0, 0.125, 0)), (0.125, 0.16, 0.088), "hoodie", tag="hoodie", group="hoodie", k=0.03, space=chest, clips=(((0, -1, 0), 0.03),))
    m.ellipsoid(chest.at((0, 0.03, 0.006)), (0.122, 0.085, 0.088), "hoodie", tag="hoodie", group="hoodie", space=chest, clips=(((0, -1, 0), 0.03),))
    opening = m.cutter("box", chest.at((0, 0.1, 0.11)), b=(0.043, 0.22, 0.09), round=0.0)
    clip = (((0, -1, 0), 0.018),)
    m.ellipsoid(chest.at((0, 0.125, -0.002)), (0.147, 0.168, 0.101), "jacket", tag="jacket", group="jacket", k=0.035, space=chest, subs=(opening,), clips=clip)
    m.ellipsoid(chest.at((0, 0.04, -0.002)), (0.144, 0.1, 0.1), "jacket", tag="jacket", group="jacket", space=chest, subs=(opening,), clips=clip)
    m.torus(chest.at((0, 0.276, -0.012), rot_x(deg(8))), 0.062, 0.031, "hoodie", tag="hood", group="hood", k=0.025, squash=(1.3, 1.05))
    m.ellipsoid(chest.at((0, 0.268, -0.085)), (0.092, 0.052, 0.046), "hoodie", tag="hood", group="hood")
    for s in (-1, 1):
        m.box(chest.at((s * 0.07, 0.262, 0.066), rot_y(s * deg(24)) @ rot_z(s * deg(-28)) @ rot_x(deg(26))), (0.04, 0.022, 0.009), "jacket", tag="collar", round=0.007)
        pts = [chest.point(p) for p in ((s * 0.021, 0.252, 0.07), (s * 0.024, 0.2, 0.084), (s * 0.026, 0.15, 0.093))]
        m.limb(pts[0], pts[1], 0.0048, 0.0048, "cord", tag="cord", group="cord%d" % s, k=0.002)
        m.limb(pts[1], pts[2], 0.0048, 0.0048, "cord", tag="cord", group="cord%d" % s)
        m.limb(pts[2], chest.point((s * 0.026, 0.13, 0.094)), 0.0062, 0.0062, "metal", tag="aglet")
    m.box(chest.at((0, 0.262, -0.07), rot_x(-deg(14))), (0.07, 0.02, 0.012), "jacket", tag="collar", round=0.007)

    # ---- Arms: sleeves that melt into their shoulders, a banded cuff, a hand
    for side, s in (("l", 1), ("r", -1)):
        sh, el, wr = J["shoulder_" + side], J["elbow_" + side], J["wrist_" + side]
        g = "arm" + side
        m.ellipsoid(sh, (0.057, 0.053, 0.06), "jacket", tag="sleeve", group=g, k=0.024)
        m.limb(sh.t, el, 0.054, 0.05, "jacket", tag="sleeve", group=g)
        m.limb(el, wr.point((0, 0.022, 0)), 0.05, 0.045, "jacket", tag="sleeve", group=g)
        m.cylinder(wr.at((0, 0.014, 0)), 0.0465, 0.016, "jacket", tag="cuffband", round=0.007)
        if options.get("pocket") != side:
            hand(m, wr, s, scale=1.5)
        else:  # only the heel of the hand shows above the pocket
            m.ellipsoid(wr.at((0, -0.018, 0.004)), (0.027, 0.026, 0.03), "skin", tag="hand")

    # ---- Hips and legs: cargo trousers, a pocket on each thigh
    m.ellipsoid(pelvis.at((0, 0.014, 0)), (0.128, 0.078, 0.092), "trousers", tag="hips", group="hips", k=0.03)
    for side, s in (("l", 1), ("r", -1)):
        hip, knee, foot, toe = J["hip_" + side], J["knee_" + side], J["ankle_" + side], J["toe_" + side]
        m.limb(hip.t, knee, 0.067, 0.06, "trousers", tag="leg", group="hips")
        m.limb(knee, foot.point((0, 0.036, 0)), 0.06, 0.056, "trousers", tag="leg", group="shin" + side, k=0.01)
        m.torus(foot.at((0, 0.036, 0.002)), 0.047, 0.017, "trousers", tag="hem", group="shin" + side)
        thigh = frame_along(hip.t, knee, pelvis.vec((0, 0, 1)))
        m.box(thigh.at((s * 0.064, -DIMS.thigh * 0.62, 0.002)), (0.013, 0.042, 0.04), "trousers", tag="cargo", round=0.009)
        # ---- Skate shoes: a black upper, a white sole, toes that bend at the ball
        sg = "shoe" + side
        m.ellipsoid(foot.at((0, -0.012, -0.006)), (0.046, 0.046, 0.058), "shoe", tag="shoe", group=sg, k=0.016, space=foot)
        m.ellipsoid(foot.at((0, -0.024, 0.054)), (0.045, 0.031, 0.062), "shoe", tag="shoe", group=sg, space=foot)
        m.ellipsoid(toe.at((0, 0.01, 0.028)), (0.045, 0.027, 0.041), "shoe", tag="shoe", group=sg, space=foot)
        m.box(foot.at((0, -0.043, 0.008)), (0.048, 0.009, 0.068), "sole", tag="sole", group="sole" + side, k=0.004, round=0.008)
        m.box(toe.at((0, -0.005, 0.028)), (0.047, 0.009, 0.043), "sole", tag="sole", group="sole" + side, round=0.008)
    return m


# How he stands: weight on his right leg, his left hand in its pocket.
IDLE = {
    "root": (-0.006, 0.0, 0.0), "pelvis": (0.0, 0.0, deg(-1.5)), "chest": (deg(1), 0.0, deg(2.5)), "head": (deg(2), deg(-3), deg(-3)),
    "arm_l": {"hand": (0.128, 0.375, 0.03), "pole": (1.0, 0.1, -0.8)},
    "arm_r": {"swing": deg(3), "out": deg(13), "elbow": deg(22)},
    "leg_l": {"foot": (0.012, 0.0, 0.012), "yaw": deg(8)}, "leg_r": {"foot": (-0.002, 0.0, -0.004)},
}
IDLE_OPTIONS = {"pocket": "l"}
