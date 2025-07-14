const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fetch = require('node-fetch'); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Health check root route for Render
app.get("/", (req, res) => {
  res.send("✅ Prescripto AI backend is running");
});

const allowedOrigins = [
  'http://localhost:3000', // local dev
    'https://rithika2406.github.io', // ✅ your GitHub Pages frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ dest: 'uploads/' });

function sanitizeText(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/`+/g, '')
    .replace(/\u2022/g, '-')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

async function callOpenAI(messages, apiKey, temperature = 0.3) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages,
      temperature,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `Groq API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

app.post('/api/ocr', upload.single('image'), async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image uploaded' });

    const inputPath = file.path;
    const processedPath = `${file.path}-processed.png`;

    await sharp(inputPath)
      .resize({ width: 1500 })
      .grayscale()
      .threshold(150)
      .toFile(processedPath);

    const { data: { text } } = await Tesseract.recognize(processedPath, 'eng');
    fs.unlinkSync(inputPath);
    fs.unlinkSync(processedPath);

    const cleanedText = await callOpenAI([
      {
        role: 'system',
        content: `You are a medical assistant that corrects OCR output from prescriptions. Clean it up, correct any OCR errors, and return it in readable form.`
      },
      {
        role: 'user',
        content: `OCR Text:\n${text}`
      }
    ], apiKey);

    res.json({ success: true, originalText: text, cleanedText });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!text || !targetLanguage || !apiKey) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }

    const translationPrompt = [
      {
        role: 'system',
        content: `Translate the following prescription into ${targetLanguage} in simple, patient-friendly language.\nReturn only valid JSON in this structure:\n{\n  "simplified_translation": "...",\n  "quick_summary": "...",\n  "medical_terms_explained": "...",\n  "dosage_schedule": "..." }\nAvoid asterisks, underscores, markdown, or backticks. Use plain JSON only.`
      },
      {
        role: 'user',
        content: text
      }
    ];

    const output = await callOpenAI(translationPrompt, apiKey);

    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      const fixedOutput = output.replace(/"medical_terms_explained":(.*?)"dosage_schedule":/, (_, val) => `"medical_terms_explained":${val},"dosage_schedule":`);
      try {
        parsed = JSON.parse(fixedOutput);
      } catch {
        parsed = {
          simplified_translation: output,
          quick_summary: 'Summary not parsed from AI output',
          medical_terms_explained: 'Explanation unavailable',
          dosage_schedule: 'Unstructured'
        };
      }
    }

    parsed.simplified_translation = sanitizeText(parsed.simplified_translation || '');
    parsed.quick_summary = sanitizeText(parsed.quick_summary || '');
    parsed.medical_terms_explained = sanitizeText(parsed.medical_terms_explained || '');
    parsed.dosage_schedule = sanitizeText(parsed.dosage_schedule || '');

    res.json({ success: true, translation: parsed });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/correct-voice', async (req, res) => {
  try {
    const { text } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    const correctionPrompt = [
      {
        role: 'system',
        content: `You're a medical assistant correcting voice-to-text transcription of prescriptions. Fix drug names, dosages, and structure the text clearly.`
      },
      {
        role: 'user',
        content: text
      }
    ];

    const corrected = await callOpenAI(correctionPrompt, apiKey);
    res.json({ success: true, originalText: text, correctedText: sanitizeText(corrected) });
  } catch (error) {
    console.error('Voice correction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Optional health route for external checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Groq-powered backend ready ✅' });
});

app.listen(PORT, () => {
  console.log(`🚀 Health Translator API running on port ${PORT}`);
});
