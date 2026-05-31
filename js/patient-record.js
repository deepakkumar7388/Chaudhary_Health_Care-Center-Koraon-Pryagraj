// ==================== PATIENT RECORD MODULE ====================
let currentRecordPatientId = null;
let allPatientsForRecord = []; // API-fetched cache

// Role-based helper: only admin & doctor can see payment amounts
function canViewPaymentsInRecord() {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'doctor');
}

// ── Date / Time Formatting Helpers ──────────────────────────────────────
function fmtDate(val) {
    if (!val) return '';
    try {
        const d = new Date(val);
        if (isNaN(d)) return val; // Return as-is if unparsable
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return val; }
}
function fmtTime(val) {
    if (!val) return '';
    // If it looks like HH:MM (plain time string), parse directly
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(val)) {
        const [h, m] = val.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${String(hour).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
    }
    try {
        const d = new Date(val);
        if (isNaN(d)) return val;
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return val; }
}
// ────────────────────────────────────────────────────────────────────────


function renderPatientRecord() {
    const moduleEl = document.getElementById('module-patient-record');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="patient-record-layout">
            <div class="module-header no-print" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 4px; border-bottom: 2px solid var(--border); padding-bottom: 15px;">
                <h2 style="margin: 0; font-size: 28px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px;"><i class="bi bi-file-earmark-medical" style="color: var(--primary);"></i> In-Patient Record Registry</h2>
                <p style="margin: 0; color: var(--text-muted); font-size: 12px; font-weight: 500;">Search and view patient medical history, admission vitals, medications, and final billing records</p>
            </div>

            <div class="search-section no-print" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px;">
                <h3 style="margin-top:0;"><i class="bi bi-search"></i> Select Patient for Case Record</h3>
                <div style="position:relative; display:flex; gap:10px;">
                    <input type="text" id="record-patient-search" class="search-input" placeholder="Search by ID or Name..." style="flex:1; padding:12px; border-radius:8px; border:2px solid #e2e8f0; font-size:15px;" oninput="filterRecordPatients(this.value)" onclick="filterRecordPatients(this.value)">
                    <div id="record-search-results" class="autocomplete-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:1000; background:white; border:1px solid #ddd; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.1); margin-top:5px; max-height:300px; overflow-y:auto;"></div>
                </div>
            </div>

            <div id="patient-record-controls" class="no-print" style="display:none; margin-bottom:15px; display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn btn-primary" onclick="window.print()"><i class="bi bi-printer"></i> Print Record</button>
            </div>

            <div id="record-form-container" class="a4-container" style="display:none;">
                <div class="record-paper" id="record-printable">
                    <!-- Header -->
                    <div class="record-header" style="text-align: center; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 20px; position: relative;">
                         <div style="display:flex; align-items:center; justify-content:center; gap:20px;">
                             <img src="hlogo.png" alt="Logo" style="height: 80px;">
                             <div>
                                 <h1 class="hospital-name" style="margin: 0; color: #2b6cb0; font-size: 28px; font-weight: 900;">Chaudhary Health Care Center Koraon</h1>
                                 <p style="margin: 5px 0; font-weight: bold; color: #2d3748;">A Complete Healthcare Point</p>
                                 <p style="margin: 2px 0;">Koraon-Prayagraj</p>
                                 <p style="margin: 2px 0; font-weight: bold;">Mob.: 9918333370, 8896017340</p>
                             </div>
                         </div>
                         <div style="margin-top: 15px; display: inline-block; padding: 4px 15px; border: 2px solid #000; font-weight: bold; text-transform: uppercase;">In Patient Record</div>
                    </div>

                    <!-- Top Info Line -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div>
                            <strong>INDOOR No.:</strong> 
                            <span id="rec-indoor-no" style="border-bottom: 1px dotted #000; width: 120px; display: inline-block; font-weight:bold;"></span>
                        </div>
                        <div>
                            <strong>WARD No.:</strong> 
                            <span id="rec-ward-no" style="border-bottom: 1px dotted #000; width: 120px; display: inline-block; font-weight:bold;"></span>
                        </div>
                    </div>

                    <!-- Main Form Fields -->
                    <div class="form-body" style="line-height: 2.2;">
                        <div class="form-row">
                            <strong>Patient's Name:</strong> 
                            <span id="rec-patient-name" style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 300px; font-weight:bold;"></span>
                        </div>
                        <div class="form-row">
                            <strong>Fathers/Husband Name:</strong> 
                            <span id="rec-guardian" style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 250px; font-weight:bold;"></span>
                        </div>
                        <div style="display: flex; gap: 20px;">
                            <div style="flex: 1;">
                                <strong>Age:</strong> <span id="rec-age" style="border-bottom: 1px dotted #000; width: 60px; display: inline-block; font-weight:bold;"></span>
                            </div>
                            <div style="flex: 1;">
                                <strong>Sex:</strong> <span id="rec-sex" style="border-bottom: 1px dotted #000; width: 80px; display: inline-block; font-weight:bold;"></span>
                            </div>
                            <div style="flex: 1.5;">
                                <strong>Religion:</strong> <span id="rec-religion" style="border-bottom: 1px dotted #000; width: 150px; display: inline-block; font-weight:bold;"></span>
                            </div>
                        </div>
                        <div class="form-row">
                            <strong>Address:</strong> 
                            <span id="rec-address" style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; font-weight:bold;"></span>
                        </div>
                        <div style="display: flex; justify-content: flex-end;">
                             <strong>Mobile No.</strong> <span id="rec-mobile" style="border-bottom: 1px dotted #000; width: 200px; display: inline-block; font-weight:bold; margin-left:10px;"></span>
                        </div>

                        <div class="form-row">
                            <strong>Physician/Surgeon-in-Charge:</strong> 
                            <span id="rec-physician" style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; font-weight:bold;"></span>
                        </div>

                        <div style="display: flex; gap: 20px;">
                            <div style="flex: 1;">
                                <strong>Date of Admission:</strong> <span id="rec-doa" style="border-bottom: 1px dotted #000; width: 150px; display: inline-block; font-weight:bold;"></span>
                            </div>
                            <div style="flex: 1;">
                                <strong>Time:</strong> <span id="rec-toa" style="border-bottom: 1px dotted #000; width: 120px; display: inline-block; font-weight:bold;"></span>
                            </div>
                        </div>

                        <div style="display: flex; gap: 20px;">
                            <div style="flex: 1;">
                                <strong>Date of Discharge:</strong> <span id="rec-dod" style="border-bottom: 1px dotted #000; width: 150px; display: inline-block; font-weight:bold;"></span>
                            </div>
                            <div style="flex: 1;">
                                <strong>Time:</strong> <span id="rec-tod" style="border-bottom: 1px dotted #000; width: 120px; display: inline-block; font-weight:bold;"></span>
                            </div>
                        </div>

                        <div class="form-row">
                            <strong>Provisional Diagnosis:</strong> 
                            <span id="rec-provisional" style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; font-weight:bold;"></span>
                        </div>

                        <div class="form-row">
                            <strong>Final Diagnosis:</strong> 
                            <span id="rec-final" style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; font-weight:bold;"></span>
                        </div>

                        <div class="form-row" style="display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px;">
                            <strong>Result:</strong> 
                            <span id="rec-result" style="border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; font-weight:bold;"></span>
                        </div>
                    </div>

                    <!-- Consent Section -->
                    <div style="margin-top: 30px; font-size: 14px; color: #2b6cb0; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
                        <p style="font-weight: bold; line-height: 1.6;">
                            मैं एतद्द्वारा अपने रोगी के किसी प्रकार के नैदानिक परीक्षण, उपचार एवं तद हेतु आवश्यक शल्य क्रिया व निश्चेतक औषधियों के प्रयोग की अनुमति देता / देती हूं। मुझे इसके सभी संभावित परिणामों से अवगत करा दिया गया है।
                        </p>
                    </div>

                    <!-- Signatures Section -->
                    <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                        <div style="width: 45%;">
                            <p style="margin-bottom: 10px; font-weight: bold;">साक्षी गवाह</p>
                            <div style="margin-bottom: 8px;">नाम: <span id="rec-witness-name" style="border-bottom: 1px dotted #000; width: 80%; display: inline-block; font-weight:bold;"></span></div>
                            <div style="margin-bottom: 8px;">वर्तमान पता: <span id="rec-witness-address" style="border-bottom: 1px dotted #000; width: 70%; display: inline-block; font-weight:bold;"></span></div>
                            <div style="margin-bottom: 8px;">दिनांक: <span id="rec-witness-date" style="border-bottom: 1px dotted #000; width: 50%; display: inline-block; font-weight:bold;"></span></div>
                            <div style="margin-bottom: 8px;">स्थान: <span id="rec-witness-place" style="border-bottom: 1px dotted #000; width: 80%; display: inline-block; font-weight:bold;"></span></div>
                        </div>

                        <div style="width: 45%;">
                            <p style="margin-bottom: 10px; font-weight: bold;">रोगी से संबंधित हस्ताक्षर</p>

                            <div id="sig-preview-wrap" style="height: 100px; border-bottom: 1px solid #000; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">
                                <img id="sig-preview-img" src="" style="max-height: 100%; max-width: 100%; display: none;">
                                <span id="sig-placeholder" style="color: #ccc; font-style: italic;">Signature / अंगूठा</span>
                            </div>

                            <div style="margin-bottom: 8px;">नाम: <span id="rec-rel-name" style="border-bottom: 1px dotted #000; width: 80%; display: inline-block; font-weight:bold;"></span></div>
                            <div style="margin-bottom: 8px;">वर्तमान पता: <span id="rec-rel-address" style="border-bottom: 1px dotted #000; width: 70%; display: inline-block; font-weight:bold;"></span></div>
                            <div style="margin-bottom: 8px;">दिनांक: <span id="rec-rel-date" style="border-bottom: 1px dotted #000; width: 50%; display: inline-block; font-weight:bold;"></span></div>
                            <div style="margin-bottom: 8px;">स्थान: <span id="rec-rel-place" style="border-bottom: 1px dotted #000; width: 80%; display: inline-block; font-weight:bold;"></span></div>
                        </div>
                    </div>

                    <!-- Patient Complete Journey Log (A4 Printable Sections) -->
                    <div id="patient-journey-log" style="margin-top: 50px; border-top: 3px double #2b6cb0; padding-top: 30px;">
                        <h2 style="text-align: center; color: #2b6cb0; font-family: serif; margin-bottom: 25px; font-weight: 800; text-transform: uppercase; font-size: 20px;">
                            Patient Complete Medical Journey & Case History
                        </h2>
                        
                        <!-- 1. Ward & Bed Stay timeline -->
                        <div style="margin-bottom: 25px;">
                            <h4 style="color: #2b6cb0; margin-bottom: 8px; border-bottom: 2px solid #edf2f7; padding-bottom: 5px; font-weight: bold; font-size: 14px;"><i class="fa-solid fa-bed"></i> 1. Ward & Bed Stay Timeline</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <thead>
                                    <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
                                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Ward Type</th>
                                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Bed No.</th>
                                        <th style="padding: 6px; border: 1px solid #cbd5e1;">From Date</th>
                                        <th style="padding: 6px; border: 1px solid #cbd5e1;">To Date</th>
                                        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Rate / Day</th>
                                    </tr>
                                </thead>
                                <tbody id="journey-bed-history">
                                    <!-- Dynamic -->
                                </tbody>
                            </table>
                        </div>

                        <!-- 2. Surgery History -->
                        <div style="margin-bottom: 25px;">
                            <h4 style="color: #2b6cb0; margin-bottom: 8px; border-bottom: 2px solid #edf2f7; padding-bottom: 5px; font-weight: bold; font-size: 14px;"><i class="bi bi-hospital"></i> 2. Surgeries & Interventions</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <thead>
                                    <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
                                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Surgery/Procedure</th>
                                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Surgeon</th>
                                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Date</th>
                                        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Charges</th>
                                        <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">Guardian Proof</th>
                                    </tr>
                                </thead>
                                <tbody id="journey-surgery-history">
                                    <!-- Dynamic -->
                                </tbody>
                            </table>
                        </div>

                        <!-- 3. Daily observations (Vitals) -->
                        <div style="margin-bottom: 25px;">
                            <h4 style="color: #2b6cb0; margin-bottom: 8px; border-bottom: 2px solid #edf2f7; padding-bottom: 5px; font-weight: bold; font-size: 14px;"><i class="bi bi-activity"></i> 3. Clinical Observation Chart (Vitals Log)</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead>
                                    <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Date & Time</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Pulse</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">BP</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Temp</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">SpO2</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">RBS</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Urine (ml)</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Drain (ml)</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Pain Score</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Observer</th>
                                    </tr>
                                </thead>
                                <tbody id="journey-vitals-history">
                                    <!-- Dynamic -->
                                </tbody>
                            </table>
                        </div>

                        <!-- 4. Medication Chart -->
                        <div style="margin-bottom: 25px;">
                            <h4 style="color: #2b6cb0; margin-bottom: 8px; border-bottom: 2px solid #edf2f7; padding-bottom: 5px; font-weight: bold; font-size: 14px;"><i class="bi bi-capsule"></i> 4. Medication & Treatment Logs</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead>
                                    <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Prescribed</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Medicine Name</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Type & Dose</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Status</th>
                                        <th style="padding: 5px; border: 1px solid #cbd5e1;">Administered Details</th>
                                    </tr>
                                </thead>
                                <tbody id="journey-meds-history">
                                    <!-- Dynamic -->
                                </tbody>
                            </table>
                        </div>

                        <!-- 5. Final billing & Payments summary -->
                        <div id="journey-billing-section">
                            <h4 style="color: #2b6cb0; margin-bottom: 8px; border-bottom: 2px solid #edf2f7; padding-bottom: 5px; font-weight: bold; font-size: 14px;"><i class="bi bi-file-earmark-medical"></i> 5. Final Billing & Financial Ledger</h4>
                            <div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12px; align-items: flex-start;">
                                <div style="flex: 1.2;">
                                    <table style="width: 100%; border-collapse: collapse; font-size:11px;">
                                        <thead>
                                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">
                                                <th style="padding: 5px;">Payment Date</th>
                                                <th style="padding: 5px;">Mode</th>
                                                <th style="padding: 5px; text-align: right;">Amount Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody id="journey-financial-history">
                                            <!-- Dynamic -->
                                        </tbody>
                                    </table>
                                </div>
                                <div style="flex: 0.8; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                                    <table style="width: 100%; line-height: 1.6;">
                                        <tr>
                                            <td><strong>Total Bill:</strong></td>
                                            <td style="text-align: right;" id="j-total-bill">₹0</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Discount:</strong></td>
                                            <td style="text-align: right; color: #ef4444;" id="j-discount">₹0</td>
                                        </tr>
                                        <tr style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-weight: bold;">
                                            <td><strong>Net Payable:</strong></td>
                                            <td style="text-align: right;" id="j-net-payable">₹0</td>
                                        </tr>
                                        <tr style="font-weight: bold; color: #10b981;">
                                            <td><strong>Total Paid:</strong></td>
                                            <td style="text-align: right;" id="j-total-paid">₹0</td>
                                        </tr>
                                        <tr style="border-top: 2px double #cbd5e1; font-weight: 900; color: #ef4444; font-size: 13px;">
                                            <td><strong>Balance Due:</strong></td>
                                            <td style="text-align: right;" id="j-balance-due">₹0</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .patient-record-layout {
                max-width: 900px;
                margin: 0 auto;
            }
            .a4-container {
                background: white;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                border-radius: 8px;
                padding: 10px;
                overflow-x: auto;
            }
            .record-paper {
                width: 794px; /* A4 width in pixels roughly */
                min-height: 1123px; /* A4 height */
                margin: 0 auto;
                padding: 40px;
                background: white;
                color: #000;
                font-family: serif;
            }
            @media print {
                .no-print, .sidebar, .mobile-header, .content-header, #patient-record-controls, .sidebar-overlay, #loading-overlay, #notification { display: none !important; }
                .main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; box-shadow: none !important; }
                .a4-container { box-shadow: none; padding: 0; width: 100% !important; max-width: 100% !important; }
                .record-paper { width: 100%; padding: 0; margin: 0; box-shadow: none; border: none; }
                body { background: white !important; color: black !important; }
                input[type="date"]::-webkit-inner-spin-button,
                input[type="date"]::-webkit-calendar-picker-indicator {
                    display: none;
                    -webkit-appearance: none;
                }
                input[type="time"]::-webkit-inner-spin-button,
                input[type="time"]::-webkit-calendar-picker-indicator {
                    display: none;
                    -webkit-appearance: none;
                }
            }
            .form-row {
                display: flex;
                align-items: baseline;
                gap: 10px;
            }
        </style>
    `;
    loadRecordDropdownListener();
    loadAllPatientsForRecord();
}

function loadRecordDropdownListener() {
    if (!window.recordDropdownListenerAdded) {
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('record-search-results');
            const input = document.getElementById('record-patient-search');
            if (dropdown && input && e.target !== input && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
        window.recordDropdownListenerAdded = true;
    }
}

async function loadAllPatientsForRecord() {
    try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE}patients`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();
        if (result.success) {
            allPatientsForRecord = result.patients || [];
            // Also sync to localStorage as fallback
            localStorage.setItem('patients', JSON.stringify(allPatientsForRecord));
        }
    } catch(err) {
        console.error('Failed to load patients for record search:', err);
        // Fallback to localStorage
        allPatientsForRecord = JSON.parse(localStorage.getItem('patients') || '[]');
    }
}

function filterRecordPatients(query) {
    const term = (query || '').toLowerCase().trim();
    const resultsContainer = document.getElementById('record-search-results');

    if (term.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    // Use API cache first, fallback to localStorage
    const patients = allPatientsForRecord.length > 0
        ? allPatientsForRecord
        : JSON.parse(localStorage.getItem('patients') || '[]');

    const filtered = patients.filter(p =>
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.patient_id && p.patient_id.toLowerCase().includes(term))
    );

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">No patient found. Try a different name or ID.</div>';
    } else {
        resultsContainer.innerHTML = filtered.map(p => `
            <div class="autocomplete-item" style="padding:12px; border-bottom:1px solid #eee; cursor:pointer;" onclick="loadPatientToRecord('${p.patient_id || p._id}')">
                <div style="font-weight:bold; color:#2d3748;">${p.name}</div>
                <div style="font-size:12px; color:#718096;">ID: ${p.patient_id || p._id} &nbsp;|&nbsp; ${p.gender || ''} ${p.age ? '| Age: '+p.age : ''} &nbsp;|&nbsp; Bed: ${p.bed_no || '-'}</div>
            </div>
        `).join('');
    }
    resultsContainer.style.display = 'block';
}

async function loadPatientToRecord(patientId) {
    showLoading('Loading patient record...');
    let p = null;
    try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE}patients/${patientId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();
        if (result.success && result.patient) {
            p = result.patient;
        }
    } catch(err) {
        console.error('Failed to fetch latest patient info:', err);
    }

    // Fallback to cache if API call fails
    if (!p) {
        const patients = allPatientsForRecord.length > 0
            ? allPatientsForRecord
            : JSON.parse(localStorage.getItem('patients') || '[]');
        p = patients.find(pat => pat.patient_id === patientId || pat.id === patientId || pat._id === patientId);
    }

    hideLoading();

    if (!p) {
        showNotification('Patient not found in registry', 'error');
        return;
    }

    currentRecordPatientId = p.patient_id || p.id || p._id;
    document.getElementById('record-search-results').style.display = 'none';
    document.getElementById('record-patient-search').value = `${p.name} | ${currentRecordPatientId}`;
    document.getElementById('record-form-container').style.display = 'block';
    document.getElementById('patient-record-controls').style.display = 'flex';



    // 1. Basic Identity from Patient Registration
    document.getElementById('rec-patient-name').textContent = p.name || '';
    document.getElementById('rec-guardian').textContent = p.guardian_name || p.relative_name || p.fathers_name || '';
    document.getElementById('rec-age').textContent = p.age || '';
    document.getElementById('rec-sex').textContent = p.gender || '';
    document.getElementById('rec-address').textContent = p.address || '';
    document.getElementById('rec-mobile').textContent = p.mobile || '';
    document.getElementById('rec-doa').textContent = fmtDate(p.admission_date);
    document.getElementById('rec-toa').textContent = fmtTime(p.admission_time || p.admission_date);
    
    // Logic for Physician/Surgeon-in-Charge + Auto-load Signature from Surgery
    const allSurgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');
    const lsSurgeries = allSurgeries.filter(s => String(s.patient_id) === String(currentRecordPatientId));
    const apiSurgeries = Array.isArray(p.surgeries) ? p.surgeries : [];
    const patientSurgeries = lsSurgeries.length > 0 ? lsSurgeries : apiSurgeries;

    let surgerySignature = null;
    if (patientSurgeries.length > 0) {
        const latestSurgery = patientSurgeries[patientSurgeries.length - 1];
        document.getElementById('rec-physician').textContent = latestSurgery.surgeonName || p.doctor_assigned || '';
        if (latestSurgery.guardianSignature) {
            surgerySignature = latestSurgery.guardianSignature;
        }
    } else {
        document.getElementById('rec-physician').textContent = p.doctor_assigned || '';
    }

    // 2. Auto-fill Indoor No. and Ward No. from patient data
    document.getElementById('rec-indoor-no').textContent = p.patient_id || p.id || '';
    document.getElementById('rec-ward-no').textContent = p.bed_no || '';
    document.getElementById('rec-religion').textContent = p.religion || '';

    // 3. Try to fetch from latest Discharge Summary for Diagnosis/Dates
    const dischargeList = JSON.parse(localStorage.getItem('discharge_records') || '[]');
    const latestDischarge = [...dischargeList].reverse().find(d => d.patientId === currentRecordPatientId);
    
    if (latestDischarge) {
        document.getElementById('rec-dod').textContent = fmtDate(latestDischarge.dischargeDate || p.discharge_date);
        document.getElementById('rec-tod').textContent = fmtTime(latestDischarge.dischargeTime || p.discharge_time || '');
        document.getElementById('rec-provisional').textContent = latestDischarge.diagnosis || p.problem || '';
        document.getElementById('rec-final').textContent = latestDischarge.finalDiagnosis || latestDischarge.diagnosis || p.problem || '';
        document.getElementById('rec-result').textContent = latestDischarge.result || latestDischarge.condition || '';
    } else {
        document.getElementById('rec-dod').textContent = fmtDate(p.discharge_date);
        document.getElementById('rec-tod').textContent = fmtTime(p.discharge_time || '');
        document.getElementById('rec-provisional').textContent = p.problem || '';
        document.getElementById('rec-final').textContent = p.problem || '';
        document.getElementById('rec-result').textContent = '';
    }

    // 4. Auto-fill Relative section from patient guardian data
    const admDate = fmtDate(p.admission_date);
    const guardianName = p.guardian_name || p.relative_name || p.fathers_name || '';
    const patientAddr = p.address || '';
    const hospitalPlace = 'Koraon-Prayagraj';

    // रोगी से संबंधित (Relative/Guardian) — auto-fill from patient registration
    document.getElementById('rec-rel-name').textContent = guardianName;
    document.getElementById('rec-rel-address').textContent = patientAddr;
    document.getElementById('rec-rel-date').textContent = admDate;
    document.getElementById('rec-rel-place').textContent = hospitalPlace;

    // साक्षी गवाह (Witness) — auto-fill with guardian as witness
    document.getElementById('rec-witness-name').textContent = guardianName;
    document.getElementById('rec-witness-address').textContent = patientAddr;
    document.getElementById('rec-witness-date').textContent = admDate;
    document.getElementById('rec-witness-place').textContent = hospitalPlace;

    document.getElementById('sig-preview-img').style.display = 'none';
    document.getElementById('sig-placeholder').style.display = 'block';

    // 5. If previously saved record exists, override with saved values
    const records = JSON.parse(localStorage.getItem('patient_records') || '{}');
    const saved = records[currentRecordPatientId];

    if (saved) {
        if (saved.indoor_no) document.getElementById('rec-indoor-no').textContent = saved.indoor_no;
        if (saved.ward_no) document.getElementById('rec-ward-no').textContent = saved.ward_no;
        if (saved.religion) document.getElementById('rec-religion').textContent = saved.religion;
        if (saved.dod) document.getElementById('rec-dod').textContent = saved.dod;
        if (saved.tod) document.getElementById('rec-tod').textContent = saved.tod;
        if (saved.provisional) document.getElementById('rec-provisional').textContent = saved.provisional;
        if (saved.final) document.getElementById('rec-final').textContent = saved.final;
        if (saved.result) document.getElementById('rec-result').textContent = saved.result;
        if (saved.witness_name) document.getElementById('rec-witness-name').textContent = saved.witness_name;
        if (saved.witness_address) document.getElementById('rec-witness-address').textContent = saved.witness_address;
        if (saved.witness_date) document.getElementById('rec-witness-date').textContent = saved.witness_date;
        if (saved.witness_place) document.getElementById('rec-witness-place').textContent = saved.witness_place;
        if (saved.rel_name) document.getElementById('rec-rel-name').textContent = saved.rel_name;
        if (saved.rel_address) document.getElementById('rec-rel-address').textContent = saved.rel_address;
        if (saved.rel_date) document.getElementById('rec-rel-date').textContent = saved.rel_date;
        if (saved.rel_place) document.getElementById('rec-rel-place').textContent = saved.rel_place;
    }

    // Signature priority: 1) Manually saved 2) Surgery consent signature
    const finalSignature = (saved && saved.signature) ? saved.signature : surgerySignature;
    const imgEl = document.getElementById('sig-preview-img');
    const placeholder = document.getElementById('sig-placeholder');
    if (finalSignature) {
        imgEl.src = finalSignature;
        imgEl.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        imgEl.src = '';
        imgEl.style.display = 'none';
        placeholder.style.display = 'block';
    }

    showNotification('Patient record auto-filled successfully — Read Only', 'success');
    populatePatientJourney(currentRecordPatientId, p);
}

function handleSignatureUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgEl = document.getElementById('sig-preview-img');
            imgEl.src = e.target.result;
            imgEl.style.display = 'block';
            document.getElementById('sig-placeholder').style.display = 'none';

            // Auto-save signature to localStorage
            if (currentRecordPatientId) {
                const records = JSON.parse(localStorage.getItem('patient_records') || '{}');
                if (!records[currentRecordPatientId]) records[currentRecordPatientId] = {};
                records[currentRecordPatientId].signature = e.target.result;
                localStorage.setItem('patient_records', JSON.stringify(records));
                showNotification('Signature saved!', 'success');
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function clearSignature() {
    document.getElementById('sig-preview-img').src = '';
    document.getElementById('sig-preview-img').style.display = 'none';
    document.getElementById('sig-placeholder').style.display = 'block';
    document.getElementById('sig-upload-input').value = '';
    // Remove from localStorage
    if (currentRecordPatientId) {
        const records = JSON.parse(localStorage.getItem('patient_records') || '{}');
        if (records[currentRecordPatientId]) {
            delete records[currentRecordPatientId].signature;
            localStorage.setItem('patient_records', JSON.stringify(records));
        }
    }
}

function savePatientRecord() {
    if (!currentRecordPatientId) return;

    const recordData = {
        indoor_no: document.getElementById('rec-indoor-no').textContent,
        ward_no: document.getElementById('rec-ward-no').textContent,
        religion: document.getElementById('rec-religion').textContent,
        toa: document.getElementById('rec-toa').textContent,
        dod: document.getElementById('rec-dod').textContent,
        tod: document.getElementById('rec-tod').textContent,
        provisional: document.getElementById('rec-provisional').textContent,
        final: document.getElementById('rec-final').textContent,
        result: document.getElementById('rec-result').textContent,
        witness_name: document.getElementById('rec-witness-name').textContent,
        witness_address: document.getElementById('rec-witness-address').textContent,
        witness_date: document.getElementById('rec-witness-date').textContent,
        witness_place: document.getElementById('rec-witness-place').textContent,
        rel_name: document.getElementById('rec-rel-name').textContent,
        rel_address: document.getElementById('rec-rel-address').textContent,
        rel_date: document.getElementById('rec-rel-date').textContent,
        rel_place: document.getElementById('rec-rel-place').textContent,
        signature: document.getElementById('sig-preview-img').src
    };

    const records = JSON.parse(localStorage.getItem('patient_records') || '{}');
    records[currentRecordPatientId] = recordData;
    localStorage.setItem('patient_records', JSON.stringify(records));

    showNotification('Patient case record saved successfully!', 'success');
}

async function populatePatientJourney(patientId, p) {
    // Hide billing section for non-admin/non-doctor roles
    const billingSec = document.getElementById('journey-billing-section');
    if (billingSec) {
        billingSec.style.display = canViewPaymentsInRecord() ? '' : 'none';
    }

    // Try to fetch discharge summary from server
    try {
        const dischargeRes = await fetch(`${API_BASE}discharge/${patientId}`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const dResult = await dischargeRes.json();
        if (dResult.success && dResult.discharge) {
            const d = dResult.discharge;
            document.getElementById('rec-dod').textContent = fmtDate(d.dischargeDate || p.discharge_date);
            document.getElementById('rec-tod').textContent = fmtTime(d.dischargeTime || '');
            document.getElementById('rec-provisional').textContent = d.diagnosis || p.problem || '';
            document.getElementById('rec-final').textContent = d.finalDiagnosis || d.diagnosis || p.problem || '';
            document.getElementById('rec-result').textContent = d.result || d.condition || '';
        }
    } catch (err) {
        console.error("Error fetching discharge summary from server:", err);
    }

    // 1. Bed Stay history
    const bedHistoryTbody = document.getElementById('journey-bed-history');
    if (bedHistoryTbody) {
        if (p && p.bedHistory && p.bedHistory.length > 0) {
            bedHistoryTbody.innerHTML = p.bedHistory.map(b => {
                const start = fmtDate(b.start_date);
                const end = b.end_date ? fmtDate(b.end_date) : 'Present';
                return `
                    <tr>
                        <td style="padding:6px; border:1px solid #cbd5e1;">${b.ward_type}</td>
                        <td style="padding:6px; border:1px solid #cbd5e1;">${b.bed_no}</td>
                        <td style="padding:6px; border:1px solid #cbd5e1;">${start}</td>
                        <td style="padding:6px; border:1px solid #cbd5e1;">${end}</td>
                        <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">₹${b.daily_charge || 0}</td>
                    </tr>
                `;
            }).join('');
        } else if (p) {
            // Render at least current admission bed stay
            const currentCharge = p.daily_charges || p.dailyCharge || 0;
            const start = fmtDate(p.admission_date);
            bedHistoryTbody.innerHTML = `
                <tr>
                    <td style="padding:6px; border:1px solid #cbd5e1;">${p.ward_type || 'General Ward'}</td>
                    <td style="padding:6px; border:1px solid #cbd5e1;">${p.bed_no || '-'}</td>
                    <td style="padding:6px; border:1px solid #cbd5e1;">${start}</td>
                    <td style="padding:6px; border:1px solid #cbd5e1;">Present</td>
                    <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">₹${currentCharge}</td>
                </tr>
            `;
        } else {
            bedHistoryTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:10px; color:#cbd5e1;">No Bed Stay History found.</td></tr>`;
        }
    }

    // 2. Surgeries
    const surgeryHistoryTbody = document.getElementById('journey-surgery-history');
    if (surgeryHistoryTbody) {
        if (p && p.surgeries && p.surgeries.length > 0) {
            surgeryHistoryTbody.innerHTML = p.surgeries.map(s => {
                const date = fmtDate(s.surgeryDate);
                const imgProof = s.guardianSignature 
                    ? `<img src="${s.guardianSignature}" style="max-height: 35px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: #fff;" alt="Sign Proof">`
                    : '<span style="color:#cbd5e1; font-style:italic;">No Proof</span>';
                return `
                    <tr>
                        <td style="padding:6px; border:1px solid #cbd5e1; font-weight:bold;">${s.surgeryName}</td>
                        <td style="padding:6px; border:1px solid #cbd5e1;">${s.surgeonName}</td>
                        <td style="padding:6px; border:1px solid #cbd5e1;">${date}</td>
                        <td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">₹${s.cost || 0}</td>
                        <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">${imgProof}</td>
                    </tr>
                `;
            }).join('');
        } else {
            surgeryHistoryTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:10px; color:#cbd5e1;">No surgical procedures recorded.</td></tr>`;
        }
    }

    // 3. Vitals & Medications from Daily Notes API
    try {
        const response = await fetch(`${API_BASE}notes/${patientId}`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();
        if (result.success) {
            const vitals = result.notes.filter(n => n.type === 'vitals');
            const meds = result.notes.filter(n => n.type === 'medication');

            // Vitals
            const vitalsTbody = document.getElementById('journey-vitals-history');
            if (vitalsTbody) {
                if (vitals.length > 0) {
                    vitals.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
                    vitalsTbody.innerHTML = vitals.map(v => `
                        <tr>
                            <td style="padding:5px; border:1px solid #cbd5e1;">${v.date} ${v.time}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1; font-weight:bold;">${v.pulse || '-'}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1;">${v.bp || '-'}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1;">${v.temp || '-'}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1;">${v.spo2 || '-'}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1;">${v.rbs || '-'}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1;">${v.urineOutput || '-'}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1;">${v.drainOutput || '-'}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1;">${v.painScore || '-'}</td>
                            <td style="padding:5px; border:1px solid #cbd5e1; color:#4a5568;">${v.addedBy}</td>
                        </tr>
                    `).join('');
                } else {
                    vitalsTbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:10px; color:#cbd5e1;">No clinical observations charted.</td></tr>`;
                }
            }

            // Medications
            const medsTbody = document.getElementById('journey-meds-history');
            if (medsTbody) {
                if (meds.length > 0) {
                    meds.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
                    medsTbody.innerHTML = meds.map(m => {
                        const isGiven = m.status !== 'Pending';
                        const statusText = isGiven 
                            ? `<span style="color:#10b981; font-weight:bold;"><i class="bi bi-check-all"></i> Given</span>`
                            : `<span style="color:#f59e0b; font-weight:bold;"><i class="bi bi-clock"></i> Scheduled</span>`;
                        const doneDetails = isGiven
                            ? `${m.doneBy} on ${m.doneTime}`
                            : '-';
                        return `
                            <tr>
                                <td style="padding:5px; border:1px solid #cbd5e1;">${m.date} ${m.time}</td>
                                <td style="padding:5px; border:1px solid #cbd5e1; font-weight:bold;">${m.drugName}</td>
                                <td style="padding:5px; border:1px solid #cbd5e1;">${m.medType || 'Medicine'} (${m.dose})</td>
                                <td style="padding:5px; border:1px solid #cbd5e1;">${statusText}</td>
                                <td style="padding:5px; border:1px solid #cbd5e1; font-size:10px; color:#4a5568;">${doneDetails}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    medsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:10px; color:#cbd5e1;">No medications prescribed.</td></tr>`;
                }
            }
        }
    } catch (err) {
        console.error("Error populating clinical journey history:", err);
    }

    // 4. Billings & Financial ledger
    try {
        const billingRes = await fetch(`${API_BASE}billing`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const bResult = await billingRes.json();
        if (bResult.success) {
            const patientBill = bResult.billings.find(b => b.patient_id === patientId);
            if (patientBill) {
                // Payments
                const ledgerTbody = document.getElementById('journey-financial-history');
                if (ledgerTbody) {
                    if (patientBill.payments && patientBill.payments.length > 0) {
                        ledgerTbody.innerHTML = patientBill.payments.map(pay => `
                            <tr>
                                <td style="padding:5px; border-bottom: 1px solid #e2e8f0;">${fmtDate(pay.date)}</td>
                                <td style="padding:5px; border-bottom: 1px solid #e2e8f0; font-weight:bold;">${pay.mode}</td>
                                <td style="padding:5px; border-bottom: 1px solid #e2e8f0; text-align:right; font-weight:bold; color:#10b981;">₹${pay.amount}</td>
                            </tr>
                        `).join('');
                    } else {
                        ledgerTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:10px; color:#cbd5e1;">No payments received yet.</td></tr>`;
                    }
                }

                // Billing totals — use billing record items directly (same as billing.js)
                const disc = parseFloat(patientBill.discount) || 0;
                const totalPaid = (patientBill.payments || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                
                // Sum ALL items from the saved billing record (authoritative source)
                let grandTotal = 0;
                if (patientBill.items && patientBill.items.length > 0) {
                    patientBill.items.forEach(item => {
                        const fee = parseFloat(item.fee) || 0;
                        const days = parseFloat(item.days) || 0;
                        grandTotal += fee * (days || 1);
                    });
                }
                
                const netPayable = Math.max(0, grandTotal - disc);
                const balDue = Math.max(0, netPayable - totalPaid);

                document.getElementById('j-total-bill').textContent = `₹${grandTotal}`;
                document.getElementById('j-discount').textContent = `₹${disc}`;
                document.getElementById('j-net-payable').textContent = `₹${netPayable}`;
                document.getElementById('j-total-paid').textContent = `₹${totalPaid}`;
                
                const balDueEl = document.getElementById('j-balance-due');
                balDueEl.textContent = `₹${balDue}`;
                if (balDue > 0) {
                    balDueEl.style.color = '#ef4444';
                } else {
                    balDueEl.style.color = '#10b981';
                }
            } else {
                // Fallback if no bill exists
                let grandTotal = 0;
                
                // 1. Bed Stay charges
                if (p && p.bedHistory && p.bedHistory.length > 0) {
                    p.bedHistory.forEach((bed, bedIndex) => {
                        const startDate = new Date(bed.start_date);
                        const endDate = bed.end_date ? new Date(bed.end_date) : new Date();
                        const diffTime = Math.abs(endDate - startDate);
                        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        // Same-day transfer logic to prevent double charging on the same day
                        const startCal = startDate.toDateString();
                        const endCal = endDate.toDateString();
                        const isSameDay = startCal === endCal;

                        if (isSameDay) {
                            const hasSubsequentStay = bedIndex < p.bedHistory.length - 1;
                            if (hasSubsequentStay) {
                                diffDays = 0; // Same-day transfer: free for this bed, charged in the subsequent bed stay
                            } else {
                                if (diffDays < 1) diffDays = 1; // Only/last stay on the same day: minimum 1 day
                            }
                        } else {
                            if (diffDays < 1) diffDays = 1;
                        }

                        grandTotal += (bed.daily_charge || 0) * diffDays;
                    });
                }

                // 2. Surgery charges
                if (p && p.surgeries && p.surgeries.length > 0) {
                    p.surgeries.forEach(s => {
                        grandTotal += (s.cost || 0);
                    });
                }

                // Default Consultation/Doctor fee fallback
                const drFee = parseFloat(p ? p.doctorFees : 0) || 500;
                grandTotal += drFee;

                const totalPaid = 0;
                const balDue = grandTotal;

                document.getElementById('j-total-bill').textContent = `₹${grandTotal}`;
                document.getElementById('j-discount').textContent = `₹0`;
                document.getElementById('j-net-payable').textContent = `₹${grandTotal}`;
                document.getElementById('j-total-paid').textContent = `₹${totalPaid}`;
                document.getElementById('j-balance-due').textContent = `₹${balDue}`;
                
                const ledgerTbody = document.getElementById('journey-financial-history');
                if (ledgerTbody) {
                    ledgerTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:10px; color:#cbd5e1;">No financial ledger recorded in Billing.</td></tr>`;
                }
            }
        }
    } catch (err) {
        console.error("Error populating billing journey history:", err);
    }
}

