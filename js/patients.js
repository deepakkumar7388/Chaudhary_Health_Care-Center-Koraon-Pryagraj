// ==================== PATIENTS MODULE ====================

// Role-based helper: only admin & doctor can see payment rupee amounts
function canViewPayments() {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'doctor');
}

function renderPatients() {
    const moduleEl = document.getElementById('module-patients');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="patients-container">
            <div class="module-header">
                <h2>Patient Management</h2>
                <button class="add-patient-cta" onclick="showModule('add-patient')" id="btn-add-patient-cta">
                    <span class="cta-icon-wrap"><i class="bi bi-person-plus"></i></span>
                    <span class="cta-label">Add New Patient</span>
                    <span class="cta-shimmer"></span>
                </button>
            </div>
            
            <div class="search-filter">
                <input type="text" placeholder="Search patients..." class="search-input" id="patient-search" onkeyup="filterPatients()">
                <select class="filter-select" id="patient-filter" onchange="filterPatients()">
                    <option value="all">All Status</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Discharged">Discharged</option>
                </select>
                <select class="filter-select" id="type-filter" onchange="filterPatients()">
                    <option value="all">All Types</option>
                    <option value="IPD">IPD Only</option>
                    <option value="OPD">OPD Only</option>
                </select>
                ${canViewPayments() ? `
                <select class="filter-select" id="payment-filter" onchange="filterPatients()">
                    <option value="all">All Payments</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                </select>` : ''}
                <select class="filter-select" id="surgery-filter" onchange="filterPatients()">
                    <option value="all">All Cases (Surgery & Normal)</option>
                    <option value="surgery">Show Surgery Patients Only</option>
                </select>
                <select class="filter-select" id="patient-sort" onchange="filterPatients()">
                    <option value="date-desc">Sort by: Newest First</option>
                    <option value="date-asc">Sort by: Oldest First</option>
                    <option value="payment">Sort by: Payment (Pending First)</option>
                    <option value="status">Sort by: Status (Admitted First)</option>
                </select>
            </div>
            
            <div class="patients-table">
                <table>
                    <thead>
                        <tr>
                            <th>Patient ID</th>
                            <th>Name & Guardian</th>
                            <th>Age/Gen</th>
                            <th>Bed No.</th>
                            <th>Admission Date</th>
                            <th>Status</th>
                            <th>${canViewPayments() ? 'Payment Status' : 'Pay Status'}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="patients-table-body">
                        <tr><td colspan="8" style="text-align:center;padding:30px;">Loading patients...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    loadPatients();

    setTimeout(() => {
        // Event Handling (IMPORTANT): Adding proper event listeners
        const els = ['patient-filter', 'payment-filter', 'surgery-filter', 'patient-sort', 'type-filter'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', filterPatients);
            }
        });
        const searchInput = document.getElementById('patient-search');
        if (searchInput) {
            searchInput.addEventListener('keyup', filterPatients);
        }
    }, 100);
}

async function loadPatients() {
    // Step 1: Memory cache check (agar pehle se load hai)
    if (window.allPatientsData && window.allPatientsData.length > 0) {
        renderPatientsTable(window.allPatientsData);
        // Background mein silently fresh data lo
        _fetchPatientsFresh();
        return;
    }

    // Step 2: localStorage cache check (instant render, no spinner)
    const cached = localStorage.getItem('patients');
    if (cached) {
        try {
            const cachedList = JSON.parse(cached);
            if (cachedList.length > 0) {
                window.allPatientsData = cachedList;
                renderPatientsTable(cachedList);
                // Background mein silently update karo
                _fetchPatientsFresh();
                return;
            }
        } catch (e) { /* cache invalid, server se lo */ }
    }

    // Step 3: Pehli baar — server se lo (spinner dikhao)
    showLoading('Loading patients...');
    await _fetchPatientsFresh();
    hideLoading();
}

// Background fetch — silently patients update karta hai bina UI block kiye
async function _fetchPatientsFresh() {
    try {
        const response = await fetch(`${API_BASE}patients?_t=${Date.now()}`, {
            headers: {
                'Authorization': 'Bearer ' + sessionStorage.getItem('token'),
                'Cache-Control': 'no-cache'
            },
            credentials: 'include',
            cache: 'no-store'
        });
        const result = await response.json();

        if (result.success && result.patients) {
            window.allPatientsData = result.patients;
            // Cache update karo
            localStorage.setItem('patients', JSON.stringify(result.patients));
            // Table silently update karo (agar patients module active hai)
            const tbody = document.getElementById('patients-table-body');
            if (tbody) renderPatientsTable(result.patients);
        }
    } catch (error) {
        console.log('Background patient sync failed, using cache.');
    }
}


function renderPatientsTable(patientsList) {
    const tbody = document.getElementById('patients-table-body');
    if (!tbody) return;

    const sortedList = [...patientsList].sort((a, b) =>
        new Date(b.admission_date) - new Date(a.admission_date));

    tbody.innerHTML = sortedList.map((patient, index) => {
        const payStatus = patient.payment_status || 'Pending';
        const guardian = patient.guardian_name || '';
        const pType = patient.patient_type || 'IPD';
        const bedText = pType === 'OPD' ? 'OPD' : (patient.bed_no || 'N/A');
        const isDischarged = (patient.status || '').toLowerCase() === 'discharged';

        let bedDisplay = `<span>${bedText}</span>`;

        const hasSurgery = isSurgeryPatient(patient.patient_id);
        const typeBadge = `<span class="status-badge" style="background:${pType === 'OPD' ? '#ecfdf5; color:#059669; border:1px solid #a7f3d0' : '#eff6ff; color:#2563eb; border:1px solid #bfdbfe'}; font-size:10px; padding:2px 6px; margin-left:6px;">${pType}</span>`;

        return `
        <tr style="animation-delay: ${index * 0.05}s">
            <td>${patient.patient_id}</td>
            <td>
                <strong>${patient.name}</strong> ${typeBadge}
                ${hasSurgery ? '<span class="status-badge" style="background:#e0e7ff; color:#4f46e5; border:1px solid #c7d2fe; font-size:10px; padding:2px 6px; margin-left:6px;">Surgery Done</span>' : ''}
                <br><small style="color:#666">${guardian}</small>
            </td>
            <td>${patient.age}/${patient.gender?.charAt(0) || ''}</td>
            <td>${bedDisplay}</td>
            <td>${new Date(patient.admission_date).toLocaleDateString()}</td>
            <td><span class="status-badge ${(patient.status || '').toLowerCase() === 'discharged' ? 'payment-pending' : 'payment-paid'}">${(patient.status || 'Admitted').toUpperCase()}</span></td>

            <td>
                <span class="status-badge payment-${payStatus.toLowerCase()}">${payStatus}</span>
                ${canViewPayments() && payStatus === 'Pending' && patient.pending_amount ?
                `<br><span style="color:#e67e22;font-size:11px;">${window.currencySymbol || '₹'}${patient.pending_amount} pending</span>` : ''}
            </td>
            <td class="action-buttons-cell">
                <button class="action-btn-pro view-btn" onclick="viewPatient('${patient.patient_id}')" title="View Info"><i class="fas fa-eye"></i></button>
                
                ${(currentUser && (currentUser.role === 'admin' || currentUser.role === 'doctor')) ?
                `<button class="action-btn-pro edit-btn" onclick="editPatient('${patient.patient_id}')" title="${isDischarged ? 'View Details (Discharged)' : 'Edit Patient'}"><i class="${isDischarged ? 'fas fa-info-circle' : 'fas fa-edit'}"></i></button>` : ''}
                
                ${(!isDischarged && pType === 'IPD') ? `<button class="action-btn-pro transfer-btn" onclick="openTransferBedModal('${patient.patient_id}')" title="Transfer Bed"><i class="fas fa-exchange-alt"></i></button>` : ''}
                
                ${(!isDischarged && pType === 'OPD') ? `<button class="action-btn-pro edit-btn" style="background:#6366f1; color:white; border-color:#6366f1;" onclick="convertOpdToIpd('${patient.patient_id}')" title="Admit to IPD (Convert)"><i class="fas fa-bed"></i></button>` : ''}
                
                ${(currentUser && currentUser.role === 'admin') ?
                `<button class="action-btn-pro delete-btn" onclick="deletePatient('${patient.patient_id}')" title="Delete Patient"><i class="fas fa-trash"></i></button>` : ''}
                
                ${(currentUser && currentUser.role !== 'receptionist' && !isDischarged) ?
                `<button class="action-btn-pro notes-btn" onclick="addNoteForPatient('${patient.patient_id}')" title="Daily Notes"><i class="fas fa-notes-medical"></i></button>` : ''}
                
                ${(!isDischarged && pType === 'IPD') ? `<button class="action-btn-pro surgery-btn" onclick="openSurgeryModal('${patient.patient_id}')" title="Add Surgery Event"><i class="fas fa-procedures"></i></button>` : ''}

                
            </td>
        </tr>
    `;
    }).join('');
}

function filterPatients() {
    if (!window.allPatientsData) return;

    const searchVal = (document.getElementById('patient-search')?.value || '').toLowerCase();
    const statusVal = (document.getElementById('patient-filter')?.value || 'all').toLowerCase();
    const typeVal = (document.getElementById('type-filter')?.value || 'all').toLowerCase();
    const paymentVal = (document.getElementById('payment-filter')?.value || 'all').toLowerCase();
    const surgeryVal = (document.getElementById('surgery-filter')?.value || 'all').toLowerCase();
    const sortVal = document.getElementById('patient-sort')?.value || 'date-desc';

    console.log(`[Filter Triggered] Search: '${searchVal}', Status: '${statusVal}', Type: '${typeVal}', Payment: '${paymentVal}', Surgery: '${surgeryVal}'`);

    let filtered = window.allPatientsData.filter(p => {
        const pName = p.name || '';
        const pId = p.patient_id || '';

        // Match Search
        const matchSearch = pName.toLowerCase().includes(searchVal) || pId.toLowerCase().includes(searchVal);

        // Match Admission Status
        const pStatus = (p.status || 'Admitted').toLowerCase();
        const matchStatus = statusVal === 'all' || pStatus === statusVal;

        // Match Patient Type
        const pType = (p.patient_type || 'IPD').toLowerCase();
        const matchType = typeVal === 'all' || pType === typeVal;

        // Match Payment Status
        const pPay = (p.payment_status || 'Pending').toLowerCase();
        const matchPayment = paymentVal === 'all' || pPay === paymentVal;

        // Match Surgery Status
        const matchSurgery = surgeryVal === 'all' || (surgeryVal === 'surgery' && isSurgeryPatient(pId));

        return matchSearch && matchStatus && matchType && matchPayment && matchSurgery;
    });

    console.log(`[Filter Results] Found ${filtered.length} matching patients out of ${window.allPatientsData.length}`);

    // Sorting
    filtered.sort((a, b) => {
        if (sortVal === 'date-desc') return new Date(b.admission_date) - new Date(a.admission_date);
        if (sortVal === 'date-asc') return new Date(a.admission_date) - new Date(b.admission_date);
        if (sortVal === 'payment') {
            const aPay = a.payment_status || 'Pending';
            const bPay = b.payment_status || 'Pending';
            if (aPay === bPay) return new Date(b.admission_date) - new Date(a.admission_date);
            return aPay === 'Pending' ? -1 : 1;
        }
        if (sortVal === 'status') {
            if (a.status === b.status) return new Date(b.admission_date) - new Date(a.admission_date);
            return a.status === 'Admitted' ? -1 : 1;
        }
        return 0;
    });

    // Clear old data and render newly filtered data
    document.getElementById('patients-table-body').innerHTML = '';
    renderPatientsTable(filtered);
}

function searchPatients() {
    filterPatients();
}

function viewPatient(patientId) {
    if (!window.allPatientsData) {
        const stored = JSON.parse(localStorage.getItem('patients') || '[]');
        window.allPatientsData = stored;
    }

    const patient = window.allPatientsData.find(p =>
        String(p.id) === String(patientId) ||
        String(p.patient_id) === String(patientId)
    );

    if (!patient) {
        showNotification('Patient details not found in the list.', 'error');
        return;
    }

    // Default values for robustness
    const name = patient.name || 'Unknown Patient';
    const p_id = patient.patient_id || patient.id || 'N/A';
    const age = patient.age || 'N/A';
    const gender = patient.gender || 'N/A';
    const status = (patient.status || 'Admitted').toUpperCase();
    const isDischarged = status === 'DISCHARGED';
    const guardian = patient.guardian_name || 'Not Provided';
    const bed = patient.bed_no || 'Unassigned';
    const address = patient.address || 'Address not available';
    const problem = patient.problem || 'N/A';
    const doctor = patient.doctor_assigned || 'Unassigned';
    const payStatus = patient.payment_status || 'Pending';
    const surgeries = patient.surgeries || [];

    // Unified Billing Logic
    const totalBill = parseFloat(patient.totalBill || 0);
    const amountDue = parseFloat(patient.pending_amount || 0);

    // Safe Date Parsing
    let admissionDateText = 'N/A';
    try {
        if (patient.admission_date) {
            admissionDateText = new Date(patient.admission_date).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
        }
    } catch (e) { console.error("Date error", e); }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px; padding: 0; border-radius: 15px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.2);">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); padding: 20px 25px; border-bottom: none;">
                <h3 style="color: white; margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-card-text"></i> Patient Overview
                </h3>
                <button class="modal-close" style="color: white; opacity: 0.8;" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 25px; background: #f8fafc; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; align-items: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
                    <div style="width: 65px; height: 65px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 30px; color: #a0aec0; margin-right: 20px;">
                        <i class="bi ${gender.toLowerCase() === 'female' ? 'bi-gender-female' : 'bi-gender-male'}"></i>
                    </div>
                    <div style="flex: 1;">
                        <h2 style="margin: 0 0 5px 0; color: #2d3748; font-size: 22px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                            ${name}
                            <span class="status-badge ${isDischarged ? 'payment-pending' : 'payment-paid'}" style="font-size: 10px; padding: 2px 8px;">
                                ${status}
                            </span>
                        </h2>
                        <div style="color: #718096; font-size: 14px;">
                            <strong>ID:</strong> ${p_id} <span style="margin: 0 8px; opacity: 0.5;">|</span> ${age} Yrs / ${gender}
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: 700; margin-bottom: 8px;">
                            <i class="bi bi-people"></i> Guardian
                        </div>
                        <div style="color: #2d3748; font-weight: 600; font-size: 14px;">${guardian}</div>
                    </div>

                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: 700; margin-bottom: 8px;">
                            <i class="fa-solid fa-bed"></i> Bed Assignment
                        </div>
                        <div style="color: #2d3748; font-weight: 600; font-size: 14px;">${bed}</div>
                    </div>

                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; grid-column: 1 / -1;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: 700; margin-bottom: 8px;">
                            <i class="bi bi-geo-alt"></i> Address
                        </div>
                        <div style="color: #4a5568; font-size: 14px;">${address}</div>
                    </div>

                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; grid-column: 1 / -1;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: 700; margin-bottom: 12px;">
                            <i class="bi bi-activity"></i> Medical Summary
                        </div>
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 15px; font-size: 13px;">
                            <span style="color: #718096;">Condition:</span> <strong>${problem}</strong>
                            <span style="color: #718096;">Doctor:</span> <strong style="color: #3182ce;">${doctor}</strong>
                             <span style="color: #2d3748; font-weight: 600;">${admissionDateText}</span>
                        </div>
                    </div>

                    <!-- Surgery Information -->
                    ${surgeries.length > 0 ? `
                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; grid-column: 1 / -1; border-left: 4px solid #805ad5;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #805ad5; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                            <i class="bi bi-hospital"></i> Surgery History
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${surgeries.map(s => `
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px dotted #e2e8f0; margin-bottom: 12px;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; display:flex; align-items:center; gap:8px;">
                                            <span>${s.surgeryName}</span>
                                            ${s.indoorNo ? `<span style="font-size: 10px; background: #e0e7ff; color: #4f46e5; padding: 2px 6px; border-radius: 4px; border: 1px solid #c7d2fe;">Indoor No: ${s.indoorNo}</span>` : ''}
                                            ${s.wardNo ? `<span style="font-size: 10px; background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a;">Ward No: ${s.wardNo}</span>` : ''}
                                        </div>
                                        <div style="font-size: 12px; color: #4a5568; margin-top: 2px;">Surgeon: <strong>${s.surgeonName}</strong> | Date: <strong>${new Date(s.surgeryDate).toLocaleDateString()}</strong></div>
                                        
                                        ${s.provisional || s.finalDiag ? `
                                            <div style="font-size: 11px; color: #718096; margin-top: 4px;">
                                                ${s.provisional ? `Prov. Diagnosis: <em>${s.provisional}</em>` : ''}
                                                ${s.finalDiag ? ` | Final: <em>${s.finalDiag}</em>` : ''}
                                            </div>
                                        ` : ''}

                                        ${s.witnessName || s.guardianName ? `
                                            <div style="font-size: 11px; color: #4a5568; margin-top: 6px; background: #f8fafc; padding: 6px 10px; border-radius: 4px; display: inline-block;">
                                                ${s.guardianName ? `अभिभावक: <strong>${s.guardianName}</strong>` : ''}
                                                ${s.witnessName ? ` | गवाह: <strong>${s.witnessName}</strong>` : ''}
                                            </div>
                                        ` : ''}

                                        ${s.guardianSignature ? `
                                            <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                                                <span style="font-size: 11px; color: #718096; font-weight: 600;">Guardian Signature Proof:</span>
                                                <img src="${s.guardianSignature}" style="max-height: 45px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #fff;" alt="Sign Proof">
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div style="text-align: right; color: #805ad5; font-weight: 700; font-size: 14px; white-space: nowrap;">
                                        ${canViewPayments() ? `${window.currencySymbol || '₹'}${s.cost}` : '<span style="color:#a0aec0;font-size:12px;">🔒</span>'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Payment Box -->
                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: 700;">Billing Summary</div>
                            ${canViewPayments() ? `<div style="font-size: 12px; color: #718096;">Total Bill: ${window.currencySymbol || '₹'}${totalBill}</div>` : ''}
                            <span class="status-badge payment-${payStatus.toLowerCase()}">${payStatus}</span>
                        </div>
                        ${canViewPayments() && payStatus === 'Pending' ? `
                            <div style="text-align: right;">
                                <div style="font-size: 12px; color: #718096;">Balance Due</div>
                                <div style="color: #e53e3e; font-size: 18px; font-weight: 800;">${window.currencySymbol || '₹'}${amountDue}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div style="padding: 20px 0 0; text-align: center;">
                    <button class="btn" onclick="this.closest('.modal').remove()" style="padding: 10px 30px;">Close Overview</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function editPatient(patientId) {
    const patient = window.allPatientsData?.find(p => String(p.id) === String(patientId) || String(p.patient_id) === String(patientId));
    if (!patient) {
        showNotification('Patient data not found.', 'error');
        return;
    }

    const isReadOnly = (patient.status || '').toLowerCase() === 'discharged';

    const draftStr = sessionStorage.getItem('editPatientDraft');
    let draft = null;
    if (draftStr) {
        try {
            const parsed = JSON.parse(draftStr);
            if (String(parsed.patientId) === String(patientId)) {
                draft = parsed;
            }
        } catch (e) {
            console.error("Error parsing editPatientDraft:", e);
        }
    }

    const pName = draft ? draft.name : patient.name;
    const pGuardian = draft ? draft.guardian_name : (patient.guardian_name || '');
    const pAge = draft ? draft.age : patient.age;
    const pGender = draft ? draft.gender : patient.gender;
    const pMobile = draft ? draft.mobile : (patient.mobile || '');
    const pEmail = draft ? draft.email : (patient.email || '');
    const pAddress = draft ? draft.address : (patient.address || '');
    const pBedNo = draft ? draft.bed_no : (patient.bed_no || '');
    const pWardCharge = draft ? draft.wardChargePerDay : (patient.wardChargePerDay || 0);
    const pWardType = draft ? draft.wardType : (patient.bed_no?.toUpperCase().includes('ICU') ? 'ICU' : 'General');
    const pType = draft ? draft.patient_type : (patient.patient_type || 'IPD');

    if (!isReadOnly) {
        window.currentOpenPatientModal = { type: 'edit', patientId: patientId };
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '3000';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; padding: 0; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.3);">
            <div class="modal-header" style="background: ${isReadOnly ? '#4a5568' : '#2d3748'}; padding: 15px 25px;">
                <h3 style="color: white; margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="bi ${isReadOnly ? 'bi-eye' : 'bi-pencil-square'}"></i> ${isReadOnly ? 'View Patient Details (Discharged)' : 'Edit Patient Details'}
                </h3>
                <button class="modal-close" style="color: white;" onclick="window.closePatientModal(this.closest('.modal'))">&times;</button>
            </div>
            <div style="padding: 25px; background: white; max-height: 80vh; overflow-y: auto;">
                <form id="edit-patient-form" onsubmit="event.preventDefault(); ${isReadOnly ? 'this.closest(\'.modal\').remove()' : `savePatientEdit('${patient.patient_id || patient.id}')`}">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div style="grid-column: span 2;">
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Patient Type</label>
                            <select id="edit-p-type" class="filter-select" style="width:100%;" ${isReadOnly ? 'disabled' : ''} onchange="toggleEditPatientTypeFields()">
                                <option value="IPD" ${pType === 'IPD' ? 'selected' : ''}>IPD (Inpatient Admission)</option>
                                <option value="OPD" ${pType === 'OPD' ? 'selected' : ''}>OPD (Outpatient Consultation)</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Patient Name *</label>
                            <input type="text" id="edit-p-name" value="${pName}" class="search-input" style="width:100%;" ${isReadOnly ? 'disabled' : 'required'}>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Guardian Name</label>
                            <input type="text" id="edit-p-guardian" value="${pGuardian}" class="search-input" style="width:100%;" ${isReadOnly ? 'disabled' : ''}>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Age (Yrs)</label>
                            <input type="number" id="edit-p-age" value="${pAge}" class="search-input" style="width:100%;" ${isReadOnly ? 'disabled' : ''}>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Gender</label>
                            <select id="edit-p-gender" class="filter-select" style="width:100%;" ${isReadOnly ? 'disabled' : ''} onchange="loadAvailableBedsForEdit('${pBedNo}', this.value)">
                                <option value="Male" ${pGender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${pGender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Other" ${pGender === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Mobile / Contact</label>
                            <input type="text" id="edit-p-mobile" value="${pMobile}" class="search-input" style="width:100%;" ${isReadOnly ? 'disabled' : ''}>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Email Address</label>
                            <input type="email" id="edit-p-email" value="${pEmail}" class="search-input" style="width:100%;" placeholder="patient@example.com" ${isReadOnly ? 'disabled' : ''}>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Address</label>
                        <textarea id="edit-p-address" class="search-input" style="width:100%; height:60px; padding:10px;" ${isReadOnly ? 'disabled' : ''}>${pAddress}</textarea>
                    </div>

                    <hr style="border: none; border-top: 1px dashed #e2e8f0; margin: 25px 0;">
                    
                    <div id="edit-bed-details-container" style="background: #edf2f7; padding: 15px; border-radius: 10px; display: ${pType === 'OPD' ? 'none' : 'block'};">
                        <h4 style="margin: 0 0 10px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-bed"></i> Ward / Bed Stay Details
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="display:block; font-size:10px; color:#718096; margin-bottom:3px;">Ward Type</label>
                                <select id="edit-p-ward-type" class="filter-select" style="width:100%; height: 35px;" ${isReadOnly ? 'disabled' : ''}>
                                    <option value="General" ${pWardType === 'General' ? 'selected' : ''}>General Ward</option>
                                    <option value="ICU" ${pWardType === 'ICU' ? 'selected' : ''}>ICU (Intensive Care)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block; font-size:10px; color:#718096; margin-bottom:3px;">Bed Number</label>
                                <select id="edit-p-bed-no" class="filter-select" style="width:100%; height: 35px;" ${isReadOnly ? 'disabled' : ''} onchange="handleEditBedChange(this.value)">
                                    <option value="${pBedNo}">${pBedNo || 'Select Bed'}</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block; font-size:10px; color:#718096; margin-bottom:3px;">Daily Charge (${window.currencySymbol || '₹'})</label>
                                <input type="number" id="edit-p-daily-charge" value="${pWardCharge}" class="search-input" style="width:100%; height: 35px; padding: 5px;" ${isReadOnly ? 'disabled' : ''}>
                            </div>
                        </div>
                    </div>

                    <!-- Surgery Details Section -->
                    ${patient.surgeries && patient.surgeries.length > 0 ? `
                    <div style="background: #f3e8ff; padding: 15px; border-radius: 12px; border: 1px solid #e9d5ff; margin-top: 20px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #7e22ce; display: flex; align-items: center; gap: 8px; font-weight: 700;">
                            <i class="bi bi-hospital"></i> Surgery History
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${patient.surgeries.map(s => `
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 1px dashed #cbd5e1; font-size: 13px;">
                                    <div>
                                        <div style="font-weight: 700; color: #1e293b;">${s.surgeryName}</div>
                                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                                            Surgeon: <strong>${s.surgeonName}</strong> | Date: <strong>${new Date(s.surgeryDate).toLocaleDateString('en-IN')}</strong>
                                        </div>
                                    </div>
                                    <div style="font-weight: 700; color: #7e22ce;">${window.currencySymbol || '₹'}${s.cost}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                        ${isReadOnly ? `
                        <button type="button" class="btn btn-primary" style="padding: 10px 40px; border-radius: 8px; font-weight: 700;" onclick="window.closePatientModal(this.closest('.modal'))">
                            <i class="bi bi-x-circle"></i> Close
                        </button>
                        ` : `
                        <button type="submit" class="btn-primary" style="padding: 10px 40px; border-radius: 8px; font-weight: 700;">
                            <i class="bi bi-floppy"></i> Save All Changes
                        </button>
                        <button type="button" class="btn" style="background:#f1f5f9;" onclick="window.closePatientModal(this.closest('.modal'))">Cancel</button>
                        `}
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (!isReadOnly) {
        loadAvailableBedsForEdit(pBedNo, pGender);
    }
}

function openTransferBedModal(patientId) {
    const patient = window.allPatientsData?.find(p => String(p.id) === String(patientId) || String(p.patient_id) === String(patientId));
    if (!patient) return;

    if ((patient.status || '').toLowerCase() === 'discharged') {
        showNotification('Cannot transfer a discharged patient.', 'warning');
        return;
    }

    const draftStr = sessionStorage.getItem('bedTransferDraft');
    let draft = null;
    if (draftStr) {
        try {
            const parsed = JSON.parse(draftStr);
            if (String(parsed.patientId) === String(patientId)) {
                draft = parsed;
            }
        } catch (e) {
            console.error("Error parsing bedTransferDraft:", e);
        }
    }

    const tBedNo = draft ? draft.new_bed_no : '';
    const tCharge = draft ? draft.new_daily_charge : (patient.wardChargePerDay || 0);

    window.currentOpenPatientModal = { type: 'transfer', patientId: patientId };

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '3000';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.3);">
            <div class="modal-header" style="background: #4b5563; padding: 15px 25px;">
                <h3 style="color: white; margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-arrow-left-right"></i> Transfer Bed
                </h3>
                <button class="modal-close" style="color: white;" onclick="window.closePatientModal(this.closest('.modal'))">&times;</button>
            </div>
            <div style="padding: 25px; background: white;">
                <form id="transfer-bed-form" onsubmit="event.preventDefault(); saveTransferBed('${patient.patient_id || patient.id}')">
                    <div style="margin-bottom: 20px; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 13px; color: #475569; margin-bottom: 5px;"><strong>Patient:</strong> ${patient.name}</div>
                        <div style="font-size: 13px; color: #475569;"><strong>Current Bed:</strong> ${patient.bed_no || 'Unassigned'}</div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Select New Bed</label>
                        <select id="transfer-new-bed" class="filter-select" style="width:100%; height: 35px;" required onchange="handleTransferBedChange(this.value)">
                            <option value="">Loading beds...</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">New Daily Charge (${window.currencySymbol || '₹'})</label>
                        <input type="number" id="transfer-daily-charge" value="${tCharge}" class="search-input" style="width:100%;" required>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button type="submit" class="btn-primary" style="padding: 10px 30px; border-radius: 8px; font-weight: 700; background: #4b5563;">
                            <i class="bi bi-arrow-left-right"></i> Confirm Transfer
                        </button>
                        <button type="button" class="btn" style="background:#f1f5f9;" onclick="window.closePatientModal(this.closest('.modal'))">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Fetch and populate available beds specifically for the transfer select
    fetch(`${API_BASE}patients/available-beds`, {
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
    }).then(res => res.json()).then(result => {
        const select = document.getElementById('transfer-new-bed');
        if (!select) return;
        select.innerHTML = '<option value="" disabled selected>Select New Bed</option>';

        if (result.success && result.beds && result.beds.length > 0) {
            const allBeds = result.beds;
            if (tBedNo && !allBeds.includes(tBedNo)) {
                allBeds.unshift(tBedNo);
            }
            const gender = patient.gender || 'Male';
            const groups = {
                'General Ward (Male)': [],
                'General Ward (Female)': [],
                'ICU Ward': [],
                'Private Room': [],
                'Others': []
            };

            allBeds.forEach(bed => {
                if (bed.startsWith('Male-G')) {
                    if (gender === 'Male' || bed === tBedNo) groups['General Ward (Male)'].push(bed);
                }
                else if (bed.startsWith('Female-G')) {
                    if (gender === 'Female' || bed === tBedNo) groups['General Ward (Female)'].push(bed);
                }
                else if (bed.startsWith('ICU-')) groups['ICU Ward'].push(bed);
                else if (bed.startsWith('Private-')) groups['Private Room'].push(bed);
                else groups['Others'].push(bed);
            });

            for (const [groupName, beds] of Object.entries(groups)) {
                if (beds.length > 0) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = groupName;
                    beds.forEach(bed => {
                        const option = document.createElement('option');
                        option.value = bed;
                        option.textContent = bed;
                        if (bed === tBedNo) option.selected = true;
                        optgroup.appendChild(option);
                    });
                    select.appendChild(optgroup);
                }
            }
        } else {
            select.innerHTML = '<option value="" disabled selected>No beds available</option>';
        }
    }).catch(err => console.error(err));
}

window.handleTransferBedChange = function (bedNo) {
    if (!bedNo) return;
    const settings = window.hospitalSettings || {};
    const isICU = bedNo.toLowerCase().includes('icu');
    const dailyCharge = isICU ? (parseFloat(settings['icu-charge']) || 5000) : (parseFloat(settings['ward-charge']) || 2000);
    const chargeInput = document.getElementById('transfer-daily-charge');
    if (chargeInput) {
        chargeInput.value = dailyCharge;
    }
};

async function saveTransferBed(patientId) {
    const newBed = document.getElementById('transfer-new-bed').value;
    const newCharge = parseFloat(document.getElementById('transfer-daily-charge').value) || 0;

    if (!newBed) {
        showNotification('Please select a new bed', 'error');
        return;
    }

    showLoading('Transferring patient...');
    try {
        const res = await fetch(`${API_BASE}patients/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify({
                patient_id: patientId,
                new_bed_no: newBed,
                new_daily_charge: newCharge
            })
        });
        const result = await res.json();
        hideLoading();

        if (result.success) {
            showNotification('Patient successfully transferred to new bed.', 'success');
            sessionStorage.removeItem('bedTransferDraft');
            window.currentOpenPatientModal = null;
            document.querySelector('#transfer-bed-form').closest('.modal').remove();
            loadPatients(); // Refresh the list
        } else {
            showNotification(result.message || 'Failed to transfer patient', 'error');
        }
    } catch (err) {
        console.error("Transfer Error Details:", err);
        console.log("Attempted URL:", `${API_BASE}patients/${patientId}/transfer-bed`);
        hideLoading();
        showNotification('Network error while transferring patient', 'error');
    }
}

window.handleEditBedChange = function (bedNo) {
    if (!bedNo) return;
    const settings = window.hospitalSettings || {};
    const isICU = bedNo.toLowerCase().includes('icu');
    const dailyCharge = isICU ? (parseFloat(settings['icu-charge']) || 5000) : (parseFloat(settings['ward-charge']) || 2000);
    const chargeInput = document.getElementById('edit-p-daily-charge');
    if (chargeInput) {
        chargeInput.value = dailyCharge;
    }
};

async function loadAvailableBedsForEdit(currentBed, gender) {
    const bedSelect = document.getElementById('edit-p-bed-no');
    if (!bedSelect) return;

    try {
        const response = await fetch(`${API_BASE}patients/available-beds`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();

        if (result.success) {
            const allBeds = result.beds || [];
            if (currentBed && !allBeds.includes(currentBed)) {
                allBeds.unshift(currentBed);
            }

            bedSelect.innerHTML = '';
            if (allBeds.length === 0 && !currentBed) {
                bedSelect.innerHTML = '<option value="" disabled>No beds available</option>';
                return;
            }

            const groups = {
                'General Ward (Male)': [],
                'General Ward (Female)': [],
                'ICU Ward': [],
                'Private Room': [],
                'Others': []
            };

            allBeds.forEach(bed => {
                if (bed.startsWith('Male-G')) {
                    if (gender === 'Male' || bed === currentBed) groups['General Ward (Male)'].push(bed);
                }
                else if (bed.startsWith('Female-G')) {
                    if (gender === 'Female' || bed === currentBed) groups['General Ward (Female)'].push(bed);
                }
                else if (bed.startsWith('ICU-')) groups['ICU Ward'].push(bed);
                else if (bed.startsWith('Private-')) groups['Private Room'].push(bed);
                else groups['Others'].push(bed);
            });

            for (const [groupName, beds] of Object.entries(groups)) {
                if (beds.length > 0) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = groupName;
                    beds.forEach(bed => {
                        const option = document.createElement('option');
                        option.value = bed;
                        option.textContent = bed;
                        if (bed === currentBed) option.selected = true;
                        optgroup.appendChild(option);
                    });
                    bedSelect.appendChild(optgroup);
                }
            }
        }
    } catch (error) {
        console.error('Error loading available beds:', error);
    }
}

function deletePatient(patientId) {
    if (currentUser?.role !== 'admin') {
        showNotification('Access Denied. Only Admin can delete patients.', 'error');
        return;
    }

    const patient = window.allPatientsData?.find(p => String(p.patient_id) === String(patientId) || String(p.id) === String(patientId));
    const patientName = patient?.name || patientId;

    // Remove any existing delete modal
    document.getElementById('delete-confirm-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-confirm-modal';
    modal.innerHTML = `
        <style>
            .delete-modal-overlay {
                position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center; z-index: 10000;
                animation: deleteModalFadeIn 0.25s ease;
            }
            @keyframes deleteModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes deleteModalSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes deleteShake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
            .delete-modal-box {
                background: #fff; border-radius: 16px; width: 420px; max-width: 92vw;
                box-shadow: 0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
                animation: deleteModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                overflow: hidden; position: relative; z-index: 10001;
            }
            .delete-modal-header {
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                padding: 28px 28px 20px; text-align: center;
                border-bottom: 1px solid #fecaca;
            }
            .delete-modal-icon {
                width: 64px; height: 64px; border-radius: 50%;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 16px; box-shadow: 0 8px 20px rgba(239,68,68,0.35);
                animation: deleteShake 0.5s ease 0.3s;
            }
            .delete-modal-icon i { font-size: 28px; color: #fff; }
            .delete-modal-header h3 { margin: 0 0 6px; font-size: 20px; color: #991b1b; font-weight: 700; }
            .delete-modal-header p { margin: 0; font-size: 13px; color: #b91c1c; opacity: 0.8; }
            .delete-modal-body { padding: 24px 28px; }
            .delete-patient-info {
                background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
                padding: 14px 16px; margin-bottom: 18px; display: flex; align-items: center; gap: 12px;
            }
            .del-avatar {
                width: 42px !important; height: 42px !important; border-radius: 50% !important;
                background: linear-gradient(135deg, #e0e7ff, #c7d2fe) !important; color: #4f46e5 !important;
                display: flex !important; align-items: center !important; justify-content: center !important;
                font-weight: 700 !important; font-size: 16px !important; flex-shrink: 0 !important;
                border: none !important; padding: 0 !important; margin: 0 !important;
                box-shadow: none !important;
            }
            .delete-patient-info .details { flex: 1; }
            .delete-patient-info .details .name { font-weight: 600; color: #1e293b; font-size: 14px; }
            .delete-patient-info .details .id { font-size: 12px; color: #64748b; margin-top: 2px; }
            .delete-warning-text {
                font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 18px;
            }
            .delete-warning-text strong { color: #dc2626; }
            .delete-step2-area { display: none; }
            #delete-confirm-input {
                width: 100% !important; padding: 12px 14px !important; border: 2px solid #e2e8f0 !important;
                border-radius: 10px !important; font-size: 14px !important; font-weight: 600 !important;
                text-align: center !important; letter-spacing: 3px !important;
                color: #1e293b !important; outline: none !important;
                transition: border-color 0.2s !important;
                font-family: 'Courier New', monospace !important;
                box-sizing: border-box !important; pointer-events: auto !important;
                position: relative !important; z-index: 10002 !important;
                -webkit-user-select: text !important; user-select: text !important;
                background: #fff !important; cursor: text !important;
            }
            #delete-confirm-input:focus { border-color: #ef4444 !important; }
            #delete-confirm-input.matched { border-color: #ef4444 !important; background: #fef2f2 !important; }
            .delete-type-label {
                font-size: 12px; color: #64748b; text-align: center;
                margin-bottom: 10px; font-weight: 500;
            }
            .delete-type-label code {
                background: #fee2e2; color: #dc2626; padding: 2px 8px;
                border-radius: 4px; font-weight: 700; font-size: 13px;
            }
            .delete-modal-footer {
                padding: 0 28px 24px; display: flex; gap: 10px;
            }
            .delete-btn-cancel {
                flex: 1; padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;
                border-radius: 10px; font-size: 14px; font-weight: 600; color: #475569;
                cursor: pointer; transition: all 0.2s;
            }
            .delete-btn-cancel:hover { background: #e2e8f0; }
            .delete-btn-proceed {
                flex: 1; padding: 12px; border: none;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                border-radius: 10px; font-size: 14px; font-weight: 600; color: #fff;
                cursor: pointer; transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(239,68,68,0.3);
            }
            .delete-btn-proceed:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(239,68,68,0.4); }
            .delete-btn-proceed:disabled {
                opacity: 0.4; cursor: not-allowed; transform: none;
                box-shadow: none;
            }
            .delete-step-indicator {
                display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;
            }
            .delete-step-dot {
                width: 8px; height: 8px; border-radius: 50%; background: #e2e8f0; transition: all 0.3s;
            }
            .delete-step-dot.active { background: #ef4444; width: 24px; border-radius: 4px; }
        </style>

        <div class="delete-modal-overlay" id="delete-overlay-bg">
            <div class="delete-modal-box" onclick="event.stopPropagation()">
                <div class="delete-modal-header">
                    <div class="delete-modal-icon"><i class="bi bi-exclamation-triangle"></i></div>
                    <h3 id="delete-modal-title">Delete Patient Record</h3>
                    <p id="delete-modal-subtitle">This action cannot be undone</p>
                </div>

                <div class="delete-modal-body">
                    <div class="delete-step-indicator">
                        <div class="delete-step-dot active" id="del-dot-1"></div>
                        <div class="delete-step-dot" id="del-dot-2"></div>
                    </div>

                    <!-- STEP 1 -->
                    <div id="delete-step1">
                        <div class="delete-patient-info">
                            <div class="del-avatar">${(patientName.charAt(0) || 'P').toUpperCase()}</div>
                            <div class="details">
                                <div class="name">${patientName}</div>
                                <div class="id">ID: ${patientId}</div>
                            </div>
                        </div>
                        <div class="delete-warning-text">
                            You are about to <strong>permanently delete</strong> this patient and all associated records including billing, notes, and medical history.
                            <br><br>
                            Are you sure you want to proceed?
                        </div>
                    </div>

                    <!-- STEP 2 -->
                    <div id="delete-step2" class="delete-step2-area">
                        <div class="delete-warning-text" style="text-align:center; margin-bottom:14px;">
                            ⚠️ <strong>Final Confirmation Required</strong><br>
                            Type <code style="background:#fee2e2; color:#dc2626; padding:2px 6px; border-radius:4px; font-weight:700;">DELETE</code> below to confirm permanent deletion.
                        </div>
                        <div class="delete-type-label">Type <code>DELETE</code> to confirm</div>
                        <input type="text" id="delete-confirm-input" placeholder="Type here..." autocomplete="off" spellcheck="false">
                    </div>
                </div>

                <div class="delete-modal-footer">
                    <button class="delete-btn-cancel" onclick="document.getElementById('delete-confirm-modal').remove(); window._deleteStep=1;">
                        <i class="bi bi-x-lg" style="margin-right:6px;"></i>Cancel
                    </button>
                    <button class="delete-btn-proceed" id="delete-proceed-btn" onclick="handleDeleteStep('${patientId}')">
                        <i class="bi bi-arrow-right" style="margin-right:6px;"></i>Yes, Proceed
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close on overlay background click only
    document.getElementById('delete-overlay-bg').addEventListener('mousedown', function (e) {
        if (e.target === this) {
            window._deleteStep = 1;
            document.getElementById('delete-confirm-modal')?.remove();
        }
    });
}

// Track delete step state
window._deleteStep = 1;

function handleDeleteStep(patientId) {
    if (window._deleteStep === 1) {
        // Move to step 2
        window._deleteStep = 2;
        document.getElementById('delete-step1').style.display = 'none';
        document.getElementById('delete-step2').style.display = 'block';
        document.getElementById('del-dot-1').classList.remove('active');
        document.getElementById('del-dot-2').classList.add('active');
        document.getElementById('delete-modal-title').textContent = 'Final Confirmation';
        document.getElementById('delete-modal-subtitle').textContent = 'Type DELETE to permanently remove this record';

        const proceedBtn = document.getElementById('delete-proceed-btn');
        proceedBtn.disabled = true;
        proceedBtn.innerHTML = '<i class="bi bi-trash" style="margin-right:6px;"></i>Delete Permanently';

        const input = document.getElementById('delete-confirm-input');
        input.focus();
        input.addEventListener('input', function () {
            const match = this.value.trim().toUpperCase() === 'DELETE';
            proceedBtn.disabled = !match;
            this.classList.toggle('matched', match);
        });

        window._deleteStep = 2;
    } else if (window._deleteStep === 2) {
        // Actually delete
        window._deleteStep = 1;
        document.getElementById('delete-confirm-modal')?.remove();

        showLoading('Deleting patient...');
        fetch(`${API_BASE}patients/${patientId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        })
            .then(res => res.json())
            .then(result => {
                hideLoading();
                if (result.success) {
                    showNotification('Patient successfully deleted from records.', 'success');
                    loadPatients();
                } else {
                    showNotification(result.message || 'Failed to delete patient', 'error');
                }
            })
            .catch(err => {
                hideLoading();
                console.error(err);
                showNotification('Network error while deleting patient', 'error');
            });
    }
}

function addNoteForPatient(patientId) {
    const patient = window.allPatientsData?.find(p => String(p.id) === String(patientId) || String(p.patient_id) === String(patientId));
    if (!patient) return;

    showModule('daily-notes');
    setTimeout(() => {
        if (typeof selectPatientForRegister === 'function') {
            selectPatientForRegister(patient.patient_id || patient.id, patient.name.replace(/'/g, "\\'"));
        }
    }, 300);
}

function markPatientPaid(patientId) {
    if (confirm('Mark this patient as paid?')) {
        let patients = JSON.parse(localStorage.getItem('patients') || '[]');
        patients.forEach(p => {
            if (String(p.patient_id) === String(patientId) || String(p.id) === String(patientId)) {
                p.payment_status = 'Paid';
                p.pending_amount = 0;
            }
        });
        localStorage.setItem('patients', JSON.stringify(patients));
        if (window.allPatientsData) {
            window.allPatientsData.forEach(p => {
                if (String(p.patient_id) === String(patientId) || String(p.id) === String(patientId)) {
                    p.payment_status = 'Paid';
                    p.pending_amount = 0;
                }
            });
        }
        showNotification('Patient marked as paid', 'success');
        filterPatients();
        if (typeof loadBillingData === 'function') loadBillingData();
    }
}

// ==================== SURGERY MODULE LOGIC ====================
function isSurgeryPatient(patientId) {
    const patientObj = window.allPatientsData?.find(p => String(p.patient_id) === String(patientId) || String(p.id) === String(patientId));
    return patientObj && patientObj.surgeries && patientObj.surgeries.length > 0;
}

window.handleSurgerySignatureUpload = function (input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Limit maximum dimensions to 1000px for performance and size
                const maxDim = 1000;
                let width = img.width;
                let height = img.height;
                
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG with 0.7 quality (typically reduces size by 90-95%)
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                const imgEl = document.getElementById('surgery-sig-preview-img');
                const placeholder = document.getElementById('surgery-sig-placeholder');
                if (imgEl && placeholder) {
                    imgEl.src = compressedDataUrl;
                    imgEl.style.display = 'block';
                    placeholder.style.display = 'none';
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

function openSurgeryModal(patientId) {
    const patientObj = window.allPatientsData?.find(p => String(p.patient_id) === String(patientId));
    const records = JSON.parse(localStorage.getItem('patient_records') || '{}');
    const savedRecord = records[patientId] || {};

    const draftStr = sessionStorage.getItem('surgeryDraft');
    let draft = null;
    if (draftStr) {
        try {
            const parsed = JSON.parse(draftStr);
            if (String(parsed.patientId) === String(patientId)) {
                draft = parsed;
            }
        } catch (e) {
            console.error("Error parsing surgeryDraft:", e);
        }
    }

    const sName = draft ? draft.surgeryName : '';
    const sSurgeon = draft ? draft.surgeonName : '';
    const sDate = draft ? draft.surgeryDate : new Date().toISOString().split('T')[0];
    const sCost = draft ? draft.cost : '';
    const sIndoorNo = draft ? draft.indoorNo : (savedRecord.indoor_no || '');
    const sWardNo = draft ? draft.wardNo : (savedRecord.ward_no || '');
    const sProvisional = draft ? draft.provisional : (savedRecord.provisional || '');
    const sFinal = draft ? draft.finalDiag : (savedRecord.final || '');
    
    const sWitnessName = draft ? draft.witnessName : '';
    const sWitnessAddress = draft ? draft.witnessAddress : '';
    const sWitnessDate = draft ? draft.witnessDate : new Date().toISOString().split('T')[0];
    const sWitnessPlace = draft ? draft.witnessPlace : '';
    
    const sGuardianName = draft ? draft.guardianName : '';
    const sGuardianAddress = draft ? draft.guardianAddress : '';
    const sGuardianDate = draft ? draft.guardianDate : new Date().toISOString().split('T')[0];
    const sGuardianPlace = draft ? draft.guardianPlace : '';
    const sSignature = draft ? draft.guardianSignature : '';

    window.currentOpenPatientModal = { type: 'surgery', patientId: patientId };

    const modal = document.createElement('div');
    modal.className = 'modal surgery-modal';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1050';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; width: 95%; max-height: 90vh; overflow-y: auto; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid #cbd5e1;">
            <div class="modal-header" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px 24px;">
                <h3 style="margin: 0; font-size: 18px; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <i class="bi bi-hospital" style="color:#805ad5;"></i> Add Surgery Event & Operation Consent
                </h3>
                <button class="modal-close" style="font-size: 24px; color: #94a3b8; background: none; border: none; cursor: pointer;" onclick="window.closePatientModal(this.closest('.modal'))">&times;</button>
            </div>
            <div style="padding: 24px;">
                <p style="margin-top:0; color:#475569; font-size:14px; margin-bottom:20px; padding: 10px 14px; background: #f1f5f9; border-radius: 6px; border-left: 4px solid #6366f1;">
                    <i class="bi bi-person-circle"></i> Recording surgery for patient: <strong style="color: #0f172a;">${patientObj ? patientObj.name : patientId}</strong>
                </p>

                <!-- SECTION 1: SURGERY & DIAGNOSIS DETAILS -->
                <h4 style="margin: 0 0 12px 0; font-size: 13px; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; font-weight:700;">
                    <i class="bi bi-file-earmark-medical"></i> Surgery & Diagnosis Information
                </h4>
                <div class="surgery-form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Surgery Name / Procedure *</label>
                        <input type="text" id="surgery-name" value="${sName}" placeholder="Appendectomy" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:4px; font-size:14px; box-sizing:border-box; outline:none; background:#fff;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Surgeon Name *</label>
                        <input type="text" id="surgeon-name" value="${sSurgeon}" placeholder="Dr. Bhoopendra Chaudhary" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:4px; font-size:14px; box-sizing:border-box; outline:none; background:#fff;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Surgery Date *</label>
                        <input type="date" id="surgery-date" value="${sDate}" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:4px; font-size:14px; box-sizing:border-box; outline:none; background:#fff;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Surgery Base Charges (${window.currencySymbol || '₹'}) *</label>
                        <input type="number" id="surgery-cost" value="${sCost}" placeholder="0" min="0" onfocus="this.select()" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:4px; font-size:14px; box-sizing:border-box; outline:none; background:#fff;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">INDOOR No. (IPD No.) <span style="font-weight: normal; color: #94a3b8;">(Optional)</span></label>
                        <input type="text" id="surgery-indoor-no" placeholder="Indoor No. (Optional)" value="${sIndoorNo}" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:4px; font-size:14px; box-sizing:border-box; outline:none; background:#fff;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">WARD No. <span style="font-weight: normal; color: #94a3b8;">(Optional)</span></label>
                        <input type="text" id="surgery-ward-no" placeholder="Ward No. (Optional)" value="${sWardNo}" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:4px; font-size:14px; box-sizing:border-box; outline:none; background:#fff;">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Provisional Diagnosis <span style="font-weight: normal; color: #94a3b8;">(Optional)</span></label>
                        <input type="text" id="surgery-provisional" placeholder="Provisional Diagnosis (Optional)" value="${sProvisional}" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:4px; font-size:14px; box-sizing:border-box; outline:none; background:#fff;">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Final Diagnosis <span style="font-weight: normal; color: #94a3b8;">(Optional)</span></label>
                        <input type="text" id="surgery-final" placeholder="Final Diagnosis (Optional)" value="${sFinal}" style="width:100%; padding:10px 12px; border:1px solid #94a3b8; border-radius:4px; font-size:14px; box-sizing:border-box; outline:none; background:#fff;">
                    </div>
                </div>

                <!-- SECTION 2: HINDI CONSENT WARNING CALLOUT -->
                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 8px; font-size: 14px; color: #b45309; line-height: 1.6; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-weight:700;">
                        <i class="bi bi-heart-pulse" style="font-size:16px;"></i> 
                        <span>शल्य चिकित्सा एवं निश्चेतक हेतु सहमति (Operation Consent Form)</span>
                    </div>
                    मैं एतद्द्वारा अपने रोगी के किसी प्रकार के नैदानिक परीक्षण, उपचार एवं तद हेतु आवश्यक शल्य क्रिया व निश्चेतक औषधियों के प्रयोग की अनुमति देता / देती हूँ। मुझे इसके सभी संभावित परिणामों से अवगत करा दिया गया है।
                </div>

                <!-- SECTION 3: WITNESS AND GUARDIAN SIDE-BY-SIDE -->
                <div class="surgery-consent-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    
                    <!-- WITNESS COLUMN -->
                    <div style="background: #f8fafc; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h5 style="margin: 0 0 12px 0; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; display:flex; align-items:center; gap:6px; border-bottom:1px solid #cbd5e1; padding-bottom:6px; font-weight:700;">
                            <i class="bi bi-person-lock"></i> साक्षी गवाह (Witness Details)
                        </h5>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <div>
                                <label style="display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">गवाह का नाम (Witness Name)</label>
                                <input type="text" id="surgery-witness-name" value="${sWitnessName}" autocomplete="off" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;">
                            </div>
                            <div>
                                <label style="display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">वर्तमान पता (Address)</label>
                                <input type="text" id="surgery-witness-address" value="${sWitnessAddress}" autocomplete="off" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;">
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">दिनांक (Date)</label>
                                    <input type="date" id="surgery-witness-date" value="${sWitnessDate}" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">स्थान (Place)</label>
                                    <input type="text" id="surgery-witness-place" value="${sWitnessPlace}" placeholder="" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- GUARDIAN COLUMN -->
                    <div style="background: #f8fafc; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h5 style="margin: 0 0 12px 0; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; display:flex; align-items:center; gap:6px; border-bottom:1px solid #cbd5e1; padding-bottom:6px; font-weight:700;">
                            <i class="bi bi-pencil"></i> रोगी से संबंधित हस्ताक्षरकर्ता (Guardian Details)
                        </h5>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <div>
                                <label style="display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">अभिभावक का नाम (Guardian Name)</label>
                                <input type="text" id="surgery-guardian-name" value="${sGuardianName}" autocomplete="off" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;">
                            </div>
                            <div>
                                <label style="display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">वर्तमान पता (Address)</label>
                                <input type="text" id="surgery-guardian-address" value="${sGuardianAddress}" autocomplete="off" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;">
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">दिनांक (Date)</label>
                                    <input type="date" id="surgery-guardian-date" value="${sGuardianDate}" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">स्थान (Place)</label>
                                    <input type="text" id="surgery-guardian-place" value="${sGuardianPlace}" placeholder="" style="width:100%; padding:8px 10px; border:1px solid #94a3b8; border-radius:4px; font-size:13px; box-sizing:border-box; outline:none; background:#fff;">
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                <!-- SECTION 4: SIGNATURE UPLOAD & WEBCAM CAPTURE SIDE-BY-SIDE -->
                <h4 style="margin: 0 0 12px 0; font-size: 13px; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; font-weight:700;">
                    <i class="bi bi-pencil"></i> Patient Signature Proof
                </h4>
                <div class="surgery-signature-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; align-items: start;">
                    
                    <!-- UPLOAD & WEBCAM TRIGGERS -->
                    <div style="background: #f8fafc; padding: 16px; border: 1px dashed #94a3b8; border-radius: 8px; text-align: center;">
                        <div style="margin-bottom: 12px;">
                            <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px; text-align:left;">Method 1: Upload Image (Gallery / Native Camera)</label>
                            <input type="file" id="surgery-sig-upload" accept="image/*" onchange="handleSurgerySignatureUpload(this)" style="font-size: 12px; width: 100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; background:#fff;">
                        </div>
                        <div style="margin: 10px 0; font-size: 12px; font-weight: 700; color: #64748b;">— OR —</div>
                        <div style="text-align: center;">
                            <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px; text-align:left;">Method 2: Take Instant Photo via Web Camera</label>
                            <button id="btn-surgery-camera" class="btn" style="background:#4f46e5; color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.15);" onclick="window.startSurgeryCamera()">
                                <i class="bi bi-camera"></i> 📷 Open Camera (कैमरा खोलें)
                            </button>
                            <button id="btn-surgery-snap" class="btn" style="display:none; background:#10b981; color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px; align-items:center; gap:6px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.15);" onclick="window.snapSurgeryPhoto()">
                                <i class="bi bi-camera-fill"></i> 📸 Snap Photo (फ़ोटो खींचें)
                            </button>
                        </div>
                        <div style="margin-top: 10px;">
                            <div id="surgery-camera-error" style="display:none; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:10px 12px; font-size:12px; color:#dc2626; text-align:left; margin-bottom:8px;">
                                <i class="bi bi-exclamation-circle"></i> <span id="surgery-camera-error-msg">Camera access denied.</span><br>
                                <small style="color:#991b1b;">Please use 'Method 1' above to select an existing photo of the signature from your gallery, or to take a photo using your native camera.</small>
                            </div>
                            <video id="surgery-camera" autoplay playsinline muted style="display:none; width: 100%; max-height: 180px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;"></video>
                            <canvas id="surgery-canvas" style="display:none;"></canvas>
                        </div>
                    </div>

                    <!-- PREVIEW BOX -->
                    <div style="background: #ffffff; padding: 12px; border: 1px solid #94a3b8; border-radius: 8px; text-align: center; height: 185px; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; overflow: hidden;">
                        <img id="surgery-sig-preview-img" src="${sSignature || ''}" style="max-height: 100%; max-width: 100%; display: ${sSignature ? 'block' : 'none'}; object-fit: contain;">
                        <div id="surgery-sig-placeholder" style="color: #94a3b8; display:${sSignature ? 'none' : 'flex'}; flex-direction:column; align-items:center; gap:8px;">
                            <i class="bi bi-file-earmark-ruled" style="font-size:32px;"></i>
                            <span style="font-style: italic; font-size: 13px;">Signature Preview<br>(हस्ताक्षर का लाइव प्रीव्यू)</span>
                        </div>
                    </div>

                </div>                <!-- ACTIONS BUTTONS -->
                <div class="surgery-actions" style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid #e2e8f0; padding-top:16px; margin-top:20px;">
                    <button class="btn" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:600; font-size:14px; transition:all 0.2s;" onclick="window.closePatientModal(this.closest('.modal'))">Cancel</button>
                    <button class="btn btn-primary" style="background:linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color:#fff; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:600; font-size:14px; transition:all 0.2s; box-shadow:0 4px 12px var(--primary-light);" onclick="saveSurgery('${patientId}', this)">Confirm Surgery Event</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('surgery-name').focus();

    let localStream = null;
    window.startSurgeryCamera = async function () {
        const video = document.getElementById('surgery-camera');
        const snapBtn = document.getElementById('btn-surgery-snap');
        const startBtn = document.getElementById('btn-surgery-camera');
        const errorDiv = document.getElementById('surgery-camera-error');
        const errorMsg = document.getElementById('surgery-camera-error-msg');

        // Hide previous errors
        if (errorDiv) errorDiv.style.display = 'none';

        // Check for HTTPS / secure context
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (errorDiv && errorMsg) {
                errorMsg.textContent = 'Webcam stream requires HTTPS. Opening native camera instead...';
                errorDiv.style.display = 'block';
            }
            // Fallback: Trigger native file click (opens camera on mobile)
            const fileInput = document.getElementById('surgery-sig-upload');
            if (fileInput) {
                fileInput.click();
            }
            return;
        }

        const showCameraError = (message) => {
            if (errorDiv && errorMsg) {
                errorMsg.textContent = message;
                errorDiv.style.display = 'block';
            }
            startBtn.style.display = 'inline-flex';
            snapBtn.style.display = 'none';
            video.style.display = 'none';
        };

        const startVideo = (stream) => {
            localStream = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            snapBtn.style.display = 'inline-flex';
            startBtn.style.display = 'none';
            if (errorDiv) errorDiv.style.display = 'none';
        };

        try {
            // Try rear camera first (mobile)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            startVideo(stream);
        } catch (err) {
            console.warn('Rear camera failed:', err.name, err.message);
            try {
                // Fallback: any available camera
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
                startVideo(fallbackStream);
            } catch (fallbackErr) {
                console.error('Camera access failed:', fallbackErr.name, fallbackErr.message);
                if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
                    showCameraError('Camera permission denied. Opening native camera...');
                } else if (fallbackErr.name === 'NotFoundError') {
                    showCameraError('No camera detected. Opening native camera...');
                } else if (fallbackErr.name === 'NotReadableError') {
                    showCameraError('Camera is in use by another app. Opening native camera...');
                } else {
                    showCameraError('Camera failed: ' + (fallbackErr.message || fallbackErr.name) + '. Opening native camera...');
                }

                // Fallback: Trigger native file click (opens camera on mobile)
                const fileInput = document.getElementById('surgery-sig-upload');
                if (fileInput) {
                    fileInput.click();
                }
            }
        }
    };

    window.snapSurgeryPhoto = function () {
        const video = document.getElementById('surgery-camera');
        const canvas = document.getElementById('surgery-canvas');
        const previewImg = document.getElementById('surgery-sig-preview-img');
        const placeholder = document.getElementById('surgery-sig-placeholder');
        const snapBtn = document.getElementById('btn-surgery-snap');
        const startBtn = document.getElementById('btn-surgery-camera');

        if (video && canvas && previewImg) {
            const ctx = canvas.getContext('2d');
            
            // Limit snap dimensions as well (max 1000px)
            const maxDim = 1000;
            let width = video.videoWidth || 640;
            let height = video.videoHeight || 480;
            
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            previewImg.src = dataUrl;
            previewImg.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            window.stopSurgeryCameraStream();
            video.style.display = 'none';
            snapBtn.style.display = 'none';
            startBtn.style.display = 'inline-flex';
        }
    };

    window.stopSurgeryCameraStream = function () {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
    };
}

async function saveSurgery(patientId, btnEl) {
    const name = document.getElementById('surgery-name').value.trim();
    const surgeon = document.getElementById('surgeon-name').value.trim();
    const date = document.getElementById('surgery-date').value;
    const cost = parseFloat(document.getElementById('surgery-cost').value) || 0;
    const signature = document.getElementById('surgery-sig-preview-img')?.src || '';

    // Consent Form Details
    const indoorNo = document.getElementById('surgery-indoor-no').value.trim();
    const wardNo = document.getElementById('surgery-ward-no').value.trim();
    const provisional = document.getElementById('surgery-provisional').value.trim();
    const finalDiag = document.getElementById('surgery-final').value.trim();

    const witnessName = document.getElementById('surgery-witness-name').value.trim();
    const witnessAddress = document.getElementById('surgery-witness-address').value.trim();
    const witnessDate = document.getElementById('surgery-witness-date').value;
    const witnessPlace = document.getElementById('surgery-witness-place').value.trim();

    const guardianName = document.getElementById('surgery-guardian-name').value.trim();
    const guardianAddress = document.getElementById('surgery-guardian-address').value.trim();
    const guardianDate = document.getElementById('surgery-guardian-date').value;
    const guardianPlace = document.getElementById('surgery-guardian-place').value.trim();

    if (!name || !surgeon || !date) {
        showNotification('Please provide mandatory details (Name, Surgeon, Date).', 'error');
        return;
    }

    const surgeryData = {
        id: Date.now(),
        surgeryName: name,
        surgeonName: surgeon,
        surgeryDate: date,
        cost: cost,
        guardianSignature: signature,
        paid: false,

        // Consent & Witnesses Meta
        indoorNo,
        wardNo,
        provisional,
        finalDiag,
        witnessName,
        witnessAddress,
        witnessDate,
        witnessPlace,
        guardianName,
        guardianAddress,
        guardianDate,
        guardianPlace
    };

    // Save to patient_records local storage to sync back to the In-Patient Record Sheet!
    const records = JSON.parse(localStorage.getItem('patient_records') || '{}');
    records[patientId] = {
        ...(records[patientId] || {}),
        indoor_no: indoorNo,
        ward_no: wardNo,
        provisional: provisional,
        final: finalDiag
    };
    localStorage.setItem('patient_records', JSON.stringify(records));

    showLoading('Updating surgery details in Cloud...');
    try {
        const pRes = await fetch(`${API_BASE}patients/${patientId}`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const pData = await pRes.json();
        const p = pData.patient;

        if (!p) {
            showNotification('Patient not found!', 'error');
            hideLoading();
            return;
        }

        const updatedSurgeries = [...(p.surgeries || []), surgeryData];
        const updatedSurgeonCharges = (parseFloat(p.surgeonCharges) || 0) + cost;
        const updatedTotalBill = (parseFloat(p.totalBill) || 0) + cost;
        const updatedPendingAmount = (parseFloat(p.pending_amount) || 0) + cost;

        const updateRes = await fetch(`${API_BASE}patients/${patientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify({
                surgeries: updatedSurgeries,
                surgeonCharges: updatedSurgeonCharges,
                totalBill: updatedTotalBill,
                pending_amount: updatedPendingAmount
            })
        });

        const result = await updateRes.json();
        hideLoading();

        if (result.success) {
            showNotification('Surgery details and bill updated in Cloud!', 'success');
            sessionStorage.removeItem('surgeryDraft');
            window.currentOpenPatientModal = null;
            btnEl.closest('.modal').remove();
            loadPatients();
        } else {
            showNotification(result.message || 'Failed to update surgery', 'error');
        }
        return; // Exit here since we handled it
        return;
    } catch (err) {
        hideLoading();
        console.error(err);
        showNotification('Network error while updating surgery', 'error');
        return;
    }
}

async function savePatientEdit(patientId) {
    const patientObj = window.allPatientsData?.find(p => String(p.patient_id) === String(patientId) || String(p.id) === String(patientId));
    if (patientObj && (patientObj.status || '').toLowerCase() === 'discharged') {
        showNotification('Cannot edit details of a discharged patient.', 'error');
        return;
    }

    const patient_type = document.getElementById('edit-p-type')?.value || 'IPD';
    const name = document.getElementById('edit-p-name').value.trim();
    const guardian = document.getElementById('edit-p-guardian').value.trim();
    const age = document.getElementById('edit-p-age').value;
    const gender = document.getElementById('edit-p-gender').value;
    const mobile = document.getElementById('edit-p-mobile').value.trim();
    const email = document.getElementById('edit-p-email').value.trim() || null;
    const address = document.getElementById('edit-p-address').value.trim();
    const wardType = patient_type === 'IPD' ? document.getElementById('edit-p-ward-type').value : 'General';
    const bedNo = patient_type === 'IPD' ? document.getElementById('edit-p-bed-no').value.trim() : null;

    const dailyCharge = patient_type === 'IPD' ? (parseFloat(document.getElementById('edit-p-daily-charge')?.value) || 0) : 0;

    const editData = {
        name, guardian_name: guardian, age: parseInt(age),
        gender, mobile, email, address, bed_no: bedNo,
        wardChargePerDay: dailyCharge,
        patient_type
    };

    showLoading('Saving changes...');
    try {
        const response = await fetch(`${API_BASE}patients/${patientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify(editData)
        });
        const result = await response.json();
        hideLoading();
        if (result.success) {
            showNotification('Patient details updated successfully!', 'success');
            sessionStorage.removeItem('editPatientDraft');
            window.currentOpenPatientModal = null;
            document.querySelectorAll('.modal').forEach(m => m.remove());
            loadPatients();
        } else {
            showNotification(result.message || 'Failed to update patient', 'error');
        }
    } catch (err) {
        hideLoading();
        console.error(err);
        showNotification('Network error while saving changes', 'error');
    }
}

window.savePatientEdit = savePatientEdit;

// ==================== MODAL DRAFT SYSTEM ====================
window.currentOpenPatientModal = null;

window.savePatientModalDraft = function () {
    if (!window.currentOpenPatientModal) return;

    const { type, patientId } = window.currentOpenPatientModal;

    if (type === 'surgery') {
        const name = document.getElementById('surgery-name')?.value.trim() || '';
        const surgeon = document.getElementById('surgeon-name')?.value.trim() || '';
        const date = document.getElementById('surgery-date')?.value || '';
        const cost = parseFloat(document.getElementById('surgery-cost')?.value) || 0;
        const signature = document.getElementById('surgery-sig-preview-img')?.src || '';
        const indoorNo = document.getElementById('surgery-indoor-no')?.value.trim() || '';
        const wardNo = document.getElementById('surgery-ward-no')?.value.trim() || '';
        const provisional = document.getElementById('surgery-provisional')?.value.trim() || '';
        const finalDiag = document.getElementById('surgery-final')?.value.trim() || '';
        const witnessName = document.getElementById('surgery-witness-name')?.value.trim() || '';
        const witnessAddress = document.getElementById('surgery-witness-address')?.value.trim() || '';
        const witnessDate = document.getElementById('surgery-witness-date')?.value || '';
        const witnessPlace = document.getElementById('surgery-witness-place')?.value.trim() || '';
        const guardianName = document.getElementById('surgery-guardian-name')?.value.trim() || '';
        const guardianAddress = document.getElementById('surgery-guardian-address')?.value.trim() || '';
        const guardianDate = document.getElementById('surgery-guardian-date')?.value || '';
        const guardianPlace = document.getElementById('surgery-guardian-place')?.value.trim() || '';

        const isDefaultSig = signature.includes('window.snapSurgeryPhoto') || !signature || signature.startsWith('data:,') || (signature.includes('localhost') && signature.endsWith('/'));
        const cleanSig = isDefaultSig ? '' : signature;

        if (name || surgeon || cost || cleanSig || indoorNo || wardNo || provisional || finalDiag || witnessName || guardianName) {
            const draft = {
                patientId,
                surgeryName: name,
                surgeonName: surgeon,
                surgeryDate: date,
                cost,
                guardianSignature: cleanSig,
                indoorNo,
                wardNo,
                provisional,
                finalDiag,
                witnessName,
                witnessAddress,
                witnessDate,
                witnessPlace,
                guardianName,
                guardianAddress,
                guardianDate,
                guardianPlace
            };
            sessionStorage.setItem('surgeryDraft', JSON.stringify(draft));
        }
    } else if (type === 'edit') {
        const name = document.getElementById('edit-p-name')?.value.trim() || '';
        const guardian = document.getElementById('edit-p-guardian')?.value.trim() || '';
        const age = document.getElementById('edit-p-age')?.value || '';
        const gender = document.getElementById('edit-p-gender')?.value || '';
        const mobile = document.getElementById('edit-p-mobile')?.value.trim() || '';
        const email = document.getElementById('edit-p-email')?.value.trim() || '';
        const address = document.getElementById('edit-p-address')?.value.trim() || '';
        const wardType = document.getElementById('edit-p-ward-type')?.value || '';
        const bedNo = document.getElementById('edit-p-bed-no')?.value.trim() || '';
        const dailyCharge = parseFloat(document.getElementById('edit-p-daily-charge')?.value) || 0;

        if (name || guardian || age || mobile || address) {
            const draft = {
                patientId,
                name, guardian_name: guardian, age: parseInt(age) || '',
                gender, mobile, email, address, bed_no: bedNo,
                wardChargePerDay: dailyCharge, wardType
            };
            sessionStorage.setItem('editPatientDraft', JSON.stringify(draft));
        }
    } else if (type === 'transfer') {
        const newBed = document.getElementById('transfer-new-bed')?.value || '';
        const newCharge = parseFloat(document.getElementById('transfer-daily-charge')?.value) || 0;

        if (newBed || newCharge) {
            const draft = {
                patientId,
                new_bed_no: newBed,
                new_daily_charge: newCharge
            };
            sessionStorage.setItem('bedTransferDraft', JSON.stringify(draft));
        }
    }
};

window.closePatientModal = function (modalEl) {
    if (typeof window.stopSurgeryCameraStream === 'function') {
        try {
            window.stopSurgeryCameraStream();
        } catch (e) {
            console.error("Error stopping surgery camera on close:", e);
        }
    }
    if (typeof window.savePatientModalDraft === 'function') {
        window.savePatientModalDraft();
    }
    window.currentOpenPatientModal = null;
    if (modalEl) {
        modalEl.remove();
    } else {
        document.querySelectorAll('.modal').forEach(m => m.remove());
    }
};

window.toggleEditPatientTypeFields = function() {
    const editType = document.getElementById('edit-p-type')?.value;
    const bedDetailsContainer = document.getElementById('edit-bed-details-container');
    const bedSelect = document.getElementById('edit-p-bed-no');
    
    if (editType === 'OPD') {
        if (bedDetailsContainer) bedDetailsContainer.style.display = 'none';
        if (bedSelect) bedSelect.removeAttribute('required');
    } else {
        if (bedDetailsContainer) bedDetailsContainer.style.display = 'block';
        if (bedSelect) {
            bedSelect.setAttribute('required', 'required');
            const genderVal = document.getElementById('edit-p-gender')?.value;
            const currentBed = bedSelect.value;
            // Load beds if not already loaded or empty
            if (typeof loadAvailableBedsForEdit === 'function') {
                loadAvailableBedsForEdit(currentBed, genderVal);
            }
        }
    }
};

window.convertOpdToIpd = function(patientId) {
    const patient = window.allPatientsData?.find(p => String(p.patient_id) === String(patientId));
    if (!patient) return;
    
    // Remove any existing IPD confirm modal
    document.getElementById('ipd-confirm-modal')?.remove();
    
    const modal = document.createElement('div');
    modal.id = 'ipd-confirm-modal';
    modal.innerHTML = `
        <style>
            .ipd-modal-overlay {
                position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center; z-index: 10000;
                animation: ipdFadeIn 0.2s ease;
            }
            @keyframes ipdFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ipdSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
            .ipd-modal-box {
                background: #fff; border-radius: 18px; width: 420px; max-width: 94vw;
                box-shadow: 0 30px 70px rgba(0,0,0,0.22), 0 0 0 1px rgba(99,102,241,0.1);
                animation: ipdSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                overflow: hidden;
            }
            .ipd-modal-header {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                padding: 26px 28px 20px; text-align: center;
            }
            .ipd-modal-icon {
                width: 60px; height: 60px; border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 14px;
                border: 2px solid rgba(255,255,255,0.35);
            }
            .ipd-modal-icon i { font-size: 26px; color: #fff; }
            .ipd-modal-header h3 { margin: 0 0 4px; font-size: 18px; color: #fff; font-weight: 700; }
            .ipd-modal-header p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.75); }
            .ipd-modal-body { padding: 22px 28px; }
            .ipd-patient-card {
                background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px;
                padding: 14px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 14px;
            }
            .ipd-avatar {
                width: 44px; height: 44px; border-radius: 50%;
                background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
                color: #4f46e5; display: flex; align-items: center; justify-content: center;
                font-weight: 700; font-size: 18px; flex-shrink: 0;
            }
            .ipd-info-text { font-size: 13px; color: #475569; line-height: 1.6; }
            .ipd-warning-box {
                background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;
                padding: 12px 14px; font-size: 12px; color: #92400e; display: flex; gap: 10px;
                margin-bottom: 20px; align-items: flex-start;
            }
            .ipd-modal-footer { padding: 0 28px 24px; display: flex; gap: 10px; }
            .ipd-btn-cancel {
                flex: 1; padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;
                border-radius: 10px; font-size: 14px; font-weight: 600; color: #475569;
                cursor: pointer; transition: all 0.2s;
            }
            .ipd-btn-cancel:hover { background: #e2e8f0; }
            .ipd-btn-confirm {
                flex: 2; padding: 12px; border: none;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border-radius: 10px; font-size: 14px; font-weight: 600; color: #fff;
                cursor: pointer; transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(99,102,241,0.35);
                display: flex; align-items: center; justify-content: center; gap: 8px;
            }
            .ipd-btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99,102,241,0.45); }
        </style>
        <div class="ipd-modal-overlay" id="ipd-overlay-bg">
            <div class="ipd-modal-box" onclick="event.stopPropagation()">
                <div class="ipd-modal-header">
                    <div class="ipd-modal-icon"><i class="fas fa-bed"></i></div>
                    <h3>IPD में Shift करें?</h3>
                    <p>OPD से Inpatient Admission</p>
                </div>
                <div class="ipd-modal-body">
                    <div class="ipd-patient-card">
                        <div class="ipd-avatar">${(patient.name?.charAt(0) || 'P').toUpperCase()}</div>
                        <div>
                            <div style="font-weight:700; color:#1e293b; font-size:15px;">${patient.name}</div>
                            <div style="font-size:12px; color:#64748b;">ID: ${patient.patient_id} &bull; OPD Patient</div>
                        </div>
                    </div>
                    <div class="ipd-warning-box">
                        <i class="bi bi-info-circle-fill" style="font-size:16px; flex-shrink:0; margin-top:1px;"></i>
                        <span>अगले step में <strong>Bed Number चुनना होगा</strong> तभी IPD Admission पूरा होगा। गलती से दबा है तो <strong>Cancel</strong> करें।</span>
                    </div>
                </div>
                <div class="ipd-modal-footer">
                    <button class="ipd-btn-cancel" id="ipd-cancel-btn">
                        <i class="bi bi-x-lg" style="margin-right:6px;"></i>Cancel
                    </button>
                    <button class="ipd-btn-confirm" id="ipd-proceed-btn">
                        <i class="fas fa-bed"></i> हाँ, IPD में Admit करें
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Cancel button
    document.getElementById('ipd-cancel-btn').addEventListener('click', () => {
        document.getElementById('ipd-confirm-modal')?.remove();
    });
    
    // Close on overlay background click
    document.getElementById('ipd-overlay-bg').addEventListener('mousedown', function(e) {
        if (e.target === this) document.getElementById('ipd-confirm-modal')?.remove();
    });
    
    // Confirm button — open the edit modal in IPD Admission mode
    document.getElementById('ipd-proceed-btn').addEventListener('click', () => {
        document.getElementById('ipd-confirm-modal')?.remove();
        editPatient(patientId);
        setTimeout(() => {
            const editTypeSelect = document.getElementById('edit-p-type');
            if (editTypeSelect) {
                editTypeSelect.value = 'IPD';
                if (typeof toggleEditPatientTypeFields === 'function') {
                    toggleEditPatientTypeFields();
                }
            }
            
            // ── Modal को IPD Admission mode में transform करें ──
            // 1. Header title aur icon badlo
            const modalHeader = document.querySelector('.modal-content .modal-header');
            if (modalHeader) {
                const h3 = modalHeader.querySelector('h3');
                if (h3) {
                    h3.innerHTML = `<i class="fas fa-bed" style="color:#a5b4fc;"></i> IPD में Admit करें`;
                }
                modalHeader.style.background = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
                modalHeader.style.borderBottom = 'none';
            }
            
            // 2. Patient Type field ko hide karo (IPD already set hai)
            const typeRow = document.getElementById('edit-p-type')?.closest('div[style*="grid-column: span 2"]') 
                         || document.getElementById('edit-p-type')?.closest('div');
            if (typeRow) typeRow.style.display = 'none';
            
            // 3. Save button text badlo
            const submitBtn = document.querySelector('#edit-patient-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = `<i class="fas fa-bed"></i> IPD में Admit करें (Save)`;
                submitBtn.style.background = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
                submitBtn.style.border = 'none';
            }
            
            // 4. Top pe IPD Admission Banner jodo
            const form = document.getElementById('edit-patient-form');
            if (form && !document.getElementById('ipd-admission-banner')) {
                const banner = document.createElement('div');
                banner.id = 'ipd-admission-banner';
                banner.style.cssText = `
                    background: linear-gradient(135deg, #fffbeb, #fef3c7);
                    border: 1px solid #fde68a;
                    border-left: 4px solid #f59e0b;
                    border-radius: 10px;
                    padding: 12px 16px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 13px;
                    color: #92400e;
                `;
                banner.innerHTML = `
                    <i class="bi bi-info-circle-fill" style="font-size:18px; color:#f59e0b; flex-shrink:0;"></i>
                    <div>
                        <div style="font-weight:700; margin-bottom:2px;">OPD → IPD Conversion</div>
                        <div><strong>Bed Number ज़रूर चुनें</strong>, फिर <em>"IPD में Admit करें"</em> बटन दबाएँ — तभी Admission पूरा होगा।</div>
                    </div>
                `;
                form.insertBefore(banner, form.firstChild);
            }
            
            showNotification('Bed Number चुनें और Save करें — IPD Admission होगा।', 'info');
        }, 280);
    });
};

// WhatsApp feature disabled — abhi ke liye use nahi ho rahi
window.shareOpdWhatsApp = function(patientId) {
    showNotification('WhatsApp feature abhi available nahi hai.', 'info');
};