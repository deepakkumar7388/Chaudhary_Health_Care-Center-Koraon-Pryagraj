// ==================== ROLE-BASED ACCESS CONTROL ====================
// Mirrors the web app's role permissions exactly

class RoleAccess {
  static const Map<String, List<String>> _permissions = {
    'developer': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'billing', 'discharge', 'users', 'reports', 'settings', 'patient-record'],
    'admin': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'billing', 'discharge', 'users', 'reports', 'settings', 'patient-record'],
    'doctor': ['dashboard', 'patients', 'add-patient', 'daily-notes', 'discharge', 'patient-record'],
    'staff': ['dashboard', 'patients', 'add-patient', 'daily-notes'],
    'receptionist': ['dashboard', 'patients', 'add-patient'],
  };

  static String _currentRole = 'staff';
  static bool _hasBillingAccess = false;

  static void setRole(String role, {bool billingAccess = false}) {
    _currentRole = role.toLowerCase();
    _hasBillingAccess = billingAccess;
  }

  static String get currentRole => _currentRole;

  static bool canAccess(String module) {
    // Billing special case: only if user has billing access or is developer/admin
    if (module == 'billing') {
      return _hasBillingAccess || _currentRole == 'developer' || _currentRole == 'admin';
    }

    final perms = _permissions[_currentRole] ?? ['dashboard'];
    return perms.contains(module);
  }

  // Shorthand helpers
  static bool get canAddPatient => canAccess('add-patient');
  static bool get canViewDailyNotes => canAccess('daily-notes');
  static bool get canViewBilling => canAccess('billing');
  static bool get canDischarge => canAccess('discharge');
  static bool get canManageUsers => canAccess('users');
  static bool get canViewSettings => canAccess('settings');
  static bool get canViewReports => canAccess('reports');
  static bool get canViewPatientRecord => canAccess('patient-record');

  // Check if user is admin-level (developer or admin)
  static bool get isAdminLevel => _currentRole == 'developer' || _currentRole == 'admin';
  static bool get isDeveloper => _currentRole == 'developer';
}
