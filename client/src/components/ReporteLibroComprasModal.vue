<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  periodo: String,
  empresaNombre: String,
  tipoReporte: { type: String, default: 'compras' }, // 'compras' o 'ventas'
  reportData: Array
})

const emit = defineEmits(['close'])

const tituloReporte = computed(() => {
  return props.tipoReporte === 'ventas' ? 'Libro de Ventas' : 'Libro de Compras'
})

// Si es compras agrupa por Tdoc; si es ventas agrupa por el mes extraído de la Fecha (YYYY-MM)
const groupedData = computed(() => {
  if (!props.reportData || props.reportData.length === 0) return {}

  return props.reportData.reduce((acc, row) => {
    // Si es ventas, agrupamos por los primeros 7 caracteres de Fecha (ej: "2026-07")
    const groupKey = props.tipoReporte === 'ventas' 
      ? (row.Fecha ? row.Fecha.substring(0, 7) : 'SIN FECHA')
      : (row.Tdoc || 'OTROS')

    if (!acc[groupKey]) {
      acc[groupKey] = {
        items: [],
        subtotalNeto: 0,
        subtotalExen: 0,
        subtotalIva: 0,
        subtotalTotal: 0
      }
    }
    acc[groupKey].items.push(row)
    acc[groupKey].subtotalNeto += Number(row.Neto || 0)
    acc[groupKey].subtotalExen += Number(row.Exen || 0)
    acc[groupKey].subtotalIva += Number(row.Iva || 0)
    acc[groupKey].subtotalTotal += Number(row.Total || 0)
    return acc
  }, {})
})

// Totales Generales
const totalGeneral = computed(() => {
  if (!props.reportData) return { neto: 0, exen: 0, iva: 0, total: 0 }
  return props.reportData.reduce(
    (acc, row) => {
      acc.neto += Number(row.Neto || 0)
      acc.exen += Number(row.Exen || 0)
      acc.iva += Number(row.Iva || 0)
      acc.total += Number(row.Total || 0)
      return acc
    },
    { neto: 0, exen: 0, iva: 0, total: 0 }
  )
})

const fmt = (val) => (val ? Number(val).toLocaleString('es-CL') : '0')

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
        <span class="text-xs text-slate-400 font-mono">Vista Previa - {{ tituloReporte }}</span>
      </div>

      <!-- Document Sheet: el scroll vive en el "papel" blanco, no en este
           contenedor oscuro. -->
      <div class="p-8 bg-slate-950 flex justify-center print-wrapper overflow-y-auto">
        <div class="printable-area shrink-0 overflow-y-auto max-h-[65vh] bg-white text-black p-10 shadow-2xl w-[210mm] font-sans text-[11px]">
          
          <div>
            <div class="text-center mb-6">
              <h1 class="text-base font-bold uppercase tracking-wide">{{ empresaNombre }}</h1>
              <h2 class="text-sm font-bold mt-0.5">{{ tituloReporte }}</h2>
              <p class="text-xs mt-1">Período: <strong>{{ periodo }}</strong></p>
            </div>

            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b-2 border-black font-bold">
                  <th class="py-1">Rut</th>
                  <th class="py-1">Razón Social</th>
                  <th class="py-1">Tdoc</th>
                  <th class="py-1">Numdoc</th>
                  <th class="py-1">Fecha</th>
                  <th class="py-1 text-right">Neto</th>
                  <th class="py-1 text-right">Exento</th>
                  <th class="py-1 text-right">IVA</th>
                  <th class="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(group, groupKey) in groupedData" :key="groupKey">
                  <tr v-for="item in group.items" :key="item.Numdoc + item.Rut" class="border-b border-gray-100">
                    <td class="py-0.5 whitespace-nowrap">{{ item.Rut }}</td>
                    <td class="py-0.5 truncate max-w-45">{{ item.RazonSocial }}</td>
                    <td class="py-0.5">{{ item.Tdoc }}</td>
                    <td class="py-0.5">{{ item.Numdoc }}</td>
                    <td class="py-0.5 whitespace-nowrap">{{ item.Fecha }}</td>
                    <td class="py-0.5 text-right font-mono">{{ fmt(item.Neto) }}</td>
                    <td class="py-0.5 text-right font-mono">{{ fmt(item.Exen) }}</td>
                    <td class="py-0.5 text-right font-mono">{{ fmt(item.Iva) }}</td>
                    <td class="py-0.5 text-right font-mono">{{ fmt(item.Total) }}</td>
                  </tr>

                  <!-- Subtotal por bloque/mes -->
                  <tr class="font-bold border-t border-black border-b">
                    <td colspan="5" class="py-1 text-right pr-2">Subtotal {{ groupKey }}:</td>
                    <td class="py-1 text-right font-mono">{{ fmt(group.subtotalNeto) }}</td>
                    <td class="py-1 text-right font-mono">{{ fmt(group.subtotalExen) }}</td>
                    <td class="py-1 text-right font-mono">{{ fmt(group.subtotalIva) }}</td>
                    <td class="py-1 text-right font-mono">{{ fmt(group.subtotalTotal) }}</td>
                  </tr>
                </template>

                <!-- Total General final -->
                <tr v-if="reportData && reportData.length > 0" class="font-bold border-t-2 border-b-2 border-black">
                  <td colspan="5" class="py-2 text-right pr-2 uppercase">Total General:</td>
                  <td class="py-2 text-right font-mono text-xs">{{ fmt(totalGeneral.neto) }}</td>
                  <td class="py-2 text-right font-mono text-xs">{{ fmt(totalGeneral.exen) }}</td>
                  <td class="py-2 text-right font-mono text-xs">{{ fmt(totalGeneral.iva) }}</td>
                  <td class="py-2 text-right font-mono text-xs">{{ fmt(totalGeneral.total) }}</td>
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