SKILL: Building Gemini Canvas apps for Saba (ViroAI) — portable version, 2026-11-12

Talk to Saba in Persian. Apps are free Persian AI tools that run inside Gemini Canvas.

WHY THIS METHOD
Canvas drops features when it builds from a prompt, breaks things between edits, and mangles big pasted files. So the agent builds and tests the whole app itself, hosts it on GitHub, and Canvas only runs a tiny loader that pulls the app from GitHub.

ACCOUNTS
• Canvas/Gemini: Saba's own Google account.
• GitHub: user viroapp405, public repo github.com/viroapp405/viroai-apps. One folder per app: <app>/index.html (the full app) + <app>/canvas-loader.html (the loader). Ask Saba for repo access; never store the password in notes.
• Business: apps free; income from paid features and theme/style packs. Never put sellable packs in the public repo.

STEPS
1. Agree the features with Saba. Keep a Persian README with a changelog per app. Keep old versions.
2. Write ONE complete HTML file (HTML+CSS+JS, no build step). Persian RTL UI, Vazirmatn font, default theme "Saba Neon" (neon purple). Use a build script when extending a previous version.
3. AI models (final 2026-11-12). Every model id in a const at the top. const apiKey = "" (Canvas fills it).
   a) Without a key (Canvas): image "gemini-3.1-flash-image", text "gemini-2.5-flash", voice "gemini-2.5-flash-preview-tts". Only these three passed Saba's Canvas test; newer 3.5–3.8 / 4 models returned 403 in Canvas.
      Image request: generationConfig {responseModalities:["IMAGE"], imageConfig:{aspectRatio}}; read the inlineData part of the answer.
   b) Image fallback (the only fallback): IMAGE_MODELS = ["gemini-3.1-flash-image","gemini-2.5-flash-image-preview"]. On HTTP 429/403/404/5xx from 3.1, switch at once (no retries) to 2.5-image-preview and show a status line; stay on it 10 minutes, then try 3.1 again. Both write Persian text correctly. Text and voice: one model each, no fallback.
   c) Optional personal API key in Settings: «🔑 کلید API شخصی (اختیاری)», saved only in the browser's localStorage. With a key: text = gemini-3.5-flash-lite (default) / gemini-3.5-flash / gemini-3.8-flash; voice = gemini-3.8-flash-tts (default) / gemini-3.8-flash-lite-tts; images keep rule (b). The request URL uses key=${userKey || apiKey}.
   d) Saba prefers the 3.8 voices. With 2.5 TTS, prefix a short style direction (warm, natural, conversational pace). Re-test the Canvas models after 2026-11-17 (2.5 preview TTS may be shut down) or whenever Canvas changes.
   Reference implementation: slides/index.html (v1.6.1) in the repo.
4. Creator info in every app: footer + ℹ️ About window + a line in Settings:
   «ساخته‌ی سید صبا میری» · https://viroai.ir · Instagram https://instagram.com/viromedia404 · tel:+989120349893 (۰۹۱۲۰۳۴۹۸۹۳) · تلگرام: https://t.me/viroaihub
   Links open with target=_blank rel=noopener. Check it in tests.
5. Styles: after v1, new styles ship as separate import packs (JSON, imported with the app's import button), not as a new app version. Saba may send Pinterest samples to turn into styles.
6. Storage: IndexedDB + zip backup, plus a storage bridge for the companion browser extension (postMessage {__sabaBridge:1, dir, app:<app-id>, id, op}; ops ping/get/set/del/list/getAll/batch/clear; the bridge is the source of truth on load; mirror writes debounced). App-side adapter: copy the Bridge object from slides/index.html in the repo (change the app id). Extension side: templates/extension/ in the repo (bridge.js + manifest with placeholders; see templates/README.md).
7. Test before publishing: jsdom (+ fake-indexeddb) with mocked fetch, a real Chromium run when possible, node --check for extension JS. The file must end with </html> and contain no TODOs.
8. Publish: push <app>/index.html to the repo. Create <app>/canvas-loader.html from the template below (change the title, the two URLs and the cache key). Never use document.open/document.write in the loader (it caused a reload loop).
9. Give Saba ONLY the loader, plus this text to paste into a NEW Canvas chat:
   این کد HTML کامل یک وب‌اپلیکیشن است. بدون اینکه هیچ تغییری در کد ایجاد کنی، آن را مستقیماً در محیط Canvas به صورت کاملاً زنده (Rendered Canvas) برای من اجرا کن.
   Saba shares it and sends the share.gemini.google link. From then on every update is a GitHub push only; the Canvas link never changes.
10. Extension for every app (copy templates/extension/ from the repo, fill __APP_NAME__, __APP_ID__, __APP_URL__, __SHORTCUT__, bump version, zip): a standalone Chrome MV3 extension (background.js opens APP_URL = the share link, its own Alt shortcut, bridge.js content script on gemini.google.com, share.gemini.google, *.usercontent.goog, *.googleusercontent.com with all_frames, match_about_blank, match_origin_as_fallback; permissions storage + unlimitedStorage). Saba adds new app links to her Gemini Toolbox extension herself from its Options page.

LOADER TEMPLATE (slides example)
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>اسلایدساز صبا</title>
<style>body{margin:0;background:#07051a;color:#f4f2fb;font:15px/2 Tahoma,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}#m{padding:20px}</style>
</head>
<body>
<div id="m">⏳ در حال بارگذاری اسلایدساز صبا…<br><small>ساخته‌ی سید صبا میری · viroai.ir</small></div>
<script>
const APP_SOURCES=["https://raw.githubusercontent.com/viroapp405/viroai-apps/main/slides/index.html","https://cdn.jsdelivr.net/gh/viroapp405/viroai-apps@main/slides/index.html"];
const CACHE_KEY="sabaLoader.saba-slides";
(async()=>{let html=null;
 for(const u of APP_SOURCES){try{const r=await fetch(u+"?t="+Date.now(),{cache:"no-store"});if(r.ok){const t=await r.text();if(t.includes("</html>")){html=t;break}}}catch(e){}}
 if(html){try{localStorage.setItem(CACHE_KEY,html)}catch(e){}}else{try{html=localStorage.getItem(CACHE_KEY)}catch(e){}}
 if(!html){document.getElementById("m").textContent="⚠️ دریافت برنامه ممکن نشد. اینترنت را بررسی کن و صفحه را تازه کن.";return}
 const doc=new DOMParser().parseFromString(html,"text/html");
 document.title=doc.title||document.title;
 document.documentElement.lang=doc.documentElement.lang||"fa";document.documentElement.dir=doc.documentElement.dir||"rtl";
 document.querySelectorAll("style").forEach(s=>s.remove());
 for(const n of [...doc.head.children]){if(n.tagName==="SCRIPT"||n.tagName==="TITLE")continue;document.head.appendChild(document.importNode(n,true))}
 const scripts=[...doc.body.querySelectorAll("script")];scripts.forEach(s=>s.remove());
 document.body.innerHTML=doc.body.innerHTML;
 for(const s of scripts){const e=document.createElement("script");for(const a of s.attributes)e.setAttribute(a.name,a.value);
  if(s.src){await new Promise(ok=>{e.onload=e.onerror=ok;document.body.appendChild(e)})}else{e.textContent=s.textContent;document.body.appendChild(e)}}
})();
</script>
</body>
</html>
