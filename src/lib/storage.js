import { CLAVE_DATOS, PREFIJO } from '../config.js'
import { crearDatosIniciales } from '../data/seed.js'

/**
 * Carga los datos. La semilla se escribe SOLO si la clave propia no existe:
 * una lista vacía guardada no es una primera visita y se respeta.
 */
export function cargar() {
  let raw
  try {
    raw = localStorage.getItem(CLAVE_DATOS)
  } catch (e) {
    return { datos: crearDatosIniciales(), aviso: 'Tu navegador no deja guardar datos: lo que cargues se pierde al cerrar la pestaña.' }
  }
  if (raw === null) {
    const datos = crearDatosIniciales()
    const r = guardar(datos)
    return { datos, primeraVez: true, aviso: r.ok ? null : r.motivo }
  }
  try {
    const datos = JSON.parse(raw)
    if (!datos || !Array.isArray(datos.encargos)) throw new Error('formato')
    return { datos }
  } catch {
    // No pisamos los datos guardados: quedan intactos para recuperarlos desde el panel.
    return { datos: crearDatosIniciales(), soloLectura: true, aviso: 'Los datos guardados están dañados. Mostramos los de ejemplo sin guardar; podés restaurarlos desde «Datos».' }
  }
}

export function guardar(datos) {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos))
    return { ok: true }
  } catch (e) {
    const lleno = e && (e.name === 'QuotaExceededError' || e.code === 22)
    return { ok: false, motivo: lleno ? 'No hay más espacio en el navegador. No se guardó; lo que escribiste sigue en pantalla.' : 'No se pudo guardar en este navegador. Lo que escribiste sigue en pantalla.' }
  }
}

/** Borra SOLO las claves de este proyecto y vuelve a cargar la semilla. */
export function restaurar() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const claves = []
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i)
        if (k && k.startsWith(PREFIJO)) claves.push(k)
      }
      claves.forEach((k) => store.removeItem(k))
    } catch { /* almacenamiento no disponible */ }
  }
  const datos = crearDatosIniciales()
  return { datos, ...guardar(datos) }
}

export function exportarJSON(datos) {
  return JSON.stringify(datos, null, 2)
}
