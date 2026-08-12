import { supabase } from "./supabaseClient";

export const COP_POR_PUNTO = 10000;

export function calcularPuntosGanados(total) {
  return Math.floor(Number(total || 0) / COP_POR_PUNTO);
}

export async function agregarPuntos(customerId, puntos) {
  if (!puntos || puntos <= 0) return;
  const { data: customer, error } = await supabase.from("customers").select("points").eq("id", customerId).single();
  if (error) throw error;
  const nuevos = Number(customer.points || 0) + puntos;
  const { error: updateError } = await supabase.from("customers").update({ points: nuevos }).eq("id", customerId);
  if (updateError) throw updateError;
}

export async function redimirPuntos(customerId, puntos) {
  const { data: customer, error } = await supabase.from("customers").select("points").eq("id", customerId).single();
  if (error) throw error;
  const actuales = Number(customer.points || 0);
  if (puntos > actuales) throw new Error("Este cliente no tiene suficientes puntos.");
  const { error: updateError } = await supabase.from("customers").update({ points: actuales - puntos }).eq("id", customerId);
  if (updateError) throw updateError;
}
