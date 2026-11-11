// File: netlify/functions/gemini-tts.js
exports.handler = async (event) => {
  // Hanya izinkan request berjenis POST dari aplikasi Anda
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Ambil API Key secara rahasia dari Environment Variable Netlify
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GEMINI_API_KEY belum diatur di Netlify.' })
    };
  }

  try {
    const { narrationText, toneStyle, voiceName } = JSON.parse(event.body || '{}');
    if (!narrationText) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Teks narasi kosong.' }) };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`;
    const prompt = `Bacakan pengumuman singkat ini dalam Bahasa Indonesia dengan intonasi ${toneStyle || 'ramah dan profesional'}: "${narrationText}"`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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
        body: JSON.stringify({ error: 'Gagal mendapatkan audio dari Gemini.' })
      };
    }

    // Kirim hanya data suara (tanpa membocorkan API Key) kembali ke browser
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioContent: base64Audio })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
