import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import 'role_access.dart';

class ApiService {
  static String? _token;
  static VoidCallback? onSessionExpired;

  static void _checkAuthError(http.Response response) {
    if (response.statusCode == 401) {
      debugPrint('[ApiService] 401 Unauthorized - Session expired: ${response.body}');
      logout();
      onSessionExpired?.call();
    }
  }

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    // Restore role from saved user data
    final userJson = prefs.getString('user');
    if (userJson != null) {
      final userData = jsonDecode(userJson);
      RoleAccess.setRole(
        userData['role'] ?? 'staff',
        billingAccess: userData['billingAccess'] == true,
      );
    }
  }

  static String? get token => _token;
  static bool get isLoggedIn => _token != null && _token!.isNotEmpty;

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  // ==================== AUTH ====================
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('${apiBaseUrl}auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      ).timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        _token = data['token'];

        // Save clean user object (not raw response) for easy retrieval
        final userObj = {
          'id': data['user_id'] ?? data['id'] ?? '',
          'name': data['name'] ?? '',
          'email': data['email'] ?? email,
          'role': data['role'] ?? 'staff',
          'username': data['username'] ?? email.split('@')[0],
          'avatar': data['avatar'] ?? '',
          'billingAccess': data['billingAccess'] ?? false,
        };

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token!);
        await prefs.setString('user', jsonEncode(userObj));

        // Set role-based access immediately
        RoleAccess.setRole(
          userObj['role'] as String,
          billingAccess: userObj['billingAccess'] == true,
        );
      }
      return data;
    } on Exception catch (e) {
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  static Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
  }

  static Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');
    if (userJson != null && userJson.isNotEmpty) {
      try {
        return Map<String, dynamic>.from(jsonDecode(userJson));
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  static Future<Map<String, dynamic>> forgotPassword(String email) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}auth/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}auth/verify-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'otp': otp}),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> verifyPassword(String password) async {
    try {
      final response = await http.post(
        Uri.parse('${apiBaseUrl}auth/verify-password'),
        headers: _headers,
        body: jsonEncode({'password': password}),
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> resetPassword(String email, String otp, String newPassword) async {
    try {
      final response = await http.post(
        Uri.parse('${apiBaseUrl}auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'otp': otp, 'newPassword': newPassword}),
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  // ==================== PATIENTS ====================
  static Future<List<dynamic>> getPatients() async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}patients'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));
      debugPrint('[getPatients] Status: ${response.statusCode}');
      _checkAuthError(response);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final list = List<dynamic>.from(data['patients'] ?? []);
          debugPrint('[getPatients] Fetched ${list.length} patients successfully');
          return list;
        }
      } else {
        debugPrint('[getPatients] Server returned error ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      debugPrint('[getPatients] Network error: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>> getPatientById(String id) async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}patients/$id'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> createPatient(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}patients'),
      headers: _headers,
      body: jsonEncode(data),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> updatePatient(String id, Map<String, dynamic> data) async {
    final response = await http.put(
      Uri.parse('${apiBaseUrl}patients/$id'),
      headers: _headers,
      body: jsonEncode(data),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> deletePatient(String id) async {
    final response = await http.delete(
      Uri.parse('${apiBaseUrl}patients/$id'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getAvailableBeds() async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}patients/available-beds'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  // ==================== DAILY NOTES ====================
  static Future<List<dynamic>> getDailyNotes(String patientId) async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}notes/$patientId'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        return List<dynamic>.from(data['notes'] ?? []);
      }
    } catch (e) {
      debugPrint('getDailyNotes error: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>> addDailyNote(String patientId, Map<String, dynamic> noteData) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}notes/$patientId'),
      headers: _headers,
      body: jsonEncode(noteData),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> updateDailyNote(String noteId, Map<String, dynamic> updateData) async {
    final response = await http.put(
      Uri.parse('${apiBaseUrl}notes/$noteId'),
      headers: _headers,
      body: jsonEncode(updateData),
    );
    return jsonDecode(response.body);
  }

  // ==================== BILLING ====================
  static Future<Map<String, dynamic>> getAllBillings() async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}billing/'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getBilling(String patientId) async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}billing/$patientId'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> addPayment(String patientId, Map<String, dynamic> paymentData) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}billing/$patientId/payments'),
      headers: _headers,
      body: jsonEncode(paymentData),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> saveBilling(String patientId, Map<String, dynamic> billingData) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}billing/$patientId'),
      headers: _headers,
      body: jsonEncode(billingData),
    );
    return jsonDecode(response.body);
  }

  // ==================== USERS ====================
  static Future<Map<String, dynamic>> getUsers() async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}auth/users'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> createUser(Map<String, dynamic> data) async {
    try {
      final response = await http.post(
        Uri.parse('${apiBaseUrl}auth/signup'),
        headers: _headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> updateUser(String id, Map<String, dynamic> data) async {
    try {
      final response = await http.put(
        Uri.parse('${apiBaseUrl}auth/users/$id'),
        headers: _headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> deleteUser(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('${apiBaseUrl}auth/users/$id'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> toggleBillingAccess(String id, bool grant) async {
    try {
      final response = await http.put(
        Uri.parse('${apiBaseUrl}auth/users/$id/billing-access'),
        headers: _headers,
        body: jsonEncode({'billingAccess': grant}),
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  // ==================== DISCHARGE ====================
  static Future<Map<String, dynamic>> dischargePatient(Map<String, dynamic> data) async {
    try {
      final response = await http.post(
        Uri.parse('${apiBaseUrl}discharge'),
        headers: _headers,
        body: jsonEncode(data),
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      debugPrint('dischargePatient network error: $e');
      return {'success': false, 'message': 'Connection failed: $e'};
    }
  }

  static Future<Map<String, dynamic>> getDischargeInfo(String patientId) async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}discharge/$patientId'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  // ==================== SETTINGS & DIAGNOSTICS ====================
  static Future<Map<String, dynamic>> getSettings() async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}settings'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Failed to load settings: $e'};
    }
  }

  static Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> settings) async {
    try {
      final response = await http.post(
        Uri.parse('${apiBaseUrl}settings'),
        headers: _headers,
        body: jsonEncode(settings),
      ).timeout(const Duration(seconds: 12));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Failed to save settings: $e'};
    }
  }

  static Future<Map<String, dynamic>> getDbStatus() async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}db-status'),
        headers: _headers,
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      return {'readyState': 0, 'status': 'disconnected', 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getHealth() async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}health'),
        headers: _headers,
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      return {'status': 'error', 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> listBackups() async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}backup'),
        headers: _headers,
      ).timeout(const Duration(seconds: 12));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> createBackup() async {
    try {
      final response = await http.post(
        Uri.parse('${apiBaseUrl}backup/create'),
        headers: _headers,
      ).timeout(const Duration(seconds: 25));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // ==================== NOTIFICATIONS ====================
  static Future<Map<String, dynamic>> getNotifications() async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}notifications'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));
      return jsonDecode(response.body);
    } catch (e) {
      return {'success': false, 'message': 'Connection failed: $e', 'notifications': []};
    }
  }

  // ==================== DASHBOARD STATS ====================
  static Future<Map<String, dynamic>> getDashboardStats() async {
    final patients = await getPatients();
    final admitted = patients.where((p) =>
        (p['status'] ?? '').toString().toLowerCase() == 'admitted').length;
    final discharged = patients.where((p) =>
        (p['status'] ?? '').toString().toLowerCase() == 'discharged').length;
    final ipd = patients.where((p) => p['patient_type'] == 'IPD').length;
    final opd = patients.where((p) => p['patient_type'] == 'OPD').length;
    return {
      'totalPatients': patients.length,
      'admittedPatients': admitted,
      'dischargedPatients': discharged,
      'ipdPatients': ipd,
      'opdPatients': opd,
    };
  }
}
