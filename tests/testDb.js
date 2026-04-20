/**
 * Test database setup helpers.
 * Creates/migrates a dedicated test database and seeds a default admin.
 */
require('dotenv').config({ path: '.env.test' });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let connection;

async function setupTestDb() {
  connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'lan_party_manager_test';

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.query(`USE \`${dbName}\``);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS members (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      nom         VARCHAR(100)  NOT NULL,
      prenom      VARCHAR(100)  NOT NULL,
      surnom      VARCHAR(100)  NOT NULL UNIQUE,
      email       VARCHAR(255)  NOT NULL UNIQUE,
      password    VARCHAR(255)  NOT NULL,
      role        ENUM('member','admin') NOT NULL DEFAULT 'member',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await seedAdmin();
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lanparty.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  const [rows] = await connection.query(
    'SELECT id FROM members WHERE email = ?',
    [adminEmail]
  );

  if (rows.length === 0) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await connection.query(
      `INSERT INTO members (nom, prenom, surnom, email, password, role)
       VALUES ('Admin', 'LAN', 'admin', ?, ?, 'admin')`,
      [adminEmail, hashed]
    );
  }
}

async function clearMembers() {
  await connection.query('DELETE FROM members WHERE role = ?', ['member']);
}

async function teardownTestDb() {
  if (connection) {
    await connection.end();
  }
}

module.exports = { setupTestDb, clearMembers, teardownTestDb };
