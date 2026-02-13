/* --------------------------------------------------------
   APK Grab -- Frontend Logic
   GSAP entrance animations, Three.js background,
   theme toggle, search flow with animated transitions
   -------------------------------------------------------- */

function init() {

    // ===================== DOM REFS =====================

    const urlInput       = document.getElementById('playStoreUrl');
    const downloadBtn    = document.getElementById('downloadBtn');
    const clearBtn       = document.getElementById('clearBtn');
    const statusDiv      = document.getElementById('status');
    const statusText     = document.getElementById('statusText');
    const resultDiv      = document.getElementById('result');
    const errorDiv       = document.getElementById('error');
    const errorText      = document.getElementById('errorText');
    const exampleBtns    = document.querySelectorAll('.example-btn');

    const appIcon        = document.getElementById('appIcon');
    const appName        = document.getElementById('appName');
    const packageId      = document.getElementById('packageId');
    const source         = document.getElementById('source');
    const downloadLink   = document.getElementById('downloadLink');
    const playStoreLink  = document.getElementById('playStoreLink');
    const downloadNote   = document.getElementById('downloadNote');
    const modSection     = document.getElementById('modSection');
    const modAppName     = document.getElementById('modAppName');
    const modSites       = document.getElementById('modSites');
    const themeToggle    = document.getElementById('themeToggle');

    let currentAppInfo = null;

    // ===================== THEME SYSTEM =====================

    function getStoredTheme() {
        return localStorage.getItem('apkgrab-theme') || 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('apkgrab-theme', theme);
        updateParticleColors(theme);
    }

    // ===================== THREE.JS VARIABLES (declared early to avoid TDZ) =====================

    let scene, camera, renderer, particles, particleMaterial;

    applyTheme(getStoredTheme());

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';

        if (typeof gsap !== 'undefined') {
            gsap.to(themeToggle, {
                rotation: '+=360',
                duration: 0.5,
                ease: 'power2.inOut'
            });
        }

        applyTheme(next);
    });

    // ===================== THREE.JS 3D BACKGROUND =====================

    function initThreeBackground() {
        try {
            if (typeof THREE === 'undefined') return;

            const canvas = document.getElementById('bgCanvas');
            if (!canvas) return;

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
            camera.position.z = 300;

            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const count = 600;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            const velocities = new Float32Array(count * 3);

            for (let i = 0; i < count * 3; i += 3) {
                positions[i]     = (Math.random() - 0.5) * 800;
                positions[i + 1] = (Math.random() - 0.5) * 800;
                positions[i + 2] = (Math.random() - 0.5) * 400;

                velocities[i]     = (Math.random() - 0.5) * 0.15;
                velocities[i + 1] = (Math.random() - 0.5) * 0.15;
                velocities[i + 2] = (Math.random() - 0.5) * 0.05;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.userData.velocities = velocities;

            particleMaterial = new THREE.PointsMaterial({
                size: 2.5,
                color: getStoredTheme() === 'dark' ? 0xFF6347 : 0xFF6347,
                transparent: true,
                opacity: 0.45,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            particles = new THREE.Points(geometry, particleMaterial);
            scene.add(particles);

            animateScene();

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
        } catch (err) {
            console.warn('Three.js background failed to initialize:', err);
        }
    }

    function animateScene() {
        requestAnimationFrame(animateScene);

        if (!particles || !renderer) return;

        particles.rotation.y += 0.0004;
        particles.rotation.x += 0.0002;

        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.userData.velocities;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i]     += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];

            if (Math.abs(positions[i]) > 400) velocities[i] *= -1;
            if (Math.abs(positions[i + 1]) > 400) velocities[i + 1] *= -1;
            if (Math.abs(positions[i + 2]) > 200) velocities[i + 2] *= -1;
        }

        particles.geometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
    }

    function updateParticleColors(theme) {
        if (!particleMaterial) return;
        // Always usage Tomato color for consistency, or tweak if needed
        const targetColor = 0xFF6347; 
        particleMaterial.color.setHex(targetColor);
    }

    initThreeBackground();

    // ===================== GSAP ENTRANCE ANIMATIONS =====================

    function runEntranceAnimations() {
        if (typeof gsap === 'undefined') return;

        const animTargets = [
            '[data-animate="title"]',
            '[data-animate="subtitle"]',
            '[data-animate="search"]',
            '[data-animate="picks"]'
        ];

        // Set initial hidden state via GSAP, then animate in
        gsap.set(animTargets, { opacity: 0, y: 30 });

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.to('[data-animate="title"]',
            { y: 0, opacity: 1, duration: 0.9 }
        )
        .to('[data-animate="subtitle"]',
            { y: 0, opacity: 1, duration: 0.7 },
            '-=0.5'
        )
        .to('[data-animate="search"]',
            { y: 0, opacity: 1, duration: 0.7 },
            '-=0.4'
        )
        .to('[data-animate="picks"]',
            { y: 0, opacity: 1, duration: 0.5 },
            '-=0.3'
        );
    }

    runEntranceAnimations();

    // ===================== SEARCH FLOW =====================

    clearBtn.addEventListener('click', () => {
        urlInput.value = '';
        urlInput.focus();
        hideAll();
    });

    exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            urlInput.value = btn.dataset.url;
            urlInput.focus();

            if (typeof gsap !== 'undefined') {
                gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
            }
        });
    });

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') downloadBtn.click();
    });

    downloadBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showError('Please enter an app name or Play Store URL');
            return;
        }
        await processDownload(url);
    });

    downloadLink.addEventListener('click', (e) => {
        if (!currentAppInfo || !currentAppInfo.downloadUrl) return;
        e.preventDefault();
        startDirectDownload(currentAppInfo);
    });

    // ===================== UI HELPERS =====================

    function hideAll() {
        [statusDiv, resultDiv, errorDiv, modSection].forEach(el => {
            el.classList.add('hidden');
        });
    }

    function showStatus(message) {
        hideAll();
        statusText.textContent = message;
        statusDiv.classList.remove('hidden');

        if (typeof gsap !== 'undefined') {
            gsap.fromTo(statusDiv,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
            );
        }
    }

    function showError(message) {
        hideAll();
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');

        if (typeof gsap !== 'undefined') {
            gsap.fromTo(errorDiv,
                { opacity: 0, y: 20, scale: 0.96 },
                { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2)' }
            );
        }
    }

    function showResult(data) {
        hideAll();
        currentAppInfo = data;

        appName.textContent = data.name || data.packageId;
        packageId.textContent = data.packageId;

        if (data.source) {
            let sourceText = 'Source: ' + data.source;
            if (data.version) {
                sourceText += ' / v' + data.version;
            }
            source.textContent = sourceText;
            source.classList.remove('hidden');
        } else {
            source.textContent = '';
            source.classList.add('hidden');
        }

        if (data.icon) {
            appIcon.src = data.icon;
            appIcon.onerror = () => { appIcon.src = getDefaultIcon(); };
        } else {
            appIcon.src = getDefaultIcon();
        }

        if (data.downloadUrl) {
            downloadLink.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
                '<polyline points="7 10 12 15 17 10"/>' +
                '<line x1="12" y1="15" x2="12" y2="3"/>' +
                '</svg>' +
                '<span>Download APK</span>';
            downloadLink.classList.remove('hidden');
            downloadNote.classList.add('hidden');
        } else {
            downloadLink.classList.add('hidden');
            downloadNote.textContent = 'Direct APK not available -- try the Play Store link or browse the mod sites below.';
            downloadNote.classList.remove('hidden');
        }

        playStoreLink.href = data.playStoreUrl || ('https://play.google.com/store/apps/details?id=' + data.packageId);

        if (data.modInfo && data.modInfo.sites) {
            modAppName.textContent = data.modInfo.appName;
            modSites.innerHTML = data.modInfo.sites.map(site =>
                '<a href="' + site.url + '" target="_blank" class="mod-site-card ' + (site.found ? 'found' : '') + '" title="' + site.title + '">' +
                    '<span class="mod-site-icon"><i class="' + site.icon + '"></i></span>' +
                    '<div class="mod-site-info">' +
                        '<span class="mod-site-name">' + site.name + '</span>' +
                        '<span class="mod-site-title">' + site.title + '</span>' +
                    '</div>' +
                    (site.found ? '<span class="mod-found-badge">Found</span>' : '') +
                    '<svg class="mod-site-arrow" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">' +
                        '<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>' +
                    '</svg>' +
                '</a>'
            ).join('');
            modSection.classList.remove('hidden');
        } else {
            modSection.classList.add('hidden');
        }

        resultDiv.classList.remove('hidden');

        // Animated reveal
        if (typeof gsap !== 'undefined') {
            const resultCard = resultDiv.querySelector('.result-card');
            gsap.fromTo(resultCard,
                { opacity: 0, y: 30, scale: 0.96 },
                { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
            );

            gsap.fromTo(resultDiv.querySelectorAll('.btn'),
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, delay: 0.3, ease: 'power2.out' }
            );

            if (!modSection.classList.contains('hidden')) {
                gsap.fromTo(modSection,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, delay: 0.5, ease: 'power2.out' }
                );
                gsap.fromTo(modSection.querySelectorAll('.mod-site-card'),
                    { opacity: 0, x: -15 },
                    { opacity: 1, x: 0, duration: 0.35, stagger: 0.06, delay: 0.6, ease: 'power2.out' }
                );
            }
        }
    }

    function getDefaultIcon() {
        return 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6c5ce7">' +
            '<path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>' +
            '</svg>'
        );
    }

    async function processDownload(url) {
        downloadBtn.disabled = true;
        showStatus('Searching across sources...');

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                // The server returned an error, but it may still include appInfo + modInfo
                if (data.appInfo) {
                    // Build a partial result so the user still sees the app card and mod links
                    const partial = {
                        ...data.appInfo,
                        downloadUrl: null,
                        source: null,
                        modInfo: data.modInfo || null
                    };
                    showResult(partial);
                    return;
                }
                throw new Error(data.error || 'Failed to process request');
            }

            showResult(data);
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'Something went wrong while processing your request');
        } finally {
            downloadBtn.disabled = false;
        }
    }

    function startDirectDownload(appInfo) {
        const { downloadUrl, name, packageId: pkgId } = appInfo;

        downloadLink.innerHTML =
            '<div class="spinner-small"></div>' +
            '<span>Starting download...</span>';
        downloadLink.style.pointerEvents = 'none';

        const proxyUrl = '/api/download-apk?url=' + encodeURIComponent(downloadUrl) +
            '&name=' + encodeURIComponent(name || '') +
            '&packageId=' + encodeURIComponent(pkgId || '');

        const a = document.createElement('a');
        a.href = proxyUrl;
        a.download = (name || pkgId || 'app').replace(/[^a-zA-Z0-9.-]/g, '_') + '.apk';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
            downloadLink.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
                '<polyline points="7 10 12 15 17 10"/>' +
                '<line x1="12" y1="15" x2="12" y2="3"/>' +
                '</svg>' +
                '<span>Download APK</span>';
            downloadLink.style.pointerEvents = 'auto';
        }, 3000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
