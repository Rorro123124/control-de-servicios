const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export async function interpretarColumnas(headers, sampleRows) {
  if (!WORKER_URL) {
    throw new Error("Falta configurar VITE_WORKER_URL en el .env del frontend.");
  }

  const response = await fetch(WORKER_URL.replace(/\/$/, "") + "/interpretar-columnas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headers, sampleRows }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error interpretando las columnas.");
  }

  return data.mapping;
}

export async function sugerirCategorias(productNames) {
  if (!WORKER_URL) {
    throw new Error("Falta configurar VITE_WORKER_URL en el .env del frontend.");
  }

  const response = await fetch(WORKER_URL.replace(/\/$/, "") + "/sugerir-categorias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productNames }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error sugiriendo categorias.");
  }

  return data.categories;
}

export async function preguntarAlAsistente(businessId, question) {
  if (!WORKER_URL) {
    throw new Error("Falta configurar VITE_WORKER_URL en el .env del frontend.");
  }

  const response = await fetch(WORKER_URL.replace(/\/$/, "") + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, question }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error hablando con el asistente.");
  }

  return data.answer;
}
