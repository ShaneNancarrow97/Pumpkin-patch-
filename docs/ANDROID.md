# Android app

The last APK was `Pumpkin_Patch_Midnight.apk`: `com.shanenatalie.pumpkinpatch`, version 2.10.0 (code 21001), minSdk 26, targetSdk 35. It requests no permissions.

## How it works

The app is one `MainActivity` holding a full-screen WebView. It loads `https://appassets.androidplatform.net/index.html` and `android-shell.js` from the APK's `assets/` folder through a `WebViewAssetLoader`. **That origin is where the saves live** (WebView localStorage is per origin), so any future version must keep it.

The native side, recovered from the strings in `classes.dex`:

- **`PumpkinAndroid.exportBackup(text, filename)`** is a JavaScript interface. It opens the system "Create document" picker and writes the backup JSON. The file name must match `[a-zA-Z0-9_-]+\.json`, and an oversized backup is refused.
- **Import** goes through `WebChromeClient.onShowFileChooser` and the system "Open document" picker.
- **Back button:** closes an open menu, then leaves the house, then asks "Leave the patch?" with the choices *Save & close* and *Keep playing*.
- **Lifecycle:** on pause it calls `pumpkinNativeForeground(false)`, which saves and pauses. On resume, `pumpkinNativeForeground(true)` restores the previous pause state.
- **Display:** an immersive full-screen window with safe-area insets.
- **Manifest:** `allowBackup="false"` and cleartext traffic disabled.

[`android-shell.js`](../android/android-shell.js) is the page side of that bridge. It adds polyfills for old WebViews (`Object.hasOwn`, `replaceChildren`), turns off browser full screen, handles foreground and background, and sends backup downloads to `exportBackup`. `android/pumpkin.png` is the launcher icon.

## Building the web part

```sh
npm run build:android    # dist/android/index.html + dist/android/android-shell.js
```

Copy those two files into the Android project's `app/src/main/assets/`.

## The Java project is missing

Only the compiled APK was provided, so the Android Studio project (`MainActivity.java`, the Gradle files and the signing key) is **not in this repository**. The behaviour above is enough to rewrite it, at about 200 lines of Java. **But an update only installs over the existing app if it is signed with the same key** (`META-INF/PUMPKIN-.RSA`).

- **If the keystore can be found**, keep it somewhere safe outside the repository.
- **If it can't**, a new key means uninstalling the old app first, which deletes the saves. Export a backup from the old app first, then import it into the new one.

The roadmap names the HTML file as the main way to ship the game, and the APK stays at 2.10 until this project is rebuilt.
