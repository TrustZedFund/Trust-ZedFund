import { signUpUser, loginUser } from "./firebase.js";

document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById("signupForm");
  
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const referral = document.getElementById("referral")?.value.trim() || null;
      
      const errorEl = document.getElementById("signupError");
      const successEl = document.getElementById("signupSuccess");
      
      errorEl.textContent = "";
      successEl.textContent = "";
      
      try {
        await signUpUser(email, password, name, referral);
        
        successEl.textContent = "Account created successfully! Redirecting...";
        
        setTimeout(() => {
          window.location.href = "login.html?signup=success";
        }, 2000);
        
      } catch (error) {
        errorEl.textContent = error.message;
      }
    });
  }
});