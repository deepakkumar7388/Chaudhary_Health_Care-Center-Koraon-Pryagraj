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

        // Client joins a role-based room
        socket.on('join', ({ role, userId }) => {
            if (role) {
                socket.join(role); // e.g., 'admin', 'doctor', 'staff', 'receptionist'
                socket.join('all'); // everyone
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
    io.to(room).emit(event, { ...data, timestamp: new Date().toISOString() });
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

module.exports = {
    initSocket,
    getIO,
    emitEvent,
    emitPatientAdmitted,
    emitPatientDischarged,
    emitPatientUpdated,
    emitBillingPaid,
    emitBedUpdated
};
