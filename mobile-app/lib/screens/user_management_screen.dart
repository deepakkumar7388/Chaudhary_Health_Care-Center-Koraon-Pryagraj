import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});

  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _filteredUsers = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _statusFilter = 'all';
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    final result = await ApiService.getUsers();
    if (result['success'] == true) {
      final list = List<Map<String, dynamic>>.from(result['users'] ?? []);
      final filtered = RoleAccess.isDeveloper
          ? list
          : list.where((u) => u['role'] != 'developer').toList();
      setState(() {
        _users = filtered;
        _applyFilter();
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
      if (mounted) {
        _showSnack(result['message'] ?? 'Failed to load users', isError: true);
      }
    }
  }

  void _applyFilter() {
    final q = _searchQuery.toLowerCase();
    _filteredUsers = _users.where((u) {
      final matchSearch = q.isEmpty ||
          (u['name'] ?? '').toString().toLowerCase().contains(q) ||
          (u['email'] ?? '').toString().toLowerCase().contains(q);
      final matchStatus = _statusFilter == 'all' ||
          (u['status'] ?? '').toString().toLowerCase() == _statusFilter;
      return matchSearch && matchStatus;
    }).toList();
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    final topPadding = MediaQuery.of(context).padding.top + 10;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        margin: EdgeInsets.only(
          bottom: MediaQuery.of(context).size.height - topPadding - 70,
          left: 16,
          right: 16,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Future<void> _toggleBillingAccess(Map<String, dynamic> user, bool grant) async {
    final id = user['_id']?.toString() ?? '';
    if (id.isEmpty) return;
    setState(() {
      final idx = _users.indexWhere((u) => u['_id'] == id);
      if (idx != -1) _users[idx]['billingAccess'] = grant;
      _applyFilter();
    });
    final result = await ApiService.toggleBillingAccess(id, grant);
    if (result['success'] == true) {
      _showSnack(grant ? 'Billing & Discharge access granted' : 'Billing access revoked');
    } else {
      setState(() {
        final idx = _users.indexWhere((u) => u['_id'] == id);
        if (idx != -1) _users[idx]['billingAccess'] = !grant;
        _applyFilter();
      });
      _showSnack(result['message'] ?? 'Failed to update access', isError: true);
    }
  }

  Future<void> _quickUpdateStatus(String id, String status) async {
    final result = await ApiService.updateUser(id, {'status': status});
    if (result['success'] == true) {
      _showSnack(status == 'active' ? 'User approved' : 'User rejected');
      await _loadUsers();
    } else {
      _showSnack(result['message'] ?? 'Failed to update status', isError: true);
    }
  }

  Future<void> _deleteUser(String id, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete User', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Permanently delete "$name"? This action cannot be undone.', style: GoogleFonts.inter()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel', style: GoogleFonts.inter())),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Delete', style: GoogleFonts.inter(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final result = await ApiService.deleteUser(id);
    if (result['success'] == true) {
      _showSnack('User deleted successfully');
      await _loadUsers();
    } else {
      _showSnack(result['message'] ?? 'Delete failed', isError: true);
    }
  }

  void _openAddEditSheet({Map<String, dynamic>? user}) {
    final isEdit = user != null;
    final nameCtrl = TextEditingController(text: user?['name'] ?? '');
    final emailCtrl = TextEditingController(text: user?['email'] ?? '');
    final mobileCtrl = TextEditingController(text: user?['mobile'] ?? '');
    final passCtrl = TextEditingController();
    String selectedRole = user?['role'] ?? 'staff';
    String selectedStatus = user?['status'] ?? 'active';
    final formKey = GlobalKey<FormState>();
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (ctx, setModal) => Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              top: 24, left: 20, right: 20,
            ),
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40, height: 4,
                        decoration: BoxDecoration(color: Colors.grey[400], borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(isEdit ? 'Update User Profile' : 'Register New User',
                        style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 20),
                    _FormField(label: 'Full Name *', controller: nameCtrl,
                        validator: (v) => v!.trim().isEmpty ? 'Name required' : null, isDark: isDark),
                    const SizedBox(height: 12),
                    _FormField(label: 'Email Address *', controller: emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) => v!.trim().isEmpty ? 'Email required' : null, isDark: isDark),
                    const SizedBox(height: 12),
                    _FormField(label: 'Mobile Number', controller: mobileCtrl,
                        keyboardType: TextInputType.phone, isDark: isDark),
                    const SizedBox(height: 12),
                    if (!isEdit) ...[
                      _FormField(label: 'Password *', controller: passCtrl,
                          obscureText: true,
                          validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null,
                          isDark: isDark),
                      const SizedBox(height: 12),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: _DropdownField(
                            label: 'System Role', value: selectedRole,
                            items: const ['staff', 'receptionist', 'doctor', 'admin'],
                            labels: const ['Staff / Nurse', 'Receptionist', 'Doctor', 'Administrator'],
                            isDark: isDark,
                            onChanged: (v) => setModal(() => selectedRole = v!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _DropdownField(
                            label: 'Account Status', value: selectedStatus,
                            items: const ['active', 'pending', 'rejected'],
                            labels: const ['Active', 'Pending', 'Rejected'],
                            isDark: isDark,
                            onChanged: (v) => setModal(() => selectedStatus = v!),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity, height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4F46E5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: isSaving ? null : () async {
                          if (!formKey.currentState!.validate()) return;
                          setModal(() => isSaving = true);
                          final data = {
                            'name': nameCtrl.text.trim(),
                            'email': emailCtrl.text.trim(),
                            'mobile': mobileCtrl.text.trim(),
                            'role': selectedRole,
                            'status': selectedStatus,
                            if (!isEdit && passCtrl.text.isNotEmpty) 'password': passCtrl.text,
                          };
                          final Map<String, dynamic> result;
                          if (isEdit) {
                            result = await ApiService.updateUser(user!['_id'], data);
                          } else {
                            result = await ApiService.createUser(data);
                          }
                          setModal(() => isSaving = false);
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (result['success'] == true) {
                            _showSnack(isEdit ? 'Profile updated successfully' : 'Account created successfully');
                            await _loadUsers();
                          } else {
                            _showSnack(result['message'] ?? 'Error processing request', isError: true);
                          }
                        },
                        child: isSaving
                            ? const SizedBox(width: 20, height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Text(isEdit ? 'Save Changes' : 'Create Account',
                                style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final totalCount = _users.length;
    final pendingCount = _users.where((u) => u['status'] == 'pending').length;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('User Management', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
            Text(
              '$totalCount users${pendingCount > 0 ? ' ? $pendingCount pending' : ''}',
              style: GoogleFonts.inter(
                fontSize: 11,
                color: pendingCount > 0 ? const Color(0xFFF59E0B) : (isDark ? Colors.white54 : Colors.black45),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _loadUsers, tooltip: 'Refresh'),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddEditSheet(),
        backgroundColor: const Color(0xFF4F46E5),
        icon: const Icon(Icons.person_add_rounded, color: Colors.white),
        label: Text('Add User', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: Column(
        children: [
          Container(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              children: [
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _searchCtrl,
                    style: GoogleFonts.inter(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Search by name or email...',
                      hintStyle: GoogleFonts.inter(fontSize: 13, color: isDark ? Colors.white38 : Colors.black38),
                      prefixIcon: Icon(Icons.search_rounded, size: 18, color: isDark ? Colors.white38 : Colors.black38),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 16),
                              onPressed: () { _searchCtrl.clear(); setState(() { _searchQuery = ''; _applyFilter(); }); })
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onChanged: (v) => setState(() { _searchQuery = v; _applyFilter(); }),
                  ),
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['all', 'active', 'pending', 'rejected'].map((s) {
                      final selected = _statusFilter == s;
                      final label = s == 'all' ? 'All' : s[0].toUpperCase() + s.substring(1);
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setState(() { _statusFilter = s; _applyFilter(); }),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: selected ? const Color(0xFF4F46E5) : (isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9)),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: selected ? const Color(0xFF4F46E5) : (isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                              ),
                            ),
                            child: Text(label,
                                style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: selected ? Colors.white : (isDark ? Colors.white60 : Colors.black54))),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredUsers.isEmpty
                    ? Center(
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Icon(Icons.people_outline_rounded, size: 64, color: isDark ? Colors.white24 : Colors.black12),
                          const SizedBox(height: 12),
                          Text('No users found', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: isDark ? Colors.white54 : Colors.black45)),
                          const SizedBox(height: 6),
                          Text('Try adjusting the search or filter', style: GoogleFonts.inter(fontSize: 13, color: isDark ? Colors.white38 : Colors.black38)),
                        ]),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadUsers,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                          itemCount: _filteredUsers.length,
                          itemBuilder: (_, i) => _UserCard(
                            user: _filteredUsers[i],
                            isDark: isDark,
                            onToggleBilling: _toggleBillingAccess,
                            onEdit: () => _openAddEditSheet(user: _filteredUsers[i]),
                            onDelete: () => _deleteUser(_filteredUsers[i]['_id']?.toString() ?? '', _filteredUsers[i]['name']?.toString() ?? ''),
                            onApprove: () => _quickUpdateStatus(_filteredUsers[i]['_id']?.toString() ?? '', 'active'),
                            onReject: () => _quickUpdateStatus(_filteredUsers[i]['_id']?.toString() ?? '', 'rejected'),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

// --- User Card --------------------------------------------
class _UserCard extends StatelessWidget {
  final Map<String, dynamic> user;
  final bool isDark;
  final Future<void> Function(Map<String, dynamic>, bool) onToggleBilling;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _UserCard({
    required this.user,
    required this.isDark,
    required this.onToggleBilling,
    required this.onEdit,
    required this.onDelete,
    required this.onApprove,
    required this.onReject,
  });

  Color _roleColor(String role) {
    switch (role) {
      case 'developer': return const Color(0xFF6D28D9);
      case 'admin': return const Color(0xFF4F46E5);
      case 'doctor': return const Color(0xFF0EA5E9);
      case 'receptionist': return const Color(0xFFF59E0B);
      default: return const Color(0xFF64748B);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'active': return const Color(0xFF10B981);
      case 'pending': return const Color(0xFFF59E0B);
      case 'rejected': return const Color(0xFFEF4444);
      default: return const Color(0xFF64748B);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = user['name']?.toString() ?? 'Unknown';
    final email = user['email']?.toString() ?? '';
    final role = (user['role']?.toString() ?? 'staff').toLowerCase();
    final status = (user['status']?.toString() ?? 'active').toLowerCase();
    final billingAccess = user['billingAccess'] == true;
    final isPending = status == 'pending';
    final isAlwaysOn = role == 'admin' || role == 'developer';
    final initials = name.split(' ').where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();
    final roleColor = _roleColor(role);
    final statusColor = _statusColor(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPending ? const Color(0xFFF59E0B).withValues(alpha: 0.4) : (isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
          width: isPending ? 1.5 : 1,
        ),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: roleColor.withValues(alpha: 0.15), shape: BoxShape.circle, border: Border.all(color: roleColor.withValues(alpha: 0.4))),
                  child: Center(child: Text(initials, style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 15, color: roleColor))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(email, style: GoogleFonts.inter(fontSize: 11, color: isDark ? Colors.white54 : Colors.black45), overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: roleColor.withValues(alpha: 0.12), border: Border.all(color: roleColor.withValues(alpha: 0.5)), borderRadius: BorderRadius.circular(20)),
                  child: Text(role.toUpperCase(), style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: roleColor)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: isDark ? Colors.white10 : const Color(0xFFF1F5F9)),
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(border: Border.all(color: statusColor.withValues(alpha: 0.5)), borderRadius: BorderRadius.circular(20)),
                  child: Text(status[0].toUpperCase() + status.substring(1), style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: statusColor)),
                ),
                const Spacer(),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.receipt_long_rounded, size: 14, color: isDark ? Colors.white38 : Colors.black38),
                    const SizedBox(width: 4),
                    Text('Billing:', style: GoogleFonts.inter(fontSize: 11, color: isDark ? Colors.white54 : Colors.black45)),
                    const SizedBox(width: 6),
                    if (isAlwaysOn)
                      Text('Always On', style: GoogleFonts.inter(fontSize: 11, fontStyle: FontStyle.italic, color: const Color(0xFF10B981)))
                    else
                      Transform.scale(
                        scale: 0.75,
                        child: Switch(
                          value: billingAccess,
                          onChanged: (v) => onToggleBilling(user, v),
                          activeColor: const Color(0xFF10B981),
                          activeTrackColor: const Color(0xFF10B981).withValues(alpha: 0.3),
                          inactiveThumbColor: Colors.grey[400],
                          inactiveTrackColor: isDark ? Colors.white12 : Colors.black12,
                        ),
                      ),
                  ],
                ),
              ],
            ),
            if (isPending) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onApprove,
                      icon: const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF10B981)),
                      label: Text('Approve', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF10B981))),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF10B981)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), padding: const EdgeInsets.symmetric(vertical: 8)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onReject,
                      icon: const Icon(Icons.cancel_outlined, size: 16, color: Color(0xFFEF4444)),
                      label: Text('Reject', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFFEF4444))),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFFEF4444)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), padding: const EdgeInsets.symmetric(vertical: 8)),
                    ),
                  ),
                ],
              ),
            ],
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(icon: const Icon(Icons.edit_rounded, size: 18), color: const Color(0xFF4F46E5), tooltip: 'Edit User', onPressed: onEdit),
                IconButton(icon: const Icon(Icons.delete_outline_rounded, size: 18), color: const Color(0xFFEF4444), tooltip: 'Delete User', onPressed: onDelete),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// --- Form Field Helper -------------------------------------
class _FormField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final bool obscureText;
  final bool isDark;

  const _FormField({required this.label, required this.controller, this.validator, this.keyboardType, this.obscureText = false, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? Colors.white70 : Colors.black54)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          validator: validator,
          style: GoogleFonts.inter(fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
      ],
    );
  }
}

// --- Dropdown Field Helper ---------------------------------
class _DropdownField extends StatelessWidget {
  final String label;
  final String value;
  final List<String> items;
  final List<String> labels;
  final bool isDark;
  final void Function(String?) onChanged;

  const _DropdownField({required this.label, required this.value, required this.items, required this.labels, required this.isDark, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? Colors.white70 : Colors.black54)),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: value,
          items: List.generate(items.length, (i) => DropdownMenuItem(value: items[i], child: Text(labels[i], style: GoogleFonts.inter(fontSize: 13)))),
          onChanged: onChanged,
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
          dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          style: GoogleFonts.inter(fontSize: 13, color: isDark ? Colors.white : Colors.black87),
        ),
      ],
    );
  }
}

