/**
 * Business Mobile Afrique - Gestion des Articles (Admin)
 * CRUD complet pour les articles
 */

// ✅ ÉTAPE 1: MODE DÉBOGAGE ACTIVÉ
const DEBUG_MODE = true;

document.addEventListener('DOMContentLoaded', function() {
    // --- ÉLÉMENTS DU DOM ---
    // Vues principales
    const articleListView = document.getElementById('articleListView');
    const articleEditorView = document.getElementById('articleEditorView');

    // Champs de l'éditeur
    const articleForm = document.getElementById('articleForm');
    const articleIdField = document.getElementById('articleId');
    const editorTitle = document.getElementById('editorTitle');
    const titleInput = document.getElementById('articleTitle');
    const slugInput = document.getElementById('articleSlug');
    const articleIsPaidCheckbox = document.getElementById('articleIsPaid');
    const priceFields = document.getElementById('priceFields');

    // Affiche ou masque les champs de prix instantanément
    articleIsPaidCheckbox.addEventListener('change', () => {
        priceFields.style.display = articleIsPaidCheckbox.checked ? 'block' : 'none';
    });

    // --- VUE LISTE ---
    const articlesTableBody = document.getElementById('articlesTableBody');
    const newArticleBtn = document.getElementById('newArticleBtn');

    // --- BOUTONS ---
    const backToListBtn = document.getElementById('backToListBtn');
    const previewBtn = document.getElementById('previewBtn');
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const uploadImageBtn = document.getElementById('uploadImageBtn');

    // ✅ NOUVEAU : Initialisation du select de catégories avec recherche
    const categorySelect = document.getElementById('articleCategory');
    let categoryChoices = new Choices(categorySelect, { searchEnabled: true, removeItemButton: true, placeholder: true, placeholderValue: 'Rechercher ou choisir une catégorie...' });

    // --- INITIALISATION ---
    loadArticles();
    setupEventListeners();
    handleUrlActions(categoryChoices); // On passe l'instance de Choices

    // ===================================================================
    // FONCTIONS PRINCIPALES
    // ===================================================================

    /**
     * Charge et affiche la liste des articles dans le tableau.
     */
    async function loadArticles() {
        if (!articlesTableBody) return;
        articlesTableBody.innerHTML = `<tr><td colspan="7" class="text-center"><div class="spinner"></div></td></tr>`;

        try {
            const snapshot = await window.db.collection('articles').orderBy('created_at', 'desc').get();

            if (snapshot.empty) {
                articlesTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Aucun produit trouvé. Cliquez sur "Nouveau produit" pour commencer.</td></tr>';
                return;
            }

            const articlesHtml = snapshot.docs.map(doc => {
                const article = { id: doc.id, ...doc.data() };
                return createArticleRow(article);
            });

            articlesTableBody.innerHTML = articlesHtml.join('');
            setupActionButtons();

        } catch (error) {
            console.error("Erreur lors du chargement des articles:", error);
            articlesTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erreur de chargement des produits.</td></tr>';
        }
    }

    /**
     * Crée le HTML pour une ligne du tableau d'articles.
     * @param {object} article - L'objet article.
     * @returns {string} Le HTML de la ligne (tr).
     */
    function createArticleRow(article) {
        const title = window.AppUtils.escapeHtml(article.title || 'Sans titre');
        const category = window.AppUtils.escapeHtml(article.category || 'N/A');
        const author = window.AppUtils.escapeHtml(article.author || 'N/A');
        const status = article.published ? `<span class="badge status-published">Publié</span>` : `<span class="badge status-draft">Brouillon</span>`;

        let priceDisplay = 'Gratuit';
        if (article.isPaid && article.price) {
            const prices = [];
            if (article.price.usd) prices.push(`${article.price.usd} USD`);
            if (article.price.cdf) prices.push(`${article.price.cdf} CDF`);
            priceDisplay = prices.join(' / ') || '<span class="text-danger">Prix manquant</span>';
        }

        return `
            <tr>
                <td>
                    <a href="../article.html?id=${article.id}" target="_blank" title="${title}">
                        ${title}
                    </a>
                </td>
                <td>${category}</td>
                <td>${author}</td>
                <td>${article.views || 0}</td>
                <td>${priceDisplay}</td>
                <td>${status}</td>
                <td class="admin-actions">
                    <button class="btn btn-sm btn-info" data-id="${article.id}" data-action="preview">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" data-id="${article.id}" data-action="edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" data-id="${article.id}" data-action="delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Réinitialise le formulaire de l'éditeur à son état par défaut.
     */
    function resetEditorFields() {
        articleForm.reset();
        articleIdField.value = '';
        editorTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Nouveau produit';
        document.getElementById('articleFeatured').checked = false;
        document.getElementById('articlePublished').checked = true;
        document.getElementById('articleAuthor').value = "Jean Marie Business";
        // Gestion des prix
        document.getElementById('articleIsPaid').checked = false;
        document.getElementById('productType').value = 'livre';
        document.getElementById('articleImage').value = '';
        document.getElementById('fileUrl').value = '';
        document.getElementById('articlePriceUSD').value = '';
        document.getElementById('articlePriceCDF').value = '';
        priceFields.style.display = 'none';

        // ✅ NOUVEAU : On réinitialise le champ de catégorie et on le remplit avec la liste complète
        const categories = getProfessionalCategories();
        categoryChoices.clearStore();
        categoryChoices.setChoices(categories, 'value', 'label', true);
    }

    /**
     * Charge les données d'un article dans le formulaire pour modification.
     * @param {string} id - L'ID de l'article à charger.
     */
    async function loadArticleForEdit(id) {
        showView('editor', categoryChoices); // Affiche l'éditeur immédiatement
        try {
            const doc = await window.db.collection('articles').doc(id).get();
            if (!doc.exists) {
                window.AdminUtils.showAlert('Produit non trouvé.', 'error', 'alertContainer');
                return;
            }
            const article = { id: doc.id, ...doc.data() };

            articleIdField.value = article.id;
            editorTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Modifier le produit';
            titleInput.value = article.title || '';
            slugInput.value = article.slug || '';

            // ✅ NOUVEAU : On met à jour la valeur du champ de catégorie avec Choices.js
            categoryChoices.setChoiceByValue(article.category || '');

            document.getElementById('articleExcerpt').value = article.excerpt || '';
            document.getElementById('productType').value = article.productType || 'livre';
            document.getElementById('articleImage').value = article.imageUrl || '';
            document.getElementById('fileUrl').value = article.fileUrl || '';
            document.getElementById('articleContent').value = article.content || '';
            document.getElementById('articleFeatured').checked = article.featured || false;
            document.getElementById('articlePublished').checked = article.published || false;
            document.getElementById('articleAuthor').value = article.author || "Jean Marie Business";

            // Gestion des prix
            const isPaid = article.isPaid || false;
            document.getElementById('articleIsPaid').checked = isPaid;
            priceFields.style.display = isPaid ? 'block' : 'none';
            document.getElementById('articlePriceUSD').value = article.price?.usd || '';
            document.getElementById('articlePriceCDF').value = article.price?.cdf || '';

        } catch (error) {
            console.error("Erreur lors du chargement du produit pour édition:", error);
            window.AdminUtils.showAlert('Erreur de chargement du produit.', 'error', 'alertContainer');
        }
    }

    /**
     * Sauvegarde un article (création ou mise à jour).
     */
    async function saveArticle() {
        const articleId = articleIdField.value;
        const saveButton = articleForm.querySelector('button[type="submit"]');

        const articleData = {
            title: titleInput.value.trim(),
            slug: document.getElementById('articleSlug').value.trim(),
            fileUrl: document.getElementById('fileUrl').value.trim(),
            category: document.getElementById('articleCategory').value,
            excerpt: document.getElementById('articleExcerpt').value.trim(),
            productType: document.getElementById('productType').value,
            imageUrl: document.getElementById('articleImage').value.trim(),
            content: document.getElementById('articleContent').value.trim(),
            author: document.getElementById('articleAuthor').value.trim(),
            published: document.getElementById('articlePublished').checked,
            featured: document.getElementById('articleFeatured').checked,
            isPaid: document.getElementById('articleIsPaid').checked,
            price: {
                usd: parseFloat(document.getElementById('articlePriceUSD').value) || null,
                cdf: parseFloat(document.getElementById('articlePriceCDF').value) || null,
            },
            updated_at: new Date().toISOString(),
        };

        // Si l'article n'est pas payant, s'assurer que les prix sont nuls
        if (!articleData.isPaid) {
            articleData.price.usd = null;
            articleData.price.cdf = null;
        }

        // Si c'est un nouvel article, ajoutez la date de création et les vues
        if (!articleId) {
            articleData.created_at = new Date().toISOString();
            articleData.views = 0;
        }

        // Validation simple
        if (!articleData.title || !articleData.slug || !articleData.fileUrl || !articleData.content) {
            window.AdminUtils.showAlert('Veuillez remplir tous les champs obligatoires (*).', 'error', 'editorAlert');
            return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 0 auto;"></div>';

        try {
            await saveToFirestore(articleId, articleData);
        } catch (error) {
            // L'erreur est gérée dans saveToFirestore
        }
    }

    /**
     * Sauvegarde les données de l'article dans Firestore.
     * @param {string|null} articleId - L'ID de l'article (null si nouvel article).
     * @param {object} articleData - Les données à sauvegarder.
     */
    async function saveToFirestore(articleId, articleData) {
        try {
            if (articleId) {
                await window.db.collection('articles').doc(articleId).update(articleData);
                window.AdminUtils.showAlert('Produit mis à jour avec succès !', 'success', 'editorAlert');
            } else {
                await window.db.collection('articles').add(articleData);
                window.AdminUtils.showAlert('Produit créé avec succès !', 'success', 'editorAlert');
                resetEditorFields();
            }
            setTimeout(() => {
                showView('list');
                loadArticles();
            }, 1500);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde dans Firestore:", error);
            window.AdminUtils.showAlert('Erreur de sauvegarde des données.', 'error', 'editorAlert');
        } finally {
            const saveButton = articleForm.querySelector('button[type="submit"]');
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fa-solid fa-save"></i> Enregistrer le produit';
        }
    }

    /**
     * Supprime un article après confirmation.
     * @param {string} id - L'ID de l'article à supprimer.
     */
    async function deleteArticle(id) {
        if (!window.AdminUtils.confirmDelete('ce produit')) return;

        try {
            await window.db.collection('articles').doc(id).delete();
            window.AdminUtils.showAlert('Produit supprimé avec succès.', 'success', 'alertContainer');
            loadArticles();
        } catch (error) {
            console.error("Erreur lors de la suppression du produit:", error);
            window.AdminUtils.showAlert('Erreur lors de la suppression.', 'error', 'alertContainer');
        }
    }

    // ===================================================================
    // GESTION DES VUES ET ÉVÉNEMENTS
    // ===================================================================

    /**
     * Affiche la vue spécifiée ('list' ou 'editor').
     * @param {'list' | 'editor'} viewName - Le nom de la vue à afficher.
     */
    function showView(viewName, choicesInstance) {
        articleListView.style.display = viewName === 'list' ? 'block' : 'none';
        articleEditorView.style.display = viewName === 'editor' ? 'block' : 'none';
        if (viewName === 'editor' && choicesInstance) resetEditorFields(); // On réinitialise le formulaire quand on l'ouvre
        window.scrollTo(0, 0); // Remonte en haut de la page
    }

    /**
     * Configure les écouteurs d'événements pour les boutons et le formulaire.
     */
    function setupEventListeners() {
        newArticleBtn?.addEventListener('click', () => {
            resetEditorFields();
            showView('editor', categoryChoices);
        });

        backToListBtn?.addEventListener('click', () => showView('list'));

        articleForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveArticle();
        });

        titleInput?.addEventListener('input', () => {
            slugInput.value = window.AppUtils.generateSlug(titleInput.value);
        });

        previewBtn?.addEventListener('click', () => {
            // Logique de prévisualisation (peut ouvrir un nouvel onglet avec les données du formulaire)
            console.log("Prévisualisation demandée");
        });

        // Appel de la configuration du bouton de téléversement
        setupUploadButton();

        // ✅ NOUVEAU : Appel de la configuration pour l'image
        setupImageUploadButton();
    }

    /**
     * Configure le bouton de téléversement avec Bytescale.
     */
    function setupUploadButton() {
        if (!uploadFileBtn) return;

        uploadFileBtn.addEventListener('click', async () => {
            const options = {
              apiKey: "public_G22nj2jCdbUVQd4MvqwRifmkb51W", // Votre clé publique Bytescale
              maxFileCount: 1,
              editor: {
                images: {
                    allowResizeOnMove: false,
                    crop: false
                }
              }
            };

            if (DEBUG_MODE) {
                console.log("Configuration Bytescale:", options);
            }

            try {
                // ✅ CORRECTION: Bytescale retourne directement un tableau, pas un objet.
                const uploadedFiles = await Bytescale.UploadWidget.open(options);
                
                // On vérifie que le tableau n'est pas vide (l'utilisateur a bien téléversé un fichier)
                if (uploadedFiles && uploadedFiles.length > 0) {
                    const fileUrl = uploadedFiles[0].fileUrl;
                    document.getElementById('fileUrl').value = fileUrl;
                    window.AdminUtils.showAlert('Fichier téléversé avec succès ! Le lien a été ajouté.', 'success', 'editorAlert');
                    if (DEBUG_MODE) {
                        console.log("Succès ! Fichier téléversé:", uploadedFiles[0]);
                    }
                } else {
                    // L'utilisateur a fermé la fenêtre sans téléverser
                    if (DEBUG_MODE) {
                        console.log("Fenêtre de téléversement fermée sans sélection de fichier.");
                    }
                }
            } catch (error) {
                console.error("Détail COMPLET de l'erreur Bytescale:", error);
                
                let errorMessage = `Erreur de téléversement: ${error.message}.`;
                try {
                    errorMessage += ` Détails: ${JSON.stringify(error, null, 2)}`;
                } catch (e) {
                    // Au cas où l'erreur ne peut pas être convertie en JSON
                }
                
                window.AdminUtils.showAlert(errorMessage, 'error', 'editorAlert');
            }
        });
    }

    /**
     * Configure le bouton de téléversement pour l'IMAGE de couverture avec Bytescale.
     */
    function setupImageUploadButton() {
        if (!uploadImageBtn) return;

        uploadImageBtn.addEventListener('click', async () => {
            const options = {
              apiKey: "public_G22nj2jCdbUVQd4MvqwRifmkb51W", // Votre clé publique Bytescale
              maxFileCount: 1,
              mimeTypes: ["image/jpeg", "image/png", "image/webp"], // N'accepte que les images
              editor: {
                images: {
                    crop: true, // Active l'éditeur pour recadrer
                    cropRatio: 16 / 9, // Propose un ratio 16:9, idéal pour les couvertures
                }
              }
            };

            try {
                const uploadedFiles = await Bytescale.UploadWidget.open(options);
                
                if (uploadedFiles && uploadedFiles.length > 0) {
                    const fileUrl = uploadedFiles[0].fileUrl;
                    document.getElementById('articleImage').value = fileUrl;
                    window.AdminUtils.showAlert('Image de couverture téléversée avec succès !', 'success', 'editorAlert');
                }
            } catch (error) {
                console.error("Erreur de téléversement d'image Bytescale:", error);
                let errorMessage = `Erreur de téléversement: ${error.message}.`;
                window.AdminUtils.showAlert(errorMessage, 'error', 'editorAlert');
            }
        });
    }

    /**
     * Configure les boutons d'action (modifier, supprimer, prévisualiser) dans le tableau.
     */
    function setupActionButtons() {
        articlesTableBody.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const id = button.dataset.id;
            const action = button.dataset.action;

            if (action === 'edit') {
                loadArticleForEdit(id);
            } else if (action === 'delete') {
                deleteArticle(id);
            } else if (action === 'preview') {
                window.open(`../article.html?id=${id}`, '_blank');
            }
        });
    }

    /**
     * Gère les actions basées sur les paramètres de l'URL (ex: ?action=new).
     */
    function handleUrlActions() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const id = urlParams.get('id');

        if (action === 'new') {
            showView('editor', categoryChoices);
        } else if (id) {
            loadArticleForEdit(id);
        }
    }

    /**
     * Retourne une liste professionnelle et étendue de catégories.
     */
    function getProfessionalCategories() {
        return [
            { value: '', label: 'Choisir une catégorie...', placeholder: true },
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
});
