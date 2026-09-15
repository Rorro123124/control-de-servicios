import { useState, useEffect, useCallback } from "react";
import {
  getSupplierDebts,
  createDebt,
  registerPayment,
  deleteDebt,
  getBalance,
  buildDebtSummary,
} from "./supplierDebtService";
import { getSuppliers } from "./productService";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

const input = {
  width:        "100%",
  padding:      "10px 12px",
  borderRadius: 8,
  border:       "1px solid var(--border-color)",
  background:   "var(--bg-secondary)",
  color:        "var(--text-primary)",
  fontSize:     14,
  boxSizing:    "border-box",
};

const btn = (type = "secondary", extra = {}) => ({
  background:   type === "primary" ? "var(--accent-color)" : type === "danger" ? "#ef4444" : "var(--bg-secondary)",
  color:        type === "secondary" ? "var(--text-primary)" : "#fff",
  border:       type === "secondary" ? "1px solid var(--border-color)" : "none",
  borderRadius: 8,
  padding:      "9px 16px",
  cursor:       "pointer",
  fontWeight:   600,
  fontSize:     14,
  ...extra,
});

const overlay = {
  position:       "fixed",
  inset:          0,
  background:     "rgba(0,0,0,0.5)",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  zIndex:         1000,
  padding:        16,
};

const modal = {
  background:   "var(--bg-primary)",
  borderRadius: 16,
  padding:      24,
  width:        "100%",
  maxWidth:     480,
  maxHeight:    "90vh",
  overflowY:    "auto",
  boxShadow:    "0 20px 60px rgba(0,0,0,0.3)",
};

const STATUS_COLOR = {
  pendiente: { bg: "#fef3c7", text: "#92400e", label: "Pendiente" },
  pagada:    { bg: "#d1fae5", text: "#065f46", label: "Pagada"    },
};

export default function SupplierDebtsModule({ businessId }) {
  const [debts,     setDebts]     = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("pendiente"); // pendiente | pagada | todas

  // Modal nueva deuda
  const [showNew,     setShowNew]     = useState(false);
  const [newSupplier, setNewSupplier] = useState("");
  const [newDesc,     setNewDesc]     = useState("");
  const [newAmount,   setNewAmount]   = useState("");
  const [newDue,      setNewDue]      = useState("");
  const [saving,      setSaving]      = useState(false);

  // Modal pago
  const [payDebt,    setPayDebt]    = useState(null);
  const [payAmount,  setPayAmount]  = useState("");
  const [payNotes,   setPayNotes]   = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        getSupplierDebts(businessId),
        getSuppliers(businessId),
      ]);
      setDebts(d || []);
      setSuppliers(s || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newAmount) return;
    setSaving(true);
    try {
      await createDebt(businessId, {
        supplier_id: newSupplier || null,
        description: newDesc,
        amount:      Number(newAmount.replace(/\./g, "")),
        due_date:    newDue || null,
      });
      setShowNew(false);
      setNewSupplier(""); setNewDesc(""); setNewAmount(""); setNewDue("");
      load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handlePay = async () => {
    if (!payDebt || !payAmount) return;
    setPayLoading(true);
    try {
      await registerPayment(payDebt.id, Number(payAmount.replace(/\./g, "")), payNotes);
      setPayDebt(null); setPayAmount(""); setPayNotes("");
      load();
    } catch (e) {
      console.error(e);
    }
    setPayLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminar esta deuda?")) return;
    await deleteDebt(id);
    load();
  };

  const filtered = debts.filter((d) =>
    filter === "todas" ? true : d.status === filter
  );

  const summary = buildDebtSummary(debts);
  const totalPendiente = debts
    .filter((d) => d.status === "pendiente")
    .reduce((s, d) => s + getBalance(d), 0);

  const isOverdue = (due) =>
    due && new Date(due) < new Date() ? true : false;

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
        Cargando cuentas...
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: 22, fontWeight: 700 }}>
            Cuentas por pagar
          </h2>
          <p style={{ margin: "4px 0 0", color: "#ef4444", fontWeight: 700, fontSize: 15 }}>
            Total pendiente: {fmt(totalPendiente)}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={btn("primary")}>
          + Nueva deuda
        </button>
      </div>

      {/* Resumen por proveedor */}
      {summary.length > 0 && (
        <div style={{
          background:   "var(--bg-secondary)",
          borderRadius: 12,
          padding:      16,
          marginBottom: 20,
          border:       "1px solid var(--border-color)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: 1, marginBottom: 10 }}>
            DEUDA POR PROVEEDOR
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {summary.map((s, i) => (
              <div
                key={i}
                style={{
                  background:   "var(--bg-primary)",
                  border:       "1px solid var(--border-color)",
                  borderRadius: 10,
                  padding:      "8px 14px",
                }}
              >
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.name}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>{fmt(s.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["pendiente", "pagada", "todas"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background:   filter === f ? "var(--accent-color)" : "var(--bg-secondary)",
              color:        filter === f ? "#fff" : "var(--text-primary)",
              border:       "1px solid var(--border-color)",
              borderRadius: 20,
              padding:      "6px 16px",
              cursor:       "pointer",
              fontSize:     13,
              fontWeight:   filter === f ? 700 : 400,
              textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista de deudas */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "var(--text-secondary)" }}>
          No hay deudas {filter === "todas" ? "" : filter + "s"} registradas.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((debt) => {
            const balance  = getBalance(debt);
            const overdue  = isOverdue(debt.due_date) && debt.status === "pendiente";
            const sCfg     = STATUS_COLOR[debt.status] || STATUS_COLOR.pendiente;
            const paidList = debt.supplier_debt_payments || [];

            return (
              <div
                key={debt.id}
                style={{
                  background:   "var(--bg-secondary)",
                  border:       overdue ? "1.5px solid #ef4444" : "1px solid var(--border-color)",
                  borderRadius: 12,
                  padding:      18,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 16 }}>
                        {debt.suppliers?.name || "Sin proveedor"}
                      </span>
                      <span style={{
                        background:   sCfg.bg,
                        color:        sCfg.text,
                        borderRadius: 20,
                        padding:      "2px 10px",
                        fontSize:     11,
                        fontWeight:   700,
                      }}>
                        {sCfg.label}
                      </span>
                      {overdue && (
                        <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                          Vencida
                        </span>
                      )}
                    </div>
                    {debt.description && (
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                        {debt.description}
                      </div>
                    )}
                    {debt.due_date && (
                      <div style={{ fontSize: 12, color: overdue ? "#ef4444" : "var(--text-secondary)" }}>
                        Vence: {new Date(debt.due_date).toLocaleDateString("es-CO")}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: debt.status === "pagada" ? "#22c55e" : "#ef4444" }}>
                      {fmt(balance)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      de {fmt(debt.amount)}
                    </div>
                  </div>
                </div>

                {/* Pagos registrados */}
                {paidList.length > 0 && (
                  <div style={{ marginTop: 10, padding: "8px 0", borderTop: "1px solid var(--border-color)" }}>
                    {paidList.map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
                        <span>Pago {new Date(p.paid_at).toLocaleDateString("es-CO")}{p.notes ? ` — ${p.notes}` : ""}</span>
                        <span style={{ color: "#22c55e", fontWeight: 600 }}>+{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acciones */}
                {debt.status === "pendiente" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => { setPayDebt(debt); setPayAmount(String(balance)); }}
                      style={btn("primary", { fontSize: 13, padding: "7px 14px" })}
                    >
                      Registrar pago
                    </button>
                    <button
                      onClick={() => handleDelete(debt.id)}
                      style={btn("danger", { fontSize: 13, padding: "7px 14px" })}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva deuda */}
      {showNew && (
        <div style={overlay} onClick={() => setShowNew(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Registrar deuda</h3>
              <button onClick={() => setShowNew(false)} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", color: "var(--text-primary)" }}>X</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <select value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} style={input}>
                <option value="">Proveedor (opcional)</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input
                placeholder="Descripcion (ej: Compra de arroz 50 kg)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={input}
              />
              <input
                type="number"
                placeholder="Monto total de la deuda"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                style={input}
              />
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Fecha de vencimiento (opcional)
                </label>
                <input
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  style={input}
                />
              </div>
              <button onClick={handleCreate} disabled={saving || !newAmount} style={btn("primary", { width: "100%", opacity: saving ? 0.6 : 1 })}>
                {saving ? "Guardando..." : "Registrar deuda"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pago */}
      {payDebt && (
        <div style={overlay} onClick={() => setPayDebt(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Registrar pago</h3>
              <button onClick={() => setPayDebt(null)} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", color: "var(--text-primary)" }}>X</button>
            </div>

            <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {payDebt.suppliers?.name || "Sin proveedor"} — {payDebt.description || "Sin descripcion"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444", marginTop: 4 }}>
                Saldo: {fmt(getBalance(payDebt))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="number"
                placeholder="Monto a pagar"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={input}
                autoFocus
              />
              <input
                placeholder="Nota (opcional)"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                style={input}
              />
              <button
                onClick={handlePay}
                disabled={payLoading || !payAmount}
                style={btn("primary", { width: "100%", opacity: payLoading ? 0.6 : 1 })}
              >
                {payLoading ? "Guardando..." : "Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
