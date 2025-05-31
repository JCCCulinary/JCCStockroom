// scripts/modules/login.js - Standalone version with embedded config
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

console.log("Login module loaded successfully");

// Check if user is already authenticated when page loads
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("login.html")) {
    // User is already signed in, redirect to main app
    console.log("User already authenticated, redirecting to main app");
    window.location.href = "/index.html";
  }
});

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, setting up login form");
  
  const loginForm = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  
  if (!loginForm) {
    console.error("Login form not found - check your HTML");
    return;
  }

  if (!errorMessage) {
    console.error("Error message element not found - check your HTML");
    return;
  }

  console.log("Form elements found, attaching event listener");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Login form submitted");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Clear any previous error messages
    hideError();

    // Basic validation
    if (!email || !password) {
      showError("Please enter both email and password");
      return;
    }

    // Get submit button
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    // Disable submit button and show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in...";
    }

    try {
      console.log("Attempting to sign in user:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Sign in successful:", userCredential.user.email);
      
      // Success - redirect will happen automatically via onAuthStateChanged
      // But add a small delay to ensure it processes
      setTimeout(() => {
        if (window.location.pathname.includes("login.html")) {
          window.location.href = "/index.html";
        }
      }, 500);

    } catch (error) {
      console.error("Login error:", error);
      
      // Handle specific Firebase Auth errors
      let errorText = "Login failed. Please try again.";
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorText = "No account found with this email address.";
          break;
        case 'auth/wrong-password':
          errorText = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-email':
          errorText = "Please enter a valid email address.";
          break;
        case 'auth/user-disabled':
          errorText = "This account has been disabled. Please contact support.";
          break;
        case 'auth/too-many-requests':
          errorText = "Too many failed attempts. Please try again later.";
          break;
        case 'auth/network-request-failed':
          errorText = "Network error. Please check your connection and try again.";
          break;
        case 'auth/invalid-credential':
          errorText = "Invalid email or password. Please try again.";
          break;
        default:
          errorText = error.message || "Login failed. Please try again.";
      }
      
      showError(errorText);
    } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
    }
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    console.log("Showing error:", message);
  }

  function hideError() {
    errorMessage.style.display = "none";
    errorMessage.textContent = "";
  }
});