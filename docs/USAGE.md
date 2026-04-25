# LANPartyManager — Guide d'utilisation

## Présentation

LANPartyManager est le site web de l'association de jeux vidéo. Il permet aux membres de s'inscrire, gérer leur profil, et aux administrateurs de gérer les comptes.

---

## Accès public

### Page d'accueil

La page d'accueil présente l'association avec ses activités (tournois, événements, communauté).

- Accédez au site via votre navigateur (URL fournie par l'administrateur)
- Les visiteurs non connectés voient les boutons **Connexion** et **Nous rejoindre**

---

## Création de compte

### Inscription

1. Cliquez sur **Nous rejoindre** ou **Inscription** dans la navigation
2. Remplissez le formulaire :
   - **Nom** : votre nom de famille
   - **Prénom** : votre prénom
   - **Pseudo** : votre surnom en jeu ou Discord (2 à 50 caractères)
   - **Email** : votre adresse e-mail (utilisée pour la connexion)
   - **Mot de passe** : minimum 8 caractères, avec au moins 1 majuscule et 1 chiffre
   - **Confirmer le mot de passe** : identique au mot de passe
3. Cliquez sur **Créer mon compte**
4. Vous êtes automatiquement connecté après l'inscription

---

## Connexion

1. Cliquez sur **Connexion** dans la navigation
2. Entrez votre **email** et **mot de passe**
3. Cliquez sur **Se connecter**

> ℹ️ Après 10 tentatives échouées en 15 minutes, les connexions sont temporairement bloquées.

---

## Gestion du profil

Accédez à votre profil via **Mon profil** dans la navigation (une fois connecté).

### Modifier mes informations

Dans l'onglet **Informations** :
1. Modifiez votre nom, prénom, pseudo (jeu/Discord) ou email
2. Cliquez sur **Sauvegarder**

### Changer mon mot de passe

Dans l'onglet **Mot de passe** :
1. Saisissez votre **mot de passe actuel**
2. Saisissez le **nouveau mot de passe** (8+ caractères, 1 majuscule, 1 chiffre)
3. Confirmez le nouveau mot de passe
4. Cliquez sur **Changer le mot de passe**

---

## Déconnexion

Cliquez sur **Déconnexion** dans la navigation (bouton en haut à droite).

---

## Panneau d'administration

> ⚠️ Accessible uniquement aux comptes avec droits administrateur.

### Accès

Cliquez sur **Administration** dans la navigation (visible uniquement pour les admins).

### Tableau de bord

Le tableau de bord affiche :
- **Statistiques** : nombre total de membres, administrateurs, membres simples
- **Liste des utilisateurs** : tableau complet avec ID, pseudo, nom, email, rôle, date d'inscription

### Actions sur les utilisateurs

Pour chaque utilisateur (sauf vous-même) :

#### Promouvoir / Rétrograder un administrateur
- Cliquez sur **Promouvoir** pour donner les droits admin à un membre
- Cliquez sur **Rétrograder** pour retirer les droits admin

#### Supprimer un compte
- Cliquez sur **Supprimer**
- Confirmez la suppression dans la fenêtre de dialogue
- ⚠️ Cette action est **irréversible**

> ℹ️ Vous ne pouvez pas modifier ou supprimer votre propre compte depuis le panneau admin. Utilisez la page **Mon profil** pour modifier vos informations.

---

## Compte administrateur par défaut

Lors de l'installation, un compte administrateur est créé automatiquement.
Les identifiants vous sont fournis par votre administrateur système lors de la mise en place du site.

> ⚠️ **Changez votre mot de passe dès la première connexion** via la page Mon profil → onglet Mot de passe.

---

## Règles de sécurité

- Les mots de passe doivent contenir au moins 8 caractères, 1 majuscule et 1 chiffre
- Après 10 tentatives de connexion échouées, un délai de 15 minutes est imposé
- Les sessions expirent automatiquement après 24 heures d'inactivité
- Tous les formulaires sont protégés contre les attaques CSRF
