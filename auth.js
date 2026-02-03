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

    try {
      console.log("Creating user with email:", email);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      console.log("User created successfully:", user.uid);

      const referralCode = "TZF" + user.uid.slice(0, 6).toUpperCase();

      // Create user data in database
      await set(ref(db, `users/${user.uid}`), {
        profile: {
          name,
          email,
          createdAt: Date.now()
        },
        balances: {
          deposit: 0,
          earnings: 0,
          referralWallet: 0
        },
        referral: {
          code: referralCode,
          referredBy: referral
        }
      });

      // Add welcome notification
      await push(ref(db, `notifications/${user.uid}`), {
        message: "🎉 Welcome to Trust ZedFund! Your account is now active.",
        read: false,
        time: Date.now()
      });

      // Update referral if provided
      if (referral) {
        console.log("Processing referral code:", referral);
        // You can add referral logic here
      }

      if (successEl) {
        successEl.textContent = "Account created successfully! Redirecting...";
        successEl.style.color = "#10b981";
      }

      // Disable button to prevent double submission
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating Account...";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);

    } catch (err) {
      console.error("Signup error:", err);
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
        }
        
        errorEl.textContent = errorMessage;
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
    if (errorEl) errorEl.textContent = "";

    if (!email || !password) {
      if (errorEl) errorEl.textContent = "Email and password required";
      return;
    }

    try {
      console.log("Attempting login for:", email);
      
      // Disable button during login attempt
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";

      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful, redirecting to dashboard...");
      
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
      
      // Re-enable button
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
      
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
        }
        
        errorEl.textContent = errorMessage;
      }
    }
  });
}

/* ================= LOGOUT ================= */
window.logout = async function () {
  try {
    await signOut(auth);
    console.log("User logged out");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed. Please try again.");
  }
};

/* ================= AUTH GUARD ================= */
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
  
  const currentPage = window.location.pathname.split("/").pop();
  const protectedPages = ["dashboard.html", "wallet.html", "investments.html"];
  const authPages = ["login.html", "signup.html", "forgot-password.html"];
  
  // Redirect logged-in users away from auth pages
  if (user && authPages.includes(currentPage)) {
    console.log("User already logged in, redirecting to dashboard");
    window.location.href = "dashboard.html";
    return;
  }
  
  // Redirect non-logged-in users from protected pages
  if (!user && protectedPages.includes(currentPage)) {
    console.log("No user, redirecting to login");
    window.location.href = "login.html";
  }
});