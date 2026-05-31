// ==================== SETTINGS MODULE ====================

async function renderSettings() {
    const role = currentUser?.role || 'admin';
    if (role !== 'admin') {
        const moduleEl = document.getElementById('module-settings');
        if (moduleEl) {
            moduleEl.innerHTML = `
                <div style="display:flex; height:80vh; align-items:center; justify-content:center; flex-direction:column; color:#ef4444; gap:20px;">
                    <i class="bi bi-lock" style="font-size:48px;"></i>
                    <h2 style="margin:0; font-family:'Outfit', sans-serif;">Access Denied</h2>
                    <p style="margin:0; color:#64748b; font-weight:600;">You do not have permission to access System Settings.</p>
                </div>
            `;
        }
        return;
    }

    const moduleEl = document.getElementById('module-settings');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="settings-container">
            <style>
                .settings-container {
                    animation: fadeIn 0.4s ease-out;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                /* Modern Split Layout */
                .settings-layout {
                    display: flex;
                    gap: 0;
                    margin-top: 20px;
                    background: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    overflow: hidden;
                }
                
                /* Sidebar Navigation */
                .settings-sidebar {
                    width: 250px;
                    background: #f8fafc;
                    border-right: 1px solid #e2e8f0;
                    padding: 24px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    flex-shrink: 0;
                }
                .settings-nav-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #64748b;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .settings-nav-btn:hover {
                    background: #cbd5e1;
                    color: #0f172a;
                    transform: translateX(3px);
                }
                .settings-nav-btn.active {
                    background: var(--primary, #4f46e5);
                    color: #ffffff !important;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
                }
                .settings-nav-btn i {
                    font-size: 16px;
                    width: 20px;
                    text-align: center;
                }
                
                /* Form / Content Panel */
                .settings-content-panel {
                    flex-grow: 1;
                    padding: 32px;
                    min-width: 0;
                    background: #ffffff;
                }
                
                /* Form Styling */
                .form-section {
                    margin-bottom: 32px;
                    animation: slideUp 0.3s ease-out;
                }
                .form-section h3 {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 12px;
                    margin-top: 0;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .form-group label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #475569;
                }
                .form-group input, .form-group select, .form-group textarea {
                    padding: 10px 14px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #334155;
                    background: #ffffff;
                    outline: none;
                    transition: all 0.2s;
                }
                .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
                    border-color: var(--primary, #4f46e5);
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
                }
                
                /* Checkbox styling */
                .form-group-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .form-group-checkbox:hover {
                    border-color: var(--primary, #4f46e5);
                    background: #ffffff;
                }
                .form-group-checkbox input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    border-radius: 4px;
                    accent-color: var(--primary, #4f46e5);
                    cursor: pointer;
                    margin: 0;
                }
                .form-group-checkbox label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #334155;
                    cursor: pointer;
                    margin: 0;
                    user-select: none;
                }
                
                /* Slide-up microanimation */
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>

            <div class="module-header" style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border); padding-bottom: 15px; flex-wrap: wrap; gap: 15px;">
                <h2 style="font-size: 28px; font-weight: 800; color: var(--text-main); margin: 0; position: relative; padding-left: 15px; display: flex; align-items: center; gap: 8px;">
                    <span style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 24px; width: 4px; background: var(--primary); border-radius: 4px;"></span>
                    <i class="bi bi-gear" style="color: var(--primary);"></i> System Settings
                </h2>
                <div style="display:flex; gap:12px;">
                    <button class="btn btn-success" onclick="saveSettings()">
                        <i class="bi bi-save"></i> Save Changes
                    </button>
                    <button class="btn" onclick="resetSettings()">
                        <i class="bi bi-arrow-counterclockwise"></i> Reset Settings
                    </button>
                </div>
            </div>
            
            <div class="settings-layout">
                <!-- Sidebar Buttons -->
                <div class="settings-sidebar">
                    <button class="settings-nav-btn active" id="btn-tab-general" onclick="showSettingsTab('general')">
                        <i class="bi bi-sliders"></i> <span>General</span>
                    </button>
                    <button class="settings-nav-btn" id="btn-tab-beds" onclick="showSettingsTab('beds')">
                        <i class="fa-solid fa-bed"></i> <span>Bed Management</span>
                    </button>
                    <button class="settings-nav-btn" id="btn-tab-billing" onclick="showSettingsTab('billing')">
                        <i class="bi bi-credit-card"></i> <span>Billing</span>
                    </button>
                    <button class="settings-nav-btn" id="btn-tab-notifications" onclick="showSettingsTab('notifications')">
                        <i class="bi bi-bell"></i> <span>Notifications</span>
                    </button>
                    <button class="settings-nav-btn" id="btn-tab-security" onclick="showSettingsTab('security')">
                        <i class="bi bi-shield-lock"></i> <span>Security</span>
                    </button>
                    <button class="settings-nav-btn" id="btn-tab-users" onclick="showSettingsTab('users')">
                        <i class="bi bi-person-gear"></i> <span>User Settings</span>
                    </button>
                </div>
                
                <!-- Content panel containing form sections -->
                <div class="settings-content-panel" id="settings-content">
                    
                    <!-- 1. GENERAL TAB -->
                    <div id="settings-general" class="settings-tab-content">
                        <div class="form-section">
                            <h3><i class="bi bi-hospital" style="color:var(--primary, #4f46e5);"></i> Hospital Information</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Hospital Name</label>
                                    <input type="text" id="hospital-name" placeholder="Chaudhary Health Care Center">
                                </div>
                                <div class="form-group">
                                    <label>Hospital Address</label>
                                    <input type="text" id="hospital-address" placeholder="Gandhi Chauraha, Meja wali road, Koraon-Prayagraj">
                                </div>
                                <div class="form-group">
                                    <label>Contact Number</label>
                                    <input type="tel" id="hospital-contact" placeholder="1800-XXX-XXXX">
                                </div>
                                <div class="form-group">
                                    <label>Email Address</label>
                                    <input type="email" id="hospital-email" placeholder="contact@chc-koraon.com">
                                </div>
                                <div class="form-group">
                                    <label>Website</label>
                                    <input type="url" id="hospital-website" placeholder="www.chc-koraon.com">
                                </div>
                                <div class="form-group">
                                    <label>Registration Number</label>
                                    <input type="text" id="hospital-reg" placeholder="REG/CHC/2026/102">
                                </div>
                                <div class="form-group" style="grid-column: span 2;">
                                    <div style="display:flex; align-items:center; gap:10px; padding:12px 16px; background:linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%); border-radius:10px; border:1px solid #e0e7ff;">
                                        <i class="fa-solid fa-bed" style="color:#6366f1; font-size:18px;"></i>
                                        <div>
                                            <strong style="color:#1e293b; font-size:13px;">Bed Configuration</strong>
                                            <p style="margin:2px 0 0; font-size:11px; color:#64748b;">Go to <a href="javascript:void(0)" onclick="showSettingsTab('beds')" style="color:#6366f1; font-weight:700; text-decoration:none;">Bed Management</a> tab to customize ward beds.</p>
                                        </div>
                                    </div>
                                    <input type="hidden" id="hospital-beds">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3><i class="bi bi-palette" style="color:#eab308;"></i> Appearance & Themes</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Theme Mode</label>
                                    <select id="theme-mode">
                                        <option value="light">Light Mode</option>
                                        <option value="dark">Dark Mode</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Theme Color Palette</label>
                                    <select id="theme-color">
                                        <option value="indigo">Indigo Blue (Premium)</option>
                                        <option value="green">Forest Green</option>
                                        <option value="blue">Royal Blue</option>
                                        <option value="purple">Vibrant Purple</option>
                                        <option value="red">Crimson Red</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Date Format</label>
                                    <select id="date-format">
                                        <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                                        <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                                        <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Time Format</label>
                                    <select id="time-format">
                                        <option value="12h">12 Hour (AM/PM)</option>
                                        <option value="24h">24 Hour</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Language</label>
                                    <select id="language">
                                        <option value="en">English (Professional)</option>
                                        <option value="hi">Hindi</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- BED MANAGEMENT TAB -->
                    <div id="settings-beds" class="settings-tab-content" style="display:none;">
                        <style>
                            .bed-mgmt-header { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
                            .bed-mgmt-header i { width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; }
                            .bed-mgmt-header h3 { margin:0; font-size:18px; font-weight:800; color:#0f172a; }
                            .bed-mgmt-header p { margin:4px 0 0; font-size:12px; color:#64748b; }
                            .ward-cards-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }
                            .ward-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:20px; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); position:relative; overflow:hidden; }
                            .ward-card:hover { transform:translateY(-2px); box-shadow:0 8px 25px rgba(0,0,0,0.08); }
                            .ward-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; }
                            .ward-card.male-ward::before { background:linear-gradient(90deg, #3b82f6, #60a5fa); }
                            .ward-card.female-ward::before { background:linear-gradient(90deg, #ec4899, #f472b6); }
                            .ward-card.icu-ward::before { background:linear-gradient(90deg, #ef4444, #f87171); }
                            .ward-card.private-ward::before { background:linear-gradient(90deg, #f59e0b, #fbbf24); }
                            .ward-card-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
                            .ward-card-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; }
                            .male-ward .ward-card-icon { background:#eff6ff; color:#3b82f6; }
                            .female-ward .ward-card-icon { background:#fdf2f8; color:#ec4899; }
                            .icu-ward .ward-card-icon { background:#fef2f2; color:#ef4444; }
                            .private-ward .ward-card-icon { background:#fffbeb; color:#f59e0b; }
                            .ward-card-title { font-size:14px; font-weight:700; color:#1e293b; }
                            .ward-card-subtitle { font-size:11px; color:#94a3b8; font-weight:500; }
                            .ward-counter { display:flex; align-items:center; gap:12px; justify-content:center; margin:8px 0; }
                            .ward-counter-btn { width:36px; height:36px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; color:#475569; font-size:18px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
                            .ward-counter-btn:hover { background:#6366f1; color:#fff; border-color:#6366f1; transform:scale(1.08); }
                            .ward-counter-btn:active { transform:scale(0.95); }
                            .ward-counter-input { width:64px; height:40px; text-align:center; font-size:20px; font-weight:800; color:#1e293b; border:2px solid #e2e8f0; border-radius:10px; background:#fff; outline:none; transition:border-color 0.2s; }
                            .ward-counter-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.15); }
                            .ward-card-label { text-align:center; font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
                            .bed-prefix-tag { display:inline-block; padding:3px 10px; background:#f1f5f9; border-radius:6px; font-size:11px; font-weight:600; color:#475569; margin-top:8px; }
                            .bed-preview-section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px; }
                            .bed-preview-title { font-size:14px; font-weight:700; color:#1e293b; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
                            .bed-preview-ward { margin-bottom:12px; }
                            .bed-preview-ward-title { font-size:12px; font-weight:700; color:#475569; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
                            .bed-preview-grid { display:flex; flex-wrap:wrap; gap:6px; }
                            .bed-chip { padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; background:#fff; border:1px solid #e2e8f0; color:#475569; transition:all 0.2s; }
                            .bed-chip.male { border-color:#bfdbfe; color:#2563eb; background:#eff6ff; }
                            .bed-chip.female { border-color:#fbcfe8; color:#db2777; background:#fdf2f8; }
                            .bed-chip.icu { border-color:#fecaca; color:#dc2626; background:#fef2f2; }
                            .bed-chip.private { border-color:#fde68a; color:#d97706; background:#fffbeb; }
                            .bed-total-badge { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#fff; border-radius:10px; font-size:13px; font-weight:700; margin-top:16px; }
                            .bed-gender-note { display:flex; align-items:flex-start; gap:10px; padding:14px 16px; background:linear-gradient(135deg, #fef3c7, #fef9c3); border:1px solid #fde68a; border-radius:10px; margin-bottom:20px; }
                            .bed-gender-note i { color:#f59e0b; font-size:16px; margin-top:1px; }
                            .bed-gender-note p { margin:0; font-size:12px; color:#92400e; line-height:1.5; }
                            .bed-gender-note strong { color:#78350f; }
                            @media(max-width:768px) { .ward-cards-grid { grid-template-columns:1fr; } }
                        </style>
                        
                        <div class="bed-mgmt-header">
                                <i class="fa-solid fa-bed"></i>
                                <div>
                                    <h3>Bed Management</h3>
                                    <p>Configure ward-wise bed allocation for your hospital</p>
                                </div>
                            </div>
                            
                            <div class="bed-gender-note">
                                <i class="bi bi-info-circle"></i>
                                <p>
                                    <strong>Gender-Based Filtering:</strong> Male gender select karne par sirf <strong>Male Ward</strong> beds dikhenge, 
                                    Female select karne par sirf <strong>Female Ward</strong> beds dikhenge. 
                                    <strong>ICU</strong> aur <strong>Private Room</strong> dono genders ke liye common hain.
                                </p>
                            </div>
                        
                        <div class="ward-cards-grid">
                            <div class="ward-card male-ward">
                                <div class="ward-card-header">
                                    <div class="ward-card-icon"><i class="bi bi-gender-male"></i></div>
                                    <div>
                                        <div class="ward-card-title">Male Ward</div>
                                        <div class="ward-card-subtitle">General Ward — Male Only</div>
                                    </div>
                                </div>
                                <div class="ward-counter">
                                    <button class="ward-counter-btn" onclick="adjustWardCount('male', -1)">−</button>
                                    <input type="number" class="ward-counter-input" id="ward-male-count" value="20" min="0" max="100" onchange="updateBedPreview()">
                                    <button class="ward-counter-btn" onclick="adjustWardCount('male', 1)">+</button>
                                </div>
                                <div class="ward-card-label">Total Beds</div>
                                <div style="text-align:center;"><span class="bed-prefix-tag">Prefix: Male-G1, Male-G2...</span></div>
                            </div>
                            
                            <div class="ward-card female-ward">
                                <div class="ward-card-header">
                                    <div class="ward-card-icon"><i class="bi bi-gender-female"></i></div>
                                    <div>
                                        <div class="ward-card-title">Female Ward</div>
                                        <div class="ward-card-subtitle">General Ward — Female Only</div>
                                    </div>
                                </div>
                                <div class="ward-counter">
                                    <button class="ward-counter-btn" onclick="adjustWardCount('female', -1)">−</button>
                                    <input type="number" class="ward-counter-input" id="ward-female-count" value="20" min="0" max="100" onchange="updateBedPreview()">
                                    <button class="ward-counter-btn" onclick="adjustWardCount('female', 1)">+</button>
                                </div>
                                <div class="ward-card-label">Total Beds</div>
                                <div style="text-align:center;"><span class="bed-prefix-tag">Prefix: Female-G1, Female-G2...</span></div>
                            </div>
                            
                            <div class="ward-card icu-ward">
                                <div class="ward-card-header">
                                    <div class="ward-card-icon"><i class="bi bi-activity"></i></div>
                                    <div>
                                        <div class="ward-card-title">ICU Ward</div>
                                        <div class="ward-card-subtitle">Intensive Care — Common (All Genders)</div>
                                    </div>
                                </div>
                                <div class="ward-counter">
                                    <button class="ward-counter-btn" onclick="adjustWardCount('icu', -1)">−</button>
                                    <input type="number" class="ward-counter-input" id="ward-icu-count" value="7" min="0" max="50" onchange="updateBedPreview()">
                                    <button class="ward-counter-btn" onclick="adjustWardCount('icu', 1)">+</button>
                                </div>
                                <div class="ward-card-label">Total Beds</div>
                                <div style="text-align:center;"><span class="bed-prefix-tag">Prefix: ICU-1, ICU-2...</span></div>
                            </div>
                            
                            <div class="ward-card private-ward">
                                <div class="ward-card-header">
                                    <div class="ward-card-icon"><i class="bi bi-door-closed"></i></div>
                                    <div>
                                        <div class="ward-card-title">Private Room</div>
                                        <div class="ward-card-subtitle">Private Rooms — Common (All Genders)</div>
                                    </div>
                                </div>
                                <div class="ward-counter">
                                    <button class="ward-counter-btn" onclick="adjustWardCount('private', -1)">−</button>
                                    <input type="number" class="ward-counter-input" id="ward-private-count" value="5" min="0" max="50" onchange="updateBedPreview()">
                                    <button class="ward-counter-btn" onclick="adjustWardCount('private', 1)">+</button>
                                </div>
                                <div class="ward-card-label">Total Beds</div>
                                <div style="text-align:center;"><span class="bed-prefix-tag">Prefix: Private-1, Private-2...</span></div>
                            </div>
                        </div>
                        
                        <div class="bed-preview-section" id="bed-preview-section">
                            <div class="bed-preview-title"><i class="bi bi-eye" style="color:#6366f1;"></i> Live Bed Preview</div>
                            <div id="bed-preview-content">Loading...</div>
                        </div>
                    </div>
                    
                    <!-- 2. BILLING TAB -->
                    <div id="settings-billing" class="settings-tab-content" style="display:none;">
                        <div class="form-section">
                            <h3><i class="bi bi-cash-stack" style="color:var(--success, #10b981);"></i> Rates & Consultation Charges</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Currency Symbol</label>
                                    <input type="text" id="currency-symbol" value="₹" maxlength="3">
                                </div>
                                <div class="form-group">
                                    <label>Tax Rate (%)</label>
                                    <input type="number" id="tax-rate" value="18" step="0.1" min="0" max="100">
                                </div>
                                <div class="form-group">
                                    <label>Consultation Fee (₹)</label>
                                    <input type="number" id="consultation-fee" value="500" min="0">
                                </div>
                                <div class="form-group">
                                    <label>General Ward Charge/Day (₹)</label>
                                    <input type="number" id="ward-charge" value="2000" min="0">
                                </div>
                                <div class="form-group">
                                    <label>ICU Charge/Day (₹)</label>
                                    <input type="number" id="icu-charge" value="5000" min="0">
                                </div>
                                <div class="form-group">
                                    <label>Emergency Charge (₹)</label>
                                    <input type="number" id="emergency-charge" value="1000" min="0">
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3><i class="bi bi-file-earmark-text" style="color:#0ea5e9;"></i> Invoice Configurations</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Invoice Prefix</label>
                                    <input type="text" id="invoice-prefix" value="CHC-INV">
                                </div>
                                <div class="form-group">
                                    <label>Next Invoice ID</label>
                                    <input type="number" id="next-invoice" value="1001">
                                </div>
                                <div style="grid-column: span 2; display:grid; grid-template-columns:1fr; gap:10px;">
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="auto-generate-bill">
                                        <label for="auto-generate-bill">Automatically compile bill summary upon patient discharge</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 3. NOTIFICATIONS TAB -->
                    <div id="settings-notifications" class="settings-tab-content" style="display:none;">
                        <div class="form-section">
                            <h3><i class="bi bi-envelope" style="color:var(--primary, #4f46e5);"></i> Email Notification Triggers</h3>
                            <div style="display:grid; grid-template-columns:1fr; gap:12px; margin-bottom:20px;">
                                <div class="form-group-checkbox">
                                    <input type="checkbox" id="email-new-patient">
                                    <label for="email-new-patient">Notify medical team on new patient admissions</label>
                                </div>
                                <div class="form-group-checkbox">
                                    <input type="checkbox" id="email-discharge">
                                    <label for="email-discharge">Send confirmation mail to patient on successful discharge</label>
                                </div>
                                <div class="form-group-checkbox">
                                    <input type="checkbox" id="email-payment">
                                    <label for="email-payment">Send payment success receipts immediately</label>
                                </div>
                                <div class="form-group-checkbox">
                                    <input type="checkbox" id="email-low-stock">
                                    <label for="email-low-stock">Alert administration on low pharmacy stock levels</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3><i class="bi bi-chat-left-text" style="color:#06b6d4;"></i> SMS API Configurations</h3>
                            <div class="form-grid">
                                <div class="form-group checkbox" style="grid-column: span 2; display:grid; grid-template-columns:1fr; gap:12px;">
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="sms-appointment">
                                        <label for="sms-appointment">Send SMS reminders to assigned doctors</label>
                                    </div>
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="sms-bill">
                                        <label for="sms-bill">SMS total bill summary link to patient's phone</label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>SMS Gateway API Key</label>
                                    <input type="password" id="sms-api-key" placeholder="Enter key">
                                </div>
                                <div class="form-group">
                                    <label>Sender ID</label>
                                    <input type="text" id="sms-sender" placeholder="CHC-SMS">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 4. SECURITY TAB -->
                    <div id="settings-security" class="settings-tab-content" style="display:none;">
                        <div class="form-section">
                            <h3><i class="bi bi-shield-lock" style="color:var(--danger, #ef4444);"></i> Password Hardening Policies</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Minimum Password Length</label>
                                    <input type="number" id="pwd-min-length" value="8" min="6" max="20">
                                </div>
                                <div style="grid-column: span 2; display:grid; grid-template-columns:1fr; gap:12px; margin-top:10px;">
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="pwd-require-upper">
                                        <label for="pwd-require-upper">Require at least one uppercase letter (A-Z)</label>
                                    </div>
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="pwd-require-numbers">
                                        <label for="pwd-require-numbers">Require at least one numeric digit (0-9)</label>
                                    </div>
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="pwd-require-special">
                                        <label for="pwd-require-special">Require at least one special character (@, #, $, etc.)</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3><i class="bi bi-clock-history" style="color:#8b5cf6;"></i> Session Policies</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Automatic Session Timeout (minutes)</label>
                                    <input type="number" id="session-timeout" value="30" min="5" max="480">
                                </div>
                                <div style="grid-column: span 2; display:grid; grid-template-columns:1fr; gap:12px; margin-top:10px;">
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="force-2fa">
                                        <label for="force-2fa">Enforce multi-factor verification (2FA) for administrators</label>
                                    </div>
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="login-history">
                                        <label for="login-history">Maintain security logs and tracks of login histories</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 5. USER SETTINGS TAB -->
                    <div id="settings-users" class="settings-tab-content" style="display:none;">
                        <div class="form-section">
                            <h3><i class="bi bi-person-lock" style="color:#3b82f6;"></i> User Access Defaults</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Default Assigned Doctor</label>
                                    <input type="text" id="default-doctor" placeholder="Dr. Bhoopendra Chaudhary">
                                </div>
                                <div class="form-group">
                                    <label>Default Role for New Users</label>
                                    <select id="default-role">
                                        <option value="staff">Staff/Nurse</option>
                                        <option value="doctor">Doctor</option>
                                        <option value="receptionist">Receptionist</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>User Registration Approvals</label>
                                    <select id="user-approval">
                                        <option value="auto">Automatic Approval</option>
                                        <option value="admin">Requires Administrator Review</option>
                                    </select>
                                </div>
                                <div style="grid-column: span 2; display:grid; grid-template-columns:1fr; gap:12px; margin-top:10px;">
                                    <div class="form-group-checkbox">
                                        <input type="checkbox" id="allow-signup">
                                        <label for="allow-signup">Enable public sign-up registration forms</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                    

                    
                </div>
            </div>
            
        </div>
    `;

    // Load cached values first for immediate display, then fetch fresh in background
    loadSettings();
    await applyGlobalSettings();
    loadSettings();
    // Load bed counts from saved settings into the visual editor
    setTimeout(() => loadBedCountsFromSettings(), 200);
}

function showSettingsTab(tabName) {
    // Update active state in sidebar buttons
    document.querySelectorAll('.settings-sidebar .settings-nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetBtn = document.getElementById(`btn-tab-${tabName}`);
    if (targetBtn) targetBtn.classList.add('active');

    // Update active settings content view
    document.querySelectorAll('.settings-tab-content').forEach(content => content.style.display = 'none');
    
    const targetContent = document.getElementById(`settings-${tabName}`);
    if (targetContent) targetContent.style.display = 'block';

    if (tabName === 'integrations') {
        if (typeof checkIntegrationStatus === 'function') checkIntegrationStatus();
    }
}

function loadSettings() {
    console.log("Loading module settings into form...");
    const savedSettings = window.hospitalSettings || {};

    // Apply saved values to form fields
    const inputs = document.querySelectorAll('#settings-content input, #settings-content select, #settings-content textarea');
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
    // Sync bed list from ward counter inputs before collecting
    if (typeof updateBedPreview === 'function') updateBedPreview();
    
    const settings = {};
    document.querySelectorAll('#settings-content input, #settings-content select, #settings-content textarea').forEach(element => {
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
            showNotification('Settings saved and applied successfully!', 'success');
        } else {
            showNotification(result.message || 'Error saving settings', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Network error saving settings', 'error');
    }
}

function resetSettings() {
    if (confirm('Reset all settings to default values? This will reload the application.')) {
        localStorage.removeItem('hospitalSettings');
        location.reload();
    }
}

function regenerateDefaultBeds() {
    // Set default ward counts
    const maleInput = document.getElementById('ward-male-count');
    const femaleInput = document.getElementById('ward-female-count');
    const icuInput = document.getElementById('ward-icu-count');
    const privateInput = document.getElementById('ward-private-count');
    if (maleInput) maleInput.value = 20;
    if (femaleInput) femaleInput.value = 20;
    if (icuInput) icuInput.value = 7;
    if (privateInput) privateInput.value = 5;
    updateBedPreview();
    showNotification('Default bed configuration restored (20M + 20F + 7ICU + 5Pvt). Click "Save Changes" to persist.', 'success');
}

function adjustWardCount(ward, delta) {
    const input = document.getElementById(`ward-${ward}-count`);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val = Math.max(0, Math.min(100, val + delta));
    input.value = val;
    updateBedPreview();
}

function generateBedListFromCounts() {
    const maleCount = parseInt(document.getElementById('ward-male-count')?.value) || 0;
    const femaleCount = parseInt(document.getElementById('ward-female-count')?.value) || 0;
    const icuCount = parseInt(document.getElementById('ward-icu-count')?.value) || 0;
    const privateCount = parseInt(document.getElementById('ward-private-count')?.value) || 0;
    
    const beds = [];
    for (let i = 1; i <= maleCount; i++) beds.push(`Male-G${i}`);
    for (let i = 1; i <= femaleCount; i++) beds.push(`Female-G${i}`);
    for (let i = 1; i <= icuCount; i++) beds.push(`ICU-${i}`);
    for (let i = 1; i <= privateCount; i++) beds.push(`Private-${i}`);
    return beds;
}

function updateBedPreview() {
    const maleCount = parseInt(document.getElementById('ward-male-count')?.value) || 0;
    const femaleCount = parseInt(document.getElementById('ward-female-count')?.value) || 0;
    const icuCount = parseInt(document.getElementById('ward-icu-count')?.value) || 0;
    const privateCount = parseInt(document.getElementById('ward-private-count')?.value) || 0;
    const total = maleCount + femaleCount + icuCount + privateCount;
    
    // Update hidden input
    const beds = generateBedListFromCounts();
    const hiddenInput = document.getElementById('hospital-beds');
    if (hiddenInput) hiddenInput.value = beds.join(', ');
    
    // Update ward count settings
    const wcs = document.getElementById('ward-male-count-setting');
    // Store ward counts in hidden inputs for saving
    
    const previewEl = document.getElementById('bed-preview-content');
    if (!previewEl) return;
    
    let html = '';
    
    // Male Ward
    if (maleCount > 0) {
        html += `<div class="bed-preview-ward">
            <div class="bed-preview-ward-title"><i class="bi bi-gender-male" style="color:#3b82f6;"></i> Male Ward (${maleCount} beds)</div>
            <div class="bed-preview-grid">`;
        for (let i = 1; i <= maleCount; i++) html += `<span class="bed-chip male">Male-G${i}</span>`;
        html += `</div></div>`;
    }
    
    // Female Ward
    if (femaleCount > 0) {
        html += `<div class="bed-preview-ward">
            <div class="bed-preview-ward-title"><i class="bi bi-gender-female" style="color:#ec4899;"></i> Female Ward (${femaleCount} beds)</div>
            <div class="bed-preview-grid">`;
        for (let i = 1; i <= femaleCount; i++) html += `<span class="bed-chip female">Female-G${i}</span>`;
        html += `</div></div>`;
    }
    
    // ICU
    if (icuCount > 0) {
        html += `<div class="bed-preview-ward">
            <div class="bed-preview-ward-title"><i class="bi bi-activity" style="color:#ef4444;"></i> ICU Ward (${icuCount} beds) — Common</div>
            <div class="bed-preview-grid">`;
        for (let i = 1; i <= icuCount; i++) html += `<span class="bed-chip icu">ICU-${i}</span>`;
        html += `</div></div>`;
    }
    
    // Private
    if (privateCount > 0) {
        html += `<div class="bed-preview-ward">
            <div class="bed-preview-ward-title"><i class="bi bi-door-closed" style="color:#f59e0b;"></i> Private Room (${privateCount} beds) — Common</div>
            <div class="bed-preview-grid">`;
        for (let i = 1; i <= privateCount; i++) html += `<span class="bed-chip private">Private-${i}</span>`;
        html += `</div></div>`;
    }
    
    html += `<div class="bed-total-badge"><i class="bi bi-hospital"></i> Total: ${total} Beds</div>`;
    previewEl.innerHTML = html;
}

function loadBedCountsFromSettings() {
    const savedBeds = (window.hospitalSettings || {})['hospital-beds'] || '';
    if (!savedBeds) return;
    
    const bedList = savedBeds.split(',').map(b => b.trim()).filter(b => b);
    const maleCount = bedList.filter(b => b.startsWith('Male-G')).length;
    const femaleCount = bedList.filter(b => b.startsWith('Female-G')).length;
    const icuCount = bedList.filter(b => b.startsWith('ICU-')).length;
    const privateCount = bedList.filter(b => b.startsWith('Private-')).length;
    
    const maleInput = document.getElementById('ward-male-count');
    const femaleInput = document.getElementById('ward-female-count');
    const icuInput = document.getElementById('ward-icu-count');
    const privateInput = document.getElementById('ward-private-count');
    
    if (maleInput) maleInput.value = maleCount || 20;
    if (femaleInput) femaleInput.value = femaleCount || 20;
    if (icuInput) icuInput.value = icuCount || 7;
    if (privateInput) privateInput.value = privateCount || 5;
    
    updateBedPreview();
}

function applyTheme(theme, mode) {
    const root = document.documentElement;

    const themes = {
        indigo: { primary: '#4f46e5', dark: '#3730a3', light: '#eef2ff' },
        green: { primary: '#10b981', dark: '#059669', light: '#ecfdf5' },
        blue: { primary: '#3b82f6', dark: '#2563eb', light: '#eff6ff' },
        purple: { primary: '#8b5cf6', dark: '#7c3aed', light: '#f5f3ff' },
        red: { primary: '#ef4444', dark: '#dc2626', light: '#fef2f2' }
    };

    const selectedTheme = themes[theme] || themes.indigo;

    // Update modern color variables in root
    root.style.setProperty('--primary', selectedTheme.primary);
    root.style.setProperty('--primary-dark', selectedTheme.dark);
    root.style.setProperty('--primary-light', selectedTheme.light);

    // Switch Light/Dark Mode variables
    if (mode === 'dark') {
        document.body.classList.add('dark-theme');
        root.style.setProperty('--background', '#0f172a');
        root.style.setProperty('--card-bg', '#1e293b');
        root.style.setProperty('--sidebar-bg', '#1e293b');
        root.style.setProperty('--text-main', '#f8fafc');
        root.style.setProperty('--text-muted', '#94a3b8');
        root.style.setProperty('--border', '#334155');
    } else {
        document.body.classList.remove('dark-theme');
        root.style.setProperty('--background', '#f8fafc');
        root.style.setProperty('--card-bg', '#ffffff');
        root.style.setProperty('--sidebar-bg', '#ffffff');
        root.style.setProperty('--text-main', '#0f172a');
        root.style.setProperty('--text-muted', '#64748b');
        root.style.setProperty('--border', '#e2e8f0');
    }
}

function updateThemeToggleButtons() {
    const isDark = document.body.classList.contains('dark-theme');
    const toggleButtons = document.querySelectorAll('.theme-toggle-btn i');
    toggleButtons.forEach(icon => {
        if (isDark) {
            icon.className = 'bi bi-sun-fill';
            icon.style.color = '#f59e0b';
        } else {
            icon.className = 'bi bi-moon-fill';
            icon.style.color = '#64748b';
        }
    });
}

function toggleTheme() {
    const currentMode = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    const currentColor = (window.hospitalSettings && window.hospitalSettings['theme-color']) || 'indigo';

    // Apply theme locally
    applyTheme(currentColor, newMode);
    
    // Save locally in hospitalSettings
    if (!window.hospitalSettings) window.hospitalSettings = {};
    window.hospitalSettings['theme-mode'] = newMode;
    
    // Save to localStorage
    localStorage.setItem('theme-mode', newMode);
    
    // Update button icons
    updateThemeToggleButtons();

    // Sync settings in the Settings tab select dropdown if it exists
    const selectEl = document.getElementById('theme-mode');
    if (selectEl) {
        selectEl.value = newMode;
    }

    // Sync to backend (non-blocking)
    const token = sessionStorage.getItem('token');
    if (token) {
        fetch(`${API_BASE}settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(window.hospitalSettings)
        }).catch(err => console.error("Error saving theme to backend:", err));
    }
}

async function applyGlobalSettings() {
    console.log("Applying global settings...");
    
    // Load from localStorage first to prevent flash
    const localMode = localStorage.getItem('theme-mode') || 'light';
    const localColor = localStorage.getItem('theme-color') || 'indigo';
    applyTheme(localColor, localMode);
    updateThemeToggleButtons();
    
    const token = sessionStorage.getItem('token');
    if (!token || token === 'null') {
        console.log("No authentication token found. Skipping backend settings fetch.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}settings`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await response.json();
        if (result.success) {
            window.hospitalSettings = result.settings;
            window.currencySymbol = result.settings['currency-symbol'] || '₹';

            const hName = result.settings['hospital-name'] || 'Chaudhary Health Care Center';
            document.querySelectorAll('.hospital-name').forEach(el => {
                el.textContent = hName;
            });

            const hAddress = result.settings['hospital-address'] || 'Gandhi Chauraha, Meja wali road, Koraon-Prayagraj';
            document.querySelectorAll('.hospital-address').forEach(el => {
                el.textContent = hAddress;
            });

            const hContact = result.settings['hospital-contact'] || '(0542) 123456';
            document.querySelectorAll('.hospital-contact').forEach(el => {
                el.textContent = hContact;
            });

            const hEmail = result.settings['hospital-email'] || 'contact@chc-koraon.com';
            document.querySelectorAll('.hospital-email').forEach(el => {
                el.textContent = hEmail;
            });

            const backendMode = result.settings['theme-mode'] || 'light';
            const backendColor = result.settings['theme-color'] || 'indigo';
            
            // Sync to local storage
            localStorage.setItem('theme-mode', backendMode);
            localStorage.setItem('theme-color', backendColor);

            applyTheme(backendColor, backendMode);
            updateThemeToggleButtons();

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

// Expose functions to window
window.applyTheme = applyTheme;
window.updateThemeToggleButtons = updateThemeToggleButtons;
window.toggleTheme = toggleTheme;
window.applyGlobalSettings = applyGlobalSettings;

// Automatically apply settings once script is loaded
applyGlobalSettings();

// ==================== INTEGRATIONS HELPERS ====================
async function checkIntegrationStatus() {
    try {
        const response = await fetch(`${API_BASE}integrations/status`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        if (!response.ok) return;
        const result = await response.json();
        
        if (result.success) {
            updateStatusUI('cloudinary', result.status.cloudinary.configured, result.status.cloudinary.details);
            updateStatusUI('smtp', result.status.smtp.configured, result.status.smtp.details);
            updateStatusUI('fcm', result.status.fcm.configured, result.status.fcm.details);
        }
    } catch (error) {
        console.error('Error fetching integration status:', error);
    }
}

function updateStatusUI(id, isConfigured, details) {
    const el = document.getElementById(`status-${id}`);
    if (!el) return;

    if (isConfigured) {
        el.className = 'status-indicator status-active';
        el.querySelector('.status-text').textContent = 'Active';
        el.setAttribute('title', details);
    } else {
        el.className = 'status-indicator status-inactive';
        el.querySelector('.status-text').textContent = 'Not Configured';
        el.setAttribute('title', 'Not Configured');
    }
}

async function runEmailTest() {
    const recipientInput = document.getElementById('test-email-recipient');
    if (!recipientInput) return;
    
    const email = recipientInput.value.trim();
    if (!email) {
        showNotification('Please enter a recipient email address', 'warning');
        return;
    }

    showLoading('Sending test email...');
    try {
        const response = await fetch(`${API_BASE}integrations/test-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify({ email })
        });
        
        const result = await response.json();
        hideLoading();
        if (result.success) {
            showNotification('Test email sent successfully! Please check your inbox.', 'success');
        } else {
            showNotification(result.message || 'SMTP test failed', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Network error while testing SMTP', 'error');
    }
}

async function runFcmTest() {
    // Retrieve registered token
    const token = window.fcmToken || sessionStorage.getItem('fcmToken');
    if (!token) {
        showNotification('No active FCM token found for this browser. Please allow notification permission and refresh.', 'warning');
        return;
    }

    showLoading('Sending test push notification...');
    try {
        const response = await fetch(`${API_BASE}integrations/test-fcm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify({ token })
        });
        
        const result = await response.json();
        hideLoading();
        if (result.success) {
            showNotification('Test push notification triggered!', 'success');
        } else {
            showNotification(result.message || 'FCM test failed', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Network error while testing FCM', 'error');
    }
}

// Register helpers to global scope
window.runEmailTest = runEmailTest;
window.runFcmTest = runFcmTest;
window.checkIntegrationStatus = checkIntegrationStatus;