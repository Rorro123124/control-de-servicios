// Crea una cuenta de demostracion con dos negocios de ejemplo (minimercado y barberia)
// para mostrarle el sistema a clientes sin ensenar datos reales.
//
// Uso (desde la carpeta whatsapp-alerts, con el .env configurado):
//   DEMO_EMAIL=demo@tucorreo.com DEMO_PASSWORD=unaClaveLarga node scripts/seed-demo.js
//
// Solo crea datos nuevos dentro de la cuenta demo; no toca otros negocios.
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

function dia(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// Numeros "aleatorios" repetibles para que la demo siempre se vea igual.
let semilla = 7;
function aleatorio(min, max) {
  semilla = (semilla * 9301 + 49297) % 233280;
  return min + Math.floor((semilla / 233280) * (max - min + 1));
}

async function check(promise, que) {
  const { data, error } = await promise;
  if (error) throw new Error("Error creando " + que + ": " + error.message);
  return data;
}

async function obtenerUsuarioDemo() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (!error) return data.user;

  const lista = await check(supabase.auth.admin.listUsers({ perPage: 1000 }), "lista de usuarios");
  const existente = lista.users.find((u) => (u.email || "").toLowerCase() === DEMO_EMAIL.toLowerCase());
  if (!existente) throw new Error("No pude crear ni encontrar el usuario demo: " + error.message);
  return existente;
}

async function crearNegocio(ownerId, nombre) {
  const existentes = await check(
    supabase.from("businesses").select("id").eq("owner_id", ownerId).eq("name", nombre),
    "busqueda de negocio"
  );
  if (existentes.length > 0) {
    console.log("- '" + nombre + "' ya existe, lo salto. Borralo desde la app si lo quieres regenerar.");
    return null;
  }
  return check(supabase.from("businesses").insert({ name: nombre, owner_id: ownerId }).select().single(), "negocio");
}

async function sembrarMinimercado(ownerId) {
  const negocio = await crearNegocio(ownerId, "Minimercado La Esquina (DEMO)");
  if (!negocio) return;
  const bid = negocio.id;

  const proveedores = await check(
    supabase.from("suppliers").insert([
      { business_id: bid, name: "Distribuidora Santander", phone: "3000000001", notes: "Visita los martes" },
      { business_id: bid, name: "Lácteos del Oriente", phone: "3000000002", notes: "Entrega diaria 6 a. m." },
      { business_id: bid, name: "Aseo Total Mayorista", phone: "3000000003", notes: null },
    ]).select(),
    "proveedores"
  );
  const [abarrotes, lacteos, aseo] = proveedores;

  // [nombre, categoria, stock, precio venta, costo, demanda diaria, proveedor, dias para vencer]
  const catalogo = [
    ["Arroz Diana 500 g", "Abarrotes", 48, 3200, 2500, 6, abarrotes, null],
    ["Aceite Premier 1 L", "Abarrotes", 20, 11500, 9300, 2, abarrotes, null],
    ["Panela x 2", "Abarrotes", 30, 4500, 3400, 4, abarrotes, null],
    ["Café Sello Rojo 250 g", "Abarrotes", 4, 9800, 7900, 2, abarrotes, null],
    ["Azúcar Manuelita 1 kg", "Abarrotes", 25, 5200, 4100, 3, abarrotes, null],
    ["Huevos AA x 30", "Abarrotes", 6, 18500, 15500, 2, abarrotes, 12],
    ["Atún Van Camps 160 g", "Enlatados", 36, 6900, 5200, 2, abarrotes, null],
    ["Leche Alquería 1 L", "Lácteos", 18, 4300, 3500, 8, lacteos, 5],
    ["Queso campesino 500 g", "Lácteos", 3, 12000, 9000, 2, lacteos, 4],
    ["Yogur Alpina 1 L", "Lácteos", 12, 7800, 6100, 2, lacteos, 9],
    ["Pan tajado Bimbo", "Panadería", 10, 6500, 5000, 3, abarrotes, 3],
    ["Gaseosa Coca-Cola 1.5 L", "Bebidas", 40, 6000, 4500, 7, abarrotes, null],
    ["Agua Cristal 600 ml", "Bebidas", 60, 2000, 1200, 10, abarrotes, null],
    ["Cerveza Águila lata", "Bebidas", 72, 3000, 2200, 12, abarrotes, null],
    ["Papas Margarita", "Snacks", 45, 2500, 1700, 9, abarrotes, null],
    ["Jabón Rey barra", "Aseo", 24, 2800, 2000, 2, aseo, null],
    ["Detergente Fab 1 kg", "Aseo", 8, 13500, 10800, 1, aseo, null],
    ["Papel higiénico Familia x 4", "Aseo", 2, 9500, 7400, 2, aseo, null],
  ];

  const productos = await check(
    supabase.from("products").insert(
      catalogo.map(([name, category, stock, sale, cost, demand, supplier, vence]) => ({
        business_id: bid,
        name,
        category,
        stock,
        sale_price: sale,
        real_cost: cost,
        avg_daily_demand: demand,
        supplier_id: supplier.id,
        expiration_date: vence ? dia(vence) : null,
        item_type: "producto",
        show_in_catalog: true,
      }))
    ).select(),
    "productos"
  );

  // Ventas de los ultimos 14 dias para que las graficas y KPIs tengan historia.
  const ventas = [];
  productos.forEach((p) => {
    for (let i = -13; i <= 0; i++) {
      const qty = Math.max(0, Number(p.avg_daily_demand) + aleatorio(-2, 2));
      if (qty > 0) ventas.push({ product_id: p.id, sale_date: dia(i), qty });
    }
  });
  await check(supabase.from("sales").insert(ventas), "ventas");

  await check(
    supabase.from("expenses").insert([
      { business_id: bid, description: "Arriendo del local", amount: 1200000, category: "Arriendo", expense_date: dia(-10) },
      { business_id: bid, description: "Recibo de luz (ESSA)", amount: 185000, category: "Servicios", expense_date: dia(-6) },
      { business_id: bid, description: "Agua (Acueducto)", amount: 64000, category: "Servicios", expense_date: dia(-6) },
      { business_id: bid, description: "Bolsas y empaques", amount: 45000, category: "Insumos", expense_date: dia(-2) },
    ]),
    "gastos"
  );

  const clientes = await check(
    supabase.from("customers").insert([
      { business_id: bid, name: "Doña Marta", lastname: "Rojas", phone: "3000000011" },
      { business_id: bid, name: "Don Jairo", lastname: "Pérez", phone: "3000000012" },
      { business_id: bid, name: "Luisa", lastname: "Gómez", phone: "3000000013" },
    ]).select(),
    "clientes"
  );
  await check(
    supabase.from("debts").insert([
      { business_id: bid, customer_id: clientes[0].id, amount: 48500, balance: 48500, note: "Mercado de la quincena", due_date: dia(5) },
      { business_id: bid, customer_id: clientes[1].id, amount: 23000, balance: 12000, note: "Abonó $11.000", due_date: dia(-2) },
      { business_id: bid, customer_id: clientes[2].id, amount: 15000, balance: 15000, note: null, due_date: dia(10) },
    ]),
    "fiados"
  );

  // Tres facturas de hoy con distintos medios de pago.
  const porNombre = (n) => productos.find((p) => p.name === n);
  const facturas = [
    { buyer: "Camilo", pago: "efectivo", items: [["Leche Alquería 1 L", 2], ["Pan tajado Bimbo", 1]] },
    { buyer: null, pago: "nequi", items: [["Cerveza Águila lata", 6], ["Papas Margarita", 2]] },
    { buyer: "Doña Marta", pago: "efectivo", items: [["Arroz Diana 500 g", 2], ["Aceite Premier 1 L", 1], ["Huevos AA x 30", 1]] },
  ];
  for (const f of facturas) {
    const lineas = f.items.map(([n, qty]) => ({ p: porNombre(n), qty }));
    const total = lineas.reduce((s, l) => s + Number(l.p.sale_price) * l.qty, 0);
    const factura = await check(
      supabase.from("invoices").insert({
        business_id: bid,
        buyer_name: f.buyer,
        delivery_type: "lugar",
        delivery_fee: 0,
        payment_method: f.pago,
        payment_cash_amount: f.pago === "efectivo" ? total : 0,
        payment_transfer_amount: f.pago === "nequi" ? total : 0,
        total,
      }).select().single(),
      "factura"
    );
    await check(
      supabase.from("invoice_items").insert(
        lineas.map((l) => ({
          invoice_id: factura.id,
          product_id: l.p.id,
          product_name: l.p.name,
          qty: l.qty,
          unit_price: Number(l.p.sale_price),
          subtotal: Number(l.p.sale_price) * l.qty,
        }))
      ),
      "items de factura"
    );
  }
  console.log("- Minimercado listo: " + productos.length + " productos, " + ventas.length + " registros de ventas, 3 fiados, 3 facturas.");
}

async function sembrarBarberia(ownerId) {
  const negocio = await crearNegocio(ownerId, "Barbería El Patrón (DEMO)");
  if (!negocio) return;
  const bid = negocio.id;

  const servicios = [
    ["Corte clásico", 25000],
    ["Corte + barba", 35000],
    ["Arreglo de barba", 15000],
    ["Cejas", 8000],
  ];
  await check(
    supabase.from("products").insert(
      servicios.map(([name, price]) => ({
        business_id: bid, name, category: "Servicios", stock: 0, sale_price: price, real_cost: 0,
        item_type: "servicio", show_in_catalog: true,
      })).concat([
        { business_id: bid, name: "Cera para cabello", category: "Productos", stock: 14, sale_price: 22000, real_cost: 14000, item_type: "producto", show_in_catalog: true },
        { business_id: bid, name: "Aceite para barba", category: "Productos", stock: 6, sale_price: 30000, real_cost: 18000, item_type: "producto", show_in_catalog: true },
      ])
    ),
    "servicios"
  );

  const citas = [
    [0, "09:00", "Julián Rueda", "Corte + barba", 35000, "completada"],
    [0, "11:00", "Sebastián Mora", "Corte clásico", 25000, "completada"],
    [0, "16:00", "Andrés Peña", "Arreglo de barba", 15000, "pendiente"],
    [1, "09:00", "Camilo Ortiz", "Corte clásico", 25000, "pendiente"],
    [1, "10:30", "David Salazar", "Corte + barba", 35000, "pendiente"],
    [1, "15:00", "Mateo Díaz", "Cejas", 8000, "pendiente"],
  ];
  await check(
    supabase.from("appointments").insert(
      citas.map(([offset, hora, nombre, servicio, precio, estado]) => ({
        business_id: bid,
        customer_name: nombre,
        customer_phone: null,
        service_name: servicio,
        service_price: precio,
        appointment_date: dia(offset),
        appointment_time: hora,
        duration_minutes: 40,
        status: estado,
      }))
    ),
    "citas"
  );
  console.log("- Barbería lista: 4 servicios, 2 productos, 6 citas (hoy y mañana).");
}

async function main() {
  if (!DEMO_EMAIL || !DEMO_PASSWORD) {
    throw new Error("Define DEMO_EMAIL y DEMO_PASSWORD. Ej: DEMO_EMAIL=demo@correo.com DEMO_PASSWORD=claveLarga node scripts/seed-demo.js");
  }
  const user = await obtenerUsuarioDemo();
  console.log("Usuario demo: " + user.email);
  await sembrarMinimercado(user.id);
  await sembrarBarberia(user.id);
  console.log("Listo. Entra a la app con " + DEMO_EMAIL + " para ver los negocios de demostración.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
