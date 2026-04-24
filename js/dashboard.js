// ==================== DASHBOARD MODULE ====================

function renderDashboard() {
    const moduleEl = document.getElementById('module-dashboard');
    if (!moduleEl) return;

    const role = currentUser?.role || 'admin';

    // Different sections visibility based on roles
    const showCharts = (role === 'admin');
    const showFinancials = (role === 'admin');
    const showQuickAddPatient = true; // all
    const showQuickBilling = (role === 'admin' || role === 'doctor');
    const showQuickDischarge = (role === 'admin' || role === 'doctor');

    moduleEl.innerHTML = `
        <div class="dashboard-container" style="display:flex; flex-direction:column; gap:20px;">
            <div class="welcome-card" style="margin-bottom: 0;">
                <h2>Welcome, ${currentUser?.name || 'User'}!</h2>

            </div>
            
            <div class="stats-grid" id="dashboard-metrics" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px;">
                <!-- Filled dynamically via updateDashboardStats -->
            </div>
            
            ${showCharts ? `
            <div id="admin-charts-section" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div class="report-card card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom:10px; font-size:16px;"><i class="fas fa-chart-line" style="color:#3498db;"></i> Patient Growth</h3>
                    <div style="height:220px; position:relative;">
                        <canvas id="dashPatientChart"></canvas>
                    </div>
                </div>
                <div class="report-card card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom:10px; font-size:16px;"><i class="fas fa-chart-bar" style="color:#2ecc71;"></i> Revenue Streams</h3>
                    <div style="height:220px; position:relative;">
                        <canvas id="dashRevenueChart"></canvas>
                    </div>
                </div>
                <div class="report-card card" style="background:white; padding:15px; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom:10px; font-size:16px;"><i class="fas fa-chart-pie" style="color:#f1c40f;"></i> Payment Status</h3>
                    <div style="height:220px; position:relative;">
                        <canvas id="dashPaymentChart"></canvas>
                    </div>
                </div>
            </div>` : ''}
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <div class="recent-activity" style="background:white; padding:20px; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom:15px; font-size:16px; border-bottom:1px solid #eee; padding-bottom:10px;">
                        <i class="fas fa-history" style="color:#e67e22;"></i> ${role === "doctor" ? "Today's Activity" : "Recent Activity"}
                    </h3>
                    <div class="activity-list" id="recent-activity-list" style="max-height: 250px; overflow-y: auto;">
                        <div style="text-align:center; padding:20px; color:#888;">Loading activities...</div>
                    </div>
                </div>
                
                <div class="quick-actions" style="background:white; padding:20px; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom:15px; font-size:16px; border-bottom:1px solid #eee; padding-bottom:10px;">
                        <i class="fas fa-bolt" style="color:#f1c40f;"></i> Quick Actions
                    </h3>
                    <div class="action-buttons" style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${showQuickAddPatient ? `
                        <button class="action-btn" onclick="showModule('add-patient')" style="padding:15px; border-radius:8px; border:1px solid #eee; background:#f9f9f9; cursor:pointer;">
                            <i class="fas fa-user-plus" style="font-size:24px; color:#3498db; margin-bottom:5px;"></i><br>Add Patient
                        </button>` : ''}
                        
                        ${showQuickBilling ? `
                        <button class="action-btn" onclick="showModule('billing')" style="padding:15px; border-radius:8px; border:1px solid #eee; background:#f9f9f9; cursor:pointer;">
                            <i class="fas fa-file-invoice" style="font-size:24px; color:#2ecc71; margin-bottom:5px;"></i><br>Billing
                        </button>` : ''}
                        
                        ${showQuickDischarge ? `
                        <button class="action-btn" onclick="showModule('discharge')" style="padding:15px; border-radius:8px; border:1px solid #eee; background:#f9f9f9; cursor:pointer;">
                            <i class="fas fa-sign-out-alt" style="font-size:24px; color:#e74c3c; margin-bottom:5px;"></i><br>Discharge
                        </button>` : ''}
                        
                        <button class="action-btn" onclick="showModule('patients')" style="padding:15px; border-radius:8px; border:1px solid #eee; background:#f9f9f9; cursor:pointer;">
                            <i class="fas fa-users" style="font-size:24px; color:#9b59b6; margin-bottom:5px;"></i><br>Patients
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    updateDashboardStats();
    if (typeof renderSyncUI === 'function') renderSyncUI();
}

let dashCharts = {};

function updateDashboardStats() {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const billing = JSON.parse(localStorage.getItem('billing_records') || '{}');
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

        // Billing Calculations
        let rec = billing[p.patient_id];
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
        <div class="stat-card" style="padding:15px; border-left:4px solid #3498db; background:white !important; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); text-align:left;">
            <i class="fas fa-users" style="font-size:24px; color:#3498db; margin-bottom:10px;"></i>
            <h3 style="font-size:22px; margin:0; color:#2c3e50;">${totalPatients}</h3>
            <p style="margin:0; font-size:12px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Total Patients</p>
        </div>
        <div class="stat-card" style="padding:15px; border-left:4px solid #f39c12; background:white !important; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); text-align:left;">
            <i class="fas fa-bed" style="font-size:24px; color:#f39c12; margin-bottom:10px;"></i>
            <h3 style="font-size:22px; margin:0; color:#2c3e50;">${admittedPatients}</h3>
            <p style="margin:0; font-size:12px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Admitted</p>
        </div>
        <div class="stat-card" style="padding:15px; border-left:4px solid #2ecc71; background:white !important; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); text-align:left;">
            <i class="fas fa-walking" style="font-size:24px; color:#2ecc71; margin-bottom:10px;"></i>
            <h3 style="font-size:22px; margin:0; color:#2c3e50;">${dischargedCount}</h3>
            <p style="margin:0; font-size:12px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Discharged</p>
        </div>
        ${showFinancials ? `
        <div class="stat-card" style="padding:15px; border-left:4px solid #27ae60; background:white !important; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); text-align:left;">
            <i class="fas fa-coins" style="font-size:24px; color:#27ae60; margin-bottom:10px;"></i>
            <h3 style="font-size:22px; margin:0; color:#2c3e50;">${curr}${totalRevenue.toLocaleString()}</h3>
            <p style="margin:0; font-size:12px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Total Revenue</p>
        </div>
        <div class="stat-card" style="padding:15px; border-left:4px solid #2980b9; background:white !important; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); text-align:left;">
            <i class="fas fa-check-circle" style="font-size:24px; color:#2980b9; margin-bottom:10px;"></i>
            <h3 style="font-size:22px; margin:0; color:#2c3e50;">${paidBills}</h3>
            <p style="margin:0; font-size:12px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Paid Bills</p>
        </div>
        <div class="stat-card" style="padding:15px; border-left:4px solid #e74c3c; background:white !important; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05); text-align:left;">
            <i class="fas fa-exclamation-circle" style="font-size:24px; color:#e74c3c; margin-bottom:10px;"></i>
            <h3 style="font-size:22px; margin:0; color:#2c3e50;">${pendingBills}</h3>
            <p style="margin:0; font-size:12px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Pending Bills</p>
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
        actList.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">No recent activity</div>';
    } else {
        actList.innerHTML = allActivities.slice(0, 6).map(act => `
            <div class="activity-item" style="display:flex; align-items:flex-start; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid #f0f0f0;">
                <div style="width:32px; height:32px; border-radius:50%; background:${act.color}22; color:${act.color}; display:flex; align-items:center; justify-content:center; margin-right:12px; flex-shrink:0;">
                    <i class="fas ${act.icon}"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-size:13px; color:#333; line-height:1.4;">${act.text}</div>
                    <div style="font-size:11px; color:#999; margin-top:3px;">${new Date(act.time).toLocaleString()}</div>
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

    // Growth Line Chart
    let dateGrps = {};
    patients.forEach(p => {
        let d = p.admission_date || p.date || new Date().toISOString().split('T')[0];
        // simple truncated date
        let short = d.split('T')[0];
        dateGrps[short] = (dateGrps[short] || 0) + 1;
    });
    let sDates = Object.keys(dateGrps).sort();
    let gData = sDates.map(d => dateGrps[d]);
    if (!sDates.length) { sDates = ['None']; gData = [0]; }

    let ctx1 = document.getElementById('dashPatientChart')?.getContext('2d');
    if (ctx1) {
        dashCharts['pat'] = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: sDates,
                datasets: [{
                    label: 'Admissions',
                    data: gData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    fill: true, tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Revenue Bar Chart
    let ctx2 = document.getElementById('dashRevenueChart')?.getContext('2d');
    if (ctx2) {
        dashCharts['rev'] = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Revenue & Due'],
                datasets: [
                    { label: 'Paid', data: [totalRevenue], backgroundColor: '#2ecc71', borderRadius: 4 },
                    { label: 'Pending', data: [totalPendingAmt], backgroundColor: '#e74c3c', borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Payment Pie Chart
    let ctx3 = document.getElementById('dashPaymentChart')?.getContext('2d');
    if (ctx3) {
        dashCharts['pay'] = new Chart(ctx3, {
            type: 'pie',
            data: {
                labels: ['Paid Bills', 'Pending Bills'],
                datasets: [{
                    data: [paidBills, pendingBills],
                    backgroundColor: ['#2ecc71', '#e74c3c'],
                    borderWidth: 2, borderColor: '#fff'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}