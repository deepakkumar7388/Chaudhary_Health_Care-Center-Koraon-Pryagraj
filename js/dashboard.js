// ==================== DASHBOARD MODULE ====================

function renderDashboard() {
    const moduleEl = document.getElementById('module-dashboard');
    if (!moduleEl) return;

    const role = currentUser?.role || 'admin';

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
        <div class="dashboard-wrapper" style="padding-top: 10px;">
            
            <!-- Desktop Welcome Card (Hidden on Mobile) -->
            <div class="welcome-card hero-section d-none d-md-flex" style="
                    padding: 20px 24px;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #3730a3) 100%);
                    color: white;
                    border-radius: 14px;
                    margin-bottom: 20px;
                    box-shadow: 0 8px 24px rgba(79,70,229,0.25);
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    flex-wrap: wrap;
                ">
                <!-- Left: Hospital Info -->
                <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:0;">
                    <div style="
                        width:48px; height:48px; flex-shrink:0;
                        background: rgba(255,255,255,0.18);
                        border-radius:12px;
                        display:flex; align-items:center; justify-content:center;
                        font-size:22px;
                        backdrop-filter: blur(8px);
                        border: 1px solid rgba(255,255,255,0.25);
                    ">🏥</div>
                    <div style="min-width:0;">
                        <h1 style="margin:0; font-size:18px; font-weight:800; color:white; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            Chaudhary Health Care Center
                        </h1>
                        <p style="margin:2px 0 0; font-size:11px; opacity:0.75; font-weight:500; letter-spacing:0.5px; text-transform:uppercase;">
                            Koraon, Prayagraj &nbsp;·&nbsp; Hospital Management System
                        </p>
                    </div>
                </div>

                <!-- Right: User greeting + date -->
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="
                            background: rgba(255,255,255,0.15);
                            border: 1px solid rgba(255,255,255,0.25);
                            border-radius:20px;
                            padding: 3px 10px;
                            font-size:11px;
                            font-weight:600;
                            letter-spacing:0.3px;
                            backdrop-filter:blur(6px);
                        ">${roleSubtitle[role] || 'Home'}</div>
                    </div>
                    <p style="margin:0; font-size:13px; font-weight:700; color:white; opacity:0.95;">
                        👋 ${currentUser?.name || 'User'}
                    </p>
                    <p style="margin:0; font-size:11px; opacity:0.65;">
                        ${new Date().toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
                    </p>
                </div>
            </div>

            <!-- Mobile Greeting (Hidden on Desktop) -->
            <div class="d-block d-md-none" style="padding: 10px 16px 0 16px;">
                <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main); margin: 0; padding-bottom: 8px;">Hi, ${currentUser?.name?.split(' ')[0] || 'User'} 👋</h2>
            </div>

            <!-- Mobile Quick Actions Removed -->
            
            <div class="d-block d-md-none app-section-header mt-3">
                <h3>Overview</h3>
            </div>

            <!-- Summary Stats Grid -->
            <div class="stats-grid app-stats-grid" id="dashboard-metrics"></div>

            <!-- Role Specific Info Panel -->
            ${roleInfoPanel[role] || ''}
            
            <!-- Charts Section -->
            ${showCharts ? `
            <div class="d-block d-md-none app-section-header mt-4">
                <h3>Analytics</h3>
            </div>
            <div id="admin-charts-section" class="charts-container-responsive">
                <div class="report-card card app-chart-card">
                    <h3 class="d-none d-md-block" style="margin-bottom:10px; font-size:14px;"><i class="bi bi-graph-up-arrow" style="color:#3498db;"></i> Patient Registrations</h3>
                    <div class="app-chart-header d-flex d-md-none">
                        <div class="icon-box" style="background:#e0f2fe; color:#0ea5e9;"><i class="bi bi-graph-up"></i></div>
                        <h4>Registrations</h4>
                    </div>
                    <div style="height:200px; width:100%; position:relative;"><canvas id="dashPatientChart"></canvas></div>
                </div>
                <div class="report-card card app-chart-card">
                    <h3 class="d-none d-md-block" style="margin-bottom:10px; font-size:14px;"><i class="bi bi-bar-chart" style="color:#2ecc71;"></i> Revenue Streams</h3>
                    <div class="app-chart-header d-flex d-md-none">
                        <div class="icon-box" style="background:#ecfdf5; color:#10b981;"><i class="bi bi-cash-stack"></i></div>
                        <h4>Revenue</h4>
                    </div>
                    <div style="height:200px; width:100%; position:relative;"><canvas id="dashRevenueChart"></canvas></div>
                </div>
                <div class="report-card card app-chart-card">
                    <h3 class="d-none d-md-block" style="margin-bottom:10px; font-size:14px;"><i class="bi bi-pie-chart" style="color:#f1c40f;"></i> Payment Status</h3>
                    <div class="app-chart-header d-flex d-md-none">
                        <div class="icon-box" style="background:#fef3c7; color:#f59e0b;"><i class="bi bi-pie-chart"></i></div>
                        <h4>Payments</h4>
                    </div>
                    <div style="height:200px; width:100%; position:relative;"><canvas id="dashPaymentChart"></canvas></div>
                </div>
            </div>` : ''}
            
            <!-- Lower Section (Desktop layout) / Activity List (Mobile) -->
            <div class="dashboard-lower mt-4">
                <div class="recent-activity app-activity-list-container">
                    <div class="app-section-header px-0 px-md-3">
                        <h3 style="font-size:14px; font-weight:700;">
                            <i class="bi bi-clock-history" style="color:#8b5cf6;"></i> ${role === 'doctor' ? "Today's Activity" : "Recent Activity"}
                        </h3>
                        <span class="d-block d-md-none" style="font-size:12px; color:var(--primary); cursor:pointer;" onclick="showModule('patients')">View All</span>
                    </div>
                    <div class="activity-list app-activity-list" id="recent-activity-list" style="max-height: 220px; overflow-y: auto;">
                        <div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Loading...</div>
                    </div>
                </div>
                
                <div class="quick-actions d-none d-md-block">
                    <h3 style="margin-bottom:12px; font-size:14px; border-bottom:1px solid #eee; padding-bottom:8px;">
                        <i class="bi bi-lightning-charge" style="color:#f59e0b;"></i> Quick Actions
                    </h3>
                    <div class="action-buttons" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        ${role === 'admin' || role === 'developer' ? `
                        <button class="action-btn" onclick="showModule('add-patient')"><i class="bi bi-person-plus"></i><br>Add Patient</button>
                        <button class="action-btn" onclick="showModule('billing')"><i class="bi bi-receipt"></i><br>Billing</button>
                        <button class="action-btn" onclick="showModule('discharge')"><i class="bi bi-box-arrow-right"></i><br>Discharge</button>
                        <button class="action-btn" onclick="showModule('patients')"><i class="bi bi-people"></i><br>Patients</button>
                        ` : (roleQuickActions[role] || '')}
                    </div>
                </div>
            </div>
        </div>
    `;

    updateDashboardStats();
    if (typeof renderSyncUI === 'function') renderSyncUI();
    setTimeout(() => updateRolePanels(role), 600);

    // Developer-only: render tech console after stats load
    if (role === 'developer') {
        setTimeout(() => renderDevTechConsole(), 800);
    }
}

// Update role-specific panels with live data from API
async function updateRolePanels(role) {
    let patients = [];
    try {
        const res = await fetch(`${API_BASE}patients?_t=${Date.now()}`, {
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
                'Cache-Control': 'no-cache'
            }
        });
        const result = await res.json();
        if (result.success && result.patients) {
            patients = result.patients;
            window.allPatientsData = patients; // sync global state
        }
    } catch (err) {
        console.log('Role panel: API failed, using cached data');
        patients = window.allPatientsData || JSON.parse(localStorage.getItem('patients') || '[]');
    }

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

let dashCharts = {};

async function updateDashboardStats() {
    // Fetch real data from API first
    let patients = [];
    try {
        const res = await fetch(`${API_BASE}patients?_t=${Date.now()}`, {
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
                'Cache-Control': 'no-cache'
            }
        });
        const result = await res.json();
        if (result.success && result.patients) {
            patients = result.patients;
            window.allPatientsData = patients;
        } else {
            patients = window.allPatientsData || JSON.parse(localStorage.getItem('patients') || '[]');
        }
    } catch (err) {
        patients = window.allPatientsData || JSON.parse(localStorage.getItem('patients') || '[]');
    }

    // Fetch billing data from API for real monitoring
    let billingMap = {};
    try {
        const bRes = await fetch(`${API_BASE}billing?_t=${Date.now()}`, {
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
                'Cache-Control': 'no-cache'
            }
        });
        const bData = await bRes.json();
        if (bData.success && bData.billings) {
            bData.billings.forEach(b => { billingMap[b.patient_id] = b; });
        }
    } catch (err) {
        // Fallback to localStorage
        billingMap = JSON.parse(localStorage.getItem('billing_records') || '{}');
    }

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

    const role = currentUser?.role || 'admin';
    const showFinancials = (role === 'admin' || role === 'developer' || role === 'doctor');

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



    // 1. Populate Metrics Cards
    const metricsHtml = `
        <div class="stat-card">
            <i class="bi bi-people"></i>
            <div>
                <h3>${totalPatients}</h3>
                <p>Total Patients</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="bi bi-hospital"></i>
            <div>
                <h3>${admittedPatients}</h3>
                <p>Admitted</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="bi bi-box-arrow-right"></i>
            <div>
                <h3>${dischargedCount}</h3>
                <p>Discharged</p>
            </div>
        </div>
        ${showFinancials ? `
        <div class="stat-card">
            <i class="bi bi-coin"></i>
            <div>
                <h3>${curr}${totalRevenue.toLocaleString()}</h3>
                <p>Revenue</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="bi bi-check-circle"></i>
            <div>
                <h3>${paidBills}</h3>
                <p>Paid Bills</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="bi bi-exclamation-circle"></i>
            <div>
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
            actList.innerHTML = allActivities.slice(0, 6).map(act => `
                <div class="activity-item">
                    <div class="activity-icon" style="background:${act.color}15; color:${act.color};">
                        <i class="bi ${act.icon}"></i>
                    </div>
                    <div class="activity-info">
                        <div class="activity-text">${act.text}</div>
                        <div class="activity-time">${new Date(act.time).toLocaleString()}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 3. Render Charts — wrapped in rAF+timeout to ensure canvas is painted in DOM
    if (typeof Chart === 'undefined') return;
    requestAnimationFrame(() => setTimeout(() => renderDashboardCharts(totalPatients, totalRevenue, totalPendingAmt, paidBills, pendingBills, patients), 100));
}

function renderDashboardCharts(totalPatients, totalRevenue, totalPendingAmt, paidBills, pendingBills, patients) {
    const curr = window.currencySymbol || '₹';
    const isDark = document.body.classList.contains('dark-theme');
    const labelColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? '#1f2937' : 'var(--background)';
    const tickColor = isDark ? '#94a3b8' : '#64748b';
    const pieBorderColor = isDark ? '#111827' : '#ffffff';

    const parents = [
        document.getElementById('dashPatientChart')?.parentNode,
        document.getElementById('dashRevenueChart')?.parentNode,
        document.getElementById('dashPaymentChart')?.parentNode
    ];

    if (totalPatients === 0) {
        parents.forEach(p => {
            if (p) p.innerHTML = '<div class="no-data-msg" style="display:flex; height:100%; align-items:center; justify-content:center; color:#e74c3c; font-weight:bold;">No Data Available</div>';
        });
        return;
    } else {
        // Re-inject canvases if they were replaced by no-data message
        if (parents[0] && !document.getElementById('dashPatientChart')) parents[0].innerHTML = '<canvas id="dashPatientChart"></canvas>';
        if (parents[1] && !document.getElementById('dashRevenueChart')) parents[1].innerHTML = '<canvas id="dashRevenueChart"></canvas>';
        if (parents[2] && !document.getElementById('dashPaymentChart')) parents[2].innerHTML = '<canvas id="dashPaymentChart"></canvas>';
    }

    Object.keys(dashCharts).forEach(k => { if (dashCharts[k]) dashCharts[k].destroy(); });

    // Daily OPD and IPD Patient Trends
    let opdGrps = {};
    let ipdGrps = {};
    let allDatesSet = new Set();
    
    if(patients && Array.isArray(patients)){
        patients.forEach(p => {
            let d = p.admission_date || p.createdAt || p.date || new Date().toISOString();
            let short = d.split('T')[0];
            allDatesSet.add(short);
            
            const type = p.patient_type || 'IPD';
            if (type === 'OPD') {
                opdGrps[short] = (opdGrps[short] || 0) + 1;
            } else {
                ipdGrps[short] = (ipdGrps[short] || 0) + 1;
            }
        });
    }
    
    let sDates = Array.from(allDatesSet).sort();
    if (sDates.length > 10) sDates = sDates.slice(-10);
    
    let opdData = sDates.map(d => opdGrps[d] || 0);
    let ipdData = sDates.map(d => ipdGrps[d] || 0);
    
    let formattedDates = sDates.map(d => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });
    
    if (!sDates.length) { 
        formattedDates = ['No Data']; 
        opdData = [0]; 
        ipdData = [0]; 
    }

    let ctx1 = document.getElementById('dashPatientChart')?.getContext('2d');
    if (ctx1) {
        dashCharts['pat'] = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: formattedDates,
                datasets: [
                    {
                        label: 'OPD Patients', data: opdData,
                        borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointRadius: 4, borderWidth: 2
                    },
                    {
                        label: 'IPD Patients', data: ipdData,
                        borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 4, borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 12, color: labelColor, font: { size: 10, weight: '600' } } } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: tickColor, stepSize: 1, font: { size: 11 } }, grid: { color: gridColor } },
                    x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { display: false } }
                }
            }
        });
    }

    let ctx2 = document.getElementById('dashRevenueChart')?.getContext('2d');
    if (ctx2) {
        dashCharts['rev'] = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Collected', 'Pending'],
                datasets: [{
                    label: `Amount (${curr})`, data: [totalRevenue, totalPendingAmt],
                    backgroundColor: ['#10b981', '#ef4444'], borderRadius: 6, borderSkipped: false, barThickness: 40
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${curr}${ctx.raw.toLocaleString()}` } } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: tickColor, callback: v => `${curr}${v.toLocaleString()}`, font: { size: 10 } }, grid: { color: gridColor } },
                    x: { ticks: { color: tickColor, font: { size: 11, weight: '600' } }, grid: { display: false } }
                }
            }
        });
    }

    let ctx3 = document.getElementById('dashPaymentChart')?.getContext('2d');
    if (ctx3) {
        dashCharts['pay'] = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: [`Paid (${paidBills})`, `Pending (${pendingBills})`],
                datasets: [{
                    data: [paidBills, pendingBills], backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 3, borderColor: pieBorderColor, hoverOffset: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '55%',
                plugins: { legend: { position: 'bottom', labels: { color: labelColor, padding: 12, font: { size: 11, weight: '600' } } } }
            }
        });
    }
}

// ==================== DEVELOPER TECH CONSOLE ====================
async function renderDevTechConsole() {
    const dashContainer = document.querySelector('.dashboard-wrapper');
    if (!dashContainer) return;

    // Remove existing console if any
    const existing = document.getElementById('dev-tech-console');
    if (existing) existing.remove();

    const consoleEl = document.createElement('div');
    consoleEl.id = 'dev-tech-console';
    consoleEl.style.cssText = 'margin-top: 20px;';
    consoleEl.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-radius: 16px;
            padding: 20px 24px;
            border: 1px solid #334155;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        ">
            <!-- Header -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:40px; height:40px; background:rgba(251,191,36,0.15); border:1px solid #fbbf24; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">⚡</div>
                    <div>
                        <div style="color:#fbbf24; font-weight:800; font-size:16px; font-family:'Outfit',sans-serif;">Developer Tech Console</div>
                        <div style="color:#64748b; font-size:11px; margin-top:2px;">System health & configuration — visible only to you</div>
                    </div>
                </div>
                <button onclick="renderDevTechConsole()" style="background:#1e293b; border:1px solid #334155; color:#94a3b8; padding:7px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px;">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>

            <!-- Server Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:18px;">
                ${[
                    { label: 'Main Backend (Render)', url: 'https://chaudhary-health-care-center-koraon-bbw0.onrender.com', id: 'srv-main' },
                    { label: 'HMS Backend (Render)', url: 'https://hms-backend-w20q.onrender.com', id: 'srv-hms' },
                    { label: 'Local Dev Server', url: 'http://127.0.0.1:5000', id: 'srv-local' }
                ].map(srv => `
                    <div style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:14px;">
                        <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">${srv.label}</div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span id="${srv.id}-dot" style="width:8px; height:8px; border-radius:50%; background:#64748b; flex-shrink:0;"></span>
                            <span id="${srv.id}-text" style="font-size:12px; color:#94a3b8; font-weight:600;">Checking...</span>
                        </div>
                        <div style="margin-top:8px; font-size:10px; color:#475569; word-break:break-all;">${srv.url}</div>
                    </div>
                `).join('')}

                <!-- Email Config Status -->
                <div style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:14px;">
                    <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Email (SMTP)</div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span id="smtp-dot" style="width:8px; height:8px; border-radius:50%; background:#64748b; flex-shrink:0;"></span>
                        <span id="smtp-text" style="font-size:12px; color:#94a3b8; font-weight:600;">Checking...</span>
                    </div>
                    <div style="margin-top:8px; font-size:10px; color:#475569;">chaudharyhealthcare198@gmail.com</div>
                </div>
            </div>

            <!-- Quick Dev Actions -->
            <div style="border-top:1px solid #1e293b; padding-top:16px;">
                <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">⚙️ Quick Dev Actions</div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    <button onclick="showModule('settings')" style="background:#1e293b; border:1px solid #334155; color:#fbbf24; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px; transition:all 0.2s;">
                        <i class="bi bi-gear-fill"></i> System Settings
                    </button>
                    <button onclick="showModule('users')" style="background:#1e293b; border:1px solid #334155; color:#60a5fa; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-people-fill"></i> Manage Users
                    </button>
                    <button onclick="showModule('reports')" style="background:#1e293b; border:1px solid #334155; color:#34d399; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-bar-chart-fill"></i> Reports
                    </button>
                    <button onclick="window.open('https://cloud.mongodb.com','_blank')" style="background:#1e293b; border:1px solid #334155; color:#a78bfa; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-database-fill"></i> MongoDB Atlas
                    </button>
                    <button onclick="window.open('https://dashboard.render.com','_blank')" style="background:#1e293b; border:1px solid #334155; color:#fb923c; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-cloud-fill"></i> Render Dashboard
                    </button>
                    <button onclick="window.open('https://console.firebase.google.com','_blank')" style="background:#1e293b; border:1px solid #334155; color:#f87171; padding:8px 14px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-lightning-fill"></i> Firebase Console
                    </button>
                </div>
            </div>
        </div>
    `;

    dashContainer.appendChild(consoleEl);

    // Check server health
    const servers = [
        { id: 'srv-main', url: 'https://chaudhary-health-care-center-koraon-bbw0.onrender.com/api/health' },
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