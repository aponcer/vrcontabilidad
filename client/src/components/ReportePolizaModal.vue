<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  poliza: String,
  empresaNombre: String,
  reportData: Array
})

const emit = defineEmits(['close'])

const totalDebe = computed(() => {
  if (!props.reportData) return 0
  return props.reportData
    .filter(r => r.DebHab === 'D')
    .reduce((acc, r) => acc + Number(r.Valor || 0), 0)
})

const totalHaber = computed(() => {
  if (!props.reportData) return 0
  return props.reportData
    .filter(r => r.DebHab === 'C')
    .reduce((acc, r) => acc + Number(r.Valor || 0), 0)
})

const formatMonto = (valor) => {
  if (!valor && valor !== 0) return '0'
  return new Intl.NumberFormat('es-CL').format(valor)
}

const handlePrint = () => {
  window.print()
}
</script>

<template>
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
    <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
      
      <!-- Control Bar -->
      <div class="no-print bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-3">
          <button @click="handlePrint" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow">
            <span>Imprimir</span>
          </button>
          <button @click="emit('close')" class="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-4 py-1.5 rounded text-xs transition-colors cursor-pointer border border-slate-600">
            Cancelar
          </button>
        </div>
        <span class="text-xs text-slate-400 font-mono">Vista Previa - Comprobante de Diario</span>
      </div>

      <!-- Hoja de Reporte (Estilo Crystal Reports) -->
      <div class="p-8 bg-white text-black font-sans overflow-y-auto flex-1 print:p-0 print:overflow-visible">
        
        <!-- Header Principal -->
        <div class="text-center space-y-1 mb-6">
          <h1 class="text-xs font-bold uppercase tracking-wider text-slate-700 print:text-black">{{ empresaNombre }}</h1>
          <h2 class="text-lg font-bold tracking-tight">Comprobante de Diario</h2>
          <p class="text-sm font-semibold">Póliza N° <span class="font-mono">{{ poliza }}</span></p>
        </div>

        <!-- Tabla Estilo Crystal Reports -->
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="border-b-2 border-black text-left">
              <th class="py-1 w-20 font-bold">Fecha</th>
              <th class="py-1 w-16 font-bold">Cuenta</th>
              <th class="py-1 font-bold">Nombre</th>
              <th class="py-1 w-12 text-center font-bold">Línea</th>
              <th class="py-1 w-28 text-right font-bold">Debe</th>
              <th class="py-1 w-28 text-right font-bold">Haber</th>
              <th class="py-1 pl-4 font-bold">Glosa</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 print:divide-slate-300">
            <tr v-for="row in reportData" :key="row.Linea" class="font-mono text-[11px]">
              <td class="py-1 font-sans">{{ row.Fecha }}</td>
              <td class="py-1">{{ row.Cuenta }}</td>
              <td class="py-1 font-sans font-medium truncate max-w-50">{{ row.NombreCuenta || row.Nombre }}</td>
              <td class="py-1 text-center">{{ row.Linea }}</td>
              <td class="py-1 text-right">{{ row.DebHab === 'D' ? formatMonto(row.Valor) : '0' }}</td>
              <td class="py-1 text-right">{{ row.DebHab === 'C' ? formatMonto(row.Valor) : '0' }}</td>
              <td class="py-1 pl-4 font-sans text-[10px] uppercase truncate max-w-45">{{ row.Glosa }}</td>
            </tr>
            <tr v-if="!reportData || reportData.length === 0">
              <td colspan="7" class="py-6 text-center text-slate-500 font-sans italic">No existen registros para esta póliza.</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-b-2 border-black font-bold">
              <td colspan="4" class="py-1.5 text-right font-sans uppercase">Totales:</td>
              <td class="py-1.5 text-right font-mono">{{ formatMonto(totalDebe) }}</td>
              <td class="py-1.5 text-right font-mono">{{ formatMonto(totalHaber) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
/* El modal se monta con <Teleport to="body">; el reset de impresión (ocultar
   #app, mostrar solo .printable-area/.bg-slate-900, etc.) vive en style.css
   sin scope. */
@media print {
  @page {
    margin: 10mm;
    size: auto;
  }
}
</style>