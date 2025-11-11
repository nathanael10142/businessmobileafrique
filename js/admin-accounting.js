/**
 * Business Mobile Afrique - Admin Accounting
 * Gestion de la comptabilité : revenus, dépenses et soldes.
 */

document.addEventListener('DOMContentLoaded', function() {
    const addExpenseForm = document.getElementById('addExpenseForm');
    
    // S'assurer que la base de données est initialisée
    if (!window.db) {
        console.error("Firestore is not initialized. Make sure firebase-init.js is loaded correctly.");
        window.AdminUtils.showAlert("Erreur critique : la base de données n'est pas accessible.", 'error', 'expenseAlert');
        return;
    }

    loadAccountingData();

    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', handleAddExpense);
    }

    // Gérer la soumission du formulaire de la modale d'édition
    const editExpenseForm = document.getElementById('editExpenseForm');
    if (editExpenseForm) {
        editExpenseForm.addEventListener('submit', handleUpdateExpense);
    }
});

/**
 * Charge toutes les données comptables (revenus et dépenses) et met à jour l'interface.
 */
async function loadAccountingData() {
    const historyBody = document.getElementById('transactionsHistoryBody');
    historyBody.innerHTML = `<tr><td colspan="5" class="text-center"><div class="spinner"></div></td></tr>`;

    try {
        // 1. Récupérer toutes les ventes (purchases)
        // ✅ CORRECTION : On convertit la date en objet Date dès la lecture.
        const purchasesSnapshot = await window.db.collection('purchases').get();
        const allPurchases = purchasesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, type: 'income', transactionDate: new Date(data.purchaseDate) };
        });

        // 2. Récupérer toutes les dépenses (expenses)
        // ✅ CORRECTION : On convertit la date en objet Date dès la lecture.
        const expensesSnapshot = await window.db.collection('expenses').get();
        const allExpenses = expensesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, type: 'expense', transactionDate: new Date(data.date) };
        });

        // 3. Fusionner et trier les transactions par date
        const allTransactions = [...allPurchases, ...allExpenses].sort((a, b) => b.transactionDate - a.transactionDate);

        // 4. Calculer et afficher les soldes
        calculateAndDisplayBalances(allPurchases, allExpenses);

        // 5. Afficher l'historique des transactions
        displayTransactionsHistory(allTransactions);

    } catch (error) {
        console.error("Erreur lors du chargement des données comptables:", error);
        window.AdminUtils.showAlert("Impossible de charger les données financières.", 'error', 'expenseAlert');
        historyBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erreur de chargement des données.</td></tr>`;
    }
}

/**
 * Calcule et affiche les soldes nets, les revenus et les dépenses.
 * @param {Array} purchases - La liste des achats (revenus).
 * @param {Array} expenses - La liste des dépenses.
 */
function calculateAndDisplayBalances(purchases, expenses) {
    const totalIncomeUSD = purchases.reduce((sum, p) => sum + (p.price?.usd || 0), 0);
    const totalIncomeCDF = purchases.reduce((sum, p) => sum + (p.price?.cdf || 0), 0);

    const totalExpensesUSD = expenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesCDF = expenses.filter(e => e.currency === 'CDF').reduce((sum, e) => sum + e.amount, 0);

    const netBalanceUSD = totalIncomeUSD - totalExpensesUSD;
    const netBalanceCDF = totalIncomeCDF - totalExpensesCDF;

    document.getElementById('totalIncomeUSD').textContent = `+${(totalIncomeUSD || 0).toFixed(2)} USD`;
    document.getElementById('totalIncomeCDF').textContent = `+${(totalIncomeCDF || 0).toLocaleString('fr-FR')} CDF`;
    
    document.getElementById('totalExpensesUSD').textContent = `- ${(totalExpensesUSD || 0).toFixed(2)} USD`;
    document.getElementById('totalExpensesCDF').textContent = `- ${(totalExpensesCDF || 0).toLocaleString('fr-FR')} CDF`;

    document.getElementById('netBalanceUSD').textContent = `${netBalanceUSD.toFixed(2)} USD`;
    document.getElementById('netBalanceCDF').textContent = `${netBalanceCDF.toLocaleString('fr-FR')} CDF`;
}

/**
 * Affiche l'historique des transactions dans le tableau.
 * @param {Array} transactions - La liste fusionnée des transactions (achats et dépenses).
 */
function displayTransactionsHistory(transactions) {
    const historyBody = document.getElementById('transactionsHistoryBody');
    historyBody.innerHTML = ''; // Vider l'ancien contenu

    if (transactions.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="5" class="text-center">Aucune transaction pour le moment.</td></tr>';
        return;
    }

    transactions.forEach(tx => {
        const isIncome = tx.type === 'income';
        // ✅ CORRECTION DÉFINITIVE : On imite la logique de admin-users.js pour une gestion robuste de la date.
        const rawDate = tx.type === 'income' ? tx.purchaseDate : tx.date;
        const date = rawDate ? new Date(rawDate.seconds ? rawDate.toDate() : rawDate) : null;
        const formattedDate = date ? date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date inconnue';

        const description = isIncome ? `Vente: ${tx.articleTitle || 'Article inconnu'}` : tx.description;
        const amount = isIncome 
            // On gère le cas où le prix n'existerait pas dans d'anciennes transactions
            ? (tx.price?.usd ? `${tx.price.usd.toFixed(2)} USD` : 
              (tx.price?.cdf ? `${tx.price.cdf.toLocaleString('fr-FR')} CDF` : 'N/A'))
            : `${tx.amount.toLocaleString('fr-FR')} ${tx.currency}`;
        const amountClass = isIncome ? 'text-success' : 'text-danger';

        // ✅ AJOUT : Boutons d'action
        const actionsHtml = `
            <td class="admin-actions">
                ${!isIncome ? `<button class="btn btn-sm btn-primary" data-action="edit" data-id="${tx.id}" title="Modifier"><i class="fa-solid fa-pen"></i></button>` : ''}
                <button class="btn btn-sm btn-danger" data-action="delete" data-id="${tx.id}" data-type="${tx.type}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;

        const row = `
            <tr>
                <td>${formattedDate}</td>
                <td>${window.AppUtils.escapeHtml(description)}</td>
                <td>
                    <span class="badge ${isIncome ? 'status-published' : 'status-draft'}">
                        ${isIncome ? 'Revenu' : 'Dépense'}
                    </span>
                </td>
                ${actionsHtml}
                <td class="${amountClass}">${isIncome ? '+' : '-'} ${amount}</td>
            </tr>
        `;
        historyBody.innerHTML += row;
    });

    // ✅ AJOUT : Configurer les écouteurs pour les nouveaux boutons
    setupActionListeners();
}

/**
 * Gère l'ajout d'une nouvelle dépense.
 * @param {Event} e - L'événement de soumission du formulaire.
 */
async function handleAddExpense(e) {
    e.preventDefault();
    const form = e.target;
    const description = document.getElementById('expenseDescription').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const currency = document.getElementById('expenseCurrency').value;
    const alertContainer = document.getElementById('expenseAlert');

    if (!description || isNaN(amount) || amount <= 0) {
        window.AdminUtils.showAlert("Veuillez remplir tous les champs correctement.", 'error', 'expenseAlert');
        return;
    }

    try {
        const expenseData = {
            description,
            amount,
            currency,
            date: new Date().toISOString()
        };

        await window.db.collection('expenses').add(expenseData);

        window.AdminUtils.showAlert("Dépense enregistrée avec succès !", 'success', 'expenseAlert');
        form.reset();

        // Recharger toutes les données pour mettre à jour l'interface
        loadAccountingData();

    } catch (error) {
        console.error("Erreur lors de l'ajout de la dépense:", error);
        window.AdminUtils.showAlert("Une erreur est survenue lors de l'enregistrement.", 'error', 'expenseAlert');
    }
}

/**
 * Configure les écouteurs d'événements pour les boutons d'action du tableau.
 */
function setupActionListeners() {
    const historyBody = document.getElementById('transactionsHistoryBody');
    historyBody.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        const type = button.dataset.type;

        if (action === 'delete') {
            deleteTransaction(id, type);
        } else if (action === 'edit') {
            openEditModal(id);
        }
    });
}

/**
 * Supprime une transaction (revenu ou dépense).
 * @param {string} id - L'ID de la transaction.
 * @param {string} type - Le type ('income' ou 'expense').
 */
async function deleteTransaction(id, type) {
    if (!window.AdminUtils.confirmDelete("cette transaction")) return;

    const collectionName = type === 'income' ? 'purchases' : 'expenses';

    try {
        await window.db.collection(collectionName).doc(id).delete();
        window.AdminUtils.showAlert("Transaction supprimée avec succès.", 'success', 'expenseAlert');
        loadAccountingData(); // Recharger pour mettre à jour les soldes et la liste
    } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        window.AdminUtils.showAlert("Erreur lors de la suppression de la transaction.", 'error', 'expenseAlert');
    }
}

/**
 * Ouvre la modale d'édition et la pré-remplit avec les données de la dépense.
 * @param {string} id - L'ID de la dépense à modifier.
 */
async function openEditModal(id) {
    const modal = document.getElementById('editExpenseModal');
    const form = document.getElementById('editExpenseForm');

    try {
        const doc = await window.db.collection('expenses').doc(id).get();
        if (!doc.exists) {
            window.AdminUtils.showAlert("Dépense introuvable.", 'error', 'expenseAlert');
            return;
        }

        const expense = doc.data();
        document.getElementById('editExpenseId').value = id;
        document.getElementById('editExpenseDescription').value = expense.description;
        document.getElementById('editExpenseAmount').value = expense.amount;
        document.getElementById('editExpenseCurrency').value = expense.currency;

        modal.style.display = 'flex';

        // Gérer la fermeture de la modale
        modal.querySelector('.modal-close').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    } catch (error) {
        console.error("Erreur lors de l'ouverture de la modale:", error);
        window.AdminUtils.showAlert("Impossible d'ouvrir l'éditeur de dépense.", 'error', 'expenseAlert');
    }
}

/**
 * Gère la mise à jour d'une dépense depuis la modale.
 * @param {Event} e - L'événement de soumission du formulaire.
 */
async function handleUpdateExpense(e) {
    e.preventDefault();
    const id = document.getElementById('editExpenseId').value;
    const description = document.getElementById('editExpenseDescription').value;
    const amount = parseFloat(document.getElementById('editExpenseAmount').value);
    const currency = document.getElementById('editExpenseCurrency').value;
    const modal = document.getElementById('editExpenseModal');

    if (!id || !description || isNaN(amount) || amount <= 0) {
        window.AdminUtils.showAlert("Veuillez remplir tous les champs correctement.", 'error', 'editExpenseAlert');
        return;
    }

    const saveButton = e.target.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 0 auto;"></div>';

    try {
        const updatedData = {
            description,
            amount,
            currency
        };

        await window.db.collection('expenses').doc(id).update(updatedData);

        window.AdminUtils.showAlert("Dépense mise à jour avec succès !", 'success', 'expenseAlert');
        modal.style.display = 'none';
        loadAccountingData();

    } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        window.AdminUtils.showAlert("Erreur lors de la mise à jour.", 'error', 'editExpenseAlert');
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = 'Enregistrer les modifications';
    }
}