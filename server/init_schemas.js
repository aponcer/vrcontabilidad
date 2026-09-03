const path = require('path');
const Database = require('better-sqlite3');

const ddlEmpresa = `
  CREATE TABLE IF NOT EXISTS Ventas (Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Rut TEXT, Rsoc TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, PRIMARY KEY (Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Utm (Periodo TEXT NOT NULL PRIMARY KEY, Valor REAL);
  CREATE TABLE IF NOT EXISTS Uf (Periodo TEXT NOT NULL PRIMARY KEY, Valor REAL);
  CREATE TABLE IF NOT EXISTS Tab_iut (Des1 REAL, Des2 REAL, Des3 REAL, Des4 REAL, Des5 REAL, Des6 REAL, Des7 REAL, Has1 REAL, Has2 REAL, Has3 REAL, Has4 REAL, Has5 REAL, Has6 REAL, Has7 REAL, Reb1 REAL, Reb2 REAL, Reb3 REAL, Reb4 REAL, Reb5 REAL, Reb6 REAL, Reb7 REAL);
  CREATE TABLE IF NOT EXISTS Resultados (Periodo TEXT NOT NULL, Cuenta TEXT NOT NULL, Ganancia REAL, Perdida REAL, PRIMARY KEY (Periodo, Cuenta));
  CREATE TABLE IF NOT EXISTS Provee (Rut TEXT NOT NULL PRIMARY KEY, Rsoc TEXT, Cuenta TEXT);
  CREATE TABLE IF NOT EXISTS Numpol (Periodo TEXT NOT NULL, Mes TEXT NOT NULL, Numero INTEGER, PRIMARY KEY (Periodo, Mes));
  CREATE TABLE IF NOT EXISTS Maeper (Rut TEXT NOT NULL PRIMARY KEY, Apater TEXT, Amater TEXT, Nombres TEXT, Cargo TEXT, Afp TEXT, Isapre TEXT, Val_isap REAL, Fingres TEXT, Fterm TEXT, Imponi REAL, Movil REAL, Colac REAL, Comis REAL, Tipo_sue TEXT, Tipo_isap TEXT, Tipo_cont TEXT, Tipo_trab TEXT, Aguin REAL, Vigente TEXT, Gratif REAL, Cta_cte REAL);
  CREATE TABLE IF NOT EXISTS Mae_hon (Rut TEXT NOT NULL PRIMARY KEY, Nombre TEXT, Certif INTEGER);
  CREATE TABLE IF NOT EXISTS Lventa (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Neto REAL, Iva REAL, Total REAL, Periodo TEXT, Control INTEGER, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Lmayor (Cuenta TEXT NOT NULL, Npol TEXT NOT NULL, Linea INTEGER NOT NULL, Fecha TEXT, Debe REAL, Haber REAL, Saldo REAL, Glosa TEXT NOT NULL, PRIMARY KEY (Cuenta, Npol, Linea));
  CREATE TABLE IF NOT EXISTS Listado (Periodo TEXT NOT NULL, Nombre TEXT NOT NULL, Perdida REAL, Ganancia REAL, PRIMARY KEY (Periodo, Nombre));
  CREATE TABLE IF NOT EXISTS List_cta (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, DebHab TEXT, Valor REAL, Tipo TEXT, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Liq_suel (Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Movil REAL, Colac REAL, Comis REAL, Hab_imp REAL, Hab_noimp REAL, Tot_hab REAL, Afp REAL, Isapre REAL, Adic_isap REAL, Hab_trib REAL, Iut REAL, Anticipo REAL, Ces_trab REAL, Tot_desc REAL, Ces_emp REAL, Sis REAL, Acc_trab REAL, Liquido REAL, Imponi REAL, Aguin REAL, Cta_Cte REAL, Gratif REAL, Ap_adic REAL, Seg_social REAL, Ex_vida REAL, PRIMARY KEY (Periodo, Rut));
  CREATE TABLE IF NOT EXISTS Libro_sue (Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Imponi REAL, No_imponi REAL, Adic_sue REAL, Hab_trib REAL, Lsoc REAL, Iut REAL, Liquido REAL, PRIMARY KEY (Periodo, Rut));
  CREATE TABLE IF NOT EXISTS Ldiario (Ncomp TEXT NOT NULL, Linea INTEGER NOT NULL, Fecha TEXT, Cuenta TEXT, Debe REAL, Haber REAL, Glosa TEXT, PRIMARY KEY (Ncomp, Linea));
  CREATE TABLE IF NOT EXISTS Lcompra (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, Glosa TEXT, Cuenta TEXT, Periodo TEXT, Control INTEGER, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Iut (Periodo TEXT NOT NULL PRIMARY KEY, Tramo1 REAL, Tramo2 REAL, Tramo3 REAL, Tramo4 REAL, Tramo5 REAL, Tramo6 REAL, Tramo7 REAL, Tramo8 REAL, Porce1 REAL, Porce2 REAL, Porce3 REAL, Porce4 REAL, Porce5 REAL, Porce6 REAL, Porce7 REAL, Porce8 REAL, Resta1 REAL, Resta2 REAL, Resta3 REAL, Resta4 REAL, Resta5 REAL, Resta6 REAL, Resta7 REAL, Resta8 REAL);
  CREATE TABLE IF NOT EXISTS Isapre (Nombre TEXT NOT NULL PRIMARY KEY, Cotiza REAL);
  CREATE TABLE IF NOT EXISTS Indi (Agno TEXT NOT NULL PRIMARY KEY, Sis REAL, Ac_trab REAL, Ces_emp REAL, Ces_trab REAL, Tope_imp REAL, Ap_adic REAL, Seg_social REAL, Ex_vida TEXT);
  CREATE TABLE IF NOT EXISTS Hojas_s (Rut TEXT NOT NULL, Folio INTEGER NOT NULL, Agno TEXT, PRIMARY KEY (Rut, Folio));
  CREATE TABLE IF NOT EXISTS Factores (Periodo TEXT NOT NULL PRIMARY KEY, Factor REAL);
  CREATE TABLE IF NOT EXISTS Decla_suel (Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Imponi REAL, Lsoc REAL, Tribut REAL, Iut REAL, Factor REAL, Tribut_act REAL, Iut_act REAL, Certif INTEGER, Agno TEXT, Prest REAL, PRIMARY KEY (Periodo, Rut));
  CREATE TABLE IF NOT EXISTS Decla_hon (Rut TEXT NOT NULL, Periodo TEXT NOT NULL, Boleta TEXT NOT NULL, Total REAL, Reten REAL, Liquido REAL, Certif INTEGER, Agno TEXT, Prest REAL, PRIMARY KEY (Rut, Periodo, Boleta));
  CREATE TABLE IF NOT EXISTS Cuenta (Codigo TEXT NOT NULL PRIMARY KEY, Nombre TEXT, Tipo TEXT);
  CREATE TABLE IF NOT EXISTS CtaCte_pro (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, DebHab TEXT NOT NULL, Fecha TEXT, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc, DebHab));
  CREATE TABLE IF NOT EXISTS CtaCte_cli (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, DebHab TEXT NOT NULL, Fecha TEXT, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc, DebHab));
  CREATE TABLE IF NOT EXISTS Compras (Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Rut TEXT, Rsoc TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, PRIMARY KEY (Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Clientes (Rut_cl TEXT NOT NULL PRIMARY KEY, Rsoc_cl TEXT);
  CREATE TABLE IF NOT EXISTS Cdiario (Ncomp TEXT NOT NULL, Fecha TEXT NOT NULL, Linea INTEGER NOT NULL, Cuenta TEXT, DebHab TEXT, Valor REAL, Glosa TEXT, Tdoc TEXT, Numdoc TEXT, Rut TEXT, PRIMARY KEY (Ncomp, Fecha, Linea));
  CREATE TABLE IF NOT EXISTS Balance (Periodo TEXT NOT NULL, Cuenta TEXT NOT NULL, Debito REAL, Credito REAL, Sdeudor REAL, Sacreedor REAL, Activo REAL, Pasivo REAL, Perdida REAL, Ganancia REAL, PRIMARY KEY (Periodo, Cuenta));
  CREATE TABLE IF NOT EXISTS Analisis (Periodo TEXT NOT NULL PRIMARY KEY, Ventas REAL, Compras REAL, Saldo REAL);
  CREATE TABLE IF NOT EXISTS Afp (Nombre TEXT NOT NULL PRIMARY KEY, Cotiza REAL);
`;

const ddlParcela = `
  CREATE TABLE IF NOT EXISTS Ventas (Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Rut TEXT, Rsoc TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, PRIMARY KEY (Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Utm (Periodo TEXT NOT NULL PRIMARY KEY, Valor REAL);
  CREATE TABLE IF NOT EXISTS Uf (Periodo TEXT NOT NULL PRIMARY KEY, Valor REAL);
  CREATE TABLE IF NOT EXISTS Tab_iut (Des1 REAL, Des2 REAL, Des3 REAL, Des4 REAL, Des5 REAL, Des6 REAL, Des7 REAL, Has1 REAL, Has2 REAL, Has3 REAL, Has4 REAL, Has5 REAL, Has6 REAL, Has7 REAL, Reb1 REAL, Reb2 REAL, Reb3 REAL, Reb4 REAL, Reb5 REAL, Reb6 REAL, Reb7 REAL);
  CREATE TABLE IF NOT EXISTS Provee (Rut TEXT NOT NULL PRIMARY KEY, Rsoc TEXT, Cuenta TEXT);
  CREATE TABLE IF NOT EXISTS Numpol (Periodo TEXT NOT NULL, Mes TEXT NOT NULL, Numero INTEGER, PRIMARY KEY (Periodo, Mes));
  CREATE TABLE IF NOT EXISTS Maeper (Rut TEXT NOT NULL PRIMARY KEY, Apater TEXT, Amater TEXT, Nombres TEXT, Cargo TEXT, Afp TEXT, Isapre TEXT, Val_isap REAL, Fingres TEXT, Fterm TEXT, Imponi REAL, Movil REAL, Colac REAL, Comis REAL, Tipo_sue TEXT, Tipo_isap TEXT, Tipo_cont TEXT, Tipo_trab TEXT, Aguin REAL, Vigente TEXT);
  CREATE TABLE IF NOT EXISTS Mae_hon (Rut TEXT NOT NULL PRIMARY KEY, Nombre TEXT, Certif INTEGER);
  CREATE TABLE IF NOT EXISTS Lventa (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Neto REAL, Iva REAL, Total REAL, Periodo TEXT, Control INTEGER, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Lmayor (Cuenta TEXT NOT NULL, Npol TEXT NOT NULL, Linea INTEGER NOT NULL, Fecha TEXT, Debe REAL, Haber REAL, Saldo REAL, Glosa TEXT, PRIMARY KEY (Cuenta, Npol, Linea));
  CREATE TABLE IF NOT EXISTS List_cta (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, DebHab TEXT, Valor REAL, Tipo TEXT, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Liq_suel (Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Movil REAL, Colac REAL, Comis REAL, Hab_imp REAL, Hab_noimp REAL, Tot_hab REAL, Afp REAL, Isapre REAL, Adic_isap REAL, Hab_trib REAL, Iut REAL, Anticipo REAL, Ces_trab REAL, Tot_desc REAL, Ces_emp REAL, Sis REAL, Acc_trab REAL, Liquido REAL, Imponi REAL, Aguin REAL, PRIMARY KEY (Periodo, Rut));
  CREATE TABLE IF NOT EXISTS Ldiario (Cuenta TEXT NOT NULL, Ncomp TEXT NOT NULL, Linea INTEGER NOT NULL, Fecha TEXT, Debito REAL, Credito REAL, Glosa TEXT, PRIMARY KEY (Cuenta, Ncomp, Linea));
  CREATE TABLE IF NOT EXISTS Lcompra (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, Glosa TEXT, Cuenta TEXT, Periodo TEXT, Control INTEGER, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Iut (Periodo TEXT NOT NULL PRIMARY KEY, Tramo1 REAL, Tramo2 REAL, Tramo3 REAL, Tramo4 REAL, Tramo5 REAL, Tramo6 REAL, Tramo7 REAL, Tramo8 REAL, Porce1 REAL, Porce2 REAL, Porce3 REAL, Porce4 REAL, Porce5 REAL, Porce6 REAL, Porce7 REAL, Porce8 REAL, Resta1 REAL, Resta2 REAL, Resta3 REAL, Resta4 REAL, Resta5 REAL, Resta6 REAL, Resta7 REAL, Resta8 REAL);
  CREATE TABLE IF NOT EXISTS Isapre (Nombre TEXT NOT NULL PRIMARY KEY, Cotiza REAL);
  CREATE TABLE IF NOT EXISTS Indi (Agno TEXT NOT NULL PRIMARY KEY, Sis REAL, Ac_trab REAL, Ces_emp REAL, Ces_trab REAL, Tope_imp REAL);
  CREATE TABLE IF NOT EXISTS Hojas (Rut TEXT NOT NULL, Folio INTEGER NOT NULL, Rsoc TEXT, Direc TEXT, Comu TEXT, Ciudad TEXT, Rep_leg TEXT, Rut_rep TEXT, PRIMARY KEY (Rut, Folio));
  CREATE TABLE IF NOT EXISTS Factores (Periodo TEXT NOT NULL PRIMARY KEY, Factor REAL);
  CREATE TABLE IF NOT EXISTS Decla_suel (Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Imponi REAL, Lsoc REAL, Tribut REAL, Iut REAL, Factor REAL, Tribut_act REAL, Iut_act REAL, Certif INTEGER, Agno TEXT, PRIMARY KEY (Periodo, Rut));
  CREATE TABLE IF NOT EXISTS Decla_hon (Rut TEXT NOT NULL, Periodo TEXT NOT NULL, Boleta TEXT NOT NULL, Total REAL, Reten REAL, Liquido REAL, Certif INTEGER, Agno TEXT, PRIMARY KEY (Rut, Periodo, Boleta));
  CREATE TABLE IF NOT EXISTS Cuenta (Codigo TEXT NOT NULL PRIMARY KEY, Nombre TEXT, Tipo TEXT);
  CREATE TABLE IF NOT EXISTS CtaCte_provee (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, DebHab TEXT, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS CtaCte_cli (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, DebHab TEXT, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Compras (Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Rut TEXT, Rsoc TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, PRIMARY KEY (Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Clientes (Rut_cl TEXT NOT NULL PRIMARY KEY, Rsoc_cl TEXT, Cuenta TEXT);
  CREATE TABLE IF NOT EXISTS Cdiario (Ncomp TEXT NOT NULL, Fecha TEXT NOT NULL, Linea INTEGER NOT NULL, Cuenta TEXT, DebHab TEXT, Valor REAL, Glosa TEXT, Tdoc TEXT, Numdoc TEXT, Rut TEXT, PRIMARY KEY (Ncomp, Fecha, Linea));
  CREATE TABLE IF NOT EXISTS Balance (Periodo TEXT NOT NULL, Cuenta TEXT NOT NULL, Debito REAL, Credito REAL, Sdeudor REAL, Sacreedor REAL, Activo REAL, Pasivo REAL, Perdida REAL, Ganancia REAL, PRIMARY KEY (Periodo, Cuenta));
  CREATE TABLE IF NOT EXISTS Afp (Nombre TEXT NOT NULL PRIMARY KEY, Cotiza REAL);
`;

const ddlFerroq = `
  CREATE TABLE IF NOT EXISTS Ventas (Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Rut TEXT, Rsoc TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, PRIMARY KEY (Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Utm (Periodo TEXT NOT NULL PRIMARY KEY, Valor REAL);
  CREATE TABLE IF NOT EXISTS Uf (Periodo TEXT NOT NULL PRIMARY KEY, Valor REAL);
  CREATE TABLE IF NOT EXISTS Tab_iut (Des1 REAL, Des2 REAL, Des3 REAL, Des4 REAL, Des5 REAL, Des6 REAL, Des7 REAL, Has1 REAL, Has2 REAL, Has3 REAL, Has4 REAL, Has5 REAL, Has6 REAL, Has7 REAL, Reb1 REAL, Reb2 REAL, Reb3 REAL, Reb4 REAL, Reb5 REAL, Reb6 REAL, Reb7 REAL);
  CREATE TABLE IF NOT EXISTS Provee (Rut TEXT NOT NULL PRIMARY KEY, Rsoc TEXT, Cuenta TEXT);
  CREATE TABLE IF NOT EXISTS Prod_term (Nombre TEXT NOT NULL PRIMARY KEY, Costo REAL);
  CREATE TABLE IF NOT EXISTS Numpol (Periodo TEXT NOT NULL, Mes TEXT NOT NULL, Numero INTEGER, PRIMARY KEY (Periodo, Mes));
  CREATE TABLE IF NOT EXISTS Maeper (Rut TEXT NOT NULL PRIMARY KEY, Apater TEXT, Amater TEXT, Nombres TEXT, Cargo TEXT, Afp TEXT, Isapre TEXT, Val_isap REAL, Fingres TEXT, Fterm TEXT, Imponi REAL, Movil REAL, Colac REAL, Comis REAL, Tipo_sue TEXT, Tipo_isap TEXT, Tipo_cont TEXT, Tipo_trab TEXT, Aguin REAL, Vigente TEXT, Cargas INTEGER, Val_car REAL, Prest_Sol REAL, Cta_cte REAL, Horas_ext INTEGER);
  CREATE TABLE IF NOT EXISTS Mae_hon (Rut TEXT NOT NULL PRIMARY KEY, Nombre TEXT, Certif INTEGER);
  CREATE TABLE IF NOT EXISTS Lventa (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Neto REAL, Iva REAL, Total REAL, Periodo TEXT, Control INTEGER, Glosa TEXT, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Lmayor (Cuenta TEXT NOT NULL, Npol TEXT NOT NULL, Linea INTEGER NOT NULL, Fecha TEXT, Debe REAL, Haber REAL, Saldo REAL, Glosa TEXT, PRIMARY KEY (Cuenta, Npol, Linea));
  CREATE TABLE IF NOT EXISTS List_cta (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, DebHab TEXT, Valor REAL, Tipo TEXT, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Liq_suel (Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Imponi REAL, Movil REAL, Colac REAL, Comis REAL, Hab_imp REAL, Hab_noimp REAL, Tot_hab REAL, Afp REAL, Isapre REAL, Adic_isap REAL, Hab_trib REAL, Iut REAL, Anticipo REAL, Ces_trab REAL, Tot_desc REAL, Ces_emp REAL, Sis REAL, Acc_trab REAL, Liquido REAL, Aguin REAL, Cargas INTEGER, Val_car REAL, Prest_sol REAL, Cta_cte REAL, Horas_ext REAL, Ap_adic REAL, Seg_social REAL, Ex_vida REAL, PRIMARY KEY (Periodo, Rut));
  CREATE TABLE IF NOT EXISTS Libro_sue (Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Imponi REAL, No_imponi REAL, Adic_sue REAL, Hab_trib REAL, Lsoc REAL, Iut REAL, Liquido REAL, PRIMARY KEY (Periodo, Rut));
  CREATE TABLE IF NOT EXISTS Ldiario (Ncomp TEXT NOT NULL, Cuenta TEXT NOT NULL, Linea TEXT NOT NULL, Fecha TEXT NOT NULL, Debito REAL, Credito REAL, Saldo REAL, Glosa TEXT, PRIMARY KEY (Ncomp, Cuenta, Linea, Fecha));
  CREATE TABLE IF NOT EXISTS Lcompra (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, Glosa TEXT, Cuenta TEXT, Periodo TEXT, Control INTEGER, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Iut (Periodo TEXT NOT NULL PRIMARY KEY, Tramo1 REAL, Tramo2 REAL, Tramo3 REAL, Tramo4 REAL, Tramo5 REAL, Tramo6 REAL, Tramo7 REAL, Tramo8 REAL, Porce1 REAL, Porce2 REAL, Porce3 REAL, Porce4 REAL, Porce5 REAL, Porce6 REAL, Porce7 REAL, Porce8 REAL, Resta1 REAL, Resta2 REAL, Resta3 REAL, Resta4 REAL, Resta5 REAL, Resta6 REAL, Resta7 REAL, Resta8 REAL);
  CREATE TABLE IF NOT EXISTS Isapre (Nombre TEXT NOT NULL PRIMARY KEY, Cotiza REAL);
  CREATE TABLE IF NOT EXISTS Indi (Agno TEXT NOT NULL PRIMARY KEY, Sis REAL, Ac_trab REAL, Ces_emp REAL, Ces_trab REAL, Tope_imp REAL, Prest_sol INTEGER, Ap_adic REAL, Seg_social REAL, Ex_vida REAL);
  CREATE TABLE IF NOT EXISTS Hojas_s (Rut TEXT NOT NULL, Folio INTEGER NOT NULL, PRIMARY KEY (Rut, Folio));
  CREATE TABLE IF NOT EXISTS Hojas (Rut TEXT NOT NULL, Folio INTEGER NOT NULL, Rsoc TEXT, Direc TEXT, Comuna TEXT, Ciudad TEXT, Rep_legal TEXT, Nombre TEXT, PRIMARY KEY (Rut, Folio));
  CREATE TABLE IF NOT EXISTS Factores (Periodo TEXT NOT NULL PRIMARY KEY, Factor REAL);
  CREATE TABLE IF NOT EXISTS Est_resultado (Periodo TEXT NOT NULL, Tipo TEXT NOT NULL, Cuenta TEXT NOT NULL, Valor REAL, Nombre TEXT, PRIMARY KEY (Periodo, Tipo, Cuenta));
  CREATE TABLE IF NOT EXISTS Decla_suel (Periodo TEXT NOT NULL, Rut TEXT NOT NULL, Imponi REAL, Lsoc REAL, Tribut REAL, Iut REAL, Factor REAL, Tribut_act REAL, Iut_act REAL, Certif INTEGER, Agno TEXT, No_imp REAL, Prest_act REAL, PRIMARY KEY (Periodo, Rut));
  CREATE TABLE IF NOT EXISTS Decla_hon (Rut TEXT NOT NULL, Periodo TEXT NOT NULL, Boleta TEXT NOT NULL, Total REAL, Reten REAL, Liquido REAL, Certif INTEGER, Agno TEXT, Factor REAL, PRIMARY KEY (Rut, Periodo, Boleta));
  CREATE TABLE IF NOT EXISTS Cuenta (Codigo TEXT NOT NULL PRIMARY KEY, Nombre TEXT, Tipo TEXT);
  CREATE TABLE IF NOT EXISTS CtaCte_provee (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT NOT NULL, DebHab TEXT NOT NULL, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc, Fecha, DebHab));
  CREATE TABLE IF NOT EXISTS CtaCte_cli (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, DebHab TEXT NOT NULL, Fecha TEXT NOT NULL, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc, DebHab, Fecha));
  CREATE TABLE IF NOT EXISTS CtaCte_cheq (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, DebHab TEXT NOT NULL, Fecha TEXT NOT NULL, Fvenc TEXT, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc, DebHab, Fecha));
  CREATE TABLE IF NOT EXISTS CtaCte_bol (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, DebHab TEXT NOT NULL, Fecha TEXT NOT NULL, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc, DebHab, Fecha));
  CREATE TABLE IF NOT EXISTS Costo_vta (Factura TEXT NOT NULL, Fecha TEXT NOT NULL, Producto TEXT NOT NULL, Cantidad REAL, Costo REAL, Valor REAL, PRIMARY KEY (Factura, Fecha, Producto));
  CREATE TABLE IF NOT EXISTS Consulta (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT NOT NULL, DebHab TEXT NOT NULL, Valor REAL, Glosa TEXT, Cuenta TEXT, PRIMARY KEY (Rut, Tdoc, Numdoc, Fecha, DebHab));
  CREATE TABLE IF NOT EXISTS Consul_prov (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT NOT NULL, DebHab TEXT NOT NULL, Valor REAL, Glosa TEXT, Cuenta TEXT, PRIMARY KEY (Rut, Tdoc, Numdoc, Fecha, DebHab));
  CREATE TABLE IF NOT EXISTS Compras (Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT, Rut TEXT, Rsoc TEXT, Neto REAL, Exen REAL, Iva REAL, Total REAL, PRIMARY KEY (Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Clientes (Rut_cl TEXT NOT NULL PRIMARY KEY, Rsoc_cl TEXT);
  CREATE TABLE IF NOT EXISTS Cheques_por_Cobrar (Rut TEXT NOT NULL, Numdoc TEXT NOT NULL, Vencimiento TEXT, Razon_Social TEXT, Banco TEXT, PRIMARY KEY (Rut, Numdoc));
  CREATE TABLE IF NOT EXISTS Cdiario (Ncomp TEXT NOT NULL, Fecha TEXT NOT NULL, Linea INTEGER NOT NULL, Cuenta TEXT, DebHab TEXT, Valor REAL, Glosa TEXT, Tdoc TEXT, Numdoc TEXT, Rut TEXT, Vencimiento TEXT, PRIMARY KEY (Ncomp, Fecha, Linea));
  CREATE TABLE IF NOT EXISTS Cast_cl (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT NOT NULL, DebHab TEXT, Valor REAL, PRIMARY KEY (Rut, Tdoc, Numdoc, Fecha));
  CREATE TABLE IF NOT EXISTS Balance (Periodo TEXT NOT NULL, Cuenta TEXT NOT NULL, Debito REAL, Credito REAL, Sdeudor REAL, Sacreedor REAL, Activo REAL, Pasivo REAL, Perdida REAL, Ganancia REAL, PRIMARY KEY (Periodo, Cuenta));
  CREATE TABLE IF NOT EXISTS Ana_provee (Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Valor REAL, Obser TEXT, PRIMARY KEY (Rut, Tdoc, Numdoc));
  CREATE TABLE IF NOT EXISTS Ana_prov (Rut TEXT, Valor REAL, Obs TEXT);
  CREATE TABLE IF NOT EXISTS Afp (Nombre TEXT NOT NULL PRIMARY KEY, Cotiza REAL);
`;

const tasks = [
  { sql: ddlEmpresa, db: 'empresa.sqlite' },
  { sql: ddlParcela, db: 'parcela.sqlite' },
  { sql: ddlFerroq, db: 'ferroq.sqlite' },
];

tasks.forEach(({ sql, db: dbFile }) => {
  const dbPath = path.join(__dirname, dbFile);
  const db = new Database(dbPath);
  try {
    db.exec(sql);
    console.log(`✓ Esquema aplicado con éxito en: ${dbFile}`);
  } catch (err) {
    console.error(`✕ Error al aplicar esquema en ${dbFile}:`, err.message);
  } finally {
    db.close();
  }
});