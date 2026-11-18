// Verificación de las reglas de negocio contra los criterios de aceptación.
// Uso: npm test   (no necesita navegador)
import { crearDatosIniciales } from '../src/data/seed.js'
import { aplicarCompra, calcular, productos } from '../src/lib/calc.js'
import { aplicarAccion, resultadoCancelacion, validarCupo } from '../src/lib/rules.js'
import { metricas } from '../src/lib/metrics.js'

let fallas = 0
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) fallas++ }
const HOY = '2026-11-13'
const d0 = crearDatosIniciales()
const enc = (d, id) => d.encargos.find((e) => e.id === id)
const con = (d, e) => ({ ...d, encargos: d.encargos.some((x) => x.id === e.id) ? d.encargos.map((x) => (x.id === e.id ? e : x)) : [...d.encargos, e] })
const nuevo = (o) => ({ id: 'test-' + Math.random(), clienta: 'Prueba', fecha: '', hora: '10:00', lugar: '', zonaId: 'caba', servicios: [], asistenteHoras: 0, sena: 0, pagosSaldo: 0, notasPiel: '', estado: 'presupuestado', ...o })

// Catálogo e insumos del brief
const ins = (id) => d0.insumos.find((i) => i.id === id)
const BRIEF = { base: [42000, 30, 1.5], primer: [28000, 30, 1], corrector: [18000, 6, 0.5], polvo: [24000, 20, 1], sombras: [65000, 100, 1], delineador: [16000, 40, 1], mascara: [22000, 30, 1], tira: [6500, 1, 1], pegamento: [9000, 60, 1], labial: [17000, 40, 1], rubor: [19000, 50, 1], sellador: [26000, 100, 3], esponja: [1200, 1, 1], hisopos: [3000, 100, 4] }
ok(d0.insumos.length === 14 && Object.entries(BRIEF).every(([id, [p, c, dz]]) => ins(id) && ins(id).precioEnvase === p && ins(id).contenido === c && ins(id).dosisNovia === dz), '14 insumos con precio, contenido y dosis del brief')
ok(d0.insumos.filter((i) => i.stockEnvases < i.minimo).length === 1 && d0.insumos.every((i) => i.minimo === 1 && (i.stockEnvases < 1 || (i.stockEnvases >= 2 && i.stockEnvases <= 4))), 'Stock de 2 a 4 envases, mínimo 1 envase, uno solo por debajo')
ok(d0.servicios.map((s) => s.nombre).join('|') === 'Maquillaje de novia con peinado de apoyo|Prueba previa de novia|Maquillaje de madrina o mamá|Maquillaje de dama|Maquillaje de quinceañera|Maquillaje social para evento', 'Nombres de servicios del brief')
ok(['madrina', 'dama'].every((s) => d0.recetas[s].base === 0.75 && d0.recetas[s].tira === 0 && d0.recetas[s].sellador === 3), 'Madrina y dama: mitad de la base, sin pestañas en tira')
ok(d0.recetas.quince.base === 1 && d0.recetas.quince.sellador > 0, 'Quinceañera: 1 ml de base y sellador')
ok(Math.round(ins('base').precioEnvase / ins('base').contenido) === 1400, 'Costo por unidad de uso de la base: $42.000 / 30 ml = $1.400')

// Caso Paula con los costos del brief
const paula = calcular(enc(d0, 'enc-paula'), d0)
ok(paula.precioFinal === 452000 && paula.costoInsumos === 45637 && paula.costoTotal === 45637 + 3 * 8000 + 38000, `Caso Paula: total ${paula.precioFinal}, costo ${paula.costoTotal}, margen ${Math.round(paula.margenPct * 100)} %`)
ok(paula.recargo === Math.round(0.15 * paula.subtotalServicios), `Recargo 15 % solo sobre servicios (${paula.recargo} = 15 % de ${paula.subtotalServicios})`)
ok(paula.precioFinal === paula.subtotalServicios + paula.recargo + paula.traslado, 'Total = servicios + recargo + traslado (traslado sin recargo)')

// Recargo: no aplica fuera de sábado oct–dic ni sin novia
const sinNovia = calcular(nuevo({ fecha: '2026-11-21', servicios: [{ id: 'a', servicioId: 'social', personas: 1 }] }), d0)
ok(sinNovia.recargo === 0, 'Sin novia no hay recargo')
const viernes = calcular(nuevo({ fecha: '2026-11-20', servicios: [{ id: 'a', servicioId: 'novia', personas: 1 }] }), d0)
ok(viernes.recargo === 0, 'Novia en viernes: sin recargo')
const septiembre = calcular(nuevo({ fecha: '2026-09-26', servicios: [{ id: 'a', servicioId: 'novia', personas: 1 }] }), d0)
ok(septiembre.recargo === 0, 'Novia en sábado de septiembre: sin recargo')

// Agregar servicio recalcula
const e1 = nuevo({ fecha: '2026-12-05', servicios: [{ id: 'a', servicioId: 'novia', personas: 1 }] })
const e2 = { ...e1, servicios: [...e1.servicios, { id: 'b', servicioId: 'dama', personas: 2 }] }
ok(calcular(e2, d0).precioFinal > calcular(e1, d0).precioFinal && calcular(e2, d0).costoTotal > calcular(e1, d0).costoTotal, 'Agregar servicio recalcula total y costo')

// Seña mínima 30 %
const julieta = enc(d0, 'enc-julieta')
const cj = calcular(julieta, d0)
ok(!aplicarAccion('senar', { ...julieta, sena: cj.senaMinima - 1 }, { datos: d0, hoy: HOY }).ok, 'Señar con menos del 30 % se rechaza')
const rS = aplicarAccion('senar', { ...julieta, sena: cj.senaMinima }, { datos: d0, hoy: HOY })
ok(rS.ok && rS.encargo.recetaCongelada, 'Señar con 30 % pasa y congela la receta')

// Cupo: máx. 2 eventos por día
let d = d0
const ev = (id, servicios) => nuevo({ id, fecha: '2026-11-21', servicios, sena: 999999 })
const a = aplicarAccion('senar', { ...ev('x1', [{ id: 'a', servicioId: 'social', personas: 1 }]), sena: 30000 }, { datos: d, hoy: HOY })
ok(a.ok, '2.º evento del sábado de Paula entra')
d = con(d, a.encargo)
const b = aplicarAccion('senar', { ...ev('x2', [{ id: 'a', servicioId: 'social', personas: 1 }]), sena: 30000 }, { datos: d, hoy: HOY })
ok(!b.ok, `3.er evento se rechaza: «${b.motivo}»`)
// Casamiento > 4 personas ocupa el día
const grande = nuevo({ id: 'g', fecha: '2026-11-14', servicios: [{ id: 'a', servicioId: 'novia', personas: 1 }, { id: 'b', servicioId: 'dama', personas: 4 }] })
const rg = validarCupo(grande, d0.encargos, d0)
ok(!rg.ok, `Casamiento de 5 personas en un día con otro evento se rechaza: «${rg.motivo}»`)
const libre = validarCupo({ ...grande, fecha: '2026-12-26' }, d0.encargos, d0)
ok(libre.ok, 'Casamiento de 5 personas en día libre entra')
const conGrande = con(d0, { ...grande, fecha: '2026-12-26', estado: 'senado' })
ok(!validarCupo(nuevo({ fecha: '2026-12-26', servicios: [{ id: 'a', servicioId: 'social', personas: 1 }] }), conGrande.encargos, conGrande).ok, 'Con casamiento grande señado, no entra otro evento')
// Presupuestados no ocupan
ok(validarCupo(nuevo({ fecha: '2026-11-28', servicios: [{ id: 'a', servicioId: 'social', personas: 1 }] }), d0.encargos, d0).ok, 'Un presupuesto (no señado) no ocupa cupo')
// Cancelar libera
const cancelado = aplicarAccion('cancelar', a.encargo, { datos: d, hoy: HOY }).encargo
const dLib = con(d, cancelado)
ok(aplicarAccion('senar', { ...ev('x3', [{ id: 'a', servicioId: 'social', personas: 1 }]), sena: 30000 }, { datos: dLib, hoy: HOY }).ok, 'Cancelar libera el cupo')

// Pruebas: lun–jue 10–18, máx. 3/día
const prueba = (o) => nuevo({ servicios: [{ id: 'p', servicioId: 'prueba', personas: 1 }], sena: 45000, ...o })
ok(!validarCupo(prueba({ fecha: '2026-11-21' }), d0.encargos, d0).ok, 'Prueba en sábado se rechaza')
ok(!validarCupo(prueba({ fecha: '2026-11-17', hora: '17:00' }), d0.encargos, d0).ok, 'Prueba que termina después de las 18 se rechaza')
ok(!validarCupo(prueba({ fecha: '2026-11-17', hora: '09:00' }), d0.encargos, d0).ok, 'Prueba antes de las 10 se rechaza')
let dp = d0
for (const h of ['10:00', '12:00']) dp = con(dp, { ...prueba({ fecha: '2026-11-17', hora: h }), estado: 'senado' })
ok(!validarCupo(prueba({ fecha: '2026-11-17', hora: '14:00' }), dp.encargos, dp).ok, '4.ª prueba del martes se rechaza (Camila + 2 = 3)')

// Confirmar exige prueba hecha si hay novia
const camila = enc(d0, 'enc-camila')
ok(!aplicarAccion('confirmar', camila, { datos: d0, hoy: HOY }).ok, 'Confirmar sin prueba hecha (hay novia) se rechaza')
const camP = aplicarAccion('prueba', camila, { datos: d0, hoy: HOY }).encargo
ok(aplicarAccion('confirmar', camP, { datos: d0, hoy: HOY }).ok, 'Con prueba hecha, confirma')
ok(aplicarAccion('confirmar', enc(d0, 'enc-lucia'), { datos: d0, hoy: HOY }).ok === false, 'Lucía ya está confirmada: no se reconfirma')

// Realizado descuenta stock una sola vez
const pa = enc(d0, 'enc-paula')
const rr = aplicarAccion('realizar', pa, { datos: d0, hoy: HOY })
const base0 = d0.insumos.find((i) => i.id === 'base').stockEnvases
const base1 = rr.insumos.find((i) => i.id === 'base').stockEnvases
const usoBase = productos(pa, d0).find((p) => p.insumoId === 'base').cantidad / 30
ok(Math.abs(base0 - base1 - usoBase) < 0.002, `Realizado descuenta stock (base: ${base0} → ${base1})`)
const dR = { ...con(d0, rr.encargo), insumos: rr.insumos }
ok(!aplicarAccion('realizar', rr.encargo, { datos: dR, hoy: HOY }).ok, 'No se puede volver a marcar realizado (descuento único)')

// Cobrar exige saldo 0
ok(!aplicarAccion('cobrar', rr.encargo, { datos: dR, hoy: HOY }).ok, 'Cobrar con saldo pendiente se rechaza')
const saldo = calcular(rr.encargo, dR).saldo
ok(aplicarAccion('cobrar', { ...rr.encargo, pagosSaldo: saldo }, { datos: dR, hoy: HOY }).ok, 'Con saldo 0, cobra')

// Compra: costo promedio y efecto solo en no señados
const insB = ins('base')
const nIns = aplicarCompra(insB, 2, 48000)
const esperado = (insB.stockEnvases * insB.precioEnvase + 2 * 48000) / (insB.stockEnvases + 2)
ok(Math.abs(nIns.precioEnvase - esperado) < 0.01, `Compra: nuevo costo promedio ${Math.round(nIns.precioEnvase)}`)
const dC = { ...d0, insumos: d0.insumos.map((i) => (i.id === 'base' ? nIns : i)) }
ok(calcular(julieta, dC).costoTotal !== cj.costoTotal, 'La compra cambia el costo de un presupuesto sin señar')
ok(calcular(pa, dC).costoTotal === paula.costoTotal, 'La compra NO cambia un encargo señado (receta congelada)')

// Cancelación: más de 30 días devuelve; 30 o menos retiene
ok(resultadoCancelacion(camila, HOY).retenida === camila.sena, 'Cancelar con menos de 30 días retiene la seña')
ok(resultadoCancelacion({ ...camila, fecha: '2027-01-20' }, HOY).devuelta === camila.sena, 'Cancelar con más de 30 días devuelve la seña')
ok(resultadoCancelacion({ ...camila, fecha: '2026-12-13' }, HOY).retenida === camila.sena, 'Cancelar con exactamente 30 días retiene la seña')
ok(resultadoCancelacion({ ...camila, fecha: '2026-12-14' }, HOY).devuelta === camila.sena, 'Cancelar con 31 días devuelve la seña')

// Métricas de noviembre
const m = metricas(d0, '2026-11')
const nov = d0.encargos.filter((e) => e.fecha.startsWith('2026-11'))
const esperadoIng = nov.filter((e) => e.estado === 'cobrado').reduce((s, e) => s + calcular(e, d0).precioFinal, 0) + nov.reduce((s, e) => s + (e.estado === 'cancelado' ? e.senaRetenida : 0), 0)
ok(m.ingresosCobrados === esperadoIng, `Métricas nov.: ingresos cobrados ${m.ingresosCobrados}`)
ok(m.totalEncargos === nov.length, `Métricas nov.: ${m.totalEncargos} encargos del mes`)
console.log(`   margen ponderado ${(m.margenPonderado * 100).toFixed(1)} %, conversión ${(m.conversion * 100).toFixed(0)} %, sábados ${m.sabadosOcupados}/${m.sabados}`)

console.log(fallas ? `\n${fallas} verificaciones fallaron.` : '\nTodas las verificaciones pasaron.')
process.exit(fallas ? 1 : 0)
