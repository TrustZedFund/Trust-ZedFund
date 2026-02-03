/* ================= FIREBASE IMPORTS ================= */
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  ref,
  set,
  push,
  serverTimestamp,
  get
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

/* =========================
   AUTH STATE CHECK
========================= */
export function checkAuthState(callback) {
  onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

/* =========================
   SIGN UP FUNCTIONALITY
========================= */
document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // Initialize signup form if it exists
  if (signupForm) {
    console.log("📝 Signup form detected, initializing...");
    
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("🔄 Signup form submitted");
      
      // Get form values
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const referral = document.getElementById("referral")?.value.trim() || null;
      
      // Get message elements
      const errorEl = document.getElementById("signupError");
      const successEl = document.getElementById("signupSuccess");
      
      // Clear previous messages
      errorEl.textContent = "";
      successEl.textContent = "";
      
      // Validate inputs
      if (!name || !email || !password) {
        errorEl.textContent = "Please fill in all required fields";
        return;
      }
      
      if (password.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters";
        return;
      }
      
      // Disable submit button to prevent double submission
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Creating Account...";
      submitBtn.disabled = true;
      
      try {
        console.log("📧 Attempting to create user with email:", email);
        
        // Create user with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log("✅ User created successfully. UID:", user.uid);
        
        // Generate unique referral code for the new user
        const myReferralCode = "TZF" + Math.floor(100000 + Math.random() * 900000);
        
        // Create user document in Realtime Database
        const userRef = ref(db, `users/${user.uid}`);
        
        await set(userRef, {
          name: name,
          email: email,
          referralCode: myReferralCode,
          referredBy: referral,
          emailVerified: false,
          balances: {
            deposit: 0,
            earnings: 0,
            referral: 0
          },
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          status: "active",
          role: "user"
        });
        
        console.log("💾 User data saved to database");
        
        // Create welcome notification
        await push(ref(db, `notifications/${user.uid}`), {
          message: "🎉 Welcome to Trust ZedFund! Start investing wisely.",
          read: false,
          time: Date.now(),
          type: "welcome"
        });
        
        console.log("🔔 Welcome notification created");
        
        // Show success message
        successEl.textContent = "Account created successfully! Redirecting to login page...";
        successEl.style.color = "#27ae60";
        
        // Show success message and redirect
        setTimeout(() => {
          console.log("🔄 Redirecting to login page...");
          window.location.href = "login.html?signup=success";
        }, 2000);
        
      } catch (error) {
        console.error("❌ Signup error:", error);
        
        // Re-enable submit button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // User-friendly error messages
        let errorMessage = "An error occurred during signup. Please try again.";
        
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "This email is already registered. Please use a different email or login instead.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password is too weak. Please use at least 6 characters.";
            break;
          case 'auth/operation-not-allowed':
            errorMessage = "Email/password accounts are not enabled. Please contact support.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your internet connection and try again.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many signup attempts. Please try again later.";
            break;
          default:
            errorMessage = `Error: ${error.message}`;
        }
        
        errorEl.textContent = errorMessage;
        errorEl.style.color = "#e74c3c";
        
      }
    });
  }
  
  /* =========================
     LOGIN FUNCTIONALITY
  ========================= */
  if (loginForm) {
    console.log("🔑 Login form detected, initializing...");
    
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();
      const errorEl = document.getElementById("loginError");
      
      errorEl.textContent = "";
      
      // Disable submit button
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Logging in...";
      submitBtn.disabled = true;
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
        
        // Update last login time in database
        const user = auth.currentUser;
        if (user) {
          await set(ref(db, `users/${user.uid}/lastLogin`), serverTimestamp());
        }
        
        // Redirect to dashboard
        window.location.href = "dashboard.html";
        
      } catch (error) {
        console.error("Login error:", error);
        
        // Re-enable submit button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorEl.textContent = "Invalid email or password";
        } else if (error.code === 'auth/too-many-requests') {
          errorEl.textContent = "Too many failed attempts. Please try again later.";
        } else if (error.code === 'auth/user-disabled') {
          errorEl.textContent = "This account has been disabled. Please contact support.";
        } else {
          errorEl.textContent = "Login failed. Please try again.";
        }
      }
    });
  }
  
  // Check if we're coming from successful signup
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('signup') === 'success') {
    const signupSuccessMsg = document.getElementById('signupSuccess');
    if (signupSuccessMsg) {
      signupSuccessMsg.textContent = "Account created successfully! You can now login.";
      signupSuccessMsg.style.color = "#27ae60";
    }
  }
});

/* =========================
   PASSWORD TOGGLE (Global)
========================= */
window.togglePassword = function(id) {
  const input = document.getElementById(id);
  if (!input) return;
  
  const eye = input.parentElement.querySelector('.toggle-eye');
  if (input.type === "password") {
    input.type = "text";
    if (eye) eye.textContent = "🙈";
  } else {
    input.type = "password";
    if (eye) eye.textContent = "👀";
  }
};

/* =========================
   LOGOUT FUNCTION
========================= */
export async function logoutUser() {
  try {
    await auth.signOut();
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

/* =========================
   GET CURRENT USER
========================= */
export function getCurrentUser() {
  return auth.currentUser;
}

/* =========================
   GET USER DATA FROM DATABASE
========================= */
export async function getUserData(uid) {
  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
}