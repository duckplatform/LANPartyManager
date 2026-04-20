# Guide d'utilisation — LAN Party Manager

## Accès au site

### Rôles utilisateurs

| Rôle | Description | Accès |
|------|-------------|-------|
| Visiteur | Non connecté | Pages publiques |
| Utilisateur | Compte créé | Profil + inscription événements |
| Modérateur | Rôle assigné par admin | Admin news + events |
| Administrateur | Accès total | Tout + gestion utilisateurs |

---

## Pour les visiteurs et utilisateurs

### Créer un compte

1. Cliquez sur **Inscription** dans la navigation
2. Remplissez le formulaire :
   - **Pseudo** : 3-30 caractères alphanumériques
   - **Email** : Votre adresse email
   - **Mot de passe** : Min. 8 caractères avec majuscule, minuscule et chiffre
3. Cliquez sur **Créer mon compte**
4. Connectez-vous avec vos identifiants

### Se connecter

1. Cliquez sur **Connexion**
2. Entrez votre email et mot de passe
3. Vous êtes redirigé vers l'accueil (ou l'admin si vous êtes modérateur/admin)

### S'inscrire à un événement

1. Accédez à la page **Événements**
2. Cliquez sur un événement pour voir ses détails
3. Si des places sont disponibles, cliquez sur **S'inscrire à cet événement**
4. Vous pouvez vous désinscrire via le bouton **Se désinscrire**

### Modifier son profil

1. Cliquez sur votre pseudo dans la navigation
2. Sélectionnez **Mon profil**
3. Modifiez votre bio ou changez votre mot de passe
4. Cliquez sur **Enregistrer les modifications**

---

## Pour les modérateurs et administrateurs

### Accéder au panneau d'administration

Cliquez sur le bouton **Admin** dans la navigation (visible uniquement si vous avez les droits).

URL directe : `/admin`

### Gérer les actualités

#### Créer une actualité
1. Admin → **Actualités** → **+ Créer**
2. Remplissez le titre, l'extrait (optionnel) et le contenu (HTML supporté)
3. Cochez **Publier immédiatement** si vous souhaitez la rendre visible
4. Cliquez sur **Créer l'actualité**

#### Modifier une actualité
1. Admin → **Actualités**
2. Cliquez sur **Modifier** en face de l'article
3. Modifiez les champs et enregistrez

#### Supprimer une actualité
Admin uniquement. Cliquez sur **Supprimer** et confirmez.

### Gérer les événements

#### Créer un événement
1. Admin → **Événements** → **+ Créer**
2. Remplissez :
   - **Titre** : Nom de l'événement
   - **Lieu** : Adresse ou salle
   - **Dates** : Début et fin
   - **Participants max** : 0 = illimité
   - **Description** : Détails HTML
   - **Publier** : Visible sur le site
   - **Actif** : Affiché en bannière sur l'accueil

#### Événement actif
Un seul événement peut être marqué comme "actif" — il sera mis en avant sur la page d'accueil avec un bandeau.

### Gérer les utilisateurs (admin uniquement)

1. Admin → **Utilisateurs**
2. Vous pouvez :
   - Rechercher par pseudo ou email
   - Modifier le rôle (utilisateur / modérateur / administrateur)
   - Activer/Désactiver un compte
   - Supprimer un compte (irréversible)

⚠️ Vous ne pouvez pas modifier votre propre rôle ou supprimer votre propre compte.

---

## Surveillance et maintenance

### Logs

Les fichiers de logs sont dans le dossier `logs/` :
- `access.log` : Toutes les requêtes HTTP
- `combined.log` : Logs de l'application
- `error.log` : Erreurs uniquement

### Réinitialiser l'installation

Pour relancer le wizard d'installation :
```sql
UPDATE settings SET value = 'false' WHERE `key` = 'installed';
```
Puis rechargez l'application.

### Sauvegarder la base de données

```bash
mysqldump -u user -p lan_party_manager > backup_$(date +%Y%m%d).sql
```
