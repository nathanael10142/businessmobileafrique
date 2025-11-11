/**
 * Business Mobile Afrique - Firebase Cloud Messaging Handler
 * Gère la demande de permission et la réception des notifications.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que Firebase et Messaging sont supportés
    if (typeof firebase === 'undefined' || !firebase.messaging.isSupported()) {
        console.warn('Firebase Messaging n\'est pas supporté par ce navigateur.');
        return;
    }

    const messaging = firebase.messaging();

    // Étape 1: Demander la permission à l'utilisateur
    async function requestNotificationPermission() {
        try {
            // Vérifier si la permission a déjà été accordée
            if (Notification.permission === 'granted') {
                console.log('La permission de notification est déjà accordée.');
                await getAndSaveToken();
                return;
            }

            // Si la permission n'a pas encore été demandée, on ne fait rien automatiquement.
            // On peut lier cette fonction à un bouton pour une meilleure expérience utilisateur.
            // Pour l'instant, nous allons la demander au chargement pour la simplicité.
            console.log('Demande de permission pour les notifications...');
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('Permission de notification accordée.');
                await getAndSaveToken();
            } else {
                console.log('Permission de notification refusée.');
            }
        } catch (error) {
            console.error('Erreur lors de la demande de permission de notification:', error);
        }
    }

    // Étape 2: Obtenir le jeton de l'appareil et le sauvegarder
    async function getAndSaveToken() {
        try {
            const vapidKey = "BAtz4GOKQWAakf9oC3l1PV_0heNxr6IaJt8ObdLy8yhXtzjp_imOPMcf6T_JNR_5Kn9JRK5qn4nMcpE1-soEu8o"; // Remplacez par votre clé VAPID
            const currentToken = await messaging.getToken({ vapidKey });

            if (currentToken) {
                console.log('Token FCM actuel:', currentToken);
                // Sauvegarder le jeton dans Firestore
                saveTokenToFirestore(currentToken);
            } else {
                console.log('Impossible d\'obtenir le jeton. La permission a-t-elle été accordée ?');
            }
        } catch (error) {
            console.error('Erreur lors de l\'obtention du jeton FCM:', error);
        }
    }

    function saveTokenToFirestore(token) {
        const user = firebase.auth().currentUser;
        const tokenRef = window.db.collection('fcm_tokens').doc(token);

        tokenRef.set({
            token: token,
            userId: user ? user.uid : 'anonymous',
            createdAt: new Date().toISOString(),
            userAgent: navigator.userAgent
        }).then(() => {
            console.log('Token sauvegardé dans Firestore.');
        }).catch(error => {
            console.error('Erreur lors de la sauvegarde du token:', error);
        });
    }

    // Étape 3: Gérer les messages lorsque l'application est au premier plan
    messaging.onMessage((payload) => {
        console.log('Message reçu au premier plan:', payload);
        // Afficher une notification personnalisée (toast)
        showForegroundNotification(payload.notification);
    });

    function showForegroundNotification(notification) {
        // Vous pouvez utiliser une librairie de "toast" ou créer votre propre div
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'foreground-notification';
        notificationDiv.innerHTML = `
            <h4>${notification.title}</h4>
            <p>${notification.body}</p>
        `;
        document.body.appendChild(notificationDiv);

        setTimeout(() => {
            notificationDiv.remove();
        }, 5000); // Disparaît après 5 secondes
    }

    // Lancer le processus
    requestNotificationPermission();
});