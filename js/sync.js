async function migrateLocalData() {
    let patients = [];
    let billing = {};
    let notes = [];
    let meds = [];
    let discharges = [];
    let settings = {};

    try {
        patients = JSON.parse(localStorage.getItem('patients') || '[]');
        billing = JSON.parse(localStorage.getItem('billing_records') || '{}');
        notes = JSON.parse(localStorage.getItem('vitals_register') || '[]');
        meds = JSON.parse(localStorage.getItem('medications_register') || '[]'); // Fixed key (was medication_register)
        discharges = JSON.parse(localStorage.getItem('discharge_records') || '[]');
        settings = JSON.parse(localStorage.getItem('hospitalSettings') || '{}');
    } catch (e) {
        console.error("Error parsing localStorage data:", e);
        showNotification('Local data is corrupted. Migration aborted.', 'error');
        return;
    }

    if (patients.length === 0 && notes.length === 0 && meds.length === 0 && discharges.length === 0 && Object.keys(settings).length === 0) {
        showNotification('No local data found to migrate.', 'info');
        return;
    }

    showLoading('Migrating data to Cloud Database...');
    let successCount = 0;
    let failCount = 0;

    try {
        // 1. Sync Settings
        if (Object.keys(settings).length > 0) {
            try {
                const res = await fetch(`${API_BASE}settings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                    },
                    body: JSON.stringify(settings)
                });
                if (res.ok) successCount++;
            } catch (e) { console.error("Settings sync failed", e); failCount++; }
        }

        // 2. Sync Patients & Billing
        for (const p of patients) {
            if (!p || !p.patient_id) continue;
            try {
                // First try to create/update the patient
                const pRes = await fetch(`${API_BASE}patients`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                    },
                    body: JSON.stringify(p)
                });
                
                if (pRes.ok) successCount++;
                else if (pRes.status === 500 || pRes.status === 409) {
                    // Likely duplicate patient_id, try update instead
                    await fetch(`${API_BASE}patients/${p.patient_id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                        },
                        body: JSON.stringify(p)
                    });
                }

                // Sync Billing specifically
                const pBilling = billing[p.patient_id];
                if (pBilling) {
                    await fetch(`${API_BASE}billing/${p.patient_id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                        },
                        body: JSON.stringify(pBilling)
                    });
                }
            } catch (e) {
                console.error(`Failed to sync patient ${p.patient_id}:`, e);
                failCount++;
            }
        }

        // 3. Sync Notes (Vitals)
        for (const n of notes) {
            if (!n || !n.patientId) continue;
            try {
                await fetch(`${API_BASE}notes/${n.patientId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                    },
                    body: JSON.stringify({ ...n, type: 'vitals', patient_id: n.patientId })
                });
                successCount++;
            } catch (e) { console.error("Vitals entry sync failed", e); failCount++; }
        }

        // 4. Sync Meds
        for (const m of meds) {
            if (!m || !m.patientId) continue;
            try {
                await fetch(`${API_BASE}notes/${m.patientId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                    },
                    body: JSON.stringify({ ...m, type: 'medication', patient_id: m.patientId, medType: m.type })
                });
                successCount++;
            } catch (e) { console.error("Medication entry sync failed", e); failCount++; }
        }

        // 5. Sync Discharges
        for (const d of discharges) {
            if (!d || !d.patientId) continue;
            try {
                await fetch(`${API_BASE}discharge`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                    },
                    body: JSON.stringify(d)
                });
                successCount++;
            } catch (e) { console.error("Discharge record sync failed", e); failCount++; }
        }

        hideLoading();
        if (failCount === 0) {
            showNotification('Migration successful! All data moved to MongoDB Atlas.', 'success');
        } else {
            showNotification(`Migration partial. ${successCount} items moved, ${failCount} failed. Check console for details.`, 'warning');
        }

    } catch (err) {
        hideLoading();
        showNotification('A critical error occurred during migration.', 'error');
        console.error("Critical migration error:", err);
    }
}

// Add a Sync button to the top right header actions (Disabled for clean non-developer UI)
function renderSyncUI() {
    // Hidden for end users (doctors/admins). Can still be manually triggered by a developer via browser console using migrateLocalData()
}
