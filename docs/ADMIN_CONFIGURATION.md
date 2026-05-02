# Guide d'administration - Configuration personnalisée

## Configuration de l'identité de votre association

La page de paramètres (`/admin/settings`) vous permet de personnaliser complètement l'identité et la visibilité de votre association.

### Sections disponibles

#### 1. Identité de l'association

**Nom de l'association** *(obligatoire)*
- Affiche le nom partout sur le site (header, footer, page d'accueil)
- Exemple: "LANPartyManager", "eSport Club Lyon", "Gaming Association Marseille"
- Changement immédiat visible sur toutes les pages

**Slogan** *(optionnel)*
- Tagline courte de votre association
- S'affiche sur la page d'accueil et dans le footer
- Exemple: "La meilleure LAN Party de la région"
- Si vide, utilise un texte par défaut

**Logo** *(optionnel)*
- URL complète du logo (HTTPS recommandé)
- Formats recommandés: PNG, SVG
- Dimensions minimales: 200x200px
- Affichage automatique dans le header et footer
- Prévisualisation en temps réel dans le formulaire
- Exemple: `https://votre-domaine.com/logo.png`

#### 2. Liens des communautés

Configurer les liens vers vos réseaux sociaux et site web.

**Discord**
- URL d'invitation au serveur Discord
- Exemple: `https://discord.gg/abc123`
- Affiche une icône Discord dans le footer

**Twitter / X**
- Lien vers votre profil Twitter ou X
- Exemple: `https://twitter.com/votre_compte`
- Affiche une icône Twitter dans le footer

**Twitch**
- Lien vers votre chaîne Twitch
- Exemple: `https://www.twitch.tv/votre_canal`
- Affiche une icône Twitch dans le footer

**YouTube**
- Lien vers votre chaîne YouTube
- Exemple: `https://www.youtube.com/@votre_chaine`
- Affiche une icône YouTube dans le footer

**Site web**
- Lien vers votre site web (si différent du LANPartyManager)
- Exemple: `https://votre-association.com`
- Affiche une icône globe dans le footer

### Comportement des liens

✅ **Si configuré**: Le lien s'affiche dans le footer du site
❌ **Si vide**: Le lien n'est pas affichés (espace économisé)

### Pages affectées

Les paramètres affichent dans:
- **Header** (logo + nom de l'association)
- **Footer** (logo + nom + slogan + liens communautés)
- **Page d'accueil** (nom + slogan)
- **Titre du navigateur** (utilisé dans les meta-tags)

### Changement immédiat

Tous les changements sont appliqués immédiatement après l'enregistrement grâce au cache invalidé.

### Conseil d'utilisation

1. **Commencez par le nom et logo**
   - C'est l'identité principale de votre association
   - Assurez-vous que the logo URL est correctement accessible

2. **Ajoutez progressivement les réseaux**
   - Commencez par Discord (souvent le premier pour une association gaming)
   - Ajoutez les autres réseaux au fur et à mesure de votre présence

3. **Testez les URLs**
   - Cliquez sur les liens après enregistrement pour vérifier qu'ils fonctionnent
   - Les URLs doivent commencer par `http://` ou `https://`

### Dépannage

**Le logo ne s'affiche pas**
- Vérifiez que l'URL est accessible dans votre navigateur
- Assurez-vous d'utiliser HTTPS si possible
- Vérifiez les permissions CORS si hébergé externes

**Les changements n'apparaissent pas**
- Rafraîchissez la page (Ctrl+F5 ou Cmd+Shift+R)
- Attendez 1 minute (cache TTL)
- Vérifiez qu'il n'y a pas d'erreur lors de l'enregistrement

**Un lien n'apparaît pas**
- Vérifiez que le champ n'est pas vide
- Assurez-vous que l'URL est valide (commence par http:// ou https://)
- Sauvegardez à nouveau

### Informations supplémentaires

- Ces paramètres sont stockés dans la base de données, pas en variables d'environnement
- Ils sont mis en cache en mémoire (1 minute) pour les performances
- Les changements ne nécessitent pas un redémarrage de l'application
- L'interface d'administration est protégée par authentification (admin uniquement)
