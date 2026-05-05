// js/firebase.js — Firebase initialization and exports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAn48uAay8U1YoHVuYAhqFqPb3Ms6jUahU",
  authDomain: "gymbud-8f549.firebaseapp.com",
  projectId: "gymbud-8f549",
  storageBucket: "gymbud-8f549.firebasestorage.app",
  messagingSenderId: "419496598304",
  appId: "1:419496598304:web:adc0e82094a7d961de1545",
  measurementId: "G-QQHHWKG14P"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
