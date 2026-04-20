require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lan_party_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Support unix socket connections (common on Linux MariaDB installs)
if (process.env.DB_SOCKET_PATH) {
  dbConfig.socketPath = process.env.DB_SOCKET_PATH;
  delete dbConfig.host;
  delete dbConfig.port;
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;
