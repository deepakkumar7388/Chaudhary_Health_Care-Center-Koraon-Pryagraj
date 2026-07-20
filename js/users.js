// ==========================================
// USER MANAGEMENT MODULE (Premium Redesign)
// ==========================================

let localUsers = [];

function renderUsers() {
    const module = document.getElementById('module-users');
    if (!module) return;

    module.innerHTML = `
        <div class="users-container">
            <div class="users-card" id="users-main-card">
                <div class="users-header">
                    <h2>User Management Panel</h2>
                    <div class="users-stats" id="users-stats-display">
                        <div class="stat-item">
                            <i class="bi bi-people"></i>
                            Total Users: <strong id="total-users-count">0</strong>
                        </div>
                        <div class="stat-item pending" id="pending-stat-item" style="display:none;">
                            <i class="bi bi-clock"></i>
                            Pending Approvals: <strong id="pending-users-count">0</strong>
                        </div>
                    </div>
                </div>
                
                <div class="users-controls">
                    <div class="search-wrapper">
                        <i class="bi bi-search"></i>
                        <input type="text" id="searchUserInput" class="users-search" placeholder="Search by name or email..." onkeyup="filterUsers()">
                    </div>
                    <select id="filterUserStatus" class="users-filter" onchange="filterUsers()">
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="pending">Pending Only</option>
                        <option value="rejected">Rejected Only</option>
                    </select>
                    <button class="btn-add-user" onclick="openUserModal()">
                        <i class="bi bi-plus-lg"></i> Add New User
                    </button>
                </div>

                <div class="users-table-wrapper">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>User Profile</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Billing Access</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersList">
                            <!-- Users will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Add/Edit User Modal (Standard Modal structure used for consistency) -->
        <div id="user-modal-global" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 id="userModalTitle">Add New User</h3>
                    <button class="modal-close" onclick="closeUserModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="userForm" onsubmit="saveUser(event)">
                        <input type="hidden" id="editUserId">
                        <div class="form-grid" style="grid-template-columns: 1fr;">
                            <div class="form-group">
                                <label>Full Name *</label>
                                <input type="text" id="userName" required placeholder="Enter full name">
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label>Email Address *</label>
                                    <input type="email" id="userEmail" required placeholder="email@hospital.com">
                                </div>
                                <div class="form-group">
                                    <label>Mobile Number</label>
                                    <input type="text" id="userMobile" placeholder="Optional">
                                </div>
                            </div>
                            <div class="form-group" id="passGroup">
                                <label>Password *</label>
                                <div class="password-wrapper">
                                    <input type="password" id="userPassword" placeholder="Minimum 6 characters">
                                    <i class="bi bi-eye toggle-password" onclick="togglePasswordVisibility('userPassword', this)"></i>
                                </div>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label>System Role</label>
                                    <select id="userRole" required>
                                        <option value="staff">Staff / Nurse</option>
                                        <option value="receptionist">Receptionist</option>
                                        <option value="doctor">Doctor</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Account Status</label>
                                    <select id="userStatus" required>
                                        <option value="active">Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="submit" form="userForm" class="btn-primary">Save User Details</button>
                    <button type="button" class="btn" onclick="closeUserModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;

    loadUsers();
}

async function loadUsers() {
    // Step 1: Cache se instant load
    const cached = localStorage.getItem('users');
    if (cached) {
        try {
            localUsers = JSON.parse(cached);
            displayUsers();
        } catch (e) { /* cache invalid */ }
    }

    // Step 2: Background mein fresh data lo
    try {
        const response = await fetch(`${API_BASE}auth/users`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') },
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            // 🔒 SECURITY: Frontend double-protection — hide developer accounts from non-developers
            const currentRole = currentUser?.role;
            localUsers = currentRole === 'developer'
                ? result.users
                : result.users.filter(u => u.role !== 'developer');
            localStorage.setItem('users', JSON.stringify(localUsers));
            displayUsers(); // silently update
        } else if (!cached) {
            showNotification(result.message || 'Failed to load user database', 'error');
        }
    } catch (error) {
        console.error("User loading error:", error);
    }
}

function displayUsers() {
    const usersList = document.getElementById('usersList');
    const search = document.getElementById('searchUserInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterUserStatus')?.value || 'all';

    if (!usersList) return;
    usersList.innerHTML = '';

    const pendingCount = localUsers.filter(u => u.status === 'pending').length;
    const totalCount = localUsers.length;

    // Update stats UI
    const totalEl = document.getElementById('total-users-count');
    const pendingEl = document.getElementById('pending-users-count');
    const pendingStatItem = document.getElementById('pending-stat-item');

    if (totalEl) totalEl.textContent = totalCount;
    if (pendingEl) {
        pendingEl.textContent = pendingCount;
        if (pendingStatItem) pendingStatItem.style.display = pendingCount > 0 ? 'flex' : 'none';
    }

    localUsers.forEach(user => {
        const matchesSearch = user.name.toLowerCase().includes(search) || 
                             (user.email && user.email.toLowerCase().includes(search));
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

        if (matchesSearch && matchesStatus) {
            const tr = document.createElement('tr');
            
            // Initials for avatar
            const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            // Check if this is the current logged in user
            const isMe = window.currentUser && window.currentUser.email === user.email;
            const youTag = isMe ? `<span class="badge-you" style="margin-left: 5px;">(You)</span>` : '';

            // Approval Buttons for pending users
            let actionButtons = '';
            if (user.status === 'pending' && !isMe) {
                actionButtons = `
                    <button class="btn-icon approve" title="Approve User" onclick="quickUpdateStatus('${user._id}', 'active')">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn-icon reject" title="Reject User" onclick="quickUpdateStatus('${user._id}', 'rejected')">
                        <i class="bi bi-x-lg"></i>
                    </button>
                `;
            }

            // Avatar: show image if available, otherwise initials
            let avatarHtml = '';
            if (user.avatar) {
                const baseUrl = (window.API_BASE || '/api/').replace('/api/', '');
                const avatarUrl = user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `${baseUrl}${user.avatar}`;
                avatarHtml = `<div class="user-avatar-circle" style="overflow:hidden; cursor:pointer;" onclick="event.stopPropagation(); openLightbox('${avatarUrl.replace(/'/g, "\\'")}', '${user.name.replace(/'/g, "\\'")}')">
                    <img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover;" alt="${user.name}">
                </div>`;
            } else {
                avatarHtml = `<div class="user-avatar-circle">${initials}</div>`;
            }

            tr.innerHTML = `
                <td>
                    <div class="user-main-info">
                        ${avatarHtml}
                        <div class="user-name-box">
                            <div class="user-full-name">${user.name} ${youTag}</div>
                            <div class="user-sub-info"><i class="bi bi-envelope"></i> ${user.email || 'No email'}</div>
                        </div>
                    </div>
                </td>
                <td><code style="background:var(--background); padding:2px 6px; border-radius:4px;">${user.email || 'N/A'}</code></td>
                <td><span class="role-pill role-${user.role}">${user.role.toUpperCase()}</span></td>
                <td><span class="status-badge status-${user.status}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span></td>
                <td>
                    ${(user.role === 'admin' || user.role === 'developer')
                        ? `<span style="font-size:11px;color:#6b7280;font-style:italic;">Always On</span>`
                        : `<label class="billing-toggle" title="${user.billingAccess ? 'Revoke Billing Access' : 'Grant Billing Access'}">
                               <input type="checkbox" ${user.billingAccess ? 'checked' : ''}
                                   onchange="toggleBillingAccess('${user._id}', this.checked)">
                               <span class="billing-slider"></span>
                           </label>`
                    }
                </td>
                <td>
                    <div class="action-buttons">
                        ${actionButtons}
                        <button class="btn-icon" title="Edit User" onclick="editUser('${user._id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-icon delete" title="Delete User" onclick="deleteUser('${user._id}')" ${isMe ? 'disabled' : ''}>
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            usersList.appendChild(tr);
        }
    });
}

function filterUsers() {
    displayUsers();
}

function openUserModal() {
    const modal = document.getElementById('user-modal-global');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('userForm').reset();
    document.getElementById('userModalTitle').innerText = 'Register New System User';
    document.getElementById('editUserId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('passGroup').style.display = 'block';
    document.getElementById('userStatus').value = 'active';
}

function closeUserModal() {
    const modal = document.getElementById('user-modal-global');
    if (modal) modal.style.display = 'none';
}

function editUser(id) {
    const user = localUsers.find(u => u._id === id);
    if (!user) return;

    const modal = document.getElementById('user-modal-global');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('userModalTitle').innerText = 'Update User Profile';

    document.getElementById('editUserId').value = user._id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userMobile').value = user.mobile || '';

    document.getElementById('userPassword').required = false;
    document.getElementById('userPassword').value = '';
    document.getElementById('passGroup').style.display = 'none'; // Only change pass via specialized tool or re-signup

    document.getElementById('userRole').value = user.role;
    document.getElementById('userStatus').value = user.status;
}

async function quickUpdateStatus(id, newStatus) {
    const user = localUsers.find(u => u._id === id);
    if (!user) return;

    showLoading(`${newStatus === 'active' ? 'Approving' : 'Rejecting'} user...`);
    try {
        const response = await fetch(`${API_BASE}auth/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();
        hideLoading();
        if (result.success) {
            showNotification(`User ${newStatus === 'active' ? 'approved' : 'rejected'} successfully`, 'success');
            loadUsers();
        } else {
            showNotification(result.message || 'Action failed', 'error');
        }
    } catch (err) {
        hideLoading();
        showNotification('Connection error', 'error');
    }
}

async function saveUser(e) {
    e.preventDefault();

    const id = document.getElementById('editUserId').value;
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const mobile = document.getElementById('userMobile').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const status = document.getElementById('userStatus').value;

    const userData = { name, email, mobile, role, status };
    if (password) userData.password = password;

    showLoading('Saving changes...');
    try {
        const url = id ? `${API_BASE}auth/users/${id}` : `${API_BASE}auth/signup`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        hideLoading();
        if (result.success) {
            showNotification(id ? 'Profile updated successfully' : 'Account created successfully', 'success');
            closeUserModal();
            loadUsers();
        } else {
            showNotification(result.message || 'Error processing request', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Network communication error', 'error');
    }
}

async function deleteUser(id) {
    if (confirm('Permanently delete this user? This action cannot be undone.')) {
        showLoading('Removing user...');
        try {
            const response = await fetch(`${API_BASE}auth/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
            });
            const result = await response.json();
            hideLoading();
            if (result.success) {
                showNotification('User deleted from system', 'success');
                loadUsers();
            } else {
                showNotification(result.message || 'Delete failed', 'error');
            }
        } catch (error) {
            hideLoading();
            showNotification('Network error during deletion', 'error');
        }
    }
}

async function toggleBillingAccess(userId, grant) {
    try {
        const response = await fetch(`${API_BASE}auth/users/${userId}/billing-access`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('token')
            },
            credentials: 'include',
            body: JSON.stringify({ billingAccess: grant })
        });
        const result = await response.json();
        if (result.success) {
            showNotification(
                grant ? 'Billing access granted successfully.' : 'Billing access revoked.',
                grant ? 'success' : 'warning',
                'Billing Access'
            );
            // Update local cache
            const user = localUsers.find(u => u._id === userId);
            if (user) user.billingAccess = grant;
        } else {
            showNotification(result.message || 'Failed to update billing access.', 'error');
            loadUsers(); // Reload to reset toggle state
        }
    } catch (err) {
        showNotification('Network error. Please try again.', 'error');
        loadUsers();
    }
}

// Global exposure
window.renderUsers = renderUsers;
window.loadUsers = loadUsers;
window.filterUsers = filterUsers;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
window.editUser = editUser;
window.quickUpdateStatus = quickUpdateStatus;
window.toggleBillingAccess = toggleBillingAccess;

