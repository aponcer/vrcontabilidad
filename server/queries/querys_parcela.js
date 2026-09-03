const base = require('./querys_hro');

// PARCELA comparte el esquema de todas las tablas con HRO excepto Ldiario, que
// en esta base tiene columnas Debito/Credito (en vez de Debe/Haber), no tiene
// Saldo, y su llave primaria es (Cuenta, Ncomp, Linea).
module.exports = {
  ...base,

  deleteLdiario: `DELETE FROM Ldiario`,
  saveLdiarioLinea: `
    INSERT INTO Ldiario (Cuenta, Ncomp, Linea, Fecha, Debito, Credito, Glosa)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ldiarioParamOrder: ['cuenta', 'ncomp', 'linea', 'fecha', 'debe', 'haber', 'glosa'],
  getLdiarioReporte: `
    SELECT Ncomp, Linea, Fecha, Cuenta, Debito AS Debe, Credito AS Haber, Glosa
    FROM Ldiario
    ORDER BY Ncomp ASC, Linea ASC
  `,

  // Indi en Parcela solo tiene los primeros 6 campos (sin Ap_adic, Seg_social, Ex_vida).
  getIndiPorAgno: `
    SELECT Agno AS agno, Sis AS sis, Ces_emp AS cesEmpleador, Ces_trab AS cesTrabajador,
           Ac_trab AS accidenteTrabajo, Tope_imp AS topeImponible,
           NULL AS aporteAdicional, NULL AS seguroSocial, NULL AS expectativaVida
    FROM Indi WHERE Agno = ?
  `,
  saveIndi: `
    INSERT INTO Indi (Agno, Sis, Ces_emp, Ces_trab, Ac_trab, Tope_imp)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(Agno) DO UPDATE SET
      Sis = excluded.Sis, Ces_emp = excluded.Ces_emp, Ces_trab = excluded.Ces_trab,
      Ac_trab = excluded.Ac_trab, Tope_imp = excluded.Tope_imp
  `,
  indiParamOrder: ['agno', 'sis', 'cesEmpleador', 'cesTrabajador', 'accidenteTrabajo', 'topeImponible'],

  // Maeper en Parcela no tiene Gratif ni Cta_cte.
  getMaeperPorRut: `
    SELECT Rut AS rut, Apater AS apater, Amater AS amater, Nombres AS nombres, Cargo AS cargo,
           Afp AS afp, Isapre AS isapre, Tipo_isap AS tipoIsapre, Val_isap AS valorIsapre,
           Tipo_sue AS tipoSueldo, Imponi AS imponible, Colac AS colacion, Movil AS movilizacion,
           Comis AS comisiones, Tipo_cont AS tipoContrato, Tipo_trab AS tipoTrabajador,
           Aguin AS aguinaldo, Vigente AS vigente, Fingres AS fechaIngreso, Fterm AS fechaTermino,
           NULL AS gratificacion, NULL AS ctaCte
    FROM Maeper WHERE Rut = ?
  `,
  saveMaeper: `
    INSERT INTO Maeper (
      Rut, Apater, Amater, Nombres, Cargo, Afp, Isapre, Val_isap, Fingres, Fterm,
      Imponi, Movil, Colac, Comis, Tipo_sue, Tipo_isap, Tipo_cont, Tipo_trab, Aguin, Vigente
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Rut) DO UPDATE SET
      Apater = excluded.Apater, Amater = excluded.Amater, Nombres = excluded.Nombres, Cargo = excluded.Cargo,
      Afp = excluded.Afp, Isapre = excluded.Isapre, Val_isap = excluded.Val_isap,
      Fingres = excluded.Fingres, Fterm = excluded.Fterm, Imponi = excluded.Imponi,
      Movil = excluded.Movil, Colac = excluded.Colac, Comis = excluded.Comis,
      Tipo_sue = excluded.Tipo_sue, Tipo_isap = excluded.Tipo_isap, Tipo_cont = excluded.Tipo_cont,
      Tipo_trab = excluded.Tipo_trab, Aguin = excluded.Aguin, Vigente = excluded.Vigente
  `,
  maeperParamOrder: [
    'rut', 'apater', 'amater', 'nombres', 'cargo', 'afp', 'isapre', 'valorIsapre', 'fechaIngreso', 'fechaTermino',
    'imponible', 'movilizacion', 'colacion', 'comisiones', 'tipoSueldo', 'tipoIsapre', 'tipoContrato', 'tipoTrabajador',
    'aguinaldo', 'vigente'
  ],

  // Liq_suel en Parcela solo tiene el esquema básico: no tiene Cta_cte, Gratif,
  // Ap_adic, Seg_social ni Ex_vida.
  getLiqSuelPorPeriodo: `
    SELECT Periodo AS periodo, Rut AS rut, Imponi AS imponible, Movil AS movilizacion, Colac AS colacion,
           Comis AS comisiones, Hab_imp AS totalImponible, Hab_noimp AS totalNoImponible, Tot_hab AS totalHaberes,
           Afp AS afpDescuento, Isapre AS saludDescuento, Adic_isap AS diferenciaIsapre, Hab_trib AS haberesTributables,
           Iut AS iut, Anticipo AS anticipo, Ces_trab AS cesTrabajador, Tot_desc AS totDesc, Ces_emp AS cesEmpresa,
           Sis AS sis, Acc_trab AS accTrabajo, Liquido AS liquido, Aguin AS aguinaldo,
           NULL AS ctaCte, NULL AS gratificacion, NULL AS aporteAdicional, NULL AS seguroSocial, NULL AS expectativaVida
    FROM Liq_suel WHERE Periodo = ?
  `,
  getLiqSuelPorAgno: `
    SELECT Periodo AS periodo, Rut AS rut, Imponi AS imponible, Movil AS movilizacion, Colac AS colacion,
           Comis AS comisiones, Hab_imp AS totalImponible, Hab_noimp AS totalNoImponible, Tot_hab AS totalHaberes,
           Afp AS afpDescuento, Isapre AS saludDescuento, Adic_isap AS diferenciaIsapre, Hab_trib AS haberesTributables,
           Iut AS iut, Anticipo AS anticipo, Ces_trab AS cesTrabajador, Tot_desc AS totDesc, Ces_emp AS cesEmpresa,
           Sis AS sis, Acc_trab AS accTrabajo, Liquido AS liquido, Aguin AS aguinaldo,
           NULL AS ctaCte, NULL AS gratificacion, NULL AS aporteAdicional, NULL AS seguroSocial, NULL AS expectativaVida
    FROM Liq_suel WHERE Periodo LIKE ? ORDER BY Rut, Periodo
  `,
  saveLiqSuel: `
    INSERT INTO Liq_suel (
      Periodo, Rut, Imponi, Movil, Colac, Comis, Hab_imp, Hab_noimp, Tot_hab,
      Afp, Isapre, Adic_isap, Hab_trib, Iut, Anticipo, Ces_trab, Tot_desc, Ces_emp,
      Sis, Acc_trab, Liquido, Aguin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Periodo, Rut) DO UPDATE SET
      Imponi = excluded.Imponi, Movil = excluded.Movil, Colac = excluded.Colac, Comis = excluded.Comis,
      Hab_imp = excluded.Hab_imp, Hab_noimp = excluded.Hab_noimp, Tot_hab = excluded.Tot_hab,
      Afp = excluded.Afp, Isapre = excluded.Isapre, Adic_isap = excluded.Adic_isap, Hab_trib = excluded.Hab_trib,
      Iut = excluded.Iut, Ces_trab = excluded.Ces_trab, Tot_desc = excluded.Tot_desc,
      Ces_emp = excluded.Ces_emp, Sis = excluded.Sis, Acc_trab = excluded.Acc_trab, Liquido = excluded.Liquido,
      Aguin = excluded.Aguin
  `,
  // Nota: Anticipo queda fuera del ON CONFLICT DO UPDATE a propósito -- ver comentario
  // en querys_hro.js (lo graba/actualiza exclusivamente Anti_suel.frm).
  liqSuelParamOrder: [
    'periodo', 'rut', 'imponible', 'movilizacion', 'colacion', 'comisiones', 'totalImponible', 'totalNoImponible', 'totalHaberes',
    'afpDescuento', 'saludDescuento', 'diferenciaIsapre', 'haberesTributables', 'iut', 'anticipo', 'cesTrabajador', 'totDesc', 'cesEmpresa',
    'sis', 'accTrabajo', 'liquido', 'aguinaldo'
  ],

  // Liq_suel en Parcela no tiene columna Gratif.
  getLiqSuelReporte: `
    SELECT
      L.Periodo, L.Rut, L.Movil, L.Colac, L.Comis, L.Hab_imp, L.Hab_noimp, L.Tot_hab,
      L.Afp AS AfpDescuento, L.Isapre AS IsapreDescuento, L.Adic_isap, L.Hab_trib, L.Iut,
      L.Anticipo, L.Ces_trab, L.Tot_desc, L.Liquido, L.Imponi, L.Aguin, NULL AS Gratif,
      M.Apater, M.Amater, M.Nombres, M.Cargo, M.Afp AS AfpNombre, M.Isapre AS IsapreNombre,
      M.Val_isap, M.Tipo_isap,
      A.Cotiza AS AfpCotiza
    FROM Liq_suel L
    INNER JOIN Maeper M ON L.Rut = M.Rut
    INNER JOIN Afp A ON M.Afp = A.Nombre
    WHERE L.Periodo = ? AND L.Rut = ?
  `,

  // Estado de Resultados: Parcela no tiene tabla de resultados todavía. Se crea
  // con el esquema Tipo/Cuenta/Nombre/Valor confirmado por el SQL real de
  // Est_resul.rpt (tabla "Resultado", igual que HRO).
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
  `
};
