import { useEffect, useRef, useState } from 'react'
import { ESTADOS } from '../lib/rules.js'
import { AlertTriangle } from 'lucide-react'

const COLOR_ESTADO = {
  consulta: 'bg-crema text-gris border-linea',
  presupuestado: 'bg-white text-tinta border-linea',
  senado: 'bg-rosa-claro text-bordo border-rosa',
  prueba_hecha: 'bg-rosa-claro text-bordo border-rosa',
  confirmado: 'bg-rosa text-bordo border-rosa',
  realizado: 'bg-bordo/10 text-bordo border-bordo/30',
  cobrado: 'bg-bordo text-crema border-bordo',
  cancelado: 'bg-white text-gris border-linea line-through',
}

export function EstadoBadge({ estado }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${COLOR_ESTADO[estado]}`}>
      {ESTADOS[estado]}
    </span>
  )
}

export function Etiqueta({ children, tono = 'alerta' }) {
  const t = tono === 'alerta' ? 'border-alerta/40 bg-[#FDF0E8] text-alerta' : 'border-linea bg-crema text-gris'
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${t}`}>
      {tono === 'alerta' && <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function Titulo({ children, accion, sub }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="titulo">{children}</h1>
        {sub && <p className="mt-0.5 text-sm text-gris">{sub}</p>}
      </div>
      {accion}
    </div>
  )
}

export function Vacio({ titulo, texto, accion }) {
  return (
    <div className="tarjeta px-5 py-10 text-center">
      <p className="font-titulo text-xl font-semibold text-tinta">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-xs text-sm text-gris">{texto}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}

/** Fila de cuenta: concepto a la izquierda, importe a la derecha con números tabulares. */
export function Fila({ concepto, detalle, importe, fuerte, tono }) {
  const color = tono === 'bordo' ? 'text-bordo' : tono === 'gris' ? 'text-gris' : 'text-tinta'
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${fuerte ? 'font-bold' : ''}`}>
      <div className="min-w-0">
        <span className={fuerte ? 'text-tinta' : 'text-tinta'}>{concepto}</span>
        {detalle && <span className="block text-xs text-gris tab">{detalle}</span>}
      </div>
      <span className={`num shrink-0 ${color}`}>{importe}</span>
    </div>
  )
}

export function Campo({ etiqueta, children, ayuda, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="etiqueta">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-gris">{ayuda}</span>}
    </label>
  )
}

/** Input numérico que no pierde lo escrito mientras se edita. */
export function NumInput({ value, onChange, min = 0, step = 'any', className = 'campo num', ...rest }) {
  const [txt, setTxt] = useState(value === 0 || value ? String(value) : '')
  const ult = useRef(value)
  useEffect(() => {
    if (value !== ult.current) { setTxt(value === 0 || value ? String(value) : ''); ult.current = value }
  }, [value])
  return (
    <input
      type="number" inputMode="decimal" min={min} step={step} className={className} value={txt}
      onChange={(e) => {
        setTxt(e.target.value)
        const n = e.target.value === '' ? 0 : Number(e.target.value)
        if (!Number.isNaN(n)) { ult.current = n; onChange(n) }
      }}
      {...rest}
    />
  )
}

export function Modal({ titulo, children, onCerrar, pie }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onCerrar?.()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [onCerrar])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 sm:items-center" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-crema p-5 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-titulo text-2xl font-semibold">{titulo}</h2>
        <div className="mt-3 text-[15px]">{children}</div>
        {pie && <div className="mt-5 flex flex-wrap justify-end gap-2">{pie}</div>}
      </div>
    </div>
  )
}

export function Confirmar({ titulo, texto, si = 'Sí, confirmar', no = 'Volver', peligro, onSi, onNo }) {
  return (
    <Modal titulo={titulo} onCerrar={onNo} pie={<>
      <button className="btn-suave" onClick={onNo}>{no}</button>
      <button className={peligro ? 'btn bg-alerta text-white' : 'btn-primario'} onClick={onSi}>{si}</button>
    </>}>
      <div className="text-tinta">{texto}</div>
    </Modal>
  )
}

export function PedirClave({ titulo, texto, onOk, onCancelar, verificar }) {
  const [v, setV] = useState('')
  const [error, setError] = useState('')
  const enviar = (e) => {
    e.preventDefault()
    if (verificar(v)) onOk()
    else setError('La clave no coincide. Probá de nuevo.')
  }
  return (
    <Modal titulo={titulo} onCerrar={onCancelar}>
      <form onSubmit={enviar}>
        <p className="mb-3 text-sm text-gris">{texto}</p>
        <input autoFocus type="password" className="campo" value={v} onChange={(e) => { setV(e.target.value); setError('') }} aria-label="Clave" />
        {error && <p className="mt-2 text-sm text-alerta">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-suave" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn-primario">Entrar</button>
        </div>
      </form>
    </Modal>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  const c = toast.tipo === 'error' ? 'bg-alerta text-white' : 'bg-tinta text-crema'
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div role="status" className={`pointer-events-auto max-w-md rounded-md px-4 py-3 text-sm shadow-sm ${c}`}>{toast.texto}</div>
    </div>
  )
}
