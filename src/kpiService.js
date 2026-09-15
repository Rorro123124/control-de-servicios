import { supabase } from "./supabaseClient";

const toDate = (d) => d.toISOString().slice(0, 10);

const today      = () => toDate(new Date());
const daysAgo    = (n) => toDate(new Date(Date.now() - n * 86400000));
const monthStart = () => today().slice(0, 7) + "-01";
const lastMonthStart = () => {
  const d = new Date();
  return toDate(new Date(d.getFullYear(), d.getMonth() - 1, 1));
};
const lastMonthEnd = () => {
  const d = new Date();
  return toDate(new Date(d.getFullYear(), d.getMonth(), 0));
};

async function sumInvoices(businessId, from, to = null) {
  let q = supabase
    .from("invoices")
    .select("total")
    .eq("business_id", businessId)
    .gte("created_at", from + "T00:00:00");
  if (to) q = q.lte("created_at", to + "T23:59:59");
  const { data } = await q;
  return {
    total: (data || []).reduce((s, i) => s + Number(i.total), 0),
    count: (data || []).length,
  };
}

export async function getKPIs(businessId) {
  const t  = today();
  const y  = daysAgo(1);
  const ms = monthStart();
  const lms = lastMonthStart();
  const lme = lastMonthEnd();

  const [hoy, ayer, mes, mesAnt] = await Promise.all([
    sumInvoices(businessId, t),
    sumInvoices(businessId, y, y),
    sumInvoices(businessId, ms),
    sumInvoices(businessId, lms, lme),
  ]);

  // Top productos del mes
  const { data: prods } = await supabase
    .from("products")
    .select("id, name")
    .eq("business_id", businessId);

  const productMap = Object.fromEntries((prods || []).map((p) => [p.id, p.name]));
  const productIds = (prods || []).map((p) => p.id);

  const { data: salesData } = productIds.length
    ? await supabase
        .from("sales")
        .select("product_id, qty")
        .in("product_id", productIds)
        .gte("sale_date", ms)
    : { data: [] };

  const productTotals = {};
  (salesData || []).forEach((s) => {
    const name = productMap[s.product_id] || "?";
    productTotals[name] = (productTotals[name] || 0) + Number(s.qty);
  });

  const topProductos = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  // Stock bajo
  const { data: productos } = await supabase
    .from("products")
    .select("stock, avg_daily_demand, item_type, has_variants")
    .eq("business_id", businessId);

  const stockBajo = (productos || []).filter((p) => {
    if (p.item_type === "servicio" || p.has_variants) return false;
    const demand = Number(p.avg_daily_demand) || 0;
    const min = Math.max(3, demand * 5);
    return Number(p.stock) <= min;
  }).length;

  return {
    hoy: hoy.total,
    facturasHoy: hoy.count,
    ayer: ayer.total,
    facturasAyer: ayer.count,
    mes: mes.total,
    facturasMes: mes.count,
    mesAnt: mesAnt.total,
    topProductos,
    stockBajo,
    pctAyer:
      ayer.total > 0 ? ((hoy.total - ayer.total) / ayer.total) * 100 : null,
    pctMes:
      mesAnt.total > 0 ? ((mes.total - mesAnt.total) / mesAnt.total) * 100 : null,
  };
}

export async function getLast7DaysSales(businessId) {
  const days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
  const from = days[0];

  const { data } = await supabase
    .from("invoices")
    .select("created_at, total")
    .eq("business_id", businessId)
    .gte("created_at", from + "T00:00:00")
    .order("created_at");

  const byDay = Object.fromEntries(days.map((d) => [d, 0]));
  (data || []).forEach((inv) => {
    const day = inv.created_at.slice(0, 10);
    if (byDay[day] !== undefined) byDay[day] += Number(inv.total);
  });

  return days.map((d) => ({ date: d.slice(5), total: byDay[d] }));
}

export function getGoal(businessId) {
  return Number(localStorage.getItem("goal_" + businessId) || 0);
}

export function saveGoal(businessId, amount) {
  localStorage.setItem("goal_" + businessId, String(Number(amount)));
}
