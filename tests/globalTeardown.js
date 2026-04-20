/**
 * Jest global teardown – closes the shared MySQL pool so Jest can exit cleanly.
 */
async function teardown() {
  try {
    const pool = require('../src/config/database');
    await pool.end();
  } catch {
    // pool may already be closed; ignore
  }
}

module.exports = teardown;
