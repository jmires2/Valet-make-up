// Datos sintéticos de ejemplo. Nombres, lugares e importes son ficticios.
import { fotoActual } from '../lib/calc.js'
import { ocupa } from '../lib/rules.js'

export const SERVICIOS = [
  { id: 'novia', tipo: 'novia', nombre: 'Maquillaje de novia con peinado de apoyo', duracion: 120, precio: 180000, requiereAsistente: 1, soloDiasSemana: false, descuentoConfirmacion: 0 },
  { id: 'prueba', tipo: 'prueba', nombre: 'Prueba previa de novia', duracion: 90, precio: 45000, requiereAsistente: 0, soloDiasSemana: true, descuentoConfirmacion: 50 },
  { id: 'madrina', tipo: 'otro', nombre: 'Maquillaje de madrina o mamá', duracion: 60, precio: 70000, requiereAsistente: 0, soloDiasSemana: false, descuentoConfirmacion: 0 },
  { id: 'dama', tipo: 'otro', nombre: 'Maquillaje de dama', duracion: 50, precio: 55000, requiereAsistente: 0, soloDiasSemana: false, descuentoConfirmacion: 0 },
  { id: 'quince', tipo: 'otro', nombre: 'Maquillaje de quinceañera', duracion: 75, precio: 95000, requiereAsistente: 0, soloDiasSemana: false, descuentoConfirmacion: 0 },
  { id: 'social', tipo: 'otro', nombre: 'Maquillaje social para evento', duracion: 60, precio: 60000, requiereAsistente: 0, soloDiasSemana: false, descuentoConfirmacion: 0 },
]

// Insumos del brief: precio del envase, contenido y dosis para novia, tal cual.
// precioEnvase = costo promedio por envase; costoUso = precioEnvase / contenido.
// Cada uno arranca con 2 a 4 envases y mínimo de 1 envase, salvo el sellador, que arranca por debajo.
export const INSUMOS = [
  { id: 'base', nombre: 'Base de larga duración', unidad: 'ml', precioEnvase: 42000, contenido: 30, dosisNovia: 1.5, stockEnvases: 3, minimo: 1 },
  { id: 'primer', nombre: 'Primer hidratante', unidad: 'ml', precioEnvase: 28000, contenido: 30, dosisNovia: 1, stockEnvases: 2, minimo: 1 },
  { id: 'corrector', nombre: 'Corrector', unidad: 'ml', precioEnvase: 18000, contenido: 6, dosisNovia: 0.5, stockEnvases: 3, minimo: 1 },
  { id: 'polvo', nombre: 'Polvo translúcido', unidad: 'g', precioEnvase: 24000, contenido: 20, dosisNovia: 1, stockEnvases: 2, minimo: 1 },
  { id: 'sombras', nombre: 'Paleta de sombras', unidad: 'uso', precioEnvase: 65000, contenido: 100, dosisNovia: 1, stockEnvases: 2, minimo: 1 },
  { id: 'delineador', nombre: 'Delineador en gel', unidad: 'uso', precioEnvase: 16000, contenido: 40, dosisNovia: 1, stockEnvases: 3, minimo: 1 },
  { id: 'mascara', nombre: 'Máscara de pestañas', unidad: 'uso', precioEnvase: 22000, contenido: 30, dosisNovia: 1, stockEnvases: 3, minimo: 1 },
  { id: 'tira', nombre: 'Pestañas en tira', unidad: 'par', precioEnvase: 6500, contenido: 1, dosisNovia: 1, stockEnvases: 4, minimo: 1 },
  { id: 'pegamento', nombre: 'Pegamento de pestañas', unidad: 'uso', precioEnvase: 9000, contenido: 60, dosisNovia: 1, stockEnvases: 2, minimo: 1 },
  { id: 'labial', nombre: 'Labial líquido', unidad: 'uso', precioEnvase: 17000, contenido: 40, dosisNovia: 1, stockEnvases: 3, minimo: 1 },
  { id: 'rubor', nombre: 'Rubor en crema', unidad: 'uso', precioEnvase: 19000, contenido: 50, dosisNovia: 1, stockEnvases: 2, minimo: 1 },
  { id: 'sellador', nombre: 'Sellador en spray', unidad: 'ml', precioEnvase: 26000, contenido: 100, dosisNovia: 3, stockEnvases: 0.6, minimo: 1 },
  { id: 'esponja', nombre: 'Esponja descartable', unidad: 'unidad', precioEnvase: 1200, contenido: 1, dosisNovia: 1, stockEnvases: 4, minimo: 1 },
  { id: 'hisopos', nombre: 'Hisopos', unidad: 'unidad', precioEnvase: 3000, contenido: 100, dosisNovia: 4, stockEnvases: 2, minimo: 1 },
]

const recetaNovia = () => Object.fromEntries(INSUMOS.map((i) => [i.id, i.dosisNovia]))
// Madrina y dama: mitad de la dosis de base y sin pestañas en tira; el resto, igual que la novia.
const recetaAcompanante = () => ({ ...recetaNovia(), base: 0.75, tira: 0 })

export const RECETAS = {
  novia: recetaNovia(),
  prueba: recetaNovia(), // la prueba ensaya el maquillaje completo de la novia
  madrina: recetaAcompanante(),
  dama: recetaAcompanante(),
  social: recetaAcompanante(), // el brief no la define: se toma la de madrina y dama
  quince: { ...recetaNovia(), base: 1 }, // 1 ml de base y sellador (3 ml, como la novia)
}

export const ZONAS = [
  { id: 'caba', nombre: 'CABA', precio: 12000 },
  { id: 'gba-cerca', nombre: 'GBA hasta 40 km', precio: 22000 },
  { id: 'gba-lejos', nombre: 'GBA más de 40 km', precio: 38000 },
]

const l = (servicioId, personas, n) => ({ id: `l-${servicioId}-${n}`, servicioId, personas })
const base = (o) => ({
  telefono: '', lugar: '', zonaId: 'caba', asistenteHoras: 0, sena: 0, pagosSaldo: 0, notasPiel: '',
  descuentoConfirmado: false, pruebaHecha: false, senadoEn: null, recetaCongelada: null,
  stockDescontado: false, senaRetenida: 0, senaDevuelta: 0, creadoEn: '2026-09-01', ...o,
})

const ENCARGOS = [
  base({
    id: 'enc-paula', clienta: 'Paula Ferreyra', telefono: '11 5523-8140', fecha: '2026-11-21', hora: '08:30',
    lugar: 'Estancia La Candelaria, Pilar', zonaId: 'gba-lejos',
    servicios: [l('novia', 1, 1), l('madrina', 1, 2), l('dama', 2, 3)], asistenteHoras: 3,
    sena: 140000, notasPiel: 'Piel mixta, zona T grasa. Sensible a fragancias: evitar fijador perfumado.',
    estado: 'confirmado', pruebaHecha: true, senadoEn: '2026-08-20', creadoEn: '2026-08-12',
  }),
  base({
    id: 'enc-paula-prueba', clienta: 'Paula Ferreyra', telefono: '11 5523-8140', fecha: '2026-10-14', hora: '11:00',
    lugar: 'Atelier, Palermo', zonaId: '', servicios: [l('prueba', 1, 1)], descuentoConfirmado: true,
    sena: 22500, notasPiel: 'Probar base en dos tonos; quedó mejor la más cálida.',
    estado: 'cobrado', senadoEn: '2026-09-30', stockDescontado: true, creadoEn: '2026-09-28',
  }),
  base({
    id: 'enc-camila', clienta: 'Camila Ríos', telefono: '11 6012-4477', fecha: '2026-12-05', hora: '15:00',
    lugar: 'Palacio Duhau, Recoleta', zonaId: 'caba', servicios: [l('novia', 1, 1), l('madrina', 1, 2)],
    asistenteHoras: 2, sena: 90000, notasPiel: 'Piel seca, usar primer hidratante extra en mejillas.',
    estado: 'senado', senadoEn: '2026-10-29', creadoEn: '2026-10-20',
  }),
  base({
    id: 'enc-camila-prueba', clienta: 'Camila Ríos', telefono: '11 6012-4477', fecha: '2026-11-17', hora: '16:00',
    lugar: 'Atelier, Palermo', zonaId: '', servicios: [l('prueba', 1, 1)], descuentoConfirmado: true,
    sena: 22500, estado: 'senado', senadoEn: '2026-11-02', creadoEn: '2026-11-02',
  }),
  base({
    id: 'enc-lucia', clienta: 'Lucía Benítez', telefono: '11 4790-3321', fecha: '2026-11-14', hora: '18:00',
    lugar: 'Salón Los Álamos, Quilmes', zonaId: 'gba-cerca', servicios: [l('quince', 1, 1), l('social', 1, 2)],
    asistenteHoras: 1, sena: 60000, notasPiel: 'Primera vez maquillada: look fresco y liviano.',
    estado: 'confirmado', senadoEn: '2026-10-05', creadoEn: '2026-09-29',
  }),
  base({
    id: 'enc-sofia', clienta: 'Sofía Acosta', telefono: '11 3388-9012', fecha: '2026-11-06', hora: '19:30',
    lugar: 'Departamento, Belgrano', zonaId: 'caba', servicios: [l('social', 1, 1)],
    sena: 25000, pagosSaldo: 47000, estado: 'cobrado', senadoEn: '2026-10-22', stockDescontado: true, creadoEn: '2026-10-20',
  }),
  base({
    id: 'enc-martina', clienta: 'Martina Gómez', telefono: '11 5901-2266', fecha: '2026-10-24', hora: '10:00',
    lugar: 'Quinta San Isidro', zonaId: 'gba-cerca', servicios: [l('novia', 1, 1), l('madrina', 2, 2)],
    asistenteHoras: 3, sena: 120000, pagosSaldo: 270000, notasPiel: 'Rosácea leve en pómulos; corrector verde antes de la base.',
    estado: 'cobrado', pruebaHecha: true, senadoEn: '2026-07-15', stockDescontado: true, creadoEn: '2026-07-10',
  }),
  base({
    id: 'enc-julieta', clienta: 'Julieta Romero', telefono: '11 6677-1045', fecha: '2026-11-28', hora: '17:00',
    lugar: 'Casa de la familia, Lomas de Zamora', zonaId: 'gba-cerca', servicios: [l('dama', 3, 1), l('madrina', 1, 2)],
    asistenteHoras: 2, estado: 'presupuestado', creadoEn: '2026-11-08',
  }),
  base({
    id: 'enc-rocio', clienta: 'Rocío Sánchez', telefono: '11 2245-7783', fecha: '2026-11-20', hora: '20:00',
    lugar: 'Chacra en Cañuelas', zonaId: 'gba-lejos', servicios: [l('social', 1, 1)],
    asistenteHoras: 1, estado: 'presupuestado', notasPiel: 'Piel grasa.', creadoEn: '2026-11-10',
  }),
  base({
    id: 'enc-valentina', clienta: 'Valentina Paz', telefono: '11 4120-5598', fecha: '2026-12-12', hora: '12:00',
    lugar: 'Registro civil y almuerzo, San Telmo', zonaId: 'caba', servicios: [l('novia', 1, 1)],
    asistenteHoras: 1, estado: 'consulta', creadoEn: '2026-11-11',
  }),
  base({
    id: 'enc-florencia', clienta: 'Florencia Díaz', telefono: '11 3056-6620', fecha: '2026-11-27', hora: '19:00',
    lugar: 'Salón Belgrano R', zonaId: 'caba', servicios: [l('social', 2, 1)],
    sena: 40000, estado: 'cancelado', estadoPrevio: 'senado', senadoEn: '2026-10-10', canceladoEn: '2026-11-05',
    senaRetenida: 40000, creadoEn: '2026-10-08',
  }),
  base({
    id: 'enc-agustina', clienta: 'Agustina Molina', telefono: '11 5874-0091', fecha: '2026-10-17', hora: '09:00',
    lugar: 'Iglesia de Escobar', zonaId: 'gba-lejos', servicios: [l('novia', 1, 1), l('dama', 1, 2)],
    asistenteHoras: 2, estado: 'cancelado', estadoPrevio: 'presupuestado', canceladoEn: '2026-09-20', creadoEn: '2026-09-02',
  }),
]

export function crearDatosIniciales() {
  const datos = {
    version: 1,
    servicios: SERVICIOS.map((s) => ({ ...s })),
    insumos: INSUMOS.map((i) => ({ ...i })),
    recetas: JSON.parse(JSON.stringify(RECETAS)),
    zonas: ZONAS.map((z) => ({ ...z })),
    encargos: [],
  }
  // Los encargos que ya pasaron por «Señado» llevan su receta congelada.
  datos.encargos = ENCARGOS.map((e) =>
    ocupa(e) || e.senadoEn ? { ...e, recetaCongelada: fotoActual(e, datos) } : { ...e }
  )
  return datos
}
