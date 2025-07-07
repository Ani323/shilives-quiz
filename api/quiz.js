// api/quiz.js
import { google } from 'googleapis';

const SHEET_ID = '190iyPrli-xf5NNgq6E4HLV7hXsxGuJg3fD2gskelbAE';
const OPENAI_API_KEY = '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';
const GOOGLE_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "XXXX",
  private_key_id: "XXXX",
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: "xxxx@xxxx.iam.gserviceaccount.com",
  client_id: "XXXX",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/xxxx"
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const answers = req.body.answers || {};
  const timestamp = new Date().toISOString();

  try {
    // Step 1: Write to Google Sheet
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_SERVICE_ACCOUNT,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const values = [timestamp, ...Object.values(answers)];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [values]
      }
    });

    // Step 2: Generate GPT Scorecard
    const prompt = `
You are a holistic wellness expert. A user submitted the following responses:\n\n${JSON.stringify(answers, null, 2)}\n\n
Based on this, write a scorecard with:
- 3 scores (mental, physical, overall wellness)
- A root cause insight
- 3 product suggestions
- 1 affirmation

Return ONLY JSON with keys: physical_score, mental_score, wellness_score, insight, products, affirmation.
    `.trim();

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful wellness coach.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6
      })
    });

    const result = await gptResponse.json();
    const parsed = result.choices?.[0]?.message?.content?.trim();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(JSON.parse(parsed));
  } catch (error) {
    console.error('Error:', error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: 'Server error', detail: error.message });
  }
}
