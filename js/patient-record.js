// ==================== PATIENT RECORD MODULE ====================
let currentRecordPatientId = null;

function renderPatientRecord() {
    const moduleEl = document.getElementById('module-patient-record');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="patient-record-layout">
            <div class="search-section no-print" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px;">
                <h3 style="margin-top:0;"><i class="fas fa-search"></i> Select Patient for Case Record</h3>
                <div style="position:relative; display:flex; gap:10px;">
                    <input type="text" id="record-patient-search" class="search-input" placeholder="Search by ID or Name..." style="flex:1; padding:12px; border-radius:8px; border:2px solid #e2e8f0; font-size:15px;" oninput="filterRecordPatients(this.value)" onclick="filterRecordPatients(this.value)">
                    <div id="record-search-results" class="autocomplete-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:1000; background:white; border:1px solid #ddd; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.1); margin-top:5px; max-height:300px; overflow-y:auto;"></div>
                </div>
            </div>

            <div id="patient-record-controls" class="no-print" style="display:none; margin-bottom:15px; display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn btn-success" onclick="savePatientRecord()"><i class="fas fa-save"></i> Save Record</button>
                <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print Record</button>
            </div>

            <div id="record-form-container" class="a4-container" style="display:none;">
                <div class="record-paper" id="record-printable">
                    <!-- Header -->
                    <div class="record-header" style="text-align: center; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 20px; position: relative;">
                         <div style="display:flex; align-items:center; justify-content:center; gap:20px;">
                             <img src="hlogo.png" alt="Logo" style="height: 80px;">
                             <div>
                                 <h1 style="margin: 0; color: #2b6cb0; font-size: 28px; font-weight: 900;">Chaudhary Health Care Centre</h1>
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
                            <input type="text" id="rec-indoor-no" style="border:none; border-bottom: 1px dotted #000; width: 120px; outline:none; font-weight:bold;">
                        </div>
                        <div>
                            <strong>WARD No.:</strong> 
                            <input type="text" id="rec-ward-no" style="border:none; border-bottom: 1px dotted #000; width: 120px; outline:none; font-weight:bold;">
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
                                <strong>Religion:</strong> <input type="text" id="rec-religion" style="border:none; border-bottom: 1px dotted #000; width: 150px; outline:none;">
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
                                <strong>Date of Discharge:</strong> <input type="date" id="rec-dod" style="border:none; border-bottom: 1px dotted #000; outline:none;">
                            </div>
                            <div style="flex: 1;">
                                <strong>Time:</strong> <input type="time" id="rec-tod" style="border:none; border-bottom: 1px dotted #000; outline:none;">
                            </div>
                        </div>

                        <div class="form-row">
                            <strong>Provisional Diagnosis:</strong> 
                            <input type="text" id="rec-provisional" style="border:none; border-bottom: 1px dotted #000; width: 75%; outline:none;">
                        </div>

                        <div class="form-row">
                            <strong>Final Diagnosis:</strong> 
                            <input type="text" id="rec-final" style="border:none; border-bottom: 1px dotted #000; width: 80%; outline:none;">
                        </div>

                        <div class="form-row" style="display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px;">
                            <strong>Result:</strong> 
                            <label><input type="radio" name="rec-result" value="DOPR" onclick="toggleRadioDeSelection(this)"> DOPR</label>
                            <label><input type="radio" name="rec-result" value="Cured" onclick="toggleRadioDeSelection(this)"> Cured</label>
                            <label><input type="radio" name="rec-result" value="Relieved" onclick="toggleRadioDeSelection(this)"> Relieved</label>
                            <label><input type="radio" name="rec-result" value="LAMA" onclick="toggleRadioDeSelection(this)"> LAMA</label>
                            <label><input type="radio" name="rec-result" value="Died" onclick="toggleRadioDeSelection(this)"> Died</label>
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
                            <div style="margin-bottom: 8px;">नाम: <input type="text" id="rec-witness-name" style="border:none; border-bottom: 1px dotted #000; width: 80%; outline:none;"></div>
                            <div style="margin-bottom: 8px;">वर्तमान पता: <input type="text" id="rec-witness-address" style="border:none; border-bottom: 1px dotted #000; width: 70%; outline:none;"></div>
                            <div style="margin-bottom: 8px;">दिनांक: <input type="date" id="rec-witness-date" style="border:none; border-bottom: 1px dotted #000; outline:none;"></div>
                            <div style="margin-bottom: 8px;">स्थान: <input type="text" id="rec-witness-place" style="border:none; border-bottom: 1px dotted #000; width: 80%; outline:none;"></div>
                        </div>

                        <div style="width: 45%;">
                            <p style="margin-bottom: 10px; font-weight: bold;">रोगी से संबंधित हस्ताक्षर</p>
                            
                            <!-- Signature Upload Area -->
                            <div class="sig-upload-container no-print" style="margin-bottom: 10px; border: 1px dashed #ccc; padding: 10px; border-radius: 8px; text-align: center; background: #f9f9f9;">
                                <p style="font-size: 11px; margin: 0 0 5px 0;">Upload Signature Image:</p>
                                <input type="file" id="sig-upload-input" accept="image/*" onchange="handleSignatureUpload(this)" style="font-size: 11px;">
                            </div>
                            
                            <div id="sig-preview-wrap" style="height: 100px; border-bottom: 1px solid #000; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">
                                <img id="sig-preview-img" src="" style="max-height: 100%; display: none;">
                                <span id="sig-placeholder" style="color: #ccc; font-style: italic;">Signature / अंगूठा</span>
                            </div>

                            <div style="margin-bottom: 8px;">नाम: <input type="text" id="rec-rel-name" style="border:none; border-bottom: 1px dotted #000; width: 80%; outline:none;"></div>
                            <div style="margin-bottom: 8px;">वर्तमान पता: <input type="text" id="rec-rel-address" style="border:none; border-bottom: 1px dotted #000; width: 70%; outline:none;"></div>
                            <div style="margin-bottom: 8px;">दिनांक: <input type="date" id="rec-rel-date" style="border:none; border-bottom: 1px dotted #000; outline:none;"></div>
                            <div style="margin-bottom: 8px;">स्थान: <input type="text" id="rec-rel-place" style="border:none; border-bottom: 1px dotted #000; width: 80%; outline:none;"></div>
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
                .no-print { display: none !important; }
                .main-content { margin: 0 !important; padding: 0 !important; }
                .sidebar, .content-header { display: none !important; }
                .a4-container { box-shadow: none; padding: 0; }
                .record-paper { width: 100%; padding: 0; margin: 0; box-shadow: none; border: none; }
                body { background: white; }
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

function filterRecordPatients(query) {
    const term = (query || '').toLowerCase().trim();
    const resultsContainer = document.getElementById('record-search-results');

    if (term.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const filtered = patients.filter(p =>
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.patient_id && p.patient_id.toLowerCase().includes(term))
    );

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">No results found</div>';
    } else {
        resultsContainer.innerHTML = filtered.map(p => `
            <div class="autocomplete-item" style="padding:12px; border-bottom:1px solid #eee; cursor:pointer;" onclick="loadPatientToRecord('${p.patient_id}')">
                <div style="font-weight:bold; color:#2d3748;">${p.name}</div>
                <div style="font-size:12px; color:#718096;">Patient ID: ${p.patient_id}</div>
            </div>
        `).join('');
    }
    resultsContainer.style.display = 'block';
}

function loadPatientToRecord(patientId) {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const p = patients.find(pat => pat.patient_id === patientId || pat.id === patientId);
    if (!p) {
        showNotification('Patient not found in registry', 'error');
        return;
    }

    currentRecordPatientId = p.patient_id || p.id;
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
    document.getElementById('rec-doa').textContent = p.admission_date || '';
    document.getElementById('rec-toa').textContent = p.admission_time || '';
    
    // Logic for Physician/Surgeon-in-Charge (Check if surgery patient)
    const allSurgeries = JSON.parse(localStorage.getItem('surgeries') || '[]');
    const patientSurgeries = allSurgeries.filter(s => String(s.patient_id) === String(currentRecordPatientId));
    
    if (patientSurgeries.length > 0) {
        // If surgery exists, show latest surgeon's name
        const latestSurgery = patientSurgeries[patientSurgeries.length - 1];
        document.getElementById('rec-physician').textContent = latestSurgery.surgeonName || p.doctor_assigned || '';
    } else {
        // Otherwise show default assigned doctor
        document.getElementById('rec-physician').textContent = p.doctor_assigned || '';
    }

    // 2. Try to fetch from latest Discharge Summary for Diagnosis/Dates
    const dischargeList = JSON.parse(localStorage.getItem('discharge_records') || '[]');
    const latestDischarge = [...dischargeList].reverse().find(d => d.patientId === currentRecordPatientId);
    
    if (latestDischarge) {
        document.getElementById('rec-dod').value = latestDischarge.dischargeDate || p.discharge_date || '';
        document.getElementById('rec-provisional').value = latestDischarge.diagnosis || '';
        document.getElementById('rec-final').value = latestDischarge.diagnosis || '';
    } else {
        document.getElementById('rec-dod').value = p.discharge_date || '';
    }

    // 3. Load saved Case Record (overwrites if user previously saved specific data here)
    const records = JSON.parse(localStorage.getItem('patient_records') || '{}');
    const saved = records[currentRecordPatientId];
    
    if (saved) {
        document.getElementById('rec-indoor-no').value = saved.indoor_no || '';
        document.getElementById('rec-ward-no').value = saved.ward_no || '';
        document.getElementById('rec-religion').value = saved.religion || '';
        document.getElementById('rec-toa').value = saved.toa || '';
        if (saved.dod) document.getElementById('rec-dod').value = saved.dod;
        document.getElementById('rec-tod').value = saved.tod || '';
        if (saved.provisional) document.getElementById('rec-provisional').value = saved.provisional;
        if (saved.final) document.getElementById('rec-final').value = saved.final;
        
        if (saved.result) {
            const radio = document.querySelector('input[name="rec-result"][value="' + saved.result + '"]');
            if (radio) {
                radio.checked = true;
                // Initialize wasChecked for toggle logic
                document.querySelectorAll('input[name="rec-result"]').forEach(r => r.wasChecked = false);
                radio.wasChecked = true;
            }
        }

        document.getElementById('rec-witness-name').value = saved.witness_name || '';
        document.getElementById('rec-witness-address').value = saved.witness_address || '';
        document.getElementById('rec-witness-date').value = saved.witness_date || '';
        document.getElementById('rec-witness-place').value = saved.witness_place || '';

        document.getElementById('rec-rel-name').value = saved.rel_name || '';
        document.getElementById('rec-rel-address').value = saved.rel_address || '';
        document.getElementById('rec-rel-date').value = saved.rel_date || '';
        document.getElementById('rec-rel-place').value = saved.rel_place || '';

        if (saved.signature) {
            const imgEl = document.getElementById('sig-preview-img');
            imgEl.src = saved.signature;
            imgEl.style.display = 'block';
            document.getElementById('sig-placeholder').style.display = 'none';
        } else {
            document.getElementById('sig-preview-img').style.display = 'none';
            document.getElementById('sig-placeholder').style.display = 'block';
        }
        showNotification('Loaded all available info for this patient', 'success');
    } else {
        // Clear non-autofilled fields if no saved record exists
        document.getElementById('rec-indoor-no').value = '';
        document.getElementById('rec-ward-no').value = '';
        document.getElementById('rec-religion').value = '';
        document.getElementById('rec-toa').value = '';
        document.getElementById('rec-tod').value = '';
        document.querySelectorAll('input[name="rec-result"]').forEach(r => {
            r.checked = false;
            r.wasChecked = false;
        });
        document.getElementById('rec-witness-name').value = '';
        document.getElementById('rec-rel-name').value = '';
        document.getElementById('sig-preview-img').src = '';
        document.getElementById('sig-preview-img').style.display = 'none';
        document.getElementById('sig-placeholder').style.display = 'block';
    }
}

function handleSignatureUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgEl = document.getElementById('sig-preview-img');
            imgEl.src = e.target.result;
            imgEl.style.display = 'block';
            document.getElementById('sig-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function savePatientRecord() {
    if (!currentRecordPatientId) return;

    const resultEl = document.querySelector('input[name="rec-result"]:checked');
    
    const recordData = {
        indoor_no: document.getElementById('rec-indoor-no').value,
        ward_no: document.getElementById('rec-ward-no').value,
        religion: document.getElementById('rec-religion').value,
        toa: document.getElementById('rec-toa').value,
        dod: document.getElementById('rec-dod').value,
        tod: document.getElementById('rec-tod').value,
        provisional: document.getElementById('rec-provisional').value,
        final: document.getElementById('rec-final').value,
        result: resultEl ? resultEl.value : '',
        witness_name: document.getElementById('rec-witness-name').value,
        witness_address: document.getElementById('rec-witness-address').value,
        witness_date: document.getElementById('rec-witness-date').value,
        witness_place: document.getElementById('rec-witness-place').value,
        rel_name: document.getElementById('rec-rel-name').value,
        rel_name: document.getElementById('rec-rel-name').value,
        rel_address: document.getElementById('rec-rel-address').value,
        rel_date: document.getElementById('rec-rel-date').value,
        rel_place: document.getElementById('rec-rel-place').value,
        signature: document.getElementById('sig-preview-img').src
    };

    const records = JSON.parse(localStorage.getItem('patient_records') || '{}');
    records[currentRecordPatientId] = recordData;
    localStorage.setItem('patient_records', JSON.stringify(records));

    showNotification('Patient case record saved successfully!', 'success');
}

function toggleRadioDeSelection(radio) {
    if (radio.wasChecked) {
        radio.checked = false;
        radio.wasChecked = false;
    } else {
        const name = radio.name;
        document.querySelectorAll('input[name="' + name + '"]').forEach(r => r.wasChecked = false);
        radio.wasChecked = true;
    }
}

