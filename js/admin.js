/**
 * Business Mobile Afrique - Admin JavaScript
 * Gestion de l'authentification et des fonctionnalités communes de l'admin
 */

// Simple authentication (for demo purposes - replace with proper auth in production)
// L'authentification est maintenant gérée par Firebase Auth et auth-guard.js

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    setupMobileMenu();
    setupLogout();
});

/**
 * Setup mobile menu toggle
 */
function setupMobileMenu() {
    const toggleBtn = document.getElementById('adminMenuToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
        const toggleSidebar = () => {
            sidebar.classList.toggle('is-open');
            overlay.classList.toggle('is-open');
        };
        toggleBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
    }
}

/**
 * Setup logout button
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebase.auth().signOut().then(() => {
                window.location.href = '/login.html';
            }).catch((error) => {
                console.error('Erreur de déconnexion:', error);
            });
        });
    }
}

/**
 * Show alert in admin panel
 */
function showAdminAlert(message, type = 'info', containerId = 'alertContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    container.innerHTML = '';
    container.appendChild(alertDiv);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => {
            container.innerHTML = '';
        }, 300);
    }, 5000);
}

/**
 * Format date for admin display
 */
function formatAdminDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Confirm delete action
 */
function confirmDelete(itemName = 'cet élément') {
    return confirm(`Êtes-vous sûr de vouloir supprimer ${itemName} ? Cette action est irréversible.`);
}

/**
 * Export admin utilities
 */
window.AdminUtils = {
    showAlert: showAdminAlert,
    formatDate: formatAdminDate,
    confirmDelete: confirmDelete
};
