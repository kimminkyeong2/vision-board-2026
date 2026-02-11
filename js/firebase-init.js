
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyBLjX6_Ay-UsKUsOtMN53rSxfHyXtDxvIg",
    authDomain: "mk-lastchance.firebaseapp.com",
    projectId: "mk-lastchance",
    storageBucket: "mk-lastchance.firebasestorage.app",
    messagingSenderId: "658490350928",
    appId: "1:658490350928:web:9e382324bbff6b7c836055",
    measurementId: "G-08QZ8WPR3C"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

console.log("Firebase initialized successfully!");
