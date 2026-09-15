import { useState, useEffect, useCallback } from "react";
import {
  getSectors,
  createSector,
  deleteSector,
  getTables,
  createTable,
  deleteTable,
  setTableStatus,
  openTableOrder,
  getOpenOrder,
  addItemToOrder,
  removeItemFromOrder,
  updateItemQty,
  closeTableOrder,
  transferOrder,
} from "./tableService";
import { getProducts } from "./productService";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

const STATUS_CFG = {
  libre:     { label: "Libre",     bg: "#22c55e", text: "#fff" },
  ocupada:   { label: "Ocupada",   bg: "#ef4444", text: "#fff" },
  reservada: { label: "Reservada", bg: "#f59e0b", text: "#fff" },
};

// ---- style helpers ----
const btn = (type = "secondary", extra = {}) => ({
  background: type === "primary" ? "var(--accent-color)" : "var(--bg-secondary)",
  color:      type === "primary" ? "#fff" : "var(--text-primary)",
  border:     "1px solid var(--border-color)",
  borderRadius: 8,
  padding:    "10px 18px",
  cursor:     "pointer",
  fontWeight: 600,
  fontSize:   14,
  ...extra,
});

const tab = (active, color) => ({
  background: active ? (color || "var(--accent-color)") : "var(--bg-secondary)",
  color:      active ? "#fff" : "var(--text-primary)",
  border:     "1px solid var(--border-color)",
  borderRadius: 20,
  padding:    "6px 16px",
  cursor:     "pointer",
  fontSize:   13,
  fontWeight: active ? 700 : 400,
  whiteSpace: "nowrap",
});

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const modal = (maxW = 520) => ({
  background:   "var(--bg-primary)",
  borderRadius: 16,
  padding:      24,
  width:        "100%",
  maxWidth:     maxW,
  maxHeight:    "92vh",
  overflowY:    "auto",
  boxShadow:    "0 20px 60px rgba(0,0,0,0.35)",
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

const closeBtn = {
  background:   "var(--bg-secondary)",
  border:       "1px solid var(--border-color)",
  borderRadius: 8,
  padding:      "4px 12px",
  cursor:       "pointer",
  fontSize:     16,
  color:        "var(--text-primary)",
};

const qtyBtn = {
  width:        38,
  height:       38,
  borderRadius: 8,
  border:       "1px solid var(--border-color)",
  background:   "var(--bg-secondary)",
  color:        "var(--text-primary)",
  fontSize:     22,
  cursor:       "pointer",
  display:      "flex",
  alignItems:   "center",
  justifyContent: "center",
  flexShrink:   0,
};

const badge = (status) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.libre;
  return {
    display:      "inline-block",
    background:   cfg.bg,
    color:        cfg.text,
    borderRadius: 20,
    padding:      "2px 10px",
    fontSize:     11,
    fontWeight:   700,
    marginLeft:   8,
  };
};

// ============================================================
export default function TablesModule({ businessId, currentUser }) {
  const [sectors, setSectors]         = useState([]);
  const [tables,  setTables]          = useState([]);
  const [products, setProducts]       = useState([]);
  const [activeSector, setActiveSector] = useState("all");
  const [loading, setLoading]         = useState(true);

  // Mesa seleccionada + orden activa
  const [selTable,  setSelTable]      = useState(null);
  const [curOrder,  setCurOrder]      = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  // Modales
  const [showConfig,   setShowConfig]  = useState(false);
  const [showAddItem,  setShowAddItem] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // Config form
  const [newSecName,  setNewSecName]   = useState("");
  const [newSecColor, setNewSecColor]  = useState("#4CAF50");
  const [newTblNum,   setNewTblNum]    = useState("");
  const [newTblName,  setNewTblName]   = useState("");
  const [newTblCap,   setNewTblCap]    = useState(4);
  const [newTblSec,   setNewTblSec]    = useState("");

  // Agregar item form
  const [searchProd, setSearchProd]   = useState("");
  const [selProd,    setSelProd]      = useState(null);
  const [itemQty,    setItemQty]      = useState(1);
  const [itemNotes,  setItemNotes]    = useState("");

  // Transferir mesa
  const [transferTarget, setTransferTarget] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, p] = await Promise.all([
        getSectors(businessId),
        getTables(businessId),
        getProducts(businessId),
      ]);
      setSectors(s || []);
      setTables(t || []);
      setProducts((p || []).filter((pr) => pr.item_type !== "servicio" && Number(pr.sale_price) > 0));
    } catch (e) {
      console.error("Error cargando mesas:", e);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  // ---- click en mesa ----
  const handleTableClick = async (table) => {
    setSelTable(table);
    setOrderLoading(true);
    try {
      const ord = await getOpenOrder(table.id);
      setCurOrder(ord);
    } catch (e) {
      console.error(e);
    }
    setOrderLoading(false);
  };

  const closeTableModal = () => {
    setSelTable(null);
    setCurOrder(null);
    setShowAddItem(false);
    setShowTransfer(false);
  };

  // ---- abrir orden ----
  const handleOpenOrder = async () => {
    if (!selTable) return;
    setOrderLoading(true);
    try {
      const ord = await openTableOrder(businessId, selTable.id, currentUser?.email || null);
      setCurOrder(ord);
      setTables((prev) =>
        prev.map((t) => (t.id === selTable.id ? { ...t, status: "ocupada" } : t))
      );
      setSelTable((prev) => ({ ...prev, status: "ocupada" }));
    } catch (e) {
      console.error(e);
    }
    setOrderLoading(false);
  };

  // ---- agregar item ----
  const handleAddItem = async () => {
    if (!selProd || !curOrder) return;
    setOrderLoading(true);
    try {
      await addItemToOrder(curOrder.id, {
        product_id:   selProd.id,
        product_name: selProd.name,
        qty:          itemQty,
        unit_price:   selProd.sale_price,
        notes:        itemNotes,
      });
      const updated = await getOpenOrder(selTable.id);
      setCurOrder(updated);
      setShowAddItem(false);
      setSelProd(null);
      setItemQty(1);
      setItemNotes("");
      setSearchProd("");
    } catch (e) {
      console.error(e);
    }
    setOrderLoading(false);
  };

  // ---- quitar item ----
  const handleRemoveItem = async (itemId) => {
    if (!curOrder) return;
    setOrderLoading(true);
    try {
      await removeItemFromOrder(itemId, curOrder.id);
      const updated = await getOpenOrder(selTable.id);
      setCurOrder(updated);
    } catch (e) {
      console.error(e);
    }
    setOrderLoading(false);
  };

  // ---- cambiar cantidad ----
  const handleChangeQty = async (itemId, newQty) => {
    if (!curOrder || newQty < 1) return;
    setOrderLoading(true);
    try {
      await updateItemQty(itemId, curOrder.id, newQty);
      const updated = await getOpenOrder(selTable.id);
      setCurOrder(updated);
    } catch (e) {
      console.error(e);
    }
    setOrderLoading(false);
  };

  // ---- cobrar ----
  const handleCloseOrder = async () => {
    if (!curOrder || !selTable) return;
    const label = selTable.name || `Mesa ${selTable.number}`;
    if (!window.confirm(`Cobrar y cerrar ${label}?\nTotal: ${fmt(curOrder.total)}`)) return;
    setOrderLoading(true);
    try {
      await closeTableOrder(curOrder.id, selTable.id);
      setTables((prev) =>
        prev.map((t) => (t.id === selTable.id ? { ...t, status: "libre" } : t))
      );
      closeTableModal();
    } catch (e) {
      console.error(e);
    }
    setOrderLoading(false);
  };

  // ---- transferir mesa ----
  const handleTransfer = async () => {
    if (!curOrder || !selTable || !transferTarget) return;
    setOrderLoading(true);
    try {
      await transferOrder(curOrder.id, transferTarget, selTable.id);
      load();
      closeTableModal();
    } catch (e) {
      console.error(e);
    }
    setOrderLoading(false);
  };

  // ---- reservar ----
  const handleReserve = async (table) => {
    try {
      const newStatus = table.status === "reservada" ? "libre" : "reservada";
      await setTableStatus(table.id, newStatus);
      setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, status: newStatus } : t)));
      if (selTable?.id === table.id) setSelTable((prev) => ({ ...prev, status: newStatus }));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTables  = activeSector === "all"
    ? tables
    : tables.filter((t) => t.sector_id === activeSector);

  const filteredProds = products.filter((p) =>
    p.name.toLowerCase().includes(searchProd.toLowerCase())
  );

  const orderItems = curOrder?.table_order_items || [];

  // ============================================================
  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
        Cargando salon...
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0" }}>

      {/* ---- Header ---- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: 22, fontWeight: 700 }}>
            Salon de Mesas
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
            {tables.filter((t) => t.status === "ocupada").length} ocupadas ·{" "}
            {tables.filter((t) => t.status === "libre").length} libres ·{" "}
            {tables.filter((t) => t.status === "reservada").length} reservadas
          </p>
        </div>
        <button onClick={() => setShowConfig(true)} style={btn("secondary")}>
          Configurar salon
        </button>
      </div>

      {/* ---- Tabs de sectores ---- */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        <button onClick={() => setActiveSector("all")} style={tab(activeSector === "all")}>
          Todas ({tables.length})
        </button>
        {sectors.map((s) => (
          <button key={s.id} onClick={() => setActiveSector(s.id)} style={tab(activeSector === s.id, s.color)}>
            {s.name} ({tables.filter((t) => t.sector_id === s.id).length})
          </button>
        ))}
      </div>

      {/* ---- Grid de mesas ---- */}
      {filteredTables.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>[ ]</div>
          <p style={{ fontSize: 15, marginBottom: 20 }}>No hay mesas configuradas aun.</p>
          <button onClick={() => setShowConfig(true)} style={btn("primary")}>
            Agregar mesas
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
          {filteredTables.map((table) => {
            const cfg = STATUS_CFG[table.status] || STATUS_CFG.libre;
            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                style={{
                  background:   cfg.bg,
                  color:        cfg.text,
                  borderRadius: 14,
                  padding:      "18px 12px",
                  cursor:       "pointer",
                  textAlign:    "center",
                  boxShadow:    "0 4px 12px rgba(0,0,0,0.2)",
                  transition:   "transform 0.15s, box-shadow 0.15s",
                  userSelect:   "none",
                  position:     "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                }}
              >
                <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{table.number || "-"}</div>
                {table.name && (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4, fontWeight: 600 }}>{table.name}</div>
                )}
                <div style={{
                  fontSize:     11,
                  background:   "rgba(0,0,0,0.25)",
                  borderRadius: 20,
                  padding:      "2px 10px",
                  display:      "inline-block",
                  marginTop:    6,
                  fontWeight:   700,
                }}>
                  {cfg.label}
                </div>
                {table.capacity && (
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                    {table.capacity} pers.
                  </div>
                )}
                {table.restaurant_sectors && (
                  <div style={{
                    position:     "absolute",
                    top:          6,
                    right:        6,
                    background:   "rgba(0,0,0,0.3)",
                    borderRadius: 10,
                    padding:      "1px 6px",
                    fontSize:     9,
                    fontWeight:   700,
                  }}>
                    {table.restaurant_sectors.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          MODAL: ORDEN DE MESA
      ============================================================ */}
      {selTable && !showConfig && (
        <div style={overlay} onClick={closeTableModal}>
          <div style={modal(520)} onClick={(e) => e.stopPropagation()}>

            {/* Header de la orden */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: 20 }}>
                  Mesa {selTable.number}
                  {selTable.name ? ` — ${selTable.name}` : ""}
                  <span style={badge(selTable.status)}>
                    {STATUS_CFG[selTable.status]?.label || "Libre"}
                  </span>
                </h3>
                {selTable.restaurant_sectors && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    Sector: {selTable.restaurant_sectors.name}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {selTable.status === "libre" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReserve(selTable); }}
                    style={btn("secondary", { fontSize: 12, padding: "6px 12px" })}
                  >
                    Reservar
                  </button>
                )}
                {selTable.status === "reservada" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReserve(selTable); }}
                    style={btn("secondary", { fontSize: 12, padding: "6px 12px" })}
                  >
                    Quitar reserva
                  </button>
                )}
                <button onClick={closeTableModal} style={closeBtn}>X</button>
              </div>
            </div>

            {orderLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
                Cargando orden...
              </div>
            ) : !curOrder ? (
              // Mesa libre — abrir orden
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 15 }}>
                  Mesa libre. Abre una orden para empezar a agregar items.
                </p>
                <button onClick={handleOpenOrder} style={btn("primary", { padding: "12px 28px", fontSize: 16 })}>
                  Abrir mesa
                </button>
              </div>
            ) : (
              // Orden activa
              <>
                {/* Lista de items */}
                <div style={{ minHeight: 60, maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
                  {orderItems.length === 0 ? (
                    <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: 20 }}>
                      Sin items aun. Agrega productos.
                    </p>
                  ) : (
                    orderItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display:       "flex",
                          justifyContent: "space-between",
                          alignItems:    "center",
                          padding:       "10px 0",
                          borderBottom:  "1px solid var(--border-color)",
                          gap:           12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>
                            {item.product_name}
                          </div>
                          {item.notes && (
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                              {item.notes}
                            </div>
                          )}
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                            {fmt(item.unit_price)} c/u
                          </div>
                        </div>

                        {/* Controles de cantidad */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => handleChangeQty(item.id, item.qty - 1)}
                            style={{ ...qtyBtn, width: 28, height: 28, fontSize: 18 }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)", minWidth: 24, textAlign: "center" }}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => handleChangeQty(item.id, item.qty + 1)}
                            style={{ ...qtyBtn, width: 28, height: 28, fontSize: 18 }}
                          >
                            +
                          </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100, justifyContent: "flex-end" }}>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            {fmt(item.subtotal)}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total */}
                <div style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  padding:        "14px 0",
                  borderTop:      "2px solid var(--border-color)",
                  marginBottom:   16,
                }}>
                  <span style={{ fontWeight: 800, fontSize: 20, color: "var(--text-primary)" }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 20, color: "var(--accent-color)" }}>
                    {fmt(curOrder.total || 0)}
                  </span>
                </div>

                {/* Acciones */}
                {!showAddItem && !showTransfer && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button
                      onClick={() => setShowAddItem(true)}
                      style={btn("secondary", { gridColumn: "1 / -1" })}
                    >
                      + Agregar item
                    </button>
                    <button
                      onClick={() => setShowTransfer(true)}
                      style={btn("secondary")}
                    >
                      Cambiar mesa
                    </button>
                    <button
                      onClick={handleCloseOrder}
                      disabled={orderItems.length === 0}
                      style={btn("primary")}
                    >
                      Cobrar
                    </button>
                  </div>
                )}

                {/* Sub-panel: Agregar item */}
                {showAddItem && (
                  <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 16, marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4 style={{ margin: 0, color: "var(--text-primary)" }}>Agregar producto</h4>
                      <button onClick={() => { setShowAddItem(false); setSelProd(null); setSearchProd(""); }} style={closeBtn}>
                        X
                      </button>
                    </div>

                    <input
                      placeholder="Buscar producto..."
                      value={searchProd}
                      onChange={(e) => setSearchProd(e.target.value)}
                      style={{ ...input, marginBottom: 8 }}
                      autoFocus
                    />

                    <div style={{
                      maxHeight:    180,
                      overflowY:    "auto",
                      border:       "1px solid var(--border-color)",
                      borderRadius: 8,
                      marginBottom: 12,
                    }}>
                      {filteredProds.slice(0, 30).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelProd(p)}
                          style={{
                            padding:        "10px 12px",
                            cursor:         "pointer",
                            background:     selProd?.id === p.id ? "var(--accent-color)" : "transparent",
                            color:          selProd?.id === p.id ? "#fff" : "var(--text-primary)",
                            borderBottom:   "1px solid var(--border-color)",
                            display:        "flex",
                            justifyContent: "space-between",
                            fontSize:       14,
                          }}
                        >
                          <span>{p.name}</span>
                          <span style={{ fontWeight: 700 }}>{fmt(p.sale_price)}</span>
                        </div>
                      ))}
                    </div>

                    {selProd && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <button onClick={() => setItemQty((q) => Math.max(1, q - 1))} style={qtyBtn}>-</button>
                          <span style={{ fontWeight: 700, fontSize: 20, minWidth: 40, textAlign: "center", color: "var(--text-primary)" }}>
                            {itemQty}
                          </span>
                          <button onClick={() => setItemQty((q) => q + 1)} style={qtyBtn}>+</button>
                          <span style={{ color: "var(--accent-color)", fontWeight: 700, fontSize: 16 }}>
                            = {fmt(selProd.sale_price * itemQty)}
                          </span>
                        </div>
                        <input
                          placeholder="Nota (ej: sin cebolla, termino 3/4)..."
                          value={itemNotes}
                          onChange={(e) => setItemNotes(e.target.value)}
                          style={{ ...input, marginBottom: 10 }}
                        />
                        <button onClick={handleAddItem} style={btn("primary", { width: "100%" })}>
                          Confirmar
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Sub-panel: Transferir mesa */}
                {showTransfer && (
                  <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 16, marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4 style={{ margin: 0, color: "var(--text-primary)" }}>Mover orden a otra mesa</h4>
                      <button onClick={() => setShowTransfer(false)} style={closeBtn}>X</button>
                    </div>
                    <select
                      value={transferTarget}
                      onChange={(e) => setTransferTarget(e.target.value)}
                      style={{ ...input, marginBottom: 12 }}
                    >
                      <option value="">Selecciona mesa destino...</option>
                      {tables
                        .filter((t) => t.id !== selTable.id && t.status === "libre")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            Mesa {t.number}{t.name ? ` — ${t.name}` : ""}{" "}
                            {t.restaurant_sectors ? `(${t.restaurant_sectors.name})` : ""}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={handleTransfer}
                      disabled={!transferTarget}
                      style={btn("primary", { width: "100%" })}
                    >
                      Mover orden
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: CONFIGURACION DEL SALON
      ============================================================ */}
      {showConfig && (
        <div style={overlay} onClick={() => setShowConfig(false)}>
          <div style={modal(540)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: 20 }}>Configurar salon</h3>
              <button onClick={() => setShowConfig(false)} style={closeBtn}>X</button>
            </div>

            {/* Sectores */}
            <h4 style={{ color: "var(--text-secondary)", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
              SECTORES
            </h4>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Nombre (ej: Terraza, Bar, VIP...)"
                value={newSecName}
                onChange={(e) => setNewSecName(e.target.value)}
                style={{ ...input, flex: 1 }}
              />
              <input
                type="color"
                value={newSecColor}
                onChange={(e) => setNewSecColor(e.target.value)}
                style={{ width: 46, height: 42, border: "none", borderRadius: 8, cursor: "pointer", background: "none" }}
                title="Color del sector"
              />
              <button
                onClick={async () => {
                  if (!newSecName.trim()) return;
                  await createSector(businessId, { name: newSecName.trim(), color: newSecColor });
                  setNewSecName("");
                  setNewSecColor("#4CAF50");
                  load();
                }}
                style={btn("primary", { padding: "10px 16px" })}
              >
                +
              </button>
            </div>

            <div style={{ marginBottom: 24, maxHeight: 150, overflowY: "auto" }}>
              {sectors.length === 0 && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Sin sectores aun.</p>
              )}
              {sectors.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "center",
                    padding:        "8px 0",
                    borderBottom:   "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{s.name}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Eliminar sector "${s.name}"?`)) {
                        await deleteSector(s.id);
                        load();
                      }
                    }}
                    style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 13 }}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            {/* Mesas */}
            <h4 style={{ color: "var(--text-secondary)", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
              AGREGAR MESA
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <input
                type="number"
                placeholder="Numero de mesa"
                value={newTblNum}
                onChange={(e) => setNewTblNum(e.target.value)}
                style={input}
              />
              <input
                placeholder="Nombre (opcional)"
                value={newTblName}
                onChange={(e) => setNewTblName(e.target.value)}
                style={input}
              />
              <input
                type="number"
                placeholder="Capacidad (personas)"
                value={newTblCap}
                onChange={(e) => setNewTblCap(Number(e.target.value))}
                style={input}
              />
              <select
                value={newTblSec}
                onChange={(e) => setNewTblSec(e.target.value)}
                style={input}
              >
                <option value="">Sin sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={async () => {
                if (!newTblNum) return;
                await createTable(businessId, {
                  number:    Number(newTblNum),
                  name:      newTblName || null,
                  capacity:  newTblCap,
                  sector_id: newTblSec || null,
                });
                setNewTblNum(""); setNewTblName(""); setNewTblCap(4); setNewTblSec("");
                load();
              }}
              style={btn("primary", { width: "100%", marginBottom: 16 })}
            >
              Agregar mesa
            </button>

            {/* Lista de mesas */}
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {tables.length === 0 && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Sin mesas aun.</p>
              )}
              {tables.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "center",
                    padding:        "7px 0",
                    borderBottom:   "1px solid var(--border-color)",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                      Mesa {t.number}{t.name ? ` — ${t.name}` : ""}
                    </span>
                    {t.restaurant_sectors && (
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>
                        ({t.restaurant_sectors.name})
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>
                      {t.capacity} pers.
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Eliminar Mesa ${t.number}?`)) {
                        await deleteTable(t.id);
                        load();
                      }
                    }}
                    style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
