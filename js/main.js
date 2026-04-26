// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentModule = 'dashboard';
// Use local IP for same-wifi mobile access, or the Render URL for production
const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.'))
    ? `http://${window.location.hostname}:5000/api/`
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
            sessionStorage.setItem('token', result.token || 'authenticated');

            hideLoading();
            showNotification('Login successful!', 'success', 'Welcome');
            switchToApp();
        } else {
            document.getElementById('login-error').textContent = result.message || 'Invalid credentials';
            hideLoading();
        }
    } catch (error) {
        console.error('Login error:', error);
        // LocalStorage fallback for Login
        let storedUsers = JSON.parse(localStorage.getItem('users'));
        if (!storedUsers || storedUsers.length === 0) {
            storedUsers = [
                { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'System Admin', email: 'admin@hospital.com', status: 'active' },
                { id: 2, username: 'doctor', password: '123456', role: 'doctor', name: 'Dr. Sharma', email: 'doctor@hospital.com', status: 'active' },
                { id: 3, username: 'reception', password: '123456', role: 'receptionist', name: 'Receptionist', email: 'reception@hospital.com', status: 'active' },
                { id: 4, username: 'nurse', password: '123456', role: 'staff', name: 'Nurse Priya', email: 'nurse@hospital.com', status: 'active' }
            ];
            localStorage.setItem('users', JSON.stringify(storedUsers));
        }

        const validUser = storedUsers.find(u => u.username === username && u.password === password);

        if (validUser) {
            if (validUser.status !== 'active') {
                let errorMsg = 'Your account is inactive.';
                if (validUser.status === 'pending') errorMsg = 'Your account is pending administrator approval.';
                if (validUser.status === 'rejected') errorMsg = 'Your account has been rejected. Please contact the administrator.';

                document.getElementById('login-error').textContent = errorMsg;
                hideLoading();
                return;
            }

            currentUser = {
                id: validUser.id,
                username: validUser.username,
                role: validUser.role,
                name: validUser.name,
                email: validUser.email,
                mobile: validUser.mobile || ''
            };

            sessionStorage.setItem('user', JSON.stringify(currentUser));
            sessionStorage.setItem('token', 'authenticated');

            hideLoading();
            showNotification('Login successful!', 'success', 'Welcome');
            switchToApp();
        } else {
            document.getElementById('login-error').textContent = 'Invalid credentials';
            hideLoading();
        }
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
        setTimeout(() => {
            let storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
            if (storedUsers.some(u => u.username === username)) {
                hideLoading();
                document.getElementById('signup-error').textContent = 'Username already exists';
                return;
            }

            storedUsers.push({
                id: Date.now(),
                username: username,
                password: password,
                role: role,
                name: name,
                email: email,
                mobile: mobile,
                status: 'pending' // New signups remain pending until admin approval
            });
            localStorage.setItem('users', JSON.stringify(storedUsers));

            hideLoading();
            showNotification('Account created! Pending admin approval.', 'success', 'Signup Complete');
            document.getElementById('signup-form').reset();
            toggleAuthPanel('login');
        }, 1000);
    }
}

function switchToApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    updateUserInfo();
    updateClock();
    setInterval(updateClock, 1000);
    loadModule('dashboard');
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
            if (currentUser.name && currentUser.name.trim().length > 0) {
                const initials = currentUser.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatarDiv.textContent = initials;
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
                case 'doctor': isVisible = ['dashboard', 'patients', 'daily-notes', 'discharge', 'patient-record', 'billing'].includes(module); break;
                case 'staff': isVisible = ['dashboard', 'patients', 'daily-notes'].includes(module); break;
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

function showModule(moduleName) {
    const role = currentUser?.role || 'admin';

    // Security check for unauthorized module access via console
    const permissions = {
        'admin': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'billing', 'discharge', 'users', 'reports', 'settings', 'patient-record'],
        'doctor': ['dashboard', 'patients', 'daily-notes', 'discharge', 'patient-record', 'billing'],
        'staff': ['dashboard', 'patients', 'daily-notes'],
        'receptionist': ['dashboard', 'patients', 'add-patient']
    };

    const allowedModules = permissions[role] || ['dashboard'];

    if (!allowedModules.includes(moduleName)) {
        showNotification('Access Denied: You do not have permission for this module.', 'error', 'Security');
        return;
    }

    currentModule = moduleName;
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector(`.menu-item[onclick*="'${moduleName}'"]`);
    if (activeItem) activeItem.classList.add('active');

    // Close sidebar on mobile after selecting a module
    if (window.innerWidth <= 992) {
        document.querySelector('.sidebar').classList.remove('active');
    }

    loadModule(moduleName);
}

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
function showModule(moduleName) {
    const role = currentUser?.role || 'admin';
    const isAdminOnly = ['settings', 'reports', 'users'].includes(moduleName);
    const isAdminOrDoctor = ['patient-record'].includes(moduleName);

    if (isAdminOnly && role !== 'admin') {
        showNotification('Access Denied: Restricted to Administrator.', 'error', 'Security');
        return;
    }
    if (isAdminOrDoctor && role !== 'admin' && role !== 'doctor') {
        showNotification('Access Denied: Restricted to Admin/Doctor.', 'error', 'Security');
        return;
    }

    currentModule = moduleName;

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector(`.menu-item[onclick*="${moduleName}"]`);
    if (activeItem) activeItem.classList.add('active');

    // Close sidebar on mobile after selecting a module
    if (window.innerWidth <= 992) {
        document.querySelector('.sidebar').classList.remove('active');
    }

    loadModule(moduleName);
}

function loadModule(moduleName) {
    document.querySelectorAll('.module-content').forEach(module => module.classList.remove('active'));

    const moduleEl = document.getElementById(`module-${moduleName}`);
    if (moduleEl) {
        moduleEl.classList.add('active');

        const titles = {
            'patient-record': 'In-Patient Record Registry',
            'dashboard': 'Dashboard',
            'patients': 'Patient Management',
            'add-patient': 'Add New Patient',
            'daily-notes': 'Daily Treatment Notes',
            'billing': 'Billing & Payments',
            'discharge': 'Patient Discharge',
            'users': 'User Management',
            'reports': 'Reports & Analytics',
            'settings': 'System Settings'
        };

        document.getElementById('page-title').textContent = titles[moduleName] || moduleName;

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