// Vuelca una base .sqlite completa (esquema + datos) a un archivo .sql de
// texto plano, para poder sacarla de una maquina (ej. la del cliente) y
// traerla a otra sin copiar el binario .sqlite. Uso:
//
//   node scripts/dump_db.js empresa.sqlite
//   node scripts/dump_db.js           (vuelca empresa.sqlite, ferroq.sqlite y
//                                       parcela.sqlite, las que existan)
//
// Genera "<nombre>_dump.sql" en la misma carpeta del .sqlite.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const escapar = (valor) => {
  if (valor === null || valor === undefined) return 'NULL';
  if (typeof valor === 'number') return String(valor);
  if (Buffer.isBuffer(valor)) return `X'${valor.toString('hex')}'`;
  return `'${String(valor).replace(/'/g, "''")}'`;
};

function volcarBaseDatos(dbFile) {
  const db = new Database(dbFile, { readonly: true });
  const salida = [];

  salida.push('PRAGMA foreign_keys=OFF;');
  salida.push('BEGIN TRANSACTION;');

  const tablas = db.prepare(`
    SELECT name, sql FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  for (const tabla of tablas) {
    salida.push(`${tabla.sql};`);

    const columnas = db.prepare(`PRAGMA table_info(${tabla.name})`).all().map(c => c.name);
    const filas = db.prepare(`SELECT * FROM ${tabla.name}`).all();

    for (const fila of filas) {
      const valores = columnas.map(c => escapar(fila[c])).join(', ');
      salida.push(`INSERT INTO ${tabla.name} (${columnas.join(', ')}) VALUES (${valores});`);
    }
  }

  salida.push('COMMIT;');
  db.close();

  const destino = dbFile.replace(/\.sqlite$/, '_dump.sql');
  fs.writeFileSync(destino, salida.join('\n'), 'utf8');
  console.log(`${dbFile} -> ${destino} (${tablas.length} tablas)`);
}

const argumento = process.argv[2];
const archivos = argumento
  ? [argumento]
  : ['empresa.sqlite', 'ferroq.sqlite', 'parcela.sqlite'].filter(f => fs.existsSync(path.join(__dirname, '..', f)));

if (archivos.length === 0) {
  console.error('No se encontro ningun .sqlite para volcar.');
  process.exit(1);
}

for (const archivo of archivos) {
  const rutaCompleta = path.isAbsolute(archivo) ? archivo : path.join(__dirname, '..', archivo);
  volcarBaseDatos(rutaCompleta);
}
