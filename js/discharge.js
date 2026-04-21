// ==================== DISCHARGE MODULE ====================

let dischargePatientsList = [];

function renderDischarge() {
    const moduleEl = document.getElementById('module-discharge');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="discharge-container">
            <div class="module-header" id="discharge-header-nav">
                <h2>Patient Discharge</h2>
                <button class="btn" onclick="showModule('patients')">
                    <i class="fas fa-arrow-left"></i> Back to Patients
                </button>
            </div>
            
            <div class="discharge-form" id="discharge-form-wrap">
                <div class="form-group" style="position:relative;">
                    <label>Search Patient by Name or ID *</label>
                    <input type="text" id="discharge-search-input" placeholder="Search Patient by Name or ID" autocomplete="off" oninput="filterDischargePatients(this.value)" onclick="filterDischargePatients(this.value)">
                    <input type="hidden" id="discharge-patient">
                    <div id="discharge-dropdown" class="autocomplete-dropdown" style="display:none;"></div>
                </div>
                
                <div id="discharge-info" style="display:none;">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Patient ID</label>
                            <input type="text" id="d-id" readonly>
                        </div>
                        <div class="form-group">
                            <label>Patient Name</label>
                            <input type="text" id="d-name" readonly>
                        </div>
                    </div>
                    <div class="form-grid" style="margin-top:15px;">
                        <div class="form-group">
                            <label>Admission Date</label>
                            <input type="text" id="d-admit" readonly>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Doctor Name (Fixed) *</label>
                    <input type="text" id="discharge-doctor" value="Dr. Bhoopendra Chaudhary" readonly style="background:#f8fafc; font-weight:700; color:#2d3748;">
                </div>
                
                <div class="form-group">
                    <label>Discharge Date *</label>
                    <input type="date" id="discharge-date" required>
                </div>
                
                <div class="form-group">
                    <label>Diagnosis *</label>
                    <textarea rows="3" id="discharge-diagnosis" required></textarea>
                </div>
                
                <div class="form-group">
                    <label>Treatment Summary *</label>
                    <textarea rows="4" id="discharge-summary" required></textarea>
                </div>
                
                <div class="adv-med-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <label style="margin:0; font-size:14px; font-weight:800; color:#4a5568;"><i class="fas fa-pills"></i> Advised Medicines</label>
                        <button type="button" class="btn btn-primary btn-small" onclick="addMedicineRow()">
                            <i class="fas fa-plus"></i> Add Row
                        </button>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="med-table" id="advised-med-table">
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th>Dose</th>
                                    <th>Frequency</th>
                                    <th>Duration</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- dynamic rows -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn-success" onclick="confirmDischarge()">
                        <i class="fas fa-check"></i> Generate Discharge Summary
                    </button>
                </div>
            </div>

            <div id="discharge-report-section" style="display:none;">
                <div class="action-buttons print-hide" style="margin-bottom:15px; display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn btn-print" onclick="window.print()" style="background:#4CAF50; color:white;">
                        <i class="fas fa-print"></i> Print Report
                    </button>
                    <button class="btn btn-close" onclick="closeDischargeReport()" style="background:#6c757d; color:white;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
                
                <div class="report-container">
                    <div class="chk-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: nowrap; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 15px; font-family: Arial, sans-serif;">
                        <div class="hospital-logo" style="flex: 0 0 auto; text-align: left; display: flex; align-items: center; margin-right: 15px;">
                            <img src="hlogo.png" alt="CHC Logo" style="height: 110px; width: auto; max-width: none; object-fit: contain;">
                        </div>
                        <div class="hospital-info" style="flex: 1 1 auto; text-align: center; white-space: nowrap;">
                            <h1 class="hospital-title" style="margin: 0; font-size: 23px; font-weight: 900; color: #2b6cb0; letter-spacing: 0.5px;">CHAUDHARY HEALTH CARE CENTER</h1>
                            <h3 class="hospital-subtitle" style="margin: 4px 0 0; font-size: 13px; color: #e53e3e; text-transform: uppercase;">GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306</h3>
                            <p style="margin: 4px 0 0; font-size: 13px; font-weight: bold; color: #2d3748;">Phone: (0542) 123456</p>
                        </div>
                        <div style="flex: 0 0 auto; text-align: right; color: #718096; font-size: 12px; font-weight: bold; white-space: nowrap; margin-left: 15px;">
                            <div style="margin-bottom: 4px; color: #2d3748;">Date: <span id="auto-date-field" style="border-bottom: 1px dashed #ccc; padding-bottom: 1px; min-width:70px; display:inline-block; text-align: center;"></span></div>
                            <div style="color: #2d3748;">Time: <span id="auto-time-field" style="border-bottom: 1px dashed #ccc; padding-bottom: 1px; min-width:70px; display:inline-block; text-align: center;"></span></div>
                        </div>
                    </div>
                    
                    <div class="report-title" style="text-align: center; margin: 25px 0; font-size: 24px; font-weight: bold; text-decoration: underline; color: #2d3748; letter-spacing: 1px;">
                        DISCHARGE SUMMARY REPORT
                    </div>
                    
                    <div class="section-title">PATIENT INFORMATION</div>
                    <table class="info-table">
                        <tr>
                            <td>Patient ID:</td><td id="rpt-patient-id">-</td>
                            <td>Discharge Date:</td><td id="rpt-discharge-date">-</td>
                        </tr>
                        <tr>
                            <td>Patient Name:</td><td id="rpt-patient-name">-</td>
                            <td>Admission Date:</td><td id="rpt-admission-date">-</td>
                        </tr>
                        <tr>
                            <td>Doctor:</td><td id="rpt-doctor" colspan="3" style="font-weight:bold;">-</td>
                        </tr>
                    </table>
                    
                    <div class="section-title">DIAGNOSIS</div>
                    <div class="content-box" id="rpt-diagnosis">-</div>
                    
                    <div class="section-title">TREATMENT SUMMARY</div>
                    <div class="content-box" id="rpt-summary">-</div>
                    
                    <div id="surgery-report-section" style="display:none; margin-top:20px;">
                        <div class="section-title">SURGERY DETAILS</div>
                        <table class="info-table" id="rpt-surgery-table" style="width:100%; border-collapse:collapse; margin-bottom:15px;">
                            <thead>
                                <tr>
                                    <th style="background:#f7fafc; padding:10px; border:1px solid #e2e8f0; text-align:left; font-weight:600;">Procedure</th>
                                    <th style="background:#f7fafc; padding:10px; border:1px solid #e2e8f0; text-align:left; font-weight:600;">Surgeon</th>
                                    <th style="background:#f7fafc; padding:10px; border:1px solid #e2e8f0; text-align:left; font-weight:600;">Date</th>
                                </tr>
                            </thead>
                            <tbody id="rpt-surgery-list"></tbody>
                        </table>
                    </div>
                    
                    <div class="section-title" id="rpt-med-title" style="display:none;">ADVISED MEDICINES</div>
                    <table class="info-table" id="rpt-med-table" style="display:none; margin-bottom:30px; width:100%; border-collapse:collapse;">
                        <thead>
                            <tr>
                                <th style="background:#f7fafc; padding:10px; border:1px solid #e2e8f0; text-align:left; font-weight:600;">Medicine Name</th>
                                <th style="background:#f7fafc; padding:10px; border:1px solid #e2e8f0; text-align:left; font-weight:600;">Dose</th>
                                <th style="background:#f7fafc; padding:10px; border:1px solid #e2e8f0; text-align:left; font-weight:600;">Frequency</th>
                                <th style="background:#f7fafc; padding:10px; border:1px solid #e2e8f0; text-align:left; font-weight:600;">Duration</th>
                            </tr>
                        </thead>
                        <tbody id="rpt-med-list"></tbody>
                    </table>
                    
                    <div class="signature-section" style="display:flex; justify-content:flex-end; margin-top:60px; width:100%;">
                        <div style="text-align:center; padding-right: 20px;">
                            <div class="signature-line" style="width:220px; border-top:1px solid #1a202c; margin-bottom:5px;"></div>
                            <div class="doctor-name" id="rpt-doctor-sign" style="font-weight:800;">Dr. Bhoopendra Chaudhary</div>
                            <div class="report-date" id="rpt-sign-date" style="font-size:13px; color:#4a5568; margin-top:4px;">-</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadDischargePatients();
    addMedicineRow();

    if (!window.dischargeDropdownListenerAdded) {
        document.addEventListener('click', function (e) {
            const dropdown = document.getElementById('discharge-dropdown');
            const input = document.getElementById('discharge-search-input');
            if (dropdown && input && e.target !== input && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        window.dischargeDropdownListenerAdded = true;
    }
}

function loadDischargePatients() {
    try {
        const stored = JSON.parse(localStorage.getItem('patients') || '[]');
        dischargePatientsList = stored;
    } catch (e) {
        console.error("Error reading patients array from localStorage");
        dischargePatientsList = [];
    }
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('discharge-date').value = today;
}

function filterDischargePatients(query) {
    const dropdown = document.getElementById('discharge-dropdown');
    if (!dropdown) return;

    const lowerQuery = (query || '').toLowerCase();

    const filtered = dischargePatientsList.filter(p => {
        const id = (p.patient_id || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return id.includes(lowerQuery) || name.includes(lowerQuery);
    });

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item empty">No patient found</div>';
    } else {
        dropdown.innerHTML = filtered.map(p => {
            const id = p.patient_id;
            const safeName = (p.name || '').replace(/'/g, "\\'");
            return `<div class="autocomplete-item" onclick="selectDischargePatient('${id}', '${safeName}', '${p.admission_date || ''}')">
                        <div class="patient-name">${p.name}</div>
                        <div class="patient-id">${id}</div>
                    </div>`;
        }).join('');
    }

    dropdown.style.display = 'block';
}

function selectDischargePatient(id, name, admitDate) {
    const searchInput = document.getElementById('discharge-search-input');
    const hiddenInput = document.getElementById('discharge-patient');
    const dropdown = document.getElementById('discharge-dropdown');

    searchInput.value = `${name} | ${id}`;
    hiddenInput.value = id;
    dropdown.style.display = 'none';

    document.getElementById('d-id').value = id;
    document.getElementById('d-name').value = name;
    document.getElementById('d-admit').value = admitDate || '-';

    document.getElementById('discharge-info').style.display = 'block';
}

function addMedicineRow() {
    const tbody = document.querySelector('#advised-med-table tbody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="med-name" placeholder="E.g. Paracetamol 500mg"></td>
        <td><input type="text" class="med-dose" placeholder="E.g. 1 Tab"></td>
        <td><input type="text" class="med-freq" placeholder="E.g. BD (Twice/day)"></td>
        <td><input type="text" class="med-dur" placeholder="E.g. 5 Days"></td>
        <td style="text-align:center;"><button type="button" class="btn btn-danger btn-small" onclick="this.closest('tr').remove()" style="padding:6px 10px; background:#e53e3e; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;"><i class="fas fa-times"></i></button></td>
    `;
    tbody.appendChild(tr);
}

function confirmDischarge() {
    const patientId = document.getElementById('discharge-patient').value;
    const diagnosis = document.getElementById('discharge-diagnosis').value.trim();
    const summary = document.getElementById('discharge-summary').value.trim();
    const dischargeDate = document.getElementById('discharge-date').value;

    if (!patientId || !diagnosis || !summary || !dischargeDate) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    if (confirm('Are you sure you want to generate the discharge summary?')) {
        showLoading('Processing discharge...');

        // Collect Advised Medicines
        const advisedMedicines = [];
        document.querySelectorAll('#advised-med-table tbody tr').forEach(tr => {
            const name = tr.querySelector('.med-name').value.trim();
            const dose = tr.querySelector('.med-dose').value.trim();
            const freq = tr.querySelector('.med-freq').value.trim();
            const dur = tr.querySelector('.med-dur').value.trim();
            if (name) {
                advisedMedicines.push({ name, dose, freq, duration: dur });
            }
        });

        const dischargeData = {
            id: 'D' + Date.now(),
            patientId,
            doctorName: "Dr. Bhoopendra Chaudhary",
            dischargeDate,
            diagnosis,
            summary,
            advisedMedicines
        };

        // Save to discharge_records
        let records = JSON.parse(localStorage.getItem('discharge_records') || '[]');
        records.push(dischargeData);
        localStorage.setItem('discharge_records', JSON.stringify(records));

        // Update patient status
        let patients = JSON.parse(localStorage.getItem('patients') || '[]');
        patients.forEach(p => {
            if (p.id === patientId || p.patient_id === patientId) {
                p.status = 'Discharged';
                p.discharge_date = dischargeDate;
            }
        });
        localStorage.setItem('patients', JSON.stringify(patients));

        if (window.allPatientsData) {
            window.allPatientsData.forEach(p => {
                if (p.id === patientId || p.patient_id === patientId) {
                    p.status = 'Discharged';
                    p.discharge_date = dischargeDate;
                }
            });
        }

        setTimeout(() => {
            hideLoading();
            showNotification('Patient discharged successfully!', 'success');
            displayDischargeReport(dischargeData);
        }, 1000);
    }
}

function displayDischargeReport(data) {
    document.getElementById('rpt-patient-id').textContent = document.getElementById('d-id').value;
    document.getElementById('rpt-patient-name').textContent = document.getElementById('d-name').value;
    document.getElementById('rpt-discharge-date').textContent = data.dischargeDate;
    document.getElementById('rpt-admission-date').textContent = document.getElementById('d-admit').value;

    document.getElementById('rpt-doctor').textContent = data.doctorName;
    document.getElementById('rpt-diagnosis').textContent = data.diagnosis;
    document.getElementById('rpt-summary').textContent = data.summary;

    document.getElementById('rpt-doctor-sign').textContent = data.doctorName;
    document.getElementById('rpt-sign-date').textContent = `Date: ${data.dischargeDate}`;

    const adf = document.getElementById('auto-date-field');
    const atf = document.getElementById('auto-time-field');
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

    const medTable = document.getElementById('rpt-med-table');
    const medTitle = document.getElementById('rpt-med-title');
    const medList = document.getElementById('rpt-med-list');

    if (data.advisedMedicines && data.advisedMedicines.length > 0) {
        medList.innerHTML = data.advisedMedicines.map(m => `
            <tr>
                <td style="padding:10px; border:1px solid #e2e8f0; color:#2d3748;">${m.name}</td>
                <td style="padding:10px; border:1px solid #e2e8f0; color:#2d3748;">${m.dose}</td>
                <td style="padding:10px; border:1px solid #e2e8f0; color:#2d3748;">${m.freq}</td>
                <td style="padding:10px; border:1px solid #e2e8f0; color:#2d3748;">${m.duration}</td>
            </tr>
        `).join('');
        medTable.style.display = 'table';
        medTitle.style.display = 'block';
    } else {
        medTable.style.display = 'none';
        medTitle.style.display = 'none';
    }

    // Attach Surgery Details Dynamically
    const surgerySection = document.getElementById('surgery-report-section');
    const surgeryList = document.getElementById('rpt-surgery-list');
    const allSurgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');
    const patientIdStr = document.getElementById('d-id').value;
    const patientSurgeries = allSurgeries.filter(s => String(s.patient_id) === String(patientIdStr));

    if (patientSurgeries && patientSurgeries.length > 0) {
        surgeryList.innerHTML = patientSurgeries.map(s => `
            <tr>
                <td style="padding:10px; border:1px solid #e2e8f0; color:#2d3748;">${s.surgeryName}</td>
                <td style="padding:10px; border:1px solid #e2e8f0; color:#2d3748;">${s.surgeonName}</td>
                <td style="padding:10px; border:1px solid #e2e8f0; color:#2d3748;">${s.surgeryDate}</td>
            </tr>
        `).join('');
        surgerySection.style.display = 'block';
    } else {
        surgerySection.style.display = 'none';
        surgeryList.innerHTML = '';
    }

    document.getElementById('discharge-form-wrap').style.display = 'none';
    document.getElementById('discharge-header-nav').style.display = 'none';
    document.getElementById('discharge-report-section').style.display = 'block';

    setTimeout(() => window.print(), 500);
}

function closeDischargeReport() {
    document.getElementById('discharge-report-section').style.display = 'none';
    document.getElementById('discharge-form-wrap').style.display = 'block';
    document.getElementById('discharge-header-nav').style.display = 'flex';

    document.getElementById('discharge-search-input').value = '';
    document.getElementById('discharge-patient').value = '';
    document.getElementById('discharge-info').style.display = 'none';
    document.getElementById('discharge-diagnosis').value = '';
    document.getElementById('discharge-summary').value = '';
    document.querySelector('#advised-med-table tbody').innerHTML = '';
    addMedicineRow();

    showModule('patients');
}