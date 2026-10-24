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
    { cmd: 'fastfetch', desc: 'Resumen visual del sistema Caelestia Arch Linux', ex: 'fastfetch' },
    { cmd: 'caelestia wp', desc: 'Cambia el fondo de pantalla (Nocturne / Twilight)', ex: 'caelestia wallpaper next' },
    { cmd: 'caelestia info', desc: 'Muestra información de Caelestia Shell y Hyprland', ex: 'caelestia info' },
    { cmd: 'hyprctl', desc: 'Controla el compositor Hyprland y workspaces', ex: 'hyprctl workspaces' },
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

  // =========================================================================
  // CAELESTIA DESKTOP ENVIRONMENT LOGIC & CONTROLS
  // =========================================================================

  // Elements
  const wallpaperContainer = document.getElementById('wallpaperContainer');
  const wallpaperNocturne = document.getElementById('wallpaperNocturne');
  const wallpaperTwilight = document.getElementById('wallpaperTwilight');
  const wallpaperToggleBtn = document.getElementById('wallpaperToggleBtn');
  const wallpaperName = document.getElementById('wallpaperName');
  const wpCardNocturne = document.getElementById('wpCardNocturne');
  const wpCardTwilight = document.getElementById('wpCardTwilight');

  const controlCenterPanel = document.getElementById('controlCenterPanel');
  const controlCenterToggleBtn = document.getElementById('controlCenterToggleBtn');
  const ccCloseBtn = document.getElementById('ccCloseBtn');
  const appLauncherModal = document.getElementById('appLauncherModal');
  const appLauncherBtn = document.getElementById('appLauncherBtn');
  const launcherSearch = document.getElementById('launcherSearch');
  const launcherGrid = document.getElementById('launcherGrid');
  const notificationsContainer = document.getElementById('notificationsContainer');
  const workspaceLayout = document.getElementById('workspaceLayout');
  const terminalWindow = document.getElementById('terminalWindow');

  // Media Elements
  const audioEq = document.getElementById('audioEq');
  const barPlayBtn = document.getElementById('barPlayBtn');
  const barMediaTitle = document.getElementById('barMediaTitle');
  const ccMediaPlayBtn = document.getElementById('ccMediaPlayBtn');
  const ccMediaPrevBtn = document.getElementById('ccMediaPrevBtn');
  const ccMediaNextBtn = document.getElementById('ccMediaNextBtn');
  const ccMediaTitle = document.getElementById('ccMediaTitle');
  const ccMediaArtist = document.getElementById('ccMediaArtist');
  const ccMediaProgress = document.getElementById('ccMediaProgress');

  // Window Controls
  const termMaximizeBtn = document.getElementById('termMaximizeBtn');
  const termMinimizeBtn = document.getElementById('termMinimizeBtn');
  const termCloseBtn = document.getElementById('termCloseBtn');

  // Control Center Toggles & Sliders
  const toggleWifiBtn = document.getElementById('toggleWifiBtn');
  const wifiStatusText = document.getElementById('wifiStatusText');
  const toggleBluetoothBtn = document.getElementById('toggleBluetoothBtn');
  const btStatusText = document.getElementById('btStatusText');
  const ccToggleSoundBtn = document.getElementById('ccToggleSoundBtn');
  const fxStatusText = document.getElementById('fxStatusText');
  const toggleGlowBtn = document.getElementById('toggleGlowBtn');
  const glowStatusText = document.getElementById('glowStatusText');
  const ccVolumeSlider = document.getElementById('ccVolumeSlider');
  const ccVolumeVal = document.getElementById('ccVolumeVal');
  const ccBrightnessSlider = document.getElementById('ccBrightnessSlider');
  const ccBrightnessVal = document.getElementById('ccBrightnessVal');

  // 1. Toast Notification Manager
  window.showCaelestiaNotification = (title, message, icon = '🌌') => {
    if (window.terminalAudio) {
      window.terminalAudio.playNotification();
    }
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div style="display:flex;flex-direction:column;">
        <span style="font-weight:700;font-size:0.8rem;color:var(--accent-cyan);">${title}</span>
        <span style="font-size:0.72rem;color:var(--text-secondary);">${message}</span>
      </div>
    `;
    notificationsContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  };

  // 2. Wallpaper Switcher Engine
  let currentWallpaper = localStorage.getItem('caelestia_wallpaper') || 'nocturne';

  window.switchCaelestiaWallpaper = (nameOrNext) => {
    let target = nameOrNext;
    if (!target || target === 'next' || target === 'toggle') {
      target = currentWallpaper === 'nocturne' ? 'twilight' : 'nocturne';
    }

    currentWallpaper = target === 'twilight' ? 'twilight' : 'nocturne';
    localStorage.setItem('caelestia_wallpaper', currentWallpaper);

    document.body.setAttribute('data-wallpaper', currentWallpaper);

    if (currentWallpaper === 'nocturne') {
      wallpaperNocturne.classList.add('active');
      wallpaperTwilight.classList.remove('active');
      wallpaperName.textContent = 'Nocturne';
      wpCardNocturne.classList.add('active');
      wpCardTwilight.classList.remove('active');
      // If using Caelestia themes, switch palette
      if (document.body.classList.contains('theme-caelestia-twilight') || document.body.classList.contains('theme-caelestia-nocturne')) {
        document.body.className = 'theme-caelestia-nocturne';
        themeSelect.value = 'caelestia-nocturne';
      }
    } else {
      wallpaperTwilight.classList.add('active');
      wallpaperNocturne.classList.remove('active');
      wallpaperName.textContent = 'Twilight';
      wpCardTwilight.classList.add('active');
      wpCardNocturne.classList.remove('active');
      if (document.body.classList.contains('theme-caelestia-nocturne') || document.body.classList.contains('theme-caelestia-twilight')) {
        document.body.className = 'theme-caelestia-twilight';
        themeSelect.value = 'caelestia-twilight';
      }
    }

    window.showCaelestiaNotification('Fondo de Pantalla', `Caelestia ${currentWallpaper.charAt(0).toUpperCase() + currentWallpaper.slice(1)} activo`, '🖼️');
    return currentWallpaper;
  };

  wallpaperToggleBtn.addEventListener('click', () => {
    window.switchCaelestiaWallpaper('next');
  });

  wpCardNocturne.addEventListener('click', () => {
    window.switchCaelestiaWallpaper('nocturne');
  });

  wpCardTwilight.addEventListener('click', () => {
    window.switchCaelestiaWallpaper('twilight');
  });

  // Apply initial wallpaper
  window.switchCaelestiaWallpaper(currentWallpaper);

  // 3. Caelestia Control Center Flyout
  window.toggleControlCenter = () => {
    const isActive = controlCenterPanel.classList.toggle('active');
    if (window.terminalAudio) window.terminalAudio.playWindowAction();
    if (isActive) {
      appLauncherModal.classList.remove('active');
    }
  };

  controlCenterToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.toggleControlCenter();
  });

  ccCloseBtn.addEventListener('click', () => {
    controlCenterPanel.classList.remove('active');
  });

  document.addEventListener('click', (e) => {
    if (controlCenterPanel.classList.contains('active') && 
        !controlCenterPanel.contains(e.target) && 
        !controlCenterToggleBtn.contains(e.target)) {
      controlCenterPanel.classList.remove('active');
    }
  });

  // 4. Caelestia App Launcher (Rofi / Walker)
  window.openAppLauncher = () => {
    appLauncherModal.classList.add('active');
    controlCenterPanel.classList.remove('active');
    if (window.terminalAudio) window.terminalAudio.playWindowAction();
    setTimeout(() => {
      launcherSearch.value = '';
      filterLauncher('');
      launcherSearch.focus();
    }, 60);
  };

  window.closeAppLauncher = () => {
    appLauncherModal.classList.remove('active');
  };

  appLauncherBtn.addEventListener('click', () => {
    if (appLauncherModal.classList.contains('active')) {
      window.closeAppLauncher();
    } else {
      window.openAppLauncher();
    }
  });

  appLauncherModal.addEventListener('click', (e) => {
    if (e.target === appLauncherModal) {
      window.closeAppLauncher();
    }
  });

  // Launcher Search Filtering
  function filterLauncher(query) {
    const items = launcherGrid.querySelectorAll('.launcher-item');
    const q = query.toLowerCase().trim();
    items.forEach(item => {
      const title = item.querySelector('.app-title').textContent.toLowerCase();
      const desc = item.querySelector('.app-desc').textContent.toLowerCase();
      if (!q || title.includes(q) || desc.includes(q)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  launcherSearch.addEventListener('input', (e) => {
    filterLauncher(e.target.value);
  });

  // Launcher Items Click Handlers
  launcherGrid.querySelectorAll('.launcher-item').forEach(item => {
    item.addEventListener('click', () => {
      const app = item.getAttribute('data-app');
      window.closeAppLauncher();

      if (app === 'terminal') {
        window.switchWorkspace(1);
        terminal.input.focus();
      } else if (app === 'explorer') {
        window.switchWorkspace(3);
      } else if (app === 'missions') {
        window.switchWorkspace(4);
      } else if (app === 'nano') {
        window.openNanoEditor('/home/usuario/documentos/notas.txt', fs.readFile('/home/usuario/documentos/notas.txt') || '');
      } else if (app === 'cheatsheet') {
        const btn = document.querySelector('[data-tab="tabCheatsheet"]');
        if (btn) btn.click();
      } else if (app === 'wallpapers') {
        window.switchCaelestiaWallpaper('next');
      } else if (app === 'control') {
        window.toggleControlCenter();
      } else if (app === 'fastfetch') {
        window.switchWorkspace(1);
        terminal.input.value = 'fastfetch';
        terminal.submitCommand();
      }
    });
  });

  // Global Keyboard Shortcuts (Alt + Space, ESC)
  document.addEventListener('keydown', (e) => {
    // Alt + Space opens App Launcher
    if (e.altKey && e.code === 'Space') {
      e.preventDefault();
      if (appLauncherModal.classList.contains('active')) {
        window.closeAppLauncher();
      } else {
        window.openAppLauncher();
      }
      return;
    }

    // Escape closes modals
    if (e.key === 'Escape') {
      if (appLauncherModal.classList.contains('active')) {
        window.closeAppLauncher();
      }
      if (controlCenterPanel.classList.contains('active')) {
        controlCenterPanel.classList.remove('active');
      }
    }
  });

  // 5. Hyprland Workspace Switcher Engine
  const wsButtons = document.querySelectorAll('.workspaces-pill .ws-btn');
  window.switchWorkspace = (num) => {
    wsButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-workspace'), 10) === num);
    });

    if (window.terminalAudio) {
      window.terminalAudio.playWorkspaceSwitch();
    }

    document.body.setAttribute('data-workspace', num);

    if (num === 1) {
      workspaceLayout.classList.remove('maximized');
      const btn = document.querySelector('[data-tab="tabExplorer"]');
      if (btn) btn.click();
      setTimeout(() => terminal.input.focus(), 50);
    } else if (num === 2) {
      workspaceLayout.classList.add('maximized');
      setTimeout(() => terminal.input.focus(), 50);
    } else if (num === 3) {
      workspaceLayout.classList.remove('maximized');
      const btn = document.querySelector('[data-tab="tabExplorer"]');
      if (btn) btn.click();
    } else if (num === 4) {
      workspaceLayout.classList.remove('maximized');
      const btn = document.querySelector('[data-tab="tabMissions"]');
      if (btn) btn.click();
    } else if (num === 5) {
      workspaceLayout.classList.remove('maximized');
      window.toggleControlCenter();
    }
  };

  wsButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const wsNum = parseInt(btn.getAttribute('data-workspace'), 10);
      window.switchWorkspace(wsNum);
    });
  });

  // Dock Buttons
  document.getElementById('dockTermBtn').addEventListener('click', () => window.switchWorkspace(1));
  document.getElementById('dockFilesBtn').addEventListener('click', () => window.switchWorkspace(3));
  document.getElementById('dockMissionsBtn').addEventListener('click', () => window.switchWorkspace(4));

  // Window Controls (Maximize / Minimize / Close)
  termMaximizeBtn.addEventListener('click', () => {
    workspaceLayout.classList.toggle('maximized');
    if (window.terminalAudio) window.terminalAudio.playWindowAction();
    window.showCaelestiaNotification('Hyprland Tiling', workspaceLayout.classList.contains('maximized') ? 'Terminal Maximizado' : 'Modo Dividido', '🪟');
  });

  termMinimizeBtn.addEventListener('click', () => {
    terminalWindow.style.transform = 'scale(0.96)';
    setTimeout(() => terminalWindow.style.transform = '', 200);
    if (window.terminalAudio) window.terminalAudio.playWindowAction();
  });

  termCloseBtn.addEventListener('click', () => {
    terminal.print('<span class="term-yellow">Para reiniciar la sesión usa "clear" o el botón de Reiniciar VFS.</span>');
  });

  // 6. Ambient Lo-Fi Media Player
  const playlist = [
    { title: '♪ Caelestia Ambient — Starlight Waves', artist: 'Arch Starlight Waves' },
    { title: '♪ Hyprland Horizon — Cyber Chill', artist: 'Wayland Soundscapes' },
    { title: '♪ Caelestia Lo-Fi — Nocturne Glow', artist: 'Quickshell Beats' }
  ];
  let currentTrackIdx = 0;
  let isMediaPlaying = false;
  let progressInterval = null;
  let progressVal = 35;

  function updateTrackDisplay() {
    const track = playlist[currentTrackIdx];
    barMediaTitle.textContent = track.title;
    ccMediaTitle.textContent = track.title.replace('♪ ', '');
    ccMediaArtist.textContent = track.artist;
  }

  function setPlaybackState(playing) {
    isMediaPlaying = playing;
    audioEq.classList.toggle('playing', playing);
    barPlayBtn.innerHTML = playing ? '⏸' : '<svg class="play-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
    ccMediaPlayBtn.textContent = playing ? '⏸' : '▶';

    if (playing) {
      if (!progressInterval) {
        progressInterval = setInterval(() => {
          progressVal = (progressVal + 1) % 100;
          ccMediaProgress.style.width = `${progressVal}%`;
        }, 1200);
      }
    } else {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    }
  }

  function toggleMusic() {
    const active = window.terminalAudio ? window.terminalAudio.toggleAmbientMusic() : false;
    setPlaybackState(active);
    if (active) {
      window.showCaelestiaNotification('Reproduciendo', playlist[currentTrackIdx].title, '🎵');
    }
  }

  barPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMusic();
  });

  document.getElementById('barMediaPlayer').addEventListener('click', () => {
    toggleMusic();
  });

  ccMediaPlayBtn.addEventListener('click', () => {
    toggleMusic();
  });

  ccMediaNextBtn.addEventListener('click', () => {
    currentTrackIdx = (currentTrackIdx + 1) % playlist.length;
    updateTrackDisplay();
    progressVal = 0;
    ccMediaProgress.style.width = '0%';
  });

  ccMediaPrevBtn.addEventListener('click', () => {
    currentTrackIdx = (currentTrackIdx - 1 + playlist.length) % playlist.length;
    updateTrackDisplay();
    progressVal = 0;
    ccMediaProgress.style.width = '0%';
  });

  // 7. Control Center Quick Toggles & Sliders
  toggleWifiBtn.addEventListener('click', () => {
    const isActive = toggleWifiBtn.classList.toggle('active');
    wifiStatusText.textContent = isActive ? 'Caelestia-5G' : 'Desconectado';
    window.showCaelestiaNotification('Wi-Fi', isActive ? 'Conectado a Caelestia-5G' : 'Wi-Fi desactivado', '📶');
  });

  toggleBluetoothBtn.addEventListener('click', () => {
    const isActive = toggleBluetoothBtn.classList.toggle('active');
    btStatusText.textContent = isActive ? 'Buds Pro' : 'Desconectado';
    window.showCaelestiaNotification('Bluetooth', isActive ? 'Conectado a Buds Pro' : 'Bluetooth apagado', '🎧');
  });

  function syncSoundUI(isEnabled) {
    soundToggleBtn.classList.toggle('active', isEnabled);
    ccToggleSoundBtn.classList.toggle('active', isEnabled);
    fxStatusText.textContent = isEnabled ? 'Activado' : 'Desactivado';
    soundToggleBtn.innerHTML = isEnabled 
      ? `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg> FX: ON`
      : `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> FX: OFF`;
  }

  soundToggleBtn.addEventListener('click', () => {
    const isEnabled = window.terminalAudio ? window.terminalAudio.toggle() : false;
    syncSoundUI(isEnabled);
  });

  ccToggleSoundBtn.addEventListener('click', () => {
    const isEnabled = window.terminalAudio ? window.terminalAudio.toggle() : false;
    syncSoundUI(isEnabled);
  });

  toggleGlowBtn.addEventListener('click', () => {
    const isActive = toggleGlowBtn.classList.toggle('active');
    glowStatusText.textContent = isActive ? 'Animado' : 'Estático';
    const termWin = document.getElementById('terminalWindow');
    if (termWin) {
      termWin.style.borderWidth = isActive ? '1.5px' : '1px';
    }
  });

  ccVolumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    ccVolumeVal.textContent = `${val}%`;
    if (window.terminalAudio) {
      window.terminalAudio.volume = (val / 100) * 0.5;
    }
  });

  ccBrightnessSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    ccBrightnessVal.textContent = `${val}%`;
    if (wallpaperContainer) {
      wallpaperContainer.style.filter = `brightness(${val / 100})`;
    }
  });

  // 8. Theme Switcher Sync
  window.setCaelestiaTheme = (themeName) => {
    document.body.className = `theme-${themeName}`;
    themeSelect.value = themeName;
    if (themeName === 'caelestia-twilight') {
      window.switchCaelestiaWallpaper('twilight');
    } else if (themeName === 'caelestia-nocturne') {
      window.switchCaelestiaWallpaper('nocturne');
    }
  };

  themeSelect.addEventListener('change', (e) => {
    window.setCaelestiaTheme(e.target.value);
  });

  // 9. Reset File System
  resetFsBtn.addEventListener('click', () => {
    if (confirm('¿Deseas restaurar el sistema de archivos a su estado original de fábrica?')) {
      fs.reset();
      terminal.setCwd('/home/usuario');
      terminal.print('<div class="term-green">✔ Sistema de archivos restaurado con éxito.</div>');
      window.showCaelestiaNotification('Sistema', 'VFS restaurado a configuración de fábrica', '🔄');
    }
  });

  // 10. Live Clock & CPU Wave
  const liveClockEl = document.getElementById('liveClock');
  const cpuPercentEl = document.getElementById('cpuPercent');
  const ccCpuVal = document.getElementById('ccCpuVal');
  function updateSystemMetrics() {
    const now = new Date();
    liveClockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const wave = Math.round(16 + Math.sin(Date.now() / 3500) * 8 + Math.random() * 4);
    cpuPercentEl.textContent = `${wave}%`;
    if (ccCpuVal) ccCpuVal.textContent = `${wave}%`;
  }
  setInterval(updateSystemMetrics, 1000);
  updateSystemMetrics();

  // 11. Tab Switcher
  const tabBtns = document.querySelectorAll('.sidebar-tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(targetTab);
      if (targetEl) targetEl.classList.add('active');
    });
  });

  // 12. Welcome Message in Terminal
  terminal.print([
    '<div class="term-welcome-box">',
    '  <span class="welcome-title">🌌 CAELESTIA DESKTOP ENVIRONMENT — ARCH LINUX</span>',
    '  <span class="welcome-subtitle">Laboratorio interactivo GNU/Linux con Hyprland & Quickshell Shell.</span>',
    '  <div class="welcome-tips">',
    '    • Escribe <span class="term-cyan">fastfetch</span> o <span class="term-cyan">neofetch</span> para ver la ficha del sistema.',
    '    • Escribe <span class="term-magenta">caelestia info</span> o <span class="term-magenta">caelestia wallpaper next</span> para cambiar de fondo.',
    '    • Usa <span class="term-yellow">Alt + Espacio</span> para abrir el Lanzador de Aplicaciones (Rofi / Walker).',
    '    • Haz clic en <b>Control</b> o en el logo de Caelestia en la barra superior para abrir el panel.',
    '    • ¡Explora los archivos de configuración en <span class="term-green">~/.config/hypr/hyprland.conf</span>!',
    '  </div>',
    '</div>'
  ].join('\n'));

  // Initial renders
  renderFileExplorer();
  updateMissionUI();
  renderCheatsheet();
  updateTrackDisplay();

  setTimeout(() => terminal.input.focus(), 100);
});
