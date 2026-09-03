const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function hexSqlDateToIso(hexStr) {
  const cleanHex = hexStr.replace(/^0x/i, '');
  if (cleanHex.length !== 8) return null;

  const b0 = parseInt(cleanHex.substr(0, 2), 16);
  const b1 = parseInt(cleanHex.substr(2, 2), 16);
  const b2 = parseInt(cleanHex.substr(4, 2), 16);

  const daysSinceYear1 = b0 + (b1 << 8) + (b2 << 16);
  const daysSinceEpoch = daysSinceYear1 - 719162;
  const ms = daysSinceEpoch * 86400000;
  
  const dateObj = new Date(ms);
  return dateObj.toISOString().split('T')[0];
}

function processAndFilterInsertsOnly(rawContent) {
  // Dividir en líneas respetando saltos de línea Windows/Unix
  const lines = rawContent.split(/\r?\n/);
  const validStatements = [];

  for (let line of lines) {
    line = line.trim();

    // FILTRO DE ORO: Ignorar todo lo que no empiece por INSERT
    if (!line.toUpperCase().startsWith('INSERT')) {
      continue;
    }

    // Sanitización específica para SQLite
    let cleanLine = line
      .replace(/N'([^']*)'/g, "'$1'")              // Quitar prefijo N'...' -> '...'
      .replace(/\[dbo\]\./gi, '')                  // Quitar [dbo].
      .replace(/\[(.*?)\]/g, '$1');                // Quitar corchetes [Tabla] -> Tabla

    // Asegurar sintaxis INSERT INTO
    cleanLine = cleanLine.replace(/^INSERT\s+(?!INTO\b)/gi, 'INSERT INTO ');

    // Convertir CAST(0xHEX AS Date) -> 'YYYY-MM-DD'
    cleanLine = cleanLine.replace(/CAST\((0x[0-9a-fA-F]+)\s+AS\s+Date\)/gi, (match, hexValue) => {
      const isoDate = hexSqlDateToIso(hexValue);
      return isoDate ? `'${isoDate}'` : 'NULL';
    });

    // Garantizar que termine en punto y coma ';'
    if (!cleanLine.endsWith(';')) {
      cleanLine += ';';
    }

    validStatements.push(cleanLine);
  }

  return validStatements.join('\n');
}

// Los .sql viven en la carpeta sql/ del proyecto (no en server/).
const sqlDir = path.join(__dirname, '..', 'sql');

const dataImports = [
  { sqlFile: 'datos_empresa.sql', dbFile: 'empresa.sqlite' },
  { sqlFile: 'datos_ferroq.sql', dbFile: 'ferroq.sqlite' },
];

// Vacía todas las tablas de usuario antes de reimportar, sin tocar el esquema
// (que ya tiene tablas/columnas agregadas en caliente por el backend -- Hojas,
// Resultado, Libro_sue, Decla_hon.Prest, etc. -- que schema_sqlite.sql no
// conoce). Así la importación siempre parte de una base limpia sin duplicar
// filas ni chocar con las PRIMARY KEY existentes.
function vaciarTablas(db) {
  const tablas = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).all();
  const vaciar = db.transaction(() => {
    tablas.forEach(({ name }) => {
      db.prepare(`DELETE FROM "${name}"`).run();
    });
  });
  vaciar();
  console.log(`  Vaciadas ${tablas.length} tablas existentes.`);
}

dataImports.forEach(({ sqlFile, dbFile }) => {
  const sqlPath = path.join(sqlDir, sqlFile);
  const dbPath = path.join(__dirname, dbFile);

  if (!fs.existsSync(sqlPath)) {
    console.log(`- Omitiendo ${sqlFile} (no encontrado en ${sqlDir})`);
    return;
  }

  console.log(`\nProcesando ${sqlFile}...`);
  let rawBuffer = fs.readFileSync(sqlPath);
  let rawContent = (rawBuffer[0] === 0xFF && rawBuffer[1] === 0xFE)
    ? rawBuffer.toString('utf16le')
    : rawBuffer.toString('utf8');

  const statementsSql = processAndFilterInsertsOnly(rawContent);
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = OFF');

  const start = Date.now();

  try {
    vaciarTablas(db);

    console.log(`Insertando en ${dbFile}...`);
    const insertTransaction = db.transaction((sqlBlock) => {
      db.exec(sqlBlock);
    });
    insertTransaction(statementsSql);

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✓ ¡Éxito! Registros insertados en ${dbFile} en ${duration}s`);
  } catch (err) {
    console.error(`✕ Error en ${dbFile}:`, err.message);
  } finally {
    db.pragma('synchronous = NORMAL');
    db.close();
  }
});