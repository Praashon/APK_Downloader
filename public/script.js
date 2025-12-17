document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('playStoreUrl');
    const downloadBtn = document.getElementById('downloadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const errorText = document.getElementById('errorText');
    const exampleBtns = document.querySelectorAll('.example-btn');

    // App info elements
    const appIcon = document.getElementById('appIcon');
    const appName = document.getElementById('appName');
    const packageId = document.getElementById('packageId');
    const source = document.getElementById('source');
    const downloadLink = document.getElementById('downloadLink');
    const playStoreLink = document.getElementById('playStoreLink');
    const downloadNote = document.getElementById('downloadNote');
    const modSection = document.getElementById('modSection');
    const modAppName = document.getElementById('modAppName');
    const modSites = document.getElementById('modSites');

    let currentAppInfo = null;

    // Clear button functionality
    clearBtn.addEventListener('click', () => {
        urlInput.value = '';
        urlInput.focus();
        hideAll();
    });

    // Example buttons
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            urlInput.value = btn.dataset.url;
            urlInput.focus();
        });
    });

    // Enter key to submit
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            downloadBtn.click();
        }
    });

    // Main download button
    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();

        if (!url) {
            showError('Please enter an app name or Play Store URL');
            return;
        }

        await processDownload(url);
    });

    // Download APK button click
    downloadLink.addEventListener('click', (e) => {
        if (!currentAppInfo || !currentAppInfo.downloadUrl) return;
        
        e.preventDefault();
        startDirectDownload(currentAppInfo);
    });

    function hideAll() {
        statusDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        modSection.classList.add('hidden');
    }

    function showStatus(message) {
        hideAll();
        statusText.textContent = message;
        statusDiv.classList.remove('hidden');
    }

    function showError(message) {
        hideAll();
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    function showResult(data) {
        hideAll();
        currentAppInfo = data;

        // Set app info
        appName.textContent = data.name || data.packageId;
        packageId.textContent = data.packageId;
        
        let sourceText = `Source: ${data.source}`;
        if (data.version) {
            sourceText += ` • v${data.version}`;
        }
        source.textContent = sourceText;

        // Set icon with fallback
        if (data.icon) {
            appIcon.src = data.icon;
            appIcon.onerror = () => {
                appIcon.src = getDefaultIcon();
            };
        } else {
            appIcon.src = getDefaultIcon();
        }

        // Update download button
        downloadLink.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span>Download APK</span>
        `;

        // Set Play Store link (use playStoreUrl from response or build from packageId)
        playStoreLink.href = data.playStoreUrl || `https://play.google.com/store/apps/details?id=${data.packageId}`;

        // Hide note for direct downloads
        downloadNote.classList.add('hidden');

        // Show mod APK search links
        if (data.modInfo && data.modInfo.sites) {
            modAppName.textContent = data.modInfo.appName;
            modSites.innerHTML = data.modInfo.sites.map(site => `
                <a href="${site.url}" target="_blank" class="mod-site-card ${site.found ? 'found' : ''}" title="${site.title}">
                    <span class="mod-site-icon">${site.icon}</span>
                    <div class="mod-site-info">
                        <span class="mod-site-name">${site.name}</span>
                        <span class="mod-site-title">${site.title}</span>
                    </div>
                    ${site.found ? '<span class="mod-found-badge">✓ Found</span>' : ''}
                    <svg class="mod-site-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                </a>
            `).join('');
            modSection.classList.remove('hidden');
        } else {
            modSection.classList.add('hidden');
        }

        resultDiv.classList.remove('hidden');
    }

    function getDefaultIcon() {
        return 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#555">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
        `);
    }

    async function processDownload(url) {
        downloadBtn.disabled = true;
        showStatus('Searching...');

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to process request');
            }

            if (!data.downloadUrl) {
                throw new Error('Could not find APK download link');
            }

            showResult(data);
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred while processing your request');
        } finally {
            downloadBtn.disabled = false;
        }
    }

    function startDirectDownload(appInfo) {
        const { downloadUrl, name, packageId: pkgId } = appInfo;
        
        // Show downloading state
        downloadLink.innerHTML = `
            <div class="spinner-small"></div>
            <span>Starting download...</span>
        `;
        downloadLink.style.pointerEvents = 'none';

        // Build proxy URL
        const proxyUrl = `/api/download-apk?url=${encodeURIComponent(downloadUrl)}&name=${encodeURIComponent(name || '')}&packageId=${encodeURIComponent(pkgId || '')}`;
        
        // Create download link
        const a = document.createElement('a');
        a.href = proxyUrl;
        a.download = `${(name || pkgId || 'app').replace(/[^a-zA-Z0-9.-]/g, '_')}.apk`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Reset button
        setTimeout(() => {
            downloadLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                <span>Download APK</span>
            `;
            downloadLink.style.pointerEvents = 'auto';
        }, 3000);
    }
});
