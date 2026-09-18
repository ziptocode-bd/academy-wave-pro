import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  set,
  remove,
  query,
  limitToLast,
  onValue,
  off,
  DatabaseReference,
  DataSnapshot,
} from "firebase/database";
import { LiveChatMessage } from "@/types";

const liveChatFirebaseConfig = {
  apiKey: "AIzaSyAQmtV3cI0o88veWOQXVPYOfA_-f5PuqrE",
  authDomain: "upcoach-live-chat.firebaseapp.com",
  databaseURL: "https://upcoach-live-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "upcoach-live-chat",
  storageBucket: "upcoach-live-chat.firebasestorage.app",
  messagingSenderId: "707702144174",
  appId: "1:707702144174:web:97c285380f3c171b4bc13f"
};

// Initialize named Firebase App for Live Chat Realtime Database
const appName = "liveChatApp";
const liveChatApp = getApps().some((app) => app.name === appName)
  ? getApp(appName)
  : initializeApp(liveChatFirebaseConfig, appName);

export const liveChatDb = getDatabase(liveChatApp);

/**
 * Send a message to the live chat for a given video/class
 */
export async function sendLiveChatMessage(
  videoId: string,
  messageData: Omit<LiveChatMessage, "id">
): Promise<void> {
  const chatRef = ref(liveChatDb, `chats/${videoId}`);
  const newMessageRef = push(chatRef);
  await set(newMessageRef, {
    ...messageData,
    timestamp: Date.now(),
  });
}

/**
 * Subscribe to the last 30 live chat messages for a video
 */
export function subscribeToLiveChat(
  videoId: string,
  callback: (messages: LiveChatMessage[]) => void
): () => void {
  const chatRef = ref(liveChatDb, `chats/${videoId}`);
  const chatQuery = query(chatRef, limitToLast(30));

  const listener = onValue(
    chatQuery,
    (snapshot: DataSnapshot) => {
      const messages: LiveChatMessage[] = [];
      snapshot.forEach((childSnap) => {
        const val = childSnap.val();
        if (val) {
          messages.push({
            id: childSnap.key || String(Math.random()),
            userId: val.userId || "anonymous",
            userName: val.userName || "Student",
            message: val.message || "",
            timestamp: val.timestamp || Date.now(),
          });
        }
      });
      // Sort chronologically by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
      callback(messages);
    },
    (error) => {
      console.warn("Live chat subscription notice:", error);
    }
  );

  return () => {
    off(chatQuery, "value", listener);
  };
}

/**
 * Remove all chat messages for a video when Live is ended by Admin
 */
export async function clearLiveChat(videoId: string): Promise<void> {
  try {
    const chatRef = ref(liveChatDb, `chats/${videoId}`);
    await remove(chatRef);
  } catch (err) {
    console.error("Failed to clear live chat:", err);
  }
}
