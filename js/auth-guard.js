/**
 * Business Mobile Afrique - Auth Guard
 * Protège les routes en vérifiant l'authentification et le rôle de l'utilisateur.
 * Ce script doit être inclus dans le <head> des pages à protéger.
 */

(function() {
    // On utilise une fonction anonyme pour s'exécuter immédiatement sans attendre DOMContentLoaded

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // L'utilisateur est connecté, on vérifie maintenant s'il est admin.
            const db = firebase.firestore();
            const userDocRef = db.collection('users').doc(user.uid);

            userDocRef.get().then(doc => {
                if (doc.exists && doc.data().role === 'admin') {
                    // L'utilisateur est un admin, on ne fait rien, la page peut se charger.
                    console.log('✅ Accès autorisé : Rôle Admin confirmé.');
                } else {
                    // L'utilisateur est connecté mais n'est PAS admin.
                    console.warn('❌ Accès refusé à la page admin. Redirection vers le tableau de bord utilisateur.');
                    // On le redirige vers son tableau de bord au lieu de le déconnecter.
                    window.location.replace('/user-dashboard.html');
                }
            }).catch(error => {
                console.error("Erreur lors de la vérification du rôle admin :", error);
                window.location.replace('/login.html?error=dberror');
            });

        } else {
            // L'utilisateur n'est PAS connecté.
            console.log('👤 Utilisateur non connecté. Redirection vers la page de connexion.');
            // On redirige vers la page de connexion en gardant en mémoire la page actuelle.
            const currentPage = window.location.pathname + window.location.search;
            window.location.replace(`/login.html?redirect=${encodeURIComponent(currentPage)}`);
        }
    });
})();