# Valet MakeUp · Presupuestos y rentabilidad

App web para presupuestar encargos de maquillaje de novias y eventos (CABA y GBA) y ver cuánto deja cada uno. Funciona entera en el navegador: **sin backend, sin cuentas y sin servicios externos**. Los datos se guardan en `localStorage` y las tipografías van incluidas en el paquete.

Stack: React 18 + Tailwind CSS 3 + Vite (el mismo stack base que Lovable), JavaScript.

---

## Arranque

Requisito: Node 18 o más nuevo.

```bash
npm install
npm run dev            # http://localhost:5173
```

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` (subir a cualquier hosting estático) |
| `npm run build:single` | Un único `dist-single/index.html` autocontenido: se abre con doble clic o se publica como página |
| `npm test` | Verifica las reglas de negocio con los datos de ejemplo (42 comprobaciones, no necesita navegador) |

**Para importarlo en Lovable:** subí el repositorio a GitHub y conectalo desde Lovable, o copiá `src/` dentro de un proyecto Lovable nuevo. Lovable usa TypeScript, pero también acepta archivos `.jsx`. La configuración de colores y tipografías está en `tailwind.config.js` y `src/index.css`.

---

## Roles y clave

El selector de rol del encabezado **no es autenticación real**: sirve para cambiar lo que ve cada persona en un dispositivo compartido.

| Rol | Ve | Puede |
|---|---|---|
| **Titular** | Todo | Editar servicios, recetas, insumos y zonas; gestionar encargos |
| **Administración** *(pide clave)* | Todo, incluidas las métricas | Cargar presupuestos, señas y cobros, registrar compras. Servicios, recetas y zonas en **solo lectura** |
| **Asistente** | Solo los encargos señados que tienen horas de asistente: fecha, hora, lugar, clienta, servicios, notas de piel y lista de productos | **Marcar Realizado** en los encargos confirmados (descuenta el stock). **No ve** precios, costos, margen ni métricas |

El panel **Datos** (respaldo y restauración) pide la misma clave, sea cual sea el rol.

### Clave actual

```
valet2026
```

### Cómo cambiar la clave

1. Abrí [`src/config.js`](src/config.js).
2. Cambiá el valor de `CLAVE_PANEL`.
3. Volvé a generar el build (`npm run build`) y publicalo.

La clave viaja en el código que baja el navegador: es una traba para uso cotidiano, no una protección. No hay alta de usuarios.

---

## Datos de ejemplo (sintéticos)

Todos los nombres, teléfonos, lugares e importes son **inventados**. Se cargan solo la primera vez que se abre la app en un navegador, es decir, cuando no existe la clave `valet-makeup:datos-v2`. Si borrás todos tus encargos, la lista queda vacía: **una lista vacía no se confunde con una primera visita**.

- **6 servicios**: Maquillaje de novia con peinado de apoyo (120 min, $180.000, 1 h de asistente) · Prueba previa de novia (90 min, $45.000, lunes a jueves, −50 % si la novia confirma) · Maquillaje de madrina o mamá (60 min, $70.000) · Maquillaje de dama (50 min, $55.000) · Maquillaje de quinceañera (75 min, $95.000) · Maquillaje social para evento (60 min, $60.000).
- **14 insumos** con el precio del envase, el contenido y la dosis para novia del brief:

  | Insumo | Envase | Contenido | Dosis novia |
  |---|---:|---:|---:|
  | Base de larga duración | $42.000 | 30 ml | 1,5 ml |
  | Primer hidratante | $28.000 | 30 ml | 1 ml |
  | Corrector | $18.000 | 6 ml | 0,5 ml |
  | Polvo translúcido | $24.000 | 20 g | 1 g |
  | Paleta de sombras | $65.000 | 100 usos | 1 uso |
  | Delineador en gel | $16.000 | 40 usos | 1 uso |
  | Máscara de pestañas | $22.000 | 30 usos | 1 uso |
  | Pestañas en tira | $6.500 | 1 par | 1 par |
  | Pegamento de pestañas | $9.000 | 60 usos | 1 uso |
  | Labial líquido | $17.000 | 40 usos | 1 uso |
  | Rubor en crema | $19.000 | 50 usos | 1 uso |
  | Sellador en spray | $26.000 | 100 ml | 3 ml |
  | Esponja descartable | $1.200 | 1 unidad | 1 unidad |
  | Hisopos | $3.000 | 100 unidades | 4 unidades |

  Cada uno arranca con 2 a 4 envases y un mínimo de 1 envase. El «Sellador en spray» arranca por debajo (0,6 envases) y muestra la etiqueta **Reponer**.
- **Recetas**: novia = dosis de la tabla · madrina y dama = igual que la novia pero con la mitad de la base (0,75 ml) y sin pestañas en tira · quinceañera = igual que la novia con 1 ml de base y sellador · social = igual que madrina y dama · prueba previa = igual que la novia. El brief no define social ni prueba: esas dos son criterio propio y se editan en **Recetas**.
- **3 zonas**: CABA $12.000 · GBA hasta 40 km $22.000 · GBA más de 40 km $38.000.
- **12 encargos** entre octubre y diciembre de 2026, en todos los estados (incluye una cancelación con seña retenida y dos pruebas con descuento con margen bajo el 35 %).

### Caso Paula (para reproducir)

Paula Ferreyra · sábado 21/11/2026 · Estancia en Pilar (GBA más de 40 km) · novia + madre + 2 damas · 3 h de asistente.

| Concepto | Importe |
|---|---:|
| Servicios (180.000 + 70.000 + 2 × 55.000) | $360.000 |
| Recargo 15 % (casamiento en sábado de oct–dic, solo sobre servicios) | $54.000 |
| Traslado | $38.000 |
| **Total** | **$452.000** |
| Insumos (17.072 + 9.522 + 2 × 9.522) | $45.637 |
| Asistente (3 h × $8.000) | $24.000 |
| Traslado | $38.000 |
| **Costo total** | **$107.637** |
| **Margen** | **$344.363 → 76 %** |

---

## Reglas que aplica

**Fórmulas**
- `costoUso = precioEnvase / contenido`
- `costoInsumos = Σ(dosis × costoUso) × personas`
- `costoTotal = insumos + horasAsistente × $8.000 + traslado`
- `precioFinal = Σ servicios + 15 % (solo sobre servicios, en casamiento sábado oct–dic) + traslado`
- `margen = precioFinal − costoTotal` (el % es sobre el precio final). Alerta visible por debajo del 35 %.
- Compra: `nuevoCosto = (stock × costoAnterior + unidades × costoCompra) / stockTotal`, por envase.

**Agenda y estados**
- Consulta → Presupuestado → Señado → Prueba hecha → Confirmado → Realizado → Cobrado. Se puede cancelar hasta Confirmado.
- Máximo 2 eventos por día; 1 si hay un casamiento de más de 4 personas. Se ocupa el cupo desde **Señado** y se libera solo al **Cancelar**. Si no entra, se rechaza con el motivo.
- Pruebas: lunes a jueves, entre 10 y 18 h (tienen que terminar a las 18), máximo 3 por día. La prueba se agenda como encargo aparte.
- Señar exige seña ≥ 30 % del total. Confirmar exige «Prueba hecha» si hay novia. Cobrar exige saldo $0.
- Al **señar** se congelan receta, precios, costos y traslado: las compras o cambios posteriores solo afectan los presupuestos sin señar.
- **Realizado** descuenta del stock las dosis de la receta congelada, una sola vez.
- **Cancelar** con más de 30 días de anticipación devuelve la seña; con 30 días o menos, se retiene y cuenta como ingreso.

**Métricas** (Titular y Administración, por mes de la fecha del evento)
- Ingresos cobrados: total de los encargos cobrados + señas retenidas por cancelación.
- Margen promedio ponderado: Σ margen / Σ precio final de los encargos señados en adelante (sin cancelados).
- Conversión Consulta → Señado: encargos del mes que llegaron a señarse / encargos del mes.
- Sábados ocupados: sábados del mes con al menos un evento señado / sábados del mes.
- Ranking por servicio: ingresos por servicio (sin recargo ni traslado) de encargos señados en adelante.
- Al pie se listan los encargos del mes para cotejar los números.

---

## Identidad visual

Según el briefing: ficha de atelier de maquillaje, cálida y precisa. Sin brillos, degradés ni íconos de labios.

| Uso | Color |
|---|---|
| Fondo crema | `#FBF6F1` |
| Rosa empolvado | `#E8C4C4` |
| Bordó profundo (números clave) | `#7A1F3D` |
| Texto | `#2E2428` |

Tipografía: **Cormorant Garamond** en títulos y **Karla** en texto, ambas incluidas en el paquete. Los importes usan números tabulares alineados a la derecha. Los colores se definen en `tailwind.config.js`.

---

## Persistencia

- Todo vive en `localStorage`, en la clave `valet-makeup:datos-v2`. El rol elegido, en `valet-makeup:rol`; la sesión de Administración, en `sessionStorage`.
- Primero se guarda y recién después se muestra «Guardado». Si el navegador no deja guardar (por ejemplo, porque no queda espacio o está en modo privado), aparece el error y **lo que escribiste sigue en pantalla**.
- Los datos son por navegador y por dispositivo: no se sincronizan. Para pasarlos a otro equipo, usá «Descargar respaldo» en **Datos**.

## Cómo reiniciar

**Desde la app:** rol cualquiera → pestaña **Datos** → clave → «Restaurar datos de ejemplo» → confirmar. Borra solo las claves que empiezan con `valet-makeup:` y vuelve a cargar los datos de ejemplo. El resto del navegador no se toca.

**A mano:** en las herramientas de desarrollo del navegador, borrá la clave `valet-makeup:datos-v2` de `localStorage` y recargá.

---

## Estructura

```
src/
  config.js          clave del panel, prefijo de almacenamiento y constantes de negocio
  data/seed.js       datos sintéticos de ejemplo
  lib/calc.js        cuenta del encargo, costos, compras, stock
  lib/rules.js       estados, cupos, horarios, seña y cancelación
  lib/metrics.js     métricas mensuales
  lib/storage.js     carga, guardado y restauración en localStorage
  state.jsx          estado global, roles y permisos
  screens/           Agenda, Ficha, Servicios, Recetas, Insumos, Zonas, Métricas, Datos, vista Asistente
scripts/verificar.mjs  verificación de los criterios de aceptación
```
