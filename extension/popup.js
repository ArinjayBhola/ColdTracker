document.addEventListener('DOMContentLoaded', async () => {
    const profileUrlInput = document.getElementById('profileUrl');
    const positionInput = document.getElementById('position');
    const companyNameInput = document.getElementById('companyName');
    const companyUrlInput = document.getElementById('companyUrl');
    const saveBtn = document.getElementById('saveBtn');
    const closeBtn = document.getElementById('closeBtn');
    const statusDiv = document.getElementById('status');

    // Handle close button
    closeBtn.addEventListener('click', () => {
        window.parent.postMessage({ action: "close-sidebar" }, "*");
    });
    
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

    // Function to get session token
    async function getSessionToken() {
        try {
            // Check all possible NextAuth/Auth.js cookie names
            const names = [
                'authjs.session-token',
                'next-auth.session-token',
                '__Secure-authjs.session-token',
                '__Secure-next-auth.session-token'
            ];
            
            const url = 'http://localhost:3000';
            
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
            
            // Fallback: try to get all cookies for the domain to see what's there
            const allCookies = await chrome.cookies.getAll({ domain: 'localhost' });
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
            position: positionInput.value,
            companyName: companyNameInput.value,
            companyUrl: companyUrlInput.value
        };

        statusDiv.textContent = 'Saving...';
        statusDiv.className = 'loading';
        saveBtn.disabled = true;

        const token = await getSessionToken();
        
        if (!token) {
            statusDiv.textContent = 'Error: Not logged in. Please log in at http://localhost:3000 and try again.';
            statusDiv.className = 'error';
            saveBtn.disabled = false;
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/extension', {
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
            statusDiv.textContent = `Connection Error: ${error.message}. Is ColdTrack running at localhost:3000?`;
            statusDiv.className = 'error';
            saveBtn.disabled = false;
        }
    });
});
