module.exports = {
  // Clientes
  getClientes: 'SELECT Rut_cl AS rut, Rsoc_cl AS razonSocial FROM Clientes ORDER BY Rsoc_cl',
  saveCliente: `INSERT INTO Clientes (Rut_cl, Rsoc_cl) VALUES (?, ?)
                ON CONFLICT(Rut_cl) DO UPDATE SET Rsoc_cl = excluded.Rsoc_cl`,
  deleteCliente: 'DELETE FROM Clientes WHERE Rut_cl = ?',
  revisarClientes: `SELECT DISTINCT v.Rut AS rut, v.Rsoc AS razonSocial 
                    FROM Ventas v LEFT JOIN Clientes c ON v.Rut = c.Rut_cl 
                    WHERE c.Rut_cl IS NULL`,

  // Proveedores
  getProveedores: `SELECT p.Rut AS rut, p.Rsoc AS razonSocial, p.Cuenta AS cuenta, c.Nombre AS nombreCuenta 
                   FROM Provee p LEFT JOIN Cuenta c ON p.Cuenta = c.Codigo ORDER BY p.Rsoc`,
  saveProveedor: `INSERT INTO Provee (Rut, Rsoc, Cuenta) VALUES (?, ?, ?)
                  ON CONFLICT(Rut) DO UPDATE SET Rsoc = excluded.Rsoc, Cuenta = excluded.Cuenta`,
  deleteProveedor: 'DELETE FROM Provee WHERE Rut = ?',
  revisarProveedores: `SELECT DISTINCT c.Rut AS rut, c.Rsoc AS razonSocial, c.Numdoc AS numdoc, c.Total AS total 
                       FROM Compras c LEFT JOIN Provee p ON c.Rut = p.Rut 
                       WHERE p.Rut IS NULL OR p.Cuenta IS NULL OR p.Cuenta = ''`,

  // Cuentas
  getCuentas: 'SELECT Codigo AS codigo, Nombre AS nombre, Tipo AS tipo FROM Cuenta ORDER BY Codigo',
  saveCuenta: `INSERT INTO Cuenta (Codigo, Nombre, Tipo) VALUES (?, ?, ?)
               ON CONFLICT(Codigo) DO UPDATE SET Nombre = excluded.Nombre, Tipo = excluded.Tipo`,
  deleteCuenta: 'DELETE FROM Cuenta WHERE Codigo = ?'
};