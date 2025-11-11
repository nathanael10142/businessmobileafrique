/**
 * Business Mobile Afrique - Service Worker
 * Gère les notifications push en arrière-plan et la mise en cache.
 */

// Assurez-vous d'importer les scripts Firebase
try {
    importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
    importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');
} catch (e) {
    console.error('Erreur lors de l\'importation des scripts Firebase dans le Service Worker:', e);
}

// Configuration Firebase (doit correspondre à votre configuration web)
const firebaseConfig = {
    apiKey: "AIzaSyCEgyC_UfvDwMsir5wwrGsBdmmTSBRhL_w",
    authDomain: "businessmobileafrique.firebaseapp.com",
    projectId: "businessmobileafrique",
    storageBucket: "businessmobileafrique.appspot.com",
    messagingSenderId: "527023270485",
    appId: "1:527023270485:web:b656fcf6f6095170fd82dc",
    measurementId: "G-QBRH8FGLSR"
};

// Initialiser Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Récupérer une instance de Firebase Messaging pour gérer les messages en arrière-plan.
const messaging = (typeof firebase !== 'undefined' && firebase.messaging.isSupported()) ? firebase.messaging() : null;

if (messaging) {
    messaging.onBackgroundMessage((payload) => {
        console.log('[sw.js] Received background message ', payload);

        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: payload.notification.icon || '/images/logo/playstore-icon.png', // Utilise l'icône de votre logo par défaut
            badge: payload.notification.badge || '/images/logo/badge.png', // Utilise une icône de badge par défaut
            data: {
                url: payload.fcmOptions.link || '/' // URL à ouvrir au clic
            }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data.url || '/';
    event.waitUntil(clients.openWindow(urlToOpen));
});