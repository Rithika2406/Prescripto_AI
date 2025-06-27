import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { Camera, Upload, Volume2, Languages, FileText, Mic, MicOff, Heart, Users, Loader, AlertCircle } from 'lucide-react';

const App = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('tamil');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [translatedOutput, setTranslatedOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const backendBaseUrl = 'https://prescripto-ai.onrender.com';

  const languages = {
    tamil: { name: 'தமிழ்', code: 'ta-IN', openaiCode: 'Tamil' },
    hindi: { name: 'हिन्दी', code: 'hi-IN', openaiCode: 'Hindi' },
    english: { name: 'English', code: 'en-IN', openaiCode: 'English' }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setLoadingStage('Uploading and processing image...');
      setError('');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${backendBaseUrl}/api/ocr`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'OCR failed');
      setPrescriptionText(data.cleanedText || data.originalText);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  const toggleVoiceInput = async () => {
    setIsListening(!isListening);
    if (isListening || !('webkitSpeechRecognition' in window)) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
      const rawText = event.results[0][0].transcript;
      setPrescriptionText('Processing voice input...');

      try {
        const response = await fetch(`${backendBaseUrl}/api/correct-voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawText })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Voice correction failed');
        setPrescriptionText(data.correctedText);
      } catch (err) {
        setError(err.message);
        setPrescriptionText(rawText);
      }
    };

    recognition.onerror = () => {
      setError('Speech recognition error');
    };

    recognition.start();
  };

  const translatePrescription = async () => {
    if (!prescriptionText.trim()) {
      setError('Please enter prescription text first');
      return;
    }

    try {
      setIsLoading(true);
      setLoadingStage('Processing...');
      setError('');

      const response = await fetch(`${backendBaseUrl}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prescriptionText,
          targetLanguage: selectedLanguage
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Translation failed');

      setTranslatedOutput(data.translation);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      const targetLangCode = languages[selectedLanguage].code;

      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/_/g, '')
        .replace(/\u2022/g, '-')
        .replace(/\n/g, ' ');

      let matchedVoice = voices.find(v => v.lang === targetLangCode || v.lang.startsWith(targetLangCode));
      if (!matchedVoice) matchedVoice = voices.find(v => v.lang.startsWith('en'));

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = matchedVoice?.lang || 'en-IN';
      utterance.voice = matchedVoice;
      synth.cancel();
      synth.speak(utterance);
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      const loadVoices = () => synth.getVoices();
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <Heart className="icon" />
          <div>
            <h1>Prescripto AI</h1>
            <p>AI-Powered Health Translator for Rural India</p>
          </div>
        </div>
        <div className="header-right">
          <span className="api-status">🤖 Groq API Embedded</span>
          <div className="community-status">
            <Users className="icon-sm" /> Serving Rural Communities
          </div>
        </div>
      </header>

      <main className="main">
        <section className="language-selection">
          <Languages className="icon" />
          <h3>Select Your Language</h3>
          <div className="language-grid">
            {Object.entries(languages).map(([key, lang]) => (
              <button
                key={key}
                className={`language-button ${selectedLanguage === key ? 'active' : ''}`}
                onClick={() => setSelectedLanguage(key)}
              >
                <div>{lang.name}</div>
                <small>{lang.code}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="input-sections">
          <div className="input-box">
            <Upload className="icon" /> Upload Prescription Image
            <div className="upload-area">
              <Camera className="icon-lg" />
              <p>Upload image (JPG/PNG)</p>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} hidden />
              <button onClick={() => fileInputRef.current.click()} disabled={isLoading}>Choose File</button>
            </div>
          </div>

          <div className="input-box">
            <FileText className="icon" /> Type or Use Voice
            <textarea
              value={prescriptionText}
              onChange={(e) => setPrescriptionText(e.target.value)}
              placeholder="Type or dictate..."
            />
            <button onClick={toggleVoiceInput} disabled={isLoading}>
              {isListening ? <MicOff /> : <Mic />} {isListening ? 'Stop' : 'Speak'}
            </button>
            <button onClick={translatePrescription} disabled={!prescriptionText || isLoading}>Translate with AI</button>
          </div>
        </section>

        {error && <div className="error-box"><AlertCircle className="icon-sm" /> {error}</div>}
        {isLoading && <div className="loading-box"><Loader className="icon-sm spin" /> {loadingStage || 'Processing...'}</div>}

        {translatedOutput && (
          <section className="output-box">
            <h3>Translation in {languages[selectedLanguage].name}</h3>
            <div className="speak-buttons">
              <button onClick={() => speakText(translatedOutput.simplified_translation)}><Volume2 /> Speak Translation</button>
              <button onClick={() => speakText(translatedOutput.quick_summary)}><Volume2 /> Speak Summary</button>
              <button onClick={() => speakText(translatedOutput.medical_terms_explained)}><Volume2 /> Speak Terms</button>
              <button onClick={() => speakText(translatedOutput.dosage_schedule)}><Volume2 /> Speak Dosage</button>
            </div>
            <div className="output-section">
              <h4>Original</h4>
              <p>{translatedOutput.original || prescriptionText}</p>
            </div>
            <div className="output-section">
              <h4>Simplified Translation</h4>
              <p>{translatedOutput.simplified_translation}</p>
            </div>
            <div className="output-section">
              <h4>Quick Summary</h4>
              <p>{translatedOutput.quick_summary}</p>
            </div>
            <div className="output-section">
              <h4>Medical Terms Explained</h4>
              <p>{translatedOutput.medical_terms_explained}</p>
            </div>
            <div className="output-section">
              <h4>Dosage Schedule</h4>
              <p>{translatedOutput.dosage_schedule}</p>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>🤖 AI-Powered Healthcare Communication</p>
        <p>Empowering rural communities with cutting-edge AI technology</p>
      </footer>
    </div>
  );
};

export default App;
