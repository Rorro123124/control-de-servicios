import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getKPIs, getLast7DaysSales, getGoal, saveGoal } from "./kpiService";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

const pctColor  = (pct) => (pct === null ? "var(--text-secondary)" : pct >= 0 ? "#22c55e" : "#ef4444");
const pctArrow  = (pct) => (pct === null ? "" : pct >= 0 ? "+" : "");
const pctString = (pct, label) =>
  pct === null ? "Sin datos" : `${pctArrow(pct)}${pct.toFixed(1)}% ${label}`;

const card = (extra = {}) => ({
  background:   "var(--bg-secondary)",
  borderRadius: 14,
  padding:      "18px 20px",
  border:       "1px solid var(--border-color)",
  ...extra,
});

const KPICard = ({ label, value, sub, subColor }) => (
  <div style={card()}>
    <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
      {label}
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 13, color: subColor || "var(--text-secondary)", marginTop: 6 }}>
        {sub}
      </div>
    )}
  </div>
);

export default function KPIDashboard({ businessId }) {
  const [kpis,    setKpis]    = useState(null);
  const [chart,   setChart]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [goal,    setGoalVal] = useState(0);
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, c] = await Promise.all([
        getKPIs(businessId),
        getLast7DaysSales(businessId),
      ]);
      setKpis(k);
      setChart(c);
      setGoalVal(getGoal(businessId));
    } catch (e) {
      console.error("Error KPIs:", e);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveGoal = () => {
    const val = Number(goalInput.replace(/\./g, "").replace(/,/g, ""));
    if (val > 0) { saveGoal(businessId, val); setGoalVal(val); }
    setEditing(false);
  };

  const goalPct = goal > 0 && kpis ? Math.min(100, (kpis.mes / goal) * 100) : 0;

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
        Cargando resumen...
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: 22, fontWeight: 700 }}>
          Resumen del negocio
        </h2>
        <button
          onClick={load}
          style={{
            background:   "transparent",
            border:       "1px solid var(--border-color)",
            borderRadius: 8,
            padding:      "6px 14px",
            cursor:       "pointer",
            fontSize:     13,
            color:        "var(--text-secondary)",
          }}
        >
          Actualizar
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KPICard
          label="VENTAS HOY"
          value={fmt(kpis?.hoy)}
          sub={pctString(kpis?.pctAyer, "vs ayer") + ` | ${kpis?.facturasHoy} facturas`}
          subColor={pctColor(kpis?.pctAyer)}
        />
        <KPICard
          label="VENTAS DEL MES"
          value={fmt(kpis?.mes)}
          sub={pctString(kpis?.pctMes, "vs mes ant.") + ` | ${kpis?.facturasMes} facturas`}
          subColor={pctColor(kpis?.pctMes)}
        />
        <KPICard
          label="VENTAS AYER"
          value={fmt(kpis?.ayer)}
          sub={`${kpis?.facturasAyer} facturas`}
        />
        <div style={card({ borderColor: kpis?.stockBajo > 0 ? "#ef4444" : "var(--border-color)" })}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            ALERTAS DE STOCK
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: kpis?.stockBajo > 0 ? "#ef4444" : "#22c55e", lineHeight: 1.1 }}>
            {kpis?.stockBajo}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
            {kpis?.stockBajo === 0 ? "Todo el inventario OK" : "productos bajo minimo"}
          </div>
        </div>
      </div>

      {/* Meta del mes */}
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>Meta del mes</span>
          {!editing ? (
            <button
              onClick={() => { setGoalInput(goal > 0 ? String(goal) : ""); setEditing(true); }}
              style={{ background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, padding: "4px 14px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)" }}
            >
              {goal > 0 ? "Editar" : "Definir meta"}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Ej: 5000000"
                style={{
                  width:        140,
                  padding:      "5px 10px",
                  borderRadius: 8,
                  border:       "1px solid var(--border-color)",
                  background:   "var(--bg-primary)",
                  color:        "var(--text-primary)",
                  fontSize:     13,
                }}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveGoal()}
              />
              <button
                onClick={handleSaveGoal}
                style={{ background: "var(--accent-color)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
              >
                Guardar
              </button>
            </div>
          )}
        </div>
        {goal > 0 ? (
          <>
            <div style={{ background: "var(--bg-primary)", borderRadius: 20, height: 14, overflow: "hidden", marginBottom: 8 }}>
              <div
                style={{
                  width:      `${goalPct}%`,
                  height:     "100%",
                  background: goalPct >= 100 ? "#22c55e" : "var(--accent-color)",
                  borderRadius: 20,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text-secondary)" }}>{fmt(kpis?.mes)} de {fmt(goal)}</span>
              <span style={{ fontWeight: 700, color: goalPct >= 100 ? "#22c55e" : "var(--accent-color)" }}>
                {goalPct.toFixed(1)}%
              </span>
            </div>
          </>
        ) : (
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Define una meta mensual para ver tu progreso en tiempo real.
          </div>
        )}
      </div>

      {/* Grafica + top productos */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>

        {/* Grafica 7 dias */}
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            Ultimos 7 dias
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [fmt(v), "Ventas"]}
                contentStyle={{
                  background:   "var(--bg-secondary)",
                  border:       "1px solid var(--border-color)",
                  borderRadius: 8,
                  fontSize:     12,
                  color:        "var(--text-primary)",
                }}
                cursor={{ fill: "rgba(0,0,0,0.06)" }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chart.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === chart.length - 1 ? "var(--accent-color)" : "var(--border-color)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 productos del mes */}
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            Top del mes
          </div>
          {(kpis?.topProductos || []).length === 0 ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              Sin ventas este mes aun.
            </div>
          ) : (
            (kpis?.topProductos || []).map((p, i) => {
              const maxQty = kpis.topProductos[0]?.qty || 1;
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: i === 0 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                      {i === 0 ? "* " : ""}{p.name}
                    </span>
                    <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>{p.qty}</span>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 10, height: 6, overflow: "hidden" }}>
                    <div
                      style={{
                        width:        `${(p.qty / maxQty) * 100}%`,
                        height:       "100%",
                        background:   i === 0 ? "var(--accent-color)" : "var(--border-color)",
                        borderRadius: 10,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
