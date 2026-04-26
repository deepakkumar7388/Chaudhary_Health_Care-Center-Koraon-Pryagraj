// ==================== PATIENTS MODULE ====================

function renderPatients() {
    const moduleEl = document.getElementById('module-patients');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="patients-container">
            <div class="module-header">
                <h2>Patient Management</h2>
                <button class="btn-primary" onclick="showModule('add-patient')">
                    <i class="fas fa-user-plus"></i> Add New Patient
                </button>
            </div>
            
            <div class="search-filter">
                <input type="text" placeholder="Search patients..." class="search-input" id="patient-search" onkeyup="filterPatients()">
                <select class="filter-select" id="patient-filter" onchange="filterPatients()">
                    <option value="all">All Status</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Discharged">Discharged</option>
                </select>
                <select class="filter-select" id="payment-filter" onchange="filterPatients()">
                    <option value="all">All Payments</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                </select>
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
                            <th>Payment Status</th>
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
        const els = ['patient-filter', 'payment-filter', 'surgery-filter', 'patient-sort'];
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
    showLoading('Loading patients...');

    try {
        const response = await fetch(`${API_BASE}patients`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();

        if (result.success && result.patients) {
            window.allPatientsData = result.patients;
        } else {
            throw new Error('Fallback to LocalStorage');
        }
    } catch (error) {
        console.log('Loading from LocalStorage...');
        const storedPatients = JSON.parse(localStorage.getItem('patients') || '[]');

        // Demo data if total is 0
        if (storedPatients.length === 0) {
            const demoPatients = [
                {
                    id: '1001', patient_id: 'P-1001', name: 'Rajesh Kumar', age: 45, gender: 'Male', guardian_name: 'S/o Ram Lal', bed_no: 'ICU-2',
                    admission_date: '2024-03-10', status: 'Admitted', payment_status: 'Pending', pending_amount: 8500, problem: 'Blood Pressure', doctor_assigned: 'Dr. Bhoopendra Chaudhary'
                },
                {
                    id: '1002', patient_id: 'P-1002', name: 'Sunita Sharma', age: 32, gender: 'Female', guardian_name: 'W/o V. Sharma', bed_no: 'Ward-3',
                    admission_date: '2024-03-12', status: 'Admitted', payment_status: 'Pending', pending_amount: 3200, problem: 'Fever', doctor_assigned: 'Dr. Bhoopendra Chaudhary'
                }
            ];
            window.allPatientsData = demoPatients;
            localStorage.setItem('patients', JSON.stringify(demoPatients));
        } else {
            window.allPatientsData = storedPatients;
        }
    }

    renderPatientsTable(window.allPatientsData);
    hideLoading();
}

function renderPatientsTable(patientsList) {
    const tbody = document.getElementById('patients-table-body');
    if (!tbody) return;

    const sortedList = [...patientsList].sort((a, b) =>
        new Date(b.admission_date) - new Date(a.admission_date));

    tbody.innerHTML = sortedList.map((patient, index) => {
        const payStatus = patient.payment_status || 'Pending';
        const guardian = patient.guardian_name || '';
        const bedText = patient.bed_no || 'N/A';
        const isDischarged = (patient.status || '').toLowerCase() === 'discharged';

        let bedDisplay = `<span>${bedText}</span>`;

        const hasSurgery = isSurgeryPatient(patient.patient_id);

        return `
        <tr style="animation-delay: ${index * 0.05}s">
            <td>${patient.patient_id}</td>
            <td>
                <strong>${patient.name}</strong>
                ${hasSurgery ? '<span class="status-badge" style="background:#e0e7ff; color:#4f46e5; border:1px solid #c7d2fe; font-size:10px; padding:2px 6px; margin-left:6px;">Surgery Done</span>' : ''}
                <br><small style="color:#666">${guardian}</small>
            </td>
            <td>${patient.age}/${patient.gender?.charAt(0) || ''}</td>
            <td>${bedDisplay}</td>
            <td>${patient.admission_date}</td>
            <td><span class="status-badge ${(patient.status || '').toLowerCase() === 'discharged' ? 'payment-pending' : 'payment-paid'}">${(patient.status || 'Admitted').toUpperCase()}</span></td>

            <td>
                <span class="status-badge payment-${payStatus.toLowerCase()}">${payStatus}</span>
                ${payStatus === 'Pending' && patient.pending_amount ?
                `<br><span style="color:#e67e22;font-size:11px;">${window.currencySymbol || '₹'}${patient.pending_amount} pending</span>` : ''}
            </td>
            <td>
                <button class="btn-small btn-info" onclick="viewPatient('${patient.patient_id}')" title="View Info"><i class="fas fa-eye"></i></button>
                
                ${(currentUser && (currentUser.role === 'admin' || currentUser.role === 'doctor')) ? 
                    `<button class="btn-small btn-warning" onclick="editPatient('${patient.patient_id}')" title="Edit Patient"><i class="fas fa-edit"></i></button>` : ''}
                
                ${(currentUser && currentUser.role === 'admin') ? 
                    `<button class="btn-small btn-danger" onclick="deletePatient('${patient.patient_id}')" title="Delete Patient"><i class="fas fa-trash"></i></button>` : ''}
                
                ${(currentUser && currentUser.role !== 'receptionist') ? 
                    `<button class="btn-small btn-success" onclick="addNoteForPatient('${patient.patient_id}')" title="Daily Notes"><i class="fas fa-notes-medical"></i></button>` : ''}
                
                <button class="btn-small btn-primary" style="background-color: #805ad5; border: none; color: white;" onclick="openSurgeryModal('${patient.patient_id}')" title="Add Surgery Event"><i class="fas fa-procedures"></i></button>
            </td>
        </tr>
    `;
    }).join('');
}

function filterPatients() {
    if (!window.allPatientsData) return;

    const searchVal = (document.getElementById('patient-search')?.value || '').toLowerCase();
    const statusVal = (document.getElementById('patient-filter')?.value || 'all').toLowerCase();
    const paymentVal = (document.getElementById('payment-filter')?.value || 'all').toLowerCase();
    const surgeryVal = (document.getElementById('surgery-filter')?.value || 'all').toLowerCase();
    const sortVal = document.getElementById('patient-sort')?.value || 'date-desc';

    console.log(`[Filter Triggered] Search: '${searchVal}', Status: '${statusVal}', Payment: '${paymentVal}', Surgery: '${surgeryVal}'`);

    let filtered = window.allPatientsData.filter(p => {
        const pName = p.name || '';
        const pId = p.patient_id || '';

        // Match Search
        const matchSearch = pName.toLowerCase().includes(searchVal) || pId.toLowerCase().includes(searchVal);

        // Match Admission Status
        const pStatus = (p.status || 'Admitted').toLowerCase();
        const matchStatus = statusVal === 'all' || pStatus === statusVal;

        // Match Payment Status
        const pPay = (p.payment_status || 'Pending').toLowerCase();
        const matchPayment = paymentVal === 'all' || pPay === paymentVal;

        // Match Surgery Status
        const matchSurgery = surgeryVal === 'all' || (surgeryVal === 'surgery' && isSurgeryPatient(pId));

        return matchSearch && matchStatus && matchPayment && matchSurgery;
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
            <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 25px; border-bottom: none;">
                <h3 style="color: white; margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-id-card"></i> Patient Overview
                </h3>
                <button class="modal-close" style="color: white; opacity: 0.8;" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 25px; background: #f8fafc; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; align-items: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
                    <div style="width: 65px; height: 65px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 30px; color: #a0aec0; margin-right: 20px;">
                        <i class="fas ${gender.toLowerCase() === 'female' ? 'fa-female' : 'fa-male'}"></i>
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
                            <i class="fas fa-user-friends"></i> Guardian
                        </div>
                        <div style="color: #2d3748; font-weight: 600; font-size: 14px;">${guardian}</div>
                    </div>

                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: 700; margin-bottom: 8px;">
                            <i class="fas fa-bed"></i> Bed Assignment
                        </div>
                        <div style="color: #2d3748; font-weight: 600; font-size: 14px;">${bed}</div>
                    </div>

                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; grid-column: 1 / -1;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: 700; margin-bottom: 8px;">
                            <i class="fas fa-map-marker-alt"></i> Address
                        </div>
                        <div style="color: #4a5568; font-size: 14px;">${address}</div>
                    </div>

                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; grid-column: 1 / -1;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: 700; margin-bottom: 12px;">
                            <i class="fas fa-stethoscope"></i> Medical Summary
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
                            <i class="fas fa-procedures"></i> Surgery History
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${surgeries.map(s => `
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 1px dotted #e2e8f0;">
                                    <div>
                                        <div style="font-size: 14px; font-weight: 700; color: #2d3748;">${s.surgeryName}</div>
                                        <div style="font-size: 12px; color: #718096;">By ${s.surgeonName} on ${new Date(s.surgeryDate).toLocaleDateString()}</div>
                                    </div>
                                    <div style="text-align: right; color: #805ad5; font-weight: 700; font-size: 14px;">
                                        ${window.currencySymbol || '₹'}${s.cost}
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
                            <div style="font-size: 12px; color: #718096;">Total Bill: ${window.currencySymbol || '₹'}${totalBill}</div>
                            <span class="status-badge payment-${payStatus.toLowerCase()}">${payStatus}</span>
                        </div>
                        ${payStatus === 'Pending' ? `
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

    if ((patient.status || '').toLowerCase() === 'discharged') {
        showNotification('Cannot edit a discharged patient.', 'warning');
        return;
    }

    // Try to determine current ward type for the dropdown
    const currentWardType = patient.bed_no?.toUpperCase().includes('ICU') ? 'ICU' : 'General';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '3000';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; padding: 0; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.3);">
            <div class="modal-header" style="background: #2d3748; padding: 15px 25px;">
                <h3 style="color: white; margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-edit"></i> Edit Patient Details
                </h3>
                <button class="modal-close" style="color: white;" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 25px; background: white; max-height: 80vh; overflow-y: auto;">
                <form id="edit-patient-form" onsubmit="event.preventDefault(); savePatientEdit('${patient.patient_id || patient.id}')">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Patient Name</label>
                            <input type="text" id="edit-p-name" value="${patient.name}" class="search-input" style="width:100%;" required>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Guardian Name</label>
                            <input type="text" id="edit-p-guardian" value="${patient.guardian_name || ''}" class="search-input" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Age (Yrs)</label>
                            <input type="number" id="edit-p-age" value="${patient.age}" class="search-input" style="width:100%;">
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Gender</label>
                            <select id="edit-p-gender" class="filter-select" style="width:100%;">
                                <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Other" ${patient.gender === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Mobile / Contact</label>
                        <input type="text" id="edit-p-mobile" value="${patient.mobile || ''}" class="search-input" style="width:100%;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display:block; font-size:11px; font-weight:700; color:#a0aec0; text-transform:uppercase; margin-bottom:5px;">Address</label>
                        <textarea id="edit-p-address" class="search-input" style="width:100%; height:60px; padding:10px;">${patient.address || ''}</textarea>
                    </div>

                    <hr style="border: none; border-top: 1px dashed #e2e8f0; margin: 25px 0;">
                    
                    <div style="background: #edf2f7; padding: 15px; border-radius: 10px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-bed"></i> Change Ward / Bed
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="display:block; font-size:10px; color:#718096; margin-bottom:3px;">Ward Type</label>
                                <select id="edit-p-ward-type" class="filter-select" style="width:100%; height: 35px;">
                                    <option value="General" ${currentWardType === 'General' ? 'selected' : ''}>General Ward</option>
                                    <option value="ICU" ${currentWardType === 'ICU' ? 'selected' : ''}>ICU (Intensive Care)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block; font-size:10px; color:#718096; margin-bottom:3px;">Bed Number</label>
                                <input type="text" id="edit-p-bed-no" value="${patient.bed_no || ''}" class="search-input" style="width:100%; height: 35px;" placeholder="e.g. ICU-05">
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                        <button type="submit" class="btn-primary" style="padding: 10px 40px; border-radius: 8px; font-weight: 700;">
                            <i class="fas fa-save"></i> Save All Changes
                        </button>
                        <button type="button" class="btn" style="background:#f1f5f9;" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function deletePatient(patientId) {
    if (currentUser?.role !== 'admin') {
        showNotification('Access Denied. Only Admin can delete patients.', 'error');
        return;
    }
    if (confirm('Are you certain you want to permanently delete this patient?')) {
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

function openSurgeryModal(patientId) {
    const patientObj = window.allPatientsData?.find(p => String(p.patient_id) === String(patientId));

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h3><i class="fas fa-procedures" style="color:#805ad5;"></i> Add Surgery Event</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding:20px;">
                <p style="margin-top:0; color:#4a5568; font-size:14px; margin-bottom:15px;">
                    Recording surgery for <strong>${patientObj ? patientObj.name : patientId}</strong>
                </p>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>Surgery Name / Procedure *</label>
                    <input type="text" id="surgery-name" placeholder="Appendectomy" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>Surgeon Name *</label>
                    <input type="text" id="surgeon-name" placeholder="Dr. Name" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>Surgery Date *</label>
                    <input type="date" id="surgery-date" value="${new Date().toISOString().split('T')[0]}" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px;">
                </div>
                <div class="form-group" style="margin-bottom: 25px;">
                    <label>Surgery Base Charges (${window.currencySymbol || '₹'}) *</label>
                    <input type="number" id="surgery-cost" value="0" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px;">
                    <small style="color:#718096; display:block; margin-top:5px;"><i class="fas fa-info-circle"></i> This will be automatically added to the Billing Module.</small>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn" style="background:#eee;color:#333;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" style="background:#805ad5;color:#fff;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;" onclick="saveSurgery('${patientId}', this)">Confirm Surgery</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('surgery-name').focus();
}

async function saveSurgery(patientId, btnEl) {
    const name = document.getElementById('surgery-name').value.trim();
    const surgeon = document.getElementById('surgeon-name').value.trim();
    const date = document.getElementById('surgery-date').value;
    const cost = parseFloat(document.getElementById('surgery-cost').value) || 0;

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
        paid: false
    };

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
    const name = document.getElementById('edit-p-name').value.trim();
    const guardian = document.getElementById('edit-p-guardian').value.trim();
    const age = document.getElementById('edit-p-age').value;
    const gender = document.getElementById('edit-p-gender').value;
    const mobile = document.getElementById('edit-p-mobile').value.trim();
    const address = document.getElementById('edit-p-address').value.trim();
    const wardType = document.getElementById('edit-p-ward-type').value;
    const bedNo = document.getElementById('edit-p-bed-no').value.trim();

    if (!name) {
        showNotification('Patient name is required.', 'error');
        return;
    }

    const editData = {
        name, guardian_name: guardian, age: parseInt(age),
        gender, mobile, address, bed_no: bedNo
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