require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  const connConfig = {
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  // Support unix socket connections (common on Linux MariaDB installs)
  if (process.env.DB_SOCKET_PATH) {
    connConfig.socketPath = process.env.DB_SOCKET_PATH;
  } else {
    connConfig.host = process.env.DB_HOST || 'localhost';
    connConfig.port = parseInt(process.env.DB_PORT) || 3306;
  }

  const connection = await mysql.createConnection(connConfig);

  const dbName = process.env.DB_NAME || 'lan_party_manager';

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' ready.`);

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
    console.log("Table 'members' ready.");

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
         VALUES (?, ?, ?, ?, ?, 'admin')`,
        ['Admin', 'LAN', 'admin', adminEmail, hashed]
      );
      console.log(`Default admin created: ${adminEmail}`);
    } else {
      console.log('Admin account already exists.');
    }
  } finally {
    await connection.end();
  }
}

initDatabase()
  .then(() => {
    console.log('Database initialization complete.');
    process.exit(0);
  })
  .catch((err) => {
    if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.errno === 1045) {
      console.error('Database initialization failed: Access denied.');
      console.error('');
      console.error('Possible fixes:');
      console.error('  1. Check DB_USER and DB_PASSWORD in your .env file.');
      console.error('  2. If you use MariaDB on Linux, the root user may require unix socket');
      console.error('     authentication. Add this to your .env:');
      console.error('       DB_SOCKET_PATH=/var/run/mysqld/mysqld.sock');
      console.error('     Then leave DB_PASSWORD empty (or remove it).');
      console.error('  3. Alternatively, create a dedicated database user:');
      console.error('       CREATE USER \'lpm\'@\'localhost\' IDENTIFIED BY \'yourpassword\';');
      console.error('       GRANT ALL PRIVILEGES ON lan_party_manager.* TO \'lpm\'@\'localhost\';');
      console.error('       FLUSH PRIVILEGES;');
      console.error('     Then update DB_USER and DB_PASSWORD in .env accordingly.');
    } else {
      console.error('Database initialization failed:', err.message);
    }
    process.exit(1);
  });
