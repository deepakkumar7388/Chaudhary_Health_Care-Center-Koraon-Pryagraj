// ==================== SETTINGS MODULE ====================

function renderSettings() {
    const role = currentUser?.role || 'admin';
    if (role !== 'admin') {
        const moduleEl = document.getElementById('module-settings');
        if (moduleEl) {
            moduleEl.innerHTML = `
                <div style="display:flex; height:80vh; align-items:center; justify-content:center; flex-direction:column; color:#e74c3c; gap:20px;">
                    <i class="fas fa-lock" style="font-size:48px;"></i>
                    <h2 style="margin:0;">Access Denied</h2>
                    <p style="margin:0; color:#666;">You do not have permission to access System Settings.</p>
                </div>
            `;
        }
        return;
    }

    const moduleEl = document.getElementById('module-settings');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="settings-container">
            <div class="module-header">
                <h2>System Settings</h2>
                <button class="btn-success" onclick="saveSettings()">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
            
            <div class="settings-tabs" style="display:flex; gap:10px; margin-bottom:25px; border-bottom:2px solid #e0e0e0; padding-bottom:5px;">
                <button class="tab-btn active" onclick="showSettingsTab('general')">General</button>
                <button class="tab-btn" onclick="showSettingsTab('billing')">Billing</button>
                <button class="tab-btn" onclick="showSettingsTab('notifications')">Notifications</button>
                <button class="tab-btn" onclick="showSettingsTab('security')">Security</button>
                <button class="tab-btn" onclick="showSettingsTab('users')">User Settings</button>
            </div>
            
            <div class="settings-form" id="settings-content">
                <!-- General Settings -->
                <div id="settings-general" class="settings-tab-content active">
                    <div class="form-section">
                        <h3><i class="fas fa-hospital"></i> Hospital Information</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Hospital Name</label>
                                <input type="text" id="hospital-name" class="search-input" value="City Hospital">
                            </div>
                            <div class="form-group">
                                <label>Hospital Address</label>
                                <input type="text" id="hospital-address" class="search-input" value="123 Medical Street, City">
                            </div>
                            <div class="form-group">
                                <label>Contact Number</label>
                                <input type="tel" id="hospital-contact" class="search-input" value="1800-123-4567">
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="hospital-email" class="search-input" value="info@cityhospital.com">
                            </div>
                            <div class="form-group">
                                <label>Website</label>
                                <input type="url" id="hospital-website" class="search-input" value="www.cityhospital.com">
                            </div>
                            <div class="form-group">
                                <label>Registration Number</label>
                                <input type="text" id="hospital-reg" class="search-input" value="HOSP/2024/001">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3><i class="fas fa-palette"></i> Appearance</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Theme Mode</label>
                                <select id="theme-mode" class="filter-select">
                                    <option value="light" selected>Light Mode</option>
                                    <option value="dark">Dark Mode</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Theme Color</label>
                                <select id="theme-color" class="filter-select">
                                    <option value="green" selected>Green (Default)</option>
                                    <option value="blue">Blue</option>
                                    <option value="purple">Purple</option>
                                    <option value="red">Red</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Date Format</label>
                                <select id="date-format" class="filter-select">
                                    <option value="dd/mm/yyyy" selected>DD/MM/YYYY</option>
                                    <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                                    <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Time Format</label>
                                <select id="time-format" class="filter-select">
                                    <option value="12h" selected>12 Hour (AM/PM)</option>
                                    <option value="24h">24 Hour</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Language</label>
                                <select id="language" class="filter-select">
                                    <option value="en" selected>English</option>
                                    <option value="hi">Hindi</option>
                                    <option value="gu">Gujarati</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Billing Settings -->
                <div id="settings-billing" class="settings-tab-content" style="display:none;">
                    <div class="form-section">
                        <h3><i class="fas fa-money-bill"></i> Billing Settings</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Currency Symbol</label>
                                <input type="text" id="currency-symbol" class="search-input" value="₹" maxlength="3">
                            </div>
                            <div class="form-group">
                                <label>Tax Rate (%)</label>
                                <input type="number" id="tax-rate" class="search-input" value="18" step="0.1" min="0" max="100">
                            </div>
                            <div class="form-group">
                                <label>Consultation Fee (₹)</label>
                                <input type="number" id="consultation-fee" class="search-input" value="500" min="0">
                            </div>
                            <div class="form-group">
                                <label>General Ward Charge/Day (₹)</label>
                                <input type="number" id="ward-charge" class="search-input" value="2000" min="0">
                            </div>
                            <div class="form-group">
                                <label>ICU Charge/Day (₹)</label>
                                <input type="number" id="icu-charge" class="search-input" value="5000" min="0">
                            </div>
                            <div class="form-group">
                                <label>Emergency Charge (₹)</label>
                                <input type="number" id="emergency-charge" class="search-input" value="1000" min="0">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3><i class="fas fa-file-invoice"></i> Invoice Settings</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Invoice Prefix</label>
                                <input type="text" id="invoice-prefix" class="search-input" value="INV">
                            </div>
                            <div class="form-group">
                                <label>Next Invoice Number</label>
                                <input type="number" id="next-invoice" class="search-input" value="1001">
                            </div>
                            <div class="form-group checkbox" style="grid-column:span 2;">
                                <input type="checkbox" id="auto-generate-bill" checked>
                                <label for="auto-generate-bill">Auto-generate bill on discharge</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Notifications Settings -->
                <div id="settings-notifications" class="settings-tab-content" style="display:none;">
                    <div class="form-section">
                        <h3><i class="fas fa-bell"></i> Email Notifications</h3>
                        <div class="form-grid">
                            <div class="form-group checkbox">
                                <input type="checkbox" id="email-new-patient" checked>
                                <label for="email-new-patient">New patient admission</label>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="email-discharge" checked>
                                <label for="email-discharge">Patient discharge</label>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="email-payment" checked>
                                <label for="email-payment">Payment received</label>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="email-low-stock">
                                <label for="email-low-stock">Low stock alerts</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3><i class="fas fa-sms"></i> SMS Notifications</h3>
                        <div class="form-grid">
                            <div class="form-group checkbox">
                                <input type="checkbox" id="sms-appointment" checked>
                                <label for="sms-appointment">Appointment reminders</label>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="sms-bill" checked>
                                <label for="sms-bill">Bill generation</label>
                            </div>
                            <div class="form-group">
                                <label>SMS API Key</label>
                                <input type="password" id="sms-api-key" class="search-input" value="••••••••••••••••">
                            </div>
                            <div class="form-group">
                                <label>Sender ID</label>
                                <input type="text" id="sms-sender" class="search-input" value="HOSPITAL">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Security Settings -->
                <div id="settings-security" class="settings-tab-content" style="display:none;">
                    <div class="form-section">
                        <h3><i class="fas fa-lock"></i> Password Policy</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Minimum Password Length</label>
                                <input type="number" id="pwd-min-length" class="search-input" value="8" min="6" max="20">
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="pwd-require-upper" checked>
                                <label for="pwd-require-upper">Require uppercase letters</label>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="pwd-require-numbers" checked>
                                <label for="pwd-require-numbers">Require numbers</label>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="pwd-require-special" checked>
                                <label for="pwd-require-special">Require special characters</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3><i class="fas fa-shield-alt"></i> Session Settings</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Session Timeout (minutes)</label>
                                <input type="number" id="session-timeout" class="search-input" value="30" min="5" max="480">
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="force-2fa" checked>
                                <label for="force-2fa">Force 2FA for admin users</label>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="login-history" checked>
                                <label for="login-history">Track login history</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- User Settings -->
                <div id="settings-users" class="settings-tab-content" style="display:none;">
                    <div class="form-section">
                        <h3><i class="fas fa-users-cog"></i> User Defaults</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Default Doctor Name</label>
                                <input type="text" id="default-doctor" class="search-input" value="Dr. Sharma">
                            </div>
                            <div class="form-group">
                                <label>Default Role for New Users</label>
                                <select id="default-role" class="filter-select">
                                    <option value="staff">Staff/Nurse</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="receptionist">Receptionist</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>User Approval</label>
                                <select id="user-approval" class="filter-select">
                                    <option value="auto">Auto-approve</option>
                                    <option value="admin" selected>Admin approval required</option>
                                </select>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="allow-signup" checked>
                                <label for="allow-signup">Allow public signup</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top:30px; display:flex; gap:15px; justify-content:flex-end; border-top:1px solid #eee; padding-top:20px;">
                <button class="btn-success" onclick="saveSettings()"><i class="fas fa-save"></i> Save All Changes</button>
                <button class="btn" onclick="resetSettings()"><i class="fas fa-undo"></i> Reset to Default</button>
            </div>
        </div>
    `;

    loadSettings();
}

function showSettingsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.settings-tabs .tab-btn[onclick*="${tabName}"]`)?.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.settings-tab-content').forEach(content => content.style.display = 'none');
    document.getElementById(`settings-${tabName}`).style.display = 'block';
}

function loadSettings() {
    console.log("Loading module settings into form...");
    const savedSettings = window.hospitalSettings || {};
    
    // Apply saved values to form fields
    const inputs = document.querySelectorAll('#settings-content input, #settings-content select');
    inputs.forEach(element => {
        if (!element.id) return;
        if (savedSettings[element.id] !== undefined) {
            if (element.type === 'checkbox') {
                element.checked = savedSettings[element.id];
            } else {
                element.value = savedSettings[element.id];
            }
        }
    });
}

async function saveSettings() {
    const settings = {};
    document.querySelectorAll('#settings-content input, #settings-content select').forEach(element => {
        if (!element.id) return;
        if (element.type === 'checkbox') {
            settings[element.id] = element.checked;
        } else {
            settings[element.id] = element.value;
        }
    });
    
    if (!settings['hospital-name'] || !settings['hospital-name'].trim()) {
        showNotification('Hospital Name is required!', 'error');
        return;
    }
    if (!settings['currency-symbol'] || !settings['currency-symbol'].trim()) {
        showNotification('Currency symbol is required!', 'error');
        return;
    }

    showLoading('Saving settings...');
    try {
        const response = await fetch(`${API_BASE}settings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify(settings)
        });
        const result = await response.json();
        hideLoading();
        if (result.success) {
            window.hospitalSettings = settings;
            applyGlobalSettings();
            showNotification('Settings saved successfully!', 'success');
        } else {
            showNotification(result.message || 'Error saving settings', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Network error', 'error');
    }
}

function resetSettings() {
    if (confirm('Reset all settings to default values?')) {
        localStorage.removeItem('hospitalSettings');
        location.reload();
    }
}

function applyTheme(theme, mode) {
    const root = document.documentElement;
    
    const themes = {
        green: { primary: '#4CAF50', secondary: '#388E3C' },
        blue: { primary: '#2196F3', secondary: '#1976D2' },
        purple: { primary: '#9C27B0', secondary: '#7B1FA2' },
        red: { primary: '#F44336', secondary: '#D32F2F' }
    };
    
    const selectedTheme = themes[theme] || themes.green;
    
    // Update CSS variables for primary colors
    root.style.setProperty('--primary-color', selectedTheme.primary);
    root.style.setProperty('--secondary-color', selectedTheme.secondary);
    
    // Switch Light/Dark Mode
    if (mode === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    // Update gradient backgrounds
    document.querySelectorAll('.btn-primary, .login-btn, .stat-card, .shift-header').forEach(el => {
        el.style.background = `linear-gradient(135deg, ${selectedTheme.primary} 0%, ${selectedTheme.secondary} 100%)`;
    });
}

async function applyGlobalSettings() {
    console.log("Applying global settings...");
    try {
        const response = await fetch(`${API_BASE}settings`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();
        if (result.success) {
            window.hospitalSettings = result.settings;
            window.currencySymbol = result.settings['currency-symbol'] || '₹';
            
            const hName = result.settings['hospital-name'] || 'City Hospital';
            document.querySelectorAll('.hospital-name').forEach(el => {
                el.textContent = hName;
            });

            applyTheme(result.settings['theme-color'] || 'green', result.settings['theme-mode'] || 'light');
            
            if (typeof calculateBillingTotals === 'function' && document.getElementById('billing-items')) {
                if (typeof renderBilling === 'function' && currentModule === 'billing') {
                    renderBilling();
                }
            }
        }
    } catch (e) {
        console.error("Error applying settings from backend:", e);
    }
}

// Automatically apply settings once script is loaded
applyGlobalSettings();