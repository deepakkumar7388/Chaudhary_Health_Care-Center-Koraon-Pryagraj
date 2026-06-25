/* ==========================================================================
   BILLING MODULE - OPTIMIZED & STABILIZED
   ========================================================================== */

let currentBillPatientId = null;
let currentBillData = null;

function formatBillDate(val) {
    if (!val || val === 'N/A' || val === '-') return 'N/A';
    try {
        const d = new Date(val);
        if (isNaN(d)) return val;
        return d.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    } catch { return val; }
}

const BILLING_ITEMS_LIST = [
    "DR. FEES", "OXYGEN CHARGE", "NEBULIZER CHARGE", "MONITOR CHARGE",
    "SYRINGE PUMP CHARGE", "SUCTION CHARGE", "NURSING CHARGE", "RMO CHARGE",
    "ANESTHETIC CHARGE", "OPRATION THEATER CHARGE", "ECG CHARGE",
    "Advance Medicine Charge", "EMERGENCY MEDICINE CHARGE", "DILEVARY /DNC /Streech CHARGE",
    "EMERGENCY BABY CARE/PHOTOTHERAPY", "X RAY CHARGE-",
    "DRASSING CHARGE", "STORE MEDICINE CHARGE", "BloodInfusion Charge", "CONSULTATION FEE"
];

function renderBilling() {
    const moduleEl = document.getElementById('module-billing');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="billing-container">
            <div class="module-header">
                <div class="header-main-info">
                    <h2 class="module-title">Billing & Payments</h2>
                    <p class="module-subtitle">Manage patient invoices, settlements and financial records</p>
                </div>
                
                <div class="dashboard-cards">
                    <div class="dash-card pro-card-blue">
                        <div class="card-info"><span class="label">Total Patients</span><h3 id="stat-total-patients" class="value">0</h3></div>
                        <div class="card-icon"><i class="bi bi-person"></i></div>
                    </div>
                    <div class="dash-card pro-card-purple">
                        <div class="card-info"><span class="label">Total Invoices</span><h3 id="stat-total-bills" class="value">0</h3></div>
                        <div class="card-icon"><i class="bi bi-file-earmark-medical"></i></div>
                    </div>
                    <div class="dash-card pro-card-green">
                        <div class="card-info"><span class="label">Payments Collected</span><h3 id="stat-paid-bills" class="value">0</h3></div>
                        <div class="card-icon"><i class="bi bi-check-all"></i></div>
                    </div>
                    <div class="dash-card pro-card-red">
                        <div class="card-info"><span class="label">Action Required</span><h3 id="stat-pending-bills" class="value">0</h3></div>
                        <div class="card-icon"><i class="bi bi-clock"></i></div>
                    </div>
                </div>
            </div>

            <div class="billing-search-panel">
                <div class="search-header"><i class="bi bi-search"></i> Find Patient to Generate Bill</div>
                <div class="search-bar-container">
                    <div class="search-input-group">
                        <i class="bi bi-person"></i>
                        <input type="text" id="billing-patient-search" class="professional-search-input" placeholder="Search by Name or Patient ID..." oninput="searchBillingPatients()">
                    </div>
                </div>
                <div id="billing-search-results" class="search-results-dropdown" style="display:none;"></div>
            </div>

            <div class="billing-tabs">
                <button class="tab-btn active" onclick="showBillingTab('pending')">Pending Bills</button>
                <button class="tab-btn" onclick="showBillingTab('paid')">Paid Bills</button>
                <button class="tab-btn" onclick="showBillingTab('all')">All Records</button>
            </div>

            <div id="bills-list" class="bills-list">
                <div class="loading-state" style="text-align:center; padding:40px; color:var(--b-text-light);">
                    <i class="bi bi-arrow-repeat fa-spin fa-2x"></i><p>Synchronizing billing records...</p>
                </div>
            </div>

            <!-- Detailed Billing Report Modal -->
            <div id="billing-report-wrap" class="billing-report-overlay" style="display:none;">
                <div class="report-actions-top no-print">
                    <button class="btn btn-primary btn-small" onclick="window.print()"><i class="bi bi-printer"></i> Print Invoice</button>
                    <button id="btn-return-discharge" class="btn btn-success btn-small" style="display:none;" onclick="showModule('discharge')"><i class="bi bi-box-arrow-left"></i> Return to Discharge</button>
                    <button class="btn btn-secondary btn-small" onclick="closeBillingReport()"><i class="bi bi-x-lg"></i> Close</button>
                </div>
                
                <div class="a4-bill-container" id="a4-bill-report">
                    <div class="report-type-badge no-print">Tax Invoice / Medical Bill</div>
                    <style>
                        @media print {
                            .no-print { display: none !important; }
                            .print-only { display: inline !important; }
                            .empty-row { display: none !important; }
                            @page { margin: 10mm; }
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Outfit', sans-serif; }
                            .billing-table th { background-color: #1e293b !important; color: white !important; }
                            .patient-info-summary { background-color: var(--background) !important; }
                        }
                        .print-only { display: none; }
                    </style>
                    <div class="chk-header">
                        <div class="hospital-logo"><img src="hlogo.png" alt="Logo"></div>
                        <div class="hospital-info">
                            <h1 class="hospital-title hospital-name">${window.hospitalSettings?.['hospital-name'] || 'CHAUDHARY HEALTH CARE CENTER'}</h1>
                            <h3 class="hospital-subtitle hospital-address">${window.hospitalSettings?.['hospital-address'] || 'GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306'}</h3>
                            <p style="font-size:11px; margin-top:5px; font-weight:700; color:#475569;">Helpline: <span class="hospital-contact">${window.hospitalSettings?.['hospital-contact'] || '+91 9935100000'}</span> | Email: <span class="hospital-email">${window.hospitalSettings?.['hospital-email'] || 'contact@chchealth.com'}</span></p>
                        </div>
                        <div class="report-meta" style="text-align: right;">
                            <div style="font-size:11px; font-weight:700;">Date: <span id="auto-date-field-bill"></span></div>
                            <div style="font-size:11px; color:#64748b;">Time: <span id="auto-time-field-bill"></span></div>
                        </div>
                    </div>
                    
                    <div class="patient-info-summary">
                        <div class="patient-info-grid">
                            <div class="info-column">
                                <p><strong>Patient ID:</strong> <span id="b-patient-id" class="editable-span"></span></p>
                                <p><strong>Name:</strong> <span id="b-patient-name" class="editable-span" style="font-weight:900;"></span></p>
                                <p><strong>Guardian:</strong> <span id="b-relative" class="editable-span"></span></p>
                                <p><strong>Address:</strong> <span id="b-address" class="editable-span"></span></p>
                            </div>
                            <div class="info-column">
                                <p><strong>Age/Gender:</strong> <span id="b-age" class="editable-span"></span></p>
                                <p><strong>Bed / Ward:</strong> <span id="b-bed" class="editable-span"></span></p>
                                <p><strong id="b-doa-label">Admitted:</strong> <span id="b-doa" class="editable-span"></span></p>
                                <p><strong id="b-dod-label">Discharged:</strong> <span id="b-dod" class="editable-span"></span></p>
                            </div>
                        </div>
                    </div>

                    <div class="billing-table-wrap">
                        <table class="billing-table" style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="width:30px; text-align:center;">#</th>
                                    <th>Service Description</th>
                                    <th style="width:80px; text-align:center;">Rate</th>
                                    <th style="width:60px; text-align:center;">Day</th>
                                    <th style="width:90px; text-align:right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody id="billing-items-body"></tbody>
                        </table>
                    </div>

                    <div class="billing-footer">
                        <div class="payment-history-wrap">
                            <h4 class="history-title"><i class="bi bi-clock-history"></i> Payment Ledger</h4>
                            <div id="add-payment-panel" class="no-print" style="margin-bottom:15px; padding:10px; background:var(--background); border-radius:8px;">
                                <div style="display:flex; gap:10px;">
                                    <input type="number" id="pay-amt" placeholder="Amount" style="width:100px; padding:5px;">
                                    <select id="pay-mode" style="padding:5px;"><option>Cash</option><option>Online</option><option>Cheque</option></select>
                                    <button class="btn btn-success" style="padding:5px 15px;" onclick="addPaymentToBill()">Add</button>
                                </div>
                            </div>
                            <table class="history-table" style="width:100%; font-size:11px;">
                                <thead style="background:var(--background);"><tr><th>Date</th><th>Mode</th><th>Amount</th><th class="no-print">Act</th></tr></thead>
                                <tbody id="payment-history-body"></tbody>
                            </table>
                        </div>

                        <div class="totals-wrapper">
                            <table class="totals-table" style="width:100%;">
                                <tr><td>Grand Total:</td><td id="grand-total" style="text-align:right; font-weight:700;">0</td></tr>
                                <tr><td>Discount:</td><td style="text-align:right;"><input type="number" id="discount-amt" value="0" class="no-print" style="width:80px; text-align:right;" oninput="calculateBillingTotals()"><span class="print-only" id="discount-amt-print">0</span></td></tr>
                                <tr class="net-row"><td>Net Payable:</td><td id="net-payable" style="text-align:right;">0</td></tr>
                                <tr><td>Total Paid:</td><td id="total-paid" style="text-align:right; color:var(--b-success);">0</td></tr>
                                <tr class="due-row"><td>Balance Due:</td><td id="due-amt" style="text-align:right; font-weight:900;">0</td></tr>
                            </table>
                            <div id="bill-status" style="margin-top:15px; padding:8px; text-align:center; border-radius:8px; font-weight:900; border:2px solid #ccc;">Pending</div>
                        </div>
                    </div>

                    <div class="signatures" style="display: flex; justify-content: flex-end; margin-top: 60px;">
                        <div style="font-weight:bold; font-size:12px; border-top:1px solid #000; padding-top:5px; width:180px; text-align:center;">AUTHORISED SIGNATORY</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    loadBillingData();
}

// Helper: billing stats + table render karo
function _renderBillingFromData(patients, billings) {
    const billingMap = {};
    billings.forEach(b => { billingMap[b.patient_id] = b; });

    let stats = { total: patients.length, bills: 0, paid: 0, pending: 0 };
    let pendingList = [], paidList = [];

    patients.forEach(p => {
        const rec = billingMap[p.patient_id];
        const pType = p.patient_type || 'IPD';
        const isOpd = pType === 'OPD';

        // OPD patients: hamesha bill list me show karo (registration pe fee li ja chuki hai)
        // IPD patients: show only if Admitted or has billing record
        const shouldShow = isOpd || p.status === 'Admitted' || (rec && rec.items?.length > 0);
        if (!shouldShow) return;

        stats.bills++;

        // Billing totals calculate karo
        let grandTotal = 0;
        if (rec?.items) rec.items.forEach(i => grandTotal += ((parseFloat(i.fee) || 0) * (parseFloat(i.days) || 1)));
        let net = Math.max(0, grandTotal - (parseFloat(rec?.discount) || 0));
        let paid = 0;
        if (rec?.payments) rec.payments.forEach(pay => paid += (parseFloat(pay.amount) || 0));
        let due = Math.max(0, net - paid);

        // ── OPD Special Logic ──
        // Agar OPD patient ka payment_status 'Paid' hai aur billing record empty hai
        // to registration time pe jo fee li gayi thi use Paid maano
        let isPaid, status;
        if (isOpd && net === 0 && paid === 0) {
            // Billing record abhi empty hai — patient ke payment_status pe depend karo
            const patPayStatus = (p.payment_status || 'Pending').toLowerCase();
            const consultFee = parseFloat(p.doctorFees) || parseFloat(p.totalBill) || 0;
            if (patPayStatus === 'paid') {
                isPaid = true;
                status = 'Paid';
                net = consultFee;      // display ke liye
                due = 0;
                paid = consultFee;
            } else {
                isPaid = false;
                status = 'Pending';
                net = consultFee;
                due = consultFee;
            }
        } else {
            isPaid = (due <= 0 && net > 0);
            status = isPaid ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
        }

        let billObj = {
            id: p.patient_id,
            patient: p.name,
            amount: net,
            remaining: due,
            bill_date: p.admission_date,
            status,
            patient_type: pType
        };
        if (isPaid) { paidList.push(billObj); stats.paid++; }
        else { pendingList.push(billObj); stats.pending++; }
    });

    const totalEl = document.getElementById('stat-total-patients');
    const billsEl = document.getElementById('stat-total-bills');
    const paidEl = document.getElementById('stat-paid-bills');
    const pendingEl = document.getElementById('stat-pending-bills');
    if (totalEl) totalEl.textContent = stats.total;
    if (billsEl) billsEl.textContent = stats.bills;
    if (paidEl) paidEl.textContent = stats.paid;
    if (pendingEl) pendingEl.textContent = stats.pending;

    window.currentBillsData = { pending: pendingList, paid: paidList };
    showBillingTab('pending');
}

async function loadBillingData() {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    // Patients: cache se instant render karo
    const cachedPatients = window.allPatientsData || JSON.parse(localStorage.getItem('patients') || '[]');
    // Billings: hamesha fresh server se lo (payments frequently change)
    const cachedBillings = JSON.parse(localStorage.getItem('billings') || '[]');

    if (cachedPatients.length > 0 && cachedBillings.length > 0) {
        // Instant render with cached data
        _renderBillingFromData(cachedPatients, cachedBillings);
    }

    // Always fetch fresh data in background (billings change often)
    _fetchBillingFresh(token, cachedPatients.length > 0 ? cachedPatients : null);
}

// Background billing fetch
async function _fetchBillingFresh(token, existingPatients) {
    try {
        const fetches = [];

        // Patients fetch karo agar cache nahi hai
        if (!existingPatients) {
            fetches.push(fetch(`${API_BASE}patients`, {
                headers: { 'Authorization': 'Bearer ' + token },
                credentials: 'include'
            }));
        }
        fetches.push(fetch(`${API_BASE}billing`, {
            headers: { 'Authorization': 'Bearer ' + token },
            credentials: 'include'
        }));

        const results = await Promise.all(fetches);
        let patients = existingPatients;
        let bRes;

        if (!existingPatients) {
            const pData = await results[0].json();
            bRes = await results[1].json();
            patients = pData.patients || [];
            window.allPatientsData = patients;
            localStorage.setItem('patients', JSON.stringify(patients));
        } else {
            bRes = await results[0].json();
        }

        const billings = bRes.billings || [];
        localStorage.setItem('billings', JSON.stringify(billings));

        // DOM update karo (silently)
        const container = document.getElementById('bills-list');
        if (container) _renderBillingFromData(patients, billings);

    } catch (err) {
        console.error("Billing load error:", err);
        if (!window.currentBillsData) {
            showNotification('Error connecting to billing server', 'error');
        }
    }
}

function showBillingTab(tab) {
    const bills = window.currentBillsData || { pending: [], paid: [] };
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick*="${tab}"]`)?.classList.add('active');

    let list = tab === 'pending' ? bills.pending : (tab === 'paid' ? bills.paid : [...bills.pending, ...bills.paid]);
    const container = document.getElementById('bills-list');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#94a3b8;">No records found for this category</div>`;
        return;
    }

    container.innerHTML = `
        <table class="bills-table">
            <thead>
                <tr>
                    <th>Patient Name</th>
                    <th>Invoice ID</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(bill => {
                    const isPaid = bill.status === 'Paid';
                    const isPartial = bill.status === 'Partial';
                    const statusClass = isPaid ? 'paid' : (isPartial ? 'partial' : 'pending');
                    const statusIcon = isPaid ? 'bi-check-circle' : (isPartial ? 'bi-clock-history' : 'bi-clock');
                    const typeBadge = bill.patient_type === 'OPD'
                        ? `<span style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:5px;font-weight:700;">OPD</span>`
                        : `<span style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:5px;font-weight:700;">IPD</span>`;
                    
                    return `
                    <tr>
                        <td data-label="Patient"><strong>${bill.patient}</strong>${typeBadge}</td>
                        <td data-label="Invoice ID" style="color:#64748b; font-size:12px; font-weight:700;">INV-${bill.id}</td>
                        <td data-label="Date">${new Date(bill.bill_date).toLocaleDateString('en-IN')}</td>
                        <td data-label="Amount" style="font-weight:800;">${window.currencySymbol || '₹'}${bill.amount.toLocaleString()}</td>
                        <td data-label="Due" style="color:${bill.remaining > 0 ? '#ef4444' : '#10b981'}; font-weight:700;">
                            ${window.currencySymbol || '₹'}${bill.remaining.toLocaleString()}
                        </td>
                        <td data-label="Status">
                            <span class="status-badge ${statusClass}">
                                <i class="bi ${statusIcon}"></i> ${bill.status}
                            </span>
                        </td>
                        <td data-label="Actions" class="bill-actions-cell">
                            <button class="bill-action-btn bill-btn-view" title="View Details" onclick="viewBill('${bill.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            ${!isPaid ? `
                            <button class="bill-action-btn bill-btn-pay" title="Mark as Paid" onclick="markBillPaid('${bill.id}', ${bill.remaining})">
                                <i class="bi bi-check-lg"></i>
                            </button>` : ''}
                            <button class="bill-action-btn bill-btn-print" title="Print Invoice" onclick="printBill('${bill.id}')">
                                <i class="bi bi-printer"></i>
                            </button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function viewBill(patientId) {
    currentBillPatientId = patientId;
    showLoading('Generating invoice...');
    try {
        const [response, pResponse] = await Promise.all([
            fetch(`${API_BASE}billing/${patientId}`, {
                headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
            }),
            fetch(`${API_BASE}patients/${patientId}`, {
                headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
            })
        ]);
        const result = await response.json();
        const pResult = await pResponse.json();
        
        currentBillData = result.billing;
        const p = pResult?.patient || window.allPatientsData?.find(x => x.patient_id === patientId);
        
        document.getElementById('b-patient-id').textContent = patientId;
        document.getElementById('b-patient-name').textContent = p?.name || 'Unknown';
        document.getElementById('b-relative').textContent = p?.guardian_name || p?.relative_name || '-';
        document.getElementById('b-address').textContent = p?.address || '-';
        document.getElementById('b-age').textContent = (p?.age || '-') + ' / ' + (p?.gender || '-');
        const isOpd = p?.patient_type === 'OPD';
        document.getElementById('b-bed').textContent = isOpd ? 'OPD' : (p?.bed_no || '-');
        
        const doaLabel = document.getElementById('b-doa-label');
        if (doaLabel) {
            doaLabel.textContent = isOpd ? 'Registered:' : 'Admitted:';
        }
        document.getElementById('b-doa').textContent = formatBillDate(p?.admission_date);

        const dodLabel = document.getElementById('b-dod-label');
        const dodSpan = document.getElementById('b-dod');
        if (dodLabel && dodSpan) {
            if (isOpd) {
                dodLabel.parentElement.style.display = 'none';
            } else {
                dodLabel.parentElement.style.display = 'block';
                dodLabel.textContent = 'Discharged:';
                dodSpan.textContent = formatBillDate(p?.discharge_date);
            }
        }
        
        // Auto-populate invoice date and time
        const now = new Date();
        document.getElementById('auto-date-field-bill').textContent = now.toLocaleDateString();
        document.getElementById('auto-time-field-bill').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        document.getElementById('discount-amt').value = currentBillData?.discount || 0;
        
        initializeBillingTable(currentBillData?.items || [], p?.bedHistory || [], p?.surgeries || [], isOpd);
        renderPaymentHistory(currentBillData?.payments || []);
        
        // OPD ke liye Registration Fee Banner dikhaao
        _renderOpdBanner(isOpd, p);

        // Calculate total admitted days (calendar days)
        let totalAdmittedDays = 1;
        if (p?.admission_date) {
            const admissionDate = new Date(p.admission_date);
            const dischargeDate = p.discharge_date ? new Date(p.discharge_date) : new Date();
            const sDate = new Date(admissionDate);
            const eDate = new Date(dischargeDate);
            sDate.setHours(0, 0, 0, 0);
            eDate.setHours(0, 0, 0, 0);
            totalAdmittedDays = Math.round(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24)) + 1;
            if (totalAdmittedDays < 1) totalAdmittedDays = 1;
        }

        const settingConsultationFee = window.hospitalSettings?.['consultation-fee'];
        const hasConsultationFeeSetting = (settingConsultationFee !== undefined && settingConsultationFee !== null && settingConsultationFee.toString().trim() !== '');
        const defaultConsultFee = hasConsultationFeeSetting ? parseFloat(settingConsultationFee) : '';

        const settingDoctorFee = window.hospitalSettings?.['doctor-fees'];
        const hasDoctorFeeSetting = (settingDoctorFee !== undefined && settingDoctorFee !== null && settingDoctorFee.toString().trim() !== '');
        const defaultDrFees = hasDoctorFeeSetting ? parseFloat(settingDoctorFee) : defaultConsultFee;

        // Populate inputs for saved items
        const rows = document.querySelectorAll('#billing-items-body tr');
        rows.forEach((row) => {
            const itemName = row.getAttribute('data-item-name');
            const savedItem = currentBillData?.items?.find(i => i.name === itemName);
            
            if (savedItem) {
                // If previously saved, load exactly what was saved unless we need to auto-update
                let feeVal = savedItem.fee !== undefined ? savedItem.fee : '';
                
                if (!savedItem.isManualFee) {
                    if (itemName === 'CONSULTATION FEE') {
                        feeVal = defaultConsultFee;
                    } else if (itemName === 'DR. FEES' && !isOpd) {
                        // Settings ki value ko priority do, patient DB ki purani value ignore karo
                        feeVal = defaultDrFees;
                    }
                }
                
                row.querySelector('.fee-input').value = feeVal;
                if (savedItem.isManualFee) {
                    row.querySelector('.fee-input').setAttribute('data-manual-fee', 'true');
                }
                
                const isBedCharge = itemName && itemName.startsWith('Bed Charge');
                const isPatientAdmitted = p?.status === 'Admitted';
                if (isBedCharge && isPatientAdmitted) {
                    if (savedItem.isManualDays) {
                        row.querySelector('.days-input').value = savedItem.days;
                        row.querySelector('.days-input').setAttribute('data-manual-days', 'true');
                    } else {
                        // Keep the newly calculated diffDays! Do not overwrite.
                    }
                } else {
                    row.querySelector('.days-input').value = savedItem.days !== undefined ? savedItem.days : '';
                    if (savedItem.isManualDays) {
                        row.querySelector('.days-input').setAttribute('data-manual-days', 'true');
                    }
                }

                // If CONSULTATION FEE is empty, set days-input value to empty string
                if (itemName === 'CONSULTATION FEE' && feeVal === '') {
                    row.querySelector('.days-input').value = '';
                }
            } else {
                // First-time load: no saved item exists yet
                if (!itemName.startsWith('Bed Charge') && !itemName.startsWith('Surgery:')) {
                    // Populate total admitted days for static items
                    row.querySelector('.days-input').value = totalAdmittedDays;

                    // Auto-populate default consultation fee if it's DR. FEES (only for IPD)
                    if (itemName === 'DR. FEES' && !isOpd) {
                        // Settings ki value use karo (defaultDrFees), patient DB ki purani value nahi
                        row.querySelector('.fee-input').value = defaultDrFees;
                        if (defaultDrFees === '') {
                            row.querySelector('.days-input').value = '';
                        } else {
                            row.querySelector('.days-input').value = 1;
                        }
                    }
                    // Auto-populate default consultation fee if it's CONSULTATION FEE (only for IPD)
                    if (itemName === 'CONSULTATION FEE' && !isOpd) {
                        row.querySelector('.fee-input').value = defaultConsultFee;
                        if (defaultConsultFee === '') {
                            row.querySelector('.days-input').value = '';
                        } else {
                            row.querySelector('.days-input').value = 1;
                        }
                    }
                }
                // For 'Bed Charge' items, initializeBillingTable has already populated the dynamic bed history stay values!
            }
        });

        calculateBillingTotals();
        const returnBtn = document.getElementById('btn-return-discharge');
        if (returnBtn) {
            returnBtn.style.display = sessionStorage.getItem('dischargeDraft') ? 'inline-block' : 'none';
        }
        document.getElementById('billing-report-wrap').style.display = 'block';
        hideLoading();
    } catch (err) {
        hideLoading();
        showNotification('Error loading invoice details', 'error');
    }
}

function _renderOpdBanner(isOpd, patient) {
    // Existing banner remove karo
    document.getElementById('opd-paid-banner')?.remove();
    
    if (!isOpd) return;
    
    // Settings se consultation fee lo — patient DB ki purani value use na karo
    const settingConsultFee = window.hospitalSettings?.['consultation-fee'];
    const consultFee = (settingConsultFee !== undefined && settingConsultFee !== null && settingConsultFee.toString().trim() !== '')
        ? parseFloat(settingConsultFee)
        : (patient?.doctorFees > 0 ? patient.doctorFees : 0);
    const currency = window.currencySymbol || '₹';
    const regDate = patient?.admission_date ? new Date(patient.admission_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    
    const banner = document.createElement('div');
    banner.id = 'opd-paid-banner';
    banner.style.cssText = `
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border: 1px solid #6ee7b7;
        border-left: 4px solid #10b981;
        border-radius: 10px;
        padding: 14px 18px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 14px;
    `;
    banner.innerHTML = `
        <div style="width:40px; height:40px; border-radius:50%; background:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <i class="bi bi-check-lg" style="color:#fff; font-size:18px;"></i>
        </div>
        <div style="flex:1;">
            <div style="font-weight:700; color:#065f46; font-size:14px;">✅ OPD Consultation Fee — Registration Time पर प्राप्त किया गया</div>
            <div style="font-size:12px; color:#047857; margin-top:3px;">
                <strong>${currency}${consultFee}</strong> — Cash Received on ${regDate}. 
                नीचे की table में only additional charges डालें।
            </div>
        </div>
        <div style="background:#10b981; color:#fff; padding:6px 14px; border-radius:20px; font-weight:700; font-size:13px; white-space:nowrap;">
            ${currency}${consultFee} Paid
        </div>
    `;
    
    // Patient info block ke baad insert karo
    const patientInfoBlock = document.querySelector('.patient-info-summary');
    if (patientInfoBlock && patientInfoBlock.parentNode) {
        patientInfoBlock.parentNode.insertBefore(banner, patientInfoBlock.nextSibling);
    }
}

function initializeBillingTable(items = [], bedHistory = [], surgeries = [], isOpd = false) {
    const tbody = document.getElementById('billing-items-body');
    let html = '';
    let rowIndex = 1;

    // Dynamically add bed history rows
    if (bedHistory && bedHistory.length > 0) {
        bedHistory.forEach((bed, bedIndex) => {
            const startDate = new Date(bed.start_date);
            const endDate = bed.end_date ? new Date(bed.end_date) : new Date();

            // Calculate actual days stayed (calendar days to prevent timezone/hour fluctuations)
            const sDate = new Date(startDate);
            const eDate = new Date(endDate);
            sDate.setHours(0, 0, 0, 0);
            eDate.setHours(0, 0, 0, 0);
            let diffDays = Math.round(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24));
            
            // If it is the last stay (active or discharged), we count the final day (+1)
            const isLastStay = bedIndex === bedHistory.length - 1;
            if (isLastStay) {
                diffDays += 1;
            }

            // Skip rows with 0 days (same-day transfer out of this bed)
            if (diffDays === 0) return;

            const itemName = `Bed Charge (${bed.ward_type} - ${bed.bed_no})`;
            html += `
            <tr class="billing-item-row" data-item-name="${itemName}">
                <td style="text-align:center;">${rowIndex++}</td>
                <td><strong>${itemName}</strong> <br><small style="color:#64748b; font-size:10px;">${startDate.toLocaleDateString()} to ${bed.end_date ? endDate.toLocaleDateString() : 'Present'}</small></td>
                <td style="text-align:center;"><input type="number" class="calc-input fee-input" oninput="this.setAttribute('data-manual-fee', 'true'); calculateBillingTotals()" value="${bed.daily_charge || 0}" placeholder="0"></td>
                <td style="text-align:center;"><input type="number" class="calc-input days-input" oninput="this.setAttribute('data-manual-days', 'true'); calculateBillingTotals();" value="${diffDays}" placeholder="1"></td>
                <td class="row-amt" style="text-align:right; font-weight:700;"></td>
            </tr>
            `;
        });
    }

    // Dynamically add surgery rows
    if (surgeries && surgeries.length > 0) {
        surgeries.forEach((s) => {
            const itemName = `Surgery: ${s.surgeryName}`;
            html += `
            <tr class="billing-item-row" data-item-name="${itemName}">
                <td style="text-align:center;">${rowIndex++}</td>
                <td><strong>${itemName}</strong> <br><small style="color:#64748b; font-size:10px;">Date: ${new Date(s.surgeryDate).toLocaleDateString()}</small></td>
                <td style="text-align:center;"><input type="number" class="calc-input fee-input" oninput="this.setAttribute('data-manual-fee', 'true'); calculateBillingTotals()" value="${s.cost || 0}" placeholder="0"></td>
                <td style="text-align:center;"><input type="number" class="calc-input days-input" oninput="this.setAttribute('data-manual-days', 'true'); calculateBillingTotals()" value="1" placeholder="1"></td>
                <td class="row-amt" style="text-align:right; font-weight:700;"></td>
            </tr>
            `;
        });
    }

    // Add static items
    let staticItems = BILLING_ITEMS_LIST;
    if (isOpd) {
        staticItems = staticItems.filter(i => i !== "DR. FEES");
    }

    html += staticItems.map((item) => `
        <tr class="billing-item-row" data-item-name="${item}">
            <td style="text-align:center;">${rowIndex++}</td>
            <td>${item}</td>
            <td style="text-align:center;"><input type="number" class="calc-input fee-input" oninput="this.setAttribute('data-manual-fee', 'true'); calculateBillingTotals()" placeholder="0"></td>
            <td style="text-align:center;"><input type="number" class="calc-input days-input" oninput="this.setAttribute('data-manual-days', 'true'); calculateBillingTotals()" placeholder="1"></td>
            <td class="row-amt" style="text-align:right; font-weight:700;"></td>
        </tr>
    `).join('');

    tbody.innerHTML = html;
}

function calculateBillingTotals() {
    let grandTotal = 0;
    const rows = document.querySelectorAll('#billing-items-body tr');
    rows.forEach(row => {
        const fee = parseFloat(row.querySelector('.fee-input').value) || 0;
        const days = parseFloat(row.querySelector('.days-input').value) || 0;
        const total = fee * (days || 1);
        grandTotal += total;
        row.querySelector('.row-amt').textContent = total > 0 ? total : '';
        const itemName = row.getAttribute('data-item-name');
        if (total === 0 && itemName !== 'CONSULTATION FEE') row.classList.add('empty-row'); else row.classList.remove('empty-row');
    });

    const discount = parseFloat(document.getElementById('discount-amt').value) || 0;
    const net = Math.max(0, grandTotal - discount);
    
    let paid = 0;
    if (currentBillData?.payments) currentBillData.payments.forEach(p => paid += (parseFloat(p.amount) || 0));

    document.getElementById('grand-total').textContent = grandTotal.toLocaleString();
    document.getElementById('net-payable').textContent = net.toLocaleString();
    document.getElementById('total-paid').textContent = paid.toLocaleString();
    document.getElementById('due-amt').textContent = Math.max(0, net - paid).toLocaleString();
    document.getElementById('discount-amt-print').textContent = discount;

    const statusEl = document.getElementById('bill-status');
    const due = net - paid;
    if (due <= 0) { statusEl.textContent = 'Paid'; statusEl.style.background = '#ecfdf5'; statusEl.style.color = '#10b981'; }
    else if (paid > 0) { statusEl.textContent = 'Partial'; statusEl.style.background = '#fffbeb'; statusEl.style.color = '#f59e0b'; }
    else { statusEl.textContent = 'Pending'; statusEl.style.background = '#fef2f2'; statusEl.style.color = '#ef4444'; }

    saveBillData();
}

let saveTimeout = null;
function saveBillData() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        if (!currentBillPatientId) return;
        const items = [];
        document.querySelectorAll('#billing-items-body tr').forEach(row => {
            const daysInput = row.querySelector('.days-input');
            items.push({
                name: row.getAttribute('data-item-name'),
                fee: parseFloat(row.querySelector('.fee-input').value) || 0,
                days: parseFloat(daysInput.value) || 0,
                isManualDays: daysInput.getAttribute('data-manual-days') === 'true',
                isManualFee: row.querySelector('.fee-input').getAttribute('data-manual-fee') === 'true'
            });
        });

        const res = await fetch(`${API_BASE}billing/${currentBillPatientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionStorage.getItem('token') },
            body: JSON.stringify({ items, discount: parseFloat(document.getElementById('discount-amt').value) || 0 })
        });
        // Cache invalidate karo taaki next load fresh data le
        if (res.ok) {
            localStorage.removeItem('billings');
        }
    }, 1000);
}

async function addPaymentToBill() {
    const amt = parseFloat(document.getElementById('pay-amt').value);
    if (!amt || amt <= 0) return;

    showLoading('Processing payment...');
    const response = await fetch(`${API_BASE}billing/${currentBillPatientId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionStorage.getItem('token') },
        body: JSON.stringify({ amount: amt, mode: document.getElementById('pay-mode').value, date: new Date().toISOString().split('T')[0] })
    });
    
    const result = await response.json();
    if (result.success) {
        currentBillData.payments = result.payments;
        renderPaymentHistory(currentBillData.payments);
        calculateBillingTotals();
        document.getElementById('pay-amt').value = '';
        // Cache clear karo taaki list refresh ho jaye
        localStorage.removeItem('billings');

        // Check if fully paid and has discharge draft for THIS patient
        const dueAmtText = document.getElementById('due-amt')?.textContent || '0';
        const dueAmt = parseFloat(dueAmtText.replace(/,/g, '')) || 0;
        const draftStr = sessionStorage.getItem('dischargeDraft');
        if (dueAmt <= 0 && draftStr) {
            try {
                const draftObj = JSON.parse(draftStr);
                if (draftObj.patientId && String(draftObj.patientId) === String(currentBillPatientId)) {
                    showNotification('Payment complete! Returning to Discharge page...', 'success');
                    setTimeout(() => {
                        showModule('discharge');
                    }, 1500);
                }
            } catch(e) {}
        }
    }
    hideLoading();
}

function renderPaymentHistory(payments = []) {
    const tbody = document.getElementById('payment-history-body');
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td style="padding: 8px 5px;">${new Date(p.date).toLocaleDateString()}</td>
            <td style="padding: 8px 5px;">${p.mode}</td>
            <td style="padding: 8px 5px; font-weight: 700;">₹${p.amount}</td>
            <td class="no-print" style="padding: 8px 5px;">
                <button onclick="deletePayment('${p._id}')" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 6px; font-size: 14px; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px;" onmouseover="this.style.background='#fef2f2'; this.style.color='#dc2626';" onmouseout="this.style.background='transparent'; this.style.color='#ef4444';">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function deletePayment(payId) {
    if (!confirm('Delete this payment record?')) return;
    const response = await fetch(`${API_BASE}billing/${currentBillPatientId}/payments/${payId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
    });
    const result = await response.json();
    if (result.success) {
        currentBillData.payments = result.payments;
        renderPaymentHistory(currentBillData.payments);
        calculateBillingTotals();
        localStorage.removeItem('billings'); // Cache clear
    }
}

async function markBillPaid(patientId, remaining) {
    if (confirm(`Collect remaining ${window.currencySymbol || '₹'}${remaining} via Cash?`)) {
        const response = await fetch(`${API_BASE}billing/${patientId}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionStorage.getItem('token') },
            body: JSON.stringify({ amount: remaining, mode: 'Cash', date: new Date().toISOString().split('T')[0] })
        });
        if (response.ok) {
            localStorage.removeItem('billings'); // Cache clear karo
            // Check if there's a discharge draft waiting — redirect back automatically
            const draft = sessionStorage.getItem('dischargeDraft');
            if (draft) {
                try {
                    const draftObj = JSON.parse(draft);
                    if (draftObj.patientId && String(draftObj.patientId) === String(patientId)) {
                        showNotification('Payment complete! Returning to Discharge page...', 'success');
                        setTimeout(() => {
                            showModule('discharge');
                        }, 1500);
                        return;
                    }
                } catch(e) {}
            }
            loadBillingData();
            if (currentBillPatientId === patientId) viewBill(patientId);
        }
    }
}

function closeBillingReport() {
    document.getElementById('billing-report-wrap').style.display = 'none';
    loadBillingData();
}

function printBill(id) {
    viewBill(id).then(() => {
        setTimeout(() => window.print(), 800);
    });
}

function searchBillingPatients() {
    const term = document.getElementById('billing-patient-search').value.toLowerCase().trim();
    const results = document.getElementById('billing-search-results');
    if (term.length < 2) { results.style.display = 'none'; return; }

    const filtered = (window.allPatientsData || []).filter(p => p.name.toLowerCase().includes(term) || p.patient_id.toLowerCase().includes(term));
    results.innerHTML = filtered.map(p => `
        <div class="pro-search-item" onclick="viewBill('${p.patient_id}'); document.getElementById('billing-search-results').style.display='none';">
            <span class="p-name">${p.name}</span>
            <span class="p-id">${p.patient_id}</span>
        </div>
    `).join('');
    results.style.display = filtered.length ? 'block' : 'none';
}
