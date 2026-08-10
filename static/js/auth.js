document.addEventListener('DOMContentLoaded', () => {
    // Role Tab Selectors
    const roleTabPassenger = document.getElementById('role-tab-passenger');
    const roleTabDriver = document.getElementById('role-tab-driver');
    
    // Forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Hidden Role Fields
    const loginRoleInput = document.getElementById('login-role');
    const registerRoleInput = document.getElementById('register-role');
    
    // Message Box
    const errorMessage = document.getElementById('error-message');
    const errorText = errorMessage ? errorMessage.querySelector('span') : null;
    
    // Buttons & Links
    const submitBtn = document.getElementById('login-submit-btn') || document.getElementById('register-submit-btn');
    const registerLink = document.getElementById('register-link');
    const loginLink = document.getElementById('login-link');

    // 1. Role Toggle Tabs Logic
    function setRole(role) {
        const usernameInput = document.getElementById('username');
        const usernameIcon = document.getElementById('username-icon');
        const portalTitle = document.getElementById('auth-portal-title');
        const authCard = document.querySelector('.auth-card');

        if (role === 'passenger') {
            if (roleTabPassenger) roleTabPassenger.classList.add('active');
            if (roleTabDriver) roleTabDriver.classList.remove('active');
            if (loginRoleInput) loginRoleInput.value = 'passenger';
            if (registerRoleInput) registerRoleInput.value = 'passenger';
            if (registerLink) registerLink.href = '/register?role=passenger';
            if (loginLink) loginLink.href = '/login?role=passenger';

            // Add dynamic style hooks
            document.body.classList.remove('role-driver');
            document.body.classList.add('role-passenger');
            if (authCard) {
                authCard.classList.remove('role-driver');
                authCard.classList.add('role-passenger');
            }

            // Update badge text
            if (portalTitle) {
                portalTitle.textContent = 'Passenger Access';
            }

            // Update icon
            if (usernameIcon) {
                usernameIcon.className = 'fa-solid fa-user';
            }

            // Update placeholder
            if (usernameInput) {
                if (loginForm) {
                    usernameInput.placeholder = 'Enter passenger username';
                } else if (registerForm) {
                    usernameInput.placeholder = 'Choose a passenger username';
                }
            }
        } else {
            if (roleTabDriver) roleTabDriver.classList.add('active');
            if (roleTabPassenger) roleTabPassenger.classList.remove('active');
            if (loginRoleInput) loginRoleInput.value = 'driver';
            if (registerRoleInput) registerRoleInput.value = 'driver';
            if (registerLink) registerLink.href = '/register?role=driver';
            if (loginLink) loginLink.href = '/login?role=driver';

            // Add dynamic style hooks
            document.body.classList.remove('role-passenger');
            document.body.classList.add('role-driver');
            if (authCard) {
                authCard.classList.remove('role-passenger');
                authCard.classList.add('role-driver');
            }

            // Update badge text
            if (portalTitle) {
                portalTitle.textContent = 'Conductor/Driver Access';
            }

            // Update icon
            if (usernameIcon) {
                usernameIcon.className = 'fa-solid fa-user-tie';
            }

            // Update placeholder
            if (usernameInput) {
                if (loginForm) {
                    usernameInput.placeholder = 'Enter driver username / ID';
                } else if (registerForm) {
                    usernameInput.placeholder = 'Choose a driver username';
                }
            }
        }
    }

    if (roleTabPassenger) {
        roleTabPassenger.addEventListener('click', () => setRole('passenger'));
    }
    if (roleTabDriver) {
        roleTabDriver.addEventListener('click', () => setRole('driver'));
    }

    // Initialize styling on page load based on URL or input value
    const initialRole = (loginRoleInput ? loginRoleInput.value : null) || (registerRoleInput ? registerRoleInput.value : null) || 'passenger';
    setRole(initialRole);

    // 2. Handle Login Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const role = loginRoleInput.value;

            if (!usernameInput || !passwordInput) return;

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            // Reset UI
            if (errorMessage) errorMessage.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Logging In...';
            }

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role })
                });

                const data = await response.json();

                if (response.ok && data.user) {
                    // Redirect to correct dashboard based on role
                    if (role === 'driver') {
                        window.location.href = '/driver';
                    } else {
                        window.location.href = '/';
                    }
                } else {
                    throw new Error(data.error || 'Invalid credentials.');
                }
            } catch (err) {
                if (errorMessage && errorText) {
                    errorText.textContent = err.message;
                    errorMessage.style.display = 'flex';
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>Log In</span> <i class="fa-solid fa-arrow-right-to-bracket"></i>';
                }
            }
        });
    }

    // 3. Handle Register Submit
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const role = registerRoleInput.value;

            if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validation checks
            if (password.length < 6) {
                showRegisterError('Password must be at least 6 characters.');
                return;
            }

            if (password !== confirmPassword) {
                showRegisterError('Passwords do not match.');
                return;
            }

            // Reset UI
            if (errorMessage) errorMessage.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Creating Account...';
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, role })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Registration succeeded and user is logged in
                    if (role === 'driver') {
                        window.location.href = '/driver';
                    } else {
                        window.location.href = '/';
                    }
                } else {
                    throw new Error(data.error || 'Failed to register.');
                }
            } catch (err) {
                showRegisterError(err.message);
            }
        });
    }

    function showRegisterError(message) {
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.style.display = 'flex';
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Register</span> <i class="fa-solid fa-user-plus"></i>';
        }
    }

    // 4. Forgot Password Flow Logic
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    
    const forgotErrorMsg = document.getElementById('forgot-error-message');
    const forgotSuccessMsg = document.getElementById('forgot-success-message');
    
    const btnSendOtp = document.getElementById('btn-send-otp');
    const forgotEmailInput = document.getElementById('forgot-email');
    const forgotStep1 = document.getElementById('forgot-step-1');
    const forgotStep2 = document.getElementById('forgot-step-2');
    
    const btnResetPassword = document.getElementById('btn-reset-password');
    const forgotOtpInput = document.getElementById('forgot-otp');
    const forgotNewPasswordInput = document.getElementById('forgot-new-password');

    // Toggle Forgot Password form visibility
    if (forgotPasswordLink && loginForm && forgotPasswordForm) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            forgotPasswordForm.style.display = 'block';
            
            // Clear message states
            if (forgotErrorMsg) forgotErrorMsg.style.display = 'none';
            if (forgotSuccessMsg) forgotSuccessMsg.style.display = 'none';
            
            // Reset to Step 1
            if (forgotStep1) forgotStep1.style.display = 'block';
            if (forgotStep2) forgotStep2.style.display = 'none';
            if (forgotEmailInput) forgotEmailInput.value = '';
            if (forgotOtpInput) forgotOtpInput.value = '';
            if (forgotNewPasswordInput) forgotNewPasswordInput.value = '';
        });
    }

    if (backToLoginLink && loginForm && forgotPasswordForm) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }

    // Step 1: Send OTP
    if (btnSendOtp) {
        btnSendOtp.addEventListener('click', async () => {
            const email = forgotEmailInput ? forgotEmailInput.value.trim() : '';
            const role = loginRoleInput ? loginRoleInput.value : 'passenger';

            if (!email) {
                showForgotError('Please enter your registered Gmail ID.');
                return;
            }

            // Reset UI states
            if (forgotErrorMsg) forgotErrorMsg.style.display = 'none';
            if (forgotSuccessMsg) forgotSuccessMsg.style.display = 'none';
            btnSendOtp.disabled = true;
            btnSendOtp.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Sending OTP...';

            try {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, role })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showForgotSuccess(data.message);
                    // Move to Step 2
                    if (forgotStep1) forgotStep1.style.display = 'none';
                    if (forgotStep2) forgotStep2.style.display = 'block';
                } else {
                    throw new Error(data.error || 'Failed to send OTP.');
                }
            } catch (err) {
                showForgotError(err.message);
            } finally {
                btnSendOtp.disabled = false;
                btnSendOtp.innerHTML = '<span>Send OTP</span> <i class="fa-solid fa-paper-plane"></i>';
            }
        });
    }

    // Step 2: Verify OTP & Reset Password Form Submission
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Only execute if Step 2 is active
            if (forgotStep2 && forgotStep2.style.display === 'none') {
                return;
            }

            const email = forgotEmailInput ? forgotEmailInput.value.trim() : '';
            const role = loginRoleInput ? loginRoleInput.value : 'passenger';
            const otp = forgotOtpInput ? forgotOtpInput.value.trim() : '';
            const newPassword = forgotNewPasswordInput ? forgotNewPasswordInput.value : '';

            if (!email || !otp || !newPassword) {
                showForgotError('All fields are required.');
                return;
            }

            if (newPassword.length < 6) {
                showForgotError('New password must be at least 6 characters.');
                return;
            }

            if (forgotErrorMsg) forgotErrorMsg.style.display = 'none';
            if (forgotSuccessMsg) forgotSuccessMsg.style.display = 'none';
            
            const submitBtnForgot = forgotPasswordForm.querySelector('button[type="submit"]');
            if (submitBtnForgot) {
                submitBtnForgot.disabled = true;
                submitBtnForgot.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Resetting...';
            }

            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, role, otp, new_password: newPassword })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showForgotSuccess('Password reset successfully! Redirecting to login...');
                    
                    // Clear inputs
                    if (forgotEmailInput) forgotEmailInput.value = '';
                    if (forgotOtpInput) forgotOtpInput.value = '';
                    if (forgotNewPasswordInput) forgotNewPasswordInput.value = '';
                    
                    // Transition back to login after 2 seconds
                    setTimeout(() => {
                        forgotPasswordForm.style.display = 'none';
                        loginForm.style.display = 'block';
                        if (forgotSuccessMsg) forgotSuccessMsg.style.display = 'none';
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Failed to reset password.');
                }
            } catch (err) {
                showForgotError(err.message);
            } finally {
                if (submitBtnForgot) {
                    submitBtnForgot.disabled = false;
                    submitBtnForgot.innerHTML = '<span>Reset Password</span> <i class="fa-solid fa-circle-check"></i>';
                }
            }
        });
    }

    function showForgotError(message) {
        if (forgotErrorMsg) {
            const span = forgotErrorMsg.querySelector('span');
            if (span) span.textContent = message;
            forgotErrorMsg.style.display = 'flex';
        }
    }

    function showForgotSuccess(message) {
        if (forgotSuccessMsg) {
            const span = forgotSuccessMsg.querySelector('span');
            if (span) span.textContent = message;
            forgotSuccessMsg.style.display = 'flex';
        }
    }

    // 5. Password Visibility Toggle Logic
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            if (!input) return;
            
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    });
});
