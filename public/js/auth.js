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
        const response = await fetch('/api/signup', {
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
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = "/";
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

