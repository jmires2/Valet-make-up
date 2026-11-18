import { useMemo, useState } from 'react'
import { COSTO_HORA_ASISTENTE, MARGEN_ALERTA } from '../config.js'
import { calcular, tieneNovia } from '../lib/calc.js'
import { dec, fechaLarga, hoyISO, nuevoId, pct, pesos } from '../lib/format.js'
import { ACCIONES, aplicarAccion, cupoDelDia, ESTADOS, resultadoCancelacion, validarCupo, validarFicha } from '../lib/rules.js'
import { useStore } from '../state.jsx'
import { Campo, Confirmar, EstadoBadge, Fila, NumInput } from '../components/ui.jsx'
import { AlertTriangle, ArrowLeft, Banknote, CalendarCheck, Check, CircleCheck, FileText, Lock, Plus, Save, Trash2, Wallet, X } from 'lucide-react'

const ICONOS = { presupuestar: FileText, senar: Wallet, prueba: CircleCheck, confirmar: CalendarCheck, realizar: Check, cobrar: Banknote, cancelar: X }

const nuevoEncargo = () => ({
  id: nuevoId('enc'), clienta: '', telefono: '', fecha: '', hora: '', lugar: '', zonaId: 'caba', servicios: [],
  asistenteHoras: 0, sena: 0, pagosSaldo: 0, notasPiel: '', estado: 'consulta', descuentoConfirmado: false,
  pruebaHecha: false, senadoEn: null, recetaCongelada: null, stockDescontado: false, senaRetenida: 0, senaDevuelta: 0,
  creadoEn: hoyISO(),
})

export default function Ficha({ encargoId, onVolver, onAbrir }) {
  const { datos, commit, avisar } = useStore()
  const original = datos.encargos.find((e) => e.id === encargoId)
  const [draft, setDraft] = useState(() => (original ? structuredClone(original) : nuevoEncargo()))
  const [mensaje, setMensaje] = useState(null)
  const [confirmando, setConfirmando] = useState(null)
  const [salir, setSalir] = useState(false)
  const [nuevoServ, setNuevoServ] = useState({ servicioId: datos.servicios[0]?.id || '', personas: 1 })

  const esNuevo = !original
  const sucio = esNuevo ? draft.clienta || draft.servicios.length || draft.fecha : JSON.stringify(draft) !== JSON.stringify(original)
  const cerrado = ['cobrado', 'cancelado'].includes(draft.estado)
  const congelado = !!draft.recetaCongelada || cerrado
  const c = useMemo(() => calcular(draft, datos), [draft, datos])
  const set = (k, v) => { setDraft((d) => ({ ...d, [k]: v })); setMensaje(null) }

  const hayDescuento = draft.servicios.some((l) => (c.foto.servicios[l.servicioId]?.descuentoConfirmacion || 0) > 0)
  const horasRequeridas = draft.servicios.reduce((a, l) => {
    const s = datos.servicios.find((x) => x.id === l.servicioId)
    return Math.max(a, s?.requiereAsistente || 0)
  }, 0)

  const agregarServicio = () => {
    const s = datos.servicios.find((x) => x.id === nuevoServ.servicioId)
    const n = Math.max(1, Math.round(nuevoServ.personas || 1))
    if (!s) return
    setDraft((d) => {
      const existe = d.servicios.find((l) => l.servicioId === s.id)
      const servicios = existe
        ? d.servicios.map((l) => (l === existe ? { ...l, personas: l.personas + n } : l))
        : [...d.servicios, { id: nuevoId('l'), servicioId: s.id, personas: n }]
      return { ...d, servicios, asistenteHoras: Math.max(Number(d.asistenteHoras) || 0, s.requiereAsistente || 0) }
    })
    setNuevoServ((v) => ({ ...v, personas: 1 }))
    setMensaje(null)
  }
  const cambiarLinea = (id, personas) => set('servicios', draft.servicios.map((l) => (l.id === id ? { ...l, personas } : l)))
  const quitarLinea = (id) => set('servicios', draft.servicios.filter((l) => l.id !== id))

  const persistir = (enc, insumos, exito) => {
    const r = commit((d) => {
      const existe = d.encargos.some((e) => e.id === enc.id)
      return {
        ...d,
        insumos: insumos || d.insumos,
        encargos: existe ? d.encargos.map((e) => (e.id === enc.id ? enc : e)) : [...d.encargos, enc],
      }
    })
    if (!r.ok) { setMensaje({ tipo: 'error', texto: r.motivo }); avisar(r.motivo, 'error'); return false }
    setDraft(structuredClone(enc))
    setMensaje({ tipo: 'ok', texto: exito })
    avisar(exito)
    if (esNuevo) onAbrir(enc.id)
    return true
  }

  const guardar = () => {
    const v = validarFicha(draft, datos)
    if (!v.ok) return setMensaje({ tipo: 'error', texto: v.motivo })
    persistir(draft, null, 'Guardado.')
  }

  const ejecutar = (accion) => {
    if (accion === 'cancelar') return setConfirmando('cancelar')
    const r = aplicarAccion(accion, draft, { datos, hoy: hoyISO() })
    if (!r.ok) return setMensaje({ tipo: 'error', texto: r.motivo })
    const textos = {
      presupuestar: 'Presupuesto listo.',
      senar: 'Señado: la fecha quedó reservada y la receta congelada.',
      prueba: 'Prueba hecha.',
      confirmar: 'Encargo confirmado.',
      realizar: 'Marcado como realizado. ' + (r.aviso || ''),
      cobrar: 'Cobrado. ¡Listo!',
    }
    persistir(r.encargo, r.insumos, textos[accion])
  }

  const cancelar = () => {
    const r = aplicarAccion('cancelar', draft, { datos, hoy: hoyISO() })
    setConfirmando(null)
    if (r.ok) persistir(r.encargo, null, 'Encargo cancelado. La fecha quedó libre.')
  }

  const novia = tieneNovia(draft, c.foto)
  const margenBajo = c.precioFinal > 0 && c.margenPct < MARGEN_ALERTA
  // Aviso al elegir la fecha: si el día ya está completo, el formulario lo rechaza al señar.
  const avisoFecha = (() => {
    if (congelado || !draft.fecha) return null
    if (draft.servicios.length) {
      const v = validarCupo(draft, datos.encargos, datos)
      return v.ok ? null : v.motivo
    }
    const cupo = cupoDelDia(draft.fecha, datos.encargos, datos, draft.id)
    return cupo.eventos >= cupo.maxEventos ? 'Ese día ya está completo: elegí otra fecha.' : null
  })()

  return (
    <section>
      <button className="btn-suave -ml-3 mb-2" onClick={() => (sucio ? setSalir(true) : onVolver())}><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />Agenda</button>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="titulo">{esNuevo ? 'Nuevo encargo' : draft.clienta || 'Encargo'}</h1>
        <EstadoBadge estado={draft.estado} />
      </div>

      {congelado && draft.recetaCongelada && (
        <p className="mb-4 flex gap-2 rounded-md border border-rosa bg-rosa-claro px-3 py-2 text-sm text-bordo">
          <Lock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Receta, precios y costos congelados al señar{draft.senadoEn ? ` el ${fechaLarga(draft.senadoEn)}` : ''}. Las compras nuevas de insumos no cambian este encargo.</span>
        </p>
      )}
      {draft.estado === 'cancelado' && (
        <p className="mb-4 rounded-md border border-linea bg-white px-3 py-2 text-sm">
          Cancelado{draft.canceladoEn ? ` el ${fechaLarga(draft.canceladoEn)}` : ''}.{' '}
          {draft.senaRetenida > 0 ? `Retuviste la seña de ${pesos(draft.senaRetenida)} (cuenta como ingreso).` : draft.senaDevuelta > 0 ? `Se devolvió la seña de ${pesos(draft.senaDevuelta)}.` : 'Sin seña cobrada.'}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-[1fr,minmax(0,320px)]">
        <div className="space-y-5">
          {/* Datos de la clienta y del evento */}
          <fieldset className="tarjeta space-y-3 p-4">
            <legend className="sr-only">Datos del encargo</legend>
            <Campo etiqueta="Clienta">
              <input className="campo" value={draft.clienta} disabled={cerrado} onChange={(e) => set('clienta', e.target.value)} placeholder="Nombre y apellido" />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input className="campo tab" inputMode="tel" value={draft.telefono} disabled={cerrado} onChange={(e) => set('telefono', e.target.value)} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Fecha">
                <input type="date" className="campo tab" value={draft.fecha} disabled={congelado} onChange={(e) => set('fecha', e.target.value)} />
              </Campo>
              <Campo etiqueta="Hora">
                <input type="time" className="campo tab" value={draft.hora} disabled={congelado} onChange={(e) => set('hora', e.target.value)} />
              </Campo>
            </div>
            {avisoFecha && (
              <p role="alert" className="flex gap-2 rounded-md border border-alerta/50 bg-[#FDF0E8] px-3 py-2 text-sm text-alerta">
                <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{avisoFecha}</span>
              </p>
            )}
            <Campo etiqueta="Lugar">
              <input className="campo" value={draft.lugar} disabled={cerrado} onChange={(e) => set('lugar', e.target.value)} placeholder="Salón, casa o dirección" />
            </Campo>
            <Campo etiqueta="Zona de traslado">
              <select className="campo" value={draft.zonaId} disabled={congelado} onChange={(e) => set('zonaId', e.target.value)}>
                <option value="">Sin traslado (en el atelier)</option>
                {datos.zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre} · {pesos(z.precio)}</option>)}
              </select>
            </Campo>
          </fieldset>

          {/* Servicios */}
          <fieldset className="tarjeta p-4">
            <legend className="sr-only">Servicios</legend>
            <h2 className="mb-2 font-titulo text-xl font-semibold">Servicios y personas</h2>
            {draft.servicios.length === 0 ? (
              <p className="rounded-md border border-dashed border-linea px-3 py-4 text-center text-sm text-gris">
                Todavía no agregaste servicios. Elegí uno abajo y la cuenta se arma sola.
              </p>
            ) : (
              <ul className="divide-y divide-linea">
                {c.lineas.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px]">{l.nombre}</p>
                      <p className="text-xs text-gris tab">
                        {pesos(l.precioUnit)} por persona{l.descuento ? ` (−${Math.round(l.descuento * 100)} %)` : ''}
                      </p>
                    </div>
                    <NumInput aria-label={`Personas para ${l.nombre}`} className="campo num w-16 px-2" min={1} step={1} value={l.personas} disabled={congelado} onChange={(n) => cambiarLinea(l.id, n)} />
                    {!congelado && <button className="btn-suave px-2 text-xs" onClick={() => quitarLinea(l.id)} aria-label={`Quitar ${l.nombre}`}><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" /></button>}
                  </li>
                ))}
              </ul>
            )}
            {!congelado && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-linea pt-3">
                <Campo etiqueta="Servicio" className="min-w-[160px] flex-1">
                  <select className="campo" value={nuevoServ.servicioId} onChange={(e) => setNuevoServ((v) => ({ ...v, servicioId: e.target.value }))}>
                    {datos.servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Personas" className="w-20">
                  <NumInput min={1} step={1} value={nuevoServ.personas} onChange={(n) => setNuevoServ((v) => ({ ...v, personas: n }))} />
                </Campo>
                <button className="btn-secundario" onClick={agregarServicio} disabled={!datos.servicios.length}><Plus size={16} strokeWidth={1.75} aria-hidden="true" />Agregar servicio</button>
              </div>
            )}
            {hayDescuento && (
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 accent-bordo" checked={!!draft.descuentoConfirmado} disabled={congelado} onChange={(e) => set('descuentoConfirmado', e.target.checked)} />
                <span>La novia ya confirmó el casamiento con vos (aplica el descuento de la prueba).</span>
              </label>
            )}
          </fieldset>

          {/* Asistente, pagos y notas */}
          <fieldset className="tarjeta space-y-3 p-4">
            <legend className="sr-only">Asistente y pagos</legend>
            <Campo etiqueta="Asistente (horas)" ayuda={`${pesos(COSTO_HORA_ASISTENTE)} la hora.${horasRequeridas ? ` Este encargo pide al menos ${horasRequeridas} h.` : ''}`}>
              <NumInput step={0.5} value={draft.asistenteHoras} disabled={congelado} onChange={(n) => set('asistenteHoras', n)} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Seña" ayuda={`Mínimo 30 %: ${pesos(c.senaMinima)}`}>
                <NumInput step={1000} value={draft.sena} disabled={congelado} onChange={(n) => set('sena', n)} />
              </Campo>
              <Campo etiqueta="Pagos del saldo">
                <NumInput step={1000} value={draft.pagosSaldo} disabled={cerrado} onChange={(n) => set('pagosSaldo', n)} />
              </Campo>
            </div>
            <div className="flex items-center justify-between rounded-md bg-crema px-3 py-2">
              <span className="text-sm text-gris">Saldo pendiente</span>
              <span className={`num font-bold ${c.saldo === 0 ? 'text-ok' : 'text-bordo'}`}>{pesos(c.saldo)}</span>
            </div>
            {!cerrado && c.saldo > 0 && ['confirmado', 'realizado'].includes(draft.estado) && (
              <button className="btn-suave -ml-2 text-bordo" onClick={() => set('pagosSaldo', (Number(draft.pagosSaldo) || 0) + c.saldo)}>
                Registrar pago del saldo completo ({pesos(c.saldo)})
              </button>
            )}
            <Campo etiqueta="Notas de piel">
              <textarea className="campo min-h-[80px]" value={draft.notasPiel} onChange={(e) => set('notasPiel', e.target.value)} placeholder="Tipo de piel, alergias, tonos que le quedaron bien…" />
            </Campo>
          </fieldset>
        </div>

        {/* La cuenta, siempre visible */}
        <aside className="md:sticky md:top-28 md:self-start">
          <div className="tarjeta p-4">
            <h2 className="font-titulo text-xl font-semibold">La cuenta</h2>
            {draft.servicios.length === 0 ? (
              <p className="mt-2 text-sm text-gris">Agregá un servicio para ver total, costo y margen.</p>
            ) : (
              <>
                <div className="mt-2 text-sm">
                  {c.lineas.map((l) => (
                    <Fila key={l.id} concepto={l.nombre} detalle={`${l.personas} × ${pesos(l.precioUnit)}`} importe={pesos(l.subtotal)} />
                  ))}
                  {c.recargo > 0 && <Fila concepto="Recargo de temporada" detalle="15 % sobre servicios · casamiento en sábado oct–dic" importe={pesos(c.recargo)} />}
                  <Fila concepto="Traslado" detalle={c.foto.zonaNombre} importe={pesos(c.traslado)} />
                </div>
                <div className="mt-1 border-t border-tinta/70 pt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">Total</span>
                    <span className="num font-titulo text-3xl font-semibold text-bordo">{pesos(c.precioFinal)}</span>
                  </div>
                </div>

                <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-gris">Costo</h3>
                <div className="text-sm">
                  {c.lineas.map((l) => (
                    <Fila key={l.id} concepto={`Insumos · ${l.nombre}`} detalle={`${l.personas} × ${pesos(l.insumoUnit)}`} importe={pesos(l.costoInsumos)} tono="gris" />
                  ))}
                  <Fila concepto="Asistente" detalle={`${dec(c.horas, 1)} h × ${pesos(c.foto.costoHoraAsistente)}`} importe={pesos(c.costoAsistente)} tono="gris" />
                  <Fila concepto="Traslado" importe={pesos(c.traslado)} tono="gris" />
                  <div className="border-t border-linea">
                    <Fila concepto="Costo total" importe={pesos(c.costoTotal)} fuerte />
                  </div>
                </div>

                <div className={`mt-4 rounded-md px-3 py-3 ${margenBajo ? 'border border-alerta/50 bg-[#FDF0E8]' : 'bg-rosa-claro'}`}>
                  <p className={`flex flex-wrap items-baseline gap-x-1 text-[15px] ${margenBajo ? 'text-alerta' : 'text-tinta'}`}>
                    {margenBajo && <AlertTriangle size={16} strokeWidth={1.75} className="self-center" aria-hidden="true" />}
                    {margenBajo ? 'Ojo: te queda ' : 'Te queda '}
                    <b className={`tab text-2xl ${margenBajo ? 'text-alerta' : 'text-bordo'}`}>{pct(c.margenPct)}</b> de margen
                  </p>
                  <p className="mt-0.5 text-sm text-gris tab">
                    {pesos(c.margen)} de ganancia{margenBajo ? ` · por debajo del ${pct(MARGEN_ALERTA)}` : ''}
                  </p>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-bordo">Ver cómo se calcula</summary>
                  <div className="mt-2 space-y-1 text-xs text-gris">
                    <p>Total = servicios {pesos(c.subtotalServicios)}{c.recargo ? ` + recargo ${pesos(c.recargo)}` : ''} + traslado {pesos(c.traslado)}.</p>
                    <p>Costo = insumos {pesos(c.costoInsumos)} + asistente {pesos(c.costoAsistente)} + traslado {pesos(c.traslado)}.</p>
                    <p>Margen = {pesos(c.precioFinal)} − {pesos(c.costoTotal)} = {pesos(c.margen)} ({pct(c.margenPct)}).</p>
                    {c.lineas.map((l) => (
                      <div key={l.id} className="pt-1">
                        <p className="font-bold text-tinta">{l.nombre}: insumos por persona</p>
                        {(c.foto.receta[l.servicioId] || []).map((r) => (
                          <p key={r.insumoId} className="flex justify-between gap-2 tab">
                            <span>{r.nombre} · {dec(r.dosis)} {r.unidad} × {pesos(r.costoUso)}</span>
                            <span className="num">{pesos(r.dosis * r.costoUso)}</span>
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Acciones */}
      <div className="mt-5 space-y-3">
        {mensaje && (
          <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={`rounded-md px-3 py-2 text-sm ${mensaje.tipo === 'error' ? 'border border-alerta/50 bg-[#FDF0E8] text-alerta' : 'bg-rosa-claro text-bordo'}`}>
            {mensaje.texto}
          </p>
        )}
        <button className="btn-primario w-full" onClick={guardar} disabled={!sucio && !esNuevo}>
          {sucio || esNuevo ? <><Save size={16} strokeWidth={1.75} aria-hidden="true" />Guardar</> : <><Check size={16} strokeWidth={1.75} aria-hidden="true" />Sin cambios</>}
        </button>
        <div className="tarjeta p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-gris">Estado: <b className="text-tinta">{ESTADOS[draft.estado]}</b></p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACCIONES.map((a) => {
              const disponible = a.desde.includes(draft.estado) && (a.id !== 'prueba' || novia)
              return (
                <button key={a.id} disabled={!disponible} onClick={() => ejecutar(a.id)}
                  className={`${a.id === 'cancelar' ? 'btn border border-linea text-alerta hover:bg-[#FDF0E8]' : 'btn-secundario'} whitespace-nowrap px-2`}>
                  <IconoAccion id={a.id} />{a.etiqueta}
                </button>
              )
            })}
          </div>
          {novia && ['senado'].includes(draft.estado) && <p className="mt-2 text-xs text-gris">Hay novia: para confirmar, primero marcá la prueba hecha.</p>}
        </div>
      </div>

      {confirmando === 'cancelar' && (
        <Confirmar titulo="¿Cancelás este encargo?" peligro si="Sí, cancelar" no="No, volver"
          texto={<><p>{resultadoCancelacion(draft, hoyISO()).texto}</p><p className="mt-2 text-sm text-gris">La fecha queda libre en la agenda. No se puede deshacer.</p></>}
          onSi={cancelar} onNo={() => setConfirmando(null)} />
      )}
      {salir && (
        <Confirmar titulo="Tenés cambios sin guardar" texto="Si volvés ahora, se pierde lo que cargaste en esta ficha." si="Descartar y volver" no="Seguir editando" peligro
          onSi={onVolver} onNo={() => setSalir(false)} />
      )}
    </section>
  )
}

function IconoAccion({ id }) {
  const I = ICONOS[id]
  return I ? <I size={16} strokeWidth={1.75} aria-hidden="true" /> : null
}
