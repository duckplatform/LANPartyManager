# Guide de décploiement - Configuration personnalisée

## 📋 Prérequis

- Node.js 14+
- MySQL 5.7+
- Accès admin/modérateur à LANPartyManager

## 🚀 Étapes de déploiement

### 1. **Mise à jour de la base de données**

La structure `app_settings` est mise à jour automatiquement lors du prochain :
- Redémarrage de l'application initiale (installation)
- Import du fichier `database/install.sql`

Les nouveaux champs seront créés avec les valeurs par défaut :
```
- organization_name = 'LANPartyManager'
- organization_logo = NULL
- organization_slogan = NULL
- community_link_discord = NULL
- community_link_twitter = NULL
- community_link_twitch = NULL
- community_link_youtube = NULL
- community_link_website = NULL
```

### 2. **Mise à jour du code**

Assurez-vous que les fichiers suivants sont à jour :
- ✅ `/routes/admin.js` (nouvelles routes et validation)
- ✅ `/middleware/auth.js` (nouveau middleware asynchrone)
- ✅ `/models/AppSettings.js` (documentation mise à jour)
- ✅ `/views/admin/settings.ejs` (nouveaux formulaires)
- ✅ `/views/partials/header.ejs` (affichage personnalisé)
- ✅ `/views/partials/footer.ejs` (affichage personnalisé)
- ✅ `/views/index.ejs` (affichage personnalisé)

### 3. **Tests**

Vérifier que tous les tests passent :
```bash
npm test
# Résultat attendu: 234 passing
```

### 4. **Redémarrage de l'application**

Sur cPanel:
1. Accéder au Node.js Ball
2. Redémarrer l'application
3. Vérifier que l'app démarre sans erreurs

En ligne de commande:
```bash
npm restart
# ou
pm2 restart app
```

### 5. **Configuration initiale**

1. Accédez à `/admin/settings`
2. Remplissez la section "Identité de l'association"
3. Configurez les liens des communautés
4. Cliquez sur "Enregistrer"

## ✅ Vérification post-déploiement

### L'administrateur doit vérifier:
- [ ] La page `/admin/settings` s'affiche
- [ ] Les formulaires sont validés (essayez une URL invalide)
- [ ] Les données sont sauvegardées après "Enregistrer"
- [ ] Le logo s'affiche dans le header et footer
- [ ] Le nom s'affiche correctement partout
- [ ] Les liens de communauté apparaissent dans le footer
- [ ] Les liens vides ne s'affichent pas

### Les utilisateurs verront:
- Logo personnalisé dans le header
- Nom de l'association à la place de "LANPartyManager"
- Slogan sur la page d'accueil et dans le footer
- Liens vers les réseaux sociaux dans le footer

## 🔧 Dépannage

### Problem: Les paramètres n'apparaissent pas après l'enregistrement
**Solution:**
1. Attendez 1 minute (le cache se renouvelle)
2. Rafraîchissez la page avec Ctrl+F5 (videz le cache navigateur)
3. Vérifiez qu'il n'y a pas d'erreur de validation dans le formulaire

### Problème: Les URLs des liens ne sont pas valides
**Solution:**
- Assurez-vous que les URLs commencent par `http://` ou `https://`
- Vérifiez l'exactitude de l'URL (pas de typos)
- Testez l'URL dans une nouvelle onglet pour vérifier qu'elle fonctionne

### Problème: Le logo n'apparaît pas
**Solution:**
1. Vérifiez que l'URL est accessible dans le navigateur
2. Assurez-vous d'utiliser HTTPS si possible
3. Vérifiez les permissions CORS si le logo est hébergé sur un domaine différent
4. Utilisez un URL raccourci si le lien est très long

### Problème: Les liens de communauté ne s'affichent pas
**Solution:**
1. Vérifiez que vous avez rempli le champ (non vide)
2. Vérifiez que l'URL est valide (commence par http://)
3. Attendez que le cache se renouvelle (1 minute)
4. Rafraîchissez la page navigateur

## 📊 Base de données - Requêtes utiles

### Voir tous les paramètres
```sql
SELECT cle, valeur, updated_at FROM app_settings;
```

### Voir les paramètres de personnalisation
```sql
SELECT * FROM app_settings 
WHERE cle LIKE 'organization_%' OR cle LIKE 'community_link_%';
```

### Réinitialiser un paramètre
```sql
UPDATE app_settings SET valeur = NULL WHERE cle = 'organization_logo';
```

### Vider le cache
```bash
# Redémarrer l'app pour vider le cache en mémoire
pm2 restart app
```

## 🔐 Sécurité

- ✅ Seuls les administrateurs peuvent accéder à `/admin/settings`
- ✅ Token CSRF protège le formulaire
- ✅ Toutes les URLs sont validées au format
- ✅ Aucune possibilité d'injection SQL (prepared statements)
- ✅ Les paramètres sensibles (logo URL, etc.) sont troités correctement

## 📱 Responsivité

- ✅ L'interface admin fonctionne sur mobile/tablette/desktop
- ✅ Le logo change de taille sur mobile (responsive)
- ✅ Les formulaires sont adaptés à tous les écrans

## 💾 Sauvegarde

Les paramètres sont stockés en base de données, assurez-vous de:
- Faire des backups réguliers de la BDD MySQL
- Conserver les URLs des logos (si hébergés externes)
- Documenter les liens configurés

## 📈 Monitoring

Surveillez les logs pour:
- Erreurs de sauvegarde des paramètres
- Erreurs de validation d'URL
- Erreurs de chargement du cache

Exemple:
```
[ADMIN/SETTINGS] Paramètres mis à jour par l'utilisateur #1
```

## 🎓 Formation des administrateurs

Formez vos administrateurs à:
1. Accéder à la page de paramètres
2. Modifier les paramètres
3. Tester les URLs
4. Vérifier l'affichage sur le site public
