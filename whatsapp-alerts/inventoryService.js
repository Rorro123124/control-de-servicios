const { createClient } = require("@supabase/supabase-js");

function createInventoryService({ supabaseUrl, serviceRoleKey }) {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  async function getBusinesses() {
    const { data, error } = await supabase.from("businesses").select("id, name, alert_whatsapp_to");
    if (error) throw error;
    return data;
  }

  async function getBusinessForChat(chatId) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, alert_whatsapp_to")
      .eq("alert_whatsapp_to", String(chatId))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function getBusinessById(businessId) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, alert_whatsapp_to")
      .eq("id", businessId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function getProductsForBusiness(businessId) {
    const { data, error } = await supabase
      .from("products")
      .select("*, sales(sale_date, qty)")
      .eq("business_id", businessId);
    if (error) throw error;

    return data.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      salePrice: p.sale_price,
      realCost: p.real_cost,
      avgDailyDemand: p.avg_daily_demand,
      expirationDate: p.expiration_date || "",
      salesHistory: (p.sales || []).map((s) => ({ date: s.sale_date, qty: Number(s.qty) })),
    }));
  }

  async function getInvoicesToday(businessId) {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    return (data || []).filter((inv) => String(inv.created_at).slice(0, 10) === hoy && !inv.cancelled_at);
  }

  async function getExpensesForBusiness(businessId) {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("business_id", businessId)
      .order("expense_date", { ascending: false });
    if (error) throw error;

    return (data || []).map((g) => ({
      description: g.description,
      amount: Number(g.amount),
      category: g.category || "",
      expenseDate: g.expense_date,
    }));
  }

  return {
    getBusinesses,
    getBusinessForChat,
    getBusinessById,
    getProductsForBusiness,
    getInvoicesToday,
    getExpensesForBusiness,
  };
}

module.exports = { createInventoryService };
