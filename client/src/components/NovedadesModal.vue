<script setup>
defineProps({
  show: Boolean,
  entradas: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

      <div class="bg-slate-800 border-b border-slate-700 px-6 py-4 rounded-t-xl shrink-0">
        <h2 class="text-lg font-bold text-emerald-400">Novedades del Sistema</h2>
        <p class="text-xs text-slate-400 mt-0.5">Esto cambió desde la última vez que abriste el sistema.</p>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <div v-for="entrada in entradas" :key="entrada.version">
          <div class="flex items-baseline space-x-2 mb-2">
            <span class="text-sm font-bold text-slate-100">Versión {{ entrada.version }}</span>
            <span class="text-xs text-slate-500 font-mono">{{ entrada.fecha }}</span>
          </div>
          <ul class="list-disc list-inside space-y-1.5">
            <li v-for="(cambio, i) in entrada.cambios" :key="i" class="text-sm text-slate-300">{{ cambio }}</li>
          </ul>
        </div>
      </div>

      <div class="bg-slate-800/60 border-t border-slate-700 px-6 py-3 rounded-b-xl shrink-0 flex justify-end">
        <button
          @click="emit('close')"
          class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-5 py-2 rounded text-sm transition-colors cursor-pointer">
          Entendido
        </button>
      </div>

    </div>
  </div>
  </Teleport>
</template>
