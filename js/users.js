// ==========================================
// USER MANAGEMENT MODULE
// ==========================================

let localUsers = [];

function renderUsers() {
    const module = document.getElementById('module-users');

    // Check if we already rendered the HTML structure
    if (document.getElementById('users-main-card')) return;

    module.innerHTML = `
        <style>
            .users-card {
                background: #ffffff;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                margin-top: 10px;
            }
            .users-card h2 {
                font-size: 22px;
                color: #2d3748;
                margin-bottom: 5px;
                font-weight: 700;
            }
            .users-stats {
                font-size: 15px;
                color: #4a5568;
                margin-bottom: 25px;
            }
            .users-stats strong {
                color: #1a202c;
                font-weight: 700;
            }
            .users-controls {
                display: flex;
                gap: 15px;
                margin-bottom: 25px;
                align-items: center;
            }
            .users-search {
                flex: 1;
                padding: 10px 15px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 14px;
                outline: none;
                transition: all 0.2s;
            }
            .users-search:focus {
                border-color: #a855f7;
                box-shadow: 0 0 0 3px rgba(168,85,247,0.1);
            }
            .users-filter {
                padding: 10px 15px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 14px;
                min-width: 150px;
                outline: none;
                background-color: white;
            }
            .btn-add-user {
                background: #10b981;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }
            .btn-add-user:hover {
                background: #059669;
                transform: translateY(-1px);
            }
            .users-table-wrapper {
                overflow-x: auto;
                background: white;
                border-radius: 8px;
            }
            .users-table {
                width: 100%;
                border-collapse: collapse;
            }
            .users-table th, .users-table td {
                padding: 16px 20px;
                text-align: left;
                border-bottom: 1px solid #f1f5f9;
            }
            .users-table th {
                font-weight: 700;
                color: #475569;
                background-color: #f8fafc;
                font-size: 14px;
            }
            .users-table tbody tr {
                transition: background-color 0.2s;
            }
            .users-table tbody tr:hover {
                background-color: #f8fafc;
            }
            .user-info-col {
                display: flex;
                flex-direction: column;
            }
            .user-name-row {
                font-weight: 600;
                color: #1e293b;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 15px;
            }
            .user-email-row {
                font-size: 13px;
                color: #64748b;
                margin-top: 4px;
            }
            .badge {
                padding: 5px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                display: inline-block;
                letter-spacing: 0.5px;
            }
            .badge-role-admin { background: #fee2e2; color: #dc2626; }
            .badge-role-doctor { background: #dbeafe; color: #2563eb; }
            .badge-role-receptionist { background: #fef9c3; color: #ca8a04; }
            .badge-role-staff { background: #f3e8ff; color: #9333ea; }

            .badge-status-active { background: #dcfce7; color: #16a34a; }
            .badge-status-pending { background: #ffedd5; color: #ea580c; }
            .badge-you {
                background: #e2e8f0;
                color: #64748b;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
                border: 1px solid #cbd5e1;
                font-weight: 700;
            }
            .action-btn {
                border: none;
                padding: 5px 12px;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                margin-right: 5px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                transition: all 0.2s;
            }
            .action-btn i {
                font-size: 10px;
            }
            .btn-edit { background: #3b82f6; }
            .btn-edit:hover { background: #2563eb; }
            .btn-delete { background: #ef4444; }
            .btn-delete:hover { background: #dc2626; }

            /* Modal CSS */
            .user-modal-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.6);
                backdrop-filter: blur(2px);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }
            .user-modal {
                background: white;
                padding: 30px;
                border-radius: 12px;
                width: 450px;
                max-width: 90%;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            }
            .user-modal h3 { 
                margin-top: 0;
                margin-bottom: 25px; 
                color: #1e293b;
                font-size: 20px;
            }
            .form-group { margin-bottom: 20px; }
            .form-group label { 
                display: block; 
                margin-bottom: 8px; 
                font-size: 14px; 
                color: #475569; 
                font-weight: 600;
            }
            .form-group input, .form-group select {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 14px;
                outline: none;
            }
            .form-group input:focus, .form-group select:focus {
                border-color: #3b82f6;
            }
            .modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-top: 30px;
            }
            .btn-cancel {
                background: #f1f5f9;
                color: #475569;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
            }
            .btn-cancel:hover {
                background: #e2e8f0;
            }
            .btn-save {
                background: #10b981;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
            }
            .btn-save:hover {
                background: #059669;
            }
        </style>

        <div class="users-card" id="users-main-card">
            <h2>User Management</h2>
            <div class="users-stats" id="users-stats-display">
                Total Users: <strong>0</strong> Pending Approvals: <strong>0</strong>
            </div>
            
            <div class="users-controls">
                <input type="text" id="searchUserInput" class="users-search" placeholder="Search users by name, username..." onkeyup="filterUsers()">
                <select id="filterUserStatus" class="users-filter" onchange="filterUsers()">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                </select>
                <button class="btn-add-user" onclick="openUserModal()"><i class="fas fa-user-plus"></i> Add User</button>
            </div>

            <div class="users-table-wrapper">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Name</th>
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

        <!-- Add/Edit User Modal -->
        <div class="user-modal-overlay" id="userModal">
            <div class="user-modal">
                <h3 id="userModalTitle">Add User</h3>
                <form id="userForm" onsubmit="saveUser(event)">
                    <input type="hidden" id="editUserId">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="userName" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="userEmail" required>
                    </div>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="userUsername" required>
                    </div>
                    <div class="form-group" id="passGroup">
                        <label>Password</label>
                        <input type="password" id="userPassword">
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <select id="userRole" required>
                            <option value="admin">Admin</option>
                            <option value="doctor">Doctor</option>
                            <option value="staff">Staff/Nurse</option>
                            <option value="receptionist">Receptionist</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="userStatus" required>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-cancel" onclick="closeUserModal()">Cancel</button>
                        <button type="submit" class="btn-save">Save User</button>
                    </div>
                </form>
            </div>
        </div>
    `;
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
            showNotification(result.message || 'Failed to load users', 'error');
        }
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

function displayUsers() {
    const usersList = document.getElementById('usersList');
    const search = document.getElementById('searchUserInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterUserStatus')?.value || 'all';

    if (!usersList) return;
    usersList.innerHTML = '';

    let total = localUsers.length;
    let pending = localUsers.filter(u => u.status === 'pending').length;

    localUsers.forEach(user => {
        // Filters
        const matchesSearch = user.name.toLowerCase().includes(search) || user.username.toLowerCase().includes(search);
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

        if (matchesSearch && matchesStatus) {
            const tr = document.createElement('tr');

            // Current User tag
            let youTag = '';
            if (window.currentUser && window.currentUser.username === user.username) {
                youTag = `<span class="badge-you">YOU</span>`;
            }

            // Role Badge configuration
            let roleBadgeClass = 'badge-role-staff';
            let roleDisplay = user.role.toUpperCase();

            if (user.role === 'admin') roleBadgeClass = 'badge-role-admin';
            else if (user.role === 'doctor') roleBadgeClass = 'badge-role-doctor';
            else if (user.role === 'receptionist') roleBadgeClass = 'badge-role-receptionist';
            else if (user.role === 'staff') {
                roleBadgeClass = 'badge-role-staff';
                roleDisplay = 'STAFF'; // ensuring consistent display
            }

            // Status Badge configuration
            let statusBadgeClass = 'badge-status-pending';
            if (user.status === 'active') statusBadgeClass = 'badge-status-active';

            const statusDisplay = user.status.charAt(0).toUpperCase() + user.status.slice(1);

            tr.innerHTML = `
                <td>
                    <div class="user-info-col">
                        <div class="user-name-row">${user.name} ${youTag}</div>
                        <div class="user-email-row">${user.email || ''}</div>
                    </div>
                </td>
                <td>${user.username}</td>
                <td><span class="badge ${roleBadgeClass}">${roleDisplay}</span></td>
                <td><span class="badge ${statusBadgeClass}">${statusDisplay}</span></td>
                <td>
                    <button class="action-btn btn-edit" onclick="editUser(${user.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn btn-delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            usersList.appendChild(tr);
        }
    });

    const statsDisplay = document.getElementById('users-stats-display');
    if (statsDisplay) {
        statsDisplay.innerHTML = `Total Users: <strong>${total}</strong> Pending Approvals: <strong>${pending}</strong>`;
    }
}

function filterUsers() {
    displayUsers();
}

function openUserModal() {
    document.getElementById('userModal').style.display = 'flex';
    document.getElementById('userForm').reset();
    document.getElementById('userModalTitle').innerText = 'Add User';
    document.getElementById('editUserId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('passGroup').style.display = 'block';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

function editUser(id) {
    const user = localUsers.find(u => u.id === id);
    if (!user) return;

    document.getElementById('userModal').style.display = 'flex';
    document.getElementById('userModalTitle').innerText = 'Edit User';

    document.getElementById('editUserId').value = user._id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userUsername').value = user.username;

    document.getElementById('userPassword').required = false;
    document.getElementById('userPassword').value = '';

    document.getElementById('userRole').value = user.role;
    document.getElementById('userStatus').value = user.status;
}

async function saveUser(e) {
    e.preventDefault();

    const id = document.getElementById('editUserId').value;
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const status = document.getElementById('userStatus').value;

    const userData = { name, email, username, role, status };
    if (password) userData.password = password;

    showLoading('Saving user...');
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
            showNotification(id ? 'User updated successfully' : 'User added successfully', 'success');
            closeUserModal();
            loadUsers();
        } else {
            showNotification(result.message || 'Error saving user', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Network error', 'error');
    }
}

async function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        showLoading('Deleting user...');
        try {
            const response = await fetch(`${API_BASE}auth/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('token') }
            });
            const result = await response.json();
            hideLoading();
            if (result.success) {
                showNotification('User deleted successfully', 'success');
                loadUsers();
            } else {
                showNotification(result.message || 'Error deleting user', 'error');
            }
        } catch (error) {
            hideLoading();
            showNotification('Network error', 'error');
        }
    }
}
