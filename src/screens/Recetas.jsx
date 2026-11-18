import { useState } from 'react'
import { costoUso } from '../lib/calc.js'
import { dec, pct, pesos, unidadTxt } from '../lib/format.js'
import { permisos, useStore } from '../state.jsx'
import { Confirmar, NumInput, Titulo, Vacio } from '../components/ui.jsx'

export default function Recetas() {
  const { datos, commit, avisar, rol } = useStore()
  const puede = permisos(rol).editarCatalogo
  const [sel, setSel] = useState(datos.servicios[0]?.id)
  const [draft, setDraft] = useState(null) // receta en edición
  const [pendiente, setPendiente] = useState(null) // servicio al que se quiere pasar con cambios sin guardar
  const servicio = datos.servicios.find((s) => s.id === sel)

  if (!datos.servicios.length) return <section><Titulo>Recetas</Titulo><Vacio titulo="No hay servicios" texto="Cargá servicios en el catálogo para armar sus recetas." /></section>
  if (!datos.insumos.length) return <section><Titulo>Recetas</Titulo><Vacio titulo="No hay insumos" texto="Cargá insumos para poder definir dosis." /></section>

  const receta = draft || datos.recetas[sel] || {}
  const filas = datos.insumos.map((i) => ({ ins: i, dosis: receta[i.id] || 0, cu: costoUso(i) }))
  const total = filas.reduce((a, f) => a + f.dosis * f.cu, 0)
  const usados = filas.filter((f) => f.dosis > 0).length

  const elegir = (id) => {
    if (draft && id !== sel) return setPendiente(id)
    setDraft(null); setSel(id)
  }
  const guardar = () => {
    const limpia = Object.fromEntries(Object.entries(draft).filter(([, v]) => v > 0))
    const r = commit((d) => ({ ...d, recetas: { ...d.recetas, [sel]: limpia } }))
    if (!r.ok) return avisar(r.motivo, 'error')
    setDraft(null)
    avisar('Receta guardada. Los presupuestos sin señar ya la usan.')
  }

  return (
    <section>
      <Titulo sub={puede ? 'Dosis por persona de cada insumo' : 'Solo lectura: la titular edita las recetas'}>Recetas</Titulo>
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {datos.servicios.map((s) => (
          <button key={s.id} onClick={() => elegir(s.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${sel === s.id ? 'border-bordo bg-bordo text-crema' : 'border-linea bg-white text-gris'}`}>
            {s.nombre}
          </button>
        ))}
      </div>
      {servicio && (
        <div className="tarjeta p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-titulo text-xl font-semibold">{servicio.nombre}</h2>
            <p className="text-sm text-gris tab">{usados} insumos</p>
          </div>
          {usados === 0 && !puede && <p className="mb-3 text-sm text-gris">Esta receta todavía no tiene insumos.</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linea text-left text-xs uppercase tracking-wide text-gris">
                <th className="py-1.5 font-medium">Insumo</th>
                <th className="py-1.5 text-right font-medium">Dosis</th>
                <th className="py-1.5 text-right font-medium">Costo</th>
              </tr>
            </thead>
            <tbody>
              {filas.filter((f) => puede || f.dosis > 0).map(({ ins, dosis, cu }) => (
                <tr key={ins.id} className={`border-b border-linea/60 ${dosis ? '' : 'text-gris'}`}>
                  <td className="py-1.5 pr-2">
                    {ins.nombre}
                    <span className="block text-xs text-gris tab">{pesos(cu)} por {ins.unidad}</span>
                  </td>
                  <td className="py-1.5 text-right">
                    {puede ? (
                      <span className="inline-flex items-center gap-1">
                        <NumInput aria-label={`Dosis de ${ins.nombre}`} className="campo num w-20 px-2 py-1" step={0.05} value={dosis}
                          onChange={(n) => setDraft({ ...receta, [ins.id]: n })} />
                        <span className="w-9 text-left text-xs text-gris">{ins.unidad}</span>
                      </span>
                    ) : (
                      <span className="tab">{dec(dosis)} {unidadTxt(ins.unidad, dosis)}</span>
                    )}
                  </td>
                  <td className="num py-1.5 pl-2">{pesos(dosis * cu)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2 font-bold" colSpan={2}>Costo de insumos por persona</td>
                <td className="num pt-2 font-bold text-bordo">{pesos(total)}</td>
              </tr>
              <tr>
                <td className="text-xs text-gris" colSpan={2}>Sobre el precio de lista ({pesos(servicio.precio)})</td>
                <td className="num text-xs text-gris">{servicio.precio ? pct(total / servicio.precio) : '—'}</td>
              </tr>
            </tfoot>
          </table>
          {puede && draft && (
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-suave" onClick={() => setDraft(null)}>Descartar</button>
              <button className="btn-primario" onClick={guardar}>Guardar receta</button>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-gris">Los encargos señados conservan la receta que tenían al señar.</p>
      {pendiente && (
        <Confirmar titulo="Tenés cambios sin guardar" texto="Si cambiás de servicio, se pierden las dosis que modificaste en esta receta."
          si="Descartar cambios" no="Seguir editando" peligro
          onSi={() => { setDraft(null); setSel(pendiente); setPendiente(null) }} onNo={() => setPendiente(null)} />
      )}
    </section>
  )
}
