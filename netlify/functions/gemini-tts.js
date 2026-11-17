// File: netlify/functions/gemini-tts.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY belum diatur di Netlify.' }) };
  }

  try {
    const { narrationText, voiceName } = JSON.parse(event.body || '{}');
    if (!narrationText) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Teks narasi kosong.' }) };
    }

    // Membaca nama model dari Environment Variable Netlify (default: gemini-3.8-flash-tts)
    const modelName = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Kirim teks narasi murni tanpa kalimat instruksi agar tidak ikut dibacakan
    const cleanScript = String(narrationText).trim();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cleanScript }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Aoede' }
            }
          }
        }
      })
    });

    const data = await response.json();
    const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Gagal mendapatkan audio dari Gemini.', detail: data })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioContent: base64Audio })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
