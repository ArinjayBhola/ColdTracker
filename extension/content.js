let iframe = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-ui") {
    toggleSidebar();
  }
});

// Extract name from LinkedIn profile
function extractLinkedInName() {
  try {
    // LinkedIn often uses these classes for the main profile name
    const heading = document.querySelector('.text-heading-xlarge') || 
                    document.querySelector('h1');
    if (heading) {
      return heading.innerText.trim();
    }
  } catch (error) {
    console.error("Error extracting name:", error);
  }
  return '';
}

function sendNameToIframe() {
  if (iframe && iframe.contentWindow) {
    const scrapedName = extractLinkedInName();
    iframe.contentWindow.postMessage({ 
      action: "scraped-name", 
      name: scrapedName 
    }, chrome.runtime.getURL('/'));
  }
}

function toggleSidebar() {
  if (iframe) {
    if (iframe.style.display === "none") {
      iframe.style.display = "block";
      sendNameToIframe(); // Send name again when re-opened
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
    
    iframe.onload = () => {
      // Send the name once the iframe has loaded
      sendNameToIframe();
    };
    
    document.body.appendChild(iframe);
  }
}

// Listen for messages from within the iframe
window.addEventListener('message', (event) => {
  if (event.data.action === "close-sidebar") {
    if (iframe) {
      iframe.style.display = "none";
    }
  } else if (event.data.action === "request-name") {
    sendNameToIframe();
  }
});
