import { google } from 'googleapis';

const SHEET_ID = '190iyPrli-xf5NNgq6E4HLV7hXsxGuJg3fD2gskelbAE';

const GOOGLE_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
};

export default async function handler(req, res) {
  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  // ✅ Set CORS for actual requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ❌ Block other methods
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const answers = req.body.answers || {};
  const timestamp = new Date().toISOString();

  try {
    // ✅ Auth with Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_SERVICE_ACCOUNT,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ✅ Map to correct column order
    const values = [
      timestamp,
      answers.name || '',
      answers.email || '',
      answers.age || '',
      answers.season || '',
      answers.concern || '',
      '' // GPT scorecard column (blank for now)
    ];

    // ✅ Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [values]
      }
    });

    return res.status(200).json({ success: true, message: 'Answers stored successfully' });

  } catch (error) {
    console.error('Sheet write error:', error);
    return res.status(500).json({ error: 'Sheet write failed', detail: error.message });
  }
}
