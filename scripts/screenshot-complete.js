'use strict';

/**
 * Script Playwright de capture complète de tous les écrans
 * Génère les screenshots pour la documentation README
 * 
 * Arborescence:
 * - Routes publiques (sans auth)
 * - Routes utilisateurs (avec auth user simple)
 * - Routes modérateurs (avec auth modérateur)
 * - Routes administrateur (avec auth admin)
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Utilisateurs de test (depuis install.sql et codespace.sql)
const USERS = {
  regular: {
    email: 'hugo.bernard@lanparty.local',
    password: 'Admin1234',
    name: 'utilisateur régulier'
  },
  moderator: {
    email: 'lea.martin@lanparty.local',
    password: 'Admin1234',
    name: 'modérateur'
  },
  admin: {
    email: 'admin@lanparty.local',  // Admin par défaut depuis install.sql
    password: 'Admin1234',
    name: 'administrateur'
  }
};

// Routes à capturer avec leur numéro et contexte
const ROUTES = [
  // Publiques (pas d'auth requise)
  { num: '01', path: '/', name: 'Accueil', auth: null },
  { num: '02', path: '/events', name: 'Événements', auth: null },
  { num: '03', path: '/news', name: 'Actualités', auth: null },
  { num: '04', path: '/auth/login', name: 'Connexion', auth: null },
  { num: '05', path: '/auth/register', name: 'Inscription', auth: null },
  
  // Utilisateur régulier (après connexion)
  { num: '14', path: '/profile', name: 'Profil utilisateur', auth: 'regular' },
  { num: '14b', path: '/profile/badge', name: 'Badge QR code', auth: 'regular' },
  
  // Modérateur
  { num: '10', path: '/moderator', name: 'Contrôle d\'accès', auth: 'moderator' },
  { num: '16', path: '/moderator/events/1/scan', name: 'Scan des tickets', auth: 'moderator' },
  { num: '17', path: '/battles/events/1/create', name: 'Formulaire rencontres', auth: 'moderator' },
  { num: '11', path: '/battles', name: 'Tableau de bord rencontres', auth: 'moderator' },
  
  // Admin
  { num: '06', path: '/admin', name: 'Dashboard administrateur', auth: 'admin' },
  { num: '07', path: '/admin/events', name: 'Gestion des événements', auth: 'admin' },
  { num: '08', path: '/admin/games', name: 'Gestion des jeux', auth: 'admin' },
  { num: '09', path: '/admin/rooms', name: 'Gestion des salles', auth: 'admin' },
  { num: '12', path: '/admin/news', name: 'Gestion de l\'actualité', auth: 'admin' },
  { num: '15', path: '/admin/settings', name: 'Paramètres de l\'application', auth: 'admin' },
];

async function waitForServer(maxAttempts = 20, delayMs = 1000) {
  console.log(`🔄 Vérification du serveur sur ${BASE_URL}...`);
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/`, { method: 'HEAD' });
      if (response.ok || response.status === 404 || response.status === 302) {
        console.log('✅ Serveur prêt');
        return true;
      }
    } catch (e) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
}

async function login(page, user) {
  console.log(`  🔐 Authentification: ${user.name}...`);
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'load' });
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
    page.click('button[type="submit"]')
  ]);
  console.log(`  ✅ ${user.name} authentifié`);
}

async function captureRoute(page, route) {
  try {
    const name = route.name.toLowerCase().replace(/[\s']/g, '-');
    const screenshotPath = path.join(__dirname, `../docs/screenshots/${route.num}-${name}.png`);
    
    console.log(`  📍 ${route.path}`);
    
    // Naviguer vers la route
    const url = `${BASE_URL}${route.path}`;
    await page.goto(url, { waitUntil: 'load' });
    
    // Attendre le chargement
    await page.waitForTimeout(300);
    
    // Vérifier pour les pages d'erreur
    const titleOrError = await page.textContent('title, h1, h2, .error-container').catch(() => '');
    if (titleOrError.toLowerCase().includes('erreur') || titleOrError.toLowerCase().includes('denied')) {
      console.log(`  ⚠️ Erreur d'accès ou page d'erreur`);
      return false;
    }
    
    // Créer le répertoire
    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });
    
    console.log(`  ✅ ${route.name}`);
    return true;
    
  } catch (error) {
    console.log(`  ❌ ${route.name}: ${error.message}`);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const results = {
    success: [],
    failed: []
  };

  try {
    const serverReady = await waitForServer();
    if (!serverReady) {
      throw new Error(`Serveur non accessible sur ${BASE_URL}`);
    }

    console.log('\n🚀 Capture complète des screenshots\n');

    // Grouper par auth pour réutiliser la page/session
    const groupedRoutes = {
      public: ROUTES.filter(r => r.auth === null),
      regular: ROUTES.filter(r => r.auth === 'regular'),
      moderator: ROUTES.filter(r => r.auth === 'moderator'),
      admin: ROUTES.filter(r => r.auth === 'admin'),
    };

    // Capturer par groupe d'auth
    for (const [authType, routes] of Object.entries(groupedRoutes)) {
      if (routes.length === 0) continue;
      
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📦 Routes ${authType === 'public' ? 'publiques' : authType}`);
      console.log(`${'='.repeat(50)}`);
      
      // Créer un contexte/page frais pour ce groupe d'auth
      const groupContext = await browser.newContext({
        viewport: { width: 1280, height: 800 }
      });
      const page = await groupContext.newPage();
      
      try {
        // Authentifier si nécessaire
        if (authType !== 'public') {
          await login(page, USERS[authType]);
        }
        
        // Capturer toutes les routes de ce groupe
        for (const route of routes) {
          const success = await captureRoute(page, route);
          if (success) {
            results.success.push(route.name);
          } else {
            results.failed.push(route.name);
          }
        }
      } finally {
        await page.close();
        await groupContext.close();
      }
    }

    console.log(`\n\n${'='.repeat(50)}`);
    console.log('📊 RÉSUMÉ');
    console.log(`${'='.repeat(50)}`);
    console.log(`✅ Réussis: ${results.success.length}/${ROUTES.length}`);
    results.success.forEach(name => console.log(`   - ${name}`));
    
    if (results.failed.length > 0) {
      console.log(`\n❌ Échoués: ${results.failed.length}`);
      results.failed.forEach(name => console.log(`   - ${name}`));
    }

  } catch (error) {
    console.error('❌ Erreur critique:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
