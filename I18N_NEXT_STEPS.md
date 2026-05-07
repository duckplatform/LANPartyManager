# 🌍 Internationalisation LANPartyManager - Guide de Continuation

## 📋 État du Projet

### Complété ✅
- **Phase 1**: Audit complet - 32 fichiers vues EJS scanés
- **Phase 2**: 50+ clés i18n créées en FRANÇAIS et ANGLAIS
- **Phase 3 POC**: 12 fichiers vues i18nnisés (37.5% de couverture)
- **Fichiers JSON**: 17 sections, structure bien organisée

### Reste à faire ⏳
- 21 fichiers vues à i18ner (63% restants)
- Nouvelles clés à découvrir et ajouter
- Tests multilingues (FR/EN)

---

## 🚀 Comment Continuer

### Étape 1: Identifier les clés manquantes

```bash
# Chercher les textes français non encore i18nnisés
grep -rn "[A-Zàâä]" views/ | grep -v "t(" | grep -v "html" | head -20

# Chercher des patterns spécifiques
grep -rn "Tablier\|Salle\|Rencontre" views/
```

### Étape 2: Ajouter nouvelles clés aux JSON

#### Dans `/workspace/locales/fr.json`:
```json
{
  "rooms": {
    "title": "Gestion des salles",
    "add": "Ajouter une salle",
    "name": "Nom de la salle",
    "type": "Type",
    "format": "Format supporté"
  }
}
```

#### Dans `/workspace/locales/en.json`:
```json
{
  "rooms": {
    "title": "Rooms Management",
    "add": "Add a Room",
    "name": "Room Name",
    "type": "Type",
    "format": "Supported Format"
  }
}
```

### Étape 3: Remplacer le texte dans les vues

#### Avant:
```ejs
<h1>Gestion des salles</h1>
<a href="/admin/rooms/create">Ajouter une salle</a>
```

#### Après:
```ejs
<h1><%= t('rooms.title') %></h1>
<a href="/admin/rooms/create"><%= t('rooms.add') %></a>
```

### Étape 4: Cas spéciaux

#### Pluralisation:
```ejs
<!-- Avant -->
<span><%= count %> salle<%= count !== 1 ? 's' : '' %></span>

<!-- Après (avec clés séparées) -->
<span><%= count %> <%= count !== 1 ? t('rooms.plural') : t('rooms.singular') %></span>
```

#### Paramètres dynamiques:
```ejs
<!-- Avant -->
<p>Créé par <%= user.name %></p>

<!-- Après -->
<p><%= t('room.created_by', { name: user.name }) %></p>

<!-- Clé JSON -->
"created_by": "Créé par {{name}}"
```

#### Statuts (réutiliser existants):
```ejs
<span><%= t('status.planned') %></span>
<span><%= t('status.in_progress') %></span>
<span><%= t('status.ended') %></span>
```

---

## 📁 Fichiers à Traiter (Ordre Recommandé)

### Priorité 1: Pages Critiques (7)
1. `admin/settings.ejs` - Paramètres org
2. `events/show.ejs` - Détail événement
3. `admin/events/form.ejs` - Création événement
4. `admin/rooms/create.ejs` - Création salle
5. `admin/rooms/edit.ejs` - Édition salle
6. `moderator/battles/index.ejs` - Gestion rencontres
7. `moderator/battles/create-step1.ejs` + `step2.ejs`

### Priorité 2: Formulaires & Lists (10)
8. `admin/_sidebar.ejs` - Navigation
9. `admin/events/registrations.ejs` - Inscrits
10. `admin/games/create.ejs` + `edit.ejs`
11. `admin/news/form.ejs` - Formulaire annonce
12. `moderator/scan.ejs` - Scan badges
13. `moderator/battles/announce.ejs` - Annonce
14. `news/show.ejs` - Article détail
15. `partials/footer.ejs` - Liens sociaux `- `moderator/verify.ejs`

### Priorité 3: Authentification (4)
16. `auth/login.ejs`
17. `auth/register.ejs`
18. `auth/discord-complete.ejs`
19. `partials/flash.ejs`

---

## 🧪 Testing Checklist

### Avant chaque commit:
```bash
# 1. Vérifier JSON valide
node -e "require('./locales/fr.json'); require('./locales/en.json'); console.log('✅ JSON OK')"

# 2. Vérifier pas de texte français manquant
grep -rn "[A-Zàâä]" views/ | grep -v "t(" | grep -v "html" | wc -l

# 3. Vérifier no syntax errors
npm test 2>&1 | head -20

# 4. Lancer l'app et tester:
# - Passer de FR à EN
# - Vérifier tous les textes traduisent
# - Vérifier formatage dates/nombres correct
```

### Tests multilingues:

**Français:**
- [ ] Page d'accueil
- [ ] Liste événements
- [ ] Admin dashboard
- [ ] Profil utilisateur
- [ ] Badge
- [ ] Page 404

**English:**
- [ ] Homepage
- [ ] Events list
- [ ] Admin dashboard
- [ ] User profile
- [ ] Badge
- [ ] 404 page

---

## 📝 Notes Important

### Structure des clés:
- Utiliser **points notation** (champ.souschamp.clé)
- Garder les clés **courtes et explicites**
- Réutiliser clés existantes (ex: `status.*`, `common.*`)

### Paramètres avec {{}}:
- Dans JSON: `"key": "Texte {{param}}"`
- Dans EJS: `t('key', { param: value })`
- Bon pour: noms dynamiques, dates, nombres

### Espaces insécables:
- Utiliser `\u00A0` plutôt que des espaces simples
- Exemple: `«\u00A0titre\u00A0»` = « titre »

### Hiérarchie des clés proposée:
```
_meta (language, locale, name)
nav (menu navigation)
footer
status (statuts génériques)
event (événements spécifiques)
battle (rencontres)
news (actualités)
auth (authentification)
common (boutons, actions génériques)
admin (tout admin panel)
moderator (tout modération)
page (contenu pages publiques)
profile (profil utilisateur)
badge (badge électronique)
errors (pages erreur)
countdown (chrono)
settings (paramètres)
```

---

## 🎯 Objectif Final

✅ Tous les 32 fichiers vues i18nnisés  
✅ Zéro texte français hardcodé  
✅ 100% bilingue FR/EN  
✅ Tests passent tous  
✅ Documentation à jour  

---

## 📞 Besoin d'Aide?

Voir les fichiers générés:
- `I18N_COMPLETION_REPORT.md` - Rapport détaillé
- `I18N_AUDIT_REPORT.csv` - Liste des fichiers
- `i18n_summary.sh` - Résumé du travail

Les fichiers de clés JSON contiennent déjà 50+ clés bilingues. 
Réutilisez-les au maximum avant d'en créer de nouvelles!
