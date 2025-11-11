# 🚀 Guide de Déploiement - Business Mobile Afrique

Ce guide vous accompagne étape par étape pour déployer votre site sur Firebase Hosting.

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

1. ✅ Un compte Google
2. ✅ Node.js installé sur votre ordinateur (version 14 ou supérieure)
3. ✅ Tous les fichiers du projet téléchargés

---

## 🔧 Étape 1 : Installation de Firebase CLI

Ouvrez votre terminal (Command Prompt sur Windows, Terminal sur Mac/Linux) et exécutez :

```bash
npm install -g firebase-tools
```

Vérifiez l'installation :
```bash
firebase --version
```

---

## 🔑 Étape 2 : Connexion à Firebase

Connectez-vous à votre compte Google :

```bash
firebase login
```

Une page web s'ouvrira pour vous connecter. Autorisez Firebase CLI à accéder à votre compte.

---

## 🌐 Étape 3 : Créer un Projet Firebase

### Option A : Via la Console Web

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Nommez votre projet : `business-mobile-afrique`
4. Désactivez Google Analytics (optionnel pour ce projet)
5. Cliquez sur "Créer le projet"

### Option B : Via le Terminal

```bash
firebase projects:create business-mobile-afrique
```

---

## 📂 Étape 4 : Configuration du Projet

Dans le dossier de votre projet, exécutez :

```bash
firebase use --add
```

Sélectionnez le projet que vous venez de créer et donnez-lui un alias (ex: `production`).

---

## 🚀 Étape 5 : Déploiement

### Déploiement Initial

Depuis le dossier de votre projet, exécutez :

```bash
firebase deploy
```

Attendez quelques minutes que le déploiement se termine.

### URL de Votre Site

Une fois terminé, Firebase affichera votre URL :
```
✔ Deploy complete!

Hosting URL: https://business-mobile-afrique.web.app
```

**🎉 Félicitations ! Votre site est en ligne !**

---

## 🔄 Mises à Jour Futures

Pour mettre à jour votre site après des modifications :

1. Modifiez vos fichiers localement
2. Exécutez à nouveau :
   ```bash
   firebase deploy
   ```

### Déploiement Rapide (Hosting uniquement)

Si vous voulez déployer uniquement le site (sans les fonctions) :

```bash
firebase deploy --only hosting
```

---

## 🧪 Test Local Avant Déploiement

Pour tester votre site en local avant de le déployer :

```bash
firebase serve
```

Ouvrez votre navigateur sur : `http://localhost:5000`

---

## 🌍 Configuration du Domaine Personnalisé

### Utiliser un Domaine Personnalisé

1. Allez dans [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Cliquez sur "Hosting" dans le menu
4. Cliquez sur "Ajouter un domaine personnalisé"
5. Suivez les instructions pour configurer vos DNS

---

## 📊 Activer l'API Table

Le site utilise l'API Table pour stocker les articles, commentaires et messages.

### Configuration Automatique

L'API Table est automatiquement disponible dans l'environnement de déploiement.

### Accès aux Données

Les données sont accessibles via :
```
https://votre-site.web.app/tables/articles
https://votre-site.web.app/tables/comments
https://votre-site.web.app/tables/contacts
```

---

## 🔒 Sécurité & Configuration

### 1. Changer le Mot de Passe Admin

**IMPORTANT** : Avant la mise en production, changez le mot de passe admin !

Dans le fichier `js/admin.js`, modifiez :
```javascript
const ADMIN_PASSWORD = 'VotreNouveauMotDePasseSecurise2025!';
```

### 2. Configuration des CORS

Si nécessaire, ajoutez dans `firebase.json` :
```json
{
  "hosting": {
    "headers": [
      {
        "source": "/tables/**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          }
        ]
      }
    ]
  }
}
```

---

## 📝 Articles Pré-chargés

Le site contient déjà 3 articles complets :

1. 🌐 Guide création site web mobile
2. 💪 10 astuces motivation business
3. 📱 Création page Facebook pro

Ces articles sont visibles immédiatement après le déploiement.

---

## 🎨 Personnalisation Post-Déploiement

### Modifier les Contacts

Mettez à jour vos coordonnées dans :
- Footer (toutes les pages HTML)
- Page Contact (`contact.html`)
- Page À Propos (`about.html`)

### Changer les Couleurs

Modifiez les variables CSS dans `css/style.css` :
```css
--color-primary: #000000;
--color-secondary: #D4AF37;
--color-gold: #FFD700;
```

---

## 🛠️ Commandes Utiles

### Voir les Logs
```bash
firebase functions:log
```

### Lister les Projets
```bash
firebase projects:list
```

### Voir le Statut du Déploiement
```bash
firebase deploy:list
```

### Annuler un Déploiement
```bash
firebase hosting:rollback
```

---

## ⚡ Optimisations Performance

### Cache Navigateur

Le fichier `firebase.json` configure automatiquement :
- Cache de 1 an pour les images
- Cache de 1 an pour CSS/JS
- URLs propres sans .html

### Vérifier les Performances

Utilisez [PageSpeed Insights](https://pagespeed.web.dev/) :
```
https://pagespeed.web.dev/?url=https://votre-site.web.app
```

---

## 🐛 Dépannage

### Erreur : "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Erreur : "Permission denied"
Utilisez `sudo` sur Mac/Linux :
```bash
sudo npm install -g firebase-tools
```

### Erreur : "Project not found"
Vérifiez que vous êtes dans le bon dossier :
```bash
pwd  # ou cd sur Windows
```

### Le Site ne S'affiche Pas
1. Vérifiez l'URL dans la console Firebase
2. Attendez 5-10 minutes après le premier déploiement
3. Videz le cache de votre navigateur (Ctrl+Shift+R)

---

## 📞 Support

### Besoin d'Aide ?

- 📧 Email : businessmobileafrique@gmail.com
- 📱 WhatsApp : 0993575428
- 📘 Facebook : Business Mobile Afrique

### Documentation Firebase

- [Documentation Officielle](https://firebase.google.com/docs)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Firebase CLI](https://firebase.google.com/docs/cli)

---

## ✅ Checklist Post-Déploiement

Après le déploiement, vérifiez :

- [ ] Le site s'affiche correctement
- [ ] Toutes les pages sont accessibles
- [ ] Le menu de navigation fonctionne
- [ ] Le formulaire de contact fonctionne
- [ ] Les articles du blog s'affichent
- [ ] L'interface admin est accessible (`/admin/`)
- [ ] Le mot de passe admin a été changé
- [ ] Les liens sociaux sont corrects
- [ ] Le site est responsive (testez sur mobile)
- [ ] Les performances sont bonnes (PageSpeed)

---

## 🎯 Prochaines Étapes

1. **SEO** : Soumettez votre site à Google Search Console
2. **Analytics** : Configurez Google Analytics
3. **Contenu** : Ajoutez plus d'articles via l'admin
4. **Marketing** : Partagez sur les réseaux sociaux
5. **Newsletter** : Configurez Mailchimp ou similaire

---

## 📊 Monitoring

### Firebase Analytics (Optionnel)

Pour activer les analytics :
```bash
firebase init analytics
```

### Suivi des Visites

Le site compte automatiquement les vues d'articles. Consultez les stats dans l'admin.

---

## 🎓 Ressources Utiles

### Tutoriels Vidéo
- [Firebase Hosting Tutorial](https://www.youtube.com/results?search_query=firebase+hosting+tutorial)
- [Deploy Website to Firebase](https://www.youtube.com/results?search_query=deploy+website+firebase)

### Documentation
- [Firebase Documentation](https://firebase.google.com/docs)
- [HTML & CSS MDN](https://developer.mozilla.org/)

---

## 💰 Coûts

### Plan Gratuit Firebase (Spark)

Le plan gratuit inclut :
- ✅ 10 GB de stockage
- ✅ 360 MB/jour de transfert
- ✅ Certificat SSL automatique
- ✅ CDN global

**Suffisant pour 99% des sites !**

### Quand Passer au Plan Payant ?

Passez au plan Blaze si :
- Plus de 10 000 visiteurs/jour
- Besoin de fonctions serveur complexes
- Besoin de bases de données Firestore

---

## 🌟 Bravo !

Vous avez réussi à déployer **Business Mobile Afrique** !

🌍 **Digital • Revenu • Avenir**

Transforme ton smartphone en source de réussite. 📱💼

---

**Made with 💛 for African Entrepreneurs**

*Business Mobile Afrique - 2025*
