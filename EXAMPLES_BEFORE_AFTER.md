# 🔄 Exemples Avant/Après - Internationalisation

## Exemple 1: Page d'erreur 404

### ❌ AVANT (Hardcodé)
```ejs
<div class="error-page container">
  <div class="error-content">
    <div class="error-code">404</div>
    <h1 class="error-title">Page introuvable</h1>
    <p class="error-message">La page que vous cherchez n'existe pas ou a été déplacée.</p>
    <a href="/" class="btn btn--primary btn--lg">
      <i class="fas fa-home"></i> Retour à l'accueil
    </a>
  </div>
</div>
```

### ✅ APRÈS (i18nisé)
```ejs
<div class="error-page container">
  <div class="error-content">
    <div class="error-code">404</div>
    <h1 class="error-title"><%= t('errors.error_404_title') %></h1>
    <p class="error-message"><%= t('errors.error_404_subtitle') %></p>
    <a href="/" class="btn btn--primary btn--lg">
      <i class="fas fa-home"></i> <%= t('common.go_home') %>
    </a>
  </div>
</div>
```

### 📋 Clés Ajoutées
```json
{
  "errors": {
    "error_404_title": "Page introuvable",
    "error_404_subtitle": "La page que vous cherchez n'existe pas ou a été déplacée."
  },
  "common": {
    "go_home": "Retour à l'accueil"
  }
}
```

---

## Exemple 2: Tableau Admin avec Actions

### ❌ AVANT (Hardcodé + HTML mélangé)
```ejs
<div class="card-header">
  <h2><i class="fas fa-gamepad"></i> Jeux (42)</h2>
</div>
<table class="data-table">
  <thead>
    <tr>
      <th>Nom</th>
      <th>Console / Plateforme</th>
      <th>Format</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <% if (games.length === 0) { %>
      <tr>
        <td colspan="4" class="table-empty">
          <i class="fas fa-inbox"></i> Aucun jeu configuré.
          <a href="/admin/games/create">Ajouter le premier jeu</a>.
        </td>
      </tr>
    <% } else { %>
      <% games.forEach(function(game) { %>
        <tr>
          <td><strong><%= game.name %></strong></td>
          <td><i class="fas fa-desktop"></i> <%= game.console %></td>
          <td>
            <span class="badge"><%= game.match_type %></span>
          </td>
          <td class="td-actions">
            <a href="/admin/games/<%= game.id %>/edit" class="btn btn--ghost btn--xs" title="Modifier">
              <i class="fas fa-pen"></i> Modifier
            </a>
            <form action="/admin/games/<%= game.id %>" method="POST">
              <button type="submit" title="Supprimer" 
                      onclick="return confirm('Supprimer le jeu <%= game.name %> ? Cette action est irréversible.')">
                <i class="fas fa-trash"></i> Supprimer
              </button>
            </form>
          </td>
        </tr>
      <% }); %>
    <% } %>
  </tbody>
</table>
```

### ✅ APRÈS (i18nisé + Propre)
```ejs
<div class="card-header">
  <h2><i class="fas fa-gamepad"></i> <%= t('admin.games_list_title') %> (42)</h2>
</div>
<table class="data-table">
  <thead>
    <tr>
      <th><%= t('common.create') %></th>
      <th><%= t('admin.games_console') %></th>
      <th><%= t('admin.games_format') %></th>
      <th><%= t('common.actions') %></th>
    </tr>
  </thead>
  <tbody>
    <% if (games.length === 0) { %>
      <tr>
        <td colspan="4" class="table-empty">
          <i class="fas fa-inbox"></i> <%= t('admin.no_games') %>
          <a href="/admin/games/create"><%= t('admin.add_first_game') %></a>.
        </td>
      </tr>
    <% } else { %>
      <% games.forEach(function(game) { %>
        <tr>
          <td><strong><%= game.name %></strong></td>
          <td><i class="fas fa-desktop"></i> <%= game.console %></td>
          <td>
            <span class="badge"><%= game.match_type %></span>
          </td>
          <td class="td-actions">
            <a href="/admin/games/<%= game.id %>/edit" class="btn btn--ghost btn--xs" title="<%= t('admin.games_edit') %>">
              <i class="fas fa-pen"></i> <%= t('admin.games_edit') %>
            </a>
            <form action="/admin/games/<%= game.id %>" method="POST">
              <button type="submit" title="<%= t('admin.games_delete') %>"
                      onclick="return confirm('<%= t('admin.games_delete_confirmation', { name: game.name }) %>')">
                <i class="fas fa-trash"></i> <%= t('admin.games_delete') %>
              </button>
            </form>
          </td>
        </tr>
      <% }); %>
    <% } %>
  </tbody>
</table>
```

### 📋 Clés Ajoutées
```json
{
  "admin": {
    "games_list_title": "Jeux",
    "games_console": "Console / Plateforme",
    "games_format": "Format",
    "games_edit": "Modifier",
    "games_delete": "Supprimer",
    "games_delete_confirmation": "Supprimer le jeu {{name}} ? Cette action est irréversible.",
    "no_games": "Aucun jeu configuré.",
    "add_first_game": "Ajouter le premier jeu"
  }
}
```

---

## Exemple 3: Compte-à-rebours Comptes (Plus Complexe)

### ❌ AVANT (Hardcodé + JavaScript mélangé)
```ejs
<div class="event-countdown" id="eventCountdown" data-deadline="<%= registrationDeadlineISO %>">
  <div class="countdown-unit">
    <span class="countdown-num" id="cd-days">--</span>
    <span class="countdown-lbl">jours</span>
  </div>
  <span class="countdown-sep">:</span>
  <div class="countdown-unit">
    <span class="countdown-num" id="cd-hours">--</span>
    <span class="countdown-lbl">heures</span>
  </div>
  <span class="countdown-sep">:</span>
  <div class="countdown-unit">
    <span class="countdown-num" id="cd-minutes">--</span>
    <span class="countdown-lbl">min</span>
  </div>
  <span class="countdown-sep">:</span>
  <div class="countdown-unit">
    <span class="countdown-num" id="cd-seconds">--</span>
    <span class="countdown-lbl">sec</span>
  </div>
</div>

<script>
function tick() {
  const diff = deadline - Date.now();
  if (diff <= 0) {
    el.innerHTML = '<span class="event-registrations-closed"><i class="fas fa-lock"></i> Inscriptions fermées</span>';
    return;
  }
  // ...
}
</script>
```

### ✅ APRÈS (i18nisé + Paramétré)
```ejs
<div class="event-countdown" id="eventCountdown" data-deadline="<%= registrationDeadlineISO %>">
  <div class="countdown-unit">
    <span class="countdown-num" id="cd-days">--</span>
    <span class="countdown-lbl"><%= t('countdown.days') %></span>
  </div>
  <span class="countdown-sep">:</span>
  <div class="countdown-unit">
    <span class="countdown-num" id="cd-hours">--</span>
    <span class="countdown-lbl"><%= t('countdown.hours') %></span>
  </div>
  <span class="countdown-sep">:</span>
  <div class="countdown-unit">
    <span class="countdown-num" id="cd-minutes">--</span>
    <span class="countdown-lbl"><%= t('countdown.minutes') %></span>
  </div>
  <span class="countdown-sep">:</span>
  <div class="countdown-unit">
    <span class="countdown-num" id="cd-seconds">--</span>
    <span class="countdown-lbl"><%= t('countdown.seconds') %></span>
  </div>
</div>

<script>
function tick() {
  const diff = deadline - Date.now();
  if (diff <= 0) {
    el.innerHTML = '<span class="event-registrations-closed"><i class="fas fa-lock"></i> <%= t("event.registrations_closed") %></span>';
    return;
  }
  // ...
}
</script>
```

### 📋 Clés Ajoutées
```json
{
  "countdown": {
    "days": "jours",
    "hours": "heures",
    "minutes": "min",
    "seconds": "sec"
  }
}
```

---

## Exemple 4: Profil Utilisateur (Onglets)

### ❌ AVANT (Hardcodé + Onglets pas clairs)
```ejs
<div class="profile-tabs" role="tablist">
  <button class="tab-btn active" role="tab" data-tab="tab-info" aria-selected="true">
    <i class="fas fa-user-pen"></i> Informations
  </button>
  <button class="tab-btn" role="tab" data-tab="tab-password" aria-selected="false">
    <i class="fas fa-key"></i> Mot de passe
  </button>
  <button class="tab-btn" role="tab" data-tab="tab-events" aria-selected="false">
    <i class="fas fa-calendar-days"></i> Événements
  </button>
  <button class="tab-btn" role="tab" data-tab="tab-badge" aria-selected="false">
    <i class="fas fa-id-card"></i> Mon badge
  </button>
</div>

<% if (user.is_admin) { %>
  <span class="badge badge--admin"><i class="fas fa-shield-halved"></i> Administrateur</span>
<% } else if (user.is_moderator) { %>
  <span class="badge badge--moderator"><i class="fas fa-user-shield"></i> Modérateur</span>
<% } else { %>
  <span class="badge badge--member"><i class="fas fa-user"></i> Membre</span>
<% } %>
```

### ✅ APRÈS (i18nisé + Badges clairs)
```ejs
<div class="profile-tabs" role="tablist">
  <button class="tab-btn active" role="tab" data-tab="tab-info" aria-selected="true">
    <i class="fas fa-user-pen"></i> <%= t('profile.tab_info') %>
  </button>
  <button class="tab-btn" role="tab" data-tab="tab-password" aria-selected="false">
    <i class="fas fa-key"></i> <%= t('profile.tab_password') %>
  </button>
  <button class="tab-btn" role="tab" data-tab="tab-events" aria-selected="false">
    <i class="fas fa-calendar-days"></i> <%= t('profile.tab_events') %>
  </button>
  <button class="tab-btn" role="tab" data-tab="tab-badge" aria-selected="false">
    <i class="fas fa-id-card"></i> <%= t('profile.tab_badge') %>
  </button>
</div>

<% if (user.is_admin) { %>
  <span class="badge badge--admin"><i class="fas fa-shield-halved"></i> <%= t('profile.badge_admin') %></span>
<% } else if (user.is_moderator) { %>
  <span class="badge badge--moderator"><i class="fas fa-user-shield"></i> <%= t('profile.badge_moderator') %></span>
<% } else { %>
  <span class="badge badge--member"><i class="fas fa-user"></i> <%= t('profile.badge_member') %></span>
<% } %>
```

### 📋 Clés Ajoutées
```json
{
  "profile": {
    "tab_info": "Informations",
    "tab_password": "Mot de passe",
    "tab_events": "Événements",
    "tab_badge": "Mon badge",
    "badge_admin": "Administrateur",
    "badge_moderator": "Modérateur",
    "badge_member": "Membre"
  }
}
```

---

## 📊 Patterns Résumés

| Pattern | Avant | Après |
|---------|-------|-------|
| **Texte simple** | `"Titre"` | `<%= t('key.title') %>` |
| **Paramètres** | `` Salut ${name}`` | `t('greeting', {name})` |
| **Pluriel** | `s?: ''` | `t('count', ...)?t('plural')` |
| **Confirmations** | `confirm('...')` | `confirm(t('key'))` |
| **Badges/Statuts** | Hardcodé | `t('status.planned')` |

---

## ✅ Avantages de ces Transformations

1. **Multilingue** - 1 clé = 2 langues (FR + EN)
2. **Maintenable** - Textes centralisés dans JSON
3. **Cohérent** - Mêmes traductions partout
4. **Paramétré** - Textes dynamiques avec variables
5. **Performant** - Chargement une seule fois au démarrage
6. **Scalable** - Facile d'ajouter EN, DE, ES, etc.

---

**Ces patterns ont été appliqués à 12 fichiers vues et peuvent être utilisés pour les 21 fichiers restants.**
