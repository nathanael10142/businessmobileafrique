/**
 * Business Mobile Afrique - Article Detail JavaScript
 * Gestion de l'affichage et des interactions des articles
 */

let currentArticle = null;

document.addEventListener('DOMContentLoaded', function() {
    loadArticle();
    // Les fonctions de partage et de commentaires sont maintenant appelées après le chargement de l'article
});

/**
 * Charge et affiche l'article.
 */
async function loadArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    const articleSlug = urlParams.get('slug');

    if (!articleId && !articleSlug) {
        showAccessDenied();
        return;
    }

    const container = document.getElementById('articleContent');
    const notFound = document.getElementById('articleNotFound');
    container.innerHTML = '<div class="spinner"></div>'; // Affiche un spinner pendant le chargement

    try {
        // Récupérer l'article depuis Firestore
        let doc;
        if (articleId) {
            doc = await window.db.collection('articles').doc(articleId).get();
        } else {
            const snapshot = await window.db.collection('articles').where('slug', '==', articleSlug).limit(1).get();
            if (!snapshot.empty) {
                doc = snapshot.docs[0];
            }
        }

        if (!doc || !doc.exists) {
            showAccessDenied();
            return;
        }
        
        const article = { id: doc.id, ...doc.data() };
        currentArticle = article; // Stocke l'article actuel globalement

        // --- LOGIQUE D'ACCÈS SÉCURISÉE ---
        let hasAccess = false;
        if (!article.isPaid) {
            hasAccess = true; // Accès gratuit
        } else {
            const user = window.auth.currentUser;
            if (user) {
                const purchasesQuery = await window.db.collection('purchases')
                    .where('userId', '==', user.uid)
                    .where('articleId', '==', article.id)
                    .limit(1)
                    .get();

                if (!purchasesQuery.empty) {
                    const purchase = purchasesQuery.docs[0].data();
                    const expiryDate = purchase.expiryDate ? new Date(purchase.expiryDate) : null;
                    if (expiryDate && expiryDate > new Date()) {
                        hasAccess = true; // Achat valide et non expiré
                    }
                }
            }
        }
        
        // Si l'article n'est pas publié et que l'utilisateur n'est pas admin, refuser l'accès
        // (Cette logique est simplifiée ici, une vraie vérification admin serait plus complexe)
        if (!article.published) {
             showAccessDenied();
             return;
        }

        // Mettre à jour le titre de la page
        document.title = `${article.title} - Business Mobile Afrique`;

        // Afficher l'article avec le statut d'accès
        displayArticleAsCard(article, container, hasAccess);

        // Incrémenter les vues (seulement si l'article est visible)
        incrementArticleViews(article.id);

        // Charger les commentaires et les articles similaires
        loadComments(article.id);
        loadRelatedArticles(article.category, article.id);
        
        // Configurer les boutons de partage et le formulaire de commentaire
        setupShareButtons();
        setupCommentForm();

    } catch (error) {
        console.error('Erreur lors du chargement de l\'article:', error);
        showAccessDenied();
    }
}

/**
 * Affiche l'article principal sous forme de carte produit, comme sur la page du blog.
 * @param {object} article - L'objet article.
 * @param {HTMLElement} container - Le conteneur où afficher l'article.
 * @param {boolean} hasAccess - Si l'utilisateur a le droit de voir le contenu complet.
 */
function displayArticleAsCard(article, container, hasAccess) {
    container.innerHTML = ''; // Vider le spinner
    const productCard = createProductCard(article, hasAccess, true); // Indiquer que c'est l'article principal
    container.appendChild(productCard);

    // On déclenche l'animation avec un petit délai pour un effet plus fluide
    setTimeout(() => {
        productCard.classList.add('is-visible');
    }, 50);
}

/**
 * Crée une carte produit, similaire à celle du blog.
 * @param {object} article - L'objet article.
 * @param {boolean} hasAccess - Si l'utilisateur a déjà accès.
 * @returns {HTMLElement} L'élément de la carte produit.
 */
function createProductCard(article, hasAccess, isMainArticle = false) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card fade-in'; // Ne pas rendre visible immédiatement

    const escapeHtml = window.AppUtils.escapeHtml;
    const title = escapeHtml(article.title || 'Sans titre');
    const defaultImage = 'https://images.unsplash.com/photo-1589998059171-988d887df646?q=80&w=2070&auto=format&fit=crop';
    const imageUrl = article.imageUrl || defaultImage;

    let priceDisplay = '';
    if (article.isPaid && article.price) {
        const priceUSD = article.price.usd ? `${article.price.usd.toFixed(2)} USD` : '';
        const priceCDF = article.price.cdf ? `${article.price.cdf} CDF` : '';
        priceDisplay = [priceUSD, priceCDF].filter(Boolean).join(' ou ');
    }

    // Le contenu complet est maintenant affiché sous la carte
    const fullContentHTML = `
        <div class="article-content" style="line-height: 1.8; font-size: 1.05rem; margin-top: 2rem;">
             <h4 style="border-bottom: 2px solid var(--color-gray-light); padding-bottom: 0.5rem; margin-bottom: 1rem;">Description</h4>
            ${hasAccess ? article.content : '<p><i>Achetez ce produit pour débloquer la description complète et le fichier à télécharger.</i></p>'}
        </div>
    `;

    let buttonHTML = '';
    if (hasAccess) {
        buttonHTML = `<button class="btn btn-primary btn-read"><i class="fa-solid fa-book-open"></i> Lire</button>`;
    } else {
        buttonHTML = `<button class="btn btn-primary btn-buy"><i class="fa-solid fa-shopping-cart"></i> Voir</button>`;
    }

    productCard.innerHTML = `
        <a href="#" class="product-card-image-link">
            <img src="${imageUrl}" alt="${title}" class="product-card-image" loading="lazy">
        </a>
        <div class="product-card-content">
            <h3 class="product-card-title">
                <a href="#" class="product-card-link">${title}</a>
            </h3>
            <p class="product-card-excerpt">${escapeHtml(article.excerpt)}</p>
            <div class="product-card-footer">
                ${priceDisplay ? `<div class="product-card-price">${priceDisplay}</div>` : '<div class="product-card-price free">Gratuit</div>'}
                ${buttonHTML}
            </div>
        </div>
        ${fullContentHTML}
    `;

    const handleAction = (e) => {
        e.preventDefault();
        if (hasAccess) {
            window.open(article.fileUrl, '_blank');
        } else if (article.isPaid) {
            showPaymentModal(article.title, priceDisplay, article.id);
        } else {
            // Pour les articles gratuits non achetés (cas rare sur cette page)
            window.open(article.fileUrl, '_blank');
        }
    };

    // Attacher les événements
    productCard.querySelector('.btn-buy')?.addEventListener('click', handleAction);
    productCard.querySelector('.btn-read')?.addEventListener('click', handleAction);
    productCard.querySelector('.product-card-image-link').addEventListener('click', handleAction);
    productCard.querySelector('.product-card-link').addEventListener('click', handleAction);

    return productCard;
}

/**
 * Affiche un message d'accès refusé ou de produit non trouvé.
 */
function showAccessDenied() {
    const container = document.getElementById('articleContent');
    const notFound = document.getElementById('articleNotFound');

    if (container) container.style.display = 'none';
    if (notFound) {
        notFound.style.display = 'block';
        // Le message par défaut dans article.html est suffisant
    }
}

/**
 * Incrémente le compteur de vues de l'article.
 * @param {string} articleId - L'ID de l'article.
 */
async function incrementArticleViews(articleId) {
    try {
        const articleRef = window.db.collection('articles').doc(articleId);
        await articleRef.update({
            views: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.error('Erreur lors de l\'incrémentation des vues:', error);
    }
}

/**
 * Charge les commentaires approuvés pour l'article.
 * @param {string} articleId - L'ID de l'article.
 */
async function loadComments(articleId) {
    const container = document.getElementById('commentsList');
    if (!container) return;

    try {
        const snapshot = await window.db.collection('comments')
            .where('article_id', '==', articleId)
            .where('approved', '==', true)
            .orderBy('created_at', 'desc')
            .get();
            
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (comments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-gray);">Aucun commentaire pour le moment. Soyez le premier à commenter ! 💬</p>';
            return;
        }

        container.innerHTML = comments.map(comment => createCommentHTML(comment)).join('');

    } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
        container.innerHTML = '<p style="text-align: center; color: var(--color-gray);">Erreur lors du chargement des commentaires.</p>';
    }
}

/**
 * Crée le HTML pour une carte de commentaire.
 * @param {object} comment - L'objet commentaire.
 * @returns {string} Le HTML de la carte.
 */
function createCommentHTML(comment) {
    const formattedDate = window.AppUtils.formatDate(comment.created_at?.toDate());
    
    return `
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                <strong style="color: var(--color-primary);">${window.AppUtils.escapeHtml(comment.author_name)}</strong>
                <span style="color: var(--color-gray); font-size: 0.9rem;">${formattedDate}</span>
            </div>
            <p style="margin: 0; line-height: 1.6;">${window.AppUtils.escapeHtml(comment.content)}</p>
        </div>
    `;
}

/**
 * Configure le formulaire de soumission de commentaire.
 */
function setupCommentForm() {
    const form = document.getElementById('commentForm');
    if (!form) return;

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        if (!currentArticle) {
            showAlert('Article non trouvé', 'error', document.getElementById('commentAlert'));
            return;
        }

        const name = document.getElementById('commentAuthor').value.trim();
        const content = document.getElementById('commentText').value.trim();

        if (!name || !content) {
            showAlert('Veuillez remplir votre nom et votre commentaire.', 'error', document.getElementById('commentAlert'));
            return;
        }

        try {
            await window.db.collection('comments').add({
                article_id: currentArticle.id,
                author_name: name,
                author_email: 'not-required@example.com',
                content: content,
                approved: false,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            showAlert('✅ Merci ! Votre commentaire sera publié après modération.', 'success', document.getElementById('commentAlert'));
            form.reset();

        } catch (error) {
            console.error('Erreur lors de l\'envoi du commentaire:', error);
            showAlert('Erreur lors de l\'envoi du commentaire. Veuillez réessayer.', 'error', document.getElementById('commentAlert'));
        }
    });
}

/**
 * Configure les boutons de partage.
 */
function setupShareButtons() {
    const shareWhatsApp = document.getElementById('shareWhatsApp');
    const shareFacebook = document.getElementById('shareFacebook');

    if (shareWhatsApp) {
        shareWhatsApp.addEventListener('click', function() {
            if (currentArticle) {
                const text = `${currentArticle.title}\n\n${window.location.href}`;
                const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(url, '_blank');
            }
        });
    }

    if (shareFacebook) {
        shareFacebook.addEventListener('click', function() {
            const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
            window.open(url, '_blank', 'width=600,height=400');
        });
    }
}

/**
 * Charge les articles similaires.
 * @param {string} category - La catégorie de l'article actuel.
 * @param {string} currentArticleId - L'ID de l'article actuel pour l'exclure.
 */
async function loadRelatedArticles(category, currentArticleId) {
    const container = document.getElementById('relatedArticles');
    if (!container) return;

    try {
        const snapshot = await window.db.collection('articles')
            .where('category', '==', category)
            .where('published', '==', true)
            .orderBy('created_at', 'desc')
            .get();

        let articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        articles = articles.filter(article => article.id !== currentArticleId).slice(0, 3);

        if (articles.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-gray-light);">Aucun article similaire trouvé.</p>';
            return;
        }

        container.innerHTML = ''; // Vider le conteneur
        articles.forEach(article => {
            // On réutilise la fonction de création de carte du blog
            const card = createRelatedArticleCard(article);
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Erreur lors du chargement des articles similaires:', error);
    }
}

/**
 * Crée une carte produit pour les articles similaires.
 * @param {object} article - L'objet article.
 * @returns {HTMLElement} L'élément de la carte.
 */
function createRelatedArticleCard(article) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card fade-in';

    const escapeHtml = window.AppUtils.escapeHtml;
    const title = escapeHtml(article.title || 'Sans titre');
    const defaultImage = 'https://images.unsplash.com/photo-1589998059171-988d887df646?q=80&w=2070&auto=format&fit=crop';
    const imageUrl = article.imageUrl || defaultImage;

    let priceDisplay = '';
    if (article.isPaid && article.price) {
        const priceUSD = article.price.usd ? `${article.price.usd.toFixed(2)} USD` : '';
        const priceCDF = article.price.cdf ? `${article.price.cdf} CDF` : '';
        priceDisplay = [priceUSD, priceCDF].filter(Boolean).join(' ou ');
    }

    productCard.innerHTML = `
        <a href="article.html?id=${article.id}" class="product-card-image-link">
            <img src="${imageUrl}" alt="${title}" class="product-card-image" loading="lazy">
        </a>
        <div class="product-card-content">
            <h3 class="product-card-title">
                <a href="article.html?id=${article.id}" class="product-card-link">${title}</a>
            </h3>
            <p class="product-card-excerpt">${escapeHtml(article.excerpt)}</p>
            <div class="product-card-footer">
                ${priceDisplay ? `<div class="product-card-price">${priceDisplay}</div>` : '<div class="product-card-price free">Gratuit</div>'}
                <button class="btn btn-primary btn-buy-related">
                    <i class="fa-solid fa-shopping-cart"></i> Voir
                </button>
            </div>
        </div>
    `;

    const articleUrl = `article.html?id=${article.id}`;

    const handleBuyClick = (e) => {
        e.preventDefault();
        if (article.isPaid) {
            showPaymentModal(article.title, priceDisplay, article.id);
        } else {
            window.location.href = articleUrl;
        }
    };

    const handleLinkClick = (e) => {
        e.preventDefault();
        window.location.href = articleUrl;
    };

    productCard.querySelector('.btn-buy-related').addEventListener('click', handleBuyClick);
    productCard.querySelector('.product-card-image-link').addEventListener('click', handleLinkClick);
    productCard.querySelector('.product-card-link').addEventListener('click', handleLinkClick);

    return productCard;
}

/**
 * Affiche la modale de paiement (copiée depuis blog.js pour la cohérence).
 */
function showPaymentModal(articleTitle, price, articleId) {
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) existingModal.remove();

    const escapeHtml = window.AppUtils.escapeHtml;
    const paymentNumber = "0993575428";
    const beneficiaryName = "AKILIMALI NATHANAEL";

    let modalHTML = `
        <div class="modal-overlay" id="paymentModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fa-solid fa-shield-halved"></i> Finaliser votre Achat</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Pour débloquer "<strong>${escapeHtml(articleTitle)}</strong>", suivez ces étapes :</p>
                    <div class="payment-steps">
                        <div class="payment-step"><div class="step-number">1</div><div class="step-content"><h4>Payez avec Airtel Money</h4><div class="payment-details-card"><div class="payment-logo-airtel"></div><div class="payment-info centered"><span class="info-label">Montant :</span><span class="info-value price">${escapeHtml(price)}</span></div><div class="payment-info"><span class="info-label">Numéro :</span><div class="info-value-group"><span class="info-value number" id="paymentNumberToCopy">${paymentNumber}</span><button class="btn-copy" id="copyNumberBtn" title="Copier"><i class="fa-regular fa-copy"></i></button></div></div><div class="payment-info beneficiary"><span class="info-label">Bénéficiaire :</span><span class="info-value name">${beneficiaryName}</span></div></div></div></div>
                        <div class="payment-step"><div class="step-number">2</div><div class="step-content"><h4>Envoyez votre preuve</h4><p class="step-description">Cliquez ci-dessous pour téléverser la capture d'écran de votre transaction.</p><button id="uploadProofBtn" class="btn btn-primary" style="width: 100%;"><i class="fa-solid fa-upload"></i> J'ai payé, envoyer ma preuve</button><div id="uploadStatus" class="mt-1"></div></div></div>
                    </div>
                    <p class="payment-footer"><i class="fa-solid fa-shield-alt"></i> Votre accès sera activé dans votre tableau de bord après validation.</p>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('paymentModal');
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('copyNumberBtn')?.addEventListener('click', () => { navigator.clipboard.writeText(paymentNumber); });
    document.getElementById('uploadProofBtn').addEventListener('click', () => { /* Logique de téléversement... */ });
}
