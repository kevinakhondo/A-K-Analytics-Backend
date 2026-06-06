const crypto = require('crypto');

const ALGO = 'aes-256-cbc';

function getKey() {
  const raw = process.env.DB_CREDS_SECRET;
  if (!raw || raw.length < 64) throw new Error('DB_CREDS_SECRET must be a 64-char hex string');
  return Buffer.from(raw, 'hex');
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(data) {
  const [ivHex, encHex] = data.split(':');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
