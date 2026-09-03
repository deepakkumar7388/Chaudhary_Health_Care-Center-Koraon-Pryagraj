// ==================== SOCKET.IO HANDLER ====================
// Manages real-time rooms and event broadcasting across all connected clients

let io = null;

/**
 * Initialize socket.io with the HTTP server
 */
function initSocket(httpServer) {
    const { Server } = require('socket.io');

    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);
        socket.join('all'); // Auto join 'all' room on every connect

        // Client joins a role-based room
        socket.on('join', (data) => {
            const role = typeof data === 'string' ? data : (data && data.role);
            if (role) {
                socket.join(role.toLowerCase());
                console.log(`[Socket.IO] ${socket.id} joined room: ${role}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    console.log('[Socket.IO] Initialized successfully');
    return io;
}

/**
 * Get the io instance (for use in controllers)
 */
function getIO() {
    return io;
}

/**
 * Emit to a specific room or 'all'
 */
function emitEvent(room, event, data) {
    if (!io) return;
    const payload = { ...data, timestamp: new Date().toISOString() };
    if (room === 'all' || !room) {
        io.emit(event, payload); // Broadcasts to ALL connected sockets
    } else {
        io.to(room).emit(event, payload);
    }
}

// ==================== HMS EVENT EMITTERS ====================

function emitPatientAdmitted(patient) {
    emitEvent('all', 'patient:admitted', {
        patient_id: patient.patient_id,
        name: patient.name,
        patient_type: patient.patient_type || 'IPD',
        bed_no: patient.bed_no,
        doctor_assigned: patient.doctor_assigned,
        message: `New ${patient.patient_type || 'IPD'} patient admitted: ${patient.name}`
    });
}

function emitPatientDischarged(patient) {
    emitEvent('all', 'patient:discharged', {
        patient_id: patient.patient_id,
        name: patient.name,
        message: `Patient discharged: ${patient.name}`
    });
}

function emitPatientUpdated(patient) {
    emitEvent('all', 'patient:updated', {
        patient_id: patient.patient_id,
        name: patient.name,
        status: patient.status,
        bed_no: patient.bed_no,
        message: `Patient record updated: ${patient.name}`
    });
}

function emitBillingPaid(patientName, amount) {
    emitEvent('admin', 'billing:paid', {
        name: patientName,
        amount,
        message: `Payment of ₹${amount} received from ${patientName}`
    });
}

function emitBedUpdated(bedInfo) {
    emitEvent('all', 'bed:updated', {
        ...bedInfo,
        message: `Bed status updated`
    });
}

function emitDailyNoteAdded(note, patientName, addedBy) {
    let title = `📝 Clinical Note: ${patientName}`;
    let message = `${addedBy || note.addedBy || 'Staff'} recorded note for ${patientName}.`;

    if (note.type === 'vitals') {
        title = `🩺 Observation Added: ${patientName}`;
        const parts = [];
        if (note.bp) parts.push(`BP: ${note.bp}`);
        if (note.pulse) parts.push(`Pulse: ${note.pulse}`);
        if (note.temp) parts.push(`Temp: ${note.temp}`);
        if (note.spo2) parts.push(`SpO2: ${note.spo2}%`);
        const vitalsStr = parts.length > 0 ? ` (${parts.join(', ')})` : '';
        message = `${addedBy || note.addedBy || 'Staff'} recorded vitals${vitalsStr}.`;
    } else if (note.type === 'medication') {
        title = `💊 Medicine Scheduled: ${patientName}`;
        message = `${addedBy || note.addedBy || 'Doctor'} scheduled ${note.drugName || 'Medicine'} (${note.dose || '1 dose'}, ${note.medType || 'Oral'}) for ${note.time || 'Prescribed time'}.`;
    }

    const payload = {
        patient_id: note.patient_id,
        patient_name: patientName,
        note_type: note.type,
        title,
        message,
        addedBy: addedBy || note.addedBy
    };
    emitEvent('all', 'note:added', payload);
}

module.exports = {
    initSocket,
    getIO,
    emitEvent,
    emitPatientAdmitted,
    emitPatientDischarged,
    emitPatientUpdated,
    emitBillingPaid,
    emitBedUpdated,
    emitDailyNoteAdded
};
