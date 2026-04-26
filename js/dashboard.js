// ==================== DASHBOARD MODULE ====================

function renderDashboard() {
    const moduleEl = document.getElementById('module-dashboard');
    if (!moduleEl) return;

    const role = currentUser?.role || 'admin';

    const showCharts = (role === 'admin');
    const showFinancials = (role === 'admin');

    // Role-specific greeting subtitle
    const roleSubtitle = {
        'admin': 'System Administrator Dashboard',
        'doctor': 'Clinical Dashboard — Patient Overview',
        'staff': 'Nursing Station — Shift Overview',
        'receptionist': 'Front Desk — Admissions Overview'
    };

    // Role-specific quick actions
    const roleQuickActions = {
        'doctor': `
            <button class="action-btn" onclick="showModule('add-patient')"><i class="fas fa-user-plus"></i><br>Admit</button>
            <button class="action-btn" onclick="showModule('patients')"><i class="fas fa-users"></i><br>Patients</button>
            <button class="action-btn" onclick="showModule('daily-notes')"><i class="fas fa-notes-medical"></i><br>Notes</button>
            <button class="action-btn" onclick="showModule('discharge')"><i class="fas fa-sign-out-alt"></i><br>Discharge</button>
            <button class="action-btn" onclick="showModule('billing')"><i class="fas fa-file-invoice"></i><br>Billing</button>
            <button class="action-btn" onclick="showModule('patient-record')"><i class="fas fa-file-medical"></i><br>Records</button>
        `,
        'staff': `
            <button class="action-btn" onclick="showModule('add-patient')"><i class="fas fa-user-plus"></i><br>Admit</button>
            <button class="action-btn" onclick="showModule('patients')"><i class="fas fa-users"></i><br>Patients</button>
            <button class="action-btn" onclick="showModule('daily-notes')"><i class="fas fa-notes-medical"></i><br>Notes</button>
        `,
        'receptionist': `
            <button class="action-btn" onclick="showModule('add-patient')"><i class="fas fa-user-plus"></i><br>New Admission</button>
            <button class="action-btn" onclick="showModule('patients')"><i class="fas fa-users"></i><br>Patient List</button>
        `
    };

    // Role info panels (doctor, staff, receptionist)
    const roleInfoPanel = {
        'doctor': `
            <div class="role-info-panel">
                <div class="info-panel-card doctor-panel">
                    <div class="info-panel-header"><i class="fas fa-stethoscope"></i><h4>Clinical Summary</h4></div>
                    <div class="info-panel-body">
                        <div class="info-row"><span class="info-label">Doctor</span><span class="info-value">${currentUser?.name || 'Doctor'}</span></div>
                        <div class="info-row"><span class="info-label">Active Patients</span><span class="info-value" id="doc-active-count">—</span></div>
                        <div class="info-row"><span class="info-label">Discharged Today</span><span class="info-value" id="doc-discharged-today">—</span></div>
                        <div class="info-row"><span class="info-label">Surgery Cases</span><span class="info-value" id="doc-surgery-count">—</span></div>
                    </div>
                </div>
                <div class="info-panel-card bed-panel">
                    <div class="info-panel-header"><i class="fas fa-bed"></i><h4>Bed Occupancy</h4></div>
                    <div class="info-panel-body" id="bed-occupancy-display">
                        <div style="text-align:center; padding:10px; color:#94a3b8; font-size:12px;">Loading...</div>
                    </div>
                </div>
            </div>`,
        'staff': `
            <div class="role-info-panel">
                <div class="info-panel-card staff-panel">
                    <div class="info-panel-header"><i class="fas fa-clipboard-check"></i><h4>Shift Overview</h4></div>
                    <div class="info-panel-body">
                        <div class="info-row"><span class="info-label">On Duty</span><span class="info-value">${currentUser?.name || 'Staff'}</span></div>
                        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${new Date().toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'})}</span></div>
                        <div class="info-row"><span class="info-label">Active Patients</span><span class="info-value" id="staff-active-count">—</span></div>
                        <div class="info-row"><span class="info-label">Notes Pending</span><span class="info-value" style="color:#f59e0b;">Check Daily Notes</span></div>
                    </div>
                </div>
                <div class="info-panel-card bed-panel">
                    <div class="info-panel-header"><i class="fas fa-bed"></i><h4>Bed Occupancy</h4></div>
                    <div class="info-panel-body" id="bed-occupancy-display">
                        <div style="text-align:center; padding:10px; color:#94a3b8; font-size:12px;">Loading...</div>
                    </div>
                </div>
            </div>`,
        'receptionist': `
            <div class="role-info-panel">
                <div class="info-panel-card reception-panel">
                    <div class="info-panel-header"><i class="fas fa-concierge-bell"></i><h4>Front Desk Status</h4></div>
                    <div class="info-panel-body">
                        <div class="info-row"><span class="info-label">Receptionist</span><span class="info-value">${currentUser?.name || 'Receptionist'}</span></div>
                        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${new Date().toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'})}</span></div>
                        <div class="info-row"><span class="info-label">Today's Admissions</span><span class="info-value" id="rec-today-admissions">—</span></div>
                        <div class="info-row"><span class="info-label">Total Patients</span><span class="info-value" id="rec-total-patients">—</span></div>
                    </div>
                </div>
                <div class="info-panel-card bed-panel">
                    <div class="info-panel-header"><i class="fas fa-bed"></i><h4>Bed Availability</h4></div>
                    <div class="info-panel-body" id="bed-occupancy-display">
                        <div style="text-align:center; padding:10px; color:#94a3b8; font-size:12px;">Loading...</div>
                    </div>
                </div>
            </div>`
    };

    moduleEl.innerHTML = `
        <style>
            .role-info-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
            .info-panel-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
            .info-panel-header { padding: 12px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #f1f5f9; }
            .info-panel-header i { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; }
            .info-panel-header h4 { margin: 0; font-size: 13px; font-weight: 700; color: #1e293b; }
            .doctor-panel .info-panel-header i { background: #eef2ff; color: #6366f1; }
            .staff-panel .info-panel-header i { background: #ecfdf5; color: #10b981; }
            .reception-panel .info-panel-header i { background: #fef3c7; color: #f59e0b; }
            .bed-panel .info-panel-header i { background: #fef2f2; color: #ef4444; }
            .info-panel-body { padding: 12px 16px; }
            .info-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px dashed #f1f5f9; font-size: 12px; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #64748b; font-weight: 500; }
            .info-value { color: #1e293b; font-weight: 700; }
            .bed-occ-row { display: flex; align-items: center; padding: 4px 0; font-size: 11px; gap: 8px; }
            .bed-occ-label { color: #475569; font-weight: 600; min-width: 90px; }
            .bed-occ-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
            .bed-occ-fill { height: 100%; border-radius: 3px; }
            .bed-occ-count { color: #1e293b; font-weight: 700; font-size: 11px; min-width: 36px; text-align: right; }
            @media (max-width: 768px) { .role-info-panel { grid-template-columns: 1fr; } }
        </style>

        <div class="dashboard-container">
            <div class="welcome-card">
                <h2>Welcome, ${currentUser?.name || 'User'}!</h2>
                <p style="margin:4px 0 0; opacity:0.85; font-size:12px;">${roleSubtitle[role] || ''}</p>
            </div>
            
            <div class="stats-grid" id="dashboard-metrics"></div>

            ${roleInfoPanel[role] || ''}
            
            ${showCharts ? `
            <div id="admin-charts-section" class="charts-grid">
                <div class="report-card card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                    <h3 style="margin-bottom:10px; font-size:14px;"><i class="fas fa-chart-line" style="color:#3498db;"></i> Patient Growth</h3>
                    <div style="height:200px; position:relative;"><canvas id="dashPatientChart"></canvas></div>
                </div>
                <div class="report-card card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                    <h3 style="margin-bottom:10px; font-size:14px;"><i class="fas fa-chart-bar" style="color:#2ecc71;"></i> Revenue Streams</h3>
                    <div style="height:200px; position:relative;"><canvas id="dashRevenueChart"></canvas></div>
                </div>
                <div class="report-card card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                    <h3 style="margin-bottom:10px; font-size:14px;"><i class="fas fa-chart-pie" style="color:#f1c40f;"></i> Payment Status</h3>
                    <div style="height:200px; position:relative;"><canvas id="dashPaymentChart"></canvas></div>
                </div>
            </div>` : ''}
            
            <div class="dashboard-lower">
                <div class="recent-activity">
                    <h3 style="margin-bottom:12px; font-size:14px; border-bottom:1px solid #eee; padding-bottom:8px;">
                        <i class="fas fa-history" style="color:#8b5cf6;"></i> ${role === 'doctor' ? "Today's Activity" : "Recent Activity"}
                    </h3>
                    <div class="activity-list" id="recent-activity-list" style="max-height: 220px; overflow-y: auto;">
                        <div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px;">Loading...</div>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <h3 style="margin-bottom:12px; font-size:14px; border-bottom:1px solid #eee; padding-bottom:8px;">
                        <i class="fas fa-bolt" style="color:#f59e0b;"></i> Quick Actions
                    </h3>
                    <div class="action-buttons">
                        ${role === 'admin' ? `
                        <button class="action-btn" onclick="showModule('add-patient')"><i class="fas fa-user-plus"></i><br>Add Patient</button>
                        <button class="action-btn" onclick="showModule('billing')"><i class="fas fa-file-invoice"></i><br>Billing</button>
                        <button class="action-btn" onclick="showModule('discharge')"><i class="fas fa-sign-out-alt"></i><br>Discharge</button>
                        <button class="action-btn" onclick="showModule('patients')"><i class="fas fa-users"></i><br>Patients</button>
                        ` : (roleQuickActions[role] || '')}
                    </div>
                </div>
            </div>
        </div>
    `;

    updateDashboardStats();
    if (typeof renderSyncUI === 'function') renderSyncUI();
    setTimeout(() => updateRolePanels(role), 600);
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
        const wards = {
            'General Male': { total: 40, prefix: 'Male-G' },
            'General Female': { total: 40, prefix: 'Female-G' },
            'ICU': { total: 7, prefix: 'ICU-' },
            'Private': { total: 5, prefix: 'Private-' }
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

    let allActivities = [];

    // Parse Patients for Activity
    patients.forEach(p => {
        let dDate = p.admission_date || p.date;
        if (dDate) {
            allActivities.push({
                time: new Date(dDate).getTime(),
                text: `New patient added: ${p.name}`,
                icon: 'fa-user-plus',
                color: '#3498db'
            });
        }

        // Billing Calculations from API data + patient record
        let rec = billingMap[p.patient_id];
        if (rec && rec.items && rec.items.length > 0) {
            let grandTotal = 0;
            rec.items.forEach(item => { grandTotal += (item.fee * item.days); });
            let net = grandTotal - (rec.discount || 0);
            if (net < 0) net = 0;

            let totalPaid = 0;
            if (rec.payments) {
                rec.payments.forEach(pay => {
                    totalPaid += pay.amount;
                    allActivities.push({
                        time: new Date(pay.date || Date.now()).getTime(),
                        text: `Payment ${window.currencySymbol || '₹'}${pay.amount} received from ${p.name}`,
                        icon: 'fa-money-bill-wave',
                        color: '#2ecc71'
                    });
                });
            }
            totalRevenue += totalPaid;
            let remaining = net - totalPaid;

            if (remaining <= 0 && net > 0) {
                paidBills++;
            } else {
                pendingBills++;
                totalPendingAmt += remaining;
            }
        } else {
            // No billing record in DB — use patient's own fields
            const patientBill = parseFloat(p.totalBill) || parseFloat(p.pending_amount) || 0;
            const patientPending = parseFloat(p.pending_amount) || 0;
            const payStatus = (p.payment_status || 'Pending').toLowerCase();

            if (patientBill > 0 || (p.status || '').toLowerCase() === 'admitted') {
                if (payStatus === 'paid' && patientPending <= 0) {
                    paidBills++;
                    totalRevenue += patientBill;
                } else {
                    pendingBills++;
                    totalPendingAmt += patientPending > 0 ? patientPending : patientBill;
                }
            }
        }
    });

    // Parse Surgeries for Activity
    surgeries.forEach(s => {
        let pName = patients.find(p => p.patient_id === s.patient_id)?.name || s.patient_id;
        allActivities.push({
            time: new Date(s.date || Date.now()).getTime(),
            text: `Surgery recorded for ${pName}`,
            icon: 'fa-procedures',
            color: '#9b59b6'
        });
    });

    // Parse Discharges for Activity
    discharges.forEach(d => {
        let pName = patients.find(p => p.patient_id === d.patientId)?.name || d.patientId;
        allActivities.push({
            time: new Date(d.dischargeDate || Date.now()).getTime(),
            text: `Patient ${pName} discharged`,
            icon: 'fa-sign-out-alt',
            color: '#2ecc71'
        });
    });

    const curr = window.currencySymbol || '₹';

    const role = currentUser?.role || 'admin';
    const showFinancials = (role === 'admin');

    // 1. Populate Metrics Cards
    document.getElementById('dashboard-metrics').innerHTML = `
        <div class="stat-card">
            <i class="fas fa-users"></i>
            <div>
                <h3>${totalPatients}</h3>
                <p>Total Patients</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-bed"></i>
            <div>
                <h3>${admittedPatients}</h3>
                <p>Admitted</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-walking"></i>
            <div>
                <h3>${dischargedCount}</h3>
                <p>Discharged</p>
            </div>
        </div>
        ${showFinancials ? `
        <div class="stat-card">
            <i class="fas fa-coins"></i>
            <div>
                <h3>${curr}${totalRevenue.toLocaleString()}</h3>
                <p>Revenue</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-check-circle"></i>
            <div>
                <h3>${paidBills}</h3>
                <p>Paid Bills</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-exclamation-circle"></i>
            <div>
                <h3>${pendingBills}</h3>
                <p>Pending Bills</p>
            </div>
        </div>` : ''}
    `;

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
    if (allActivities.length === 0) {
        actList.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:12px;">No recent activity</div>';
    } else {
        actList.innerHTML = allActivities.slice(0, 6).map(act => `
            <div class="activity-item">
                <div class="activity-icon" style="background:${act.color}15; color:${act.color};">
                    <i class="fas ${act.icon}"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-text">${act.text}</div>
                    <div class="activity-time">${new Date(act.time).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    }

    // 3. Render Charts
    if (typeof Chart === 'undefined') return;

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

    // Growth Line Chart — Cumulative patient count over time
    let dateGrps = {};
    patients.forEach(p => {
        let d = p.admission_date || p.createdAt || p.date || new Date().toISOString();
        let short = d.split('T')[0];
        dateGrps[short] = (dateGrps[short] || 0) + 1;
    });
    let sDates = Object.keys(dateGrps).sort();
    // Build cumulative data
    let cumulative = 0;
    let gData = sDates.map(d => { cumulative += dateGrps[d]; return cumulative; });
    // Format dates as 'DD MMM'
    let formattedDates = sDates.map(d => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });
    if (!sDates.length) { formattedDates = ['No Data']; gData = [0]; }

    let ctx1 = document.getElementById('dashPatientChart')?.getContext('2d');
    if (ctx1) {
        dashCharts['pat'] = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: formattedDates,
                datasets: [{
                    label: 'Total Patients',
                    data: gData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true, tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f1f5f9' } },
                    x: { ticks: { font: { size: 10 } }, grid: { display: false } }
                }
            }
        });
    }

    // Revenue Bar Chart
    let ctx2 = document.getElementById('dashRevenueChart')?.getContext('2d');
    if (ctx2) {
        dashCharts['rev'] = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Collected', 'Pending'],
                datasets: [{
                    label: `Amount (${curr})`,
                    data: [totalRevenue, totalPendingAmt],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderRadius: 6,
                    borderSkipped: false,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${curr}${ctx.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => `${curr}${v.toLocaleString()}`, font: { size: 10 } }, grid: { color: '#f1f5f9' } },
                    x: { ticks: { font: { size: 11, weight: '600' } }, grid: { display: false } }
                }
            }
        });
    }

    // Payment Doughnut Chart
    let ctx3 = document.getElementById('dashPaymentChart')?.getContext('2d');
    if (ctx3) {
        dashCharts['pay'] = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: [`Paid (${paidBills})`, `Pending (${pendingBills})`],
                datasets: [{
                    data: [paidBills, pendingBills],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 3, borderColor: '#fff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12, font: { size: 11, weight: '600' } } }
                }
            }
        });
    }
}