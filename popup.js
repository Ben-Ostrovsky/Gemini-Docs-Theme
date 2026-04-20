const stealthToggle = document.getElementById("stealthToggle");
const shortcutToggle = document.getElementById("shortcutToggle");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const shortcutLabel = document.getElementById("shortcutLabel");

const isMac = navigator.platform.toUpperCase().includes("MAC");
shortcutLabel.textContent = isMac ? "⌘ ⇧ G" : "Ctrl ⇧ G";

async function getActiveGeminiTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return null;
  if (!tab.url.includes("gemini.google.com")) return null;
  return tab;
}

async function init() {
  const { gsdActive = false, gsdShortcutEnabled = true } =
    await chrome.storage.local.get(["gsdActive", "gsdShortcutEnabled"]);

  stealthToggle.checked = !!gsdActive;
  shortcutToggle.checked = !!gsdShortcutEnabled;

  const tab = await getActiveGeminiTab();
  if (tab) {
    statusDot.classList.add(gsdActive ? "active" : "inactive");
    statusText.textContent = gsdActive
      ? "Stealth mode active"
      : "Stealth mode off";
    stealthToggle.disabled = false;
  } else {
    statusDot.classList.remove("active", "inactive");
    statusText.textContent = "Open gemini.google.com to use";
    stealthToggle.disabled = true;
  }
}

stealthToggle.addEventListener("change", async () => {
  const enabled = stealthToggle.checked;
  await chrome.storage.local.set({ gsdActive: enabled });

  const tab = await getActiveGeminiTab();
  if (tab) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: "gsd-set",
        value: enabled
      });
    } catch (e) {
      // Content script may not be loaded yet; reload the tab to apply.
      chrome.tabs.reload(tab.id);
    }
  }

  statusDot.classList.remove("active", "inactive");
  statusDot.classList.add(enabled ? "active" : "inactive");
  statusText.textContent = enabled ? "Stealth mode active" : "Stealth mode off";
});

shortcutToggle.addEventListener("change", async () => {
  const enabled = shortcutToggle.checked;
  await chrome.storage.local.set({ gsdShortcutEnabled: enabled });

  const tab = await getActiveGeminiTab();
  if (tab) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: "gsd-shortcut",
        value: enabled
      });
    } catch (e) {
      // Ignore — setting persists in storage and will be read on next load.
    }
  }
});

init();
