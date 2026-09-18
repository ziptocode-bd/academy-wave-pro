import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const examFirebaseConfig = {
  apiKey: "AIzaSyAy0yS2JHeCfsq31Es93e59lfR61knuaQU",
  authDomain: "upcoach-exam.firebaseapp.com",
  projectId: "upcoach-exam",
  storageBucket: "upcoach-exam.firebasestorage.app",
  messagingSenderId: "1004407574230",
  appId: "1:1004407574230:web:730c895bd473b3de9a4377"
};


const examApp = initializeApp(examFirebaseConfig, "exam");
export const examDb = getFirestore(examApp);
