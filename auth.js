// Import everything from firebase.js
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  ref,
  set,
  push,
  get
} from "./firebase.js";

/* ================= SIGN UP ================= */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Signup form submitted - FinTech Secure Flow");

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

    if (password.length < 8) {
      if (errorEl) errorEl.textContent = "Password must be at least 8 characters";
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      if (errorEl) errorEl.textContent = "Password must include uppercase, lowercase letters, and numbers";
      return;
    }

    const termsCheckbox = document.getElementById('terms');
    if (termsCheckbox && !termsCheckbox.checked) {
      if (errorEl) errorEl.textContent = "Please agree to the Terms of Service";
      return;
    }

    try {
      console.log("Creating user with email:", email);
      
      const submitBtn = document.getElementById('signupBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Creating Account...';
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      console.log("User created successfully:", user.uid);

      // SEND EMAIL VERIFICATION - CRITICAL
      await sendEmailVerification(user);
      console.log("Verification email sent");

      const referralCode = "TZF" + user.uid.slice(0, 6).toUpperCase();

      await set(ref(db, `users/${user.uid}`), {
        profile: {
          name,
          email,
          createdAt: Date.now(),
          emailVerified: false,
          lastLogin: null,
          accountStatus: "pending_verification",
          kycStatus: "not_started"
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
          canTrade: false,
          canWithdraw: false,
          canDeposit: false,
          accountLocked: false
        },
        settings: {
          theme: "light",
          notifications: true
        }
      });

      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund! Please verify your email to activate your account.",
        read: false,
        time: Date.now(),
        type: "welcome",
        priority: "high"
      });

      await push(ref(db, `notifications/${user.uid}`), {
        message: "📧 Verification email sent. Please check your inbox and spam folder.",
        read: false,
        time: Date.now(),
        type: "verification",
        priority: "high"
      });

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

      // SIGN USER OUT FOR SECURITY
      await signOut(auth);
      console.log("User signed out for security");

      if (successEl) {
        successEl.innerHTML = `
          <div class="success-message">
            <strong>✓ Account Created Successfully!</strong><br>
            <p>A verification email has been sent to <strong>${email}</strong>.</p>
            <p style="margin-top: 10px;"><strong>Important Security Notice:</strong></p>
            <ul style="margin: 10px 0 10px 20px;">
              <li>You must verify your email before logging in</li>
              <li>Check your spam folder if email not received</li>
              <li>No trading or withdrawals allowed until verified</li>
              <li>Account will be activated after email verification</li>
            </ul>
            <p>You will be redirected to login page shortly.</p>
          </div>
        `;
        successEl.style.display = 'block';
      }

      signupForm.reset();

      let countdown = 8;
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
      
      const submitBtn = document.getElementById('signupBtn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      }
      
      if (errorEl) {
        let errorMessage = err.message;
        
        if (err.code === 'auth/email-already-in-use') {
          errorMessage = "This email is already registered. Please login instead.";
        } else if (err.code === 'auth/weak-password') {
          errorMessage = "Password must be at least 8 characters with uppercase, lowercase letters, and numbers.";
        } else if (err.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
        } else if (err.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (err.code === 'auth/operation-not-allowed') {
          errorMessage = "Email/password accounts are not enabled. Please contact support.";
        }
        
        errorEl.innerHTML = `<strong>✗ Security Error:</strong> ${errorMessage}`;
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
    console.log("Login form submitted - FinTech Secure Flow");

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
      
      const submitBtn = document.getElementById('loginBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Verifying...';
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Login successful for:", user.email);
      
      // CHECK EMAIL VERIFICATION - CRITICAL
      if (!user.emailVerified) {
        await signOut(auth);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Login";
        }
        
        errorEl.innerHTML = `
          <strong>✗ Email Verification Required</strong><br>
          Your email address has not been verified. Please check your inbox for the verification email.<br>
          <button onclick="location.href='login.html?resend=${encodeURIComponent(email)}'" 
                  style="margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Resend Verification Email
          </button>
        `;
        errorEl.style.display = 'block';
        return;
      }
      
      // Check if account is locked in database
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();
      
      if (userData?.restrictions?.accountLocked) {
        await signOut(auth);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Login";
        }
        errorEl.textContent = "Account is locked. Please contact support.";
        errorEl.style.display = 'block';
        return;
      }
      
      await set(ref(db, `users/${user.uid}/profile/lastLogin`), Date.now());
      await set(ref(db, `users/${user.uid}/profile/emailVerified`), true);
      await set(ref(db, `users/${user.uid}/restrictions/canTrade`), true);
      await set(ref(db, `users/${user.uid}/restrictions/canDeposit`), true);
      
      await push(ref(db, `securityLogs/${user.uid}`), {
        action: 'login',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        status: 'success'
      });
      
      if (successEl) {
        successEl.innerHTML = '<strong>✓ Security verification successful! Redirecting...</strong>';
        successEl.style.display = 'block';
      }
      
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);

    } catch (err) {
      console.error("Login error:", err);
      
      const submitBtn = document.getElementById('loginBtn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
      
      if (errorEl) {
        let errorMessage = err.message;
        
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
    if (confirm("Are you sure you want to logout?")) {
      const logoutBtn = document.querySelector('.logout-btn');
      if (logoutBtn) {
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = '<span class="loader"></span> Logging out...';
      }
      
      const user = auth.currentUser;
      if (user) {
        await push(ref(db, `securityLogs/${user.uid}`), {
          action: 'logout',
          timestamp: Date.now(),
          status: 'success'
        });
      }
      
      await signOut(auth);
      console.log("User logged out");
      
      localStorage.removeItem('userLoggedIn');
      sessionStorage.clear();
      
      window.location.href = "login.html?logout=success";
    }
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed. Please try again.");
  }
};

/* ================= AUTH GUARD ================= */
onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
  
  const currentPage = window.location.pathname.split("/").pop();
  const protectedPages = ["dashboard.html", "wallet.html", "investments.html", "profile.html", "trading.html", "withdraw.html"];
  const authPages = ["login.html", "register.html", "forgot-password.html"];
  
  if (user) {
    // Check if email is verified when trying to access protected pages
    if (!user.emailVerified && protectedPages.includes(currentPage)) {
      console.log("User not verified, redirecting to login");
      await signOut(auth);
      window.location.href = "login.html?verify=required";
      return;
    }
    
    // Update user data if verified
    if (user.emailVerified) {
      await set(ref(db, `users/${user.uid}/profile/emailVerified`), true);
    }
    
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userEmail', user.email || '');
    
    // Redirect verified users away from auth pages
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
      console.log("No user, redirecting to login");
      window.location.href = "login.html?redirect=" + encodeURIComponent(currentPage);
    }
  }
});

/* ================= CHECK SIGNUP SUCCESS ================= */
function checkSignupSuccess() {
  const params = new URLSearchParams(window.location.search);
  const signupSuccess = params.get("signup");
  const email = params.get("email");
  const verifyRequired = params.get("verify");
  const resendEmail = params.get("resend");
  
  // Show signup success message
  if (signupSuccess === "success" && email) {
    const emailInput = document.getElementById("loginEmail");
    if (emailInput) {
      emailInput.value = decodeURIComponent(email);
    }
    
    const successEl = document.getElementById("loginSuccess") || document.createElement("div");
    if (!successEl.id) {
      successEl.id = "loginSuccess";
      successEl.className = "success-message";
      const form = document.getElementById("loginForm");
      if (form) {
        form.insertBefore(successEl, form.firstChild);
      }
    }
    
    successEl.innerHTML = `
      <div class="success-message">
        <strong>✓ Account Created Successfully!</strong><br>
        Please check your email (<strong>${decodeURIComponent(email)}</strong>) for verification link.<br>
        <small>You must verify your email before you can login.</small>
      </div>
    `;
    successEl.style.display = 'block';
    
    // Clear URL parameters
    if (window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }
  
  // Show verification required message
  if (verifyRequired === "required") {
    const errorEl = document.getElementById("loginError") || document.createElement("div");
    if (!errorEl.id) {
      errorEl.id = "loginError";
      errorEl.className = "error-message";
      const form = document.getElementById("loginForm");
      if (form) {
        form.insertBefore(errorEl, form.firstChild);
      }
    }
    
    errorEl.innerHTML = `
      <strong>✗ Email Verification Required</strong><br>
      You must verify your email address before accessing protected pages.<br>
      Please check your email for the verification link.
    `;
    errorEl.style.display = 'block';
    
    if (window.history.replaceState) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }
  
  // Auto-fill email for resend verification
  if (resendEmail) {
    const emailInput = document.getElementById("loginEmail");
    if (emailInput) {
      emailInput.value = decodeURIComponent(resendEmail);
    }
    
    const errorEl = document.getElementById("loginError") || document.createElement("div");
    if (!errorEl.id) {
      errorEl.id = "loginError";
      errorEl.className = "error-message";
      const form = document.getElementById("loginForm");
      if (form) {
        form.insertBefore(errorEl, form.firstChild);
      }
    }
    
    errorEl.innerHTML = `
      <strong>✗ Email Verification Required</strong><br>
      Email address <strong>${decodeURIComponent(resendEmail)}</strong> is not verified.<br>
      <button onclick="resendVerification('${decodeURIComponent(resendEmail)}')" 
              style="margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Click here to resend verification email
      </button>
    `;
    errorEl.style.display = 'block';
  }
}

// Run check on login page load
if (window.location.pathname.includes("login.html")) {
  document.addEventListener('DOMContentLoaded', checkSignupSuccess);
}

/* ================= RESEND VERIFICATION ================= */
window.resendVerification = async function(email) {
  try {
    console.log("Resending verification to:", email);
    
    // Get current user or sign in temporarily
    const user = auth.currentUser;
    
    if (user && user.email === email) {
      await sendEmailVerification(user);
      alert('✓ Verification email resent. Please check your inbox and spam folder.');
    } else {
      // For security, we need the user to login first to resend verification
      const errorEl = document.getElementById("loginError");
      if (errorEl) {
        errorEl.innerHTML = `
          <strong>✗ Action Required</strong><br>
          Please login first, then we can resend the verification email.<br>
          <small>For security reasons, we need to verify your password.</small>
        `;
        errorEl.style.display = 'block';
      }
    }
  } catch (err) {
    console.error("Resend verification error:", err);
    alert("Failed to resend verification email. Please try logging in again.");
  }
};