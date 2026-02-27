document.addEventListener('DOMContentLoaded', async () => {
    const profileUrlInput = document.getElementById('profileUrl');
    const personNameInput = document.getElementById('personName');
    const positionInput = document.getElementById('position');
    const personRoleInput = document.getElementById('personRole');
    const companyNameInput = document.getElementById('companyName');
    const companyUrlInput = document.getElementById('companyUrl');
    const emailAddressInput = document.getElementById('emailAddress');
    const contactMethodInput = document.getElementById('contactMethod');
    const saveBtn = document.getElementById('saveBtn');
    const closeBtn = document.getElementById('closeBtn');
    const statusDiv = document.getElementById('status');

    closeBtn.addEventListener('click', () => {
        window.parent.postMessage({ action: "close-sidebar" }, "*");
    });
    
    // Listen for details scraped by content script
    window.addEventListener('message', (event) => {
        if (event.data.action === "scraped-details" && event.data.details) {
            const { name, headline, company } = event.data.details;
            
            if (name) personNameInput.value = name;
            if (company && !companyNameInput.value) companyNameInput.value = company;
            
            if (headline) {
                personRoleInput.value = headline;
                
                // Try to parse company if not already found
                if (!companyNameInput.value || companyNameInput.value === 'e.g. Google') {
                    // Try to parse company if " at ", " with ", " @ ", " | ", or " - " exists
                    const separators = [' at ', ' with ', ' @ ', ' | ', ' - '];
                    const roleKeywords = ['founder', 'president', 'engineer', 'manager', 'director', 'officer', 'lead', 'vp', 'ceo', 'cto'];
                    
                    for (const sep of separators) {
                        if (headline.toLowerCase().includes(sep)) {
                            const parts = headline.split(new RegExp(sep, 'i'));
                            // Usually the part after the separator is the company
                            const possibleCompany = parts[parts.length - 1].split('|')[0].split(',')[0].trim();
                            
                            // Check if the extracted "company" is actually just another part of the role
                            const isLikelyRole = roleKeywords.some(keyword => possibleCompany.toLowerCase().includes(keyword));
                            
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

    // Request the details just to be sure, with a small delay to ensure listener is ready
    setTimeout(() => {
        window.parent.postMessage({ action: "request-details" }, "*");
    }, 100);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab?.url) {
        profileUrlInput.value = tab.url;
        
        if (tab.url.includes('linkedin.com/in/')) {
            saveBtn.disabled = false;
        } else {
            statusDiv.textContent = 'Please navigate to a LinkedIn profile';
            statusDiv.className = 'error';
            saveBtn.disabled = true;
        }
    }

    async function getSessionToken() {
        try {
            const names = [
                'authjs.session-token',
                'next-auth.session-token',
                '__Secure-authjs.session-token',
                '__Secure-next-auth.session-token'
            ];
            const isDev = false;
            const url = isDev ? 'http://localhost:3000' : 'https://cold-tracker-mu.vercel.app';
            
            for (const name of names) {
                const cookie = await chrome.cookies.get({
                    url: url,
                    name: name
                });
                if (cookie && cookie.value) {
                    console.log('Found session token:', name);
                    return cookie.value;
                }
            }
            
            const allCookies = await chrome.cookies.getAll({ domain: url });
            console.log('All localhost cookies:', allCookies.map(c => c.name));
            const sessionCookie = allCookies.find(c => c.name.includes('session-token'));
            return sessionCookie ? sessionCookie.value : null;

        } catch (error) {
            console.error('Error fetching cookies:', error);
            return null;
        }
    }

    saveBtn.addEventListener('click', async () => {
        const data = {
            profileUrl: profileUrlInput.value,
            personName: personNameInput.value,
            position: positionInput.value,
            personRole: personRoleInput.value,
            companyName: companyNameInput.value,
            companyUrl: companyUrlInput.value,
            emailAddress: emailAddressInput.value,
            contactMethod: contactMethodInput.value
        };

        statusDiv.textContent = 'Saving...';
        statusDiv.className = 'loading';
        saveBtn.disabled = true;

        const token = await getSessionToken();
        
        if (!token) {
            statusDiv.textContent = 'Error: Not logged in. Please log in at https://cold-tracker-mu.vercel.app and try again.';
            statusDiv.className = 'error';
            saveBtn.disabled = false;
            return;
        }

        try {
            const response = await fetch('https://cold-tracker-mu.vercel.app/api/extension', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                statusDiv.textContent = 'Saved successfully!';
                statusDiv.className = 'success';
                setTimeout(() => {
                    window.parent.postMessage({ action: "close-sidebar" }, "*");
                }, 1500);
            } else {
                const errorText = await response.text();
                statusDiv.textContent = `Error: ${response.status} ${errorText || response.statusText}`;
                statusDiv.className = 'error';
                saveBtn.disabled = false;
            }
        } catch (error) {
            console.error('Save error details:', error);
            statusDiv.textContent = `Connection Error: ${error.message}. Is ColdTrack running at cold-tracker-mu.vercel.app?`;
            statusDiv.className = 'error';
            saveBtn.disabled = false;
        }
    });
});
