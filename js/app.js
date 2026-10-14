/**
 * Main Application Orchestrator
 * Connects Terminal, VFS, UI Explorer, Cheatsheet, Nano Editor, and Missions.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Core Systems
  const fs = new VirtualFileSystem();
  const terminal = new Terminal('terminalContainer', fs);
  const commandEngine = new CommandEngine(fs, terminal);
  const missionManager = new MissionManager(fs, terminal);

  terminal.commandEngine = commandEngine;
  terminal.missionManager = missionManager;

  // 2. DOM Elements
  const fileExplorerList = document.getElementById('fileExplorerList');
  const breadcrumbEl = document.getElementById('fsBreadcrumbs');
  const currentPathBadge = document.getElementById('currentPathBadge');
  const missionTitleEl = document.getElementById('missionTitle');
  const missionDescEl = document.getElementById('missionDesc');
  const missionInstructionEl = document.getElementById('missionInstruction');
  const missionXpEl = document.getElementById('missionXp');
  const missionProgressBar = document.getElementById('missionProgressBar');
  const missionStepBadge = document.getElementById('missionStepBadge');
  const allMissionsList = document.getElementById('allMissionsList');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const resetFsBtn = document.getElementById('resetFsBtn');
  const themeSelect = document.getElementById('themeSelect');
  const cheatsheetSearch = document.getElementById('cheatsheetSearch');
  const cheatsheetGrid = document.getElementById('cheatsheetGrid');

  // Nano Editor Elements
  const nanoModal = document.getElementById('nanoModal');
  const nanoFileName = document.getElementById('nanoFileName');
  const nanoContent = document.getElementById('nanoContent');
  const nanoSaveBtn = document.getElementById('nanoSaveBtn');
  const nanoCloseBtn = document.getElementById('nanoCloseBtn');
  let currentNanoPath = null;

  // 3. Nano Editor Handler
  window.openNanoEditor = (path, content) => {
    currentNanoPath = path;
    nanoFileName.textContent = path;
    nanoContent.value = content;
    nanoModal.classList.add('active');
    nanoContent.focus();
  };

  nanoSaveBtn.addEventListener('click', () => {
    if (currentNanoPath) {
      try {
        fs.createFile(currentNanoPath, nanoContent.value);
        terminal.print(`<span class="term-green">[ Guardado: ${currentNanoPath} ]</span>`);
        nanoModal.classList.remove('active');
      } catch (e) {
        alert(e.message);
      }
    }
  });

  nanoCloseBtn.addEventListener('click', () => {
    nanoModal.classList.remove('active');
  });

  nanoContent.addEventListener('keydown', (e) => {
    // Ctrl + S or Ctrl + O
    if (e.ctrlKey && (e.key === 's' || e.key === 'o')) {
      e.preventDefault();
      nanoSaveBtn.click();
    }
    // Ctrl + X
    if (e.ctrlKey && e.key === 'x') {
      e.preventDefault();
      nanoCloseBtn.click();
    }
  });

  // 4. File Explorer UI Rendering
  function renderFileExplorer() {
    const cwd = terminal.cwd;
    currentPathBadge.textContent = cwd;

    // Breadcrumbs
    const parts = cwd.split('/').filter(Boolean);
    let breadcrumbHtml = `<span class="crumb-link" data-path="/">/</span>`;
    let accum = '';
    parts.forEach((p, idx) => {
      accum += '/' + p;
      breadcrumbHtml += `<span class="crumb-sep">/</span><span class="crumb-link" data-path="${accum}">${p}</span>`;
    });
    breadcrumbEl.innerHTML = breadcrumbHtml;

    // Breadcrumb clicks
    breadcrumbEl.querySelectorAll('.crumb-link').forEach(link => {
      link.addEventListener('click', () => {
        const p = link.getAttribute('data-path');
        terminal.setCwd(p);
      });
    });

    // Content of current directory
    const node = fs.getNode(cwd);
    if (!node || node.type !== 'dir') {
      fileExplorerList.innerHTML = `<div class="empty-state">Directorio no encontrado</div>`;
      return;
    }

    const children = Object.values(node.children || {}).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    if (children.length === 0) {
      fileExplorerList.innerHTML = `<div class="empty-state">Carpeta vacía</div>`;
      return;
    }

    fileExplorerList.innerHTML = '';
    children.forEach(child => {
      const item = document.createElement('div');
      item.className = `explorer-item item-${child.type} ${child.name.startsWith('.') ? 'item-hidden' : ''}`;
      
      const icon = child.type === 'dir' 
        ? `<svg class="file-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`
        : `<svg class="file-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;

      item.innerHTML = `
        <div class="item-main">
          ${icon}
          <span class="item-name">${child.name}</span>
        </div>
        <div class="item-meta">
          <span class="item-perm">${child.permissions}</span>
          <span class="item-size">${child.size ? formatBytes(child.size) : '--'}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        if (child.type === 'dir') {
          const newPath = fs.resolvePath(cwd, child.name);
          terminal.setCwd(newPath);
        } else {
          // Preview file in terminal
          terminal.print(`<div class="term-info">Visualizando <b>${child.name}</b>:</div>`);
          terminal.print(`<pre class="term-preview">${fs.escapeHtml ? fs.escapeHtml(child.content || '') : child.content}</pre>`);
        }
      });

      fileExplorerList.appendChild(item);
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // 5. Connect VFS & Terminal changes to Explorer
  fs.subscribe(() => {
    renderFileExplorer();
  });

  terminal.onCwdChange(() => {
    renderFileExplorer();
  });

  // 6. Mission UI Handling
  function updateMissionUI() {
    const current = missionManager.getCurrentMission();
    const missions = missionManager.getAllMissions();
    const total = missions.length;
    const completedCount = missions.filter(m => m.completed).length;
    const progressPercent = Math.round((completedCount / total) * 100);

    missionXpEl.textContent = `${missionManager.xp} XP`;
    missionProgressBar.style.width = `${progressPercent}%`;

    if (current) {
      missionStepBadge.textContent = `Paso ${missionManager.activeMissionIndex + 1} de ${total}`;
      missionTitleEl.textContent = current.title;
      missionDescEl.textContent = current.desc;
      missionInstructionEl.innerHTML = current.instruction;
    } else {
      missionStepBadge.textContent = `¡Completado!`;
      missionTitleEl.textContent = `¡Felicidades, Maestro de Linux!`;
      missionDescEl.textContent = `Has completado todos los desafíos disponibles en este simulador.`;
      missionInstructionEl.innerHTML = `Ahora puedes explorar el modo libre o crear tus propios scripts con <code>nano</code>.`;
    }

    // Render list of all missions
    allMissionsList.innerHTML = '';
    missions.forEach((m, idx) => {
      const item = document.createElement('div');
      item.className = `mission-item-card ${m.completed ? 'completed' : ''} ${idx === missionManager.activeMissionIndex ? 'active' : ''}`;
      item.innerHTML = `
        <div class="mission-status-icon">
          ${m.completed ? '✓' : idx + 1}
        </div>
        <div class="mission-details">
          <div class="mission-item-title">${m.title}</div>
          <div class="mission-item-reward">+${m.xpReward} XP</div>
        </div>
      `;
      item.addEventListener('click', () => {
        missionManager.selectMission(idx);
      });
      allMissionsList.appendChild(item);
    });
  }

  missionManager.onMissionUpdate(() => {
    updateMissionUI();
  });

  // 7. Cheatsheet List Generation
  const cheatsheetData = [
    { cmd: 'pwd', desc: 'Muestra la ruta absoluta del directorio actual', ex: 'pwd' },
    { cmd: 'ls', desc: 'Lista los archivos y carpetas del directorio', ex: 'ls -la' },
    { cmd: 'cd', desc: 'Cambia el directorio de trabajo', ex: 'cd documentos' },
    { cmd: 'mkdir', desc: 'Crea una nueva carpeta o directorio', ex: 'mkdir prueba' },
    { cmd: 'touch', desc: 'Crea un archivo vacío o actualiza timestamp', ex: 'touch notas.txt' },
    { cmd: 'cat', desc: 'Muestra el contenido completo de un archivo', ex: 'cat bienvenida.txt' },
    { cmd: 'grep', desc: 'Busca patrones y texto dentro de archivos', ex: 'cat syslog | grep sshd' },
    { cmd: 'chmod', desc: 'Modifica permisos de acceso (lectura/escritura/ejecución)', ex: 'chmod +x script.sh' },
    { cmd: 'rm', desc: 'Elimina archivos o directorios de forma permanente', ex: 'rm archivo.txt' },
    { cmd: 'cp', desc: 'Copia archivos o carpetas completas', ex: 'cp archivo.txt copia.txt' },
    { cmd: 'mv', desc: 'Mueve o renombra archivos y directorios', ex: 'mv viejo.txt nuevo.txt' },
    { cmd: 'tree', desc: 'Visualiza la estructura de directorios en árbol', ex: 'tree' },
    { cmd: 'neofetch', desc: 'Información gráfica del sistema y hardware', ex: 'neofetch' },
    { cmd: 'df -h', desc: 'Comprueba el espacio libre en el disco duro', ex: 'df -h' },
    { cmd: 'ps aux', desc: 'Muestra los procesos en ejecución', ex: 'ps aux' },
    { cmd: 'nano', desc: 'Editor de texto interactivo en terminal', ex: 'nano notas.txt' },
    { cmd: 'clear', desc: 'Limpia la pantalla de la terminal', ex: 'clear' },
    { cmd: 'cowsay', desc: 'Divertida vaca parlante de consola', ex: 'cowsay ¡Hola Mundo!' }
  ];

  function renderCheatsheet(filter = '') {
    cheatsheetGrid.innerHTML = '';
    const filtered = cheatsheetData.filter(item => 
      item.cmd.toLowerCase().includes(filter.toLowerCase()) || 
      item.desc.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'cheatsheet-card';
      card.innerHTML = `
        <div class="cheat-header">
          <code class="cheat-cmd">${item.cmd}</code>
          <button class="cheat-run-btn" title="Ejecutar en la terminal">Probar ▸</button>
        </div>
        <div class="cheat-desc">${item.desc}</div>
        <div class="cheat-example">$ ${item.ex}</div>
      `;

      card.querySelector('.cheat-run-btn').addEventListener('click', () => {
        terminal.input.value = item.ex;
        terminal.input.focus();
        terminal.submitCommand();
      });

      cheatsheetGrid.appendChild(card);
    });
  }

  cheatsheetSearch.addEventListener('input', (e) => {
    renderCheatsheet(e.target.value);
  });

  // 8. Audio Toggle
  soundToggleBtn.addEventListener('click', () => {
    const isEnabled = window.terminalAudio ? window.terminalAudio.toggle() : false;
    soundToggleBtn.classList.toggle('active', isEnabled);
    soundToggleBtn.innerHTML = isEnabled 
      ? `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg> Sonido: ON`
      : `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> Sonido: OFF`;
  });

  // 9. Reset File System
  resetFsBtn.addEventListener('click', () => {
    if (confirm('¿Deseas restaurar el sistema de archivos a su estado original de fábrica?')) {
      fs.reset();
      terminal.setCwd('/home/usuario');
      terminal.print('<div class="term-green">✔ Sistema de archivos restaurado con éxito.</div>');
    }
  });

  // 10. Theme Selector
  themeSelect.addEventListener('change', (e) => {
    document.body.className = `theme-${e.target.value}`;
  });

  // 11. Live Clock & CPU in Top Bar
  const liveClockEl = document.getElementById('liveClock');
  const cpuPercentEl = document.getElementById('cpuPercent');
  function updateSystemMetrics() {
    const now = new Date();
    liveClockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Procedural CPU wave (realistic oscillation between 8% and 34%)
    const wave = Math.round(18 + Math.sin(Date.now() / 4000) * 10 + Math.random() * 5);
    cpuPercentEl.textContent = `${wave}%`;
  }
  setInterval(updateSystemMetrics, 1000);
  updateSystemMetrics();

  // 12. Tab Switcher between File Explorer, Missions, and Cheatsheet
  const tabBtns = document.querySelectorAll('.sidebar-tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // 13. Initial Welcome Output in Terminal
  terminal.print([
    '<div class="term-welcome-box">',
    '  <span class="welcome-title">🐧 SIMULADOR DE COMANDOS LINUX (INTERACTIVE LAB)</span>',
    '  <span class="welcome-subtitle">Entorno seguro y completo para aprender GNU/Linux en el navegador.</span>',
    '  <div class="welcome-tips">',
    '    • Escribe <span class="term-cyan">help</span> para ver el listado de comandos disponibles.',
    '    • Escribe <span class="term-cyan">neofetch</span> para ver la ficha del sistema.',
    '    • Usa la tecla <span class="term-yellow">Tab</span> para autocompletar comandos y rutas.',
    '    • Usa las flechas <span class="term-yellow">↑ / ↓</span> para navegar por el historial.',
    '    • ¡Sigue las <b>Misiones</b> en el panel derecho para ganar XP y desbloquear insignias!',
    '  </div>',
    '</div>'
  ].join('\n'));

  // Initial renders
  renderFileExplorer();
  updateMissionUI();
  renderCheatsheet();

  // Initial auto-focus terminal input
  setTimeout(() => terminal.input.focus(), 100);
});
