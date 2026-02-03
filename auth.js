// auth-system.js - SIMPLE WORKING VERSION
// Add this to your HTML: <script src="auth-system.js"></script>

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  
  // =============== SIGNUP FUNCTIONALITY ===============
  const signupForm = document.getElementById('signupForm');
  
  if (signupForm) {
    console.log("Signup form found, attaching listener...");
    
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log("Signup form submitted");
      
      // Get form values
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const referral = document.getElementById('referral')?.value.trim() || '';
      
      // Get message elements
      const errorEl = document.getElementById('signupError');
      const successEl = document.getElementById('signupSuccess');
      
      // Clear messages
      if (errorEl) errorEl.textContent = '';
      if (successEl) successEl.textContent = '';
      
      // Validation
      if (!name || !email || !password) {
        if (errorEl) errorEl.textContent = 'Please fill in all required fields';
        return;
      }
      
      if (password.length < 6) {
        if (errorEl) errorEl.textContent = 'Password must be at least 6 characters';
        return;
      }
      
      // Disable button and show loading
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
      }
      
      try {
        console.log("Creating user with Firebase...");
        
        // 1. Create user with Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log("User created:", user.uid);
        
        // 2. Save user data to Realtime Database
        const referralCode = 'TZF' + user.uid.slice(0, 6).toUpperCase();
        
        await firebase.database().ref('users/' + user.uid).set({
          profile: {
            name: name,
            email: email,
            createdAt: Date.now(),
            emailVerified: false
          },
          balances: {
            deposit: 0,
            earnings: 0,
            referralWallet: 0
          },
          referral: {
            code: referralCode,
            referredBy: referral || null
          }
        });
        
        console.log("User data saved to database");
        
        // 3. Add welcome notification
        await firebase.database().ref('notifications/' + user.uid).push({
          message: '🎉 Welcome to Trust ZedFund!',
          read: false,
          time: Date.now()
        });
        
        // 4. SIGN USER OUT - This is the key step!
        console.log("Signing user out after account creation...");
        await firebase.auth().signOut();
        console.log("User signed out successfully");
        
        // 5. Show success message
        if (successEl) {
          successEl.textContent = 'Account created successfully! Redirecting to login...';
          successEl.style.color = 'green';
        }
        
        // 6. Clear form
        signupForm.reset();
        
        // 7. Redirect to login page after 2 seconds
        setTimeout(() => {
          window.location.href = 'login.html?signup=success&email=' + encodeURIComponent(email);
        }, 2000);
        
      } catch (error) {
        console.error("Signup error:", error);
        
        // Re-enable button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
        
        // Show error message
        if (errorEl) {
          let errorMessage = error.message;
          
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please login instead.';
          } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Use at least 6 characters.';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
          }
          
          errorEl.textContent = errorMessage;
        }
      }
    });
  }
  
  // =============== LOGIN FUNCTIONALITY ===============
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    console.log("Login form found, attaching listener...");
    
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log("Login form submitted");
      
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errorEl = document.getElementById('loginError');
      
      // Clear error
      if (errorEl) errorEl.textContent = '';
      
      // Validation
      if (!email || !password) {
        if (errorEl) errorEl.textContent = 'Email and password required';
        return;
      }
      
      // Disable button and show loading
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
      }
      
      try {
        console.log("Attempting login for:", email);
        
        // Sign in with Firebase Auth
        await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log("Login successful!");
        
        // Update last login time
        const user = firebase.auth().currentUser;
        if (user) {
          await firebase.database().ref('users/' + user.uid + '/profile/lastLogin').set(Date.now());
        }
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
      } catch (error) {
        console.error("Login error:", error);
        
        // Re-enable button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Login';
        }
        
        // Show error message
        if (errorEl) {
          let errorMessage = error.message;
          
          if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errorMessage = 'Invalid email or password. Please try again.';
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
          }
          
          errorEl.textContent = errorMessage;
        }
      }
    });
  }
  
  // =============== CHECK URL PARAMETERS ===============
  // Check for signup success on login page
  if (window.location.pathname.includes('login.html')) {
    const params = new URLSearchParams(window.location.search);
    const signupSuccess = params.get('signup');
    const email = params.get('email');
    
    if (signupSuccess === 'success' && email) {
      // Auto-fill email
      const emailInput = document.getElementById('loginEmail');
      if (emailInput) {
        emailInput.value = decodeURIComponent(email);
      }
      
      // Show success message
      const successEl = document.getElementById('loginSuccess') || document.createElement('div');
      if (!successEl.id) {
        successEl.id = 'loginSuccess';
        successEl.style.color = 'green';
        successEl.style.padding = '10px';
        successEl.style.margin = '10px 0';
        successEl.style.background = '#d4edda';
        successEl.style.borderRadius = '5px';
        
        const form = document.getElementById('loginForm');
        if (form) {
          form.insertBefore(successEl, form.firstChild);
        }
      }
      
      successEl.textContent = '✓ Account created successfully! Please login with your password.';
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
  
  // =============== AUTH STATE CHECK ===============
  // Check if user is already logged in (redirect to dashboard if on login/register pages)
  firebase.auth().onAuthStateChanged(function(user) {
    console.log("Auth state changed. User:", user ? "Logged in" : "Not logged in");
    
    const currentPage = window.location.pathname;
    
    if (user) {
      // User is logged in
      console.log("User email:", user.email);
      
      // If user is on login or register page, redirect to dashboard
      if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
        console.log("User already logged in, redirecting to dashboard...");
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      }
    } else {
      // User is not logged in
      // If user is on protected page (dashboard, wallet, etc), redirect to login
      const protectedPages = ['dashboard.html', 'wallet.html', 'investments.html'];
      const currentPageName = currentPage.split('/').pop();
      
      if (protectedPages.includes(currentPageName)) {
        console.log("User not logged in, redirecting to login...");
        window.location.href = 'login.html';
      }
    }
  });
  
  // =============== LOGOUT FUNCTION ===============
  window.logout = async function() {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await firebase.auth().signOut();
        window.location.href = 'login.html';
      } catch (error) {
        console.error("Logout error:", error);
        alert('Logout failed. Please try again.');
      }
    }
  };
});