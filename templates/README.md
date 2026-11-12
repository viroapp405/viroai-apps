# Templates for Saba's Gemini Canvas apps

## extension/ — MV3 extension + storage bridge
Copy this folder for each new app and replace the placeholders everywhere:
- `__APP_NAME__` Persian app name (e.g. کاروسل‌ساز صبا)
- `__SHORT_NAME__` short English name
- `__DESCRIPTION__` one-line Persian description
- `__APP_ID__` app id, e.g. `saba-carousel` (must match the app's bridge adapter `app` field)
- `__APP_URL__` the Canvas share link (share.gemini.google/...) Saba sends
- `__SHORTCUT__` e.g. `Alt+K` (each app its own)
Bump `version` in manifest.json for every new link, then zip the folder.

bridge.js answers only messages `{__sabaBridge:1, dir:"req", app:__APP_ID__, id, op}` (ops ping/get/set/del/list/getAll/batch/clear) and stores under `app:__APP_ID__:` in chrome.storage.local (unlimitedStorage). Options page = optional proxy for Google domains only.

## App side
The app-side bridge adapter (the `Bridge` object: ping on load, bridge is source of truth, debounced mirror writes) is in `slides/index.html` — copy it from there with the app id changed.

## Canvas loader
Copy `slides/canvas-loader.html`; change title, the two URLs and `CACHE_KEY`.
