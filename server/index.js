const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { getDbConnection } = require('./db');
const getCompanyQueries = require('./queries');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sirve el frontend ya compilado (client/dist) desde el mismo puerto que la
// API, para que el sistema completo se levante con un solo proceso -- así el
// acceso directo (.bat) solo necesita abrir http://localhost:3000.
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Middleware para inyectar la conexión DB y las queries de la empresa seleccionada
app.use((req, res, next) => {
  const companyId = req.headers['x-company-id'] || 'hro';
  try {
    req.db = getDbConnection(companyId);
    req.queries = getCompanyQueries(companyId);
    next();
  } catch (err) {
    res.status(400).json({ error: `Error conectando a la base de datos: ${err.message}` });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor contable corriendo' });
});

// Lista de empresas para el selector del frontend. Vive en un archivo local
// (empresas.js) que nunca se sube a git -- ver empresas.example.js para el
// formato esperado. Así el código público (y el bundle ya compilado) no
// revela nombres de clientes reales; solo esta respuesta en tiempo de
// ejecución los conoce.
app.get('/api/empresas', (req, res) => {
  try {
    delete require.cache[require.resolve('./empresas.js')];
    const empresas = require('./empresas.js');
    res.json({ data: empresas });
  } catch {
    res.json({ data: [] });
  }
});

// Cdiario.Fecha se graba como texto 'DD/MM/AAAA' (formato de fecha del VB6
// original -- ej. fechaContable = `28/${mes}/${anio}` en /api/contab/procesar-cv),
// no como fecha ISO. Comparar ese texto directo contra un 'AAAA-MM-DD' (lo que
// manda un <input type="date"> del frontend) con >=/<= no funciona: el orden
// de los campos no coincide y la comparación de string sale mal (por eso
// Libro Diario/Mayor, Balance y Análisis Ctas Ctes venían mostrando 0 líneas).
// Se normalizan ambos lados a 'AAAAMMDD' antes de comparar.
const FECHA_CDIARIO_AAAAMMDD = `(substr(Fecha,7,4) || substr(Fecha,4,2) || substr(Fecha,1,2))`;
const isoAAaaammdd = (iso) => (iso || '').replace(/-/g, '');
const isoADmy = (iso) => {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

// Pólizas grabadas antes del fix de arriba (Sueldos y el editor manual de
// Comprobante Diario) quedaron con Fecha en ISO en vez de 'DD/MM/AAAA' --
// existen (se encuentran por Ncomp en Búsqueda de Pólizas) pero los reportes
// por rango de fecha (Libro Diario/Mayor, Balance, Análisis Ctas Ctes) nunca
// las encontraban. Se corrige el formato en la propia tabla la primera vez
// que corre cualquiera de esos reportes (no hace nada en corridas siguientes).
function normalizarFechasCdiario(db) {
  db.prepare(`
    UPDATE Cdiario
    SET Fecha = substr(Fecha, 9, 2) || '/' || substr(Fecha, 6, 2) || '/' || substr(Fecha, 1, 4)
    WHERE Fecha LIKE '____-__-__'
  `).run();
}

// --- REMUNERACIONES (Remuner.frm) ---

// Proxy a mindicador.cl: el navegador no puede llamarlo directo por CORS,
// así que el fetch se hace acá (servidor a servidor, sin restricción de CORS).
app.get('/api/indices/mindicador', async (req, res) => {
  try {
    const respuesta = await fetch('https://mindicador.cl/api');
    if (!respuesta.ok) throw new Error(`mindicador.cl respondió ${respuesta.status}`);
    const data = await respuesta.json();
    res.json({ uf: data.uf, utm: data.utm });
  } catch (err) {
    res.status(502).json({ error: 'No se pudo contactar a mindicador.cl: ' + err.message });
  }
});

// Afp (catálogo + % de cotización)
app.get('/api/afp', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getAfp).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/afp', (req, res) => {
  const { nombre, cotizacion } = req.body;
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El Nombre de la AFP es obligatorio.' });
  try {
    req.db.prepare(req.queries.saveAfp).run(nombre.trim().toUpperCase(), Number(cotizacion) || 0);
    res.json({ message: 'AFP guardada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/afp/:nombre', (req, res) => {
  try {
    req.db.prepare(req.queries.deleteAfp).run(req.params.nombre);
    res.json({ message: 'AFP eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Isapre (catálogo + % de cotización)
app.get('/api/isapre', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getIsapre).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/isapre', (req, res) => {
  const { nombre, cotizacion } = req.body;
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El Nombre de la Isapre es obligatorio.' });
  try {
    req.db.prepare(req.queries.saveIsapre).run(nombre.trim().toUpperCase(), Number(cotizacion) || 0);
    res.json({ message: 'Isapre guardada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/isapre/:nombre', (req, res) => {
  try {
    req.db.prepare(req.queries.deleteIsapre).run(req.params.nombre);
    res.json({ message: 'Isapre eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Uf (búsqueda puntual por Periodo, como Text1_LostFocus)
app.get('/api/uf/:periodo', (req, res) => {
  try {
    const row = req.db.prepare(req.queries.getUf).get(req.params.periodo);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/uf', (req, res) => {
  const { periodo, valor, tipoActualizacion } = req.body;
  if (!periodo) return res.status(400).json({ error: 'El Período es obligatorio.' });
  try {
    req.db.prepare(req.queries.saveUf).run(
      periodo, Number(valor) || 0,
      tipoActualizacion || 'Manual',
      new Date().toISOString().split('T')[0]
    );
    res.json({ message: 'UF guardada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Utm (búsqueda por Periodo) + recálculo de la tabla de Impuesto Único (Iut),
// igual que Llena_tabla en VB6: Tramo(n) = Has(n)*Utm, Resta(n) = Reb(n)*Utm
const PORCENTAJES_IUT = [0, 0.04, 0.08, 0.135, 0.23, 0.304, 0.35];

app.get('/api/utm/:periodo', (req, res) => {
  try {
    const row = req.db.prepare(req.queries.getUtm).get(req.params.periodo);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/utm', (req, res) => {
  const { periodo, valor, tipoActualizacion } = req.body;
  if (!periodo) return res.status(400).json({ error: 'El Período es obligatorio.' });
  const valorUtm = Number(valor) || 0;
  const fechaHoy = new Date().toISOString().split('T')[0];

  try {
    let iutActualizado = false;

    const procesarTransaccion = req.db.transaction(() => {
      req.db.prepare(req.queries.saveUtm).run(periodo, valorUtm, tipoActualizacion || 'Manual', fechaHoy);

      const tabla = req.db.prepare(req.queries.getTabIut).get();
      if (tabla) {
        const tramos = [1, 2, 3, 4, 5, 6, 7].map(n => tabla[`Has${n}`] * valorUtm);
        const restas = [1, 2, 3, 4, 5, 6, 7].map(n => tabla[`Reb${n}`] * valorUtm);

        req.db.prepare(req.queries.saveIut).run(
          periodo,
          ...tramos,
          ...PORCENTAJES_IUT,
          ...restas
        );
        iutActualizado = true;
      }
    });

    procesarTransaccion();

    res.json({
      message: iutActualizado
        ? 'UTM guardada y tabla de Impuesto Único recalculada.'
        : 'UTM guardada. La tabla de Impuesto Único no se recalculó porque Tab_iut está vacía.',
      iutActualizado
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Honorarios (Mae_hon)
app.get('/api/mae_hon/activos', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getMaeHonActivos).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mae_hon/:rut', (req, res) => {
  try {
    const row = req.db.prepare(req.queries.getMaeHonPorRut).get(req.params.rut);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mae_hon', (req, res) => {
  const { rut, nombre, certificado } = req.body;
  if (!rut) return res.status(400).json({ error: 'El Rut es obligatorio.' });
  try {
    req.db.prepare(req.queries.saveMaeHon).run(rut, nombre || '', certificado || null);
    res.json({ message: 'Honorario guardado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/mae_hon/:rut', (req, res) => {
  try {
    req.db.prepare(req.queries.deleteMaeHon).run(req.params.rut);
    res.json({ message: 'Registro de honorario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Indices previsionales anuales (Indi)
app.get('/api/indi/:agno', (req, res) => {
  try {
    const row = req.db.prepare(req.queries.getIndiPorAgno).get(req.params.agno);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/indi', (req, res) => {
  const { agno, sis, cesEmpleador, cesTrabajador, accidenteTrabajo, topeImponible, aporteAdicional, seguroSocial, expectativaVida } = req.body;
  if (!agno) return res.status(400).json({ error: 'El Año es obligatorio.' });

  const fila = { agno, sis, cesEmpleador, cesTrabajador, accidenteTrabajo, topeImponible, aporteAdicional, seguroSocial, expectativaVida };
  try {
    req.db.prepare(req.queries.saveIndi).run(...req.queries.indiParamOrder.map(k => fila[k] ?? null));
    res.json({ message: 'Índices del año guardados correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Personal / Ficha del trabajador (Maeper)
app.get('/api/maeper/activos', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getMaeperActivos).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/maeper/:rut', (req, res) => {
  try {
    const row = req.db.prepare(req.queries.getMaeperPorRut).get(req.params.rut);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maeper', (req, res) => {
  const fila = req.body;
  if (!fila.rut) return res.status(400).json({ error: 'El Rut es obligatorio.' });
  try {
    req.db.prepare(req.queries.saveMaeper).run(...req.queries.maeperParamOrder.map(k => fila[k] ?? null));
    res.json({ message: 'Ficha del trabajador guardada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/maeper/:rut', (req, res) => {
  try {
    req.db.prepare(req.queries.deleteMaeper).run(req.params.rut);
    res.json({ message: 'Ficha del trabajador eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LIQUIDACIÓN DE SUELDOS (Liq_suel.frm) ---

const redondear = (n) => Math.round(Number(n) || 0);

// Los índices previsionales (Indi) llevan décadas de digitación manual y algunos
// campos (ej. Ex_vida) han quedado guardados como texto con coma decimal ("
// ,72" en vez de 0.72), lo que rompe una multiplicación directa. Se parsean así
// en vez de con Number()/(||0) para no perder silenciosamente un valor real.
const numLocal = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const parsed = parseFloat(String(v).replace(',', '.').trim());
  return Number.isNaN(parsed) ? 0 : parsed;
};

// RUT con una regla de Cesantía especial hardcodeada en el .frm original
// (Contabilizar_Click / Text2_LostFocus): en vez del Ces_trab/Ces_emp de la tabla
// Indi, a este trabajador se le calcula únicamente un 0.8% de aporte empresa y 0%
// de aporte trabajador. Se respeta tal cual, sin generalizarlo a una regla nueva.
// El RUT en sí vive en server/config.local.js (fuera de git) para no exponer
// datos de un trabajador real en el código público -- ver config.local.example.js.
let configLocal;
try {
  configLocal = require('./config.local.js');
} catch {
  configLocal = require('./config.local.example.js');
}
const RUT_EXCEPCION_CESANTIA = configLocal.rutExcepcionCesantia || '';

// 1. Calcular los haberes/descuentos base de una liquidación (dispara al perder foco
// "Dias Trabajados" en el .frm original -> Text2_LostFocus).
app.get('/api/liq-suel/base', (req, res) => {
  const { periodo, rut, dias } = req.query;
  if (!periodo || !rut) return res.status(400).json({ error: 'Periodo y Rut son obligatorios.' });
  const diasNum = Number(dias) || 30;

  try {
    const uf = req.db.prepare(`SELECT Valor FROM Uf WHERE Periodo = ?`).get(periodo);
    if (!uf) return res.status(404).json({ error: `No hay Registro de UF para el período ${periodo}.` });
    const ufValor = uf.Valor;

    const anio = periodo.substring(0, 4);
    const indi = req.db.prepare(req.queries.getIndiPorAgno).get(anio);
    if (!indi) return res.status(404).json({ error: `No hay Índices Previsionales para el año ${anio}.` });

    const p = req.db.prepare(req.queries.getMaeperPorRut).get(rut);
    if (!p) return res.status(404).json({ error: `No se encontró Ficha del trabajador con Rut ${rut}.` });

    // El Anticipo lo administra Anti_suel.frm (Anticipo de Sueldo), no este cálculo
    // -- se trae tal cual esté grabado en Liq_suel para este Periodo+Rut. El .frm
    // original siempre lo dejaba en 0 acá (código muerto en Text2_LostFocus); se
    // corrige para que sí refleje un anticipo ya grabado.
    const anticipoRow = req.db.prepare(`SELECT Anticipo FROM Liq_suel WHERE Periodo = ? AND Rut = ?`).get(periodo, rut);
    const anticipo = anticipoRow?.Anticipo ?? 0;

    const afpRow = req.db.prepare(`SELECT Cotiza FROM Afp WHERE Nombre = ?`).get(p.afp);
    if (!afpRow) return res.status(404).json({ error: `No existe la Afp "${p.afp}" en el maestro de Afp.` });

    const isapreRow = req.db.prepare(`SELECT Cotiza FROM Isapre WHERE Nombre = ?`).get(p.isapre);
    if (!isapreRow) return res.status(404).json({ error: `No existe la Isapre "${p.isapre}" en el maestro de Isapre.` });

    const gratifMaeper = p.gratificacion ?? 0;
    const tipoSueldo = String(p.tipoSueldo || '').trim();

    // Imponible + Gratificación (nota: en modo UF, si Dias != 30 la Gratificación
    // queda directamente en 0 -- así está en el .frm original, se respeta tal cual)
    let imponible, gratificacion;
    if (tipoSueldo === 'UF') {
      if (diasNum === 30) {
        imponible = redondear((p.imponible * ufValor) + gratifMaeper);
        gratificacion = redondear(gratifMaeper);
      } else {
        imponible = redondear((p.imponible * ufValor) / 30 * diasNum);
        gratificacion = 0;
      }
    } else if (diasNum === 30) {
      imponible = redondear(p.imponible);
      gratificacion = redondear(gratifMaeper);
    } else {
      imponible = redondear(p.imponible / 30 * diasNum);
      gratificacion = redondear(gratifMaeper / 30 * diasNum);
    }

    const comisiones = redondear(p.comisiones);
    const colacion = diasNum === 30 ? redondear(p.colacion) : redondear(p.colacion / 30 * diasNum);
    const movilizacion = diasNum === 30 ? redondear(p.movilizacion) : redondear(p.movilizacion / 30 * diasNum);
    const aguinaldo = redondear(p.aguinaldo);

    // El .frm compara el Imponi crudo de la ficha contra el Tope_imp del año: si
    // coinciden ("topado"), Comisiones se suma a los totales y Gratificación no;
    // si no, es al revés. Se respeta la condición literal, aunque es una regla rara.
    const topeado = Number(p.imponible) === numLocal(indi.topeImponible);
    let totalImponible, totalNoImponible;
    if (topeado) {
      totalImponible = imponible;
      totalNoImponible = redondear(colacion + movilizacion + comisiones + aguinaldo);
    } else {
      totalImponible = redondear(imponible + gratificacion);
      totalNoImponible = redondear(colacion + movilizacion + aguinaldo);
    }
    const totalHaberes = redondear(totalImponible + totalNoImponible);

    const ctaCte = (p.ctaCte ?? 0) > 0 ? redondear(p.ctaCte) : 0;

    const afpNombre = (p.afp || '').trim();
    const saludNombre = (p.isapre || '').trim();
    const afpPorcentaje = afpRow.Cotiza;
    const tipoIsapre = String(p.tipoIsapre || '').trim();
    const saludValor = tipoIsapre === 'UF' ? p.valorIsapre : isapreRow.Cotiza;
    const saludUnidad = tipoIsapre === 'UF' ? 'UF' : '%';

    const afpDescuento = redondear(totalImponible * afpRow.Cotiza / 100);
    // El descuento legal de Salud siempre usa el % del maestro Isapre (7% base),
    // incluso si el plan está pactado en UF -- la diferencia se calcula aparte.
    const saludDescuento = redondear(totalImponible * isapreRow.Cotiza / 100);

    let diferenciaIsapre = 0;
    if (tipoIsapre === 'UF') {
      const valorPlanUf = diasNum === 30
        ? (p.valorIsapre * ufValor)
        : (p.valorIsapre * ufValor / 30 * diasNum);
      diferenciaIsapre = redondear(valorPlanUf - saludDescuento);
      if (diferenciaIsapre < 0) diferenciaIsapre = 0;
    }

    let cesTrabajador, cesEmpresa;
    if (String(p.tipoContrato || '').trim() === 'INDEFINIDO') {
      if (rut === RUT_EXCEPCION_CESANTIA) {
        cesTrabajador = 0;
        cesEmpresa = redondear(totalImponible * 0.8 / 100);
      } else {
        cesTrabajador = redondear(totalImponible * numLocal(indi.cesTrabajador) / 100);
        cesEmpresa = redondear(totalImponible * numLocal(indi.cesEmpleador) / 100);
      }
    } else {
      cesTrabajador = 0;
      cesEmpresa = redondear(totalImponible * (numLocal(indi.cesEmpleador) + numLocal(indi.cesTrabajador)) / 100);
    }

    const sis = redondear(totalImponible * numLocal(indi.sis) / 100);
    const accTrabajo = redondear(totalImponible * numLocal(indi.accidenteTrabajo) / 100);
    const aporteAdicional = redondear(totalImponible * numLocal(indi.aporteAdicional) / 100);
    const seguroSocial = redondear(totalImponible * numLocal(indi.seguroSocial) / 100);
    const expectativaVida = redondear(totalImponible * numLocal(indi.expectativaVida) / 100);

    let haberesTributables;
    if (topeado) {
      haberesTributables = redondear(totalImponible - afpDescuento - saludDescuento - diferenciaIsapre - cesTrabajador + comisiones);
    } else {
      haberesTributables = redondear(totalImponible - afpDescuento - saludDescuento - diferenciaIsapre - cesTrabajador);
    }

    res.json({
      data: {
        nombreCompleto: `${p.nombres || ''} ${p.apater || ''} ${p.amater || ''}`.trim().replace(/\s+/g, ' '),
        imponible, comisiones, gratificacion, colacion, movilizacion, aguinaldo,
        totalImponible, totalNoImponible, totalHaberes,
        afpNombre, afpPorcentaje, afpUnidad: '%',
        saludNombre, saludValor, saludUnidad,
        afpDescuento, saludDescuento, diferenciaIsapre,
        cesTrabajador, cesEmpresa, sis, accTrabajo, ctaCte,
        aporteAdicional, seguroSocial, expectativaVida,
        haberesTributables,
        anticipo
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Calcular el Impuesto Único (Calcular_Click / Impuesto()). El .frm original
// solo revisaba 4 tramos (Tramo1..4) pero la tabla Iut ya tiene hasta 8 tramos
// reales (construidos y verificados en la sesión anterior); se extiende el mismo
// algoritmo de cascada a los 8 en vez de truncarlo a 4.
app.get('/api/liq-suel/iut', (req, res) => {
  const { periodo, habTrib } = req.query;
  if (!periodo) return res.status(400).json({ error: 'Periodo es obligatorio.' });
  const hab = Number(habTrib) || 0;

  try {
    const row = req.db.prepare(`SELECT * FROM Iut WHERE Periodo = ?`).get(periodo);
    if (!row) return res.status(404).json({ error: `No hay tabla de Impuesto Único (Iut) para el período ${periodo}.` });

    let iut = 0;
    for (let i = 1; i <= 8; i++) {
      const tramo = row[`Tramo${i}`];
      if (tramo === null || tramo === undefined) continue;
      if (tramo > hab) {
        iut = hab * row[`Porce${i}`] - row[`Resta${i}`];
        break;
      }
    }
    res.json({ iut: redondear(iut) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Grabar (Grabar_Click) -- upsert por (Periodo, Rut)
app.post('/api/liq-suel', (req, res) => {
  const fila = req.body;
  if (!fila.periodo || !fila.rut) return res.status(400).json({ error: 'Periodo y Rut son obligatorios.' });
  try {
    req.db.prepare(req.queries.saveLiqSuel).run(...req.queries.liqSuelParamOrder.map(k => fila[k] ?? null));
    res.json({ message: `Liquidación de ${fila.rut} del período ${fila.periodo} grabada correctamente.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Contabilizar (Contabilizar_Click) -- toma TODAS las liquidaciones grabadas
// del período y genera la póliza de Cdiario, igual que el .frm original: una
// línea por cada concepto de cada trabajador, más una línea final con la suma de
// Líquidos. La Póliza se auto-genera desde Numpol, igual que en Comprobante Diario.
app.post('/api/liq-suel/contabilizar', (req, res) => {
  const { periodo } = req.body;
  if (!periodo || periodo.length !== 6) return res.status(400).json({ error: 'Periodo inválido (formato AAAAMM).' });

  const anio = periodo.substring(0, 4);
  const mes = periodo.substring(4, 6);
  const mesCampo = periodo.substring(2); // 'AAMM', igual formato que usa Numpol en el resto del sistema
  // El .frm original contabiliza siempre con fecha fija día 28, en el mismo
  // formato texto 'DD/MM/AAAA' que usa el resto del sistema para Cdiario.Fecha
  // (ver /api/contab/procesar-cv) -- antes se guardaba en ISO 'AAAA-MM-28',
  // lo que hacía que estas pólizas de Sueldos no aparecieran en Libro Diario/
  // Mayor, Balance ni Análisis Ctas Ctes (todos filtran por rango de fecha).
  const fecha = `28/${mes}/${anio}`;

  try {
    const contabilizar = req.db.transaction(() => {
      const liqRows = req.db.prepare(req.queries.getLiqSuelPorPeriodo).all(periodo);
      if (liqRows.length === 0) return null;

      let siguienteNum = 1;
      const rowPol = req.db.prepare(`SELECT Numero FROM Numpol WHERE Periodo = ? AND Mes = ?`).get(anio, mesCampo);
      if (rowPol) {
        siguienteNum = rowPol.Numero + 1;
        req.db.prepare(`UPDATE Numpol SET Numero = ? WHERE Periodo = ? AND Mes = ?`).run(siguienteNum, anio, mesCampo);
      } else {
        req.db.prepare(`INSERT INTO Numpol (Periodo, Mes, Numero) VALUES (?, ?, ?)`).run(anio, mesCampo, siguienteNum);
      }
      const numStr = siguienteNum < 10 ? `0${siguienteNum}` : `${siguienteNum}`;
      const poliza = `${mesCampo}${numStr}`;

      let linea = 0;
      let liquidoAcumulado = 0;
      const insertLinea = (cuenta, debHab, valor, glosa) => {
        linea += 1;
        req.db.prepare(`
          INSERT INTO Cdiario (Ncomp, Fecha, Linea, Cuenta, DebHab, Valor, Glosa, Tdoc, Numdoc, Rut)
          VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '')
        `).run(poliza, fecha, linea, cuenta, debHab, valor, glosa);
      };

      liqRows.forEach(r => {
        const aportesEmpresa = (r.sis || 0) + (r.accTrabajo || 0) + (r.cesEmpresa || 0) + (r.seguroSocial || 0) + (r.aporteAdicional || 0) + (r.expectativaVida || 0);

        if (r.totalHaberes > 0) insertLinea('0301', 'D', r.totalHaberes, 'Sueldos');
        if (r.accTrabajo > 0) insertLinea('0302', 'D', aportesEmpresa, 'Sueldos');
        if (r.afpDescuento > 0) {
          const aportesTrabajador = (r.afpDescuento || 0) + (r.saludDescuento || 0) + (r.diferenciaIsapre || 0) + (r.cesTrabajador || 0);
          insertLinea('0211', 'C', aportesTrabajador, 'Aportes trabajador');
        }
        if (r.sis > 0) insertLinea('0211', 'C', aportesEmpresa, 'Aportes empresa');
        if (r.iut > 0) insertLinea('0212', 'C', r.iut, 'Impuesto Unico');
        if (r.anticipo > 0) insertLinea('0117', 'C', r.anticipo, 'Anticipo');
        if (r.ctaCte > 0) insertLinea('0117', 'C', r.ctaCte, 'Cuenta Corriente');

        liquidoAcumulado += r.liquido || 0;
      });

      insertLinea('0213', 'C', liquidoAcumulado, 'Liquido a pagar');

      return poliza;
    });

    const poliza = contabilizar();
    if (!poliza) return res.status(404).json({ error: `No hay liquidaciones grabadas para el período ${periodo}.` });
    res.json({ message: `Período ${periodo} contabilizado en la Póliza N° ${poliza}.`, poliza });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convierte un monto entero a su forma en palabras (español, pesos chilenos),
// para la línea "Son: ..." de la liquidación impresa (Liq_suel.rpt -> NumerosALetras).
function numeroALetras(numero) {
  const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const DIECI = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const VEINTI = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  const tresDigitos = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const partes = [];
    if (c > 0) partes.push(CENTENAS[c]);
    if (resto > 0) {
      if (resto < 10) partes.push(UNIDADES[resto]);
      else if (resto < 20) partes.push(DIECI[resto - 10]);
      else if (resto < 30) partes.push(VEINTI[resto - 20]);
      else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        partes.push(u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`);
      }
    }
    return partes.join(' ');
  };

  // Apócope de "uno" antes de "mil"/"millones" (veintiuno -> veintiún, treinta y
  // uno -> treinta y un), para que 21000 no salga "veintiuno mil".
  const apocopar = (texto) => texto === 'veintiuno' ? 'veintiún' : texto.replace(/ y uno$/, ' y un');

  const num = Math.round(Math.abs(Number(numero) || 0));
  if (num === 0) return 'cero';

  const millones = Math.floor(num / 1000000);
  const miles = Math.floor((num % 1000000) / 1000);
  const resto = num % 1000;

  const partes = [];
  if (millones > 0) partes.push(millones === 1 ? 'un millón' : `${apocopar(tresDigitos(millones))} millones`);
  if (miles > 0) partes.push(miles === 1 ? 'mil' : `${apocopar(tresDigitos(miles))} mil`);
  if (resto > 0) partes.push(tresDigitos(resto));

  return partes.join(' ');
}

// Imprimir (Liq_suel.rpt): la colilla de pago individual. Réplica del SQL de
// Crystal Report (Liq_suel INNER JOIN Maeper INNER JOIN Afp) entregado. No se
// encontró dónde el reporte muestra Adic_isap (Diferencia Isapre) por separado
// -- no aparece como línea propia, así que Total Leyes Sociales / Total
// Descuentos se arman solo con Afp + Isapre + Ces_trab (+ Iut + Anticipo), sin
// incluirlo. Tampoco selecciona Cta_Cte (aunque la columna existe), así que la
// línea "Cuenta Corriente" del impreso siempre queda en 0.
app.get('/api/reportes/liquidacion-sueldo', (req, res) => {
  const { periodo, rut } = req.query;
  if (!periodo || !rut) return res.status(400).json({ error: 'Periodo y Rut son obligatorios.' });

  try {
    const row = req.db.prepare(req.queries.getLiqSuelReporte).get(periodo, rut);
    if (!row) {
      return res.status(404).json({ error: `No hay una liquidación grabada para el Rut ${rut} en el período ${periodo} (o no calzan los maestros de Afp/Maeper).` });
    }

    const empresa = req.db.prepare(`SELECT * FROM IEmpresa LIMIT 1`).get();

    const totalLeyesSociales = redondear((row.AfpDescuento || 0) + (row.IsapreDescuento || 0) + (row.Ces_trab || 0));
    const totalDescuentos = redondear(totalLeyesSociales + (row.Iut || 0) + (row.Anticipo || 0));

    res.json({
      data: {
        periodo: row.Periodo,
        rut: row.Rut,
        nombreCompleto: `${row.Nombres || ''} ${row.Apater || ''} ${row.Amater || ''}`.trim().replace(/\s+/g, ' '),
        cargo: (row.Cargo || '').trim(),
        sueldoBase: row.Imponi,
        gratificacion: row.Gratif || 0,
        comisiones: row.Comis,
        afpNombre: (row.AfpNombre || '').trim(),
        afpPorcentaje: row.AfpCotiza,
        afpDescuento: row.AfpDescuento,
        saludNombre: (row.IsapreNombre || '').trim(),
        saludValor: row.Val_isap,
        saludUnidad: String(row.Tipo_isap || '').trim() === 'UF' ? 'UF' : '%',
        saludDescuento: row.IsapreDescuento,
        cesantiaTrabajador: row.Ces_trab,
        totalLeyesSociales,
        haberesImponibles: row.Hab_imp,
        haberesTributables: row.Hab_trib,
        movilizacion: row.Movil,
        colacion: row.Colac,
        aguinaldo: row.Aguin,
        totalHaberesNoImponibles: row.Hab_noimp,
        totalHaberes: row.Tot_hab,
        impuestoUnico: row.Iut,
        anticipo: row.Anticipo,
        cuentaCorriente: 0,
        totalDescuentos,
        liquido: row.Liquido,
        palabras: `${numeroALetras(row.Liquido)} pesos`,
        empresa: empresa || {}
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ANTICIPO DE SUELDO (Anti_suel.frm) ---
// Graba/lee directamente la columna Anticipo de Liq_suel. La columna Periodo/Rut/
// Anticipo existe idéntica en las 3 empresas, así que no requiere queries por
// empresa (a diferencia del resto de Liq_suel).

// Combo1_LostFocus: trae el Anticipo ya grabado para ese Periodo+Rut (si existe).
app.get('/api/anticipo-sueldo', (req, res) => {
  const { periodo, rut } = req.query;
  if (!periodo || !rut) return res.status(400).json({ error: 'Periodo y Rut son obligatorios.' });
  try {
    const row = req.db.prepare(`SELECT Anticipo FROM Liq_suel WHERE Periodo = ? AND Rut = ?`).get(periodo, rut);
    res.json({ anticipo: row ? row.Anticipo : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grabar_Click: si ya existe la fila de Liq_suel para ese Periodo+Rut, actualiza
// SOLO Anticipo (sin tocar el resto de columnas ya calculadas); si no existe,
// crea una fila nueva con solo Periodo/Rut/Anticipo (el resto se completa después
// desde Liquidación de Sueldos).
app.post('/api/anticipo-sueldo', (req, res) => {
  const { periodo, rut, anticipo } = req.body;
  if (!periodo || !rut) return res.status(400).json({ error: 'Periodo y Rut son obligatorios.' });
  try {
    req.db.prepare(`
      INSERT INTO Liq_suel (Periodo, Rut, Anticipo) VALUES (?, ?, ?)
      ON CONFLICT(Periodo, Rut) DO UPDATE SET Anticipo = excluded.Anticipo
    `).run(periodo, rut, anticipo || 0);
    res.json({ message: `Anticipo de ${rut} del período ${periodo} grabado correctamente.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DECLARACIONES JURADAS (Dec_Juradas.frm) ---
// "Imprimir" (Certif_hono.rpt / Certif_suel.rpt) queda pendiente: el usuario va
// a revisar esos reportes por separado antes de conectarlos.

// Decla_hon en Ferroq/Parcela no tiene columna Prest (HRO sí) -- se agrega si
// falta en vez de dejar el Préstamo del formulario sin dónde guardarse.
function asegurarColumnaPrestDeclaHon(db) {
  const cols = db.prepare(`PRAGMA table_info(Decla_hon)`).all();
  if (!cols.some((c) => c.name === 'Prest')) {
    db.exec(`ALTER TABLE Decla_hon ADD COLUMN Prest REAL`);
  }
}

// Bases creadas antes de que Lcompra guardara el Monto Exento por separado
// (venía sumado al Neto para no descuadrar el asiento de Poliza) no tienen la
// columna -- se agrega si falta en vez de perder el dato al mostrarlo en el
// Libro de Compras.
function asegurarColumnaExenLcompra(db) {
  const cols = db.prepare(`PRAGMA table_info(Lcompra)`).all();
  if (!cols.some((c) => c.name === 'Exen')) {
    db.exec(`ALTER TABLE Lcompra ADD COLUMN Exen REAL`);
  }
}

// Text4_LostFocus: al perder foco Boleta, trae el registro ya grabado (si existe).
app.get('/api/decla-hon/buscar', (req, res) => {
  const { periodo, rut, boleta } = req.query;
  if (!periodo || !rut || !boleta) return res.status(400).json({ error: 'Periodo, Rut y Boleta son obligatorios.' });

  try {
    asegurarColumnaPrestDeclaHon(req.db);
    const row = req.db.prepare(req.queries.getDeclaHon).get(periodo, rut, boleta);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grabar (Tab "Honorarios"): upsert por (Rut, Periodo, Boleta). El Certif se
// copia desde Mae_hon.Certif (fijo por persona, igual que el .frm original).
app.post('/api/decla-hon', (req, res) => {
  const { periodo, rut, boleta, total, reten, prestamo, liquido } = req.body;
  if (!periodo || !rut || !boleta) return res.status(400).json({ error: 'Periodo, Rut y Boleta son obligatorios.' });

  try {
    asegurarColumnaPrestDeclaHon(req.db);

    const persona = req.db.prepare(req.queries.getMaeHonPorRut).get(rut);
    if (!persona) return res.status(404).json({ error: `No existe una Ficha de Honorarios para el Rut ${rut}.` });

    const agno = periodo.substring(0, 4);
    req.db.prepare(req.queries.saveDeclaHon).run(
      rut, periodo, boleta, total || 0, reten || 0, liquido || 0, persona.certificado ?? null, agno, prestamo || 0
    );
    res.json({ message: `Boleta ${boleta} de ${rut} grabada correctamente.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Procesar_Click (Tab "Sueldos"): reconstruye Decla_suel para el año completo
// (Ejercicio) a partir de las liquidaciones ya grabadas.
//
// El .frm original numera los certificados con un contador (Certi/Rut_ant) que
// vive a nivel de FORMULARIO, no de esta ejecución -- persiste mientras el
// formulario esté abierto, así que si Procesar se corre más de una vez en la
// misma sesión (por ejemplo, para dos años distintos seguidos) el número de
// certificado de un mismo Rut puede seguir subiendo entre años en vez de
// reiniciarse. Un backend sin estado no puede replicar eso de forma segura, y
// los datos reales ya cargados (Certif=1 para 2016, Certif=2 para el MISMO Rut
// en 2017) confirman que efectivamente pasaba. Acá se opta por: nunca tocar el
// Certif de una fila que YA EXISTE (para no invalidar certificados ya usados/
// declarados al SII), y numerar 1,2,3... sólo las filas NUEVAS de esta
// ejecución, en el orden Rut/Periodo. También se salta (en vez de fallar) si
// no hay Factor cargado para algún período -- el .frm original habría
// reventado ahí (rs2!Factor sobre un recordset vacío).
app.post('/api/decla-suel/procesar', (req, res) => {
  const { ejercicio } = req.body;
  if (!ejercicio || ejercicio.length !== 4) return res.status(400).json({ error: 'El Ejercicio debe ser un año de 4 dígitos.' });

  try {
    const liqRows = req.db.prepare(req.queries.getLiqSuelPorAgno).all(`${ejercicio}%`);
    if (liqRows.length === 0) {
      return res.status(404).json({ error: `No hay liquidaciones grabadas para el año ${ejercicio}.` });
    }

    let certi = 0;
    let rutAnt = null;
    let insertados = 0;
    let actualizados = 0;
    let omitidosSinFactor = 0;

    const procesar = req.db.transaction(() => {
      liqRows.forEach((r) => {
        const factorRow = req.db.prepare(req.queries.getFactorPorPeriodo).get(r.periodo);
        if (!factorRow) { omitidosSinFactor++; return; }

        const imponi = (r.imponible || 0) + (r.comisiones || 0) + (r.gratificacion || 0) + (r.movilizacion || 0) + (r.colacion || 0) + (r.aguinaldo || 0);
        const lsoc = (r.afpDescuento || 0) + (r.saludDescuento || 0) + (r.diferenciaIsapre || 0) + (r.cesTrabajador || 0);
        const tribut = r.haberesTributables || 0;
        const iut = r.iut || 0;
        const factor = factorRow.Factor;
        const tributAct = redondear(tribut * factor);
        const iutAct = redondear(iut * factor);
        const agno = r.periodo.substring(0, 4);

        const existente = req.db.prepare(req.queries.getDeclaSuelExistente).get(r.periodo, r.rut);
        if (existente) {
          req.db.prepare(req.queries.updateDeclaSuel).run(imponi, lsoc, tribut, iut, factor, tributAct, iutAct, agno, r.periodo, r.rut);
          actualizados++;
        } else {
          if (r.rut !== rutAnt) { certi += 1; rutAnt = r.rut; }
          req.db.prepare(req.queries.insertDeclaSuel).run(r.periodo, r.rut, imponi, lsoc, tribut, iut, factor, tributAct, iutAct, certi, agno);
          insertados++;
        }
      });
    });
    procesar();

    const avisoFactor = omitidosSinFactor > 0 ? ` (${omitidosSinFactor} período(s) sin Factor cargado, se omitieron)` : '';
    res.json({ message: `Año ${ejercicio}: ${insertados} nuevo(s), ${actualizados} actualizado(s)${avisoFactor}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Text1_LostFocus (Tab "Factores"): trae los 12 factores ya grabados para el año.
app.get('/api/factores/:agno', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getFactoresPorAgno).all(`${req.params.agno}%`);
    const porMes = {};
    rows.forEach((r) => { porMes[r.Periodo.substring(4, 6)] = r.Factor; });
    res.json({ data: porMes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grabar (Tab "Factores"): upsert real por cada uno de los 12 meses. El .frm
// original, cuando el año YA tenía factores grabados, no actualizaba cada mes
// por separado -- volvía a editar una y otra vez la MISMA fila del recordset
// (sin moverse fila por fila) para los meses 1-9, y para 10-12 usaba AddNew en
// vez de Edit, duplicando filas cada vez que se reprocesaba un año existente.
// Es un bug real, no una decisión de diseño -- se reemplaza por un upsert
// mes a mes correcto en vez de replicar la corrupción.
app.post('/api/factores', (req, res) => {
  const { agno, meses } = req.body;
  if (!agno || agno.length !== 4) return res.status(400).json({ error: 'El Período debe ser un año de 4 dígitos.' });
  if (!Array.isArray(meses) || meses.length !== 12) return res.status(400).json({ error: 'Faltan los 12 meses.' });

  try {
    const guardar = req.db.transaction(() => {
      meses.forEach((valor, idx) => {
        const mm = String(idx + 1).padStart(2, '0');
        req.db.prepare(req.queries.saveFactor).run(`${agno}${mm}`, valor === '' || valor == null ? null : Number(valor));
      });
    });
    guardar();
    res.json({ message: `Factores del año ${agno} grabados correctamente.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Imprimir (Certif_hono.rpt): réplica del SQL de Crystal Report entregado
// (Decla_hon INNER JOIN Factores INNER JOIN Mae_hon). El SQL base no filtra
// por Rut/Año ni ordena por Periodo (sólo "ORDER BY Rut", que no sirve de nada
// una vez filtrado a una sola persona) -- igual que en los reportes anteriores,
// esto dependía de una Selection Formula/Sort en tiempo de ejecución que no se
// puede inspeccionar acá. Se filtra explícitamente por Rut+Año (un certificado
// es por persona y por año, según el propio texto del certificado) y se ordena
// por Periodo para que salga en orden cronológico.
app.get('/api/reportes/certificado-honorarios', (req, res) => {
  const { rut, agno } = req.query;
  if (!rut || !agno) return res.status(400).json({ error: 'Rut y Año son obligatorios.' });

  try {
    asegurarColumnaPrestDeclaHon(req.db);

    const rows = req.db.prepare(`
      SELECT Decla_hon.Periodo, Decla_hon.Total, Decla_hon.Reten, Decla_hon.Prest,
             Mae_hon.Nombre, Mae_hon.Certif,
             Factores.Factor
      FROM Decla_hon
      INNER JOIN Factores ON Decla_hon.Periodo = Factores.Periodo
      INNER JOIN Mae_hon ON Decla_hon.Rut = Mae_hon.Rut
      WHERE Decla_hon.Rut = ? AND Decla_hon.Agno = ?
      ORDER BY Decla_hon.Periodo ASC
    `).all(rut, agno);

    if (rows.length === 0) {
      return res.status(404).json({ error: `No hay honorarios grabados para el Rut ${rut} en el año ${agno} (o falta el Factor de algún período).` });
    }

    const detalle = rows.map((r) => {
      const total = r.Total || 0;
      const reten = r.Reten || 0;
      const prest = r.Prest || 0;
      const factor = r.Factor;
      const totalAct = redondear(total * factor);
      const retenAct = redondear(reten * factor);
      const prestAct = redondear(prest * factor);
      return {
        mes: MESES_ES[Number(r.Periodo.substring(4, 6)) - 1] || r.Periodo,
        honorarioBruto: total,
        retencionImpuesto: reten,
        prestamo: prest,
        factor,
        honorarioActualizado: totalAct,
        impuestoActualizado: retenAct,
        prestamoActualizado: prestAct,
        liquido: totalAct - retenAct - prestAct
      };
    });

    const empresa = req.db.prepare(`SELECT * FROM IEmpresa LIMIT 1`).get();
    const hoy = new Date();

    res.json({
      data: {
        rut,
        nombre: (rows[0].Nombre || '').trim(),
        certificado: rows[0].Certif,
        agno,
        fechaEmision: `${MESES_ES[hoy.getMonth()]} de ${hoy.getFullYear()}`,
        detalle,
        empresa: empresa || {}
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Imprimir (Certif_suel.rpt): réplica del SQL entregado (Decla_suel INNER JOIN
// Maeper). A diferencia de Certif_hono.rpt, acá Haberes/Impuesto Actualizado
// salen directo de las columnas ya guardadas (Tribut_act/Iut_act), sin
// recalcular con el Factor -- Decla_suel ya los deja calculados al Procesar.
//
// A diferencia de Certif_hono.rpt (que sí filtra por Rut vía Combo2), la
// pestaña "Sueldos" del .frm original NO tiene selector de Rut -- Imprimir_Click
// sólo pasa el Ejercicio ("Periodo='" & Text2 & "'"). Eso confirma que este
// reporte es un LOTE: un certificado por cada trabajador con declaración ese
// año, todos impresos de una sola vez (como páginas separadas en Crystal
// Reports). Acá se devuelve un arreglo con un certificado por Rut en vez de
// pedir uno a la vez. El nombre se arma como Nombres + Amater + Apater porque
// así sale en el certificado real que mandó el usuario (no es el orden
// habitual Apater+Amater+Nombres).
app.get('/api/reportes/certificado-sueldo', (req, res) => {
  const { agno } = req.query;
  if (!agno) return res.status(400).json({ error: 'El Año es obligatorio.' });

  try {
    const rows = req.db.prepare(`
      SELECT Decla_suel.Rut, Decla_suel.Periodo, Decla_suel.Imponi, Decla_suel.Lsoc, Decla_suel.Tribut, Decla_suel.Iut,
             Decla_suel.Factor, Decla_suel.Tribut_act, Decla_suel.Iut_act, Decla_suel.Certif,
             Maeper.Apater, Maeper.Amater, Maeper.Nombres
      FROM Decla_suel
      INNER JOIN Maeper ON Decla_suel.Rut = Maeper.Rut
      WHERE Decla_suel.Agno = ?
      ORDER BY Decla_suel.Rut ASC, Decla_suel.Periodo ASC
    `).all(agno);

    if (rows.length === 0) {
      return res.status(404).json({ error: `No hay declaraciones de sueldos grabadas para el año ${agno}.` });
    }

    const empresa = req.db.prepare(`SELECT * FROM IEmpresa LIMIT 1`).get();
    const hoy = new Date();
    const fechaEmision = `${MESES_ES[hoy.getMonth()]} de ${hoy.getFullYear()}`;

    const porRut = new Map();
    rows.forEach((r) => {
      if (!porRut.has(r.Rut)) porRut.set(r.Rut, []);
      porRut.get(r.Rut).push(r);
    });

    const certificados = Array.from(porRut.values()).map((filas) => {
      const p = filas[0];
      return {
        rut: p.Rut,
        nombre: `${(p.Nombres || '').trim()} ${(p.Amater || '').trim()} ${(p.Apater || '').trim()}`.replace(/\s+/g, ' ').trim(),
        certificado: p.Certif,
        agno,
        fechaEmision,
        detalle: filas.map((r) => ({
          mes: MESES_ES[Number(r.Periodo.substring(4, 6)) - 1] || r.Periodo,
          sueldoBruto: r.Imponi || 0,
          leyesSociales: r.Lsoc || 0,
          haberesTributables: r.Tribut || 0,
          impuestoUnico: r.Iut || 0,
          factor: r.Factor,
          haberesActualizados: r.Tribut_act || 0,
          impuestoActualizado: r.Iut_act || 0
        }))
      };
    });

    res.json({ data: certificados, empresa: empresa || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MANTENEDORES (Manten.frm) ---

// Clientes
app.get('/api/clientes', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getClientes).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', (req, res) => {
  const { rut, razonSocial } = req.body;
  try {
    req.db.prepare(req.queries.saveCliente).run(rut.trim(), razonSocial.trim());
    res.json({ message: 'Cliente guardado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clientes/:rut', (req, res) => {
  try {
    req.db.prepare(req.queries.deleteCliente).run(req.params.rut);
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clientes/revisar', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.revisarClientes).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Búsqueda puntual por Rut (autocompletar Razón Social al salir del campo, como Text1_LostFocus en VB6)
app.get('/api/clientes/:rut', (req, res) => {
  try {
    const row = req.db.prepare(req.queries.getClientePorRut).get(req.params.rut);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proveedores
app.get('/api/proveedores', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getProveedores).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/proveedores', (req, res) => {
  const { rut, razonSocial, cuenta } = req.body;
  try {
    req.db.prepare(req.queries.saveProveedor).run(
      rut.trim(), 
      razonSocial.trim(), 
      cuenta ? cuenta.trim() : null
    );
    res.json({ message: 'Proveedor guardado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/proveedores/:rut', (req, res) => {
  try {
    req.db.prepare(req.queries.deleteProveedor).run(req.params.rut);
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/proveedores/revisar', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.revisarProveedores).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Búsqueda puntual por Rut (autocompletar Razón Social + Cuenta, como Text3_LostFocus en VB6)
app.get('/api/proveedores/:rut', (req, res) => {
  try {
    const row = req.db.prepare(req.queries.getProveedorPorRut).get(req.params.rut);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cuentas
app.get('/api/cuentas', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getCuentas).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cuentas', (req, res) => {
  const { codigo, nombre, tipo } = req.body;
  try {
    req.db.prepare(req.queries.saveCuenta).run(codigo.trim(), nombre.trim(), tipo.trim());
    res.json({ message: 'Cuenta guardada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cuentas/:codigo', (req, res) => {
  try {
    req.db.prepare(req.queries.deleteCuenta).run(req.params.codigo);
    res.json({ message: 'Cuenta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Búsqueda puntual por Código (autocompletar Nombre/Tipo al salir del campo)
app.get('/api/cuentas/:codigo', (req, res) => {
  try {
    const row = req.db.prepare(req.queries.getCuentaPorCodigo).get(req.params.codigo);
    res.json({ data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ejercicio
app.post('/api/ejercicio', (req, res) => {
  const { ejercicio } = req.body;
  if (!ejercicio || ejercicio.length < 4) return res.status(400).json({ error: 'Ejercicio inválido' });

  const yearShort = ejercicio.substring(2, 4);

  try {
    req.db.exec(`CREATE TABLE IF NOT EXISTS Numpol (Periodo TEXT NOT NULL, Mes TEXT NOT NULL, Numero INTEGER, PRIMARY KEY (Periodo, Mes))`);

    const insertTransaction = req.db.transaction(() => {
      const stmt = req.db.prepare(req.queries.insertNumpol);
      for (let i = 1; i <= 12; i++) {
        const mesStr = i < 10 ? `0${i}` : `${i}`;
        stmt.run(ejercicio, `${yearShort}${mesStr}`);
      }
    });

    insertTransaction();
    res.json({ message: `Ejercicio ${ejercicio} inicializado con 12 períodos.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Carga Archivos SII (Manten.frm -> Carga Archivos SII)
// Recibe las filas ya parseadas del CSV del SII (Compras o Ventas), trunca la
// tabla cruda correspondiente y la reemplaza por el contenido del archivo.
app.post('/api/carga-sii/procesar', (req, res) => {
  const { tipo, rows } = req.body;

  if (tipo !== 'compras' && tipo !== 'ventas') {
    return res.status(400).json({ error: 'Tipo inválido. Debe ser "compras" o "ventas".' });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'El archivo no contiene registros para procesar.' });
  }

  const tabla = tipo === 'compras' ? 'Compras' : 'Ventas';

  try {
    const procesarCarga = req.db.transaction(() => {
      req.db.prepare(`DELETE FROM ${tabla}`).run();

      const insertStmt = req.db.prepare(`
        INSERT INTO ${tabla} (Tdoc, Numdoc, Fecha, Rut, Rsoc, Neto, Exen, Iva, Total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      rows.forEach(r => {
        insertStmt.run(r.Tdoc, r.Numdoc, r.Fecha, r.Rut, r.Rsoc, r.Neto, r.Exen, r.Iva, r.Total);
      });
    });

    procesarCarga();

    const data = req.db.prepare(`
      SELECT Tdoc, Numdoc, Fecha, Rut, Rsoc, Neto, Exen, Iva, Total FROM ${tabla} ORDER BY Fecha ASC
    `).all();

    res.json({ message: 'Registro ingresado con éxito', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contenido actual de la tabla cruda Compras/Ventas (botón "Revisar Libro Actual")
app.get('/api/carga-sii/actual', (req, res) => {
  const { tipo } = req.query;

  if (tipo !== 'compras' && tipo !== 'ventas') {
    return res.status(400).json({ error: 'Tipo inválido. Debe ser "compras" o "ventas".' });
  }

  const tabla = tipo === 'compras' ? 'Compras' : 'Ventas';

  try {
    const data = req.db.prepare(`
      SELECT Tdoc, Numdoc, Fecha, Rut, Rsoc, Neto, Exen, Iva, Total FROM ${tabla} ORDER BY Fecha ASC
    `).all();

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REGISTRO DE COMPRAS Y VENTAS (RegComp.frm) ---

// Guardar Compra
app.post('/api/rcv/compras', (req, res) => {
  const { rut, tdoc, numdoc, fecha, neto, iva, total, glosa, cuenta } = req.body;
  const periodo = fecha.replace(/-/g, '').substring(0, 6);

  try {
    asegurarColumnaExenLcompra(req.db);
    // El formulario de registro manual (RegComp.frm) no tiene campo Exento.
    req.db.prepare(req.queries.saveCompra).run(rut, tdoc, numdoc, fecha, neto, 0, iva, total, glosa, cuenta, periodo);
    res.json({ message: 'Compra guardada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar Venta
app.post('/api/rcv/ventas', (req, res) => {
  const { rut, tdoc, numdoc, fecha, neto, iva, total } = req.body;
  const periodo = fecha.replace(/-/g, '').substring(0, 6);

  try {
    req.db.prepare(req.queries.saveVenta).run(rut, tdoc, numdoc, fecha, neto, iva, total, periodo);
    res.json({ message: 'Venta guardada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Procesar SII Masivo (Compras o Ventas)
app.post('/api/rcv/procesar-sii', (req, res) => {
  const { tipo, periodo } = req.body;

  try {
    if (tipo === 'compras') {
      asegurarColumnaExenLcompra(req.db);
      const rawRows = req.db.prepare(req.queries.getRawCompras).all();

      const processTransaction = req.db.transaction((rows) => {
        req.db.exec(req.queries.clearLcompra);
        const stmt = req.db.prepare(req.queries.saveCompra);

        rows.forEach(r => {
          const isFA = r.Tdoc === '33';
          const tdoc = isFA ? 'FA' : 'NC';
          const factor = isFA ? 1 : -1;
          // El Neto de la Poliza sigue incluyendo el Exento (no hay cuenta
          // contable separada para exento en Compras); Exen se guarda además
          // por separado solo para mostrarlo en el Libro de Compras.
          const exen = (r.Exen || 0) * factor;
          const neto = (r.Neto + (r.Exen || 0)) * factor;
          const iva = r.Iva * factor;
          const total = r.Total * factor;
          const glosa = `${tdoc} ${r.Numdoc}`;

          stmt.run(r.Rut, tdoc, r.Numdoc, r.Fecha, neto, exen, iva, total, glosa, '', periodo);
        });
      });

      processTransaction(rawRows);
      res.json({ message: `Se procesaron ${rawRows.length} compras para el periodo ${periodo}` });

    } else {
      const rawRows = req.db.prepare(req.queries.getRawVentas).all();

      const processTransaction = req.db.transaction((rows) => {
        const stmt = req.db.prepare(req.queries.saveVenta);
        rows.forEach(r => {
          const tdoc = r.Tdoc === '33' ? 'FA' : (r.Tdoc === '61' ? 'NC' : 'FA');
          stmt.run(r.Rut, tdoc, r.Numdoc, r.Fecha, r.Neto, r.Iva, r.Total, periodo);
        });
      });

      processTransaction(rawRows);
      res.json({ message: `Se procesaron ${rawRows.length} ventas para el periodo ${periodo}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint único para el reporte de Libro de Compras (HRO y Ferroq)
app.get('/api/reportes/libro-compras', (req, res) => {
  const { periodo } = req.query;
  const periodoLimpio = periodo ? periodo.replace(/-/g, '') : '';

  try {
    asegurarColumnaExenLcompra(req.db);
    const rows = req.db.prepare(`
      SELECT
        L.Rut,
        COALESCE(P.Rsoc, '') AS RazonSocial,
        L.Tdoc,
        L.Numdoc,
        L.Fecha,
        L.Neto,
        L.Exen,
        L.Iva,
        L.Total
      FROM Lcompra L
      LEFT JOIN Provee P ON L.Rut = P.Rut
      WHERE L.Periodo = ?
      ORDER BY L.Tdoc ASC, L.Fecha ASC
    `).all(periodoLimpio);

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para Libro de Ventas (HRO y Ferroq)
app.get('/api/reportes/libro-ventas', (req, res) => {
  const { periodo } = req.query;
  const periodoLimpio = periodo ? periodo.replace(/-/g, '') : '';

  try {
    const rows = req.db.prepare(`
      SELECT 
        L.Rut, 
        COALESCE(C.Rsoc_cl, '') AS RazonSocial, 
        L.Tdoc, 
        L.Numdoc, 
        L.Fecha, 
        L.Neto, 
        L.Iva, 
        L.Total,
        L.Periodo
      FROM Lventa L
      LEFT JOIN Clientes C ON L.Rut = C.Rut_cl
      WHERE L.Periodo = ?
      ORDER BY L.Fecha ASC, L.Numdoc ASC
    `).all(periodoLimpio);

    res.json({ data: rows });
  } catch (err) {
    console.error('Error en reporte libro-ventas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener el Comprobante de Diario / Póliza
app.get('/api/reportes/comprobante-diario', (req, res) => {
  const { poliza } = req.query;

  try {
    const rows = req.db.prepare(`
      SELECT 
        C.Ncomp, 
        C.Fecha, 
        C.Linea, 
        C.Cuenta, 
        C.DebHab, 
        C.Valor, 
        C.Glosa,
        CTA.Nombre AS NombreCuenta
      FROM Cdiario C
      INNER JOIN Cuenta CTA ON C.Cuenta = CTA.Codigo
      WHERE C.Ncomp = ?
      ORDER BY C.Linea ASC
    `).all(poliza);

    res.json({ data: rows });
  } catch (err) {
    console.error('Error en comprobante diario:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- CONTABILIZACION DE COMPRAS Y VENTAS (ContabComp.frm) ---

// Consulta de Póliza (Solo Lectura, NO incrementa en BD)
app.get('/api/contab/siguiente-poliza', (req, res) => {
  const { periodo } = req.query;

  try {
    req.db.prepare(`
      CREATE TABLE IF NOT EXISTS Numpol (
        Periodo TEXT,
        Mes TEXT,
        Numero INTEGER,
        PRIMARY KEY (Periodo, Mes)
      )
    `).run();

    let row;

    if (!periodo || periodo.trim() === '') {
      row = req.db.prepare(`
        SELECT Periodo, Mes, Numero FROM Numpol ORDER BY Periodo DESC, Mes DESC LIMIT 1
      `).get();

      if (!row) {
        return res.status(404).json({ error: 'No existen pólizas registradas.' });
      }

      const numStr = row.Numero < 10 ? `0${row.Numero}` : `${row.Numero}`;
      return res.json({
        poliza: `${row.Mes}${numStr}`,
        periodo: `${row.Periodo}${row.Mes.substring(2, 4)}`,
        esUltima: true
      });
    }

    const periodoLimpio = periodo.replace(/-/g, '').trim();
    if (periodoLimpio.length < 6) {
      return res.status(400).json({ error: 'El período debe tener 6 dígitos (ej: 201601).' });
    }

    const anio = periodoLimpio.substring(0, 4);
    const mesCampo = periodoLimpio.substring(2, 6);

    row = req.db.prepare(`SELECT Numero FROM Numpol WHERE Periodo = ? AND Mes = ?`).get(anio, mesCampo);

    // Cada "Procesar" (Busca_pol en ContabComp.frm) genera una Póliza NUEVA
    // incrementando Numero en 1, así que la vista previa debe mostrar ese
    // próximo número, no el último ya usado.
    const numSiguiente = row ? row.Numero + 1 : 1;
    const numStr = numSiguiente < 10 ? `0${numSiguiente}` : `${numSiguiente}`;

    res.json({
      poliza: `${mesCampo}${numStr}`,
      periodo: periodoLimpio,
      existe: !!row
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Procesar Compras / Ventas (ContabComp.frm -> Grabar_Click + Busca_pol).
// Cada click en "Procesar" genera una Póliza NUEVA: incrementa en 1 el Numero
// de Numpol para ese Periodo/Mes (o lo crea en 1 si es el primero) y graba los
// asientos bajo ese Ncomp nuevo -- el original no reutiliza ni sobrescribe
// pólizas ya generadas, así que tampoco lo hacemos acá.
app.post('/api/contab/procesar-cv', (req, res) => {
  const { tipo, periodo } = req.body;

  if (!periodo || periodo.length < 6) {
    return res.status(400).json({ error: 'Período inválido.' });
  }

  const anio = periodo.substring(0, 4);
  const mesCampo = periodo.substring(2, 6);
  const mesDigito = periodo.substring(4, 6);
  const fechaContable = `28/${mesDigito}/${anio}`;

  try {
    asegurarColumnaExenLcompra(req.db);
    const procesarTransaccion = req.db.transaction(() => {
      let rowPol = req.db.prepare(`SELECT Numero FROM Numpol WHERE Periodo = ? AND Mes = ?`).get(anio, mesCampo);
      const siguienteNum = rowPol ? rowPol.Numero + 1 : 1;

      if (rowPol) {
        req.db.prepare(`UPDATE Numpol SET Numero = ? WHERE Periodo = ? AND Mes = ?`).run(siguienteNum, anio, mesCampo);
      } else {
        req.db.prepare(`INSERT INTO Numpol (Periodo, Mes, Numero) VALUES (?, ?, ?)`).run(anio, mesCampo, siguienteNum);
      }

      const numStr = siguienteNum < 10 ? `0${siguienteNum}` : `${siguienteNum}`;
      const ncomp = `${mesCampo}${numStr}`;

      const insertStmt = req.db.prepare(`
        INSERT INTO Cdiario (Ncomp, Fecha, Linea, Cuenta, DebHab, Valor, Glosa, Tdoc, Numdoc, Rut)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let lineasProcesadas = 0;

      if (tipo === 'compras') {
        const compras = req.db.prepare(`SELECT * FROM Lcompra WHERE Periodo = ? ORDER BY Numdoc`).all(periodo);

        if (compras.length === 0) throw new Error(`No hay registros de Compras para el período ${periodo}.`);

        let lineaCounter = 0;
        compras.forEach(r => {
          const isFA = r.Tdoc === 'FA' || r.Tdoc === '33';
          const dhNeto = isFA ? 'D' : 'C';
          const dhProv = isFA ? 'C' : 'D';
          const cuentaGasto = r.Cuenta || '0304';

          lineaCounter++;
          insertStmt.run(ncomp, fechaContable, lineaCounter, cuentaGasto, dhNeto, r.Neto, r.Glosa || 'NETO COMPRAS', '', '', '');
          lineaCounter++;
          insertStmt.run(ncomp, fechaContable, lineaCounter, '0115', dhNeto, r.Iva, r.Glosa || 'IVA COMPRAS', '', '', '');
          lineaCounter++;
          insertStmt.run(ncomp, fechaContable, lineaCounter, '0201', dhProv, r.Total, r.Glosa || 'PROVEEDORES', r.Tdoc, r.Numdoc, r.Rut);
        });

        lineasProcesadas = compras.length;

      } else if (tipo === 'ventas') {
        const ventas = req.db.prepare(`SELECT * FROM Lventa WHERE Periodo = ? ORDER BY Tdoc, Numdoc`).all(periodo);

        if (ventas.length === 0) throw new Error(`No hay registros de Ventas para el período ${periodo}.`);

        let lineaCounter = 0;
        ventas.forEach(r => {
          const isFA = r.Tdoc === 'FA' || r.Tdoc === '33';
          const dhNeto = isFA ? 'C' : 'D';
          const dhCli = isFA ? 'D' : 'C';

          lineaCounter++;
          insertStmt.run(ncomp, fechaContable, lineaCounter, '0401', dhNeto, r.Neto, 'Neto de Ventas', '', '', '');
          lineaCounter++;
          insertStmt.run(ncomp, fechaContable, lineaCounter, '0115', dhNeto, r.Iva, 'Iva de Ventas', '', '', '');
          lineaCounter++;
          insertStmt.run(ncomp, fechaContable, lineaCounter, '0110', dhCli, r.Total, 'Venta', r.Tdoc, r.Numdoc, r.Rut);
        });

        lineasProcesadas = ventas.length;
      }

      return { ncomp, lineasProcesadas };
    });

    const resultado = procesarTransaccion();

    res.json({
      message: `Contabilización completada. Póliza N° ${resultado.ncomp}`,
      poliza: resultado.ncomp,
      documentosProcesados: resultado.lineasProcesadas
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMPROBANTE DIARIO (ComprobanteDiario.frm) ---

// Generar o consultar correlativo de Póliza en Numpol para Comprobante Diario
app.post('/api/cdiario/generar-poliza', (req, res) => {
  const { fecha } = req.body; // YYYY-MM-DD
  if (!fecha) return res.status(400).json({ error: 'Fecha requerida.' });

  const anio = fecha.substring(0, 4);
  const aa = fecha.substring(2, 4);
  const mm = fecha.substring(5, 7);
  const mesCampo = `${aa}${mm}`;

  try {
    const procesar = req.db.transaction(() => {
      let row = req.db.prepare(`SELECT Numero FROM Numpol WHERE Periodo = ? AND Mes = ?`).get(anio, mesCampo);
      let siguienteNum = 1;

      if (row) {
        siguienteNum = row.Numero + 1;
        req.db.prepare(`UPDATE Numpol SET Numero = ? WHERE Periodo = ? AND Mes = ?`).run(siguienteNum, anio, mesCampo);
      } else {
        req.db.prepare(`INSERT INTO Numpol (Periodo, Mes, Numero) VALUES (?, ?, ?)`).run(anio, mesCampo, siguienteNum);
      }

      const numStr = siguienteNum < 10 ? `0${siguienteNum}` : `${siguienteNum}`;
      return `${mesCampo}${numStr}`;
    });

    const poliza = procesar();
    res.json({ poliza });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cargar estado de Póliza y sus líneas
app.get('/api/cdiario/poliza/:poliza', (req, res) => {
  try {
    const rows = req.db.prepare(`
      SELECT C.*, CTA.Nombre AS NombreCuenta
      FROM Cdiario C
      LEFT JOIN Cuenta CTA ON C.Cuenta = CTA.Codigo
      WHERE C.Ncomp = ?
      ORDER BY C.Linea ASC
    `).all(req.params.poliza);

    let suma = 0;
    rows.forEach(r => {
      if (r.DebHab === 'D') suma += r.Valor;
      else if (r.DebHab === 'C') suma -= r.Valor;
    });

    res.json({ data: rows, suma });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consultar documento en Lcompra o Lventa para autocompletar línea
app.get('/api/cdiario/buscar-documento', (req, res) => {
  const { cuenta, numdoc } = req.query;
  try {
    if (cuenta === '0110') {
      const doc = req.db.prepare(`
        SELECT L.*, C.Rsoc_cl AS RazonSocial 
        FROM Lventa L 
        LEFT JOIN Clientes C ON L.Rut = C.Rut_cl 
        WHERE L.Numdoc = ?
      `).get(numdoc);

      if (doc) {
        return res.json({
          encontrado: true,
          rut: doc.Rut,
          razonSocial: doc.RazonSocial,
          total: doc.Total,
          glosa: `Cancela F. ${numdoc}`
        });
      }
    } else if (cuenta === '0201') {
      const doc = req.db.prepare(`
        SELECT L.*, P.Rsoc AS RazonSocial 
        FROM Lcompra L 
        LEFT JOIN Provee P ON L.Rut = P.Rut 
        WHERE L.Numdoc = ?
      `).get(numdoc);

      if (doc) {
        return res.json({
          encontrado: true,
          rut: doc.Rut,
          razonSocial: doc.RazonSocial,
          total: doc.Total,
          glosa: `Cancela F. ${numdoc}`
        });
      }
    }

    res.json({ encontrado: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grabar / Actualizar Línea de Cdiario (UPSERT)
app.post('/api/cdiario/linea', (req, res) => {
  const { poliza, fecha, linea, cuenta, debHab, valor, tdoc, numdoc, rut, glosa } = req.body;

  if (!poliza || !linea || !cuenta || !debHab) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para grabar la línea.' });
  }

  // El formulario manda la fecha en ISO ('AAAA-MM-DD', del <input type="date">);
  // Cdiario.Fecha se guarda en texto 'DD/MM/AAAA' en todo el resto del sistema
  // (ver /api/contab/procesar-cv), así que se normaliza acá antes de grabar.
  const fechaDmy = isoADmy(fecha);

  try {
    const existe = req.db.prepare(`SELECT Linea FROM Cdiario WHERE Ncomp = ? AND Linea = ?`).get(poliza, linea);

    if (existe) {
      req.db.prepare(`
        UPDATE Cdiario
        SET Fecha = ?, Cuenta = ?, DebHab = ?, Valor = ?, Tdoc = ?, Numdoc = ?, Rut = ?, Glosa = ?
        WHERE Ncomp = ? AND Linea = ?
      `).run(fechaDmy, cuenta, debHab, valor || 0, tdoc || '', numdoc || '', rut || '', glosa || '', poliza, linea);
    } else {
      req.db.prepare(`
        INSERT INTO Cdiario (Ncomp, Fecha, Linea, Cuenta, DebHab, Valor, Tdoc, Numdoc, Rut, Glosa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(poliza, fechaDmy, linea, cuenta, debHab, valor || 0, tdoc || '', numdoc || '', rut || '', glosa || '');
    }

    res.json({ message: 'Línea grabada con éxito' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar Registro (Línea)
app.post('/api/cdiario/eliminar-linea', (req, res) => {
  const { poliza, linea } = req.body;
  try {
    req.db.prepare(`DELETE FROM Cdiario WHERE Ncomp = ? AND Linea = ?`).run(poliza, linea);
    res.json({ message: `Línea ${linea} eliminada.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar Póliza Completa
app.delete('/api/cdiario/poliza/:poliza', (req, res) => {
  try {
    req.db.prepare(`DELETE FROM Cdiario WHERE Ncomp = ?`).run(req.params.poliza);
    res.json({ message: `Póliza N° ${req.params.poliza} eliminada.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Carga masiva de líneas para una Póliza desde el CSV de Movimientos de Caja
// (Manten.frm -> pestaña Carga Movimientos Caja). A diferencia de
// /api/carga-sii/procesar, esto SUMA líneas a Cdiario -- la Póliza puede ya
// tener líneas grabadas antes (Comprobante Diario, u otra carga anterior).
app.post('/api/cdiario/carga-movimientos', (req, res) => {
  const { poliza, fecha, rows } = req.body;

  if (!poliza || !fecha) return res.status(400).json({ error: 'Falta la Póliza o la Fecha.' });
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'El archivo no contiene registros.' });

  try {
    const errores = [];
    const resueltas = rows.map((r, i) => {
      const numFila = i + 2; // +1 por el encabezado, +1 por índice 0-based
      const cuentaTexto = (r.cuentaNombre || '').trim();

      // La columna "Cuenta" del CSV puede traer el nombre o directamente el
      // código (a veces sin ceros a la izquierda, ej. "110" en vez de "0110",
      // típico cuando la celda quedó formateada como número en la planilla).
      let cuentaRow = null;
      if (/^\d+$/.test(cuentaTexto)) {
        cuentaRow = req.db.prepare(`SELECT Codigo FROM Cuenta WHERE Codigo = ?`).get(cuentaTexto.padStart(4, '0'))
          || req.db.prepare(`SELECT Codigo FROM Cuenta WHERE Codigo = ?`).get(cuentaTexto);
      }
      if (!cuentaRow) {
        cuentaRow = req.db.prepare(`SELECT Codigo FROM Cuenta WHERE UPPER(TRIM(Nombre)) = UPPER(TRIM(?))`).get(cuentaTexto);
      }

      if (!cuentaRow) {
        errores.push(`Fila ${numFila}: no se encontró la Cuenta "${cuentaTexto}" en el Plan de Cuentas.`);
        return null;
      }

      // Facturas: el Rut viene de la carga SII (Lcompra o Lventa), no del CSV
      // -- si el documento aún no está cargado ahí, se deja el Rut vacío y se
      // usa la Glosa del CSV como respaldo en vez de perderla.
      let rut = '';
      let glosa = r.glosa;

      if (r.tdoc === 'FA' && r.numdoc) {
        const doc = req.db.prepare(`SELECT Rut FROM Lcompra WHERE Numdoc = ?`).get(r.numdoc)
          || req.db.prepare(`SELECT Rut FROM Lventa WHERE Numdoc = ?`).get(r.numdoc);
        if (doc) {
          rut = doc.Rut;
          glosa = `Cancela F. ${r.numdoc}`;
        }
      }

      return { cuenta: cuentaRow.Codigo, debHab: r.debHab, valor: r.valor, glosa, tdoc: r.tdoc, numdoc: r.numdoc, rut };
    });

    if (errores.length > 0) {
      return res.status(400).json({ error: errores.join('\n') });
    }

    let siguienteLinea = req.db.prepare(`SELECT MAX(Linea) as maxLinea FROM Cdiario WHERE Ncomp = ?`).get(poliza).maxLinea || 0;

    const insertStmt = req.db.prepare(`
      INSERT INTO Cdiario (Ncomp, Fecha, Linea, Cuenta, DebHab, Valor, Glosa, Tdoc, Numdoc, Rut)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertarTransaccion = req.db.transaction(() => {
      resueltas.forEach((r) => {
        siguienteLinea += 1;
        insertStmt.run(poliza, fecha, siguienteLinea, r.cuenta, r.debHab, r.valor, r.glosa, r.tdoc, r.numdoc, r.rut);
      });
    });
    insertarTransaccion();

    res.json({
      message: `Se cargaron ${resueltas.length} línea(s) en la Póliza N° ${poliza}.`,
      insertadas: resueltas.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BALANCE DE 8 COLUMNAS (Balance.frm) ---

// 1. Procesar Asientos y Generar Tabla 'Balance'
app.post('/api/balance/procesar', (req, res) => {
  const { fecha } = req.body; // Espera 'YYYY-MM-DD'
  if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria.' });

  const anio = fecha.substring(0, 4);
  const mes = fecha.substring(5, 7);
  const periodo = `${anio}${mes}`;

  try {
    normalizarFechasCdiario(req.db);
    const procesarTransaccion = req.db.transaction(() => {
      // Borrar datos previos del mismo período (Sub Borrar en VB6)
      req.db.prepare(`DELETE FROM Balance WHERE Periodo = ?`).run(periodo);

      // Traer movimientos acumulados hasta la fecha seleccionada dentro del mismo año
      const movimientos = req.db.prepare(`
        SELECT Cuenta, DebHab, Valor
        FROM Cdiario
        WHERE ${FECHA_CDIARIO_AAAAMMDD} <= ? AND substr(Fecha,7,4) = ?
        ORDER BY Cuenta ASC
      `).all(isoAAaaammdd(fecha), anio);

      if (movimientos.length === 0) {
        return { totalCuentas: 0 };
      }

      // Acumular Débitos y Créditos por Cuenta en memoria
      const acumulado = {};
      movimientos.forEach(m => {
        const cta = (m.Cuenta || '').trim();
        if (!cta) return;

        if (!acumulado[cta]) {
          acumulado[cta] = { totDeb: 0, totHab: 0 };
        }

        if (m.DebHab === 'D') {
          acumulado[cta].totDeb += Number(m.Valor || 0);
        } else if (m.DebHab === 'C') {
          acumulado[cta].totHab += Number(m.Valor || 0);
        }
      });

      // Insertar en la tabla 'Balance' aplicando las reglas de clasificación de 8 columnas
      const insertStmt = req.db.prepare(`
        INSERT INTO Balance (
          Periodo, Cuenta, Debito, Credito, Sdeudor, Sacreedor, Activo, Pasivo, Perdida, Ganancia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let totalCuentas = 0;

      for (const [cta, datos] of Object.entries(acumulado)) {
        totalCuentas++;
        const totDeb = datos.totDeb;
        const totHab = datos.totHab;
        const saldo = totDeb - totHab;

        let sdeudor = 0;
        let sacreedor = 0;
        let activo = 0;
        let pasivo = 0;
        let perdida = 0;
        let ganancia = 0;

        // Regla de Saldos
        if (saldo > 0) {
          sdeudor = saldo;
        } else if (saldo < 0) {
          sacreedor = Math.abs(saldo);
        }

        // Clasificación de 8 Columnas según el segundo dígito de la cuenta (Mid(Cta_ant, 2, 1) en VB6)
        const segundoDigito = cta.length >= 2 ? cta.substring(1, 2) : '';

        if (saldo > 0) {
          if (segundoDigito === '1' || segundoDigito === '2') {
            activo = saldo;
          } else if (segundoDigito === '3' || segundoDigito === '4') {
            perdida = saldo;
          }
        } else if (saldo < 0) {
          const absSaldo = Math.abs(saldo);
          if (segundoDigito === '1' || segundoDigito === '2') {
            pasivo = absSaldo;
          } else if (segundoDigito === '3' || segundoDigito === '4') {
            ganancia = absSaldo;
          }
        }

        insertStmt.run(periodo, cta, totDeb, totHab, sdeudor, sacreedor, activo, pasivo, perdida, ganancia);
      }

      return { totalCuentas };
    });

    const resultado = procesarTransaccion();

    res.json({
      message: `Balance procesado con éxito. Se consolidaron ${resultado.totalCuentas} cuentas para el período ${periodo}.`,
      periodo,
      totalCuentas: resultado.totalCuentas
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Consultar Datos para el Reporte Modal de Balance (Uniendo con Cuenta e IEmpresa)
app.get('/api/balance/reporte', (req, res) => {
  const { periodo } = req.query;
  if (!periodo) return res.status(400).json({ error: 'El parámetro período es requerido.' });

  try {
    const rows = req.db.prepare(`
      SELECT B.*, CTA.Nombre AS NombreCuenta
      FROM Balance B
      LEFT JOIN Cuenta CTA ON B.Cuenta = CTA.Codigo
      WHERE B.Periodo = ?
      ORDER BY B.Cuenta ASC
    `).all(periodo);

    const empresa = req.db.prepare(`SELECT * FROM IEmpresa LIMIT 1`).get();

    res.json({
      data: rows,
      empresa: empresa || {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ESTADO DE RESULTADOS (Est_Resultado.frm) ---

// Procesar_Click: toma el Balance ya procesado del período y separa cada cuenta
// con Pérdida o Ganancia en la tabla de resultados de la empresa (Borrar + loop
// del .frm original). El nombre/esquema real de esa tabla difiere por empresa
// (ver comentarios en queries/querys_*.js) -- HRO/Parcela usan "Resultados" con
// columnas Ganancia/Perdida separadas, Ferroq usa "Est_resultado" con Tipo/Valor.
app.post('/api/estado-resultados/procesar', (req, res) => {
  const { periodo } = req.body;
  if (!periodo) return res.status(400).json({ error: 'El período es obligatorio.' });

  try {
    req.db.exec(req.queries.createResultadoTable);

    const procesar = req.db.transaction(() => {
      const balanceRows = req.db.prepare(`SELECT Cuenta, Perdida, Ganancia FROM Balance WHERE Periodo = ?`).all(periodo);
      if (balanceRows.length === 0) return null;

      req.db.prepare(req.queries.deleteResultado).run(periodo);

      balanceRows.forEach((b) => {
        let tipo = null;
        let valor = 0;
        if (b.Perdida > 0) { tipo = '02'; valor = b.Perdida; }
        else if (b.Ganancia > 0) { tipo = '01'; valor = b.Ganancia; }
        if (!tipo) return;

        const cuenta = req.db.prepare(`SELECT Nombre FROM Cuenta WHERE Codigo = ?`).get(b.Cuenta);

        const fila = { periodo, cuenta: b.Cuenta, tipo, valor, nombre: cuenta?.Nombre || '' };

        req.db.prepare(req.queries.saveResultadoFila).run(...req.queries.resultadoParamOrder.map(k => fila[k]));
      });

      return balanceRows.length;
    });

    if (procesar() === null) {
      return res.status(404).json({ error: `No hay Balance procesado para el período ${periodo}. Procesa el Balance primero.` });
    }
    res.json({ message: `Estado de Resultados del período ${periodo} procesado correctamente.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Imprimir (Est_resul.rpt): el reporte real (SQL provisto por el usuario) no
// filtra por Periodo en su consulta base -- probablemente dependía de una
// Selection Formula en tiempo de ejecución referenciando una fórmula "Periodo"
// que no existe en el .rpt (la misma causa del error "Invalid formula name" que
// se diagnosticó en el sistema viejo). Acá SÍ se filtra por Periodo, ya que
// mezclar todos los períodos juntos no es el comportamiento que se busca.
app.get('/api/reportes/estado-resultados', (req, res) => {
  const { periodo } = req.query;
  if (!periodo) return res.status(400).json({ error: 'Periodo es obligatorio.' });

  try {
    const rows = req.db.prepare(req.queries.getResultadoReporte).all(periodo);
    if (rows.length === 0) {
      return res.status(404).json({ error: `No hay Estado de Resultados procesado para el período ${periodo}. Haz clic en "Procesar" primero.` });
    }

    const empresa = req.db.prepare(`SELECT * FROM IEmpresa LIMIT 1`).get();
    res.json({ data: rows, empresa: empresa || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CONSULTAS CUENTAS CORRIENTES (Consultas.frm) ---

// Réplica de Option1_Click/Option2_Click: lista plana de movimientos de Cdiario
// para esa cuenta+rut. OJO: en el .frm original la línea que acumula el total
// de Credito está comentada ('Credito = Credito + rs!Valor), tanto para
// Proveedores como para Clientes -- es casi seguro un bug (cada línea sí
// muestra su Credito individual, pero el total de Credito de la fila de
// totales queda SIEMPRE en 0, y por lo tanto el Saldo final = Debito solo).
// Se respeta tal cual en vez de arreglarlo en silencio.
function listaPlanaCuentaCorriente(rows) {
  let debitoTotal = 0;
  const creditoTotal = 0; // nunca se acumula, igual que el .frm original

  const data = rows.map((r) => ({
    Tdoc: r.Tdoc,
    Numdoc: r.Numdoc,
    Fecha: r.Fecha,
    Debito: r.DebHab === 'D' ? r.Valor : 0,
    Credito: r.DebHab === 'C' ? r.Valor : 0
  }));

  rows.forEach((r) => {
    if (r.DebHab === 'D') debitoTotal += r.Valor;
  });

  return { data, totales: { debito: debitoTotal, credito: creditoTotal, saldo: debitoTotal - creditoTotal } };
}

// Réplica de Option3_Click/Llena_grilla ("Analisis Provee"): agrupa movimientos
// consecutivos (tras ordenar solo por Numdoc) por documento; cuando cambia el
// Numdoc, si el saldo neto del documento recién cerrado no dio exactamente 0
// (osea, no quedó completamente cancelado), lo agrega a la grilla con el saldo
// corrido acumulado hasta ese punto. Los documentos que sí netean a 0 se omiten.
function analisisProveedor(rows) {
  const data = [];
  let debitoTotal = 0;
  let creditoTotal = 0;
  let saldo = 0;
  let docant = null;
  let fecant = null;

  const flush = () => {
    const fila = { Numdoc: docant, Fecha: fecant, Debito: 0, Credito: 0 };
    if (saldo > 0) {
      fila.Debito = saldo;
      debitoTotal += saldo;
    } else {
      fila.Credito = saldo; // se deja en negativo, igual que el .frm original
      creditoTotal += saldo * -1;
    }
    fila.Saldo = debitoTotal - creditoTotal;
    data.push(fila);
  };

  rows.forEach((r, i) => {
    const delta = r.DebHab === 'D' ? r.Valor : -r.Valor;
    if (i === 0) {
      saldo += delta;
    } else if (r.Numdoc === docant) {
      saldo += delta;
    } else if (saldo !== 0) {
      flush();
      saldo = delta;
    } else {
      saldo += delta;
    }
    docant = r.Numdoc;
    fecant = r.Fecha;
  });
  if (saldo !== 0) flush();

  return { data, totales: { debito: debitoTotal, credito: creditoTotal, saldo: debitoTotal - creditoTotal } };
}

app.get('/api/consultas/cuenta-corriente', (req, res) => {
  const { modo, rut } = req.query;
  if (!rut) return res.status(400).json({ error: 'Selecciona un Proveedor/Cliente.' });

  try {
    let resultado;

    if (modo === 'clientes') {
      const rows = req.db.prepare(`
        SELECT Tdoc, Numdoc, Fecha, DebHab, Valor FROM Cdiario WHERE Cuenta = '0110' AND Rut = ? ORDER BY Fecha
      `).all(rut);
      resultado = listaPlanaCuentaCorriente(rows);
    } else if (modo === 'analisisProvee') {
      const rows = req.db.prepare(`
        SELECT Numdoc, Fecha, DebHab, Valor FROM Cdiario WHERE Cuenta = '0201' AND Rut = ? ORDER BY Numdoc
      `).all(rut);
      resultado = analisisProveedor(rows);
    } else {
      const rows = req.db.prepare(`
        SELECT Tdoc, Numdoc, Fecha, DebHab, Valor FROM Cdiario WHERE Cuenta = '0201' AND Rut = ? ORDER BY Numdoc, Fecha
      `).all(rut);
      resultado = listaPlanaCuentaCorriente(rows);
    }

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ANALISIS CLIENTES Y PROVEEDORES (Analisis.frm) ---
// Option4/Option5 (Boletas/Cheques) y Label3/Label4 del .frm original quedan
// fuera: esos controles nunca se llegaron a declarar en el formulario (sólo
// Option1 "Clientes" y Option2 "Proveedores" existen), es código muerto de una
// versión anterior -- igual que el "Tab 2" de Formularios SII.

const TABLA_CTA_CTE = { clientes: 'CtaCte_cli', proveedores: 'CtaCte_provee' };
const CUENTA_CTA_CTE = { clientes: '0110', proveedores: '0201' };

function asegurarCtaCteTabla(db, tabla) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${tabla} (
      Rut TEXT NOT NULL, Tdoc TEXT NOT NULL, Numdoc TEXT NOT NULL, Fecha TEXT NOT NULL, DebHab TEXT NOT NULL, Valor REAL,
      PRIMARY KEY (Rut, Tdoc, Numdoc, DebHab, Fecha)
    )
  `);
}

// Procesar_Click: copia los movimientos de Cdiario del rango de fechas a la
// tabla de staging (CtaCte_cli/CtaCte_provee). El .frm original usa
// "On Error Resume Next" antes de cada inserción para saltarse en silencio los
// movimientos que ya estaban cargados (choca con la llave primaria de la
// tabla) si Procesar se ejecuta más de una vez sobre el mismo rango -- se
// replica con un try/catch por fila en vez de una constraint SQL, porque el
// esquema real de la llave primaria difiere entre empresas (Parcela ni
// siquiera tiene una, así que ahí nunca se salta nada, igual que en el original).
app.post('/api/analisis-ctas-ctes/procesar', (req, res) => {
  const { modo, desde, hasta } = req.body;
  if (!desde || !hasta) return res.status(400).json({ error: 'Selecciona el rango de fechas (Desde/Hasta).' });

  const tabla = TABLA_CTA_CTE[modo];
  const cuenta = CUENTA_CTA_CTE[modo];
  if (!tabla) return res.status(400).json({ error: 'Selecciona Clientes o Proveedores.' });

  try {
    asegurarCtaCteTabla(req.db, tabla);
    normalizarFechasCdiario(req.db);

    const movimientos = req.db.prepare(`
      SELECT Rut, Tdoc, Numdoc, DebHab, Fecha, Valor FROM Cdiario
      WHERE Cuenta = ? AND ${FECHA_CDIARIO_AAAAMMDD} BETWEEN ? AND ? AND Glosa <> 'APERTURA'
    `).all(cuenta, isoAAaaammdd(desde), isoAAaaammdd(hasta));

    const insertar = req.db.prepare(`INSERT INTO ${tabla} (Rut, Tdoc, Numdoc, Fecha, DebHab, Valor) VALUES (?, ?, ?, ?, ?, ?)`);

    let insertados = 0;
    let omitidos = 0;
    const procesar = req.db.transaction(() => {
      movimientos.forEach((m) => {
        try {
          insertar.run(m.Rut, m.Tdoc, m.Numdoc, m.Fecha, m.DebHab, m.Valor);
          insertados++;
        } catch (err) {
          omitidos++;
        }
      });
    });
    procesar();

    const detalleOmitidos = omitidos > 0 ? ` (${omitidos} ya estaban cargados y se omitieron)` : '';
    res.json({ message: `${insertados} movimiento(s) agregados${detalleOmitidos}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analizar_Click: agrupa movimientos consecutivos (tras ordenar por Rut,
// Numdoc) por documento y consolida cada grupo -- si el saldo neto del
// documento da exactamente 0, borra sus filas (Anula_reg); si no, las
// reemplaza por una sola fila con el saldo neto (Revisa_saldo_cli/pr).
// OJO: sólo la rama de Clientes revisa si el saldo llegó a 0 A MITAD de un
// grupo (mientras se siguen sumando filas del mismo Numdoc) y lo anula ahí
// mismo; Proveedores no tiene ese chequeo intermedio -- se respeta la
// diferencia tal cual, no parece intencional pero así está en el .frm.
// TAMBIÉN: si el ÚLTIMO documento de la lista no dio exactamente 0, se queda
// sin consolidar (el .frm original sólo cierra el último grupo cuando es 0),
// a diferencia de Consultas.frm que sí cierra cualquier grupo final no-cero.
function analizarCtaCte(db, tabla, revisarCeroEnGrupo) {
  const rows = db.prepare(`SELECT Rut, Tdoc, Numdoc, DebHab, Fecha, Valor FROM ${tabla} ORDER BY Rut, Numdoc`).all();
  if (rows.length === 0) return { anulados: 0, consolidados: 0 };

  const deleteNumdoc = db.prepare(`DELETE FROM ${tabla} WHERE Numdoc = ?`);
  const deleteNumdocRut = db.prepare(`DELETE FROM ${tabla} WHERE Numdoc = ? AND Rut = ?`);
  const insertConsolidado = db.prepare(`INSERT INTO ${tabla} (Rut, Tdoc, Numdoc, Fecha, DebHab, Valor) VALUES (?, ?, ?, ?, ?, ?)`);

  let saldo = 0;
  let docant = null;
  let rutant = null;
  let fecant = null;
  let anulados = 0;
  let consolidados = 0;

  const anulaReg = (numdoc) => {
    deleteNumdoc.run(numdoc);
    anulados++;
  };

  const revisaSaldo = (rut, numdoc, fecha, saldoActual) => {
    deleteNumdocRut.run(numdoc, rut);
    if (saldoActual > 0) {
      insertConsolidado.run(rut, 'FA', numdoc, fecha, 'D', saldoActual);
    } else {
      insertConsolidado.run(rut, 'FA', numdoc, fecha, 'C', saldoActual * -1);
    }
    consolidados++;
  };

  rows.forEach((r, i) => {
    const delta = r.DebHab === 'D' ? r.Valor : -r.Valor;
    if (i === 0) {
      saldo += delta;
    } else if (r.Numdoc === docant) {
      saldo += delta;
      if (revisarCeroEnGrupo && saldo === 0) anulaReg(docant);
    } else if (saldo === 0) {
      anulaReg(docant);
      saldo = delta;
    } else {
      revisaSaldo(rutant, docant, fecant, saldo);
      saldo = delta;
    }
    docant = r.Numdoc;
    rutant = r.Rut;
    fecant = r.Fecha;
  });

  if (saldo === 0) anulaReg(docant);

  return { anulados, consolidados };
}

app.post('/api/analisis-ctas-ctes/analizar', (req, res) => {
  const { modo } = req.body;
  const tabla = TABLA_CTA_CTE[modo];
  if (!tabla) return res.status(400).json({ error: 'Selecciona Clientes o Proveedores.' });

  try {
    asegurarCtaCteTabla(req.db, tabla);
    const analizar = req.db.transaction(() => analizarCtaCte(req.db, tabla, modo === 'clientes'));
    const { anulados, consolidados } = analizar();
    res.json({ message: `Análisis completado: ${anulados} documento(s) cancelado(s) por completo, ${consolidados} consolidado(s) con saldo pendiente.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Imprimir (Ana_clt.rpt): réplica literal del SQL de Crystal Report entregado
// (CtaCte_cli INNER JOIN Clientes). OJO: ese SQL no filtra por Periodo -- muestra
// TODO el contenido actual de CtaCte_cli tal cual esté (post Procesar/Analizar);
// el "Período" que aparece en el título del reporte es sólo una etiqueta que el
// .frm arma a partir de la fecha "Desde" ingresada, no un filtro real.
app.get('/api/reportes/analisis-clientes', (req, res) => {
  try {
    const rows = req.db.prepare(`
      SELECT CtaCte_cli.Rut, CtaCte_cli.Tdoc, CtaCte_cli.Numdoc, CtaCte_cli.DebHab, CtaCte_cli.Valor,
             Clientes.Rsoc_cl AS RazonSocial
      FROM CtaCte_cli
      INNER JOIN Clientes ON CtaCte_cli.Rut = Clientes.Rut_cl
      ORDER BY CtaCte_cli.Tdoc ASC
    `).all();

    const data = rows.map((r) => ({
      Rut: r.Rut,
      RazonSocial: r.RazonSocial,
      Tdoc: r.Tdoc,
      Numdoc: r.Numdoc,
      Debito: r.DebHab === 'D' ? r.Valor : 0,
      Credito: r.DebHab === 'C' ? r.Valor : 0
    }));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Imprimir (Ana_pro.rpt): el SQL de Crystal Report entregado apunta a una
// tabla "CtaCte_pro" (no "CtaCte_provee"). El .frm original usa "CtaCte_provee"
// consistentemente en Procesar_Click/Analizar_Click/Revisa_saldo_pr/Anula_reg,
// y esa es también la tabla real que ya existe con datos en Ferroq -- se
// mantiene "CtaCte_provee" acá también, para que Procesar -> Analizar ->
// Imprimir sea un mismo pipeline coherente en vez de leer de una tabla
// distinta a la que se graba. Probablemente "CtaCte_pro" sea un nombre
// desactualizado en el .rpt (mismo tipo de desfase que Resultados.rpt vs
// Est_resul.rpt) -- avisar si en realidad son tablas distintas.
app.get('/api/reportes/analisis-proveedores', (req, res) => {
  try {
    const rows = req.db.prepare(`
      SELECT CtaCte_provee.Rut, CtaCte_provee.Tdoc, CtaCte_provee.Numdoc, CtaCte_provee.DebHab, CtaCte_provee.Fecha, CtaCte_provee.Valor,
             Provee.Rsoc AS RazonSocial
      FROM CtaCte_provee
      INNER JOIN Provee ON CtaCte_provee.Rut = Provee.Rut
      ORDER BY CtaCte_provee.Rut ASC, CtaCte_provee.Numdoc ASC
    `).all();

    const data = rows.map((r) => ({
      Rut: r.Rut,
      RazonSocial: r.RazonSocial,
      Tdoc: r.Tdoc,
      Numdoc: r.Numdoc,
      Fecha: r.Fecha,
      Debito: r.DebHab === 'D' ? r.Valor : 0,
      Credito: r.DebHab === 'C' ? r.Valor : 0
    }));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- FORMULARIOS SII (Hojas.frm) ---
// "Tab 2" del .frm original está vacío (0 controles) -- se omite, es un
// residuo de desarrollo sin terminar, no un tab real.

// Asegura que exista la tabla contadora "Hojas" (Rut, Folio -- el .frm original
// también guarda ahí datos de la empresa emisora, pero esos campos no se usan
// en Procesar_Click, sólo Rut/Folio). HRO no tenía esta tabla en el export
// (Ferroq/Parcela sí, con más columnas) -- si falta, se crea y se siembra el
// Folio a partir del máximo ya usado en Hojas_s (para continuar la numeración
// real en vez de reiniciarla en 0).
function asegurarHojas(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS Hojas (Rut TEXT, Folio INTEGER)`);
  db.exec(`CREATE TABLE IF NOT EXISTS Hojas_s (Rut TEXT NOT NULL, Folio INTEGER NOT NULL, PRIMARY KEY (Rut, Folio))`);

  let row = db.prepare(`SELECT Rut, Folio FROM Hojas LIMIT 1`).get();
  if (!row) {
    const maxFolio = db.prepare(`SELECT MAX(Folio) AS m FROM Hojas_s`).get();
    const empresa = db.prepare(`SELECT Rut FROM IEmpresa LIMIT 1`).get();
    const folioInicial = maxFolio?.m || 0;
    const rutEmisor = (empresa?.Rut || '').replace(/\./g, '');
    db.prepare(`INSERT INTO Hojas (Rut, Folio) VALUES (?, ?)`).run(rutEmisor, folioInicial);
    row = { Rut: rutEmisor, Folio: folioInicial };
  }
  return row;
}

// Form_Load: precarga el "Folio Inicial" con el próximo folio disponible.
app.get('/api/formularios/hojas-sueltas/info', (req, res) => {
  try {
    const hojas = asegurarHojas(req.db);
    res.json({ folioInicial: hojas.Folio + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Procesar_Click (Tab "Hojas Sueltas"). OJO: en el .frm original, el rango
// Folio Inicial/Folio Final sólo determina la CANTIDAD de folios a generar
// (Text2 - Text1 + 1) -- los valores de Folio realmente grabados siempre
// arrancan del contador persistido en "Hojas" (rs!Folio + 1), no de lo que el
// usuario haya escrito en Folio Inicial. En uso normal ambos coinciden (Folio
// Inicial viene precargado igual al contador), pero si se edita a mano quedan
// desincronizados -- se respeta ese comportamiento tal cual.
app.post('/api/formularios/hojas-sueltas/procesar', (req, res) => {
  const { folioInicial, folioFinal } = req.body;
  const cantidad = Number(folioFinal) - Number(folioInicial) + 1;
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return res.status(400).json({ error: 'El Folio Final debe ser mayor o igual al Folio Inicial.' });
  }

  try {
    const procesar = req.db.transaction(() => {
      const hojas = asegurarHojas(req.db);
      let folio = hojas.Folio;
      for (let i = 0; i < cantidad; i++) {
        folio += 1;
        req.db.prepare(`INSERT INTO Hojas_s (Rut, Folio) VALUES (?, ?)`).run(hojas.Rut, folio);
      }
      req.db.prepare(`UPDATE Hojas SET Folio = ?`).run(folio);
      return folio;
    });

    const folioFinalReal = procesar();
    res.json({ message: `${cantidad} Hoja(s) Suelta(s) generada(s), hasta el folio ${folioFinalReal}.`, folioFinal: folioFinalReal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Procesar_Click (Tab "Libro Sueldos"): reconstruye el Libro de Remuneraciones
// (formato SII) para el período a partir de las liquidaciones ya grabadas.
app.post('/api/formularios/libro-sueldos/procesar', (req, res) => {
  const { periodo } = req.body;
  if (!periodo) return res.status(400).json({ error: 'El período es obligatorio.' });

  try {
    req.db.exec(req.queries.createLibroSueTable);

    const procesar = req.db.transaction(() => {
      const liqRows = req.db.prepare(req.queries.getLiqSuelPorPeriodo).all(periodo);
      if (liqRows.length === 0) return null;

      liqRows.forEach((r) => {
        const p = req.db.prepare(req.queries.getMaeperPorRut).get(r.rut);
        const noImponi = (r.movilizacion || 0) + (r.colacion || 0);

        let adicSue;
        let imponi;
        if (String(p?.tipoSueldo || '').trim() === 'UF') {
          adicSue = r.comisiones || 0;
          imponi = r.imponible || 0;
        } else {
          adicSue = 0;
          imponi = (r.imponible || 0) + (r.comisiones || 0);
        }

        const lsoc = (r.afpDescuento || 0) + (r.saludDescuento || 0) + (r.diferenciaIsapre || 0) + (r.cesTrabajador || 0);
        const habTrib = imponi + adicSue - lsoc;

        const fila = {
          periodo, rut: r.rut, imponi, noImponi, adicSue, habTrib, lsoc,
          iut: r.iut || 0, liquido: r.liquido || 0
        };
        req.db.prepare(req.queries.saveLibroSue).run(...req.queries.libroSueParamOrder.map(k => fila[k]));
      });

      return liqRows.length;
    });

    const cantidad = procesar();
    if (cantidad === null) {
      return res.status(404).json({ error: `No hay liquidaciones grabadas para el período ${periodo}.` });
    }
    res.json({ message: `Libro de Sueldos del período ${periodo} procesado (${cantidad} trabajador(es)).` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LIBROS DIARIO Y MAYOR (Lmayor.frm) ---

// Procesar Libro Mayor: "general" (todas las cuentas) o "cuenta" (Por Cuenta y Periodo)
app.post('/api/lmayor/procesar', (req, res) => {
  const { modo, desde, hasta, cuenta } = req.body;

  if (!desde || !hasta) return res.status(400).json({ error: 'Debe indicar fecha Desde y Hasta.' });
  if (modo === 'cuenta' && !cuenta) return res.status(400).json({ error: 'Debe seleccionar una Cuenta.' });

  const anio = desde.substring(0, 4);
  const desdeNum = isoAAaaammdd(desde);
  const hastaNum = isoAAaaammdd(hasta);

  try {
    normalizarFechasCdiario(req.db);
    const procesarTransaccion = req.db.transaction(() => {
      // Sub Borrar (VB6): se limpia toda la tabla antes de recalcular
      req.db.prepare(`DELETE FROM Lmayor`).run();

      const insertStmt = req.db.prepare(`
        INSERT INTO Lmayor (Cuenta, Npol, Linea, Fecha, Debe, Haber, Saldo, Glosa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let totalLineas = 0;

      const insertarSaldoAnterior = (ctaCodigo, debito, credito) => {
        const saldo = debito - credito;
        insertStmt.run(
          ctaCodigo, '', 0, isoADmy(desde),
          saldo > 0 ? saldo : 0,
          saldo < 0 ? Math.abs(saldo) : 0,
          saldo,
          'SALDO ANTERIOR'
        );
        totalLineas++;
      };

      if (modo === 'cuenta') {
        // Saldo Anterior: movimientos de la cuenta seleccionada antes de "Desde", dentro del mismo año
        const previos = req.db.prepare(`
          SELECT DebHab, Valor FROM Cdiario
          WHERE Cuenta = ? AND ${FECHA_CDIARIO_AAAAMMDD} < ? AND substr(Fecha,7,4) = ?
        `).all(cuenta, desdeNum, anio);

        let debito = 0, credito = 0;
        previos.forEach(m => {
          if (m.DebHab === 'D') debito += Number(m.Valor || 0);
          else credito += Number(m.Valor || 0);
        });

        // Siempre se deja una línea de saldo anterior (aunque sea 0), igual que Option2 en VB6
        insertarSaldoAnterior(cuenta, debito, credito);

        // Movimiento del período
        const movimientos = req.db.prepare(`
          SELECT Ncomp, Linea, Fecha, DebHab, Valor, Glosa FROM Cdiario
          WHERE Cuenta = ? AND ${FECHA_CDIARIO_AAAAMMDD} BETWEEN ? AND ?
          ORDER BY ${FECHA_CDIARIO_AAAAMMDD} ASC
        `).all(cuenta, desdeNum, hastaNum);

        movimientos.forEach(m => {
          const debe = m.DebHab === 'D' ? Number(m.Valor || 0) : 0;
          const haber = m.DebHab === 'D' ? 0 : Number(m.Valor || 0);
          insertStmt.run(cuenta, m.Ncomp, m.Linea, m.Fecha, debe, haber, debe - haber, m.Glosa || '');
          totalLineas++;
        });

      } else {
        // General: todas las cuentas. Saldo Anterior solo para cuentas con movimiento previo
        // (a diferencia del VB6 original, que en este modo podía dejar una línea fantasma con
        // cuenta vacía si no había ningún movimiento previo; acá se omite directamente).
        const previos = req.db.prepare(`
          SELECT Cuenta, DebHab, Valor FROM Cdiario
          WHERE ${FECHA_CDIARIO_AAAAMMDD} < ? AND substr(Fecha,7,4) = ?
          ORDER BY Cuenta ASC
        `).all(desdeNum, anio);

        const acumulado = {};
        previos.forEach(m => {
          const cta = (m.Cuenta || '').trim();
          if (!cta) return;
          if (!acumulado[cta]) acumulado[cta] = { debito: 0, credito: 0 };
          if (m.DebHab === 'D') acumulado[cta].debito += Number(m.Valor || 0);
          else acumulado[cta].credito += Number(m.Valor || 0);
        });

        for (const [cta, { debito, credito }] of Object.entries(acumulado)) {
          insertarSaldoAnterior(cta, debito, credito);
        }

        const movimientos = req.db.prepare(`
          SELECT Cuenta, Ncomp, Linea, Fecha, DebHab, Valor, Glosa FROM Cdiario
          WHERE ${FECHA_CDIARIO_AAAAMMDD} BETWEEN ? AND ?
          ORDER BY Cuenta ASC, Ncomp ASC, Linea ASC
        `).all(desdeNum, hastaNum);

        movimientos.forEach(m => {
          const debe = m.DebHab === 'D' ? Number(m.Valor || 0) : 0;
          const haber = m.DebHab === 'D' ? 0 : Number(m.Valor || 0);
          insertStmt.run(m.Cuenta, m.Ncomp, m.Linea, m.Fecha, debe, haber, debe - haber, m.Glosa || '');
          totalLineas++;
        });
      }

      return totalLineas;
    });

    const totalLineas = procesarTransaccion();

    res.json({
      message: `Libro Mayor procesado con éxito. Se generaron ${totalLineas} líneas.`,
      totalLineas
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Procesar Libro Diario: todos los movimientos de Cdiario entre Desde y Hasta.
// El INSERT y el orden de columnas salen de req.queries porque Ldiario NO tiene
// el mismo esquema en las 3 empresas (ver queries/querys_*.js).
app.post('/api/ldiario/procesar', (req, res) => {
  const { desde, hasta } = req.body;
  if (!desde || !hasta) return res.status(400).json({ error: 'Debe indicar fecha Desde y Hasta.' });

  try {
    normalizarFechasCdiario(req.db);
    const movimientos = req.db.prepare(`
      SELECT Ncomp, Linea, Fecha, Cuenta, DebHab, Valor, Glosa FROM Cdiario
      WHERE ${FECHA_CDIARIO_AAAAMMDD} BETWEEN ? AND ?
      ORDER BY Ncomp ASC, Linea ASC
    `).all(isoAAaaammdd(desde), isoAAaaammdd(hasta));

    const procesarTransaccion = req.db.transaction(() => {
      req.db.exec(req.queries.deleteLdiario);
      const insertStmt = req.db.prepare(req.queries.saveLdiarioLinea);

      movimientos.forEach(m => {
        const debe = m.DebHab === 'D' ? Number(m.Valor || 0) : 0;
        const haber = m.DebHab === 'D' ? 0 : Number(m.Valor || 0);
        const fila = {
          ncomp: m.Ncomp,
          linea: m.Linea,
          fecha: m.Fecha,
          cuenta: m.Cuenta,
          debe,
          haber,
          saldo: debe - haber,
          glosa: m.Glosa || ''
        };
        insertStmt.run(...req.queries.ldiarioParamOrder.map(k => fila[k]));
      });
    });

    procesarTransaccion();

    res.json({
      message: `Libro Diario procesado con éxito. Se generaron ${movimientos.length} líneas.`,
      totalLineas: movimientos.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reporte del Libro Mayor ya procesado (uniendo con Cuenta para el Nombre)
app.get('/api/lmayor/reporte', (req, res) => {
  try {
    const rows = req.db.prepare(`
      SELECT L.*, CTA.Nombre AS NombreCuenta
      FROM Lmayor L
      LEFT JOIN Cuenta CTA ON L.Cuenta = CTA.Codigo
      ORDER BY L.Cuenta ASC, L.Fecha ASC, L.Linea ASC
    `).all();

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reporte del Libro Diario ya procesado. El SELECT sale de req.queries porque
// Ldiario no tiene el mismo esquema en las 3 empresas (ver queries/querys_*.js).
app.get('/api/ldiario/reporte', (req, res) => {
  try {
    const rows = req.db.prepare(req.queries.getLdiarioReporte).all();
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ARRANQUE DEL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Backend contable ejecutándose en http://localhost:${PORT}`);
});