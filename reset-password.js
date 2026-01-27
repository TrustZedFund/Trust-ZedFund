import { auth } from "./firebase.js";
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get("oobCode");

const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const resetBtn = document.getElementById("resetBtn");
const resetError = document.getElementById("resetError");

if (!oobCode) {
  resetError.textContent = "Invalid or missing reset code.";
  resetBtn.disabled = true;
} else {
  // Verify the code is valid
  verifyPasswordResetCode(auth, oobCode)
    .then((email) => {
      resetError.textContent = `Resetting password for: ${email}`;
      resetError.style.color = "#222";
    })
    .catch((err) => {
      console.error(err);
      resetError.textContent = "Invalid or expired reset link.";
      resetError.style.color = "red";
      resetBtn.disabled = true;
    });
}

resetBtn.addEventListener("click", async () => {
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  resetError.style.color = "red";
  resetError.textContent = "";

  if (!newPassword || newPassword.length < 6) {
    resetError.textContent = "Password must be at least 6 characters.";
    return;
  }
  if (newPassword !== confirmPassword) {
    resetError.textContent = "Passwords do not match.";
    return;
  }

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    resetError.style.color = "green";
    resetError.textContent = "Password successfully reset! Redirecting to login...";
    setTimeout(() => { window.location.href = "login.html"; }, 2000);
  } catch (err) {
    console.error(err);
    resetError.textContent = "Failed to reset password. Link may be expired.";
  }
});
