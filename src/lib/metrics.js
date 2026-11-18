import { calcular, esPrueba, foto } from './calc.js'
import { ocupa } from './rules.js'

const ACTIVOS = ['senado', 'prueba_hecha', 'confirmado', 'realizado', 'cobrado']

/** Sábados de un mes 'AAAA-MM' como 'AAAA-MM-DD'. */
export function sabadosDelMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  const out = []
  for (let d = 1; d <= 31; d++) {
    const f = new Date(a, m - 1, d, 12)
    if (f.getMonth() !== m - 1) break
    if (f.getDay() === 6) out.push(`${mes}-${String(d).padStart(2, '0')}`)
  }
  return out
}

/** Métricas de los encargos cuya FECHA cae en el mes filtrado. */
export function metricas(datos, mes) {
  const delMes = datos.encargos.filter((e) => e.fecha?.startsWith(mes))
  const conCuenta = delMes.map((e) => ({ e, c: calcular(e, datos) }))

  const cobrados = conCuenta.filter(({ e }) => e.estado === 'cobrado')
  const retenidas = delMes.filter((e) => e.estado === 'cancelado' && e.senaRetenida > 0)
  const ingresosCobrados = cobrados.reduce((a, { c }) => a + c.precioFinal, 0)
  const ingresosRetenidos = retenidas.reduce((a, e) => a + e.senaRetenida, 0)

  const activos = conCuenta.filter(({ e }) => ACTIVOS.includes(e.estado))
  const totalVenta = activos.reduce((a, { c }) => a + c.precioFinal, 0)
  const totalMargen = activos.reduce((a, { c }) => a + c.margen, 0)

  const senados = delMes.filter((e) => e.senadoEn)

  const sabados = sabadosDelMes(mes)
  const sabadosOcupados = sabados.filter((s) =>
    datos.encargos.some((e) => e.fecha === s && ocupa(e) && !esPrueba(e, foto(e, datos)))
  )

  const porServicio = {}
  for (const { c } of activos) {
    for (const l of c.lineas) {
      porServicio[l.servicioId] ??= { servicioId: l.servicioId, nombre: l.nombre, personas: 0, ingresos: 0, costo: 0 }
      porServicio[l.servicioId].personas += l.personas
      porServicio[l.servicioId].ingresos += l.subtotal
      porServicio[l.servicioId].costo += l.costoInsumos
    }
  }
  const ranking = Object.values(porServicio).sort((a, b) => b.ingresos - a.ingresos)

  return {
    totalEncargos: delMes.length,
    ingresosCobrados: ingresosCobrados + ingresosRetenidos,
    ingresosPorCobro: ingresosCobrados,
    ingresosRetenidos,
    cantCobrados: cobrados.length,
    cantRetenidas: retenidas.length,
    margenPonderado: totalVenta > 0 ? totalMargen / totalVenta : 0,
    cantActivos: activos.length,
    totalVenta,
    totalMargen,
    conversion: delMes.length ? senados.length / delMes.length : 0,
    cantSenados: senados.length,
    sabados: sabados.length,
    sabadosOcupados: sabadosOcupados.length,
    pctSabados: sabados.length ? sabadosOcupados.length / sabados.length : 0,
    ranking,
  }
}
