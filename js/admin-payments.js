/**
 * Business Mobile Afrique - Gestion des Paiements (Admin)
 * Validation des demandes de confirmation de paiement.
 */

document.addEventListener('DOMContentLoaded', function() {
    loadPendingRequests();
});

/**
 * Charge et affiche les demandes de confirmation en attente.
 */
async function loadPendingRequests() {
    const requestsBody = document.getElementById('requestsTableBody');
    requestsBody.innerHTML = `<tr><td colspan="4" class="text-center"><div class="spinner"></div></td></tr>`;

    /**
     * Gère la confirmation ou le refus d'une demande.
     * @param {string} requestId - L'ID de la demande.
     * @param {'confirmed' | 'rejected'} newStatus - Le nouveau statut.
     */
    window.handleRequest = async function(requestId, newStatus) {
        // On cible le bouton cliqué pour le désactiver
        const button = event.target.closest('button');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0 auto;"></div>';
        }

        try {
            const requestRef = window.db.collection('payment_confirmations').doc(requestId);
            const requestDoc = await requestRef.get();
            if (!requestDoc.exists) throw new Error("Demande introuvable.");

            const requestData = requestDoc.data();

            if (newStatus === 'confirmed') {
                // 1. Créer l'achat officiel pour l'utilisateur
                // ✅ CORRECTION : On récupère le vrai prix de l'article avant de créer l'achat.
                const articleDoc = await window.db.collection('articles').doc(requestData.articleId).get();
                if (!articleDoc.exists) {
                    throw new Error("L'article associé à cet achat n'existe plus.");
                }
                const articleData = articleDoc.data();

                const now = new Date();
                const expiryDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h

                await window.db.collection('purchases').add({
                    userId: requestData.userId,
                    articleId: requestData.articleId,
                    // ✅ AJOUT : On stocke le titre directement pour un accès plus rapide.
                    articleTitle: articleData.title,
                    purchaseDate: now.toISOString(),
                    // ✅ CORRECTION : On enregistre l'objet prix complet, pas juste une chaîne.
                    price: articleData.price,
                    expiryDate: expiryDate.toISOString(),
                    paymentMethod: 'Airtel Money (Manual)',
                });

                // 2. Mettre à jour le statut de la demande
                await requestRef.update({ status: 'confirmed' });

                // 3. Afficher le message de succès. L'enregistrement dans "purchases" est suffisant pour la comptabilité.
                window.AdminUtils.showAlert('Achat confirmé et accès accordé !', 'success', 'requestsAlert');

            } else {
                // Simplement mettre à jour le statut pour refuser
                await requestRef.update({ status: 'rejected' });
                window.AdminUtils.showAlert('Demande refusée.', 'info', 'requestsAlert');
            }

            // Recharger la liste pour enlever la demande traitée
            loadPendingRequests();
            
        } catch (error) {
            console.error("Erreur lors du traitement de la demande:", error);
            window.AdminUtils.showAlert(`Erreur: ${error.message}`, 'error', 'requestsAlert');
            if (button) button.disabled = false; // Réactiver le bouton en cas d'erreur
        }
    };

    try {
        const snapshot = await window.db.collection('payment_confirmations')
            .where('status', '==', 'pending')
            .orderBy('requestDate', 'asc')
            .get();

        if (snapshot.empty) {
            requestsBody.innerHTML = `<tr><td colspan="4" class="text-center">Aucune demande en attente.</td></tr>`;
            return;
        }

        const rows = snapshot.docs.map(doc => {
            const request = { id: doc.id, ...doc.data() };
            return `
                <tr>
                    <td>${window.AppUtils.escapeHtml(request.userDisplayName)}</td>
                    <td>${window.AppUtils.escapeHtml(request.articleTitle)}</td>
                    <td>
                        <a href="${request.screenshotUrl}" target="_blank" class="btn btn-sm btn-secondary">
                            <i class="fa-solid fa-image"></i> Voir la capture
                        </a>
                    </td>
                    <td class="admin-actions">
                        <button onclick="handleRequest('${request.id}', 'confirmed')" class="btn btn-sm btn-success">
                            <i class="fa-solid fa-check"></i> Confirmer
                        </button>
                        <button onclick="handleRequest('${request.id}', 'rejected')" class="btn btn-sm btn-danger">
                            <i class="fa-solid fa-times"></i> Refuser
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        requestsBody.innerHTML = rows;

    } catch (error) {
        console.error("Erreur lors du chargement des demandes:", error);
        requestsBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erreur de chargement des demandes.</td></tr>`;
    }
}
