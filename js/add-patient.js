// ==================== ADD PATIENT MODULE ====================

function renderAddPatient() {
    const moduleEl = document.getElementById('module-add-patient');
    if (!moduleEl) return;

    const role = currentUser?.role;

    moduleEl.innerHTML = `
        <div class="add-patient-container">
            <div class="module-header">
                <h2 id="add-patient-title">Admit/Register New Patient</h2>
                <button class="btn" onclick="goBack('patients')">
                    <i class="bi bi-arrow-left"></i> <span>Back</span>
                </button>
            </div>
            
            <form id="patient-form" class="patient-form" onsubmit="event.preventDefault(); addPatient();">

                <!-- ── PATIENT TYPE TOGGLE ── -->
                <div class="form-section" style="padding-bottom: 0;">
                    <div style="display: flex; gap: 8px; align-items: stretch;">
                        <label id="type-btn-ipd" onclick="selectPatientType('IPD')" style="flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:11px 12px; border-radius:10px; cursor:pointer; border:1px solid #047857; background:linear-gradient(135deg,#059669,#047857); color:#fff; font-weight:600; font-size:13px; transition:all 0.2s; user-select:none; box-shadow:0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                            <input type="radio" name="p-type" value="IPD" checked style="display:none;">
                            <i class="fas fa-bed" style="font-size:15px;"></i>
                            <span>IPD</span>
                        </label>
                        <label id="type-btn-opd" onclick="selectPatientType('OPD')" style="flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:11px 12px; border-radius:10px; cursor:pointer; border:1px solid var(--border, #e2e8f0); background:var(--card-bg, #ffffff); color:var(--text-muted, #64748b); font-weight:600; font-size:13px; transition:all 0.2s; user-select:none; box-shadow:0 1px 3px rgba(0, 0, 0, 0.05);">
                            <input type="radio" name="p-type" value="OPD" style="display:none;">
                            <i class="bi bi-person-check" style="font-size:15px;"></i>
                            <span>OPD</span>
                        </label>
                    </div>
                </div>

                <!-- ── OPD FAST FORM ── -->
                <div id="opd-form-section" style="display:none;">
                    <div class="form-section">
                        <h3><i class="bi bi-person"></i> Patient Details</h3>
                        <div class="form-grid">
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Full Name *</label>
                                <input type="text" id="opd-name" required placeholder="" autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label>Age *</label>
                                <input type="number" id="opd-age" required min="1" max="120" placeholder="">
                            </div>
                            <div class="form-group">
                                <label>Gender *</label>
                                <select id="opd-gender" required>
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="bi bi-house"></i> Address</h3>
                        <div class="form-group">
                            <label>Full Address *</label>
                            <textarea rows="2" id="opd-address" required placeholder=""></textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="bi bi-activity"></i> Medical Info</h3>
                        <div class="form-grid">
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Condition / Problem *</label>
                                <textarea rows="2" id="opd-problem" required placeholder=""></textarea>
                            </div>
                            <div class="form-group">
                                <label>Department *</label>
                                <select id="opd-dept" required onchange="filterDoctorsByDept('OPD')">
                                    <option value="">Select Department</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Assigned Doctor *</label>
                                <select id="opd-doctor" required onchange="updateOpdConsultationFee()" disabled>
                                    <option value="">Select Department First</option>
                                </select>
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Consultation Fee (₹)</label>
                                <input type="number" id="opd-consult-fee" min="0" placeholder="" readonly style="cursor: not-allowed;">
                            </div>
                        </div>
                        <!-- Optional mobile number -->
                        <div class="form-group" style="margin-top:8px;">
                            <label>Mobile <span style="font-size:11px; color:#94a3b8; font-weight:400;">(Optional)</span></label>
                            <input type="tel" id="opd-mobile" pattern="[0-9]{10}" placeholder="Optional" maxlength="10">
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary" style="background: linear-gradient(135deg,#059669,#047857); border:none; padding:8px 18px; font-size:13px;">
                            <i class="bi bi-person-plus"></i> Register OPD
                        </button>
                        <button type="button" class="btn" style="padding:8px 14px; font-size:13px;" onclick="document.getElementById('patient-form').reset(); selectPatientType('OPD');">
                            <i class="bi bi-arrow-repeat"></i> Reset
                        </button>
                    </div>
                </div>

                <!-- ── IPD FULL FORM ── -->
                <div id="ipd-form-section">
                    <div class="form-section">
                        <h3><i class="bi bi-person"></i> Patient Details</h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Full Name *</label>
                                <input type="text" id="p-name" required placeholder="" autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label>Age *</label>
                                <input type="number" id="p-age" required min="1" max="120" placeholder="">
                            </div>
                            <div class="form-group">
                                <label>Gender *</label>
                                <select id="p-gender" required onchange="filterBedsByGender()">
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Guardian Name *</label>
                                <input type="text" id="p-guardian" placeholder="" required>
                            </div>
                            <div class="form-group">
                                <label>Mobile *</label>
                                <input type="tel" id="p-mobile" required pattern="[0-9]{10}" placeholder="">
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="p-email" placeholder="Optional">
                            </div>
                            <div class="form-group" id="bed-group">
                                <label>Bed Number *</label>
                                <select id="p-bed" class="filter-select" required disabled>
                                    <option value="">Select Gender First</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3><i class="bi bi-house"></i> Address</h3>
                        <div class="form-group">
                            <label>Full Address *</label>
                            <textarea rows="2" id="p-address" required placeholder=""></textarea>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3><i class="bi bi-activity"></i> Medical Info</h3>
                        <div class="form-grid" style="grid-template-columns: 1fr 1fr; align-items: flex-start;">
                            <div class="form-group">
                                <label>Condition / Problem</label>
                                <textarea rows="3" id="p-problem" placeholder="" style="min-height: 80px;"></textarea>
                            </div>
                            <div class="form-group" style="display: none;">
                                <label>Department</label>
                                <select id="p-dept" onchange="filterDoctorsByDept('IPD')">
                                    <option value="">Select Department</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Assigned Doctor *</label>
                                <select id="p-doctor" onchange="updateConsultationFee()" required>
                                    <option value="">Select Doctor</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary" style="padding:8px 18px; font-size:13px;">
                            <i class="bi bi-person-plus"></i> Admit Patient
                        </button>
                        <button type="reset" class="btn" style="padding:8px 14px; font-size:13px;">
                            <i class="bi bi-arrow-repeat"></i> Reset
                        </button>
                    </div>
                </div>

            </form>
        </div>
    `;

    // Load available beds and init fields
    loadAvailableBeds().then(() => {
        initOPDFields();
        // Default: IPD selected
        selectPatientType('IPD');
        restoreAddPatientDraft();
    });
}

// ── Patient Type Toggle (new clean version) ──
window.selectPatientType = function(type) {
    const ipdRadio = document.querySelector('input[name="p-type"][value="IPD"]');
    const opdRadio = document.querySelector('input[name="p-type"][value="OPD"]');
    const ipdBtn   = document.getElementById('type-btn-ipd');
    const opdBtn   = document.getElementById('type-btn-opd');
    const ipdForm  = document.getElementById('ipd-form-section');
    const opdForm  = document.getElementById('opd-form-section');
    const title    = document.getElementById('add-patient-title');

    if (type === 'OPD') {
        if (opdRadio) opdRadio.checked = true;
        if (ipdRadio) ipdRadio.checked = false;

        // Buttons style
        if (opdBtn) { 
            opdBtn.style.background = 'linear-gradient(135deg,#059669,#047857)'; 
            opdBtn.style.color = '#fff'; 
            opdBtn.style.borderColor = '#047857';
            opdBtn.style.boxShadow = '0 4px 6px -1px rgba(5, 150, 105, 0.2)';
        }
        if (ipdBtn) { 
            ipdBtn.style.background = 'var(--card-bg, #ffffff)'; 
            ipdBtn.style.color = 'var(--text-muted, #64748b)'; 
            ipdBtn.style.borderColor = 'var(--border, #e2e8f0)'; 
            ipdBtn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        }

        // Show/hide sections
        if (opdForm) opdForm.style.display = 'block';
        if (ipdForm) ipdForm.style.display = 'none';
        if (title) title.textContent = 'Register OPD Patient';

        // Remove IPD required attrs to prevent validation block
        ['p-name','p-age','p-gender','p-guardian','p-mobile','p-address','p-problem','p-doctor','p-dept'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.removeAttribute('required');
        });
        const bedSel = document.getElementById('p-bed');
        if (bedSel) { bedSel.removeAttribute('required'); bedSel.disabled = true; }

        // Set OPD required attrs
        ['opd-name','opd-age','opd-gender','opd-address','opd-problem','opd-dept','opd-doctor'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('required','required');
        });

    } else {
        if (ipdRadio) ipdRadio.checked = true;
        if (opdRadio) opdRadio.checked = false;

        // Buttons style
        if (ipdBtn) { 
            ipdBtn.style.background = 'linear-gradient(135deg,#059669,#047857)'; 
            ipdBtn.style.color = '#fff'; 
            ipdBtn.style.borderColor = '#047857';
            ipdBtn.style.boxShadow = '0 4px 6px -1px rgba(5, 150, 105, 0.2)';
        }
        if (opdBtn) { 
            opdBtn.style.background = 'var(--card-bg, #ffffff)'; 
            opdBtn.style.color = 'var(--text-muted, #64748b)'; 
            opdBtn.style.borderColor = 'var(--border, #e2e8f0)'; 
            opdBtn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        }

        // Show/hide sections
        if (ipdForm) ipdForm.style.display = 'block';
        if (opdForm) opdForm.style.display = 'none';
        if (title) title.textContent = 'Admit New Patient (IPD)';

        // Restore IPD required attrs
        ['p-name','p-age','p-gender','p-guardian','p-mobile','p-address','p-dept','p-doctor'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('required','required');
        });
        const bedSel = document.getElementById('p-bed');
        if (bedSel) { bedSel.setAttribute('required','required'); }

        // Remove OPD required attrs
        ['opd-name','opd-age','opd-gender','opd-address','opd-problem','opd-dept','opd-doctor'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.removeAttribute('required');
        });
    }
};

// Legacy toggle (kept for compatibility)
window.togglePatientTypeFields = function() {
    const pTypeRadio = document.querySelector('input[name="p-type"]:checked');
    const pType = pTypeRadio ? pTypeRadio.value : 'IPD';
    selectPatientType(pType);
};

async function loadAvailableBeds() {
    try {
        const token = sessionStorage.getItem('token');
        if (!token) { showNotification('Authentication error: Please login again', 'error'); return; }

        // ── Cache: pehle localStorage se instantly load karo ──
        const CACHE_KEY = 'cache_available_beds';
        const CACHE_TTL = 5 * 60 * 1000; // 5 minute
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const { beds, ts } = JSON.parse(cached);
                const age = Date.now() - ts;
                if (beds && Array.isArray(beds)) {
                    // Cache se instantly show karo
                    window.availableBedsList = beds;
                    filterBedsByGender();
                    // Agar cache fresh hai (5 min) to DB call mat karo
                    if (age < CACHE_TTL) return;
                }
            } catch(e) { /* ignore bad cache */ }
        }

        // ── Background me DB se fresh data fetch karo ──
        const response = await fetch(`${API_BASE}patients/available-beds`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            if (response.status === 401) { showNotification('Session expired. Please login again.', 'error'); return; }
            // Cache tha to error mat dikhaao
            if (!cached) showNotification(`Error ${response.status}: Failed to load beds`, 'error');
            return;
        }

        const result = await response.json();
        if (result.success) {
            const freshBeds = result.beds || [];
            // Cache update karo
            localStorage.setItem(CACHE_KEY, JSON.stringify({ beds: freshBeds, ts: Date.now() }));
            window.availableBedsList = freshBeds;
            filterBedsByGender();
        } else {
            if (!cached) showNotification(result.error || 'Failed to load beds', 'error');
        }
    } catch (error) {
        console.error('Network Error loading beds:', error);
    }
}

window.filterBedsByGender = function () {
    const genderSelect = document.getElementById('p-gender');
    const bedSelect = document.getElementById('p-bed');
    if (!genderSelect || !bedSelect) return;

    const gender = genderSelect.value;
    const allBeds = window.availableBedsList || [];

    if (!gender) {
        bedSelect.innerHTML = '<option value="">Select Gender First</option>';
        bedSelect.disabled = true;
        return;
    }

    bedSelect.disabled = false;
    bedSelect.innerHTML = '<option value="">Select Bed</option>';

    if (allBeds.length === 0) {
        bedSelect.innerHTML += '<option value="" disabled>No beds available</option>';
        return;
    }

    const groups = {};
    if (gender === 'Male') groups['👨 Male Ward (General)'] = allBeds.filter(b => b.startsWith('Male-G'));
    else if (gender === 'Female') groups['👩 Female Ward (General)'] = allBeds.filter(b => b.startsWith('Female-G'));

    const icuBeds     = allBeds.filter(b => b.startsWith('ICU-'));
    const privateBeds = allBeds.filter(b => b.startsWith('Private-'));
    if (icuBeds.length > 0) groups['🏥 ICU Ward'] = icuBeds;
    if (privateBeds.length > 0) groups['🚪 Private Room'] = privateBeds;

    for (const [groupName, beds] of Object.entries(groups)) {
        if (beds.length > 0) {
            const og = document.createElement('optgroup');
            og.label = groupName;
            beds.forEach(bed => {
                const opt = document.createElement('option');
                opt.value = bed;
                opt.textContent = bed;
                og.appendChild(opt);
            });
            bedSelect.appendChild(og);
        }
    }
};

async function addPatient() {
    const pTypeRadio = document.querySelector('input[name="p-type"]:checked');
    const patient_type = pTypeRadio ? pTypeRadio.value : 'IPD';

    if (patient_type === 'OPD') {
        return await addOpdPatient();
    } else {
        return await addIpdPatient();
    }
}

// ── OPD Registration (simplified) ──
async function addOpdPatient() {
    const name    = document.getElementById('opd-name')?.value.trim() || '';
    const age     = document.getElementById('opd-age')?.value || '';
    const gender  = document.getElementById('opd-gender')?.value || '';
    const address = document.getElementById('opd-address')?.value.trim() || '';
    const problem = document.getElementById('opd-problem')?.value.trim() || '';
    const dept    = document.getElementById('opd-dept')?.value || '';
    const doctor  = document.getElementById('opd-doctor')?.value || '';
    const fee     = parseFloat(document.getElementById('opd-consult-fee')?.value) || 0;
    const mobile  = document.getElementById('opd-mobile')?.value.trim() || '';

    if (!name || !age || !gender || !address || !problem || !dept || !doctor) {
        showNotification('Please fill all required fields (Name, Age, Gender, Address, Problem, Department, Doctor)', 'error');
        return;
    }

    showLoading('Registering OPD patient...');

    try {
        const newPatient = {
            name,
            age: parseInt(age),
            gender,
            mobile: mobile || '',
            guardian_name: '',          // OPD me optional
            email: null,
            bed_no: null,
            wardChargePerDay: 0,
            doctorFees: fee,
            totalBill: fee,
            pending_amount: fee,
            address,
            problem,
            doctor_assigned: doctor,
            status: 'Admitted',
            payment_status: fee > 0 ? 'Paid' : 'Pending',
            patient_type: 'OPD'
        };

        const response = await fetch(`${API_BASE}patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify(newPatient)
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            sessionStorage.removeItem('addPatientDraft');
            // Cache invalidate karo
            localStorage.removeItem('patients');
            localStorage.removeItem('cache_available_beds'); // beds cache clear
            showNotification(`OPD Patient Registered! ID: ${result.patient.patient_id} — ${name}`, 'success');
            document.getElementById('patient-form').reset();
            selectPatientType('OPD'); // OPD form ready for next patient
        } else {
            showNotification(result.message || result.error || 'Failed to register OPD patient', 'error');
        }
    } catch (error) {
        console.error('OPD Register Error:', error);
        hideLoading();
        showNotification('Network error', 'error');
    }
}

// ── IPD Admission (full form) ──
async function addIpdPatient() {
    const name     = document.getElementById('p-name').value.trim();
    const age      = document.getElementById('p-age').value;
    const gender   = document.getElementById('p-gender').value;
    const mobile   = document.getElementById('p-mobile').value.trim();
    const email    = document.getElementById('p-email').value.trim() || null;
    const guardian = document.getElementById('p-guardian').value.trim();
    const bed      = document.getElementById('p-bed').value.trim();
    const address  = document.getElementById('p-address').value.trim();
    const problem  = document.getElementById('p-problem').value.trim();
    const doctor   = document.getElementById('p-doctor').value;

    if (!name || !age || !gender || !mobile || !address || !guardian || !bed) {
        showNotification('Please fill all required fields', 'error', 'Validation Error');
        return;
    }

    showLoading('Admitting patient...');

    try {
        const settings = window.hospitalSettings || {};
        const isICU     = bed.toLowerCase().includes('icu');
        const dailyCharge = isICU ? (parseFloat(settings['icu-charge']) || 5000) : (parseFloat(settings['ward-charge']) || 2000);
        let doctorFee = 0;
        if (settings['doctor-fees'] !== undefined && settings['doctor-fees'] !== '') {
            doctorFee = parseFloat(settings['doctor-fees']) || 0;
        } else if (settings['consultation-fee'] !== undefined && settings['consultation-fee'] !== '') {
            doctorFee = parseFloat(settings['consultation-fee']) || 0;
        }
        const baseTotal   = dailyCharge + doctorFee;

        const newPatient = {
            name, age: parseInt(age), gender, mobile, email,
            guardian_name: guardian,
            bed_no: bed,
            wardChargePerDay: dailyCharge,
            doctorFees: doctorFee,
            totalBill: baseTotal,
            pending_amount: baseTotal,
            address, problem,
            doctor_assigned: doctor || 'Unassigned',
            status: 'Admitted',
            patient_type: 'IPD'
        };

        const response = await fetch(`${API_BASE}patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify(newPatient)
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            sessionStorage.removeItem('addPatientDraft');
            localStorage.removeItem('patients');
            localStorage.removeItem('cache_available_beds'); // beds cache clear — bed ab occupied hai
            showNotification(`Patient ${name} admitted successfully! ID: ${result.patient.patient_id}`, 'success');
            document.getElementById('patient-form').reset();
            showModule('patients');
        } else {
            showNotification(result.message || result.error || 'Failed to add patient', 'error');
        }
    } catch (error) {
        console.error('Error adding patient:', error);
        hideLoading();
        showNotification('Network error', 'error');
    }
}

function saveAddPatientDraft() {
    const pTypeRadio = document.querySelector('input[name="p-type"]:checked');
    const pType = pTypeRadio ? pTypeRadio.value : 'IPD';

    if (pType === 'OPD') {
        const draft = {
            type: 'OPD',
            name:    document.getElementById('opd-name')?.value || '',
            age:     document.getElementById('opd-age')?.value || '',
            gender:  document.getElementById('opd-gender')?.value || '',
            address: document.getElementById('opd-address')?.value || '',
            problem: document.getElementById('opd-problem')?.value || '',
            dept:    document.getElementById('opd-dept')?.value || '',
            doctor:  document.getElementById('opd-doctor')?.value || '',
            fee:     document.getElementById('opd-consult-fee')?.value || '',
            mobile:  document.getElementById('opd-mobile')?.value || ''
        };
        sessionStorage.setItem('addPatientDraft', JSON.stringify(draft));
    } else {
        const draft = {
            type: 'IPD',
            name:    document.getElementById('p-name')?.value || '',
            age:     document.getElementById('p-age')?.value || '',
            gender:  document.getElementById('p-gender')?.value || '',
            mobile:  document.getElementById('p-mobile')?.value || '',
            email:   document.getElementById('p-email')?.value || '',
            guardian:document.getElementById('p-guardian')?.value || '',
            bed:     document.getElementById('p-bed')?.value || '',
            address: document.getElementById('p-address')?.value || '',
            problem: document.getElementById('p-problem')?.value || '',
            dept:    document.getElementById('p-dept')?.value || '',
            doctor:  document.getElementById('p-doctor')?.value || ''
        };
        sessionStorage.setItem('addPatientDraft', JSON.stringify(draft));
    }
}

function restoreAddPatientDraft() {
    const draftStr = sessionStorage.getItem('addPatientDraft');
    if (!draftStr) return;

    try {
        const draft = JSON.parse(draftStr);
        if (draft.type === 'OPD') {
            selectPatientType('OPD');
            if (draft.name)    document.getElementById('opd-name').value    = draft.name;
            if (draft.age)     document.getElementById('opd-age').value     = draft.age;
            if (draft.gender)  document.getElementById('opd-gender').value  = draft.gender;
            if (draft.address) document.getElementById('opd-address').value = draft.address;
            if (draft.problem) document.getElementById('opd-problem').value = draft.problem;
            if (draft.dept)    document.getElementById('opd-dept').value    = draft.dept;
            if (draft.dept)    window.filterDoctorsByDept('OPD');
            if (draft.doctor)  document.getElementById('opd-doctor').value  = draft.doctor;
            if (draft.fee)     document.getElementById('opd-consult-fee').value = draft.fee;
            if (draft.mobile)  document.getElementById('opd-mobile').value  = draft.mobile;
        } else {
            selectPatientType('IPD');
            if (draft.name)    document.getElementById('p-name').value    = draft.name;
            if (draft.age)     document.getElementById('p-age').value     = draft.age;
            if (draft.gender)  { document.getElementById('p-gender').value = draft.gender; window.filterBedsByGender?.(); }
            if (draft.mobile)  document.getElementById('p-mobile').value  = draft.mobile;
            if (draft.email)   document.getElementById('p-email').value   = draft.email;
            if (draft.guardian)document.getElementById('p-guardian').value = draft.guardian;
            if (draft.address) document.getElementById('p-address').value = draft.address;
            if (draft.problem) document.getElementById('p-problem').value = draft.problem;
            if (draft.dept)    document.getElementById('p-dept').value    = draft.dept;
            if (draft.dept)    window.filterDoctorsByDept('IPD');
            if (draft.doctor)  document.getElementById('p-doctor').value  = draft.doctor;
            if (draft.bed) {
                const bedSelect = document.getElementById('p-bed');
                if (bedSelect) { bedSelect.disabled = false; bedSelect.value = draft.bed; }
            }
        }
    } catch (e) {
        console.error("Error restoring draft:", e);
    }
}

// ==================== OPD DOCTOR FIELD HELPERS ====================

function getParsedDoctors() {
    const rawList = (window.hospitalSettings && window.hospitalSettings['hospital-doctors-list'])
        || 'Dr. Bhoopendra Chaudhary, General Medicine, 500';
    let doctors = [];
    
    if (rawList) {
        if (rawList.trim().startsWith('[')) {
            try {
                doctors = JSON.parse(rawList);
            } catch (e) {
                console.warn("Failed to parse doctors JSON list in add-patient.js", e);
            }
        }
        
        if (doctors.length === 0) {
            rawList.split('\n').forEach(line => {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const dept = parts[1].trim();
                    const fee  = parts[2] ? parseFloat(parts[2].trim()) || 0 : 0;
                    if (name && dept) doctors.push({ name, dept, fee });
                }
            });
        }
    }
    
    if (doctors.length === 0) {
        doctors.push({ name: 'Dr. Bhoopendra Chaudhary', dept: 'General Medicine', fee: 500 });
    }
    return doctors;
}

window.initOPDFields = function() {
    const doctors = getParsedDoctors();

    // Populate unique departments in both OPD and IPD department dropdowns
    const depts = [...new Set(doctors.map(d => d.dept))].filter(d => d);
    
    ['opd-dept', 'p-dept'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Select Department</option>';
            depts.forEach(dept => {
                const opt = document.createElement('option');
                opt.value = dept;
                opt.textContent = dept;
                select.appendChild(opt);
            });
            // Auto-select first department if available
            if (depts.length > 0) {
                select.value = depts[0];
            }
        }
    });

    // Populate and filter doctors based on the selected (or default) department
    ['OPD', 'IPD'].forEach(type => {
        window.filterDoctorsByDept(type);
    });
};

window.filterDoctorsByDept = function(type) {
    const isOpd = (type === 'OPD');
    const deptSelect = document.getElementById(isOpd ? 'opd-dept' : 'p-dept');
    const docSelect = document.getElementById(isOpd ? 'opd-doctor' : 'p-doctor');
    const feeInput = document.getElementById(isOpd ? 'opd-consult-fee' : 'p-consult-fee');
    
    if (!deptSelect || !docSelect) return;
    
    const selectedDept = deptSelect.value;
    const doctors = getParsedDoctors();
    
    docSelect.innerHTML = '';
    
    if (isOpd && !selectedDept) {
        docSelect.innerHTML = '<option value="">Select Department First</option>';
        docSelect.disabled = true;
        if (feeInput) feeInput.value = '';
        return;
    }
    
    docSelect.disabled = false;
    docSelect.innerHTML = '<option value="">Select Doctor</option>';
    
    // For OPD, filter by department; for IPD, show all doctors directly
    const filteredDocs = isOpd ? doctors.filter(doc => doc.dept === selectedDept) : doctors;
    filteredDocs.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.name;
        opt.textContent = doc.name;
        opt.dataset.fee = doc.fee;
        opt.dataset.dept = doc.dept;
        docSelect.appendChild(opt);
    });
    
    // Auto-select first doctor if available
    if (filteredDocs.length > 0) {
        docSelect.value = filteredDocs[0].name;
        if (isOpd) {
            window.updateOpdConsultationFee();
        } else {
            window.updateConsultationFee();
        }
    } else {
        if (feeInput) feeInput.value = '';
    }
};

// OPD doctor change → auto-fill fee
window.updateOpdConsultationFee = function() {
    const docSelect = document.getElementById('opd-doctor');
    const feeInput  = document.getElementById('opd-consult-fee');
    if (!docSelect || !feeInput) return;
    const sel = docSelect.options[docSelect.selectedIndex];
    feeInput.value = sel?.dataset?.fee || '';
    // Trigger input event to update floating label state
    feeInput.dispatchEvent(new Event('input', { bubbles: true }));
};

// IPD doctor change
window.updateConsultationFee = function() {
    const docSelect = document.getElementById('p-doctor');
    if (!docSelect) return;
    const sel = docSelect.options[docSelect.selectedIndex];
    
    // Auto-sync the hidden p-dept to the selected doctor's department
    const dept = sel?.dataset?.dept || '';
    const pDeptSelect = document.getElementById('p-dept');
    if (pDeptSelect) {
        pDeptSelect.value = dept;
    }
};

// Legacy - kept for compatibility
window.populateDoctorsByDept = function() {};
