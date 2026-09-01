// ==================== DASHBOARD MODULE ====================

function renderDashboard() {
    const moduleEl = document.getElementById('module-dashboard');
    if (!moduleEl) return;

    const role = currentUser?.role || 'staff';

    // Prevent destroying and re-building DOM structure if already rendered for this role (prevents blinking)
    const currentRenderedRole = moduleEl.dataset.renderedRole;
    if (moduleEl.querySelector('.dashboard-wrapper') && currentRenderedRole === role) {
        updateDashboardStats();
        updateRolePanels(role);
        if (role === 'developer' && typeof renderDevTechConsole === 'function') {
            renderDevTechConsole();
        }
        return;
    }
    moduleEl.dataset.renderedRole = role;

    const showCharts = (role === 'admin' || role === 'developer');
    const showFinancials = (role === 'admin' || role === 'developer' || role === 'doctor');

    // Role-specific greeting subtitle
    const roleSubtitle = {
        'developer': '⚡ Developer Console — System Owner',
        'admin': 'Hospital Overview — Management Dashboard',
        'doctor': 'Clinical Home — Patient Overview',
        'staff': 'Nursing Station — Shift Overview',
        'receptionist': 'Front Desk — Admissions Overview'
    };

    // Role-specific quick actions
    const roleQuickActions = {
        'doctor': `
            <button class="action-btn" onclick="showModule('add-patient')"><i class="bi bi-person-plus"></i><br>Admit</button>
            <button class="action-btn" onclick="showModule('patients')"><i class="bi bi-people"></i><br>Patients</button>
            <button class="action-btn" onclick="showModule('daily-notes')"><i class="bi bi-file-earmark-text"></i><br>Notes</button>
            <button class="action-btn" onclick="showModule('discharge')"><i class="bi bi-box-arrow-right"></i><br>Discharge</button>
            <button class="action-btn" onclick="showModule('billing')"><i class="bi bi-receipt"></i><br>Billing</button>
            <button class="action-btn" onclick="showModule('patient-record')"><i class="bi bi-file-earmark-medical"></i><br>Records</button>
        `,
        'staff': `
            <button class="action-btn" onclick="showModule('add-patient')"><i class="bi bi-person-plus"></i><br>Admit</button>
            <button class="action-btn" onclick="showModule('patients')"><i class="bi bi-people"></i><br>Patients</button>
            <button class="action-btn" onclick="showModule('daily-notes')"><i class="bi bi-file-earmark-text"></i><br>Notes</button>
        `,
        'receptionist': `
            <button class="action-btn" onclick="showModule('add-patient')"><i class="bi bi-person-plus"></i><br>New Admission</button>
            <button class="action-btn" onclick="showModule('patients')"><i class="bi bi-people"></i><br>Patient List</button>
        `
    };

    // Role info panels (doctor, staff, receptionist)
    const roleInfoPanel = {
        'doctor': `
            <div class="role-info-panel">
                <div class="info-panel-card doctor-panel">
                    <div class="info-panel-header"><i class="bi bi-activity"></i><h4>Clinical Summary</h4></div>
                    <div class="info-panel-body">
                        <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">${currentUser?.name || 'Doctor'}</span></div>
                        <div class="info-row"><span class="info-label">Active Patients</span><span class="info-value" id="doc-active-count">—</span></div>
                        <div class="info-row"><span class="info-label">Discharged Today</span><span class="info-value" id="doc-discharged-today">—</span></div>
                        <div class="info-row"><span class="info-label">Surgery Cases</span><span class="info-value" id="doc-surgery-count">—</span></div>
                    </div>
                </div>
                <div class="info-panel-card bed-panel">
                    <div class="info-panel-header"><i class="bi bi-hospital"></i><h4>Bed Occupancy</h4></div>
                    <div class="info-panel-body" id="bed-occupancy-display">
                        <div style="text-align:center; padding:10px; color:#94a3b8; font-size:12px;">Loading...</div>
                    </div>
                </div>
            </div>`,
        'staff': `
            <div class="role-info-panel">
                <div class="info-panel-card staff-panel">
                    <div class="info-panel-header"><i class="bi bi-clipboard-check"></i><h4>Shift Overview</h4></div>
                    <div class="info-panel-body">
                        <div class="info-row"><span class="info-label">On Duty</span><span class="info-value">${currentUser?.name || 'Staff'}</span></div>
                        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${new Date().toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'})}</span></div>
                        <div class="info-row"><span class="info-label">Active Patients</span><span class="info-value" id="staff-active-count">—</span></div>
                        <div class="info-row"><span class="info-label">Notes Pending</span><span class="info-value" style="color:#f59e0b;">Check Daily Notes</span></div>
                    </div>
                </div>
                <div class="info-panel-card bed-panel">
                    <div class="info-panel-header"><i class="bi bi-hospital"></i><h4>Bed Occupancy</h4></div>
                    <div class="info-panel-body" id="bed-occupancy-display">
                        <div style="text-align:center; padding:10px; color:#94a3b8; font-size:12px;">Loading...</div>
                    </div>
                </div>
            </div>`,
        'receptionist': `
            <div class="role-info-panel">
                <div class="info-panel-card reception-panel">
                    <div class="info-panel-header"><i class="bi bi-bell"></i><h4>Front Desk Status</h4></div>
                    <div class="info-panel-body">
                        <div class="info-row"><span class="info-label">Receptionist</span><span class="info-value">${currentUser?.name || 'Receptionist'}</span></div>
                        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${new Date().toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'})}</span></div>
                        <div class="info-row"><span class="info-label">Today's Admissions</span><span class="info-value" id="rec-today-admissions">—</span></div>
                        <div class="info-row"><span class="info-label">Total Patients</span><span class="info-value" id="rec-total-patients">—</span></div>
                    </div>
                </div>
                <div class="info-panel-card bed-panel">
                    <div class="info-panel-header"><i class="bi bi-hospital"></i><h4>Bed Availability</h4></div>
                    <div class="info-panel-body" id="bed-occupancy-display">
                        <div style="text-align:center; padding:10px; color:#94a3b8; font-size:12px;">Loading...</div>
                    </div>
                </div>
            </div>`
    };

    moduleEl.innerHTML = `
        <style>
            .role-info-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
            .info-panel-card { background: var(--card-bg, #fff); border: 1px solid var(--border, var(--border)); border-radius: 12px; overflow: hidden; }
            .info-panel-header { padding: 12px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--background); }
            .info-panel-header i { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; }
            .info-panel-header h4 { margin: 0; font-size: 13px; font-weight: 700; color: #1e293b; }
            .doctor-panel .info-panel-header i { background: #eef2ff; color: #6366f1; }
            .staff-panel .info-panel-header i { background: #ecfdf5; color: #10b981; }
            .reception-panel .info-panel-header i { background: #fef3c7; color: #f59e0b; }
            .bed-panel .info-panel-header i { background: #fef2f2; color: #ef4444; }
            .info-panel-body { padding: 12px 16px; }
            .info-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px dashed var(--background); font-size: 12px; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #64748b; font-weight: 500; }
            .info-value { color: #1e293b; font-weight: 700; }
            .bed-occ-row { display: flex; align-items: center; padding: 4px 0; font-size: 11px; gap: 8px; }
            .bed-occ-label { color: #475569; font-weight: 600; min-width: 90px; }
            .bed-occ-bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
            .bed-occ-fill { height: 100%; border-radius: 3px; }
            .bed-occ-count { color: #1e293b; font-weight: 700; font-size: 11px; min-width: 36px; text-align: right; }
            @media (max-width: 768px) { .role-info-panel { grid-template-columns: 1fr; } }
        </style>

        <!-- Unified Responsive Dashboard -->
        <div class="dashboard-wrapper">
            
            <!-- Desktop Top Executive Header (Exclusive to Dashboard Only) -->
            <div class="desktop-top-header d-none d-md-flex" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                <!-- Left: Big Prominent Page Title -->
                <div>
                    <h2 style="font-size: 26px; font-weight: 800; color: var(--text-main); margin: 0; line-height: 1.2; letter-spacing: -0.4px;">
                        Dashboard
                    </h2>
                </div>

                <!-- Right: Action Cluster [ 🔔 Bell | 🌓 Theme | 👤 User Avatar + Name ] -->
                <div style="display: flex; align-items: center; gap: 12px;">
                    <!-- Notification Bell -->
                    <button id="desktop-notification-btn" class="header-notification-btn" onclick="toggleNotificationDrawer()" title="Live Notifications">
                        <i class="bi bi-bell"></i>
                        <span id="desktop-notification-badge" class="notification-badge" style="display: none;">0</span>
                    </button>

                    <!-- Theme Toggle Button -->
                    <button class="theme-toggle-btn main-theme-toggle" onclick="toggleTheme()" title="Toggle Light/Dark Theme" style="position: static; display: flex !important; width: 38px; height: 38px; border-radius: 10px; align-items: center; justify-content: center; background: var(--card-bg); border: 1px solid var(--border); cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <i class="bi bi-moon-stars-fill theme-icon" style="color: #64748b; font-size: 15px;"></i>
                    </button>

                    <!-- Clickable User Profile Pill -->
                    <div id="desktop-user-pill" onclick="openProfileModal()" style="display: flex; align-items: center; gap: 10px; padding: 4px 14px 4px 5px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 30px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.04);" onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='var(--border)';">
                        <div id="desktop-user-avatar-wrap">
                            ${(() => {
                                let avatarSrc = '';
                                if (currentUser?.avatar) {
                                    const baseUrl = (typeof API_BASE !== 'undefined' ? API_BASE : '').replace('/api/', '');
                                    avatarSrc = currentUser.avatar.startsWith('http') || currentUser.avatar.startsWith('data:') ? currentUser.avatar : `${baseUrl}${currentUser.avatar}`;
                                }
                                if (avatarSrc) {
                                    return `<img src="${avatarSrc}" alt="User" style="width: 30px; height: 30px; object-fit: cover; border-radius: 50%; border: 1px solid var(--border);">`;
                                }
                                const initial = (currentUser?.name || 'U').trim()[0].toUpperCase();
                                return `<div style="width: 30px; height: 30px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">${initial}</div>`;
                            })()}
                        </div>
                        <div style="text-align: left; line-height: 1.2;">
                            <div id="desktop-user-fullname" style="font-size: 13px; font-weight: 700; color: var(--text-main);">${currentUser?.name || 'User'}</div>
                            <div id="desktop-user-rolepill" style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">${currentUser?.role || 'Staff'}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Mobile Greeting with Top-Right Profile Photo (Hidden on Desktop) -->
            <div class="d-block d-md-none" style="padding: 10px 16px 6px 16px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:12px; color:#64748b; font-weight:600;">Welcome back,</div>
                        <h2 style="font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0; line-height: 1.2;">${currentUser?.name || 'User'}</h2>
                    </div>
                    <div onclick="openProfileModal()" style="cursor:pointer;" title="View Profile">
                        ${(() => {
                            let avatarSrc = '';
                            if (currentUser?.avatar) {
                                const baseUrl = (typeof API_BASE !== 'undefined' ? API_BASE : '').replace('/api/', '');
                                avatarSrc = currentUser.avatar.startsWith('http') || currentUser.avatar.startsWith('data:') ? currentUser.avatar : `${baseUrl}${currentUser.avatar}`;
                            }
                            if (avatarSrc) {
                                return `<img src="${avatarSrc}" alt="${currentUser?.name || 'User'}" style="width:46px; height:46px; border-radius:50%; object-fit:cover; border:1px solid var(--border, #e2e8f0);">`;
                            }
                            const initial = (currentUser?.name || 'U').trim()[0].toUpperCase();
                            return `<div style="width:46px; height:46px; border-radius:50%; background:#f1f5f9; color:#334155; display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:700; border:1px solid var(--border, #e2e8f0);">${initial}</div>`;
                        })()}
                    </div>
                </div>
            </div>

            <!-- Mobile Quick Actions Removed -->
            
            <div class="d-block d-md-none app-section-header mt-3">
                <h3>Overview</h3>
            </div>

            <!-- Summary Stats Grid -->
            <div class="stats-grid app-stats-grid" id="dashboard-metrics"></div>

            <!-- Role Specific Info Panel -->
            ${roleInfoPanel[role] || ''}
            
            <!-- Charts Section (Swipeable on Mobile) -->
            ${showCharts ? `
            <div class="d-block d-md-none app-section-header mt-4">
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 0 16px;">
                    <h3 style="margin:0;">Analytics & Trends</h3>
                    <span style="font-size:11px; color:#64748b; font-weight:600;"><i class="bi bi-arrow-left-right" style="color:var(--primary);"></i> Swipe</span>
                </div>
            </div>
            <div id="admin-charts-section" class="charts-container-responsive">
                <div class="report-card card app-chart-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="icon-box" style="background:#e0f2fe; color:#0284c7; width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px;"><i class="bi bi-people-fill"></i></div>
                            <div>
                                <h4 style="margin:0; font-size:15px; font-weight:700; color:var(--text-main);">Daily Patients</h4>
                            </div>
                        </div>
                        <div id="dash-patient-badge" style="display:flex; align-items:center; gap:6px;"></div>
                    </div>
                    <div style="height:210px; width:100%; position:relative;"><canvas id="dashPatientChart"></canvas></div>
                </div>

                <div class="report-card card app-chart-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="icon-box" style="background:#ecfdf5; color:#10b981; width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px;"><i class="bi bi-cash-stack"></i></div>
                            <div>
                                <h4 style="margin:0; font-size:15px; font-weight:700; color:var(--text-main);">Revenue Overview</h4>
                            </div>
                        </div>
                        <div id="dash-revenue-badge" style="display:flex; align-items:center; gap:6px;"></div>
                    </div>
                    <div style="height:210px; width:100%; position:relative;"><canvas id="dashRevenueChart"></canvas></div>
                </div>

                <div class="report-card card app-chart-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="icon-box" style="background:#fef3c7; color:#f59e0b; width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px;"><i class="bi bi-pie-chart-fill"></i></div>
                            <div>
                                <h4 style="margin:0; font-size:15px; font-weight:700; color:var(--text-main);">Bills Status</h4>
                            </div>
                        </div>
                        <div id="dash-payment-badge" style="display:flex; align-items:center; gap:6px;"></div>
                    </div>
                    <div style="height:210px; width:100%; position:relative;"><canvas id="dashPaymentChart"></canvas></div>
                </div>
            </div>

            <!-- Mobile Swipe Pagination Dots -->
            <div class="d-flex d-md-none justify-content-center align-items-center gap-2 mt-2 mb-3" id="charts-slider-dots">
                <span class="chart-dot" data-idx="0" style="width:18px; height:6px; border-radius:3px; background:var(--primary); transition:all 0.3s ease;"></span>
                <span class="chart-dot" data-idx="1" style="width:6px; height:6px; border-radius:3px; background:#cbd5e1; transition:all 0.3s ease;"></span>
                <span class="chart-dot" data-idx="2" style="width:6px; height:6px; border-radius:3px; background:#cbd5e1; transition:all 0.3s ease;"></span>
            </div>` : ''}
            
            <!-- Quick Actions (Single Horizontal Row below Graphs on Desktop) -->
            <div class="quick-actions-row mb-4 d-none d-md-block">
                <div class="action-buttons-single-row" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
                    ${role === 'admin' || role === 'developer' ? `
                    <div class="quick-action-tile" onclick="showModule('add-patient')">
                        <div class="tile-icon-box">
                            <i class="bi bi-person-plus-fill"></i>
                        </div>
                        <div class="tile-details">
                            <h4>New Admission</h4>
                        </div>
                        <i class="bi bi-arrow-right-short tile-arrow"></i>
                    </div>
                    <div class="quick-action-tile" onclick="showModule('patients')">
                        <div class="tile-icon-box">
                            <i class="bi bi-people-fill"></i>
                        </div>
                        <div class="tile-details">
                            <h4>Patient Directory</h4>
                        </div>
                        <i class="bi bi-arrow-right-short tile-arrow"></i>
                    </div>
                    <div class="quick-action-tile" onclick="showModule('billing')">
                        <div class="tile-icon-box">
                            <i class="bi bi-receipt"></i>
                        </div>
                        <div class="tile-details">
                            <h4>Billing & Invoices</h4>
                        </div>
                        <i class="bi bi-arrow-right-short tile-arrow"></i>
                    </div>
                    <div class="quick-action-tile" onclick="showModule('discharge')">
                        <div class="tile-icon-box">
                            <i class="bi bi-box-arrow-right"></i>
                        </div>
                        <div class="tile-details">
                            <h4>Discharge Summary</h4>
                        </div>
                        <i class="bi bi-arrow-right-short tile-arrow"></i>
                    </div>
                    ` : (roleQuickActions[role] || '')}
                </div>
            </div>

            <!-- Lower Section: 2 Columns on Desktop (Recent Activity on Left, Developer Console on Right) -->
            <div class="dashboard-lower-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; align-items: stretch; margin-top: 20px;">
                <!-- Left Column: Recent Activity Feed -->
                <div class="recent-activity app-activity-list-container" style="background:var(--card-bg); border-radius:16px; padding:18px 20px; border:1px solid var(--border); box-shadow:0 4px 16px rgba(0,0,0,0.04); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div class="app-section-header px-0 px-md-1" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border);">
                            <h3 style="margin:0; font-size:15px; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                                <i class="bi bi-clock-history" style="color:var(--primary);"></i> ${role === 'doctor' ? "Today's Clinical Activity" : "Recent Hospital Activity Feed"}
                            </h3>
                            <span style="font-size:11.5px; color:var(--primary); font-weight:600; cursor:pointer;" onclick="showModule('patients')">View All</span>
                        </div>
                        <div class="activity-list app-activity-list" id="recent-activity-list" style="max-height: 250px; overflow-y: auto;">
                            <div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Loading...</div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Developer Tech Console Slot -->
                <div id="dev-tech-console-slot" style="display: flex; flex-direction: column;"></div>
            </div>
        </div>
    `;

    updateDashboardStats();
    if (typeof renderSyncUI === 'function') renderSyncUI();
    updateRolePanels(role);

    // Developer-only: render tech console after stats load
    if (role === 'developer' && typeof renderDevTechConsole === 'function') {
        renderDevTechConsole();
    }
}

// Update role-specific panels with live data from API (Cache-First, Zero Blink)
async function updateRolePanels(role) {
    function applyRoleData(patients) {
        const admitted = patients.filter(p => (p.status || '').toLowerCase() === 'admitted');
        const today = new Date().toISOString().split('T')[0];
        const todayAdmitted = patients.filter(p => (p.admission_date || '').startsWith(today));
        const surgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');

        if (role === 'doctor') {
            const el1 = document.getElementById('doc-active-count');
            if (el1) el1.textContent = admitted.length;
            const el2 = document.getElementById('doc-discharged-today');
            if (el2) el2.textContent = patients.filter(p => (p.status||'').toLowerCase() === 'discharged').length;
            const el3 = document.getElementById('doc-surgery-count');
            if (el3) el3.textContent = surgeries.length;
        }
        if (role === 'staff') {
            const el = document.getElementById('staff-active-count');
            if (el) el.textContent = admitted.length;
        }
        if (role === 'receptionist') {
            const el1 = document.getElementById('rec-today-admissions');
            if (el1) el1.textContent = todayAdmitted.length;
            const el2 = document.getElementById('rec-total-patients');
            if (el2) el2.textContent = patients.length;
        }

        // Bed occupancy panel (shared across non-admin roles)
        const bedEl = document.getElementById('bed-occupancy-display');
        if (bedEl) {
            // Dynamically calculate ward totals from settings
            const savedBeds = (window.hospitalSettings || {})['hospital-beds'] || '';
            const bedList = savedBeds ? savedBeds.split(',').map(b => b.trim()).filter(b => b) : [];
            const maleTotal = bedList.filter(b => b.startsWith('Male-G')).length || 20;
            const femaleTotal = bedList.filter(b => b.startsWith('Female-G')).length || 20;
            const icuTotal = bedList.filter(b => b.startsWith('ICU-')).length || 7;
            const privateTotal = bedList.filter(b => b.startsWith('Private-')).length || 5;
            
            const wards = {
                'General Male': { total: maleTotal, prefix: 'Male-G' },
                'General Female': { total: femaleTotal, prefix: 'Female-G' },
                'ICU': { total: icuTotal, prefix: 'ICU-' },
                'Private': { total: privateTotal, prefix: 'Private-' }
            };
            let html = '';
            for (const [name, info] of Object.entries(wards)) {
                const occupied = admitted.filter(p => (p.bed_no || '').startsWith(info.prefix)).length;
                const pct = Math.round((occupied / info.total) * 100);
                const color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
                html += `
                    <div class="bed-occ-row">
                        <span class="bed-occ-label">${name}</span>
                        <div class="bed-occ-bar"><div class="bed-occ-fill" style="width:${pct}%; background:${color};"></div></div>
                        <span class="bed-occ-count">${occupied}/${info.total}</span>
                    </div>`;
            }
            bedEl.innerHTML = html;
        }
    }

    // 1. Instant sync render from cache
    let cachedPatients = window.allPatientsData || JSON.parse(localStorage.getItem('patients') || '[]');
    if (cachedPatients && cachedPatients.length > 0) {
        applyRoleData(cachedPatients);
    }

    // 2. Background fresh fetch
    try {
        const res = await fetch(`${API_BASE}patients?_t=${Date.now()}`, {
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
                'Cache-Control': 'no-cache'
            }
        });
        const result = await res.json();
        if (result.success && result.patients) {
            window.allPatientsData = result.patients;
            applyRoleData(result.patients);
        }
    } catch (err) {
        // Cached data already rendered smoothly
    }
}

let dashCharts = {};

async function updateDashboardStats() {
    function computeAndRenderStats(patients, billingMap) {
        const surgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');
        const discharges = JSON.parse(localStorage.getItem('discharge_records') || '[]');

        const totalPatients = patients.length;
        let admittedPatients = patients.filter(p => (p.status || '').toLowerCase() === 'admitted').length;
        let dischargedCount = patients.filter(p => (p.status || '').toLowerCase() === 'discharged').length;
        
        if (admittedPatients < 0) admittedPatients = 0;

        let totalRevenue = 0;
        let paidBills = 0;
        let pendingBills = 0;
        let totalPendingAmt = 0;

        const role = currentUser?.role || 'staff';
        const showFinancials = (role === 'admin' || role === 'developer' || role === 'doctor');
        const showCharts = (role === 'admin' || role === 'developer');

        let allActivities = [];

        // Parse Patients for Activity
        patients.forEach(p => {
            let dDate = p.admission_date || p.date;
            if (dDate) {
                allActivities.push({
                    time: new Date(dDate).getTime(),
                    text: `New patient added: ${p.name}`,
                    icon: 'bi-person-plus',
                    color: '#3498db'
                });
            }

            // Billing Calculations from API data + patient record
            const rec = billingMap[p.patient_id];
            let totalPaid = 0;
            if (rec && rec.payments) {
                rec.payments.forEach(pay => {
                    totalPaid += (pay.amount || 0);
                    const amtDisplay = showFinancials ? `${window.currencySymbol || '₹'}${pay.amount}` : 'payment';
                    allActivities.push({
                        time: new Date(pay.date || Date.now()).getTime(),
                        text: `${amtDisplay} received from ${p.name}`,
                        icon: 'bi-coin',
                        color: '#2ecc71'
                    });
                });
            }
            totalRevenue += totalPaid;

            const discount = rec ? (rec.discount || 0) : 0;
            const netPayable = Math.max(0, (p.totalBill || 0) - discount);
            const remaining = p.pending_amount !== undefined ? p.pending_amount : Math.max(0, netPayable - totalPaid);

            if (remaining <= 0 && netPayable > 0) {
                paidBills++;
            } else if (remaining > 0) {
                pendingBills++;
                totalPendingAmt += remaining;
            }
        });

        // Parse Surgeries for Activity
        surgeries.forEach(s => {
            let pName = patients.find(p => p.patient_id === s.patient_id)?.name || s.patient_id;
            allActivities.push({
                time: new Date(s.date || Date.now()).getTime(),
                text: `Surgery recorded for ${pName}`,
                icon: 'bi-hospital',
                color: '#9b59b6'
            });
        });

        // Parse Discharges for Activity
        discharges.forEach(d => {
            let pName = patients.find(p => p.patient_id === d.patientId)?.name || d.patientId;
            allActivities.push({
                time: new Date(d.dischargeDate || Date.now()).getTime(),
                text: `Patient ${pName} discharged`,
                icon: 'bi-box-arrow-right',
                color: '#2ecc71'
            });
        });

        const curr = window.currencySymbol || '₹';

        // 1. Populate Metrics Cards (Unified Brand SaaS Style)
        const metricsHtml = `
            <div class="stat-card">
                <div class="stat-icon-wrap"><i class="bi bi-people-fill"></i></div>
                <div class="stat-val-wrap">
                    <h3>${totalPatients}</h3>
                    <p>Total Patients</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-wrap"><i class="bi bi-hospital-fill"></i></div>
                <div class="stat-val-wrap">
                    <h3>${admittedPatients}</h3>
                    <p>Admitted</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-wrap"><i class="bi bi-box-arrow-right"></i></div>
                <div class="stat-val-wrap">
                    <h3>${dischargedCount}</h3>
                    <p>Discharged</p>
                </div>
            </div>
            ${showFinancials ? `
            <div class="stat-card">
                <div class="stat-icon-wrap"><i class="bi bi-currency-rupee"></i></div>
                <div class="stat-val-wrap">
                    <h3>${curr}${totalRevenue.toLocaleString()}</h3>
                    <p>Revenue Collected</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-wrap"><i class="bi bi-check-circle-fill"></i></div>
                <div class="stat-val-wrap">
                    <h3>${paidBills}</h3>
                    <p>Paid Invoices</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-wrap"><i class="bi bi-clock-history"></i></div>
                <div class="stat-val-wrap">
                    <h3>${pendingBills}</h3>
                    <p>Pending Bills</p>
                </div>
            </div>` : ''}
        `;
        const mNode = document.getElementById('dashboard-metrics');
        if(mNode) mNode.innerHTML = metricsHtml;

        // Global Stats Update for Sidebar if exists
        let stPat = document.getElementById('stat-patients');
        if (stPat) stPat.textContent = admittedPatients;
        let stRev = document.getElementById('stat-revenue');
        if (showFinancials) {
            if (stRev) stRev.textContent = `${curr}${totalRevenue.toLocaleString()}`;
        } else {
            if (stRev) stRev.textContent = 'RESTRICTED';
        }

        // 2. Render Activities
        allActivities.sort((a, b) => b.time - a.time); // Descending
        const actList = document.getElementById('recent-activity-list');
        if (actList) {
            if (allActivities.length === 0) {
                actList.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:12px;">No recent activity</div>';
            } else {
                actList.innerHTML = allActivities.slice(0, 5).map(act => {
                    const timeStr = typeof timeAgo === 'function' ? timeAgo(act.time) : new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `
                    <div class="activity-item" style="display:flex; align-items:center; gap:12px; padding:9px 12px; background:var(--background, #f8fafc); border-radius:10px; border:1px solid var(--border, #e2e8f0); margin-bottom:7px; transition:all 0.2s ease;">
                        <div style="width:32px; height:32px; border-radius:8px; background:${act.color}15; color:${act.color}; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;">
                            <i class="bi ${act.icon}"></i>
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:12px; font-weight:700; color:var(--text-main); line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${act.text}</div>
                            <div style="font-size:10.5px; color:#94a3b8; margin-top:2px;">${timeStr}</div>
                        </div>
                    </div>
                `}).join('');
            }
        }

        // 3. Render Charts
        if (typeof Chart !== 'undefined' && showCharts) {
            renderDashboardCharts(totalPatients, totalRevenue, totalPendingAmt, paidBills, pendingBills, patients);

            // Setup Swipe Dots Indicator on Mobile
            const slider = document.getElementById('admin-charts-section');
            const dots = document.querySelectorAll('#charts-slider-dots .chart-dot');
            if (slider && dots.length > 0 && !slider.dataset.swipeBound) {
                slider.dataset.swipeBound = 'true';
                slider.addEventListener('scroll', () => {
                    const scrollLeft = slider.scrollLeft;
                    const cardWidth = slider.firstElementChild?.offsetWidth || 300;
                    const activeIndex = Math.min(dots.length - 1, Math.max(0, Math.round(scrollLeft / (cardWidth + 14))));
                    dots.forEach((dot, idx) => {
                        if (idx === activeIndex) {
                            dot.style.width = '18px';
                            dot.style.background = 'var(--primary)';
                        } else {
                            dot.style.width = '6px';
                            dot.style.background = '#cbd5e1';
                        }
                    });
                }, { passive: true });
            }
        }
    }

    // Step 1: Render immediately from memory/cache (Instant, Zero Flicker)
    let initialPatients = window.allPatientsData || JSON.parse(localStorage.getItem('patients') || '[]');
    let initialBilling = JSON.parse(localStorage.getItem('billing_records') || '{}');
    computeAndRenderStats(initialPatients, initialBilling);

    // Step 2: Fetch fresh data from API silently in the background
    try {
        const [pRes, bRes] = await Promise.all([
            fetch(`${API_BASE}patients?_t=${Date.now()}`, {
                headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token'), 'Cache-Control': 'no-cache' }
            }),
            fetch(`${API_BASE}billing?_t=${Date.now()}`, {
                headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token'), 'Cache-Control': 'no-cache' }
            })
        ]);
        const pData = await pRes.json();
        const bData = await bRes.json();

        let freshPatients = initialPatients;
        if (pData.success && pData.patients) {
            freshPatients = pData.patients;
            window.allPatientsData = freshPatients;
            localStorage.setItem('patients', JSON.stringify(freshPatients));
        }

        let freshBilling = {};
        if (bData.success && bData.billings) {
            bData.billings.forEach(b => { freshBilling[b.patient_id] = b; });
        } else {
            freshBilling = initialBilling;
        }

        computeAndRenderStats(freshPatients, freshBilling);
    } catch (e) {
        // Cached data already rendered smoothly
    }
}

function renderDashboardCharts(totalPatients, totalRevenue, totalPendingAmt, paidBills, pendingBills, patients) {
    const curr = window.currencySymbol || '₹';
    const isDark = document.body.classList.contains('dark-theme');
    const labelColor = isDark ? '#cbd5e1' : '#475569';
    const tickColor = isDark ? '#94a3b8' : '#64748b';
    const pieBorderColor = isDark ? '#111827' : '#ffffff';

    const canvas1 = document.getElementById('dashPatientChart');
    const canvas2 = document.getElementById('dashRevenueChart');
    const canvas3 = document.getElementById('dashPaymentChart');

    if (!canvas1 || !canvas2 || !canvas3) return;

    // Calculate OPD vs IPD totals
    let totalOpd = 0;
    let totalIpd = 0;
    let opdGrps = {};
    let ipdGrps = {};
    let allDatesSet = new Set();
    
    if (patients && Array.isArray(patients)) {
        patients.forEach(p => {
            const type = (p.patient_type || '').toUpperCase();
            if (type === 'OPD') totalOpd++;
            else totalIpd++;

            let d = p.admission_date || p.createdAt || p.date || new Date().toISOString();
            let short = d.split('T')[0];
            allDatesSet.add(short);
            
            if (type === 'OPD') {
                opdGrps[short] = (opdGrps[short] || 0) + 1;
            } else {
                ipdGrps[short] = (ipdGrps[short] || 0) + 1;
            }
        });
    }

    // Update Quick Header Badges
    const patBadge = document.getElementById('dash-patient-badge');
    if (patBadge) {
        patBadge.innerHTML = `
            <span style="background:rgba(2,132,199,0.1); color:#0284c7; font-weight:700; font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid rgba(2,132,199,0.2); white-space:nowrap;">● OPD: ${totalOpd}</span>
            <span style="background:rgba(99,102,241,0.1); color:#4f46e5; font-weight:700; font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid rgba(99,102,241,0.2); white-space:nowrap;">● IPD: ${totalIpd}</span>
        `;
    }

    const revBadge = document.getElementById('dash-revenue-badge');
    if (revBadge) {
        revBadge.innerHTML = `
            <span style="background:rgba(16,185,129,0.1); color:#059669; font-weight:700; font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid rgba(16,185,129,0.2); white-space:nowrap;">${curr}${totalRevenue.toLocaleString()} Total</span>
        `;
    }

    const payBadge = document.getElementById('dash-payment-badge');
    if (payBadge) {
        payBadge.innerHTML = `
            <span style="background:rgba(16,185,129,0.1); color:#059669; font-weight:700; font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid rgba(16,185,129,0.2); white-space:nowrap;">${paidBills} Paid</span>
            <span style="background:rgba(244,63,94,0.1); color:#e11d48; font-weight:700; font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid rgba(244,63,94,0.2); white-space:nowrap;">${pendingBills} Due</span>
        `;
    }
    
    // Generate true Last 7 Days timeline (e.g. Past 7 days to Today)
    const last7Days = [];
    const formattedDates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        last7Days.push(dateStr);
        formattedDates.push(i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    }
    
    const opdData = last7Days.map(d => opdGrps[d] || 0);
    const ipdData = last7Days.map(d => ipdGrps[d] || 0);

    // If charts already exist, perform silent in-place update without flash
    if (dashCharts['pat'] && dashCharts['rev'] && dashCharts['pay']) {
        try {
            dashCharts['pat'].data.labels = formattedDates;
            dashCharts['pat'].data.datasets[0].data = opdData;
            dashCharts['pat'].data.datasets[1].data = ipdData;
            dashCharts['pat'].update('none');

            dashCharts['rev'].data.datasets[0].data = [totalRevenue, totalPendingAmt];
            dashCharts['rev'].update('none');

            dashCharts['pay'].data.labels = [`Paid (${paidBills})`, `Pending (${pendingBills})`];
            dashCharts['pay'].data.datasets[0].data = [paidBills || (pendingBills === 0 ? 1 : 0), pendingBills];
            dashCharts['pay'].update('none');
            return;
        } catch (err) {
            // Continue to re-create if instance was detached
        }
    }

    Object.keys(dashCharts).forEach(k => { if (dashCharts[k]) dashCharts[k].destroy(); });

    // 1. Daily Patients Smooth Curved Area Trend
    let ctx1 = document.getElementById('dashPatientChart')?.getContext('2d');
    if (ctx1) {
        const gradOpd = ctx1.createLinearGradient(0, 0, 0, 190);
        gradOpd.addColorStop(0, 'rgba(2, 132, 199, 0.28)');
        gradOpd.addColorStop(1, 'rgba(2, 132, 199, 0.00)');

        const gradIpd = ctx1.createLinearGradient(0, 0, 0, 190);
        gradIpd.addColorStop(0, 'rgba(99, 102, 241, 0.24)');
        gradIpd.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

        dashCharts['pat'] = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: formattedDates,
                datasets: [
                    {
                        label: 'OPD Patients',
                        data: opdData,
                        borderColor: '#0284c7',
                        borderWidth: 2.5,
                        backgroundColor: gradOpd,
                        fill: true,
                        tension: 0.38,
                        pointRadius: 3.5,
                        pointBackgroundColor: '#0284c7',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 1.5,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'IPD Patients',
                        data: ipdData,
                        borderColor: '#6366f1',
                        borderWidth: 2.5,
                        backgroundColor: gradIpd,
                        fill: true,
                        tension: 0.38,
                        pointRadius: 3.5,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 1.5,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            boxHeight: 4,
                            borderRadius: 2,
                            useBorderRadius: true,
                            color: labelColor,
                            font: { size: 11, weight: '700' },
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#0f172a',
                        titleColor: '#f8fafc',
                        bodyColor: '#f8fafc',
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} Patient${ctx.raw === 1 ? '' : 's'}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: tickColor,
                            stepSize: 1,
                            precision: 0,
                            font: { size: 10, weight: '600' }
                        },
                        grid: {
                            color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            borderDash: [3, 3]
                        }
                    },
                    x: {
                        ticks: {
                            color: tickColor,
                            font: { size: 10, weight: '600' }
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 2. Revenue Collected vs Pending Chart
    let ctx2 = document.getElementById('dashRevenueChart')?.getContext('2d');
    if (ctx2) {
        const gradCollected = ctx2.createLinearGradient(0, 0, 0, 190);
        gradCollected.addColorStop(0, '#10b981');
        gradCollected.addColorStop(1, '#059669');

        const gradPending = ctx2.createLinearGradient(0, 0, 0, 190);
        gradPending.addColorStop(0, '#f43f5e');
        gradPending.addColorStop(1, '#e11d48');

        dashCharts['rev'] = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Collected', 'Pending Due'],
                datasets: [{
                    label: `Amount (${curr})`,
                    data: [totalRevenue, totalPendingAmt],
                    backgroundColor: [gradCollected, gradPending],
                    borderRadius: 10,
                    borderSkipped: false,
                    maxBarThickness: 42
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#0f172a',
                        titleColor: '#f8fafc',
                        bodyColor: '#f8fafc',
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => ` Amount: ${curr}${ctx.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: tickColor,
                            callback: v => {
                                if (v >= 100000) return `${curr}${(v/100000).toFixed(1)}L`;
                                if (v >= 1000) return `${curr}${(v/1000).toFixed(0)}k`;
                                return `${curr}${v}`;
                            },
                            font: { size: 10, weight: '600' }
                        },
                        grid: {
                            color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            borderDash: [3, 3]
                        }
                    },
                    x: {
                        ticks: {
                            color: tickColor,
                            font: { size: 11, weight: '700' }
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 3. Paid vs Pending Invoices Doughnut Chart (With Center Text)
    let ctx3 = document.getElementById('dashPaymentChart')?.getContext('2d');
    if (ctx3) {
        const totalBillsCount = (paidBills || 0) + (pendingBills || 0);
        dashCharts['pay'] = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: [`Paid (${paidBills})`, `Pending (${pendingBills})`],
                datasets: [{
                    data: [paidBills || (pendingBills === 0 ? 1 : 0), pendingBills],
                    backgroundColor: ['#10b981', '#f43f5e'],
                    borderWidth: 3,
                    borderColor: pieBorderColor,
                    hoverOffset: 6,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            borderRadius: 3,
                            useBorderRadius: true,
                            color: labelColor,
                            padding: 12,
                            font: { size: 11, weight: '700' }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#0f172a',
                        titleColor: '#f8fafc',
                        bodyColor: '#f8fafc',
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.raw} Invoices`
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerTextPlugin',
                beforeDraw: (chart) => {
                    const { width, height, ctx } = chart;
                    ctx.save();
                    const centerX = width / 2;
                    const centerY = (height / 2) - 10;

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Draw count
                    ctx.font = '800 22px Outfit, sans-serif';
                    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
                    ctx.fillText(totalBillsCount, centerX, centerY);

                    // Draw label
                    ctx.font = '700 9.5px Outfit, sans-serif';
                    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
                    ctx.fillText('TOTAL INVOICES', centerX, centerY + 16);
                    ctx.restore();
                }
            }]
        });
    }
}

// ==================== DEVELOPER TECH CONSOLE ====================
async function renderDevTechConsole() {
    const slot = document.getElementById('dev-tech-console-slot');
    if (!slot) return;

    slot.innerHTML = `
        <div id="dev-tech-console" style="
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-radius: 16px;
            padding: 18px 20px;
            border: 1px solid #334155;
            box-shadow: 0 4px 16px rgba(0,0,0,0.25);
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        ">
            <!-- Header -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #334155;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:34px; height:34px; background:rgba(251,191,36,0.15); border:1px solid #fbbf24; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px;">⚡</div>
                    <div>
                        <div style="color:#fbbf24; font-weight:800; font-size:14.5px; font-family:'Outfit',sans-serif;">Developer Tech Console</div>
                        <div style="color:#94a3b8; font-size:10.5px; margin-top:1px;">Live Endpoints & System Telemetry</div>
                    </div>
                </div>
                <button onclick="renderDevTechConsole()" style="background:#1e293b; border:1px solid #334155; color:#94a3b8; padding:5px 10px; border-radius:7px; cursor:pointer; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>

            <!-- Server Cards Grid -->
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-bottom:12px;">
                ${[
                    { label: 'Main Backend API', url: 'https://chaudhary-hms-api-h7nl.onrender.com/api/health', id: 'srv-main' },
                    { label: 'HMS Server API', url: 'https://hms-backend-w20q.onrender.com/api/health', id: 'srv-hms' },
                    { label: 'Local Dev Server', url: 'http://127.0.0.1:5000/api/health', id: 'srv-local' },
                    { label: 'Email (SMTP)', url: 'chaudharyhealthcare198@gmail.com', id: 'smtp' }
                ].map(srv => `
                    <div style="background:#0f172a; border:1px solid #1e293b; border-radius:10px; padding:9px 12px;">
                        <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">${srv.label}</div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span id="${srv.id}-dot" style="width:7px; height:7px; border-radius:50%; background:#64748b; flex-shrink:0;"></span>
                            <span id="${srv.id}-text" style="font-size:11px; color:#94a3b8; font-weight:600;">Checking...</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Quick Dev Actions -->
            <div style="border-top:1px solid #1e293b; padding-top:12px; display:flex; flex-wrap:wrap; gap:6px;">
                <button onclick="showModule('settings')" style="background:#1e293b; border:1px solid #334155; color:#fbbf24; padding:6px 10px; border-radius:7px; cursor:pointer; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
                    <i class="bi bi-gear-fill"></i> Settings
                </button>
                <button onclick="showModule('users')" style="background:#1e293b; border:1px solid #334155; color:#60a5fa; padding:6px 10px; border-radius:7px; cursor:pointer; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
                    <i class="bi bi-people-fill"></i> Users
                </button>
                <button onclick="showModule('reports')" style="background:#1e293b; border:1px solid #334155; color:#34d399; padding:6px 10px; border-radius:7px; cursor:pointer; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
                    <i class="bi bi-bar-chart-fill"></i> Reports
                </button>
                <button onclick="window.open('https://cloud.mongodb.com','_blank')" style="background:#1e293b; border:1px solid #334155; color:#a78bfa; padding:6px 10px; border-radius:7px; cursor:pointer; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
                    <i class="bi bi-database-fill"></i> Atlas
                </button>
            </div>
        </div>
    `;

    // Check server health
    const servers = [
        { id: 'srv-main', url: 'https://chaudhary-hms-api-h7nl.onrender.com/api/health' },
        { id: 'srv-hms',  url: 'https://hms-backend-w20q.onrender.com/api/health' },
        { id: 'srv-local', url: 'http://127.0.0.1:5000/api/health' }
    ];

    servers.forEach(async (srv) => {
        const dot = document.getElementById(`${srv.id}-dot`);
        const txt = document.getElementById(`${srv.id}-text`);
        try {
            const start = Date.now();
            const res = await fetch(srv.url, { signal: AbortSignal.timeout(5000) });
            const ms = Date.now() - start;
            if (res.ok) {
                if (dot) { dot.style.background = '#10b981'; dot.style.boxShadow = '0 0 6px #10b981'; }
                if (txt) { txt.textContent = `Online (${ms}ms)`; txt.style.color = '#10b981'; }
            } else {
                if (dot) dot.style.background = '#f59e0b';
                if (txt) { txt.textContent = `Degraded (${res.status})`; txt.style.color = '#f59e0b'; }
            }
        } catch {
            if (srv.id === 'srv-local' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') {
                if (dot) dot.style.background = '#64748b';
                if (txt) { txt.textContent = 'Skipped (Live Env)'; txt.style.color = '#64748b'; }
            } else {
                if (dot) dot.style.background = '#ef4444';
                if (txt) { txt.textContent = 'Offline / Unreachable'; txt.style.color = '#ef4444'; }
            }
        }
    });

    // Check SMTP (via backend status endpoint)
    try {
        const sRes = await fetch(`${API_BASE}integrations/status`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const sData = await sRes.json();
        const smtpDot = document.getElementById('smtp-dot');
        const smtpTxt = document.getElementById('smtp-text');
        if (sData.status?.smtp?.configured) {
            if (smtpDot) { smtpDot.style.background = '#10b981'; smtpDot.style.boxShadow = '0 0 6px #10b981'; }
            if (smtpTxt) { smtpTxt.textContent = 'Configured ✓'; smtpTxt.style.color = '#10b981'; }
        } else {
            if (smtpDot) smtpDot.style.background = '#f59e0b';
            if (smtpTxt) { smtpTxt.textContent = 'Not Configured'; smtpTxt.style.color = '#f59e0b'; }
        }
    } catch {
        const smtpDot = document.getElementById('smtp-dot');
        const smtpTxt = document.getElementById('smtp-text');
        if (smtpDot) smtpDot.style.background = '#64748b';
        if (smtpTxt) smtpTxt.textContent = 'Status Unknown';
    }
}
window.renderDevTechConsole = renderDevTechConsole;