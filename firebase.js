/* ===================================================
   ADD THESE EXPORTS TO YOUR EXISTING firebase.js
   (Add to the bottom of the file)
=================================================== */

// Make sure to export onAuthStateChanged from auth
export { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// Also export all database functions you might need
export {
  ref,
  set,
  update,
  get,
  onValue,
  push,
  remove,
  query,
  orderByChild,
  equalTo
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Export auth functions
export {
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// Helper function for investment page
export async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
}