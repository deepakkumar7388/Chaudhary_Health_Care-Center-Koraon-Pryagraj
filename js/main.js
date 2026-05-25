// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentModule = 'dashboard';
// Use local IP for same-wifi mobile access, or the Render URL for production
// Point to local backend for testing new features
let API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5000/api/'
    : 'https://chaudhary-hms-api.onrender.com/api/';


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

function showNotification(message, type = 'info', title = 'Notification') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    const icon = notification.querySelector('.notification-icon i');
    const titleEl = document.getElementById('notification-title');
    const messageEl = document.getElementById('notification-message');

    notification.className = `notification ${type}`;
    icon.className = type === 'success' ? 'fas fa-check-circle' :
        type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
    titleEl.textContent = title;
    messageEl.textContent = message;
    notification.style.display = 'flex';

    setTimeout(() => notification.style.display = 'none', 5000);
}

function hideNotification() {
    document.getElementById('notification').style.display = 'none';
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
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        document.getElementById('login-error').textContent = 'Please fill all fields';
        return;
    }

    showLoading('Authenticating...');

    try {
        const response = await fetch(`${API_BASE}auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            currentUser = {
                id: result.user_id,
                username: result.username,
                name: result.name,
                role: result.role,
                email: result.email,
                mobile: result.mobile
            };

            sessionStorage.setItem('user', JSON.stringify(currentUser));
            sessionStorage.setItem('token', result.token);

            hideLoading();
            showNotification('Login successful!', 'success', 'Welcome');
            switchToApp();
        } else {
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
                document.getElementById('login-error').textContent = result.message || 'Invalid credentials';
            }
        }
    } catch (error) {
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

async function signup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const mobile = document.getElementById('signup-mobile').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const role = document.getElementById('signup-role').value;

    const errors = [];
    if (!name) errors.push('Name required');
    if (!email) errors.push('Email required');
    if (!mobile || mobile.length !== 10) errors.push('Valid mobile required');
    if (!username) errors.push('Username required');
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
        const response = await fetch(`${API_BASE}auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, mobile, username, password, role })
        });

        const result = await response.json();

        if (result.success) {
            hideLoading();
            showNotification('Account created! Pending admin approval.', 'success', 'Signup Complete');
            document.getElementById('signup-form').reset();
            toggleAuthPanel('login');
        } else {
            document.getElementById('signup-error').textContent = result.message || 'Signup failed';
            hideLoading();
        }
    } catch (error) {
        console.error('Signup error:', error);
        hideLoading();
        showNotification('Connection error while creating account. Please try again.', 'error');
        document.getElementById('signup-error').textContent = 'Cannot connect to server';
    }
}

async function switchToApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    if (typeof applyGlobalSettings === 'function') {
        await applyGlobalSettings();
    }
    updateUserInfo();
    updateClock();
    setInterval(updateClock, 1000);

    // Handle initial routing based on URL hash
    const hash = window.location.hash.substring(1);
    if (hash) {
        showModule(hash, true);
    } else {
        showModule('dashboard', true);
        window.history.replaceState(null, '', '#dashboard');
    }

    // Initialize push notifications
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
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    currentUser = null;

    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    toggleAuthPanel('login');
    showNotification('You have been logged out successfully', 'info', 'Goodbye');
    window.location.hash = '';
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('current-user').textContent = currentUser.name;
        const roleEl = document.getElementById('current-user-role');
        if (roleEl) {
            roleEl.textContent = currentUser.role.toUpperCase();
            // Optional: style based on role
            const colors = { 'admin': '#ef4444', 'doctor': '#3b82f6', 'staff': '#9333ea', 'receptionist': '#ca8a04' };
            roleEl.style.background = colors[currentUser.role] || '#64748b';
            roleEl.style.color = 'white';
            roleEl.style.borderRadius = '4px';
        }

        const avatarDiv = document.getElementById('sidebar-avatar');
        if (avatarDiv) {
            console.log("Updating Sidebar Avatar. Current User Data:", currentUser);
            if (currentUser.avatar) {
                // Construct full URL
                const baseUrl = API_BASE.replace('/api/', '');
                const fullUrl = currentUser.avatar.startsWith('http') ? currentUser.avatar : `${baseUrl}${currentUser.avatar}`;
                console.log("Loading Sidebar Avatar from:", fullUrl);
                avatarDiv.innerHTML = `<img src="${fullUrl}" alt="User" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else if (currentUser.name && currentUser.name.trim().length > 0) {
                const initials = currentUser.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatarDiv.textContent = initials;
                avatarDiv.innerHTML = initials; // Ensure text is set
                avatarDiv.style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)';
            } else {
                avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
            }
        }

        const role = currentUser.role;

        // Admin Menu visibility
        const adminMenu = document.getElementById('admin-menu');
        if (adminMenu) {
            adminMenu.style.display = (role === 'admin' || role === 'doctor') ? 'block' : 'none';
        }

        document.querySelectorAll('.menu-item').forEach(item => {
            const moduleAttr = item.getAttribute('onclick');
            if (!moduleAttr) return;
            const module = moduleAttr.match(/'([^']+)'/)?.[1];
            if (!module) return;

            let isVisible = false;
            switch (role) {
                case 'admin': isVisible = true; break;
                case 'doctor': isVisible = ['dashboard', 'patients', 'add-patient', 'daily-notes', 'discharge', 'patient-record', 'billing'].includes(module); break;
                case 'staff': isVisible = ['dashboard', 'patients', 'add-patient', 'daily-notes'].includes(module); break;
                case 'receptionist': isVisible = ['dashboard', 'patients', 'add-patient'].includes(module); break;
                default: isVisible = ['dashboard'].includes(module);
            }
            item.style.display = isVisible ? 'flex' : 'none';
        });

        updateSidebarStats();
    }
}

async function updateSidebarStats() {
    try {
        const pRes = await fetch(`${API_BASE}patients`, { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') } });
        const pData = await pRes.json();
        const uRes = await fetch(`${API_BASE}auth/users`, { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') } });
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

        const role = currentUser?.role || 'admin';
        if (role === 'admin') {
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
    const role = currentUser?.role || 'admin';

    // Security check for unauthorized module access
    const permissions = {
        'admin': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'billing', 'discharge', 'users', 'reports', 'settings', 'patient-record'],
        'doctor': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'discharge', 'patient-record', 'billing'],
        'staff': ['dashboard', 'patients', 'add-patient', 'daily-notes'],
        'receptionist': ['dashboard', 'patients', 'add-patient']
    };

    const allowedModules = permissions[role] || ['dashboard'];

    if (!allowedModules.includes(moduleName)) {
        showNotification('Access Denied: You do not have permission for this module.', 'error', 'Security');
        // Revert hash if it differs from currentModule to keep URL in sync
        if (window.location.hash.substring(1) !== currentModule) {
            window.location.hash = currentModule || 'dashboard';
        }
        return;
    }

    currentModule = moduleName;

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector(`.menu-item[onclick*="${moduleName}"]`);
    if (activeItem) activeItem.classList.add('active');

    // Close sidebar on mobile after selecting a module
    if (window.innerWidth <= 992) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('active');
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
                if (typeof loadDischargePatients === 'function') loadDischargePatients();
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
    if (localStorage.getItem('sidebarCollapsed') === 'true' && window.innerWidth > 992) {
        document.body.classList.add('sidebar-collapsed');
    }

    migratePatientIds(); // Run once to clean old IDs

    const savedUser = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');

    if (savedUser && token) {
        currentUser = JSON.parse(savedUser);
        switchToApp();
    } else {
        toggleAuthPanel('login');
    }

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
    sidebar.classList.toggle('active');
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
function openProfileModal() {
    if (!currentUser) return;

    // Fill profile info
    document.getElementById('profile-name-text').textContent = currentUser.name;
    document.getElementById('profile-role-text').textContent = currentUser.role.toUpperCase();
    document.getElementById('profile-username').textContent = currentUser.username;
    document.getElementById('profile-email').textContent = currentUser.email || 'N/A';

    // Set avatar
    const avatarContainer = document.getElementById('profile-avatar-large');
    if (currentUser.avatar) {
        // Construct full URL (Local backend or Render)
        const baseUrl = API_BASE.replace('/api/', '');
        const fullUrl = currentUser.avatar.startsWith('http') ? currentUser.avatar : `${baseUrl}${currentUser.avatar}`;
        avatarContainer.innerHTML = `<img src="${fullUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        avatarContainer.textContent = initials;
        avatarContainer.style.background = 'var(--primary)';
    }

    // Reset fields and states
    document.getElementById('profile-current-password').value = '';
    document.getElementById('profile-current-password').disabled = false;
    document.getElementById('verify-pw-btn').disabled = false;
    document.getElementById('verify-pw-btn').textContent = 'Verify';
    document.getElementById('avatar-upload').value = ''; // Reset file input

    document.getElementById('new-password-section').style.opacity = '0.5';
    document.getElementById('new-password-section').style.pointerEvents = 'none';
    document.getElementById('profile-new-password').disabled = true;
    document.getElementById('profile-confirm-password').disabled = true;
    document.getElementById('save-profile-btn').disabled = true;

    document.getElementById('profile-modal').style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('profile-avatar-large').innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
            const photoBtn = document.getElementById('save-photo-btn');
            if (photoBtn) photoBtn.style.display = 'block'; // Show button after selection
        };
        reader.readAsDataURL(file);
    }
}

async function saveProfilePhoto() {
    const avatarFile = document.getElementById('avatar-upload').files[0];
    if (!avatarFile) return;

    const formData = new FormData();
    formData.append('avatar', avatarFile);

    showLoading('Uploading photo...');
    try {
        const token = sessionStorage.getItem('token');
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
            sessionStorage.setItem('user', JSON.stringify(currentUser));
            updateUserInfo();
            const photoBtn = document.getElementById('save-photo-btn');
            if (photoBtn) photoBtn.style.display = 'none';
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
        const token = sessionStorage.getItem('token');
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
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE}auth/users/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password: newPassword })
        });

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
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
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
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('FCM Service Worker registered successfully:', registration);

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission not granted.');
            return;
        }

        // Get token
        const token = await messaging.getToken({
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('FCM Token generated successfully:', token);
            window.fcmToken = token;
            sessionStorage.setItem('fcmToken', token);

            // Sync with backend
            const response = await fetch(`${API_BASE}auth/fcm-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
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

// Handle browser Back/Forward (hash change) events for step-wise navigation
window.addEventListener('hashchange', function () {
    if (!currentUser) return; // Only handle routing when user is logged in
    const hash = window.location.hash.substring(1);
    if (hash && hash !== currentModule) {
        showModule(hash, true);
    }
});