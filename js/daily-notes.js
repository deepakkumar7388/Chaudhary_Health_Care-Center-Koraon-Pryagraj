// ==================== HOSPITAL REGISTER WORKFLOW ====================

let registerPatientsList = [];

function renderDailyNotes() {
    const moduleEl = document.getElementById('module-daily-notes');
    if (!moduleEl) return;

    // Daily Notes Layout with Top Search Bar & Patient Grid
    moduleEl.innerHTML = `
        <div class="daily-notes-wrapper">
            <!-- Top Search & Header Bar -->
            <div class="dn-top-bar">
                <div>
                    <h2 style="font-size:18px; font-weight:800; color:var(--text-main); margin:0; display:flex; align-items:center; gap:8px;">
                        <i class="bi bi-journal-medical" style="color:var(--primary);"></i> Clinical Patient Register
                    </h2>
                </div>

                <!-- Top Search Input -->
                <div class="dn-search-wrapper">
                    <i class="bi bi-search dn-search-icon"></i>
                    <input type="text" id="daily-notes-search" class="dn-search-input" placeholder="Search patient by Name, ID, Bed, Ward..." oninput="onSearchDailyNotesPatients(this.value)">
                    <button id="dn-clear-search-btn" class="dn-clear-btn" onclick="clearDailyNotesSearch()" style="display:none;">&times;</button>
                </div>

                <div>
                    <span id="dn-patient-count-badge" style="background:rgba(79,70,229,0.08); color:var(--primary); font-size:12px; font-weight:700; padding:6px 14px; border-radius:20px; border:1px solid rgba(79,70,229,0.15);">0 Admitted Patients</span>
                </div>
            </div>

            <!-- VIEW 1: Visible Admitted Patients Grid -->
            <div id="dn-patient-grid-view">
                <!-- Empty State when no IPD patients admitted -->
                <div id="register-empty-ipd" style="display:none; text-align:center; padding:60px 20px; background:var(--card-bg); border-radius:18px; border:1px solid var(--border);">
                    <div style="width:56px; height:56px; border-radius:50%; background:rgba(79,70,229,0.08); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:26px; margin:0 auto 12px auto;">
                        <i class="bi bi-hospital"></i>
                    </div>
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-main); margin-bottom:4px;">No Admitted In-Patients</h3>
                    <p style="font-size:12.5px; color:var(--text-muted); max-width:400px; margin:0 auto 16px auto;">Daily clinical notes and medication charts are maintained for active admitted patients.</p>
                    <button class="btn btn-primary btn-sm" onclick="showModule('add-patient')">
                        <i class="bi bi-person-plus-fill"></i> New IPD Admission
                    </button>
                </div>

                <div id="dn-patients-list" class="dn-patients-list">
                    <!-- Populated dynamically with patient list items -->
                </div>
            </div>

            <!-- VIEW 2: Selected Patient Detail & Treatment Chart -->
            <div id="dn-patient-chart-view" class="dn-chart-container" style="display:none;">
                <!-- Header with Back Button & Details -->
                <div class="dn-chart-header">
                    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <button class="btn-back-to-patients" onclick="backToDailyNotesPatientsList()">
                            <i class="bi bi-arrow-left"></i> All Patients List
                        </button>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div id="chart-patient-avatar" class="dn-patient-avatar" style="width:38px; height:38px; font-size:14px;">P</div>
                            <div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <h3 id="chart-patient-name" style="margin:0; font-size:16px; font-weight:800; color:var(--text-main);">Patient Name</h3>
                                    <span class="badge-ipd">● IPD Admitted</span>
                                </div>
                                <div id="chart-patient-meta" style="font-size:11.5px; color:var(--text-muted); margin-top:2px; font-weight:500;">
                                    ID: CHC-001 | Male, 45 yrs | Bed: 04
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button id="btn-add-vitals" class="btn btn-primary" style="background:var(--primary); color:#fff; border:none; padding:8px 16px; border-radius:10px; font-weight:700; font-size:12.5px; cursor:pointer; display:flex; align-items:center; gap:6px;" onclick="openVitalsModal()">
                            <i class="bi bi-plus-lg"></i> Add Observation
                        </button>
                    </div>
                </div>

                <input type="hidden" id="register-patient">

                <!-- Content Area -->
                <div id="register-content">
                
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
                                    <th>Urine (ml)</th>
                                    <th>Drain (ml)</th>
                                    <th>Pain Score</th>
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
                        <h3><i class="bi bi-capsule"></i> Medication Schedule</h3>
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
                                    <button type="submit" class="btn-prescribe"><i class="bi bi-file-earmark-medical"></i> Prescribe</button>
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
                    <h3><i class="bi bi-activity"></i> Add Observation</h3>
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
                            <div class="input-group">
                                <label>Urine Output (ml)</label>
                                <input type="number" id="vitals-urine" placeholder="Optional" class="compact-input">
                            </div>
                            <div class="input-group">
                                <label>Drain Output (ml)</label>
                                <input type="number" id="vitals-drain" placeholder="Optional" class="compact-input">
                            </div>
                            <div class="input-group">
                                <label>Pain Score (1-10)</label>
                                <input type="number" min="1" max="10" id="vitals-pain" placeholder="Optional" class="compact-input">
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
        </div>
    `;

    // Load necessary initial data
    loadPatientsForRegister().then(() => {
        restoreDailyNotesDraft();
    });
    applyRoleBasedUI();
    setDefaultDateTimes();
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

    if (currentUser && currentUser.role !== 'doctor' && currentUser.role !== 'admin' && currentUser.role !== 'developer') {
        medFormContainer.style.display = 'none'; // Only doctors (and admin for demo) can prescribe
    } else {
        medFormContainer.style.display = 'block';
    }
}

/**
 * Data Loading: Load patients from local storage or API and render patient directory grid
 */
async function loadPatientsForRegister() {
    // Step 1: Memory se instant load
    if (window.allPatientsData && window.allPatientsData.length > 0) {
        registerPatientsList = window.allPatientsData;
        renderDailyNotesPatientGrid(activeDailyNotesSearchQuery);
        return;
    }

    // Step 2: localStorage cache se load karo
    const cached = localStorage.getItem('patients');
    if (cached) {
        try {
            const list = JSON.parse(cached);
            if (list.length > 0) {
                registerPatientsList = list;
                window.allPatientsData = list;
                renderDailyNotesPatientGrid(activeDailyNotesSearchQuery);
                return;
            }
        } catch (e) { /* cache invalid */ }
    }

    // Step 3: Server API se fetch karo
    try {
        const response = await fetch(`${API_BASE}patients`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') },
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            registerPatientsList = result.patients;
            window.allPatientsData = result.patients;
            localStorage.setItem('patients', JSON.stringify(result.patients));
        }
    } catch (e) {
        console.error("Error loading patients from API", e);
        registerPatientsList = JSON.parse(localStorage.getItem('patients') || '[]');
    }

    renderDailyNotesPatientGrid(activeDailyNotesSearchQuery);
}

let activeDailyNotesSearchQuery = '';

/**
 * Render all admitted patients in a clean visible card grid
 */
function renderDailyNotesPatientGrid(query = '') {
    const gridEl = document.getElementById('dn-patients-list');
    const badgeEl = document.getElementById('dn-patient-count-badge');
    const emptyBox = document.getElementById('register-empty-ipd');
    if (!gridEl) return;

    // Filter active admitted IPD patients strictly (exclude OPD and Discharged)
    const allAdmitted = registerPatientsList.filter(p => {
        const type = (p.patient_type || '').toUpperCase();
        const status = (p.status || '').toUpperCase();
        const isNotOpd = type !== 'OPD';
        const isAdmitted = status === 'ADMITTED';
        return isNotOpd && isAdmitted;
    });
    if (badgeEl) badgeEl.textContent = `${allAdmitted.length} Admitted Patients`;

    if (allAdmitted.length === 0) {
        gridEl.innerHTML = '';
        if (emptyBox) emptyBox.style.display = 'block';
        return;
    }

    if (emptyBox) emptyBox.style.display = 'none';

    const q = (query || '').trim().toLowerCase();
    const filtered = allAdmitted.filter(p => {
        if (!q) return true;
        const name = (p.name || '').toLowerCase();
        const id = (p.patient_id || '').toLowerCase();
        const bed = (p.bed_number || '').toString().toLowerCase();
        const ward = (p.ward || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const doc = (p.doctor || '').toLowerCase();
        return name.includes(q) || id.includes(q) || bed.includes(q) || ward.includes(q) || phone.includes(q) || doc.includes(q);
    });

    if (filtered.length === 0) {
        gridEl.innerHTML = `
            <div style="text-align:center; padding:50px 20px; background:var(--card-bg); border-radius:16px; border:1px dashed var(--border);">
                <i class="bi bi-search" style="font-size:24px; color:var(--text-muted); display:block; margin-bottom:8px;"></i>
                <h4 style="font-size:15px; font-weight:700; color:var(--text-main); margin-bottom:4px;">No Matching Patients</h4>
                <p style="font-size:12px; color:var(--text-muted); margin:0;">No admitted patients match "<strong>${escapeHtml(query)}</strong>"</p>
            </div>
        `;
        return;
    }

    gridEl.innerHTML = `
        <div class="dn-table-card">
            <table class="dn-patients-table">
                <thead>
                    <tr>
                        <th>Patient</th>
                        <th>Age / Gender</th>
                        <th>Ward & Bed</th>
                        <th>Doctor</th>
                        <th>Status</th>
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => {
                        const bedInfo = p.bed_number ? `Bed: ${p.bed_number}` : (p.ward ? p.ward : 'General Ward');
                        const ageGen = [p.age ? `${p.age} yrs` : '', p.gender].filter(Boolean).join(' / ');
                        const docName = p.doctor || 'Duty Doctor';

                        return `
                        <tr onclick="openPatientRegister('${p.patient_id}')" style="cursor:pointer;">
                            <td data-label="Patient">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <strong style="font-size:14px; color:var(--text-main); font-weight:700;">${escapeHtml(p.name)}</strong>
                                    <span style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-size:10px; padding:1px 6px; border-radius:4px; font-weight:700;">IPD</span>
                                </div>
                                <div style="font-size:11.5px; color:#64748b; font-weight:600; margin-top:2px;">${p.patient_id}</div>
                            </td>
                            <td data-label="Age / Gender" style="font-weight:600; color:var(--text-main); font-size:13px;">
                                ${ageGen || '—'}
                            </td>
                            <td data-label="Ward & Bed">
                                <span style="display:inline-flex; align-items:center; gap:6px; font-weight:600; font-size:13px; color:var(--text-main);">
                                    <i class="bi bi-hospital" style="color:var(--primary); font-size:13px;"></i> ${escapeHtml(bedInfo)}
                                </span>
                            </td>
                            <td data-label="Doctor" style="font-size:13px; font-weight:600; color:var(--text-main);">
                                ${escapeHtml(docName)}
                            </td>
                            <td data-label="Status">
                                <span style="display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:6px; background:#ecfdf5; color:#059669; border:1px solid #a7f3d0;">
                                    <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span> Admitted
                                </span>
                            </td>
                            <td data-label="Actions" style="text-align:right;">
                                <button class="btn btn-sm btn-primary" type="button" style="padding:6px 14px; font-size:12px; border-radius:8px; gap:6px;" onclick="event.stopPropagation(); openPatientRegister('${p.patient_id}')">
                                    <i class="bi bi-journal-text"></i> Open Notes
                                </button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Handle live search typing on top bar
 */
function onSearchDailyNotesPatients(val) {
    activeDailyNotesSearchQuery = val;
    const clearBtn = document.getElementById('dn-clear-search-btn');
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

    // If currently inside chart view, switch back to grid view so user sees filtered search results
    const gridView = document.getElementById('dn-patient-grid-view');
    const chartView = document.getElementById('dn-patient-chart-view');
    if (gridView && chartView && chartView.style.display !== 'none') {
        chartView.style.display = 'none';
        gridView.style.display = 'block';
    }

    renderDailyNotesPatientGrid(val);
}

/**
 * Clear top search box
 */
function clearDailyNotesSearch() {
    const input = document.getElementById('daily-notes-search');
    if (input) input.value = '';
    activeDailyNotesSearchQuery = '';
    const clearBtn = document.getElementById('dn-clear-search-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    renderDailyNotesPatientGrid('');
}

/**
 * Open Clinical Register and Treatment Chart for a selected patient
 */
function openPatientRegister(patientId) {
    const gridView = document.getElementById('dn-patient-grid-view');
    const chartView = document.getElementById('dn-patient-chart-view');
    const hiddenInput = document.getElementById('register-patient');

    if (hiddenInput) hiddenInput.value = patientId;

    if (gridView && chartView) {
        gridView.style.display = 'none';
        chartView.style.display = 'block';
    }

    const patient = registerPatientsList.find(p => p.patient_id === patientId);
    if (patient) {
        const pName = document.getElementById('chart-patient-name');
        const pMeta = document.getElementById('chart-patient-meta');
        const pAvatar = document.getElementById('chart-patient-avatar');

        if (pName) pName.textContent = patient.name;
        if (pMeta) {
            const ageGen = [patient.gender, patient.age ? `${patient.age} yrs` : ''].filter(Boolean).join(', ');
            const bed = patient.bed_number ? `Bed: ${patient.bed_number}` : (patient.ward ? `Ward: ${patient.ward}` : 'General Ward');
            pMeta.textContent = `ID: ${patient.patient_id} | ${ageGen || 'IPD'} | ${bed}`;
        }
        if (pAvatar) pAvatar.textContent = (patient.name || 'P').trim()[0].toUpperCase();
    }

    setDefaultDateTimes();
    loadPatientHistory(patientId);
}

/**
 * Back from chart view to all patients grid list
 */
function backToDailyNotesPatientsList() {
    const gridView = document.getElementById('dn-patient-grid-view');
    const chartView = document.getElementById('dn-patient-chart-view');
    if (gridView && chartView) {
        chartView.style.display = 'none';
        gridView.style.display = 'block';
    }
}

/**
 * Helper to escape HTML strings
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

function renderVitalsTable(vitals) {
    const tbody = document.getElementById('vitals-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (vitals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center empty-message">No observations recorded yet.</td></tr>';
        return;
    }
    vitals.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    vitals.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${v.date}</td>
            <td>${v.time}</td>
            <td style="font-weight:bold;">${v.pulse || '-'}</td>
            <td>${v.bp || '-'}</td>
            <td>${v.temp || '-'}</td>
            <td>${v.spo2 || '-'}</td>
            <td>${v.rbs || '-'}</td>
            <td>${v.urineOutput || '-'}</td>
            <td>${v.drainOutput || '-'}</td>
            <td>${v.painScore || '-'}</td>
            <td><span class="added-by-text">${v.addedBy}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMedicationTable(meds) {
    const tbody = document.getElementById('medication-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (meds.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center empty-message">No medications prescribed yet.</td></tr>';
        return;
    }
    meds.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    meds.forEach(m => {
        const tr = document.createElement('tr');
        const isPending = m.status === 'Pending';
        const statusBadgeClass = isPending ? 'badge-pending' : 'badge-given';
        const actButton = isPending
            ? `<button class="btn-mark-done" onclick="promptMarkDose('${m._id}')"><i class="bi bi-check-circle"></i> Mark Given</button>`
            : `<span class="text-success" style="font-weight:700;"><i class="bi bi-check-all"></i> Done</span>`;
        const doneDetails = isPending ? '-' : `<small style="font-size:11px; color:var(--text-muted);">${m.doneBy}<br>${m.doneTime}</small>`;
        tr.innerHTML = `
            <td>${m.date}</td>
            <td>${m.time}</td>
            <td><span style="font-weight:bold; color:var(--text-main);">${m.drugName}</span><br><small style="color:var(--text-muted); font-style:italic;">(${m.medType || 'Medicine'})</small></td>
            <td>${m.dose}</td>
            <td><span class="doc-badge">${m.addedBy}</span></td>
            <td><span class="status-badge ${statusBadgeClass}">${m.status}</span></td>
            <td>${actButton}</td>
            <td>${doneDetails}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function addVitalsEntry() {
    const patientId = document.getElementById('register-patient').value;
    const date = document.getElementById('vitals-date').value;
    const time = document.getElementById('vitals-time').value;
    const pulse = document.getElementById('vitals-pulse').value;
    const bp = document.getElementById('vitals-bp').value;
    const temp = document.getElementById('vitals-temp').value;
    const spo2 = document.getElementById('vitals-spo2').value;
    const rbs = document.getElementById('vitals-rbs').value;
    const urineOutput = document.getElementById('vitals-urine').value;
    const drainOutput = document.getElementById('vitals-drain').value;
    const painScore = document.getElementById('vitals-pain').value;

    if (!patientId || !date || !time) return;

    showLoading('Recording observation...');
    try {
        const response = await fetch(`${API_BASE}notes/${patientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify({
                patient_id: patientId,
                type: 'vitals',
                date, time, pulse, bp, temp, spo2, rbs, urineOutput, drainOutput, painScore,
                addedBy: currentUser ? currentUser.name : 'Staff'
            })
        });
        const result = await response.json();
        if (result.success) {
            showNotification("Observation added successfully.", "success");
            closeVitalsModal();
            loadPatientHistory(patientId);
            document.getElementById('vitals-form').reset();
        } else {
            showNotification("Error: " + (result.message || result.error || "Unknown error"), "error");
        }
    } catch (err) {
        console.error(err);
        showNotification("Connection Error: " + err.message, "error");
    } finally {
        hideLoading();
    }
}

async function addMedicationEntry() {
    const patientId = document.getElementById('register-patient').value;
    const date = document.getElementById('med-date').value;
    const time = document.getElementById('med-time').value;
    const drugName = document.getElementById('med-name').value;
    const medType = document.getElementById('med-type').value;
    const dose = document.getElementById('med-dose').value;

    if (!patientId || !date || !time || !drugName) return;

    showLoading('Prescribing medication...');
    try {
        const response = await fetch(`${API_BASE}notes/${patientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify({
                patient_id: patientId,
                type: 'medication',
                date, time, drugName, medType, dose,
                status: 'Pending',
                addedBy: currentUser ? currentUser.name : 'Doctor'
            })
        });
        const result = await response.json();
        if (result.success) {
            showNotification("Medication prescribed successfully.", "success");
            loadPatientHistory(patientId);
            document.getElementById('medication-form').reset();
            setDefaultDateTimes();
        } else {
            showNotification("Error: " + (result.message || result.error || "Unknown error"), "error");
        }
    } catch (err) {
        console.error(err);
        showNotification("Connection Error: " + err.message, "error");
    } finally {
        hideLoading();
    }
}

function openVitalsModal() {
    document.getElementById('vitals-modal').style.display = 'flex';
    setDefaultDateTimes();
}

function closeVitalsModal() {
    document.getElementById('vitals-modal').style.display = 'none';
}


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

function saveDailyNotesDraft() {
    const patientId = document.getElementById('register-patient')?.value || '';
    const patientSearch = document.getElementById('patient-search-input')?.value || '';
    
    const medName = document.getElementById('med-name')?.value || '';
    const medDose = document.getElementById('med-dose')?.value || '';
    const medType = document.getElementById('med-type')?.value || 'Injection';
    
    const draft = { patientId, patientSearch, medName, medDose, medType };
    sessionStorage.setItem('dailyNotesDraft', JSON.stringify(draft));
}

function restoreDailyNotesDraft() {
    const draftStr = sessionStorage.getItem('dailyNotesDraft');
    if (!draftStr) return;

    try {
        const draft = JSON.parse(draftStr);
        if (!draft.patientId) return;

        const searchInput = document.getElementById('patient-search-input');
        const hiddenInput = document.getElementById('register-patient');
        if (searchInput && hiddenInput) {
            searchInput.value = draft.patientSearch;
            hiddenInput.value = draft.patientId;
            loadPatientRegister(); // Loads records automatically
        }

        // Restore typed medication values
        if (draft.medName) {
            const medNameEl = document.getElementById('med-name');
            if (medNameEl) medNameEl.value = draft.medName;
        }
        if (draft.medDose) {
            const medDoseEl = document.getElementById('med-dose');
            if (medDoseEl) medDoseEl.value = draft.medDose;
        }
        if (draft.medType) {
            const medTypeEl = document.getElementById('med-type');
            if (medTypeEl) medTypeEl.value = draft.medType;
        }
    } catch (e) {
        console.error("Error restoring daily notes draft:", e);
    }
}