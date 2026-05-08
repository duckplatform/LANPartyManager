'use strict';

/**
 * Script Playwright pour capturer les trois screenshots manquants:
 * - 15-admin-settings.png (paramètres admin)
 * - 16-moderateur-scan.png (scan des tickets)
 * - 17-rencontres-form-step1.png (formulaire de création de rencontre)
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Identifiants de test
const ADMIN_USER = {
  email: 'lea.martin@lanparty.local',
  password: 'Admin1234'
};

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

async function login(page, email, password) {
  console.log(`🔐 Connexion en tant que ${email}...`);
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'load' });
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
    page.click('button[type="submit"]')
  ]);
  console.log('✅ Authentification réussie');
}

async function takeScreenshot(page, name, filename) {
  console.log(`📸 Capture ${name}...`);
  await page.waitForSelector('body', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 500));
  
  const screenshotPath = path.join(__dirname, `../docs/screenshots/${filename}`);
  const dir = path.dirname(screenshotPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  await page.screenshot({
    path: screenshotPath,
    fullPage: false
  });
  
  console.log(`✅ ${name} sauvegardé`);
  return screenshotPath;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  const results = [];

  try {
    const serverReady = await waitForServer();
    if (!serverReady) {
      throw new Error(`Serveur non accessible`);
    }

    // SCREENSHOT 1: Paramètres administrateur
    console.log('\n=== SCREENSHOT 15: Paramètres Administrateur ===');
    await login(page, ADMIN_USER.email, ADMIN_USER.password);
    await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'load' });
    results.push(await takeScreenshot(page, 'Paramètres Admin', '15-admin-settings.png'));

    // SCREENSHOT 2: Scan des tickets (modérateur)
    console.log('\n=== SCREENSHOT 16: Scan Tickets ===');
    // Aller à la page du modérateur
    await page.goto(`${BASE_URL}/moderator`, { waitUntil: 'load' });
    
    // Chercher un lien scan ou creer un avec un ID fixe
    let scanUrl = null;
    try {
      scanUrl = await page.$eval('a[href*="/scan"]', el => el.getAttribute('href'));
    } catch (e) {
      // Si pas de lien, essayer un ID fixe (1 est souvent l'ID par défaut)
      scanUrl = '/moderator/events/1/scan';
    }
    
    if (scanUrl) {
      await page.goto(`${BASE_URL}${scanUrl}`, { waitUntil: 'load' });
      results.push(await takeScreenshot(page, 'Scan Tickets', '16-moderateur-scan.png'));
    }

    // SCREENSHOT 3: Formulaire de création de rencontre (étape 1)
    console.log('\n=== SCREENSHOT 17: Formulaire Rencontres ===');
    
    // Chercher un lien create
    let createUrl = null;
    try {
      await page.goto(`${BASE_URL}/moderator`, { waitUntil: 'load' });
      createUrl = await page.$eval('a[href*="/create"]', el => el.getAttribute('href'));
    } catch (e) {
      // Si pas de lien, essayer un ID fixe
      createUrl = '/battles/events/1/create';
    }
    
    if (createUrl) {
      await page.goto(`${BASE_URL}${createUrl}`, { waitUntil: 'load' });
      // Vérifier que la page a chargé (formulaire présent)
      await page.waitForSelector('select, button, form', { timeout: 5000 }).catch(() => {});
      results.push(await takeScreenshot(page, 'Formulaire Rencontres', '17-rencontres-form-step1.png'));
    } else {
      console.log('⚠️ Pas de formulaire création rencontre disponible');
    }

    console.log('\n=== RÉSUMÉ ===');
    results.forEach(result => console.log(`✅ ${result}`));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
