import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDYqvC0Ti6ChVnz5eMQhxms4hkgMUxF9PY",
    authDomain: "bot-lab-21910.firebaseapp.com",
    projectId: "bot-lab-21910",
    storageBucket: "bot-lab-21910.firebasestorage.app",
    messagingSenderId: "331010142763",
    appId: "1:331010142763:web:cfd9fa17ed9bf99a99f06e",
    databaseURL: "https://bot-lab-21910.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
