/**
 * Misma lógica simple que usa la app: sin punto de reorden técnico,
 * solo un colchón basado en cuánto se vende por día.
 */
function historyDailyAverage(history, days) {
  if (!history || history.length === 0) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const total = history
    .filter((h) => new Date(h.date) >= cutoff)
    .reduce((s, h) => s + (Number(h.qty) || 0), 0);
  return total / days;
}

function getDemandaDiaria(p) {
  const hasHistory = Boolean(p.salesHistory && p.salesHistory.length > 0);
  const avg14 = historyDailyAverage(p.salesHistory, 14);
  const manual = Number(p.avgDailyDemand) || 0;
  return hasHistory ? (avg14 ?? 0) : manual;
}

function computeMetrics(p) {
  const demanda = getDemandaDiaria(p);
  const stock = Number(p.stock) || 0;

  const minimo = Math.max(3, Math.ceil(demanda * 5));

  let status = "sano";
  if (stock <= minimo) status = "urgente";
  else if (stock <= minimo * 2) status = "atencion";

  return { minimo, status, stock };
}

function buildAlertMessage(products) {
  const urgentes = products
    .map((p) => ({ ...p, metrics: computeMetrics(p) }))
    .filter((p) => ["urgente", "atencion"].includes(p.metrics.status))
    .sort((a, b) => (a.metrics.status === b.metrics.status ? 0 : a.metrics.status === "urgente" ? -1 : 1));

  if (urgentes.length === 0) return null;

  const lineas = urgentes.map((p) => {
    const icono = p.metrics.status === "urgente" ? "🔴" : "🟡";
    return `${icono} *${p.name}* — quedan ${p.metrics.stock} uds.`;
  });

  return [
    `📦 *Pocas unidades en stock* (${urgentes.length} producto${urgentes.length > 1 ? "s" : ""})`,
    "",
    ...lineas,
  ].join("\n");
}

module.exports = { computeMetrics, buildAlertMessage };
