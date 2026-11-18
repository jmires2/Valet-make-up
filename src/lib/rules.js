import {
  DIAS_RETENCION_SENA, MAX_EVENTOS_DIA, MAX_PRUEBAS_DIA, PERSONAS_CASAMIENTO_GRANDE, SENA_MINIMA,
} from '../config.js'
import { calcular, descontarStock, esPrueba, foto, fotoActual, tieneNovia, totalPersonas } from './calc.js'
import { aFecha, aMinutos, diasEntre, pesos } from './format.js'

export const ESTADOS = {
  consulta: 'Consulta',
  presupuestado: 'Presupuestado',
  senado: 'Señado',
  prueba_hecha: 'Prueba hecha',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  cobrado: 'Cobrado',
  cancelado: 'Cancelado',
}

// Desde «Señado» el encargo ocupa cupo en la agenda; se libera solo al cancelar.
export const OCUPA = ['senado', 'prueba_hecha', 'confirmado', 'realizado', 'cobrado']
export const ocupa = (enc) => OCUPA.includes(enc.estado)

const esGrande = (enc, datos) => tieneNovia(enc, foto(enc, datos)) && totalPersonas(enc) > PERSONAS_CASAMIENTO_GRANDE

/** Situación del cupo de un día (sin contar `excluirId`). */
export function cupoDelDia(fecha, encargos, datos, excluirId) {
  const delDia = encargos.filter((e) => e.fecha === fecha && e.id !== excluirId && ocupa(e))
  const pruebas = delDia.filter((e) => esPrueba(e, foto(e, datos)))
  const eventos = delDia.filter((e) => !esPrueba(e, foto(e, datos)))
  const grande = eventos.some((e) => esGrande(e, datos))
  return { eventos: eventos.length, pruebas: pruebas.length, maxEventos: grande ? 1 : MAX_EVENTOS_DIA, grande }
}

/** Reglas de día y horario (pruebas: lunes a jueves de 10 a 18). */
export function validarHorario(enc, datos) {
  const f = foto(enc, datos)
  const restringido = enc.servicios.filter((l) => f.servicios[l.servicioId]?.soloDiasSemana)
  if (!restringido.length || !enc.fecha) return { ok: true }
  const dia = aFecha(enc.fecha).getDay()
  if (dia < 1 || dia > 4) return { ok: false, motivo: 'Las pruebas se hacen de lunes a jueves. Elegí otra fecha.' }
  const inicio = aMinutos(enc.hora)
  const duracion = Math.max(...restringido.map((l) => f.servicios[l.servicioId].duracion || 0))
  if (!enc.hora || inicio < 600 || inicio + duracion > 1080)
    return { ok: false, motivo: `Las pruebas van de 10 a 18 h y duran ${duracion} min: tienen que empezar entre las 10:00 y las ${finPrueba(duracion)}.` }
  return { ok: true }
}
const finPrueba = (dur) => {
  const m = 1080 - dur
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** ¿Entra este encargo en la agenda de su día? */
export function validarCupo(enc, encargos, datos) {
  const h = validarHorario(enc, datos)
  if (!h.ok) return h
  const c = cupoDelDia(enc.fecha, encargos, datos, enc.id)
  if (esPrueba(enc, foto(enc, datos))) {
    if (c.pruebas >= MAX_PRUEBAS_DIA) return { ok: false, motivo: `Ese día ya tenés ${MAX_PRUEBAS_DIA} pruebas señadas. Probá otro día.` }
    return { ok: true }
  }
  if (c.grande) return { ok: false, motivo: 'Ese día ya tenés un casamiento de más de 4 personas: ocupa el día entero.' }
  if (esGrande(enc, datos) && c.eventos >= 1)
    return { ok: false, motivo: 'Un casamiento de más de 4 personas ocupa el día entero y ese día ya tenés otro evento.' }
  if (c.eventos >= MAX_EVENTOS_DIA) return { ok: false, motivo: `Ese día ya tenés ${MAX_EVENTOS_DIA} eventos señados. Probá otra fecha.` }
  return { ok: true }
}

/** Validaciones de la ficha antes de guardar. */
export function validarFicha(enc, datos) {
  if (!enc.clienta.trim()) return { ok: false, motivo: 'Falta el nombre de la clienta.' }
  if (!enc.fecha) return { ok: false, motivo: 'Falta la fecha.' }
  const f = foto(enc, datos)
  if (enc.servicios.some((l) => !(Number(l.personas) >= 1))) return { ok: false, motivo: 'Cada servicio necesita al menos 1 persona.' }
  const tipos = enc.servicios.map((l) => f.servicios[l.servicioId]?.tipo)
  if (tipos.includes('prueba') && tipos.some((t) => t !== 'prueba'))
    return { ok: false, motivo: 'La prueba previa se agenda como encargo aparte (lunes a jueves).' }
  return validarHorario(enc, datos)
}

/**
 * Transiciones de estado. Cada una devuelve { ok, motivo } o { ok, encargo, insumos?, aviso? }.
 * `hoy` es 'AAAA-MM-DD'.
 */
export const ACCIONES = [
  { id: 'presupuestar', etiqueta: 'Presupuestar', desde: ['consulta'] },
  { id: 'senar', etiqueta: 'Señar', desde: ['presupuestado'] },
  { id: 'prueba', etiqueta: 'Prueba hecha', desde: ['senado'] },
  { id: 'confirmar', etiqueta: 'Confirmar', desde: ['senado', 'prueba_hecha'] },
  { id: 'realizar', etiqueta: 'Marcar Realizado', desde: ['confirmado'] },
  { id: 'cobrar', etiqueta: 'Cobrar', desde: ['realizado'] },
  { id: 'cancelar', etiqueta: 'Cancelar', desde: ['consulta', 'presupuestado', 'senado', 'prueba_hecha', 'confirmado'] },
]

export function aplicarAccion(accion, enc, { datos, hoy }) {
  const def = ACCIONES.find((a) => a.id === accion)
  if (!def.desde.includes(enc.estado))
    return { ok: false, motivo: `No se puede «${def.etiqueta}» un encargo en estado ${ESTADOS[enc.estado]}.` }
  const v = validarFicha(enc, datos)
  if (!v.ok && accion !== 'cancelar') return v
  const cuenta = calcular(enc, datos)
  const novia = tieneNovia(enc, foto(enc, datos))

  switch (accion) {
    case 'presupuestar':
      if (!enc.servicios.length) return { ok: false, motivo: 'Agregá al menos un servicio para presupuestar.' }
      return { ok: true, encargo: { ...enc, estado: 'presupuestado' } }

    case 'senar': {
      const sena = Number(enc.sena) || 0
      if (sena < cuenta.senaMinima)
        return { ok: false, motivo: `La seña tiene que ser de al menos ${Math.round(SENA_MINIMA * 100)} %: ${pesos(cuenta.senaMinima)}. Cargaste ${pesos(sena)}.` }
      if (sena > cuenta.precioFinal) return { ok: false, motivo: 'La seña no puede superar el total.' }
      const c = validarCupo(enc, datos.encargos, datos)
      if (!c.ok) return c
      // Señar congela receta, costos de insumos, precios y traslado.
      return { ok: true, encargo: { ...enc, estado: 'senado', senadoEn: hoy, recetaCongelada: fotoActual(enc, datos) } }
    }

    case 'prueba':
      if (!novia) return { ok: false, motivo: 'La prueba hecha aplica solo a encargos con novia.' }
      return { ok: true, encargo: { ...enc, estado: 'prueba_hecha', pruebaHecha: true } }

    case 'confirmar':
      if (novia && !enc.pruebaHecha) return { ok: false, motivo: 'Hay novia en el encargo: primero marcá «Prueba hecha».' }
      return { ok: true, encargo: { ...enc, estado: 'confirmado' } }

    case 'realizar': {
      if (enc.stockDescontado) return { ok: true, encargo: { ...enc, estado: 'realizado' } }
      const insumos = descontarStock(datos.insumos, enc, datos)
      return { ok: true, encargo: { ...enc, estado: 'realizado', stockDescontado: true }, insumos, aviso: 'Descontamos los productos del stock.' }
    }

    case 'cobrar':
      if (cuenta.saldo !== 0)
        return { ok: false, motivo: cuenta.saldo > 0 ? `Todavía queda un saldo de ${pesos(cuenta.saldo)}. Cargalo en «Pagos del saldo».` : `Los pagos superan el total por ${pesos(-cuenta.saldo)}. Revisá los importes.` }
      return { ok: true, encargo: { ...enc, estado: 'cobrado', cobradoEn: hoy } }

    case 'cancelar': {
      const r = resultadoCancelacion(enc, hoy)
      return { ok: true, encargo: { ...enc, estado: 'cancelado', canceladoEn: hoy, estadoPrevio: enc.estado, senaRetenida: r.retenida, senaDevuelta: r.devuelta } }
    }
  }
  return { ok: false, motivo: 'Acción desconocida.' }
}

/** Cancelar con más de 30 días de anticipación devuelve la seña; con 30 o menos, se retiene y cuenta como ingreso. */
export function resultadoCancelacion(enc, hoy) {
  const sena = ocupa(enc) ? Number(enc.sena) || 0 : 0
  const dias = enc.fecha ? diasEntre(hoy, enc.fecha) : Infinity
  if (!sena) return { dias, retenida: 0, devuelta: 0, texto: 'No hay seña cobrada: se cancela sin movimientos.' }
  if (dias <= DIAS_RETENCION_SENA)
    return { dias, retenida: sena, devuelta: 0, texto: `Faltan ${dias} días (no más de ${DIAS_RETENCION_SENA}): te quedás con la seña de ${pesos(sena)} y cuenta como ingreso.` }
  return { dias, retenida: 0, devuelta: sena, texto: `Faltan ${dias} días: corresponde devolver la seña de ${pesos(sena)}.` }
}
