// ==================== ADD PATIENT MODULE ====================

function renderAddPatient() {
    const moduleEl = document.getElementById('module-add-patient');
    if (!moduleEl) return;

    moduleEl.innerHTML = `
        <div class="add-patient-container">
            <div class="module-header">
                <h2>Admit New Patient</h2>
                <button class="btn" onclick="showModule('patients')">
                    <i class="fas fa-arrow-left"></i> Back to Patients
                </button>
            </div>
            
            <form id="patient-form" class="patient-form" onsubmit="event.preventDefault(); addPatient();">
                <div class="form-section">
                    <h3><i class="fas fa-user"></i> Personal Information</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" id="p-name" required>
                        </div>
                        <div class="form-group">
                            <label>Age *</label>
                            <input type="number" id="p-age" required min="1" max="120">
                        </div>
                        <div class="form-group">
                            <label>Guardian / Relative Name *</label>
                            <input type="text" id="p-guardian" placeholder="S/o, D/o, W/o - Father/Husband Name" required>
                        </div>
                        <div class="form-group">
                            <label>Bed Number *</label>
                            <input type="text" id="p-bed" placeholder="ICU-2, Ward-3" required>
                        </div>
                        <div class="form-group">
                            <label>Gender *</label>
                            <select id="p-gender" required>
                                <option value="">Select</option>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Mobile Number *</label>
                            <input type="tel" id="p-mobile" required pattern="[0-9]{10}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3><i class="fas fa-home"></i> Address</h3>
                    <div class="form-group">
                        <label>Full Address *</label>
                        <textarea rows="3" id="p-address" required></textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3><i class="fas fa-stethoscope"></i> Medical Information</h3>
                    <div class="form-group">
                        <label>Condition/Problem</label>
                        <textarea rows="3" id="p-problem"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Assigned Doctor</label>
                        <select id="p-doctor">
                            <option>Dr. Bhoopendra Chaudhary</option>
                            
                        </select>
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
}

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