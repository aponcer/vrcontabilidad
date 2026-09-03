// Copia este archivo como "empresas.js" (misma carpeta, sin el sufijo
// ".example") y reemplaza los datos de ejemplo por las empresas reales.
// empresas.js está en .gitignore -- nunca se sube al repositorio, así el
// código público no revela clientes reales.
//
// Cada entrada:
//   id      -> identificador interno, minúsculas sin espacios (debe existir
//              también en DB_MAP dentro de server/db.js)
//   name    -> nombre que se muestra en el selector de la interfaz
//   status  -> 'online' | 'offline' | 'unconfigured'
//   dbFile  -> nombre del archivo .sqlite de esa empresa (debe existir en server/)

module.exports = [
  // { id: 'empresa1', name: 'Poner aquí el nombre de la empresa', status: 'online', dbFile: 'empresa1.sqlite' },
]
