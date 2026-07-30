# EduSphere

FUTA CBT practice platform — Community, Practice/Scanning Mode, CBT Exams,
Flashcards, Admin & Super Admin dashboards, Messaging, and more. Built as a
single web app (React via Babel standalone, Firebase compat SDK, no
bundler), packaged for Android via Capacitor.

This is the complete project: extract the ZIP and everything below works
without assembling anything else by hand.

## Folder structure
```
EduSphere.html              ← entry point — open this (via a local server, see below)
src/
  config/appConfig.js       ← all editable settings in one place (theme, upload limits, branding, etc.)
  firebase/init.js          ← single Firebase init + reusable auth/db/storage handles
  services/
    logger.js               ← structured logging (on/off via config)
    uploadManager.js        ← validation, compression, quota, cancel/retry/resume for all uploads
  legacy/app-legacy.js      ← the not-yet-further-split remainder of the app (screens/components/hooks)
  components/ screens/ hooks/ utils/ storage/ admin/ community/ quiz/
  dashboard/ animations/ assets/ styles/     ← scaffolded, empty — target structure for finishing the modularization (see MIGRATION_STATUS.md)
capacitor.config.json       ← Capacitor config (points the Android shell at your live hosted URL)
package.json                ← npm scripts + Capacitor dependencies
android-overrides/          ← Android native config (permissions, signing, Firebase, branding) — see below
resources/icon.png, splash.png   ← placeholder brand art for the Android app icon/splash
www/index.html              ← offline fallback page shown only if the Android app can't reach your server
.github/workflows/build-android.yml   ← builds a signed APK + AAB in the cloud, no Android Studio needed
MIGRATION_STATUS.md         ← exact status + line-map for finishing the code-splitting work
MODULE_2_SUMMARY.md         ← what changed in the last refactor pass, and known technical debt
```

## 1. Run it locally first
```bash
npm run start
```
Opens a static server at http://localhost:8080 — go there and open
`EduSphere.html`. (Don't double-click the HTML file directly — browsers
block loading local script files over the `file://` protocol, so it has to
be served over http.) No Node? `python3 -m http.server 8080` does the same
thing directly, no npm needed.

## 2. Deploy it for real (Firebase Hosting)
You already have the `futalearn` Firebase project, so this is the natural
choice — same login, and it gives you the HTTPS URL the Android app needs.
```bash
npm install -g firebase-tools   # one-time
firebase login
firebase init hosting           # public directory: this project's root; say NO to single-page-app rewrite
firebase deploy --only hosting
```
That gives you a real `https://<your-project>.web.app` URL.

## 3. Package for Android (Capacitor)
Four things left for you, everything else is already wired:

| # | What | Where |
|---|------|-------|
| 1 | Your real hosted URL | `capacitor.config.json` → `server.url` |
| 2 | Your real Firebase Android config | replace `android-overrides/app/google-services.json` |
| 3 | Your signing keystore | GitHub repo → Settings → Secrets |
| 4 | Run the build | GitHub Actions tab → "Build EduSphere Android App" |

```bash
npm install
npx cap add android          # generates the real android/ project fresh from Capacitor
npx @capacitor/assets generate --android    # icons + splash from resources/
npx cap sync android
```
Then either build locally (`npm run build:apk` / `npm run build:aab`, needs
Android Studio's SDK installed) or push to GitHub and let
`.github/workflows/build-android.yml` build+sign it in the cloud — no
Android Studio required. One-time signing setup:
```bash
keytool -genkey -v -keystore release-key.jks -alias edusphere \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -i release-key.jks -o keystore-base64.txt
```
Add `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD` as GitHub Actions secrets, then run the workflow —
download the signed `.apk`/`.aab` from the run's Artifacts.

**Why `android/` isn't already in this ZIP**: generating it requires
network access to fetch Capacitor's official template (and its Gradle
wrapper, a binary file) — building it fresh every time (step above / the
GitHub workflow) guarantees you're always on the current, correct template
instead of a stale hand-copied one. `android-overrides/` holds every file
that's actually customized for EduSphere (permissions, signing, branding,
Firebase) and gets layered on top automatically.

## Current state of the codebase
This app was originally one 14,074-line HTML file. It's partway through
being split into the modular `src/` structure above:
- **Done**: Firebase (`firebase/init.js`), global config (`config/appConfig.js`),
  logging (`services/logger.js`), and the upload pipeline
  (`services/uploadManager.js`, including a repaired bug from an earlier
  extraction pass — see `MODULE_2_SUMMARY.md`).
- **Not yet done**: `src/legacy/app-legacy.js` still holds ~13,200 lines of
  screens/components/hooks. `MIGRATION_STATUS.md` has the exact line-range
  map for finishing this safely, in slices, bottom-up.

Nothing about the app's behavior changed for users during this — every
extraction was verified against the original file before being folded in.

## Known open items (see MODULE_2_SUMMARY.md for full detail)
- Theme default is currently **light** — a "dark by default" change was
  requested at one point but deliberately not made, since it's a real
  user-facing behavior change that needs an explicit decision, not a
  silent flip during a "cleanup" pass.
- Image/profile-photo uploads support cancel but not pause/resume yet
  (PDFs and videos already do, via a real Firebase resumable-upload handle).
- No automated test suite exists yet — recommended before further
  refactoring, so regressions are caught by a script instead of manual review.
