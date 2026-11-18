const fmtPesos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
export const pesos = (n) => (n < 0 ? '−$' : '$') + fmtPesos.format(Math.abs(Math.round(n || 0)))
export const pct = (x) => `${Math.round((x || 0) * 100)} %`
export const dec = (n, d = 2) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: d }).format(n || 0)

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Las fechas se guardan como 'AAAA-MM-DD' y se leen al mediodía local para evitar corrimientos de huso horario.
export const aFecha = (iso) => new Date(iso + 'T12:00:00')
export const aISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const hoyISO = () => aISO(new Date())

export const fechaLarga = (iso) => {
  if (!iso) return 'Sin fecha'
  const d = aFecha(iso)
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}
export const fechaCorta = (iso) => {
  if (!iso) return '—'
  const d = aFecha(iso)
  return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}`
}
export const nombreMes = (aaaamm) => {
  const [a, m] = aaaamm.split('-').map(Number)
  return `${MESES[m - 1]} ${a}`
}
export const diasEntre = (desdeISO, hastaISO) => Math.round((aFecha(hastaISO) - aFecha(desdeISO)) / 86400000)
export const nuevoId = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
export const aMinutos = (hhmm) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number)
  return h * 60 + (m || 0)
}

const PLURAL = { uso: 'usos', par: 'pares', unidad: 'unidades' }
/** Unidad en singular o plural según la cantidad: «1 uso», «100 usos», «4 unidades». */
export const unidadTxt = (u, n) => (n === 1 ? u : PLURAL[u] || u)
