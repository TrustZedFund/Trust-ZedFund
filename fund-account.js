import { auth, submitDepositProof } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

let currentUID = null;

onAuthStateChanged(auth, user => {
  if (user) {
    currentUID = user.uid;
  } else {
    alert("Please login first");
  }
});

const submitBtn = document.querySelector(".submit-btn");
const statusText = document.getElementById("uploadStatus");
const progressText = document.getElementById("uploadProgress");
const preview = document.getElementById("filePreview");

document.getElementById("proofFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type.startsWith("image/")) {
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" style="width:100%;border-radius:8px">`;
  } else {
    preview.textContent = file.name;
  }
});

submitBtn.addEventListener("click", async () => {
  const method = document.getElementById("method").value;
  const amount = document.getElementById("amount").value;
  const file = document.getElementById("proofFile").files[0];

  if (!currentUID || !file || !amount) {
    alert("All fields are required");
    return;
  }

  submitBtn.disabled = true;
  statusText.textContent = "Uploading transaction proof…";
  progressText.textContent = "Uploading 0%";

  try {
    await submitDepositProof(
      currentUID,
      { method, amount },
      file,
      percent => {
        progressText.textContent = `Uploading ${percent}%`;
      }
    );

    statusText.textContent = "✅ Proof submitted successfully";
    progressText.textContent = "";
    submitBtn.textContent = "Submitted";

  } catch (err) {
    console.error(err);
    statusText.textContent = "❌ Upload failed";
    submitBtn.disabled = false;
  }
});
