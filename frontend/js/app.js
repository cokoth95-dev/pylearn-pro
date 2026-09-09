// Main State & Controller
const App = {
  state: {
    curriculum: [],
    stats: {},
    progress: [],
    flashcards: [],
    currentCardIdx: 0,
    currentDay: 1,
    currentSessionKey: 'm1_concept',
    activeView: 'dashboard',
    timerSeconds: 1800, // 30 minutes
    timerInterval: null,
    isTimerRunning: false,
    
    // Interactive Terminal & Live Inspector State
    pendingInputs: [],
    activeInputIdx: 0,
    currentCodeToRun: "",
    liveVariables: {},
    autoSaveDebounceTimer: null,
    monacoEditor: null
  },

  async init() {
    this.initMonacoEditor();
    this.bindEvents();
    window.addEventListener('pywebviewready', () => {
      this.loadAllData();
    });
    
    setTimeout(() => {
      if (!window.pywebview) {
        console.warn("pywebview not detected, running in mock dev mode");
        this.loadMockData();
      }
    }, 1000);

    window.addEventListener('beforeunload', () => {
      this.persistSessionState();
    });

    lucide.createIcons();
  },

  initMonacoEditor() {
    if (window.require) {
      window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
      window.require(['vs/editor/editor.main'], () => {
        // Register Python Autocompletion & Standard Library IntelliSense
        monaco.languages.registerCompletionItemProvider('python', {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            };

            const suggestions = [
              // Built-in functions
              { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Prints objects to the text stream file or sys.stdout.', range },
              { label: 'input', kind: monaco.languages.CompletionItemKind.Function, insertText: 'input("${1:prompt}: ")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Read a string from standard input.', range },
              { label: 'int', kind: monaco.languages.CompletionItemKind.Function, insertText: 'int(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert a number or string to an integer.', range },
              { label: 'str', kind: monaco.languages.CompletionItemKind.Function, insertText: 'str(${1:object})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a new string object from the given object.', range },
              { label: 'float', kind: monaco.languages.CompletionItemKind.Function, insertText: 'float(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert a string or number to a floating point number.', range },
              { label: 'len', kind: monaco.languages.CompletionItemKind.Function, insertText: 'len(${1:sequence})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return the number of items in a container.', range },
              { label: 'range', kind: monaco.languages.CompletionItemKind.Function, insertText: 'range(${1:stop})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Generate a sequence of numbers over a specified range.', range },
              { label: 'type', kind: monaco.languages.CompletionItemKind.Function, insertText: 'type(${1:object})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return the type of an object.', range },
              
              // String methods
              { label: 'strip', kind: monaco.languages.CompletionItemKind.Method, insertText: 'strip()', documentation: 'Return a copy of the string with leading and trailing whitespace removed.', range },
              { label: 'split', kind: monaco.languages.CompletionItemKind.Method, insertText: 'split(${1:sep})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a list of the words in the string, using sep as the delimiter string.', range },
              { label: 'join', kind: monaco.languages.CompletionItemKind.Method, insertText: 'join(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Concatenate any number of strings.', range },
              { label: 'replace', kind: monaco.languages.CompletionItemKind.Method, insertText: 'replace(${1:old}, ${2:new})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a copy with all occurrences of substring old replaced by new.', range },
              { label: 'upper', kind: monaco.languages.CompletionItemKind.Method, insertText: 'upper()', documentation: 'Return a copy of the string converted to uppercase.', range },
              { label: 'lower', kind: monaco.languages.CompletionItemKind.Method, insertText: 'lower()', documentation: 'Return a copy of the string converted to lowercase.', range },
              { label: 'title', kind: monaco.languages.CompletionItemKind.Method, insertText: 'title()', documentation: 'Return a version of the string where each word is titlecased.', range },
              { label: 'startswith', kind: monaco.languages.CompletionItemKind.Method, insertText: 'startswith(${1:prefix})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return True if the string starts with the specified prefix.', range },
              { label: 'endswith', kind: monaco.languages.CompletionItemKind.Method, insertText: 'endswith(${1:suffix})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return True if the string ends with the specified suffix.', range },
              { label: 'find', kind: monaco.languages.CompletionItemKind.Method, insertText: 'find(${1:sub})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return the lowest index in S where substring sub is found.', range },
              { label: 'format', kind: monaco.languages.CompletionItemKind.Method, insertText: 'format(${1:args})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Perform a string formatting operation.', range },

              // List methods
              { label: 'append', kind: monaco.languages.CompletionItemKind.Method, insertText: 'append(${1:item})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Append object to the end of the list.', range },
              { label: 'extend', kind: monaco.languages.CompletionItemKind.Method, insertText: 'extend(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Extend list by appending elements from the iterable.', range },
              { label: 'insert', kind: monaco.languages.CompletionItemKind.Method, insertText: 'insert(${1:index}, ${2:object})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Insert object before index.', range },
              { label: 'pop', kind: monaco.languages.CompletionItemKind.Method, insertText: 'pop()', documentation: 'Remove and return item at index (default last).', range },
              { label: 'remove', kind: monaco.languages.CompletionItemKind.Method, insertText: 'remove(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Remove first occurrence of value.', range },
              { label: 'sort', kind: monaco.languages.CompletionItemKind.Method, insertText: 'sort()', documentation: 'Sort the list in ascending order and return None.', range },
              { label: 'reverse', kind: monaco.languages.CompletionItemKind.Method, insertText: 'reverse()', documentation: 'Reverse *IN PLACE*.', range },

              // Dict methods
              { label: 'keys', kind: monaco.languages.CompletionItemKind.Method, insertText: 'keys()', documentation: 'Return a set-like object providing a view on D\'s keys.', range },
              { label: 'values', kind: monaco.languages.CompletionItemKind.Method, insertText: 'values()', documentation: 'Return an object providing a view on D\'s values.', range },
              { label: 'items', kind: monaco.languages.CompletionItemKind.Method, insertText: 'items()', documentation: 'Return a set-like object providing a view on D\'s items.', range },
              { label: 'get', kind: monaco.languages.CompletionItemKind.Method, insertText: 'get(${1:key}, ${2:default})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return the value for key if key is in the dictionary, else default.', range },

              // Snippets
              { label: 'forloop', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:item} in ${2:items}:\n    ${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Standard for-in loop construct', range },
              { label: 'ifelse', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if ${1:condition}:\n    ${2:pass}\nelse:\n    ${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'If-Else branching condition', range },
              { label: 'func', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'def ${1:function_name}(${2:params}):\n    """${3:Docstring}"""\n    ${4:return}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Function definition', range }
            ];

            return { suggestions };
          }
        });

        // Initialize Monaco Instance
        const container = document.getElementById('monaco-code-editor');
        if (container) {
          this.state.monacoEditor = monaco.editor.create(container, {
            value: '# Write your Python code here\nprint("Hello World!")',
            language: 'python',
            theme: 'vs-dark',
            fontSize: 14,
            fontFamily: "'Fira Code', Consolas, monospace",
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            minimap: { enabled: false },
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: true },
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 }
          });

          // Debounced auto-save listener on Monaco
          this.state.monacoEditor.onDidChangeModelContent(() => {
            clearTimeout(this.state.autoSaveDebounceTimer);
            this.state.autoSaveDebounceTimer = setTimeout(() => {
              this.autoSaveCurrentCode();
            }, 500);
          });

          // Ctrl+Enter / Cmd+Enter hotkey inside Monaco
          this.state.monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            this.startInteractiveCodeRun();
          });
        }
      });
    }
  },

  getCode() {
    if (this.state.monacoEditor) {
      return this.state.monacoEditor.getValue();
    }
    const txt = document.getElementById('main-code-editor');
    return txt ? txt.value : '';
  },

  setCode(newCode) {
    if (this.state.monacoEditor) {
      this.state.monacoEditor.setValue(newCode || '');
    }
    const txt = document.getElementById('main-code-editor');
    if (txt) txt.value = newCode || '';
  },

  bindEvents() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Run code button
    document.getElementById('btn-run-code').addEventListener('click', () => {
      this.startInteractiveCodeRun();
    });

    // AI Code Review button
    document.getElementById('btn-ai-review').addEventListener('click', () => {
      this.requestAICodeReview();
    });

    // Reset code button
    const btnReset = document.getElementById('btn-reset-code');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        const day = this.state.curriculum.find(d => d.day === this.state.currentDay);
        if (day) {
          const sess = day.sessions[this.state.currentSessionKey];
          if (sess) {
            const starter = sess.starter_code || '# Write your Python code here\nprint("Hello World!")';
            this.setCode(starter);
            this.autoSaveCurrentCode();
          }
        }
      });
    }

    // Auto-save draft code as user types (500ms debounce)
    const codeEditor = document.getElementById('main-code-editor');
    codeEditor.addEventListener('input', () => {
      clearTimeout(this.state.autoSaveDebounceTimer);
      this.state.autoSaveDebounceTimer = setTimeout(() => {
        this.autoSaveCurrentCode();
      }, 500);
    });

    codeEditor.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.startInteractiveCodeRun();
      }
    });

    // Interactive Terminal Input Prompt Handlers
    const termInput = document.getElementById('terminal-interactive-input');
    const termSend = document.getElementById('btn-terminal-send');

    const handleSendInput = () => {
      const val = termInput.value;
      termInput.value = '';
      this.submitTerminalInput(val);
    };

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendInput();
      }
    });

    termSend.addEventListener('click', handleSendInput);

    document.getElementById('btn-complete-session').addEventListener('click', () => {
      this.completeCurrentSession();
    });

    document.getElementById('session-timer-btn').addEventListener('click', () => {
      this.toggleTimer();
    });

    document.getElementById('flashcard-card').addEventListener('click', () => {
      this.flipCard();
    });

    document.getElementById('btn-jump-today').addEventListener('click', () => {
      this.startSession(this.state.currentDay, 'm1_concept');
    });
  },

  switchView(viewId) {
    this.state.activeView = viewId;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');

    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active');

    const titleMap = {
      dashboard: "Daily Learning Hub",
      curriculum: "Complete Python Mastery Track",
      studio: "Interactive Code Studio",
      flashcards: "Active Recall (SRS)",
      analytics: "Learning Analytics & Mastery"
    };
    document.getElementById('view-title').innerText = titleMap[viewId] || "PyLearn Pro";
    lucide.createIcons();
    this.persistSessionState();
  },

  async loadAllData() {
    try {
      this.state.curriculum = await window.pywebview.api.get_curriculum_list();
      this.state.stats = await window.pywebview.api.get_stats();
      this.state.progress = await window.pywebview.api.get_progress_data();
      this.state.flashcards = await window.pywebview.api.get_flashcards();

      // Restore saved session state (Active view, day, session, timer)
      if (window.pywebview && window.pywebview.api && window.pywebview.api.get_session_state) {
        const savedSession = await window.pywebview.api.get_session_state();
        if (savedSession) {
          this.state.currentDay = savedSession.current_day || 1;
          this.state.currentSessionKey = savedSession.current_session_key || 'm1_concept';
          this.state.timerSeconds = savedSession.timer_seconds !== undefined ? savedSession.timer_seconds : 1800;
          
          // Update timer display
          const m = Math.floor(this.state.timerSeconds / 60);
          const s = this.state.timerSeconds % 60;
          document.getElementById('session-timer-display').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          
          if (savedSession.active_view && savedSession.active_view !== 'dashboard') {
            if (savedSession.active_view === 'studio') {
              this.startSession(this.state.currentDay, this.state.currentSessionKey);
            } else {
              this.switchView(savedSession.active_view);
            }
          }
        }
      }

      this.updateStatsUI();
      this.renderDashboard();
      this.renderCurriculum();
      this.renderFlashcards();
    } catch (err) {
      console.error("Error loading data from Python backend:", err);
    }
  },

  async autoSaveCurrentCode() {
    const code = this.getCode();
    if (window.pywebview && window.pywebview.api && window.pywebview.api.auto_save_draft) {
      await window.pywebview.api.auto_save_draft(this.state.currentDay, this.state.currentSessionKey, code);
    }
  },

  persistSessionState() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_session_state) {
      window.pywebview.api.save_session_state(
        this.state.activeView,
        this.state.currentDay,
        this.state.currentSessionKey,
        this.state.timerSeconds,
        this.state.isTimerRunning
      );
    }
  },

  updateStatsUI() {
    const s = this.state.stats;
    document.getElementById('sidebar-level').innerText = s.level || 1;
    document.getElementById('sidebar-xp').innerText = s.xp || 0;
    document.getElementById('streak-display').innerText = `${s.streak_count || 0} Day Streak`;
    document.getElementById('sidebar-sessions-done').innerText = `${s.completed_sessions_count || 0} Sessions Completed`;
    
    const progressPct = Math.min(100, ((s.xp || 0) % 50) * 2);
    document.getElementById('sidebar-xp-progress').style.width = `${progressPct}%`;

    document.getElementById('stat-xp-large').innerText = s.xp || 0;
    document.getElementById('stat-streak-large').innerText = `${s.streak_count || 0} Days`;
    document.getElementById('stat-completed-sessions').innerText = s.completed_sessions_count || 0;
  },

  renderDashboard() {
    const day = this.state.curriculum.find(d => d.day === this.state.currentDay) || this.state.curriculum[0];
    if (!day) return;

    document.getElementById('dash-today-title').innerText = day.title;
    document.getElementById('dash-today-desc').innerText = day.description;

    const grid = document.getElementById('dash-sessions-grid');
    grid.innerHTML = '';

    const sessionKeys = [
      { key: 'm1_concept', tag: 'Morning 1 (30m)', label: 'Intuition & Concept' },
      { key: 'm2_code', tag: 'Morning 2 (30m)', label: 'Code Lab Sandbox' },
      { key: 'e1_flashcards', tag: 'Evening 1 (30m)', label: 'Active Recall Sprint' },
      { key: 'e2_project', tag: 'Evening 2 (30m)', label: 'Mini-Project Build' }
    ];

    sessionKeys.forEach(sk => {
      const sess = day.sessions[sk.key];
      if (!sess) return;

      const isCompleted = this.state.progress.some(p => p.day_number === day.day && p.session_type === sk.key && p.completed === 1);

      const card = document.createElement('div');
      card.className = `session-card ${isCompleted ? 'completed' : ''}`;
      card.innerHTML = `
        <div class="session-time-tag">${sk.tag}</div>
        <div class="session-title">${sess.title}</div>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">${sk.label}</div>
      `;
      card.addEventListener('click', () => {
        this.startSession(day.day, sk.key);
      });
      grid.appendChild(card);
    });
  },

  renderCurriculum() {
    const road = document.getElementById('curriculum-roadmap');
    road.innerHTML = '';

    this.state.curriculum.forEach(day => {
      const card = document.createElement('div');
      card.className = 'glass-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--primary);">MODULE ${day.day}</div>
            <h3 style="font-size: 18px; font-weight: 700; margin: 4px 0;">${day.title}</h3>
            <p style="color: var(--text-muted); font-size: 13px;">${day.description}</p>
          </div>
          <span class="xp-badge" style="background: rgba(129, 140, 248, 0.15); color: var(--secondary);">
            🏆 ${day.badge}
          </span>
        </div>
        <div class="grid-4" style="margin-top: 14px;">
          <button class="btn btn-outline" style="font-size: 12px; padding: 8px;" onclick="App.startSession(${day.day}, 'm1_concept')">Morning 1: Concept</button>
          <button class="btn btn-outline" style="font-size: 12px; padding: 8px;" onclick="App.startSession(${day.day}, 'm2_code')">Morning 2: Code Lab</button>
          <button class="btn btn-outline" style="font-size: 12px; padding: 8px;" onclick="App.startSession(${day.day}, 'e1_flashcards')">Evening 1: Recall</button>
          <button class="btn btn-outline" style="font-size: 12px; padding: 8px;" onclick="App.startSession(${day.day}, 'e2_project')">Evening 2: Project</button>
        </div>
      `;
      road.appendChild(card);
    });
  },

  renderCodeBreakdown(breakdownList) {
    if (!breakdownList || breakdownList.length === 0) return '';
    
    let html = `
      <div class="breakdown-card">
        <div class="breakdown-title">🔍 Line-by-Line Code Breakdown & Anatomy</div>
    `;
    
    breakdownList.forEach(item => {
      html += `
        <div class="breakdown-item">
          <div>
            <div class="breakdown-code">${item.part}</div>
            <div class="breakdown-role">${item.role}</div>
          </div>
          <div class="breakdown-text">${item.explanation}</div>
        </div>
      `;
    });
    
    html += `</div>`;
    return html;
  },

  renderVideoAndVisualizer(dayNum, sessionKey) {
    const videoTopics = {
      1: { query: "Python Variables and Data Types Beginner Tutorial", defaultId: "kqtD5dpn9C8" },
      2: { query: "Python if else conditionals tutorial", defaultId: "f4KOjWS_KZs" },
      3: { query: "Python for loops while loops tutorial", defaultId: "6iF8Xb7Z3wQ" },
      4: { query: "Python Dictionaries and Lists Data Structures", defaultId: "daefaLgNkw0" },
      5: { query: "Python Functions tutorial", defaultId: "u-OmVr_fT4s" },
      6: { query: "Python Slicing and Matrix Operations", defaultId: "ajrtHA84SmY" },
      7: { query: "Python Object Oriented Programming Classes OOP", defaultId: "JeznW_7DlB0" },
      8: { query: "Python File Handling and JSON tutorial", defaultId: "bznJPt4tb_4" },
      9: { query: "Python Decorators and Generators tutorial", defaultId: "FsAPt_9Bf3U" },
      10: { query: "Building AI Agents with Python", defaultId: "9bZkp7q19f0" }
    };

    const topic = videoTopics[dayNum] || { query: "Python Programming Tutorial", defaultId: "kqtD5dpn9C8" };

    return `
      <div class="visual-container">
        <div class="visual-header">
          <span>🎬 Video Illustration & Concept Visualizer</span>
          <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(topic.query)}" target="_blank" style="color:var(--primary); font-size:11px; text-decoration:none;">
            Search More on YouTube ↗
          </a>
        </div>
        <div class="video-frame-wrapper">
          <iframe 
            src="https://www.youtube.com/embed/${topic.defaultId}?rel=0" 
            title="Video Lesson" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
        
        <!-- Live Clickable Interactive Memory Visualizer Graphic -->
        <div class="memory-visualizer">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">
              ⚡ Memory & Execution State Visualizer (Click any card to inspect)
            </div>
          </div>
          <div class="memory-box-grid">
            <div class="memory-box active" onclick="App.inspectMemory('stack')">
              <span class="memory-box-badge">Click 🔍</span>
              <div class="memory-label">Call Stack</div>
              <div class="memory-value" id="vis-stack-val">main()</div>
              <div class="memory-type">Frame: Active</div>
            </div>
            <div class="memory-box" onclick="App.inspectMemory('heap')">
              <span class="memory-box-badge">Click 🔍</span>
              <div class="memory-label">Heap Memory</div>
              <div class="memory-value" id="vis-heap-val">Variables (0)</div>
              <div class="memory-type">Type: Allocated</div>
            </div>
            <div class="memory-box" onclick="App.inspectMemory('gc')">
              <span class="memory-box-badge">Click 🔍</span>
              <div class="memory-label">Garbage Collector</div>
              <div class="memory-value">Ref Count: OK</div>
              <div class="memory-type">Auto-Managed</div>
            </div>
          </div>

          <!-- Dynamic Inspection Drawer -->
          <div id="memory-inspector-box" class="memory-inspector-details" style="display: none;"></div>
        </div>
      </div>
    `;
  },

  inspectMemory(tab) {
    const box = document.getElementById('memory-inspector-box');
    if (!box) return;

    box.style.display = 'block';
    
    if (tab === 'stack') {
      box.innerHTML = `
        <div class="inspector-title">
          <span>📚 Call Stack Frame Inspector</span>
          <button class="btn btn-outline" style="font-size:10px; padding:2px 6px;" onclick="document.getElementById('memory-inspector-box').style.display='none'">✕ Close</button>
        </div>
        <p style="font-size:12px; color:#cbd5e1; line-height:1.5; margin-bottom:8px;">
          The <strong>Call Stack</strong> manages execution order. When your script runs, Python places a master frame for <code>__main__</code> at the top of the stack to keep track of local scope and line counters.
        </p>
        <div class="live-variable-row">
          <span class="live-var-name">Frame: __main__</span>
          <span class="live-var-type">Active Execution</span>
        </div>
      `;
    } else if (tab === 'heap') {
      const vars = this.state.liveVariables;
      const varKeys = Object.keys(vars);

      let varListHtml = '';
      if (varKeys.length > 0) {
        varListHtml = varKeys.map(k => {
          const v = vars[k];
          const vType = typeof v === 'number' ? 'int/float' : 'str';
          return `
            <div class="live-variable-row">
              <span class="live-var-name">${k}</span>
              <span class="live-var-val">${JSON.stringify(v)}</span>
              <span class="live-var-type">${vType} (0x${Math.floor(Math.random() * 899999 + 100000).toString(16)})</span>
            </div>
          `;
        }).join('');
      } else {
        varListHtml = `
          <div style="font-size:12px; color:#94a3b8; padding:8px 0;">
            No user variables allocated in heap yet. Click <strong>Run</strong> in the Code Studio to watch variables populate here live!
          </div>
        `;
      }

      box.innerHTML = `
        <div class="inspector-title">
          <span>📦 Heap Memory Object Allocation (${varKeys.length} Variables)</span>
          <button class="btn btn-outline" style="font-size:10px; padding:2px 6px;" onclick="document.getElementById('memory-inspector-box').style.display='none'">✕ Close</button>
        </div>
        <p style="font-size:12px; color:#cbd5e1; line-height:1.5; margin-bottom:8px;">
          In Python, variables do not hold the raw data directly; they hold <em>pointers (memory addresses)</em> to object boxes allocated in the <strong>Heap</strong>.
        </p>
        ${varListHtml}
      `;
    } else if (tab === 'gc') {
      box.innerHTML = `
        <div class="inspector-title">
          <span>♻️ Python Automatic Garbage Collection (GC)</span>
          <button class="btn btn-outline" style="font-size:10px; padding:2px 6px;" onclick="document.getElementById('memory-inspector-box').style.display='none'">✕ Close</button>
        </div>
        <p style="font-size:12px; color:#cbd5e1; line-height:1.5;">
          Python uses <strong>Reference Counting</strong> and a cyclic garbage collector. Every time you create or point a variable to data in RAM, its reference count increases (+1). When variable scope ends, reference count drops to 0 and Python automatically frees that RAM immediately!
        </p>
        <div class="live-variable-row" style="margin-top:8px;">
          <span class="live-var-name">GC Status: Healthy</span>
          <span class="live-var-type">Memory Leaks: 0</span>
        </div>
      `;
    }
  },

  async requestAICodeReview() {
    const code = this.getCode();
    const container = document.getElementById('ai-review-container');
    container.style.display = 'block';
    container.innerHTML = `
      <div class="ai-review-card">
        <div class="ai-review-header">
          <div class="ai-review-title">✨ Level ${this.state.stats.level || 1} AI Code Mentor</div>
          <span style="font-size:11px; color:var(--text-dim);">Analyzing...</span>
        </div>
        <div style="font-size:13px; color:var(--text-muted); padding:10px 0;">Inspecting your code for errors and beginner-friendly improvements...</div>
      </div>
    `;

    try {
      let analysis;
      const userLevel = this.state.stats.level || 1;
      if (window.pywebview && window.pywebview.api) {
        analysis = await window.pywebview.api.review_code_with_ai(code, userLevel, this.state.currentDay);
      } else {
        analysis = {
          status: "success",
          summary: "✨ Great job! Your code is 100% syntactically correct.",
          issues: [],
          senior_refactor: "name = input('what is your name? ')\nage = input('how old are you? ')\nprint(f'Your name is {name}')\nprint(f'You are {age} years old.')",
          refactor_reasons: ["Replaced messy + string joining with clean f-strings (f'Hello {name}')."]
        };
      }

      let issuesHtml = '';
      if (analysis.issues && analysis.issues.length > 0) {
        issuesHtml = `
          <div class="ai-review-section">
            <div class="ai-section-heading">🔍 Issues Detected</div>
            ${analysis.issues.map(iss => `
              <div class="ai-issue-item">
                <strong>${iss.title || iss.type}</strong>
                <p style="margin-top:2px;">${iss.detail}</p>
                <div style="color:var(--primary); font-size:11px; margin-top:4px;"><strong>Fix:</strong> ${iss.fix}</div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        issuesHtml = `
          <div class="ai-review-section">
            <div class="ai-section-heading" style="color:var(--success);">✅ Zero Syntax or Runtime Bugs</div>
            <div style="font-size:12px; color:var(--text-dim);">Your code parsed cleanly without errors!</div>
          </div>
        `;
      }

      let reasonsHtml = '';
      if (analysis.refactor_reasons && analysis.refactor_reasons.length > 0) {
        reasonsHtml = `
          <div style="margin-top: 10px;">
            <strong style="font-size:12px; color:var(--secondary);">💡 Why this improved version is easier to read:</strong>
            <ul style="padding-left:18px; margin-top:4px; font-size:12px; color:var(--text-muted);">
              ${analysis.refactor_reasons.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="ai-review-card">
          <div class="ai-review-header">
            <div class="ai-review-title">✨ Level ${userLevel} AI Code Mentor</div>
            <button class="btn btn-outline" style="font-size:11px; padding:2px 8px;" onclick="document.getElementById('ai-review-container').style.display='none'">Dismiss</button>
          </div>
          
          <div style="font-size:13px; color:var(--text-main); margin-bottom:12px;">
            ${analysis.summary}
          </div>

          ${issuesHtml}

          <div class="ai-review-section">
            <div class="ai-section-heading">🚀 Clean Level ${userLevel} Code</div>
            <div class="ai-senior-code">${analysis.senior_refactor.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <button class="btn btn-outline" style="font-size:11px; padding:4px 10px; margin-top:8px;" onclick="App.applySeniorRefactor(\`${encodeURIComponent(analysis.senior_refactor)}\`)">
              📥 Copy to Editor
            </button>
            ${reasonsHtml}
          </div>

          <!-- Interactive AI Chatbox -->
          <div class="ai-chat-section">
            <div class="ai-section-heading">💬 Ask AI Tutor a Question About This Code</div>
            <div class="ai-chat-messages" id="ai-chat-messages-box">
              <div class="ai-chat-bubble ai">
                👋 Have questions about this code or f-strings? Ask me anything (e.g. <em>"Why use f-strings?"</em>, <em>"What does int() do?"</em>)!
              </div>
            </div>
            <div class="ai-chat-input-row">
              <input type="text" class="ai-chat-input" id="ai-user-chat-input" placeholder="Type question here (e.g. why use int() or f-strings?)..." autocomplete="off">
              <button class="btn btn-primary" id="btn-send-ai-question" style="font-size:12px; padding:6px 14px;" onclick="App.sendQuestionToAITutor()">
                Ask ↵
              </button>
            </div>
          </div>
        </div>
      `;

      const chatInputEl = document.getElementById('ai-user-chat-input');
      if (chatInputEl) {
        chatInputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.sendQuestionToAITutor();
          }
        });
      }
    } catch (e) {
      container.innerHTML = `
        <div class="ai-review-card">
          <div style="color:var(--accent); font-size:13px;">Error communicating with AI Mentor: ${e.toString()}</div>
        </div>
      `;
    }
  },

  applySeniorRefactor(encodedCode) {
    const code = decodeURIComponent(encodedCode);
    this.setCode(code);
    document.getElementById('ai-review-container').style.display = 'none';
    this.autoSaveCurrentCode();
  },

  async sendQuestionToAITutor() {
    const inputEl = document.getElementById('ai-user-chat-input');
    const msgBox = document.getElementById('ai-chat-messages-box');
    const question = inputEl.value.trim();
    if (!question) return;

    inputEl.value = '';

    msgBox.innerHTML += `
      <div class="ai-chat-bubble user">
        ${question.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
      <div class="ai-chat-bubble ai" id="ai-loading-bubble">
        Thinking... ⚡
      </div>
    `;
    msgBox.scrollTop = msgBox.scrollHeight;

    const currentCode = this.getCode();
    const userLevel = this.state.stats.level || 1;

    try {
      let reply;
      if (window.pywebview && window.pywebview.api) {
        reply = await window.pywebview.api.ask_ai_tutor(question, currentCode, userLevel, this.state.currentDay);
      } else {
        reply = "An f-string lets you put variables directly inside `{}` instead of using plus signs!";
      }

      const loadBubble = document.getElementById('ai-loading-bubble');
      if (loadBubble) {
        loadBubble.innerHTML = reply.replace(/\n/g, '<br>');
        loadBubble.removeAttribute('id');
      }
      msgBox.scrollTop = msgBox.scrollHeight;
    } catch (e) {
      const loadBubble = document.getElementById('ai-loading-bubble');
      if (loadBubble) {
        loadBubble.innerText = "Error: " + e.toString();
        loadBubble.removeAttribute('id');
      }
    }
  },

  // ----------------------------------------------------------------
  // TRUE REAL-TIME INTERACTIVE TERMINAL EXECUTION & MEMORY TRACKING
  // ----------------------------------------------------------------

  startInteractiveCodeRun() {
    const code = this.getCode();
    const term = document.getElementById('terminal-output');
    const promptContainer = document.getElementById('terminal-prompt-container');
    const promptLabel = document.getElementById('terminal-prompt-label');
    const termInput = document.getElementById('terminal-interactive-input');
    const timeLabel = document.getElementById('execution-time-label');

    this.state.currentCodeToRun = code;
    this.state.pendingInputs = [];
    this.state.activeInputIdx = 0;
    this.state.liveVariables = {};

    // Extract static variable assignments for Heap inspector (e.g. x = 10, name = "Alex")
    const assignRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:input\s*\((.*?)\)|["'](.*?)["']|([0-9.]+))/g;
    let aMatch;
    while ((aMatch = assignRegex.exec(code)) !== null) {
      const varName = aMatch[1];
      if (aMatch[3] !== undefined) {
        this.state.liveVariables[varName] = aMatch[3];
      } else if (aMatch[4] !== undefined) {
        this.state.liveVariables[varName] = Number(aMatch[4]);
      }
    }

    // Detect all input() prompts in the code
    const inputMatches = [];
    const inputVarNames = [];
    const regex = /([a-zA-Z_][a-zA-Z0-9_]*\s*=\s*)?input\s*\(\s*(?:["'](.*?)["'])?\s*\)/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      const varName = match[1] ? match[1].replace('=', '').trim() : `var_${inputMatches.length + 1}`;
      const promptText = match[2] || "Enter input:";
      inputMatches.push(promptText);
      inputVarNames.push(varName);
    }

    this.state.inputVarNames = inputVarNames;

    if (inputMatches.length > 0) {
      this.state.inputPrompts = inputMatches;
      term.className = 'terminal-output';
      term.innerText = '⚡ Program running... Waiting for your input:';
      timeLabel.innerText = 'Waiting for input...';
      
      this.promptNextInput();
    } else {
      promptContainer.style.display = 'none';
      this.executeFinalPythonRun([]);
    }
  },

  promptNextInput() {
    const term = document.getElementById('terminal-output');
    const promptContainer = document.getElementById('terminal-prompt-container');
    const promptLabel = document.getElementById('terminal-prompt-label');
    const termInput = document.getElementById('terminal-interactive-input');

    if (this.state.activeInputIdx < this.state.inputPrompts.length) {
      const promptMsg = this.state.inputPrompts[this.state.activeInputIdx];
      
      term.innerText += `\n${promptMsg} `;
      term.scrollTop = term.scrollHeight;

      promptLabel.innerText = `> Input [${this.state.activeInputIdx + 1}/${this.state.inputPrompts.length}]:`;
      termInput.placeholder = `Type response for "${promptMsg.trim()}" and press Enter...`;
      promptContainer.style.display = 'flex';
      termInput.focus();
    } else {
      promptContainer.style.display = 'none';
      this.executeFinalPythonRun(this.state.pendingInputs);
    }
  },

  submitTerminalInput(val) {
    const term = document.getElementById('terminal-output');
    const cleanVal = val || '';
    
    term.innerText += `${cleanVal}`;
    this.state.pendingInputs.push(cleanVal);
    
    // Store in live variables heap inspector
    if (this.state.inputVarNames && this.state.inputVarNames[this.state.activeInputIdx]) {
      const vName = this.state.inputVarNames[this.state.activeInputIdx];
      this.state.liveVariables[vName] = cleanVal;
    }

    this.state.activeInputIdx++;
    this.promptNextInput();
  },

  async executeFinalPythonRun(userInputsArray) {
    const term = document.getElementById('terminal-output');
    const timeLabel = document.getElementById('execution-time-label');
    const stdinPayload = userInputsArray.join('\n');

    timeLabel.innerText = 'Executing...';

    try {
      let res;
      if (window.pywebview && window.pywebview.api) {
        res = await window.pywebview.api.execute_python_code(this.state.currentCodeToRun, stdinPayload);
      } else {
        res = { success: true, stdout: 'what is your name?\nYour name is ' + (userInputsArray[0] || 'User') + '\nhow old are you?\nYour are ' + (userInputsArray[1] || '20'), stderr: '', execution_time: 0.03 };
      }

      timeLabel.innerText = `Finished in ${res.execution_time}s`;

      if (res.stderr) {
        term.className = 'terminal-output error';
        term.innerText = res.stderr + (res.stdout ? '\n' + res.stdout : '');
      } else {
        term.className = 'terminal-output';
        term.innerText = res.stdout || 'Program executed successfully with no stdout output.';
      }
      term.scrollTop = term.scrollHeight;

      // Update Heap count badge on visualizer card
      const heapCount = Object.keys(this.state.liveVariables).length;
      const heapValEl = document.getElementById('vis-heap-val');
      if (heapValEl) {
        heapValEl.innerText = `Variables (${heapCount})`;
      }

    } catch (e) {
      term.className = 'terminal-output error';
      term.innerText = 'Execution error: ' + e.toString();
      timeLabel.innerText = 'Failed';
    }
  },

  async startSession(dayNum, sessionKey) {
    this.state.currentDay = dayNum;
    this.state.currentSessionKey = sessionKey;

    const aiBox = document.getElementById('ai-review-container');
    if (aiBox) aiBox.style.display = 'none';

    const promptBox = document.getElementById('terminal-prompt-container');
    if (promptBox) promptBox.style.display = 'none';

    const day = this.state.curriculum.find(d => d.day === dayNum);
    if (!day) return;
    const sess = day.sessions[sessionKey];
    if (!sess) return;

    if (sess.type === 'flashcards') {
      this.switchView('flashcards');
      this.state.currentCardIdx = 0;
      this.renderFlashcards();
    } else {
      this.switchView('studio');
      document.getElementById('editor-session-title').innerText = `${day.title} — ${sess.title}`;
      
      // Load saved draft code if previously typed, otherwise default to starter_code
      let loadedCode = "";
      if (window.pywebview && window.pywebview.api && window.pywebview.api.load_draft) {
        loadedCode = await window.pywebview.api.load_draft(dayNum, sessionKey);
      }
      
      let initialCode = loadedCode || sess.starter_code || '# Write your Python code here\nprint("Hello World!")';
      this.setCode(initialCode);
      
      let instText = '';
      if (sess.type === 'concept') {
        instText = sess.sections ? sess.sections.map(s => {
          let sectionHtml = `<strong>${s.heading || ''}</strong><br>${s.analogy || ''}<br><p style="margin-top:6px;">${s.content || ''}</p>`;
          if (s.code_breakdown) {
            sectionHtml += this.renderCodeBreakdown(s.code_breakdown);
          }
          return sectionHtml;
        }).join('<hr style="border:0; border-top:1px solid rgba(255,255,255,0.08); margin:12px 0;">') : '';
      } else {
        instText = `<strong>${sess.instruction || ''}</strong><br><span style="color:var(--text-dim)">${sess.goal || ''}</span>`;
        if (sess.code_breakdown) {
          instText += this.renderCodeBreakdown(sess.code_breakdown);
        }
      }

      instText += this.renderVideoAndVisualizer(dayNum, sessionKey);

      document.getElementById('editor-instructions').innerHTML = instText;

      const hintsEl = document.getElementById('hints-accordion');
      if (sess.hints && sess.hints.length > 0) {
        hintsEl.innerHTML = `<strong>💡 Hints:</strong><ul style="padding-left: 16px; margin-top: 4px;">${sess.hints.map(h => `<li>${h}</li>`).join('')}</ul>`;
      } else {
        hintsEl.innerHTML = '';
      }

      document.getElementById('btn-complete-session').style.display = 'block';
    }
  },

  async completeCurrentSession() {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    try {
      if (window.pywebview && window.pywebview.api) {
        await window.pywebview.api.submit_lesson(this.state.currentDay, this.state.currentSessionKey, 100, document.getElementById('main-code-editor').value);
        this.state.stats = await window.pywebview.api.get_stats();
        this.state.progress = await window.pywebview.api.get_progress_data();
      }
      this.updateStatsUI();
      this.renderDashboard();
    } catch (e) {
      console.error(e);
    }
  },

  renderFlashcards() {
    const cards = this.state.flashcards;
    if (!cards || cards.length === 0) {
      document.getElementById('card-question').innerText = "🎉 All caught up! No due flashcards for today.";
      document.getElementById('card-answer').style.display = 'none';
      document.getElementById('flashcard-rating-buttons').style.display = 'none';
      document.getElementById('card-flip-prompt').style.display = 'none';
      return;
    }

    const card = cards[this.state.currentCardIdx % cards.length];
    document.getElementById('card-deck-name').innerText = card.deck || "Python Fundamentals";
    document.getElementById('card-counter').innerText = `Card ${(this.state.currentCardIdx % cards.length) + 1} / ${cards.length}`;
    document.getElementById('card-question').innerText = card.question;

    let ansHtml = card.answer.replace(/\n/g, '<br>');
    if (card.code_snippet) {
      ansHtml += `<pre style="background:#090d16; padding:10px; border-radius:6px; margin-top:10px; font-family:monospace; color:#38bdf8; font-size:12px;">${card.code_snippet}</pre>`;
    }
    document.getElementById('card-answer').innerHTML = ansHtml;
    document.getElementById('card-answer').classList.remove('revealed');
    document.getElementById('flashcard-rating-buttons').style.display = 'none';
    document.getElementById('card-flip-prompt').style.display = 'block';
  },

  flipCard() {
    const ans = document.getElementById('card-answer');
    ans.classList.toggle('revealed');
    document.getElementById('flashcard-rating-buttons').style.display = ans.classList.contains('revealed') ? 'grid' : 'none';
    document.getElementById('card-flip-prompt').style.display = ans.classList.contains('revealed') ? 'none' : 'block';
  },

  async rateCurrentCard(grade) {
    const cards = this.state.flashcards;
    if (!cards || cards.length === 0) return;
    const card = cards[this.state.currentCardIdx % cards.length];

    if (window.pywebview && window.pywebview.api) {
      await window.pywebview.api.rate_flashcard(card.id, grade);
      this.state.stats = await window.pywebview.api.get_stats();
      this.updateStatsUI();
    }

    this.state.currentCardIdx++;
    this.renderFlashcards();
  },

  toggleTimer() {
    if (this.state.isTimerRunning) {
      clearInterval(this.state.timerInterval);
      this.state.isTimerRunning = false;
      document.getElementById('session-timer-btn').style.borderColor = 'var(--border-glass)';
      this.persistSessionState();
    } else {
      this.state.isTimerRunning = true;
      document.getElementById('session-timer-btn').style.borderColor = 'var(--primary)';
      this.state.timerInterval = setInterval(() => {
        if (this.state.timerSeconds > 0) {
          this.state.timerSeconds--;
          const m = Math.floor(this.state.timerSeconds / 60);
          const s = this.state.timerSeconds % 60;
          document.getElementById('session-timer-display').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          
          if (this.state.timerSeconds % 10 === 0) {
            this.persistSessionState();
          }
        } else {
          clearInterval(this.state.timerInterval);
          this.state.isTimerRunning = false;
          this.state.timerSeconds = 1800;
          this.persistSessionState();
          confetti();
          alert("⏰ 30-minute session complete! Great focus session!");
        }
      }, 1000);
    }
  },

  loadMockData() {
    this.state.stats = { xp: 50, streak_count: 1, level: 2, completed_sessions_count: 2 };
    this.updateStatsUI();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
