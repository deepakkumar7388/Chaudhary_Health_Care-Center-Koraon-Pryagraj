// ==================== HMS REAL-TIME CLIENT ====================
// Socket.IO client for real-time updates across all panels
// Auto-connects and updates UI without page refresh

(function() {
    'use strict';

    let socket = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 5;

    function getBaseUrl() {
        const loc = window.location;
        if (loc.protocol === 'file:' || loc.hostname === '127.0.0.1' || loc.hostname === 'localhost') {
            return 'http://127.0.0.1:5000';
        }
        return 'https://chaudhary-health-care-center-koraon-bbw0.onrender.com';
    }

    function getUserRole() {
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            return (user.role || 'staff').toLowerCase();
        } catch { return 'staff'; }
    }

    function getUserId() {
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            return user._id || user.id || 'guest';
        } catch { return 'guest'; }
    }

    // ==================== CONNECT ====================
    function connectSocket() {
        if (typeof io === 'undefined') {
            console.warn('[Socket] socket.io-client not loaded. Real-time disabled.');
            return;
        }

        socket = io(getBaseUrl(), {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: MAX_RECONNECT,
            timeout: 10000
        });

        socket.on('connect', () => {
            reconnectAttempts = 0;
            console.log('[Socket] Connected:', socket.id);

            // Join role-based room
            socket.emit('join', {
                role: getUserRole(),
                userId: getUserId()
            });

            // Show reconnect success toast if was disconnected
            if (window._socketWasDisconnected) {
                showRealtimeToast('🔗 Real-time connection restored', 'success');
                window._socketWasDisconnected = false;
            }
        });

        socket.on('disconnect', (reason) => {
            console.warn('[Socket] Disconnected:', reason);
            window._socketWasDisconnected = true;
        });

        socket.on('connect_error', (err) => {
            reconnectAttempts++;
            console.error(`[Socket] Connection error (${reconnectAttempts}/${MAX_RECONNECT}):`, err.message);
        });

        // ==================== HMS EVENTS ====================

        // New patient admitted
        socket.on('patient:admitted', (data) => {
            console.log('[Socket] patient:admitted', data);
            showRealtimeToast(`🏥 New ${data.patient_type || 'IPD'} Patient: ${data.name}`, 'info');
            refreshCurrentPage('patients');
            refreshCurrentPage('dashboard');
        });

        // Patient updated
        socket.on('patient:updated', (data) => {
            console.log('[Socket] patient:updated', data);
            refreshCurrentPage('patients');
        });

        // Patient discharged
        socket.on('patient:discharged', (data) => {
            console.log('[Socket] patient:discharged', data);
            showRealtimeToast(`✅ Patient Discharged: ${data.name}`, 'success');
            refreshCurrentPage('patients');
            refreshCurrentPage('dashboard');
        });

        // Billing paid
        socket.on('billing:paid', (data) => {
            console.log('[Socket] billing:paid', data);
            showRealtimeToast(`💰 Payment: ₹${data.amount} from ${data.name}`, 'success');
            refreshCurrentPage('billing');
        });

        // Bed updated
        socket.on('bed:updated', (data) => {
            console.log('[Socket] bed:updated', data);
            refreshCurrentPage('dashboard');
        });
    }

    // ==================== REFRESH HELPERS ====================
    // Trigger re-render only if user is currently on that page

    function refreshCurrentPage(pageId) {
        const hash = window.location.hash.replace('#', '');
        if (hash !== pageId) return;

        // Call existing page refresh functions if available
        const refreshFunctions = {
            'patients': () => typeof loadPatients === 'function' && loadPatients(),
            'dashboard': () => typeof renderDashboard === 'function' && renderDashboard(),
            'billing': () => typeof loadBillingData === 'function' && loadBillingData(),
            'reports': () => typeof window.updateReportsDashboard === 'function' && window.updateReportsDashboard()
        };

        const fn = refreshFunctions[pageId];
        if (fn) {
            setTimeout(fn, 500); // Small delay to ensure DB is committed
        }
    }

    // ==================== TOAST NOTIFICATION ====================
    function showRealtimeToast(message, type = 'info') {
        // Use existing showNotification if available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Fallback: simple toast
        const toast = document.createElement('div');
        const colors = {
            info: '#3b82f6',
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b'
        };
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            background: colors[type] || colors.info,
            color: 'white',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: '99999',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            maxWidth: '320px',
            animation: 'slideIn 0.3s ease'
        });
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // ==================== PUBLIC API ====================
    window.hmsSocket = {
        connect: connectSocket,
        getSocket: () => socket,
        emit: (event, data) => socket && socket.emit(event, data),
        isConnected: () => socket && socket.connected
    };

    // Auto-connect on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', connectSocket);
    } else {
        // DOMContentLoaded already fired
        setTimeout(connectSocket, 100);
    }

})();
