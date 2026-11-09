# Offline Android addendum

Built **after** the checked HTML, ZIP and game patch kit were publicly verified. Source HTML is the identical `ab6ac3af9f1a2024693952d6fd987a7ad2473fad622785473022271f1c7ad1a6` build; game behavior is unchanged.

- Package: `com.shanenatalie.pumpkinpatch.voxel`.
- Version: **2026.11.09.2**, code **26110902**; Android8+ / minimum26 / target35.
- APK: `43,343,342` bytes, SHA256 `c280731be9101a2ea605296edb9687e04641f148176a2c3c1c560e787a650890`.
- Embedded local media: **280 assets**. Extracting embedded media reduces HTML parse bytes by **92.0888%**; this is a measured packaging/startup-size benefit, not a device FPS claim.
- Signature, alignment, ZIP CRC, every media hash and stored-without-recompression checks pass. The signing certificate matches the previous Interaction Fixes APK, using the retained private signing identity outside source.
- **11 native-shell +6 extractor tests pass.**

[Build report](../../../android/verification/mothlight-expansion/build-report.json), [signature](../../../android/verification/mothlight-expansion/signature-check.txt), [package](../../../android/verification/mothlight-expansion/package-check.txt), [asset inventory](../../../android/verification/mothlight-expansion/asset-manifest.json), [native tests](../../../android/verification/mothlight-expansion/native-tests.txt), [extractor tests](../../../android/verification/mothlight-expansion/extractor-tests.txt). The builder’s cached APK basename is historical; the release file was renamed without changing its bytes.

The host uses Android System WebView/WebGL2 with local media assets, fullscreen/system-bar handling, safe-area/Fold resize support, controller Back layering and existing save import/export. It is not a native3D rewrite. Real Fold7, TV, Bluetooth, installation and runtime performance remain unverified on hardware.

Apply this optional kit after the main two-patch game kit. It contains the intervening publication receipt and this native version/evidence commit. Preserve the private signing key/password outside source for future in-place updates. Export your browser save through Settings and import it in the app; browser and app storage are separate. No signing key, API credential or personal save is included.
