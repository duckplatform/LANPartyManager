# Mises à jour et changements

## Correctifs de sécurité et de fiabilité (revue de code)

### Sécurité
- **Limitation des tentatives de connexion** : les échecs de connexion renvoient désormais `401` (et les erreurs de validation `422`/`409`), ce qui permet à `authLimiter` de les comptabiliser.
- **Liaison Discord** : un compte Discord n'est plus lié automatiquement à un compte local ayant la même adresse e-mail (les e-mails locaux ne sont pas vérifiés). L'ID Discord n'est plus saisissable dans le profil : la liaison se fait via le bouton « Lier mon compte Discord » (`POST /auth/discord/link`, protégé par CSRF), qui passe par l'autorisation OAuth Discord avec écran de consentement systématique.
- **Changement de mot de passe** : toutes les autres sessions de l'utilisateur sont déconnectées ; la session courante est conservée.
- **Échappement JSON dans les vues** : les `JSON.stringify` placés dans des attributs HTML utilisent `<%= %>` ; ceux placés dans un bloc `<script>` passent par `jsonForScript()` (échappe `<`, empêche la fermeture prématurée du bloc).
- **Droits de session** : les rôles admin/modérateur sont relus en base à chaque requête (`refreshSessionUser`) ; une rétrogradation ou une suppression de compte prend effet immédiatement.

### Fiabilité
- **Sessions persistées en MySQL** (`config/sessionStore.js`, table `sessions`) à la place du MemoryStore. La table est créée automatiquement au démarrage ; elle figure aussi dans `database/install.sql`.
- **File d'attente des rencontres** : l'attribution de salle s'exécute dans une transaction qui verrouille l'événement, évitant qu'une même salle soit attribuée deux fois lors de réévaluations concurrentes.
- **Dates d'événement** : la saisie est convertie en instant UTC selon le fuseau du serveur (`TZ`). Définissez `TZ` sur le fuseau de l'organisation. Les événements existants, enregistrés auparavant en heure locale « naïve », peuvent nécessiter une correction manuelle de l'heure si le serveur n'était pas en UTC.

### Corrections
- Prévisualisation Markdown des actualités (`POST /admin/news/preview`) de nouveau fonctionnelle.
- Plus d'erreur 500 lors d'une erreur de validation des paramètres, ni lors de l'étape 1 du wizard de rencontre pour un événement terminé.

## [ÉTAPE 8.1] Configuration personnalisable de l'application

### Objectif
Permettre aux administrateurs de configurer entièrement l'identité de l'application (nom, logo, slogan) et les liens de communauté, sans avoir à modifier le code source.

### Changements apportés

#### 1. Base de données (`database/install.sql`)
Ajout de nouveaux champs dans la table `app_settings` :
- `organization_name` : Nom du site (défaut: "LANPartyManager")
- `organization_logo` : URL du logo
- `organization_slogan` : Slogan ou tagline
- `community_link_discord` : Lien d'invitation Discord
- `community_link_twitter` : Profil Twitter/X
- `community_link_twitch` : Chaîne Twitch
- `community_link_youtube` : Chaîne YouTube
- `community_link_website` : Site web officiel

#### 2. Interface d'administration (`views/admin/settings.ejs`)
Nouvelle section "Identité du site" avec:
- Champ texte pour le nom du site
- Champ texte pour le slogan
- Champ URL pour le logo (avec prévisualisation)

Nouvelle section "Liens des communautés" avec:
- Fields optionnels pour Discord, Twitter, Twitch, YouTube, Website
- Les liens sont affichés seulement s'ils sont renseignés

#### 3. Route d'administration (`routes/admin.js`)
Mise à jour des validations pour:
- Validation du nom du site (obligatoire, max 255 caractères)
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
- Affichage du nom du site personnalisé

**Footer** (`views/partials/footer.ejs`):
- Affichage du logo personnalisé
- Affichage du slogan s'il est configuré
- Affichage des liens de communauté (seulement s'ils sont renseignés)
- Affichage du nom du site dans le copyright

#### 6. Tests (`tests/middleware.test.js`)
Mise à jour des tests du middleware `injectLocals` pour:
- Gérer la nature asynchrone du middleware
- Vérifier que les paramètres d'application sont bien injectés

### Utilisation

#### Pour les administrateurs
1. Accéder à `/admin/settings`
2. Remplir la section "Identité du site" :
   - Nom du site (requis)
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
