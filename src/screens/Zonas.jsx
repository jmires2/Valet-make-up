import { useState } from 'react'
import { nuevoId, pesos } from '../lib/format.js'
import { permisos, useStore } from '../state.jsx'
import { Campo, NumInput, Titulo, Vacio } from '../components/ui.jsx'
import { Plus } from 'lucide-react'

export default function Zonas() {
  const { datos, commit, avisar, rol } = useStore()
  const puede = permisos(rol).editarCatalogo
  const [ed, setEd] = useState(null)

  const guardar = () => {
    if (!ed.nombre.trim()) return avisar('Poné un nombre a la zona.', 'error')
    const { nueva, ...z } = ed
    const r = commit((d) => ({ ...d, zonas: nueva ? [...d.zonas, z] : d.zonas.map((x) => (x.id === z.id ? z : x)) }))
    if (!r.ok) return avisar(r.motivo, 'error')
    setEd(null)
    avisar('Zona guardada. Los presupuestos sin señar ya usan este traslado.')
  }

  return (
    <section>
      <Titulo sub={puede ? 'Precio del traslado según la zona' : 'Solo lectura'}
        accion={puede && <button className="btn-primario shrink-0" onClick={() => setEd({ id: nuevoId('zona'), nombre: '', precio: 0, nueva: true })}><Plus size={16} strokeWidth={1.75} aria-hidden="true" />Nueva zona</button>}>
        Zonas de traslado
      </Titulo>
      {datos.zonas.length === 0 && !ed ? (
        <Vacio titulo="No hay zonas" texto="Sin zonas, todos los encargos se cotizan sin traslado." />
      ) : (
        <ul className="space-y-2">
          {[...datos.zonas, ...(ed?.nueva ? [ed] : [])].map((z) => (
            <li key={z.id} className="tarjeta px-4 py-3">
              {ed?.id === z.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr,8rem] gap-3">
                    <Campo etiqueta="Zona"><input className="campo" value={ed.nombre} onChange={(e) => setEd({ ...ed, nombre: e.target.value })} /></Campo>
                    <Campo etiqueta="Traslado"><NumInput step={1000} value={ed.precio} onChange={(n) => setEd({ ...ed, precio: n })} /></Campo>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="btn-suave" onClick={() => setEd(null)}>Cancelar</button>
                    <button className="btn-primario" onClick={guardar}>Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">{z.nombre}</span>
                  <span className="flex items-center gap-3">
                    <span className="num font-bold text-bordo">{pesos(z.precio)}</span>
                    {puede && <button className="text-sm text-bordo underline" onClick={() => setEd({ ...z })}>Editar</button>}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-gris">El traslado se cobra a precio de costo y nunca lleva el recargo de temporada.</p>
    </section>
  )
}
