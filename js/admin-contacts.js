/**
 * Business Mobile Afrique - Admin Chat System
 */

document.addEventListener('DOMContentLoaded', function() {
    loadConversations();
});

/**
 * Load all conversations
 */
async function loadConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;

    // ✅ MODIFICATION : On écoute les changements sur la collection 'contacts' en temps réel.
    window.db.collection('contacts').orderBy('created_at', 'desc')
        .onSnapshot(snapshot => {
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-center text-muted p-3">Aucune conversation.</p>';
            return;
        }

        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const conversations = groupMessagesByConversation(messages);
        container.innerHTML = conversations.map(convo => createConversationCard(convo)).join('');
    }, error => {
        console.error('Error loading conversations:', error);
        container.innerHTML = '<p class="text-center text-muted p-3">Erreur de chargement.</p>';
    });
}

/**
 * Group messages into conversations based on email
 */
function groupMessagesByConversation(messages) {
    const groups = {};
    messages.forEach(msg => {
        const id = msg.email; // Use email as conversation ID
        if (!groups[id]) {
            groups[id] = {
                id: id,
                name: msg.name,
                lastMessage: msg.message,
                lastMessageDate: msg.created_at,
                unread: msg.status === 'new' && msg.sender !== 'admin'
            };
        } else {
            if (msg.created_at > groups[id].lastMessageDate) {
                groups[id].lastMessage = msg.message;
                groups[id].lastMessageDate = msg.created_at;
            }
            if (msg.status === 'new' && msg.sender !== 'admin') {
                groups[id].unread = true;
            }
        }
    });
    return Object.values(groups).sort((a, b) => b.lastMessageDate - a.lastMessageDate);
}

/**
 * Create HTML for a conversation in the list
 */
function createConversationCard(convo) {
    const date = convo.lastMessageDate ? window.AppUtils.formatDate(convo.lastMessageDate, { day: 'numeric', month: 'short' }) : '';
    const unreadClass = convo.unread ? 'fw-bold' : '';
    const avatar = createAvatar(convo.name);

    // ✅ CORRECTION : On transforme la div en un lien <a> pour une navigation infaillible.
    const chatUrl = `admin-chat.html?email=${encodeURIComponent(convo.id)}&name=${encodeURIComponent(convo.name)}`;

    return `
        <a href="${chatUrl}" class="conversation-item p-2 border-bottom">
            ${convo.unread ? '<div class="unread-indicator"></div>' : ''}
            <div class="avatar" style="background-color: ${avatar.color};">${avatar.initial}</div>
            <div class="convo-details flex-grow-1">
                <div class="d-flex justify-content-between align-items-start">
                    <strong class="${unreadClass} text-truncate">${window.AppUtils.escapeHtml(convo.name)}</strong>
                    <small class="text-muted flex-shrink-0 ms-2">${date}</small>
                </div>
                <p class="text-muted text-truncate mb-0 ${unreadClass}">${window.AppUtils.escapeHtml(convo.lastMessage)}</p>
            </div>
        </a>
    `;
}

/**
 * Creates a colored avatar with the first initial of a name.
 * @param {string} name The user's name.
 * @returns {{initial: string, color: string}}
 */
function createAvatar(name) {
    if (!name) return { initial: '?', color: '#808080' };
    const initial = name.charAt(0).toUpperCase();
    const colors = ['#E57373', '#81C784', '#64B5F6', '#FFD54F', '#BA68C8', '#4DB6AC', '#F06292'];
    
    // Simple hash function to get a consistent color for a name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    
    return { initial, color: colors[index] };
}
