async function createWhatsappSender({ telegramToken }) {
  async function sendWhatsappMessage(chatId, body) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: body, parse_mode: "Markdown" }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || "Error enviando mensaje a Telegram");
    return data.result.message_id;
  }

  async function sendWhatsappPhoto(chatId, photoUrl, caption) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: caption || "", parse_mode: "Markdown" }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || "Error enviando foto a Telegram");
    return data.result.message_id;
  }

  async function sendWhatsappDocument(chatId, contenidoTexto, nombreArchivo, caption) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendDocument`;
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption || "");
    form.append("document", new Blob([contenidoTexto], { type: "application/json" }), nombreArchivo);

    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || "Error enviando documento a Telegram");
    return data.result.message_id;
  }

  sendWhatsappMessage.sendPhoto = sendWhatsappPhoto;
  sendWhatsappMessage.sendDocument = sendWhatsappDocument;

  return sendWhatsappMessage;
}

module.exports = { createWhatsappSender };
