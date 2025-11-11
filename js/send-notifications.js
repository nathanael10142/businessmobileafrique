/**
 * Business Mobile Afrique - Script d'envoi de notifications
 * Ce script est conçu pour être exécuté par un service d'automatisation (comme GitHub Actions).
 * Il vérifie les nouveaux événements (articles, paiements, etc.) et envoie les notifications correspondantes.
 */

const admin = require('firebase-admin');

// --- CONFIGURATION ---
// Le contenu de votre clé de service sera injecté via une variable d'environnement
// dans l'environnement d'automatisation (ex: GitHub Secrets).
let serviceAccount;
try {
    // Pour l'exécution en local, on essaie de charger le fichier.
    // Assurez-vous que ce fichier est dans votre .gitignore !
    serviceAccount = require('../serviceAccountKey.json');
} catch (e) {
    // Pour l'exécution sur GitHub Actions, on lit la variable d'environnement.
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        console.error("Clé de service Firebase introuvable. Assurez-vous que le fichier 'serviceAccountKey.json' existe ou que la variable d'environnement FIREBASE_SERVICE_ACCOUNT est définie.");
        process.exit(1); // Arrête le script si la clé est manquante
    }
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();
const WEBSITE_BASE_URL = "https://business-mobile-afrique.web.app";

// --- HELPER FUNCTIONS ---

/**
 * Retrieves FCM tokens for a given user ID.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array<{token: string, docRef: FirebaseFirestore.DocumentReference}>>} An array of token objects.
 */
async function getUserTokens(userId) {
    if (!userId) return [];
    const tokensSnapshot = await db.collection("fcm_tokens")
        .where("userId", "==", userId)
        .get();
    return tokensSnapshot.docs.map(doc => ({ token: doc.data().token, docRef: doc.ref }));
}

/**
 * Retrieves FCM tokens for all admin users.
 * @returns {Promise<Array<{token: string, docRef: FirebaseFirestore.DocumentReference}>>} An array of token objects.
 */
async function getAdminTokens() {
    const adminUsersSnapshot = await db.collection("users")
        .where("role", "==", "admin")
        .get();
    const adminUserIds = adminUsersSnapshot.docs.map(doc => doc.id);

    if (adminUserIds.length === 0) return [];

    const allAdminTokens = [];
    for (const adminId of adminUserIds) {
        const tokens = await getUserTokens(adminId);
        allAdminTokens.push(...tokens);
    }
    return allAdminTokens;
}

/**
 * Sends an FCM message to a list of token objects and cleans up invalid ones.
 * @param {Array<{token: string, docRef: FirebaseFirestore.DocumentReference}>} tokenObjects - Array of token objects.
 * @param {object} payload - The FCM message payload.
 * @returns {Promise<void>}
 */
async function sendFCMMessage(tokenObjects, payload) {
    if (tokenObjects.length === 0) {
        console.log("No tokens to send message to.");
        return;
    }

    const tokens = tokenObjects.map(obj => obj.token);
    console.log(`Sending notification to ${tokens.length} device(s).`);

    try {
        const response = await messaging.sendToDevice(tokens, payload);
        console.log(`Notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);

        // Cleanup invalid tokens
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error(`Failed to send to token ${tokens[index]}:`, error);
                if (
                    error.code === "messaging/invalid-registration-token" ||
                    error.code === "messaging/registration-token-not-registered" ||
                    error.code === "messaging/unregistered"
                ) {
                    // Add the document reference for deletion
                    tokensToRemove.push(tokenObjects[index].docRef.delete());
                }
            }
        });

        if (tokensToRemove.length > 0) {
            await Promise.all(tokensToRemove);
            console.log(`Cleaned up ${tokensToRemove.length} invalid tokens.`);
        }

    } catch (error) {
        console.error("Error sending FCM message:", error);
    }
}

// --- NOTIFICATION FUNCTIONS ---

/**
 * Envoie des notifications pour les nouveaux articles publiés.
 */
async function sendNewArticleNotifications() {
    console.log("Vérification des nouveaux articles...");

    const articlesToNotifySnapshot = await db.collection('articles')
        .where('published', '==', true)
        .where('notificationSent', '!=', true) // On récupère les articles où le champ n'existe pas ou est false
        .get();

    if (articlesToNotifySnapshot.empty) {
        console.log('Aucun nouvel article à notifier.');
        return;
    }

    const allUserTokens = await db.collection('fcm_tokens').get();
    if (allUserTokens.empty) {
        console.log('Aucun jeton utilisateur trouvé pour les notifications d\'articles.');
        return;
    }
    const tokens = allUserTokens.docs.map(doc => ({ token: doc.data().token, docRef: doc.ref }));

    for (const doc of articlesToNotifySnapshot.docs) {
        const article = doc.data();
        console.log(`Envoi de la notification pour l'article : "${article.title}"`);

        const payload = {
            notification: {
                title: "Nouvel Article sur BMA !",
                body: article.title,
                icon: `${WEBSITE_BASE_URL}/images/logo/playstore-icon.png`,
            },
            webpush: {
                fcm_options: {
                    link: `${WEBSITE_BASE_URL}/article.html?id=${doc.id}`,
                },
            },
        };

        try {
            await sendFCMMessage(tokens, payload);

            // Marquer l'article comme notifié pour ne pas le renvoyer
            await doc.ref.update({ notificationSent: true });
            console.log(`Article "${article.title}" marqué comme notifié.`);

        } catch (error) {
            console.error(`Erreur lors de l'envoi de la notification pour l'article ${doc.id}:`, error);
        }
    }
}

/**
 * Envoie des notifications aux utilisateurs dont la suggestion a été répondue.
 */
async function sendSuggestionReplyNotifications() {
    console.log("Vérification des suggestions répondues...");

    const suggestionsSnapshot = await db.collection('suggestions')
        .where('status', '==', 'replied')
        .where('notificationSent', '!=', true)
        .get();

    if (suggestionsSnapshot.empty) {
        console.log('Aucune suggestion répondue à notifier.');
        return;
    }

    for (const doc of suggestionsSnapshot.docs) {
        const suggestion = doc.data();
        console.log(`Notification pour suggestion ${doc.id} répondue.`);

        const userTokens = await getUserTokens(suggestion.userId);
        if (userTokens.length === 0) {
            console.log(`Aucun jeton pour l'utilisateur ${suggestion.userId}.`);
            await doc.ref.update({ notificationSent: true }); // Marquer comme notifié même sans envoi
            continue;
        }

        const articleTitle = suggestion.repliedWithArticleTitle || "un article pertinent";
        const articleLink = suggestion.repliedWithArticleId
            ? `${WEBSITE_BASE_URL}/article.html?id=${suggestion.repliedWithArticleId}`
            : `${WEBSITE_BASE_URL}/user-dashboard.html`;

        const payload = {
            notification: {
                title: "Votre suggestion a été traitée !",
                body: `Un nouvel article "${articleTitle}" est disponible suite à votre idée.`,
                icon: `${WEBSITE_BASE_URL}/images/logo/playstore-icon.png`,
                badge: `${WEBSITE_BASE_URL}/images/logo/badge.png`,
            },
            webpush: {
                fcm_options: { link: articleLink },
            },
        };

        await sendFCMMessage(userTokens, payload);
        await doc.ref.update({ notificationSent: true });
        console.log(`Suggestion ${doc.id} marquée comme notifiée.`);
    }
}

/**
 * Envoie des notifications aux utilisateurs dont le paiement a été confirmé.
 */
async function sendPaymentConfirmationNotifications() {
    console.log("Vérification des paiements confirmés...");

    const confirmationsSnapshot = await db.collection('payment_confirmations')
        .where('status', '==', 'confirmed')
        .where('notificationSent', '!=', true)
        .get();

    if (confirmationsSnapshot.empty) {
        console.log('Aucun paiement confirmé à notifier.');
        return;
    }

    for (const doc of confirmationsSnapshot.docs) {
        const confirmation = doc.data();
        console.log(`Notification pour paiement ${doc.id} confirmé.`);

        const userTokens = await getUserTokens(confirmation.userId);
        if (userTokens.length === 0) {
            console.log(`Aucun jeton pour l'utilisateur ${confirmation.userId}.`);
            await doc.ref.update({ notificationSent: true });
            continue;
        }

        const articleTitle = confirmation.articleTitle || "votre article";
        const payload = {
            notification: {
                title: "Paiement confirmé !",
                body: `Votre accès à l'article "${articleTitle}" est maintenant activé.`,
                icon: `${WEBSITE_BASE_URL}/images/logo/playstore-icon.png`,
                badge: `${WEBSITE_BASE_URL}/images/logo/badge.png`,
            },
            webpush: {
                fcm_options: { link: `${WEBSITE_BASE_URL}/user-dashboard.html` },
            },
        };

        await sendFCMMessage(userTokens, payload);
        await doc.ref.update({ notificationSent: true });
        console.log(`Paiement ${doc.id} marqué comme notifié.`);
    }
}

/**
 * Envoie des notifications aux admins pour les nouvelles preuves de paiement.
 */
async function sendNewPaymentProofAdminNotifications() {
    console.log("Vérification des nouvelles preuves de paiement...");

    const proofsSnapshot = await db.collection('payment_confirmations')
        .where('notificationSentToAdmin', '!=', true)
        .get();

    if (proofsSnapshot.empty) {
        console.log('Aucune nouvelle preuve de paiement à notifier aux admins.');
        return;
    }

    const adminTokens = await getAdminTokens();
    if (adminTokens.length === 0) {
        console.log('Aucun jeton admin trouvé pour les preuves de paiement.');
        // Marquer toutes les preuves comme notifiées pour éviter de les re-traiter inutilement
        for (const doc of proofsSnapshot.docs) {
            await doc.ref.update({ notificationSentToAdmin: true });
        }
        return;
    }

    for (const doc of proofsSnapshot.docs) {
        const proof = doc.data();
        console.log(`Notification admin pour nouvelle preuve de paiement ${doc.id}.`);

        const articleTitle = proof.articleTitle || "un article";
        const payload = {
            notification: {
                title: "Nouvelle preuve de paiement !",
                body: `${proof.userDisplayName} a soumis une preuve pour "${articleTitle}".`,
                icon: `${WEBSITE_BASE_URL}/images/logo/playstore-icon.png`,
                badge: `${WEBSITE_BASE_URL}/images/logo/badge.png`,
            },
            webpush: {
                fcm_options: { link: `${WEBSITE_BASE_URL}/admin/payments.html` },
            },
        };

        await sendFCMMessage(adminTokens, payload);
        await doc.ref.update({ notificationSentToAdmin: true });
        console.log(`Preuve de paiement ${doc.id} marquée comme notifiée aux admins.`);
    }
}

/**
 * Envoie des notifications de bienvenue aux nouveaux utilisateurs.
 */
async function sendWelcomeNotifications() {
    console.log("Vérification des nouveaux utilisateurs...");

    const newUsersSnapshot = await db.collection('users')
        .where('notificationSentWelcome', '!=', true)
        .get();

    if (newUsersSnapshot.empty) {
        console.log('Aucun nouvel utilisateur à notifier.');
        return;
    }

    for (const doc of newUsersSnapshot.docs) {
        const newUser = doc.data();
        console.log(`Notification de bienvenue pour ${newUser.displayName}.`);

        const userTokens = await getUserTokens(doc.id);
        if (userTokens.length === 0) {
            console.log(`Aucun jeton pour le nouvel utilisateur ${newUser.displayName}.`);
            await doc.ref.update({ notificationSentWelcome: true }); // Marquer comme notifié même sans envoi
            continue;
        }

        const payload = {
            notification: {
                title: `Bienvenue, ${newUser.displayName || 'nouvel utilisateur'} !`,
                body: "Découvrez nos ressources pour booster votre business mobile.",
                icon: `${WEBSITE_BASE_URL}/images/logo/playstore-icon.png`,
                badge: `${WEBSITE_BASE_URL}/images/logo/badge.png`,
            },
            webpush: {
                fcm_options: { link: `${WEBSITE_BASE_URL}/blog.html` },
            },
        };

        await sendFCMMessage(userTokens, payload);
        await doc.ref.update({ notificationSentWelcome: true });
        console.log(`Utilisateur ${doc.id} marqué comme notifié de bienvenue.`);
    }
}

/**
 * Envoie des notifications aux admins pour les nouveaux utilisateurs.
 */
async function sendNewUserAdminNotifications() {
    console.log("Vérification des nouveaux utilisateurs pour les admins...");

    const newUsersSnapshot = await db.collection('users')
        .where('notificationSentToAdminNewUser', '!=', true)
        .get();

    if (newUsersSnapshot.empty) {
        console.log('Aucun nouvel utilisateur à notifier aux admins.');
        return;
    }

    const adminTokens = await getAdminTokens();
    if (adminTokens.length === 0) {
        console.log('Aucun jeton admin trouvé pour les nouveaux utilisateurs.');
        for (const doc of newUsersSnapshot.docs) {
            await doc.ref.update({ notificationSentToAdminNewUser: true });
        }
        return;
    }

    for (const doc of newUsersSnapshot.docs) {
        const newUser = doc.data();
        console.log(`Notification admin pour nouvel utilisateur ${newUser.displayName}.`);

        const payload = {
            notification: {
                title: "Nouvel utilisateur !",
                body: `${newUser.displayName} (${newUser.email}) vient de s'inscrire.`,
                icon: `${WEBSITE_BASE_URL}/images/logo/playstore-icon.png`,
                badge: `${WEBSITE_BASE_URL}/images/logo/badge.png`,
            },
            webpush: {
                fcm_options: { link: `${WEBSITE_BASE_URL}/admin/users.html` },
            },
        };

        await sendFCMMessage(adminTokens, payload);
        await doc.ref.update({ notificationSentToAdminNewUser: true });
        console.log(`Utilisateur ${doc.id} marqué comme notifié aux admins.`);
    }
}

/**
 * Fonction principale qui exécute toutes les tâches de notification.
 */
async function main() {
    console.log('--- Démarrage du script de notification ---');
    const startTime = Date.now();

    try {
        // Vous pouvez ajouter d'autres fonctions de notification ici
        // et les exécuter en parallèle pour plus d'efficacité.
        await Promise.all([
            sendNewArticleNotifications(),
            sendSuggestionReplyNotifications(),
            sendPaymentConfirmationNotifications(),
            sendNewPaymentProofAdminNotifications(),
            sendWelcomeNotifications(),
            sendNewUserAdminNotifications(),
        ]);

    } catch (error) {
        console.error("Une erreur majeure est survenue dans le script principal:", error);
    } finally {
        const duration = Date.now() - startTime;
        console.log(`--- Script de notification terminé en ${duration}ms ---`);
    }
}

// Lancement du script
main().catch(console.error);