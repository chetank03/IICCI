import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
};

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];

export function isFirebaseConfigured() {
  return REQUIRED_KEYS.every((key) => Boolean(firebaseConfig[key]));
}

function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase authentication is not configured.");
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function signInWithGooglePopup() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

export async function signOutFromFirebase() {
  if (!getApps().length) return;
  await signOut(getAuth(getApp()));
}
