async function migrateLocalData() {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const billing = JSON.parse(localStorage.getItem('billing_records') || '{}');
    const notes = JSON.parse(localStorage.getItem('vitals_register') || '[]');
    const meds = JSON.parse(localStorage.getItem('medication_register') || '[]');
    const discharges = JSON.parse(localStorage.getItem('discharge_records') || '[]');
    const settings = JSON.parse(localStorage.getItem('hospitalSettings') || '{}');

    showLoading('Migrating data to Cloud Database...');

    try {
        // 1. Sync Settings
        if (Object.keys(settings).length > 0) {
            await fetch(`${API_BASE}settings`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                },
                body: JSON.stringify(settings)
            });
        }

        // 2. Sync Patients & Billing
        for (const p of patients) {
            // Add billing items to patient object for unified creation if backend supports it
            // Or just call patients API
            await fetch(`${API_BASE}patients`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                },
                body: JSON.stringify(p)
            });

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
        }

        // 3. Sync Notes (Vitals)
        for (const n of notes) {
            await fetch(`${API_BASE}notes/${n.patientId}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                },
                body: JSON.stringify({ ...n, type: 'vitals', patient_id: n.patientId })
            });
        }

        // 4. Sync Meds
        for (const m of meds) {
            await fetch(`${API_BASE}notes/${m.patientId}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                },
                body: JSON.stringify({ ...m, type: 'medication', patient_id: m.patientId, medType: m.type })
            });
        }

        // 5. Sync Discharges
        for (const d of discharges) {
            await fetch(`${API_BASE}discharge`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
                },
                body: JSON.stringify(d)
            });
        }

        hideLoading();
        showNotification('Migration successful! All data moved to MongoDB Atlas.', 'success');
        
        // Optional: Clear localStorage to avoid confusion
        // localStorage.clear(); 
        
    } catch (err) {
        hideLoading();
        showNotification('Migration failed. Some data might not have moved.', 'error');
        console.error(err);
    }
}

// Add a Sync button to the top right header actions
function renderSyncUI() {
    const container = document.getElementById('header-actions');
    if (container && !document.getElementById('btn-migrate')) {
        const btn = document.createElement('button');
        btn.id = 'btn-migrate';
        btn.className = 'btn';
        btn.style.background = '#10b981';
        btn.style.color = 'white';
        btn.style.marginLeft = '10px';
        btn.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.2)';
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Cloud';
        btn.onclick = migrateLocalData;
        container.appendChild(btn);
    }
}
