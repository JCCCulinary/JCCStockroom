// Mobile Enhancement Utilities for JCC Stockroom
// Additional components to enhance the mobile experience

// ==================================================
// 1. Service Worker for Offline Capability
// ==================================================

// File: service-worker.js (place in your public root)
const CACHE_NAME = 'jcc-stockroom-mobile-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/styles/mobile-item-form.css',
    '/scripts/modules/moduleSystem.js',
    '/scripts/modules/item-info-mobile.js',
    '/scripts/firebase/firebase.js',
    '/scripts/storage/storageController.js',
    '/scripts/utils/dataUtils.js',
    '/templates/inventory.html',
    '/templates/item-info-mobile.html',
    '/templates/dashboard.html',
    '/assets/JCC-logo.png',
    '/assets/JCC_Stockroom_Logo.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    // Skip for Firebase requests - always go to network
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebase.googleapis.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available
                if (response) {
                    console.log('Service Worker: Serving from cache:', event.request.url);
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response for caching
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Serve offline page for navigation requests
                        if (event.request.destination === 'document') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Background sync for form submissions
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'item-form-submission') {
        event.waitUntil(syncItemSubmissions());
    }
});

async function syncItemSubmissions() {
    try {
        // Get pending submissions from IndexedDB
        const pendingSubmissions = await getPendingSubmissions();
        
        for (const submission of pendingSubmissions) {
            try {
                // Attempt to submit to Firebase
                const response = await fetch('/api/items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(submission.data)
                });
                
                if (response.ok) {
                    // Remove from pending submissions
                    await removePendingSubmission(submission.id);
                    console.log('Background sync: Item submitted successfully');
                } else {
                    console.error('Background sync: Failed to submit item');
                }
            } catch (error) {
                console.error('Background sync: Network error:', error);
            }
        }
    } catch (error) {
        console.error('Background sync: Error syncing submissions:', error);
    }
}

// ==================================================
// 2. Touch Gesture Recognition Utility
// ==================================================

class TouchGestureRecognizer {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            swipeThreshold: 50,
            longPressDelay: 500,
            tapTimeout: 300,
            doubleTapDelay: 300,
            ...options
        };
        
        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.lastTap = 0;
        this.longPressTimer = null;
        this.tapTimer = null;
        
        this.onGesture = options.onGesture || (() => {});
        
        this.init();
    }
    
    init() {
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();
        
        // Start long press detection
        this.longPressTimer = setTimeout(() => {
            this.onGesture({
                type: 'longpress',
                x: this.startX,
                y: this.startY,
                target: e.target
            });
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, this.options.longPressDelay);
    }
    
    handleTouchMove(e) {
        // Cancel long press if finger moves too much
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - this.startX);
        const deltaY = Math.abs(touch.clientY - this.startY);
        
        if (deltaX > 10 || deltaY > 10) {
            this.clearLongPressTimer();
        }
    }
    
    handleTouchEnd(e) {
        this.clearLongPressTimer();
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;
        const deltaTime = Date.now() - this.startTime;
        
        // Detect swipe gestures
        if (Math.abs(deltaX) > this.options.swipeThreshold && deltaTime < 500) {
            const direction = deltaX > 0 ? 'swiperight' : 'swipeleft';
            this.onGesture({
                type: direction,
                deltaX,
                deltaY,
                duration: deltaTime,
                target: e.target
            });
            return;
        }
        
        if (Math.abs(deltaY) > this.options.swipeThreshold && deltaTime < 500) {
            const direction = deltaY > 0 ? 'swipedown' : 'swipeup';
            this.onGesture({
                type: direction,
                deltaX,
                deltaY,
                duration: deltaTime,
                target: e.target
            });
            return;
        }
        
        // Detect tap gestures
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < this.options.tapTimeout) {
            const now = Date.now();
            
            // Check for double tap
            if (now - this.lastTap < this.options.doubleTapDelay) {
                this.clearTapTimer();
                this.onGesture({
                    type: 'doubletap',
                    x: touch.clientX,
                    y: touch.clientY,
                    target: e.target
                });
                this.lastTap = 0;
            } else {
                // Single tap (delayed to check for double tap)
                this.tapTimer = setTimeout(() => {
                    this.onGesture({
                        type: 'tap',
                        x: touch.clientX,
                        y: touch.clientY,
                        target: e.target
                    });
                }, this.options.doubleTapDelay);
                this.lastTap = now;
            }
        }
    }
    
    handleTouchCancel() {
        this.clearLongPressTimer();
        this.clearTapTimer();
    }
    
    clearLongPressTimer() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
    
    clearTapTimer() {
        if (this.tapTimer) {
            clearTimeout(this.tapTimer);
            this.tapTimer = null;
        }
    }
    
    destroy() {
        this.clearLongPressTimer();
        this.clearTapTimer();
        
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    }
}

// ==================================================
// 3. Voice Input Integration
// ==================================================

class VoiceInputHandler {
    constructor(options = {}) {
        this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.isListening = false;
        this.recognition = null;
        
        this.options = {
            language: 'en-US',
            continuous: false,
            interimResults: true,
            maxAlternatives: 1,
            ...options
        };
        
        this.onResult = options.onResult || (() => {});
        this.onError = options.onError || (() => {});
        this.onStart = options.onStart || (() => {});
        this.onEnd = options.onEnd || (() => {});
        
        if (this.isSupported) {
            this.init();
        }
    }
    
    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.lang = this.options.language;
        this.recognition.continuous = this.options.continuous;
        this.recognition.interimResults = this.options.interimResults;
        this.recognition.maxAlternatives = this.options.maxAlternatives;
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.onStart();
            console.log('Voice recognition started');
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            this.onResult({
                final: finalTranscript,
                interim: interimTranscript,
                confidence: event.results[event.results.length - 1][0].confidence
            });
        };
        
        this.recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            this.isListening = false;
            this.onError(event.error);
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.onEnd();
            console.log('Voice recognition ended');
        };
    }
    
    start() {
        if (!this.isSupported) {
            this.onError('Speech recognition not supported');
            return false;
        }
        
        if (this.isListening) {
            return false;
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            this.onError(error.message);
            return false;
        }
    }
    
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    abort() {
        if (this.recognition && this.isListening) {
            this.recognition.abort();
        }
    }
}

// ==================================================
// 4. Barcode Scanner Integration
// ==================================================

class BarcodeScanner {
    constructor(options = {}) {
        this.options = {
            width: 320,
            height: 240,
            facingMode: 'environment',
            ...options
        };
        
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.stream = null;
        this.isScanning = false;
        this.scanInterval = null;
        
        this.onResult = options.onResult || (() => {});
        this.onError = options.onError || (() => {});
    }
    
    async initialize(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement || document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: this.options.width },
                    height: { ideal: this.options.height },
                    facingMode: this.options.facingMode
                }
            });
            
            this.video.srcObject = this.stream;
            this.video.play();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize camera:', error);
            this.onError('Camera access denied or not available');
            return false;
        }
    }
    
    startScanning() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        this.scanInterval = setInterval(() => {
            this.captureFrame();
        }, 100); // Scan every 100ms
    }
    
    stopScanning() {
        this.isScanning = false;
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
    
    captureFrame() {
        if (!this.video || !this.context) return;
        
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Simple barcode detection (you'd use a library like QuaggaJS in production)
        this.processImageData(imageData);
    }
    
    processImageData(imageData) {
        // This is a simplified placeholder - in production, use QuaggaJS or similar
        // For now, we'll simulate barcode detection
        
        // Look for high contrast patterns that might indicate a barcode
        const data = imageData.data;
        let blackPixels = 0;
        let whitePixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            
            if (brightness < 100) {
                blackPixels++;
            } else if (brightness > 200) {
                whitePixels++;
            }
        }
        
        // Simple heuristic for barcode-like patterns
        const contrast = Math.abs(blackPixels - whitePixels) / (blackPixels + whitePixels);
        
        if (contrast > 0.3 && Math.random() < 0.01) { // Simulate occasional detection
            // Simulate a detected barcode
            const simulatedBarcode = '123456789012';
            this.onResult(simulatedBarcode);
        }
    }
    
    // Method to integrate with QuaggaJS (if available)
    initializeQuagga(targetElement) {
        if (typeof Quagga === 'undefined') {
            console.warn('QuaggaJS not available - using simplified detection');
            return false;
        }
        
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: targetElement,
                constraints: {
                    width: this.options.width,
                    height: this.options.height,
                    facingMode: this.options.facingMode
                }
            },
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "code_39_vin_reader",
                    "codabar_reader",
                    "upc_reader",
                    "upc_e_reader"
                ]
            }
        }, (err) => {
            if (err) {
                console.error('QuaggaJS initialization failed:', err);
                this.onError('Barcode scanner initialization failed');
                return;
            }
            
            console.log("QuaggaJS initialization successful");
            Quagga.start();
            
            Quagga.onDetected((result) => {
                this.onResult(result.codeResult.code);
            });
        });
        
        return true;
    }
}

// ==================================================
// 5. Mobile Navigation Utilities
// ==================================================

class MobileNavigationHelper {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistory = 50;
        
        this.setupPopstateHandler();
        this.setupBackButtonHandler();
    }
    
    setupPopstateHandler() {
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.module) {
                this.navigateToModule(event.state.module, event.state.params, false);
            }
        });
    }
    
    setupBackButtonHandler() {
        // Handle Android back button
        document.addEventListener('backbutton', () => {
            this.goBack();
        }, false);
    }
    
    navigateToModule(moduleName, params = {}, pushState = true) {
        const navigationData = {
            module: moduleName,
            params: params,
            timestamp: Date.now()
        };
        
        // Add to history
        this.addToHistory(navigationData);
        
        // Update browser history
        if (pushState) {
            const url = `#${moduleName}${params.id ? `/${params.id}` : ''}`;
            history.pushState(navigationData, '', url);
        }
        
        // Load the module
        if (window.moduleSystem) {
            window.moduleSystem.loadModule(moduleName);
        }
        
        console.log('Mobile navigation:', moduleName, params);
    }
    
    addToHistory(navigationData) {
        // Remove entries after current index
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // Add new entry
        this.history.push(navigationData);
        this.currentIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.currentIndex--;
        }
    }
    
    goBack() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const previousNav = this.history[this.currentIndex];
            this.navigateToModule(previousNav.module, previousNav.params, false);
            history.back();
            return true;
        }
        return false;
    }
    
    goForward() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            const nextNav = this.history[this.currentIndex];
            this.navigateToModule(nextNav.module, nextNav.params, false);
            history.forward();
            return true;
        }
        return false;
    }
    
    canGoBack() {
        return this.currentIndex > 0;
    }
    
    canGoForward() {
        return this.currentIndex < this.history.length - 1;
    }
    
    getCurrentModule() {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return this.history[this.currentIndex];
        }
        return null;
    }
    
    clearHistory() {
        this.history = [];
        this.currentIndex = -1;
    }
}

// ==================================================
// 6. PWA Installation Helper
// ==================================================

class PWAInstallHelper {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone ||
                          document.referrer.includes('android-app://');
        
        this.init();
    }
    
    init() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA: Install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
        
        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            console.log('PWA: App installed');
            this.isInstalled = true;
            this.hideInstallButton();
            this.showInstalledMessage();
        });
        
        // Check if already installed
        if (this.isStandalone) {
            this.isInstalled = true;
            console.log('PWA: App is running in standalone mode');
        }
    }
    
    showInstallButton() {
        // Create install button if it doesn't exist
        let installButton = document.getElementById('pwa-install-button');
        
        if (!installButton) {
            installButton = document.createElement('button');
            installButton.id = 'pwa-install-button';
            installButton.className = 'pwa-install-btn';
            installButton.innerHTML = `
                <span>📱</span>
                <span>Install App</span>
            `;
            installButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #2196f3;
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: slideInFromRight 0.3s ease-out;
            `;
            
            // Add CSS for animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInFromRight {
                    from {
                        transform: translateX(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
            
            installButton.addEventListener('click', () => this.installApp());
            document.body.appendChild(installButton);
        }
        
        installButton.style.display = 'flex';
    }
    
    hideInstallButton() {
        const installButton = document.getElementById('pwa-install-button');
        if (installButton) {
            installButton.style.display = 'none';
        }
    }
    
    async installApp() {
        if (!this.deferredPrompt) {
            console.log('PWA: No install prompt available');
            return false;
        }
        
        try {
            // Show the install prompt
            this.deferredPrompt.prompt();
            
            // Wait for user response
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log('PWA: User choice:', outcome);
            
            if (outcome === 'accepted') {
                console.log('PWA: User accepted the install prompt');
            } else {
                console.log('PWA: User dismissed the install prompt');
            }
            
            // Clear the deferredPrompt
            this.deferredPrompt = null;
            this.hideInstallButton();
            
            return outcome === 'accepted';
        } catch (error) {
            console.error('PWA: Install failed:', error);
            return false;
        }
    }
    
    showInstalledMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4caf50;
            color: white;
            padding: 20px;
            border-radius: 12px;
            font-weight: 600;
            text-align: center;
            z-index: 1001;
            box-shadow: 0 8px 16px rgba(76, 175, 80, 0.3);
        `;
        message.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
            <div>App Installed Successfully!</div>
            <div style="font-size: 14px; margin-top: 8px; opacity: 0.9;">
                You can now use JCC Stockroom offline
            </div>
        `;
        
        document.body.appendChild(message);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
    
    isAppInstalled() {
        return this.isInstalled;
    }
    
    isRunningStandalone() {
        return this.isStandalone;
    }
}

// ==================================================
// 7. Export All Utilities
// ==================================================

export {
    TouchGestureRecognizer,
    VoiceInputHandler,
    BarcodeScanner,
    MobileNavigationHelper,
    PWAInstallHelper
};

// ==================================================
// 8. Initialize Mobile Enhancements
// ==================================================

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize PWA helper
    window.pwaHelper = new PWAInstallHelper();
    
    // Initialize mobile navigation
    window.mobileNav = new MobileNavigationHelper();
    
    // Register service worker if supported
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    }
    
    // Add mobile class to body
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile-device');
    }
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            // Trigger a resize event to help components adjust
            window.dispatchEvent(new Event('resize'));
        }, 100);
    });
    
    console.log('Mobile enhancements initialized');
});

// ==================================================
// 9. Usage Examples for Integration
// ==================================================

/*
// Example: Adding gesture support to mobile form
const gestureHandler = new TouchGestureRecognizer(document.body, {
    onGesture: (gesture) => {
        switch (gesture.type) {
            case 'swipeleft':
                // Navigate to next item
                if (window.mobileFormController) {
                    window.mobileFormController.navigateToNext();
                }
                break;
            case 'swiperight':
                // Navigate to previous item
                if (window.mobileFormController) {
                    window.mobileFormController.navigateToPrevious();
                }
                break;
            case 'longpress':
                // Show context menu
                console.log('Long press detected');
                break;
        }
    }
});

// Example: Adding voice input to form fields
const voiceInput = new VoiceInputHandler({
    onResult: (result) => {
        if (result.final) {
            // Process voice input
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === 'INPUT') {
                activeElement.value = result.final;
                activeElement.dispatchEvent(new Event('input'));
            }
        }
    },
    onError: (error) => {
        console.error('Voice input error:', error);
    }
});

// Example: Adding barcode scanner to item lookup
const barcodeScanner = new BarcodeScanner({
    onResult: (barcode) => {
        console.log('Barcode detected:', barcode);
        // Look up item by barcode
        findItemByBarcode(barcode);
    },
    onError: (error) => {
        console.error('Barcode scanner error:', error);
    }
});
*/