import { useMemo, useState } from 'react'
import { MARGEN_ALERTA } from '../config.js'
import { calcular } from '../lib/calc.js'
import { fechaCorta, hoyISO, nombreMes, pct, pesos } from '../lib/format.js'
import { metricas } from '../lib/metrics.js'
import { useStore } from '../state.jsx'
import { EstadoBadge, Titulo, Vacio } from '../components/ui.jsx'

function Indicador({ titulo, valor, base, alerta }) {
  return (
    <div className="tarjeta px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gris">{titulo}</p>
      <p className={`mt-1 font-titulo text-[32px] font-semibold leading-none tab ${alerta ? 'text-alerta' : 'text-bordo'}`}>{valor}</p>
      <p className="mt-1.5 text-xs text-gris tab">{base}</p>
    </div>
  )
}

export default function Metricas({ onAbrir }) {
  const { datos } = useStore()
  const meses = useMemo(() => {
    const s = new Set(datos.encargos.map((e) => e.fecha?.slice(0, 7)).filter(Boolean))
    s.add(hoyISO().slice(0, 7))
    return [...s].sort().reverse()
  }, [datos.encargos])
  const [mes, setMes] = useState(hoyISO().slice(0, 7))
  const m = useMemo(() => metricas(datos, mes), [datos, mes])
  const delMes = datos.encargos.filter((e) => e.fecha?.startsWith(mes)).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const maxIng = Math.max(1, ...m.ranking.map((r) => r.ingresos))

  return (
    <section>
      <Titulo sub="Según la fecha del evento">Métricas</Titulo>
      <label className="mb-4 block max-w-[220px]">
        <span className="etiqueta">Mes</span>
        <select className="campo capitalize" value={mes} onChange={(e) => setMes(e.target.value)}>
          {meses.map((x) => <option key={x} value={x}>{nombreMes(x)}</option>)}
        </select>
      </label>

      {m.totalEncargos === 0 ? (
        <Vacio titulo={`Sin encargos en ${nombreMes(mes)}`} texto="Elegí otro mes o cargá encargos con fecha en este." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            <Indicador titulo="Ingresos cobrados" valor={pesos(m.ingresosCobrados)}
              base={`${m.cantCobrados} ${m.cantCobrados === 1 ? "cobrado" : "cobrados"} (${pesos(m.ingresosPorCobro)})${m.cantRetenidas ? ` + ${m.cantRetenidas} seña retenida (${pesos(m.ingresosRetenidos)})` : ''}`} />
            <Indicador titulo="Margen ponderado" valor={m.cantActivos ? pct(m.margenPonderado) : '—'} alerta={m.cantActivos > 0 && m.margenPonderado < MARGEN_ALERTA}
              base={m.cantActivos ? `${pesos(m.totalMargen)} sobre ${pesos(m.totalVenta)} · ${m.cantActivos} encargos señados o más` : 'Sin encargos señados'} />
            <Indicador titulo="Consulta → Señado" valor={pct(m.conversion)}
              base={`${m.cantSenados} de ${m.totalEncargos} encargos llegaron a señarse`} />
            <Indicador titulo="Sábados ocupados" valor={pct(m.pctSabados)}
              base={`${m.sabadosOcupados} de ${m.sabados} sábados con evento señado`} />
          </div>

          <h2 className="mb-2 mt-6 font-titulo text-xl font-semibold">Ranking por servicio</h2>
          {m.ranking.length === 0 ? (
            <p className="text-sm text-gris">Todavía no hay encargos señados este mes.</p>
          ) : (
            <div className="tarjeta p-4">
              <ul className="space-y-3" aria-label="Ingresos por servicio, de mayor a menor">
                {m.ranking.map((r) => (
                  <li key={r.servicioId} title={`${r.nombre}: ${pesos(r.ingresos)} · ${r.personas} personas`}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{r.nombre} <span className="text-xs text-gris tab">· {r.personas} {r.personas === 1 ? 'persona' : 'personas'}</span></span>
                      <span className="num font-bold">{pesos(r.ingresos)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-r bg-crema">
                      <div className="h-2 rounded-r bg-bordo" style={{ width: `${(r.ingresos / maxIng) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gris">Ingresos por servicios (sin recargo ni traslado) de encargos señados o más.</p>
            </div>
          )}

          <details className="mt-6">
            <summary className="cursor-pointer font-titulo text-xl font-semibold">Encargos de {nombreMes(mes)} ({delMes.length})</summary>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-linea text-left text-xs uppercase tracking-wide text-gris">
                  <th className="py-1 font-medium">Fecha</th><th className="py-1 font-medium">Clienta</th>
                  <th className="py-1 text-right font-medium">Total</th><th className="py-1 text-right font-medium">Margen</th>
                </tr>
              </thead>
              <tbody>
                {delMes.map((e) => {
                  const c = calcular(e, datos)
                  return (
                    <tr key={e.id} className="cursor-pointer border-b border-linea/60 hover:bg-white" onClick={() => onAbrir(e.id)}>
                      <td className="py-1.5 pr-2 tab">{fechaCorta(e.fecha)}</td>
                      <td className="py-1.5 pr-2">{e.clienta}<div><EstadoBadge estado={e.estado} /></div></td>
                      <td className="num py-1.5">{pesos(c.precioFinal)}</td>
                      <td className={`num py-1.5 ${c.margenPct < MARGEN_ALERTA ? 'font-bold text-alerta' : ''}`}>{pct(c.margenPct)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  )
}
