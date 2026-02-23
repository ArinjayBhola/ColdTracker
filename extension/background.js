chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes('linkedin.com/')) {
    try {
      // Try sending message to existing content script
      await chrome.tabs.sendMessage(tab.id, { action: "toggle-ui" });
    } catch (err) {
      if (err.message.includes("Could not establish connection")) {
        // Content script not loaded or stale, inject it
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });
          // Wait a bit for script to initialize and try again
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, { action: "toggle-ui" });
            } catch (retryErr) {
              console.error("Retry failed:", retryErr);
            }
          }, 100);
        } catch (scriptErr) {
          console.error("Script injection failed:", scriptErr);
        }
      } else {
        console.error("Message error:", err);
      }
    }
  }
});
