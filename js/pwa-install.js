/**
 * Business Mobile Afrique - PWA Install Handler
 * Gère l'affichage de la modale et du bouton d'installation personnalisé.
 */

let deferredPrompt;
const installModal = document.getElementById('pwaInstallModal');
const installBtn = document.getElementById('pwaInstallBtn');
const closeInstallBtn = document.getElementById('pwaCloseInstallBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Empêche le navigateur d'afficher sa propre bannière
    e.preventDefault();
    // Sauvegarde l'événement pour pouvoir le déclencher plus tard
    deferredPrompt = e;

    // Affiche le bouton d'installation dans le menu principal
    const installMenuItem = document.getElementById('installAppMenuItem');
    if (installMenuItem) {
        installMenuItem.style.display = 'block';
        installMenuItem.addEventListener('click', handleInstallClick);
    }

    // Affiche notre modale personnalisée (si elle existe et n'a pas été refusée)
    if (installModal && !localStorage.getItem('pwaInstallDismissed')) {
        setTimeout(() => { installModal.style.display = 'flex'; }, 3000);
    }
});

// Gère le clic sur n'importe quel bouton d'installation (modale ou menu)
async function handleInstallClick(event) {
    const clickedButton = event.currentTarget; // Le bouton qui a été cliqué

    if (deferredPrompt) {
        // Affiche un état de chargement sur le bouton
        clickedButton.disabled = true;
        clickedButton.innerHTML = '<div class="spinner-small"></div> Installation...';

        // Affiche la boîte de dialogue d'installation du navigateur
        deferredPrompt.prompt();
        // Attend le choix de l'utilisateur
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Choix de l'utilisateur : ${outcome}`);

        if (outcome === 'accepted') {
            // L'utilisateur a accepté, on cache tous les boutons d'installation
            document.querySelectorAll('.install-btn-wrapper').forEach(el => el.style.display = 'none');
            showAlert('Application installée avec succès !', 'success');
        } else {
            // L'utilisateur a refusé, on réactive le bouton
            clickedButton.disabled = false;
            clickedButton.innerHTML = '<i class="fa-solid fa-download"></i> Installer l\'Appli';
        }

        // On ne peut utiliser le prompt qu'une seule fois
        deferredPrompt = null;
        // Cache la modale
        if (installModal) installModal.style.display = 'none';
    }
}

// Attache l'événement au bouton de la modale
installBtn?.addEventListener('click', handleInstallClick);

closeInstallBtn?.addEventListener('click', () => {
    if (installModal) installModal.style.display = 'none';
    // On sauvegarde le fait que l'utilisateur a fermé la modale pour ne plus l'embêter
    localStorage.setItem('pwaInstallDismissed', 'true');
});