// ==================== REPORTS & ANALYTICS MODULE ====================

function renderReports() {
    const moduleEl = document.getElementById('module-reports');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="reports-container">
            <style>
                .reports-container {
                    animation: fadeIn 0.4s ease-out;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                /* Premium Card Styling */
                .report-card {
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 24px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .report-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                .report-card h3 {
                    font-size: 16px;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 0;
                }
                
                /* SaaS-style Metric Cards */
                .stat-card {
                    background: #ffffff !important;
                    border-radius: 12px;
                    padding: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 16px;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }
                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
                }
                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 4px;
                    height: 100%;
                }
                .stat-card.blue::before { background: var(--primary, #4f46e5); }
                .stat-card.green::before { background: var(--success, #10b981); }
                .stat-card.red::before { background: var(--danger, #ef4444); }
                .stat-card.purple::before { background: #8b5cf6; }

                .stat-card-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    flex-shrink: 0;
                }
                .stat-card.blue .stat-card-icon { background: rgba(79, 70, 229, 0.1); color: var(--primary, #4f46e5); }
                .stat-card.green .stat-card-icon { background: rgba(16, 185, 129, 0.1); color: var(--success, #10b981); }
                .stat-card.red .stat-card-icon { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); }
                .stat-card.purple .stat-card-icon { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

                .stat-card-details {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .stat-card-label {
                    margin: 0;
                    font-size: 11px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .stat-card-value {
                    color: #0f172a;
                    font-size: 22px;
                    margin: 0;
                    font-weight: 800;
                    line-height: 1.2;
                }
                .stat-card-subtext {
                    font-size: 11px;
                    font-weight: 600;
                    color: #475569;
                    margin: 0;
                }

                /* Filter Control Bar */
                .filter-bar {
                    background: white; 
                    padding: 16px 24px; 
                    border-radius: 16px; 
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                    display: flex; 
                    gap: 20px; 
                    align-items: center; 
                    flex-wrap: wrap;
                    margin-bottom: 30px;
                }
                .filter-bar-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .filter-bar-group label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .filter-bar-select {
                    padding: 8px 16px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #334155;
                    outline: none;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .filter-bar-select:focus {
                    border-color: var(--primary, #4f46e5);
                    background: white;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
                }
                .filter-bar-input {
                    padding: 7px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                    outline: none;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: 130px;
                }
                .filter-bar-input:focus {
                    border-color: var(--primary, #4f46e5);
                    background: white;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
                }
                .filter-bar-divider {
                    width: 1px;
                    height: 28px;
                    background: #e2e8f0;
                    margin: 0 4px;
                }

                @media print {
                    #chc-print-header-analytics { display: flex !important; margin-top: -20px; }
                    .module-header, .filter-bar, .btn-primary { display: none !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>

            <!-- Printable Header -->
            <div id="chc-print-header-analytics" class="chk-header" style="display: none; align-items: center; justify-content: space-between; flex-wrap: nowrap; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 15px; font-family: Arial, sans-serif;">
                <div class="hospital-logo" style="flex: 0 0 auto; text-align: left; display: flex; align-items: center; margin-right: 15px;">
                    <img src="hlogo.png" alt="CHC Logo" style="height: 110px; width: auto; max-width: none; object-fit: contain;">
                </div>
                <div class="hospital-info" style="flex: 1 1 auto; text-align: center; white-space: nowrap;">
                    <h1 class="hospital-title hospital-name" style="margin: 0; font-size: 23px; font-weight: 900; color: #2b6cb0; letter-spacing: 0.5px;">${window.hospitalSettings?.['hospital-name'] || 'CHAUDHARY HEALTH CARE CENTER'}</h1>
                    <h3 class="hospital-subtitle hospital-address" style="margin: 4px 0 0; font-size: 13px; color: #e53e3e; text-transform: uppercase;">${window.hospitalSettings?.['hospital-address'] || 'GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306'}</h3>
                    <p style="margin: 4px 0 0; font-size: 13px; font-weight: bold; color: #2d3748;">Phone: <span class="hospital-contact">${window.hospitalSettings?.['hospital-contact'] || '(0542) 123456'}</span></p>
                </div>
                <div style="flex: 0 0 auto; text-align: right; color: #718096; font-size: 12px; font-weight: bold; white-space: nowrap; margin-left: 15px;">
                    <div style="margin-bottom: 4px; color: #2d3748;">Date: <span id="auto-date-field-rep" style="border-bottom: 1px dashed #ccc; padding-bottom: 1px; min-width:70px; display:inline-block; text-align: center;"></span></div>
                    <div style="color: #2d3748;">Time: <span id="auto-time-field-rep" style="border-bottom: 1px dashed #ccc; padding-bottom: 1px; min-width:70px; display:inline-block; text-align: center;"></span></div>
                </div>
            </div>
            
            <!-- Dashboard Title / Header -->
            <div class="module-header" style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border); padding-bottom: 15px; flex-wrap: wrap; gap: 15px;">
                <h2 style="font-size: 28px; font-weight: 800; color: var(--text-main); margin: 0; position: relative; padding-left: 15px; display: flex; align-items: center; gap: 8px;">
                    <span style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 24px; width: 4px; background: var(--primary); border-radius: 4px;"></span>
                    <i class="bi bi-graph-up" style="color: var(--primary);"></i> Reports & Analytics Dashboard
                </h2>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="updateReportsDashboard()"><i class="bi bi-arrow-repeat"></i> Refresh Live</button>
                    <button class="btn btn-info" onclick="
                        const adf = document.getElementById('auto-date-field-rep');
                        const atf = document.getElementById('auto-time-field-rep');
                        if (adf && atf) {
                            const d = new Date();
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const yyyy = d.getFullYear();
                            let hours = d.getHours();
                            let minutes = d.getMinutes();
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            hours = hours % 12;
                            hours = hours ? hours : 12;
                            minutes = minutes < 10 ? '0' + minutes : minutes;
                            adf.textContent = \`\${dd}/\& #8203;\${mm}/\${yyyy}\`;
                            atf.textContent = \`\${hours}:\${minutes} \${ampm}\`;
                        }
                        window.print();
                    "><i class="bi bi-printer"></i> Print Report</button>
                </div>
            </div>
            
            <!-- Filters Bar -->
            <div class="filter-bar">
                <div class="filter-bar-group">
                    <label for="report-date-filter"><i class="bi bi-calendar3"></i> Period</label>
                    <select id="report-date-filter" class="filter-bar-select" onchange="handleDateFilterChange()">
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
                <div class="filter-bar-group" id="custom-date-range" style="display:none;">
                    <label><i class="bi bi-calendar-range"></i> From</label>
                    <input type="date" id="report-date-from" class="filter-bar-input" onchange="updateReportsDashboard()">
                    <label>To</label>
                    <input type="date" id="report-date-to" class="filter-bar-input" onchange="updateReportsDashboard()">
                </div>
                <div class="filter-bar-divider"></div>
                <div class="filter-bar-group">
                    <label for="report-opd-ipd-filter"><i class="bi bi-layers"></i> Category</label>
                    <select id="report-opd-ipd-filter" class="filter-bar-select" onchange="updateReportsDashboard()">
                        <option value="all">All (OPD + IPD)</option>
                        <option value="OPD">OPD Only</option>
                        <option value="IPD">IPD Only</option>
                    </select>
                </div>
                <div class="filter-bar-divider"></div>
                <div class="filter-bar-group">
                    <label for="report-doctor-filter"><i class="bi bi-person-badge"></i> Doctor</label>
                    <select id="report-doctor-filter" class="filter-bar-select" onchange="updateReportsDashboard()">
                        <option value="all">All Doctors</option>
                    </select>
                </div>
                <div class="filter-bar-divider"></div>
                <div class="filter-bar-group">
                    <label for="report-patient-filter"><i class="bi bi-heart-pulse"></i> Surgery</label>
                    <select id="report-patient-filter" class="filter-bar-select" onchange="updateReportsDashboard()">
                        <option value="all">All Patients</option>
                        <option value="surgery">Surgery Patients</option>
                        <option value="normal">Normal (No Surgery)</option>
                    </select>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid" id="reports-key-metrics" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:16px; margin-bottom:20px;">
                <!-- Dynamically Injected Stats -->
            </div>
            
            <!-- Charts Grid -->
            <div class="reports-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                <div class="report-card">
                    <h3><i class="bi bi-graph-up-arrow" style="color:var(--primary, #4f46e5);"></i> OPD vs IPD Registration Trends</h3>
                    <div class="chart-container" style="height:280px; position:relative;">
                        <canvas id="patientGrowthChart"></canvas>
                    </div>
                </div>
                <div class="report-card" id="revenue-card-container">
                    <h3><i class="bi bi-bar-chart" style="color:var(--success, #10b981);"></i> Financial Revenue Collection</h3>
                    <div class="chart-container" style="height:280px; position:relative;">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
                <div class="report-card" id="payment-card-container">
                    <h3><i class="bi bi-pie-chart" style="color:var(--danger, #ef4444);"></i> Outstanding vs Paid Bills Breakdown</h3>
                    <div class="chart-container" style="height:280px; position:relative;">
                        <canvas id="paymentStatusChart"></canvas>
                    </div>
                </div>
                <div class="report-card">
                    <h3><i class="bi bi-hospital" style="color:#8b5cf6;"></i> Patient Category Mix</h3>
                    <div class="chart-container" style="height:280px; position:relative;">
                        <canvas id="surgeryNormalChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    updateReportsDashboard();
}

let reportsCharts = {};

// Toggle custom date range visibility
function handleDateFilterChange() {
    const val = document.getElementById('report-date-filter').value;
    const customRange = document.getElementById('custom-date-range');
    if (customRange) {
        customRange.style.display = val === 'custom' ? 'flex' : 'none';
    }
    updateReportsDashboard();
}

// Dynamically populate doctor filter from patient data + settings
function populateDoctorFilter(patients) {
    const select = document.getElementById('report-doctor-filter');
    if (!select) return;

    const currentVal = select.value;
    const doctorSet = new Set();

    // Source 1: From patient records (doctor_assigned field)
    patients.forEach(p => {
        if (!p.isDeleted && p.doctor_assigned && p.doctor_assigned.trim()) {
            doctorSet.add(p.doctor_assigned.trim());
        }
    });

    // Source 2: From Settings doctor list (hospital-doctors-list)
    const rawList = (window.hospitalSettings && window.hospitalSettings['hospital-doctors-list']) || '';
    if (rawList) {
        let settingsDoctors = [];
        if (rawList.trim().startsWith('[')) {
            try {
                settingsDoctors = JSON.parse(rawList);
            } catch (e) { /* ignore parse errors */ }
        }
        if (settingsDoctors.length === 0) {
            // Legacy format: "Name, Dept, Fee\nName2, Dept2, Fee2"
            rawList.split('\n').forEach(line => {
                const parts = line.split(',');
                if (parts.length >= 2 && parts[0].trim()) {
                    settingsDoctors.push({ name: parts[0].trim() });
                }
            });
        }
        settingsDoctors.forEach(d => {
            if (d.name && d.name.trim()) {
                doctorSet.add(d.name.trim());
            }
        });
    }

    const sortedDoctors = Array.from(doctorSet).sort();

    // Only rebuild if options changed
    const existingOptions = Array.from(select.options).slice(1).map(o => o.value);
    if (JSON.stringify(existingOptions) === JSON.stringify(sortedDoctors)) return;

    select.innerHTML = '<option value="all">All Doctors</option>';
    sortedDoctors.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc;
        opt.textContent = doc;
        select.appendChild(opt);
    });

    // Restore previous selection if still valid
    if (sortedDoctors.includes(currentVal)) {
        select.value = currentVal;
    }
}

async function fetchReportsData() {
    try {
        showLoading('Syncing real-time records...');
        const token = sessionStorage.getItem('token');
        
        const [patientsRes, billingRes] = await Promise.all([
            fetch(`${API_BASE}patients`, {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch(`${API_BASE}billing`, {
                headers: { 'Authorization': 'Bearer ' + token }
            })
        ]);
        
        if (!patientsRes.ok || !billingRes.ok) {
            throw new Error('Failed to fetch from backend servers');
        }
        
        const patientsResult = await patientsRes.json();
        const billingResult = await billingRes.json();
        
        hideLoading();
        return {
            patients: patientsResult.patients || [],
            billings: billingResult.billings || []
        };
    } catch (error) {
        console.error('Error fetching real-time reports data:', error);
        hideLoading();
        showNotification('Unable to fetch live records. Please check database connection.', 'error');
        return { patients: [], billings: [] };
    }
}

function filterReportsData(patients, dateFilter, patientFilter, opdIpdFilter, doctorFilter, customFrom, customTo) {
    const now = new Date();
    
    return patients.filter(p => {
        // Exclude soft-deleted records
        if (p.isDeleted) return false;

        // 1. OPD/IPD Category Filter
        if (opdIpdFilter && opdIpdFilter !== 'all') {
            const type = p.patient_type || 'IPD';
            if (type !== opdIpdFilter) return false;
        }

        // 2. Doctor Filter
        if (doctorFilter && doctorFilter !== 'all') {
            const doc = (p.doctor_assigned || '').trim().toLowerCase();
            if (doc !== doctorFilter.toLowerCase()) return false;
        }

        // 3. Surgery Type Filter
        const isSurgery = p.surgeries && p.surgeries.length > 0;
        if (patientFilter === 'surgery' && !isSurgery) return false;
        if (patientFilter === 'normal' && isSurgery) return false;

        // 4. Date Range Filter
        if (dateFilter !== 'all') {
            const dateStr = p.admission_date || p.createdAt;
            if (!dateStr) return false;

            const pDate = new Date(dateStr);
            if (dateFilter === 'today') {
                return pDate.toDateString() === now.toDateString();
            } else if (dateFilter === 'weekly') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return pDate >= weekAgo;
            } else if (dateFilter === 'monthly') {
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                return pDate >= monthAgo;
            } else if (dateFilter === 'custom') {
                if (customFrom) {
                    const from = new Date(customFrom + 'T00:00:00');
                    if (pDate < from) return false;
                }
                if (customTo) {
                    const to = new Date(customTo + 'T23:59:59');
                    if (pDate > to) return false;
                }
            }
        }
        return true;
    });
}

function calculateMetrics(filteredPatients, billingMap) {
    let totalPatients = filteredPatients.length;
    let admittedPatients = filteredPatients.filter(p => (p.status || '').toLowerCase() === 'admitted').length;
    let dischargedPatients = filteredPatients.filter(p => (p.status || '').toLowerCase() === 'discharged').length;
    let surgeryPatientsCount = filteredPatients.filter(p => p.surgeries && p.surgeries.length > 0).length;

    let totalRevenue = 0;
    let pendingBillsCount = 0;
    let paidBillsCount = 0;
    let totalPendingAmount = 0;

    filteredPatients.forEach(p => {
        const rec = billingMap[p.patient_id];
        let totalPaid = 0;
        if (rec && rec.payments) {
            rec.payments.forEach(pay => { totalPaid += (pay.amount || 0); });
        }
        totalRevenue += totalPaid;

        const discount = rec ? (rec.discount || 0) : 0;
        const netPayable = Math.max(0, (p.totalBill || 0) - discount);
        const remaining = p.pending_amount !== undefined ? p.pending_amount : Math.max(0, netPayable - totalPaid);

        if (remaining <= 0 && netPayable > 0) {
            paidBillsCount++;
        } else if (remaining > 0) {
            pendingBillsCount++;
            totalPendingAmount += remaining;
        }
    });

    return {
        totalPatients, admittedPatients, dischargedPatients, surgeryPatientsCount,
        totalRevenue, totalPendingAmount, paidBillsCount, pendingBillsCount
    };
}

async function updateReportsDashboard() {
    const dateFilter = document.getElementById('report-date-filter').value;
    const patientFilter = document.getElementById('report-patient-filter').value;
    const opdIpdFilter = document.getElementById('report-opd-ipd-filter')?.value || 'all';
    const doctorFilter = document.getElementById('report-doctor-filter')?.value || 'all';
    const customFrom = document.getElementById('report-date-from')?.value || '';
    const customTo = document.getElementById('report-date-to')?.value || '';

    // Fetch Live Real-time Data
    const { patients, billings } = await fetchReportsData();

    // Populate Doctor dropdown dynamically from fetched data
    populateDoctorFilter(patients);

    // Map billing array to an object keyed by patient_id for fast lookup
    const billingMap = {};
    billings.forEach(b => {
        billingMap[b.patient_id] = b;
    });

    const filteredPatients = filterReportsData(patients, dateFilter, patientFilter, opdIpdFilter, doctorFilter, customFrom, customTo);
    const metrics = calculateMetrics(filteredPatients, billingMap);

    const currency = window.currencySymbol || '₹';
    const role = currentUser?.role || 'admin';
    const showFinancials = (role === 'admin');

    // Dynamically show or hide financial cards depending on user role
    const revCard = document.getElementById('revenue-card-container');
    const payCard = document.getElementById('payment-card-container');
    if (revCard) revCard.style.display = showFinancials ? 'block' : 'none';
    if (payCard) payCard.style.display = showFinancials ? 'block' : 'none';

    // Update Premium Metrics UI
    const metricsEl = document.getElementById('reports-key-metrics');
    if (metricsEl) {
        metricsEl.innerHTML = `
            <div class="stat-card blue">
                <div class="stat-card-icon">
                    <i class="bi bi-people"></i>
                </div>
                <div class="stat-card-details">
                    <p class="stat-card-label">Total Patients</p>
                    <h3 class="stat-card-value">${metrics.totalPatients}</h3>
                    <div class="stat-card-subtext">
                        <span style="color:#10b981;">● ${metrics.admittedPatients} Adm</span> &nbsp;&middot;&nbsp; 
                        <span style="color:#64748b;">● ${metrics.dischargedPatients} Disch</span>
                    </div>
                </div>
            </div>
            
            ${showFinancials ? `
            <div class="stat-card green">
                <div class="stat-card-icon">
                    <i class="bi bi-cash-stack"></i>
                </div>
                <div class="stat-card-details">
                    <p class="stat-card-label">Revenue Collected</p>
                    <h3 class="stat-card-value">${currency}${metrics.totalRevenue.toLocaleString()}</h3>
                    <div class="stat-card-subtext" style="color:#10b981;">
                        <i class="bi bi-check-circle"></i> ${metrics.paidBillsCount} Paid Bills
                    </div>
                </div>
            </div>
            
            <div class="stat-card red">
                <div class="stat-card-icon">
                    <i class="bi bi-receipt"></i>
                </div>
                <div class="stat-card-details">
                    <p class="stat-card-label">Pending Balance</p>
                    <h3 class="stat-card-value">${currency}${metrics.totalPendingAmount.toLocaleString()}</h3>
                    <div class="stat-card-subtext" style="color:#ef4444;">
                        <i class="bi bi-exclamation-circle"></i> ${metrics.pendingBillsCount} Unpaid
                    </div>
                </div>
            </div>` : ''}
            
            <div class="stat-card purple">
                <div class="stat-card-icon">
                    <i class="bi bi-hospital"></i>
                </div>
                <div class="stat-card-details">
                    <p class="stat-card-label">Surgery Patients</p>
                    <h3 class="stat-card-value">${metrics.surgeryPatientsCount}</h3>
                    <div class="stat-card-subtext" style="color:#8b5cf6;">
                        <i class="bi bi-file-earmark-medical"></i> Consent Done
                    </div>
                </div>
            </div>
        `;
    }

    renderCharts(filteredPatients, metrics, showFinancials);
}

function renderCharts(filteredPatients, metrics, showFinancials) {
    if (typeof Chart === 'undefined') return;

    // Destroy existing instances to reconstruct over same canvas elements cleanly
    Object.keys(reportsCharts).forEach(key => {
        if (reportsCharts[key]) reportsCharts[key].destroy();
    });

    const containers = document.querySelectorAll('.reports-grid .chart-container');

    if (metrics.totalPatients === 0) {
        // Show high quality no data visualizer
        containers.forEach(c => {
            c.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#94a3b8; font-weight:700; font-size:14px;"><i class="bi bi-info-circle" style="margin-right:6px;"></i> No analytics data in this range</div>';
        });
        reportsCharts = {};
        return;
    } else {
        // Re-inject pristine canvas tags
        if (!document.getElementById('patientGrowthChart')) {
            if(containers[0]) containers[0].innerHTML = '<canvas id="patientGrowthChart"></canvas>';
            if(showFinancials) {
                const revCont = document.getElementById('revenueChart')?.parentNode || containers[1];
                const payCont = document.getElementById('paymentStatusChart')?.parentNode || containers[2];
                if(revCont) revCont.innerHTML = '<canvas id="revenueChart"></canvas>';
                if(payCont) payCont.innerHTML = '<canvas id="paymentStatusChart"></canvas>';
            }
            const surgCont = document.getElementById('surgeryNormalChart')?.parentNode || containers[containers.length - 1];
            if(surgCont) surgCont.innerHTML = '<canvas id="surgeryNormalChart"></canvas>';
        }
    }

    // 1. OPD vs IPD Dual-Line Trend Chart
    let opdGrps = {};
    let ipdGrps = {};
    let allDatesSet = new Set();

    filteredPatients.forEach(p => {
        let rawDate = p.admission_date || p.createdAt || new Date().toISOString();
        let d = rawDate.split('T')[0];
        allDatesSet.add(d);

        const type = p.patient_type || 'IPD';
        if (type === 'OPD') {
            opdGrps[d] = (opdGrps[d] || 0) + 1;
        } else {
            ipdGrps[d] = (ipdGrps[d] || 0) + 1;
        }
    });

    let sortedDates = Array.from(allDatesSet).sort();
    // Keep last 15 days for clarity in reports view
    if (sortedDates.length > 15) {
        sortedDates = sortedDates.slice(-15);
    }

    let opdData = sortedDates.map(d => opdGrps[d] || 0);
    let ipdData = sortedDates.map(d => ipdGrps[d] || 0);

    let formattedDates = sortedDates.map(d => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });

    if (!sortedDates.length) {
        formattedDates = ['No Data'];
        opdData = [0];
        ipdData = [0];
    }

    const ctxGrowth = document.getElementById('patientGrowthChart').getContext('2d');

    // Create soft gradients for both lines
    const opdGradient = ctxGrowth.createLinearGradient(0, 0, 0, 250);
    opdGradient.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
    opdGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    const ipdGradient = ctxGrowth.createLinearGradient(0, 0, 0, 250);
    ipdGradient.addColorStop(0, 'rgba(99, 102, 241, 0.12)');
    ipdGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    reportsCharts['growth'] = new Chart(ctxGrowth, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [
                {
                    label: 'OPD Patients',
                    data: opdData,
                    borderColor: '#10b981',
                    backgroundColor: opdGradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointHoverRadius: 7,
                    pointRadius: 4,
                    borderWidth: 3
                },
                {
                    label: 'IPD Patients',
                    data: ipdData,
                    borderColor: '#6366f1',
                    backgroundColor: ipdGradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointHoverRadius: 7,
                    pointRadius: 4,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 14,
                        color: '#475569',
                        font: { size: 12, weight: '700' },
                        padding: 16
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11, weight: 600 } }
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { color: '#64748b', font: { size: 11, weight: 600 }, stepSize: 1, beginAtZero: true }
                }
            }
        }
    });

    if (showFinancials) {
        // 2. Revenue Collection Bar Chart
        const ctxRev = document.getElementById('revenueChart')?.getContext('2d');
        if (ctxRev) {
            reportsCharts['revenue'] = new Chart(ctxRev, {
                type: 'bar',
                data: {
                    labels: ['Collections & Receivables'],
                    datasets: [
                        {
                            label: 'Paid (₹)',
                            data: [metrics.totalRevenue],
                            backgroundColor: '#10b981',
                            borderRadius: 8,
                            barThickness: 50
                        },
                        {
                            label: 'Pending (₹)',
                            data: [metrics.totalPendingAmount],
                            backgroundColor: '#ef4444',
                            borderRadius: 8,
                            barThickness: 50
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#475569', font: { weight: 700 } } }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: { 
                            grid: { color: '#f1f5f9' },
                            ticks: { color: '#64748b', font: { weight: 600 } }
                        }
                    }
                }
            });
        }

        // 3. Payment Status Pie Chart
        const ctxPay = document.getElementById('paymentStatusChart')?.getContext('2d');
        if (ctxPay) {
            reportsCharts['payment'] = new Chart(ctxPay, {
                type: 'doughnut',
                data: {
                    labels: ['Paid Bills', 'Pending Bills'],
                    datasets: [{
                        data: [metrics.paidBillsCount, metrics.pendingBillsCount],
                        backgroundColor: ['#10b981', '#ef4444'],
                        borderWidth: 3,
                        borderColor: '#ffffff',
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            labels: { color: '#475569', font: { weight: 700 }, padding: 20 }
                        } 
                    }
                }
            });
        }
    }

    // 4. Surgery vs Normal Patients Donut Chart
    const normalCount = metrics.totalPatients - metrics.surgeryPatientsCount;
    const ctxSurg = document.getElementById('surgeryNormalChart').getContext('2d');
    reportsCharts['surgery'] = new Chart(ctxSurg, {
        type: 'doughnut',
        data: {
            labels: ['Normal Cases', 'Surgery Cases'],
            datasets: [{
                data: [normalCount, metrics.surgeryPatientsCount],
                backgroundColor: ['#4f46e5', '#8b5cf6'],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { 
                legend: { 
                    position: 'bottom',
                    labels: { color: '#475569', font: { weight: 700 }, padding: 20 }
                } 
            }
        }
    });
}