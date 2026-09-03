const base = require('./querys_hro');

// FERROQ comparte el esquema de todas las tablas con HRO excepto Ldiario, que
// en esta base tiene columnas Debito/Credito (en vez de Debe/Haber), incluye
// Saldo, y su llave primaria es (Ncomp, Cuenta, Linea, Fecha).
module.exports = {
  ...base,

  deleteLdiario: `DELETE FROM Ldiario`,
  saveLdiarioLinea: `
    INSERT INTO Ldiario (Ncomp, Cuenta, Linea, Fecha, Debito, Credito, Saldo, Glosa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ldiarioParamOrder: ['ncomp', 'cuenta', 'linea', 'fecha', 'debe', 'haber', 'saldo', 'glosa'],
  getLdiarioReporte: `
    SELECT Ncomp, Linea, Fecha, Cuenta, Debito AS Debe, Credito AS Haber, Glosa
    FROM Ldiario
    ORDER BY Ncomp ASC, Linea ASC
  `,

  // Maeper en Ferroq no tiene columna Gratif (sí tiene Cta_cte, además de columnas
  // propias -Cargas, Val_car, Prest_Sol, Horas_ext- que este mantenedor no gestiona).
  getMaeperPorRut: `
    SELECT Rut AS rut, Apater AS apater, Amater AS amater, Nombres AS nombres, Cargo AS cargo,
           Afp AS afp, Isapre AS isapre, Tipo_isap AS tipoIsapre, Val_isap AS valorIsapre,
           Tipo_sue AS tipoSueldo, Imponi AS imponible, Colac AS colacion, Movil AS movilizacion,
           Comis AS comisiones, Tipo_cont AS tipoContrato, Tipo_trab AS tipoTrabajador,
           Aguin AS aguinaldo, Vigente AS vigente, Fingres AS fechaIngreso, Fterm AS fechaTermino,
           NULL AS gratificacion, Cta_cte AS ctaCte
    FROM Maeper WHERE Rut = ?
  `,
  saveMaeper: `
    INSERT INTO Maeper (
      Rut, Apater, Amater, Nombres, Cargo, Afp, Isapre, Val_isap, Fingres, Fterm,
      Imponi, Movil, Colac, Comis, Tipo_sue, Tipo_isap, Tipo_cont, Tipo_trab, Aguin, Vigente,
      Cta_cte
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Rut) DO UPDATE SET
      Apater = excluded.Apater, Amater = excluded.Amater, Nombres = excluded.Nombres, Cargo = excluded.Cargo,
      Afp = excluded.Afp, Isapre = excluded.Isapre, Val_isap = excluded.Val_isap,
      Fingres = excluded.Fingres, Fterm = excluded.Fterm, Imponi = excluded.Imponi,
      Movil = excluded.Movil, Colac = excluded.Colac, Comis = excluded.Comis,
      Tipo_sue = excluded.Tipo_sue, Tipo_isap = excluded.Tipo_isap, Tipo_cont = excluded.Tipo_cont,
      Tipo_trab = excluded.Tipo_trab, Aguin = excluded.Aguin, Vigente = excluded.Vigente,
      Cta_cte = excluded.Cta_cte
  `,
  maeperParamOrder: [
    'rut', 'apater', 'amater', 'nombres', 'cargo', 'afp', 'isapre', 'valorIsapre', 'fechaIngreso', 'fechaTermino',
    'imponible', 'movilizacion', 'colacion', 'comisiones', 'tipoSueldo', 'tipoIsapre', 'tipoContrato', 'tipoTrabajador',
    'aguinaldo', 'vigente', 'ctaCte'
  ],

  // Liq_suel en Ferroq no tiene columna Gratif (sí tiene Cta_cte, además de columnas
  // propias -Cargas, Val_car, Prest_sol, Horas_ext- que este módulo no gestiona).
  getLiqSuelPorPeriodo: `
    SELECT Periodo AS periodo, Rut AS rut, Imponi AS imponible, Movil AS movilizacion, Colac AS colacion,
           Comis AS comisiones, Hab_imp AS totalImponible, Hab_noimp AS totalNoImponible, Tot_hab AS totalHaberes,
           Afp AS afpDescuento, Isapre AS saludDescuento, Adic_isap AS diferenciaIsapre, Hab_trib AS haberesTributables,
           Iut AS iut, Anticipo AS anticipo, Ces_trab AS cesTrabajador, Tot_desc AS totDesc, Ces_emp AS cesEmpresa,
           Sis AS sis, Acc_trab AS accTrabajo, Liquido AS liquido, Aguin AS aguinaldo, Cta_cte AS ctaCte,
           NULL AS gratificacion, Ap_adic AS aporteAdicional, Seg_social AS seguroSocial, Ex_vida AS expectativaVida
    FROM Liq_suel WHERE Periodo = ?
  `,
  getLiqSuelPorAgno: `
    SELECT Periodo AS periodo, Rut AS rut, Imponi AS imponible, Movil AS movilizacion, Colac AS colacion,
           Comis AS comisiones, Hab_imp AS totalImponible, Hab_noimp AS totalNoImponible, Tot_hab AS totalHaberes,
           Afp AS afpDescuento, Isapre AS saludDescuento, Adic_isap AS diferenciaIsapre, Hab_trib AS haberesTributables,
           Iut AS iut, Anticipo AS anticipo, Ces_trab AS cesTrabajador, Tot_desc AS totDesc, Ces_emp AS cesEmpresa,
           Sis AS sis, Acc_trab AS accTrabajo, Liquido AS liquido, Aguin AS aguinaldo, Cta_cte AS ctaCte,
           NULL AS gratificacion, Ap_adic AS aporteAdicional, Seg_social AS seguroSocial, Ex_vida AS expectativaVida
    FROM Liq_suel WHERE Periodo LIKE ? ORDER BY Rut, Periodo
  `,
  saveLiqSuel: `
    INSERT INTO Liq_suel (
      Periodo, Rut, Imponi, Movil, Colac, Comis, Hab_imp, Hab_noimp, Tot_hab,
      Afp, Isapre, Adic_isap, Hab_trib, Iut, Anticipo, Ces_trab, Tot_desc, Ces_emp,
      Sis, Acc_trab, Liquido, Aguin, Cta_cte, Ap_adic, Seg_social, Ex_vida
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(Periodo, Rut) DO UPDATE SET
      Imponi = excluded.Imponi, Movil = excluded.Movil, Colac = excluded.Colac, Comis = excluded.Comis,
      Hab_imp = excluded.Hab_imp, Hab_noimp = excluded.Hab_noimp, Tot_hab = excluded.Tot_hab,
      Afp = excluded.Afp, Isapre = excluded.Isapre, Adic_isap = excluded.Adic_isap, Hab_trib = excluded.Hab_trib,
      Iut = excluded.Iut, Ces_trab = excluded.Ces_trab, Tot_desc = excluded.Tot_desc,
      Ces_emp = excluded.Ces_emp, Sis = excluded.Sis, Acc_trab = excluded.Acc_trab, Liquido = excluded.Liquido,
      Aguin = excluded.Aguin, Cta_cte = excluded.Cta_cte, Ap_adic = excluded.Ap_adic,
      Seg_social = excluded.Seg_social, Ex_vida = excluded.Ex_vida
  `,
  // Nota: Anticipo queda fuera del ON CONFLICT DO UPDATE a propósito -- ver comentario
  // en querys_hro.js (lo graba/actualiza exclusivamente Anti_suel.frm).
  liqSuelParamOrder: [
    'periodo', 'rut', 'imponible', 'movilizacion', 'colacion', 'comisiones', 'totalImponible', 'totalNoImponible', 'totalHaberes',
    'afpDescuento', 'saludDescuento', 'diferenciaIsapre', 'haberesTributables', 'iut', 'anticipo', 'cesTrabajador', 'totDesc', 'cesEmpresa',
    'sis', 'accTrabajo', 'liquido', 'aguinaldo', 'ctaCte', 'aporteAdicional', 'seguroSocial', 'expectativaVida'
  ],

  // Liq_suel en Ferroq no tiene columna Gratif.
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

  // Estado de Resultados: en Ferroq la tabla real ya existente se llama
  // "Est_resultado" (no "Resultado" como en HRO/Parcela), pero con el mismo
  // esquema Tipo/Cuenta/Nombre/Valor confirmado por el SQL real de Est_resul.rpt.
  // Se respeta el nombre real de la tabla porque ya tiene datos de producción.
  createResultadoTable: `
    CREATE TABLE IF NOT EXISTS Est_resultado (
      Periodo TEXT NOT NULL, Tipo TEXT NOT NULL, Cuenta TEXT NOT NULL, Valor REAL, Nombre TEXT,
      PRIMARY KEY (Periodo, Tipo, Cuenta)
    )
  `,
  deleteResultado: `DELETE FROM Est_resultado WHERE Periodo = ?`,
  saveResultadoFila: `INSERT INTO Est_resultado (Periodo, Tipo, Cuenta, Valor, Nombre) VALUES (?, ?, ?, ?, ?)`,
  resultadoParamOrder: ['periodo', 'tipo', 'cuenta', 'valor', 'nombre'],
  getResultadoReporte: `
    SELECT Periodo, Cuenta, Nombre, Tipo, Valor
    FROM Est_resultado
    WHERE Periodo = ?
    ORDER BY Cuenta
  `
};
