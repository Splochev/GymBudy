// js/firebase.js — Firebase initialization and exports
import { sharedFirebaseConfig } from 'https://splochev.github.io/personalBudy/js/firebase-config.js';
// SSO NOTE: All buddy apps share one Firebase project. Session sharing works because
// all apps run on splochev.github.io (same origin). Moving any app to a custom domain
// will silently break SSO.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  ...sharedFirebaseConfig,
  appId: "1:138709908215:web:63a6177bda808586bfb1f2",
  measurementId: "G-445HRBCB61",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
