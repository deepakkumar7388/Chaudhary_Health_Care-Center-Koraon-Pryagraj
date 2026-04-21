// ==================== HOSPITAL REGISTER WORKFLOW ====================

let registerPatientsList = [];

function renderDailyNotes() {
    const moduleEl = document.getElementById('module-daily-notes');
    if (!moduleEl) return;

    // The entire UI is built as a realistic patient register
    moduleEl.innerHTML = `
        <div class="register-container">
            <!-- Header & Search -->
            <div class="register-header">
                <div class="header-left">
                    <h2><i class="fas fa-book-medical"></i> Clinical Patient Register</h2>
                </div>
                <div class="header-controls">
                    <div class="patient-selector">
                        <input type="text" id="patient-search-input" class="hms-select" placeholder="Search Patient by Name or ID" autocomplete="off" oninput="filterNotesPatients(this.value)" onclick="filterNotesPatients(this.value)">
                        <input type="hidden" id="register-patient">
                        <div id="patient-dropdown" class="autocomplete-dropdown" style="display:none;"></div>
                    </div>
                    <button id="btn-add-vitals" class="btn-add-observation" style="display:none;" onclick="openVitalsModal()">
                        <i class="fas fa-plus"></i> Add New Observation
                    </button>
                </div>
            </div>

            <!-- Content Area (Hidden until patient selected) -->
            <div id="register-content" style="display:none;">
                
                <!-- 1. VITALS REGISTER SECTION -->
                <div class="register-section">
                    <!-- History Table for Vitals -->
                    <div class="table-container register-table-container">
                        <table class="register-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Pulse</th>
                                    <th>BP</th>
                                    <th>Temp</th>
                                    <th>SpO2</th>
                                    <th>RBS</th>
                                    <th>Added By</th>
                                </tr>
                            </thead>
                            <tbody id="vitals-list">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <hr class="compact-divider">

                <!-- 2. MEDICATION MANAGEMENT SECTION -->
                <div class="register-section">
                    <div class="section-title compact-title">
                        <h3><i class="fas fa-pills"></i> Medication Schedule</h3>
                    </div>
                    
                    <!-- Medication Form (Hidden if not doctor) -->
                    <div id="medication-form-container">
                        <form id="medication-form" class="register-form doctor-only" onsubmit="event.preventDefault(); addMedicationEntry();">
                            <div class="form-row compact-row">
                                <div class="input-group">
                                    <label>Prescribe Date</label>
                                    <input type="date" id="med-date" required class="compact-input">
                                </div>
                                <div class="input-group">
                                    <label>Schedule Time</label>
                                    <input type="time" id="med-time" required class="compact-input">
                                </div>
                                <div class="input-group">
                                    <label>Type</label>
                                    <select id="med-type" class="compact-input">
                                        <option value="Injection">Injection</option>
                                        <option value="Tablet">Tablet</option>
                                        <option value="Syrup">Syrup</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div class="input-group flex-2">
                                    <label>Drug Name</label>
                                    <input type="text" id="med-name" placeholder="E.g. Monocef" required class="compact-input">
                                </div>
                                <div class="input-group">
                                    <label>Dose</label>
                                    <input type="text" id="med-dose" placeholder="1g / 500mg" required class="compact-input">
                                </div>
                                <div class="input-group btn-group align-bottom">
                                    <button type="submit" class="btn-prescribe"><i class="fas fa-prescription"></i> Prescribe</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- History Table for Medications -->
                    <div class="table-container register-table-container">
                        <table class="register-table med-table">
                            <thead>
                                <tr>
                                    <th>Scheduled Date</th>
                                    <th>Time</th>
                                    <th>Medication (Type)</th>
                                    <th>Dose</th>
                                    <th>Prescribed By</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                    <th>Done Details</th>
                                </tr>
                            </thead>
                            <tbody id="medication-list">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>

        <!-- Add Vitals Modal -->
        <div id="vitals-modal" class="modal" style="display: none;">
            <div class="modal-content vitals-modal-content">
                <div class="modal-header compact-modal-header">
                    <h3><i class="fas fa-heartbeat"></i> Add Observation</h3>
                    <button class="modal-close" onclick="closeVitalsModal()">&times;</button>
                </div>
                <div class="modal-body compact-modal-body">
                    <form id="vitals-form" class="compact-form" onsubmit="event.preventDefault(); addVitalsEntry();">
                        <div class="form-grid-2">
                            <div class="input-group">
                                <label>Date</label>
                                <input type="date" id="vitals-date" required class="compact-input">
                            </div>
                            <div class="input-group">
                                <label>Time</label>
                                <input type="time" id="vitals-time" required class="compact-input">
                            </div>
                        </div>
                        <div class="form-grid-2 mt-2">
                            <div class="input-group">
                                <label>Pulse (/min)</label>
                                <input type="number" id="vitals-pulse" placeholder="72" class="compact-input">
                            </div>
                            <div class="input-group">
                                <label>BP (mmHg)</label>
                                <input type="text" id="vitals-bp" placeholder="120/80" class="compact-input">
                            </div>
                            <div class="input-group">
                                <label>Temp (°F)</label>
                                <input type="number" step="0.1" id="vitals-temp" placeholder="98.6" class="compact-input">
                            </div>
                            <div class="input-group">
                                <label>SpO2 (%)</label>
                                <input type="number" id="vitals-spo2" placeholder="98" class="compact-input">
                            </div>
                            <div class="input-group">
                                <label>RBS (mg/dL)</label>
                                <input type="number" id="vitals-rbs" placeholder="110" class="compact-input">
                            </div>
                        </div>
                        <div class="modal-actions mt-3">
                            <button type="button" class="btn-cancel" onclick="closeVitalsModal()">Cancel</button>
                            <button type="submit" class="btn-submit-vitals">Add Entry</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Confirmation Modal for Marking Dose -->
        <div id="dose-confirm-modal" class="modal" style="display: none;">
            <div class="modal-content small-modal">
                <div class="modal-header">
                    <h3>Confirm Dose</h3>
                    <button class="modal-close" onclick="closeDoseConfirmModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to mark this medication as Given?</p>
                    <p id="dose-confirm-details" style="font-weight: bold; margin-top: 10px;"></p>
                </div>
                <div class="modal-actions">
                    <button class="btn-confirm-dose" id="btn-confirm-dose-yes">Yes, Mark as Given</button>
                    <button class="btn-cancel" onclick="closeDoseConfirmModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;

    // Load necessary initial data
    loadPatientsForRegister();
    applyRoleBasedUI();
    setDefaultDateTimes();

    // Close dropdown on outside click
    if (!window.vitalsDropdownListenerAdded) {
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('patient-dropdown');
            const input = document.getElementById('patient-search-input');
            if (dropdown && input && e.target !== input && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        window.vitalsDropdownListenerAdded = true;
    }
}

/**
 * Utility: Set current date and time in the input forms
 */
function setDefaultDateTimes() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const timeString = today.toTimeString().split(' ')[0].slice(0, 5);

    const vitalsDate = document.getElementById('vitals-date');
    const vitalsTime = document.getElementById('vitals-time');
    const medDate = document.getElementById('med-date');
    const medTime = document.getElementById('med-time');

    if (vitalsDate) vitalsDate.value = dateString;
    if (vitalsTime) vitalsTime.value = timeString;
    if (medDate) medDate.value = dateString;
    if (medTime) medTime.value = timeString;
}

/**
 * UI Setup: Apply role-based visibility rules
 */
function applyRoleBasedUI() {
    // currentUser is globally available from main.js
    const medFormContainer = document.getElementById('medication-form-container');
    if (!medFormContainer) return;

    if (currentUser && currentUser.role !== 'doctor' && currentUser.role !== 'admin') {
        medFormContainer.style.display = 'none'; // Only doctors (and admin for demo) can prescribe
    } else {
        medFormContainer.style.display = 'block';
    }
}

/**
 * Data Loading: Load patients from local storage for autocomplete
 */
function loadPatientsForRegister() {
    try {
        const stored = JSON.parse(localStorage.getItem('patients') || '[]');
        registerPatientsList = stored;
    } catch (e) {
        console.error("Error reading patients array from localStorage");
        registerPatientsList = [];
    }
}

/**
 * Filter autocomplete suggestions based on input
 */
function filterNotesPatients(query) {
    const dropdown = document.getElementById('patient-dropdown');
    if (!dropdown) return;

    const lowerQuery = (query || '').toLowerCase();
    
    // Filter by name or ID
    const filtered = registerPatientsList.filter(p => {
        const id = (p.patient_id || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return id.includes(lowerQuery) || name.includes(lowerQuery);
    });

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item empty">No patient found</div>';
    } else {
        dropdown.innerHTML = filtered.map(p => {
            const id = p.patient_id;
            return `<div class="autocomplete-item" onclick="selectPatientForRegister('${id}', '${p.name.replace(/'/g, "\\'")}')">
                        <div class="patient-name">${p.name}</div>
                        <div class="patient-id">${id}</div>
                    </div>`;
        }).join('');
    }
    
    dropdown.style.display = 'block';
}

/**
 * Handle making a selection from autocomplete
 */
function selectPatientForRegister(id, name) {
    const searchInput = document.getElementById('patient-search-input');
    const hiddenInput = document.getElementById('register-patient');
    const dropdown = document.getElementById('patient-dropdown');
    
    searchInput.value = `${name} | ${id}`;
    hiddenInput.value = id;
    dropdown.style.display = 'none';
    
    loadPatientRegister(); // Load actual records
}

/**
 * UI Action: Triggered when a patient is selected from the dropdown
 */
function loadPatientRegister() {
    const patientId = document.getElementById('register-patient').value;
    const contentArea = document.getElementById('register-content');
    const btnAddVitals = document.getElementById('btn-add-vitals');

    if (!patientId) {
        contentArea.style.display = 'none';
        if (btnAddVitals) btnAddVitals.style.display = 'none';
        return;
    }

    contentArea.style.display = 'block';
    if (btnAddVitals) btnAddVitals.style.display = 'flex';
    setDefaultDateTimes();
    loadPatientHistory(patientId);
}

/**
 * Load observation and medication history for the selected patient
 */
function loadPatientHistory(patientId) {
    loadVitalsHistory(patientId);
    loadMedicationHistory(patientId);
}

// ==================== VITALS REGISTER ====================

function addVitalsEntry() {
    const patientId = document.getElementById('register-patient').value;
    if (!patientId) {
        showNotification("Please select a patient first.", "error");
        return;
    }

    const entry = {
        id: 'V' + Date.now(),
        patientId: patientId,
        date: document.getElementById('vitals-date').value,
        time: document.getElementById('vitals-time').value,
        pulse: document.getElementById('vitals-pulse').value,
        bp: document.getElementById('vitals-bp').value,
        temp: document.getElementById('vitals-temp').value,
        spo2: document.getElementById('vitals-spo2').value,
        rbs: document.getElementById('vitals-rbs').value,
        addedBy: currentUser ? currentUser.name : 'Unknown User',
        timestamp: new Date().toISOString()
    };

    let allVitals = JSON.parse(localStorage.getItem('vitals_register') || '[]');
    allVitals.push(entry);
    localStorage.setItem('vitals_register', JSON.stringify(allVitals));

    document.getElementById('vitals-form').reset();
    setDefaultDateTimes(); // Re-apply today's default
    closeVitalsModal();
    showNotification("Observation added successfully.", "success");

    loadVitalsHistory(patientId);
}

function openVitalsModal() {
    document.getElementById('vitals-modal').style.display = 'flex';
    setDefaultDateTimes();
}

function closeVitalsModal() {
    document.getElementById('vitals-modal').style.display = 'none';
}

function loadVitalsHistory(patientId) {
    const allVitals = JSON.parse(localStorage.getItem('vitals_register') || '[]');
    // Filter for selected patient and sort chronologically (oldest to newest, like a paper register)
    const patientVitals = allVitals
        .filter(v => v.patientId === patientId)
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });

    const tbody = document.getElementById('vitals-list');
    tbody.innerHTML = '';

    if (patientVitals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center empty-message" style="padding: 20px;">No observations recorded yet.</td></tr>';
        return;
    }

    patientVitals.forEach(v => {
        const tr = document.createElement('tr');
        
        // Highlight abnormal values logic
        const pulse = parseFloat(v.pulse);
        const temp = parseFloat(v.temp);
        const spo2 = parseFloat(v.spo2);
        
        let pulseClass = (pulse > 100 || pulse < 60) ? 'abnormal-value' : '';
        let tempClass = (temp > 99.1 || temp < 97) ? 'abnormal-value' : '';
        let spo2Class = (spo2 < 95) ? 'abnormal-value text-danger' : '';

        tr.innerHTML = `
            <td class="col-date">${v.date}</td>
            <td class="col-time">${v.time}</td>
            <td class="${pulseClass}">${v.pulse || '-'}</td>
            <td>${v.bp || '-'}</td>
            <td class="${tempClass}">${v.temp || '-'}</td>
            <td class="${spo2Class}">${v.spo2 || '-'}</td>
            <td>${v.rbs || '-'}</td>
            <td><span class="added-by-text">${v.addedBy}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== MEDICATION SCHEDULE ====================

function addMedicationEntry() {
    const patientId = document.getElementById('register-patient').value;
    if (!patientId) {
        showNotification("Please select a patient first.", "error");
        return;
    }

    const entry = {
        id: 'M' + Date.now(),
        patientId: patientId,
        date: document.getElementById('med-date').value,
        time: document.getElementById('med-time').value,
        type: document.getElementById('med-type').value,
        drugName: document.getElementById('med-name').value,
        dose: document.getElementById('med-dose').value,
        prescribedBy: currentUser ? currentUser.name : 'Doctor',
        status: 'Pending',
        doneBy: null,
        doneTime: null,
        timestamp: new Date().toISOString()
    };

    let allMeds = JSON.parse(localStorage.getItem('medication_register') || '[]');
    allMeds.push(entry);
    localStorage.setItem('medication_register', JSON.stringify(allMeds));

    document.getElementById('medication-form').reset();
    setDefaultDateTimes();
    showNotification("Medication prescribed successfully.", "success");

    loadMedicationHistory(patientId);
}

function loadMedicationHistory(patientId) {
    const allMeds = JSON.parse(localStorage.getItem('medication_register') || '[]');
    // Chronological sort
    const patientMeds = allMeds
        .filter(m => m.patientId === patientId)
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });

    const tbody = document.getElementById('medication-list');
    tbody.innerHTML = '';

    if (patientMeds.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center empty-message">No medications prescribed yet.</td></tr>';
        return;
    }

    patientMeds.forEach(m => {
        const tr = document.createElement('tr');

        const isPending = m.status === 'Pending';
        const statusBadgeClass = isPending ? 'badge-pending' : 'badge-given';

        // Disable mark done button if already given
        const actButton = isPending
            ? `<button class="btn-mark-done" onclick="promptMarkDose('${m.id}')"><i class="fas fa-check-circle"></i> Mark Given</button>`
            : `<span class="text-success"><i class="fas fa-check-double"></i> Done</span>`;

        const doneDetails = isPending
            ? '-'
            : `<small>${m.doneBy}<br>${m.doneTime}</small>`;

        tr.innerHTML = `
            <td>${m.date}</td>
            <td>${m.time}</td>
            <td>
                <span style="font-weight:bold; color:#2d3748;">${m.drugName}</span><br>
                <small style="color:#718096; font-style:italic;">(${m.type || 'Medicine'})</small>
            </td>
            <td>${m.dose}</td>
            <td><span class="staff-badge doc-badge">${m.prescribedBy}</span></td>
            <td><span class="status-badge ${statusBadgeClass}">${m.status}</span></td>
            <td>${actButton}</td>
            <td>${doneDetails}</td>
        `;
        tbody.appendChild(tr);
    });
}

let doseToConfirm = null;

function promptMarkDose(medId) {
    doseToConfirm = medId;
    const allMeds = JSON.parse(localStorage.getItem('medication_register') || '[]');
    const med = allMeds.find(m => m.id === medId);

    if (!med) return;

    const detailsEl = document.getElementById('dose-confirm-details');
    detailsEl.innerHTML = `Drug: ${med.drugName} (${med.dose}) <br> Time: ${med.date} ${med.time}`;

    const btnConfirm = document.getElementById('btn-confirm-dose-yes');
    btnConfirm.onclick = function () {
        confirmMarkDose();
    };

    document.getElementById('dose-confirm-modal').style.display = 'flex';
}

function closeDoseConfirmModal() {
    document.getElementById('dose-confirm-modal').style.display = 'none';
    doseToConfirm = null;
}

function confirmMarkDose() {
    if (!doseToConfirm) return;

    let allMeds = JSON.parse(localStorage.getItem('medication_register') || '[]');
    const medIndex = allMeds.findIndex(m => m.id === doseToConfirm);

    if (medIndex > -1) {
        // Prevent double dose logic
        if (allMeds[medIndex].status === 'Given') {
            showNotification("Medication has already been marked as Given.", "error");
        } else {
            allMeds[medIndex].status = 'Given';
            allMeds[medIndex].doneBy = currentUser ? currentUser.name : 'Unknown User';

            // Format nice human-readable time for when it was given
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            allMeds[medIndex].doneTime = `${now.toISOString().split('T')[0]} ${timeString}`;

            localStorage.setItem('medication_register', JSON.stringify(allMeds));

            showNotification("Medication marked as given successfully.", "success");

            // Reload the table
            const patientId = document.getElementById('register-patient').value;
            loadMedicationHistory(patientId);
        }
    }

    closeDoseConfirmModal();
}