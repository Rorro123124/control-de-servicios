import { supabase } from "./supabaseClient";

// ---------- NEGOCIOS ----------
export async function getBusinesses() {
  const { data, error } = await supabase.from("businesses").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function createBusiness(name) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("businesses")
    .insert({ name, owner_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameBusiness(id, name) {
  const { error } = await supabase.from("businesses").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteBusiness(id) {
  const { error } = await supabase.from("businesses").delete().eq("id", id);
  if (error) throw error;
}

export async function updateBusinessProfile(id, profile) {
  const { error } = await supabase
    .from("businesses")
    .update({
      nit: profile.nit || null,
      address: profile.address || null,
      phone: profile.phone || null,
      logo_url: profile.logoUrl || null,
      instagram: profile.instagram || null,
      thank_you_message: profile.thankYouMessage || null,
      tax_rate: Number(profile.taxRate) || 0,
      tax_label: profile.taxLabel || "IVA",
      delete_pin: profile.deletePin || null,
      business_type: profile.businessType || "tienda",
    })
    .eq("id", id);
  if (error) throw error;
}

// ---------- PROVEEDORES ----------
export async function getSuppliers(businessId) {
  const { data, error } = await supabase.from("suppliers").select("*").eq("business_id", businessId).order("name");
  if (error) throw error;
  return data;
}

export async function addSupplier(businessId, form) {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ business_id: businessId, name: form.name, phone: form.phone, notes: form.notes })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(id) {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw error;
}

// ---------- PRODUCTOS ----------
export async function getProducts(businessId) {
  const { data, error } = await supabase
    .from("products")
    .select("*, sales(sale_date, qty), suppliers(id, name, phone), product_variants(*)")
    .eq("business_id", businessId);
  if (error) throw error;

  return data.map((p) => {
    const variantes = (p.product_variants || []).map((v) => ({
      id: v.id,
      name: v.name,
      stock: Number(v.stock) || 0,
      barcode: v.barcode || "",
    }));
    const tieneVariantes = p.has_variants || false;
    const stockTotal = tieneVariantes ? variantes.reduce((s, v) => s + v.stock, 0) : p.stock;

    return {
      id: p.id,
      name: p.name,
      category: p.category || "",
      stock: stockTotal,
      salePrice: p.sale_price,
      realCost: p.real_cost,
      avgDailyDemand: p.avg_daily_demand,
      expirationDate: p.expiration_date || "",
      supplierId: p.supplier_id || "",
      supplier: p.suppliers || null,
      itemType: p.item_type || "producto",
      barcode: p.barcode || "",
      photoUrl: p.photo_url || "",
      showInCatalog: p.show_in_catalog !== false,
      hasVariants: tieneVariantes,
      variants: variantes,
      salesHistory: (p.sales || []).map((s) => ({ date: s.sale_date, qty: Number(s.qty) })),
    };
  });
}

export async function addProduct(businessId, form) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      business_id: businessId,
      name: form.name,
      category: form.category || null,
      stock: form.itemType === "servicio" ? 0 : Number(form.stock) || 0,
      sale_price: Number(form.salePrice) || 0,
      real_cost: Number(form.realCost) || 0,
      avg_daily_demand: Number(form.avgDailyDemand) || 0,
      expiration_date: form.expirationDate || null,
      supplier_id: form.supplierId || null,
      item_type: form.itemType || "producto",
      barcode: form.barcode || null,
      photo_url: form.photoUrl || null,
      show_in_catalog: form.showInCatalog !== false,
      has_variants: form.hasVariants || false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(productId, form) {
  const { error } = await supabase
    .from("products")
    .update({
      name: form.name,
      category: form.category || null,
      stock: form.itemType === "servicio" ? 0 : Number(form.stock) || 0,
      sale_price: Number(form.salePrice) || 0,
      real_cost: Number(form.realCost) || 0,
      avg_daily_demand: Number(form.avgDailyDemand) || 0,
      expiration_date: form.expirationDate || null,
      supplier_id: form.supplierId || null,
      item_type: form.itemType || "producto",
      barcode: form.barcode || null,
      photo_url: form.photoUrl || null,
      show_in_catalog: form.showInCatalog !== false,
      has_variants: form.hasVariants || false,
    })
    .eq("id", productId);
  if (error) throw error;
}

export async function deleteProduct(productId) {
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;
}

// ---------- VENTAS ----------
export async function registerSale(productId, qty, date = new Date().toISOString().slice(0, 10), variantId = null) {
  const { data: existing } = await supabase
    .from("sales")
    .select("id, qty")
    .eq("product_id", productId)
    .eq("sale_date", date)
    .maybeSingle();

  if (existing) {
    await supabase.from("sales").update({ qty: Number(existing.qty) + qty }).eq("id", existing.id);
  } else {
    await supabase.from("sales").insert({ product_id: productId, sale_date: date, qty });
  }

  if (variantId) {
    const { data: variant } = await supabase.from("product_variants").select("stock").eq("id", variantId).single();
    const nuevoStock = Math.max(0, Number(variant.stock) - qty);
    await supabase.from("product_variants").update({ stock: nuevoStock }).eq("id", variantId);
    return;
  }

  const { data: product } = await supabase.from("products").select("stock, item_type, has_variants").eq("id", productId).single();
  if (product.item_type === "servicio" || product.has_variants) return;
  const newStock = Math.max(0, Number(product.stock) - qty);
  await supabase.from("products").update({ stock: newStock }).eq("id", productId);
}

export async function reverseSale(productId, qty, date, variantId = null) {
  const { data: existing } = await supabase
    .from("sales")
    .select("id, qty")
    .eq("product_id", productId)
    .eq("sale_date", date)
    .maybeSingle();

  if (existing) {
    const nuevaCantidad = Number(existing.qty) - qty;
    if (nuevaCantidad <= 0) {
      await supabase.from("sales").delete().eq("id", existing.id);
    } else {
      await supabase.from("sales").update({ qty: nuevaCantidad }).eq("id", existing.id);
    }
  }

  if (variantId) {
    const { data: variant } = await supabase.from("product_variants").select("stock").eq("id", variantId).single();
    if (variant) {
      const nuevoStock = Number(variant.stock) + qty;
      await supabase.from("product_variants").update({ stock: nuevoStock }).eq("id", variantId);
    }
    return;
  }

  const { data: product } = await supabase.from("products").select("stock, item_type, has_variants").eq("id", productId).single();
  if (!product || product.item_type === "servicio" || product.has_variants) return;
  const newStock = Number(product.stock) + qty;
  await supabase.from("products").update({ stock: newStock }).eq("id", productId);
}
