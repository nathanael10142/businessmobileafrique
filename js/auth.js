/**
 * Business Mobile Afrique - Authentication JavaScript
 * Gestion de l'inscription et de la connexion des utilisateurs
 */

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const interestsSelect = document.getElementById('interests');

    // Si on est sur la page d'inscription, on initialise le champ des centres d'intérêt
    if (interestsSelect) {
        const choices = new Choices(interestsSelect, {
            removeItemButton: true,
            placeholder: true,
            placeholderValue: 'Sélectionnez jusqu\'à 3 sujets',
            maxItemCount: 3,
        });
        // On utilise la même liste de catégories que pour l'admin
        const categories = getProfessionalCategoriesForSignup();
        choices.setChoices(categories, 'value', 'label', true);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

/**
 * Gère la soumission du formulaire de connexion.
 * @param {Event} e - L'événement de soumission.
 */
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const formAlert = document.getElementById('formAlert');

    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // ✅ NOUVEAU : Géolocalisation après connexion réussie
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await window.db.collection('users').doc(user.uid).set({
                        lastLocation: new firebase.firestore.GeoPoint(latitude, longitude),
                        lastLogin: new Date().toISOString()
                    }, { merge: true });
                    console.log('📍 Localisation enregistrée.');
                } catch (dbError) {
                    console.error("Erreur d'enregistrement de la localisation:", dbError);
                }
            }, (error) => {
                // L'utilisateur a refusé ou une erreur s'est produite, on ne fait rien de bloquant.
                console.warn("Géolocalisation refusée ou non disponible:", error.message);
            });
        }

        // --- Redirection après connexion ---
        // On attend de récupérer le rôle de l'utilisateur AVANT de rediriger.
        const userDocRef = window.db.collection('users').doc(user.uid);
        try {
            const doc = await userDocRef.get();
            if (doc.exists && doc.data().role === 'admin') {
                // L'utilisateur est un admin, redirection vers le tableau de bord admin.
                window.location.href = '/admin/index.html';
            } else {
                // L'utilisateur est standard, redirection vers son tableau de bord.
                const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/user-dashboard.html';
                window.location.href = redirectUrl;
            }
        } catch (dbError) {
            console.error("Erreur lors de la lecture du rôle, redirection par défaut :", dbError);
            // En cas d'erreur (ex: hors ligne), on redirige vers le tableau de bord utilisateur par sécurité.
            window.location.href = '/user-dashboard.html';
        }

    } catch (error) {
        console.error('Erreur de connexion:', error);
        showAlert(getFirebaseErrorMessage(error), 'error', formAlert);
    }
}

/**
 * Gère la soumission du formulaire d'inscription.
 * @param {Event} e - L'événement de soumission.
 */
async function handleSignup(e) {
    e.preventDefault();
    const displayName = document.getElementById('displayName').value.trim(); // ✅ CORRECTION : Supprime les espaces avant et après
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const interests = Array.from(document.getElementById('interests').selectedOptions).map(option => option.value);
    const formAlert = document.getElementById('formAlert');

    if (password.length < 6) {
        showAlert('Le mot de passe doit contenir au moins 6 caractères.', 'error', formAlert);
        return;
    }

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Mettre à jour le profil Firebase Auth
        await user.updateProfile({
            displayName: displayName
        });

        // Créer le document utilisateur dans Firestore
        await window.db.collection('users').doc(user.uid).set({
            displayName: displayName,
            email: email,
            createdAt: new Date().toISOString(),
            role: 'user', // Rôle par défaut
            interests: interests // ✅ NOUVEAU : On sauvegarde les centres d'intérêt
        });

        // Redirection vers le tableau de bord
        window.location.replace('/user-dashboard.html');

    } catch (error) {
        console.error("Erreur d'inscription:", error);
        showAlert(getFirebaseErrorMessage(error), 'error', formAlert);
    }
}

/**
 * Retourne une liste de catégories pour l'inscription.
 */
function getProfessionalCategoriesForSignup() {
    return [
        {
            label: 'Business & Entrepreneuriat',
            choices: [
                { value: 'strategie-entreprise', label: 'Stratégie d\'entreprise' },
                { value: 'marketing-digital', label: 'Marketing Digital' },
                { value: 'vente-negociation', label: 'Vente & Négociation' },
                { value: 'finance-comptabilite', label: 'Finance & Comptabilité' },
                { value: 'leadership-management', label: 'Leadership & Management' },
            ]
        },
        {
            label: 'Développement Personnel',
            choices: [
                { value: 'motivation', label: 'Motivation & Mindset' },
                { value: 'productivite', label: 'Productivité & Gestion du temps' },
                { value: 'communication', label: 'Communication & Prise de parole' },
                { value: 'bien-etre', label: 'Bien-être & Santé mentale' },
            ]
        },
        {
            label: 'Technologies & Digital',
            choices: [
                { value: 'developpement-web', label: 'Développement Web & Mobile' },
                { value: 'intelligence-artificielle', label: 'Intelligence Artificielle' },
                { value: 'cybersecurite', label: 'Cybersécurité' },
                { value: 'outils-no-code', label: 'Outils No-Code / Low-Code' },
            ]
        },
        {
            label: 'Compétences Pratiques',
            choices: [
                { value: 'design-graphique', label: 'Design Graphique' },
                { value: 'montage-video', label: 'Montage Vidéo' },
                { value: 'copywriting', label: 'Copywriting & Rédaction Web' },
            ]
        }
    ];
}

/**
 * Traduit les codes d'erreur d'authentification Firebase en français.
 * @param {object} error - L'objet d'erreur Firebase.
 * @returns {string} Un message d'erreur convivial en français.
 */
function getFirebaseErrorMessage(error) {
    switch (error.code) {
        case 'auth/user-not-found':
            return 'Aucun utilisateur trouvé avec cette adresse e-mail.';
        case 'auth/wrong-password':
            return 'Mot de passe incorrect. Veuillez réessayer.';
        case 'auth/invalid-email':
            return 'L\'adresse e-mail n\'est pas valide.';
        case 'auth/email-already-in-use':
            return 'Cette adresse e-mail est déjà utilisée par un autre compte.';
        case 'auth/weak-password':
            return 'Le mot de passe doit contenir au moins 6 caractères.';
        default:
            return 'Une erreur est survenue. Veuillez réessayer.';
    }
}
