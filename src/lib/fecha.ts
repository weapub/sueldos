/**
 * Los inputs de fecha (`<input type="date">`) llegan como "YYYY-MM-DD" y se parsean con
 * `new Date(...)` como medianoche UTC. Todo el formateo debe forzar `timeZone: "UTC"` — si no,
 * en huso horario negativo (Argentina, UTC-3) la fecha se muestra/calcula un día antes.
 */
export function formatFechaAR(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-AR", { timeZone: "UTC" });
}
