// Import from firebase.js
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

// ===================== GLOBAL STATE =====================
let isAuthInitialized = false;

// ===================== SIGN UP HANDLER =====================
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const referral = document.getElementById("referral")?.value.trim() || null;
    
    // Get message elements
    const errorEl = document.getElementById("signupError");
    const successEl = document.getElementById("signupSuccess");
    
    // Clear previous messages
    if (errorEl) errorEl.textContent = "";
    if (successEl) successEl.textContent = "";
    
    // Validation
    if (!name || !email || !password) {
      showError(errorEl, "Please fill in all required fields");
      return;
    }
    
    if (password.length < 6) {
      showError(errorEl, "Password must be at least 6 characters long");
      return;
    }
    
    // Check terms agreement
    const termsCheckbox = document.getElementById('terms');
    if (termsCheckbox && !termsCheckbox.checked) {
      showError(errorEl, "You must agree to the Terms of Service");
      return;
    }
    
    // Email validation
    if (!isValidEmail(email)) {
      showError(errorEl, "Please enter a valid email address");
      return;
    }
    
    try {
      // Disable form and show loading
      disableForm(signupForm, true, "Creating Account...");
      
      // Step 1: Create user account
      console.log("Creating user account for:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Step 2: Save user data to database
      const referralCode = generateReferralCode(user.uid);
      
      await set(ref(db, `users/${user.uid}`), {
        profile: {
          name,
          email,
          createdAt: Date.now(),
          emailVerified: false,
          status: "active"
        },
        balances: {
          deposit: 0,
          earnings: 0,
          referralWallet: 0
        },
        referral: {
          code: referralCode,
          referredBy: referral,
          referrals: []
        },
        settings: {
          theme: "light",
          notifications: true,
          twoFactorEnabled: false
        }
      });
      
      // Step 3: Add welcome notification
      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund! Your account has been created.",
        type: "welcome",
        read: false,
        timestamp: Date.now()
      });
      
      // Step 4: Log the user out immediately (security best practice)
      console.log("Signing out user after account creation...");
      await signOut(auth);
      
      // Step 5: Show success message
      showSuccess(successEl, "Account created successfully! Redirecting to login...");
      
      // Step 6: Clear form
      signupForm.reset();
      
      // Step 7: Redirect to login page after delay
      setTimeout(() => {
        window.location.href = `login.html?signup=success&email=${encodeURIComponent(email)}`;
      }, 2000);
      
    } catch (error) {
      console.error("Signup error:", error);
      
      // Handle specific error cases
      let errorMessage = "An error occurred during signup";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "This email is already registered. Please use a different email or login.";
          break;
        case 'auth/invalid-email':
          errorMessage = "The email address is not valid. Please check and try again.";
          break;
        case 'auth/operation-not-allowed':
          errorMessage = "Email/password signup is currently disabled. Please contact support.";
          break;
        case 'auth/weak-password':
          errorMessage = "Password is too weak. Please use a stronger password.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your internet connection.";
          break;
        default:
          errorMessage = error.message;
      }
      
      showError(errorEl, errorMessage);
      disableForm(signupForm, false, "Create Account");
    }
  });
}

// ===================== LOGIN HANDLER =====================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;
    const errorEl = document.getElementById("loginError");
    const successEl = document.getElementById("loginSuccess");
    
    // Clear messages
    if (errorEl) errorEl.textContent = "";
    if (successEl) successEl.textContent = "";
    
    // Validation
    if (!email || !password) {
      showError(errorEl, "Please enter both email and password");
      return;
    }
    
    try {
      // Disable form and show loading
      disableForm(loginForm, true, "Logging in...");
      
      console.log("Attempting login for:", email);
      await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login time
      const user = auth.currentUser;
      if (user) {
        await set(ref(db, `users/${user.uid}/profile/lastLogin`), Date.now());
      }
      
      // Show success message
      showSuccess(successEl, "Login successful! Redirecting to dashboard...");
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
      
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          errorMessage = "Invalid email or password. Please try again.";
          break;
        case 'auth/user-not-found':
          errorMessage = "No account found with this email. Please sign up first.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled. Please contact support.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many login attempts. Please try again later.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your connection.";
          break;
      }
      
      showError(errorEl, errorMessage);
      disableForm(loginForm, false, "Login");
    }
  });
}

// ===================== LOGOUT FUNCTION =====================
window.logout = async function() {
  if (confirm("Are you sure you want to logout?")) {
    try {
      await signOut(auth);
      window.location.href = "login.html?logout=success";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Please try again.");
    }
  }
};

// ===================== AUTH STATE MANAGEMENT =====================
// Only setup auth state listener on relevant pages
function initializeAuthState() {
  if (isAuthInitialized) return;
  
  const currentPage = window.location.pathname.split('/').pop();
  
  // Define page types
  const publicPages = ['login.html', 'register.html', 'forgot-password.html', 'index.html'];
  const protectedPages = ['dashboard.html', 'wallet.html', 'investments.html', 'profile.html', 'withdraw.html', 'deposit.html'];
  
  // Only setup listener if we're on a page that needs it
  if (publicPages.includes(currentPage) || protectedPages.includes(currentPage)) {
    onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed. User:", user ? user.email : "No user");
      
      // On PUBLIC pages (login, register), redirect to dashboard if user is logged in
      if (user && publicPages.includes(currentPage)) {
        console.log("User is logged in on public page, redirecting to dashboard");
        
        // Special handling for register page - allow signup flow to complete
        if (currentPage === 'register.html') {
          // Don't redirect if we're in the middle of signup
          const signupForm = document.getElementById('signupForm');
          const isSubmitting = signupForm?.querySelector('button[type="submit"]:disabled');
          
          if (!isSubmitting) {
            // Small delay to avoid interrupting any ongoing process
            setTimeout(() => {
              if (auth.currentUser) {
                window.location.href = "dashboard.html";
              }
            }, 500);
          }
        } else {
          // For login page, redirect immediately
          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 100);
        }
      }
      
      // On PROTECTED pages, redirect to login if user is not logged in
      if (!user && protectedPages.includes(currentPage)) {
        console.log("No user on protected page, redirecting to login");
        window.location.href = `login.html?redirect=${encodeURIComponent(currentPage)}`;
      }
    });
    
    isAuthInitialized = true;
  }
}

// ===================== PAGE INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', function() {
  // Initialize auth state management
  initializeAuthState();
  
  // Check for URL parameters
  checkURLParameters();
  
  // Auto-fill referral code if present in URL
  autoFillReferralCode();
});

// ===================== HELPER FUNCTIONS =====================
function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      if (element.textContent === message) {
        element.style.display = 'none';
      }
    }, 5000);
  }
}

function showSuccess(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

function disableForm(form, disabled, buttonText = "") {
  if (!form) return;
  
  const inputs = form.querySelectorAll('input, button, select, textarea');
  const submitButton = form.querySelector('button[type="submit"]');
  
  inputs.forEach(input => {
    input.disabled = disabled;
  });
  
  if (submitButton && buttonText) {
    if (disabled) {
      submitButton.dataset.originalText = submitButton.textContent;
      submitButton.innerHTML = `
        <span class="spinner"></span> ${buttonText}
      `;
    } else {
      submitButton.textContent = submitButton.dataset.originalText || buttonText;
    }
  }
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function generateReferralCode(uid) {
  return "TZF" + uid.slice(0, 8).toUpperCase();
}

function checkURLParameters() {
  const params = new URLSearchParams(window.location.search);
  const currentPage = window.location.pathname.split('/').pop();
  
  // Handle signup success on login page
  if (currentPage === 'login.html') {
    const signupSuccess = params.get('signup');
    const email = params.get('email');
    
    if (signupSuccess === 'success' && email) {
      // Auto-fill email
      const emailInput = document.getElementById('loginEmail');
      if (emailInput) {
        emailInput.value = decodeURIComponent(email);
      }
      
      // Show success message
      const successEl = document.getElementById('loginSuccess') || createMessageElement('loginSuccess', 'success');
      successEl.innerHTML = `
        <div class="success-message">
          <strong>✓ Account Created Successfully!</strong><br>
          Please enter your password to login.
        </div>
      `;
      successEl.style.display = 'block';
      
      // Auto-focus password field
      setTimeout(() => {
        document.getElementById('loginPassword')?.focus();
      }, 300);
      
      // Clean URL
      cleanURL();
    }
    
    // Handle logout success
    const logoutSuccess = params.get('logout');
    if (logoutSuccess === 'success') {
      const successEl = document.getElementById('loginSuccess') || createMessageElement('loginSuccess', 'success');
      successEl.innerHTML = `
        <div class="success-message">
          <strong>✓ Logged Out Successfully</strong><br>
          You have been securely logged out.
        </div>
      `;
      successEl.style.display = 'block';
      cleanURL();
    }
  }
  
  // Handle redirect message
  const redirectPage = params.get('redirect');
  if (redirectPage && currentPage === 'login.html') {
    const errorEl = document.getElementById('loginError') || createMessageElement('loginError', 'error');
    errorEl.textContent = `Please login to access ${redirectPage}`;
    errorEl.style.display = 'block';
    cleanURL();
  }
}

function createMessageElement(id, type) {
  const element = document.createElement('div');
  element.id = id;
  element.className = `${type}-text`;
  element.style.display = 'none';
  
  const form = document.querySelector('form');
  if (form) {
    form.insertBefore(element, form.firstChild);
  }
  
  return element;
}

function cleanURL() {
  if (window.history.replaceState) {
    const cleanURL = window.location.pathname;
    window.history.replaceState({}, document.title, cleanURL);
  }
}

function autoFillReferralCode() {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get('ref');
  
  if (refCode) {
    const referralInput = document.getElementById('referral');
    if (referralInput) {
      referralInput.value = refCode;
      
      // Show a note
      const formGroup = referralInput.closest('.form-group');
      if (formGroup) {
        const hint = formGroup.querySelector('.form-hint');
        if (hint) {
          hint.textContent = `Referral code applied: ${refCode}`;
          hint.style.color = '#10b981';
        }
      }
    }
  }
}

// Make helper functions available globally if needed
window.showError = showError;
window.showSuccess = showSuccess;