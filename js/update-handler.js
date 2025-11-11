/**
 * Business Mobile Afrique - Update Handler
 * Gère la détection et l'application des mises à jour du Service Worker.
 */

let newWorker;

/**
 * Affiche la modale de mise à jour.
 */
function showUpdateModal() {
    const modal = document.getElementById('updateAvailableModal');
    if (!modal) return;

    const updateBtn = modal.querySelector('#updateNowBtn');
    const laterBtn = modal.querySelector('#updateLaterBtn');

    modal.style.display = 'flex';

    updateBtn.onclick = () => {
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<div class="spinner-small"></div> Mise à jour...';
        if (newWorker) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    laterBtn.onclick = () => {
        modal.style.display = 'none';
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
        if (!reg.installing) {
            console.log('Service Worker déjà installé.');
        }

        reg.addEventListener('updatefound', () => {
            console.log('🔄 Nouvelle version du Service Worker trouvée. Installation en cours...');
            newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                    // Si un nouveau worker est installé mais pas encore actif,
                    // cela signifie qu'une mise à jour est prête.
                    if (navigator.serviceWorker.controller) {
                        console.log('✅ Mise à jour prête à être installée.');
                        showUpdateModal(); // On affiche la modale au lieu du bouton
                    }
                }
            });
        });
    });

    // Lorsque le nouveau Service Worker prend le contrôle, on recharge la page.
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        console.log('🚀 Nouveau contrôleur détecté. Rechargement de la page pour appliquer la mise à jour...');
        window.location.reload();
        refreshing = true;
    });
}