import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../config.dart';
import '../widgets/app_snackbar.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  bool _isLoading = false;
  Map<String, dynamic>? _user;
  
  // Auth State
  bool _isVerified = false;
  bool _isOtpMode = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  // Controllers
  final _currentPasswordCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();

  // Image Picker
  File? _selectedImage;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await ApiService.getSavedUser();
    if (user != null) {
      setState(() {
        _user = user;
      });
    }
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 400,
        maxHeight: 400,
        imageQuality: 70,
      );
      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
        });
        // Upload immediately after picking.
        _uploadAvatar();
      }
    } catch (e) {
      if (mounted) AppSnackBar.showTopSnack(context, 'Failed to pick image: $e', isError: true);
    }
  }

  Future<void> _uploadAvatar() async {
    if (_selectedImage == null || _user == null) return;
    
    setState(() => _isLoading = true);
    try {
      final bytes = await _selectedImage!.readAsBytes();
      final base64Image = "data:image/jpeg;base64,${base64Encode(bytes)}";
      
      final res = await ApiService.updateUser(_user!['id'], {'avatar': base64Image});
      
      if (res['success'] == true) {
        // Update local user data
        _user!['avatar'] = base64Image;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user', jsonEncode(_user));
        
        if (mounted) {
          AppSnackBar.showTopSnack(context, 'Profile photo updated successfully!');
        }
      } else {
        if (mounted) {
          AppSnackBar.showTopSnack(context, res['message'] ?? 'Update failed', isError: true);
        }
      }
    } catch (e) {
      if (mounted) {
        AppSnackBar.showTopSnack(context, 'Error uploading photo', isError: true);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyCurrentPassword() async {
    final pwd = _currentPasswordCtrl.text.trim();
    if (pwd.isEmpty) {
      AppSnackBar.showTopSnack(context, 'Please enter current password', isError: true);
      return;
    }
    
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.verifyPassword(pwd);
      if (res['success'] == true) {
        setState(() {
          _isVerified = true;
          _currentPasswordCtrl.clear();
        });
        if (mounted) AppSnackBar.showTopSnack(context, 'Verified! You can now set a new password.');
      } else {
        if (mounted) AppSnackBar.showTopSnack(context, res['message'] ?? 'Invalid password', isError: true);
      }
    } catch (e) {
      if (mounted) AppSnackBar.showTopSnack(context, 'Connection error', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _sendOtp() async {
    if (_user == null) return;
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.forgotPassword(_user!['email']);
      if (res['success'] == true) {
        setState(() {
          _isOtpMode = true;
        });
        if (mounted) AppSnackBar.showTopSnack(context, 'OTP sent to your email.');
      } else {
        if (mounted) AppSnackBar.showTopSnack(context, res['message'] ?? 'Failed to send OTP', isError: true);
      }
    } catch (e) {
      if (mounted) AppSnackBar.showTopSnack(context, 'Connection error', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_user == null) return;
    final otp = _otpCtrl.text.trim();
    if (otp.isEmpty) {
      AppSnackBar.showTopSnack(context, 'Please enter OTP', isError: true);
      return;
    }
    
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.verifyOtp(_user!['email'], otp);
      if (res['success'] == true) {
        setState(() {
          _isVerified = true;
          _otpCtrl.clear();
        });
        if (mounted) AppSnackBar.showTopSnack(context, 'Verified! You can now set a new password.');
      } else {
        if (mounted) AppSnackBar.showTopSnack(context, res['message'] ?? 'Invalid OTP', isError: true);
      }
    } catch (e) {
      if (mounted) AppSnackBar.showTopSnack(context, 'Connection error', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveNewPassword() async {
    if (!_isVerified || _user == null) return;
    
    final newPwd = _newPasswordCtrl.text;
    final confPwd = _confirmPasswordCtrl.text;
    
    if (newPwd.isEmpty || confPwd.isEmpty) {
      AppSnackBar.showTopSnack(context, 'Please fill both fields', isError: true);
      return;
    }
    if (newPwd != confPwd) {
      AppSnackBar.showTopSnack(context, 'Passwords do not match', isError: true);
      return;
    }
    
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.updateUser(_user!['id'], {'password': newPwd});
      if (res['success'] == true) {
        if (mounted) {
          AppSnackBar.showTopSnack(context, 'Password updated successfully!');
          Navigator.pop(context, true);
        }
      } else {
        if (mounted) AppSnackBar.showTopSnack(context, res['message'] ?? 'Failed to update', isError: true);
      }
    } catch (e) {
      if (mounted) AppSnackBar.showTopSnack(context, 'Connection error', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildAvatar() {
    final avatar = _user?['avatar'] as String?;
    final initials = (_user?['name'] ?? 'U').toString().isNotEmpty ? (_user?['name'] ?? 'U')[0].toUpperCase() : 'U';
    
    Widget avatarWidget;
    if (_selectedImage != null) {
      avatarWidget = Image.file(_selectedImage!, fit: BoxFit.cover);
    } else if (avatar != null && avatar.isNotEmpty) {
      final url = avatar.startsWith('http') || avatar.startsWith('data:') 
          ? avatar 
          : '${apiBaseUrl.replaceAll('/api/', '')}$avatar';
      if (url.startsWith('data:')) {
        final bytes = base64Decode(url.split(',').last);
        avatarWidget = Image.memory(bytes, fit: BoxFit.cover);
      } else {
        avatarWidget = Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _buildInitials(initials));
      }
    } else {
      avatarWidget = _buildInitials(initials);
    }

    return Center(
      child: Stack(
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF4F46E5),
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 5))
              ],
            ),
            clipBehavior: Clip.hardEdge,
            child: avatarWidget,
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: GestureDetector(
              onTap: _pickImage,
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 5)
                  ],
                ),
                child: const Icon(Icons.camera_alt_rounded, size: 18, color: Color(0xFF64748B)),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildInitials(String initials) {
    return Center(
      child: Text(
        initials,
        style: GoogleFonts.inter(fontSize: 42, fontWeight: FontWeight.bold, color: Colors.white),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8F9FA);
    final cardColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF1E293B);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        systemOverlayStyle: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
        elevation: 0,
        iconTheme: IconThemeData(color: textColor),
        title: Text(
          'Edit Profile',
          style: GoogleFonts.inter(color: textColor, fontWeight: FontWeight.w700, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: _user == null 
        ? const Center(child: CircularProgressIndicator())
        : Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildAvatar(),
                  const SizedBox(height: 24),
                  
                  // Read Only Info
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('EMAIL (LOGIN ID)', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF64748B), letterSpacing: 0.5)),
                              const SizedBox(height: 4),
                              Text(_user!['email'] ?? '', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: textColor)),
                            ],
                          ),
                        ),
                        Container(width: 1, height: 40, color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                        const SizedBox(width: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('ROLE', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF64748B), letterSpacing: 0.5)),
                            const SizedBox(height: 4),
                            Text((_user!['role'] ?? '').toString().toUpperCase(), style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: textColor)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  Row(
                    children: [
                      const Icon(Icons.key_rounded, size: 18, color: Color(0xFF4F46E5)),
                      const SizedBox(width: 8),
                      Text('Change Password', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: textColor)),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Authentication Section (Current Password or OTP)
                  if (!_isVerified)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                      ),
                      child: _isOtpMode 
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Enter OTP', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: textColor)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: _otpCtrl,
                                      keyboardType: TextInputType.number,
                                      style: GoogleFonts.inter(color: textColor, fontSize: 14),
                                      decoration: InputDecoration(
                                        hintText: '6-digit code',
                                        hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8)),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        filled: true,
                                        fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8F9FA),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  ElevatedButton(
                                    onPressed: _verifyOtp,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF0F172A),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                                    ),
                                    child: Text('Verify', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              GestureDetector(
                                onTap: () => setState(() => _isOtpMode = false),
                                child: Text('Use Current Password', style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF4F46E5), fontWeight: FontWeight.w600)),
                              ),
                            ],
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Current Password', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: textColor)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: _currentPasswordCtrl,
                                      obscureText: _obscureCurrent,
                                      style: GoogleFonts.inter(color: textColor, fontSize: 14),
                                      decoration: InputDecoration(
                                        hintText: 'Enter current password',
                                        hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8)),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        filled: true,
                                        fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8F9FA),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                                        suffixIcon: IconButton(
                                          icon: Icon(_obscureCurrent ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF94A3B8), size: 18),
                                          onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  ElevatedButton(
                                    onPressed: _verifyCurrentPassword,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF0F172A),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                                    ),
                                    child: Text('Verify', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w600)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              GestureDetector(
                                onTap: _sendOtp,
                                child: Text('Forgot Password?', style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF4F46E5), fontWeight: FontWeight.w600)),
                              ),
                            ],
                          ),
                    ),
                  
                  if (_isVerified)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(color: const Color(0xFF22C55E).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: Color(0xFF22C55E), size: 16),
                          const SizedBox(width: 8),
                          Text('Identity Verified', style: GoogleFonts.inter(color: const Color(0xFF22C55E), fontWeight: FontWeight.w600, fontSize: 12)),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),
                  
                  // New Password Section
                  Opacity(
                    opacity: _isVerified ? 1.0 : 0.5,
                    child: IgnorePointer(
                      ignoring: !_isVerified,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('New Password', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: textColor)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _newPasswordCtrl,
                            obscureText: _obscureNew,
                            style: GoogleFonts.inter(color: textColor, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Enter new password',
                              hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              filled: true,
                              fillColor: cardColor,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0))),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5)),
                              suffixIcon: IconButton(
                                icon: Icon(_obscureNew ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF94A3B8), size: 18),
                                onPressed: () => setState(() => _obscureNew = !_obscureNew),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text('Confirm New Password', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: textColor)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _confirmPasswordCtrl,
                            obscureText: _obscureConfirm,
                            style: GoogleFonts.inter(color: textColor, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Re-enter new password',
                              hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              filled: true,
                              fillColor: cardColor,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0))),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5)),
                              suffixIcon: IconButton(
                                icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF94A3B8), size: 18),
                                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: ElevatedButton(
                              onPressed: _saveNewPassword,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF4F46E5),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 0,
                              ),
                              child: Text('Update Password', style: GoogleFonts.inter(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600)),
                            ),
                          ),
                          const SizedBox(height: 40),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (_isLoading)
              Container(
                color: Colors.black.withValues(alpha: 0.3),
                child: const Center(child: CircularProgressIndicator()),
              ),
          ],
        ),
    );
  }
}
