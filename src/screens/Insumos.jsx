import { useState } from 'react'
import { aplicarCompra, bajoMinimo, costoUso } from '../lib/calc.js'
import { dec, nuevoId, pesos, unidadTxt } from '../lib/format.js'
import { permisos, useStore } from '../state.jsx'
import { Campo, Etiqueta, Modal, NumInput, Titulo, Vacio } from '../components/ui.jsx'
import { Plus, ShoppingBag } from 'lucide-react'

export default function Insumos() {
  const { datos, commit, avisar, rol } = useStore()
  const p = permisos(rol)
  const [compra, setCompra] = useState(null)
  const [edicion, setEdicion] = useState(null)
  const [soloReponer, setSoloReponer] = useState(false)

  const lista = datos.insumos.filter((i) => !soloReponer || bajoMinimo(i))
  const nBajos = datos.insumos.filter(bajoMinimo).length
  const sinSenar = datos.encargos.filter((e) => !e.recetaCongelada && !['cancelado', 'cobrado'].includes(e.estado)).length

  const registrar = () => {
    const ins = datos.insumos.find((i) => i.id === compra.insumoId)
    if (!(compra.unidades > 0)) return avisar('Indicá cuántos envases compraste.', 'error')
    if (!(compra.costo > 0)) return avisar('Indicá el costo por envase.', 'error')
    const nuevo = aplicarCompra(ins, compra.unidades, compra.costo)
    const r = commit((d) => ({ ...d, insumos: d.insumos.map((i) => (i.id === ins.id ? nuevo : i)) }))
    if (!r.ok) return avisar(r.motivo, 'error') // el modal queda abierto con lo escrito
    setCompra(null)
    avisar(`Compra registrada. Costo promedio de ${ins.nombre}: ${pesos(nuevo.precioEnvase)} por envase.`)
  }

  const guardarInsumo = (i) => {
    if (!i.nombre.trim() || !(i.contenido > 0)) return avisar('Completá nombre y contenido del envase.', 'error')
    const { nuevo, ...ins } = i
    const r = commit((d) => ({ ...d, insumos: nuevo ? [...d.insumos, ins] : d.insumos.map((x) => (x.id === ins.id ? ins : x)) }))
    if (!r.ok) return avisar(r.motivo, 'error')
    setEdicion(null)
    avisar('Insumo guardado.')
  }

  return (
    <section>
      <Titulo sub="Stock en envases y costo promedio"
        accion={p.registrarCompra && datos.insumos.length > 0 && (
          <button className="btn-primario shrink-0" onClick={() => setCompra({ insumoId: datos.insumos[0].id, unidades: 1, costo: Math.round(datos.insumos[0].precioEnvase) })}><ShoppingBag size={16} strokeWidth={1.75} aria-hidden="true" />Registrar compra</button>
        )}>
        Insumos
      </Titulo>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-bordo" checked={soloReponer} onChange={(e) => setSoloReponer(e.target.checked)} />
          Ver solo los que hay que reponer ({nBajos})
        </label>
        {p.editarCatalogo && (
          <button className="btn-suave text-bordo" onClick={() => setEdicion({ id: nuevoId('ins'), nombre: '', unidad: 'ml', precioEnvase: 0, contenido: 0, dosisNovia: 0, stockEnvases: 0, minimo: 1, nuevo: true })}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />Nuevo insumo
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <Vacio titulo={soloReponer ? 'No hay nada para reponer' : 'No hay insumos cargados'} texto={soloReponer ? 'Todo está por encima del mínimo.' : 'Cargá tus productos para calcular costos por servicio.'} />
      ) : (
        <ul className="space-y-2">
          {lista.map((i) => (
            <li key={i.id} className={`tarjeta px-4 py-3 ${bajoMinimo(i) ? 'border-alerta/50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{i.nombre} {bajoMinimo(i) && <Etiqueta>Reponer</Etiqueta>}</p>
                  <p className="text-xs text-gris tab">Envase de {dec(i.contenido)} {unidadTxt(i.unidad, i.contenido)} · {pesos(costoUso(i))} por {i.unidad}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num font-bold text-bordo">{pesos(i.precioEnvase)}</p>
                  <p className="num text-xs text-gris">promedio por envase</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className={`tab ${bajoMinimo(i) ? 'font-bold text-alerta' : ''}`}>
                  Stock: {dec(i.stockEnvases)} envases <span className="font-normal text-gris">(mínimo {dec(i.minimo)})</span>
                </span>
                <span className="flex gap-3">
                  {p.registrarCompra && <button className="text-bordo underline" onClick={() => setCompra({ insumoId: i.id, unidades: 1, costo: Math.round(i.precioEnvase) })}>Comprar</button>}
                  {p.editarCatalogo && <button className="text-gris underline" onClick={() => setEdicion({ ...i })}>Editar</button>}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {compra && (() => {
        const ins = datos.insumos.find((x) => x.id === compra.insumoId)
        const prev = aplicarCompra(ins, compra.unidades || 0, compra.costo || 0)
        return (
          <Modal titulo="Registrar compra" onCerrar={() => setCompra(null)} pie={<>
            <button className="btn-suave" onClick={() => setCompra(null)}>Cancelar</button>
            <button className="btn-primario" onClick={registrar}>Guardar compra</button>
          </>}>
            <div className="space-y-3">
              <Campo etiqueta="Insumo">
                <select className="campo" value={compra.insumoId} onChange={(e) => {
                  const n = datos.insumos.find((x) => x.id === e.target.value)
                  setCompra({ insumoId: n.id, unidades: compra.unidades, costo: Math.round(n.precioEnvase) })
                }}>
                  {datos.insumos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Envases"><NumInput step={1} value={compra.unidades} onChange={(n) => setCompra((c) => ({ ...c, unidades: n }))} /></Campo>
                <Campo etiqueta="Costo por envase"><NumInput step={1000} value={compra.costo} onChange={(n) => setCompra((c) => ({ ...c, costo: n }))} /></Campo>
              </div>
              <div className="rounded-md bg-white p-3 text-sm">
                <div className="flex justify-between"><span className="text-gris">Stock</span><span className="num">{dec(ins.stockEnvases)} → {dec(prev.stockEnvases)}</span></div>
                <div className="flex justify-between"><span className="text-gris">Costo promedio</span><span className="num">{pesos(ins.precioEnvase)} → <b className="text-bordo">{pesos(prev.precioEnvase)}</b></span></div>
                <div className="flex justify-between"><span className="text-gris">Costo por uso</span><span className="num">{pesos(costoUso(ins))} → {pesos(costoUso(prev))}</span></div>
              </div>
              <p className="text-xs text-gris">Se actualizan {sinSenar === 1 ? '1 presupuesto sin señar' : `${sinSenar} presupuestos sin señar`}. Los señados mantienen sus costos.</p>
            </div>
          </Modal>
        )
      })()}

      {edicion && (
        <Modal titulo={edicion.nuevo ? 'Nuevo insumo' : 'Editar insumo'} onCerrar={() => setEdicion(null)} pie={<>
          <button className="btn-suave" onClick={() => setEdicion(null)}>Cancelar</button>
          <button className="btn-primario" onClick={() => guardarInsumo(edicion)}>Guardar</button>
        </>}>
          <div className="space-y-3">
            <Campo etiqueta="Nombre"><input className="campo" value={edicion.nombre} onChange={(e) => setEdicion((x) => ({ ...x, nombre: e.target.value }))} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Contenido del envase"><NumInput value={edicion.contenido} onChange={(n) => setEdicion((x) => ({ ...x, contenido: n }))} /></Campo>
              <Campo etiqueta="Unidad">
                <select className="campo" value={edicion.unidad} onChange={(e) => setEdicion((x) => ({ ...x, unidad: e.target.value }))}>
                  {['ml', 'g', 'uso', 'par', 'unidad'].map((u) => <option key={u}>{u}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Precio por envase"><NumInput step={1000} value={edicion.precioEnvase} onChange={(n) => setEdicion((x) => ({ ...x, precioEnvase: n }))} /></Campo>
              <Campo etiqueta="Dosis novia"><NumInput step={0.05} value={edicion.dosisNovia} onChange={(n) => setEdicion((x) => ({ ...x, dosisNovia: n }))} /></Campo>
              <Campo etiqueta="Stock (envases)"><NumInput step={0.1} value={edicion.stockEnvases} onChange={(n) => setEdicion((x) => ({ ...x, stockEnvases: n }))} /></Campo>
              <Campo etiqueta="Mínimo (envases)"><NumInput step={0.5} value={edicion.minimo} onChange={(n) => setEdicion((x) => ({ ...x, minimo: n }))} /></Campo>
            </div>
            <p className="text-xs text-gris">La dosis por servicio se define en Recetas. Para cargar una compra usá «Registrar compra», así se recalcula el costo promedio.</p>
          </div>
        </Modal>
      )}
    </section>
  )
}
