/**
 * Business Mobile Afrique - Admin Comments Management JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    loadComments();
    setupCommentFilter();
});

/**
 * Load comments list
 */
async function loadComments() {
    const container = document.getElementById('commentsList');
    const noComments = document.getElementById('noComments');
    if (!container) return;

    try {
        let query = window.db.collection('comments').orderBy('created_at', 'desc');
        const snapshot = await query.get();
        if (snapshot.empty) {
            container.innerHTML = '';
            if (noComments) noComments.style.display = 'block';
            return;
        }
        let comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Apply filter
        const filter = document.getElementById('commentFilter')?.value;
        if (filter && filter !== 'all') {
            if (filter === 'pending') {
                comments = comments.filter(c => !c.approved);
            } else if (filter === 'approved') {
                comments = comments.filter(c => c.approved);
            }
        }

        if (comments.length === 0) {
            container.innerHTML = '';
            if (noComments) noComments.style.display = 'block';
            return;
        }

        if (noComments) noComments.style.display = 'none';
        
        // Load article titles for comments
        const articleIds = [...new Set(comments.map(c => c.article_id))];
        const articles = {};
        for (const id of articleIds) {
            if (!id) continue;
            const doc = await window.db.collection('articles').doc(id).get();
            if (doc.exists) articles[id] = doc.data();
        }

        container.innerHTML = comments.map(comment => createCommentCard(comment, articles)).join('');

        // Setup action buttons
        setupCommentActions();

    } catch (error) {
        console.error('Error loading comments:', error);
        container.innerHTML = '<p style="color: var(--color-gray); text-align: center;">Erreur lors du chargement des commentaires.</p>';
    }
}

/**
 * Create comment card HTML
 */
function createCommentCard(comment, articles) {
    const article = articles[comment.article_id];
    const articleTitle = article ? article.title : 'Article inconnu';
    const date = window.AppUtils.formatDate(comment.created_at);
    const status = comment.approved 
        ? `<span class="badge" style="background-color: #28a745; color: white;"><i class="fa-solid fa-check"></i> Approuvé</span>`
        : `<span class="badge" style="background-color: #ffc107; color: black;"><i class="fa-solid fa-clock"></i> En attente</span>`;

    return `
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <strong style="color: var(--color-primary);">${escapeHtml(comment.author_name)}</strong>
                        <span style="color: var(--color-gray); font-size: 0.9rem;">(${escapeHtml(comment.author_email)})</span>
                    </div>
                    <div style="color: var(--color-gray); font-size: 0.9rem; margin-bottom: 0.5rem;">
                        Article : <a href="../article.html?id=${comment.article_id}" target="_blank">${escapeHtml(articleTitle)}</a>
                    </div>
                    <div style="color: var(--color-gray); font-size: 0.85rem;">
                        ${date} • ${status}
                    </div>
                </div>
                <div class="admin-actions">
                    ${!comment.approved ? `
                        <button class="btn btn-primary btn-small approve-btn" data-id="${comment.id}">
                            <i class="fa-solid fa-check"></i> Approuver
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-small unapprove-btn" data-id="${comment.id}">
                            <i class="fa-solid fa-ban"></i> Désapprouver
                        </button>
                    `}
                    <button class="btn btn-secondary btn-small delete-btn" data-id="${comment.id}">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
            <div style="padding: 1rem; background: var(--color-gray-light); border-radius: 8px;">
                <p style="margin: 0; line-height: 1.6;">${escapeHtml(comment.content)}</p>
            </div>
        </div>
    `;
}

/**
 * Setup comment action buttons
 */
function setupCommentActions() {
    // Approve buttons
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const commentId = this.getAttribute('data-id');
            await updateCommentStatus(commentId, true);
        });
    });

    // Unapprove buttons
    document.querySelectorAll('.unapprove-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const commentId = this.getAttribute('data-id');
            await updateCommentStatus(commentId, false);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const commentId = this.getAttribute('data-id');
            
            if (!window.AdminUtils.confirmDelete('ce commentaire')) {
                return;
            }

            try {
                await window.db.collection('comments').doc(commentId).delete();
                window.AdminUtils.showAlert('Commentaire supprimé avec succès.', 'success');
                loadComments();

            } catch (error) {
                console.error('Error deleting comment:', error);
                window.AdminUtils.showAlert('❌ Erreur lors de la suppression', 'error');
            }
        });
    });
}

/**
 * Update comment approval status
 */
async function updateCommentStatus(commentId, approved) {
    try {
        await window.db.collection('comments').doc(commentId).update({ approved: approved });
        window.AdminUtils.showAlert(`Statut du commentaire mis à jour.`, 'success');
        loadComments();

    } catch (error) {
        console.error('Error updating comment:', error);
        window.AdminUtils.showAlert('❌ Erreur lors de la mise à jour', 'error');
    }
}

/**
 * Setup comment filter
 */
function setupCommentFilter() {
    const filter = document.getElementById('commentFilter');
    if (filter) {
        filter.addEventListener('change', function() {
            loadComments();
        });
    }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
