/**
 * IMPORTANT — Firebase Security Rules for exam-85146 project:
 *
 * Go to Firebase Console → exam-85146 → Firestore → Rules and set:
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Anyone authenticated can read exams
 *     match /exams/{examId} {
 *       allow read: if true;
 *       allow write: if false; // Admin writes via server/admin SDK only
 *     }
 *     // Users can only write their own submission once
 *     match /submissions/{submissionId} {
 *       allow create: if request.auth != null
 *         && request.resource.data.userId == request.auth.uid;
 *       allow read: if request.auth != null
 *         && (resource.data.userId == request.auth.uid || isAdmin());
 *       allow update: if false; // Admin only via server
 *     }
 *     match /examEntries/{entryId} {
 *       allow read, write: if request.auth != null;
 *     }
 *     match /examCounters/{examId} {
 *       allow read: if true;
 *       allow write: if request.auth != null;
 *     }
 *   }
 * }
 *
 * NOTE: examFirebase uses a separate Firebase App instance ("exam")
 * with no Auth configured. To enforce rules, either:
 * Option A: Pass the same auth token from firebase.ts to examFirebase requests
 * Option B: Keep exam DB public but add server-side validation via Cloud Functions
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const examFirebaseConfig = {
  apiKey: "AIzaSyCKJrWNuLTXsY9Iece7A_JTdjM6mx2fVhs",
  authDomain: "exam-85146.firebaseapp.com",
  projectId: "exam-85146",
  storageBucket: "exam-85146.firebasestorage.app",
  messagingSenderId: "956838410594",
  appId: "1:956838410594:web:00ef055478c14b0968143b",
};

const examApp = initializeApp(examFirebaseConfig, "exam");
export const examDb = getFirestore(examApp);
