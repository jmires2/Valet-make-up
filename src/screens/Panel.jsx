import { useState } from 'react'
import { CLAVE_DATOS, PREFIJO } from '../config.js'
import { exportarJSON } from '../lib/storage.js'
import { useStore } from '../state.jsx'
import { Confirmar, Titulo } from '../components/ui.jsx'

export default function Panel() {
  const { datos, restaurar, avisar } = useStore()
  const [confirmando, setConfirmando] = useState(false)
  const tam = (() => { try { return (localStorage.getItem(CLAVE_DATOS) || '').length } catch { return 0 } })()

  const descargar = () => {
    const blob = new Blob([exportarJSON(datos)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `valet-makeup-respaldo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section>
      <Titulo sub="Respaldo y restauración de este navegador">Datos</Titulo>
      <div className="tarjeta space-y-2 p-4 text-sm">
        <p>Tus datos viven solo en este navegador, en la clave <code className="rounded bg-crema px-1">{CLAVE_DATOS}</code>.</p>
        <p className="text-gris tab">
          {datos.encargos.length} encargos · {datos.servicios.length} servicios · {datos.insumos.length} insumos · {datos.zonas.length} zonas · {(tam / 1024).toFixed(1)} KB
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <button className="btn-secundario" onClick={descargar}>Descargar respaldo (JSON)</button>
          <button className="btn-suave text-bordo" onClick={() => {
            navigator.clipboard?.writeText(exportarJSON(datos))
              .then(() => avisar('Respaldo copiado. Pegalo en un archivo de texto para guardarlo.'))
              .catch(() => avisar('Este navegador no dejó copiar. Usá «Descargar respaldo».', 'error'))
          }}>Copiar respaldo</button>
        </div>
      </div>

      <div className="tarjeta mt-4 space-y-2 border-alerta/40 p-4 text-sm">
        <h2 className="font-titulo text-xl font-semibold">Restaurar datos de ejemplo</h2>
        <p>Borra todo lo que cargaste y vuelve a los datos de ejemplo (incluido el caso Paula). Solo toca las claves que empiezan con <code className="rounded bg-crema px-1">{PREFIJO}</code>; el resto del navegador queda igual.</p>
        <button className="btn mt-2 bg-alerta text-white" onClick={() => setConfirmando(true)}>Restaurar datos de ejemplo</button>
      </div>

      {confirmando && (
        <Confirmar titulo="¿Restaurás los datos de ejemplo?" peligro si="Sí, borrar y restaurar" no="No, volver"
          texto="Se pierden los encargos, compras y cambios que hiciste. Te recomendamos descargar un respaldo antes. No se puede deshacer."
          onNo={() => setConfirmando(false)}
          onSi={() => {
            const r = restaurar()
            setConfirmando(false)
            avisar(r.ok ? 'Datos de ejemplo restaurados.' : r.motivo, r.ok ? 'ok' : 'error')
          }} />
      )}
    </section>
  )
}
