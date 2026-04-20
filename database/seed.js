/**
 * Script de seeding - Charge les données de démonstration
 * Usage: node database/seed.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lan_party_manager',
  multipleStatements: true
};

async function seed() {
  console.log('🌱 Démarrage du seeding...');
  let conn;

  try {
    conn = await mysql.createConnection(config);
    console.log('✅ Connexion DB établie');

    // Créer les utilisateurs avec bcrypt
    console.log('👤 Création des utilisateurs...');
    const users = [
      { username: 'admin', email: 'admin@lanparty.local', password: 'Admin123!', role: 'admin' },
      { username: 'moderateur', email: 'modo@lanparty.local', password: 'Modo123!', role: 'moderator' },
      { username: 'gamer1', email: 'gamer1@example.com', password: 'Gamer123!', role: 'user' },
      { username: 'gamer2', email: 'gamer2@example.com', password: 'Gamer123!', role: 'user' },
      { username: 'gamer3', email: 'gamer3@example.com', password: 'Gamer123!', role: 'user' },
      { username: 'gamer4', email: 'gamer4@example.com', password: 'Gamer123!', role: 'user' },
      { username: 'gamer5', email: 'gamer5@example.com', password: 'Gamer123!', role: 'user' }
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await conn.query(
        'INSERT IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [u.username, u.email, hash, u.role]
      );
      console.log(`  ✓ Utilisateur: ${u.username} (${u.role})`);
    }

    // Récupérer l'ID de l'admin
    const [adminRows] = await conn.query("SELECT id FROM users WHERE username = 'admin'");
    const adminId = adminRows[0]?.id || 1;

    // Charger les seeds SQL (news + events) avec remplacement du placeholder
    console.log('📰 Chargement des actualités et événements...');
    const seeds = fs.readFileSync(path.join(__dirname, 'seeds.sql'), 'utf8');
    const seedsWithId = seeds.replace(/ADMIN_ID/g, adminId);
    await conn.query(seedsWithId);

    // Marquer comme installé
    await conn.query(
      "INSERT INTO settings (`key`, `value`) VALUES ('installed', 'true') ON DUPLICATE KEY UPDATE `value` = 'true'"
    );
    await conn.query(
      "INSERT INTO settings (`key`, `value`) VALUES ('app_name', 'LAN Party Manager') ON DUPLICATE KEY UPDATE `value` = 'LAN Party Manager'"
    );

    console.log('\n✅ Seeding terminé avec succès!');
    console.log('');
    console.log('🔑 Comptes de test:');
    console.log('   Admin:       admin@lanparty.local / Admin123!');
    console.log('   Modérateur:  modo@lanparty.local / Modo123!');
    console.log('   Utilisateur: gamer1@example.com / Gamer123!');
  } catch (err) {
    console.error('❌ Erreur de seeding:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seed();
