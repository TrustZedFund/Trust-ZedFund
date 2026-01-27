import { auth, db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const referralLinkInput = document.getElementById("referralLink");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Please log in first");
    window.location.href = "index.html";
    return;
  }

  try {
    const userSnap = await get(ref(db, `users/${user.uid}/referralCode`));

    if (!userSnap.exists() || !userSnap.val()) {
      alert("Referral code not found");
      return;
    }

    const code = userSnap.val();
    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/register.html?ref=${code}`;
    referralLinkInput.value = referralLink;

    // Clipboard copy
    window.copyReferral = () => {
      navigator.clipboard.writeText(referralLink)
        .then(() => alert("Referral link copied!"))
        .catch(() => alert("Failed to copy referral link"));
    };

    // Sharing functions
    window.shareWhatsApp = () => {
      const text = `Join Trust ZedFund using my referral link: ${referralLink}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    window.shareFacebook = () => {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
      window.open(fbUrl, "_blank");
    };

    window.shareLinkedIn = () => {
      const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
      window.open(liUrl, "_blank");
    };

    window.shareEmail = () => {
      const subject = encodeURIComponent("Join Trust ZedFund");
      const body = encodeURIComponent(`Sign up using my referral link: ${referralLink}`);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    };

  } catch (err) {
    console.error(err);
    alert("Failed to load referral code");
  }
});
