<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

const modo = ref('proveedores') // 'proveedores' | 'clientes' | 'analisisProvee'
const razonSocial = ref('')
const rut = ref('')
// El VB6 original sincroniza Combo1/Combo2 por posición en la lista (ListIndex),
// no por el texto de la Razón Social -- necesario porque puede haber más de un
// Proveedor/Cliente con el mismo nombre pero Rut distinto (caso real detectado).
// Acá se replica lo mismo con un índice en vez de buscar por texto.
const selectedIndex = ref('')

const proveedoresList = ref([])
const clientesList = ref([])

const rows = ref([])
const totales = ref({ debito: 0, credito: 0, saldo: 0 })

onMounted(async () => {
  emit('set-title', 'Consultas Cuentas Corrientes')
  await Promise.all([cargarProveedores(), cargarClientes()])
})

const cargarProveedores = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/proveedores')
    proveedoresList.value = res.data.data || []
  } catch (err) {
    console.error('Error cargando proveedores:', err.message)
  }
}

const cargarClientes = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/clientes')
    clientesList.value = res.data.data || []
  } catch (err) {
    console.error('Error cargando clientes:', err.message)
  }
}

// "Analisis Provee" reutiliza el mismo listado de Proveedores (Option3_Click del
// .frm original carga desde la misma tabla Provee que Option1_Click).
const listaActiva = computed(() => (modo.value === 'clientes' ? clientesList.value : proveedoresList.value))

// Al cambiar de modo, limpia la selección/grilla/barra (evita arrastrar datos del modo anterior)
watch(modo, () => {
  selectedIndex.value = ''
  razonSocial.value = ''
  rut.value = ''
  rows.value = []
  totales.value = { debito: 0, credito: 0, saldo: 0 }
  reset()
})

// El desplegable de Razón Social selecciona por índice (ver nota arriba); el de
// Rut sigue pudiendo buscarse por valor porque el Rut sí es único. Cambiar la
// selección limpia la grilla, para que no quede mostrando resultados de otro
// Proveedor/Cliente hasta que se vuelva a presionar Procesar.
const handleSeleccionChange = () => {
  const item = listaActiva.value[Number(selectedIndex.value)]
  razonSocial.value = item ? item.razonSocial : ''
  rut.value = item ? item.rut : ''
  rows.value = []
  totales.value = { debito: 0, credito: 0, saldo: 0 }
  reset()
}

const handleRutChange = () => {
  const idx = listaActiva.value.findIndex(i => i.rut === rut.value)
  const item = listaActiva.value[idx]
  razonSocial.value = item ? item.razonSocial : ''
  rows.value = []
  totales.value = { debito: 0, credito: 0, saldo: 0 }
  reset()
  selectedIndex.value = idx >= 0 ? String(idx) : ''
}

const fmt = (val) => {
  if (!val && val !== 0) return ''
  return new Intl.NumberFormat('es-CL').format(val)
}

// Procesar_Click
const handleProcesar = async () => {
  if (!rut.value) return alert('Selecciona un Proveedor/Cliente.')

  try {
    const res = await run(() => axios.get('http://localhost:3000/api/consultas/cuenta-corriente', {
      params: { modo: modo.value, rut: rut.value }
    }), 'Consultando movimientos...')

    rows.value = res.data.data
    totales.value = res.data.totales

    // El .frm original sólo muestra "No hay Documentos" para Proveedores; en
    // Clientes/Analisis Provee, si no hay resultados simplemente queda vacío.
    if (rows.value.length === 0 && modo.value === 'proveedores') {
      alert('No hay Documentos')
    }
    estadoMensaje.value = `${rows.value.length} movimiento(s) encontrados.`
  } catch (err) {
    estadoMensaje.value = 'Error al consultar.'
    alert('Error al consultar: ' + (err.response?.data?.error || err.message))
  }
}

const handleLimpiar = () => {
  selectedIndex.value = ''
  razonSocial.value = ''
  rut.value = ''
  rows.value = []
  totales.value = { debito: 0, credito: 0, saldo: 0 }
  reset()
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Consultas Cuentas Corrientes</h2>
      <span class="text-xs text-slate-400 font-mono">Consultas.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 min-h-48">
        <div class="space-y-4">
          <div class="flex items-center space-x-3">
            <label class="flex items-center space-x-2 cursor-pointer w-40">
              <input type="radio" v-model="modo" value="proveedores" class="text-emerald-500 focus:ring-emerald-400" />
              <span class="text-sm">Proveedores</span>
            </label>
            <select v-model="selectedIndex" @change="handleSeleccionChange" class="w-72 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
              <option value="">-- Seleccionar --</option>
              <option v-for="(p, i) in listaActiva" :key="p.rut" :value="String(i)">{{ p.razonSocial }}</option>
            </select>
            <select v-model="rut" @change="handleRutChange" class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500">
              <option value="">--</option>
              <option v-for="p in listaActiva" :key="p.rut" :value="p.rut">{{ p.rut }}</option>
            </select>
          </div>

          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="radio" v-model="modo" value="clientes" class="text-emerald-500 focus:ring-emerald-400" />
            <span class="text-sm">Clientes</span>
          </label>

          <label class="flex items-center space-x-2 cursor-pointer">
            <input type="radio" v-model="modo" value="analisisProvee" class="text-emerald-500 focus:ring-emerald-400" />
            <span class="text-sm">Analisis Provee</span>
          </label>
        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-6" />
      </div>

      <!-- Panel Lateral -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center min-h-48">
        <button @click="handleProcesar" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic shadow">Procesar</button>
        <button @click="handleLimpiar" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Limpiar</button>
        <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Salir</button>
      </div>
    </div>

    <!-- Grilla de Resultados -->
    <div class="bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden">
      <div class="max-h-80 overflow-y-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10">
          <tr class="bg-slate-800 border-b border-slate-700 text-slate-300">
            <th class="py-2 px-3 text-left font-semibold w-20">Tdoc</th>
            <th class="py-2 px-3 text-left font-semibold">Numdoc</th>
            <th class="py-2 px-3 text-left font-semibold">Fecha</th>
            <th class="py-2 px-3 text-right font-semibold">Debito</th>
            <th class="py-2 px-3 text-right font-semibold">Credito</th>
            <th class="py-2 px-3 text-right font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800">
          <tr v-if="rows.length === 0">
            <td colspan="6" class="py-6 text-center text-slate-500 text-xs italic">Sin datos. Selecciona un Proveedor/Cliente y presiona Procesar.</td>
          </tr>
          <tr v-for="(r, idx) in rows" :key="idx" class="text-slate-200 font-mono">
            <td class="py-1.5 px-3">{{ r.Tdoc }}</td>
            <td class="py-1.5 px-3">{{ r.Numdoc }}</td>
            <td class="py-1.5 px-3">{{ r.Fecha }}</td>
            <td class="py-1.5 px-3 text-right">{{ fmt(r.Debito) }}</td>
            <td class="py-1.5 px-3 text-right">{{ fmt(r.Credito) }}</td>
            <td class="py-1.5 px-3 text-right">{{ fmt(r.Saldo) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length > 0" class="sticky bottom-0 z-10">
          <tr class="bg-slate-900 border-t border-slate-700 font-bold text-emerald-400 font-mono">
            <td colspan="3" class="py-2 px-3 text-slate-300 font-sans">Totales</td>
            <td class="py-2 px-3 text-right">{{ fmt(totales.debito) }}</td>
            <td class="py-2 px-3 text-right">{{ fmt(totales.credito) }}</td>
            <td class="py-2 px-3 text-right">{{ fmt(totales.saldo) }}</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  </div>
</template>
