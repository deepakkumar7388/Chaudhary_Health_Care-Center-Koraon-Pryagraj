// ==================== HMS REAL-TIME CLIENT & LIVE NOTIFICATIONS ====================
// Socket.IO client for real-time updates across all panels + Live Notifications System
// Auto-connects and updates UI without page refresh

(function() {
    'use strict';

    let socket = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 5;

    function getBaseUrl() {
        if (typeof API_BASE !== 'undefined' && API_BASE) {
            return API_BASE.replace('/api', '').replace(/\/$/, '');
        }
        return 'https://chaudhary-hms-api-h7nl.onrender.com';
    }

    function getAuthToken() {
        return sessionStorage.getItem('token') || localStorage.getItem('token') || (window.currentUser && window.currentUser.token) || '';
    }

    function getUserRole() {
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            return (user.role || window.currentUser?.role || 'staff').toLowerCase();
        } catch { return 'staff'; }
    }

    function getUserId() {
        try {
            const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            return user._id || user.id || window.currentUser?._id || 'guest';
        } catch { return 'guest'; }
    }

    // ==================== CONNECT SOCKET ====================
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

            // Update notifications UI
            updateNotificationUI();

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

        // ==================== HMS REALTIME EVENTS ====================

        // New patient admitted
        socket.on('patient:admitted', (data) => {
            console.log('[Socket] patient:admitted', data);
            
            const notif = {
                id: `admit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                title: `New ${data.patient_type || 'IPD'} Admission: ${data.name}`,
                message: `${data.name} admitted${data.doctor_assigned ? ` under ${data.doctor_assigned}` : ''}${data.bed_no ? ` (Bed ${data.bed_no})` : ''}.`,
                timestamp: new Date().toISOString(),
                category: 'admission',
                type: 'info'
            };
            
            pushLiveNotification(notif);
            showRealtimeToast(`🏥 New ${data.patient_type || 'IPD'} Patient: ${data.name}`, 'info');
            ringNotificationBell();
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

            const notif = {
                id: `disch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                title: `Patient Discharged: ${data.name}`,
                message: `Patient ${data.name} (ID: ${data.patient_id || 'N/A'}) has been discharged.`,
                timestamp: new Date().toISOString(),
                category: 'discharge',
                type: 'success'
            };

            pushLiveNotification(notif);
            showRealtimeToast(`✅ Patient Discharged: ${data.name}`, 'success');
            ringNotificationBell();
            refreshCurrentPage('patients');
            refreshCurrentPage('dashboard');
        });

        // Billing paid
        socket.on('billing:paid', (data) => {
            console.log('[Socket] billing:paid', data);

            const notif = {
                id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                title: `Payment Received: ${data.name}`,
                message: `Payment of ₹${data.amount} received from ${data.name}.`,
                timestamp: new Date().toISOString(),
                category: 'billing',
                type: 'success'
            };

            pushLiveNotification(notif);
            showRealtimeToast(`💰 Payment: ₹${data.amount} from ${data.name}`, 'success');
            ringNotificationBell();
            refreshCurrentPage('billing');
        });

        // Bed updated
        socket.on('bed:updated', (data) => {
            console.log('[Socket] bed:updated', data);
            refreshCurrentPage('dashboard');
        });
    }

    // ==================== LIVE NOTIFICATIONS LOGIC ====================

    function getLiveSessionNotifications() {
        try {
            return JSON.parse(sessionStorage.getItem('hms_live_notifications') || '[]');
        } catch { return []; }
    }

    function saveLiveSessionNotifications(list) {
        try {
            sessionStorage.setItem('hms_live_notifications', JSON.stringify(list.slice(0, 50)));
        } catch (e) {}
    }

    let _notificationsList = getLiveSessionNotifications();
    let _activeFilter = 'all';

    function getReadIds() {
        try {
            return JSON.parse(sessionStorage.getItem('hms_read_notifs') || '[]');
        } catch { return []; }
    }

    function saveReadId(id) {
        const readIds = getReadIds();
        if (!readIds.includes(id)) {
            readIds.push(id);
            sessionStorage.setItem('hms_read_notifs', JSON.stringify(readIds.slice(-100)));
        }
    }

    function pushLiveNotification(notif) {
        if (!notif) return;
        
        // Prevent exact duplicate notifications within 3 seconds
        const isDuplicate = _notificationsList.some(n => 
            n.id === notif.id || 
            (n.title === notif.title && Math.abs(new Date(n.timestamp || Date.now()) - new Date(notif.timestamp || Date.now())) < 3000)
        );
        if (isDuplicate) return;

        _notificationsList.unshift(notif);
        if (_notificationsList.length > 50) _notificationsList.pop();
        saveLiveSessionNotifications(_notificationsList);
        ringNotificationBell();
        updateNotificationUI();
    }

    let _lastSeenDbEventTime = Date.now();

    async function syncDatabaseChanges() {
        const token = getAuthToken();
        if (!token) return;

        try {
            const apiEndpoint = `${getBaseUrl()}/api/notifications`;
            const res = await fetch(apiEndpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.notifications)) {
                    // Check for new notifications created after _lastSeenDbEventTime
                    const newEvents = data.notifications.filter(n => {
                        const t = new Date(n.timestamp).getTime();
                        return t > _lastSeenDbEventTime;
                    });

                    if (newEvents.length > 0) {
                        newEvents.forEach(evt => {
                            pushLiveNotification(evt);
                            showRealtimeToast(`🔔 ${evt.title}`, evt.type || 'info');
                        });
                    }

                    // Update watermark timestamp to latest event
                    if (data.notifications.length > 0) {
                        const topTime = new Date(data.notifications[0].timestamp).getTime();
                        if (topTime > _lastSeenDbEventTime) {
                            _lastSeenDbEventTime = topTime;
                        }
                    }
                }
            }
        } catch (err) {
            // silent catch
        }
    }

    // Auto-check for database changes every 4 seconds
    setInterval(syncDatabaseChanges, 4000);

    function updateNotificationUI() {
        const readIds = getReadIds();
        const unreadCount = _notificationsList.filter(n => !readIds.includes(n.id)).length;

        // Update badge with exact number (0 = hidden)
        const badges = document.querySelectorAll('#notification-badge, .notification-badge');
        badges.forEach(b => {
            if (unreadCount > 0) {
                b.textContent = unreadCount; // Exact count (1, 2, 3...)
                b.style.display = 'flex';
            } else {
                b.textContent = '0';
                b.style.display = 'none';
            }
        });

        renderNotificationItems();
    }

    function renderNotificationItems() {
        const container = document.getElementById('notification-items-container');
        if (!container) return;

        const readIds = getReadIds();
        let items = _notificationsList;

        if (_activeFilter !== 'all') {
            items = items.filter(n => (n.category || '').toLowerCase() === _activeFilter.toLowerCase());
        }

        if (items.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 50px 20px; color: #94a3b8;">
                    <i class="bi bi-bell-slash" style="font-size: 36px; opacity: 0.5;"></i>
                    <h5 style="font-size: 14px; font-weight: 700; margin: 10px 0 4px 0; color: var(--text-main);">No Notifications</h5>
                    <p style="font-size: 12px; margin: 0;">You're all caught up with hospital events.</p>
                </div>
            `;
            return;
        }

        const iconMap = {
            admission: 'bi-person-plus-fill',
            discharge: 'bi-box-arrow-right',
            billing: 'bi-coin',
            security: 'bi-shield-exclamation',
            system: 'bi-hdd-network'
        };

        const html = items.map(n => {
            const isUnread = !readIds.includes(n.id);
            const cat = (n.category || 'system').toLowerCase();
            const iconClass = iconMap[cat] || 'bi-bell-fill';
            const timeStr = timeAgo(n.timestamp);

            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="onNotificationClick('${n.id}', '${cat}')">
                    <div class="notif-item-icon ${cat}">
                        <i class="bi ${iconClass}"></i>
                    </div>
                    <div class="notif-item-content">
                        <div class="notif-item-title">${escapeHtml(n.title)}</div>
                        <div class="notif-item-msg">${escapeHtml(n.message)}</div>
                        <div class="notif-item-time"><i class="bi bi-clock" style="font-size: 9px; margin-right: 3px;"></i>${timeStr}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function timeAgo(dateString) {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.max(0, Math.floor((now - date) / 1000));

        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function ringNotificationBell() {
        const btns = document.querySelectorAll('.header-notification-btn');
        btns.forEach(btn => {
            btn.classList.remove('bell-ringing');
            void btn.offsetWidth; // trigger reflow
            btn.classList.add('bell-ringing');
            setTimeout(() => btn.classList.remove('bell-ringing'), 700);
        });
    }

    // ==================== GLOBAL WINDOW CONTROLS ====================

    window.toggleNotificationDrawer = function(forceState) {
        const drawer = document.getElementById('notification-drawer');
        const overlay = document.getElementById('notification-drawer-overlay');
        if (!drawer || !overlay) return;

        const isOpen = drawer.classList.contains('active');
        const nextState = typeof forceState === 'boolean' ? forceState : !isOpen;

        if (nextState) {
            drawer.classList.add('active');
            overlay.classList.add('active');
            updateNotificationUI();
        } else {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
        }
    };

    window.filterNotifications = function(filter) {
        _activeFilter = filter;
        document.querySelectorAll('.notif-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-filter') === filter);
        });
        renderNotificationItems();
    };

    window.markAllNotificationsRead = function() {
        _notificationsList = [];
        saveLiveSessionNotifications([]);
        sessionStorage.removeItem('hms_read_notifs');
        localStorage.removeItem('hms_read_notifs');
        updateNotificationUI();
    };

    window.onNotificationClick = function(id, category) {
        saveReadId(id);
        updateNotificationUI();

        // Navigate to related module if relevant
        if (typeof showModule === 'function') {
            if (category === 'admission' || category === 'patient') {
                window.toggleNotificationDrawer(false);
                showModule('patients');
            } else if (category === 'discharge') {
                window.toggleNotificationDrawer(false);
                showModule('discharge');
            } else if (category === 'billing') {
                window.toggleNotificationDrawer(false);
                showModule('billing');
            } else if (category === 'security') {
                window.toggleNotificationDrawer(false);
                showModule('users');
            }
        }
    };

    // ==================== REFRESH HELPERS ====================
    function refreshCurrentPage(pageId) {
        const hash = window.location.hash.replace('#', '');
        if (hash !== pageId) return;

        const refreshFunctions = {
            'patients': () => typeof loadPatients === 'function' && loadPatients(),
            'dashboard': () => typeof renderDashboard === 'function' && renderDashboard(),
            'billing': () => typeof loadBillingData === 'function' && loadBillingData(),
            'reports': () => typeof window.updateReportsDashboard === 'function' && window.updateReportsDashboard()
        };

        const fn = refreshFunctions[pageId];
        if (fn) {
            setTimeout(fn, 500);
        }
    }

    // ==================== TOAST NOTIFICATION ====================
    function showRealtimeToast(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        const toast = document.createElement('div');
        const colors = {
            info: '#0284c7',
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b'
        };
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: colors[type] || colors.info,
            color: 'white',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: '600',
            zIndex: '999999',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            maxWidth: '340px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });
        toast.innerHTML = `<i class="bi bi-bell-fill"></i> <span>${escapeHtml(message)}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // ==================== PUBLIC API ====================
    window.hmsSocket = {
        connect: connectSocket,
        getSocket: () => socket,
        emit: (event, data) => socket && socket.emit(event, data),
        isConnected: () => socket && socket.connected,
        fetchNotifications: fetchLiveNotifications,
        pushNotification: pushLiveNotification
    };

    // Auto-connect on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            connectSocket();
            updateNotificationUI();
        });
    } else {
        setTimeout(() => {
            connectSocket();
            updateNotificationUI();
        }, 100);
    }

})();
