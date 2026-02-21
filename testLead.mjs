import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
const db = getFirestore(app);

async function testDrive() {
    try {
        const leadRef = doc(db, 'leads', "test_" + Date.now() + "@example.com");
        await setDoc(leadRef, {
            city: 'Test City',
            phone: '1234567890',
            email: "test_" + Date.now() + "@example.com",
            createdAt: new Date(),
            source: 'b2b_landing_test'
        });
        console.log("Successfully created lead!");
    } catch (err) {
        console.error("Failed to create lead:", err.message, err.code);
    }
}

testDrive();
