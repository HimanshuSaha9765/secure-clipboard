const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Send a text message to your Telegram
 * @param {string} text — the message to send
 * @returns {object} — Telegram API response
 */
export async function sendTextToTelegram(text) {
  const response = await fetch(`${BASE_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,

      parse_mode: "HTML",
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("Telegram API error:", data);
    throw new Error(`Telegram error: ${data.description}`);
  }

  return data;
}

/**
 * Send a file to your Telegram
 * @param {Buffer} fileBuffer — the file data as bytes
 * @param {string} fileName — original file name
 * @param {string} mimeType — file type (e.g., "image/png")
 * @param {string} caption — optional text caption
 * @returns {object} — Telegram API response
 */
export async function sendFileToTelegram(
  fileBuffer,
  fileName,
  mimeType,
  caption = "",
) {
  const formData = new FormData();
  formData.append("chat_id", CHAT_ID);

  const blob = new Blob([fileBuffer], { type: mimeType });

  let endpoint;
  let fieldName;

  if (mimeType.startsWith("image/")) {
    if (fileBuffer.length > 5 * 1024 * 1024) {
      endpoint = "sendDocument";
      fieldName = "document";
    } else {
      endpoint = "sendPhoto";
      fieldName = "photo";
    }
  } else if (mimeType.startsWith("audio/")) {
    endpoint = "sendAudio";
    fieldName = "audio";
  } else if (mimeType.startsWith("video/")) {
    endpoint = "sendVideo";
    fieldName = "video";
  } else {
    endpoint = "sendDocument";
    fieldName = "document";
  }

  formData.append(fieldName, blob, fileName);

  if (caption) {
    formData.append("caption", caption);
  }

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!data.ok) {
    console.error("Telegram API error:", data);
    throw new Error(`Telegram error: ${data.description}`);
  }

  return data;
}

export async function testBotConnection() {
  const response = await fetch(`${BASE_URL}/getMe`);
  const data = await response.json();
  return data;
}
