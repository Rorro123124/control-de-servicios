import { supabase } from "./supabaseClient";
import { createInvoice } from "./invoiceService";

export async function createQuote(businessId, items, buyer) {
  const total = items.reduce((s, it) => s + Number(it.salePrice) * Number(it.qty), 0);

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      business_id: businessId,
      buyer_name: buyer.name || null,
      buyer_lastname: buyer.lastname || null,
      buyer_id: buyer.idNumber || null,
      buyer_phone: buyer.phone || null,
      valid_until: buyer.validUntil || null,
      total,
    })
    .select()
    .single();
  if (error) throw error;

  const itemsToInsert = items.map((it) => ({
    quote_id: quote.id,
    product_id: it.productId,
    variant_id: it.variantId || null,
    product_name: it.name,
    qty: Number(it.qty),
    unit_price: Number(it.salePrice),
    subtotal: Number(it.salePrice) * Number(it.qty),
  }));

  const { error: itemsError } = await supabase.from("quote_items").insert(itemsToInsert);
  if (itemsError) throw itemsError;

  return quote;
}

export async function getQuotes(businessId) {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateQuoteStatus(id, status) {
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function convertQuoteToSale(businessId, quote) {
  const items = (quote.quote_items || []).map((it) => ({
    productId: it.product_id,
    variantId: it.variant_id,
    name: it.product_name,
    salePrice: it.unit_price,
    qty: it.qty,
  }));

  const buyer = {
    name: quote.buyer_name,
    lastname: quote.buyer_lastname,
    idNumber: quote.buyer_id,
    phone: quote.buyer_phone,
    deliveryType: "lugar",
    paymentMethod: "efectivo",
  };

  const invoice = await createInvoice(businessId, items, buyer);
  await updateQuoteStatus(quote.id, "convertida");
  return invoice;
}
