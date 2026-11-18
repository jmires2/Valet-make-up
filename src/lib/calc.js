import { COSTO_HORA_ASISTENTE, RECARGO_TEMPORADA, SENA_MINIMA } from '../config.js'
import { aFecha } from './format.js'

export const costoUso = (ins) => (ins.contenido > 0 ? ins.precioEnvase / ins.contenido : 0)
export const bajoMinimo = (ins) => ins.stockEnvases < ins.minimo
export const totalPersonas = (enc) => enc.servicios.reduce((a, l) => a + (Number(l.personas) || 0), 0)

/**
 * Foto de precios, recetas y traslado que usa un encargo.
 * Mientras no está señado se arma con los valores vivos del catálogo;
 * al señar, esta foto se guarda en `recetaCongelada` y ya no cambia.
 */
export function fotoActual(enc, datos) {
  const ids = [...new Set(enc.servicios.map((l) => l.servicioId))]
  const servicios = {}
  const receta = {}
  for (const id of ids) {
    const s = datos.servicios.find((x) => x.id === id)
    if (!s) continue
    servicios[id] = {
      nombre: s.nombre, precio: s.precio, tipo: s.tipo, duracion: s.duracion,
      soloDiasSemana: !!s.soloDiasSemana, descuentoConfirmacion: s.descuentoConfirmacion || 0,
    }
    receta[id] = Object.entries(datos.recetas[id] || {})
      .filter(([, dosis]) => dosis > 0)
      .map(([insumoId, dosis]) => {
        const ins = datos.insumos.find((i) => i.id === insumoId)
        return ins && { insumoId, nombre: ins.nombre, unidad: ins.unidad, contenido: ins.contenido, dosis, costoUso: costoUso(ins) }
      })
      .filter(Boolean)
  }
  const zona = datos.zonas.find((z) => z.id === enc.zonaId)
  return {
    servicios,
    receta,
    traslado: zona ? zona.precio : 0,
    zonaNombre: zona ? zona.nombre : 'Sin traslado (en el atelier)',
    costoHoraAsistente: COSTO_HORA_ASISTENTE,
  }
}

export const foto = (enc, datos) => enc.recetaCongelada || fotoActual(enc, datos)

export const tieneNovia = (enc, f) => enc.servicios.some((l) => f.servicios[l.servicioId]?.tipo === 'novia')
export const esPrueba = (enc, f) =>
  enc.servicios.length > 0 && enc.servicios.every((l) => f.servicios[l.servicioId]?.tipo === 'prueba')

export function aplicaRecargo(enc, f) {
  if (!enc.fecha || !tieneNovia(enc, f)) return false
  const d = aFecha(enc.fecha)
  return d.getDay() === 6 && d.getMonth() >= 9 // 9 = octubre … 11 = diciembre
}

/** Cuenta completa del encargo. Importes en pesos enteros. */
export function calcular(enc, datos) {
  const f = foto(enc, datos)
  const lineas = enc.servicios.map((l) => {
    const s = f.servicios[l.servicioId]
    const personas = Number(l.personas) || 0
    if (!s) return { ...l, nombre: 'Servicio eliminado', personas, precioLista: 0, descuento: 0, precioUnit: 0, subtotal: 0, insumoUnit: 0, costoInsumos: 0 }
    const descuento = enc.descuentoConfirmado && s.descuentoConfirmacion ? s.descuentoConfirmacion / 100 : 0
    const precioUnit = Math.round(s.precio * (1 - descuento))
    const insumoUnit = (f.receta[l.servicioId] || []).reduce((a, r) => a + r.dosis * r.costoUso, 0)
    return { ...l, nombre: s.nombre, personas, precioLista: s.precio, descuento, precioUnit, subtotal: precioUnit * personas, insumoUnit, costoInsumos: insumoUnit * personas }
  })
  const subtotalServicios = lineas.reduce((a, l) => a + l.subtotal, 0)
  // El recargo de temporada se aplica SOLO sobre servicios, nunca sobre el traslado.
  const recargo = aplicaRecargo(enc, f) ? Math.round(subtotalServicios * RECARGO_TEMPORADA) : 0
  const traslado = enc.servicios.length ? f.traslado : 0
  const precioFinal = subtotalServicios + recargo + traslado
  const costoInsumos = Math.round(lineas.reduce((a, l) => a + l.costoInsumos, 0))
  const horas = Number(enc.asistenteHoras) || 0
  const costoAsistente = Math.round(horas * f.costoHoraAsistente)
  const costoTotal = costoInsumos + costoAsistente + traslado
  const margen = precioFinal - costoTotal
  const pagado = (Number(enc.sena) || 0) + (Number(enc.pagosSaldo) || 0)
  return {
    foto: f, lineas, subtotalServicios, recargo, traslado, precioFinal,
    costoInsumos, horas, costoAsistente, costoTotal, margen,
    margenPct: precioFinal > 0 ? margen / precioFinal : 0,
    saldo: precioFinal - pagado,
    senaMinima: Math.ceil(precioFinal * SENA_MINIMA),
    congelado: !!enc.recetaCongelada,
  }
}

/** Productos que lleva el encargo (lista para la asistente y descuento de stock). */
export function productos(enc, datos) {
  const f = foto(enc, datos)
  const acc = {}
  for (const l of enc.servicios) {
    for (const r of f.receta[l.servicioId] || []) {
      acc[r.insumoId] ??= { insumoId: r.insumoId, nombre: r.nombre, unidad: r.unidad, contenido: r.contenido, cantidad: 0 }
      acc[r.insumoId].cantidad += r.dosis * (Number(l.personas) || 0)
    }
  }
  return Object.values(acc).sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** Compra: nuevoCostoUso = (stock × costoAnt + unidades × costoCompra) / stockTotal, expresado por envase. */
export function aplicarCompra(ins, unidades, costoEnvase) {
  const stock = Math.max(0, ins.stockEnvases)
  const total = stock + unidades
  const precioEnvase = total > 0 ? (stock * ins.precioEnvase + unidades * costoEnvase) / total : costoEnvase
  return { ...ins, precioEnvase, stockEnvases: redondear(stock + unidades, 3) }
}

/** Resta del stock (en envases) lo que consumió el encargo. */
export function descontarStock(insumos, enc, datos) {
  const consumo = Object.fromEntries(productos(enc, datos).map((p) => [p.insumoId, p]))
  return insumos.map((ins) => {
    const p = consumo[ins.id]
    if (!p || !ins.contenido) return ins
    return { ...ins, stockEnvases: redondear(ins.stockEnvases - p.cantidad / ins.contenido, 3) }
  })
}

export const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d
