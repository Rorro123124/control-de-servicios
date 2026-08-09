import { getProducts, getSuppliers } from "./productService";
import { getInvoices } from "./invoiceService";
import { getSellers } from "./sellerService";

export async function exportBackup(businessId, businessName, currentBusiness) {
  const [products, suppliers, invoices, sellers] = await Promise.all([
    getProducts(businessId),
    getSuppliers(businessId),
    getInvoices(businessId),
    getSellers(businessId),
  ]);

  const backup = {
    generadoEl: new Date().toISOString(),
    negocio: currentBusiness,
    productos: products,
    proveedores: suppliers,
    facturas: invoices,
    vendedores: sellers,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);
  const nombreLimpio = (businessName || "negocio").replace(/[^a-zA-Z0-9]/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup-" + nombreLimpio + "-" + fecha + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
