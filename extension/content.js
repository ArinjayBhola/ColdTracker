let iframe = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-ui") {
    toggleSidebar();
  }
});

// Extract details from LinkedIn profile
function extractLinkedInDetails() {
  console.log("[ColdTrack] Extraction triggered...");
  try {
    const details = {
      name: '',
      headline: '',
      company: ''
    };

    // 1. Extract Name (Multi-selector fallback)
    const nameSelector = [
        '.text-heading-xlarge',
        'h1.text-heading-xlarge',
        'main h1',
        '.pv-text-details__left-panel h1',
        'h1'
    ].find(s => document.querySelector(s));
    
    if (nameSelector) {
      const el = document.querySelector(nameSelector);
      details.name = el.innerText.split('\n')[0].trim();
      console.log("[ColdTrack] Name found:", details.name);
    }

    // 2. Extract Headline (Multi-selector fallback)
    const headlineSelector = [
        '.text-body-medium.break-words',
        '[data-generated-suggestion-target]',
        '.pv-text-details__left-panel div:nth-child(2)',
        '.pv-text-details__left-panel .text-body-medium'
    ].find(s => document.querySelector(s));
    
    if (headlineSelector) {
        const el = document.querySelector(headlineSelector);
        details.headline = el.innerText.trim();
        console.log("[ColdTrack] Headline found:", details.headline);
    }

    // 3. Extract Company (Multi-selector fallback)
    const companySelector = [
        'button[data-field="experience_company_logo"]',
        '.pv-text-details__right-panel .inline-show-more-text',
        '.pv-text-details__right-panel-item-text',
        '[aria-label^="Current company:"]'
    ].find(s => document.querySelector(s));
    
    if (companySelector) {
      const el = document.querySelector(companySelector);
      details.company = el.innerText.split('\n')[0].trim();
      console.log("[ColdTrack] Company found (Header):", details.company);
    }

    // 4. Deep Scrape fallback for company (Experience section)
    if (!details.company) {
        const expItems = document.querySelectorAll('.pvs-list__paged-list-item');
        for (const item of expItems) {
            if (item.innerText.toLowerCase().includes('present')) {
                 const spans = item.querySelectorAll('span[aria-hidden="true"]');
                 // In the list, the first bold text is usually the role, the second is company
                 for (let i = 0; i < spans.length; i++) {
                     const text = spans[i].innerText.trim();
                     if (i > 0 && text.length > 2 && !text.includes('Present') && !text.includes('Full-time')) {
                         details.company = text.split(' · ')[0].split('\n')[0].trim();
                         console.log("[ColdTrack] Company found (Experience):", details.company);
                         break;
                     }
                 }
            }
            if (details.company) break;
        }
    }

    return details;
  } catch (error) {
    console.error("[ColdTrack] Extraction Error:", error);
    return { name: '', headline: '', company: '' };
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
