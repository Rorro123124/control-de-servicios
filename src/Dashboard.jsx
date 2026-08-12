import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  registerSale,
  createBusiness,
  renameBusiness,
  deleteBusiness,
  updateBusinessProfile,
  getSuppliers,
  addSupplier,
  deleteSupplier,
} from "./productService";
import { createInvoice } from "./invoiceService";
import { generateInvoicePdf } from "./pdfService";
import { printInvoice } from "./printService";
import { exportToExcel } from "./excelService";
import { getSellers, addSeller } from "./sellerService";
import { exportBackup } from "./backupService";
import { getMembers, inviteMember, removeMember, getMyRole } from "./memberService";
import { getOpenSession, openSession, computeExpectedCash, closeSession } from "./cashService";
import { getCustomers, addCustomer, findOrCreateCustomer, getDebts, addDebt, addPayment } from "./debtService";
import { getVariants, addVariant, deleteVariant } from "./variantService";
import { getOpenCount, startCount, updateCountItem, applyCount, cancelCount } from "./countService";
import { createQuote, getQuotes, convertQuoteToSale } from "./quoteService";
import { generateQuotePdf } from "./pdfService";
import HelpWidget from "./HelpWidget";
import ChatWidget from "./ChatWidget";
import GastosModal from "./GastosModal";
import { getExpenses } from "./expenseService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = {
  urgente: "#D6483C",
  urgenteBg: "#FBE8E5",
  atencion: "#C98A1F",
  atencionBg: "#FAF0DC",
  bien: "#2F7A56",
  bienBg: "#E4F1EA",
  fondo: "#F5F3EE",
  panel: "#FFFFFF",
  borde: "#E4DFD3",
  texto: "#211D17",
  textoSuave: "#736C5E",
  marca: "#154B3E",
  marcaClaro: "#1F6F5C",
  acento: "#E5A13C",
};

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'IBM Plex Sans', -apple-system, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

const emptyForm = { name: "", category: "", stock: "", salePrice: "", realCost: "", avgDailyDemand: "", expirationDate: "", supplierId: "", itemType: "producto", barcode: "", photoUrl: "", showInCatalog: true, hasVariants: false };
const emptyVariant = { name: "", stock: "", barcode: "" };
const emptySupplier = { name: "", phone: "", notes: "" };
const emptyBusinessProfile = { nit: "", address: "", phone: "", logoUrl: "", instagram: "", thankYouMessage: "", taxRate: "", taxLabel: "", deletePin: "" };
const emptyBuyer = { name: "", lastname: "", idNumber: "", phone: "", deliveryType: "lugar", address: "", deliveryFee: "", cashierName: "", paymentMethod: "efectivo", paymentCashAmount: "", paymentTransferAmount: "", dueDate: "" };
const emptyCustomer = { name: "", lastname: "", idNumber: "", phone: "" };

function formatCOP(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}
function formatMiles(value) {
  if (value === "" || value == null) return "";
  return Number(value).toLocaleString("es-CO");
}
function soloDigitos(texto) {
  return texto.replace(/\D/g, "");
}

function demandaDiaria(p) {
  const hist = p.salesHistory || [];
  if (hist.length === 0) return Number(p.avgDailyDemand) || 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 13);
  const total = hist.filter((h) => new Date(h.date) >= cutoff).reduce((s, h) => s + h.qty, 0);
  return total / 14;
}

function diasParaVencer(p) {
  if (!p.expirationDate) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const exp = new Date(p.expirationDate + "T00:00:00");
  return Math.ceil((exp - hoy) / 86400000);
}

function unidadesVendidas(p, dias) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dias + 1);
  return (p.salesHistory || []).filter((h) => new Date(h.date) >= cutoff).reduce((s, h) => s + h.qty, 0);
}

function analizar(p) {
  const vence = diasParaVencer(p);
  if (p.itemType === "servicio") {
    return { demanda: 0, minimo: 0, estado: "bien", sugerido: 0, vence };
  }
  const demanda = demandaDiaria(p);
  const minimo = Math.max(3, Math.ceil(demanda * 5));
  const objetivo = Math.max(minimo, Math.ceil(demanda * 14));
  const stock = Number(p.stock) || 0;

  let estado = "bien";
  if (stock <= minimo) estado = "urgente";
  else if (stock <= minimo * 2) estado = "atencion";

  const sugerido = estado !== "bien" ? Math.max(0, objetivo - stock) : 0;

  return { demanda, minimo, estado, sugerido, vence };
}

function ultimosDias(n) {
  const dias = [];
  const hoy = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

const ESTADO_TEXTO = {
  urgente: "Se esta acabando",
  atencion: "Vigilalo",
  bien: "Vas bien",
};

const inputStyle = {
  padding: "9px 11px",
  borderRadius: 8,
  border: "1px solid " + COLORS.borde,
  fontFamily: FONT_BODY,
  fontSize: 14,
  color: COLORS.texto,
  background: "#fff",
};

const labelStyle = {
  fontSize: 12,
  color: COLORS.textoSuave,
  fontFamily: FONT_BODY,
  fontWeight: 600,
};

const panelStyle = {
  background: COLORS.panel,
  borderRadius: 14,
  padding: 20,
  border: "1px solid " + COLORS.borde,
  boxShadow: "0 1px 2px rgba(33,29,23,0.04)",
};

const sectionTitleStyle = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 600,
  fontSize: 16,
  color: COLORS.texto,
  marginBottom: 14,
  letterSpacing: "-0.01em",
};

function btnPrimary(extra) {
  return { padding: "10px 16px", borderRadius: 9, border: "none", background: COLORS.marca, color: "white", fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, ...extra };
}
function btnGhost(extra) {
  return { padding: "10px 16px", borderRadius: 9, border: "1px solid " + COLORS.borde, background: "white", color: COLORS.texto, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, ...extra };
}
function btnDanger(extra) {
  return { padding: "10px 16px", borderRadius: 9, border: "1px solid #EBC9C4", background: "white", color: COLORS.urgente, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, ...extra };
}

export default function Dashboard({ businessId, businessName, businesses, onSwitchBusiness, onBusinessesChange }) {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [query, setQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [orden, setOrden] = useState("estado");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);
  const [ventaTemp, setVentaTemp] = useState({});
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [showBusinessProfile, setShowBusinessProfile] = useState(false);
  const [businessProfileForm, setBusinessProfileForm] = useState(emptyBusinessProfile);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [invoiceProductId, setInvoiceProductId] = useState("");
  const [invoiceQty, setInvoiceQty] = useState("1");
  const [scanInput, setScanInput] = useState("");
  const [buyerForm, setBuyerForm] = useState(emptyBuyer);
  const [generandoFactura, setGenerandoFactura] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [respaldando, setRespaldando] = useState(false);
  const [misRol, setMisRol] = useState("vendedor");
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("vendedor");

  const esAdmin = misRol === "admin";

  const [cashSession, setCashSession] = useState(null);
  const [showOpenCaja, setShowOpenCaja] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [showCloseCaja, setShowCloseCaja] = useState(false);
  const [expectedCash, setExpectedCash] = useState(0);
  const [countedAmount, setCountedAmount] = useState("");
  const [cargandoCaja, setCargandoCaja] = useState(false);
  const [showFiado, setShowFiado] = useState(false);
  const [gastos, setGastos] = useState([]);
  const [showGastos, setShowGastos] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [debts, setDebts] = useState([]);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [abonoTemp, setAbonoTemp] = useState({});
  const [productVariants, setProductVariants] = useState([]);
  const [variantForm, setVariantForm] = useState(emptyVariant);
  const [expandedVariantsId, setExpandedVariantsId] = useState(null);
  const [variantSaleTemp, setVariantSaleTemp] = useState({});
  const [invoiceVariantId, setInvoiceVariantId] = useState("");
  const [showConteo, setShowConteo] = useState(false);
  const [conteoActual, setConteoActual] = useState(null);
  const [conteoTemp, setConteoTemp] = useState({});
  const [cargandoConteo, setCargandoConteo] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [quoteItems, setQuoteItems] = useState([]);
  const [quoteProductId, setQuoteProductId] = useState("");
  const [quoteVariantId, setQuoteVariantId] = useState("");
  const [quoteQty, setQuoteQty] = useState("1");
  const emptyQuoteBuyer = { name: "", lastname: "", idNumber: "", phone: "", validUntil: "" };
  const [quoteBuyerForm, setQuoteBuyerForm] = useState(emptyQuoteBuyer);
  const [generandoCotizacion, setGenerandoCotizacion] = useState(false);
  const [vistaActiva, setVistaActiva] = useState("inicio");

  const currentBusiness = businesses.find((b) => b.id === businessId) || {};

  const cargar = async () => {
    setCargando(true);
    const prods = await getProducts(businessId);
    const provs = await getSuppliers(businessId);
    const vends = await getSellers(businessId);
    const gastosData = await getExpenses(businessId);
    setProducts(prods);
    setSuppliers(provs);
    setSellers(vends);
    setGastos(gastosData);
    setCargando(false);
  };

  const recargarGastos = async () => {
    const gastosData = await getExpenses(businessId);
    setGastos(gastosData);
  };

  useEffect(() => { cargar(); }, [businessId]);

  useEffect(() => {
    if (!currentBusiness.id) return;
    getMyRole(currentBusiness).then(setMisRol);
  }, [businessId, currentBusiness.id]);

  useEffect(() => {
    if (!businessId) return;
    getOpenSession(businessId).then(setCashSession);
  }, [businessId]);

  const categoriasDisponibles = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filtrados = useMemo(() => {
    const q = query.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q))
      .map((p) => ({ ...p, analisis: analizar(p) }))
      .filter((p) => filtroEstado === "todos" || p.analisis.estado === filtroEstado)
      .filter((p) => filtroCategoria === "todas" || p.category === filtroCategoria)
      .filter((p) => filtroTipo === "todos" || p.itemType === filtroTipo)
      .sort((a, b) => {
        if (orden === "estado") {
          const ordenEstado = { urgente: 0, atencion: 1, bien: 2 };
          return ordenEstado[a.analisis.estado] - ordenEstado[b.analisis.estado];
        }
        if (orden === "nombre") return a.name.localeCompare(b.name);
        if (orden === "stock") return Number(a.stock) - Number(b.stock);
        if (orden === "masVendido") return unidadesVendidas(b, 30) - unidadesVendidas(a, 30);
        return 0;
      });
  }, [products, query, filtroEstado, filtroCategoria, filtroTipo, orden]);

  const resumen = useMemo(() => {
    const urgentes = products.filter((p) => analizar(p).estado === "urgente").length;
    const atencion = products.filter((p) => analizar(p).estado === "atencion").length;
    const valorInventario = products.reduce((s, p) => s + Number(p.stock) * Number(p.salePrice), 0);
    return { urgentes, atencion, total: products.length, valorInventario };
  }, [products]);

  const topVendidos = useMemo(() => {
    return products
      .map((p) => ({ ...p, vendidos: unidadesVendidas(p, 30) }))
      .filter((p) => p.vendidos > 0)
      .sort((a, b) => b.vendidos - a.vendidos)
      .slice(0, 5);
  }, [products]);

  const porVencer = useMemo(() => {
    return products
      .map((p) => ({ ...p, vence: diasParaVencer(p) }))
      .filter((p) => p.vence != null && Number(p.stock) > 0)
      .sort((a, b) => a.vence - b.vence)
      .slice(0, 5);
  }, [products]);

  const gananciaHoy = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    let ingresos = 0;
    let costo = 0;
    products.forEach((p) => {
      const venta = (p.salesHistory || []).find((h) => h.date === hoy);
      if (venta) {
        ingresos += venta.qty * Number(p.salePrice || 0);
        costo += venta.qty * Number(p.realCost || 0);
      }
    });
    const ganancia = Math.max(0, ingresos - costo);
    return { ingresos, costo, ganancia };
  }, [products]);

  const gananciaNetaMes = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    let ingresos = 0;
    let costo = 0;
    products.forEach((p) => {
      (p.salesHistory || []).forEach((h) => {
        if (h.date.slice(0, 7) === mesActual) {
          ingresos += h.qty * Number(p.salePrice || 0);
          costo += h.qty * Number(p.realCost || 0);
        }
      });
    });
    const gananciaBruta = ingresos - costo;
    const totalGastos = gastos
      .filter((g) => g.expense_date.slice(0, 7) === mesActual)
      .reduce((s, g) => s + Number(g.amount), 0);
    const neta = gananciaBruta - totalGastos;
    return { ingresos, costo, gananciaBruta, totalGastos, neta };
  }, [products, gastos]);

  const flujoCaja = useMemo(() => {
    const dias = ultimosDias(14);
    return dias.map((fecha) => {
      let total = 0;
      products.forEach((p) => {
        const venta = (p.salesHistory || []).find((h) => h.date === fecha);
        if (venta) total += venta.qty * Number(p.salePrice);
      });
      return { fecha: fecha.slice(5), total: total };
    });
  }, [products]);

  const invoiceTotal = useMemo(() => {
    const itemsTotal = invoiceItems.reduce((s, it) => s + Number(it.salePrice) * Number(it.qty), 0);
    const fee = buyerForm.deliveryType === "domicilio" ? Number(buyerForm.deliveryFee) || 0 : 0;
    return itemsTotal + fee;
  }, [invoiceItems, buyerForm.deliveryType, buyerForm.deliveryFee]);

  const customersConSaldo = useMemo(() => {
    return customers
      .map((c) => ({
        ...c,
        saldo: debts.filter((d) => d.customer_id === c.id).reduce((s, d) => s + Number(d.balance), 0),
        deudas: debts.filter((d) => d.customer_id === c.id),
      }))
      .sort((a, b) => b.saldo - a.saldo);
  }, [customers, debts]);

  const totalPorCobrar = useMemo(() => debts.reduce((s, d) => s + Number(d.balance), 0), [debts]);

  const quoteTotal = useMemo(() => quoteItems.reduce((s, it) => s + Number(it.salePrice) * Number(it.qty), 0), [quoteItems]);

  const abrirNuevo = () => {
    setForm(emptyForm);
    setEditingId(null);
    setProductVariants([]);
    setVariantForm(emptyVariant);
    setShowForm(true);
  };

  const abrirEditar = async (p) => {
    setForm({
      name: p.name,
      category: p.category,
      stock: p.stock,
      salePrice: p.salePrice,
      realCost: p.realCost,
      avgDailyDemand: p.avgDailyDemand,
      expirationDate: p.expirationDate,
      supplierId: p.supplierId || "",
      itemType: p.itemType || "producto",
      barcode: p.barcode || "",
      photoUrl: p.photoUrl || "",
      showInCatalog: p.showInCatalog !== false,
      hasVariants: p.hasVariants || false,
    });
    setEditingId(p.id);
    setVariantForm(emptyVariant);
    if (p.hasVariants) {
      const vars = await getVariants(p.id);
      setProductVariants(vars);
    } else {
      setProductVariants([]);
    }
    setShowForm(true);
  };

  const agregarVariante = async () => {
    if (!variantForm.name.trim()) return;
    await addVariant(editingId, variantForm.name, variantForm.stock, variantForm.barcode);
    const vars = await getVariants(editingId);
    setProductVariants(vars);
    setVariantForm(emptyVariant);
  };

  const eliminarVariante = async (id) => {
    const ok = confirm("Eliminar esta variante?");
    if (!ok) return;
    await deleteVariant(id);
    const vars = await getVariants(editingId);
    setProductVariants(vars);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateProduct(editingId, form);
      if (form.hasVariants) {
        cargar();
        return;
      }
    } else {
      const creado = await addProduct(businessId, form);
      if (form.hasVariants && creado) {
        setEditingId(creado.id);
        setProductVariants([]);
        cargar();
        return;
      }
    }
    setShowForm(false);
    cargar();
  };

  const eliminar = async (id) => {
    const ok = confirm("Eliminar este producto? No se puede deshacer.");
    if (!ok) return;
    await deleteProduct(id);
    cargar();
  };

  const vender = async (id) => {
    const cantidad = Number(ventaTemp[id]);
    if (!cantidad || cantidad <= 0) return;
    await registerSale(id, cantidad);
    setVentaTemp((v) => ({ ...v, [id]: "" }));
    cargar();
  };

  const venderVariante = async (productId, variantId) => {
    const cantidad = Number(variantSaleTemp[variantId]);
    if (!cantidad || cantidad <= 0) return;
    await registerSale(productId, cantidad, new Date().toISOString().slice(0, 10), variantId);
    setVariantSaleTemp((v) => ({ ...v, [variantId]: "" }));
    cargar();
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    await addSupplier(businessId, supplierForm);
    setSupplierForm(emptySupplier);
    cargar();
  };

  const eliminarProveedor = async (id) => {
    const ok = confirm("Eliminar este proveedor? Los productos quedaran sin proveedor asignado.");
    if (!ok) return;
    await deleteSupplier(id);
    cargar();
  };

  const abrirPerfilNegocio = () => {
    setBusinessProfileForm({
      nit: currentBusiness.nit || "",
      address: currentBusiness.address || "",
      phone: currentBusiness.phone || "",
      logoUrl: currentBusiness.logo_url || "",
      instagram: currentBusiness.instagram || "",
      thankYouMessage: currentBusiness.thank_you_message || "",
      taxRate: currentBusiness.tax_rate || "",
      taxLabel: currentBusiness.tax_label || "",
      deletePin: currentBusiness.delete_pin || "",
    });
    getMembers(businessId).then(setMembers);
    setShowBusinessProfile(true);
  };

  const invitarEmpleado = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember(businessId, inviteEmail, inviteRole);
      const mems = await getMembers(businessId);
      setMembers(mems);
      setInviteEmail("");
    } catch (err) {
      alert("Hubo un error invitando al empleado: " + err.message);
    }
  };

  const quitarEmpleado = async (id) => {
    const ok = confirm("Quitar a este empleado de la tienda?");
    if (!ok) return;
    await removeMember(id);
    const mems = await getMembers(businessId);
    setMembers(mems);
  };

  const guardarPerfilNegocio = async (e) => {
    e.preventDefault();
    await updateBusinessProfile(businessId, businessProfileForm);
    setShowBusinessProfile(false);
    onBusinessesChange();
  };

  const abrirFactura = () => {
    setInvoiceItems([]);
    setInvoiceProductId("");
    setInvoiceQty("1");
    setBuyerForm(emptyBuyer);
    setShowInvoice(true);
  };

  const agregarItemFactura = () => {
    const cantidad = Number(invoiceQty);
    if (!invoiceProductId || !cantidad || cantidad <= 0) return;
    const producto = products.find((p) => p.id === invoiceProductId);
    if (!producto) return;

    if (producto.hasVariants) {
      if (!invoiceVariantId) {
        alert("Selecciona una variante.");
        return;
      }
      const variante = (producto.variants || []).find((v) => v.id === invoiceVariantId);
      if (!variante) return;
      const nombreCompleto = producto.name + " - " + variante.name;

      setInvoiceItems((items) => {
        const existente = items.find((it) => it.variantId === variante.id);
        if (existente) {
          return items.map((it) => (it.variantId === variante.id ? { ...it, qty: Number(it.qty) + cantidad } : it));
        }
        return [...items, { productId: producto.id, variantId: variante.id, name: nombreCompleto, salePrice: producto.salePrice, qty: cantidad }];
      });
      setInvoiceVariantId("");
    } else {
      setInvoiceItems((items) => {
        const existente = items.find((it) => it.productId === producto.id && !it.variantId);
        if (existente) {
          return items.map((it) => (it.productId === producto.id && !it.variantId ? { ...it, qty: Number(it.qty) + cantidad } : it));
        }
        return [...items, { productId: producto.id, variantId: null, name: producto.name, salePrice: producto.salePrice, qty: cantidad }];
      });
    }
    setInvoiceProductId("");
    setInvoiceQty("1");
  };

  const quitarItemFactura = (productId) => {
    setInvoiceItems((items) => items.filter((it) => it.productId !== productId));
  };

  const escanearCodigo = (codigo) => {
    const codigoLimpio = codigo.trim();
    const producto = products.find((p) => p.barcode && p.barcode === codigoLimpio);
    if (producto) {
      setInvoiceItems((items) => {
        const existente = items.find((it) => it.productId === producto.id && !it.variantId);
        if (existente) {
          return items.map((it) => (it.productId === producto.id && !it.variantId ? { ...it, qty: Number(it.qty) + 1 } : it));
        }
        return [...items, { productId: producto.id, variantId: null, name: producto.name, salePrice: producto.salePrice, qty: 1 }];
      });
      setScanInput("");
      return;
    }

    for (const p of products) {
      const variante = (p.variants || []).find((v) => v.barcode && v.barcode === codigoLimpio);
      if (variante) {
        const nombreCompleto = p.name + " - " + variante.name;
        setInvoiceItems((items) => {
          const existente = items.find((it) => it.variantId === variante.id);
          if (existente) {
            return items.map((it) => (it.variantId === variante.id ? { ...it, qty: Number(it.qty) + 1 } : it));
          }
          return [...items, { productId: p.id, variantId: variante.id, name: nombreCompleto, salePrice: p.salePrice, qty: 1 }];
        });
        setScanInput("");
        return;
      }
    }

    alert("No se encontro ningun producto con ese codigo de barras.");
    setScanInput("");
  };

  const cambiarCantidadFactura = (productId, qty) => {
    setInvoiceItems((items) => items.map((it) => (it.productId === productId ? { ...it, qty } : it)));
  };

  const procesarFactura = async (modo) => {
    if (invoiceItems.length === 0) {
      alert("Agrega al menos un producto a la factura.");
      return;
    }
    if (buyerForm.paymentMethod === "fiado" && !buyerForm.name.trim()) {
      alert("Para fiar una venta necesitas el nombre del cliente.");
      return;
    }
    setGenerandoFactura(true);
    try {
      const invoice = await createInvoice(businessId, invoiceItems, buyerForm);

      if (buyerForm.paymentMethod === "fiado") {
        const cliente = await findOrCreateCustomer(businessId, buyerForm.name, buyerForm.lastname, buyerForm.idNumber, buyerForm.phone);
        await addDebt(businessId, cliente.id, invoice.total, "Factura #" + invoice.invoice_number, invoice.id, buyerForm.dueDate || null);
      }

      const itemsParaPdf = invoiceItems.map((it) => ({
        product_name: it.name,
        qty: it.qty,
        unit_price: it.salePrice,
        subtotal: Number(it.salePrice) * Number(it.qty),
      }));
      if (modo === "imprimir") {
        printInvoice(currentBusiness, invoice, itemsParaPdf);
      } else {
        await generateInvoicePdf(currentBusiness, invoice, itemsParaPdf);
      }
      setShowInvoice(false);
      cargar();
    } catch (err) {
      alert("Hubo un error generando la factura: " + err.message);
    } finally {
      setGenerandoFactura(false);
    }
  };

  const nuevoVendedor = async () => {
    const nombre = prompt("Nombre del nuevo vendedor:");
    if (!nombre) return;
    await addSeller(businessId, nombre);
    const vends = await getSellers(businessId);
    setSellers(vends);
    setBuyerForm((f) => ({ ...f, cashierName: nombre }));
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      await exportToExcel(businessId, businessName);
    } catch (err) {
      alert("Hubo un error exportando a Excel: " + err.message);
    } finally {
      setExportando(false);
    }
  };

  const exportarBackup = async () => {
    setRespaldando(true);
    try {
      await exportBackup(businessId, businessName, currentBusiness);
    } catch (err) {
      alert("Hubo un error generando el respaldo: " + err.message);
    } finally {
      setRespaldando(false);
    }
  };

  const abrirModalCaja = () => {
    setOpeningAmount("");
    setShowOpenCaja(true);
  };

  const confirmarAbrirCaja = async () => {
    setCargandoCaja(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const nombreQuienAbre = (userData && userData.user && userData.user.email) || "Desconocido";
      const sesion = await openSession(businessId, openingAmount, nombreQuienAbre);
      setCashSession(sesion);
      setShowOpenCaja(false);
    } catch (err) {
      alert("Hubo un error abriendo la caja: " + err.message);
    } finally {
      setCargandoCaja(false);
    }
  };

  const abrirModalCerrarCaja = async () => {
    setCargandoCaja(true);
    try {
      const esperado = await computeExpectedCash(businessId, cashSession);
      setExpectedCash(esperado);
      setCountedAmount("");
      setShowCloseCaja(true);
    } catch (err) {
      alert("Hubo un error calculando el efectivo esperado: " + err.message);
    } finally {
      setCargandoCaja(false);
    }
  };

  const confirmarCerrarCaja = async () => {
    if (countedAmount === "") {
      alert("Ingresa cuanto efectivo contaste.");
      return;
    }
    setCargandoCaja(true);
    try {
      const diferencia = await closeSession(cashSession.id, countedAmount, expectedCash);
      const mensaje =
        diferencia === 0
          ? "Caja cuadrada perfectamente!"
          : diferencia > 0
          ? "Sobraron " + formatCOP(diferencia) + " en la caja."
          : "Faltaron " + formatCOP(Math.abs(diferencia)) + " en la caja.";
      alert(mensaje);
      setCashSession(null);
      setShowCloseCaja(false);
    } catch (err) {
      alert("Hubo un error cerrando la caja: " + err.message);
    } finally {
      setCargandoCaja(false);
    }
  };

  const cargarFiado = async () => {
    const custs = await getCustomers(businessId);
    const dbts = await getDebts(businessId);
    setCustomers(custs);
    setDebts(dbts);
  };

  const abrirFiado = async () => {
    setCustomerForm(emptyCustomer);
    setExpandedCustomerId(null);
    await cargarFiado();
    setShowFiado(true);
  };

  const guardarClienteFiado = async (e) => {
    e.preventDefault();
    await addCustomer(businessId, customerForm);
    setCustomerForm(emptyCustomer);
    cargarFiado();
  };

  const registrarAbono = async (debtId) => {
    const monto = Number(abonoTemp[debtId]);
    if (!monto || monto <= 0) return;
    try {
      await addPayment(debtId, monto);
      setAbonoTemp((v) => ({ ...v, [debtId]: "" }));
      cargarFiado();
    } catch (err) {
      alert("Hubo un error registrando el abono: " + err.message);
    }
  };

  const abrirConteo = async () => {
    setCargandoConteo(true);
    try {
      let conteo = await getOpenCount(businessId);
      if (!conteo) {
        const { data: userData } = await supabase.auth.getUser();
        const nombre = (userData && userData.user && userData.user.email) || "Desconocido";
        conteo = await startCount(businessId, nombre);
      }
      setConteoActual(conteo);
      setConteoTemp({});
      setShowConteo(true);
    } catch (err) {
      alert("Hubo un error abriendo el conteo: " + err.message);
    } finally {
      setCargandoConteo(false);
    }
  };

  const guardarConteoItem = async (itemId, systemStock) => {
    const valor = conteoTemp[itemId];
    if (valor === undefined || valor === "") return;
    try {
      await updateCountItem(itemId, valor, systemStock);
      const conteo = await getOpenCount(businessId);
      setConteoActual(conteo);
    } catch (err) {
      alert("Hubo un error guardando el conteo: " + err.message);
    }
  };

  const confirmarAplicarConteo = async () => {
    const ok = confirm("Esto va a ajustar el stock de todos los productos contados a lo que escribiste. Continuar?");
    if (!ok) return;
    setCargandoConteo(true);
    try {
      await applyCount(conteoActual.id);
      setShowConteo(false);
      setConteoActual(null);
      cargar();
    } catch (err) {
      alert("Hubo un error aplicando el conteo: " + err.message);
    } finally {
      setCargandoConteo(false);
    }
  };

  const confirmarCancelarConteo = async () => {
    const ok = confirm("Cancelar este conteo? Se perdera lo que llevas registrado.");
    if (!ok) return;
    setCargandoConteo(true);
    try {
      await cancelCount(conteoActual.id);
      setShowConteo(false);
      setConteoActual(null);
    } catch (err) {
      alert("Hubo un error cancelando el conteo: " + err.message);
    } finally {
      setCargandoConteo(false);
    }
  };

  const abrirCotizaciones = async () => {
    setQuoteItems([]);
    setQuoteProductId("");
    setQuoteVariantId("");
    setQuoteQty("1");
    setQuoteBuyerForm(emptyQuoteBuyer);
    const lista = await getQuotes(businessId);
    setQuotes(lista);
    setShowQuotes(true);
  };

  const agregarItemCotizacion = () => {
    const cantidad = Number(quoteQty);
    if (!quoteProductId || !cantidad || cantidad <= 0) return;
    const producto = products.find((p) => p.id === quoteProductId);
    if (!producto) return;

    if (producto.hasVariants) {
      if (!quoteVariantId) {
        alert("Selecciona una variante.");
        return;
      }
      const variante = (producto.variants || []).find((v) => v.id === quoteVariantId);
      if (!variante) return;
      setQuoteItems((items) => [...items, { productId: producto.id, variantId: variante.id, name: producto.name + " - " + variante.name, salePrice: producto.salePrice, qty: cantidad }]);
      setQuoteVariantId("");
    } else {
      setQuoteItems((items) => [...items, { productId: producto.id, variantId: null, name: producto.name, salePrice: producto.salePrice, qty: cantidad }]);
    }
    setQuoteProductId("");
    setQuoteQty("1");
  };

  const quitarItemCotizacion = (index) => {
    setQuoteItems((items) => items.filter((_, i) => i !== index));
  };

  const generarCotizacion = async () => {
    if (quoteItems.length === 0) {
      alert("Agrega al menos un producto.");
      return;
    }
    setGenerandoCotizacion(true);
    try {
      const quote = await createQuote(businessId, quoteItems, quoteBuyerForm);
      const itemsParaPdf = quoteItems.map((it) => ({
        product_name: it.name,
        qty: it.qty,
        subtotal: Number(it.salePrice) * Number(it.qty),
      }));
      await generateQuotePdf(currentBusiness, quote, itemsParaPdf);
      setQuoteItems([]);
      setQuoteBuyerForm(emptyQuoteBuyer);
      const lista = await getQuotes(businessId);
      setQuotes(lista);
    } catch (err) {
      alert("Hubo un error generando la cotizacion: " + err.message);
    } finally {
      setGenerandoCotizacion(false);
    }
  };

  const convertirCotizacion = async (quote) => {
    const ok = confirm("Convertir esta cotizacion en una venta real? Esto descontara el stock.");
    if (!ok) return;
    try {
      await convertQuoteToSale(businessId, quote);
      const lista = await getQuotes(businessId);
      setQuotes(lista);
      cargar();
      alert("Cotizacion convertida en venta.");
    } catch (err) {
      alert("Hubo un error convirtiendo la cotizacion: " + err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.fondo, fontFamily: FONT_BODY, color: COLORS.texto }}>

      <div style={{ background: COLORS.marca, color: "white" }}>
        <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600 }}>Control de Servicios</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <select
              value={businessId}
              onChange={(e) => onSwitchBusiness(e.target.value)}
              style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, border: "none", background: "transparent", color: "white", cursor: "pointer", maxWidth: 200 }}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id} style={{ color: "#111" }}>{b.name}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                const nombre = prompt("Nombre de la nueva tienda:");
                if (!nombre) return;
                await createBusiness(nombre);
                onBusinessesChange();
              }}
              title="Nueva tienda"
              style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", color: "white", borderRadius: 7, width: 26, height: 26, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12 }}
            >+</button>
            <button
              onClick={async () => {
                const nombre = prompt("Nuevo nombre:", businessName);
                if (!nombre) return;
                await renameBusiness(businessId, nombre);
                onBusinessesChange();
              }}
              title="Renombrar tienda"
              style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", color: "white", borderRadius: 7, width: 26, height: 26, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 11 }}
            >Ren</button>
            {businesses.length > 1 && esAdmin && (
              <button
                onClick={async () => {
                  if (currentBusiness.delete_pin) {
                    const intento = prompt("Ingresa el PIN para eliminar '" + businessName + "':");
                    if (intento === null) return;
                    if (intento !== currentBusiness.delete_pin) {
                      alert("PIN incorrecto. No se elimino la tienda.");
                      return;
                    }
                  }
                  const ok = confirm("Eliminar " + businessName + " y todo su inventario? No se puede deshacer.");
                  if (!ok) return;
                  await deleteBusiness(businessId);
                  onBusinessesChange();
                }}
                title="Eliminar tienda"
                style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", color: "#F3BDB6", borderRadius: 7, width: 26, height: 26, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 11 }}
              >Del</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {cashSession ? (
              <span style={{ fontSize: 12, background: "rgba(255,255,255,0.15)", padding: "5px 10px", borderRadius: 999 }}>🟢 Caja abierta</span>
            ) : null}
            <button onClick={() => supabase.auth.signOut()} style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", color: "white", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13 }}>
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <aside style={{ width: 220, minWidth: 220, background: "white", borderRight: "1px solid " + COLORS.borde, minHeight: "calc(100vh - 57px)", padding: "18px 12px", position: "sticky", top: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textoSuave, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px", marginBottom: 6 }}>Vista</div>
          <button onClick={() => setVistaActiva("inicio")} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: vistaActiva === "inicio" ? COLORS.bienBg : "transparent", color: vistaActiva === "inicio" ? COLORS.marcaClaro : COLORS.texto, fontWeight: vistaActiva === "inicio" ? 700 : 500, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, marginBottom: 2 }}>
            Inicio
          </button>
          <button onClick={() => setVistaActiva("inventario")} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: vistaActiva === "inventario" ? COLORS.bienBg : "transparent", color: vistaActiva === "inventario" ? COLORS.marcaClaro : COLORS.texto, fontWeight: vistaActiva === "inventario" ? 700 : 500, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, marginBottom: 12 }}>
            Inventario
          </button>

          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textoSuave, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px", marginBottom: 6 }}>Ventas</div>
          <button onClick={abrirFactura} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: COLORS.acento, color: "#2B2107", fontWeight: 700, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, marginBottom: 2 }}>
            + Nueva factura
          </button>
          <button onClick={cashSession ? abrirModalCerrarCaja : abrirModalCaja} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14 }}>
            {cashSession ? "Cerrar caja" : "Abrir caja"}
          </button>
          <button onClick={abrirFiado} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14 }}>
            Fiado
          </button>
          <button onClick={abrirCotizaciones} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, marginBottom: 12 }}>
            Cotizaciones
          </button>

          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textoSuave, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px", marginBottom: 6 }}>Inventario</div>
          <button onClick={abrirConteo} disabled={cargandoConteo} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14 }}>
            Conteo fisico
          </button>
          <button onClick={() => setShowSuppliers(true)} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14 }}>
            Proveedores
          </button>
          <button
            onClick={() => {
              const link = window.location.origin + "/catalogo/" + businessId;
              navigator.clipboard.writeText(link);
              alert("Link copiado! Compartelo por WhatsApp:\n\n" + link);
            }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14, marginBottom: 12 }}
          >
            Catalogo publico
          </button>

          {esAdmin && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textoSuave, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px", marginBottom: 6 }}>Negocio</div>
              <button onClick={abrirPerfilNegocio} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14 }}>
                Datos negocio
              </button>
              <button onClick={() => setShowGastos(true)} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14 }}>
                Gastos
              </button>
              <button onClick={exportarExcel} disabled={exportando} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14 }}>
                {exportando ? "Exportando..." : "Exportar Excel"}
              </button>
              <button onClick={exportarBackup} disabled={respaldando} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 14 }}>
                {respaldando ? "..." : "Respaldo"}
              </button>
            </>
          )}
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: "24px", maxWidth: 1460 }}>
        {vistaActiva === "inicio" && (
          <>
        {resumen.total > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
            <div style={{ ...panelStyle, borderLeft: "4px solid " + COLORS.urgente }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 30, fontWeight: 600, color: COLORS.urgente }}>{resumen.urgentes}</div>
              <div style={{ fontSize: 13, color: COLORS.textoSuave, marginTop: 2 }}>se estan acabando</div>
            </div>
            <div style={{ ...panelStyle, borderLeft: "4px solid " + COLORS.atencion }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 30, fontWeight: 600, color: COLORS.atencion }}>{resumen.atencion}</div>
              <div style={{ fontSize: 13, color: COLORS.textoSuave, marginTop: 2 }}>para vigilar</div>
            </div>
            <div style={{ ...panelStyle, borderLeft: "4px solid " + COLORS.marcaClaro }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 30, fontWeight: 600, color: COLORS.texto }}>{resumen.total}</div>
              <div style={{ fontSize: 13, color: COLORS.textoSuave, marginTop: 2 }}>productos en total</div>
            </div>
            <div style={{ ...panelStyle, borderLeft: "4px solid " + COLORS.acento }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 600, color: COLORS.texto }}>{esAdmin ? formatCOP(resumen.valorInventario) : "•••••"}</div>
              <div style={{ fontSize: 13, color: COLORS.textoSuave, marginTop: 2 }}>valor en inventario</div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16, alignItems: "stretch" }}>
          {products.some((p) => (p.salesHistory || []).length > 0) && (
            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Ventas de los ultimos 14 dias</div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={flujoCaja}>
                  <XAxis dataKey="fecha" fontSize={11} stroke={COLORS.textoSuave} />
                  <YAxis fontSize={11} stroke={COLORS.textoSuave} tickFormatter={(v) => "$" + (v / 1000).toFixed(0) + "k"} />
                  <Tooltip formatter={(v) => formatCOP(v)} contentStyle={{ fontFamily: FONT_BODY, borderRadius: 8, border: "1px solid " + COLORS.borde }} />
                  <Bar dataKey="total" fill={COLORS.marcaClaro} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {esAdmin && gananciaHoy.ingresos > 0 && (
            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Ganancia de hoy</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <ResponsiveContainer width="100%" height={170} minWidth={160} style={{ maxWidth: 200 }}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Costo", value: gananciaHoy.costo },
                        { name: "Ganancia", value: gananciaHoy.ganancia },
                      ]}
                      dataKey="value"
                      innerRadius={42}
                      outerRadius={72}
                    >
                      <Cell fill={COLORS.urgente} />
                      <Cell fill={COLORS.marcaClaro} />
                    </Pie>
                    <Tooltip formatter={(v) => formatCOP(v)} contentStyle={{ fontFamily: FONT_BODY, borderRadius: 8, border: "1px solid " + COLORS.borde }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 13, fontFamily: FONT_MONO, lineHeight: 1.9 }}>
                  <div>Ingresos: <strong>{formatCOP(gananciaHoy.ingresos)}</strong></div>
                  <div style={{ color: COLORS.urgente }}>Costo: <strong>{formatCOP(gananciaHoy.costo)}</strong></div>
                  <div style={{ color: COLORS.marcaClaro }}>Ganancia: <strong>{formatCOP(gananciaHoy.ganancia)}</strong></div>
                </div>
              </div>
            </div>
          )}

          {esAdmin && (
            <div style={panelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={sectionTitleStyle}>Ganancia neta del mes</div>
                <button
                  onClick={() => setShowGastos(true)}
                  style={{ background: "transparent", border: "1px solid " + COLORS.borde, borderRadius: 7, padding: "4px 10px", fontSize: 12, color: COLORS.texto, cursor: "pointer", fontFamily: FONT_BODY }}
                >
                  Ver gastos
                </button>
              </div>
              <div style={{ fontSize: 13, fontFamily: FONT_MONO, lineHeight: 2 }}>
                <div>Ganancia bruta: <strong>{formatCOP(gananciaNetaMes.gananciaBruta)}</strong></div>
                <div style={{ color: COLORS.urgente }}>Gastos del mes: <strong>{formatCOP(gananciaNetaMes.totalGastos)}</strong></div>
                <div style={{ color: gananciaNetaMes.neta >= 0 ? COLORS.marcaClaro : COLORS.urgente, fontSize: 16 }}>
                  Ganancia neta: <strong>{formatCOP(gananciaNetaMes.neta)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {products.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 22 }}>
            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Mas vendidos (30 dias)</div>
              {topVendidos.length === 0 ? (
                <p style={{ fontSize: 13, color: COLORS.textoSuave, margin: 0 }}>Aun no hay ventas suficientes.</p>
              ) : (
                topVendidos.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "7px 0", borderBottom: i < topVendidos.length - 1 ? "1px solid " + COLORS.borde : "none" }}>
                    <span>{i + 1}. {p.name}</span>
                    <strong style={{ fontFamily: FONT_MONO }}>{p.vendidos} uds.</strong>
                  </div>
                ))
              )}
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Por vencer primero</div>
              {porVencer.length === 0 ? (
                <p style={{ fontSize: 13, color: COLORS.textoSuave, margin: 0 }}>Sin productos con fecha de vencimiento.</p>
              ) : (
                porVencer.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "7px 0", borderBottom: i < porVencer.length - 1 ? "1px solid " + COLORS.borde : "none" }}>
                    <span>{p.name}</span>
                    <strong style={{ fontFamily: FONT_MONO, color: p.vence <= 7 ? COLORS.urgente : COLORS.texto }}>{p.vence}d</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
          </>
        )}

        {vistaActiva === "inventario" && (
          <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600 }}>Inventario</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder="Buscar producto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ ...inputStyle, width: 180 }}
            />
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}>
              <option value="todos">Todos los estados</option>
              <option value="urgente">Se estan acabando</option>
              <option value="atencion">Vigilar</option>
              <option value="bien">Vas bien</option>
            </select>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={inputStyle}>
              <option value="todos">Productos y servicios</option>
              <option value="producto">Solo productos</option>
              <option value="servicio">Solo servicios</option>
            </select>
            {categoriasDisponibles.length > 0 && (
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={inputStyle}>
                <option value="todas">Todas las categorias</option>
                {categoriasDisponibles.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <select value={orden} onChange={(e) => setOrden(e.target.value)} style={inputStyle}>
              <option value="estado">Ordenar: estado</option>
              <option value="nombre">Ordenar: nombre</option>
              <option value="stock">Ordenar: stock</option>
              <option value="masVendido">Ordenar: mas vendido</option>
            </select>
            <button onClick={abrirNuevo} style={btnPrimary()}>
              + Producto
            </button>
          </div>
        </div>

        {cargando ? (
          <p style={{ color: COLORS.textoSuave }}>Cargando...</p>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, background: "white", borderRadius: 14, border: "1px dashed " + COLORS.borde }}>
            <p style={{ color: COLORS.textoSuave }}>Todavia no tienes productos. Dale a "+ Producto" para agregar el primero.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
            {filtrados.map((p) => {
              const a = p.analisis;
              const historialGrafica = ultimosDias(14).map((fecha) => {
                const venta = (p.salesHistory || []).find((h) => h.date === fecha);
                return { fecha: fecha.slice(5), uds: venta ? venta.qty : 0 };
              });
              const estadoColor = { urgente: COLORS.urgente, atencion: COLORS.atencion, bien: COLORS.bien }[a.estado];
              const estadoBg = { urgente: COLORS.urgenteBg, atencion: COLORS.atencionBg, bien: COLORS.bienBg }[a.estado];

              return (
                <div key={p.id} style={{ ...panelStyle, padding: 16, borderLeft: "5px solid " + (p.itemType === "servicio" ? COLORS.marcaClaro : estadoColor), display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18 }}>{p.name}</div>
                      {p.category && <div style={{ fontSize: 12, color: COLORS.textoSuave }}>{p.category}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {p.itemType === "servicio" ? (
                        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: COLORS.bienBg, color: COLORS.marcaClaro }}>Servicio</div>
                      ) : (
                        <>
                          <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600 }}>{p.stock}<span style={{ fontSize: 11, fontWeight: 400, color: COLORS.textoSuave }}> uds.</span></div>
                          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: estadoBg, color: estadoColor, marginTop: 3 }}>{ESTADO_TEXTO[a.estado]}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: COLORS.textoSuave, marginTop: 10, fontFamily: FONT_MONO }}>
                    {formatCOP(p.salePrice)}
                    {esAdmin && Number(p.realCost) > 0 ? " · costo " + formatCOP(p.realCost) : ""}
                  </div>
                  {p.itemType !== "servicio" && (
                    <div style={{ fontSize: 12, color: COLORS.textoSuave, marginTop: 2 }}>
                      {p.salesHistory.length > 0 ? "se vende ~" + a.demanda.toFixed(1) + "/dia" : "sin historial de ventas"}
                      {a.sugerido > 0 ? " · pedir " + a.sugerido + " uds." : ""}
                    </div>
                  )}

                  {p.supplier && (
                    <div style={{ marginTop: 6, fontSize: 12, color: COLORS.textoSuave }}>
                      {p.supplier.name}{p.supplier.phone ? " · " + p.supplier.phone : ""}
                    </div>
                  )}

                  {a.vence != null && (
                    <div style={{
                      display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                      background: a.vence <= 7 ? COLORS.urgenteBg : a.vence <= 30 ? COLORS.atencionBg : "#EEEBE3",
                      color: a.vence <= 7 ? COLORS.urgente : a.vence <= 30 ? COLORS.atencion : COLORS.textoSuave,
                      width: "fit-content",
                    }}>
                      Vence en {a.vence >= 0 ? a.vence + " dias" : "ya vencio"}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {!p.hasVariants && (
                      <>
                        <input
                          type="number"
                          min="1"
                          placeholder="Vendi..."
                          value={ventaTemp[p.id] || ""}
                          onChange={(e) => setVentaTemp((v) => ({ ...v, [p.id]: e.target.value }))}
                          style={{ ...inputStyle, width: 80, padding: "7px 9px" }}
                        />
                        <button onClick={() => vender(p.id)} style={{ ...btnPrimary(), padding: "7px 12px", fontSize: 13 }}>
                          Vender
                        </button>
                      </>
                    )}
                    <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={{ ...btnGhost(), padding: "7px 12px", fontSize: 13 }}>
                      {expandedId === p.id ? "Ocultar" : "Historial"}
                    </button>
                    {p.hasVariants && (
                      <button onClick={() => setExpandedVariantsId(expandedVariantsId === p.id ? null : p.id)} style={{ ...btnGhost(), padding: "7px 12px", fontSize: 13 }}>
                        {expandedVariantsId === p.id ? "Ocultar variantes" : "Variantes"}
                      </button>
                    )}
                    <button onClick={() => abrirEditar(p)} style={{ ...btnGhost(), padding: "7px 12px", fontSize: 13 }}>
                      Editar
                    </button>
                    {esAdmin && (
                      <button onClick={() => eliminar(p.id)} style={{ ...btnDanger(), padding: "7px 12px", fontSize: 13 }}>
                        Eliminar
                      </button>
                    )}
                  </div>

                  {expandedVariantsId === p.id && (
                    <div style={{ marginTop: 12, borderTop: "1px dashed " + COLORS.borde, paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(p.variants || []).length === 0 ? (
                        <p style={{ fontSize: 12, color: COLORS.textoSuave, margin: 0 }}>Este producto no tiene variantes registradas.</p>
                      ) : (
                        p.variants.map((v) => (
                          <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, background: COLORS.fondo, borderRadius: 8, padding: 8 }}>
                            <span>{v.name} <span style={{ fontFamily: FONT_MONO, color: COLORS.textoSuave }}>({v.stock} uds.)</span></span>
                            <span style={{ display: "flex", gap: 6 }}>
                              <input
                                type="number"
                                min="1"
                                placeholder="Cant."
                                value={variantSaleTemp[v.id] || ""}
                                onChange={(e) => setVariantSaleTemp((s) => ({ ...s, [v.id]: e.target.value }))}
                                style={{ ...inputStyle, width: 60, padding: "5px 8px" }}
                              />
                              <button onClick={() => venderVariante(p.id, v.id)} style={{ ...btnPrimary(), padding: "5px 10px", fontSize: 12 }}>Vender</button>
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {expandedId === p.id && (
                    <div style={{ marginTop: 12, borderTop: "1px dashed " + COLORS.borde, paddingTop: 10 }}>
                      {p.salesHistory.length === 0 ? (
                        <p style={{ fontSize: 12, color: COLORS.textoSuave }}>Sin ventas registradas todavia.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={120}>
                          <BarChart data={historialGrafica}>
                            <XAxis dataKey="fecha" fontSize={9} stroke={COLORS.textoSuave} />
                            <YAxis fontSize={9} stroke={COLORS.textoSuave} allowDecimals={false} />
                            <Tooltip contentStyle={{ fontFamily: FONT_BODY, borderRadius: 8 }} />
                            <Bar dataKey="uds" fill={COLORS.acento} radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
        </main>
      </div>

      {showForm && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <form className="cs-modal-box" onSubmit={guardar} style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 24, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 10, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20 }}>{editingId ? "Editar producto" : "Nuevo producto"}</h3>

            <label style={labelStyle}>Nombre</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Categoria (opcional)</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Tipo</label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="radio" name="itemType" checked={form.itemType === "producto"} onChange={() => setForm({ ...form, itemType: "producto" })} />
                Producto (tiene stock)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="radio" name="itemType" checked={form.itemType === "servicio"} onChange={() => setForm({ ...form, itemType: "servicio" })} />
                Servicio (sin stock)
              </label>
            </div>

            <label style={labelStyle}>Codigo de barras (opcional)</label>
            <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Escanea o escribe el codigo" style={inputStyle} />

            <label style={labelStyle}>URL de la foto (opcional, para el catalogo)</label>
            <input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="https://..." style={inputStyle} />
            {form.photoUrl && <img src={form.photoUrl} alt="Vista previa" style={{ maxWidth: 100, maxHeight: 100, objectFit: "cover", borderRadius: 8, alignSelf: "center" }} />}

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={form.showInCatalog} onChange={(e) => setForm({ ...form, showInCatalog: e.target.checked })} />
              Mostrar en el catalogo publico
            </label>

            {form.itemType === "producto" && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.hasVariants} onChange={(e) => setForm({ ...form, hasVariants: e.target.checked })} />
                Tiene variantes (tallas, colores, etc.)
              </label>
            )}

            {form.hasVariants ? (
              editingId ? (
                <div style={{ border: "1px solid " + COLORS.borde, borderRadius: 10, padding: 10 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Variantes</label>
                  {productVariants.length === 0 ? (
                    <p style={{ fontSize: 12, color: COLORS.textoSuave, margin: "4px 0" }}>Aun no tienes variantes. Agrega la primera abajo.</p>
                  ) : (
                    productVariants.map((v) => (
                      <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid " + COLORS.borde, fontSize: 13 }}>
                        <span>{v.name}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: FONT_MONO }}>{v.stock} uds.</span>
                          <button type="button" onClick={() => eliminarVariante(v.id)} style={{ border: "none", background: "transparent", color: COLORS.urgente, cursor: "pointer", fontWeight: 700 }}>×</button>
                        </span>
                      </div>
                    ))
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input placeholder="Ej: Talla M - Rojo" value={variantForm.name} onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })} style={{ ...inputStyle, flex: 2, padding: "6px 8px" }} />
                    <input placeholder="Stock" type="number" value={variantForm.stock} onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })} style={{ ...inputStyle, flex: 1, padding: "6px 8px" }} />
                    <button type="button" onClick={agregarVariante} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12 }}>+</button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: COLORS.atencion, background: COLORS.atencionBg, borderRadius: 8, padding: 8, margin: 0 }}>
                  Guarda el producto primero, y aqui mismo podras agregarle las variantes.
                </p>
              )
            ) : null}

            <div style={{ display: "flex", gap: 8 }}>
              {form.itemType === "producto" && !form.hasVariants && (
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Stock actual</label>
                  <input required type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginTop: 4 }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Precio de venta</label>
                <input
                  required
                  inputMode="numeric"
                  value={formatMiles(form.salePrice)}
                  onChange={(e) => setForm({ ...form, salePrice: soloDigitos(e.target.value) })}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginTop: 4 }}
                />
              </div>
            </div>

            <label style={labelStyle}>Costo real (lo que a ti te cuesta comprarlo)</label>
            <input
              inputMode="numeric"
              value={formatMiles(form.realCost)}
              onChange={(e) => setForm({ ...form, realCost: soloDigitos(e.target.value) })}
              style={inputStyle}
            />

            <label style={labelStyle}>Proveedor (opcional)</label>
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} style={inputStyle}>
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <label style={labelStyle}>Cuantas vendes al dia, aprox? (solo si no tiene historial)</label>
            <input type="number" value={form.avgDailyDemand} onChange={(e) => setForm({ ...form, avgDailyDemand: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Fecha de vencimiento (opcional)</label>
            <input type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} style={inputStyle} />

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ ...btnGhost(), flex: 1 }}>
                Cancelar
              </button>
              <button type="submit" style={{ ...btnPrimary(), flex: 1 }}>
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {showSuppliers && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <div className="cs-modal-box" style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 24, width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20 }}>Proveedores</h3>
              <button onClick={() => setShowSuppliers(false)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: COLORS.textoSuave }}>×</button>
            </div>

            <form onSubmit={guardarProveedor} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18, paddingBottom: 18, borderBottom: "1px dashed " + COLORS.borde }}>
              <input required placeholder="Nombre del proveedor" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} style={inputStyle} />
              <input placeholder="Telefono" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} style={inputStyle} />
              <input placeholder="Notas (opcional)" value={supplierForm.notes} onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })} style={inputStyle} />
              <button type="submit" style={btnPrimary()}>
                + Agregar proveedor
              </button>
            </form>

            {suppliers.length === 0 ? (
              <p style={{ fontSize: 13, color: COLORS.textoSuave }}>Aun no tienes proveedores registrados.</p>
            ) : (
              suppliers.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid " + COLORS.borde }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    {s.phone && <div style={{ fontSize: 12, color: COLORS.textoSuave }}>{s.phone}</div>}
                  </div>
                  {esAdmin && (
                    <button onClick={() => eliminarProveedor(s.id)} style={{ border: "none", background: "transparent", color: COLORS.urgente, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Eliminar</button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {showBusinessProfile && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <form className="cs-modal-box" onSubmit={guardarPerfilNegocio} style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 0, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
            <div style={{ background: COLORS.marca, padding: "20px 24px", color: "white" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏬</div>
                <div>
                  <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 19 }}>Datos del negocio</h3>
                  <p style={{ fontSize: 11, opacity: 0.8, margin: "1px 0 0" }}>Se usan en tus facturas y catalogo</p>
                </div>
              </div>
            </div>

            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
              <div className="cs-fade-up" style={{ background: COLORS.fondo, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.marcaClaro, textTransform: "uppercase", letterSpacing: "0.04em" }}>Identidad</div>
                <label style={labelStyle}>NIT</label>
                <input value={businessProfileForm.nit} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, nit: e.target.value })} style={inputStyle} />
                <label style={labelStyle}>Direccion</label>
                <input value={businessProfileForm.address} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, address: e.target.value })} style={inputStyle} />
                <label style={labelStyle}>Telefono</label>
                <input value={businessProfileForm.phone} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, phone: e.target.value })} style={inputStyle} />
                <label style={labelStyle}>URL del logo</label>
                <input value={businessProfileForm.logoUrl} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, logoUrl: e.target.value })} placeholder="https://..." style={inputStyle} />
                {businessProfileForm.logoUrl && (
                  <img src={businessProfileForm.logoUrl} alt="Logo" style={{ maxWidth: 110, maxHeight: 70, objectFit: "contain", alignSelf: "center", borderRadius: 8 }} />
                )}
              </div>

              <div className="cs-fade-up" style={{ background: COLORS.fondo, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.marcaClaro, textTransform: "uppercase", letterSpacing: "0.04em" }}>Marca</div>
                <label style={labelStyle}>Instagram (sin @)</label>
                <input value={businessProfileForm.instagram} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, instagram: e.target.value })} placeholder="mitienda" style={inputStyle} />
                <label style={labelStyle}>Mensaje de agradecimiento</label>
                <input value={businessProfileForm.thankYouMessage} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, thankYouMessage: e.target.value })} placeholder="¡Gracias por su compra!" style={inputStyle} />
              </div>

              <div className="cs-fade-up" style={{ background: COLORS.atencionBg, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.atencion, textTransform: "uppercase", letterSpacing: "0.04em" }}>Facturacion</div>
                <label style={labelStyle}>Impuesto incluido en el precio (opcional)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={businessProfileForm.taxLabel} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, taxLabel: e.target.value })} placeholder="Nombre (ej: Consumo)" style={{ ...inputStyle, flex: 2 }} />
                  <input type="number" value={businessProfileForm.taxRate} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, taxRate: e.target.value })} placeholder="% (ej: 8)" style={{ ...inputStyle, flex: 1 }} />
                </div>
                <p style={{ fontSize: 11, color: "#8A6D1F", margin: 0 }}>Deja el % en 0 o vacio si no quieres mostrar el desglose de impuesto.</p>
              </div>

              <div className="cs-fade-up" style={{ background: COLORS.urgenteBg, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.urgente, textTransform: "uppercase", letterSpacing: "0.04em" }}>Seguridad</div>
                <label style={labelStyle}>PIN para eliminar la tienda (opcional)</label>
                <input value={businessProfileForm.deletePin} onChange={(e) => setBusinessProfileForm({ ...businessProfileForm, deletePin: e.target.value })} placeholder="Ej: 1234" style={inputStyle} />
                <p style={{ fontSize: 11, color: "#A44339", margin: 0 }}>Si lo dejas lleno, se pedira este PIN antes de poder eliminar la tienda.</p>
              </div>

              <div className="cs-fade-up" style={{ background: COLORS.bienBg, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.marcaClaro, textTransform: "uppercase", letterSpacing: "0.04em" }}>Empleados</div>
                <p style={{ fontSize: 11, color: "#2F6B54", margin: "0 0 2px" }}>Invita por correo. Cuando esa persona cree su cuenta con ese mismo correo, vera esta tienda automaticamente.</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input type="email" placeholder="correo@ejemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={inputStyle}>
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="button" onClick={invitarEmpleado} style={btnPrimary()}>Invitar</button>
                </div>

                {members.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {members.map((m) => (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(21,75,62,0.12)", fontSize: 13 }}>
                        <div>
                          {m.email} <span style={{ color: "#2F6B54", fontSize: 11 }}>({m.role === "admin" ? "Admin" : "Vendedor"})</span>
                        </div>
                        <button type="button" onClick={() => quitarEmpleado(m.id)} style={{ border: "none", background: "transparent", color: COLORS.urgente, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, padding: 18, borderTop: "1px solid " + COLORS.borde }}>
              <button type="button" onClick={() => setShowBusinessProfile(false)} style={{ ...btnGhost(), flex: 1 }}>
                Cancelar
              </button>
              <button type="submit" style={{ ...btnPrimary(), flex: 1 }}>
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
      {showInvoice && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <div className="cs-modal-box" style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 24, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 10, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20 }}>Nueva factura</h3>

            <label style={labelStyle}>Atendido por (opcional)</label>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={buyerForm.cashierName} onChange={(e) => setBuyerForm({ ...buyerForm, cashierName: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Sin especificar</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <button type="button" onClick={nuevoVendedor} title="Agregar vendedor" style={{ ...btnGhost(), padding: "9px 14px" }}>+</button>
            </div>

            <label style={{ ...labelStyle, marginTop: 4 }}>Escanear codigo de barras</label>
            <input
              placeholder="Haz click aqui y escanea con el lector..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && scanInput.trim()) {
                  e.preventDefault();
                  escanearCodigo(scanInput);
                }
              }}
              style={inputStyle}
              autoFocus
            />

            <label style={{ ...labelStyle, marginTop: 4 }}>Productos</label>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={invoiceProductId} onChange={(e) => { setInvoiceProductId(e.target.value); setInvoiceVariantId(""); }} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={invoiceQty}
                onChange={(e) => setInvoiceQty(e.target.value)}
                style={{ ...inputStyle, width: 70 }}
              />
              <button type="button" onClick={agregarItemFactura} style={btnPrimary()}>
                Agregar
              </button>
            </div>

            {invoiceProductId && products.find((p) => p.id === invoiceProductId)?.hasVariants && (
              <select value={invoiceVariantId} onChange={(e) => setInvoiceVariantId(e.target.value)} style={inputStyle}>
                <option value="">Selecciona la variante</option>
                {(products.find((p) => p.id === invoiceProductId)?.variants || []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name} (stock: {v.stock})</option>
                ))}
              </select>
            )}

            {invoiceItems.length > 0 && (
              <div style={{ border: "1px solid " + COLORS.borde, borderRadius: 10, padding: 12 }}>
                {invoiceItems.map((it) => (
                  <div key={it.productId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid " + COLORS.borde, fontSize: 13 }}>
                    <div style={{ flex: 1 }}>{it.name}</div>
                    <input
                      type="number"
                      min="1"
                      value={it.qty}
                      onChange={(e) => cambiarCantidadFactura(it.productId, e.target.value)}
                      style={{ ...inputStyle, width: 60, padding: "5px 8px" }}
                    />
                    <div style={{ width: 100, textAlign: "right", fontFamily: FONT_MONO }}>{formatCOP(Number(it.salePrice) * Number(it.qty))}</div>
                    <button type="button" onClick={() => quitarItemFactura(it.productId)} style={{ border: "none", background: "transparent", color: COLORS.urgente, cursor: "pointer", fontWeight: 700 }}>×</button>
                  </div>
                ))}
                <div style={{ textAlign: "right", fontWeight: 700, marginTop: 10, fontSize: 15, fontFamily: FONT_MONO }}>
                  Total {buyerForm.deliveryType === "domicilio" && Number(buyerForm.deliveryFee) > 0 ? "(con domicilio)" : ""}: {formatCOP(invoiceTotal)}
                </div>
              </div>
            )}

            <label style={{ ...labelStyle, marginTop: 4 }}>Metodo de pago</label>
            <select value={buyerForm.paymentMethod} onChange={(e) => setBuyerForm({ ...buyerForm, paymentMethod: e.target.value })} style={inputStyle}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mixto">Mixto (efectivo + transferencia)</option>
              <option value="fiado">Fiado (a credito)</option>
            </select>

            {buyerForm.paymentMethod === "fiado" && (
              <div style={{ background: COLORS.atencionBg, borderRadius: 8, padding: 10 }}>
                <p style={{ fontSize: 12, color: COLORS.atencion, margin: "0 0 6px", fontWeight: 600 }}>Esta venta quedara registrada como deuda del cliente. Llena su nombre abajo.</p>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Fecha limite de pago (opcional)</label>
                <input type="date" value={buyerForm.dueDate} onChange={(e) => setBuyerForm({ ...buyerForm, dueDate: e.target.value })} style={inputStyle} />
              </div>
            )}

            {buyerForm.paymentMethod === "mixto" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Parte en efectivo" inputMode="numeric" value={formatMiles(buyerForm.paymentCashAmount)} onChange={(e) => setBuyerForm({ ...buyerForm, paymentCashAmount: soloDigitos(e.target.value) })} style={{ ...inputStyle, flex: 1 }} />
                <input placeholder="Parte en transferencia" inputMode="numeric" value={formatMiles(buyerForm.paymentTransferAmount)} onChange={(e) => setBuyerForm({ ...buyerForm, paymentTransferAmount: soloDigitos(e.target.value) })} style={{ ...inputStyle, flex: 1 }} />
              </div>
            )}

            <label style={{ ...labelStyle, marginTop: 4 }}>Tipo de entrega</label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="radio" name="deliveryType" checked={buyerForm.deliveryType === "lugar"} onChange={() => setBuyerForm({ ...buyerForm, deliveryType: "lugar" })} />
                En el lugar
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="radio" name="deliveryType" checked={buyerForm.deliveryType === "domicilio"} onChange={() => setBuyerForm({ ...buyerForm, deliveryType: "domicilio" })} />
                A domicilio
              </label>
            </div>

            {buyerForm.deliveryType === "domicilio" && (
              <>
                <input placeholder="Direccion de entrega" value={buyerForm.address} onChange={(e) => setBuyerForm({ ...buyerForm, address: e.target.value })} style={inputStyle} />
                <input placeholder="Costo del domicilio (opcional)" inputMode="numeric" value={formatMiles(buyerForm.deliveryFee)} onChange={(e) => setBuyerForm({ ...buyerForm, deliveryFee: soloDigitos(e.target.value) })} style={inputStyle} />
              </>
            )}

            <label style={{ ...labelStyle, marginTop: 4 }}>Datos del cliente</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Nombre" value={buyerForm.name} onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="Apellido" value={buyerForm.lastname} onChange={(e) => setBuyerForm({ ...buyerForm, lastname: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input placeholder="Identificacion (cedula)" value={buyerForm.idNumber} onChange={(e) => setBuyerForm({ ...buyerForm, idNumber: e.target.value })} style={inputStyle} />
            <input placeholder="Telefono" value={buyerForm.phone} onChange={(e) => setBuyerForm({ ...buyerForm, phone: e.target.value })} style={inputStyle} />

            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setShowInvoice(false)} style={{ ...btnGhost(), flex: 1, minWidth: 90 }}>
                Cancelar
              </button>
              <button type="button" disabled={generandoFactura} onClick={() => procesarFactura("imprimir")} style={{ ...btnGhost(), flex: 1, minWidth: 110 }}>
                {generandoFactura ? "..." : "Imprimir"}
              </button>
              <button type="button" disabled={generandoFactura} onClick={() => procesarFactura("pdf")} style={{ ...btnPrimary(), flex: 1, minWidth: 110 }}>
                {generandoFactura ? "Generando..." : "Descargar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showOpenCaja && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <div className="cs-modal-box" style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 24, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20 }}>Abrir caja</h3>
            <p style={{ fontSize: 12, color: COLORS.textoSuave, margin: 0 }}>¿Con cuanto efectivo empiezas el turno?</p>
            <input inputMode="numeric" placeholder="Ej: 50.000" value={formatMiles(openingAmount)} onChange={(e) => setOpeningAmount(soloDigitos(e.target.value))} style={inputStyle} autoFocus />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => setShowOpenCaja(false)} style={{ ...btnGhost(), flex: 1 }}>Cancelar</button>
              <button type="button" disabled={cargandoCaja} onClick={confirmarAbrirCaja} style={{ ...btnPrimary(), flex: 1 }}>{cargandoCaja ? "..." : "Abrir caja"}</button>
            </div>
          </div>
        </div>
      )}

      {showCloseCaja && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <div className="cs-modal-box" style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 24, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20 }}>Cerrar caja</h3>
            <div style={{ fontSize: 13, fontFamily: FONT_MONO }}>
              Efectivo esperado: <strong>{formatCOP(expectedCash)}</strong>
            </div>
            <label style={labelStyle}>¿Cuanto efectivo contaste tu, fisicamente?</label>
            <input inputMode="numeric" placeholder="Ej: 350.000" value={formatMiles(countedAmount)} onChange={(e) => setCountedAmount(soloDigitos(e.target.value))} style={inputStyle} autoFocus />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => setShowCloseCaja(false)} style={{ ...btnGhost(), flex: 1 }}>Cancelar</button>
              <button type="button" disabled={cargandoCaja} onClick={confirmarCerrarCaja} style={{ ...btnPrimary(), flex: 1 }}>{cargandoCaja ? "..." : "Cerrar caja"}</button>
            </div>
          </div>
        </div>
      )}
      {showFiado && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <div className="cs-modal-box" style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20 }}>Fiado</h3>
              <button onClick={() => setShowFiado(false)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: COLORS.textoSuave }}>×</button>
            </div>

            <div style={{ fontFamily: FONT_MONO, fontSize: 15, color: COLORS.urgente, fontWeight: 700 }}>
              Total por cobrar: {formatCOP(totalPorCobrar)}
            </div>

            <form onSubmit={guardarClienteFiado} style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 14, borderBottom: "1px dashed " + COLORS.borde }}>
              <label style={{ ...labelStyle, fontSize: 13 }}>Agregar cliente nuevo</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input required placeholder="Nombre" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                <input placeholder="Apellido" value={customerForm.lastname} onChange={(e) => setCustomerForm({ ...customerForm, lastname: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Identificacion" value={customerForm.idNumber} onChange={(e) => setCustomerForm({ ...customerForm, idNumber: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                <input placeholder="Telefono" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
              </div>
              <button type="submit" style={btnPrimary()}>+ Agregar cliente</button>
            </form>

            {customersConSaldo.length === 0 ? (
              <p style={{ fontSize: 13, color: COLORS.textoSuave }}>Aun no tienes clientes fiando.</p>
            ) : (
              customersConSaldo.map((c) => (
                <div key={c.id} style={{ border: "1px solid " + COLORS.borde, borderRadius: 10, padding: 12 }}>
                  <div
                    onClick={() => setExpandedCustomerId(expandedCustomerId === c.id ? null : c.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name} {c.lastname}</div>
                      {c.phone && <div style={{ fontSize: 12, color: COLORS.textoSuave }}>{c.phone}</div>}
                    </div>
                    <div style={{ fontFamily: FONT_MONO, fontWeight: 700, color: c.saldo > 0 ? COLORS.urgente : COLORS.marcaClaro }}>
                      {formatCOP(c.saldo)}
                    </div>
                  </div>

                  {expandedCustomerId === c.id && (
                    <div style={{ marginTop: 10, borderTop: "1px dashed " + COLORS.borde, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {c.deudas.length === 0 ? (
                        <p style={{ fontSize: 12, color: COLORS.textoSuave, margin: 0 }}>Sin deudas registradas.</p>
                      ) : (
                        c.deudas.map((d) => (
                          <div key={d.id} style={{ fontSize: 13, background: COLORS.fondo, borderRadius: 8, padding: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>{d.note || "Deuda"} · {new Date(d.created_at).toLocaleDateString("es-CO")}</span>
                              <strong style={{ fontFamily: FONT_MONO }}>{formatCOP(d.balance)} / {formatCOP(d.amount)}</strong>
                            </div>
                            {d.due_date && <div style={{ fontSize: 11, color: COLORS.textoSuave, marginTop: 2 }}>Limite: {d.due_date}</div>}
                            {Number(d.balance) > 0 && (
                              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Abono..."
                                  value={abonoTemp[d.id] || ""}
                                  onChange={(e) => setAbonoTemp((v) => ({ ...v, [d.id]: e.target.value }))}
                                  style={{ ...inputStyle, width: 100, padding: "6px 8px" }}
                                />
                                <button type="button" onClick={() => registrarAbono(d.id)} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12 }}>Abonar</button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {showConteo && conteoActual && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <div className="cs-modal-box" style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20 }}>Conteo fisico</h3>
              <button onClick={() => setShowConteo(false)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: COLORS.textoSuave }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: COLORS.textoSuave, margin: 0 }}>Escribe cuanto contaste de verdad en cada producto. Lo que dejes en blanco no se toca al aplicar.</p>

            {(conteoActual.inventory_count_items || []).map((item) => {
              const valorTemp = conteoTemp[item.id];
              const contado = valorTemp !== undefined ? valorTemp : (item.counted_stock ?? "");
              const diferencia = item.counted_stock != null ? Number(item.counted_stock) - Number(item.system_stock) : null;
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + COLORS.borde, fontSize: 13, gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div>{item.item_label}</div>
                    <div style={{ fontSize: 11, color: COLORS.textoSuave }}>Sistema dice: {item.system_stock} uds.</div>
                  </div>
                  <input
                    type="number"
                    placeholder="Contado"
                    value={contado}
                    onChange={(e) => setConteoTemp((v) => ({ ...v, [item.id]: e.target.value }))}
                    onBlur={() => guardarConteoItem(item.id, item.system_stock)}
                    style={{ ...inputStyle, width: 80, padding: "6px 8px" }}
                  />
                  {diferencia != null && diferencia !== 0 && (
                    <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: diferencia > 0 ? COLORS.marcaClaro : COLORS.urgente, width: 50, textAlign: "right" }}>
                      {diferencia > 0 ? "+" : ""}{diferencia}
                    </span>
                  )}
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" onClick={confirmarCancelarConteo} disabled={cargandoConteo} style={{ ...btnDanger(), flex: 1 }}>Cancelar conteo</button>
              <button type="button" onClick={confirmarAplicarConteo} disabled={cargandoConteo} style={{ ...btnPrimary(), flex: 1 }}>{cargandoConteo ? "..." : "Aplicar conteo"}</button>
            </div>
          </div>
        </div>
      )}
      {showQuotes && (
        <div className="cs-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,17,12,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 40 }}>
          <div className="cs-modal-box" style={{ background: "white", borderRadius: 16, boxShadow: "0 20px 60px -12px rgba(21,75,62,0.35)", padding: 24, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 20 }}>Cotizaciones</h3>
              <button onClick={() => setShowQuotes(false)} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: COLORS.textoSuave }}>×</button>
            </div>

            <label style={{ ...labelStyle, fontSize: 13 }}>Nueva cotizacion</label>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={quoteProductId} onChange={(e) => { setQuoteProductId(e.target.value); setQuoteVariantId(""); }} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input type="number" min="1" value={quoteQty} onChange={(e) => setQuoteQty(e.target.value)} style={{ ...inputStyle, width: 70 }} />
              <button type="button" onClick={agregarItemCotizacion} style={btnPrimary()}>Agregar</button>
            </div>

            {quoteProductId && products.find((p) => p.id === quoteProductId)?.hasVariants && (
              <select value={quoteVariantId} onChange={(e) => setQuoteVariantId(e.target.value)} style={inputStyle}>
                <option value="">Selecciona la variante</option>
                {(products.find((p) => p.id === quoteProductId)?.variants || []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}

            {quoteItems.length > 0 && (
              <div style={{ border: "1px solid " + COLORS.borde, borderRadius: 10, padding: 10 }}>
                {quoteItems.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid " + COLORS.borde, fontSize: 13 }}>
                    <span>{it.name} x{it.qty}</span>
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: FONT_MONO }}>{formatCOP(Number(it.salePrice) * Number(it.qty))}</span>
                      <button type="button" onClick={() => quitarItemCotizacion(i)} style={{ border: "none", background: "transparent", color: COLORS.urgente, cursor: "pointer", fontWeight: 700 }}>×</button>
                    </span>
                  </div>
                ))}
                <div style={{ textAlign: "right", fontWeight: 700, marginTop: 8, fontFamily: FONT_MONO }}>Total: {formatCOP(quoteTotal)}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Nombre cliente" value={quoteBuyerForm.name} onChange={(e) => setQuoteBuyerForm({ ...quoteBuyerForm, name: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="Apellido" value={quoteBuyerForm.lastname} onChange={(e) => setQuoteBuyerForm({ ...quoteBuyerForm, lastname: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input placeholder="Telefono" value={quoteBuyerForm.phone} onChange={(e) => setQuoteBuyerForm({ ...quoteBuyerForm, phone: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Valida hasta (opcional)</label>
            <input type="date" value={quoteBuyerForm.validUntil} onChange={(e) => setQuoteBuyerForm({ ...quoteBuyerForm, validUntil: e.target.value })} style={inputStyle} />

            <button type="button" disabled={generandoCotizacion} onClick={generarCotizacion} style={btnPrimary()}>
              {generandoCotizacion ? "Generando..." : "Generar cotizacion (PDF)"}
            </button>

            <div style={{ borderTop: "1px dashed " + COLORS.borde, marginTop: 10, paddingTop: 10 }}>
              <label style={{ ...labelStyle, fontSize: 13 }}>Cotizaciones anteriores</label>
              {quotes.length === 0 ? (
                <p style={{ fontSize: 12, color: COLORS.textoSuave }}>Aun no has generado ninguna.</p>
              ) : (
                quotes.map((q) => (
                  <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + COLORS.borde, fontSize: 13 }}>
                    <div>
                      <div>#{q.quote_number} · {((q.buyer_name || "") + " " + (q.buyer_lastname || "")).trim() || "Sin nombre"}</div>
                      <div style={{ fontSize: 11, color: COLORS.textoSuave }}>{new Date(q.created_at).toLocaleDateString("es-CO")} · {formatCOP(q.total)}</div>
                    </div>
                    {q.status === "pendiente" ? (
                      <button type="button" onClick={() => convertirCotizacion(q)} style={{ ...btnPrimary(), padding: "6px 10px", fontSize: 12 }}>Convertir en venta</button>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.marcaClaro }}>Convertida</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <HelpWidget />
      <ChatWidget businessId={businessId} businessName={businessName} />
      {showGastos && (
        <GastosModal
          businessId={businessId}
          gastos={gastos}
          onClose={() => setShowGastos(false)}
          onChange={recargarGastos}
        />
      )}
    </div>
  );
}
