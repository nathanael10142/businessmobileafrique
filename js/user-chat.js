/**
 * Business Mobile Afrique - User Chat System
 */

document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            loadUserChat(user);
        } else {
            // Si l'utilisateur n'est pas connecté, on le renvoie vers la page de connexion
            window.location.replace('/login.html?redirect=/user-chat.html');
        }
    });
});

/**
 * Charge la conversation de l'utilisateur avec l'admin.
 * @param {object} user - L'objet utilisateur de Firebase Auth.
 */
async function loadUserChat(user) {
    const chatMessages = document.getElementById('chatMessages');
    const chatReplyForm = document.getElementById('chatReplyForm');

    // ✅ MODIFICATION : On utilise onSnapshot au lieu de get() pour écouter en temps réel.
    window.db.collection('contacts')
        .where('email', '==', user.email)
        .orderBy('created_at', 'asc')
        .onSnapshot(snapshot => {
        if (snapshot.empty) {
            chatMessages.innerHTML = '<p class="text-center text-muted">Commencez la conversation en envoyant un message.</p>';
        } else {
            chatMessages.innerHTML = window.AppUtils.generateChatHtml(snapshot.docs, false);
        }

        // Fait défiler jusqu'au dernier message
        chatMessages.scrollTop = chatMessages.scrollHeight;
        setupReplyForm(user);
    }, error => {
        // Gère les erreurs de l'écouteur
        console.error("Erreur lors du chargement du chat:", error);
        chatMessages.innerHTML = '<p class="text-center text-danger">Erreur de chargement de la conversation.</p>';
    });
}

/**
 * Configure le formulaire de réponse.
 * @param {object} user - L'objet utilisateur de Firebase Auth.
 */
function setupReplyForm(user) {
    const form = document.getElementById('replyForm');
    const messageInput = document.getElementById('replyMessage');
    const chatMessages = document.getElementById('chatMessages');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        if (!messageText) return;

        const messageData = {
            name: user.displayName,
            email: user.email,
            message: messageText,
            sender: 'user', // Important pour distinguer les messages
            status: 'new',
            created_at: new Date() // Utilise un objet Date JS, Firestore le convertira
        };

        messageInput.value = ''; // Vide le champ immédiatement

        try {
            await window.db.collection('contacts').add(messageData);
            // Plus besoin d'ajouter le message manuellement, onSnapshot s'en occupe !

        } catch (error) {
            console.error("Erreur lors de l'envoi du message:", error);
            messageInput.value = messageText; // Restaure le texte en cas d'erreur
            alert("Erreur d'envoi. Veuillez réessayer.");
        }
    });
}