'use strict';

/**
 * Script Playwright pour capturer le screenshot du profil utilisateur
 * Sauvegarde dans docs/screenshots/14-profil.png
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Identifiants de test disponibles depuis codespace.sql
const TEST_USER = {
  email: 'hugo.bernard@lanparty.local',
  password: 'Admin1234'
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

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

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    // Attendre que le serveur soit prêt
    const serverReady = await waitForServer();
    if (!serverReady) {
      throw new Error(`Serveur non accessible sur ${BASE_URL}`);
    }

    // Naviguer vers la page de connexion
    console.log('📱 Navigation vers la connexion...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'load' });

    // Attendre que le formulaire soit présent
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    console.log('✅ Formulaire de connexion détecté');

    // Récupérer le token CSRF s'il existe
    const csrfToken = await page.getAttribute('input[name="_csrf"]', 'value').catch(() => null);
    console.log('🔐 Token CSRF:', csrfToken ? 'présent' : 'absent');

    // Remplir le formulaire
    console.log('✍️ Remplissage du formulaire...');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);

    // Soumettre le formulaire
    console.log('🔑 Connexion en cours...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    console.log('✅ Authentification réussie');

    // Naviguer vers le profil
    console.log('👤 Navigation vers le profil...');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'load' });

    // S'assurer que la page profil est chargée
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000)); // Attendre le rendu

    console.log('🎨 Capture du screenshot...');
    
    // Créer le répertoire s'il n'existe pas
    const screenshotPath = path.join(__dirname, '../docs/screenshots/14-profil.png');
    const dir = path.dirname(screenshotPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Prendre le screenshot
    await page.screenshot({
      path: screenshotPath,
      fullPage: false  // Ne pas fullPage pour respecter la viewport
    });

    console.log(`✅ Screenshot sauvegardé: ${screenshotPath}`);
    console.log(`📍 Chemin complet: ${path.resolve(screenshotPath)}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
