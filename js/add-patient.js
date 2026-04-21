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

    // Demo / LocalStorage Logic (Prioritized as requested for no backend)
    try {
        const patients = JSON.parse(localStorage.getItem('patients') || '[]');

        // Generate a robust unique ID
        const timestamp = Date.now();
        const now = new Date();
        const patientId = `P-${timestamp.toString().slice(-6)}`;
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

        const settings = JSON.parse(localStorage.getItem('hospitalSettings') || '{}');
        const isICU = bed.toLowerCase().includes('icu');
        const dailyCharge = isICU ? (parseFloat(settings['icu-charge']) || 5000) : (parseFloat(settings['ward-charge']) || 2000);
        const doctorFee = parseFloat(settings['consultation-fee']) || 500;

        const baseTotal = dailyCharge + doctorFee;

        const newPatient = {
            id: String(timestamp),
            patient_id: patientId,
            name: name,
            age: parseInt(age),
            gender: gender,
            mobile: mobile,
            guardian_name: guardian,
            bed_no: bed,
            wardChargePerDay: dailyCharge,
            doctorFees: doctorFee,
            surgeonCharges: 0,
            totalBill: baseTotal,
            pending_amount: baseTotal,
            address: address,
            problem: problem || 'N/A',
            doctor_assigned: doctor || 'Unassigned',
            admission_date: today,
            admission_time: currentTime,
            status: 'Admitted',
            payment_status: 'Pending',
            surgeries: [],
            created_by: (currentUser ? currentUser.id : 'system'),
            created_at: new Date().toISOString()
        };

        // Also pre-populate the billing record for this patient
        const billingRecords = JSON.parse(localStorage.getItem('billing_records') || '{}');
        const bedItemIndex = isICU ? 4 : 11; // Index 4: ICU, Index 11: Bed Charge
        let items = Array(22).fill(null).map(() => ({ fee: 0, days: 0 }));

        // Apply Dr Fees (Index 0)
        items[0] = { name: "DR. FEES", fee: doctorFee, days: 1 };
        // Apply Bed Charge (Indices 4 or 11)
        items[bedItemIndex] = { name: isICU ? "i C.U CHARAGE" : "BED CHARGE", fee: dailyCharge, days: 1 };

        billingRecords[patientId] = {
            discount: 0,
            payments: [],
            items: items
        };
        localStorage.setItem('billing_records', JSON.stringify(billingRecords));

        patients.push(newPatient);
        localStorage.setItem('patients', JSON.stringify(patients));

        // Attempting API call in background but not blocking
        fetch(`${API_BASE}patients.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify(newPatient)
        }).catch(err => console.log("Offline mode: saved to local only"));

        setTimeout(() => {
            hideLoading();
            showNotification(`Patient ${name} admitted successfully! ID: ${patientId}`, 'success');
            document.getElementById('patient-form').reset();
            showModule('patients');
        }, 1000);

    } catch (error) {
        console.error('Error adding patient:', error);
        hideLoading();
        showNotification('Failed to add patient. Please check local storage space.', 'error');
    }
}