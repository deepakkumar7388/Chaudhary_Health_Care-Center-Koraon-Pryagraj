/* ==========================================================================
   BILLING MODULE - OPTIMIZED & STABILIZED
   ========================================================================== */

let currentBillPatientId = null;
let currentBillData = null;

const BILLING_ITEMS_LIST = [
    "DR. FEES", "ICU CHARGE", "OXYGEN CHARGE", "NEBULIZER CHARGE", "MONITOR CHARGE",
    "SYRINGE PUMP CHARGE", "SUCTION CHARGE", "NURSING CHARGE", "RMO CHARGE",
    "ANESTHETIC CHARGE", "OPRATION THEATER CHARGE", "BED CHARGE", "ECG CHARGE",
    "Advance Medicine Charge", "EMERGENCY MEDICINE CHARGE", "DILEVARY /DNC /Streech CHARGE",
    "EMERGENCY BABY CARE/PHOTOTHERAPY", "X RAY CHARGE-", "PRIVATE AC ROOM CHARGE",
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
                        <div class="card-icon"><i class="fas fa-user-injured"></i></div>
                    </div>
                    <div class="dash-card pro-card-purple">
                        <div class="card-info"><span class="label">Total Invoices</span><h3 id="stat-total-bills" class="value">0</h3></div>
                        <div class="card-icon"><i class="fas fa-file-invoice-dollar"></i></div>
                    </div>
                    <div class="dash-card pro-card-green">
                        <div class="card-info"><span class="label">Payments Collected</span><h3 id="stat-paid-bills" class="value">0</h3></div>
                        <div class="card-icon"><i class="fas fa-check-double"></i></div>
                    </div>
                    <div class="dash-card pro-card-red">
                        <div class="card-info"><span class="label">Action Required</span><h3 id="stat-pending-bills" class="value">0</h3></div>
                        <div class="card-icon"><i class="fas fa-clock"></i></div>
                    </div>
                </div>
            </div>

            <div class="billing-search-panel">
                <div class="search-header"><i class="fas fa-search"></i> Find Patient to Generate Bill</div>
                <div class="search-bar-container">
                    <div class="search-input-group">
                        <i class="fas fa-user"></i>
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
                    <i class="fas fa-spinner fa-spin fa-2x"></i><p>Synchronizing billing records...</p>
                </div>
            </div>

            <!-- Detailed Billing Report Modal -->
            <div id="billing-report-wrap" class="billing-report-overlay" style="display:none;">
                <div class="report-actions-top no-print">
                    <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Invoice</button>
                    <button class="btn btn-secondary" onclick="closeBillingReport()"><i class="fas fa-times"></i> Close</button>
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
                            .patient-info-summary { background-color: #f8fafc !important; }
                        }
                        .print-only { display: none; }
                    </style>
                    <div class="chk-header">
                        <div class="hospital-logo"><img src="hlogo.png" alt="Logo"></div>
                        <div class="hospital-info">
                            <h1 class="hospital-title">CHAUDHARY HEALTH CARE CENTER</h1>
                            <h3 class="hospital-subtitle">GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306</h3>
                            <p style="font-size:11px; margin-top:5px; font-weight:700; color:#475569;">Helpline: +91 9935100000 | Email: contact@chchealth.com</p>
                        </div>
                        <div class="report-meta" style="text-align: right;">
                            <div style="font-size:11px; font-weight:700;">Date: <span id="auto-date-field-bill"></span></div>
                            <div style="font-size:11px; color:#64748b;">Time: <span id="auto-time-field-bill"></span></div>
                        </div>
                    </div>
                    
                    <div class="patient-info-summary">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                            <div class="info-column">
                                <p><strong>Patient ID:</strong> <span id="b-patient-id" class="editable-span"></span></p>
                                <p><strong>Name:</strong> <span id="b-patient-name" class="editable-span" style="font-weight:900;"></span></p>
                                <p><strong>Guardian:</strong> <span id="b-relative" class="editable-span"></span></p>
                                <p><strong>Address:</strong> <span id="b-address" class="editable-span"></span></p>
                            </div>
                            <div class="info-column">
                                <p><strong>Age/Gender:</strong> <span id="b-age" class="editable-span"></span></p>
                                <p><strong>Bed / Ward:</strong> <span id="b-bed" class="editable-span"></span></p>
                                <p><strong>Admitted:</strong> <span id="b-doa" class="editable-span"></span></p>
                                <p><strong>Discharged:</strong> <span id="b-dod" class="editable-span"></span></p>
                            </div>
                        </div>
                    </div>

                    <div class="billing-table-wrap">
                        <table class="billing-table" style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th style="width:50px; text-align:center;">S.N.</th>
                                    <th>Particulars / Service Description</th>
                                    <th style="width:120px; text-align:center;">Rate (Fee)</th>
                                    <th style="width:80px; text-align:center;">Qty/Days</th>
                                    <th style="width:120px; text-align:right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody id="billing-items-body"></tbody>
                        </table>
                    </div>

                    <div class="billing-footer" style="display:flex; justify-content:space-between; margin-top:30px; gap:30px;">
                        <div class="payment-history-wrap">
                            <h4 class="history-title"><i class="fas fa-history"></i> Payment Ledger</h4>
                            <div id="add-payment-panel" class="no-print" style="margin-bottom:15px; padding:10px; background:#f8fafc; border-radius:8px;">
                                <div style="display:flex; gap:10px;">
                                    <input type="number" id="pay-amt" placeholder="Amount" style="width:100px; padding:5px;">
                                    <select id="pay-mode" style="padding:5px;"><option>Cash</option><option>Online</option><option>Cheque</option></select>
                                    <button class="btn btn-success" style="padding:5px 15px;" onclick="addPaymentToBill()">Add</button>
                                </div>
                            </div>
                            <table class="history-table" style="width:100%; font-size:11px;">
                                <thead style="background:#f1f5f9;"><tr><th>Date</th><th>Mode</th><th>Amount</th><th class="no-print">Act</th></tr></thead>
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

async function loadBillingData() {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    try {
        // 1. Fetch patients and billings in parallel
        const [pRes, bRes] = await Promise.all([
            fetch(`${API_BASE}patients`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`${API_BASE}billing`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const pData = await pRes.json();
        const bData = await bRes.json();
        
        const patients = pData.patients || [];
        const billings = bData.billings || [];
        window.allPatientsData = patients;

        const billingMap = {};
        billings.forEach(b => { billingMap[b.patient_id] = b; });

        let stats = { total: patients.length, bills: 0, paid: 0, pending: 0 };
        let pendingList = [], paidList = [];

        patients.forEach(p => {
            const rec = billingMap[p.patient_id];
            if (p.status === 'Admitted' || (rec && rec.items?.length > 0)) {
                stats.bills++;
                let grandTotal = 0;
                if (rec?.items) rec.items.forEach(i => grandTotal += ((parseFloat(i.fee) || 0) * (parseFloat(i.days) || 1)));
                
                let net = Math.max(0, grandTotal - (parseFloat(rec?.discount) || 0));
                let paid = 0;
                if (rec?.payments) rec.payments.forEach(pay => paid += (parseFloat(pay.amount) || 0));
                
                let due = Math.max(0, net - paid);
                let isPaid = (due <= 0 && net > 0);
                let status = isPaid ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');

                let billObj = { id: p.patient_id, patient: p.name, amount: net, remaining: due, bill_date: p.admission_date, status };
                if (isPaid) { paidList.push(billObj); stats.paid++; }
                else { pendingList.push(billObj); stats.pending++; }
            }
        });

        document.getElementById('stat-total-patients').textContent = stats.total;
        document.getElementById('stat-total-bills').textContent = stats.bills;
        document.getElementById('stat-paid-bills').textContent = stats.paid;
        document.getElementById('stat-pending-bills').textContent = stats.pending;

        window.currentBillsData = { pending: pendingList, paid: paidList };
        showBillingTab('pending');

    } catch (err) {
        console.error("Billing load error:", err);
        showNotification('Error connecting to billing server', 'error');
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
                    const statusClass = isPaid ? 'paid' : 'pending';
                    const statusIcon = isPaid ? 'fa-check-circle' : 'fa-clock';
                    
                    return `
                    <tr>
                        <td><strong>${bill.patient}</strong></td>
                        <td style="color:#64748b; font-size:12px; font-weight:700;">INV-${bill.id}</td>
                        <td>${bill.bill_date}</td>
                        <td style="font-weight:800;">${window.currencySymbol || '₹'}${bill.amount.toLocaleString()}</td>
                        <td style="color:${bill.remaining > 0 ? '#ef4444' : '#10b981'}; font-weight:700;">
                            ${window.currencySymbol || '₹'}${bill.remaining.toLocaleString()}
                        </td>
                        <td>
                            <span class="status-badge ${statusClass}">
                                <i class="fas ${statusIcon}"></i> ${bill.status}
                            </span>
                        </td>
                        <td style="text-align:right;">
                            <button class="action-btn" title="View Details" onclick="viewBill('${bill.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${!isPaid ? `
                            <button class="action-btn btn-pay" title="Mark as Paid" onclick="markBillPaid('${bill.id}', ${bill.remaining})">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                            <button class="action-btn" title="Print Invoice" onclick="printBill('${bill.id}')">
                                <i class="fas fa-print"></i>
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
        const response = await fetch(`${API_BASE}billing/${patientId}`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();
        currentBillData = result.billing;
        
        // Find patient info
        const p = window.allPatientsData?.find(x => x.patient_id === patientId);
        
        document.getElementById('b-patient-id').textContent = patientId;
        document.getElementById('b-patient-name').textContent = p?.name || 'Unknown';
        document.getElementById('b-relative').textContent = p?.relative_name || '-';
        document.getElementById('b-address').textContent = p?.address || '-';
        document.getElementById('b-age').textContent = (p?.age || '-') + ' / ' + (p?.gender || '-');
        document.getElementById('b-bed').textContent = p?.bed_number || '-';
        document.getElementById('b-doa').textContent = p?.admission_date || '-';
        document.getElementById('b-dod').textContent = p?.discharge_date || 'N/A';
        
        document.getElementById('discount-amt').value = currentBillData?.discount || 0;
        
        initializeBillingTable(currentBillData?.items || []);
        renderPaymentHistory(currentBillData?.payments || []);
        
        // Populate inputs
        const rows = document.querySelectorAll('#billing-items-body tr');
        rows.forEach((row, idx) => {
            if (currentBillData?.items?.[idx]) {
                row.querySelector('.fee-input').value = currentBillData.items[idx].fee || '';
                row.querySelector('.days-input').value = currentBillData.items[idx].days || '';
            }
        });

        calculateBillingTotals();
        document.getElementById('billing-report-wrap').style.display = 'block';
        hideLoading();
    } catch (err) {
        hideLoading();
        showNotification('Error loading invoice details', 'error');
    }
}

function initializeBillingTable(items = []) {
    const tbody = document.getElementById('billing-items-body');
    let html = BILLING_ITEMS_LIST.map((item, index) => `
        <tr class="billing-item-row" data-item-name="${item}">
            <td style="text-align:center;">${index + 1}</td>
            <td>${item}</td>
            <td style="text-align:center;"><input type="number" class="calc-input fee-input" oninput="calculateBillingTotals()" placeholder="0"></td>
            <td style="text-align:center;"><input type="number" class="calc-input days-input" oninput="calculateBillingTotals()" placeholder="1"></td>
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
        if (total === 0) row.classList.add('empty-row'); else row.classList.remove('empty-row');
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
    if (due <= 0 && net > 0) { statusEl.textContent = 'Paid'; statusEl.style.background = '#ecfdf5'; statusEl.style.color = '#10b981'; }
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
            items.push({
                name: row.getAttribute('data-item-name'),
                fee: parseFloat(row.querySelector('.fee-input').value) || 0,
                days: parseFloat(row.querySelector('.days-input').value) || 0
            });
        });

        await fetch(`${API_BASE}billing/${currentBillPatientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionStorage.getItem('token') },
            body: JSON.stringify({ items, discount: parseFloat(document.getElementById('discount-amt').value) || 0 })
        });
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
    }
    hideLoading();
}

function renderPaymentHistory(payments = []) {
    const tbody = document.getElementById('payment-history-body');
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${new Date(p.date).toLocaleDateString()}</td>
            <td>${p.mode}</td>
            <td>${p.amount}</td>
            <td class="no-print"><button class="btn-small btn-danger" onclick="deletePayment('${p._id}')"><i class="fas fa-trash"></i></button></td>
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
    results.innerHTML = filtered.map(p => `<div onclick="viewBill('${p.patient_id}'); document.getElementById('billing-search-results').style.display='none';"><strong>${p.name}</strong> (${p.patient_id})</div>`).join('');
    results.style.display = filtered.length ? 'block' : 'none';
}
