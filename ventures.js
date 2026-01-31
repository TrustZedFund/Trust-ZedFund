import { auth, db } from "./firebase.js";
import { ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// ==============================
// AUTH CHECK
// ==============================
auth.onAuthStateChanged(user => {
  if (!user) {
    alert("Please log in to access community ventures.");
    window.location.href = "index.html";
    return;
  }

  loadVentures(user.uid);
});

// ==============================
// LOAD VENTURES (REAL-TIME)
// ==============================
function loadVentures(userId) {
  const venturesRef = ref(db, "ventures");
  const container = document.getElementById("ventures");

  onValue(venturesRef, snapshot => {
    container.innerHTML = "";

    if (!snapshot.exists()) {
      container.innerHTML = "<p>No active ventures available.</p>";
      return;
    }

    snapshot.forEach(child => {
      const venture = child.val();
      const ventureId = child.key;

      if (venture.status !== "open") return;

      const card = document.createElement("div");
      card.className = "venture-card";

      card.innerHTML = `
        <h3>${venture.name}</h3>
        <p>${venture.description}</p>

        <input 
          type="number" 
          min="1"
          placeholder="Contribution amount (ZMW)"
          id="amount-${ventureId}"
        />

        <button data-id="${ventureId}">
          Submit Contribution
        </button>

        <div class="meta">
          Contributions are recorded as <strong>pending</strong> until confirmed.
        </div>
      `;

      card.querySelector("button").addEventListener("click", () => {
        submitContribution(userId, ventureId);
      });

      container.appendChild(card);
    });
  });
}

// ==============================
// SUBMIT CONTRIBUTION (PENDING)
// ==============================
function submitContribution(userId, ventureId) {
  const input = document.getElementById(`amount-${ventureId}`);
  const amount = Number(input.value);

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  const contribRef = push(ref(db, "ventureContributions"));

  set(contribRef, {
    uid: userId,
    ventureId,
    amount,
    status: "pending",
    createdAt: Date.now()
  });

  input.value = "";
  alert("Contribution recorded. Awaiting admin confirmation.");
}
