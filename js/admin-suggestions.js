/**
 * Business Mobile Afrique - Gestion des Suggestions (Admin)
 */

// ✅ AJOUT : Déclaration de la variable globale
let articleChoices = null;

document.addEventListener('DOMContentLoaded', function() {
    loadSuggestions();
    setupReplyModal();
    initializeChoices(); // ✅ AJOUT : Initialiser Choices.js au chargement
});

/**
 * ✅ NOUVELLE FONCTION : Initialise Choices.js pour le select des articles
 */
function initializeChoices() {
    const selectElement = document.getElementById('articleSelect');
    if (selectElement && typeof Choices !== 'undefined') {
        articleChoices = new Choices(selectElement, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Sélectionner un article...',
            searchPlaceholderValue: 'Rechercher un article...',
            noResultsText: 'Aucun article trouvé',
            itemSelectText: 'Cliquer pour sélectionner',
            removeItemButton: false
        });
    } else if (!selectElement) {
        console.error('❌ Élément #articleSelect introuvable dans le DOM');
    } else {
        console.error('❌ Bibliothèque Choices.js non chargée');
    }
}

/**
 * Charge et affiche les suggestions des utilisateurs.
 */
async function loadSuggestions() {
    const container = document.getElementById('suggestionsList');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const snapshot = await window.db.collection('suggestions')
            .where('status', '==', 'pending')
            .orderBy('requestDate', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<div class="card text-center p-3"><p>Aucune nouvelle suggestion pour le moment. 📥</p></div>';
            return;
        }

        const suggestionsHtml = snapshot.docs.map(doc => {
            const suggestion = { id: doc.id, ...doc.data() };
            const date = new Date(suggestion.requestDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            return `
                <a href="#" class="card mb-2 suggestion-card" data-action="reply" data-id="${suggestion.id}">
                    <div class="suggestion-card-content">
                        <p><strong>${window.AppUtils.escapeHtml(suggestion.userDisplayName)}</strong> a suggéré :</p>
                        <p class="text-muted" style="font-style: italic;">"${window.AppUtils.escapeHtml(suggestion.suggestionText)}"</p>
                        <small>Le ${date}</small>
                    </div>
                    <div class="suggestion-card-actions">
                        <span class="btn btn-primary">
                            <i class="fa-solid fa-reply"></i> Répondre
                        </span>
                    </div>
                </a>
            `;
        }).join('');

        container.innerHTML = suggestionsHtml;
        setupActionButtons();

    } catch (error) {
        console.error("Erreur lors du chargement des suggestions:", error);
        container.innerHTML = '<div class="alert alert-danger">Erreur de chargement des suggestions.</div>';
    }
}

/**
 * Configure les boutons d'action sur la liste des suggestions.
 */
function setupActionButtons() {
    document.getElementById('suggestionsList').addEventListener('click', (event) => {
        const cardLink = event.target.closest('a[data-action="reply"]');
        if (cardLink) {
            event.preventDefault();
            const suggestionId = cardLink.dataset.id;
            openReplyModal(suggestionId);
        }
    });
}

/**
 * Ouvre la modale de réponse et charge la liste des articles.
 * @param {string} suggestionId - L'ID de la suggestion.
 */
async function openReplyModal(suggestionId) {
    const modal = document.getElementById('replyModal');
    const suggestionIdField = document.getElementById('suggestionId');

    // ✅ AMÉLIORATION : Vérifier que articleChoices existe
    if (!articleChoices) {
        console.error('❌ articleChoices non initialisé');
        alert('Erreur : Le sélecteur d\'articles n\'est pas prêt. Rechargez la page.');
        return;
    }

    suggestionIdField.value = suggestionId;
    articleChoices.clearStore(); // Vide les anciennes options
    articleChoices.setChoices([{ value: '', label: 'Chargement des articles...', disabled: true }]);
    modal.style.display = 'flex';

    try {
        const articlesSnapshot = await window.db.collection('articles')
            .where('published', '==', true)
            .orderBy('title')
            .get();
        
        const choicesData = articlesSnapshot.docs.map(doc => {
            const article = { id: doc.id, ...doc.data() };
            return { value: article.id, label: article.title };
        });
        
        articleChoices.setChoices(choicesData, 'value', 'label', true);
    } catch (error) {
        console.error("Erreur de chargement des articles pour la réponse:", error);
        articleChoices.setChoices([{ value: '', label: 'Erreur de chargement', disabled: true }]);
    }
}

/**
 * Configure la logique de la modale de réponse.
 */
function setupReplyModal() {
    const modal = document.getElementById('replyModal');
    const form = document.getElementById('replyForm');

    modal.querySelector('.modal-close').onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const suggestionId = document.getElementById('suggestionId').value;
        const articleId = document.getElementById('articleSelect').value;
        const selectElement = document.getElementById('articleSelect');
        const articleTitle = selectElement.options[selectElement.selectedIndex].text;

        if (!suggestionId || !articleId) {
            window.AdminUtils.showAlert("Veuillez sélectionner un article.", 'error', 'replyModalAlert');
            return;
        }

        const saveButton = form.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        saveButton.innerHTML = '<div class="spinner-small"></div>';

        try {
            // Mettre à jour la suggestion
            await window.db.collection('suggestions').doc(suggestionId).update({
                status: 'replied',
                repliedWithArticleId: articleId,
                repliedWithArticleTitle: articleTitle,
                replyDate: new Date().toISOString()
            });

            // ✅ CORRECTION : On n'accorde plus l'accès gratuit. On notifie simplement l'admin.
            window.AdminUtils.showAlert("Réponse envoyée avec succès ! L'utilisateur sera notifié.", 'success', 'alertContainer');
            modal.style.display = 'none';
            loadSuggestions();

        } catch (error) {
            console.error("Erreur lors de l'envoi de la réponse:", error);
            window.AdminUtils.showAlert("Erreur lors de l'envoi de la réponse.", 'error', 'replyModalAlert');
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Envoyer l\'article';
        }
    });
}
