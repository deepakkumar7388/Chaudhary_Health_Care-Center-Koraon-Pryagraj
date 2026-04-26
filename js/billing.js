// ==================== BILLING MODULE ====================
let currentBillPatientId = null;

function renderBilling() {
    const moduleEl = document.getElementById('module-billing');
    if (!moduleEl) return;

    // RBAC validation
    const currentUser = JSON.parse(sessionStorage.getItem('user')) || {};
    if (currentUser.role !== 'admin' && currentUser.role !== 'doctor') {
        moduleEl.innerHTML = '<div style="padding:40px; text-align:center; color:red;"><h3><i class="fas fa-lock"></i> Access Denied</h3><p>Only Administrators and Doctors can access the Billing Module.</p></div>';
        return;
    }

    moduleEl.innerHTML = `
        <div class="billing-container">
            <div class="module-header">
                <div class="header-main-info">
                    <h2 class="module-title">Financial Control Center</h2>
                    <p class="module-subtitle">Oversee patient billing, revenue tracking, and account settlements.</p>
                </div>
                <div class="dashboard-cards">
                    <div class="dash-card pro-card-blue">
                        <div class="card-info">
                            <span class="label">Total Patients</span>
                            <h3 id="stat-total-patients" class="value">0</h3>
                        </div>
                        <div class="card-icon"><i class="fas fa-users-cog"></i></div>
                    </div>
                    
                    <div class="dash-card pro-card-purple">
                        <div class="card-info">
                            <span class="label">Invoices Issued</span>
                            <h3 id="stat-total-bills" class="value">0</h3>
                        </div>
                        <div class="card-icon"><i class="fas fa-file-invoice"></i></div>
                    </div>
                    
                    <div class="dash-card pro-card-green">
                        <div class="card-info">
                            <span class="label">Accounts Settled</span>
                            <h3 id="stat-paid-bills" class="value">0</h3>
                        </div>
                        <div class="card-icon"><i class="fas fa-hand-holding-usd"></i></div>
                    </div>
                    
                    <div class="dash-card pro-card-red">
                        <div class="card-info">
                            <span class="label">Outstanding Actions</span>
                            <h3 id="stat-pending-bills" class="value">0</h3>
                        </div>
                        <div class="card-icon"><i class="fas fa-exclamation-circle"></i></div>
                    </div>
                </div>
            </div>
            
            <div class="billing-search-panel">
                <div class="search-header">
                    <i class="fas fa-search-plus"></i>
                    <span>Search Patient Records</span>
                </div>
                <div class="search-bar-container">
                    <div class="search-input-group">
                        <i class="fas fa-search"></i>
                        <input type="text" id="billing-patient-search" class="professional-search-input" 
                               placeholder="Enter Patient ID, Name, or Mobile Number..."
                               oninput="searchBillingPatients()">
                    </div>
                    <div class="search-buttons">
                        <button class="p-btn p-btn-primary" onclick="searchBillingPatients()">Find Account</button>
                        <button class="p-btn p-btn-outline" onclick="clearBillingSearch()">Clear</button>
                    </div>
                </div>
                <div id="billing-search-results" class="pro-results-container" style="display:none;"></div>
            </div>
            
            <div class="billing-tabs">
                <button class="tab-btn active" onclick="showBillingTab('pending')">Pending Bills</button>
                <button class="tab-btn" onclick="showBillingTab('paid')">Paid Bills</button>
                <button class="tab-btn" onclick="showBillingTab('all')">All Bills</button>
            </div>
            
            <div class="bills-list" id="bills-list"></div>
        </div>

        <div id="billing-report-wrap" style="display:none;" class="billing-container">
            <div class="action-buttons" style="margin-bottom:15px; display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn btn-primary" onclick="window.print()" style="background:#4CAF50; color:white;">
                    <i class="fas fa-print"></i> Print Bill
                </button>
                <button class="btn btn-close" onclick="closeBillingReport()" style="background:#6c757d; color:white;">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
            
            <div class="a4-bill-container" id="a4-bill-report">
                <style>
                    @media print {
                        .no-print { display: none !important; }
                        .print-only { display: inline !important; }
                        .empty-row { display: none !important; }
                        @page { margin: 10mm; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .billing-table th, .billing-table td { border: none !important; }
                        .totals-table td { border: none !important; }
                        .calc-input { display: none !important; }
                    }
                    .print-only { display: none; }
                </style>
                <div class="chk-header">
                    <div class="hospital-logo">
                        <img src="hlogo.png" alt="CHC Logo">
                    </div>
                    <div class="hospital-info">
                        <h1 class="hospital-title">CHAUDHARY HEALTH CARE CENTER</h1>
                        <h3 class="hospital-subtitle">GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306</h3>
                        <p class="hospital-contact">Phone: (0542) 123456</p>
                    </div>
                    <div class="report-meta">
                        <div class="meta-item">Date: <span id="auto-date-field-bill"></span></div>
                        <div class="meta-item">Time: <span id="auto-time-field-bill"></span></div>
                    </div>
                </div>
                
                <div class="patient-info-summary">
                    <div class="info-column">
                        <p><strong>Patient ID:</strong> <span id="b-patient-id" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                        <p><strong>Patient Name:</strong> <span id="b-patient-name" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                        <p><strong>Guardian:</strong> <span id="b-relative" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                        <p><strong>Address:</strong> <span id="b-address" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                    </div>
                    <div class="info-column text-right-md">
                        <p><strong>Age:</strong> <span id="b-age" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                        <p><strong>Bed No:</strong> <span id="b-bed" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                        <p><strong>DOA:</strong> <span id="b-doa" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                        <p><strong>DOD:</strong> <span id="b-dod" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                        <p><strong>Doctor:</strong> <span id="b-doctor" contenteditable="true" spellcheck="false" class="editable-span"></span></p>
                    </div>
                </div>
                
                <table class="billing-table" style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 14px;">
                    <thead>
                        <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000; background: transparent;">
                            <th style="width:5%; text-align:left; border: none !important; padding: 6px 0;">#</th>
                            <th style="width:45%; text-align:left; border: none !important; padding: 6px 0;">ITEM</th>
                            <th style="width:15%; text-align:center; border: none !important; padding: 6px 0;">FEES</th>
                            <th style="width:15%; text-align:center; border: none !important; padding: 6px 0;">DAYS</th>
                            <th style="width:20%; text-align:right; border: none !important; padding: 6px 0;">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody id="billing-items-body" style="border-bottom: 2px solid #000;">
                        <!-- Dynamic items -->
                    </tbody>
                </table>
                
                <div class="bill-footer-section">
                    <div class="payment-history-wrap">
                        <div class="no-print" id="add-payment-panel">
                            <h4>Add Payment</h4>
                            <div class="payment-controls">
                                <input type="number" id="pay-amt" class="calc-input" placeholder="Amt">
                                <input type="date" id="pay-date" class="calc-input">
                                <select id="pay-mode" class="calc-input">
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                </select>
                                <button type="button" class="btn btn-primary btn-small" onclick="addPaymentToBill()">Add</button>
                            </div>
                        </div>
                        <div id="payment-restricted-msg" class="no-print">
                            <i class="fas fa-lock"></i> Restricted access.
                        </div>
                        
                        <h4 class="history-title">Payment History</h4>
                        <div class="table-responsive">
                            <table class="history-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Mode</th>
                                        <th>Amount</th>
                                        <th class="no-mobile">By User</th>
                                        <th class="no-print">Act</th>
                                    </tr>
                                </thead>
                                <tbody id="payment-history-body">
                                    <!-- dynamic payments -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                
                    <div class="totals-wrapper">
                        <table class="totals-table">
                            <tr>
                                <td><strong>TOTAL SERVICES</strong></td>
                                <td class="amt-field"><span id="grand-total">₹0</span></td>
                            </tr>
                            <tr>
                                <td><strong>DISCOUNT</strong></td>
                                <td class="amt-field">
                                    <div class="discount-input-wrap">
                                        <span class="no-print">${window.currencySymbol || '₹'}</span>
                                        <input type="number" id="discount-amt" class="calc-input no-print" value="0" oninput="calculateBillingTotals()" onkeydown="saveBillDataDebounced()" onfocus="this.select()">
                                        <span class="print-only" id="discount-amt-print">₹0</span>
                                    </div>
                                </td>
                            </tr>
                            <tr class="net-row">
                                <td><strong>NET PAYABLE</strong></td>
                                <td class="amt-field"><span id="net-payable">₹0</span></td>
                            </tr>
                            <tr>
                                <td><strong>TOTAL PAID</strong></td>
                                <td class="amt-field"><span id="total-paid">₹0</span></td>
                            </tr>
                            <tr class="due-row">
                                <td><strong>BALANCE DUE</strong></td>
                                <td class="amt-field"><strong><span id="due-amt">₹0</span></strong></td>
                            </tr>
                            <tr class="status-row">
                                <td><strong>STATUS</strong></td>
                                <td class="amt-field"><strong><span id="bill-status">Pending</span></strong></td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div class="signatures" style="display: flex; justify-content: flex-end; margin-top: 50px;">
                    <div class="dr-sig" style="font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; width: 150px; text-align: center;">AUTHORISED SIGN</div>
                </div>
            </div>
        </div>
    `;
    loadBillingData();
}

async function loadBillingData() {
    try {
        const patientsResponse = await fetch(`${API_BASE}patients`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const patientsData = await patientsResponse.json();
        const patients = patientsData.patients || [];

        // Ensure patients are globally accessible for search
        window.allPatientsData = patients;

        let totalPatients = patients.length;
        let totalBills = 0;
        let paidBillsCount = 0;
        let pendingBillsCount = 0;

        let pending = [];
        let paid = [];

        for (const p of patients) {
            const billRes = await fetch(`${API_BASE}billing/${p.patient_id}`, {
                headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
            });
            const billData = await billRes.json();
            const rec = billData.billing;

            if (rec && rec.items && rec.items.length > 0) {
                totalBills++;
                let grandTotal = 0;
                rec.items.forEach(item => { grandTotal += (item.fee * (item.days || 1)); });

                let discount = rec.discount || 0;
                let netPayable = grandTotal - discount;
                if (netPayable < 0) netPayable = 0;

                let totalPaid = 0;
                if (rec.payments) {
                    rec.payments.forEach(pay => { totalPaid += pay.amount });
                }

                let amountLeft = netPayable - totalPaid;
                let isPaid = (amountLeft <= 0 && netPayable > 0);
                let status = isPaid ? 'Paid' : 'Pending';

                let recentDate = p.admission_date || new Date().toISOString().split('T')[0];
                if (rec.payments && rec.payments.length > 0) {
                    recentDate = new Date(rec.payments[rec.payments.length - 1].date).toISOString().split('T')[0];
                }

                let billObj = {
                    id: p.patient_id,
                    patient: p.name,
                    amount: netPayable,
                    remaining: amountLeft > 0 ? amountLeft : 0,
                    bill_date: recentDate,
                    status: status
                };

                if (isPaid) {
                    paid.push(billObj);
                    paidBillsCount++;
                } else {
                    pending.push(billObj);
                    pendingBillsCount++;
                }
            }
        }

        // Update stats
        const tpStats = document.getElementById('stat-total-patients');
        if (tpStats) tpStats.textContent = totalPatients.toLocaleString();
        const tbStats = document.getElementById('stat-total-bills');
        if (tbStats) tbStats.textContent = totalBills.toLocaleString();
        const paidStats = document.getElementById('stat-paid-bills');
        if (paidStats) paidStats.textContent = paidBillsCount.toLocaleString();
        const pendingStats = document.getElementById('stat-pending-bills');
        if (pendingStats) pendingStats.textContent = pendingBillsCount.toLocaleString();

        window.currentBillsData = { pending, paid };
        showBillingTab('pending');

    } catch (err) {
        console.error("Error loading billing data from backend:", err);
    }
}

function showBillingTab(tab) {
    const bills = window.currentBillsData || { pending: [], paid: [] };

    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick*="${tab}"]`)?.classList.add('active');

    let billList = [];
    if (tab === 'pending') billList = bills.pending || [];
    else if (tab === 'paid') billList = bills.paid || [];
    else billList = [...(bills.pending || []), ...(bills.paid || [])];

    const container = document.getElementById('bills-list');
    if (!container) return;

    if (billList.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:50px;">No bills available</div>`;
        return;
    }

    container.innerHTML = billList.map(bill => `
        <div class="bill-card ${bill.status === 'Paid' ? 'paid' : 'pending'}">
            <div class="bill-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h4>${bill.patient}</h4>
                <div style="text-align:right;">
                    <span class="amount" style="display:block; font-size:16px; font-weight:bold;">${window.currencySymbol || '₹'}${bill.amount.toLocaleString()}</span>
                    ${bill.status !== 'Paid' ? `<span style="display:block; font-size:12px; color:#e53e3e; margin-top:2px;">Remaining: ${window.currencySymbol || '₹'}${bill.remaining.toLocaleString()}</span>` : ''}
                </div>
            </div>
            <div class="bill-details">
                <p><strong>Patient ID:</strong> ${bill.id}</p>
                <p><strong>Last Update:</strong> ${bill.bill_date}</p>
                <p><strong>Status:</strong> <span class="status-badge payment-${bill.status.toLowerCase()}">${bill.status}</span></p>
            </div>
            <div class="bill-actions">
                <button class="btn-small btn-info" onclick="viewBill('${bill.id}')"><i class="fas fa-eye"></i> View</button>
                ${bill.status !== 'Paid' ?
            `<button class="btn-small btn-success" onclick="markBillPaid('${bill.id}', ${bill.remaining})"><i class="fas fa-check"></i> Collect Remaining</button>` : ''}
                <button class="btn-small btn-primary" onclick="printBill('${bill.id}')"><i class="fas fa-print"></i> Print</button>
            </div>
        </div>
    `).join('');
}

function searchBillingPatients() {
    const input = document.getElementById('billing-patient-search');
    if (!input) return;

    const term = input.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('billing-search-results');
    if (!resultsContainer) return;

    if (term.length < 1) {
        resultsContainer.style.display = 'none';
        return;
    }

    let patients = window.allPatientsData || JSON.parse(localStorage.getItem('patients') || '[]');
    const filtered = patients.filter(p =>
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.patient_id && p.patient_id.toLowerCase().includes(term)) ||
        (p.mobile && p.mobile.includes(term))
    );

    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div style="padding:15px; text-align:center;">No patients found</div>`;
    } else {
        resultsContainer.innerHTML = filtered.map(p => `
            <div class="pro-search-item">
                <div class="patient-core-info">
                    <div class="patient-icon-circle">
                        <i class="fas ${p.gender?.toLowerCase() === 'female' ? 'fa-female' : 'fa-male'}"></i>
                    </div>
                    <div class="patient-text-block">
                        <div class="name-row">
                            <span class="p-name">${p.name}</span>
                            <span class="p-id">${p.patient_id}</span>
                        </div>
                        <div class="meta-row">
                            <span><i class="fas fa-user-clock"></i> ${p.age}y / ${p.gender}</span>
                            <span><i class="fas fa-mobile-alt"></i> ${p.mobile || 'No Mobile'}</span>
                            <span class="p-status ${p.payment_status?.toLowerCase() || 'pending'}">${p.payment_status || 'Pending'}</span>
                        </div>
                    </div>
                </div>
                <div class="patient-action-block">
                    <button class="p-action-btn" onclick="generateBill('${p.patient_id}')">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <span>Generate Invoice</span>
                    </button>
                </div>
            </div>
        `).join('');
    }
    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearBillingSearch() {
    document.getElementById('billing-patient-search').value = '';
    document.getElementById('billing-search-results').style.display = 'none';
}

const BILLING_ITEMS_LIST = [
    "DR. FEES", "REGESTATION CHARGE", "NICU CHARGE", "MEDICINE CHARGE", "i C.U CHARAGE",
    "NURSING CHARGE", "OXYGEN CHARGE", "GASTRIC WASHING CHARGE", "SURGAN CHARGE",
    "ANESTHETIC CHARGE", "OPRATION THEATER CHARGE", "BED CHARGE", "ECG CHARGE",
    "Advance Medicine Charge", "EMERGENCY MEDICINE CHARGE", "DILEVARY /DNC /Streech CHARGE",
    "EMERGENCY BABY CARE/PHOTOTHERAPY", "X RAY CHARGE-", "PRIVATE AC ROOM CHARGE",
    "DRASSING CHARGE", "STORE MEDICINE CHARGE", "BloodInfusion Charge"
];

function initializeBillingTable(extraItems = []) {
    const tbody = document.getElementById('billing-items-body');
    if (!tbody) return;

    // Standard items
    let html = BILLING_ITEMS_LIST.map((item, index) => {
        let num = index + 1;
        return `
        <tr class="billing-item-row" data-item-name="${item}">
            <td>${num}</td>
            <td style="text-align:left;">${item}</td>
            <td style="text-align:center;"><input type="number" class="calc-input fee-input" oninput="calculateBillingTotals()" onfocus="highlightRow(this)" onblur="unhighlightRow(this)"></td>
            <td style="text-align:center;"><input type="number" class="calc-input days-input" oninput="calculateBillingTotals()" onfocus="highlightRow(this)" onblur="unhighlightRow(this)"></td>
            <td style="text-align:right;"><span class="row-amount"></span></td>
        </tr>
    `}).join('');

    // Extra items (like Surgeries)
    if (extraItems.length > BILLING_ITEMS_LIST.length) {
        for (let i = BILLING_ITEMS_LIST.length; i < extraItems.length; i++) {
            const item = extraItems[i];
            const num = i + 1;
            html += `
            <tr class="billing-item-row" data-extra="true">
                <td>${num}</td>
                <td style="text-align:left;">${item.name || 'Extra Service'}</td>
                <td style="text-align:center;"><input type="number" class="calc-input fee-input" value="${item.fee || 0}" oninput="calculateBillingTotals()" onfocus="highlightRow(this)" onblur="unhighlightRow(this)"></td>
                <td style="text-align:center;"><input type="number" class="calc-input days-input" value="${item.days || 1}" oninput="calculateBillingTotals()" onfocus="highlightRow(this)" onblur="unhighlightRow(this)"></td>
                <td style="text-align:right;"><span class="row-amount"></span></td>
            </tr>
            `;
        }
    }

    tbody.innerHTML = html;
}

let saveBillDataTimeout;
function saveBillDataDebounced() {
    clearTimeout(saveBillDataTimeout);
    saveBillDataTimeout = setTimeout(saveBillData, 500);
}

function saveBillData() {
    if (!currentBillPatientId) return;

    const discount = parseFloat(document.getElementById('discount-amt').value) || 0;
    let items = [];
    const rows = document.querySelectorAll('#billing-items-body tr');
    rows.forEach(row => {
        let fee = parseFloat(row.querySelector('.fee-input').value) || 0;
        let days = parseFloat(row.querySelector('.days-input').value) || 0;
        let name = row.getAttribute('data-item-name') || row.querySelector('td:nth-child(2)').textContent;
        items.push({ fee, days, name });
    });

    fetch(`${API_BASE}billing/${currentBillPatientId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + sessionStorage.getItem('token')
        },
        body: JSON.stringify({ discount, items })
    })
        .catch(err => console.error("Error autosaving bill:", err));
}

function addPaymentToBill() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'doctor')) {
        showNotification("Only Doctor/Admin can perform payment", "error");
        return;
    }

    if (!currentBillPatientId) return;

    const amt = parseFloat(document.getElementById('pay-amt').value);
    const dateInput = document.getElementById('pay-date').value || new Date().toISOString().split('T')[0];
    const mode = document.getElementById('pay-mode').value;
    const username = currentUser ? currentUser.name : 'Unknown';

    if (!amt || amt <= 0) {
        showNotification("Please enter a valid amount", "error");
        return;
    }

    const paymentData = { amount: amt, date: dateInput, mode: mode, performed_by: username };

    showLoading('Processing payment...');
    fetch(`${API_BASE}billing/${currentBillPatientId}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + sessionStorage.getItem('token')
        },
        body: JSON.stringify(paymentData)
    })
        .then(res => res.json())
        .then(result => {
            hideLoading();
            if (result.success) {
                showNotification('Payment added successfully', 'success');
                document.getElementById('pay-amt').value = '';
                generateBill(currentBillPatientId); // Refresh
            } else {
                showNotification(result.message || 'Failed to add payment', 'error');
            }
        })
        .catch(err => {
            hideLoading();
            console.error(err);
        });
}

async function deletePayment(paymentId) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'doctor')) {
        showNotification("Only Doctor/Admin can delete payments", "error");
        return;
    }

    if (!currentBillPatientId || !paymentId) return;

    if (!confirm('Are you sure you want to delete this payment?')) return;

    showLoading('Deleting payment...');
    try {
        const response = await fetch(`${API_BASE}billing/${currentBillPatientId}/payments/${paymentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();
        hideLoading();

        if (result.success) {
            showNotification('Payment deleted successfully', 'success');
            generateBill(currentBillPatientId); // Refresh all totals and history
        } else {
            showNotification(result.message || 'Failed to delete payment', 'error');
        }
    } catch (err) {
        hideLoading();
        console.error(err);
        showNotification('Network error while deleting payment', 'error');
    }
}

function renderPaymentHistory(payments = []) {
    const tbody = document.getElementById('payment-history-body');
    if (!tbody) return;

    if (!payments || payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 15px; color:#a0aec0; border:1px solid #cbd5e0;">No payments recorded</td></tr>`;
        return;
    }

    const isAuthorized = currentUser && (currentUser.role === 'admin' || currentUser.role === 'doctor');

    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${new Date(p.date).toISOString().split('T')[0]}</td>
            <td>${p.mode}</td>
            <td><strong>${window.currencySymbol || '₹'}${p.amount.toLocaleString()}</strong></td>
            <td class="no-mobile">${p.performed_by || 'Admin'}</td>
            <td class="no-print">
                ${isAuthorized ? `<button type="button" class="btn-delete-payment" onclick="deletePayment('${p._id}')">
                    <i class="fas fa-trash"></i>
                </button>` : `<i class="fas fa-lock" style="color:#cbd5e0;"></i>`}
            </td>
        </tr>
    `).join('');
}

let currentBillData = null; // Global to store loaded bill for easy access

function calculateBillingTotals() {
    const rows = document.querySelectorAll('#billing-items-body tr');
    let grandTotal = 0;

    rows.forEach(row => {
        const feeInputDisplay = row.querySelector('.fee-input');
        const daysInputDisplay = row.querySelector('.days-input');
        const fee = parseFloat(feeInputDisplay.value) || 0;
        const days = parseFloat(daysInputDisplay.value) || 0;
        const rowAmt = fee * days;

        const rowAmtDisplay = row.querySelector('.row-amount');
        if (rowAmt > 0) {
            rowAmtDisplay.textContent = rowAmt.toFixed(0);

            // Format printable inputs by adding span
            let existingPrintFee = row.querySelector('.print-only.fee-print');
            if (!existingPrintFee) {
                feeInputDisplay.insertAdjacentHTML('afterend', '<span class="print-only fee-print"></span>');
                existingPrintFee = row.querySelector('.print-only.fee-print');
            }
            existingPrintFee.textContent = fee;

            let existingPrintDays = row.querySelector('.print-only.days-print');
            if (!existingPrintDays) {
                daysInputDisplay.insertAdjacentHTML('afterend', '<span class="print-only days-print"></span>');
                existingPrintDays = row.querySelector('.print-only.days-print');
            }
            existingPrintDays.textContent = days;

            grandTotal += rowAmt;
            row.classList.remove('empty-row');
        } else {
            rowAmtDisplay.textContent = '';
            if (fee === 0 && days === 0) {
                row.classList.add('empty-row');
            } else {
                row.classList.remove('empty-row');
            }
        }
    });

    document.getElementById('grand-total').textContent = (window.currencySymbol || '₹') + grandTotal.toFixed(0);

    const discount = parseFloat(document.getElementById('discount-amt').value) || 0;
    document.getElementById('discount-amt-print').textContent = discount;

    let totalDue = grandTotal - discount;
    if (totalDue <= 0) totalDue = 0;

    document.getElementById('net-payable').textContent = (window.currencySymbol || '₹') + totalDue.toFixed(0);

    // Calculate Payments from currentBillData
    let totalPaid = 0;
    if (currentBillData && currentBillData.payments) {
        currentBillData.payments.forEach(p => totalPaid += p.amount);
    }

    document.getElementById('total-paid').textContent = (window.currencySymbol || '₹') + totalPaid.toFixed(0);

    let remaining = totalDue - totalPaid;
    if (remaining < 0) remaining = 0;

    document.getElementById('due-amt').textContent = (window.currencySymbol || '₹') + remaining.toFixed(0);

    const statusEl = document.getElementById('bill-status');
    if (remaining === 0 && totalDue > 0) {
        statusEl.textContent = 'Paid';
        statusEl.style.color = '#38a169'; // Green
        statusEl.style.borderColor = '#38a169';
        statusEl.style.background = '#f0fff4';
    } else {
        statusEl.textContent = 'Pending';
        statusEl.style.color = '#e53e3e'; // Red
        statusEl.style.borderColor = '#e53e3e';
        statusEl.style.background = '#fff5f5';
    }

    saveBillDataDebounced();
}

async function generateBill(patientId) {
    showLoading('Loading bill details...');
    try {
        const pRes = await fetch(`${API_BASE}patients/${patientId}`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const pData = await pRes.json();
        const patient = pData.patient;

        if (!patient) {
            showNotification('Patient not found', 'error');
            hideLoading();
            return;
        }

        currentBillPatientId = patient.patient_id;
        const bRes = await fetch(`${API_BASE}billing/${currentBillPatientId}`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const bData = await bRes.json();
        currentBillData = bData.billing; // Global store

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('b-patient-id').textContent = currentBillPatientId;
        document.getElementById('b-patient-name').textContent = patient.name;
        document.getElementById('b-age').textContent = patient.age + "Y/" + (patient.gender?.charAt(0) || "U");
        document.getElementById('b-relative').textContent = patient.guardian_name || "N/A";
        document.getElementById('b-address').textContent = patient.address || "N/A";
        document.getElementById('b-bed').textContent = patient.bed_no || "N/A";
        document.getElementById('b-doa').textContent = patient.admission_date ? new Date(patient.admission_date).toISOString().split('T')[0] : today;
        document.getElementById('b-dod').textContent = patient.discharge_date ? new Date(patient.discharge_date).toISOString().split('T')[0] : today;
        document.getElementById('b-doctor').textContent = patient.doctor_assigned || "Dr. Sharma";

        showBillingReport();
        initializeBillingTable(currentBillData?.items || []);

        const tbody = document.getElementById('billing-items-body');
        const rows = tbody.querySelectorAll('tr');

        if (currentBillData && currentBillData.items && currentBillData.items.length > 0) {
            document.getElementById('discount-amt').value = currentBillData.discount || '0';
            rows.forEach((row, idx) => {
                if (currentBillData.items[idx]) {
                    const feeInput = row.querySelector('.fee-input');
                    const daysInput = row.querySelector('.days-input');
                    if (feeInput) feeInput.value = currentBillData.items[idx].fee || '';
                    if (daysInput) daysInput.value = currentBillData.items[idx].days || '';
                }
            });
        } else {
            // Reset if no data
            document.getElementById('discount-amt').value = '0';
            rows.forEach(row => {
                const f = row.querySelector('.fee-input');
                const d = row.querySelector('.days-input');
                if (f) f.value = '';
                if (d) d.value = '';
            });
        }

        renderPaymentHistory(currentBillData?.payments || []);
        calculateBillingTotals();
        hideLoading();

    } catch (err) {
        console.error(err);
        hideLoading();
        showNotification('Error loading bill', 'error');
    }
}

function viewBill(patientId) {
    generateBill(patientId);
}

function showBillingReport() {
    document.querySelector('.billing-container').style.display = 'none'; // hide main container

    const wrap = document.getElementById('billing-report-wrap');
    if (wrap) {
        wrap.style.display = 'block';
        initializeBillingTable();

        const adf = document.getElementById('auto-date-field-bill');
        const atf = document.getElementById('auto-time-field-bill');
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
            adf.textContent = `${dd}/${mm}/${yyyy}`;
            atf.textContent = `${hours}:${minutes} ${ampm}`;
        }

        const cRole = currentUser?.role;

        // Enforce role-based UI rules for Payment
        if (cRole === 'admin' || cRole === 'doctor') {
            document.getElementById('add-payment-panel').style.display = 'block';
            document.getElementById('payment-restricted-msg').style.display = 'none';
        } else {
            document.getElementById('add-payment-panel').style.display = 'none';
            document.getElementById('payment-restricted-msg').style.display = 'block';
        }

        // Enforce role-based Edit constraints
        setTimeout(() => {
            const inputs = document.querySelectorAll('.fee-input, .days-input, #discount-amt');
            const editableSpans = document.querySelectorAll('.editable-span');
            const canEdit = (cRole === 'admin' || cRole === 'doctor');

            inputs.forEach(el => el.disabled = !canEdit);
            editableSpans.forEach(el => {
                el.contentEditable = canEdit;
                el.style.borderBottom = canEdit ? '1px dashed #cbd5e0' : 'none';
            });
        }, 300);
    }
}

function closeBillingReport() {
    document.getElementById('billing-report-wrap').style.display = 'none';
    document.querySelector('.billing-container').style.display = 'block';
    // Regenerate list on close to persist calculations
    loadBillingData();
}

function printBill(patientId) {
    viewBill(patientId);
    setTimeout(() => {
        window.print();
    }, 500);
}

function markBillPaid(patientId, remaining) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'doctor')) {
        showNotification("Security: Only Doctor/Admin can mark bills paid", "error");
        return;
    }
    if (confirm('Collect remaining amount of ' + (window.currencySymbol || '₹') + remaining + ' for ' + patientId + ' via Cash?')) {

        const records = JSON.parse(localStorage.getItem('billing_records') || '{}');
        let billObj = records[patientId];
        if (billObj) {
            if (!billObj.payments) billObj.payments = [];
            const username = currentUser ? currentUser.name : 'Unknown';
            billObj.payments.push({ id: Date.now(), amount: remaining, date: new Date().toISOString().split('T')[0], mode: 'Cash', performed_by: username });
            records[patientId] = billObj;
            localStorage.setItem('billing_records', JSON.stringify(records));

            showNotification('Payment added successfully', 'success');
            loadBillingData();
        }
    }
}

function highlightRow(input) {
    input.select();
    const row = input.closest('tr');
    if (row) row.classList.add('active-row');
}

function unhighlightRow(input) {
    const row = input.closest('tr');
    if (row) row.classList.remove('active-row');
}

