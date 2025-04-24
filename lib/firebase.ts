import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAbyArgGBTx8IKfxAAMAYPr74aic7xDauY",
  authDomain: "chat-x-by-dev-uzair.firebaseapp.com",
  databaseURL: "https://chat-x-by-dev-uzair-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-x-by-dev-uzair",
  storageBucket: "chat-x-by-dev-uzair.firebasestorage.app",
  messagingSenderId: "287208693423",
  appId: "1:287208693423:web:ec50fff441e6c71c8afe5a",
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db }
