const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialise l'application admin pour pouvoir interagir avec les services Firebase
admin.initializeApp();

// Base URL for the website (replace with your actual domain if different)
const WEBSITE_BASE_URL = "https://business-mobile-afrique.web.app";

// --- Helper Functions for FCM Tokens ---

/**
 * Retrieves FCM tokens for a given user ID.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<string[]>} An array of FCM tokens.
 */
async function getUserTokens(userId) {
    if (!userId) return [];
    const tokensSnapshot = await admin.firestore().collection("fcm_tokens")
        .where("userId", "==", userId)
        .get();
    return tokensSnapshot.docs.map(doc => doc.data().token);
}

/**
 * Retrieves FCM tokens for all admin users.
 * @returns {Promise<string[]>} An array of FCM tokens.
 */
async function getAdminTokens() {
    const adminUsersSnapshot = await admin.firestore().collection("users")
        .where("role", "==", "admin")
        .get();
    const adminUserIds = adminUsersSnapshot.docs.map(doc => doc.id);

    if (adminUserIds.length === 0) return [];

    // Fetch tokens for all admin user IDs
    const allAdminTokens = [];
    for (const adminId of adminUserIds) {
        const tokens = await getUserTokens(adminId);
        allAdminTokens.push(...tokens);
    }
    return allAdminTokens;
}

/**
 * Sends an FCM message to a list of tokens and cleans up invalid ones.
 * @param {string[]} tokens - Array of FCM tokens.
 * @param {object} payload - The FCM message payload.
 * @param {FirebaseFirestore.QuerySnapshot} [tokensSnapshot] - Optional: The original Firestore snapshot of tokens for cleanup.
 * @returns {Promise<void>}
 */
async function sendFCMMessage(tokens, payload, tokensSnapshot = null) {
    if (tokens.length === 0) {
        console.log("No tokens to send message to.");
        return;
    }

    try {
        const response = await admin.messaging().sendToDevice(tokens, payload);
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
                    // Find the document reference for this token if tokensSnapshot is provided
                    if (tokensSnapshot) {
                        const docRef = tokensSnapshot.docs.find(doc => doc.data().token === tokens[index])?.ref;
                        if (docRef) {
                            tokensToRemove.push(docRef.delete());
                        }
                    } else {
                        // If no snapshot, we can't easily get the docRef.
                        // For simplicity in this helper, we'll just log.
                        // In a real-world scenario, you might query for the token to delete it.
                        console.warn(`Could not remove invalid token ${tokens[index]} without original snapshot.`);
                    }
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

// --- 1. Notification pour les Nouveaux Articles (EXISTANT, LÉGÈREMENT MODIFIÉ) ---
/**
 * Cloud Function qui se déclenche à la création d'un nouvel article dans Firestore.
 * Elle envoie une notification push à tous les utilisateurs abonnés.
 */
exports.sendNewArticleNotification = functions.firestore
    .document("articles/{articleId}")
    .onCreate(async (snapshot, context) => {
        // Récupère les données du nouvel article créé
        const newArticle = snapshot.data();

        // --- SÉCURITÉ ET VALIDATION ---
        // On n'envoie une notification que si l'article est marqué comme "publié"
        if (!newArticle.published) {
            console.log(
                `L'article "${newArticle.title}" n'est pas publié. Aucune notification ne sera envoyée.`
            );
            return null;
        }

        console.log(`Nouvel article publié : "${newArticle.title}". Préparation de la notification...`);

        // --- RÉCUPÉRATION DES JETONS ---
        // Récupère tous les documents de la collection 'fcm_tokens'
        const tokensSnapshot = await admin.firestore().collection("fcm_tokens").get();

        if (tokensSnapshot.empty) {
            console.log("Aucun jeton de notification trouvé. Impossible d'envoyer la notification.");
            return null;
        }

        // Extrait la liste des jetons de chaque document
        const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
        console.log(`Envoi de la notification à ${tokens.length} appareil(s).`);

        // --- CONSTRUCTION DE LA NOTIFICATION ---
        // C'est ici que l'on personnalise le message
        const payload = {
            notification: {
                title: "Nouvel Article sur BMA !",
                body: newArticle.title || "Un nouvel article passionnant vous attend.",
                icon: "/images/logo/playstore-icon.png", // L'icône qui s'affichera sur la notification
                badge: "/images/logo/badge.png", // Badge pour Android
            },
            webpush: {
                fcm_options: {
                    // L'URL à ouvrir lorsque l'utilisateur clique sur la notification
                    link: `https://business-mobile-afrique.web.app/article.html?id=${context.params.articleId}`,
                },
            },
        };

        // --- ENVOI DE LA NOTIFICATION ---
        try {
            // Envoie le message à tous les jetons récupérés
            const response = await admin.messaging().sendToDevice(tokens, payload);

            // --- NETTOYAGE DES JETONS EXPIRÉS (BONNE PRATIQUE) ---
            const tokensToRemove = [];
            response.results.forEach((result, index) => {
                const error = result.error;
                if (error) {
                    console.error(
                        "Échec de l'envoi au jeton",
                        tokens[index],
                        error
                    );
                    // Si le jeton est invalide ou n'est plus enregistré, on le supprime
                    if (
                        error.code === "messaging/invalid-registration-token" ||
                        error.code === "messaging/registration-token-not-registered"
                    ) {
                        tokensToRemove.push(tokensSnapshot.docs[index].ref.delete());
                    }
                }
            });

            // Supprime les jetons invalides de la base de données
            await Promise.all(tokensToRemove);
            console.log("Nettoyage des jetons invalides terminé.");

            return { success: true, message: `Notification envoyée à ${tokens.length} appareils.` };

        } catch (error) {
            console.error("Erreur lors de l'envoi des notifications :", error);
            return { success: false, error: error.message };
        }
    });
