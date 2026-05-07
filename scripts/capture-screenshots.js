#!/usr/bin/env node
/**
 * Script de capture d'écran automatique pour le README.
 *
 * Usage :
 *   APP_URL=http://localhost:3000 node scripts/capture-screenshots.js
 *
 * Prérequis :
 *   npm install --save-dev puppeteer
 *
 * Les captures sont enregistrées dans docs/screenshots/.
 * L'application doit être démarrée et accessible avant de lancer ce script.
 */

'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lanparty.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234';
const MOD_EMAIL = process.env.MOD_EMAIL || 'lea.martin@lanparty.local';
const MOD_PASSWORD = process.env.MOD_PASSWORD || 'Admin1234';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/** Captures à effectuer en tant que visiteur anonyme */
const PUBLIC_SHOTS = [
  { name: '01-accueil.png', path: '/', label: 'Page d\'accueil' },
  { name: '02-actualites.png', path: '/news', label: 'Actualités' },
  { name: '03-evenements.png', path: '/events', label: 'Événements' },
  { name: '04-connexion.png', path: '/auth/login', label: 'Connexion' },
  { name: '05-inscription.png', path: '/auth/register', label: 'Inscription' },
];

/** Captures à effectuer après connexion admin */
const ADMIN_SHOTS = [
  { name: '06-admin-dashboard.png', path: '/admin', label: 'Dashboard admin' },
  { name: '07-admin-evenements.png', path: '/admin/events', label: 'Gestion événements' },
  { name: '08-admin-jeux.png', path: '/admin/games', label: 'Gestion jeux' },
  { name: '09-admin-salles.png', path: '/admin/rooms', label: 'Gestion salles' },
  { name: '10-admin-utilisateurs.png', path: '/admin/users', label: 'Gestion utilisateurs' },
];

/** Captures à effectuer après connexion modérateur */
const MOD_SHOTS = [
  { name: '11-moderateur-scan.png', path: '/moderator', label: 'Contrôle d\'accès' },
  { name: '12-moderateur-rencontres.png', path: '/moderator/battles', label: 'Tableau de bord rencontres' },
];

async function screenshot(page, outputName, urlPath) {
  try {
    await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'networkidle2', timeout: 15000 });
    const outFile = path.join(OUTPUT_DIR, outputName);
    await page.screenshot({ path: outFile, fullPage: true });
    console.log(`  ✓ ${outputName}`);
  } catch (err) {
    console.error(`  ✗ ${outputName} : ${err.message}`);
  }
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ]);
}

async function logout(page) {
  await page.goto(`${BASE_URL}/auth/logout`, { waitUntil: 'networkidle2' });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Pages publiques
  console.log('\n📸 Pages publiques...');
  for (const shot of PUBLIC_SHOTS) {
    await screenshot(page, shot.name, shot.path);
  }

  // Pages admin
  console.log('\n📸 Pages admin...');
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  for (const shot of ADMIN_SHOTS) {
    await screenshot(page, shot.name, shot.path);
  }
  await logout(page);

  // Pages modérateur
  console.log('\n📸 Pages modérateur...');
  await login(page, MOD_EMAIL, MOD_PASSWORD);
  for (const shot of MOD_SHOTS) {
    await screenshot(page, shot.name, shot.path);
  }

  await browser.close();
  console.log(`\n✅ Captures enregistrées dans ${OUTPUT_DIR}`);
})();
