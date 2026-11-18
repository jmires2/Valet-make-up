import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CLAVE_ROL, CLAVE_SESION_ADMIN } from './config.js'
import { cargar, guardar, restaurar as restaurarStorage } from './lib/storage.js'

const Ctx = createContext(null)

const leer = (store, k) => { try { return store.getItem(k) } catch { return null } }
const escribir = (store, k, v) => { try { store.setItem(k, v) } catch { /* sin almacenamiento */ } }

export function StoreProvider({ children }) {
  const inicial = useRef(null)
  if (!inicial.current) inicial.current = cargar()
  const [datos, setDatos] = useState(inicial.current.datos)
  const [avisoGlobal, setAvisoGlobal] = useState(inicial.current.aviso || null)
  const soloLectura = useRef(!!inicial.current.soloLectura)
  const actual = useRef(datos)

  // Administración pide la clave una vez por sesión de navegador.
  const [adminOk, setAdminOkState] = useState(leer(sessionStorage, CLAVE_SESION_ADMIN) === '1')
  const rolGuardado = leer(localStorage, CLAVE_ROL) || 'titular'
  const [rol, setRolState] = useState(rolGuardado === 'administracion' && !adminOk ? 'titular' : rolGuardado)

  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const avisar = useCallback((texto, tipo = 'ok') => {
    clearTimeout(timer.current)
    setToast({ texto, tipo, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), tipo === 'error' ? 6000 : 3500)
  }, [])

  /**
   * Guarda primero y recién después actualiza la pantalla.
   * Si falla, no cambia nada y devuelve el motivo (el formulario conserva lo escrito).
   */
  const commit = useCallback((cambiar) => {
    if (soloLectura.current) return { ok: false, motivo: 'Los datos guardados están dañados: restauralos desde «Datos» antes de editar.' }
    const nuevos = typeof cambiar === 'function' ? cambiar(actual.current) : cambiar
    const r = guardar(nuevos)
    if (!r.ok) return r
    actual.current = nuevos
    setDatos(nuevos)
    return { ok: true }
  }, [])

  const restaurar = useCallback(() => {
    const r = restaurarStorage()
    soloLectura.current = false
    actual.current = r.datos
    setDatos(r.datos)
    setAdminOkState(false)
    setRolState('titular')
    setAvisoGlobal(r.ok ? null : r.motivo)
    return r
  }, [])

  const setRol = useCallback((r) => { setRolState(r); escribir(localStorage, CLAVE_ROL, r) }, [])
  const setAdminOk = useCallback((v) => { setAdminOkState(v); escribir(sessionStorage, CLAVE_SESION_ADMIN, v ? '1' : '0') }, [])

  return (
    <Ctx.Provider value={{ datos, commit, restaurar, rol, setRol, adminOk, setAdminOk, toast, avisar, avisoGlobal, setAvisoGlobal }}>
      {children}
    </Ctx.Provider>
  )
}

export const useStore = () => useContext(Ctx)

export const permisos = (rol) => ({
  verPrecios: rol !== 'asistente',
  verMetricas: rol !== 'asistente',
  editarCatalogo: rol === 'titular',
  editarEncargos: rol !== 'asistente',
  registrarCompra: rol !== 'asistente',
})
