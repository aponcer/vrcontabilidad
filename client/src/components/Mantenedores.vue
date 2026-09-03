<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import ReporteLibroComprasModal from './ReporteLibroComprasModal.vue'
import ReportePolizaModal from './ReportePolizaModal.vue'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

// Estado del formulario de Clientes
const clienteForm = ref({ rut: '', razonSocial: '' })

// Estado del formulario de Proveedores
const proveedorForm = ref({ rut: '', razonSocial: '', cuenta1: '' })
const cuentasList = ref([]) // Cuenta = { codigo, nombre, tipo }, para el selector de Proveedores

// Estado del formulario de Cuentas
const cuentaForm = ref({ codigo: '', nombre: '', tipo: '' })

// Estado del formulario de Comprobantes
const comprobanteForm = ref({ ejercicio: '' })

// Grilla inferior genérica (F3 = listar todo, Revisa Cuenta = pendientes de registrar)
const gridRows = ref([]) // { rut, razonSocial, numdoc, total }

// Valida un Rut chileno con dígito verificador (equivalente a fValidaRut en VB6)
const validarRut = (rutCompleto) => {
  const rut = rutCompleto.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()
  if (rut.length < 2) return false

  const cuerpo = rut.slice(0, -1)
  const dv = rut.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false

  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === dvEsperado
}

// Estado del formulario de Carga Archivos SII
const cargaSiiForm = ref({ tipo: 'compras' })
const fileInputRef = ref(null)
const archivoSeleccionado = ref(null)
const cargaSiiRows = ref([])

// Barra de estado / progreso, compartida por Grabar (pestañas generales) y
// Procesar (Carga Archivos SII)
const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

// Estado del modal "Revisar Libro Actual"
const showLibroModal = ref(false)
const libroReportData = ref([])

// Nombres de columna que puede traer el CSV del SII para cada campo de Compras/Ventas.
// "Rut cliente" aplica a Ventas; se dejan alias razonables por si Compras usa "Rut Proveedor".
const CARGA_SII_ALIASES = {
  Tdoc: ['Tipo Doc'],
  Numdoc: ['Folio'],
  Fecha: ['Fecha Docto'],
  Rut: ['Rut cliente', 'Rut Cliente', 'RUT Proveedor', 'Rut Proveedor', 'Rut'],
  Rsoc: ['Razon Social', 'Razón Social'],
  Neto: ['Monto Neto'],
  Exen: ['Monto Exento'],
  Iva: ['Monto IVA Recuperable', 'Monto IVA'],
  Total: ['Monto total', 'Monto Total']
}

// Sólo se exigen para Compras: el "Monto Total" del RCV del SII viene mal
// calculado en algunas filas ahí (Neto+IVA no da el Total declarado), así que
// para Compras se ignora esa columna y se recalcula -- ver parseCsvSii.
const CARGA_SII_ALIASES_COMPRAS = {
  OtroImpCodigo: ['Codigo Otro Impuesto', 'Código Otro Impuesto'],
  OtroImpValor: ['Valor Otro Impuesto']
}

// Convierte "DD/MM/AAAA" (formato del SII) a "AAAA-MM-DD" (formato usado en toda la app)
const fechaSiiAIso = (fecha) => {
  const partes = fecha.split('/')
  if (partes.length !== 3) return fecha
  const [d, m, y] = partes
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const parseCsvSii = (texto, tipo) => {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lineas.length < 2) return []

  const esCompras = tipo === 'compras'

  const headers = lineas[0].split(';').map(h => h.trim())
  const buscarIndice = (alias) => {
    for (const nombre of alias) {
      const i = headers.findIndex(h => h.toLowerCase() === nombre.toLowerCase())
      if (i !== -1) return i
    }
    return -1
  }

  const aliasesAUsar = esCompras
    ? { ...CARGA_SII_ALIASES, ...CARGA_SII_ALIASES_COMPRAS }
    : CARGA_SII_ALIASES

  const idx = Object.fromEntries(
    Object.entries(aliasesAUsar).map(([campo, alias]) => [campo, buscarIndice(alias)])
  )

  const faltantes = Object.entries(idx).filter(([, i]) => i === -1).map(([campo]) => campo)
  if (faltantes.length > 0) {
    throw new Error(`No se encontraron en el CSV las columnas para: ${faltantes.join(', ')}.`)
  }

  return lineas.slice(1).map(linea => {
    const cols = linea.split(';')

    const tdocCsv = (cols[idx.Tdoc] || '').trim()
    const iva = Number(cols[idx.Iva]) || 0
    const total = Number(cols[idx.Total]) || 0
    const netoCsv = Number(cols[idx.Neto]) || 0
    const exenCsv = Number(cols[idx.Exen]) || 0

    let neto = netoCsv
    let exen = exenCsv
    let totalFinal = total

    if (esCompras) {
      const otroImpCodigo = (cols[idx.OtroImpCodigo] || '').trim()
      const otroImpValor = Number(cols[idx.OtroImpValor]) || 0
      const esMarcaDeNetoRoto = otroImpValor === 1 && otroImpCodigo === '28'

      if (tdocCsv === '34') {
        // Tipo Doc 34 (Factura Exenta): el archivo no trae Neto/Exento/IVA
        // para estas filas (llegan en 0), solo el Monto Total. Se repite el
        // Total en el Neto para no perder el monto (el Tdoc de igual forma
        // pasa a "33" abajo, como todos los no-61).
        neto = total
        exen = 0
        totalFinal = total
      } else if (esMarcaDeNetoRoto) {
        // Código 28 / Valor 1: acá el "Monto Neto" del archivo viene mal
        // calculado. El Monto Total y el Monto IVA Recuperable sí vienen
        // correctos, así que el Neto se recalcula como Total - IVA.
        neto = total - iva
        exen = exenCsv
        totalFinal = total
      } else {
        // El "Monto Total" del RCV de Compras viene mal calculado en otras
        // filas (no siempre Neto+IVA+Exento cuadra con lo declarado), así que
        // se ignora y se recalcula. Si viene "Valor Otro Impuesto" se suma a
        // Exento.
        neto = netoCsv
        exen = exenCsv + otroImpValor
        totalFinal = exen + neto + iva
      }
    } else {
      // Si no viene IVA (documentos exentos, ej. Tdoc 34), el Neto pasa a ser el
      // Total de la línea en vez del "Monto Neto" del CSV (que llega en 0), para
      // no perder el monto en Ventas, donde el proceso posterior no suma Exen.
      neto = iva === 0 ? total : netoCsv
    }

    return {
      // El tipo de documento siempre se guarda como "33", salvo Notas de Crédito ("61")
      Tdoc: tdocCsv === '61' ? '61' : '33',
      Numdoc: (cols[idx.Numdoc] || '').trim(),
      Fecha: fechaSiiAIso((cols[idx.Fecha] || '').trim()),
      Rut: (cols[idx.Rut] || '').trim(),
      Rsoc: (cols[idx.Rsoc] || '').trim(),
      Neto: neto,
      Exen: exen,
      Iva: iva,
      Total: totalFinal
    }
  })
}

// --- Parseo del CSV de Movimientos de Caja (Carga Movimientos Caja) ---

// El "Documento" del CSV se traduce al mismo Tdoc que usa el select de
// Comprobante Diario; "Boleta" y vacío quedan sin Tdoc porque esa lista no
// tiene una opción para Boleta.
const DOCUMENTO_A_TDOC = {
  FACTURA: 'FA',
  NCREDITO: 'NC',
  'NOTA CREDITO': 'NC',
  NDEBITO: 'ND',
  'NOTA DEBITO': 'ND',
  CHEQUE: 'CH'
}

// Estos archivos vienen con mojibake (UTF-8 re-leído como Latin-1, ej. "Ã³"
// en vez de "ó", "Â°" en vez de "°", BOM como "ï»¿"). Se revierte tomando
// cada char code como un byte Latin-1 y re-decodificando como UTF-8.
const arreglarMojibake = (texto) => {
  try {
    const bytes = Uint8Array.from([...texto].map((c) => c.charCodeAt(0) & 0xff))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return texto
  }
}

// Los montos vienen sin separador decimal, solo "." como separador de miles
// (ej. "2.679.347"), así que basta con quitar los puntos.
const numeroClp = (str) => Number((str || '').replace(/\./g, '').trim()) || 0

const CARGA_MOVCAJA_ALIASES = {
  Glosa: ['Descripcion/Glosa', 'Descripción/Glosa'],
  Documento: ['Documento'],
  Numdoc: ['Nº Documento', 'N° Documento', 'No Documento'],
  Monto: ['Monto'],
  DebHab: ['Debito/Credito', 'Débito/Crédito'],
  Cuenta: ['Cuenta']
}

// Compara encabezados ignorando tildes/símbolos (ej. "º", "°") en vez de
// intentar adivinar la codificación exacta con la que el navegador decodificó
// el archivo -- "Nº Documento", "N° Documento" y variantes con caracteres mal
// decodificados terminan todas comparando como "ndocumento".
const normalizarEncabezado = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

const parseCsvMovCaja = (textoCrudo) => {
  const BOM = String.fromCharCode(0xfeff)
  const texto = arreglarMojibake(textoCrudo).split(BOM).join('')
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lineas.length < 2) return []

  const headers = lineas[0].split(',').map((h) => h.trim())
  const headersNormalizados = headers.map(normalizarEncabezado)
  const buscarIndice = (alias) => {
    for (const nombre of alias) {
      const i = headersNormalizados.indexOf(normalizarEncabezado(nombre))
      if (i !== -1) return i
    }
    return -1
  }

  const idx = Object.fromEntries(
    Object.entries(CARGA_MOVCAJA_ALIASES).map(([campo, alias]) => [campo, buscarIndice(alias)])
  )

  const faltantes = Object.entries(idx).filter(([, i]) => i === -1).map(([campo]) => campo)
  if (faltantes.length > 0) {
    throw new Error(`No se encontraron en el CSV las columnas para: ${faltantes.join(', ')}.`)
  }

  return lineas.slice(1).map((linea) => {
    const cols = linea.split(',')
    const documento = (cols[idx.Documento] || '').trim().toUpperCase()

    return {
      cuentaNombre: (cols[idx.Cuenta] || '').trim(),
      debHab: (cols[idx.DebHab] || '').trim().toUpperCase(),
      valor: numeroClp(cols[idx.Monto]),
      // La Glosa de Facturas ya encontradas se resuelve en el backend según el
      // documento; esta queda como texto de respaldo (no factura, o factura
      // que aún no está cargada en Lcompra/Lventa).
      glosa: (cols[idx.Glosa] || '').trim(),
      tdoc: DOCUMENTO_A_TDOC[documento] || '',
      numdoc: (cols[idx.Numdoc] || '').trim()
    }
  })
}

const emit = defineEmits(['close', 'set-title'])
const activeTab = ref('clientes') // 'clientes', 'proveedores', 'cuentas', 'comprobantes', 'cargasii', 'movcaja'

const cargarCuentasList = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/cuentas')
    cuentasList.value = res.data.data || []
  } catch (err) {
    console.error('Error cargando cuentas:', err.message)
  }
}

onMounted(cargarCuentasList)

const handleLimpiar = () => {
  clienteForm.value = { rut: '', razonSocial: '' }
  proveedorForm.value = { rut: '', razonSocial: '', cuenta1: '' }
  cuentaForm.value = { codigo: '', nombre: '', tipo: '' }
  comprobanteForm.value = { ejercicio: '' }
  cargaSiiForm.value = { tipo: 'compras' }
  archivoSeleccionado.value = null
  cargaSiiRows.value = []
  reset()
  gridRows.value = []
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const handleGrabar = async () => {
  try {
    if (activeTab.value === 'clientes') {
      const rut = clienteForm.value.rut.trim().toUpperCase()
      if (!rut) return alert('Ingresa el Rut del cliente.')
      if (!validarRut(rut)) return alert('Rut Invalido')
      await run(() => axios.post('http://localhost:3000/api/clientes', {
        rut, razonSocial: clienteForm.value.razonSocial.trim()
      }), 'Guardando...')
      handleLimpiar()
      progreso.value = 100
      estadoMensaje.value = `Cliente ${rut} guardado.`

    } else if (activeTab.value === 'proveedores') {
      const rut = proveedorForm.value.rut.trim().toUpperCase()
      if (!rut) return alert('Ingresa el Rut del proveedor.')
      if (!validarRut(rut)) return alert('Rut Invalido')
      await run(() => axios.post('http://localhost:3000/api/proveedores', {
        rut, razonSocial: proveedorForm.value.razonSocial.trim(), cuenta: proveedorForm.value.cuenta1 || null
      }), 'Guardando...')
      handleLimpiar()
      progreso.value = 100
      estadoMensaje.value = `Proveedor ${rut} guardado.`

    } else if (activeTab.value === 'cuentas') {
      const codigo = cuentaForm.value.codigo.trim().toUpperCase()
      if (!codigo) return alert('Ingresa el Código de la cuenta.')
      await run(() => axios.post('http://localhost:3000/api/cuentas', {
        codigo, nombre: cuentaForm.value.nombre.trim(), tipo: cuentaForm.value.tipo.trim()
      }), 'Guardando...')
      await cargarCuentasList()
      handleLimpiar()
      progreso.value = 100
      estadoMensaje.value = `Cuenta ${codigo} guardada.`

    } else if (activeTab.value === 'comprobantes') {
      const ejercicio = comprobanteForm.value.ejercicio.trim()
      if (!ejercicio) return alert('Ingresa el Ejercicio.')
      const res = await run(() => axios.post('http://localhost:3000/api/ejercicio', { ejercicio }), 'Guardando...')
      handleLimpiar()
      progreso.value = 100
      estadoMensaje.value = res.data.message
      alert(res.data.message)
    }
  } catch (err) {
    estadoMensaje.value = 'Error al guardar.'
    alert('Error al guardar: ' + (err.response?.data?.error || err.message))
  }
}

const handleEliminar = async () => {
  try {
    if (activeTab.value === 'clientes') {
      if (!clienteForm.value.rut.trim()) return alert('Ingresa el Rut del cliente a eliminar.')
      await axios.delete(`http://localhost:3000/api/clientes/${clienteForm.value.rut.trim().toUpperCase()}`)

    } else if (activeTab.value === 'proveedores') {
      if (!proveedorForm.value.rut.trim()) return alert('Ingresa el Rut del proveedor a eliminar.')
      await axios.delete(`http://localhost:3000/api/proveedores/${proveedorForm.value.rut.trim().toUpperCase()}`)

    } else if (activeTab.value === 'cuentas') {
      if (!cuentaForm.value.codigo.trim()) return alert('Ingresa el Código de la cuenta a eliminar.')
      await axios.delete(`http://localhost:3000/api/cuentas/${cuentaForm.value.codigo.trim().toUpperCase()}`)
      await cargarCuentasList()

    } else {
      return alert('Esta pestaña no tiene un registro para eliminar.')
    }
    handleLimpiar()
  } catch (err) {
    alert('Error al eliminar: ' + (err.response?.data?.error || err.message))
  }
}

// Text1_LostFocus / Text3_LostFocus: valida el Rut y autocompleta Razón Social (y Cuenta) si ya existe
const handleRutClienteBlur = async () => {
  const rut = clienteForm.value.rut.trim().toUpperCase()
  if (!rut) return
  clienteForm.value.rut = rut
  if (!validarRut(rut)) {
    alert('Rut Invalido')
    return
  }
  try {
    const res = await axios.get(`http://localhost:3000/api/clientes/${rut}`)
    if (res.data.data) clienteForm.value.razonSocial = res.data.data.razonSocial
  } catch {
    // Sin coincidencia: se deja para ingresar como cliente nuevo
  }
}

const handleRutProveedorBlur = async () => {
  const rut = proveedorForm.value.rut.trim().toUpperCase()
  if (!rut) return
  proveedorForm.value.rut = rut
  if (!validarRut(rut)) {
    alert('Rut Invalido')
    return
  }
  try {
    const res = await axios.get(`http://localhost:3000/api/proveedores/${rut}`)
    if (res.data.data) {
      proveedorForm.value.razonSocial = res.data.data.razonSocial
      proveedorForm.value.cuenta1 = res.data.data.cuenta || ''
    }
  } catch {
    // Sin coincidencia: se deja para ingresar como proveedor nuevo
  }
}

const handleCodigoCuentaBlur = async () => {
  const codigo = cuentaForm.value.codigo.trim().toUpperCase()
  if (!codigo) return
  cuentaForm.value.codigo = codigo
  try {
    const res = await axios.get(`http://localhost:3000/api/cuentas/${codigo}`)
    if (res.data.data) {
      cuentaForm.value.nombre = res.data.data.nombre
      cuentaForm.value.tipo = res.data.data.tipo
    }
  } catch {
    // Sin coincidencia: se deja para crear la cuenta nueva
  }
}

// Text1_KeyDown(F3) / Text3_KeyDown(F3): lista completa en la grilla inferior
const handleBrowseClientes = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/clientes')
    gridRows.value = (res.data.data || []).map(c => ({ rut: c.rut, razonSocial: c.razonSocial }))
  } catch (err) {
    alert('Error al listar clientes: ' + err.message)
  }
}

const handleBrowseProveedores = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/proveedores')
    gridRows.value = (res.data.data || []).map(p => ({ rut: p.rut, razonSocial: p.razonSocial }))
  } catch (err) {
    alert('Error al listar proveedores: ' + err.message)
  }
}

// Revi_cta_Click / Revisa_Click: pendientes de registrar (clientes que venden pero no están en Clientes;
// proveedores que compran pero no tienen Cuenta asignada)
const handleRevisarClientes = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/clientes/revisar')
    gridRows.value = (res.data.data || []).map(r => ({ rut: r.rut, razonSocial: r.razonSocial }))
    if (gridRows.value.length === 0) alert('No hay clientes pendientes de registrar.')
  } catch (err) {
    alert('Error al revisar clientes: ' + err.message)
  }
}

const handleRevisarProveedores = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/proveedores/revisar')
    gridRows.value = (res.data.data || []).map(r => ({ rut: r.rut, razonSocial: r.razonSocial }))
    if (gridRows.value.length === 0) alert('No hay proveedores pendientes de asignar cuenta.')
  } catch (err) {
    alert('Error al revisar proveedores: ' + err.message)
  }
}

// Grilla_DblClick: selecciona una fila de la grilla y la carga en el formulario
const handleGridRowSelect = (row) => {
  if (activeTab.value === 'clientes') {
    clienteForm.value = { rut: row.rut, razonSocial: row.razonSocial }
  } else if (activeTab.value === 'proveedores') {
    proveedorForm.value.rut = row.rut
    proveedorForm.value.razonSocial = row.razonSocial
    handleRutProveedorBlur()
  }
}

const handleFileChange = (e) => {
  archivoSeleccionado.value = e.target.files[0] || null
}

const handleProcesarSii = async () => {
  if (!archivoSeleccionado.value) {
    alert('Selecciona un archivo CSV del SII antes de procesar.')
    return
  }

  // Leer y parsear el CSV es instantáneo y puede fallar por datos del archivo
  // (no por la red), así que queda fuera de la barra de progreso.
  let rows
  try {
    const texto = await archivoSeleccionado.value.text()
    rows = parseCsvSii(texto, cargaSiiForm.value.tipo)
  } catch (err) {
    alert('Error al leer el archivo: ' + err.message)
    return
  }

  if (rows.length === 0) {
    alert('El archivo no contiene registros.')
    return
  }

  const tabla = cargaSiiForm.value.tipo === 'compras' ? 'Compras' : 'Ventas'

  try {
    const res = await run(() => axios.post('http://localhost:3000/api/carga-sii/procesar', {
      tipo: cargaSiiForm.value.tipo,
      rows
    }), `Insertando ${rows.length} registros en ${tabla}...`)

    cargaSiiRows.value = res.data.data || []
    estadoMensaje.value = res.data.message
  } catch (err) {
    estadoMensaje.value = 'Error al procesar la carga SII.'
    alert('Error al procesar la carga SII: ' + (err.response?.data?.error || err.message))
  }
}

// --- Carga Movimientos Caja (CSV -> Cdiario, misma lógica de Póliza que
// Comprobante Diario: se ingresa manualmente o se genera con doble clic; si
// ya existe, se muestra la última línea grabada para saber desde dónde sigue
// la carga del archivo) ---
const movCajaForm = ref({ fecha: new Date().toISOString().split('T')[0], poliza: '' })
const movCajaUltimaLinea = ref('')
const movCajaPolizaData = ref([])
const movCajaSumaTotal = ref(0)
const movCajaFileInputRef = ref(null)
const movCajaArchivo = ref(null)
const showMovCajaPolizaModal = ref(false)

const movCajaRecalcularSuma = () => {
  movCajaSumaTotal.value = movCajaPolizaData.value.reduce((acc, r) => {
    if (r.DebHab === 'D') return acc + Number(r.Valor || 0)
    if (r.DebHab === 'C') return acc - Number(r.Valor || 0)
    return acc
  }, 0)
}

// Doble clic en Póliza: genera un número nuevo (igual que Comprobante Diario)
const handleGenerarPolizaMovCajaDblClick = async () => {
  try {
    const res = await axios.post('http://localhost:3000/api/cdiario/generar-poliza', { fecha: movCajaForm.value.fecha })
    movCajaForm.value.poliza = res.data.poliza
    await handleCargarPolizaMovCaja()
  } catch (err) {
    alert('Error al generar póliza: ' + err.message)
  }
}

// Tab en Póliza: si ya existe, trae sus líneas para mostrar la Suma y la
// última línea grabada (así el archivo se agrega a continuación, no encima).
const handleCargarPolizaMovCaja = async () => {
  if (!movCajaForm.value.poliza.trim()) {
    movCajaUltimaLinea.value = ''
    movCajaPolizaData.value = []
    movCajaRecalcularSuma()
    return
  }

  try {
    const res = await axios.get(`http://localhost:3000/api/cdiario/poliza/${movCajaForm.value.poliza.trim()}`)
    movCajaPolizaData.value = res.data.data || []
    movCajaUltimaLinea.value = movCajaPolizaData.value.length > 0
      ? String(Math.max(...movCajaPolizaData.value.map(r => Number(r.Linea) || 0)))
      : ''
    movCajaRecalcularSuma()
  } catch (err) {
    console.error('Error cargando póliza:', err.message)
  }
}

const handleMovCajaFileChange = (e) => {
  movCajaArchivo.value = e.target.files[0] || null
}

const handleCargarMovCaja = async () => {
  if (!movCajaForm.value.poliza.trim()) {
    alert('Ingresa o genera (doble clic) un número de Póliza antes de cargar.')
    return
  }
  if (!movCajaArchivo.value) {
    alert('Selecciona un archivo CSV antes de cargar.')
    return
  }

  let rows
  try {
    const texto = await movCajaArchivo.value.text()
    rows = parseCsvMovCaja(texto)
  } catch (err) {
    alert('Error al leer el archivo: ' + err.message)
    return
  }

  if (rows.length === 0) {
    alert('El archivo no contiene registros.')
    return
  }

  try {
    const res = await run(() => axios.post('http://localhost:3000/api/cdiario/carga-movimientos', {
      poliza: movCajaForm.value.poliza.trim(),
      fecha: movCajaForm.value.fecha,
      rows
    }), `Cargando ${rows.length} movimientos...`)

    estadoMensaje.value = res.data.message
    alert(res.data.message)
    movCajaArchivo.value = null
    await handleCargarPolizaMovCaja()
  } catch (err) {
    estadoMensaje.value = 'Error al cargar movimientos.'
    alert('Error al cargar movimientos: ' + (err.response?.data?.error || err.message))
  }
}

const handleImprimirMovCaja = () => {
  if (!movCajaForm.value.poliza.trim()) {
    alert('No hay una póliza cargada para imprimir.')
    return
  }
  showMovCajaPolizaModal.value = true
}

const handleLimpiarMovCaja = () => {
  movCajaForm.value = { fecha: new Date().toISOString().split('T')[0], poliza: '' }
  movCajaUltimaLinea.value = ''
  movCajaPolizaData.value = []
  movCajaArchivo.value = null
  movCajaRecalcularSuma()
}

const handleRevisarLibro = async () => {
  try {
    const res = await axios.get(`http://localhost:3000/api/carga-sii/actual?tipo=${cargaSiiForm.value.tipo}`)
    const rows = res.data.data || []

    libroReportData.value = rows.map(r => ({
      Rut: r.Rut,
      RazonSocial: r.Rsoc,
      Tdoc: r.Tdoc,
      Numdoc: r.Numdoc,
      Fecha: r.Fecha,
      Neto: r.Neto,
      Exen: r.Exen,
      Iva: r.Iva,
      Total: r.Total
    }))
    showLibroModal.value = true
  } catch (err) {
    alert('Error al obtener el libro actual: ' + (err.response?.data?.error || err.message))
  }
}

// Emitir el título según la pestaña interna activa
watch(activeTab, (newTab) => {
  gridRows.value = []
  const titles = {
    clientes: 'Mantenedor de Clientes',
    proveedores: 'Mantenedor de Proveedores',
    cuentas: 'Plan de Cuentas',
    comprobantes: 'Inicialización de Comprobantes',
    cargasii: 'Carga Archivos SII',
    movcaja: 'Carga Movimientos Caja'
  }
  emit('set-title', titles[newTab] || 'Mantenciones')
  reset()
}, { immediate: true })
</script>

<template>
  <div class="space-y-4 text-slate-200">
    
    <!-- Encabezado del Módulo -->
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Mantenedores</h2>
      <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Manten.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      
      <!-- Panel Izquierdo: Formulario con Pestañas -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between">
        
        <!-- Pestañas alineadas en una sola fila -->
        <div>
          <div class="flex border-b border-slate-700 space-x-1 mb-4">
            <button 
              @click="activeTab = 'clientes'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'clientes' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Clientes
            </button>
            <button 
              @click="activeTab = 'proveedores'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'proveedores' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Proveedores
            </button>
            <button 
              @click="activeTab = 'cuentas'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'cuentas' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Cuentas
            </button>
            <button
              @click="activeTab = 'comprobantes'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'comprobantes' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Comprobantes
            </button>
            <button
              @click="activeTab = 'cargasii'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'cargasii' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Carga Archivos SII
            </button>
            <button
              @click="activeTab = 'movcaja'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'movcaja' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Carga Movimientos Caja
            </button>
          </div>

          <!-- Contenido Pestaña 1: Clientes -->
          <div v-if="activeTab === 'clientes'" class="space-y-4 py-4 min-h-40">
            <div class="flex items-center space-x-3">
              <label class="w-16 text-right text-sm text-slate-300 font-medium">Rut</label>
              <input
                v-model="clienteForm.rut"
                type="text"
                placeholder="12345678-9"
                title="Al salir del campo (Tab) se valida el Rut y se autocompleta la Razón Social si ya existe. F3 lista todos los clientes."
                @blur="handleRutClienteBlur"
                @keydown.f3.prevent="handleBrowseClientes"
                @focus="$event.target.select()"
                class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <input v-model="clienteForm.razonSocial" type="text" placeholder="Razón Social del Cliente" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex justify-center pt-2">
              <button @click="handleRevisarClientes" class="bg-slate-700 hover:bg-slate-600 text-xs px-4 py-2 rounded border border-slate-600 font-semibold text-slate-200 transition-colors">
                Revisa Cuenta
              </button>
            </div>
          </div>

          <!-- Contenido Pestaña 2: Proveedores -->
          <div v-else-if="activeTab === 'proveedores'" class="space-y-4 py-4 min-h-40">
            <div class="flex items-center space-x-3">
              <label class="w-16 text-right text-sm text-slate-300 font-medium">Rut</label>
              <input
                v-model="proveedorForm.rut"
                type="text"
                placeholder="12345678-9"
                title="Al salir del campo (Tab) se valida el Rut y se autocompleta Razón Social/Cuenta si ya existe. F3 lista todos los proveedores."
                @blur="handleRutProveedorBlur"
                @keydown.f3.prevent="handleBrowseProveedores"
                @focus="$event.target.select()"
                class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <input v-model="proveedorForm.razonSocial" type="text" placeholder="Razón Social del Proveedor" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-16 text-right text-sm text-slate-300 font-medium">Cuenta</label>
              <select v-model="proveedorForm.cuenta1" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar Cuenta...</option>
                <option v-for="c in cuentasList" :key="c.codigo" :value="c.codigo">{{ c.codigo }} - {{ c.nombre }}</option>
              </select>
              <input :value="proveedorForm.cuenta1" readonly title="Código de la cuenta seleccionada" class="w-32 bg-slate-800/60 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-center" />
            </div>
            <div class="flex justify-center pt-2">
              <button @click="handleRevisarProveedores" class="bg-slate-700 hover:bg-slate-600 text-xs px-4 py-2 rounded border border-slate-600 font-semibold text-slate-200 transition-colors">
                Revisa Cuenta
              </button>
            </div>
          </div>

          <!-- Contenido Pestaña 3: Cuentas -->
          <div v-else-if="activeTab === 'cuentas'" class="space-y-4 py-4 min-h-40">
            <div class="flex items-center space-x-3">
              <label class="w-16 text-right text-sm text-slate-300 font-medium">Código</label>
              <input
                v-model="cuentaForm.codigo"
                type="text"
                placeholder="0101"
                title="Al salir del campo (Tab) se autocompletan Nombre/Tipo si el código ya existe."
                @blur="handleCodigoCuentaBlur"
                @focus="$event.target.select()"
                class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <input v-model="cuentaForm.nombre" type="text" placeholder="Nombre de la Cuenta" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
              <input v-model="cuentaForm.tipo" type="text" placeholder="Tipo" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- Contenido Pestaña 4: Comprobantes -->
          <div v-else-if="activeTab === 'comprobantes'" class="space-y-4 py-4 min-h-40 flex flex-col items-center justify-center">
            <div class="flex items-center space-x-3">
              <label class="text-sm text-slate-300 font-medium">Ejercicio</label>
              <input v-model="comprobanteForm.ejercicio" type="text" placeholder="2026" class="w-24 text-center bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- Contenido Pestaña 5: Carga Archivos SII -->
          <div v-else-if="activeTab === 'cargasii'" class="space-y-6 py-6 min-h-40 flex flex-col items-center justify-center">
            <div class="flex items-center space-x-10">
              <div class="space-y-2">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" v-model="cargaSiiForm.tipo" value="compras" class="text-emerald-500 focus:ring-emerald-400" />
                  <span class="text-sm">Carga SII Compras</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" v-model="cargaSiiForm.tipo" value="ventas" class="text-emerald-500 focus:ring-emerald-400" />
                  <span class="text-sm">Carga SII Ventas</span>
                </label>
              </div>

              <div class="flex flex-col items-center space-y-2">
                <input ref="fileInputRef" type="file" accept=".csv,.txt" class="hidden" @change="handleFileChange" />
                <button @click="fileInputRef.click()" class="bg-slate-700 hover:bg-slate-600 text-xs px-6 py-2 rounded border border-slate-600 font-semibold text-slate-200 transition-colors">
                  Archivo
                </button>
                <span class="text-xs text-slate-500 font-mono truncate max-w-50">{{ archivoSeleccionado?.name || 'Ningún archivo seleccionado' }}</span>
              </div>
            </div>
          </div>

          <!-- Contenido Pestaña 6: Carga Movimientos Caja -->
          <div v-else-if="activeTab === 'movcaja'" class="space-y-6 py-6 min-h-40 flex flex-col items-center justify-center">
            <div class="flex items-center space-x-4">
              <label class="w-16 text-right text-sm text-slate-300 font-medium">Fecha</label>
              <input v-model="movCajaForm.fecha" type="date" class="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-4">
              <label class="w-16 text-right text-sm text-slate-300 font-medium">Póliza</label>
              <input
                v-model="movCajaForm.poliza"
                @dblclick="handleGenerarPolizaMovCajaDblClick"
                @blur="handleCargarPolizaMovCaja"
                type="text"
                placeholder="Doble Clic p/Auto"
                title="Doble clic para generar número automático"
                class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500"
              />
              <label class="text-sm text-slate-300 font-medium">Última Línea</label>
              <input :value="movCajaUltimaLinea" readonly placeholder="Nueva" type="text" class="w-24 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-emerald-400 text-center cursor-not-allowed select-none" />
            </div>

            <div class="flex flex-col items-center space-y-2">
              <input ref="movCajaFileInputRef" type="file" accept=".csv,.txt" class="hidden" @change="handleMovCajaFileChange" />
              <button @click="movCajaFileInputRef.click()" class="bg-slate-700 hover:bg-slate-600 text-xs px-6 py-2 rounded border border-slate-600 font-semibold text-slate-200 transition-colors">
                Carga de Archivo
              </button>
              <span class="text-xs text-slate-500 font-mono truncate max-w-50">{{ movCajaArchivo?.name || 'Ningún archivo seleccionado' }}</span>
            </div>

            <div class="flex justify-center items-center space-x-3 pt-3 border-t border-slate-800 w-full">
              <span class="text-sm font-bold text-slate-300 italic">Suma</span>
              <span :class="['font-mono font-bold text-base px-4 py-1 rounded bg-slate-950 border', movCajaSumaTotal === 0 ? 'text-emerald-400 border-emerald-800' : 'text-amber-400 border-amber-800']">
                {{ new Intl.NumberFormat('es-CL').format(movCajaSumaTotal) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Barra de Estado / Progreso, compartida por todas las pestañas (Grabar y Procesar) -->
        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />

      </div>

      <!-- Panel Derecho: Acciones VB6 -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center">
        <template v-if="activeTab === 'cargasii'">
          <button @click="handleProcesarSii" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded text-sm shadow transition-colors">
            Procesar
          </button>
          <button @click="handleRevisarLibro" :disabled="cargando" class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
            Revisar Libro Actual
          </button>
          <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
            Salir
          </button>
        </template>
        <template v-else-if="activeTab === 'movcaja'">
          <button @click="handleCargarMovCaja" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded text-sm shadow transition-colors">
            Cargar
          </button>
          <button @click="handleImprimirMovCaja" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
            Imprimir
          </button>
          <button @click="handleLimpiarMovCaja" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
            Limpiar
          </button>
          <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
            Salir
          </button>
        </template>
        <template v-else>
          <button @click="handleGrabar" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded text-sm shadow transition-colors">
            Grabar
          </button>
          <button @click="handleEliminar" class="w-full bg-slate-800 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-slate-700 hover:border-red-800 font-semibold py-2 px-4 rounded text-sm transition-colors">
            Elimina Registro
          </button>
          <button @click="handleLimpiar" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
            Limpiar
          </button>
          <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
            Salir
          </button>
        </template>
      </div>

    </div>

    <!-- Tabla de Registros Inferior (Grid DataView) -->
    <div v-if="activeTab === 'cargasii'" class="bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden">
      <div class="max-h-44 overflow-y-auto overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-800 text-slate-400 sticky top-0 border-b border-slate-700">
            <tr>
              <th class="p-2 border-r border-slate-700 whitespace-nowrap">Tipo Doc</th>
              <th class="p-2 border-r border-slate-700 whitespace-nowrap">Folio/Numdoc</th>
              <th class="p-2 border-r border-slate-700 whitespace-nowrap">Fecha</th>
              <th class="p-2 border-r border-slate-700 whitespace-nowrap">Rut Cliente</th>
              <th class="p-2 border-r border-slate-700 whitespace-nowrap">Razón Social</th>
              <th class="p-2 border-r border-slate-700 text-right whitespace-nowrap">Monto Neto</th>
              <th class="p-2 border-r border-slate-700 text-right whitespace-nowrap">Monto Exen</th>
              <th class="p-2 border-r border-slate-700 text-right whitespace-nowrap">Iva</th>
              <th class="p-2 text-right whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-300">
            <tr v-for="(r, i) in cargaSiiRows" :key="i" class="hover:bg-slate-800/40 font-mono">
              <td class="p-2 border-r border-slate-800 text-emerald-400 whitespace-nowrap">{{ r.Tdoc }}</td>
              <td class="p-2 border-r border-slate-800 whitespace-nowrap">{{ r.Numdoc }}</td>
              <td class="p-2 border-r border-slate-800 whitespace-nowrap">{{ r.Fecha }}</td>
              <td class="p-2 border-r border-slate-800 whitespace-nowrap">{{ r.Rut }}</td>
              <td class="p-2 border-r border-slate-800 font-sans whitespace-nowrap">{{ r.Rsoc }}</td>
              <td class="p-2 border-r border-slate-800 text-right">{{ r.Neto }}</td>
              <td class="p-2 border-r border-slate-800 text-right">{{ r.Exen }}</td>
              <td class="p-2 border-r border-slate-800 text-right">{{ r.Iva }}</td>
              <td class="p-2 text-right">{{ r.Total }}</td>
            </tr>
            <tr v-if="cargaSiiRows.length === 0">
              <td colspan="9" class="p-3 text-center text-slate-500 italic">Sin registros procesados todavía.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="activeTab !== 'movcaja'" class="bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden">
      <div class="max-h-44 overflow-y-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-800 text-slate-400 sticky top-0 border-b border-slate-700">
            <tr>
              <th class="w-10 p-2 text-center border-r border-slate-700">#</th>
              <th class="p-2 border-r border-slate-700">Rut</th>
              <th class="p-2">Razón Social</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-300">
            <tr
              v-for="(row, i) in gridRows"
              :key="i"
              @dblclick="handleGridRowSelect(row)"
              :title="(activeTab === 'clientes' || activeTab === 'proveedores') ? 'Doble clic para cargar en el formulario' : ''"
              class="hover:bg-slate-800/40 font-mono cursor-pointer">
              <td class="p-2 text-center border-r border-slate-800 text-slate-500">{{ i + 1 }}</td>
              <td class="p-2 border-r border-slate-800 text-emerald-400">{{ row.rut }}</td>
              <td class="p-2 font-sans">{{ row.razonSocial }}</td>
            </tr>
            <tr v-if="gridRows.length === 0">
              <td colspan="3" class="p-3 text-center text-slate-500 italic">Sin registros. Usa F3 en el Rut o "Revisa Cuenta" para listar.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal "Revisar Libro Actual" (contenido crudo de Compras/Ventas) -->
    <ReporteLibroComprasModal
      :show="showLibroModal"
      periodo="Carga Actual"
      :tipoReporte="cargaSiiForm.tipo"
      :empresaNombre="activeCompany?.name || 'EMPRESA'"
      :reportData="libroReportData"
      @close="showLibroModal = false"
    />

    <ReportePolizaModal
      :show="showMovCajaPolizaModal"
      :poliza="movCajaForm.poliza"
      :empresaNombre="activeCompany?.name || 'EMPRESA'"
      :reportData="movCajaPolizaData"
      @close="showMovCajaPolizaModal = false"
    />

  </div>
</template>