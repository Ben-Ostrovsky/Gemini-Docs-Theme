chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes("gemini.google.com")) {
    chrome.tabs.sendMessage(tab.id, { action: "gsd-toggle" });
  }
});
