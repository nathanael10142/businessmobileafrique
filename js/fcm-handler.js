/**
 * Business Mobile Afrique - Firebase Cloud Messaging Handler
 * Gère la demande de permission et la réception des notifications.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier que Firebase et Messaging sont supportés
    if (typeof firebase === 'undefined' || !firebase.messaging.isSupported()) {
        console.warn('⚠️ Firebase Messaging n\'est pas supporté par ce navigateur.');
        return;
    }

    const messaging = firebase.messaging();

    // --- SOLUTION : DIRE À FIREBASE D'UTILISER NOTRE SERVICE WORKER 'sw.js' ---
    try {
        const registration = await navigator.serviceWorker.ready;
        messaging.useServiceWorker(registration);
        console.log('✅ Firebase Messaging utilise notre Service Worker personnalisé (sw.js).');
    } catch (error) {
        console.error('❌ Erreur lors de la liaison du Service Worker avec Firebase Messaging:', error);
    }

    // Étape 1: Demander la permission à l'utilisateur
    async function requestNotificationPermission() {
        try {
            // Vérifier si la permission a déjà été accordée
            if (Notification.permission === 'granted') {
                console.log('✅ La permission de notification est déjà accordée.');
                await getAndSaveToken();
                return;
            }

            // Si la permission a été refusée, ne pas redemander automatiquement
            if (Notification.permission === 'denied') {
                console.log('❌ La permission de notification a été refusée par l\'utilisateur.');
                return;
            }

            // Demander la permission (peut être lié à un bouton pour une meilleure UX)
            console.log('🔔 Demande de permission pour les notifications...');
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('✅ Permission de notification accordée.');
                await getAndSaveToken();
            } else {
                console.log('❌ Permission de notification refusée.');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la demande de permission de notification:', error);
        }
    }

    // Étape 2: Obtenir le jeton de l'appareil et le sauvegarder
    async function getAndSaveToken() {
        try {
            const vapidKey = "BAtz4GOKQWAakf9oC3l1PV_0heNxr6IaJt8ObdLy8yhXtzjp_imOPMcf6T_JNR_5Kn9JRK5qn4nMcpE1-soEu8o";
            const currentToken = await messaging.getToken({ vapidKey });

            if (currentToken) {
                console.log('🔑 Token FCM actuel:', currentToken);
                
                // Sauvegarder le jeton dans Firestore
                await saveTokenToFirestore(currentToken);
                
                // Sauvegarder également en local comme backup
                localStorage.setItem('fcm_token', currentToken);
                localStorage.setItem('fcm_token_date', new Date().toISOString());
            } else {
                console.log('⚠️ Impossible d\'obtenir le jeton. La permission a-t-elle été accordée ?');
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'obtention du jeton FCM:', error);
        }
    }

    // Étape 3: Sauvegarder le token dans Firestore
    async function saveTokenToFirestore(token) {
        try {
            const user = firebase.auth().currentUser;
            
            // ⚠️ CORRECTION IMPORTANTE : Utiliser 'fcm_tokens' (avec underscore) pour correspondre aux règles Firestore
            const tokenRef = window.db.collection('fcm_tokens').doc(token);

            await tokenRef.set({
                token: token,
                userId: user ? user.uid : 'anonymous',
                userEmail: user ? user.email : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }, { merge: true });

            console.log('✅ Token FCM sauvegardé avec succès dans Firestore');
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde du token dans Firestore:', error);
            
            // Fallback : Sauvegarder uniquement en local
            localStorage.setItem('fcm_token', token);
            localStorage.setItem('fcm_token_date', new Date().toISOString());
            localStorage.setItem('fcm_token_error', error.message);
            console.log('💾 Token sauvegardé localement comme fallback');
        }
    }

    // Étape 4: Gérer les messages lorsque l'application est au premier plan
    messaging.onMessage((payload) => {
        console.log('📬 Message reçu au premier plan:', payload);
        
        // Afficher une notification personnalisée (toast)
        if (payload.notification) {
            showForegroundNotification(payload.notification);
        }
        
        // Jouer un son de notification (optionnel)
        playNotificationSound();
    });

    // Étape 5: Afficher une notification personnalisée au premier plan
    function showForegroundNotification(notification) {
        // Créer un élément de notification personnalisé
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'foreground-notification';
        notificationDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 350px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
        `;
        
        notificationDiv.innerHTML = `
            <div style="display: flex; align-items: start; gap: 12px;">
                ${notification.icon ? `<img src="${notification.icon}" alt="icon" style="width: 40px; height: 40px; border-radius: 8px;">` : ''}
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600;">${notification.title || 'Notification'}</h4>
                    <p style="margin: 0; font-size: 14px; opacity: 0.95;">${notification.body || ''}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
            </div>
        `;
        
        // Ajouter l'animation CSS
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notificationDiv);

        // Cliquer sur la notification pour l'ouvrir
        notificationDiv.addEventListener('click', () => {
            if (notification.click_action) {
                window.open(notification.click_action, '_blank');
            }
            notificationDiv.remove();
        });

        // Retirer automatiquement après 5 secondes
        setTimeout(() => {
            notificationDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notificationDiv.remove(), 300);
        }, 5000);
    }

    // Étape 6: Jouer un son de notification (optionnel)
    function playNotificationSound() {
        try {
            const audio = new Audio('/assets/sounds/notification.mp3'); // Ajoutez votre fichier son
            audio.volume = 0.5;
            audio.play().catch(err => {
                console.log('🔇 Impossible de jouer le son (interaction utilisateur requise):', err.message);
            });
        } catch (error) {
            console.log('🔇 Son de notification non disponible');
        }
    }

    // Étape 7: Gérer le rafraîchissement du token
    messaging.onTokenRefresh(async () => {
        console.log('🔄 Token FCM rafraîchi, récupération du nouveau token...');
        try {
            const vapidKey = "BAtz4GOKQWAakf9oC3l1PV_0heNxr6IaJt8ObdLy8yhXtzjp_imOPMcf6T_JNR_5Kn9JRK5qn4nMcpE1-soEu8o";
            const newToken = await messaging.getToken({ vapidKey });
            
            if (newToken) {
                console.log('✅ Nouveau token FCM obtenu:', newToken);
                await saveTokenToFirestore(newToken);
            }
        } catch (error) {
            console.error('❌ Erreur lors du rafraîchissement du token:', error);
        }
    });

    // Étape 8: Lancer le processus
    requestNotificationPermission();

    // Étape 9: Fonction utilitaire pour désabonner (optionnel)
    window.unsubscribeFromNotifications = async function() {
        try {
            const vapidKey = "BAtz4GOKQWAakf9oC3l1PV_0heNxr6IaJt8ObdLy8yhXtzjp_imOPMcf6T_JNR_5Kn9JRK5qn4nMcpE1-soEu8o";
            const currentToken = await messaging.getToken({ vapidKey });
            
            if (currentToken) {
                await messaging.deleteToken();
                
                // Supprimer du localStorage
                localStorage.removeItem('fcm_token');
                localStorage.removeItem('fcm_token_date');
                
                console.log('✅ Désabonnement des notifications réussi');
                alert('Vous ne recevrez plus de notifications');
            }
        } catch (error) {
            console.error('❌ Erreur lors du désabonnement:', error);
        }
    };

    // Étape 10: Vérifier l'état du token au démarrage
    const savedToken = localStorage.getItem('fcm_token');
    const savedDate = localStorage.getItem('fcm_token_date');
    
    if (savedToken && savedDate) {
        const tokenAge = Date.now() - new Date(savedDate).getTime();
        const daysSinceCreation = tokenAge / (1000 * 60 * 60 * 24);
        
        console.log(`📊 Token existant trouvé (créé il y a ${daysSinceCreation.toFixed(1)} jours)`);
        
        // Rafraîchir le token s'il a plus de 30 jours
        if (daysSinceCreation > 30) {
            console.log('🔄 Token ancien détecté, rafraîchissement...');
            await getAndSaveToken();
        }
    }
});
