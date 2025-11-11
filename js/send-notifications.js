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

/**
 * Envoie des notifications pour les nouveaux articles publiés.
 */
async function sendNewArticleNotifications() {
    console.log("Vérification des nouveaux articles...");

    const articlesSnapshot = await db.collection('articles')
        .where('published', '==', true)
        .where('notificationSent', '!=', true) // On récupère les articles où le champ n'existe pas ou est false
        .get();

    if (articlesSnapshot.empty) {
        console.log('Aucun nouvel article à notifier.');
        return;
    }

    const tokensSnapshot = await db.collection('fcm_tokens').get();
    if (tokensSnapshot.empty) {
        console.log('Aucun jeton utilisateur trouvé. Impossible d\'envoyer des notifications.');
        return;
    }
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    for (const doc of articlesSnapshot.docs) {
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
            await messaging.sendToDevice(tokens, payload);

            // Marquer l'article comme notifié pour ne pas le renvoyer
            await doc.ref.update({ notificationSent: true });
            console.log(`Article "${article.title}" marqué comme notifié.`);

        } catch (error) {
            console.error(`Erreur lors de l'envoi de la notification pour l'article ${doc.id}:`, error);
        }
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
            // Exemple: await sendPaymentConfirmationNotifications(),
            // Exemple: await sendSuggestionReplyNotifications(),
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