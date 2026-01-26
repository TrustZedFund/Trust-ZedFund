// Scroll Reveal Animation
const reveals = document.querySelectorAll(".reveal");

function revealOnScroll() {
  for (let i = 0; i < reveals.length; i++) {
    const windowHeight = window.innerHeight;
    const revealTop = reveals[i].getBoundingClientRect().top;
    const revealPoint = 120;

    if (revealTop < windowHeight - revealPoint) {
      reveals[i].classList.add("active");
    }
  }
}

window.addEventListener("scroll", revealOnScroll);

// Run on page load
revealOnScroll();
// Inside dashboard script
import { query, where, getDocs, collection, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

async function checkReferralBonus(uid, referralCode) {
  // Find the referring user
  const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
  const snap = await getDocs(q);
  snap.forEach(async docSnap => {
    const refUser = docSnap.data();
    const refUserRef = doc(db, "users", docSnap.id);

    // Add ZMW 10 bonus
    await updateDoc(refUserRef, {
      balance: (refUser.balance || 0) + 10
    });
  });
}