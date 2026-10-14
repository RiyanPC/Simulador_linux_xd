/**
 * Interactive Terminal Shell Interface
 * Manages the command line prompt, history, Tab completion, and screen buffer.
 */
class Terminal {
  constructor(containerId, fs) {
    this.container = document.getElementById(containerId);
    this.fs = fs;
    this.cwd = '/home/usuario';
    this.history = [];
    this.historyIndex = -1;
    this.commandEngine = null;
    this.missionManager = null;
    this.cwdListeners = [];

    this.initDOM();
    this.bindEvents();
  }

  setCwd(newPath) {
    this.cwd = newPath;
    this.updatePrompt();
    this.cwdListeners.forEach(cb => cb(this.cwd));
  }

  onCwdChange(callback) {
    this.cwdListeners.push(callback);
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="terminal-screen" id="termScreen">
        <div class="terminal-output" id="termOutput"></div>
        <div class="terminal-line" id="termInputLine">
          <span class="terminal-prompt" id="termPrompt"></span>
          <div class="terminal-input-wrapper">
            <input type="text" id="termInput" spellcheck="false" autocomplete="off" autofocus />
            <span class="terminal-suggestion" id="termSuggestion"></span>
          </div>
        </div>
      </div>
    `;

    this.screen = document.getElementById('termScreen');
    this.output = document.getElementById('termOutput');
    this.promptEl = document.getElementById('termPrompt');
    this.input = document.getElementById('termInput');
    this.suggestionEl = document.getElementById('termSuggestion');

    this.updatePrompt();
  }

  getShortCwd() {
    if (this.cwd === '/home/usuario') return '~';
    if (this.cwd.startsWith('/home/usuario/')) {
      return '~' + this.cwd.slice('/home/usuario'.length);
    }
    return this.cwd;
  }

  updatePrompt() {
    const shortPath = this.getShortCwd();
    this.promptEl.innerHTML = `
      <span class="prompt-user">usuario</span><span class="prompt-at">@</span><span class="prompt-host">arch</span>:<span class="prompt-path">${shortPath}</span><span class="prompt-symbol">$</span>
    `;
  }

  bindEvents() {
    // Keep focus inside terminal when clicking anywhere in the terminal container
    this.screen.addEventListener('click', () => {
      this.input.focus();
    });

    this.input.addEventListener('keydown', (e) => {
      if (window.terminalAudio) {
        window.terminalAudio.playKeyClick();
      }

      // Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        if (window.terminalAudio) {
          window.terminalAudio.playEnter();
        }
        this.submitCommand();
        return;
      }

      // Tab completion
      if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTabCompletion();
        return;
      }

      // History Up
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
        return;
      }

      // History Down
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
        return;
      }

      // Ctrl + L (Clear)
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.clear();
        return;
      }

      // Ctrl + C (Cancel current line)
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.print(`${this.promptEl.innerHTML} ${this.input.value}^C`);
        this.input.value = '';
        this.historyIndex = -1;
        this.scrollToBottom();
        return;
      }
    });

    // Real-time subtle ghost suggestion preview (fish-shell style)
    this.input.addEventListener('input', () => {
      this.updateSuggestion();
    });
  }

  updateSuggestion() {
    const val = this.input.value;
    if (!val) {
      this.suggestionEl.textContent = '';
      return;
    }

    const availableCommands = Object.keys(this.commandEngine ? this.commandEngine.commands : {});
    const match = availableCommands.find(c => c.startsWith(val) && c !== val);
    if (match) {
      this.suggestionEl.textContent = val + match.slice(val.length);
    } else {
      this.suggestionEl.textContent = '';
    }
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;

    if (direction === -1) { // Up
      if (this.historyIndex === -1) {
        this.historyIndex = this.history.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else if (direction === 1) { // Down
      if (this.historyIndex !== -1) {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
        } else {
          this.historyIndex = -1;
          this.input.value = '';
          this.updateSuggestion();
          return;
        }
      }
    }

    if (this.historyIndex !== -1 && this.history[this.historyIndex] !== undefined) {
      this.input.value = this.history[this.historyIndex];
      this.updateSuggestion();
    }
  }

  handleTabCompletion() {
    const val = this.input.value;
    if (!val) return;

    const parts = val.split(' ');
    const isFirstWord = parts.length === 1;
    const currentToken = parts[parts.length - 1];

    if (isFirstWord) {
      // Command completion
      const cmds = Object.keys(this.commandEngine.commands);
      const matches = cmds.filter(c => c.startsWith(currentToken));
      if (matches.length === 1) {
        this.input.value = matches[0] + ' ';
      } else if (matches.length > 1) {
        this.print(`${this.promptEl.innerHTML} ${val}`);
        this.print(matches.join('   '));
      }
    } else {
      // File / path completion
      let targetDir = this.cwd;
      let filePrefix = currentToken;

      if (currentToken.includes('/')) {
        const lastSlash = currentToken.lastIndexOf('/');
        const dirPart = currentToken.slice(0, lastSlash);
        filePrefix = currentToken.slice(lastSlash + 1);
        targetDir = this.fs.resolvePath(this.cwd, dirPart || '/');
      }

      const node = this.fs.getNode(targetDir);
      if (node && node.type === 'dir' && node.children) {
        const candidates = Object.values(node.children)
          .filter(c => c.name.startsWith(filePrefix))
          .map(c => c.name + (c.type === 'dir' ? '/' : ''));

        if (candidates.length === 1) {
          const completion = candidates[0];
          parts[parts.length - 1] = currentToken.slice(0, currentToken.length - filePrefix.length) + completion;
          this.input.value = parts.join(' ');
        } else if (candidates.length > 1) {
          this.print(`${this.promptEl.innerHTML} ${val}`);
          this.print(candidates.join('   '));
        }
      }
    }

    this.updateSuggestion();
    this.scrollToBottom();
  }

  async submitCommand() {
    const rawCommand = this.input.value;
    const trimmed = rawCommand.trim();

    // Print the executed line with full prompt
    const promptSnapshot = this.promptEl.innerHTML;
    this.print(`<div class="term-command-row">${promptSnapshot} <span class="term-executed-cmd">${this.escapeHtml(rawCommand)}</span></div>`);

    this.input.value = '';
    this.suggestionEl.textContent = '';

    if (trimmed) {
      this.history.push(trimmed);
      this.historyIndex = -1;

      if (this.commandEngine) {
        const result = await this.commandEngine.execute(trimmed);
        if (result) {
          this.print(result);
        }

        // Notify mission manager
        if (this.missionManager) {
          this.missionManager.onCommandExecuted(trimmed, result);
        }
      }
    }

    this.scrollToBottom();
  }

  print(content) {
    if (content === undefined || content === null) return;
    const entry = document.createElement('div');
    entry.className = 'term-entry';
    entry.innerHTML = content;
    this.output.appendChild(entry);
    this.scrollToBottom();
  }

  clear() {
    this.output.innerHTML = '';
  }

  scrollToBottom() {
    setTimeout(() => {
      this.screen.scrollTop = this.screen.scrollHeight;
    }, 10);
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

window.Terminal = Terminal;
