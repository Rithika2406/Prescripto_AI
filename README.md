# 💊 Prescripto AI – AI-Powered Health Translator for Rural India

Prescripto AI is a Generative AI-based web application that enables patients, especially in rural areas, to understand their medical prescriptions by translating them into their local language and speaking the result aloud. It helps bridge the communication gap between doctors and patients by using advanced OCR, LLMs, and Text-to-Speech technologies.

## 🌟 Key Features

- 🖼️ Image Upload + OCR  
  Upload prescription images and extract text using Tesseract.js OCR with pre-processing via Sharp.

- 🧠 AI Correction of OCR/Voice Input  
  Uses LLaMA 3 model via Groq API to correct OCR errors and voice-to-text inaccuracies.

- 🌍 Multi-language Translation  
  Translates medical instructions into Tamil, Hindi, or English using Groq + LLaMA 3 in a patient-friendly tone.

- 🔊 Text-to-Speech (TTS)  
  Speaks out translated content using browser-based speech synthesis in the user’s preferred language.

- 🎤 Voice Input Support  
  Users can dictate their prescriptions instead of typing, useful for low-literacy patients.

## 🧠 Tech Stack

| Layer        | Tech Used                                   |
|--------------|---------------------------------------------|
| Frontend     | React.js, Web Speech API, Lucide Icons      |
| Backend      | Node.js, Express.js, Multer, Sharp          |
| AI Services  | LLaMA 3 (via Groq API)                      |
| OCR          | Tesseract.js                                |
| TTS          | Browser SpeechSynthesis API                 |
| Image Upload | HTML5 File Input + Multer                   |
