/**
 * Business Mobile Afrique - User Dashboard
 * Affiche les informations et les articles achetés par l'utilisateur.
 * 
 * ✅ VERSION CORRIGÉE - Tri côté client pour éviter les erreurs d'index Firestore
 */

document.addEventListener('DOMContentLoaded', function() {
    const auth = window.auth;

    // CORRECTION : On configure PDF.js une seule fois au chargement.
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('welcomeMessage').textContent = `Bienvenue, ${user.displayName || 'Utilisateur'} !`;
            loadPurchasedArticles(user.uid);
            loadPendingConfirmations(user.uid);
            loadSuggestionResponses(user.uid);
        }
    });
});

/**
 * Charge les articles achetés par l'utilisateur.
 * @param {string} userId - L'UID de l'utilisateur connecté.
 */
async function loadPurchasedArticles(userId) {
    const container = document.getElementById('purchasedArticlesContainer');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const purchasesSnapshot = await window.db.collection('purchases')
            .where('userId', '==', userId)
            .get();

        if (purchasesSnapshot.empty) {
            container.innerHTML = `<p class="text-center" style="grid-column: 1 / -1;">Vous n'avez acheté aucun article pour le moment. <a href="blog.html">Découvrez nos articles</a>.</p>`;
            return;
        }

        // ✅ CORRECTION : On récupère tous les achats, puis on les trie côté client.
        // Cela évite d'avoir besoin d'un index composite complexe sur Firestore.
        const sortedPurchases = purchasesSnapshot.docs.sort((a, b) => {
            const dateA = new Date(a.data().purchaseDate);
            const dateB = new Date(b.data().purchaseDate);
            return dateB - dateA; // Tri descendant (plus récent en premier)
        });

        const articlePromises = sortedPurchases.map(purchaseDoc => {
            const purchase = purchaseDoc.data();
            // On vérifie que l'ID de l'article existe avant de faire la requête
            if (purchase.articleId) {
                return window.db.collection('articles').doc(purchase.articleId).get().then(articleDoc => {
                    if (articleDoc.exists) {
                        return {
                            purchase: purchase,
                            article: { id: articleDoc.id, ...articleDoc.data() }
                        };
                    }
                    return null;
                });
            }
            return Promise.resolve(null); // Si pas d'ID, on retourne une promesse résolue à null
        });

        const purchasedItems = (await Promise.all(articlePromises)).filter(item => item !== null);

        if (purchasedItems.length === 0) {
            container.innerHTML = `<p class="text-center" style="grid-column: 1 / -1;">Certains de vos articles achetés ne sont plus disponibles.</p>`;
            return;
        }

        // On nettoie le conteneur
        container.innerHTML = ''; 

        // On crée et on ajoute chaque carte une par une
        purchasedItems.forEach(({ purchase, article }, index) => {
            const cardElement = createArticleCard(article, purchase);
            container.appendChild(cardElement);
            // On ajoute une petite animation comme sur la page du blog
            setTimeout(() => {
                cardElement.classList.add('is-visible');
            }, index * 100);
        });

        // On ajoute l'écouteur d'événements pour les boutons "Accéder"
        setupActionButtons(container);

    } catch (error) {
        console.error("Erreur lors du chargement des articles achetés:", error);
        container.innerHTML = `<p class="text-center text-danger" style="grid-column: 1 / -1;">Erreur de chargement de vos articles.</p>`;
    }
}

/**
 * Crée la carte HTML pour un article acheté.
 * @param {object} article - Les données de l'article.
 * @param {object} purchase - Les données de l'achat.
 * @returns {HTMLElement} L'élément HTML de la carte.
 */
function createArticleCard(article, purchase) {
    const productCard = document.createElement('div');
    const now = new Date();
    const expiryDate = purchase.expiryDate ? new Date(purchase.expiryDate) : null;
    let remainingTime = -1; // Par défaut, on considère l'accès comme expiré s'il n'y a pas de date

    // On ne calcule le temps restant que si la date d'expiration est valide
    if (expiryDate && !isNaN(expiryDate)) {
        remainingTime = expiryDate - now;
    }

    let timeInfo = '';
    let isExpired = remainingTime <= 0;

    if (isExpired) {
        timeInfo = `<div class="product-card-price" style="background-color: var(--color-gray-dark); color: white; position: absolute; top: 1rem; right: 1rem; border-radius: 50px; padding: 0.25rem 0.75rem; font-size: 0.9rem;">Accès Expiré</div>`;
    } else {
        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        timeInfo = `<div class="product-card-price" style="background-color: var(--color-secondary); color: var(--color-primary); position: absolute; top: 1rem; right: 1rem; border-radius: 50px; padding: 0.25rem 0.75rem; font-size: 0.9rem;"><i class="fa-solid fa-clock"></i> ${hours}h ${minutes}m</div>`;
    }

    productCard.className = isExpired ? 'product-card fade-in is-expired' : 'product-card fade-in';
    
    // Le lien sur le titre et l'image mène toujours à la page de l'article pour voir les détails
    const articlePageLink = `article.html?id=${article.id}`;

    productCard.innerHTML = `
            <a href="${articlePageLink}" class="product-card-image-link">
                <img src="${article.imageUrl || 'https://images.unsplash.com/photo-1589998059171-988d887df646?q=80&w=2070&auto=format&fit=crop'}" alt="${window.AppUtils.escapeHtml(article.title)}" class="product-card-image" loading="lazy">
                ${timeInfo}
            </a>
            <div class="product-card-content">
                <h3 class="product-card-title">
                    <a href="${articlePageLink}">${window.AppUtils.escapeHtml(article.title)}</a>
                </h3>
                <p class="product-card-excerpt">${window.AppUtils.escapeHtml(article.excerpt)}</p>
                <div class="product-card-footer" style="border-top: none; padding-top: 0;">
                    <button 
                        class="btn btn-primary" 
                        data-action="read" 
                        data-file-url="${article.fileUrl}" 
                        data-title="${window.AppUtils.escapeHtml(article.title)}"
                        ${isExpired ? 'disabled' : ''} style="width: 100%;">
                        <i class="fa-solid ${isExpired ? 'fa-lock' : 'fa-book-open'}"></i> ${isExpired ? 'Expiré' : 'Accéder'}
                    </button>
                </div>
            </div>
    `;

    return productCard;
}

/**
 * Configure les boutons d'action sur les cartes d'articles.
 * @param {HTMLElement} container - Le conteneur des cartes.
 */
function setupActionButtons(container) {
    container.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action="read"]');
        if (button && !button.disabled) {
            const fileUrl = button.dataset.fileUrl;
            const title = button.dataset.title;
            showPdfModal(fileUrl, title);
        }
    });
}

/**
 * Affiche la modale avec le lecteur PDF.
 * @param {string} url - L'URL du fichier PDF.
 * @param {string} title - Le titre de l'article.
 */
function showPdfModal(url, title) {
    // LOGIQUE SIMPLIFIÉE : Ouvre directement le fichier PDF dans un nouvel onglet.
    // Le navigateur utilisera son lecteur PDF intégré. C'est la solution la plus simple et la plus fiable,
    // qui inclut déjà les options de téléchargement, d'impression et de zoom.
    window.open(url, '_blank');
}

/**
 * Affiche un PDF dans le canvas de la modale.
 * @param {string} url - L'URL du fichier PDF.
 */
async function renderPdf(url) {
    // On vérifie que les éléments existent (la fonction est maintenant appelée depuis viewer.html)
    if (!document.getElementById('pdf-render-area')) {
        return;
    }

    const renderArea = document.getElementById('pdf-render-area');
    const pageIndicator = document.getElementById('pdf-page-indicator');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    
    renderArea.innerHTML = '<div class="spinner"></div>';
    let currentScale = 1.5;
    let pdfInstance = null;

    try {
        const loadingTask = pdfjsLib.getDocument(url);
        pdfInstance = await loadingTask.promise;
        const numPages = pdfInstance.numPages;

        renderArea.innerHTML = ''; // Nettoyer le spinner

        // Créer un conteneur pour chaque page
        const pagePromises = [];
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const canvas = document.createElement('canvas');
            renderArea.appendChild(canvas);
            pagePromises.push(renderSinglePage(pdfInstance, pageNum, canvas, currentScale));
        }

        await Promise.all(pagePromises);

        // Mise à jour de l'indicateur de page au défilement
        const viewerContent = document.getElementById('pdf-viewer-content');
        viewerContent.onscroll = () => {
            let currentPage = 1;
            const canvases = renderArea.querySelectorAll('canvas');
            for (let i = 0; i < canvases.length; i++) {
                const canvasRect = canvases[i].getBoundingClientRect();
                if (canvasRect.top < viewerContent.clientHeight / 2) {
                    currentPage = i + 1;
                }
            }
            pageIndicator.textContent = `Page ${currentPage} / ${numPages}`;
        };
        pageIndicator.textContent = `Page 1 / ${numPages}`;

        // Logique de zoom
        const updateZoom = async (newScale) => {
            currentScale = newScale;
            const canvases = renderArea.querySelectorAll('canvas');
            const updatePromises = [];
            for (let i = 0; i < canvases.length; i++) {
                updatePromises.push(renderSinglePage(pdfInstance, i + 1, canvases[i], currentScale));
            }
            await Promise.all(updatePromises);
        };

        // ✅ CORRECTION : On ajoute des limites pour le zoom.
        const MAX_ZOOM = 3.0; // Limite maximale pour ne pas faire disparaître les boutons.
        const MIN_ZOOM = 0.5; // Limite minimale pour que le texte reste lisible.

        zoomInBtn.onclick = () => { if (currentScale < MAX_ZOOM) updateZoom(currentScale + 0.2); };
        zoomOutBtn.onclick = () => { if (currentScale > MIN_ZOOM) updateZoom(currentScale - 0.2); };

    } catch (error) {
        console.error('Erreur lors du chargement du PDF:', error);
        renderArea.innerHTML = `<div class="text-center p-3 text-danger">Erreur de chargement du document.</div>`;
    }
}

/**
 * Rend une seule page du PDF sur un canvas donné.
 */
async function renderSinglePage(pdf, pageNum, canvas, scale) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: scale });
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
}

/**
 * Télécharge un fichier PDF directement sans redirection.
 * @param {string} url - L'URL du fichier PDF.
 * @param {string} filename - Le nom souhaité pour le fichier.
 */
async function downloadPdf(url, filename) {
    const downloadBtn = document.getElementById('pdf-download-btn');
    downloadBtn.innerHTML = '<div class="spinner-small"></div>';
    downloadBtn.disabled = true;

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Libérer la mémoire
        
    } catch (error) {
        console.error("Erreur de téléchargement:", error);
    } finally {
        downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
        downloadBtn.disabled = false;
    }
}

/**
 * ✅ CORRIGÉ : Charge et affiche les demandes de confirmation de paiement.
 * Tri côté client pour éviter les erreurs d'index Firestore.
 * @param {string} userId - L'UID de l'utilisateur connecté.
 */
async function loadPendingConfirmations(userId) {
    const container = document.getElementById('pendingConfirmationsContainer');
    if (!container) return; // Si le conteneur n'existe pas, on ne fait rien

    container.innerHTML = '<div class="spinner"></div>';

    try {
        // ✅ SUPPRESSION de orderBy() pour éviter l'erreur d'index Firestore
        const snapshot = await window.db.collection('payment_confirmations')
            .where('userId', '==', userId)
            .get();

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-center">Aucune demande de paiement récente.</p>`;
            return;
        }

        // ✅ TRI CÔTÉ CLIENT (comme pour les articles achetés)
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const dateA = new Date(a.data().requestDate);
            const dateB = new Date(b.data().requestDate);
            return dateB - dateA; // Plus récent en premier
        }).slice(0, 5); // Limiter à 5

        const itemsHtml = sortedDocs.map(doc => {
            const request = doc.data();
            const date = new Date(request.requestDate).toLocaleString('fr-FR');
            let statusHtml = '';

            switch (request.status) {
                case 'pending':
                    statusHtml = `<span class="badge status-pending"><i class="fa-solid fa-hourglass-half"></i> En attente</span>`;
                    break;
                case 'confirmed':
                    statusHtml = `<span class="badge status-published"><i class="fa-solid fa-check-circle"></i> Confirmé</span>`;
                    break;
                case 'rejected':
                    statusHtml = `<span class="badge status-draft"><i class="fa-solid fa-times-circle"></i> Refusé</span>`;
                    break;
            }

            return `
                <div class="confirmation-item">
                    <div class="item-details">
                        <strong>${window.AppUtils.escapeHtml(request.articleTitle)}</strong>
                        <small>${date}</small>
                    </div>
                    <div class="item-status">
                        ${statusHtml}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = itemsHtml;

    } catch (error) {
        console.error("Erreur lors du chargement des confirmations:", error);
        container.innerHTML = `<p class="text-center text-danger">Erreur de chargement de vos demandes.</p>`;
    }
}

/**
 * ✅ CORRIGÉ : Charge les réponses aux suggestions de l'utilisateur.
 * Tri côté client pour éviter les erreurs d'index Firestore.
 * @param {string} userId - L'UID de l'utilisateur connecté.
 */
async function loadSuggestionResponses(userId) {
    const container = document.getElementById('suggestionResponsesContainer');
    if (!container) return;

    container.innerHTML = '<div class="spinner"></div>';

    try {
        // ✅ SUPPRESSION de orderBy() pour éviter l'erreur d'index Firestore
        const snapshot = await window.db.collection('suggestions')
            .where('userId', '==', userId)
            .where('status', '==', 'replied')
            .get();

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-center">Vous n'avez pas encore de réponse à vos suggestions.</p>`;
            return;
        }

        // ✅ TRI CÔTÉ CLIENT
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const dateA = new Date(a.data().replyDate);
            const dateB = new Date(b.data().replyDate);
            return dateB - dateA; // Plus récent en premier
        }).slice(0, 5); // Limiter à 5

        const itemsHtml = sortedDocs.map(doc => {
            const response = doc.data();
            const date = new Date(response.replyDate).toLocaleString('fr-FR');
            // ✅ CORRECTION DE SÉCURITÉ : Le lien redirige vers la page de l'article.
            // La page article.html se chargera de vérifier les droits d'accès.
            const articleUrl = `article.html?id=${response.repliedWithArticleId}`;
            return `
                <a href="${articleUrl}" class="confirmation-item" style="text-decoration: none; color: inherit;">
                    <div class="item-details">
                        <strong>${window.AppUtils.escapeHtml(response.repliedWithArticleTitle)}</strong>
                        <small>Suite à votre suggestion : "${window.AppUtils.escapeHtml(response.suggestionText)}"</small>
                    </div>
                    <div class="item-status">
                        <button class="btn btn-primary btn-sm">
                            <i class="fa-solid fa-shopping-cart"></i> Voir
                        </button>
                    </div>
                </a>
            `;
        }).join('');

        container.innerHTML = itemsHtml;

    } catch (error) {
        console.error("Erreur lors du chargement des réponses aux suggestions:", error);
        container.innerHTML = `<p class="text-center text-danger">Erreur de chargement de vos réponses.</p>`;
    }
}
