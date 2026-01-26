function copyRefCode() {
  const refCodeInput = document.getElementById("refCode");
  refCodeInput.select();
  refCodeInput.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(refCodeInput.value);
  alert("Referral code copied!");
}

function shareWhatsApp() {
  const code = document.getElementById("refCode").value;
  const link = `https://yourdomain.com/signup?ref=${code}`;
  const text = `Join this platform using my referral code: ${code}\n${link}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

const user = JSON.parse(localStorage.getItem("trustvaultUser"));

if (!user || !user.referralCode) {
  alert("Session expired. Please log in again.");
  window.location.href = "index.html";
}

const baseUrl = window.location.origin;
const referralLink = `${baseUrl}/register.html?ref=${user.referralCode}`;

document.getElementById("referralLink").value = referralLink;

function copyReferral() {
  navigator.clipboard.writeText(referralLink).then(() => {
    alert("Referral link copied!");
  });
}