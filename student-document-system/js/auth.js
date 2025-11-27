// js/auth.js - FULLY FIXED & CLEAN VERSION (2025)

// Get the Supabase client that was created in config.js
const supabase = window.supabase;

// Safety check - if somehow config.js failed, show clear error
if (!supabase) {
    console.error('Supabase client not initialized! Check config.js');
    document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:5rem;">Error: Supabase not loaded. Check console.</h1>';
}

// Redirect to dashboard if already logged in (on login/signup pages)
async function checkAuthAndRedirect() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            window.location.href = 'dashboard.html';
        }
    } catch (err) {
        console.warn('Auth check failed:', err);
    }
}

// Only run on login & signup pages - prevents errors when element doesn't exist
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect();

    // === LOGIN FORM ===
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!loginForm.checkValidity()) {
                loginForm.classList.add('was-validated');
                return;
            }

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginBtn');
            const spinner = document.getElementById('loginSpinner');

            btn.disabled = true;
            spinner.classList.remove('d-none');

            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                showAlert('Login successful! Welcome back', 'success');
                setTimeout(() => window.location.href = 'dashboard.html', 1200);

            } catch (err) {
                console.error('Login failed:', err);
                showAlert('Login failed: ' + err.message, 'danger');
            } finally {
                btn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }

    // === SIGNUP FORM ===
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!signupForm.checkValidity()) {
                signupForm.classList.add('was-validated');
                return;
            }

            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            const btn = document.getElementById('signupBtn');
            const spinner = document.getElementById('signupSpinner');

            if (password !== confirmPassword) {
                showAlert('Passwords do not match!', 'danger');
                return;
            }

            btn.disabled = true;
            spinner.classList.remove('d-none');

            try {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin + '/dashboard.html'
                    }
                });

                if (error) throw error;

                showAlert('Account created! Check your email to confirm, then log in.', 'success');
                signupForm.reset();
                signupForm.classList.remove('was-validated');

                // Optional: auto-redirect to login after 3 seconds
                setTimeout(() => window.location.href = 'index.html', 3000);

            } catch (err) {
                console.error('Signup failed:', err);
                showAlert('Signup failed: ' + err.message, 'danger');
            } finally {
                btn.disabled = false;
                spinner.classList.add('d-none');
            }
        });
    }
});