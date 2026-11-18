// ─── Configuración del proyecto ────────────────────────────────────────────
// Clave compartida para entrar como «Administración» y al panel «Datos».
// No es autenticación real: queda en el código que baja al navegador.
// Para cambiarla, editá este valor y volvé a publicar (ver README).
export const CLAVE_PANEL = 'valet2026'

// Prefijo de todas las claves de localStorage de este proyecto.
// La restauración de datos borra SOLO las claves que empiezan con este prefijo.
export const PREFIJO = 'valet-makeup:'
export const CLAVE_DATOS = PREFIJO + 'datos-v2'
export const CLAVE_ROL = PREFIJO + 'rol'
export const CLAVE_SESION_ADMIN = PREFIJO + 'admin-ok' // sessionStorage

export const COSTO_HORA_ASISTENTE = 8000
export const RECARGO_TEMPORADA = 0.15 // casamiento en sábado de octubre a diciembre
export const SENA_MINIMA = 0.3
export const MARGEN_ALERTA = 0.35
export const DIAS_RETENCION_SENA = 30
export const MAX_EVENTOS_DIA = 2
export const MAX_PRUEBAS_DIA = 3
export const PERSONAS_CASAMIENTO_GRANDE = 4 // más de esta cantidad ocupa el día entero
