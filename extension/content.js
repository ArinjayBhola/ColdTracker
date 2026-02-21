let iframe = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-ui") {
    toggleSidebar();
  }
});

function toggleSidebar() {
  if (iframe) {
    if (iframe.style.display === "none") {
      iframe.style.display = "block";
    } else {
      iframe.style.display = "none";
    }
  } else {
    iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('popup.html');
    iframe.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      height: 600px;
      border: none;
      z-index: 2147483647;
      box-shadow: 0 12px 48px rgba(0,0,0,0.15);
      border-radius: 20px;
      display: block;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(iframe);
  }
}

// Listen for messages from within the iframe
window.addEventListener('message', (event) => {
  if (event.data.action === "close-sidebar") {
    if (iframe) {
      iframe.style.display = "none";
    }
  }
});
