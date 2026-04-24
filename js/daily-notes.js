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
        document.addEventListener('click', function (e) {
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
async function loadPatientsForRegister() {
    try {
        const response = await fetch(`${API_BASE}patients`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();
        if (result.success) {
            registerPatientsList = result.patients;
        } else {
            registerPatientsList = JSON.parse(localStorage.getItem('patients') || '[]');
        }
    } catch (e) {
        console.error("Error loading patients from API", e);
        registerPatientsList = JSON.parse(localStorage.getItem('patients') || '[]');
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

let currentMedsList = []; // Global to store loaded meds for easy access

async function loadPatientHistory(patientId) {
    try {
        const response = await fetch(`${API_BASE}notes/${patientId}`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();
        if (result.success) {
            const vitals = result.notes.filter(n => n.type === 'vitals');
            const meds = result.notes.filter(n => n.type === 'medication');
            currentMedsList = meds; // Store for marking done
            renderVitalsTable(vitals);
            renderMedicationTable(meds);
        }
    } catch (err) {
        console.error("Error loading patient history:", err);
    }
}

// ... (renderVitalsTable remains same)

function renderMedicationTable(meds) {
    const tbody = document.getElementById('medication-list');
    tbody.innerHTML = '';
    if (meds.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center empty-message">No medications prescribed yet.</td></tr>';
        return;
    }
    meds.forEach(m => {
        const tr = document.createElement('tr');
        const isPending = m.status === 'Pending';
        const statusBadgeClass = isPending ? 'badge-pending' : 'badge-given';
        const actButton = isPending
            ? `<button class="btn-mark-done" onclick="promptMarkDose('${m._id}')"><i class="fas fa-check-circle"></i> Mark Given</button>`
            : `<span class="text-success"><i class="fas fa-check-double"></i> Done</span>`;
        const doneDetails = isPending ? '-' : `<small>${m.doneBy}<br>${m.doneTime}</small>`;
        tr.innerHTML = `
            <td>${m.date}</td>
            <td>${m.time}</td>
            <td><span style="font-weight:bold; color:#2d3748;">${m.drugName}</span><br><small style="color:#718096; font-style:italic;">(${m.medType || 'Medicine'})</small></td>
            <td>${m.dose}</td>
            <td><span class="staff-badge doc-badge">${m.addedBy}</span></td>
            <td><span class="status-badge ${statusBadgeClass}">${m.status}</span></td>
            <td>${actButton}</td>
            <td>${doneDetails}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ... (vitals and medication add functions remain same)

let doseToConfirm = null;

function promptMarkDose(medId) {
    doseToConfirm = medId;
    const med = currentMedsList.find(m => m._id === medId);

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
async function confirmMarkDose() {
    if (!doseToConfirm) return;

    const patientId = document.getElementById('register-patient').value;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const doneTime = `${now.toISOString().split('T')[0]} ${timeString}`;

    try {
        const response = await fetch(`${API_BASE}notes/${doseToConfirm}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify({
                status: 'Given',
                doneBy: currentUser ? currentUser.name : 'Staff',
                doneTime: doneTime
            })
        });
        const result = await response.json();
        if (result.success) {
            showNotification("Medication marked as given successfully.", "success");
            loadPatientHistory(patientId);
        }
    } catch (err) {
        console.error(err);
    }

    closeDoseConfirmModal();
}