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
                            <i class="fas fa-users"></i>
                            Total Users: <strong id="total-users-count">0</strong>
                        </div>
                        <div class="stat-item pending" id="pending-stat-item" style="display:none;">
                            <i class="fas fa-clock"></i>
                            Pending Approvals: <strong id="pending-users-count">0</strong>
                        </div>
                    </div>
                </div>
                
                <div class="users-controls">
                    <div class="search-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchUserInput" class="users-search" placeholder="Search by name, email or username..." onkeyup="filterUsers()">
                    </div>
                    <select id="filterUserStatus" class="users-filter" onchange="filterUsers()">
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="pending">Pending Only</option>
                        <option value="rejected">Rejected Only</option>
                    </select>
                    <button class="btn-add-user" onclick="openUserModal()">
                        <i class="fas fa-plus"></i> Add New User
                    </button>
                </div>

                <div class="users-table-wrapper">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>User Profile</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Status</th>
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
                                    <input type="text" id="userMobile" placeholder="Enter 10-digit mobile number">
                                </div>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label>Username *</label>
                                    <input type="text" id="userUsername" required placeholder="Choose a unique username">
                                </div>
                                <div class="form-group" id="passGroup">
                                    <label>Password *</label>
                                    <input type="password" id="userPassword" placeholder="Minimum 6 characters">
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
    try {
        const response = await fetch(`${API_BASE}auth/users`, {
            headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
        });
        const result = await response.json();
        if (result.success) {
            localUsers = result.users;
            displayUsers();
        } else {
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
                             user.username.toLowerCase().includes(search) ||
                             (user.email && user.email.toLowerCase().includes(search));
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

        if (matchesSearch && matchesStatus) {
            const tr = document.createElement('tr');
            
            // Initials for avatar
            const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            // Check if this is the current logged in user
            const isMe = window.currentUser && window.currentUser.username === user.username;
            const youTag = isMe ? `<span class="badge-you" style="margin-left: 5px;">(You)</span>` : '';

            // Approval Buttons for pending users
            let actionButtons = '';
            if (user.status === 'pending' && !isMe) {
                actionButtons = `
                    <button class="btn-icon approve" title="Approve User" onclick="quickUpdateStatus('${user._id}', 'active')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon reject" title="Reject User" onclick="quickUpdateStatus('${user._id}', 'rejected')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }

            tr.innerHTML = `
                <td>
                    <div class="user-main-info">
                        <div class="user-avatar-circle">${initials}</div>
                        <div class="user-name-box">
                            <div class="user-full-name">${user.name} ${youTag}</div>
                            <div class="user-sub-info"><i class="far fa-envelope"></i> ${user.email || 'No email'}</div>
                        </div>
                    </div>
                </td>
                <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px;">@${user.username}</code></td>
                <td><span class="role-pill role-${user.role}">${user.role.toUpperCase()}</span></td>
                <td><span class="status-badge status-${user.status}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span></td>
                <td>
                    <div class="action-buttons">
                        ${actionButtons}
                        <button class="btn-icon" title="Edit User" onclick="editUser('${user._id}')">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" title="Delete User" onclick="deleteUser('${user._id}')" ${isMe ? 'disabled' : ''}>
                            <i class="fas fa-trash-alt"></i>
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
    document.getElementById('userUsername').value = user.username;

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
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const status = document.getElementById('userStatus').value;

    const userData = { name, email, mobile, username, role, status };
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

