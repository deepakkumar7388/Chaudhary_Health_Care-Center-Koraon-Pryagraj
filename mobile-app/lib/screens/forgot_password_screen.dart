import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../services/api_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  int _step = 0; // 0=email, 1=otp, 2=new password
  bool _isLoading = false;
  String? _message;
  bool _isError = false;

  Future<void> _sendOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() { _message = 'Please enter your email'; _isError = true; });
      return;
    }

    setState(() { _isLoading = true; _message = null; });
    try {
      final result = await ApiService.forgotPassword(email);
      if (!mounted) return;
      if (result['success'] == true) {
        setState(() { _step = 1; _message = 'OTP sent to your email!'; _isError = false; });
      } else {
        setState(() { _message = result['message'] ?? 'Failed to send OTP'; _isError = true; });
      }
    } catch (e) {
      setState(() { _message = 'Cannot connect to server'; _isError = true; });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.isEmpty) {
      setState(() { _message = 'Please enter OTP'; _isError = true; });
      return;
    }

    setState(() { _isLoading = true; _message = null; });
    try {
      final result = await ApiService.verifyOtp(_emailController.text.trim(), otp);
      if (!mounted) return;
      if (result['success'] == true) {
        setState(() { _step = 2; _message = 'OTP verified! Set new password.'; _isError = false; });
      } else {
        setState(() { _message = result['message'] ?? 'Invalid OTP'; _isError = true; });
      }
    } catch (e) {
      setState(() { _message = 'Cannot connect to server'; _isError = true; });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _resetPassword() async {
    final password = _passwordController.text.trim();
    final confirm = _confirmPasswordController.text.trim();

    if (password.isEmpty || password.length < 6) {
      setState(() { _message = 'Password must be at least 6 characters'; _isError = true; });
      return;
    }
    if (password != confirm) {
      setState(() { _message = 'Passwords do not match'; _isError = true; });
      return;
    }

    setState(() { _isLoading = true; _message = null; });
    try {
      final result = await ApiService.resetPassword(
        _emailController.text.trim(),
        _otpController.text.trim(),
        password,
      );
      if (!mounted) return;
      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password reset successfully!'), backgroundColor: AppColors.success),
        );
        Navigator.pop(context);
      } else {
        setState(() { _message = result['message'] ?? 'Failed to reset password'; _isError = true; });
      }
    } catch (e) {
      setState(() { _message = 'Cannot connect to server'; _isError = true; });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Forgot Password')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Step Indicator
            Row(
              children: List.generate(3, (i) {
                final isActive = i <= _step;
                return Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 28, height: 28,
                        decoration: BoxDecoration(
                          color: isActive ? AppColors.primary : (isDark ? AppColors.cardDark : AppColors.backgroundLight),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '${i + 1}',
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: isActive ? Colors.white : AppColors.textSecondaryLight),
                          ),
                        ),
                      ),
                      if (i < 2)
                        Expanded(
                          child: Container(
                            height: 2,
                            color: i < _step ? AppColors.primary : (isDark ? AppColors.cardDark : Colors.grey.shade300),
                          ),
                        ),
                    ],
                  ),
                );
              }),
            ).animate().fadeIn(duration: 300.ms),

            const SizedBox(height: 32),

            // Step Title
            Text(
              _step == 0 ? 'Enter Your Email' : _step == 1 ? 'Verify OTP' : 'New Password',
              style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5),
            ),
            const SizedBox(height: 8),
            Text(
              _step == 0
                  ? 'We\'ll send you a verification code to reset your password'
                  : _step == 1
                      ? 'Enter the 6-digit code sent to your email'
                      : 'Create a new strong password',
              style: GoogleFonts.inter(fontSize: 14, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
            ),

            const SizedBox(height: 28),

            // Message
            if (_message != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (_isError ? AppColors.error : AppColors.success).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: (_isError ? AppColors.error : AppColors.success).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    Icon(_isError ? Icons.error_outline : Icons.check_circle_outline, color: _isError ? AppColors.error : AppColors.success, size: 18),
                    const SizedBox(width: 10),
                    Expanded(child: Text(_message!, style: GoogleFonts.inter(fontSize: 13, color: _isError ? AppColors.error : AppColors.success, fontWeight: FontWeight.w500))),
                  ],
                ),
              ).animate().shake(duration: _isError ? 400.ms : 0.ms),

            // Step 0: Email
            if (_step == 0) ...[
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  hintText: 'your@email.com',
                  prefixIcon: Icon(Icons.email_outlined, size: 20),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _sendOtp,
                  child: _isLoading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Text('Send OTP'),
                ),
              ),
            ],

            // Step 1: OTP
            if (_step == 1) ...[
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: 8),
                textAlign: TextAlign.center,
                decoration: const InputDecoration(
                  hintText: '• • • • • •',
                  counterText: '',
                  prefixIcon: Icon(Icons.lock_outline, size: 20),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _verifyOtp,
                  child: _isLoading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Text('Verify OTP'),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: _isLoading ? null : _sendOtp,
                  child: Text('Resend OTP', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary)),
                ),
              ),
            ],

            // Step 2: New Password
            if (_step == 2) ...[
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  hintText: 'New password',
                  prefixIcon: Icon(Icons.lock_outline, size: 20),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _confirmPasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  hintText: 'Confirm new password',
                  prefixIcon: Icon(Icons.lock_outline, size: 20),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _resetPassword,
                  child: _isLoading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Text('Reset Password'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
