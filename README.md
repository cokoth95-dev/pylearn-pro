# PyLearn Pro 🐍

> **Interactive Python & AI Mastery Desktop App** — From Zero to AI Engineer in 10 Days.

PyLearn Pro is a desktop learning environment built with **Python (PyWebView)** and **Modern HTML5 / Monaco Editor / CSS Glassmorphism**. It combines structured daily micro-sessions with an interactive Python runtime, live memory inspection, active recall flashcards (SM-2 algorithm), and an integrated **Google Gemini AI Code Mentor**.

---

## ✨ Features

- ⚡ **Interactive Code Studio**: Embedded VS Code engine (Monaco Editor) with Python IntelliSense, method autocompletion, rainbow bracket matching, and auto-indent.
- 🖥️ **Real-Time Interactive Terminal**: Runs code safely in isolated subprocesses with real-time prompt support for `input()`.
- 🧠 **Memory & Execution State Visualizer**: Clickable inspectors for Call Stack frames, Heap Memory variable allocations with memory addresses, and Garbage Collection tracking.
- 🤖 **Level-Adaptive AI Code Mentor**: Powered by Google Gemini API (`gemini-3.6-flash`), offering simple layman analogies, issue diagnosis, and instant clean refactorings with an in-app Q&A chatbox.
- 🃏 **Spaced Repetition Flashcards (SRS)**: Active recall powered by the SuperMemo-2 (SM-2) algorithm to ensure long-term retention.
- ⏱️ **Focus Pomodoro Timer**: 30-minute focus sprints with auto-pause and session state persistence.
- 💾 **Full Progress Auto-Save**: Saves code drafts on every keystroke and restores your active view, session, and timer upon relaunching.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ (Recommended Python 3.12)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cokoth95-dev/pylearn-pro.git
   cd pylearn-pro
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **(Optional) Configure Gemini AI Mentor:**
   Create a `.env` file in the root folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Get your free API key at [Google AI Studio](https://aistudio.google.com/app/apikey))*.

4. **Launch PyLearn Pro:**
   - On Windows: Double-click `start.bat` or run:
     ```powershell
     .\start.ps1
     ```
   - Or run with Python:
     ```bash
     python app.py
     ```

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, SQLite3, `pywebview`, `google-genai`
- **Frontend**: Vanilla JavaScript (ES6+), Monaco Editor, Lucide Icons, Glassmorphism UI
- **AI Engine**: Google Gemini API (`gemini-3.6-flash` / `gemini-3.5-flash-lite`)

---

## 📄 License

MIT License. Open source and free to use!
