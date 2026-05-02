# Mises à jour et changements

## [ÉTAPE 8.1] Configuration personnalisable de l'application

### Objectif
Permettre aux administrateurs de configurer entièrement l'identité de l'application (nom, logo, slogan) et les liens de communauté, sans avoir à modifier le code source.

### Changements apportés

#### 1. Base de données (`database/install.sql`)
Ajout de nouveaux champs dans la table `app_settings` :
- `organization_name` : Nom de l'association (défaut: "LANPartyManager")
- `organization_logo` : URL du logo
- `organization_slogan` : Slogan ou tagline
- `community_link_discord` : Lien d'invitation Discord
- `community_link_twitter` : Profil Twitter/X
- `community_link_twitch` : Chaîne Twitch
- `community_link_youtube` : Chaîne YouTube
- `community_link_website` : Site web officiel

#### 2. Interface d'administration (`views/admin/settings.ejs`)
Nouvelle section "Identité de l'association" avec:
- Champ texte pour le nom de l'association
- Champ texte pour le slogan
- Champ URL pour le logo (avec prévisualisation)

Nouvelle section "Liens des communautés" avec:
- Fields optionnels pour Discord, Twitter, Twitch, YouTube, Website
- Les liens sont affichés seulement s'ils sont renseignés

#### 3. Route d'administration (`routes/admin.js`)
Mise à jour des validations pour:
- Validation du nom de l'association (obligatoire, max 255 caractères)
- Validation des URLs (logo, liens communautés)
- Validation des longueurs de champ

Traitement des paramètres:
- Les champs vides conservent la valeur existante
- Les paramètres sont enregistrés de manière atomique (transaction)

#### 4. Middleware (`middleware/auth.js`)
Modification du middleware `injectLocals` :
- Maintenant asynchrone pour charger les paramètres d'application
- Injecte `res.locals.appSettings` dans toutes les vues
- Fallback silencieux en cas d'erreur BDD

#### 5. Vues publiques
**Header** (`views/partials/header.ejs`):
- Affichage du logo personnalisé s'il est configuré
- Affichage du nom de l'association personnalisé

**Footer** (`views/partials/footer.ejs`):
- Affichage du logo personnalisé
- Affichage du slogan s'il est configuré
- Affichage des liens de communauté (seulement s'ils sont renseignés)
- Affichage du nom de l'association dans le copyright

#### 6. Tests (`tests/middleware.test.js`)
Mise à jour des tests du middleware `injectLocals` pour:
- Gérer la nature asynchrone du middleware
- Vérifier que les paramètres d'application sont bien injectés

### Utilisation

#### Pour les administrateurs
1. Accéder à `/admin/settings`
2. Remplir la section "Identité de l'association" :
   - Nom de l'association (requis)
   - Slogan (optionnel)
   - Logo URL (optionnel)
3. Remplir la section "Liens des communautés" :
   - Ajouter les URLs des plateformes utilisées
   - Laisser vide pour masquer le lien
4. Cliquer sur "Enregistrer"

#### Pour les développeurs
Les paramètres sont disponibles dans toutes les vues via `appSettings` :
```ejs
<%= appSettings.organization_name %>
<%= appSettings.organization_logo %>
<%= appSettings.organization_slogan %>
<% if (appSettings.community_link_discord) { %>
  <!-- Afficher le lien -->
<% } %>
```

### Sécurité
- ✅ Validation des URLs (format URL valide)
- ✅ Limite de longueur sur tous les champs
- ✅ Protection CSRF sur le formulaire
- ✅ Authentification admin requise
- ✅ Utilisation de paramètres liés (prepared statements)

### Performance
- ✅ Mise en cache des paramètres (1 minute TTL)
- ✅ Une seule requête BDD par requête HTTP
- ✅ Insertion atomique (transaction) pour plusieurs paramètres

### Compatibilité
- ✅ Base de données MySQL 5.7+
- ✅ Déploiement cPanel
- ✅ Tous les navigateurs modernes
- ✅ Responsive (mobile, tablette, desktop)
