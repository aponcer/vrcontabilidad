<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  desde: String, // 'AAAA-MM-DD'
  hasta: String, // 'AAAA-MM-DD'
  empresaNombre: String,
  reportData: Array // { Cuenta, NombreCuenta, Fecha, Npol, Linea, Debe, Haber, Glosa }
})

const emit = defineEmits(['close'])

// Agrupa por Cuenta, igual que el Crystal Report original (ORDER BY Lmayor.Cuenta)
const groupedData = computed(() => {
  if (!props.reportData || props.reportData.length === 0) return {}

  return props.reportData.reduce((acc, row) => {
    const key = row.Cuenta || 'SIN CUENTA'
    if (!acc[key]) {
      acc[key] = { nombreCuenta: row.NombreCuenta || '', items: [], subtotalDebe: 0, subtotalHaber: 0 }
    }
    acc[key].items.push(row)
    acc[key].subtotalDebe += Number(row.Debe || 0)
    acc[key].subtotalHaber += Number(row.Haber || 0)
    return acc
  }, {})
})

const totalGeneral = computed(() => {
  if (!props.reportData) return { debe: 0, haber: 0 }
  return props.reportData.reduce(
    (acc, row) => {
      acc.debe += Number(row.Debe || 0)
      acc.haber += Number(row.Haber || 0)
      return acc
    },
    { debe: 0, haber: 0 }
  )
})

const fmt = (val) => (val || val === 0 ? Number(val).toLocaleString('es-CL') : '0')

// Las fechas "Desde"/"Hasta" del encabezado se muestran DD/MM/AAAA (como el
// parámetro del Crystal Report); las fechas de cada línea quedan tal cual
// vienen guardadas (igual que en el reporte original, sin reformatear).
const fmtFecha = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const handleImprimir = () => {
  window.print()
}
</script>

<template>
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

      <!-- Control Bar -->
      <div class="no-print bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-3">
          <button @click="handleImprimir" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow">
            <span>Imprimir</span>
          </button>
          <button @click="emit('close')" class="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-4 py-1.5 rounded text-xs transition-colors cursor-pointer border border-slate-600">
            Cancelar
          </button>
        </div>
        <span class="text-xs text-slate-400 font-mono">Vista Previa - Libro Mayor</span>
      </div>

      <!-- Document Sheet: el scroll vive en el "papel" blanco, no en este
           contenedor oscuro. -->
      <div class="p-8 bg-slate-950 flex justify-center print-wrapper overflow-y-auto">
        <div class="printable-area shrink-0 overflow-y-auto max-h-[65vh] bg-white text-black p-10 shadow-2xl w-[210mm] font-sans text-[10.5px]">

          <div>
            <div class="text-center mb-6">
              <h1 class="text-base font-bold uppercase tracking-wide">{{ empresaNombre }}</h1>
              <h2 class="text-sm font-bold mt-0.5">Libro Mayor</h2>
              <p class="text-xs mt-1">Desde: <strong>{{ fmtFecha(desde) }}</strong>&nbsp;&nbsp;&nbsp;Hasta: <strong>{{ fmtFecha(hasta) }}</strong></p>
            </div>

            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b-2 border-black font-bold">
                  <th class="py-1">Cuenta</th>
                  <th class="py-1">Nombre</th>
                  <th class="py-1">Fecha</th>
                  <th class="py-1">Npol</th>
                  <th class="py-1 text-center">Linea</th>
                  <th class="py-1 text-right">Debe</th>
                  <th class="py-1 text-right">Haber</th>
                  <th class="py-1">Glosa</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(group, cuenta) in groupedData" :key="cuenta">
                  <tr v-for="item in group.items" :key="cuenta + '-' + item.Npol + '-' + item.Linea" class="border-b border-gray-100">
                    <td class="py-0.5 whitespace-nowrap">{{ item.Cuenta }}</td>
                    <td class="py-0.5 truncate max-w-32">{{ item.NombreCuenta }}</td>
                    <td class="py-0.5 whitespace-nowrap">{{ item.Fecha }}</td>
                    <td class="py-0.5">{{ item.Npol }}</td>
                    <td class="py-0.5 text-center">{{ item.Linea }}</td>
                    <td class="py-0.5 text-right font-mono">{{ fmt(item.Debe) }}</td>
                    <td class="py-0.5 text-right font-mono">{{ fmt(item.Haber) }}</td>
                    <td class="py-0.5 truncate max-w-32">{{ item.Glosa }}</td>
                  </tr>

                  <!-- Subtotal por cuenta, con Saldo (Debe - Haber) donde Crystal muestra @Saldo -->
                  <tr class="font-bold border-t border-black border-b">
                    <td colspan="5" class="py-1 text-right pr-2">Total Cuenta {{ cuenta }} - {{ group.nombreCuenta }}:</td>
                    <td class="py-1 text-right font-mono">{{ fmt(group.subtotalDebe) }}</td>
                    <td class="py-1 text-right font-mono">{{ fmt(group.subtotalHaber) }}</td>
                    <td class="py-1 text-right font-mono">{{ fmt(group.subtotalDebe - group.subtotalHaber) }}</td>
                  </tr>
                </template>

                <!-- Total General final -->
                <tr v-if="reportData && reportData.length > 0" class="font-bold border-t-2 border-b-2 border-black">
                  <td colspan="5" class="py-2 text-right pr-2 uppercase">Total General:</td>
                  <td class="py-2 text-right font-mono text-xs">{{ fmt(totalGeneral.debe) }}</td>
                  <td class="py-2 text-right font-mono text-xs">{{ fmt(totalGeneral.haber) }}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

    </div>
  </div>
  </Teleport>
</template>

<style scoped>
/* El modal se monta con <Teleport to="body">; el reset de impresión (ocultar
   #app, mostrar solo .printable-area, etc.) vive en style.css sin scope. */
@media print {
  @page {
    margin: 8mm;
    size: auto;
  }
}
</style>
