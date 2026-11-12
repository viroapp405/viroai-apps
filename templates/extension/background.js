const APP_URL = "__APP_URL__";

// Google domains routed through the proxy so login and Gemini share one IP
const GOOGLE_DOMAINS = [
  "google.com", "google", "gstatic.com", "googleapis.com",
  "googleusercontent.com", "gemini.google", "withgoogle.com", "ggpht.com"
];

function buildPac(type, host, port) {
  const target = type === "HTTP" ? `PROXY ${host}:${port}` : `SOCKS5 ${host}:${port}; SOCKS ${host}:${port}`;
  const list = JSON.stringify(GOOGLE_DOMAINS);
  return `function FindProxyForURL(url, host) {
    var d = ${list};
    for (var i = 0; i < d.length; i++) {
      if (host === d[i] || dnsDomainIs(host, "." + d[i])) return "${target}";
    }
    return "DIRECT";
  }`;
}

async function applyProxy() {
  const { enabled, type = "SOCKS5", host, port } = await chrome.storage.local.get(["enabled", "type", "host", "port"]);
  if (enabled && host && port) {
    await chrome.proxy.settings.set({
      value: { mode: "pac_script", pacScript: { data: buildPac(type, host, port) } },
      scope: "regular"
    });
  } else {
    await chrome.proxy.settings.clear({ scope: "regular" });
  }
}

chrome.runtime.onInstalled.addListener(applyProxy);
chrome.runtime.onStartup.addListener(applyProxy);
chrome.storage.onChanged.addListener((c) => {
  if (c.enabled || c.type || c.host || c.port) applyProxy();
});

chrome.action.onClicked.addListener(async () => {
  const { winId } = await chrome.storage.local.get("winId");
  if (winId) {
    try { await chrome.windows.update(winId, { focused: true }); return; } catch (e) {}
  }
  const w = await chrome.windows.create({ url: APP_URL, type: "popup", width: 1440, height: 920 });
  chrome.storage.local.set({ winId: w.id });
});

chrome.windows.onRemoved.addListener(async (id) => {
  const { winId } = await chrome.storage.local.get("winId");
  if (id === winId) chrome.storage.local.remove("winId");
});
