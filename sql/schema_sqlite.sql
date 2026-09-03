CREATE TABLE IF NOT EXISTS Cuenta (
    Codigo VARCHAR(4) PRIMARY KEY,
    Nombre VARCHAR(40),
    Tipo VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS Clientes (
    Rut_cl VARCHAR(10) PRIMARY KEY,
    Rsoc_cl VARCHAR(45)
);

CREATE TABLE IF NOT EXISTS Provee (
    Rut VARCHAR(10) PRIMARY KEY,
    Rsoc VARCHAR(45),
    Cuenta VARCHAR(4)
);

CREATE TABLE IF NOT EXISTS Maeper (
    Rut VARCHAR(10) PRIMARY KEY,
    Apater VARCHAR(20),
    Amater VARCHAR(20),
    Nombres VARCHAR(35),
    Cargo VARCHAR(30),
    Afp VARCHAR(12),
    Isapre VARCHAR(12),
    Val_isap REAL,
    Fingres DATE,
    Fterm DATE,
    Imponi REAL,
    Movil REAL,
    Colac REAL,
    Comis REAL,
    Tipo_sue VARCHAR(2),
    Tipo_isap VARCHAR(2),
    Tipo_cont VARCHAR(10),
    Tipo_trab VARCHAR(10),
    Aguin REAL,
    Vigente VARCHAR(1),
    Gratif REAL,
    Cta_cte REAL
);

CREATE TABLE IF NOT EXISTS Cdiario (
    Ncomp VARCHAR(10),
    Fecha DATE,
    Linea INTEGER,
    Cuenta VARCHAR(4),
    DebHab VARCHAR(1),
    Valor REAL,
    Glosa VARCHAR(40),
    Tdoc VARCHAR(2),
    Numdoc VARCHAR(10),
    Rut VARCHAR(10),
    PRIMARY KEY (Ncomp, Fecha, Linea)
);

CREATE TABLE IF NOT EXISTS Compras (
    Tdoc VARCHAR(2),
    Numdoc VARCHAR(10),
    Fecha DATE,
    Rut VARCHAR(10),
    Rsoc VARCHAR(60),
    Neto REAL,
    Exen REAL,
    Iva REAL,
    Total REAL,
    PRIMARY KEY (Tdoc, Numdoc)
);

CREATE TABLE IF NOT EXISTS Ventas (
    Tdoc VARCHAR(2),
    Numdoc VARCHAR(10),
    Fecha DATE,
    Rut VARCHAR(10),
    Rsoc VARCHAR(40),
    Neto REAL,
    Exen REAL,
    Iva REAL,
    Total REAL,
    PRIMARY KEY (Tdoc, Numdoc)
);

CREATE TABLE IF NOT EXISTS Lmayor (
    Cuenta VARCHAR(4),
    Npol VARCHAR(10),
    Linea INTEGER,
    Fecha DATE,
    Debe REAL,
    Haber REAL,
    Saldo REAL,
    Glosa VARCHAR(40),
    PRIMARY KEY (Cuenta, Npol, Linea)
);

CREATE TABLE IF NOT EXISTS Balance (
    Periodo VARCHAR(6),
    Cuenta VARCHAR(4),
    Debito REAL,
    Credito REAL,
    Sdeudor REAL,
    Sacreedor REAL,
    Activo REAL,
    Pasivo REAL,
    Perdida REAL,
    Ganancia REAL,
    PRIMARY KEY (Periodo, Cuenta)
);