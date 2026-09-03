import { ref } from 'vue'

// Encapsula el patrón repetido en todos los módulos: estado de carga + barra
// de progreso simulada (rampa aleatoria mientras se espera al backend) +
// try/finally para que el timer siempre se limpie, incluso en errores o
// returns tempranos (validaciones).
//
// Uso típico:
//   const { cargando, progreso, estadoMensaje, run } = useBarraProgreso()
//   const handleGrabar = async () => {
//     try {
//       if (!rut) return alert('Ingresa el Rut.')       // no toca la barra
//       await run(() => axios.post(...), 'Guardando...')
//       estadoMensaje.value = 'Cliente guardado.'        // mensaje final a gusto del caller
//     } catch (err) {
//       estadoMensaje.value = 'Error al guardar.'
//       alert('Error al guardar: ' + err.message)
//     }
//   }
export function useBarraProgreso(mensajeInicial = 'Listo.') {
  const cargando = ref(false)
  const progreso = ref(0)
  const estadoMensaje = ref(mensajeInicial)

  // Ejecuta fn() (debe devolver una Promise) mostrando la rampa de progreso
  // mientras está en curso. Al éxito deja progreso en 100 (el caller decide
  // qué mensaje final mostrar); al error deja progreso en 0 y re-lanza el
  // error para que el caller decida cómo avisar (alert, mensaje custom, etc.).
  const run = async (fn, mensajeEnCurso = 'Procesando...') => {
    cargando.value = true
    progreso.value = 0
    estadoMensaje.value = mensajeEnCurso

    const timer = setInterval(() => {
      if (progreso.value < 85) {
        progreso.value += Math.floor(Math.random() * 15) + 5
      }
    }, 60)

    try {
      const resultado = await fn()
      progreso.value = 100
      return resultado
    } catch (err) {
      progreso.value = 0
      throw err
    } finally {
      clearInterval(timer)
      cargando.value = false
    }
  }

  const reset = (mensaje = mensajeInicial) => {
    progreso.value = 0
    estadoMensaje.value = mensaje
  }

  return { cargando, progreso, estadoMensaje, run, reset }
}
