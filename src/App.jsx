import { useEffect, useRef, useState } from 'react'
import {
  BarChart3, CalendarDays, ClipboardList, Database, Lock, MapPin, Menu, Package, Scissors, UserRound, X,
} from 'lucide-react'
import { CLAVE_PANEL } from './config.js'
import { permisos, useStore } from './state.jsx'
import { PedirClave, Toast } from './components/ui.jsx'
import Agenda from './screens/Agenda.jsx'
import AgendaAsistente from './screens/AgendaAsistente.jsx'
import Ficha from './screens/Ficha.jsx'
import Catalogo from './screens/Catalogo.jsx'
import Recetas from './screens/Recetas.jsx'
import Insumos from './screens/Insumos.jsx'
import Zonas from './screens/Zonas.jsx'
import Metricas from './screens/Metricas.jsx'
import Panel from './screens/Panel.jsx'

const ROLES = [
  { id: 'titular', nombre: 'Titular' },
  { id: 'administracion', nombre: 'Administración', clave: true },
  { id: 'asistente', nombre: 'Asistente' },
]

const NAV = [
  { id: 'agenda', nombre: 'Agenda', Icono: CalendarDays },
  { id: 'catalogo', nombre: 'Servicios', Icono: Scissors },
  { id: 'recetas', nombre: 'Recetas', Icono: ClipboardList },
  { id: 'insumos', nombre: 'Insumos', Icono: Package },
  { id: 'zonas', nombre: 'Zonas de traslado', Icono: MapPin },
  { id: 'metricas', nombre: 'Métricas', Icono: BarChart3, requiere: 'verMetricas' },
  { id: 'datos', nombre: 'Datos', Icono: Database, requiere: 'verMetricas', clave: true },
]

export default function App() {
  const { rol, setRol, adminOk, setAdminOk, toast, avisoGlobal, setAvisoGlobal, datos } = useStore()
  const [vista, setVista] = useState({ id: 'agenda' })
  const [menu, setMenu] = useState(false)
  const [pidiendo, setPidiendo] = useState(null) // { para: 'rol' | 'panel' }
  const [panelOk, setPanelOk] = useState(false)
  const p = permisos(rol)
  const botonMenu = useRef(null)

  useEffect(() => { window.scrollTo(0, 0) }, [vista])
  useEffect(() => {
    if (!menu) return
    const f = (e) => e.key === 'Escape' && cerrarMenu()
    window.addEventListener('keydown', f)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = '' }
  }, [menu])

  const cerrarMenu = () => { setMenu(false); botonMenu.current?.focus() }
  const cambiarRol = (r) => {
    setMenu(false)
    if (r === rol) return
    if (r === 'administracion' && !adminOk) return setPidiendo({ para: 'rol' })
    setRol(r)
    setVista({ id: 'agenda' })
  }
  const ir = (id) => {
    setMenu(false)
    if (id === 'datos' && !panelOk) return setPidiendo({ para: 'panel' })
    setVista({ id })
  }
  const navVisible = rol === 'asistente' ? [] : NAV.filter((n) => !n.requiere || p[n.requiere])
  const abrirEncargo = (id) => setVista({ id: 'ficha', encargoId: id })
  const actual = vista.id === 'ficha' ? 'agenda' : vista.id
  const seccion = rol === 'asistente' ? 'Tus encargos' : NAV.find((n) => n.id === actual)?.nombre

  let pantalla
  if (rol === 'asistente') pantalla = <AgendaAsistente />
  else if (vista.id === 'ficha') pantalla = <Ficha key={vista.encargoId || 'nuevo'} encargoId={vista.encargoId} onVolver={() => setVista({ id: 'agenda' })} onAbrir={abrirEncargo} />
  else if (vista.id === 'catalogo') pantalla = <Catalogo />
  else if (vista.id === 'recetas') pantalla = <Recetas />
  else if (vista.id === 'insumos') pantalla = <Insumos />
  else if (vista.id === 'zonas') pantalla = <Zonas />
  else if (vista.id === 'metricas' && p.verMetricas) pantalla = <Metricas onAbrir={abrirEncargo} />
  else if (vista.id === 'datos' && panelOk) pantalla = <Panel />
  else pantalla = <Agenda onAbrir={abrirEncargo} onNuevo={() => setVista({ id: 'ficha' })} />

  const bajos = rol === 'asistente' ? 0 : datos.insumos.filter((i) => i.stockEnvases < i.minimo).length
  const nombreRol = ROLES.find((r) => r.id === rol)?.nombre

  return (
    <div className="min-h-screen bg-crema text-tinta">
      <header className="sticky top-0 z-40 border-b border-linea bg-crema/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-2 py-2">
          <button ref={botonMenu} onClick={() => setMenu(true)} aria-label="Abrir menú" aria-expanded={menu} aria-controls="menu-principal"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-tinta hover:bg-rosa-claro focus-visible:outline focus-visible:outline-2 focus-visible:outline-bordo">
            <Menu size={24} strokeWidth={1.75} aria-hidden="true" />
            {bajos > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-crema bg-alerta" aria-label={`${bajos} insumos para reponer`} />}
          </button>
          <button onClick={() => setVista({ id: 'agenda' })} className="min-w-0 flex-1 text-left">
            <span className="block truncate font-titulo text-[22px] font-semibold leading-none text-bordo">Valet MakeUp</span>
            <span className="block truncate text-[11px] uppercase tracking-[0.16em] text-gris">{seccion}</span>
          </button>
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-linea bg-white px-2.5 py-1 text-xs text-gris">
            <UserRound size={14} aria-hidden="true" /> {nombreRol}
          </span>
        </div>
      </header>

      {/* Menú hamburguesa: panel lateral */}
      <div className={`fixed inset-0 z-50 ${menu ? '' : 'pointer-events-none'}`} aria-hidden={!menu}>
        <div className={`absolute inset-0 bg-tinta/40 transition-opacity motion-reduce:transition-none ${menu ? 'opacity-100' : 'opacity-0'}`} onClick={cerrarMenu} />
        <nav id="menu-principal" aria-label="Menú principal" inert={menu ? undefined : ''}
          className={`absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col overflow-y-auto bg-crema transition-transform duration-200 motion-reduce:transition-none ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-linea px-4 py-3">
            <span className="font-titulo text-2xl font-semibold text-bordo">Valet MakeUp</span>
            <button onClick={cerrarMenu} aria-label="Cerrar menú" className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-rosa-claro">
              <X size={22} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <ul className="py-2">
            {rol === 'asistente' ? (
              <ItemMenu Icono={CalendarDays} nombre="Tus encargos" activo onClick={() => setMenu(false)} />
            ) : navVisible.map((n) => (
              <ItemMenu key={n.id} Icono={n.Icono} nombre={n.nombre} activo={actual === n.id} onClick={() => ir(n.id)}
                extra={
                  n.id === 'insumos' && bajos > 0 ? <span className="rounded-full bg-alerta px-2 text-[11px] font-bold text-white tab">{bajos} a reponer</span>
                  : n.clave && !panelOk ? <Lock size={14} className="text-gris" aria-label="Pide clave" /> : null
                } />
            ))}
          </ul>

          <div className="mt-auto border-t border-linea px-4 py-4">
            <p className="etiqueta">Estás usando la app como</p>
            <div className="mt-2 grid gap-1" role="radiogroup" aria-label="Rol">
              {ROLES.map((r) => (
                <button key={r.id} role="radio" aria-checked={rol === r.id} onClick={() => cambiarRol(r.id)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${rol === r.id ? 'border-bordo bg-white font-bold text-bordo' : 'border-linea text-tinta hover:bg-white'}`}>
                  {r.nombre}
                  {r.clave && !adminOk && <Lock size={14} className="text-gris" aria-label="Pide clave" />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gris">El rol cambia lo que se ve en este dispositivo. No es un inicio de sesión.</p>
          </div>
        </nav>
      </div>

      {avisoGlobal && (
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <div className="flex items-start justify-between gap-3 rounded-md border border-alerta/40 bg-[#FDF0E8] px-3 py-2 text-sm text-alerta">
            <span>{avisoGlobal}</span>
            <button className="shrink-0" onClick={() => setAvisoGlobal(null)} aria-label="Cerrar aviso"><X size={16} aria-hidden="true" /></button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-5">{pantalla}</main>

      {pidiendo && (
        <PedirClave
          titulo={pidiendo.para === 'rol' ? 'Entrar como Administración' : 'Panel de datos'}
          texto="Ingresá la clave compartida del atelier."
          verificar={(v) => v === CLAVE_PANEL}
          onCancelar={() => setPidiendo(null)}
          onOk={() => {
            if (pidiendo.para === 'rol') { setAdminOk(true); setRol('administracion'); setVista({ id: 'agenda' }) }
            else { setPanelOk(true); setVista({ id: 'datos' }) }
            setPidiendo(null)
          }}
        />
      )}
      <Toast toast={toast} />
    </div>
  )
}

function ItemMenu({ Icono, nombre, activo, onClick, extra }) {
  return (
    <li>
      <button onClick={onClick} aria-current={activo ? 'page' : undefined}
        className={`flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left text-[15px] ${activo ? 'border-bordo bg-rosa-claro font-bold text-bordo' : 'border-transparent text-tinta hover:bg-white'}`}>
        <Icono size={20} strokeWidth={1.75} aria-hidden="true" className={activo ? 'text-bordo' : 'text-gris'} />
        <span className="flex-1">{nombre}</span>
        {extra}
      </button>
    </li>
  )
}
