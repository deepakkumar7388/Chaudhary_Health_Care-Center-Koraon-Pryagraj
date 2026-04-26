// ==================== ADD PATIENT MODULE ====================

function renderAddPatient() {
    const moduleEl = document.getElementById('module-add-patient');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="add-patient-container">
            <div class="module-header">
                <h2>Admit New Patient</h2>
                <button class="btn" onclick="showModule('patients')">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            </div>
            
            <form id="patient-form" class="patient-form" onsubmit="event.preventDefault(); addPatient();">
                <div class="form-section">
                    <h3><i class="fas fa-user"></i> Patient Details</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" id="p-name" required placeholder="Patient name">
                        </div>
                        <div class="form-group">
                            <label>Age *</label>
                            <input type="number" id="p-age" required min="1" max="120" placeholder="Age">
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
                            <input type="text" id="p-guardian" placeholder="S/o, D/o, W/o" required>
                        </div>
                        <div class="form-group">
                            <label>Mobile *</label>
                            <input type="tel" id="p-mobile" required pattern="[0-9]{10}" placeholder="10-digit number">
                        </div>
                        <div class="form-group">
                            <label>Bed Number *</label>
                            <select id="p-bed" class="filter-select" required disabled>
                                <option value="">Select Gender First</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3><i class="fas fa-home"></i> Address</h3>
                    <div class="form-group">
                        <label>Full Address *</label>
                        <textarea rows="2" id="p-address" required placeholder="Village, Post, District, State"></textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3><i class="fas fa-stethoscope"></i> Medical Info</h3>
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
                        <div class="form-group">
                            <label>Condition / Problem</label>
                            <textarea rows="2" id="p-problem" placeholder="Symptoms or diagnosis"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Assigned Doctor</label>
                            <select id="p-doctor">
                                <option>Dr. Bhoopendra Chaudhary</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-user-plus"></i> Admit Patient
                    </button>
                    <button type="reset" class="btn">
                        <i class="fas fa-redo"></i> Reset
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Load available beds
    loadAvailableBeds();
}

async function loadAvailableBeds() {
    try {
        const response = await fetch(`${API_BASE}patients/available-beds`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();
        
        if (result.success) {
            window.availableBedsList = result.beds || [];
            filterBedsByGender();
        }
    } catch (error) {
        console.error('Error loading available beds:', error);
    }
}

window.filterBedsByGender = function() {
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

    const groups = {
        'General Ward (Male)': [],
        'General Ward (Female)': [],
        'ICU Ward': [],
        'Private Room': [],
        'Others': []
    };

    allBeds.forEach(bed => {
        if (bed.startsWith('Male-G')) {
            if (gender === 'Male') groups['General Ward (Male)'].push(bed);
        }
        else if (bed.startsWith('Female-G')) {
            if (gender === 'Female') groups['General Ward (Female)'].push(bed);
        }
        else if (bed.startsWith('ICU-')) {
            groups['ICU Ward'].push(bed);
        }
        else if (bed.startsWith('Private-')) {
            groups['Private Room'].push(bed);
        }
        else {
            groups['Others'].push(bed);
        }
    });

    for (const [groupName, beds] of Object.entries(groups)) {
        if (beds.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            beds.forEach(bed => {
                const option = document.createElement('option');
                option.value = bed;
                option.textContent = bed;
                optgroup.appendChild(option);
            });
            bedSelect.appendChild(optgroup);
        }
    }
};


async function addPatient() {
    const name = document.getElementById('p-name').value.trim();
    const age = document.getElementById('p-age').value;
    const gender = document.getElementById('p-gender').value;
    const mobile = document.getElementById('p-mobile').value.trim();
    const guardian = document.getElementById('p-guardian').value.trim();
    const bed = document.getElementById('p-bed').value.trim();
    const address = document.getElementById('p-address').value.trim();
    const problem = document.getElementById('p-problem').value.trim();
    const doctor = document.getElementById('p-doctor').value;

    if (!name || !age || !gender || !mobile || !address || !guardian || !bed) {
        showNotification('Please fill all required fields', 'error', 'Validation Error');
        return;
    }

    showLoading('Admitting patient...');

    try {
        const timestamp = Date.now();
        const patientId = `P-${timestamp.toString().slice(-6)}`;
        
        const settings = window.hospitalSettings || {};
        const isICU = bed.toLowerCase().includes('icu');
        const dailyCharge = isICU ? (parseFloat(settings['icu-charge']) || 5000) : (parseFloat(settings['ward-charge']) || 2000);
        const doctorFee = parseFloat(settings['consultation-fee']) || 500;
        const baseTotal = dailyCharge + doctorFee;

        const newPatient = {
            patient_id: patientId,
            name, age: parseInt(age), gender, mobile,
            guardian_name: guardian,
            bed_no: bed,
            wardChargePerDay: dailyCharge,
            doctorFees: doctorFee,
            totalBill: baseTotal,
            pending_amount: baseTotal,
            address, problem,
            doctor_assigned: doctor || 'Unassigned',
            status: 'Admitted'
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
            showNotification(`Patient ${name} admitted successfully! ID: ${patientId}`, 'success');
            document.getElementById('patient-form').reset();
            showModule('patients');
        } else {
            showNotification(result.message || 'Failed to add patient', 'error');
        }
    } catch (error) {
        console.error('Error adding patient:', error);
        hideLoading();
        showNotification('Network error', 'error');
    }
}