module.exports = {
  // Clientes (Manten.frm -> SSTab1 Tab 0)
  getClientes: `
    SELECT Rut_cl AS rut, Rsoc_cl AS razonSocial 
    FROM Clientes 
    ORDER BY Rsoc_cl
  `,
  saveCliente: `
    INSERT INTO Clientes (Rut_cl, Rsoc_cl) VALUES (?, ?)
    ON CONFLICT(Rut_cl) DO UPDATE SET Rsoc_cl = excluded.Rsoc_cl
  `,
  deleteCliente: `
    DELETE FROM Clientes WHERE Rut_cl = ?
  `,
  revisarClientes: `
    SELECT DISTINCT v.Rut AS rut, v.Rsoc AS razonSocial
    FROM Ventas v
    LEFT JOIN Clientes c ON v.Rut = c.Rut_cl
    WHERE c.Rut_cl IS NULL
  `,
  getClientePorRut: `
    SELECT Rut_cl AS rut, Rsoc_cl AS razonSocial FROM Clientes WHERE Rut_cl = ?
  `,

  // Proveedores (Manten.frm -> SSTab1 Tab 1)
  getProveedores: `
    SELECT p.Rut AS rut, p.Rsoc AS razonSocial, p.Cuenta AS cuenta, c.Nombre AS nombreCuenta 
    FROM Provee p 
    LEFT JOIN Cuenta c ON p.Cuenta = c.Codigo 
    ORDER BY p.Rsoc
  `,
  saveProveedor: `
    INSERT INTO Provee (Rut, Rsoc, Cuenta) VALUES (?, ?, ?)
    ON CONFLICT(Rut) DO UPDATE SET Rsoc = excluded.Rsoc, Cuenta = excluded.Cuenta
  `,
  deleteProveedor: `
    DELETE FROM Provee WHERE Rut = ?
  `,
  revisarProveedores: `
    SELECT DISTINCT c.Rut AS rut, c.Rsoc AS razonSocial, c.Numdoc AS numdoc, c.Total AS total
    FROM Compras c
    LEFT JOIN Provee p ON c.Rut = p.Rut
    WHERE p.Rut IS NULL OR p.Cuenta IS NULL OR p.Cuenta = ''
  `,
  getProveedorPorRut: `
    SELECT p.Rut AS rut, p.Rsoc AS razonSocial, p.Cuenta AS cuenta, c.Nombre AS nombreCuenta
    FROM Provee p
    LEFT JOIN Cuenta c ON p.Cuenta = c.Codigo
    WHERE p.Rut = ?
  `,

  // Cuentas (Manten.frm -> SSTab1 Tab 2)
  getCuentas: `
    SELECT Codigo AS codigo, Nombre AS nombre, Tipo AS tipo 
    FROM Cuenta 
    ORDER BY Codigo
  `,
  saveCuenta: `
    INSERT INTO Cuenta (Codigo, Nombre, Tipo) VALUES (?, ?, ?)
    ON CONFLICT(Codigo) DO UPDATE SET Nombre = excluded.Nombre, Tipo = excluded.Tipo
  `,
  deleteCuenta: `
    DELETE FROM Cuenta WHERE Codigo = ?
  `,
  getCuentaPorCodigo: `
    SELECT Codigo AS codigo, Nombre AS nombre, Tipo AS tipo FROM Cuenta WHERE Codigo = ?
  `,

  // Ejercicio / Numpol (Manten.frm -> SSTab1 Tab 3)
  insertNumpol: `
    INSERT INTO numpol (periodo, mes, numero) VALUES (?, ?, 0)
  `,
  // Compras (RegComp.frm -> SSTab1 Tab 0)
  getCompras: `
    SELECT c.Rut AS rut, p.Rsoc AS razonSocial, c.Tdoc AS tdoc, c.Numdoc AS numdoc, 
           c.Fecha AS fecha, c.Neto AS neto, c.Iva AS iva, c.Total AS total, 
           c.Glosa AS glosa, c.Cuenta AS cuenta 
    FROM Lcompra c 
    LEFT JOIN Provee p ON c.Rut = p.Rut 
    WHERE c.Rut = ? AND c.Tdoc = ? AND c.Numdoc = ?
  `,
  saveCompra: `
    INSERT INTO Lcompra (Rut, Tdoc, Numdoc, Fecha, Neto, Exen, Iva, Total, Glosa, Cuenta, Periodo, Control)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(Rut, Tdoc, Numdoc) DO UPDATE SET
      Fecha = excluded.Fecha, Neto = excluded.Neto, Exen = excluded.Exen, Iva = excluded.Iva,
      Total = excluded.Total, Glosa = excluded.Glosa, Cuenta = excluded.Cuenta,
      Periodo = excluded.Periodo
  `,
  deleteCompra: `
    DELETE FROM Lcompra WHERE Rut = ? AND Tdoc = ? AND Numdoc = ?
  `,

  // Ventas (RegComp.frm -> SSTab1 Tab 1)
  getVentas: `
    SELECT v.Rut AS rut, cl.Rsoc_cl AS razonSocial, v.Tdoc AS tdoc, v.Numdoc AS numdoc, 
           v.Fecha AS fecha, v.Neto AS neto, v.Iva AS iva, v.Total AS total 
    FROM Lventa v 
    LEFT JOIN Clientes cl ON v.Rut = cl.Rut_cl 
    WHERE v.Rut = ? AND v.Tdoc = ? AND v.Numdoc = ?
  `,
  saveVenta: `
    INSERT INTO Lventa (Rut, Tdoc, Numdoc, Fecha, Neto, Iva, Total, Periodo, Control) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(Rut, Tdoc, Numdoc) DO UPDATE SET 
      Fecha = excluded.Fecha, Neto = excluded.Neto, Iva = excluded.Iva, 
      Total = excluded.Total, Periodo = excluded.Periodo
  `,
  deleteVenta: `
    DELETE FROM Lventa WHERE Rut = ? AND Tdoc = ? AND Numdoc = ?
  `,

  // Operaciones SII / Procesamiento Masivo (RegComp.frm -> SSTab1 Tab 3 & Option3/Option4)
  clearLcompra: `DELETE FROM Lcompra`,
  getRawCompras: `SELECT * FROM Compras`,
  getRawVentas: `SELECT * FROM Ventas`,

  // Libro Diario (Lmayor.frm -> Tab "Libro Diario"). Ldiario NO tiene el mismo
  // esquema en las 3 empresas, por eso el INSERT y el orden de parámetros van
  // definidos por empresa; ver querys_ferroq.js / querys_parcela.js.
  deleteLdiario: `DELETE FROM Ldiario`,
  saveLdiarioLinea: `
    INSERT INTO Ldiario (Ncomp, Linea, Fecha, Cuenta, Debe, Haber, Glosa)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ldiarioParamOrder: ['ncomp', 'linea', 'fecha', 'cuenta', 'debe', 'haber', 'glosa'],
  getLdiarioReporte: `
    SELECT Ncomp, Linea, Fecha, Cuenta, Debe, Haber, Glosa
    FROM Ldiario
    ORDER BY Ncomp ASC, Linea ASC
  `,

  // Afp / Isapre (Remuner.frm). Mismo esquema (Nombre, Cotiza) en las 3 empresas.
  getAfp: `SELECT Nombre AS nombre, Cotiza AS cotizacion FROM Afp ORDER BY Nombre`,
  saveAfp: `
    INSERT INTO Afp (Nombre, Cotiza) VALUES (?, ?)
    ON CONFLICT(Nombre) DO UPDATE SET Cotiza = excluded.Cotiza
  `,
  deleteAfp: `DELETE FROM Afp WHERE Nombre = ?`,

  getIsapre: `SELECT Nombre AS nombre, Cotiza AS cotizacion FROM Isapre ORDER BY Nombre`,
  saveIsapre: `
    INSERT INTO Isapre (Nombre, Cotiza) VALUES (?, ?)
    ON CONFLICT(Nombre) DO UPDATE SET Cotiza = excluded.Cotiza
  `,
  deleteIsapre: `DELETE FROM Isapre WHERE Nombre = ?`,

  // --- Uf / Utm (MantRem.frm -> Tabs "Uf"/"Utm", fusionadas en "Actualizar valores IPC").
  // Esquema idéntico en las 3 empresas. Tipo_actualizacion/Fecha_actualizacion son
  // columnas propias de este mantenedor (no existían en el .frm original), agregadas
  // para llevar registro de si el valor vino de mindicador.cl o se tipeó a mano.
  getUf: `
    SELECT Periodo AS periodo, Valor AS valor, Tipo_actualizacion AS tipoActualizacion, Fecha_actualizacion AS fechaActualizacion
    FROM Uf WHERE Periodo = ?
  `,
  saveUf: `
    INSERT INTO Uf (Periodo, Valor, Tipo_actualizacion, Fecha_actualizacion) VALUES (?, ?, ?, ?)
    ON CONFLICT(Periodo) DO UPDATE SET
      Valor = excluded.Valor, Tipo_actualizacion = excluded.Tipo_actualizacion, Fecha_actualizacion = excluded.Fecha_actualizacion
  `,
  getUtm: `
    SELECT Periodo AS periodo, Valor AS valor, Tipo_actualizacion AS tipoActualizacion, Fecha_actualizacion AS fechaActualizacion
    FROM Utm WHERE Periodo = ?
  `,
  saveUtm: `
    INSERT INTO Utm (Periodo, Valor, Tipo_actualizacion, Fecha_actualizacion) VALUES (?, ?, ?, ?)
    ON CONFLICT(Periodo) DO UPDATE SET
      Valor = excluded.Valor, Tipo_actualizacion = excluded.Tipo_actualizacion, Fecha_actualizacion = excluded.Fecha_actualizacion
  `,

  // Tabla de Impuesto Único de 2da Categoría: Tab_iut trae los tramos como
  // múltiplos de UTM (Has1..7 tope, Reb1..7 rebaja); al grabar la Utm de un
  // período se recalcula Iut = tramo en pesos para ese período (Llena_tabla en VB6).
  // Idéntica en las 3 empresas.
  getTabIut: `SELECT Has1, Has2, Has3, Has4, Has5, Has6, Has7, Reb1, Reb2, Reb3, Reb4, Reb5, Reb6, Reb7 FROM Tab_iut LIMIT 1`,
  saveIut: `
    INSERT INTO Iut (
      Periodo, Tramo1, Tramo2, Tramo3, Tramo4, Tramo5, Tramo6, Tramo7,
      Porce1, Porce2, Porce3, Porce4, Porce5, Porce6, Porce7,
      Resta1, Resta2, Resta3, Resta4, Resta5, Resta6, Resta7
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Periodo) DO UPDATE SET
      Tramo1 = excluded.Tramo1, Tramo2 = excluded.Tramo2, Tramo3 = excluded.Tramo3,
      Tramo4 = excluded.Tramo4, Tramo5 = excluded.Tramo5, Tramo6 = excluded.Tramo6, Tramo7 = excluded.Tramo7,
      Porce1 = excluded.Porce1, Porce2 = excluded.Porce2, Porce3 = excluded.Porce3,
      Porce4 = excluded.Porce4, Porce5 = excluded.Porce5, Porce6 = excluded.Porce6, Porce7 = excluded.Porce7,
      Resta1 = excluded.Resta1, Resta2 = excluded.Resta2, Resta3 = excluded.Resta3,
      Resta4 = excluded.Resta4, Resta5 = excluded.Resta5, Resta6 = excluded.Resta6, Resta7 = excluded.Resta7
  `,

  // --- Honorarios (MantRem.frm -> Tab "Honorarios"). Esquema idéntico en las 3 empresas.
  getMaeHonActivos: `SELECT Rut AS rut, Nombre AS nombre FROM Mae_hon ORDER BY Nombre`,
  getMaeHonPorRut: `SELECT Rut AS rut, Nombre AS nombre, Certif AS certificado FROM Mae_hon WHERE Rut = ?`,
  saveMaeHon: `
    INSERT INTO Mae_hon (Rut, Nombre, Certif) VALUES (?, ?, ?)
    ON CONFLICT(Rut) DO UPDATE SET Nombre = excluded.Nombre, Certif = excluded.Certif
  `,
  deleteMaeHon: `DELETE FROM Mae_hon WHERE Rut = ?`,

  // --- Indices previsionales anuales (MantRem.frm -> Tab "Indices" / tabla Indi).
  // HRO trae los 9 campos completos del .frm; Ferroq/Parcela difieren (ver sus archivos).
  getIndiPorAgno: `
    SELECT Agno AS agno, Sis AS sis, Ces_emp AS cesEmpleador, Ces_trab AS cesTrabajador,
           Ac_trab AS accidenteTrabajo, Tope_imp AS topeImponible, Ap_adic AS aporteAdicional,
           Seg_social AS seguroSocial, Ex_vida AS expectativaVida
    FROM Indi WHERE Agno = ?
  `,
  saveIndi: `
    INSERT INTO Indi (Agno, Sis, Ces_emp, Ces_trab, Ac_trab, Tope_imp, Ap_adic, Seg_social, Ex_vida)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Agno) DO UPDATE SET
      Sis = excluded.Sis, Ces_emp = excluded.Ces_emp, Ces_trab = excluded.Ces_trab,
      Ac_trab = excluded.Ac_trab, Tope_imp = excluded.Tope_imp, Ap_adic = excluded.Ap_adic,
      Seg_social = excluded.Seg_social, Ex_vida = excluded.Ex_vida
  `,
  indiParamOrder: ['agno', 'sis', 'cesEmpleador', 'cesTrabajador', 'accidenteTrabajo', 'topeImponible', 'aporteAdicional', 'seguroSocial', 'expectativaVida'],

  // --- Personal / Ficha del trabajador (MantRem.frm -> Tab "Personal" / tabla Maeper).
  // HRO tiene Gratif y Cta_cte; Ferroq tiene Cta_cte pero no Gratif; Parcela no tiene ninguna
  // de las dos (ver querys_ferroq.js / querys_parcela.js para esas variantes).
  getMaeperActivos: `
    SELECT Rut AS rut, Apater AS apater, Amater AS amater, Nombres AS nombres
    FROM Maeper WHERE Vigente = 'S' ORDER BY Apater
  `,
  getMaeperPorRut: `
    SELECT Rut AS rut, Apater AS apater, Amater AS amater, Nombres AS nombres, Cargo AS cargo,
           Afp AS afp, Isapre AS isapre, Tipo_isap AS tipoIsapre, Val_isap AS valorIsapre,
           Tipo_sue AS tipoSueldo, Imponi AS imponible, Colac AS colacion, Movil AS movilizacion,
           Comis AS comisiones, Tipo_cont AS tipoContrato, Tipo_trab AS tipoTrabajador,
           Aguin AS aguinaldo, Vigente AS vigente, Fingres AS fechaIngreso, Fterm AS fechaTermino,
           Gratif AS gratificacion, Cta_cte AS ctaCte
    FROM Maeper WHERE Rut = ?
  `,
  saveMaeper: `
    INSERT INTO Maeper (
      Rut, Apater, Amater, Nombres, Cargo, Afp, Isapre, Val_isap, Fingres, Fterm,
      Imponi, Movil, Colac, Comis, Tipo_sue, Tipo_isap, Tipo_cont, Tipo_trab, Aguin, Vigente,
      Gratif, Cta_cte
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Rut) DO UPDATE SET
      Apater = excluded.Apater, Amater = excluded.Amater, Nombres = excluded.Nombres, Cargo = excluded.Cargo,
      Afp = excluded.Afp, Isapre = excluded.Isapre, Val_isap = excluded.Val_isap,
      Fingres = excluded.Fingres, Fterm = excluded.Fterm, Imponi = excluded.Imponi,
      Movil = excluded.Movil, Colac = excluded.Colac, Comis = excluded.Comis,
      Tipo_sue = excluded.Tipo_sue, Tipo_isap = excluded.Tipo_isap, Tipo_cont = excluded.Tipo_cont,
      Tipo_trab = excluded.Tipo_trab, Aguin = excluded.Aguin, Vigente = excluded.Vigente,
      Gratif = excluded.Gratif, Cta_cte = excluded.Cta_cte
  `,
  maeperParamOrder: [
    'rut', 'apater', 'amater', 'nombres', 'cargo', 'afp', 'isapre', 'valorIsapre', 'fechaIngreso', 'fechaTermino',
    'imponible', 'movilizacion', 'colacion', 'comisiones', 'tipoSueldo', 'tipoIsapre', 'tipoContrato', 'tipoTrabajador',
    'aguinaldo', 'vigente', 'gratificacion', 'ctaCte'
  ],
  deleteMaeper: `DELETE FROM Maeper WHERE Rut = ?`,

  // --- Liquidación de Sueldos (Liq_suel.frm -> tabla Liq_suel).
  // HRO tiene el esquema completo (incluye Cta_Cte, Gratif, Ap_adic, Seg_social, Ex_vida).
  getLiqSuelPorPeriodo: `
    SELECT Periodo AS periodo, Rut AS rut, Imponi AS imponible, Movil AS movilizacion, Colac AS colacion,
           Comis AS comisiones, Hab_imp AS totalImponible, Hab_noimp AS totalNoImponible, Tot_hab AS totalHaberes,
           Afp AS afpDescuento, Isapre AS saludDescuento, Adic_isap AS diferenciaIsapre, Hab_trib AS haberesTributables,
           Iut AS iut, Anticipo AS anticipo, Ces_trab AS cesTrabajador, Tot_desc AS totDesc, Ces_emp AS cesEmpresa,
           Sis AS sis, Acc_trab AS accTrabajo, Liquido AS liquido, Aguin AS aguinaldo, Cta_Cte AS ctaCte,
           Gratif AS gratificacion, Ap_adic AS aporteAdicional, Seg_social AS seguroSocial, Ex_vida AS expectativaVida
    FROM Liq_suel WHERE Periodo = ?
  `,
  // Variante por año (Dec_Juradas.frm -> Tab "Sueldos" -> Procesar_Click, filtra
  // por mid(Periodo,1,4), o sea el año completo, no un período AAAAMM puntual).
  getLiqSuelPorAgno: `
    SELECT Periodo AS periodo, Rut AS rut, Imponi AS imponible, Movil AS movilizacion, Colac AS colacion,
           Comis AS comisiones, Hab_imp AS totalImponible, Hab_noimp AS totalNoImponible, Tot_hab AS totalHaberes,
           Afp AS afpDescuento, Isapre AS saludDescuento, Adic_isap AS diferenciaIsapre, Hab_trib AS haberesTributables,
           Iut AS iut, Anticipo AS anticipo, Ces_trab AS cesTrabajador, Tot_desc AS totDesc, Ces_emp AS cesEmpresa,
           Sis AS sis, Acc_trab AS accTrabajo, Liquido AS liquido, Aguin AS aguinaldo, Cta_Cte AS ctaCte,
           Gratif AS gratificacion, Ap_adic AS aporteAdicional, Seg_social AS seguroSocial, Ex_vida AS expectativaVida
    FROM Liq_suel WHERE Periodo LIKE ? ORDER BY Rut, Periodo
  `,
  saveLiqSuel: `
    INSERT INTO Liq_suel (
      Periodo, Rut, Imponi, Movil, Colac, Comis, Hab_imp, Hab_noimp, Tot_hab,
      Afp, Isapre, Adic_isap, Hab_trib, Iut, Anticipo, Ces_trab, Tot_desc, Ces_emp,
      Sis, Acc_trab, Liquido, Aguin, Cta_Cte, Gratif, Ap_adic, Seg_social, Ex_vida
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Periodo, Rut) DO UPDATE SET
      Imponi = excluded.Imponi, Movil = excluded.Movil, Colac = excluded.Colac, Comis = excluded.Comis,
      Hab_imp = excluded.Hab_imp, Hab_noimp = excluded.Hab_noimp, Tot_hab = excluded.Tot_hab,
      Afp = excluded.Afp, Isapre = excluded.Isapre, Adic_isap = excluded.Adic_isap, Hab_trib = excluded.Hab_trib,
      Iut = excluded.Iut, Ces_trab = excluded.Ces_trab, Tot_desc = excluded.Tot_desc,
      Ces_emp = excluded.Ces_emp, Sis = excluded.Sis, Acc_trab = excluded.Acc_trab, Liquido = excluded.Liquido,
      Aguin = excluded.Aguin, Cta_Cte = excluded.Cta_Cte, Gratif = excluded.Gratif, Ap_adic = excluded.Ap_adic,
      Seg_social = excluded.Seg_social, Ex_vida = excluded.Ex_vida
  `,
  // Nota: Anticipo queda fuera del ON CONFLICT DO UPDATE a propósito -- lo graba y
  // lo actualiza exclusivamente Anti_suel.frm (Anticipo de Sueldo). En el .frm
  // original, Liq_suel.frm siempre volvía a grabar Anticipo en 0 (código muerto en
  // Text2_LostFocus), lo que habría borrado el anticipo real cada vez que se
  // recalcula/graba la liquidación; se evita ese bug de raíz no tocando la columna.
  liqSuelParamOrder: [
    'periodo', 'rut', 'imponible', 'movilizacion', 'colacion', 'comisiones', 'totalImponible', 'totalNoImponible', 'totalHaberes',
    'afpDescuento', 'saludDescuento', 'diferenciaIsapre', 'haberesTributables', 'iut', 'anticipo', 'cesTrabajador', 'totDesc', 'cesEmpresa',
    'sis', 'accTrabajo', 'liquido', 'aguinaldo', 'ctaCte', 'gratificacion', 'aporteAdicional', 'seguroSocial', 'expectativaVida'
  ],

  // --- Reporte impreso de la Liquidación individual (Liq_suel.frm -> botón Imprimir,
  // Liq_suel.rpt). Réplica del SQL de Crystal Report entregado (Liq_suel INNER JOIN
  // Maeper INNER JOIN Afp). HRO tiene Gratif en Liq_suel.
  getLiqSuelReporte: `
    SELECT
      L.Periodo, L.Rut, L.Movil, L.Colac, L.Comis, L.Hab_imp, L.Hab_noimp, L.Tot_hab,
      L.Afp AS AfpDescuento, L.Isapre AS IsapreDescuento, L.Adic_isap, L.Hab_trib, L.Iut,
      L.Anticipo, L.Ces_trab, L.Tot_desc, L.Liquido, L.Imponi, L.Aguin, L.Gratif,
      M.Apater, M.Amater, M.Nombres, M.Cargo, M.Afp AS AfpNombre, M.Isapre AS IsapreNombre,
      M.Val_isap, M.Tipo_isap,
      A.Cotiza AS AfpCotiza
    FROM Liq_suel L
    INNER JOIN Maeper M ON L.Rut = M.Rut
    INNER JOIN Afp A ON M.Afp = A.Nombre
    WHERE L.Periodo = ? AND L.Rut = ?
  `,

  // --- Estado de Resultados (Est_Resultado.frm -> tabla "Resultado"). Confirmado
  // por el SQL real de Est_resul.rpt (SELECT Tipo, Cuenta, Nombre, Valor FROM
  // Resultado): la tabla "Resultados" (plural, Ganancia/Perdida) que existía con
  // datos de 202512 era otra tabla, no la que usa el reporte real -- se descarta
  // esa suposición anterior a favor del esquema Tipo/Cuenta/Nombre/Valor real.
  createResultadoTable: `
    CREATE TABLE IF NOT EXISTS Resultado (
      Periodo TEXT NOT NULL, Tipo TEXT NOT NULL, Cuenta TEXT NOT NULL, Valor REAL, Nombre TEXT,
      PRIMARY KEY (Periodo, Tipo, Cuenta)
    )
  `,
  deleteResultado: `DELETE FROM Resultado WHERE Periodo = ?`,
  saveResultadoFila: `INSERT INTO Resultado (Periodo, Tipo, Cuenta, Valor, Nombre) VALUES (?, ?, ?, ?, ?)`,
  resultadoParamOrder: ['periodo', 'tipo', 'cuenta', 'valor', 'nombre'],
  getResultadoReporte: `
    SELECT Periodo, Cuenta, Nombre, Tipo, Valor
    FROM Resultado
    WHERE Periodo = ?
    ORDER BY Tipo ASC
  `,

  // --- Formularios SII (Hojas.frm) -> Tab "Libro Sueldos" (tabla Libro_sue).
  // Esquema idéntico en HRO y Ferroq; Parcela no la tiene todavía y se crea con
  // este mismo esquema (heredado vía ...base en querys_ferroq.js/querys_parcela.js).
  createLibroSueTable: `
    CREATE TABLE IF NOT EXISTS Libro_sue (
      Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Imponi REAL, No_imponi REAL,
      Adic_sue REAL, Hab_trib REAL, Lsoc REAL, Iut REAL, Liquido REAL,
      PRIMARY KEY (Periodo, Rut)
    )
  `,
  saveLibroSue: `
    INSERT INTO Libro_sue (Periodo, Rut, Imponi, No_imponi, Adic_sue, Hab_trib, Lsoc, Iut, Liquido)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Periodo, Rut) DO UPDATE SET
      Imponi = excluded.Imponi, No_imponi = excluded.No_imponi, Adic_sue = excluded.Adic_sue,
      Hab_trib = excluded.Hab_trib, Lsoc = excluded.Lsoc, Iut = excluded.Iut, Liquido = excluded.Liquido
  `,
  libroSueParamOrder: ['periodo', 'rut', 'imponi', 'noImponi', 'adicSue', 'habTrib', 'lsoc', 'iut', 'liquido'],

  // --- Declaraciones Juradas (Dec_Juradas.frm) ---

  // Tab "Honorarios" -> tabla Decla_hon. Certif se copia desde Mae_hon.Certif
  // (fijo por persona, no se calcula en este formulario). Esquema idéntico en
  // las 3 empresas salvo la columna Prest, que HRO ya tiene y Ferroq/Parcela no
  // (ver "asegurarColumnaPrestDeclaHon" en index.js).
  getDeclaHon: `SELECT Rut, Periodo, Boleta, Total, Reten, Liquido, Prest FROM Decla_hon WHERE Periodo = ? AND Rut = ? AND Boleta = ?`,
  saveDeclaHon: `
    INSERT INTO Decla_hon (Rut, Periodo, Boleta, Total, Reten, Liquido, Certif, Agno, Prest)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Rut, Periodo, Boleta) DO UPDATE SET
      Total = excluded.Total, Reten = excluded.Reten, Liquido = excluded.Liquido,
      Certif = excluded.Certif, Agno = excluded.Agno, Prest = excluded.Prest
  `,

  // Tab "Sueldos" -> tabla Decla_suel. Certif de una fila YA EXISTENTE nunca se
  // toca (para no invalidar números de certificado ya emitidos/declarados al
  // SII en años anteriores); sólo se numeran filas NUEVAS -- ver nota en
  // index.js sobre por qué se reemplaza el contador de sesión (Rut_ant) del
  // .frm original por uno acotado a cada ejecución de Procesar.
  getDeclaSuelExistente: `SELECT Periodo, Rut FROM Decla_suel WHERE Periodo = ? AND Rut = ?`,
  insertDeclaSuel: `
    INSERT INTO Decla_suel (Periodo, Rut, Imponi, Lsoc, Tribut, Iut, Factor, Tribut_act, Iut_act, Certif, Agno)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  updateDeclaSuel: `
    UPDATE Decla_suel SET Imponi = ?, Lsoc = ?, Tribut = ?, Iut = ?, Factor = ?, Tribut_act = ?, Iut_act = ?, Agno = ?
    WHERE Periodo = ? AND Rut = ?
  `,

  // Tab "Factores" -> tabla Factores (Periodo AAAAMM, Factor). Esquema idéntico
  // en las 3 empresas.
  getFactoresPorAgno: `SELECT Periodo, Factor FROM Factores WHERE Periodo LIKE ? ORDER BY Periodo`,
  getFactorPorPeriodo: `SELECT Factor FROM Factores WHERE Periodo = ?`,
  saveFactor: `
    INSERT INTO Factores (Periodo, Factor) VALUES (?, ?)
    ON CONFLICT(Periodo) DO UPDATE SET Factor = excluded.Factor
  `
};