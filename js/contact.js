/**
 * Business Mobile Afrique - Contact Form JavaScript
 * Gestion du formulaire de contact
 */

document.addEventListener('DOMContentLoaded', function() {
    // ✅ MODIFICATION : On vérifie si l'utilisateur est connecté
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // Si l'utilisateur est connecté, on le redirige vers le chat
            // On remplace le contenu de la page pour l'informer
            const container = document.querySelector('.section .container');
            container.innerHTML = `<div class="text-center p-3"><p>Vous êtes connecté. Redirection vers votre messagerie privée...</p><div class="spinner"></div></div>`;
            window.location.replace('/user-chat.html');
        } else {
            // Sinon, on active le formulaire de contact normal
            setupContactForm();
        }
    });
});

/**
 * Setup contact form submission
 */
function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value.trim(),
            status: 'new',
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validation
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            showFormAlert('Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }

        // Email validation
        if (!isValidEmail(formData.email)) {
            showFormAlert('Veuillez entrer une adresse e-mail valide.', 'error');
            return;
        }

        try {
            await window.db.collection('contacts').add(formData);

            showFormAlert('✅ Merci ! Votre message a été envoyé avec succès. Nous vous répondrons dans les 24-48 heures.', 'success');
            form.reset();

        } catch (error) {
            console.error('Error submitting contact form:', error);
            showFormAlert('❌ Une erreur est survenue. Veuillez réessayer ou nous contacter directement par WhatsApp.', 'error');
        }
    });
}

/**
 * Show form alert
 */
function showFormAlert(message, type) {
    const alertContainer = document.getElementById('formAlert');
    if (!alertContainer) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    // Scroll to alert
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Auto-hide success messages after 10 seconds
    if (type === 'success') {
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 300);
        }, 10000);
    }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
