// scripts/firebase/firebase.js - FIXED VERSION with all necessary exports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,        // ✅ Added this missing export
  setDoc,
  doc,
  deleteDoc,
  updateDoc      // ✅ Added this for future use
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ⚠️ IMPORTANT: All Firebase imports must use the same version (10.12.0)

const firebaseConfig = {
  apiKey: "AIzaSyA_FZ4R_rI8NkFIGXRpJfXw5g1ab73fc9Q",
  authDomain: "jccstockroom.firebaseapp.com",
  projectId: "jccstockroom",
  storageBucket: "jccstockroom.firebasestorage.app",
  messagingSenderId: "193985175772",
  appId: "1:193985175772:web:b2dac3839e9d1a26a89419",
  measurementId: "G-LEQRZ0SF6T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("✅ Firebase initialized with consistent v10.12.0 SDK");

// Export all the Firebase functions that modules need
export { 
  db, 
  collection, 
  getDocs,     // For getting multiple documents 
  getDoc,      // ✅ For getting single documents (needed by item-info.js)
  setDoc, 
  doc, 
  deleteDoc,
  updateDoc    // ✅ For partial document updates
};