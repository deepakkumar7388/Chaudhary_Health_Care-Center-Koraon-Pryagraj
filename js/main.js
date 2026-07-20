// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentModule = 'dashboard';
// Use local IP for same-wifi mobile access, or the Render URL for production
// Point to local backend for testing new features
let API_BASE = (window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:5000/api/'
    : 'https://chaudhary-hms-api-h7nl.onrender.com/api/';

// =================== GOOGLE AUTHENTICATION & INIT =================== //

// Initialize Firebase Auth globally on page load
async function initFirebaseAuth() {
    try {
        const response = await fetch(`${API_BASE}integrations/public-config`);
        if (!response.ok) return;
        const result = await response.json();
        if (result.success && result.config && result.config.apiKey) {
            const { apiKey, projectId, messagingSenderId, appId } = result.config;
            if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
                firebase.initializeApp({
                    apiKey,
                    authDomain: `${projectId}.firebaseapp.com`,
                    projectId,
                    storageBucket: `${projectId}.appspot.com`,
                    messagingSenderId,
                    appId
                });
                console.log("Firebase Auth initialized globally");
            }
        }
    } catch (e) {
        console.error("Error initializing Firebase Auth globally:", e);
    }
}

// Call init when script loads
// ==================== SPLASH SCREEN & SESSION INIT ====================
function hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        setTimeout(() => { splash.style.display = 'none'; }, 500);
    }
}

function showAuthScreen() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
        authContainer.style.display = 'flex';
        authContainer.style.opacity = '0';
        authContainer.style.transition = 'opacity 0.4s ease';
        setTimeout(() => { authContainer.style.opacity = '1'; }, 50);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Sync localStorage to sessionStorage for compatibility with other JS files
    const localToken = localStorage.getItem('token');
    const localUser = localStorage.getItem('user');
    if (localToken) sessionStorage.setItem('token', localToken);
    if (localUser) sessionStorage.setItem('user', localUser);

    initFirebaseAuth();

    const splashStartTime = Date.now();
    const MIN_SPLASH_MS = 2000; // Force 3 seconds for a clean app launching feel

    let isLoggedIn = false;
    try {
        // Check if there's an active session via the HTTP-only cookie OR localStorage
        const existingToken = localStorage.getItem('token');
        const headers = {};
        if (existingToken) headers['Authorization'] = `Bearer ${existingToken}`;

        const res = await fetch(`${API_BASE}auth/profile`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
                // Valid session found — restore user state
                currentUser = data.user;
                // Also store in localStorage for compatibility
                localStorage.setItem('user', JSON.stringify({
                    id: data.user._id,
                    username: data.user.username || data.user.email.split('@')[0],
                    name: data.user.name,
                    role: data.user.role,
                    email: data.user.email,
                    avatar: data.user.avatar,
                    billingAccess: data.user.billingAccess
                }));
                // Restore token if provided (e.g. new tab login via cookie)
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                isLoggedIn = true;
            }
        }
    } catch (e) {
        // Network error or server down — show login screen
        console.warn('Session check failed:', e.message);
    }

    const elapsed = Date.now() - splashStartTime;
    const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);

    setTimeout(() => {
        hideSplashScreen();
        if (isLoggedIn) {
            switchToApp(); // Go directly to dashboard — no login flash!
        } else {
            showAuthScreen(); // Show login form with Google SmartLock support
        }
    }, remaining);
});

async function signInWithGoogle() {
    if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
        showNotification("Firebase is not initialized. Please try again later.", "error");
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        const idToken = await result.user.getIdToken();
        
        showLoading('Signing in with Google...');
        const response = await fetch(`${API_BASE}auth/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });

        const data = await response.json();
        hideLoading();

        if (response.ok && data.success) {
            const userObj = {
                id: data.user_id,
                username: data.username,
                name: data.name,
                role: data.role,
                email: data.email,
                avatar: data.avatar,
                billingAccess: data.billingAccess
            };
            // CRITICAL: Set global currentUser BEFORE switchToApp so role is available immediately
            currentUser = userObj;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(userObj));
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(userObj));
            showNotification(`Welcome back, ${data.name}!`, 'success');
            // No setTimeout — switch immediately so role-guard overlay stays active throughout
            switchToApp();
        } else {
            showNotification(data.message || 'Google Login failed', 'error');
            firebase.auth().signOut(); // clear local state
        }
    } catch (error) {
        hideLoading();
        if (error.code !== 'auth/popup-closed-by-user') {
            console.error(error);
            showNotification("Failed to authenticate with Google.", "error");
        }
    }
}

// Stores Google idToken temporarily so signup() can skip OTP verification
let _googleSignupIdToken = null;

async function signUpWithGoogleAutoFill() {
    if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
        showNotification("Firebase is not initialized. Please try again later.", "error");
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        const name = result.user.displayName;
        const email = result.user.email;

        // Get idToken — backend will use this to verify Google identity & skip OTP
        _googleSignupIdToken = await result.user.getIdToken();

        // Auto-fill form and make fields read-only
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');

        nameInput.value = name || '';
        emailInput.value = email || '';

        nameInput.readOnly = true;
        nameInput.style.backgroundColor = 'var(--background, #f3f4f6)';
        emailInput.readOnly = true;
        emailInput.style.backgroundColor = 'var(--background, #f3f4f6)';

        // NOTE: We do NOT sign out from Firebase here.
        // The idToken is kept so signup() can pass it to backend for OTP bypass.
        // Firebase session is a local popup session only — backend handles actual user creation.
        showNotification('Google info auto-filled! Please complete the remaining fields.', 'success');
    } catch (error) {
        _googleSignupIdToken = null;
        if (error.code !== 'auth/popup-closed-by-user') {
            console.error(error);
            showNotification('Failed to fetch info from Google.', 'error');
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        document.getElementById('loading-text').textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

let notificationTimeout = null;

function showNotification(message, type = 'info', title = 'Notification') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    const icon = notification.querySelector('.notification-icon i');
    const titleEl = document.getElementById('notification-title');
    const messageEl = document.getElementById('notification-message');

    if (notificationTimeout) clearTimeout(notificationTimeout);

    notification.className = `notification ${type}`;
    icon.className = type === 'success' ? 'bi bi-check-circle-fill' :
        type === 'error' ? 'bi bi-exclamation-circle-fill' :
        type === 'warning' ? 'bi bi-exclamation-triangle-fill' : 'bi bi-info-circle-fill';
    
    if (title === 'Notification') {
        title = type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    notification.classList.add('show');

    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) notification.classList.remove('show');
}

// ==================== AUTH FUNCTIONS ====================
function toggleAuthPanel(mode) {
    const loginPanel = document.getElementById('login-panel');
    const signupPanel = document.getElementById('signup-panel');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayText = document.getElementById('overlay-text');
    const overlayBtn = document.getElementById('overlay-btn');

    if (mode === 'signup') {
        loginPanel.classList.remove('active');
        signupPanel.classList.add('active');
        overlayTitle.textContent = 'Hello, Friend!';
        overlayText.textContent = 'Enter your personal details and start journey with us';
        overlayBtn.textContent = 'Sign In';
        overlayBtn.onclick = () => toggleAuthPanel('login');
        document.getElementById('signup-error').textContent = '';
    } else {
        signupPanel.classList.remove('active');
        loginPanel.classList.add('active');
        overlayTitle.textContent = 'Welcome Back!';
        overlayText.textContent = 'To keep connected with us please login with your personal info';
        overlayBtn.textContent = 'Sign Up';
        overlayBtn.onclick = () => toggleAuthPanel('signup');
        document.getElementById('login-error').textContent = '';
    }
}

async function login() {
    if (window.isLoggingIn) return;

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        document.getElementById('login-error').textContent = 'Please fill all fields';
        return;
    }

    window.isLoggingIn = true;
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.7';
    }

    showLoading('Authenticating...');

    try {
        const response = await fetch(`${API_BASE}auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            currentUser = {
                id: result.user_id,
                username: result.username,
                name: result.name,
                role: result.role,
                email: result.email,
                mobile: result.mobile,
                avatar: result.avatar || null,
                billingAccess: result.billingAccess || false
            };

            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('token', result.token);
            sessionStorage.setItem('user', JSON.stringify(currentUser));
            sessionStorage.setItem('token', result.token);

            hideLoading();
            showNotification('Login successful!', 'success', 'Welcome');
            switchToApp();

            // Setup push notifications after login (3s delay to avoid blocking UI)
            if (window.hmsFCM) window.hmsFCM.setup();

            // Rejoin socket room with correct role
            if (window.hmsSocket && window.hmsSocket.isConnected()) {
                window.hmsSocket.emit('join', {
                    role: (currentUser.role || 'staff').toLowerCase(),
                    userId: currentUser.id
                });
            }
            window.isLoggingIn = false;
        } else {
            resetLoginButton();
            hideLoading();
            if (response.status === 403) {
                // Account is pending or rejected
                let title = 'Access Restricted';
                let type = 'warning';
                let msg = result.message || 'Account is not active';

                if (msg.includes('pending')) {
                    title = 'Approval Pending';
                    msg = 'Your account is pending administrator approval. Please contact the admin.';
                } else if (msg.includes('rejected')) {
                    title = 'Account Rejected';
                    type = 'error';
                    msg = 'Your account request has been rejected. Please contact the admin.';
                }

                showNotification(msg, type, title);
                document.getElementById('login-error').textContent = msg;
            } else {
                document.getElementById('login-error').textContent = result.message || 'Incorrect password';
            }
        }
    } catch (error) {
        resetLoginButton();
        console.error('Login error:', error);
        hideLoading();
        let errorMsg = 'Cannot connect to server. Please ensure the backend is running.';
        if (window.location.protocol === 'file:') {
            errorMsg = 'Browser blocked connection from file://. Please use http://localhost:5000 instead.';
        }
        showNotification(errorMsg, 'error', 'Connection Error');
        document.getElementById('login-error').textContent = errorMsg;
    }
}

function resetLoginButton() {
    window.isLoggingIn = false;
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.style.opacity = '1';
    }
}

async function signup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const mobile = document.getElementById('signup-mobile').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const role = document.getElementById('signup-role').value;

    const errors = [];
    if (!name) errors.push('Name required');
    if (!email) errors.push('Email required');
    if (!mobile || mobile.length !== 10) errors.push('Valid mobile required');
    if (!password) errors.push('Password required');
    if (password !== confirm) errors.push('Passwords do not match');
    if (password.length < 6) errors.push('Password must be 6+ characters');
    if (!role) errors.push('Role required');

    if (errors.length > 0) {
        document.getElementById('signup-error').textContent = errors.join(', ');
        return;
    }

    showLoading('Creating account...');

    try {
        // Build request body — include googleIdToken if Google auto-fill was used
        // Backend will verify this token and skip OTP for Google-verified emails
        const requestBody = { name, email, mobile, password, role };
        if (_googleSignupIdToken) {
            requestBody.googleIdToken = _googleSignupIdToken;
        }

        const response = await fetch(`${API_BASE}auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        // Clear the token regardless of outcome (one-time use)
        _googleSignupIdToken = null;
        // Also sign out from Firebase popup session (cleanup)
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            firebase.auth().signOut().catch(() => {});
        }

        if (result.success) {
            hideLoading();
            if (result.requiresOtp) {
                // Normal manual signup — OTP needed
                document.getElementById('signup-otp-modal').style.display = 'flex';
            } else {
                // Google-verified or admin-created — no OTP needed
                showNotification(result.message || 'Account created successfully!', 'success', 'Signup Complete');
                document.getElementById('signup-form').reset();
                // Reset read-only states on email/name fields
                const nameInput = document.getElementById('signup-name');
                const emailInput = document.getElementById('signup-email');
                if (nameInput) { nameInput.readOnly = false; nameInput.style.backgroundColor = ''; }
                if (emailInput) { emailInput.readOnly = false; emailInput.style.backgroundColor = ''; }
                toggleAuthPanel('login');
            }
        } else {
            document.getElementById('signup-error').textContent = result.message || 'Signup failed';
            hideLoading();
        }
    } catch (error) {
        console.error('Signup error:', error);
        _googleSignupIdToken = null;
        hideLoading();
        showNotification('Connection error while creating account. Please try again.', 'error');
        document.getElementById('signup-error').textContent = 'Cannot connect to server';
    }
}

function closeSignupOtpModal() {
    document.getElementById('signup-otp-modal').style.display = 'none';
}

async function verifySignupOtp() {
    const email = document.getElementById('signup-email').value.trim();
    const otp = document.getElementById('signup-otp-input').value.trim();

    if (!otp || otp.length !== 6) {
        showNotification('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    showLoading('Verifying OTP...');

    try {
        const response = await fetch(`${API_BASE}auth/verify-signup-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            closeSignupOtpModal();
            showNotification(result.message || 'Account created successfully!', 'success');
            document.getElementById('signup-form').reset();
            document.getElementById('signup-otp-form').reset();
            toggleAuthPanel('login');
        } else {
            showNotification(result.message || 'Invalid OTP', 'error');
        }
    } catch (error) {
        console.error('OTP Verification Error:', error);
        hideLoading();
        showNotification('Connection error during verification', 'error');
    }
}

async function switchToApp() {
    // ══════════════════════════════════════════════════════════
    // SECURITY GATE: No UI renders until role is 100% confirmed
    // ══════════════════════════════════════════════════════════

    // Step 1: Activate role-guard overlay immediately — this blocks ALL app UI
    const roleGuard = document.getElementById('role-guard-overlay');
    if (roleGuard) {
        roleGuard.style.display = 'flex'; // force show even before CSS class
        roleGuard.classList.add('active');
    }

    // Step 2: Validate that currentUser has a real role before proceeding
    const validRoles = ['developer', 'admin', 'doctor', 'staff', 'receptionist'];
    if (!currentUser || !validRoles.includes(currentUser.role)) {
        // Role is missing/invalid — try to re-fetch from server as fallback
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}auth/profile`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user && validRoles.includes(data.user.role)) {
                    currentUser = {
                        id: data.user._id,
                        username: data.user.username || data.user.email?.split('@')[0],
                        name: data.user.name,
                        role: data.user.role,
                        email: data.user.email,
                        avatar: data.user.avatar,
                        billingAccess: data.user.billingAccess
                    };
                    localStorage.setItem('user', JSON.stringify(currentUser));
                } else {
                    // Server says role is invalid — abort, show login
                    if (roleGuard) { roleGuard.classList.remove('active'); roleGuard.style.display = ''; }
                    showAuthScreen();
                    return;
                }
            } else {
                // Server rejected the session — abort, show login
                if (roleGuard) { roleGuard.classList.remove('active'); roleGuard.style.display = ''; }
                showAuthScreen();
                return;
            }
        } catch (e) {
            console.error('Role validation fetch failed:', e);
            // Network error — abort to be safe
            if (roleGuard) { roleGuard.classList.remove('active'); roleGuard.style.display = ''; }
            showAuthScreen();
            return;
        }
    }

    // Step 3: Apply global settings (theme etc.) — still behind overlay
    if (typeof applyGlobalSettings === 'function') {
        await applyGlobalSettings();
    }

    // Step 4: Show app container BEHIND the overlay (user cannot see it yet)
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    // Step 5: Apply role-based UI restrictions — menu items, admin-menu etc.
    updateUserInfo();

    // Step 6: Add role-applied class — disables CSS default-hidden rules,
    //         from here JS inline styles are fully in control
    document.body.classList.add('role-applied');

    // Step 7: Wait for TWO full paint frames so browser finishes rendering
    //         all display:none / display:flex changes from updateUserInfo()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Step 8: NOW remove the overlay — user sees role-correct UI for first time
    if (roleGuard) {
        roleGuard.classList.remove('active');
        // Small fade-out transition
        roleGuard.style.transition = 'opacity 0.2s ease';
        roleGuard.style.opacity = '0';
        setTimeout(() => {
            roleGuard.style.display = 'none';
            roleGuard.style.opacity = '';
            roleGuard.style.transition = '';
        }, 220);
    }

    // Step 9: Start clock and route to initial module
    updateClock();
    setInterval(updateClock, 1000);

    const hash = window.location.hash.substring(1);
    if (hash) {
        showModule(hash, true);
    } else {
        showModule('dashboard', true);
        window.history.replaceState(null, '', '#dashboard');
    }

    // Step 10: Initialize push notifications in background
    if (typeof initPushNotifications === 'function') {
        initPushNotifications();
    }
}

function logout() {
    const modal = document.getElementById('logout-modal');
    const userName = document.getElementById('logout-user-name');
    userName.textContent = currentUser?.name || 'User';
    modal.classList.add('active');
}

function cancelLogout() {
    document.getElementById('logout-modal').classList.remove('active');
}

function confirmLogout() {
    // Stop camera stream if active
    if (typeof window.stopSurgeryCameraStream === 'function') {
        try {
            window.stopSurgeryCameraStream();
        } catch (e) {
            console.error("Error stopping camera stream on logout:", e);
        }
    }

    // Clean up dynamic body-appended modals
    Array.from(document.body.children).forEach(child => {
        const isDynamicModal = child.classList.contains('modal') && !child.id;
        const isDeleteModal = child.id === 'delete-confirm-modal';
        if (isDynamicModal || isDeleteModal) {
            child.remove();
        }
    });

    document.getElementById('logout-modal').classList.remove('active');

    // Server se cookie clear karo (background mein)
    fetch(`${API_BASE}auth/logout`, {
        method: 'POST',
        credentials: 'include'
    }).catch(() => {}); // Silent fail — UI rok nahi sakta

    // Frontend cache + session clear karo
    localStorage.clear();
    sessionStorage.clear();
    localStorage.removeItem('hospitalSettings'); // Settings cache clear
    localStorage.removeItem('patients');          // Patient list cache clear
    localStorage.removeItem('billings');          // Billing cache clear
    localStorage.removeItem('users');             // Users cache clear
    currentUser = null;

    // SECURITY: Reset role-applied state so CSS default-hidden rules kick in again
    document.body.classList.remove('role-applied');

    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    toggleAuthPanel('login');
    showNotification('You have been logged out successfully', 'info', 'Goodbye');
    window.location.hash = '';
}

// ==================== FORCE LOGOUT (Another Device Login) ====================
// Jab Developer ka session kisi naye device se login ke karan expire ho jata hai
let _forceLogoutCalled = false; // Baar-baar call se bachao
function forceLogoutDueToOtherDevice(message) {
    if (_forceLogoutCalled) return;
    _forceLogoutCalled = true;

    // Stop camera if running
    if (typeof window.stopSurgeryCameraStream === 'function') {
        try { window.stopSurgeryCameraStream(); } catch (e) {}
    }

    // Clear all local data
    localStorage.clear();
    sessionStorage.clear();
    
    // SECURITY: Reset role state
    document.body.classList.remove('role-applied');
    localStorage.removeItem('hospitalSettings');
    localStorage.removeItem('patients');
    localStorage.removeItem('billings');
    localStorage.removeItem('users');
    currentUser = null;

    // UI: App hide, Login show
    document.getElementById('logout-modal')?.classList.remove('active');
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('login-form')?.reset();
    toggleAuthPanel('login');
    window.location.hash = '';

    // Warning message dono jagah
    const msg = message || 'Your session was terminated because you logged in from another device.';
    showNotification(msg, 'warning', '⚠️ Session Terminated');

    // Login error box mein bhi dikhao
    const loginError = document.getElementById('login-error');
    if (loginError) {
        loginError.style.color = '#b45309';
        loginError.textContent = msg;
    }

    // Reset flag after a delay so user can login again
    setTimeout(() => { _forceLogoutCalled = false; }, 3000);
}

// Global API response interceptor — har fetch response 401 check karo
const _originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await _originalFetch.apply(this, args);

    // Check for session-terminated 401 only when user is logged in (app is visible)
    if (response.status === 401 && currentUser) {
        const clone = response.clone(); // clone before reading body (stream can only be read once)
        try {
            const data = await clone.json();
            if (data.message && data.message.toLowerCase().includes('another device')) {
                forceLogoutDueToOtherDevice(data.message);
            }
        } catch (e) {
            // JSON parse fail — ignore
        }
    }

    return response;
};

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('current-user').textContent = currentUser.name;
        const roleEl = document.getElementById('current-user-role');
        if (roleEl) {
            roleEl.textContent = currentUser.role.toUpperCase();
            // Optional: style based on role
            const colors = { 'developer': '#0f172a', 'admin': '#ef4444', 'doctor': '#3b82f6', 'staff': '#9333ea', 'receptionist': '#ca8a04' };
            roleEl.style.background = colors[currentUser.role] || '#64748b';
            roleEl.style.color = currentUser.role === 'developer' ? '#fbbf24' : 'white';
            roleEl.style.borderRadius = '4px';
            roleEl.style.border = currentUser.role === 'developer' ? '1px solid #fbbf24' : 'none';
        }

        const avatarDiv = document.getElementById('sidebar-avatar');
        if (avatarDiv) {
            console.log("Updating Sidebar Avatar. Current User Data:", currentUser);
            if (currentUser.avatar) {
                // Construct full URL
                const baseUrl = API_BASE.replace('/api/', '');
                const fullUrl = currentUser.avatar.startsWith('http') || currentUser.avatar.startsWith('data:') ? currentUser.avatar : `${baseUrl}${currentUser.avatar}`;
                console.log("Loading Sidebar Avatar from:", fullUrl);
                avatarDiv.innerHTML = `<img src="${fullUrl}" alt="User" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; pointer-events: none;">`;
                avatarDiv.style.cursor = 'default';
                avatarDiv.onclick = null;
            } else if (currentUser.name && currentUser.name.trim().length > 0) {
                const initials = currentUser.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatarDiv.textContent = initials;
                avatarDiv.innerHTML = initials; // Ensure text is set
                avatarDiv.style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)';
            } else {
                avatarDiv.innerHTML = '<i class="bi bi-person"></i>';
            }
        }

        const role = currentUser.role;

        // Admin Menu visibility (developer & admin both get it)
        const adminMenu = document.getElementById('admin-menu');
        if (adminMenu) {
            adminMenu.style.display = (role === 'developer' || role === 'admin' || role === 'doctor') ? 'block' : 'none';
        }

        const hasBillingAccess = (role === 'developer' || role === 'admin') || (currentUser.billingAccess === true);

        // Apply access to Sidebar menu items, Bottom Nav items, Bottom Sheet options, and Hub/Action cards
        const uiElements = document.querySelectorAll('.menu-item, .bottom-nav-item, .sheet-option, .action-card, [data-role-access]');
        uiElements.forEach(item => {
            const moduleAttr = item.getAttribute('onclick') || item.getAttribute('data-role-access');
            if (!moduleAttr) return;
            
            // Extract module name from onclick="showModule('name')" or data-role-access="name"
            let module = item.getAttribute('data-role-access');
            if (!module) {
                module = moduleAttr.match(/showModule\('([^']+)'\)/)?.[1];
            }
            if (!module && moduleAttr.includes('logout()')) module = 'profile-hub';
            if (!module && moduleAttr.includes('openProfileModal()')) module = 'profile-hub';
            if (!module) return;
            
            // Map hub modules to base permissions
            let checkModule = module;
            if (module === 'patient-hub') checkModule = 'patients';
            if (module === 'billing-hub') checkModule = 'billing';
            if (module === 'profile-hub') checkModule = 'users';

            let isVisible = false;
            switch (role) {
                case 'developer': isVisible = true; break; // Developer sees EVERYTHING
                case 'admin': isVisible = ['dashboard', 'patients', 'add-patient', 'daily-notes', 'billing', 'discharge', 'users', 'reports', 'settings', 'patient-record'].includes(checkModule); break;
                case 'doctor': isVisible = ['dashboard', 'patients', 'add-patient', 'daily-notes', 'discharge', 'patient-record'].includes(checkModule); break;
                case 'staff': isVisible = ['dashboard', 'patients', 'add-patient', 'daily-notes'].includes(checkModule); break;
                case 'receptionist': isVisible = ['dashboard', 'patients', 'add-patient'].includes(checkModule); break;
                default: isVisible = ['dashboard'].includes(checkModule);
            }

            // Billing module: only show if user has billing access
            if (checkModule === 'billing') {
                isVisible = hasBillingAccess;
            }

            // Special case: Profile Sheet should always be visible so they can Logout
            if (module === 'profile-hub') {
                isVisible = true;
            }

            // Set display based on element type to prevent layout breakage
            if (!isVisible) {
                item.style.display = 'none';
            } else {
                // Restore original display type
                if (item.classList.contains('col-12')) {
                    item.style.display = 'block';
                } else if (item.classList.contains('action-card')) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'flex'; // menu-items, bottom-nav-items use flex
                }
            }
        });

        updateSidebarStats();
    }
}

async function updateSidebarStats() {
    try {
        const pRes = await fetch(`${API_BASE}patients`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        const pData = await pRes.json();
        const uRes = await fetch(`${API_BASE}auth/users`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        const uData = await uRes.json();

        if (pData.success && document.getElementById('stat-patients')) {
            document.getElementById('stat-patients').textContent = pData.patients.length;
        }
        if (uData.success && document.getElementById('stat-doctors')) {
            const doctors = uData.users.filter(u => u.role === 'doctor').length;
            document.getElementById('stat-doctors').textContent = doctors;
        }
    } catch (err) { console.error("Stats update failed", err); }
}

function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString();
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// Consolidated showModule: moved to MODULE SYSTEM section below

function updateSidebarStats() {
    try {
        const patients = JSON.parse(localStorage.getItem('patients') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const records = JSON.parse(localStorage.getItem('billing_records') || '{}');

        // Doctors count (role === doctor)
        let doctors = users.filter(u => u.role === 'doctor').length;
        // Basic fallback if empty environment
        if (users.length === 0 && currentUser?.role === 'doctor') doctors = 1;

        // Revenue calculation
        let totalRevenue = 0;
        Object.values(records).forEach(rec => {
            if (rec.payments && rec.payments.length > 0) {
                rec.payments.forEach(p => {
                    totalRevenue += (parseFloat(p.amount) || 0);
                });
            }
        });

        const curr = window.currencySymbol || '₹';
        const elPat = document.getElementById('stat-patients');
        const elDoc = document.getElementById('stat-doctors');
        const elRev = document.getElementById('stat-revenue');

        if (elPat) elPat.textContent = patients.length.toLocaleString();
        if (elDoc) elDoc.textContent = doctors.toLocaleString();

        const role = currentUser?.role || 'staff';
        if (role === 'admin' || role === 'developer') {
            if (elRev) elRev.textContent = `${curr}${totalRevenue.toLocaleString()}`;
        } else {
            if (elRev) elRev.textContent = 'RESTRICTED';
        }

    } catch (err) {
        console.error("Sidebar stats update error:", err);
    }
}

// ==================== MODULE SYSTEM ====================
function showModule(moduleName, preventHashUpdate = false) {
    const role = currentUser?.role || 'staff';

    // Security check for unauthorized module access
    const hasBillingAccess = (role === 'developer' || role === 'admin') || (currentUser?.billingAccess === true);
    const permissions = {
        'developer': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'billing', 'discharge', 'users', 'reports', 'settings', 'patient-record'], // Full access
        'admin': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'billing', 'discharge', 'users', 'reports', 'settings', 'patient-record'], // Settings (restricted: General, Beds, Billing only)
        'doctor': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'discharge', 'patient-record'],
        'staff': ['dashboard', 'patients', 'add-patient', 'daily-notes'],
        'receptionist': ['dashboard', 'patients', 'add-patient']
    };

    // Billing access is dynamic — granted by admin/developer per user
    if (hasBillingAccess && !permissions[role]?.includes('billing')) {
        permissions[role] = [...(permissions[role] || []), 'billing'];
    }

    let checkModule = moduleName;
    if (moduleName === 'patient-hub') checkModule = 'patients';
    if (moduleName === 'billing-hub') checkModule = 'billing';
    if (moduleName === 'profile-hub') checkModule = 'dashboard'; // Anyone can view profile hub

    const allowedModules = permissions[role] || ['dashboard'];
    if (moduleName !== 'profile-hub' && !allowedModules.includes(checkModule)) {
        showNotification('Access Denied: You do not have permission for this module.', 'error', 'Security');
        // Revert hash if it differs from currentModule to keep URL in sync
        if (window.location.hash.substring(1) !== currentModule) {
            window.location.hash = currentModule || 'dashboard';
        }
        return;
    }

    // Save draft of the module we are navigating away from
    if (typeof currentModule !== 'undefined') {
        if (currentModule === 'add-patient' && typeof saveAddPatientDraft === 'function') {
            saveAddPatientDraft();
        } else if (currentModule === 'daily-notes' && typeof saveDailyNotesDraft === 'function') {
            saveDailyNotesDraft();
        } else if (currentModule === 'discharge' && typeof saveDischargeDraft === 'function') {
            saveDischargeDraft();
        } else if (currentModule === 'patient-record' && typeof savePatientRecordState === 'function') {
            savePatientRecordState();
        } else if (currentModule === 'patients' && typeof window.savePatientModalDraft === 'function') {
            window.savePatientModalDraft();
        }
    }

    currentModule = moduleName;

    const iconMap = {
        'dashboard': { outline: 'bi-house', fill: 'bi-house-fill' },
        'patients': { outline: 'bi-people', fill: 'bi-people-fill' },
        'add-patient': { outline: 'bi-person-plus', fill: 'bi-person-plus-fill' },
        'daily-notes': { outline: 'bi-file-earmark-text', fill: 'bi-file-earmark-text-fill' },
        'billing': { outline: 'bi-credit-card', fill: 'bi-credit-card-fill' },
        'discharge': { outline: 'bi-box-arrow-right', fill: 'bi-box-arrow-right' },
        'users': { outline: 'bi-person-gear', fill: 'bi-person-fill-gear' },
        'reports': { outline: 'bi-bar-chart-line', fill: 'bi-bar-chart-line-fill' },
        'patient-record': { outline: 'bi-file-earmark-medical', fill: 'bi-file-earmark-medical-fill' },
        'settings': { outline: 'bi-gear', fill: 'bi-gear-fill' }
    };

    // Revert all sidebar icons to outline state
    document.querySelectorAll('.menu .menu-item').forEach(item => {
        const iconEl = item.querySelector('i');
        if (!iconEl) return;
        const onclickAttr = item.getAttribute('onclick') || '';
        for (const [mod, icons] of Object.entries(iconMap)) {
            if (onclickAttr.includes(mod)) {
                iconEl.className = `bi ${icons.outline}`;
                break;
            }
        }
    });

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));

    const activeItem = document.querySelector(`.menu-item[onclick*="${moduleName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        const activeIconEl = activeItem.querySelector('i');
        if (activeIconEl && iconMap[moduleName]) {
            activeIconEl.className = `bi ${iconMap[moduleName].fill}`;
        }
    }

    // Determine which bottom nav item should be active based on the module
    let bottomNavTarget = moduleName;
    if (['patients', 'add-patient', 'daily-notes'].includes(moduleName)) {
        bottomNavTarget = 'patient-hub';
    } else if (['billing', 'discharge'].includes(moduleName)) {
        bottomNavTarget = 'billing-hub';
    } else if (['settings', 'users', 'reports', 'patient-record'].includes(moduleName)) {
        bottomNavTarget = 'profile-hub';
    }

    const activeBottomItem = document.querySelector(`.bottom-nav-item[onclick*="${bottomNavTarget}"]`);
    if (activeBottomItem) {
        activeBottomItem.classList.add('active');
        const iconEl = activeBottomItem.querySelector('i');
        // If it's a hub, we might not have a direct iconMap fill for 'patient-hub', but let's try
        const hubIconMap = {
            'dashboard': { fill: 'bi-house-fill' },
            'patient-hub': { fill: 'bi-people-fill' },
            'billing-hub': { fill: 'bi-credit-card-fill' },
            'profile-hub': { fill: 'bi-person-circle' } // Assume person-circle is filled enough
        };
        if (iconEl && hubIconMap[bottomNavTarget]) {
            iconEl.className = `bi ${hubIconMap[bottomNavTarget].fill}`;
        }
    }

    document.querySelectorAll('.module-content').forEach(m => m.classList.remove('active'));
    const targetModule = document.getElementById(`module-${moduleName}`);
    if (targetModule) {
        targetModule.classList.add('active');
    }

    // Close sidebar on mobile after selecting a module
    if (window.innerWidth <= 992) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('active');
    }

    // Toggle theme button visibility based on dashboard module
    const mainThemeToggle = document.querySelector('.main-theme-toggle');
    if (mainThemeToggle) {
        if (moduleName === 'dashboard') {
            mainThemeToggle.classList.add('active-module');
        } else {
            mainThemeToggle.classList.remove('active-module');
        }
    }

    // Update URL hash to support browser back/forward buttons
    if (!preventHashUpdate) {
        window.location.hash = moduleName;
    }

    loadModule(moduleName);
}

function loadModule(moduleName) {
    // Stop camera stream if active
    if (typeof window.stopSurgeryCameraStream === 'function') {
        try {
            window.stopSurgeryCameraStream();
        } catch (e) {
            console.error("Error stopping camera stream on navigation:", e);
        }
    }

    // Clean up dynamic body-appended modals when navigating
    Array.from(document.body.children).forEach(child => {
        const isDynamicModal = child.classList.contains('modal') && !child.id;
        const isDeleteModal = child.id === 'delete-confirm-modal';
        if (isDynamicModal || isDeleteModal) {
            child.remove();
        }
    });

    document.querySelectorAll('.module-content').forEach(module => module.classList.remove('active'));

    const moduleEl = document.getElementById(`module-${moduleName}`);
    if (moduleEl) {
        moduleEl.classList.add('active');

        const titles = {
            'patient-record': 'In-Patient Record Registry',
            'dashboard': '',
            'patients': 'Patient Management',
            'add-patient': 'Add New Patient',
            'daily-notes': 'Daily Treatment Notes',
            'billing': 'Billing & Payments',
            'discharge': 'Patient Discharge',
            'users': 'User Management',
            'reports': 'Reports & Analytics',
            'settings': 'System Settings'
        };

        const pageTitle = titles[moduleName] !== undefined ? titles[moduleName] : moduleName;
        document.getElementById('page-title').textContent = pageTitle;

        const contentHeader = document.querySelector('.content-header');
        if (contentHeader) {
            contentHeader.style.display = 'none';
        }

        // Call module-specific render functions
        switch (moduleName) {
            case 'dashboard':
                if (typeof renderDashboard === 'function') renderDashboard();
                if (typeof updateDashboardStats === 'function') updateDashboardStats();
                break;
            case 'patients':
                if (typeof renderPatients === 'function') renderPatients();
                if (typeof loadPatients === 'function') loadPatients();
                break;
            case 'add-patient':
                if (typeof renderAddPatient === 'function') renderAddPatient();
                break;
            case 'daily-notes':
                if (typeof renderDailyNotes === 'function') renderDailyNotes();
                break;
            case 'billing':
                if (typeof renderBilling === 'function') renderBilling();
                if (typeof loadBillingData === 'function') loadBillingData();
                break;
            case 'discharge':
                if (typeof renderDischarge === 'function') renderDischarge();
                // Note: renderDischarge() already calls loadDischargePatients() + restoreDischargeDraft() internally
                break;
            case 'users':
                if (typeof renderUsers === 'function') renderUsers();
                if (typeof loadUsers === 'function') loadUsers();
                break;
            case 'reports':
                if (typeof renderReports === 'function') renderReports();
                break;
            case 'settings':
                if (typeof renderSettings === 'function') renderSettings();
                break;
            case 'patient-record':
                if (typeof renderPatientRecord === 'function') renderPatientRecord();
                break;
        }
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    // Unregister any existing Service Workers to remove PWA completely
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
            }
        });
    }

    if (localStorage.getItem('sidebarCollapsed') === 'true' && window.innerWidth > 992) {
        document.body.classList.add('sidebar-collapsed');
    }

    migratePatientIds(); // Run once to clean old IDs

    // Always initialize panel to login state by default; 
    // verified session handler (first DOMContentLoaded block) will switch to app if valid.
    toggleAuthPanel('login');

    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.value = today;
    });

    document.getElementById('password')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') login();
    });
});

// ==================== LOCAL DATA MIGRATION ====================
function migratePatientIds() {
    try {
        let patients = JSON.parse(localStorage.getItem('patients') || '[]');
        if (patients.length === 0) return;

        let needsSave = false;
        const idMapping = {};

        patients.forEach(p => {
            if (p.id !== p.patient_id && p.patient_id) {
                idMapping[String(p.id)] = p.patient_id;
                p.id = p.patient_id;
                needsSave = true;
            }
        });

        if (needsSave) {
            localStorage.setItem('patients', JSON.stringify(patients));

            // Migrate Vitals
            let vitals = JSON.parse(localStorage.getItem('vitals_register') || '[]');
            let vDirty = false;
            vitals.forEach(v => {
                if (idMapping[v.patientId]) { v.patientId = idMapping[v.patientId]; vDirty = true; }
            });
            if (vDirty) localStorage.setItem('vitals_register', JSON.stringify(vitals));

            // Migrate Medications
            let meds = JSON.parse(localStorage.getItem('medications_register') || '[]');
            let mDirty = false;
            meds.forEach(m => {
                if (idMapping[m.patientId]) { m.patientId = idMapping[m.patientId]; mDirty = true; }
            });
            if (mDirty) localStorage.setItem('medications_register', JSON.stringify(meds));

            // Migrate Discharge
            let discharges = JSON.parse(localStorage.getItem('discharge_records') || '[]');
            let dDirty = false;
            discharges.forEach(d => {
                if (idMapping[d.patientId]) { d.patientId = idMapping[d.patientId]; dDirty = true; }
            });
            if (dDirty) localStorage.setItem('discharge_records', JSON.stringify(discharges));

            // Migrate Surgeries
            let surgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');
            let sDirty = false;
            surgeries.forEach(s => {
                if (idMapping[s.patient_id]) { s.patient_id = idMapping[s.patient_id]; sDirty = true; }
            });
            if (sDirty) localStorage.setItem('surgeries', JSON.stringify(surgeries));

            // Migrate Billing Records
            let billing = JSON.parse(localStorage.getItem('billing_records') || '{}');
            let bDirty = false;
            let newBilling = { ...billing };
            for (let oldId in billing) {
                if (idMapping[oldId]) {
                    const newId = idMapping[oldId];
                    if (!newBilling[newId]) {
                        newBilling[newId] = billing[oldId];
                    } else {
                        // Append items if merging
                        newBilling[newId].items = [...(newBilling[newId].items || []), ...(billing[oldId].items || [])];
                        newBilling[newId].payments = [...(newBilling[newId].payments || []), ...(billing[oldId].payments || [])];
                    }
                    delete newBilling[oldId];
                    bDirty = true;
                }
            }
            if (bDirty) localStorage.setItem('billing_records', JSON.stringify(newBilling));

            console.log("Database Migration Complete: Normalized patient records to strictly use 'patient_id'. mapped:", idMapping);
        }
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

// ==================== MOBILE UI FUNCTIONS ====================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if(sidebar) sidebar.classList.toggle('active');
}

function openBottomSheet(sheetId) {
    document.getElementById('bottom-sheet-overlay').classList.add('active');
    
    // Close all other sheets first
    document.querySelectorAll('.bottom-sheet').forEach(sheet => sheet.classList.remove('active'));
    
    // Open target sheet
    document.getElementById(sheetId).classList.add('active');
    
    // Highlight the corresponding bottom nav item
    document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.bottom-nav-item[onclick="openBottomSheet('${sheetId}')"]`);
    if (navItem) navItem.classList.add('active');
}

function closeBottomSheet() {
    document.getElementById('bottom-sheet-overlay').classList.remove('active');
    document.querySelectorAll('.bottom-sheet').forEach(sheet => sheet.classList.remove('active'));
    
    // Re-highlight the active module's nav item
    document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
    const activeBottomItem = document.querySelector(`.bottom-nav-item[onclick*="${currentModule}"]`);
    if (activeBottomItem) activeBottomItem.classList.add('active');
}

function toggleSidebarCollapse() {
    if (window.innerWidth > 992) {
        document.body.classList.toggle('sidebar-collapsed');
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
    }
}
window.toggleSidebarCollapse = toggleSidebarCollapse;

// Close sidebar when clicking menu items on mobile
document.addEventListener('click', function (e) {
    if (window.innerWidth <= 992) {
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');

        if (sidebar && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});

window.toggleSidebar = toggleSidebar;

// ==================== FORGOT PASSWORD LOGIC ====================
function openForgotModal() {
    document.getElementById('forgot-modal').style.display = 'flex';
}
function closeForgotModal() {
    document.getElementById('forgot-modal').style.display = 'none';
}
function openOtpModal() {
    document.getElementById('otp-modal').style.display = 'flex';
}
function closeOtpModal() {
    document.getElementById('otp-modal').style.display = 'none';
}
function openNewPassModal() {
    document.getElementById('new-pass-modal').style.display = 'flex';
}
function closeNewPassModal() {
    document.getElementById('new-pass-modal').style.display = 'none';
}

async function handleForgotSubmit() {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) return;

    showLoading('Sending verification code...');
    try {
        const response = await fetch(`${API_BASE}auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification(result.message, 'success');
            closeForgotModal();
            openOtpModal();
        } else {
            showNotification(result.message || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        hideLoading();
        showNotification('Connection Error: ' + error.message, 'error');
    }
}

async function handleOtpVerify() {
    const email = document.getElementById('forgot-email').value.trim();
    const otp = document.getElementById('verify-otp-input').value.trim();

    if (!otp) return;

    showLoading('Verifying code...');
    try {
        const response = await fetch(`${API_BASE}auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Session expired. Please logout and login again.', 'error');
                return;
            }
            const errText = await response.text();
            console.error('API Error:', response.status, errText);
            showNotification(`Error ${response.status}: Failed to load beds`, 'error');
            return;
        }

        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification('Code verified!', 'success');
            closeOtpModal();
            openNewPassModal();
        } else {
            showNotification(result.message || 'Invalid code', 'error');
        }
    } catch (error) {
        console.error('OTP verify error:', error);
        hideLoading();
        showNotification('Connection error.', 'error');
    }
}

async function handleNewPassSubmit() {
    const email = document.getElementById('forgot-email').value.trim();
    const otp = document.getElementById('verify-otp-input').value.trim();
    const newPassword = document.getElementById('final-new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (!newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match!', 'warning');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters.', 'warning');
        return;
    }

    showLoading('Updating password...');
    try {
        const response = await fetch(`${API_BASE}auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification('Password updated! Please login.', 'success');
            closeNewPassModal();
            toggleAuthPanel('login');
        } else {
            showNotification(result.message || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Password update error:', error);
        hideLoading();
        showNotification('Connection error.', 'error');
    }
}

// Expose functions to window
window.openForgotModal = openForgotModal;
window.closeForgotModal = closeForgotModal;
window.openOtpModal = openOtpModal;
window.closeOtpModal = closeOtpModal;
window.openNewPassModal = openNewPassModal;
window.closeNewPassModal = closeNewPassModal;
window.handleForgotSubmit = handleForgotSubmit;
window.handleOtpVerify = handleOtpVerify;
window.handleNewPassSubmit = handleNewPassSubmit;

// ==================== USER PROFILE LOGIC ====================
let profileAuthMode = 'password'; // 'password' or 'otp'
let profileOtpVerified = false;
let profileVerifiedOtpCode = '';
let profileOtpTimerInterval = null;

function toggleProfileAuthMode(mode) {
    profileAuthMode = mode;
    const pwdGroup = document.getElementById('profile-current-pw-group');
    const otpGroup = document.getElementById('profile-otp-group');
    const pwdInput = document.getElementById('profile-current-password');
    const otpInput = document.getElementById('profile-otp-input');

    if (mode === 'otp') {
        pwdGroup.style.display = 'none';
        pwdInput.required = false;
        
        otpGroup.style.display = 'block';
        otpInput.required = true;
        
        // Automatically send OTP when switching to OTP mode
        sendProfileOtp();
    } else {
        pwdGroup.style.display = 'block';
        pwdInput.required = true;
        
        otpGroup.style.display = 'none';
        otpInput.required = false;
        
        // Stop timer if it was running
        if (profileOtpTimerInterval) clearInterval(profileOtpTimerInterval);
        const timerSpan = document.getElementById('profile-otp-timer');
        if (timerSpan) timerSpan.innerHTML = '';
    }
}

async function sendProfileOtp() {
    if (!currentUser || !currentUser.email) {
        showNotification('User email not found.', 'error');
        return;
    }

    showLoading('Sending verification code to your email...');
    try {
        const response = await fetch(`${API_BASE}auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email })
        });
        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification('Verification code sent to your email!', 'success');
            startProfileOtpTimer();
        } else {
            showNotification(result.message || 'Failed to send verification code', 'error');
        }
    } catch (error) {
        console.error('Send profile OTP error:', error);
        hideLoading();
        showNotification('Connection error.', 'error');
    }
}

function startProfileOtpTimer() {
    const timerSpan = document.getElementById('profile-otp-timer');
    if (!timerSpan) return;

    let timeLeft = 60;
    timerSpan.innerHTML = `Resend in ${timeLeft}s`;
    
    if (profileOtpTimerInterval) clearInterval(profileOtpTimerInterval);

    profileOtpTimerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(profileOtpTimerInterval);
            timerSpan.innerHTML = `<a href="#" onclick="sendProfileOtp(); event.preventDefault();" style="color: var(--primary); text-decoration: none; font-weight: 500;">Resend Code</a>`;
        } else {
            timerSpan.innerHTML = `Resend in ${timeLeft}s`;
        }
    }, 1000);
}

async function verifyProfileOtp() {
    const otp = document.getElementById('profile-otp-input').value.trim();
    if (!otp) {
        showNotification('Please enter the verification code.', 'warning');
        return;
    }

    showLoading('Verifying code...');
    try {
        const response = await fetch(`${API_BASE}auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, otp })
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification('Code verified! You can now set a new password.', 'success');
            profileOtpVerified = true;
            profileVerifiedOtpCode = otp;

            // Stop timer and hide it
            if (profileOtpTimerInterval) clearInterval(profileOtpTimerInterval);
            document.getElementById('profile-otp-timer').style.display = 'none';

            // Disable OTP verification controls
            document.getElementById('profile-otp-input').disabled = true;
            document.getElementById('verify-profile-otp-btn').disabled = true;
            document.getElementById('verify-profile-otp-btn').textContent = 'Verified';

            // Enable new password fields
            document.getElementById('new-password-section').style.opacity = '1';
            document.getElementById('new-password-section').style.pointerEvents = 'auto';
            document.getElementById('profile-new-password').disabled = false;
            document.getElementById('profile-confirm-password').disabled = false;
            document.getElementById('save-profile-btn').disabled = false;
        } else {
            showNotification(result.message || 'Invalid or expired code.', 'error');
        }
    } catch (error) {
        console.error('Verify profile OTP error:', error);
        hideLoading();
        showNotification('Connection error.', 'error');
    }
}

function openProfileModal() {
    if (!currentUser) return;

    // Fill profile info
    document.getElementById('profile-name-text').textContent = currentUser.name;
    document.getElementById('profile-role-text').textContent = currentUser.role.toUpperCase();
    document.getElementById('profile-email').textContent = currentUser.email || 'N/A';
    document.getElementById('profile-role-display').textContent = (currentUser.role || 'staff').toUpperCase();

    // Set avatar
    const avatarContainer = document.getElementById('profile-avatar-large');
    if (currentUser.avatar) {
        // Construct full URL (Local backend or Render)
        const baseUrl = API_BASE.replace('/api/', '');
        const fullUrl = currentUser.avatar.startsWith('http') || currentUser.avatar.startsWith('data:') ? currentUser.avatar : `${baseUrl}${currentUser.avatar}`;
        avatarContainer.innerHTML = `<img src="${fullUrl}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="openLightbox('${fullUrl.replace(/'/g, "\\'")}'  , '${(currentUser.name || '').replace(/'/g, "\\\'")}')">`;
    } else {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        avatarContainer.textContent = initials;
        avatarContainer.style.background = 'var(--primary)';
    }

    // Reset fields and states
    profileAuthMode = 'password';
    profileOtpVerified = false;
    profileVerifiedOtpCode = '';
    if (profileOtpTimerInterval) clearInterval(profileOtpTimerInterval);

    document.getElementById('profile-current-password').value = '';
    document.getElementById('profile-current-password').disabled = false;
    document.getElementById('profile-current-password').required = true;
    document.getElementById('verify-pw-btn').disabled = false;
    document.getElementById('verify-pw-btn').textContent = 'Verify';
    document.getElementById('avatar-upload').value = ''; // Reset file input

    // Reset OTP fields
    document.getElementById('profile-otp-input').value = '';
    document.getElementById('profile-otp-input').disabled = false;
    document.getElementById('profile-otp-input').required = false;
    document.getElementById('verify-profile-otp-btn').disabled = false;
    document.getElementById('verify-profile-otp-btn').textContent = 'Verify Code';
    const timerSpan = document.getElementById('profile-otp-timer');
    if (timerSpan) {
        timerSpan.innerHTML = '';
        timerSpan.style.display = 'inline';
    }

    // Show correct default view
    document.getElementById('profile-current-pw-group').style.display = 'block';
    document.getElementById('profile-otp-group').style.display = 'none';

    document.getElementById('new-password-section').style.opacity = '0.5';
    document.getElementById('new-password-section').style.pointerEvents = 'none';
    document.getElementById('profile-new-password').disabled = true;
    document.getElementById('profile-confirm-password').disabled = true;
    document.getElementById('save-profile-btn').disabled = true;

    document.getElementById('profile-modal').style.display = 'flex';
}

function closeProfileModal() {
    if (profileOtpTimerInterval) clearInterval(profileOtpTimerInterval);
    document.getElementById('profile-modal').style.display = 'none';
}

// Compress image using Canvas — resizes to max dimensions and compresses quality
function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Image compression failed'));
                            return;
                        }
                        // Convert blob to File object
                        const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        const originalKB = Math.round(file.size / 1024);
                        const compressedKB = Math.round(compressedFile.size / 1024);
                        console.log(`Image compressed: ${originalKB}KB → ${compressedKB}KB (${width}x${height})`);
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Store compressed file for upload
let compressedAvatarFile = null;
let originalAvatarFile = null;

// Cropper State Variables
let cropZoom = 1.0;
let cropImgX = 0;
let cropImgY = 0;
let baseWidth = 0;
let baseHeight = 0;
let isDraggingCrop = false;
let dragStartMouseX = 0;
let dragStartMouseY = 0;
let dragStartImgX = 0;
let dragStartImgY = 0;
let cropImageObj = null;

function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        originalAvatarFile = file;
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewImg = document.getElementById('crop-preview-img');
            if (previewImg) {
                previewImg.src = e.target.result;
                
                // Wait for the image to load to compute dimensions
                cropImageObj = new Image();
                cropImageObj.onload = function() {
                    const workspaceWidth = 320;
                    const workspaceHeight = 320;
                    const ratio = cropImageObj.naturalWidth / cropImageObj.naturalHeight;
                    
                    // Scale image to cover workspace (320x320)
                    if (ratio > 1) {
                        baseHeight = workspaceHeight;
                        baseWidth = workspaceHeight * ratio;
                    } else {
                        baseWidth = workspaceWidth;
                        baseHeight = workspaceWidth / ratio;
                    }
                    
                    // Center the image in workspace
                    cropZoom = 1.0;
                    cropImgX = (workspaceWidth - baseWidth) / 2;
                    cropImgY = (workspaceHeight - baseHeight) / 2;
                    
                    // Reset zoom slider
                    const zoomSlider = document.getElementById('crop-zoom');
                    if (zoomSlider) {
                        zoomSlider.value = 1.0;
                    }
                    
                    updateCropImageUI();
                    initCropEvents();
                    
                    // Show crop modal
                    document.getElementById('crop-modal').style.display = 'flex';
                };
                cropImageObj.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
}

function updateCropImageUI() {
    const previewImg = document.getElementById('crop-preview-img');
    if (!previewImg) return;
    
    const w = baseWidth * cropZoom;
    const h = baseHeight * cropZoom;
    
    previewImg.style.width = `${w}px`;
    previewImg.style.height = `${h}px`;
    previewImg.style.left = `${cropImgX}px`;
    previewImg.style.top = `${cropImgY}px`;
}

function handleCropZoom(zoomVal) {
    const prevZoom = cropZoom;
    cropZoom = parseFloat(zoomVal);
    
    const cx = 160; // Workspace center X
    const cy = 160; // Workspace center Y
    
    const pctX = (cx - cropImgX) / (baseWidth * prevZoom);
    const pctY = (cy - cropImgY) / (baseHeight * prevZoom);
    
    let nextX = cx - pctX * baseWidth * cropZoom;
    let nextY = cy - pctY * baseHeight * cropZoom;
    
    // Constrain so crop circle (220x220 at center) is covered.
    // Crop box is from 50 to 270 on both axes.
    const w = baseWidth * cropZoom;
    const h = baseHeight * cropZoom;
    
    if (nextX > 50) nextX = 50;
    if (nextX + w < 270) nextX = 270 - w;
    if (nextY > 50) nextY = 50;
    if (nextY + h < 270) nextY = 270 - h;
    
    cropImgX = nextX;
    cropImgY = nextY;
    
    updateCropImageUI();
}

let cropEventsBound = false;
function initCropEvents() {
    if (cropEventsBound) return;
    const workspace = document.getElementById('crop-workspace');
    if (!workspace) return;
    
    const dragStart = (e) => {
        isDraggingCrop = true;
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        dragStartMouseX = clientX;
        dragStartMouseY = clientY;
        dragStartImgX = cropImgX;
        dragStartImgY = cropImgY;
        
        // Prevent default browser dragging
        if (e.cancelable) e.preventDefault();
    };
    
    const dragMove = (e) => {
        if (!isDraggingCrop) return;
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : dragStartMouseX);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : dragStartMouseY);
        const dx = clientX - dragStartMouseX;
        const dy = clientY - dragStartMouseY;
        
        let nextX = dragStartImgX + dx;
        let nextY = dragStartImgY + dy;
        
        const w = baseWidth * cropZoom;
        const h = baseHeight * cropZoom;
        
        // Crop box: X [50, 270], Y [50, 270] (center 220x220 area in 320x320 workspace)
        if (nextX > 50) nextX = 50;
        if (nextX + w < 270) nextX = 270 - w;
        if (nextY > 50) nextY = 50;
        if (nextY + h < 270) nextY = 270 - h;
        
        cropImgX = nextX;
        cropImgY = nextY;
        updateCropImageUI();
    };
    
    const dragEnd = () => {
        isDraggingCrop = false;
    };
    
    // Mouse Events
    workspace.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    
    // Touch Events
    workspace.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
    
    cropEventsBound = true;
}

function closeCropModal() {
    document.getElementById('crop-modal').style.display = 'none';
    document.getElementById('avatar-upload').value = ''; // Clear file input
}

function applyCrop() {
    if (!cropImageObj) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 400; // Output cropped width
    canvas.height = 400; // Output cropped height
    const ctx = canvas.getContext('2d');
    
    // Calculate cropped area
    // Workspace coordinates of the crop area: X: 50, Y: 50, size: 220
    const cropSize = 220;
    const w = baseWidth * cropZoom;
    const h = baseHeight * cropZoom;
    
    // Relative coordinates of crop box top-left inside the image in workspace coordinates
    const cropXInImg = 50 - cropImgX;
    const cropYInImg = 50 - cropImgY;
    
    // Scale factor to map workspace coordinates to natural image dimensions
    const scaleX = cropImageObj.naturalWidth / w;
    const scaleY = cropImageObj.naturalHeight / h;
    
    const sx = cropXInImg * scaleX;
    const sy = cropYInImg * scaleY;
    const sw = cropSize * scaleX;
    const sh = cropSize * scaleY;
    
    // Draw onto canvas
    ctx.drawImage(cropImageObj, sx, sy, sw, sh, 0, 0, 400, 400);
    
    canvas.toBlob((blob) => {
        if (!blob) {
            showNotification('Failed to generate crop image', 'error');
            return;
        }
        
        const filename = originalAvatarFile ? originalAvatarFile.name.replace(/\.\w+$/, '.jpg') : 'avatar.jpg';
        compressedAvatarFile = new File([blob], filename, {
            type: 'image/jpeg',
            lastModified: Date.now()
        });
        
        // Show preview in profile modal
        const croppedSizeKB = Math.round(compressedAvatarFile.size / 1024);
        console.log(`Cropped image size: ${croppedSizeKB}KB`);
        
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('profile-avatar-large').innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
            
            // Auto-upload immediately upon cropping
            saveProfilePhoto();
        };
        reader.readAsDataURL(compressedAvatarFile);
        
        closeCropModal();
    }, 'image/jpeg', 0.85);
}

async function saveProfilePhoto() {
    // Use compressed file if available, fallback to original
    const avatarFile = compressedAvatarFile || document.getElementById('avatar-upload').files[0];
    if (!avatarFile) return;

    const formData = new FormData();
    formData.append('avatar', avatarFile);

    showLoading('Uploading photo...');
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}auth/users/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification('Photo updated successfully!', 'success');
            if (result.user.avatar) currentUser.avatar = result.user.avatar;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserInfo();
            const photoBtn = document.getElementById('save-photo-btn');
            if (photoBtn) photoBtn.style.display = 'none';
            compressedAvatarFile = null; // Clear after successful upload
        } else {
            showNotification(result.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Photo upload error:', error);
        hideLoading();
        showNotification('Connection error.', 'error');
    }
}

async function checkCurrentPassword() {
    const currentPassword = document.getElementById('profile-current-password').value;
    if (!currentPassword) {
        showNotification('Please enter your current password.', 'warning');
        return;
    }

    showLoading('Verifying...');
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            hideLoading();
            showNotification('Session expired. Please logout and login again.', 'error');
            return;
        }

        const response = await fetch(`${API_BASE}auth/verify-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword })
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification('Password verified! You can now set a new password.', 'success');

            // Enable new password fields
            document.getElementById('profile-current-password').disabled = true;
            document.getElementById('verify-pw-btn').disabled = true;
            document.getElementById('verify-pw-btn').textContent = 'Verified';

            document.getElementById('new-password-section').style.opacity = '1';
            document.getElementById('new-password-section').style.pointerEvents = 'auto';
            document.getElementById('profile-new-password').disabled = false;
            document.getElementById('profile-confirm-password').disabled = false;
            document.getElementById('save-profile-btn').disabled = false;
        } else {
            showNotification(result.message || 'Incorrect password', 'error');
        }
    } catch (error) {
        console.error('Password verify error:', error);
        hideLoading();
        showNotification('Connection error.', 'error');
    }
}

async function saveProfileChanges() {
    const newPassword = document.getElementById('profile-new-password').value;
    const confirmPassword = document.getElementById('profile-confirm-password').value;

    if (!newPassword) {
        showNotification('Please enter a new password.', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('Passwords do not match!', 'warning');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters.', 'warning');
        return;
    }

    showLoading('Updating password...');
    try {
        const token = localStorage.getItem('token');
        
        let response;
        if (profileAuthMode === 'otp' && profileOtpVerified) {
            // Reset password using OTP
            response = await fetch(`${API_BASE}auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentUser.email,
                    otp: profileVerifiedOtpCode,
                    newPassword: newPassword
                })
            });
        } else {
            // Standard update
            response = await fetch(`${API_BASE}auth/users/${currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: newPassword })
            });
        }

        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification('Password updated successfully!', 'success');
            closeProfileModal();
        } else {
            showNotification(result.message || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        hideLoading();
        showNotification('Connection error.', 'error');
    }
}

window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.previewAvatar = previewAvatar;
window.saveProfilePhoto = saveProfilePhoto;
window.checkCurrentPassword = checkCurrentPassword;
window.saveProfileChanges = saveProfileChanges;
window.toggleProfileAuthMode = toggleProfileAuthMode;
window.sendProfileOtp = sendProfileOtp;
window.verifyProfileOtp = verifyProfileOtp;

// ==================== FCM PUSH NOTIFICATIONS ====================
function loadScript(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

async function initPushNotifications() {
    console.log("Initializing push notifications...");
    
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.warn('Push notifications not supported in this browser.');
        return;
    }

    let apiKey, projectId, messagingSenderId, appId, vapidKey;
    try {
        const response = await fetch(`${API_BASE}integrations/config`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        if (!response.ok) return;
        const result = await response.json();
        if (result.success && result.config) {
            apiKey = result.config.apiKey;
            projectId = result.config.projectId;
            messagingSenderId = result.config.messagingSenderId;
            appId = result.config.appId;
            vapidKey = result.config.vapidKey;
        }
    } catch (e) {
        console.error('Error fetching FCM configuration from backend:', e);
        return;
    }

    if (!apiKey || !projectId || !messagingSenderId || !appId || !vapidKey) {
        console.log('FCM frontend is not fully configured in env. Skipping registration.');
        return;
    }

    try {
        // Load Firebase client scripts dynamically if not present
        if (typeof firebase === 'undefined') {
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
        }
        if (typeof firebase === 'undefined' || !firebase.messaging) {
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');
        }

        // Initialize Firebase if not already initialized
        if (firebase.apps.length === 0) {
            firebase.initializeApp({
                apiKey,
                authDomain: `${projectId}.firebaseapp.com`,
                projectId,
                storageBucket: `${projectId}.appspot.com`,
                messagingSenderId,
                appId
            });
        }

        const messaging = firebase.messaging();

        // Register service worker if not already registered
        const swUrl = `firebase-messaging-sw.js?projectId=${projectId}&messagingSenderId=${messagingSenderId}&appId=${appId}&apiKey=${apiKey}`;
        const registration = await navigator.serviceWorker.register(swUrl);
        console.log('FCM Service Worker registered successfully:', registration);

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission not granted.');
            return;
        }

        // Wait for service worker to become active
        const readyRegistration = await navigator.serviceWorker.ready;

        // Get token
        const token = await messaging.getToken({
            vapidKey: vapidKey,
            serviceWorkerRegistration: readyRegistration
        });

        if (token) {
            console.log('FCM Token generated successfully:', token);
            window.fcmToken = token;
            localStorage.setItem('fcmToken', token);

            // Sync with backend
            const response = await fetch(`${API_BASE}auth/fcm-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({ fcmToken: token })
            });
            const result = await response.json();
            if (result.success) {
                console.log('FCM Token synced to backend successfully');
            } else {
                console.error('Failed to sync FCM Token to backend:', result.message);
            }
        } else {
            console.warn('No FCM token received. Check your project config/VAPID key.');
        }

        // Handle incoming messages when the app is in the foreground
        messaging.onMessage((payload) => {
            console.log('Foreground notification received:', payload);
            const title = payload.notification?.title || 'Notification';
            const body = payload.notification?.body || '';
            showNotification(body, 'info', title);
        });

    } catch (error) {
        console.error('Error during FCM push notification setup:', error);
    }
}

window.initPushNotifications = initPushNotifications;

// Expose crop functions to global scope
window.previewAvatar = previewAvatar;
window.handleCropZoom = handleCropZoom;
window.closeCropModal = closeCropModal;
window.applyCrop = applyCrop;

// Handle browser Back/Forward (hash change) events for step-wise navigation
window.addEventListener('hashchange', function () {
    if (!currentUser) return; // Only handle routing when user is logged in
    const hash = window.location.hash.substring(1);
    if (hash && hash !== currentModule) {
        showModule(hash, true);
    }
});

// Helper for UI Back buttons to maintain native history stack
window.goBack = function(fallbackModule = 'dashboard') {
    // If the history has enough states (more than just the initial load)
    if (window.history.state !== null && window.history.length > 2) {
        window.history.back();
    } else {
        showModule(fallbackModule);
    }
};

// ==================== GLOBAL NETWORK INTERCEPTOR & STATUS LISTENERS ====================
// 1. Live online/offline browser connection status listeners
window.addEventListener('offline', function () {
    showNotification('No Internet Connection. Some features may not work offline.', 'warning', 'Network Offline');
});

window.addEventListener('online', function () {
    showNotification('Internet connection restored. Reconnected to server.', 'success', 'Network Online');
});

// 2. Global fetch interceptor to catch any connection failure when offline
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    if (!navigator.onLine) {
        showNotification('No Internet Connection. Please check your network and try again.', 'error', 'Network Error');
        throw new Error('TypeError: Failed to fetch due to offline status');
    }
    try {
        const response = await originalFetch(...args);
        
        // Global 401 Interceptor: If session is expired or concurrent login kicks user out
        if (response.status === 401) {
            // Check if we are already logged out to prevent infinite loops or spam
            if (localStorage.getItem('token')) {
                showNotification('Session expired. Your account was logged in from another device.', 'error', 'Security Alert');
                setTimeout(() => {
                    confirmLogout();
                }, 2000);
            }
        }
        
        return response;
    } catch (error) {
        // If fetch fails and we are offline, show a professional connection warning
        if (!navigator.onLine) {
            showNotification('No Internet Connection. Please check your network and try again.', 'error', 'Network Error');
            throw new Error('TypeError: Failed to fetch due to offline status');
        }
        throw error;
    }
};

// Global helper function to toggle password visibility
function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('bi-eye');
        iconElement.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        iconElement.classList.remove('bi-eye-slash');
        iconElement.classList.add('bi-eye');
    }
}

// Global floating label behavior for mobile view (Pure Event Delegation)
function getInputContainer(input) {
    const group = input.closest('.form-group, .input-group');
    if (group) return group;
    
    // Only resolve plain parent div if it's inside surgery grids
    const surgeryGroup = input.closest('.surgery-form-grid > div, .surgery-consent-grid div > div');
    if (surgeryGroup) return surgeryGroup;
    
    return null;
}

function updateGroupFloatingState(group) {
    const input = group.querySelector('input, textarea, select');
    if (input) {
        const hasValue = input.value && input.value.trim() !== '';
        const isAutofilled = input.matches && (
            input.matches(':-webkit-autofill') || 
            input.matches(':autofill')
        );

        if (hasValue || isAutofilled) {
            group.classList.add('has-value');
        } else {
            group.classList.remove('has-value');
        }
    }
}

// Global window event triggers for floating state management
document.addEventListener('focusin', (e) => {
    const container = getInputContainer(e.target);
    if (container) {
        container.classList.add('focused');
    }
});

document.addEventListener('focusout', (e) => {
    const container = getInputContainer(e.target);
    if (container) {
        container.classList.remove('focused');
        updateGroupFloatingState(container);
    }
});

document.addEventListener('input', (e) => {
    const container = getInputContainer(e.target);
    if (container) {
        updateGroupFloatingState(container);
    }
});

document.addEventListener('change', (e) => {
    const container = getInputContainer(e.target);
    if (container) {
        updateGroupFloatingState(container);
    }
});

// Periodic scanner (every 500ms) to ensure auto-filled values by password managers/Google get floats
setInterval(() => {
    document.querySelectorAll('.form-group, .input-group, .surgery-form-grid > div, .surgery-consent-grid div > div').forEach(updateGroupFloatingState);
}, 500);

// Initial run for static content
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.form-group, .input-group, .surgery-form-grid > div, .surgery-consent-grid div > div').forEach(updateGroupFloatingState);
});

