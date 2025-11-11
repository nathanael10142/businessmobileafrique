/**
 * Business Mobile Afrique - Gestion des Utilisateurs (Admin)
 */

let allUsers = []; // Stocke tous les utilisateurs pour un filtrage rapide

document.addEventListener('DOMContentLoaded', function() {
    loadUsers();

    // Configure la barre de recherche
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});

/**
 * Filtre les utilisateurs affichés en fonction de la saisie dans la barre de recherche.
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredUsers = allUsers.filter(user => {
        const name = user.displayName?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        return name.includes(searchTerm) || email.includes(searchTerm);
    });
    renderUsers(filteredUsers);
}
/**
 * Charge et affiche la liste des utilisateurs.
 */
async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner"></div></td></tr>`;

    try {
        const snapshot = await window.db.collection('users').orderBy('createdAt', 'desc').get();
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderUsers(allUsers);

    } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erreur de chargement des utilisateurs.</td></tr>';
    }
}

/**
 * Affiche une liste d'utilisateurs dans le tableau.
 * @param {Array} users - Le tableau d'objets utilisateur à afficher.
 */
function renderUsers(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Aucun utilisateur ne correspond à votre recherche.</td></tr>';
        return;
    }

    const usersHtml = users.map(user => createUserRow(user)).join('');
    tableBody.innerHTML = usersHtml;
    
    // On s'assure que les boutons fonctionnent après chaque rendu
    setupActionButtons();
}

/**
 * Crée le HTML pour une ligne du tableau d'utilisateurs.
 * @param {object} user - L'objet utilisateur.
 * @returns {string} Le HTML de la ligne (tr).
 */
function createUserRow(user) {
    const displayName = window.AppUtils.escapeHtml(user.displayName || 'N/A');
    const email = window.AppUtils.escapeHtml(user.email || 'N/A');
    const createdAt = user.createdAt ? new Date(user.createdAt.seconds ? user.createdAt.toDate() : user.createdAt).toLocaleDateString('fr-FR') : 'Inconnue';
    const isAdmin = user.role === 'admin';

    // Génère un avatar simple basé sur les initiales
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
    const avatarHtml = `<div class="avatar" title="${displayName}">${initials}</div>`;

    const roleSelectHtml = `
        <select class="form-select form-select-sm" data-id="${user.id}" data-action="change-role">
            <option value="user" ${!isAdmin ? 'selected' : ''}>Utilisateur</option>
            <option value="admin" ${isAdmin ? 'selected' : ''}>Admin</option>
        </select>
    `;

    return `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-1">
                    ${avatarHtml}
                    <span>${displayName}</span>
                </div>
            </td>
            <td>${email}</td>
            <td>${roleSelectHtml}</td>
            <td>${createdAt}</td>
            <td class="admin-actions">
                <button class="btn btn-sm btn-danger" data-id="${user.id}" data-action="delete" title="Supprimer l'utilisateur">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

/**
 * Configure les écouteurs d'événements pour les actions (changement de rôle, suppression).
 */
function setupActionButtons() {
    const tableBody = document.getElementById('usersTableBody');

    tableBody.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action="delete"]');
        if (button) {
            const userId = button.dataset.id;
            deleteUser(userId);
        }
    });

    tableBody.addEventListener('change', (event) => {
        const select = event.target.closest('select[data-action="change-role"]');
        if (select) {
            const userId = select.dataset.id;
            const newRole = select.value;
            changeUserRole(userId, newRole);
        }
    });
}

/**
 * Change le rôle d'un utilisateur dans Firestore.
 * @param {string} userId - L'ID de l'utilisateur.
 * @param {string} newRole - Le nouveau rôle ('user' ou 'admin').
 */
async function changeUserRole(userId, newRole) {
    if (!userId || !newRole) return;

    try {
        await window.db.collection('users').doc(userId).update({
            role: newRole
        });
        window.AdminUtils.showAlert('Rôle mis à jour avec succès.', 'success', 'alertContainer');
    } catch (error) {
        console.error("Erreur lors du changement de rôle:", error);
        window.AdminUtils.showAlert(`Erreur lors de la mise à jour du rôle : ${error.message}`, 'error', 'alertContainer');
        // Recharger pour annuler le changement visuel en cas d'échec
        loadUsers();
    }
}

/**
 * Supprime un utilisateur de Firestore.
 * @param {string} userId - L'ID de l'utilisateur à supprimer.
 */
async function deleteUser(userId) {
    if (!userId) return;

    if (!window.AdminUtils.confirmDelete("cet utilisateur et toutes ses données associées")) {
        return;
    }

    try {
        // Note : La suppression de l'utilisateur dans Firestore ne le supprime pas de Firebase Auth.
        // Pour une suppression complète, il faudrait utiliser les Fonctions Cloud pour appeler l'Admin SDK.
        // Pour ce projet, nous nous contentons de supprimer l'enregistrement dans la base de données.
        await window.db.collection('users').doc(userId).delete();
        
        window.AdminUtils.showAlert('Utilisateur supprimé de la base de données avec succès.', 'success', 'alertContainer');
        loadUsers(); // Recharger la liste
    } catch (error) {
        console.error("Erreur lors de la suppression de l'utilisateur:", error);
        window.AdminUtils.showAlert('Erreur lors de la suppression de l\'utilisateur.', 'error', 'alertContainer');
    }
}