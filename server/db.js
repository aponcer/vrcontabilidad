const path = require('path');
const Database = require('better-sqlite3');

// Mapeo de IDs recibidos desde la cabecera del Frontend a los archivos SQLite
const DB_MAP = {
  hro: 'empresa.sqlite',
  empresa: 'empresa.sqlite',
  parcela: 'parcela.sqlite',
  ferroq: 'ferroq.sqlite'
};

const instances = {};

function getDbConnection(companyId = 'hro') {
  const targetFile = DB_MAP[companyId.toLowerCase()] || 'empresa.sqlite';
  const dbPath = path.join(__dirname, targetFile);

  if (!instances[targetFile]) {
    instances[targetFile] = new Database(dbPath);
    instances[targetFile].pragma('journal_mode = WAL');
  }

  return instances[targetFile];
}

module.exports = { getDbConnection, DB_MAP };