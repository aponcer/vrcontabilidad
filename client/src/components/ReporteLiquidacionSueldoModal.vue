<script setup>
const props = defineProps({
  show: Boolean,
  liquidacion: { type: Object, default: () => ({}) },
  empresa: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close'])

const fmt = (val) => {
  if (!val && val !== 0) return '0'
  return new Intl.NumberFormat('es-CL').format(Math.round(val))
}

const handleImprimir = () => {
  window.print()
}
</script>

<template>
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

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
        <span class="text-xs text-slate-400 font-mono">Vista Previa - Liquidación de Sueldos</span>
      </div>

      <!-- Document Sheet: el scroll vive en el "papel" blanco, no en este
           contenedor oscuro. -->
      <div class="p-8 bg-slate-950 flex justify-center print-wrapper overflow-y-auto">
        <div class="printable-area shrink-0 overflow-y-auto max-h-[65vh] bg-white text-black p-8 shadow-2xl w-[210mm] font-sans text-[11px]">

          <!-- Encabezado -->
          <div class="mb-4">
            <p class="font-bold">{{ empresa.Rsoc || 'EMPRESA' }}</p>
            <p>{{ empresa.Direccion }}<span v-if="empresa.Oficina"> {{ empresa.Oficina }}</span> - {{ empresa.Comuna || empresa.Ciudad }}</p>
            <p>Rut: {{ empresa.Rut }}</p>
          </div>

          <h1 class="text-center font-bold text-sm mb-4 uppercase">Liquidacion de Sueldos Periodo: {{ liquidacion.periodo }}</h1>

          <div class="flex justify-between items-start mb-1">
            <p><span class="font-bold">Nombre:</span> {{ liquidacion.nombreCompleto }} {{ liquidacion.rut }}</p>
            <p><span class="font-bold">Dias Trab:</span>{{ liquidacion.diasTrabajados }}</p>
          </div>
          <p class="mb-4"><span class="font-bold">Cargo:</span> {{ liquidacion.cargo }}</p>

          <!-- Tabla Haberes / Descuentos -->
          <table class="w-full border-collapse text-[11px]">
            <thead>
              <tr class="border-y-2 border-black font-bold">
                <th colspan="2" class="py-1 text-left pl-1">Haberes</th>
                <th colspan="2" class="py-1 text-left pl-4">Descuentos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="py-0.5 pl-1">Sueldo Base</td>
                <td class="py-0.5 text-right pr-2 w-24">{{ fmt(liquidacion.sueldoBase) }}</td>
                <td class="py-0.5 pl-4">AFP&nbsp;&nbsp;{{ liquidacion.afpNombre }}&nbsp;&nbsp;{{ liquidacion.afpPorcentaje }}&nbsp;%</td>
                <td class="py-0.5 text-right pr-1 w-24">{{ fmt(liquidacion.afpDescuento) }}</td>
              </tr>
              <tr>
                <td class="py-0.5 pl-1">Horas Extra</td>
                <td class="py-0.5 text-right pr-2"></td>
                <td class="py-0.5 pl-4">Salud&nbsp;&nbsp;{{ liquidacion.saludNombre }}&nbsp;&nbsp;{{ liquidacion.saludValor }}&nbsp;{{ liquidacion.saludUnidad }}</td>
                <td class="py-0.5 text-right pr-1">{{ fmt(liquidacion.saludDescuento) }}</td>
              </tr>
              <tr>
                <td class="py-0.5 pl-1">Gratificación</td>
                <td class="py-0.5 text-right pr-2">{{ fmt(liquidacion.gratificacion) }}</td>
                <td class="py-0.5 pl-4">Cesantía Trabajador</td>
                <td class="py-0.5 text-right pr-1">{{ fmt(liquidacion.cesantiaTrabajador) }}</td>
              </tr>
              <tr class="border-b border-black">
                <td class="py-0.5 pl-1">Comisiones</td>
                <td class="py-0.5 text-right pr-2">{{ fmt(liquidacion.comisiones) }}</td>
                <td class="py-0.5 pl-4">Total Leyes Sociales</td>
                <td class="py-0.5 text-right pr-1">{{ fmt(liquidacion.totalLeyesSociales) }}</td>
              </tr>

              <tr class="border-b border-black font-bold">
                <td class="py-1 pl-1">Haberes Imponibles</td>
                <td class="py-1 text-right pr-2">{{ fmt(liquidacion.haberesImponibles) }}</td>
                <td class="py-1 pl-4">Haberes Tributables</td>
                <td class="py-1 text-right pr-1">{{ fmt(liquidacion.haberesTributables) }}</td>
              </tr>

              <tr>
                <td class="py-0.5 pl-1 pt-2">Movilización</td>
                <td class="py-0.5 text-right pr-2 pt-2">{{ fmt(liquidacion.movilizacion) }}</td>
                <td class="py-0.5 pl-4 pt-2">Impuesto Unico</td>
                <td class="py-0.5 text-right pr-1 pt-2">{{ fmt(liquidacion.impuestoUnico) }}</td>
              </tr>
              <tr>
                <td class="py-0.5 pl-1">Colación</td>
                <td class="py-0.5 text-right pr-2">{{ fmt(liquidacion.colacion) }}</td>
                <td class="py-0.5 pl-4">Anticipo</td>
                <td class="py-0.5 text-right pr-1">{{ fmt(liquidacion.anticipo) }}</td>
              </tr>
              <tr>
                <td class="py-0.5 pl-1">Aguinaldo</td>
                <td class="py-0.5 text-right pr-2">{{ fmt(liquidacion.aguinaldo) }}</td>
                <td class="py-0.5 pl-4">Cuenta Corriente</td>
                <td class="py-0.5 text-right pr-1">{{ fmt(liquidacion.cuentaCorriente) }}</td>
              </tr>
              <tr>
                <td class="py-0.5 pl-1">Total Haberes no Imponibles</td>
                <td class="py-0.5 text-right pr-2">{{ fmt(liquidacion.totalHaberesNoImponibles) }}</td>
                <td class="py-0.5 pl-4"></td>
                <td class="py-0.5 text-right pr-1"></td>
              </tr>

              <tr class="border-y-2 border-black font-bold">
                <td class="py-1 pl-1">Total Haberes</td>
                <td class="py-1 text-right pr-2">{{ fmt(liquidacion.totalHaberes) }}</td>
                <td class="py-1 pl-4">Total Descuentos</td>
                <td class="py-1 text-right pr-1">{{ fmt(liquidacion.totalDescuentos) }}</td>
              </tr>

              <tr class="font-bold">
                <td class="py-1 pl-1"></td>
                <td class="py-1 text-right pr-2"></td>
                <td class="py-1 pl-4">Liquido a Pagar</td>
                <td class="py-1 text-right pr-1">{{ fmt(liquidacion.liquido) }}</td>
              </tr>
            </tbody>
          </table>

          <p class="mt-4"><span class="font-bold">Son:</span> {{ liquidacion.palabras }}</p>

          <p class="mt-3 text-justify">
            Certifico que he recibido de {{ empresa.Rsoc || 'la empresa' }}, a mi entera satisfacción, el saldo líquido
            indicado en la presente liquidación y no tengo cargo ni cobro alguno posterior que hacer por ningún concepto.
          </p>

          <div class="mt-16 text-center w-64 mx-auto">
            <p class="border-t border-black pt-1">Trabajador</p>
          </div>

        </div>
      </div>

    </div>
  </div>
  </Teleport>
</template>

<style scoped>
@media print {
  @page {
    margin: 10mm;
    size: portrait;
  }
}
</style>
