import { useState } from 'react'
import { foto, productos } from '../lib/calc.js'
import { dec, fechaLarga, hoyISO, unidadTxt } from '../lib/format.js'
import { aplicarAccion, ocupa } from '../lib/rules.js'
import { useStore } from '../state.jsx'
import { Confirmar, EstadoBadge, Titulo, Vacio } from '../components/ui.jsx'
import { Check, Clock, Package } from 'lucide-react'

// Vista de la asistente: sin precios, costos, márgenes ni métricas. Puede marcar Realizado.
export default function AgendaAsistente() {
  const { datos, commit, avisar } = useStore()
  const [verPasados, setVerPasados] = useState(false)
  const [realizando, setRealizando] = useState(null)

  const marcarRealizado = (enc) => {
    setRealizando(null)
    const r = aplicarAccion('realizar', enc, { datos, hoy: hoyISO() })
    if (!r.ok) return avisar(r.motivo, 'error')
    const g = commit((d) => ({
      ...d,
      insumos: r.insumos || d.insumos,
      encargos: d.encargos.map((e) => (e.id === enc.id ? r.encargo : e)),
    }))
    if (!g.ok) return avisar(g.motivo, 'error')
    avisar('Marcado como realizado. Descontamos los productos del stock.')
  }
  const hoy = hoyISO()
  const asignados = datos.encargos
    .filter((e) => ocupa(e) && Number(e.asistenteHoras) > 0 && (verPasados ? e.fecha < hoy : e.fecha >= hoy))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora) * (verPasados ? -1 : 1))

  return (
    <section>
      <Titulo sub="Encargos donde te toca asistir">Tus encargos</Titulo>
      <div className="mb-4 flex gap-1">
        {[false, true].map((v) => (
          <button key={String(v)} onClick={() => setVerPasados(v)}
            className={`rounded-full border px-3 py-1 text-sm ${verPasados === v ? 'border-bordo bg-bordo text-crema' : 'border-linea bg-white text-gris'}`}>
            {v ? 'Pasados' : 'Próximos'}
          </button>
        ))}
      </div>
      {asignados.length === 0 ? (
        <Vacio titulo={verPasados ? 'No hay encargos pasados' : 'No tenés encargos asignados'} texto="Cuando la titular te asigne horas en un encargo señado, lo vas a ver acá." />
      ) : (
        <ul className="space-y-3">
          {asignados.map((e) => {
            const f = foto(e, datos)
            const prods = productos(e, datos)
            return (
              <li key={e.id} className="tarjeta p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-titulo text-lg font-semibold first-letter:uppercase">{fechaLarga(e.fecha)}</p>
                    <p className="flex items-center gap-1 text-sm"><Clock size={14} strokeWidth={1.75} aria-hidden="true" /><span className="tab font-bold">{e.hora}</span> · {e.asistenteHoras} h de asistencia</p>
                  </div>
                  <EstadoBadge estado={e.estado} />
                </div>
                <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-gris">Clienta</dt><dd>{e.clienta}</dd>
                  <dt className="text-gris">Lugar</dt><dd>{e.lugar || '—'} <span className="text-gris">({f.zonaNombre})</span></dd>
                  <dt className="text-gris">Servicios</dt>
                  <dd>{e.servicios.map((l) => `${l.personas} × ${f.servicios[l.servicioId]?.nombre}`).join(', ')}</dd>
                  {e.notasPiel && (<><dt className="text-gris">Piel</dt><dd>{e.notasPiel}</dd></>)}
                </dl>
                <details className="mt-3">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-bold text-bordo"><Package size={16} strokeWidth={1.75} aria-hidden="true" />Lista de productos ({prods.length})</summary>
                  <ul className="mt-2 divide-y divide-linea text-sm">
                    {prods.map((p) => (
                      <li key={p.insumoId} className="flex justify-between py-1">
                        <span>{p.nombre}</span>
                        <span className="num text-gris">{dec(p.cantidad)} {unidadTxt(p.unidad, p.cantidad)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
                {e.estado === 'confirmado' && (
                  <button className="btn-secundario mt-4 w-full" onClick={() => setRealizando(e)}>
                    <Check size={16} strokeWidth={1.75} aria-hidden="true" />Marcar Realizado
                  </button>
                )}
                {['senado', 'prueba_hecha'].includes(e.estado) && (
                  <p className="mt-3 text-xs text-gris">Vas a poder marcarlo como realizado cuando la titular lo confirme.</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {realizando && (
        <Confirmar titulo="¿Marcás este encargo como realizado?"
          texto={`${realizando.clienta}, ${fechaLarga(realizando.fecha)}. Se descuentan del stock los productos de la lista. No se puede deshacer.`}
          si="Sí, marcar realizado" no="Volver"
          onSi={() => marcarRealizado(realizando)} onNo={() => setRealizando(null)} />
      )}
    </section>
  )
}
