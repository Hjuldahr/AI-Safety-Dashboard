// DOM Element Selection & Tab Switching
const signInTab = document.querySelector("#signInTab");
const signUpTab = document.querySelector("#signUpTab");
const signInForm = document.querySelector("#signInForm");
const signUpForm = document.querySelector("#signUpForm");
const errorMessageDiv = document.querySelector("#errorMessage");

signInTab.addEventListener("click", () => {
    signInForm.classList.remove("hidden");
    signUpForm.classList.add("hidden");
    signInTab.classList.add("tab-active");
    signUpTab.classList.remove("tab-active");
    hideError();
});

signUpTab.addEventListener("click", () => {
    signUpForm.classList.remove("hidden");
    signInForm.classList.add("hidden");
    signUpTab.classList.add("tab-active");
    signInTab.classList.remove("tab-active");
    hideError();
});


// Form Submission Logic 

// Sign Up Handler
signUpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = document.querySelector("#signUpUsername").value;
    const email = document.querySelector("#signUpEmail").value;
    const password = document.querySelector("#signUpPassword").value;
    const confirmPassword = document.querySelector("#signUpConfirmPassword").value;

    if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
    }
    if (password.length < 8) {
        showError('Password must be at least 8 characters long.');
        return;
    }

    try {
        const response = await fetch('api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            showError("Account created! Please sign in.");
            signInTab.click(); // Programmatically click the sign-in tab
        } else {
            // If the server responded with an error, display the message from the server
            showError(data.message);
        }
    } catch (err) {
        console.error('Signup fetch error:', err);
        showError("An unexpected error occurred. Please try again.");
    }
});

// Sign In Handler
signInForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = document.querySelector("#signInInput").value;
    const password = document.querySelector("#signInPassword").value;

    try {
        const response = await fetch('api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            if (data.mustReset) {
                // Admin has forced a password reset — show change-password UI
                showForceResetPanel();
            } else {
                window.location.href = "./";
            }
        } else {
            showError(data.message);
        }
    } catch (err) {
        console.error('Login fetch error:', err);
        showError("An unexpected error occurred. Please try again.");
    }
});

function showError(message) {
    errorMessageDiv.querySelector("span").innerText = message;
    errorMessageDiv.classList.remove("hidden");
}
function hideError() {
    errorMessageDiv.classList.add("hidden");
    errorMessageDiv.querySelector("span").innerText = "";
}

// ---- Force Password Reset UI ----
function showForceResetPanel() {
    // Hide tabs and both auth forms
    const tabNav = document.querySelector('.tab-nav');
    if (tabNav) tabNav.style.display = 'none';
    signInForm.classList.add('hidden');
    signUpForm.classList.add('hidden');
    hideError();

    // Build and inject the reset panel
    const authCard = document.querySelector('.auth-card');
    const panel = document.createElement('div');
    panel.className = 'force-reset-panel visible';
    panel.id = 'force-reset-panel';
    panel.innerHTML = `
        <p class="reset-heading"><i class="fa-solid fa-lock" style="color:var(--color-warning,#f59e0b);margin-right:0.35rem"></i>Password Reset Required</p>
        <p class="reset-subtext">An administrator has requested that you set a new password before continuing.</p>
        <div class="form-group">
            <label for="new-password">New Password</label>
            <input type="password" id="new-password" placeholder="At least 8 characters" required minlength="8">
        </div>
        <div class="form-group">
            <label for="confirm-password">Confirm Password</label>
            <input type="password" id="confirm-password" placeholder="Repeat your new password" required>
        </div>
        <p class="reset-error" id="reset-error"></p>
        <div class="form-group">
            <button type="button" id="submit-reset" class="submit-button">Set New Password</button>
        </div>
    `;
    authCard.appendChild(panel);

    document.getElementById('submit-reset').addEventListener('click', async () => {
        const newPassword     = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorEl         = document.getElementById('reset-error');
        errorEl.textContent = '';

        if (newPassword.length < 8) {
            errorEl.textContent = 'Password must be at least 8 characters.';
            return;
        }
        if (newPassword !== confirmPassword) {
            errorEl.textContent = 'Passwords do not match.';
            return;
        }

        try {
            const res = await fetch('api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword, confirmPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                window.location.href = './';
            } else {
                errorEl.textContent = data.message || 'Failed to reset password.';
            }
        } catch (err) {
            console.error('Reset password error:', err);
            errorEl.textContent = 'An unexpected error occurred. Please try again.';
        }
    });
}
