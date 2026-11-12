const $ = (id) => document.getElementById(id);
chrome.storage.local.get(["enabled", "type", "host", "port"]).then((s) => {
  $("enabled").checked = !!s.enabled;
  $("type").value = s.type || "SOCKS5";
  $("host").value = s.host || "127.0.0.1";
  $("port").value = s.port || "";
});
$("save").onclick = async () => {
  await chrome.storage.local.set({
    enabled: $("enabled").checked,
    type: $("type").value,
    host: $("host").value.trim(),
    port: $("port").value.trim()
  });
  $("status").textContent = "ذخیره شد";
  setTimeout(() => ($("status").textContent = ""), 2000);
};
