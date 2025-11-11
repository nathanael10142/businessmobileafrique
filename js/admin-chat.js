/**
 * Business Mobile Afrique - Admin Chat (Single Conversation View)
 */

// ✅ Fonction pour attendre le chargement de AppUtils
function waitForAppUtils(callback, maxAttempts = 50) {
    let attempts = 0;
    
    const checkInterval = setInterval(() => {
        attempts++;
        
        if (window.AppUtils && typeof window.AppUtils.generateChatHtml === 'function') {
            clearInterval(checkInterval);
            console.log('✅ AppUtils chargé après', attempts, 'tentatives');
            callback();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('❌ Timeout: AppUtils non chargé après', maxAttempts, 'tentatives');
            console.log('🔍 Debug - window.AppUtils:', window.AppUtils);
            document.getElementById('chatMessages').innerHTML = 
                '<p class="text-center text-danger">Erreur de chargement des utilitaires. Veuillez rafraîchir la page.</p>';
        }
    }, 100); // Vérifier toutes les 100ms
}

// ✅ Attendre que le DOM ET AppUtils soient prêts
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM chargé, attente de AppUtils...');
    waitForAppUtils(initChat);
});

/**
 * Initialise le chat une fois AppUtils disponible
 */
function initChat() {
    console.log('✅ Initialisation du chat');
    
    const urlParams = new URLSearchParams(window.location.search);
    const userEmail = urlParams.get('email');
    const userName = urlParams.get('name');
    
    if (!userEmail) {
        document.getElementById('chatMessages').innerHTML = 
            '<p class="text-center text-danger">Aucun utilisateur sélectionné.</p>';
        return;
    }
    
    // Mettre à jour le header du chat
    const chatNameContainer = document.getElementById('chatName');
    const avatar = createAvatar(userName || userEmail);
    chatNameContainer.innerHTML = `
        <div class="avatar" style="background-color: ${avatar.color};">${avatar.initial}</div>
        <span>${window.AppUtils.escapeHtml(userName || userEmail)}</span>
    `;
    
    loadChat(userEmail);
}

/**
 * Charge la conversation d'un utilisateur spécifique.
 * @param {string} userEmail - L'email de l'utilisateur.
 */
async function loadChat(userEmail) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '<div class="spinner"></div>';

    // ✅ MODIFICATION : On utilise onSnapshot pour le temps réel.
    window.db.collection('contacts')
        .where('email', '==', userEmail)
        .orderBy('created_at', 'asc')
        .onSnapshot(snapshot => {
        if (snapshot.empty) {
            chatMessages.innerHTML = '<p class="text-center text-muted">Aucun message dans cette conversation.</p>';
        } else {
            chatMessages.innerHTML = window.AppUtils.generateChatHtml(snapshot.docs, true);
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
        setupReplyForm(userEmail);
    }, error => {
        console.error("Erreur lors du chargement du chat:", error);
        chatMessages.innerHTML = '<p class="text-center text-danger">Erreur de chargement : ' + error.message + '</p>';
    });
}

/**
 * Configure le formulaire de réponse de l'admin.
 * @param {string} userEmail - L'email de l'utilisateur à qui répondre.
 */
function setupReplyForm(userEmail) {
    const form = document.getElementById('replyForm');
    const messageInput = document.getElementById('replyMessage');

    // ✅ Supprimer les anciens listeners pour éviter les doublons
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = document.getElementById('replyMessage').value.trim();
        if (!messageText) return;

        const replyData = {
            name: 'Admin',
            email: userEmail,
            message: messageText,
            sender: 'admin',
            status: 'replied',
            created_at: new Date()
        };

        document.getElementById('replyMessage').value = '';

        try {
            await window.db.collection('contacts').add(replyData);
            // Plus besoin de recharger le chat, onSnapshot le fait automatiquement !
        } catch (error) {
            console.error("Erreur lors de l'envoi de la réponse:", error);
            alert("Erreur d'envoi. Veuillez réessayer.");
        }
    });
}

/**
 * Crée un avatar coloré.
 * @param {string} name - Le nom de l'utilisateur.
 * @returns {object} Objet avec l'initiale et la couleur.
 */
function createAvatar(name) {
    if (!name) return { initial: '?', color: '#808080' };
    const initial = name.charAt(0).toUpperCase();
    const colors = ['#E57373', '#81C784', '#64B5F6', '#FFD54F', '#BA68C8', '#4DB6AC', '#F06292'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return { initial, color: colors[index] };
}
