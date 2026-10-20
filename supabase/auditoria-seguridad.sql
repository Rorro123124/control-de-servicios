-- Auditoria de seguridad (solo lectura, no cambia nada).
-- Pegala en Supabase > SQL Editor > New query y pulsa Run.
-- Comparte el resultado para escribir las politicas exactas que falten.

-- 1. Tablas SIN Row Level Security: cualquiera con la llave publica (anon) podria leerlas o escribirlas.
select tablename as tabla_sin_rls
from pg_tables
where schemaname = 'public' and rowsecurity = false
order by tablename;

-- 2. Politicas existentes. Revisa que ninguna tenga qual = 'true' para SELECT, UPDATE o DELETE
--    en tablas con datos de negocio (products, invoices, expenses, debts, customers...).
select tablename as tabla, policyname as politica, cmd as operacion, roles, qual as condicion_lectura, with_check as condicion_escritura
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 3. Funciones expuestas (rpc) que corren con permisos de administrador (security definer).
--    get_catalog y get_business_public_name NO deben devolver costos ni datos privados.
select p.proname as funcion, pg_get_function_result(p.oid) as devuelve
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef = true
order by p.proname;
