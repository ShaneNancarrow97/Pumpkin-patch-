"""The owners' skeleton: turns a pose (a few angles and foot targets) into the frames their models hang on.

A pose is a plain dict; anything left out is at rest. Lengths are in body heights (1.0 is standing height).

    root        (x, y, z) the pelvis moves from rest: sway, bob, lunge
    pelvis      (pitch, yaw, roll) of the hips, radians; pitch leans forward, yaw turns left, roll drops the right hip
    chest       (pitch, yaw, roll) of the chest relative to the hips
    head        (pitch, yaw, roll) of the head relative to the chest; pitch nods down
    arm_l/arm_r {"swing": forward angle, "out": away from the body, "elbow": bend, "twist": turn of the upper arm
                 inward} or {"hand": (x, y, z) wrist target in body space, "pole": which way the elbow points}
    leg_l/leg_r {"foot": (x, y, z) ankle offset from where it stands at rest, "pitch": toes up (+) or down (-),
                 "toe": bend of the toes at the ball, "yaw": toe-out}

`solve` returns named frames: pelvis, chest, head, shoulder_l/r, elbow_l/r, wrist_l/r, hip_l/r, knee_l/r,
ankle_l/r, toe_l/r, plus the joint points the limbs run between.
"""
import numpy as np
from sculpt import Frame, rot_x, rot_y, rot_z, deg


class Dims:
    """One body's measurements, in body heights."""

    def __init__(self, **kw):
        self.ankle = 0.058      # ankle joint above the ground, foot flat
        self.shin = 0.17
        self.thigh = 0.175
        self.hip_x = 0.056      # half the distance between the hip joints
        self.hip_drop = 0.022   # hip joints below the pelvis centre
        self.waist = 0.068      # waist pivot above the pelvis centre
        self.shoulder = (0.118, 0.245, -0.004)  # shoulder joint from the waist pivot (x is mirrored for the right)
        self.neck = 0.282       # base of the neck above the waist pivot
        self.head = 0.116       # head centre above the base of the neck
        self.upper = 0.145
        self.fore = 0.135
        self.stance = 0.012     # how far each foot stands out from under its hip
        self.toe_out = deg(9)   # feet turned out at rest
        self.ball = (0.0, -0.046, 0.052)  # the ball of the foot from the ankle (where the toes bend)
        self.knee_bend = 0.006  # the pelvis rides this much lower than straight legs at rest
        for k, v in kw.items():
            setattr(self, k, v)

    @property
    def hip_y(self):
        return self.ankle + self.shin + self.thigh - self.knee_bend

    @property
    def pelvis_y(self):
        return self.hip_y + self.hip_drop


def rpy(pitch=0.0, yaw=0.0, roll=0.0):
    """Lean forward by pitch, turn left by yaw, tilt by roll (positive drops the character's right side)."""
    return rot_y(yaw) @ rot_x(pitch) @ rot_z(roll)


def two_bone(a, target, l1, l2, pole):
    """The middle joint of a two-bone limb from a to target, bent towards pole. Returns (middle, end)."""
    d = target - a
    dist = float(np.linalg.norm(d))
    reach = l1 + l2 - 1e-4
    if dist > reach:
        target = a + d * (reach / dist)
        d, dist = target - a, reach
    dist = max(dist, abs(l1 - l2) + 1e-4)
    u = d / dist
    along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist)
    h = np.sqrt(max(l1 * l1 - along * along, 0.0))
    w = pole - u * float(pole @ u)
    n = float(np.linalg.norm(w))
    w = w / n if n > 1e-6 else np.array([0.0, 0.0, 1.0])
    return a + u * along + w * h, target


def frame_along(a, b, forward):
    """A frame at a whose -y runs towards b (down the limb) and whose z leans to `forward`."""
    y = a - b
    y = y / max(np.linalg.norm(y), 1e-9)
    z = forward - y * float(forward @ y)
    n = np.linalg.norm(z)
    z = z / n if n > 1e-6 else np.cross(y, [1.0, 0.0, 0.0])
    x = np.cross(y, z)
    return Frame(np.stack([x, y, z], axis=1), a)


def solve(pose, dims):
    P = lambda key, default: pose.get(key, default)
    J = {}
    root = np.asarray(P("root", (0.0, 0.0, 0.0)), dtype=np.float64)
    pelvis = Frame(rpy(*P("pelvis", (0, 0, 0))), np.array([0.0, dims.pelvis_y, 0.0]) + root)
    chest = pelvis.at((0, dims.waist, 0), rpy(*P("chest", (0, 0, 0))))
    neck = chest.at((0, dims.neck, 0))
    hp, hyaw, hroll = P("head", (0, 0, 0))
    head = neck.at((0, dims.head, 0), rpy(hp, hyaw, hroll))
    # The head turns about the neck, not about its own middle.
    head = Frame(neck.R @ rpy(hp, hyaw, hroll), neck.t + (neck.R @ rpy(hp, hyaw, hroll)) @ np.array([0, dims.head, 0.0]))
    J.update(pelvis=pelvis, chest=chest, neck=neck, head=head)
    for side, s in (("l", 1.0), ("r", -1.0)):
        # ---- Arm
        sx, sy, sz = dims.shoulder
        shoulder = chest.at((s * sx, sy, sz))
        arm = P("arm_" + side, {})
        if "hand" in arm:
            target = np.asarray(arm["hand"], dtype=np.float64)
            if arm.get("space", "body") == "body":
                target = Frame(rot_y(P("pelvis", (0, 0, 0))[1]), np.array([root[0], 0.0, root[2]])).point(target)
            pole = chest.vec(arm.get("pole", (s * 0.6, -0.2, -1.0)))
            elbow, wrist = two_bone(shoulder.t, target, dims.upper, dims.fore, pole)
        else:
            swing, out, bend, twist = arm.get("swing", 0.0), arm.get("out", deg(7)), arm.get("elbow", deg(12)), arm.get("twist", 0.0)
            R_up = chest.R @ rot_x(-swing) @ rot_z(s * out) @ rot_y(-s * twist)
            elbow = shoulder.t + R_up @ np.array([0.0, -dims.upper, 0.0])
            wrist = elbow + (R_up @ rot_x(-bend)) @ np.array([0.0, -dims.fore, 0.0])
        fwd = chest.vec((0, 0, 1))
        hand = frame_along(wrist, wrist + (wrist - elbow), fwd)
        if "hand_turn" in arm:  # turn the hand about the forearm (palm in, palm back)
            hand = Frame(hand.R @ rot_y(arm["hand_turn"]), hand.t)
        J["shoulder_" + side], J["elbow_" + side], J["wrist_" + side] = shoulder, elbow, hand
        # ---- Leg
        hip = pelvis.at((s * dims.hip_x, -dims.hip_drop, 0))
        leg = P("leg_" + side, {})
        rest = np.array([s * (dims.hip_x + dims.stance), dims.ankle, 0.0])
        ankle_target = rest + np.asarray(leg.get("foot", (0, 0, 0)), dtype=np.float64)
        yaw = P("pelvis", (0, 0, 0))[1] * 0.6 + s * dims.toe_out + leg.get("yaw", 0.0)
        pole = rot_y(yaw) @ np.array([s * leg.get("knee_out", 0.06), 0.0, 1.0])
        knee, ankle_pos = two_bone(hip.t, ankle_target, dims.thigh, dims.shin, pole)
        foot = Frame(rot_y(yaw) @ rot_x(-leg.get("pitch", 0.0)), ankle_pos)
        toe = foot.at(dims.ball, rot_x(-leg.get("toe", 0.0)))
        J["hip_" + side], J["knee_" + side], J["ankle_" + side], J["toe_" + side] = hip, knee, foot, toe
    return J


def mix(a, b, t):
    return a + (b - a) * t


def ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def foot_pivot(dims, contact_z, pitch, pivot_z):
    """Where the ankle is when the foot stands on one point of its sole and tips about it.

    contact_z is where that point touches the ground, pivot_z how far along the sole it is from the ankle (the
    ball of the foot is ahead of it, the heel behind) and pitch the foot's angle, toes up positive.
    Returns the ankle's (height above its resting height, z)."""
    y = dims.ankle * np.cos(pitch) - pivot_z * np.sin(pitch)
    z = contact_z - dims.ankle * np.sin(pitch) - pivot_z * np.cos(pitch)
    return y - dims.ankle, z
