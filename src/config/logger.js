/**
 * Configuration du système de logs avec Winston
 * Logs vers console (développement) et fichiers (production)
 */
const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, json } = winston.format;

// Format personnalisé pour les logs console
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level}: ${message}${metaStr}`;
});

// Transports selon l'environnement
const transports = [
  // Console toujours active
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    ),
  }),
];

// En production ou développement : logs vers fichiers
if (process.env.NODE_ENV !== 'test') {
  const logsDir = path.join(process.cwd(), 'logs');

  transports.push(
    // Tous les logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: combine(timestamp(), json()),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Erreurs uniquement
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: combine(timestamp(), json()),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports,
});

module.exports = logger;
