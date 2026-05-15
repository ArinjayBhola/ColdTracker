/**
 * Session cookies may be split into chunks (__Secure-authjs.session-token.0, .1, …).
 * We must join them in order — a single cookie.get() returns nothing or a fragment.
 */
const DEFAULT_ORIGIN = "https://cold-track.arinjay.dev";

const SESSION_PREFIXES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

function joinSessionTokenFromCookies(cookies) {
  for (const prefix of SESSION_PREFIXES) {
    const parts = cookies.filter(
      (c) => c.name === prefix || c.name.startsWith(prefix + ".")
    );
    if (parts.length === 0) continue;
    parts.sort((a, b) => {
      const ia = a.name === prefix ? 0 : parseInt(a.name.slice(prefix.length + 1), 10) || 0;
      const ib = b.name === prefix ? 0 : parseInt(b.name.slice(prefix.length + 1), 10) || 0;
      return ia - ib;
    });
    const token = parts.map((p) => p.value).join("");
    if (token.length > 0) return token;
  }
  return null;
}

async function getColdtrackOrigin() {
  try {
    const stored = await chrome.storage.local.get("coldtrackOrigin");
    if (typeof stored.coldtrackOrigin === "string" && stored.coldtrackOrigin.startsWith("http")) {
      return stored.coldtrackOrigin.replace(/\/$/, "");
    }
  } catch (_) {
    /* ignore */
  }
  return DEFAULT_ORIGIN;
}

async function getSessionToken(originUrl) {
  try {
    const all = await chrome.cookies.getAll({ url: originUrl });
    const token = joinSessionTokenFromCookies(all);
    if (token) return token;
    console.warn("[ColdTrack] No session cookie found for", originUrl, "names:", all.map((c) => c.name));
    return null;
  } catch (error) {
    console.error("[ColdTrack] Error reading cookies:", error);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const coldtrackOrigin = await getColdtrackOrigin();
  const apiExtensionUrl = `${coldtrackOrigin}/api/extension`;

  const profileUrlInput = document.getElementById("profileUrl");
  const personNameInput = document.getElementById("personName");
  const positionInput = document.getElementById("position");
  const personRoleInput = document.getElementById("personRole");
  const companyNameInput = document.getElementById("companyName");
  const companyUrlInput = document.getElementById("companyUrl");
  const emailAddressInput = document.getElementById("emailAddress");
  const contactMethodInput = document.getElementById("contactMethod");
  const saveBtn = document.getElementById("saveBtn");
  const closeBtn = document.getElementById("closeBtn");
  const statusDiv = document.getElementById("status");

  closeBtn.addEventListener("click", () => {
    window.parent.postMessage({ action: "close-sidebar" }, "*");
  });

  window.addEventListener("message", (event) => {
    if (event.data.action === "scraped-details" && event.data.details) {
      const { name, headline, company } = event.data.details;

      if (name) personNameInput.value = name;
      if (company && !companyNameInput.value) companyNameInput.value = company;

      if (headline) {
        personRoleInput.value = headline;

        if (!companyNameInput.value || companyNameInput.value === "e.g. Google") {
          const separators = [" at ", " with ", " @ ", " | ", " - "];
          const roleKeywords = [
            "founder",
            "president",
            "engineer",
            "manager",
            "director",
            "officer",
            "lead",
            "vp",
            "ceo",
            "cto",
          ];

          for (const sep of separators) {
            if (headline.toLowerCase().includes(sep)) {
              const parts = headline.split(new RegExp(sep, "i"));
              const possibleCompany = parts[parts.length - 1].split("|")[0].split(",")[0].trim();
              const isLikelyRole = roleKeywords.some((keyword) =>
                possibleCompany.toLowerCase().includes(keyword)
              );

              if (possibleCompany && possibleCompany.length > 2 && !isLikelyRole) {
                companyNameInput.value = possibleCompany;
                break;
              }
            }
          }
        }
      }
    }
  });

  setTimeout(() => {
    window.parent.postMessage({ action: "request-details" }, "*");
  }, 100);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab?.url) {
    profileUrlInput.value = tab.url;

    if (tab.url.includes("linkedin.com/in/")) {
      saveBtn.disabled = false;
    } else {
      statusDiv.textContent = "Please navigate to a LinkedIn profile";
      statusDiv.className = "error";
      saveBtn.disabled = true;
    }
  }

  saveBtn.addEventListener("click", async () => {
    const data = {
      profileUrl: profileUrlInput.value,
      personName: personNameInput.value,
      position: positionInput.value,
      personRole: personRoleInput.value,
      companyName: companyNameInput.value,
      companyUrl: companyUrlInput.value,
      emailAddress: emailAddressInput.value,
      contactMethod: contactMethodInput.value,
    };

    statusDiv.textContent = "Saving...";
    statusDiv.className = "loading";
    saveBtn.disabled = true;

    const token = await getSessionToken(coldtrackOrigin);

    if (!token) {
      statusDiv.textContent =
        "Error: Not logged in. Open " +
        coldtrackOrigin +
        " in this browser, sign in, then try again.";
      statusDiv.className = "error";
      saveBtn.disabled = false;
      return;
    }

    try {
      const response = await fetch(apiExtensionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        statusDiv.textContent = "Saved successfully!";
        statusDiv.className = "success";
        setTimeout(() => {
          window.parent.postMessage({ action: "close-sidebar" }, "*");
        }, 1500);
      } else {
        let displayError = "Save failed";
        try {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            displayError = errorJson.error || errorText;
          } catch {
            displayError = errorText || displayError;
          }
        } catch {
          displayError = response.statusText || "Unknown Server Error";
        }

        statusDiv.textContent = `Error: ${displayError}`;
        statusDiv.className = "error";
        saveBtn.disabled = false;
        console.error("[EXTENSION_POPUP] API Error:", response.status, displayError);
      }
    } catch (error) {
      console.error("[EXTENSION_POPUP] Connection error:", error);
      statusDiv.textContent = `Connection Error: ${error.message}. Check your internet or sign in at ${coldtrackOrigin}`;
      statusDiv.className = "error";
      saveBtn.disabled = false;
    }
  });
});
