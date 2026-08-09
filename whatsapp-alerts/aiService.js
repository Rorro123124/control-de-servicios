async function createAiService(options) {
  const apiKey = options.apiKey;

  return async function askAi(prompt) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ? data.error.message : "Error llamando a Groq");
    }

    return data.choices[0].message.content;
  };
}

module.exports = { createAiService };