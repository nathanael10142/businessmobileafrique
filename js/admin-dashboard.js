/**
 * Business Mobile Afrique - Admin Dashboard JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    loadDashboardStats();
    loadRecentActivity();
});

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
    // On récupère tous les éléments à mettre à jour
    const totalUsersEl = document.getElementById('totalUsers');
    const totalArticlesEl = document.getElementById('totalArticles');
    const totalCommentsEl = document.getElementById('totalComments');
    const totalContactsEl = document.getElementById('totalContacts');
    const totalViewsEl = document.getElementById('totalViews');

    try {
        // ✅ CORRECTION : On charge toutes les collections en parallèle pour plus de rapidité
        const [usersSnapshot, articlesSnapshot, commentsSnapshot, contactsSnapshot] = await Promise.all([
            window.db.collection('users').get(),
            window.db.collection('articles').where('published', '==', true).get(),
            window.db.collection('comments').get(),
            window.db.collection('contacts').get()
        ]);

        totalUsersEl.textContent = usersSnapshot.size;
        totalArticlesEl.textContent = articlesSnapshot.size;
        totalCommentsEl.textContent = commentsSnapshot.size;
        totalContactsEl.textContent = contactsSnapshot.size;
        totalViewsEl.textContent = articlesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().views || 0), 0);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        totalUsersEl.textContent = 'Erreur';
        totalArticlesEl.textContent = 'Erreur';
        totalCommentsEl.textContent = 'Erreur';
        totalContactsEl.textContent = 'Erreur';
        totalViewsEl.textContent = 'Erreur';
    }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    try {
        // Fetch recent data
        const [articlesSnapshot, commentsSnapshot, contactsSnapshot] = await Promise.all([
            window.db.collection('articles').orderBy('created_at', 'desc').limit(5).get(),
            window.db.collection('comments').orderBy('created_at', 'desc').limit(5).get(),
            window.db.collection('contacts').orderBy('created_at', 'desc').limit(5).get()
        ]);

        const articles = articlesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const contacts = contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Combine and sort by date
        const activities = [
            ...articles.map(a => ({ type: 'article', data: a, date: a.created_at })),
            ...comments.map(c => ({ type: 'comment', data: c, date: c.created_at })),
            ...contacts.map(c => ({ type: 'contact', data: c, date: c.created_at }))
        ];

        activities.sort((a, b) => b.date - a.date);
        const recentActivities = activities.slice(0, 10);

        if (recentActivities.length === 0) {
            container.innerHTML = '<p style="color: var(--color-gray);">Aucune activité récente.</p>';
            return;
        }

        container.innerHTML = '<ul style="list-style: none; padding: 0;">' +
            recentActivities.map(activity => createActivityItem(activity)).join('') +
            '</ul>';

    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = '<p style="color: var(--color-gray);">Erreur lors du chargement de l\'activité.</p>';
    }
}

/**
 * Create activity item HTML
 */
function createActivityItem(activity) {
    const date = window.AdminUtils.formatDate(activity.date);
    let icon, text, link;

    switch (activity.type) {
        case 'article':
            icon = '📝';
            text = `Nouvel article : "${activity.data.title}"`;
            link = `articles.html?id=${activity.data.id}`;
            break;
        case 'comment':
            icon = '💬';
            text = `Nouveau commentaire de ${activity.data.author_name}`;
            link = 'comments.html';
            break;
        case 'contact':
            icon = '📧';
            text = `Nouveau message de ${activity.data.name}`;
            link = 'contacts.html';
            break;
    }

    return `
        <li style="padding: 0.75rem; border-bottom: 1px solid var(--color-gray-light); display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
            <div>
                <span style="font-size: 1.2rem;">${icon}</span>
                <a href="${link}" style="margin-left: 0.5rem; color: var(--color-primary);">${text}</a>
            </div>
            <span style="color: var(--color-gray); font-size: 0.85rem; white-space: nowrap;">${date}</span>
        </li>
    `;
}
