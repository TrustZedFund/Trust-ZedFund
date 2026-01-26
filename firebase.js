// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtcHAOGt-veevCcbOY5i-wotqMGqlIkhE",
  authDomain: "trustvault-3cf8f.firebaseapp.com",
  databaseURL: "https://trustvault-3cf8f-default-rtdb.firebaseio.com",
  projectId: "trustvault-3cf8f",
  storageBucket: "trustvault-3cf8f.firebasestorage.app",
  messagingSenderId: "304860923047",
  appId: "1:304860923047:web:79d4ea96946c728a9e4782"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

console.log("🔥 Firebase (Realtime DB) ready");