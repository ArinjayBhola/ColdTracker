document.addEventListener('DOMContentLoaded', async () => {
    const profileUrlInput = document.getElementById('profileUrl');
    const personNameInput = document.getElementById('personName');
    const positionInput = document.getElementById('position');
    const companyNameInput = document.getElementById('companyName');
    const companyUrlInput = document.getElementById('companyUrl');
    const saveBtn = document.getElementById('saveBtn');
    const closeBtn = document.getElementById('closeBtn');
    const statusDiv = document.getElementById('status');

    closeBtn.addEventListener('click', () => {
        window.parent.postMessage({ action: "close-sidebar" }, "*");
    });
    
    // Listen for name scraped by content script
    window.addEventListener('message', (event) => {
        if (event.data.action === "scraped-name" && event.data.name) {
            personNameInput.value = event.data.name;
        }
    });

    // Request the name just to be sure
    window.parent.postMessage({ action: "request-name" }, "*");
    
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
            const enviornment = process.env.NODE_ENV;
            const url = enviornment === 'development' ? 'http://localhost:3000' : 'https://cold-tracker-mu.vercel.app';
            
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
            companyName: companyNameInput.value,
            companyUrl: companyUrlInput.value
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
