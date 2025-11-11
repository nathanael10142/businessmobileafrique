/**
 * Business Mobile Afrique - Blog JavaScript
 * Gestion de l'affichage des articles
 */

document.addEventListener('DOMContentLoaded', function() {
    loadBlogPosts();
    setupCategoryFilter();
    setupSuggestionForm();
});

/**
 * Load and display blog posts
 */
async function loadBlogPosts() {
    const container = document.querySelector('.blog-posts') || document.getElementById('blogPostsContainer');
    const noPosts = document.getElementById('noPosts');
    
    if (!container) {
        return;
    }

    // Afficher un spinner pendant le chargement
    container.innerHTML = '<div class="spinner"></div>';

    try {
        // Vérifier que Firebase est initialisé
        if (!window.db) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-gray); padding: 2rem;">Erreur de connexion à la base de données.</p>';
            return;
        }

        // Get search query from URL if exists
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        const categoryFilter = urlParams.get('category');

        // Construire la requête Firestore
        let query = window.db.collection('articles')
            .where('published', '==', true)
            .orderBy('created_at', 'desc');

        const snapshot = await query.get();
        let articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Apply search filter
        if (searchQuery) {
            articles = articles.filter(article => {
                const searchLower = searchQuery.toLowerCase();
                return article.title.toLowerCase().includes(searchLower) ||
                       article.excerpt.toLowerCase().includes(searchLower) ||
                       article.content.toLowerCase().includes(searchLower);
            });
        }

        // Apply category filter
        if (categoryFilter && categoryFilter !== 'all') {
            articles = articles.filter(article => article.category === categoryFilter);
        }

        // ✅ CORRECTION : On identifie la page d'accueil en cherchant un élément qui n'existe que sur cette page.
        // Le bouton "Voir plus" (`seeMoreBtnContainer`) n'existe que sur index.html.
        const seeMoreBtnContainer = document.getElementById('seeMoreBtnContainer');
        const isHomepage = seeMoreBtnContainer !== null;

        if (isHomepage) {
            const seeMoreBtnContainer = document.getElementById('seeMoreBtnContainer');
            const HOME_PAGE_LIMIT = 10;

            // Si on a plus d'articles que la limite, on affiche le bouton "Voir plus"
            if (articles.length > HOME_PAGE_LIMIT && seeMoreBtnContainer) {
                seeMoreBtnContainer.style.display = 'block';
            }

            // On limite le nombre d'articles affichés sur la page d'accueil
            articles = articles.slice(0, HOME_PAGE_LIMIT);
        }

        // Clear container (supprimer le spinner)
        container.innerHTML = '';

        // Display articles
        if (articles.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-gray); padding: 2rem; font-size: 1.1rem;">Aucun article trouvé. 📭</p>';
            return;
        }

        if (noPosts) noPosts.style.display = 'none';

        // Créer et ajouter chaque carte d'article
        articles.forEach((article, index) => {
            const articleCard = createArticleCard(article);
            container.appendChild(articleCard);

            // Animation échelonnée
            setTimeout(() => {
                articleCard.classList.add('is-visible');
            }, index * 100);
        });

    } catch (error) {
        console.error('❌ Erreur lors du chargement des articles:', error);
        container.innerHTML = `
            <p style="text-align: center; color: var(--color-gray); padding: 2rem;">Erreur: ${error.message}</p>`;
    }
}

/**
 * Create article card element
 * @param {Object} article - Article data
 * @returns {HTMLElement} Article card element
 */
function createArticleCard(article) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card fade-in';

    const escapeHtml = window.AppUtils ? window.AppUtils.escapeHtml : (text) => text;

    const title = escapeHtml(article.title || 'Sans titre');
    const excerpt = escapeHtml(article.excerpt || 'Pas de description disponible.');
    const defaultImage = 'https://images.unsplash.com/photo-1589998059171-988d887df646?q=80&w=2070&auto=format&fit=crop';
    const imageUrl = article.imageUrl || defaultImage;

    let priceDisplay = '';
    if (article.isPaid && article.price) {
        const priceUSD = article.price.usd ? `${article.price.usd.toFixed(2)} USD` : '';
        const priceCDF = article.price.cdf ? `${article.price.cdf} CDF` : '';
        priceDisplay = [priceUSD, priceCDF].filter(Boolean).join(' ou ');
    }

    // ✅ CORRECTION : Suppression des onclick, utilisation de data-attributes
    productCard.innerHTML = `
        <a href="#" class="product-card-image-link">
            <img src="${imageUrl}" alt="${title}" class="product-card-image" loading="lazy">
        </a>
        <div class="product-card-content">
            <h3 class="product-card-title">
                <a href="#" class="product-card-link">${title}</a>
            </h3>
            <p class="product-card-excerpt">${excerpt}</p>
            <div class="product-card-footer">
                ${priceDisplay ? `<div class="product-card-price">${priceDisplay}</div>` : '<div class="product-card-price free">Gratuit</div>'}
                <button class="btn btn-primary btn-buy">
                    <i class="fa-solid fa-shopping-cart"></i> Voir
                </button>
            </div>
        </div>
    `;

    // ✅ AJOUT : Stocker les données dans l'élément DOM
    productCard.dataset.articleId = article.id;
    productCard.dataset.isPaid = article.isPaid || false;
    productCard.dataset.title = article.title || 'Sans titre';
    productCard.dataset.price = priceDisplay;

    // ✅ AJOUT : Gestion des clics avec addEventListener (SÉCURISÉ)
    const articleUrl = `article.html?id=${article.id}`;

    // Action pour le bouton "Voir"
    const handleBuyClick = (e) => {
        e.preventDefault();
        if (article.isPaid) {
            showPaymentModal(article.title, priceDisplay, article.id);
        } else {
            window.location.href = articleUrl;
        }
    };

    // Action pour le reste de la carte (image, titre)
    const handleLinkClick = (e) => {
        e.preventDefault();
        window.location.href = articleUrl;
    };

    // Ajouter les événements de clic
    productCard.querySelector('.product-card-image-link').addEventListener('click', handleLinkClick);
    productCard.querySelector('.product-card-link').addEventListener('click', handleLinkClick);
    productCard.querySelector('.btn-buy').addEventListener('click', handleBuyClick);

    return productCard;
}

/**
 * Affiche la modale de paiement avec les instructions
 * @param {string} articleTitle - Le titre de l'article
 * @param {string} price - Le prix formaté
 * @param {string} articleId - L'ID de l'article
 */
function showPaymentModal(articleTitle, price, articleId) {
    // Supprimer une modale existante si elle y est
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) {
        existingModal.remove();
    }

    // ✅ AJOUT : Fonction d'échappement locale au cas où
    const escapeHtml = window.AppUtils ? window.AppUtils.escapeHtml : (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const paymentNumber = "0993575428";
    const beneficiaryName = "AKILIMALI NATHANAEL";
    const whatsappNumberForLink = "243993575428";
    const whatsappMessage = `Bonjour, voici ma preuve de paiement pour l'article : "${articleTitle}".`;
    const whatsappLink = `https://wa.me/${whatsappNumberForLink}?text=${encodeURIComponent(whatsappMessage)}`;

    let modalHTML = `
        <div class="modal-overlay" id="paymentModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fa-solid fa-shield-halved"></i> Finaliser votre Achat</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Pour débloquer "<strong>${escapeHtml(articleTitle)}</strong>", suivez ces étapes simples :</p>
                    
                    <div class="payment-steps">
                        <!-- Étape 1: Payer -->
                        <div class="payment-step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h4>Payez avec Airtel Money</h4>
                                <div class="payment-details-card">
                                    <div class="payment-logo-airtel"></div>
                                    <div class="payment-info centered">
                                        <span class="info-label">Montant à envoyer :</span>
                                        <span class="info-value price" style="line-height: 1;">${escapeHtml(price)}</span>
                                    </div>
                                    <div class="payment-info">
                                        <span class="info-label">Numéro de téléphone :</span>
                                        <div class="info-value-group">
                                            <span class="info-value number" id="paymentNumberToCopy">${paymentNumber}</span>
                                            <button class="btn-copy" id="copyNumberBtn" title="Copier le numéro"><i class="fa-regular fa-copy"></i></button>
                                        </div>
                                    </div>
                                    <div class="payment-info beneficiary">
                                        <span class="info-label">Nom du bénéficiaire :</span>
                                        <span class="info-value name">${beneficiaryName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Étape 2: Envoyer la preuve -->
                        <div class="payment-step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h4>Envoyez votre preuve</h4>
                                <p class="step-description">Après le paiement, cliquez sur le bouton ci-dessous pour téléverser la capture d'écran de votre transaction.</p>
                                <button id="uploadProofBtn" class="btn btn-primary" style="width: 100%;"><i class="fa-solid fa-upload"></i> J'ai payé, envoyer ma preuve</button>
                                <div id="uploadStatus" class="mt-1" style="text-align: center; font-weight: 600;"></div>
                            </div>
                        </div>
                    </div>

                    <p class="payment-footer">
                        <i class="fa-solid fa-shield-alt"></i> Votre accès sera activé dans votre tableau de bord quelques minutes après la validation.
                    </p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('paymentModal');
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Logique de téléversement de preuve
    const uploadProofBtn = document.getElementById('uploadProofBtn');
    uploadProofBtn.addEventListener('click', async () => {
        if (typeof Bytescale === 'undefined') {
            console.error("La librairie Bytescale n'est pas chargée.");
            document.getElementById('uploadStatus').innerHTML = `<span class="text-danger">Erreur de chargement du service de téléversement. Veuillez rafraîchir la page.</span>`;
            return;
        }

        const currentUser = window.auth.currentUser;
        if (!currentUser) {
            alert('Veuillez vous connecter pour soumettre une preuve.');
            return;
        }

        const options = {
            apiKey: "public_G22nj2jCdbUVQd4MvqwRifmkb51W",
            maxFileCount: 1,
            mimeTypes: ["image/jpeg", "image/png", "image/webp"],
            editor: { images: { crop: false } }
        };

        try {
            const files = await Bytescale.UploadWidget.open(options);
            if (files.length > 0) {
                const screenshotUrl = files[0].fileUrl;

                // Créer le ticket de confirmation dans Firestore
                await window.db.collection('payment_confirmations').add({
                    userId: currentUser.uid,
                    userDisplayName: currentUser.displayName || currentUser.email,
                    articleId: articleId,
                    articleTitle: articleTitle,
                    screenshotUrl: screenshotUrl,
                    price: price,
                    status: 'pending',
                    requestDate: new Date().toISOString()
                });

                // Afficher un message de succès
                modal.querySelector('.modal-body').innerHTML = `
                    <div class="text-center">
                        <i class="fa-solid fa-check-circle" style="font-size: 3rem; color: #28a745;"></i>
                        <h4 style="margin-top: 1rem;">Preuve envoyée avec succès !</h4>
                        <p>Votre demande est en cours de validation. Vous recevrez une notification dans votre tableau de bord une fois l'accès activé.</p>
                        <button class="btn btn-primary modal-close-success">Fermer</button>
                    </div>
                `;
                modal.querySelector('.modal-close-success').addEventListener('click', () => modal.remove());
            }
        } catch (error) {
            console.error("Erreur lors du téléversement de la preuve:", error);
            document.getElementById('uploadStatus').innerHTML = `<span class="text-danger">Erreur: ${error.message}</span>`;
        }
    });

    // Logique pour le bouton "Copier"
    const copyBtn = document.getElementById('copyNumberBtn');
    copyBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(paymentNumber).then(() => {
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 2000);
        });
    });
}

/**
 * Setup category filter
 */
function setupCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            const category = this.value;
            const url = new URL(window.location);
            
            if (category && category !== 'all') {
                url.searchParams.set('category', category);
            } else {
                url.searchParams.delete('category');
            }
            
            window.location.href = url.toString();
        });

        // Set current filter value from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentCategory = urlParams.get('category');
        if (currentCategory) {
            categoryFilter.value = currentCategory;
        }
    }
}

/**
 * Configure le formulaire de suggestion.
 */
function setupSuggestionForm() {
    // ✅ NOUVELLE LOGIQUE POUR LA MODALE
    const openBtn = document.getElementById('openSuggestionBtn');
    const modal = document.getElementById('suggestionModal');
    const closeBtn = document.getElementById('closeSuggestionModalBtn');

    if (openBtn && modal && closeBtn) {
        openBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    }

    const form = document.getElementById('suggestionForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentUser = window.auth.currentUser;
        if (!currentUser) {
            document.getElementById('suggestionLoginPrompt').style.display = 'block';
            return;
        }

        const suggestionText = document.getElementById('suggestionText').value.trim();
        if (!suggestionText) {
            showAlert('Veuillez décrire votre suggestion.', 'error', document.getElementById('suggestionAlert'));
            return;
        }

        try {
            await window.db.collection('suggestions').add({
                userId: currentUser.uid,
                userDisplayName: currentUser.displayName || currentUser.email,
                suggestionText: suggestionText,
                requestDate: new Date().toISOString(),
                status: 'pending' // 'pending', 'replied', 'archived'
            });

            // On affiche un message de succès et on ferme la modale après quelques secondes
            showAlert('✅ Merci ! Votre suggestion a bien été envoyée.', 'success', document.getElementById('suggestionAlert'));
            setTimeout(() => {
                if (modal) modal.style.display = 'none';
            }, 3000);
        } catch (error) {
            console.error("Erreur lors de l'envoi de la suggestion:", error);
            showAlert('Une erreur est survenue. Veuillez réessayer.', 'error', document.getElementById('suggestionAlert'));
        }
    });
}
