# NeuroRead AI 🧠

**Real-time AI that makes any webpage readable for neurodivergent users.**

> Dyslexia · ADHD · Autism Spectrum · Custom Profiles  
> Powered by Groq Cloud · Multimodal (Text + Vision + Voice) · LangChain

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** — [Download](https://nodejs.org)
- **Google Chrome** — Latest version
- **Groq API Key** — [Get one free](https://console.groq.com)

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file (or edit the existing one):
```
GROQ_API_KEY=your_groq_api_key_here
PORT=3001
```

Start the server:
```bash
npm run dev
```

You should see:
```
╔══════════════════════════════════════════════╗
║  NeuroRead AI Backend                        ║
║  Running on http://localhost:3001             ║
║  Groq API Key: ✅ configured                 ║
╚══════════════════════════════════════════════╝
```

### 2. Chrome Extension Setup

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The NeuroRead AI icon 🧠 appears in your toolbar

### 3. Use It

1. Navigate to any webpage (news articles work best)
2. Click the NeuroRead AI extension icon
3. Select a profile (ADHD, Autism, Dyslexia, or Custom)
4. Click **✨ Activate**
5. Watch the page transform in real time!

---

## 🧩 Features

| Feature | Description |
|---------|-------------|
| **Text Simplification** | AI rewrites complex sentences into plain English |
| **Idiom Detection** | Figurative language highlighted with plain meaning tooltips |
| **Tone Warning** | Dismissible banner for emotionally intense content |
| **CAM Score** | Cognitive Accessibility Metric badge (Easy/Medium/Hard) |
| **Focus Mode** | Hides ads, sidebars, nav — content only |
| **Reading Ruler** | Overlay that highlights current reading line |
| **TTS** | Text-to-Speech with profile-specific speed |
| **ADHD Colours** | Semantic colour coding (purple headings, amber facts, teal quotes) |
| **Voice Commands** | Say "simplify", "focus", or "stop" |
| **Custom Profile** | Live sliders for font size, spacing, colours |

---

## 🏗️ Architecture

```
Browser Extension ──POST /analyze──► Node.js Backend ──► Groq Cloud
     (Chrome MV3)                    (Express:3001)      (Llama 3.3 70B)
                                                          (Llama 3.2 Vision)
                                                          (Whisper v3 Turbo)
```

### Tech Stack
- **Extension**: Chrome Manifest V3
- **Backend**: Node.js 18+ / Express
- **AI Text**: Groq Llama 3.3 70B (JSON mode)
- **AI Vision**: Groq Llama 3.2 11B Vision
- **AI Voice**: Groq Whisper v3 Turbo
- **AI Wrapper**: LangChain (ChatGroq + JsonOutputParser)
- **DOM**: Custom Trie Index (SPA-safe)
- **Performance**: LRU Cache (client + server)
- **Dyslexia Font**: OpenDyslexic

---

## 📁 Project Structure

```
neuroread-ai/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── service-worker.js
│   ├── content/            # Content scripts
│   │   ├── content.js      # Main orchestrator
│   │   ├── dom-capture.js  # TreeWalker extraction
│   │   ├── trie-index.js   # DOM text node mapping
│   │   ├── lru-cache.js    # Client-side cache
│   │   └── features/       # Feature modules
│   ├── popup/              # Extension popup UI
│   ├── styles/             # Profile CSS files
│   ├── fonts/              # OpenDyslexic font
│   └── icons/              # Extension icons
│
├── backend/                # Node.js / Express
│   ├── server.js
│   ├── routes/             # API endpoints
│   └── pipeline/           # AI pipeline modules
│
└── README.md
```

---

## 🎓 Google Big Code Hackathon 2026 · Accessibility Track

**NeuroRead AI** — Making the web readable for everyone.