// scripts/auth/redirect.js - Standalone version with embedded config
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// Embedded Firebase config - no external dependencies
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
const auth = getAuth(app);

console.log("Auth redirect module loaded");

// Detect and hide nav bar on login page
if (window.location.pathname.includes("login.html")) {
  const style = document.createElement("style");
  style.innerHTML = "#nav, .tab-bar, header, footer { display: none !important; }";
  document.head.appendChild(style);
  console.log("Login page detected - hiding navigation");
}

// State management for auth checks
let authCheckComplete = false;

// Redirect logic for protected pages
onAuthStateChanged(auth, (user) => {
  const currentPage = window.location.pathname;
  const isLoginPage = currentPage.includes("login.html");
  
  // Mark auth check as complete
  authCheckComplete = true;
  
  console.log("Auth state changed:", { 
    user: !!user, 
    userEmail: user?.email || 'none',
    currentPage, 
    isLoginPage 
  });
  
  // If user is not authenticated and not on login page, redirect to login
  if (!user && !isLoginPage) {
    console.log("Redirecting to login - user not authenticated");
    window.location.href = "/login.html";
    return;
  }
  
  // If user is authenticated and on login page, redirect to main app
  if (user && isLoginPage) {
    console.log("Redirecting to main app - user is authenticated");
    window.location.href = "/index.html";
    return;
  }
  
  console.log("Auth check complete - no redirect needed");
});

// Timeout fallback - if auth check takes too long, assume not authenticated
setTimeout(() => {
  if (!authCheckComplete && !window.location.pathname.includes("login.html")) {
    console.log("Auth check timeout - redirecting to login");
    window.location.href = "/login.html";
  }
}, 5000); // 5 second timeout

// Logout functionality
window.addEventListener("DOMContentLoaded", () => {
  console.log("Setting up logout functionality");
  
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    console.log("Logout button found, attaching event listener");
    logoutBtn.addEventListener("click", async () => {
      console.log("Logout button clicked");
      try {
        await signOut(auth);
        console.log("User signed out successfully");
        window.location.href = "/login.html";
      } catch (error) {
        console.error("Logout error:", error);
        // Force redirect even if signOut fails
        window.location.href = "/login.html";
      }
    });
  } else {
    console.log("Logout button not found (this is normal on login page)");
  }
});

// Export auth for use in other modules
window.firebaseAuth = auth;
console.log("Firebase auth available globally as window.firebaseAuth");