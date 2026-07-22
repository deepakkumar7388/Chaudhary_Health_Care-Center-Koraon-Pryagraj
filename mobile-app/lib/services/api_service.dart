import 'dart:convert';
import 'package:flutter/foundation.dart';
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

  // ==================== MOCK AUTH BYPASS ====================
  static Future<void> saveMockLogin(Map<String, dynamic> mockResponse) async {
    _token = mockResponse['token'];
    final userObj = mockResponse['user'];
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', _token!);
    await prefs.setString('user', jsonEncode(userObj));

    RoleAccess.setRole(
      userObj['role'] as String,
      billingAccess: userObj['billingAccess'] == true,
    );
  }

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
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}patients'),
        headers: _headers,
      ).timeout(const Duration(seconds: 3));
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        final list = List<dynamic>.from(data['patients'] ?? []);
        if (list.isEmpty) {
          list.addAll([_demoPatient, _demoOpdPatient]);
        }
        return list;
      }
    } catch (e) {
      debugPrint('getPatients network error / offline demo: $e');
    }
    return [_demoPatient, _demoOpdPatient];
  }

  static final Map<String, dynamic> _demoPatient = {
    '_id': 'demo_patient_001',
    'patient_id': 'PAT-2026-001',
    'name': 'Ramesh Kumar (Demo)',
    'age': 42,
    'gender': 'Male',
    'guardian_name': 'Suresh Kumar',
    'mobile': '9876543210',
    'email': 'ramesh@gmail.com',
    'bed_no': 'Male-G1',
    'address': 'Civil Lines, Prayagraj',
    'problem': 'High Fever & Typhoid',
    'doctor_assigned': 'Dr. Bhoopendra Chaudhary',
    'patient_type': 'IPD',
    'status': 'Admitted',
    'createdAt': DateTime.now().toIso8601String(),
  };

  static final Map<String, dynamic> _demoOpdPatient = {
    '_id': 'demo_patient_002',
    'patient_id': 'PAT-2026-002',
    'name': 'Sunita Sharma (Demo OPD)',
    'age': 35,
    'gender': 'Female',
    'guardian_name': 'Rajesh Sharma',
    'mobile': '9812345678',
    'email': 'sunita@gmail.com',
    'bed_no': 'OPD',
    'address': 'Koraon, Prayagraj',
    'problem': 'Severe Migraine & Headache',
    'doctor_assigned': 'Dr. S. K. Singh',
    'patient_type': 'OPD',
    'status': 'Admitted',
    'createdAt': DateTime.now().toIso8601String(),
  };

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
        Uri.parse('${apiBaseUrl}daily-notes/$patientId'),
        headers: _headers,
      ).timeout(const Duration(seconds: 3));
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        final notes = List<dynamic>.from(data['notes'] ?? []);
        if (notes.isEmpty && patientId == 'demo_patient_001') {
          return _demoNotes;
        }
        return notes;
      }
    } catch (_) {}

    if (patientId == 'demo_patient_001') {
      return _demoNotes;
    }
    return [];
  }

  static final List<dynamic> _demoNotes = [
    {
      '_id': 'note_demo_1',
      'type': 'vitals',
      'date': '2026-07-21',
      'time': '10:30',
      'pulse': '76',
      'bp': '120/80',
      'temp': '98.6',
      'spo2': '99',
      'rbs': '112',
      'painScore': '2',
      'urineOutput': '350',
      'drainOutput': '50',
      'addedBy': 'Staff Demo',
    },
    {
      '_id': 'note_demo_2',
      'type': 'medication',
      'date': '2026-07-21',
      'time': '11:00',
      'medType': 'Injection',
      'drugName': 'Monocef',
      'dose': '1g IV',
      'status': 'Pending',
      'addedBy': 'Dr. Bhoopendra Chaudhary',
    },
    {
      '_id': 'note_demo_3',
      'type': 'medication',
      'date': '2026-07-21',
      'time': '08:00',
      'medType': 'Tablet',
      'drugName': 'PCM 650mg',
      'dose': '1 Tab',
      'status': 'Given',
      'doneBy': 'Staff Nurse',
      'doneTime': '08:15',
      'addedBy': 'Dr. Bhoopendra Chaudhary',
    },
  ];

  static Future<Map<String, dynamic>> addDailyNote(String patientId, Map<String, dynamic> noteData) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}daily-notes/$patientId'),
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
