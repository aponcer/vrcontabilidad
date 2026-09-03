<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  periodo: String,
  reportData: Array,
  empresa: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close'])

const empresa = computed(() => props.empresa || {})

const fmt = (val) => {
  if (!val && val !== 0) return '0'
  return new Intl.NumberFormat('es-CL').format(Math.round(val))
}

const totDebito = computed(() => props.reportData?.reduce((a, r) => a + Number(r.Debito || 0), 0) || 0)
const totCredito = computed(() => props.reportData?.reduce((a, r) => a + Number(r.Credito || 0), 0) || 0)
const totSdeudor = computed(() => props.reportData?.reduce((a, r) => a + Number(r.Sdeudor || 0), 0) || 0)
const totSacreedor = computed(() => props.reportData?.reduce((a, r) => a + Number(r.Sacreedor || 0), 0) || 0)

const totActivo = computed(() => props.reportData?.reduce((a, r) => a + Number(r.Activo || 0), 0) || 0)
const totPasivo = computed(() => props.reportData?.reduce((a, r) => a + Number(r.Pasivo || 0), 0) || 0)
const totPerdida = computed(() => props.reportData?.reduce((a, r) => a + Number(r.Perdida || 0), 0) || 0)
const totGanancia = computed(() => props.reportData?.reduce((a, r) => a + Number(r.Ganancia || 0), 0) || 0)

const utilPerdidaGanancia = computed(() => totGanancia.value - totPerdida.value)
const utilActivoPasivo = computed(() => totActivo.value - totPasivo.value)

const handleImprimir = () => {
  window.print()
}
</script>

<template>
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">

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
        <span class="text-xs text-slate-400 font-mono">Vista Previa - Balance General (8 Columnas)</span>
      </div>

      <!-- Document Sheet (Estructura estándar de Compras/Ventas): el scroll vive
           en el "papel" blanco, no en este contenedor oscuro. -->
      <div class="p-8 bg-slate-950 flex justify-center print-wrapper overflow-y-auto">
        <div class="printable-area shrink-0 overflow-y-auto max-h-[65vh] bg-white text-black p-8 shadow-2xl w-[280mm] font-sans text-[10px]">
          
          <!-- Header Oficial con Título Centrado -->
          <div class="grid grid-cols-12 items-start mb-6">
            <div class="col-span-5 space-y-0.5 font-bold uppercase text-[10px]">
              <p class="text-xs">{{ empresa.Rsoc || 'EMPRESA' }}</p>
              <p>RUT: {{ empresa.Rut || '' }}</p>
              <p>{{ empresa.Direccion || '' }}</p>
              <p v-if="empresa.RepLegal">Rep. Legal: {{ empresa.RepLegal }}</p>
              <p v-if="empresa.RutRepLegal">RUT: {{ empresa.RutRepLegal }}</p>
            </div>

            <div class="col-span-7 text-center pr-12">
              <h1 class="text-base font-bold uppercase tracking-tight">Balance General</h1>
              <p class="text-xs font-semibold mt-1">Período: <strong>{{ periodo }}</strong></p>
            </div>
          </div>

          <!-- Tabla de 8 Columnas -->
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b-2 border-black font-bold text-center">
                <th class="py-1 text-left w-12">Cuenta</th>
                <th class="py-1 text-left">Nombre</th>
                <th class="py-1 text-right w-20">Debito</th>
                <th class="py-1 text-right w-20">Credito</th>
                <th class="py-1 text-right w-20">Saldo Deudor</th>
                <th class="py-1 text-right w-20">Saldo Acreedor</th>
                <th class="py-1 text-right w-20">Activo</th>
                <th class="py-1 text-right w-20">Pasivo</th>
                <th class="py-1 text-right w-20">Perdida</th>
                <th class="py-1 text-right w-20">Ganancia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="r in reportData" :key="r.Cuenta" class="font-mono text-[9.5px]">
                <td class="py-0.5 font-sans font-bold">{{ r.Cuenta }}</td>
                <td class="py-0.5 font-sans truncate max-w-40">{{ r.NombreCuenta }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Debito) }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Credito) }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Sdeudor) }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Sacreedor) }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Activo) }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Pasivo) }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Perdida) }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Ganancia) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="reportData && reportData.length > 0">
              <!-- Totales Brutos -->
              <tr class="font-bold border-t-2 border-black font-mono">
                <td colspan="2" class="py-1 font-sans">Totales</td>
                <td class="py-1 text-right">{{ fmt(totDebito) }}</td>
                <td class="py-1 text-right">{{ fmt(totCredito) }}</td>
                <td class="py-1 text-right">{{ fmt(totSdeudor) }}</td>
                <td class="py-1 text-right">{{ fmt(totSacreedor) }}</td>
                <td class="py-1 text-right">{{ fmt(totActivo) }}</td>
                <td class="py-1 text-right">{{ fmt(totPasivo) }}</td>
                <td class="py-1 text-right">{{ fmt(totPerdida) }}</td>
                <td class="py-1 text-right">{{ fmt(totGanancia) }}</td>
              </tr>

              <!-- Fila de Pérdida / Utilidad del Ejercicio -->
              <tr class="font-bold font-mono">
                <td colspan="6" class="py-1 font-sans">
                  {{ utilPerdidaGanancia < 0 ? 'Perdida del Ejercicio' : 'Utilidad del Ejercicio' }}
                </td>
                <td class="py-1 text-right">{{ utilActivoPasivo > 0 ? fmt(utilActivoPasivo) : '0' }}</td>
                <td class="py-1 text-right">{{ utilActivoPasivo < 0 ? fmt(Math.abs(utilActivoPasivo)) : '0' }}</td>
                <td class="py-1 text-right">{{ utilPerdidaGanancia > 0 ? fmt(utilPerdidaGanancia) : '0' }}</td>
                <td class="py-1 text-right">{{ utilPerdidaGanancia < 0 ? fmt(Math.abs(utilPerdidaGanancia)) : '0' }}</td>
              </tr>

              <!-- Sumas Iguales -->
              <tr class="font-bold border-t-2 border-b-2 border-black font-mono">
                <td colspan="2" class="py-1 font-sans uppercase">Sumas Iguales</td>
                <td class="py-1 text-right">{{ fmt(totDebito) }}</td>
                <td class="py-1 text-right">{{ fmt(totCredito) }}</td>
                <td class="py-1 text-right">{{ fmt(totSdeudor) }}</td>
                <td class="py-1 text-right">{{ fmt(totSacreedor) }}</td>
                <td class="py-1 text-right">{{ fmt(Math.max(totActivo, totPasivo)) }}</td>
                <td class="py-1 text-right">{{ fmt(Math.max(totActivo, totPasivo)) }}</td>
                <td class="py-1 text-right">{{ fmt(Math.max(totPerdida, totGanancia)) }}</td>
                <td class="py-1 text-right">{{ fmt(Math.max(totPerdida, totGanancia)) }}</td>
              </tr>
            </tfoot>
          </table>

        </div>
      </div>

    </div>
  </div>
  </Teleport>
</template>

<style scoped>
/* El modal se monta con <Teleport to="body">, así que el reset de impresión
   (ocultar #app, mostrar solo .printable-area, etc.) vive en style.css sin
   scope: las reglas scoped de Vue no pueden alcanzar elementos fuera de este
   componente de todos modos. */
@media print {
  @page {
    margin: 6mm;
    size: landscape;
  }
}
</style>