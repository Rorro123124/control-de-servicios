# Contexto del proyecto

Dueño: Rodrigo Correa. Vende soluciones digitales a negocios pequeños en Colombia (barberías, veterinarias, odontólogos, restaurantes, tiendas, ferreterías, panaderías, spas, gimnasios). Habla en español; prefiere explicaciones claras y didácticas, con emojis.

## Qué hay en el repo

- `src/` — Frontend React + Vite + Supabase: POS/gestión (inventario, kardex, ventas, caja, Nequi/mixto, fiados, cuentas por pagar, mesas, citas, catálogo y reservas públicas, KPIs). No emite facturación electrónica DIAN: venderlo como control interno.
- `whatsapp-alerts/` — Worker Node (CommonJS) con service role de Supabase: alertas y reportes por Telegram, chat con IA (Groq), recordatorios de citas. Su bot de clientes usa Baileys (WhatsApp no oficial): no venderlo a clientes, riesgo de bloqueo del número.
- `whatsapp-alerts/scripts/seed-demo.js` — crea cuenta demo con un minimercado y una barbería de ejemplo (aún no se ha corrido contra la base real).
- `supabase/auditoria-seguridad.sql` — consultas de solo lectura para revisar RLS y políticas. Pendiente: correrla y escribir las políticas que falten.
- `portafolio/` — página pública de Rodrigo (servicios, demo interactiva del asistente, planes). `contenido.html` es la fuente; `index.html` se regenera desde ella (comando en `portafolio/README.md`). Se publica en Netlify con base directory `portafolio`.

## Decisiones tomadas

- Bot de WhatsApp nuevo: WhatsApp Cloud API oficial directo (sin BSP), un servidor multi-cliente con un archivo de configuración por negocio. Pendiente decidir si guarda citas en el Supabase existente (recomendado) o independiente.
- Seguridad: los endpoints del worker exigen sesión de Supabase (`Authorization: Bearer`), `/chat` verifica dueño o miembro del negocio, `/qr-clientes` exige `ADMIN_TOKEN`. Frontend y worker deben desplegarse juntos.
- Planes: Responde $250.000 + $60.000/mes; Agenda $400.000 + $100.000/mes; Completo $600.000 + $150.000/mes; inventario $150.000–250.000 + $50.000/mes; web desde $350.000.

## Pendientes

1. Correr `supabase/auditoria-seguridad.sql` y corregir RLS; activar "Confirm email" en Supabase.
2. Agregar `ADMIN_TOKEN` al `.env` del worker y desplegar worker + frontend.
3. Correr `seed-demo.js` para tener la cuenta de demostración.
4. Construir el bot con WhatsApp Cloud API (plantilla barbería → veterinaria, odontología, restaurante por configuración).
5. Los `package-lock.json` están desincronizados con `package.json` (usar `npm install`, no `npm ci`, hasta regenerarlos).
