# Full game verification

The exact37,956,595-byte purple Mothlight game HTML passes85 browser checks:
all67 prior navigation/layout/save checks,15 normal-label contrast checks and
3 edge/reduced-motion checks. HTML SHA256:
`55a86e616607da83bbeb98fc5cb27b94ffa8a7890f32c0c7384b3e954b7eab2c`.

The actual game boots in WebGL; there is no receipt-lab runtime. Manage, farm
upgrades, wardrobe, settings and home sheets work on desktop1280×800,
unfolded874×787 and phone390×844. Menus fit without horizontal overflow, enabled
buttons retain44px targets, normal labels reach4.5:1 against the declared
purple paper base, and menus close without obstructing the canvas/HUD/dock.
Contrast calculations use the declared base, not per-pixel gradients.

Menu navigation neither spends coins nor changes earned income. The original
version14 save key/serializer remains. The sparkle is a noninteractive6-second
opacity animation, static with reduced motion. No JavaScript errors or external
requests were observed. Nine screenshots are in browser/.

The build wrapper also compares the complete compiled runtime script before
and after the CSS skin: its bytes are identical. The build metadata refers to
the committed code parent used before recording this evidence. Physical Fold7,
Bluetooth-controller and Android file-provider verification are not implied.
ManagedChromium blocked file:// navigation; the identical fullyembeddedHTML was
tested over loopback. The downloaded game remains one offline HTML.
