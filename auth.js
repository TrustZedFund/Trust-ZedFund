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

    // Validation
    if (!name || !email || !password) {
      if (errorEl) errorEl.textContent = "All required fields must be filled";
      return;
    }

    if (password.length < 8) { // Changed from 6 to 8 for FinTech
      if (errorEl) errorEl.textContent = "Password must be at least 8 characters with uppercase, lowercase, and number";
      return;
    }

    // Check password strength for FinTech
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      if (errorEl) errorEl.textContent = "Password must include uppercase, lowercase letters, and numbers";
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

      // Create user in Firebase (email verification will be required)
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      console.log("User created successfully:", user.uid);

      // Send email verification - CRITICAL FOR FINTECH
      await sendEmailVerification(user);
      console.log("Verification email sent");

      const referralCode = "TZF" + user.uid.slice(0, 6).toUpperCase();

      // Create user data in database
      await set(ref(db, `users/${user.uid}`), {
        profile: {
          name,
          email,
          createdAt: Date.now(),
          emailVerified: false, // Track verification status
          lastLogin: null,
          accountStatus: "pending_verification", // Add account status
          kycStatus: "not_started" // KYC tracking for FinTech
        },
        balances: {
          deposit: 0,
          earnings: 0,
          referralWallet: 0,
          availableBalance: 0,
          totalBalance: 0
        },
        security: {
          twoFactorEnabled: false,
          lastPasswordChange: Date.now(),
          loginAttempts: 0
        },
        referral: {
          code: referralCode,
          referredBy: referral,
          referrals: []
        },
        restrictions: {
          canTrade: false, // Don't allow trading until verified
          canWithdraw: false, // Don't allow withdrawals until verified
          canDeposit: false // Don't allow deposits until verified
        }
      });

      // Add welcome notification
      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund! Please verify your email to activate your account.",
        read: false,
        time: Date.now(),
        type: "welcome",
        priority: "high"
      });

      // Add email verification notification
      await push(ref(db, `notifications/${user.uid}`), {
        message: "📧 Verification email sent. Please check your inbox.",
        read: false,
        time: Date.now(),
        type: "verification",
        priority: "high"
      });

      // Update referral if provided
      if (referral) {
        console.log("Processing referral code:", referral);
        await push(ref(db, `referralTracking`), {
          referrerCode: referral,
          referredEmail: email,
          referredUserId: user.uid,
          timestamp: Date.now(),
          status: "pending_verification"
        });
      }

      // Sign out user immediately for security
      await signOut(auth);
      console.log("User signed out for security");

      // Show success message with verification instructions
      if (successEl) {
        successEl.innerHTML = `
          <div class="success-message">
            <strong>✓ Account Created Successfully!</strong><br>
            <p>A verification email has been sent to <strong>${email}</strong>.</p>
            <p style="margin-top: 10px;"><strong>Important:</strong> You must verify your email before you can:</p>
            <ul style="margin: 10px 0 10px 20px;">
              <li>Login to your account</li>
              <li>Make deposits</li>
              <li>Start trading</li>
              <li>Withdraw funds</li>
            </ul>
            <p>Check your spam folder if you don't see the email within 5 minutes.</p>
          </div>
        `;
        successEl.style.display = 'block';
      }

      // Clear form
      signupForm.reset();

      // Show countdown to redirect to login page
      let countdown = 10;
      const countdownEl = document.createElement('div');
      countdownEl.className = 'countdown-text';
      countdownEl.style.marginTop = '15px';
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
        
        // Enhanced error messages for FinTech
        if (err.code === 'auth/email-already-in-use') {
          errorMessage = "This email is already registered. Please login or use a different email.";
        } else if (err.code === 'auth/weak-password') {
          errorMessage = "Password is too weak. Use at least 8 characters with uppercase, lowercase letters, and numbers.";
        } else if (err.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
        } else if (err.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (err.code === 'auth/operation-not-allowed') {
          errorMessage = "Email/password accounts are not enabled. Please contact support.";
        } else if (err.code === 'auth/too-many-requests') {
          errorMessage = "Too many attempts. Please try again later.";
        }
        
        errorEl.innerHTML = `<strong>✗ Security Error:</strong> ${errorMessage}`;
        errorEl.style.display = 'block';
      }
    }
  });
}
/* ================= LOGIN ================= */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Login form submitted");

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    const errorEl = document.getElementById("loginError");
    const successEl = document.getElementById("loginSuccess");

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
        submitBtn.innerHTML = '<span class="loader"></span> Verifying...';
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Login successful for:", user.email);
      
      // Check if email is verified - CRITICAL FOR FINTECH
      if (!user.emailVerified) {
        await signOut(auth); // Sign out immediately
        throw {
          code: 'auth/email-not-verified',
          message: 'Email not verified. Please verify your email before logging in.'
        };
      }
      
      // Check account restrictions in database
      const userRef = ref(db, `users/${user.uid}/restrictions`);
      const snapshot = await get(userRef);
      const restrictions = snapshot.val();
      
      if (restrictions?.accountLocked) {
        await signOut(auth);
        throw {
          code: 'auth/account-locked',
          message: 'Account is locked. Please contact support.'
        };
      }
      
      // Update last login time in database
      await set(ref(db, `users/${user.uid}/profile/lastLogin`), Date.now());
      
      // Reset login attempts on successful login
      await set(ref(db, `users/${user.uid}/security/loginAttempts`), 0);
      
      // Log the login
      await push(ref(db, `securityLogs/${user.uid}`), {
        action: 'login',
        timestamp: Date.now(),
        ip: await getIP(),
        userAgent: navigator.userAgent
      });
      
      // Show success message
      if (successEl) {
        successEl.innerHTML = '<strong>✓ Security verification successful! Redirecting...</strong>';
        successEl.style.display = 'block';
      }
      
      // Short delay for security confirmation
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);

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
        
        // Enhanced error handling for FinTech
        if (err.code === 'auth/email-not-verified') {
          errorMessage = `
            Email not verified.<br>
            <a href="#" onclick="resendVerificationEmail('${email}')" style="color: #3b82f6; text-decoration: underline;">
              Click here to resend verification email
            </a>
          `;
        } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          errorMessage = "Invalid email or password. Please try again.";
          // Track failed attempts here (implement rate limiting)
        } else if (err.code === 'auth/user-not-found') {
          errorMessage = "No verified account found with this email. Please sign up or check your verification email.";
        } else if (err.code === 'auth/too-many-requests') {
          errorMessage = "Too many failed attempts. Please try again in 15 minutes or reset your password.";
        } else if (err.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (err.code === 'auth/user-disabled') {
          errorMessage = "This account has been disabled for security reasons. Please contact support.";
        } else if (err.code === 'auth/account-locked') {
          errorMessage = "Account is temporarily locked. Please contact customer support.";
        }
        
        errorEl.innerHTML = `<strong>✗ Security Alert:</strong> ${errorMessage}`;
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

onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
  
  const currentPage = window.location.pathname.split("/").pop();
  const protectedPages = ["dashboard.html", "wallet.html", "investments.html", "profile.html", "trading.html"];
  const authPages = ["login.html", "register.html", "forgot-password.html"];
  
  // If user exists
  if (user) {
    // Check email verification for FinTech
    if (!user.emailVerified && protectedPages.includes(currentPage)) {
      console.log("User not verified, redirecting to verification page");
      await signOut(auth);
      window.location.href = "verify-email.html?email=" + encodeURIComponent(user.email);
      return;
    }
    
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userEmail', user.email || '');
    
    // Redirect logged-in, verified users away from auth pages
    if (authPages.includes(currentPage) && user.emailVerified) {
      console.log("Verified user already logged in, redirecting to dashboard");
      window.location.href = "dashboard.html";
      return;
    }
    
  } else {
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    
    // Redirect non-logged-in users from protected pages
    if (protectedPages.includes(currentPage)) {
      console.log("No authenticated user, redirecting to login");
      window.location.href = "login.html?redirect=" + encodeURIComponent(currentPage);
    }
  }
});

/* ================= EMAIL VERIFICATION ================= */
// Function to resend verification email
window.resendVerificationEmail = async function(email) {
  try {
    // Create a temporary user credential to resend verification
    const actionCodeSettings = {
      url: window.location.origin + '/login.html',
      handleCodeInApp: true
    };
    
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    alert('Verification email resent. Please check your inbox.');
  } catch (err) {
    console.error('Error resending verification:', err);
    alert('Could not resend verification. Please try again or contact support.');
  }
};

// Function to check verification status
async function checkEmailVerification(user) {
  try {
    await user.reload();
    return user.emailVerified;
  } catch (err) {
    console.error('Error checking verification:', err);
    return false;
  }
}