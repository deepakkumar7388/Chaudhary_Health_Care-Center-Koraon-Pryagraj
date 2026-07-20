import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import 'role_access.dart';

class ApiService {
  static String? _token;

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
    final response = await http.post(
      Uri.parse('${apiBaseUrl}auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(response.body);
    if (data['success'] == true) {
      _token = data['token'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);
      await prefs.setString('user', jsonEncode(data));
      // Set role-based access
      RoleAccess.setRole(
        data['role'] ?? 'staff',
        billingAccess: data['billingAccess'] == true,
      );
    }
    return data;
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
    if (userJson != null) {
      return jsonDecode(userJson);
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

  static Future<Map<String, dynamic>> resetPassword(String email, String otp, String newPassword) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}auth/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'otp': otp, 'newPassword': newPassword}),
    );
    return jsonDecode(response.body);
  }

  // ==================== PATIENTS ====================
  static Future<List<dynamic>> getPatients() async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}patients'),
      headers: _headers,
    );
    final data = jsonDecode(response.body);
    if (data['success'] == true) {
      return data['patients'] ?? [];
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

  static Future<Map<String, dynamic>> createPatient(Map<String, dynamic> patientData) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}patients'),
      headers: _headers,
      body: jsonEncode(patientData),
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

  static Future<Map<String, dynamic>> getAvailableBeds() async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}patients/available-beds'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  // ==================== DAILY NOTES ====================
  static Future<List<dynamic>> getDailyNotes(String patientId) async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}daily-notes/$patientId'),
      headers: _headers,
    );
    final data = jsonDecode(response.body);
    if (data['success'] == true) {
      return data['notes'] ?? [];
    }
    return [];
  }

  static Future<Map<String, dynamic>> addDailyNote(String patientId, Map<String, dynamic> noteData) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}daily-notes/$patientId'),
      headers: _headers,
      body: jsonEncode(noteData),
    );
    return jsonDecode(response.body);
  }

  // ==================== BILLING ====================
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

  // ==================== DISCHARGE ====================
  static Future<Map<String, dynamic>> dischargePatient(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}discharge'),
      headers: _headers,
      body: jsonEncode(data),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getDischargeInfo(String patientId) async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}discharge/$patientId'),
      headers: _headers,
    );
    return jsonDecode(response.body);
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
