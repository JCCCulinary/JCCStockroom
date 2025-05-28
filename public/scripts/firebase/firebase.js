import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyA_FZ4R_rI8NkFIGXRpJfXw5g1ab73fc9Q",
  authDomain: "jccstockroom.firebaseapp.com",
  projectId: "jccstockroom",
  storageBucket: "jccstockroom.firebasestorage.app",
  messagingSenderId: "193985175772",
  appId: "1:193985175772:web:b2dac3839e9d1a26a89419",
  measurementId: "G-LEQRZ0SF6T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, getDocs, setDoc, doc, deleteDoc, writeBatch };