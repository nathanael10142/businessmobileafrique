/**
 * Business Mobile Afrique - Global Utility Functions
 */

/**
 * Format date to French locale
 * @param {object} timestamp - Firebase Timestamp object
 * @returns {string} Formatted date
 */
function formatDate(timestamp, options = {}) {
    if (!timestamp) {
        return 'Date inconnue';
    }

    let date;
    if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
        return 'Date inconnue';
    }
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const finalOptions = { ...defaultOptions, ...options };
    return date.toLocaleString('fr-FR', finalOptions);
}

/**
 * Get emoji for category
 * @param {string} category - Category name
 * @returns {string} Category emoji
 */
function getCategoryEmoji(category) {
    const emojis = {
        'tutoriel': '📚',
        'motivation': '💪',
        'strategie': '🎯',
        'outils': '🛠️'
    };
    return emojis[category] || '📝';
}

/**
 * Get display name for category
 * @param {string} category - Category name
 * @returns {string} Category display name
 */
function getCategoryName(category) {
    const names = {
        'tutoriel': 'Tutoriel',
        'motivation': 'Motivation',
        'strategie': 'Stratégie',
        'outils': 'Outils'
    };
    return names[category] || 'Article';
}

/**
 * Generate slug from title
 * @param {string} title - Article title
 * @returns {string} URL-friendly slug
 */
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Formate une date pour l'afficher comme séparateur ("Aujourd'hui", "Hier", etc.).
 * @param {Date} date - La date du message.
 * @returns {string} Le texte du séparateur.
 */
function formatDateSeparator(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return 'Aujourd\'hui';
    if (date.getTime() === yesterday.getTime()) return 'Hier';
    
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Génère le HTML pour les messages de chat, incluant les séparateurs de date.
 * @param {Array} messageDocs - Les documents de messages de Firestore.
 * @param {boolean} isAdminView - Vrai si la vue est celle de l'admin.
 * @returns {string} Le HTML complet du chat.
 */
function generateChatHtml(messageDocs, isAdminView) {
    let html = '';
    let lastDate = null;

    messageDocs.forEach(doc => {
        const msg = doc.data ? doc.data() : doc;
        const msgDate = msg.created_at ? new Date(msg.created_at.seconds * 1000) : new Date();

        if (!lastDate || lastDate.toDateString() !== msgDate.toDateString()) {
            html += '<div class="chat-date-separator">' + formatDateSeparator(msgDate) + '</div>';
        }

        let bubbleType;
        if (isAdminView) {
            bubbleType = msg.sender === 'admin' ? 'user' : 'admin';
        } else {
            bubbleType = msg.sender === 'user' ? 'user' : 'admin';
        }
        
        const formattedTime = msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        html += '<div class="chat-bubble ' + bubbleType + '">' +
                '<p class="mb-0">' + escapeHtml(msg.message) + '</p>' +
                '<small>' + formattedTime + '</small>' +
                '</div>';

        lastDate = msgDate;
    });

    return html;
}

// ✅ EXPORT FINAL - TOUTES LES FONCTIONS
window.AppUtils = {
    formatDate: formatDate,
    generateSlug: generateSlug,
    escapeHtml: escapeHtml,
    getCategoryEmoji: getCategoryEmoji,
    getCategoryName: getCategoryName,
    formatDateSeparator: formatDateSeparator,
    generateChatHtml: generateChatHtml
};

// ✅ LOG DE CONFIRMATION
console.log('✅ AppUtils initialisé avec', Object.keys(window.AppUtils).length, 'fonctions');
console.log('📋 Fonctions:', Object.keys(window.AppUtils));
