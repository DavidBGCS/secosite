// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
    apiKey: "AIzaSyDbaQ_sD5aBxwVJktWY_zPlTYOO14eo54c",
    authDomain: "secosite-63f22.firebaseapp.com",
    projectId: "secosite-63f22",
    storageBucket: "secosite-63f22.firebasestorage.app",
    messagingSenderId: "450379478225",
    appId: "1:450379478225:web:05c108ebd04328e69701f0",
    measurementId: "G-BDXYVSYH45"
};
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
    }),
});
export const auth = getAuth(app);
