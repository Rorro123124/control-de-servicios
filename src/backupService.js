function buildBackupJson(business, products, suppliers, invoices, sellers) {
  const backup = {
    generadoEl: new Date().toISOString(),
    negocio: business,
    productos: products,
    proveedores: suppliers,
    facturas: invoices,
    vendedores: sellers,
  };
  return JSON.stringify(backup, null, 2);
}

module.exports = { buildBackupJson };
