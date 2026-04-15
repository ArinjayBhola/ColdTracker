let iframe = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-ui") {
    toggleSidebar();
  }
});

// Extract details from LinkedIn profile (DOM changes often — try several strategies)
function extractLinkedInDetails() {
  console.log("[ColdTrack] Extraction triggered...");
  try {
    const details = {
      name: "",
      headline: "",
      company: "",
    };

    const main = document.querySelector("main");
    if (main) {
      const h1 = main.querySelector("h1");
      if (h1) {
        details.name = h1.innerText.split("\n")[0].trim();
        console.log("[ColdTrack] Name (main h1):", details.name);
      }
    }

    if (!details.name) {
      const nameSelectors = [
        "h1.text-heading-xlarge",
        ".pv-text-details__left-panel h1",
        ".text-heading-xlarge",
        "h1",
      ];
      for (const sel of nameSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) {
          details.name = el.innerText.split("\n")[0].trim();
          console.log("[ColdTrack] Name found:", details.name, sel);
          break;
        }
      }
    }

    const headlineSelectors = [
      ".pv-text-details__left-panel .text-body-medium",
      "div.text-body-medium.break-words",
      ".text-body-medium.break-words",
      "[data-generated-suggestion-target]",
      "div.mt2.relative span[aria-hidden='true']",
    ];
    for (const sel of headlineSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 2) {
        details.headline = el.innerText.trim();
        console.log("[ColdTrack] Headline found:", details.headline, sel);
        break;
      }
    }

    const companyFromTop = () => {
      const btn = document.querySelector('button[data-field="experience_company_logo"]');
      if (btn) {
        const t = btn.innerText.split("\n")[0].trim();
        if (t) return t;
      }
      const labeled = document.querySelector(
        '[aria-label*="Current company"], [aria-label*="current company"]'
      );
      if (labeled) {
        const t = (labeled.innerText || labeled.getAttribute("aria-label") || "")
          .replace(/^Current company:\s*/i, "")
          .trim();
        if (t) return t.split("\n")[0].trim();
      }
      const right = document.querySelector(
        ".pv-text-details__right-panel .inline-show-more-text, .pv-text-details__right-panel-item-text"
      );
      if (right) {
        const t = right.innerText.split("\n")[0].trim();
        if (t) return t;
      }
      return "";
    };

    details.company = companyFromTop();
    if (details.company) {
      console.log("[ColdTrack] Company found (header):", details.company);
    }

    if (!details.company) {
      const listSelectors = [
        ".pvs-list__paged-list-item",
        "li.artdeco-list__item",
        "li.pvs-list__paged-list-item",
      ];
      let expItems = [];
      for (const sel of listSelectors) {
        expItems = document.querySelectorAll(sel);
        if (expItems.length) break;
      }
      for (const item of expItems) {
        const lower = item.innerText.toLowerCase();
        if (!lower.includes("present")) continue;
        const spans = item.querySelectorAll('span[aria-hidden="true"]');
        for (let i = 0; i < spans.length; i++) {
          const text = spans[i].innerText.trim();
          if (
            i > 0 &&
            text.length > 2 &&
            !/present|full-time|part-time|contract|remote/i.test(text)
          ) {
            details.company = text.split(" · ")[0].split("\n")[0].trim();
            console.log("[ColdTrack] Company found (experience):", details.company);
            break;
          }
        }
        if (details.company) break;
      }
    }

    return details;
  } catch (error) {
    console.error("[ColdTrack] Extraction Error:", error);
    return { name: "", headline: "", company: "" };
  }
}

function sendDetailsToIframe(retries = 3) {
  if (iframe && iframe.contentWindow) {
    const scrapedDetails = extractLinkedInDetails();
    
    // If we found at least a name, it's a success
    if (scrapedDetails.name || retries <= 0) {
        console.log("[ColdTrack] Sending details to iframe...", scrapedDetails);
        iframe.contentWindow.postMessage({ 
          action: "scraped-details", 
          details: scrapedDetails 
        }, "*");
    } else {
        console.log(`[ColdTrack] Extraction returned empty, retrying in 1.5s... (${retries} retries left)`);
        setTimeout(() => sendDetailsToIframe(retries - 1), 1500);
    }
  }
}

function toggleSidebar() {
  if (iframe) {
    if (iframe.style.display === "none") {
      iframe.style.display = "block";
      sendDetailsToIframe(); 
    } else {
      iframe.style.display = "none";
    }
  } else {
    iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('popup.html');
    iframe.id = 'coldtrack-sidebar';
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
      background: white;
    `;
    
    iframe.onload = () => {
      console.log("[ColdTrack] Iframe loaded, triggering initial extraction...");
      setTimeout(() => sendDetailsToIframe(), 1000);
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
  } else if (event.data.action === "request-details") {
    sendDetailsToIframe();
  }
});
