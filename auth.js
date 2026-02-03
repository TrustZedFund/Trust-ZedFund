// Import everything from firebase.js
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  ref,
  set,
  push
} from "./firebase.js";

/* ================= SIGN UP ================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Signup form submitted");

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const referral = document.getElementById("referral")?.value.trim() || null;

    const errorEl = document.getElementById("signupError");
    const successEl = document.getElementById("signupSuccess");

    if (errorEl) errorEl.textContent = "";
    if (successEl) successEl.textContent = "";

    if (!name || !email || !password) {
      if (errorEl) errorEl.textContent = "All required fields must be filled";
      return;
    }

    if (password.length < 6) {
      if (errorEl) errorEl.textContent = "Password must be at least 6 characters";
      return;
    }

    // Check terms agreement
    const termsCheckbox = document.getElementById('terms');
    if (termsCheckbox && !termsCheckbox.checked) {
      if (errorEl) errorEl.textContent = "Please agree to the Terms of Service";
      return;
    }

    try {
      console.log("Creating user with email:", email);
      
      // Disable button and show loading
      const submitBtn = document.getElementById('signupBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Creating Account...';
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      console.log("User created successfully:", user.uid);

      const referralCode = "TZF" + user.uid.slice(0, 6).toUpperCase();

      // Create user data in database
      await set(ref(db, `users/${user.uid}`), {
        profile: {
          name,
          email,
          createdAt: Date.now(),
          emailVerified: false,
          lastLogin: null
        },
        balances: {
          deposit: 0,
          earnings: 0,
          referralWallet: 0
        },
        referral: {
          code: referralCode,
          referredBy: referral
        },
        settings: {
          theme: "light",
          notifications: true
        }
      });

      // Add welcome notification
      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund! Please verify your email.",
        read: false,
        time: Date.now(),
        type: "welcome"
      });

      // Update referral if provided
      if (referral) {
        console.log("Processing referral code:", referral);
        // Add referral tracking logic here
        await push(ref(db, `referralTracking`), {
          referrerCode: referral,
          referredEmail: email,
          referredUserId: user.uid,
          timestamp: Date.now()
        });
      }

      // Auto sign-out after account creation (security best practice)
      await signOut(auth);
      console.log("User signed out after account creation");

      if (successEl) {
        successEl.innerHTML = `
          <div class="success-message">
            <strong>✓ Account Created Successfully!</strong><br>
            Your account has been created. Please login to continue.
          </div>
        `;
        successEl.style.display = 'block';
      }

      // Clear form
      signupForm.reset();

      // Show countdown to redirect
      let countdown = 5;
      const countdownEl = document.createElement('div');
      countdownEl.className = 'countdown-text';
      countdownEl.style.marginTop = '10px';
      countdownEl.style.fontSize = '14px';
      countdownEl.style.color = '#6b7280';
      countdownEl.innerHTML = `Redirecting to login in <strong>${countdown}</strong> seconds...`;
      
      if (successEl) {
        successEl.appendChild(countdownEl);
      }

      const countdownInterval = setInterval(() => {
        countdown--;
        countdownEl.innerHTML = `Redirecting to login in <strong>${countdown}</strong> seconds...`;
        
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          window.location.href = "login.html?signup=success&email=" + encodeURIComponent(email);
        }
      }, 1000);

      // Also provide manual redirect button
      setTimeout(() => {
        const manualRedirect = document.createElement('div');
        manualRedirect.style.marginTop = '15px';
        manualRedirect.innerHTML = `
          <p style="margin-bottom: 10px;">Not redirecting?</p>
          <a href="login.html?signup=success&email=${encodeURIComponent(email)}" 
             class="primary-btn" 
             style="padding: 10px 20px; font-size: 14px;">
            Go to Login Now
          </a>
        `;
        if (successEl) {
          successEl.appendChild(manualRedirect);
        }
      }, 2000);

    } catch (err) {
      console.error("Signup error:", err);
      
      // Re-enable button
      const submitBtn = document.getElementById('signupBtn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      }
      
      if (errorEl) {
        let errorMessage = err.message;
        
        // User-friendly error messages
        if (err.code === 'auth/email-already-in-use') {
          errorMessage = "This email is already registered. Please login instead.";
        } else if (err.code === 'auth/weak-password') {
          errorMessage = "Password is too weak. Use at least 6 characters.";
        } else if (err.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
        } else if (err.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (err.code === 'auth/operation-not-allowed') {
          errorMessage = "Email/password accounts are not enabled. Please contact support.";
        }
        
        errorEl.innerHTML = `<strong>✗ Error:</strong> ${errorMessage}`;
        errorEl.style.display = 'block';
      }
    }
  });
}

/* ================= LOGIN ================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Login form submitted");

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    const errorEl = document.getElementById("loginError");
    const successEl = document.getElementById("loginSuccess"); // Added success message for signup redirect

    if (errorEl) errorEl.textContent = "";
    if (successEl) successEl.textContent = "";

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Email and password required";
      return;
    }

    try {
      console.log("Attempting login for:", email);
      
      // Disable button during login attempt
      const submitBtn = document.getElementById('loginBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Logging in...';
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Login successful for:", user.email);
      
      // Update last login time in database
      await set(ref(db, `users/${user.uid}/profile/lastLogin`), Date.now());
      
      // Show success message briefly before redirect
      if (successEl) {
        successEl.innerHTML = '<strong>✓ Login successful! Redirecting...</strong>';
        successEl.style.display = 'block';
      }
      
      // Short delay before redirect to show success message
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);

    } catch (err) {
      console.error("Login error:", err);
      
      // Re-enable button
      const submitBtn = document.getElementById('loginBtn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
      
      if (errorEl) {
        let errorMessage = err.message;
        
        // User-friendly error messages
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (err.code === 'auth/user-not-found') {
          errorMessage = "No account found with this email. Please sign up.";
        } else if (err.code === 'auth/too-many-requests') {
          errorMessage = "Too many failed attempts. Please try again later.";
        } else if (err.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (err.code === 'auth/user-disabled') {
          errorMessage = "This account has been disabled. Please contact support.";
        }
        
        errorEl.innerHTML = `<strong>✗ Error:</strong> ${errorMessage}`;
        errorEl.style.display = 'block';
      }
    }
  });
}

/* ================= LOGOUT ================= */
window.logout = async function () {
  try {
    // Show confirmation dialog
    if (confirm("Are you sure you want to logout?")) {
      const logoutBtn = document.querySelector('.logout-btn');
      if (logoutBtn) {
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = '<span class="loader"></span> Logging out...';
      }
      
      await signOut(auth);
      console.log("User logged out");
      
      // Clear any cached data
      localStorage.removeItem('userLoggedIn');
      sessionStorage.clear();
      
      // Redirect to login with logout message
      window.location.href = "login.html?logout=success";
    }
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed. Please try again.");
  }
};

/* ================= AUTH GUARD ================= */
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
  
  const currentPage = window.location.pathname.split("/").pop();
  const protectedPages = ["dashboard.html", "wallet.html", "investments.html", "profile.html"];
  const authPages = ["login.html", "register.html", "forgot-password.html"];
  
  // Update login state in localStorage (optional)
  if (user) {
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userEmail', user.email || '');
    
    // Redirect logged-in users away from auth pages
    if (authPages.includes(currentPage)) {
      console.log("User already logged in, redirecting to dashboard");
      window.location.href = "dashboard.html";
      return;
    }
  } else {
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    
    // Redirect non-logged-in users from protected pages
    if (protectedPages.includes(currentPage)) {
      console.log("No user, redirecting to login");
      window.location.href = "login.html?redirect=" + encodeURIComponent(currentPage);
    }
  }
});

/* ================= CHECK SIGNUP SUCCESS ================= */
// This function checks URL parameters for signup success
function checkSignupSuccess() {
  const params = new URLSearchParams(window.location.search);
  const signupSuccess = params.get("signup");
  const email = params.get("email");
  
  if (signupSuccess === "success" && email) {
    // Auto-fill the email in login form
    const emailInput = document.getElementById("loginEmail");
    if (emailInput) {
      emailInput.value = decodeURIComponent(email);
    }
    
    // Show success message
    const successEl = document.getElementById("loginSuccess") || document.createElement("div");
    if (!successEl.id) {
      successEl.id = "loginSuccess";
      successEl.className = "success-text";
      const form = document.getElementById("loginForm");
      if (form) {
        form.insertBefore(successEl, form.firstChild);
      }
    }
    
    successEl.innerHTML = `
      <div class="success-message">
        <strong>✓ Account Created Successfully!</strong><br>
        Please login with your credentials to continue.
      </div>
    `;
    successEl.style.display = 'block';
    
    // Clear the URL parameters
    if (window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }
}

// Run check on login page load
if (window.location.pathname.includes("login.html")) {
  document.addEventListener('DOMContentLoaded', checkSignupSuccess);
}