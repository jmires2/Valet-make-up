import { useMemo, useState } from 'react'
import { MARGEN_ALERTA } from '../config.js'
import { calcular, esPrueba, foto } from '../lib/calc.js'
import { fechaLarga, hoyISO, pct, pesos } from '../lib/format.js'
import { cupoDelDia } from '../lib/rules.js'
import { useStore } from '../state.jsx'
import { EstadoBadge, Etiqueta, Titulo, Vacio } from '../components/ui.jsx'
import { AlertTriangle, MapPin, Plus } from 'lucide-react'

const FILTROS = [
  { id: 'proximos', nombre: 'Próximos' },
  { id: 'pasados', nombre: 'Pasados' },
  { id: 'cancelados', nombre: 'Cancelados' },
  { id: 'todos', nombre: 'Todos' },
]

export const resumenServicios = (enc, f) =>
  enc.servicios.map((l) => `${l.personas > 1 ? l.personas + ' × ' : ''}${f.servicios[l.servicioId]?.nombre || 'Servicio eliminado'}`).join(' · ') || 'Sin servicios'

export default function Agenda({ onAbrir, onNuevo }) {
  const { datos } = useStore()
  const [filtro, setFiltro] = useState('proximos')
  const hoy = hoyISO()

  const lista = useMemo(() => {
    const es = datos.encargos.filter((e) => {
      if (filtro === 'cancelados') return e.estado === 'cancelado'
      if (filtro === 'todos') return true
      if (e.estado === 'cancelado') return false
      return filtro === 'proximos' ? e.fecha >= hoy : e.fecha < hoy
    })
    es.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    if (filtro === 'pasados') es.reverse()
    const grupos = []
    for (const e of es) {
      const g = grupos[grupos.length - 1]
      if (g && g.fecha === e.fecha) g.items.push(e)
      else grupos.push({ fecha: e.fecha, items: [e] })
    }
    return grupos
  }, [datos.encargos, filtro, hoy])

  const bajos = datos.encargos.filter((e) => !['cancelado', 'cobrado', 'realizado'].includes(e.estado) && e.servicios.length && calcular(e, datos).margenPct < MARGEN_ALERTA)

  return (
    <section>
      <Titulo sub={`Hoy es ${fechaLarga(hoy)}`} accion={<button className="btn-primario shrink-0" onClick={onNuevo}><Plus size={16} strokeWidth={1.75} aria-hidden="true" />Nuevo encargo</button>}>
        Agenda
      </Titulo>

      {bajos.length > 0 && (
        <div className="mb-4 flex gap-2 rounded-md border border-alerta/40 bg-[#FDF0E8] px-3 py-2 text-sm text-alerta">
          <AlertTriangle size={18} strokeWidth={1.75} className="mt-px shrink-0" aria-hidden="true" />
          <div>
          <b>{bajos.length === 1 ? 'Tenés 1 encargo' : `Tenés ${bajos.length} encargos`} con margen bajo el {pct(MARGEN_ALERTA)}.</b>{' '}
          {bajos.map((e, i) => (
            <span key={e.id}><button className="underline" onClick={() => onAbrir(e.id)}>{e.clienta}</button>{i < bajos.length - 1 ? ', ' : ''}</span>
          ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto" role="tablist">
        {FILTROS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)}
            className={`rounded-full border px-3 py-1 text-sm ${filtro === f.id ? 'border-bordo bg-bordo text-crema' : 'border-linea bg-white text-gris'}`}>
            {f.nombre}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <Vacio
          titulo={filtro === 'cancelados' ? 'No hay cancelaciones' : filtro === 'pasados' ? 'Todavía no hay encargos pasados' : 'No tenés encargos agendados'}
          texto={filtro === 'proximos' || filtro === 'todos' ? 'Cargá tu primera consulta y armá el presupuesto en el momento.' : undefined}
          accion={(filtro === 'proximos' || filtro === 'todos') && <button className="btn-primario" onClick={onNuevo}><Plus size={16} strokeWidth={1.75} aria-hidden="true" />Nuevo encargo</button>}
        />
      ) : (
        <div className="space-y-5">
          {lista.map((g) => {
            const cupo = cupoDelDia(g.fecha, datos.encargos, datos)
            const lleno = cupo.eventos >= cupo.maxEventos
            return (
              <div key={g.fecha}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 border-b border-linea pb-1">
                  <h2 className="font-titulo text-lg font-semibold first-letter:uppercase">{fechaLarga(g.fecha)}</h2>
                  <span className={`text-xs tab ${lleno ? 'font-bold text-bordo' : 'text-gris'}`}>
                    Cupo {cupo.eventos}/{cupo.maxEventos} eventos{cupo.pruebas ? ` · ${cupo.pruebas}/3 pruebas` : ''}{lleno ? ' · día completo' : ''}
                  </span>
                </div>
                <ul className="space-y-2">
                  {g.items.map((e) => <Tarjeta key={e.id} enc={e} datos={datos} onAbrir={onAbrir} />)}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Tarjeta({ enc, datos, onAbrir }) {
  const c = calcular(enc, datos)
  const f = foto(enc, datos)
  const alerta = enc.estado !== 'cancelado' && enc.servicios.length > 0 && c.margenPct < MARGEN_ALERTA
  return (
    <li>
      <button onClick={() => onAbrir(enc.id)} className="tarjeta block w-full px-3 py-2.5 text-left hover:border-rosa">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold">
              <span className="tab mr-2 font-normal text-gris">{enc.hora || '--:--'}</span>
              {enc.clienta || 'Sin nombre'}
              {esPrueba(enc, f) && <span className="ml-2 text-xs font-normal text-gris">prueba</span>}
            </p>
            <p className="truncate text-sm text-gris">{resumenServicios(enc, f)}</p>
            <p className="flex items-center gap-1 truncate text-xs text-gris"><MapPin size={12} strokeWidth={1.75} className="shrink-0" aria-hidden="true" /><span className="truncate">{enc.lugar || f.zonaNombre}</span></p>
          </div>
          <div className="shrink-0 text-right">
            <p className="num font-bold text-bordo">{pesos(c.precioFinal)}</p>
            <p className={`num text-xs ${alerta ? 'font-bold text-alerta' : 'text-gris'}`}>margen {pct(c.margenPct)}</p>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <EstadoBadge estado={enc.estado} />
          {alerta && <Etiqueta>Margen bajo</Etiqueta>}
          {enc.estado === 'cancelado' && enc.senaRetenida > 0 && <Etiqueta tono="gris">Seña retenida {pesos(enc.senaRetenida)}</Etiqueta>}
        </div>
      </button>
    </li>
  )
}
