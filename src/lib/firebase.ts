import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBBWCEgz7DDuBnNX9B0_67-lPUfspf70Fc",
  authDomain: "upcoach-lms.firebaseapp.com",
  projectId: "upcoach-lms",
  storageBucket: "upcoach-lms.firebasestorage.app",
  messagingSenderId: "267017039049",
  appId: "1:267017039049:web:7fd9de37c26df584e4b118"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
