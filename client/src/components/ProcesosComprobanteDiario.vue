<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import ReportePolizaModal from './ReportePolizaModal.vue'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const showPolizaModal = ref(false)
const polizaData = ref([])

const cuentasList = ref([])
const clientesList = ref([])
const proveedoresList = ref([])
const tercerosFiltrados = ref([])

const ultimaGlosa = ref('')

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

const form = ref({
  fecha: new Date().toISOString().split('T')[0],
  poliza: '',
  linea: '1',
  cuenta: '',
  debHab: 'D',
  valor: '',
  tdoc: '',
  numdoc: '',
  rut: '',
  glosa: ''
})

// Suma de lo ya grabado en Cdiario para esta póliza (D suma, C resta). Se
// recalcula solo en momentos puntuales -- Tab en Póliza, Tab en Línea, y
// Grabar -- no en cada tecla del campo Valor.
const sumaTotal = ref(0)

const recalcularSuma = () => {
  sumaTotal.value = polizaData.value.reduce((acc, r) => {
    if (r.DebHab === 'D') return acc + Number(r.Valor || 0)
    if (r.DebHab === 'C') return acc - Number(r.Valor || 0)
    return acc
  }, 0)
}

// El dropdown de Cuenta se muestra ordenado alfabéticamente por nombre (la
// tabla Cuenta en sí sigue ordenada por Código para el mantenedor de Cuentas).
const cuentasOrdenadas = computed(() =>
  [...cuentasList.value].sort((a, b) =>
    (a.Nombre || a.nombre || '').localeCompare(b.Nombre || b.nombre || '')
  )
)

onMounted(async () => {
  emit('set-title', 'Comprobante Diario')
  await cargarMaestros()
})

const cargarMaestros = async () => {
  try {
    const [resCuentas, resClientes, resProvee] = await Promise.all([
      axios.get('http://localhost:3000/api/cuentas'),
      axios.get('http://localhost:3000/api/clientes'),
      axios.get('http://localhost:3000/api/proveedores')
    ])
    
    // Normalizamos la lectura considerando la estructura de respuesta
    cuentasList.value = resCuentas.data.data || resCuentas.data || []
    clientesList.value = resClientes.data.data || resClientes.data || []
    proveedoresList.value = resProvee.data.data || resProvee.data || []

  } catch (err) {
    console.error('Error cargando maestros:', err.message)
  }
}

// Generar Póliza al hacer doble clic en el campo Póliza
const handleGenerarPolizaDblClick = async () => {
  try {
    const res = await axios.post('http://localhost:3000/api/cdiario/generar-poliza', { fecha: form.value.fecha })
    form.value.poliza = res.data.poliza
    form.value.linea = '1'
    await handleCargarPoliza()
  } catch (err) {
    alert('Error al generar póliza: ' + err.message)
  }
}

// Cargar Póliza al perder foco
const handleCargarPoliza = async () => {
  if (!form.value.poliza.trim()) return

  try {
    const res = await axios.get(`http://localhost:3000/api/cdiario/poliza/${form.value.poliza.trim()}`)
    polizaData.value = res.data.data || []
    recalcularSuma()

    if (polizaData.value.length > 0 && !form.value.linea) {
      form.value.linea = String(polizaData.value.length + 1)
    }
  } catch (err) {
    console.error('Error cargando póliza:', err.message)
  }
}

// Cargar Línea Específica
const handleCargarLinea = () => {
  if (!form.value.poliza.trim() || !form.value.linea) return

  const reg = polizaData.value.find(r => String(r.Linea) === String(form.value.linea))
  if (reg) {
    form.value.cuenta = reg.Cuenta || ''
    form.value.debHab = reg.DebHab || 'D'
    form.value.valor = reg.Valor || ''
    form.value.tdoc = reg.Tdoc || ''
    form.value.numdoc = reg.Numdoc || ''
    form.value.rut = reg.Rut || ''
    form.value.glosa = reg.Glosa || ''
  }

  recalcularSuma()
}

// Filtrar Terceros según la Cuenta (Combo1_LostFocus)
watch(() => form.value.cuenta, (nuevaCuenta) => {
  if (nuevaCuenta === '0110' || nuevaCuenta === '0111') {
    tercerosFiltrados.value = clientesList.value.map(c => ({ rut: c.rut, nombre: c.razonSocial }))
  } else if (nuevaCuenta === '0201') {
    tercerosFiltrados.value = proveedoresList.value.map(p => ({ rut: p.rut, nombre: p.razonSocial }))
  } else {
    tercerosFiltrados.value = []
  }
})

// Buscar Documento al perder foco en Numdoc (Text6_LostFocus)
const handleBuscarNumdoc = async () => {
  if (!form.value.numdoc.trim() || !form.value.cuenta) return

  try {
    const res = await axios.get(`http://localhost:3000/api/cdiario/buscar-documento`, {
      params: { cuenta: form.value.cuenta, numdoc: form.value.numdoc.trim() }
    })

    if (res.data.encontrado) {
      form.value.rut = res.data.rut
      form.value.valor = res.data.total
      form.value.glosa = res.data.glosa
    }
  } catch (err) {
    console.error('Error buscando documento:', err.message)
  }
}

// Doble Clic en Glosa repite la anterior
const handleGlosaDblClick = () => {
  if (ultimaGlosa.value) {
    form.value.glosa = ultimaGlosa.value
  }
}

// Grabar
const handleGrabar = async () => {
  if (!form.value.poliza.trim() || !form.value.cuenta) {
    alert('Ingresa al menos la Póliza y la Cuenta.')
    return
  }

  try {
    await run(() => axios.post('http://localhost:3000/api/cdiario/linea', form.value), 'Guardando...')

    // Guardar última glosa
    ultimaGlosa.value = form.value.glosa

    // Recargar póliza
    await handleCargarPoliza()

    // Avanzar a la siguiente línea y limpiar detalle
    const siguienteLinea = Number(form.value.linea || 0) + 1
    form.value.linea = String(siguienteLinea)
    form.value.valor = ''
    form.value.numdoc = ''
    form.value.rut = ''
    form.value.glosa = ''

    estadoMensaje.value = `Línea ${form.value.poliza} grabada.`

  } catch (err) {
    estadoMensaje.value = 'Error al grabar.'
    alert('Error al grabar: ' + (err.response?.data?.error || err.message))
  }
}

// Eliminar Registro / Línea
const handleEliminarRegistro = async () => {
  if (!form.value.poliza.trim() || !form.value.linea) return
  if (!confirm(`¿Eliminar Línea ${form.value.linea} de la Póliza ${form.value.poliza}?`)) return

  try {
    await axios.post('http://localhost:3000/api/cdiario/eliminar-linea', {
      poliza: form.value.poliza.trim(),
      linea: form.value.linea
    })
    alert('Línea eliminada.')
    handleLimpiarDetalle()
    await handleCargarPoliza()
  } catch (err) {
    alert('Error eliminando línea: ' + err.message)
  }
}

// Eliminar Póliza
const handleEliminarPoliza = async () => {
  if (!form.value.poliza.trim()) return
  if (!confirm(`¿Eliminar Póliza N° ${form.value.poliza} completa?`)) return

  try {
    await axios.delete(`http://localhost:3000/api/cdiario/poliza/${form.value.poliza.trim()}`)
    alert('Póliza eliminada.')
    handleLimpiar()
  } catch (err) {
    alert('Error eliminando póliza: ' + err.message)
  }
}

const handleLimpiarDetalle = () => {
  form.value.cuenta = ''
  form.value.debHab = 'D'
  form.value.valor = ''
  form.value.tdoc = ''
  form.value.numdoc = ''
  form.value.rut = ''
  form.value.glosa = ''
}

const handleLimpiar = () => {
  form.value = {
    fecha: new Date().toISOString().split('T')[0],
    poliza: '',
    linea: '1',
    cuenta: '',
    debHab: 'D',
    valor: '',
    tdoc: '',
    numdoc: '',
    rut: '',
    glosa: ''
  }
  polizaData.value = []
  recalcularSuma()
  reset()
}

const handleImprimir = () => {
  if (!form.value.poliza.trim()) {
    alert('Ingresa una póliza para imprimir.')
    return
  }
  showPolizaModal.value = true
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Comprobante de Diario</h2>
      <span class="text-xs text-slate-400 font-mono">Cdiario.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel de Entradas -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-5 space-y-3 min-h-95 flex flex-col justify-between">
        <div class="space-y-3">
          <!-- Fecha -->
          <div class="grid grid-cols-12 gap-3 items-center">
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Fecha</label>
            <input v-model="form.fecha" type="date" class="col-span-4 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
          </div>

          <!-- Póliza (Doble Clic autogenera) y Línea -->
          <div class="grid grid-cols-12 gap-3 items-center">
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Póliza</label>
            <input 
              v-model="form.poliza" 
              @dblclick="handleGenerarPolizaDblClick"
              @blur="handleCargarPoliza"
              type="text" 
              placeholder="Doble Clic p/Auto" 
              title="Doble clic para generar número automático"
              class="col-span-4 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" 
            />
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Línea</label>
            <input 
              v-model="form.linea" 
              @blur="handleCargarLinea"
              type="text" 
              class="col-span-2 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" 
            />
          </div>

          <!-- Cuenta -->
          <div class="grid grid-cols-12 gap-3 items-center">
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Cuenta</label>
            <select 
              v-model="form.cuenta" 
              class="col-span-7 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer">
              <option value="">-- Seleccionar Cuenta --</option>
              <option
                v-for="c in cuentasOrdenadas"
                :key="c.Codigo || c.codigo"
                :value="c.Codigo || c.codigo">
                {{ c.Nombre || c.nombre }}
              </option>
            </select>
            <input 
              v-model="form.cuenta" 
              type="text" 
              placeholder="Código" 
              class="col-span-3 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center uppercase" 
            />
          </div>

          <!-- DebHab y Valor -->
          <div class="grid grid-cols-12 gap-3 items-center">
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">DebHab</label>
            <input
              :value="form.debHab"
              @input="form.debHab = $event.target.value.toUpperCase()"
              type="text"
              placeholder="D/C"
              class="col-span-2 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-center uppercase focus:outline-none focus:border-emerald-500"
            />
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Valor</label>
            <input v-model="form.valor" type="number" class="col-span-4 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
          </div>

          <!-- Tdoc y Numdoc -->
          <div class="grid grid-cols-12 gap-3 items-center">
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Tdoc</label>
            <select v-model="form.tdoc" class="col-span-2 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
              <option value="">--</option>
              <option value="FA">FACTURA</option>
              <option value="NC">NCREDITO</option>
              <option value="ND">NDEBITO</option>
              <option value="CH">CHEQUE</option>
            </select>
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Numdoc</label>
            <input 
              v-model="form.numdoc" 
              @blur="handleBuscarNumdoc"
              type="text" 
              class="col-span-4 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" 
            />
          </div>

          <!-- Rut / Terceros -->
          <div class="grid grid-cols-12 gap-3 items-center">
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Razón Social</label>
            <select v-model="form.rut" class="col-span-7 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
              <option value="">-- Seleccionar Rut --</option>
              <option v-for="t in tercerosFiltrados" :key="t.rut" :value="t.rut">{{ t.nombre }}</option>
            </select>
            <input v-model="form.rut" type="text" placeholder="RUT" class="col-span-3 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center" />
          </div>

          <!-- Glosa (Doble Clic repite anterior) -->
          <div class="grid grid-cols-12 gap-3 items-center">
            <label class="col-span-2 text-right text-sm text-slate-300 font-medium">Glosa</label>
            <input 
              v-model="form.glosa" 
              @dblclick="handleGlosaDblClick"
              type="text" 
              placeholder="Doble Clic p/Repetir Glosa Anterior"
              class="col-span-10 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" 
            />
          </div>
        </div>

        <div class="space-y-3">
          <!-- Suma -->
          <div class="flex justify-center items-center space-x-3 pt-3 border-t border-slate-800">
            <span class="text-sm font-bold text-slate-300 italic">Suma</span>
            <span :class="['font-mono font-bold text-base px-4 py-1 rounded bg-slate-950 border', sumaTotal === 0 ? 'text-emerald-400 border-emerald-800' : 'text-amber-400 border-amber-800']">
              {{ new Intl.NumberFormat('es-CL').format(sumaTotal) }}
            </span>
          </div>

          <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" />
        </div>

      </div>

      <!-- Panel Lateral de Botones -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center min-h-95">
        <button @click="handleGrabar" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Grabar</button>
        <button @click="handleImprimir" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Imprimir</button>
        <button @click="handleEliminarRegistro" class="w-full bg-slate-800 hover:bg-amber-900/40 text-amber-300 border border-amber-800/50 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Elimina Registro</button>
        <button @click="handleEliminarPoliza" class="w-full bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Elimina Póliza</button>
        <button @click="handleLimpiar" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Limpiar</button>
        <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Salir</button>
      </div>
    </div>

    <ReportePolizaModal
      :show="showPolizaModal"
      :poliza="form.poliza"
      :empresaNombre="activeCompany?.name || 'EMPRESA'"
      :reportData="polizaData"
      @close="showPolizaModal = false"
    />
  </div>
</template>