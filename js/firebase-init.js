/**
 * Business Mobile Afrique - Firebase Initialization
 * Initialise Firebase et les services comme Analytics.
 */

try {
    // Your web app's Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyCEgyC_UfvDwMsir5wwrGsBdmmTSBRhL_w",
        authDomain: "businessmobileafrique.firebaseapp.com",
        projectId: "businessmobileafrique",
        storageBucket: "businessmobileafrique.appspot.com",
        messagingSenderId: "527023270485",
        appId: "1:527023270485:web:b656fcf6f6095170fd82dc",
        measurementId: "G-QBRH8FGLSR"
    };

    // Initialize Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth(); // Initialise Auth
    const db = firebase.firestore(); // Initialise Firestore

    // Initialise Analytics seulement s'il est disponible
    if (typeof firebase.analytics === 'function') {
        const analytics = firebase.analytics();
    }

    // Initialise Messaging seulement s'il est supporté
    let messaging = null;
    if (typeof firebase.messaging === 'function' && firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
    }
    // Rend la base de données accessible globalement
    window.db = db;
    window.auth = auth;
    window.messaging = messaging;
} catch (e) {
    console.error("Error initializing Firebase:", e);
}