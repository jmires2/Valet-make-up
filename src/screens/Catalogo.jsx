import { useState } from 'react'
import { nuevoId, pesos } from '../lib/format.js'
import { permisos, useStore } from '../state.jsx'
import { Campo, Confirmar, NumInput, Titulo, Vacio } from '../components/ui.jsx'
import { Plus } from 'lucide-react'

const TIPOS = { novia: 'Novia (cuenta como casamiento)', prueba: 'Prueba previa (lun–jue)', otro: 'Otro' }

export default function Catalogo() {
  const { datos, commit, avisar, rol } = useStore()
  const puede = permisos(rol).editarCatalogo
  const [editando, setEditando] = useState(null)
  const [borrar, setBorrar] = useState(null)

  const guardar = (s) => {
    if (!s.nombre.trim()) return avisar('Poné un nombre al servicio.', 'error')
    const r = commit((d) => ({
      ...d,
      servicios: d.servicios.some((x) => x.id === s.id) ? d.servicios.map((x) => (x.id === s.id ? s : x)) : [...d.servicios, s],
      recetas: d.recetas[s.id] ? d.recetas : { ...d.recetas, [s.id]: {} },
    }))
    if (!r.ok) return avisar(r.motivo, 'error')
    avisar('Servicio guardado. Los presupuestos sin señar ya usan el precio nuevo.')
    setEditando(null)
  }
  const enUso = (id) => datos.encargos.some((e) => e.servicios.some((l) => l.servicioId === id))
  const eliminar = (id) => {
    const r = commit((d) => {
      const { [id]: _, ...recetas } = d.recetas
      return { ...d, servicios: d.servicios.filter((s) => s.id !== id), recetas }
    })
    setBorrar(null)
    if (!r.ok) return avisar(r.motivo, 'error')
    avisar('Servicio eliminado.')
  }

  return (
    <section>
      <Titulo sub={puede ? 'Precios y tiempos de cada servicio' : 'Solo lectura: la titular edita el catálogo'}
        accion={puede && <button className="btn-primario shrink-0" onClick={() => setEditando({ id: nuevoId('srv'), tipo: 'otro', nombre: '', duracion: 60, precio: 0, requiereAsistente: 0, soloDiasSemana: false, descuentoConfirmacion: 0, nuevo: true })}><Plus size={16} strokeWidth={1.75} aria-hidden="true" />Nuevo servicio</button>}>
        Servicios
      </Titulo>
      {datos.servicios.length === 0 ? (
        <Vacio titulo="No hay servicios cargados" texto={puede ? 'Creá el primero para poder presupuestar.' : 'Pedile a la titular que cargue el catálogo.'} />
      ) : (
        <ul className="space-y-2">
          {datos.servicios.map((s) => (
            <li key={s.id} className="tarjeta px-4 py-3">
              {editando?.id === s.id ? (
                <Editor s={editando} setS={setEditando} onGuardar={guardar} onCancelar={() => setEditando(null)} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{s.nombre}</p>
                    <p className="text-sm text-gris tab">
                      {s.duracion} min{s.requiereAsistente ? ` · asistente ${s.requiereAsistente} h` : ''}{s.soloDiasSemana ? ' · solo lun–jue' : ''}{s.descuentoConfirmacion ? ` · −${s.descuentoConfirmacion} % al confirmar` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num font-bold text-bordo">{pesos(s.precio)}</p>
                    {puede && (
                      <div className="mt-1 flex justify-end gap-1">
                        <button className="text-sm text-bordo underline" onClick={() => setEditando({ ...s })}>Editar</button>
                        {!enUso(s.id) && <button className="ml-2 text-sm text-gris underline" onClick={() => setBorrar(s)}>Eliminar</button>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editando?.nuevo && (
        <div className="tarjeta mt-2 px-4 py-3"><Editor s={editando} setS={setEditando} onGuardar={({ nuevo, ...s }) => guardar(s)} onCancelar={() => setEditando(null)} /></div>
      )}
      {borrar && <Confirmar titulo={`¿Eliminás «${borrar.nombre}»?`} texto="También se borra su receta. No está usado en ningún encargo." si="Eliminar" peligro onSi={() => eliminar(borrar.id)} onNo={() => setBorrar(null)} />}
    </section>
  )
}

function Editor({ s, setS, onGuardar, onCancelar }) {
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }))
  return (
    <div className="space-y-3">
      <Campo etiqueta="Nombre"><input className="campo" value={s.nombre} onChange={(e) => set('nombre', e.target.value)} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Precio (ARS)"><NumInput step={1000} value={s.precio} onChange={(n) => set('precio', n)} /></Campo>
        <Campo etiqueta="Duración (min)"><NumInput step={5} value={s.duracion} onChange={(n) => set('duracion', n)} /></Campo>
        <Campo etiqueta="Asistente (h)"><NumInput step={0.5} value={s.requiereAsistente} onChange={(n) => set('requiereAsistente', n)} /></Campo>
        <Campo etiqueta="Desc. al confirmar (%)"><NumInput step={5} value={s.descuentoConfirmacion} onChange={(n) => set('descuentoConfirmacion', Math.min(100, n))} /></Campo>
      </div>
      <Campo etiqueta="Tipo">
        <select className="campo" value={s.tipo} onChange={(e) => set('tipo', e.target.value)}>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Campo>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-bordo" checked={s.soloDiasSemana} onChange={(e) => set('soloDiasSemana', e.target.checked)} />
        Solo días de semana (lunes a jueves, 10 a 18 h)
      </label>
      <div className="flex justify-end gap-2">
        <button className="btn-suave" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primario" onClick={() => onGuardar(s)}>Guardar</button>
      </div>
    </div>
  )
}
