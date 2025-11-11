/**
 * Business Mobile Afrique - Main JavaScript
 * Gestion des fonctionnalités globales du site
 */

// ============================================
// DYNAMIC NAVIGATION
// ============================================
function updateNavigation(user) {
    const mainNav = document.getElementById('mainNav');
    if (!mainNav) return;

    let navHTML = `
        <ul class="main-nav-list">
            <li><a href="index.html">Accueil</a></li>
            <li><a href="blog.html" class="btn-nav">Boutique</a></li>
            <li><a href="blog.html">Blog</a></li>
            <li><a href="contact.html">Contact</a></li>
    `;

    if (user) {
        // User is logged in
        navHTML += `
            <li class="nav-action-item"><a href="user-dashboard.html" class="btn-nav">Tableau de Bord</a></li>
            <li class="nav-action-item"><a href="#" id="logoutBtn" class="btn-nav-secondary">Déconnexion</a></li>
        `; // ✅ CLASSE AJOUTÉE
    } else {
        // User is logged out
        navHTML += `
            <li class="nav-action-item"><a href="login.html" class="btn-nav-secondary">Connexion</a></li>
            <li class="nav-action-item"><a href="signup.html" class="btn-nav">S'inscrire</a></li>
        `; // ✅ CLASSE AJOUTÉE
    }

    // ✅ AJOUT : Bouton d'installation de la PWA (caché par défaut)
    navHTML += `
        <li id="installAppMenuItem" class="nav-action-item install-btn-wrapper" style="display: none;"><a href="#" class="btn-nav"><i class="fa-solid fa-download"></i> Installer l'Appli</a></li>
    `;

    navHTML += '</ul>';
    mainNav.innerHTML = navHTML;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show alert message
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, error, info)
 * @param {HTMLElement} container - Container element
 */
function showAlert(message, type = 'info', container = null) {
    if (!container) {
        // Create a temporary alert at the top of the page
        container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '80px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '9999';
        container.style.maxWidth = '600px';
        container.style.width = '90%';
        document.body.appendChild(container);
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    container.innerHTML = '';
    container.appendChild(alertDiv);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => {
            if (container.parentElement === document.body) {
                document.body.removeChild(container);
            } else {
                container.innerHTML = '';
            }
        }, 300);
    }, 5000);
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, length = 150) {
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + '...';
}

// ============================================
// MAIN SCRIPT - DOMContentLoaded
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    
    // --- Get DOM Elements ---
    const navToggle = document.getElementById('navToggle');
    const mainNav = document.getElementById('mainNav');
    const searchInput = document.getElementById('searchInput');
    const header = document.querySelector('.site-header');

    // --- Initial Menu Population ---
    // This ensures the menu is never empty, fixing the "click but nothing shows" bug.
    updateNavigation(null);

    // --- Mobile Navigation Logic ---
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            navToggle.textContent = mainNav.classList.contains('active') ? '✕' : '☰';
        });

        document.addEventListener('click', function(event) {
            if (!mainNav.contains(event.target) && !navToggle.contains(event.target)) {
                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    navToggle.textContent = '☰';
                }
            }
        });
    }

    // --- Search Functionality ---
    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `blog.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    // --- Smooth Scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(event) {
            const href = link.getAttribute('href');
            if (href === '#') {
                event.preventDefault();
                return;
            }
            const target = document.querySelector(href);
            if (target) {
                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Header Scroll Effect ---
    if (header) {
        window.addEventListener('scroll', function() {
            header.classList.toggle('scrolled', window.scrollY > 80);
        });
    }

    // --- Fade-in Animation on Scroll ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    const observer = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    document.querySelectorAll('.fade-in, .section-title').forEach(element => {
        observer.observe(element);
    });

    // --- Authentication State & Dynamic Navigation ---
    firebase.auth().onAuthStateChanged(async (user) => {
        updateNavigation(user);

        // Re-attach logout event listener if user is logged in
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await firebase.auth().signOut();
                window.location.href = 'index.html';
            });
        }

        // Re-attach event listeners to close mobile menu on link click
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    navToggle.textContent = '☰';
                }
            });
        });
    });
});
