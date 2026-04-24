// ==================== REPORTS MODULE ====================

function renderReports() {
    const moduleEl = document.getElementById('module-reports');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="reports-container">
            <style>
                @media print {
                    #chc-print-header-analytics { display: flex !important; margin-top: -20px; }
                    .module-header, .report-filters, .btn-primary { display: none !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
            <div id="chc-print-header-analytics" class="chk-header" style="display: none; align-items: center; justify-content: space-between; flex-wrap: nowrap; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 15px; font-family: Arial, sans-serif;">
                <div class="hospital-logo" style="flex: 0 0 auto; text-align: left; display: flex; align-items: center; margin-right: 15px;">
                    <img src="hlogo.png" alt="CHC Logo" style="height: 110px; width: auto; max-width: none; object-fit: contain;">
                </div>
                <div class="hospital-info" style="flex: 1 1 auto; text-align: center; white-space: nowrap;">
                    <h1 class="hospital-title" style="margin: 0; font-size: 23px; font-weight: 900; color: #2b6cb0; letter-spacing: 0.5px;">CHAUDHARY HEALTH CARE CENTER</h1>
                    <h3 class="hospital-subtitle" style="margin: 4px 0 0; font-size: 13px; color: #e53e3e; text-transform: uppercase;">GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306</h3>
                    <p style="margin: 4px 0 0; font-size: 13px; font-weight: bold; color: #2d3748;">Phone: (0542) 123456</p>
                </div>
                <div style="flex: 0 0 auto; text-align: right; color: #718096; font-size: 12px; font-weight: bold; white-space: nowrap; margin-left: 15px;">
                    <div style="margin-bottom: 4px; color: #2d3748;">Date: <span id="auto-date-field-rep" style="border-bottom: 1px dashed #ccc; padding-bottom: 1px; min-width:70px; display:inline-block; text-align: center;"></span></div>
                    <div style="color: #2d3748;">Time: <span id="auto-time-field-rep" style="border-bottom: 1px dashed #ccc; padding-bottom: 1px; min-width:70px; display:inline-block; text-align: center;"></span></div>
                </div>
            </div>
            
            <div class="module-header">
                <h2>Reports & Analytics</h2>
                <div class="header-actions">
                    <button class="btn-primary" onclick="updateReportsDashboard()"><i class="fas fa-sync"></i> Refresh</button>
                    <button class="btn-primary" onclick="
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
                            adf.textContent = \`\${dd}/\${mm}/\${yyyy}\`;
                            atf.textContent = \`\${hours}:\${minutes} \${ampm}\`;
                        }
                        window.print();
                    "><i class="fas fa-print"></i> Print</button>
                </div>
            </div>
            
            <div class="report-filters" style="margin-bottom:25px; background:white; padding:20px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.05); display:flex; gap:20px; align-items:flex-end; flex-wrap:wrap;">
                <div class="form-group" style="margin:0; flex:1; min-width:200px;">
                    <label>Date Range</label>
                    <select id="report-date-filter" class="filter-select" onchange="updateReportsDashboard()">
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0; flex:1; min-width:200px;">
                    <label>Patient Type</label>
                    <select id="report-patient-filter" class="filter-select" onchange="updateReportsDashboard()">
                        <option value="all">All Patients</option>
                        <option value="surgery">Surgery Only</option>
                        <option value="normal">Normal (No Surgery)</option>
                    </select>
                </div>
            </div>

            <div class="stats-grid" id="reports-key-metrics" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px; margin-bottom:25px;">
                <!-- Metrics will be injected here -->
            </div>
            
            <div class="reports-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:20px;">
                <div class="report-card card">
                    <h3 style="margin-bottom:15px;"><i class="fas fa-chart-line" style="color:#3498db;"></i> Patient Growth</h3>
                    <div class="chart-container" style="height:250px; position:relative;">
                        <canvas id="patientGrowthChart"></canvas>
                    </div>
                </div>
                <div class="report-card card">
                    <h3 style="margin-bottom:15px;"><i class="fas fa-chart-bar" style="color:#2ecc71;"></i> Revenue</h3>
                    <div class="chart-container" style="height:250px; position:relative;">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
                <div class="report-card card">
                    <h3 style="margin-bottom:15px;"><i class="fas fa-chart-pie" style="color:#e74c3c;"></i> Payment Status</h3>
                    <div class="chart-container" style="height:250px; position:relative;">
                        <canvas id="paymentStatusChart"></canvas>
                    </div>
                </div>
                <div class="report-card card">
                    <h3 style="margin-bottom:15px;"><i class="fas fa-procedures" style="color:#9b59b6;"></i> Patient Types</h3>
                    <div class="chart-container" style="height:250px; position:relative;">
                        <canvas id="surgeryNormalChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    updateReportsDashboard();
}

let reportsCharts = {};

function getPatientData() {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const surgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');
    const discharges = JSON.parse(localStorage.getItem('discharge_records') || '[]');
    return { patients, surgeries, discharges };
}

function getRevenue() {
    return JSON.parse(localStorage.getItem('billing_records') || '{}');
}

function getStats() {
    const pData = getPatientData();
    const billing = getRevenue();
    return { ...pData, billing };
}

function filterReportsData(data, dateFilter, patientFilter) {
    let { patients, billing, surgeries, discharges } = data;
    const now = new Date();

    // Filter Patients
    let filteredPatients = patients.filter(p => {
        // Patient Type filter
        const isSurgery = surgeries.some(s => s.patient_id === p.patient_id);
        if (patientFilter === 'surgery' && !isSurgery) return false;
        if (patientFilter === 'normal' && isSurgery) return false;

        // Date filter
        if (dateFilter !== 'all') {
            const dateStr = p.admission_date || p.date;
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
            }
        }
        return true;
    });

    const validPatientIds = new Set(filteredPatients.map(p => p.patient_id));

    return { filteredPatients, validPatientIds, billing, surgeries, discharges };
}

function calculateMetrics(filteredData) {
    const { filteredPatients, validPatientIds, billing, surgeries, discharges } = filteredData;

    let totalPatients = filteredPatients.length;
    let admittedPatients = filteredPatients.filter(p => (p.status || '').toLowerCase() === 'admitted').length;
    let dischargedPatients = filteredPatients.filter(p => (p.status || '').toLowerCase() === 'discharged').length;
    if (admittedPatients < 0) admittedPatients = 0;
    let surgeryPatientsCount = surgeries.filter(s => validPatientIds.has(s.patient_id)).length;

    let totalRevenue = 0;
    let pendingBillsCount = 0;
    let paidBillsCount = 0;
    let totalPendingAmount = 0;

    filteredPatients.forEach(p => {
        let rec = billing[p.patient_id];
        if (rec && rec.items && rec.items.length > 0) {
            let grandTotal = 0;
            rec.items.forEach(item => { grandTotal += (item.fee * item.days); });
            let netPayable = grandTotal - (rec.discount || 0);
            if (netPayable < 0) netPayable = 0;

            let totalPaid = 0;
            if (rec.payments) {
                rec.payments.forEach(pay => { totalPaid += pay.amount });
            }
            totalRevenue += totalPaid;

            let remaining = netPayable - totalPaid;
            if (remaining <= 0 && netPayable > 0) {
                paidBillsCount++;
            } else {
                pendingBillsCount++;
                totalPendingAmount += remaining;
            }
        }
    });

    return {
        totalPatients, admittedPatients, dischargedPatients, surgeryPatientsCount,
        totalRevenue, totalPendingAmount, paidBillsCount, pendingBillsCount
    };
}

function updateReportsDashboard() {
    const dateFilter = document.getElementById('report-date-filter').value;
    const patientFilter = document.getElementById('report-patient-filter').value;

    const rawData = getStats();
    const filteredData = filterReportsData(rawData, dateFilter, patientFilter);
    const metrics = calculateMetrics(filteredData);

    const currency = window.currencySymbol || '₹';

    const role = currentUser?.role || 'admin';
    const showFinancials = (role === 'admin');

    // Update Key Metrics UX
    const metricsEl = document.getElementById('reports-key-metrics');
    if (metricsEl) {
        metricsEl.innerHTML = `
            <div class="stat-card" style="padding:20px; border-left:4px solid #3498db; background:white !important; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                <i class="fas fa-users" style="color:#3498db; font-size:24px; margin-bottom:10px;"></i>
                <h3 style="color:#2c3e50; font-size:28px; margin:0;">${metrics.totalPatients}</h3>
                <p style="margin:0; font-size:13px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Total Patients</p>
                <div style="font-size:12px; margin-top:5px; color:#95a5a6;">${metrics.admittedPatients} Admitted / ${metrics.dischargedPatients} Discharged</div>
            </div>
            
            ${showFinancials ? `
            <div class="stat-card" style="padding:20px; border-left:4px solid #2ecc71; background:white !important; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                <i class="fas fa-money-bill-wave" style="color:#2ecc71; font-size:24px; margin-bottom:10px;"></i>
                <h3 style="color:#2c3e50; font-size:28px; margin:0;">${currency}${metrics.totalRevenue.toLocaleString()}</h3>
                <p style="margin:0; font-size:13px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Total Revenue</p>
                <div style="font-size:12px; margin-top:5px; color:#95a5a6;">${metrics.paidBillsCount} Paid Bills</div>
            </div>
            
            <div class="stat-card" style="padding:20px; border-left:4px solid #e74c3c; background:white !important; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                 <i class="fas fa-file-invoice-dollar" style="color:#e74c3c; font-size:24px; margin-bottom:10px;"></i>
                 <h3 style="color:#2c3e50; font-size:28px; margin:0;">${currency}${metrics.totalPendingAmount.toLocaleString()}</h3>
                 <p style="margin:0; font-size:13px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Pending Revenue</p>
                 <div style="font-size:12px; margin-top:5px; color:#95a5a6;">${metrics.pendingBillsCount} Pending Bills</div>
            </div>` : ''}
            
            <div class="stat-card" style="padding:20px; border-left:4px solid #9b59b6; background:white !important; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                 <i class="fas fa-procedures" style="color:#9b59b6; font-size:24px; margin-bottom:10px;"></i>
                 <h3 style="color:#2c3e50; font-size:28px; margin:0;">${metrics.surgeryPatientsCount}</h3>
                 <p style="margin:0; font-size:13px; font-weight:bold; color:#7f8c8d; text-transform:uppercase;">Surgery Patients</p>
                 <div style="font-size:12px; margin-top:5px; color:#95a5a6;">Patients operated on</div>
            </div>
        `;
    }

    renderCharts(filteredData, metrics);
}

function renderCharts(filteredData, metrics) {
    if (typeof Chart === 'undefined') return;

    // Destroy existing instances to reconstruct over same canvas elements
    Object.keys(reportsCharts).forEach(key => {
        if (reportsCharts[key]) reportsCharts[key].destroy();
    });

    const containers = document.querySelectorAll('.reports-grid .chart-container');

    if (metrics.totalPatients === 0) {
        // Show "No Data Available"
        containers.forEach(c => {
            c.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#e74c3c; font-weight:bold; font-size:16px;">No Data Available</div>';
        });
        reportsCharts = {};
        return;
    } else {
        // Restore canvas structure if previously removed
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

    const { filteredPatients } = filteredData;

    // 1. Patient Growth (Line Chart)
    const dateGroups = {};
    filteredPatients.forEach(p => {
        let d = p.admission_date || p.date || new Date().toISOString().split('T')[0];
        dateGroups[d] = (dateGroups[d] || 0) + 1;
    });
    const sortedDates = Object.keys(dateGroups).sort();
    const growthData = sortedDates.map(d => dateGroups[d]);

    const ctxGrowth = document.getElementById('patientGrowthChart').getContext('2d');
    reportsCharts['growth'] = new Chart(ctxGrowth, {
        type: 'line',
        data: {
            labels: sortedDates.length ? sortedDates : ['No Dates'],
            datasets: [{
                label: 'New Patients',
                data: growthData.length ? growthData : [0],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2980b9'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    const role = currentUser?.role || 'admin';
    const showFinancials = (role === 'admin');

    if (showFinancials) {
        // 2. Revenue Bar Chart
        const ctxRev = document.getElementById('revenueChart')?.getContext('2d');
        if (ctxRev) {
            reportsCharts['revenue'] = new Chart(ctxRev, {
                type: 'bar',
                data: {
                    labels: ['Revenue Collections'],
                    datasets: [
                        {
                            label: 'Paid Collection',
                            data: [metrics.totalRevenue],
                            backgroundColor: '#2ecc71',
                            borderRadius: 6
                        },
                        {
                            label: 'Pending Balance',
                            data: [metrics.totalPendingAmount],
                            backgroundColor: '#e74c3c',
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // 3. Payment Status (Pie Chart)
        const ctxPay = document.getElementById('paymentStatusChart')?.getContext('2d');
        if (ctxPay) {
            reportsCharts['payment'] = new Chart(ctxPay, {
                type: 'pie',
                data: {
                    labels: ['Paid Bills', 'Pending Bills'],
                    datasets: [{
                        data: [metrics.paidBillsCount, metrics.pendingBillsCount],
                        backgroundColor: ['#2ecc71', '#e74c3c'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }

    // 4. Surgery vs Normal (Donut Chart)
    const normalCount = metrics.totalPatients - metrics.surgeryPatientsCount;
    const ctxSurg = document.getElementById('surgeryNormalChart').getContext('2d');
    reportsCharts['surgery'] = new Chart(ctxSurg, {
        type: 'doughnut',
        data: {
            labels: ['Normal Patients', 'Surgery Patients'],
            datasets: [{
                data: [normalCount, metrics.surgeryPatientsCount],
                backgroundColor: ['#3498db', '#9b59b6'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}