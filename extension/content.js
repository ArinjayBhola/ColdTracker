let iframe = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-ui") {
    toggleSidebar();
  }
});

// Extract details from LinkedIn profile
function extractLinkedInDetails() {
  try {
    const details = {
      name: '',
      headline: '',
      company: ''
    };

    // Extract Name
    const nameHeading = document.querySelector('.text-heading-xlarge') || 
                        document.querySelector('h1.text-heading-xlarge') ||
                        document.querySelector('h1');
    
    if (nameHeading) {
      details.name = nameHeading.innerText.split('\n')[0].replace(/\s+/g, ' ').trim();
    }

    // Extract Headline (Role/Bio)
    const headlineElement = document.querySelector('.text-body-medium.break-words') ||
                            document.querySelector('.pv-text-details__left-panel div:nth-child(2)');
    if (headlineElement) {
      details.headline = headlineElement.innerText.trim();
    }

    // Extract Company (Directly from header if possible)
    const companyLogo = document.querySelector('.pv-text-details__right-panel img[aria-label]');
    if (companyLogo && companyLogo.getAttribute('aria-label')) {
      details.company = companyLogo.getAttribute('aria-label').trim();
    }

    // 2. Fallback to text if logo aria-label failed
    if (!details.company) {
      let companyElement = document.querySelector('.pv-text-details__right-panel .inline-show-more-text');
      if (companyElement) {
        details.company = companyElement.innerText.split('\n')[0].trim();
      }
    }

    // 3. Fallback: Experience Section (Most reliable for historical data)
    if (!details.company) {
      try {
        const experienceSection = document.getElementById('experience');
        if (experienceSection) {
          // LinkedIn structure: h2#experience -> div -> ul -> li
          const container = experienceSection.closest('section');
          const firstItem = container?.querySelector('.pvs-list__paged-list-item');
          
          if (firstItem) {
            // Company name is usually in the first t-14 t-normal span below the role
            const companyElement = firstItem.querySelector('.t-14.t-normal span');
            if (companyElement) {
              const text = companyElement.innerText;
              // Clean up "Company · Full-time" or multi-line text
              details.company = text.split(' · ')[0].split('\n')[0].trim();
            }
          }
        }
      } catch (e) {
        console.error("Error scraping experience section:", e);
      }
    }

    // List of keywords that indicate a role rather than a company
    const roleKeywords = ['founder', 'president', 'engineer', 'manager', 'director', 'officer', 'lead', 'vp', 'ceo', 'cto', 'head of'];
    const isLikelyRole = (text) => {
      const lowerText = text.toLowerCase();
      return roleKeywords.some(keyword => lowerText.includes(keyword)) && 
             (lowerText.includes('&') || lowerText.includes(',') || text.split(' ').length > 4);
    };

    // Clean up if it looks like we captured a dump of text OR a role
    if (details.company && (details.company.includes('Present') || details.company.length > 60 || isLikelyRole(details.company))) {
       // If it contains dates, is too long, or looks like a role title, clear it
       details.company = '';
    }

    return details;
  } catch (error) {
    console.error("Error extracting LinkedIn details:", error);
  }
  return { name: '', headline: '' };
}

function sendDetailsToIframe() {
  if (iframe && iframe.contentWindow) {
    const scrapedDetails = extractLinkedInDetails();
    iframe.contentWindow.postMessage({ 
      action: "scraped-details", 
      details: scrapedDetails 
    }, "*");
  }
}

function toggleSidebar() {
  if (iframe) {
    if (iframe.style.display === "none") {
      iframe.style.display = "block";
      sendDetailsToIframe(); // Send details again when re-opened
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
      // Send the details once the iframe has loaded
      sendDetailsToIframe();
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
