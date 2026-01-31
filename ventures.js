// 🔹 Firebase config (REPLACE)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// TEMP logged-in member
const memberId = "user_001";

// Load ventures
db.ref("ventures").on("value", snapshot => {
  const container = document.getElementById("ventures");
  container.innerHTML = "";

  snapshot.forEach(child => {
    const v = child.val();
    const id = child.key;

    container.innerHTML += `
      <div class="venture-card">
        <h3>${v.name}</h3>
        <p>${v.description}</p>

        <input type="number" id="amt-${id}" placeholder="Amount (ZMW)">
        <button onclick="contribute('${id}')">Support Project</button>

        <small>Contributions are tracked and subject to admin confirmation.</small>
      </div>
    `;
  });
});

// Submit contribution
function contribute(ventureId) {
  const amount = document.getElementById("amt-" + ventureId).value;
  if (!amount || amount <= 0) return alert("Enter a valid amount");

  const ref = db.ref("contributions").push();
  ref.set({
    memberId,
    ventureId,
    amount: Number(amount),
    status: "pending",
    timestamp: Date.now()
  });

  alert("Contribution recorded. Awaiting confirmation.");
}
