/**
 * Command Registry and Processor for Linux Terminal Simulator
 * Implements standard POSIX/GNU coreutils with pipe and redirection support.
 */
class CommandEngine {
  constructor(fs, terminal) {
    this.fs = fs;
    this.terminal = terminal;
    this.env = {
      USER: 'usuario',
      HOME: '/home/usuario',
      SHELL: '/bin/bash',
      TERM: 'xterm-256color',
      HOSTNAME: 'arch-simulator',
      PATH: '/usr/local/bin:/usr/bin:/bin:/home/usuario/.local/bin'
    };
    this.previousDir = '/home/usuario';
    this.runningProcesses = [
      { pid: 1, user: 'root', cpu: '0.0', mem: '0.4', time: '0:03', cmd: '/sbin/init splash' },
      { pid: 210, user: 'root', cpu: '0.0', mem: '0.1', time: '0:00', cmd: 'systemd-journald' },
      { pid: 450, user: 'root', cpu: '0.0', mem: '0.2', time: '0:01', cmd: 'NetworkManager' },
      { pid: 720, user: 'root', cpu: '0.0', mem: '0.1', time: '0:00', cmd: '/usr/sbin/sshd -D' },
      { pid: 1042, user: 'usuario', cpu: '0.1', mem: '1.2', time: '0:05', cmd: '/bin/bash' },
      { pid: 1204, user: 'usuario', cpu: '0.2', mem: '2.5', time: '0:02', cmd: 'node servidor.js' }
    ];
  }

  /**
   * Parse and execute command line string, handling pipes and redirection.
   */
  async execute(inputLine) {
    inputLine = inputLine.trim();
    if (!inputLine) return '';

    // Handle Redirection: > and >>
    let redirectionType = null;
    let redirectTarget = null;

    if (inputLine.includes('>>')) {
      const parts = inputLine.split('>>');
      inputLine = parts[0].trim();
      redirectTarget = parts[1].trim();
      redirectionType = 'append';
    } else if (inputLine.includes('>')) {
      const parts = inputLine.split('>');
      inputLine = parts[0].trim();
      redirectTarget = parts[1].trim();
      redirectionType = 'overwrite';
    }

    // Handle Pipes: cmd1 | cmd2 | cmd3
    const pipeline = inputLine.split('|').map(s => s.trim()).filter(Boolean);
    let pipeInput = '';

    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i];
      const { cmdName, args } = this.parseArgs(stage);
      
      const cmdFunc = this.commands[cmdName];
      if (!cmdFunc) {
        return `<span class="term-error">bash: comando no encontrado: ${this.escapeHtml(cmdName)}</span>\nEscribe <span class="term-cyan">help</span> para ver la lista de comandos disponibles.`;
      }

      try {
        pipeInput = await cmdFunc.call(this, args, pipeInput);
      } catch (err) {
        return `<span class="term-error">${this.escapeHtml(err.message)}</span>`;
      }
    }

    // Apply output redirection if requested
    if (redirectionType && redirectTarget) {
      const cleanTarget = this.cleanArg(redirectTarget);
      const targetPath = this.fs.resolvePath(this.terminal.cwd, cleanTarget);
      // Strip HTML tags when saving raw file content
      const rawText = this.stripHtml(pipeInput);
      try {
        if (redirectionType === 'overwrite') {
          this.fs.createFile(targetPath, rawText);
        } else {
          this.fs.appendFile(targetPath, rawText);
        }
        return ''; // Redirection suppresses stdout in standard Unix
      } catch (e) {
        return `<span class="term-error">bash: ${this.escapeHtml(cleanTarget)}: ${e.message}</span>`;
      }
    }

    return pipeInput;
  }

  parseArgs(commandStr) {
    // Regex aware of single and double quotes
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const tokens = [];
    let match;
    while ((match = regex.exec(commandStr)) !== null) {
      if (match[1] !== undefined) {
        tokens.push(match[1]);
      } else if (match[2] !== undefined) {
        tokens.push(match[2]);
      } else {
        tokens.push(match[0]);
      }
    }

    if (tokens.length === 0) return { cmdName: '', args: [] };
    const cmdName = tokens[0].toLowerCase();
    const args = tokens.slice(1);
    return { cmdName, args };
  }

  cleanArg(arg) {
    if (!arg) return '';
    return arg.replace(/^['"]|['"]$/g, '');
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  formatDate(d) {
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, ' ');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month} ${day} ${hours}:${mins}`;
  }

  // Registry of Linux commands
  commands = {
    pwd: async function(args) {
      return this.terminal.cwd;
    },

    clear: async function() {
      this.terminal.clear();
      return '';
    },

    whoami: async function() {
      return this.env.USER;
    },

    id: async function() {
      return `uid=1000(${this.env.USER}) gid=1000(${this.env.USER}) groups=1000(${this.env.USER}),4(adm),24(cdrom),27(sudo),100(users)`;
    },

    hostname: async function() {
      return this.env.HOSTNAME;
    },

    uname: async function(args) {
      if (args.includes('-a')) {
        return `Linux ${this.env.HOSTNAME} 6.8.9-arch1-1 #1 SMP PREEMPT_DYNAMIC Wed, 08 May 2026 12:44:21 +0000 x86_64 GNU/Linux`;
      }
      if (args.includes('-r')) return '6.8.9-arch1-1';
      return 'Linux';
    },

    date: async function() {
      const now = new Date();
      return now.toUTCString();
    },

    uptime: async function() {
      return ` 21:08:42 up 3 days,  4:12,  1 user,  load average: 0.14, 0.08, 0.05`;
    },

    echo: async function(args, pipeInput) {
      let text = args.join(' ');
      // Expand environment variables
      text = text.replace(/\$([A-Z_]+)/g, (_, varName) => {
        if (varName === 'PWD') return this.terminal.cwd;
        return this.env[varName] || '';
      });
      return this.escapeHtml(text);
    },

    cd: async function(args) {
      const target = args[0] ? args[0].trim() : '~';
      
      if (target === '-') {
        // Switch to previous dir
        const tmp = this.terminal.cwd;
        this.terminal.setCwd(this.previousDir);
        this.previousDir = tmp;
        return this.terminal.cwd;
      }

      const newPath = this.fs.resolvePath(this.terminal.cwd, target);
      const node = this.fs.getNode(newPath);

      if (!node) {
        throw new Error(`cd: ${target}: No existe el fichero o el directorio`);
      }
      if (node.type !== 'dir') {
        throw new Error(`cd: ${target}: No es un directorio`);
      }

      this.previousDir = this.terminal.cwd;
      this.terminal.setCwd(newPath);
      return '';
    },

    ls: async function(args) {
      const flags = {
        all: false,
        long: false,
        human: false,
        one: false
      };

      const paths = [];

      for (const arg of args) {
        if (arg.startsWith('-')) {
          if (arg.includes('a')) flags.all = true;
          if (arg.includes('l')) flags.long = true;
          if (arg.includes('h')) flags.human = true;
          if (arg.includes('1')) flags.one = true;
        } else {
          paths.push(arg);
        }
      }

      const targetPath = paths.length > 0
        ? this.fs.resolvePath(this.terminal.cwd, paths[0])
        : this.terminal.cwd;

      const node = this.fs.getNode(targetPath);
      if (!node) {
        throw new Error(`ls: no se puede acceder a '${paths[0]}': No existe el fichero o el directorio`);
      }

      let entries = [];
      if (node.type === 'file') {
        entries = [node];
      } else {
        entries = Object.values(node.children || {});
        if (flags.all) {
          // Add . and .. virtual pointers
          entries.unshift(
            { name: '.', type: 'dir', permissions: 'rwxr-xr-x', owner: node.owner, group: node.group, size: 4096, mtime: node.mtime },
            { name: '..', type: 'dir', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 4096, mtime: node.mtime }
          );
        } else {
          entries = entries.filter(e => !e.name.startsWith('.'));
        }
      }

      entries.sort((a, b) => a.name.localeCompare(b.name));

      const formatSize = (bytes) => {
        if (!flags.human) return String(bytes).padStart(6, ' ');
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
        return (bytes / (1024 * 1024)).toFixed(1) + 'M';
      };

      const getStyledName = (entry) => {
        if (entry.type === 'dir') {
          return `<span class="term-dir">${this.escapeHtml(entry.name)}/</span>`;
        }
        if (entry.permissions && entry.permissions.includes('x')) {
          return `<span class="term-exec">${this.escapeHtml(entry.name)}*</span>`;
        }
        if (entry.name.endsWith('.tar.gz') || entry.name.endsWith('.zip')) {
          return `<span class="term-archive">${this.escapeHtml(entry.name)}</span>`;
        }
        return `<span class="term-file">${this.escapeHtml(entry.name)}</span>`;
      };

      if (flags.long) {
        let output = `total ${entries.length * 4}\n`;
        const lines = entries.map(e => {
          const typeChar = e.type === 'dir' ? 'd' : '-';
          const perms = `${typeChar}${e.permissions || 'rw-r--r--'}`;
          const links = e.type === 'dir' ? '2' : '1';
          const owner = (e.owner || 'usuario').padEnd(8, ' ');
          const group = (e.group || 'usuario').padEnd(8, ' ');
          const size = formatSize(e.size || 4096);
          const dateStr = this.formatDate(e.mtime ? new Date(e.mtime) : new Date());
          const name = getStyledName(e);
          return `${perms} ${links} ${owner} ${group} ${size} ${dateStr} ${name}`;
        });
        return output + lines.join('\n');
      }

      if (flags.one) {
        return entries.map(e => getStyledName(e)).join('\n');
      }

      // Compact grid view
      return entries.map(e => getStyledName(e)).join('   ');
    },

    mkdir: async function(args) {
      if (args.length === 0) {
        throw new Error('mkdir: falta un operando\nPrueba \'mkdir --help\' para más información.');
      }

      let recursive = false;
      const dirs = [];

      for (const arg of args) {
        if (arg === '-p' || arg === '--parents') {
          recursive = true;
        } else if (!arg.startsWith('-')) {
          dirs.push(arg);
        }
      }

      for (const d of dirs) {
        const fullPath = this.fs.resolvePath(this.terminal.cwd, d);
        this.fs.createDirectory(fullPath, recursive);
      }
      return '';
    },

    touch: async function(args) {
      if (args.length === 0) {
        throw new Error('touch: falta el operando de archivo');
      }

      for (const file of args) {
        if (file.startsWith('-')) continue;
        const fullPath = this.fs.resolvePath(this.terminal.cwd, file);
        if (this.fs.exists(fullPath)) {
          const node = this.fs.getNode(fullPath);
          node.mtime = new Date();
          this.fs.notifyChange({ type: 'touch', path: fullPath });
        } else {
          this.fs.createFile(fullPath, '');
        }
      }
      return '';
    },

    rm: async function(args) {
      if (args.length === 0) {
        throw new Error('rm: falta un operando');
      }

      let recursive = false;
      let force = false;
      const targets = [];

      for (const arg of args) {
        if (arg.startsWith('-')) {
          if (arg.includes('r') || arg.includes('R')) recursive = true;
          if (arg.includes('f')) force = true;
        } else {
          targets.push(arg);
        }
      }

      for (const t of targets) {
        const fullPath = this.fs.resolvePath(this.terminal.cwd, t);
        try {
          this.fs.remove(fullPath, recursive);
        } catch (e) {
          if (!force) throw e;
        }
      }
      return '';
    },

    cp: async function(args) {
      let recursive = false;
      const paths = [];

      for (const arg of args) {
        if (arg === '-r' || arg === '-R' || arg === '--recursive') {
          recursive = true;
        } else if (!arg.startsWith('-')) {
          paths.push(arg);
        }
      }

      if (paths.length < 2) {
        throw new Error('cp: falta el operando de archivo de destino después de \'' + (paths[0] || '') + '\'');
      }

      const src = this.fs.resolvePath(this.terminal.cwd, paths[0]);
      const dest = this.fs.resolvePath(this.terminal.cwd, paths[1]);

      this.fs.copy(src, dest, recursive);
      return '';
    },

    mv: async function(args) {
      const paths = args.filter(a => !a.startsWith('-'));
      if (paths.length < 2) {
        throw new Error('mv: falta el operando de destino');
      }

      const src = this.fs.resolvePath(this.terminal.cwd, paths[0]);
      const dest = this.fs.resolvePath(this.terminal.cwd, paths[1]);

      this.fs.move(src, dest);
      return '';
    },

    cat: async function(args, pipeInput) {
      let showLineNumbers = false;
      const files = [];

      for (const arg of args) {
        if (arg === '-n' || arg === '--number') {
          showLineNumbers = true;
        } else if (!arg.startsWith('-')) {
          files.push(arg);
        }
      }

      let content = '';
      if (files.length === 0) {
        if (pipeInput) {
          content = pipeInput;
        } else {
          return '';
        }
      } else {
        const parts = [];
        for (const f of files) {
          const path = this.fs.resolvePath(this.terminal.cwd, f);
          parts.push(this.fs.readFile(path));
        }
        content = parts.join('\n');
      }

      if (showLineNumbers) {
        const lines = content.split('\n');
        return lines.map((l, idx) => `<span class="term-dim">${String(idx + 1).padStart(6, ' ')}  </span>${this.escapeHtml(l)}`).join('\n');
      }

      return this.escapeHtml(content);
    },

    head: async function(args, pipeInput) {
      let count = 10;
      let targetFile = null;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n' && args[i + 1]) {
          count = parseInt(args[i + 1], 10) || 10;
          i++;
        } else if (args[i].startsWith('-') && /^\d+$/.test(args[i].slice(1))) {
          count = parseInt(args[i].slice(1), 10);
        } else if (!args[i].startsWith('-')) {
          targetFile = args[i];
        }
      }

      let text = '';
      if (targetFile) {
        text = this.fs.readFile(this.fs.resolvePath(this.terminal.cwd, targetFile));
      } else {
        text = pipeInput;
      }

      const lines = text.split('\n').slice(0, count);
      return this.escapeHtml(lines.join('\n'));
    },

    tail: async function(args, pipeInput) {
      let count = 10;
      let targetFile = null;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n' && args[i + 1]) {
          count = parseInt(args[i + 1], 10) || 10;
          i++;
        } else if (args[i].startsWith('-') && /^\d+$/.test(args[i].slice(1))) {
          count = parseInt(args[i].slice(1), 10);
        } else if (!args[i].startsWith('-')) {
          targetFile = args[i];
        }
      }

      let text = '';
      if (targetFile) {
        text = this.fs.readFile(this.fs.resolvePath(this.terminal.cwd, targetFile));
      } else {
        text = pipeInput;
      }

      const lines = text.split('\n');
      const start = Math.max(0, lines.length - count);
      return this.escapeHtml(lines.slice(start).join('\n'));
    },

    grep: async function(args, pipeInput) {
      let caseInsensitive = false;
      let invertMatch = false;
      let lineNumbers = false;
      const patterns = [];
      let targetFile = null;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('-')) {
          if (arg.includes('i')) caseInsensitive = true;
          if (arg.includes('v')) invertMatch = true;
          if (arg.includes('n')) lineNumbers = true;
        } else if (patterns.length === 0) {
          patterns.push(arg);
        } else {
          targetFile = arg;
        }
      }

      if (patterns.length === 0) {
        throw new Error('grep: falta el patrón de búsqueda');
      }

      let pattern = patterns[0];
      let sourceText = '';

      if (targetFile) {
        const fullPath = this.fs.resolvePath(this.terminal.cwd, targetFile);
        sourceText = this.fs.readFile(fullPath);
      } else {
        sourceText = this.stripHtml(pipeInput);
      }

      const lines = sourceText.split('\n');
      const regexFlags = caseInsensitive ? 'gi' : 'g';
      let regex;
      try {
        regex = new RegExp(pattern, regexFlags);
      } catch (e) {
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), regexFlags);
      }

      const matches = [];
      lines.forEach((line, idx) => {
        const hasMatch = regex.test(line);
        // Reset lastIndex for next line
        regex.lastIndex = 0;

        const passes = invertMatch ? !hasMatch : hasMatch;
        if (passes) {
          let formattedLine = this.escapeHtml(line);
          if (!invertMatch && hasMatch) {
            formattedLine = formattedLine.replace(regex, (m) => `<span class="term-match">${m}</span>`);
          }
          if (lineNumbers) {
            formattedLine = `<span class="term-green">${idx + 1}:</span>${formattedLine}`;
          }
          matches.push(formattedLine);
        }
      });

      return matches.join('\n');
    },

    wc: async function(args, pipeInput) {
      let countLines = false;
      let countWords = false;
      let countChars = false;
      let file = null;

      for (const a of args) {
        if (a === '-l') countLines = true;
        else if (a === '-w') countWords = true;
        else if (a === '-c' || a === '-m') countChars = true;
        else if (!a.startsWith('-')) file = a;
      }

      if (!countLines && !countWords && !countChars) {
        countLines = countWords = countChars = true;
      }

      let content = '';
      if (file) {
        content = this.fs.readFile(this.fs.resolvePath(this.terminal.cwd, file));
      } else {
        content = this.stripHtml(pipeInput);
      }

      const lines = content === '' ? 0 : content.split('\n').length;
      const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
      const chars = new TextEncoder().encode(content).length;

      const out = [];
      if (countLines) out.push(String(lines).padStart(4, ' '));
      if (countWords) out.push(String(words).padStart(4, ' '));
      if (countChars) out.push(String(chars).padStart(4, ' '));
      if (file) out.push(file);

      return out.join(' ');
    },

    sort: async function(args, pipeInput) {
      let reverse = args.includes('-r');
      let numeric = args.includes('-n');
      const file = args.find(a => !a.startsWith('-'));

      let content = '';
      if (file) {
        content = this.fs.readFile(this.fs.resolvePath(this.terminal.cwd, file));
      } else {
        content = this.stripHtml(pipeInput);
      }

      const lines = content.split('\n').filter(Boolean);
      lines.sort((a, b) => {
        if (numeric) {
          const na = parseFloat(a) || 0;
          const nb = parseFloat(b) || 0;
          return na - nb;
        }
        return a.localeCompare(b);
      });

      if (reverse) lines.reverse();
      return this.escapeHtml(lines.join('\n'));
    },

    chmod: async function(args) {
      if (args.length < 2) {
        throw new Error('chmod: falta un operando después del modo');
      }
      const mode = args[0];
      const target = args[1];
      const fullPath = this.fs.resolvePath(this.terminal.cwd, target);
      this.fs.chmod(fullPath, mode);
      return '';
    },

    df: async function(args) {
      return [
        '<span class="term-bold">S.ficheros     Tamaño  Usados  Disp   Uso%  Montado en</span>',
        '/dev/nvme0n1p2   468G    112G   332G    26%  /',
        'devtmpfs          7.8G       0   7.8G     0%  /dev',
        'tmpfs             7.8G    124M   7.7G     2%  /dev/shm',
        'tmpfs             7.8G     18M   7.8G     1%  /run',
        '/dev/nvme0n1p1   512M     84M   428M    17%  /boot/efi'
      ].join('\n');
    },

    free: async function(args) {
      return [
        '<span class="term-bold">               total        usado        libre    compartida  búf/caché   disponible</span>',
        'Mem:        16384Mi      4892Mi      7320Mi       284Mi      4172Mi     10950Mi',
        'Swap:        4096Mi         0Mi      4096Mi'
      ].join('\n');
    },

    ps: async function(args) {
      const isAux = args.includes('aux') || args.includes('-ef');
      if (isAux) {
        const header = '<span class="term-bold">USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND</span>';
        const rows = this.runningProcesses.map(p => {
          return `${p.user.padEnd(8, ' ')} ${String(p.pid).padStart(5, ' ')}  ${p.cpu}  ${p.mem}  34520  6140 ?        Ss   18:00   ${p.time} ${p.cmd}`;
        });
        return [header, ...rows].join('\n');
      }

      return [
        '<span class="term-bold">  PID TTY          TIME CMD</span>',
        ' 1042 pts/0    00:00:05 bash',
        ' 1410 pts/0    00:00:00 ps'
      ].join('\n');
    },

    kill: async function(args) {
      if (args.length === 0) {
        throw new Error('kill: uso: kill [-s señal | -señal] pid...');
      }
      const pidStr = args.find(a => !a.startsWith('-'));
      const pid = parseInt(pidStr, 10);
      const idx = this.runningProcesses.findIndex(p => p.pid === pid);
      if (idx === -1) {
        throw new Error(`kill: (${pidStr}) - No existe el proceso`);
      }
      const killed = this.runningProcesses.splice(idx, 1)[0];
      return `<span class="term-green">Proceso [${killed.pid}] (${killed.cmd}) terminado.</span>`;
    },

    top: async function() {
      return this.commands.htop.call(this);
    },

    htop: async function() {
      return [
        '<span class="term-cyan">1  </span>[||||||||||||||||                28.4%]   Tasks: 42, 122 thr; 1 running',
        '<span class="term-cyan">2  </span>[|||||||||                       15.2%]   Load average: 0.14 0.08 0.05',
        '<span class="term-magenta">Mem</span>[|||||||||||||||||||||    4.89G/16.0G]   Uptime: 3 days, 04:12:00',
        '<span class="term-yellow">Swp</span>[                             0K/4.00G]',
        '',
        '<span class="term-inverse">  PID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command         </span>',
        ' 1204 usuario    20   0  524M  142M 42100 S  2.4  0.9  0:02.14 node servidor.js',
        ' 1042 usuario    20   0 18.2M  6140  3890 S  0.2  0.1  0:05.81 /bin/bash',
        '  720 root       20   0 15.4M  4120  3200 S  0.0  0.0  0:00.32 /usr/sbin/sshd',
        '    1 root       20   0  168M  9820  6540 S  0.0  0.1  0:03.11 /sbin/init splash',
        '',
        '<span class="term-dim">Presiona q o Ctrl+C para salir (modo snapshot para emulador web).</span>'
      ].join('\n');
    },

    tree: async function(args) {
      const target = args.find(a => !a.startsWith('-')) || '.';
      const fullPath = this.fs.resolvePath(this.terminal.cwd, target);
      const rootNode = this.fs.getNode(fullPath);

      if (!rootNode) {
        throw new Error(`tree: '${target}': No such file or directory`);
      }
      if (rootNode.type !== 'dir') {
        return target;
      }

      let dirCount = 0;
      let fileCount = 0;
      const lines = [`<span class="term-dir">${target}</span>`];

      const traverse = (node, prefix) => {
        const entries = Object.values(node.children || {})
          .filter(e => !e.name.startsWith('.'))
          .sort((a, b) => a.name.localeCompare(b.name));

        entries.forEach((child, index) => {
          const isLast = index === entries.length - 1;
          const connector = isLast ? '└── ' : '├── ';
          const nextPrefix = prefix + (isLast ? '    ' : '│   ');

          if (child.type === 'dir') {
            dirCount++;
            lines.push(`${prefix}${connector}<span class="term-dir">${this.escapeHtml(child.name)}</span>`);
            traverse(child, nextPrefix);
          } else {
            fileCount++;
            const isExec = child.permissions && child.permissions.includes('x');
            const styledName = isExec 
              ? `<span class="term-exec">${this.escapeHtml(child.name)}*</span>`
              : `<span class="term-file">${this.escapeHtml(child.name)}</span>`;
            lines.push(`${prefix}${connector}${styledName}`);
          }
        });
      };

      traverse(rootNode, '');
      lines.push(`\n<span class="term-dim">${dirCount} directorios, ${fileCount} archivos</span>`);
      return lines.join('\n');
    },

    find: async function(args) {
      const targetDir = args[0] && !args[0].startsWith('-') ? args[0] : '.';
      const nameIndex = args.indexOf('-name');
      const pattern = nameIndex !== -1 ? args[nameIndex + 1] : null;

      const fullPath = this.fs.resolvePath(this.terminal.cwd, targetDir);
      const rootNode = this.fs.getNode(fullPath);
      if (!rootNode) throw new Error(`find: '${targetDir}': No such file or directory`);

      const results = [];
      const search = (node, currentPath) => {
        if (!pattern || node.name.includes(pattern.replace(/\*/g, ''))) {
          results.push(currentPath);
        }
        if (node.type === 'dir' && node.children) {
          for (const child of Object.values(node.children)) {
            const childPath = currentPath === '/' ? `/${child.name}` : `${currentPath}/${child.name}`;
            search(child, childPath);
          }
        }
      };

      search(rootNode, targetDir);
      return this.escapeHtml(results.join('\n'));
    },

    history: async function() {
      const hist = this.terminal.history;
      return hist.map((cmd, idx) => `<span class="term-dim">${String(idx + 1).padStart(5, ' ')}  </span>${this.escapeHtml(cmd)}`).join('\n');
    },

    neofetch: async function() {
      const logo = [
        '<span class="term-cyan">       /\\         </span>',
        '<span class="term-cyan">      /  \\        </span>',
        '<span class="term-cyan">     /\\   \\       </span>',
        '<span class="term-cyan">    /      \\      </span>',
        '<span class="term-cyan">   /   ,,   \\     </span>',
        '<span class="term-cyan">  /   |  |  -\\    </span>',
        '<span class="term-cyan"> /_-´´    ´´-_\\   </span>'
      ];

      const info = [
        `<span class="term-bold term-cyan">usuario</span><span class="term-bold">@</span><span class="term-bold term-cyan">arch-simulator</span>`,
        `<span class="term-dim">-----------------------</span>`,
        `<span class="term-yellow">OS:</span> Arch Linux x86_64 (Interactive Web Edition)`,
        `<span class="term-yellow">Host:</span> Antigravity Hypervisor v2.5`,
        `<span class="term-yellow">Kernel:</span> 6.8.9-arch1-1-zen`,
        `<span class="term-yellow">Uptime:</span> 3 days, 4 hours, 12 mins`,
        `<span class="term-yellow">Packages:</span> 842 (pacman)`,
        `<span class="term-yellow">Shell:</span> bash 5.2.26`,
        `<span class="term-yellow">Terminal:</span> web-xterm-modern`,
        `<span class="term-yellow">CPU:</span> AMD Ryzen 9 7950X (32) @ 5.700GHz`,
        `<span class="term-yellow">Memory:</span> 4892MiB / 16384MiB`,
        ``,
        `<span class="term-color-blocks">` +
        `<span style="background:#282a36;color:#282a36">██</span>` +
        `<span style="background:#ff5555;color:#ff5555">██</span>` +
        `<span style="background:#50fa7b;color:#50fa7b">██</span>` +
        `<span style="background:#f1fa8c;color:#f1fa8c">██</span>` +
        `<span style="background:#bd93f9;color:#bd93f9">██</span>` +
        `<span style="background:#ff79c6;color:#ff79c6">██</span>` +
        `<span style="background:#8be9fd;color:#8be9fd">██</span>` +
        `<span style="background:#f8f8f2;color:#f8f8f2">██</span></span>`
      ];

      const lines = [];
      const maxRows = Math.max(logo.length, info.length);
      for (let i = 0; i < maxRows; i++) {
        const l = logo[i] || '                  ';
        const r = info[i] || '';
        lines.push(`${l}  ${r}`);
      }
      return lines.join('\n');
    },

    fastfetch: async function() {
      const logo = [
        '<span class="term-magenta">        /\\        </span>',
        '<span class="term-magenta">       /  \\       </span>',
        '<span class="term-magenta">      /\\   \\      </span>',
        '<span class="term-cyan">     /      \\     </span>',
        '<span class="term-cyan">    /   ,,   \\    </span>',
        '<span class="term-cyan">   /   |  |  -\\   </span>',
        '<span class="term-cyan">  /_-´´    ´´-_\\  </span>'
      ];

      const currentWp = (document.body.getAttribute('data-wallpaper') || 'nocturne');
      const info = [
        `<span class="term-bold term-magenta">usuario</span><span class="term-bold">@</span><span class="term-bold term-cyan">caelestia-arch</span>`,
        `<span class="term-dim">--------------------------------</span>`,
        `<span class="term-yellow">OS:</span> Arch Linux x86_64`,
        `<span class="term-yellow">Host:</span> Caelestia Rice Station v2.5`,
        `<span class="term-yellow">Kernel:</span> 6.8.9-arch1-1-zen`,
        `<span class="term-yellow">Uptime:</span> 3 days, 4 hours, 12 mins`,
        `<span class="term-yellow">Packages:</span> 914 (pacman)`,
        `<span class="term-yellow">Shell:</span> bash 5.2.26`,
        `<span class="term-yellow">WM:</span> Hyprland (Wayland)`,
        `<span class="term-yellow">DE:</span> Caelestia Shell (Quickshell)`,
        `<span class="term-yellow">Theme:</span> Caelestia ${currentWp.charAt(0).toUpperCase() + currentWp.slice(1)} [Material You MD3]`,
        `<span class="term-yellow">Icons:</span> Papirus-Caelestia-Dark`,
        `<span class="term-yellow">Terminal:</span> kitty 0.35.2`,
        `<span class="term-yellow">CPU:</span> AMD Ryzen 9 7950X (32) @ 5.70GHz`,
        `<span class="term-yellow">Memory:</span> 4.89GiB / 16.00GiB (30%)`,
        ``,
        `<span class="term-color-blocks">` +
        `<span style="background:#1e1e2e;color:#1e1e2e">██</span>` +
        `<span style="background:#f38ba8;color:#f38ba8">██</span>` +
        `<span style="background:#a6e3a1;color:#a6e3a1">██</span>` +
        `<span style="background:#f9e2af;color:#f9e2af">██</span>` +
        `<span style="background:#89b4fa;color:#89b4fa">██</span>` +
        `<span style="background:#cba6f7;color:#cba6f7">██</span>` +
        `<span style="background:#94e2d5;color:#94e2d5">██</span>` +
        `<span style="background:#cdd6f4;color:#cdd6f4">██</span></span>`
      ];

      const lines = [];
      const maxRows = Math.max(logo.length, info.length);
      for (let i = 0; i < maxRows; i++) {
        const l = logo[i] || '                  ';
        const r = info[i] || '';
        lines.push(`${l}  ${r}`);
      }
      return lines.join('\n');
    },

    caelestia: async function(args) {
      const sub = args[0] ? args[0].toLowerCase() : 'help';
      
      if (sub === 'wallpaper' || sub === 'wp') {
        const wp = args[1] ? args[1].toLowerCase() : 'next';
        if (window.switchCaelestiaWallpaper) {
          const current = window.switchCaelestiaWallpaper(wp);
          return `<span class="term-bold term-magenta">🌌 [Caelestia Shell]</span> Fondo cambiado a: <span class="term-cyan">${current.toUpperCase()}</span>`;
        }
        return 'Comando de fondo ejecutado.';
      }

      if (sub === 'info' || sub === 'specs') {
        return [
          '<span class="term-bold term-magenta">╭───────────────────────────────────────────────────╮</span>',
          '<span class="term-bold term-magenta">│</span> <span class="term-bold term-cyan">CAELESTIA DESKTOP ENVIRONMENT</span> — Arch Linux Rice    <span class="term-bold term-magenta">│</span>',
          '<span class="term-bold term-magenta">╰───────────────────────────────────────────────────╯</span>',
          '  <span class="term-yellow">• Compositor:</span>      Hyprland Wayland Compositor v0.41.2',
          '  <span class="term-yellow">• Shell & Bar:</span>     Caelestia Shell (Powered by Quickshell)',
          '  <span class="term-yellow">• Theme Engine:</span>    Material You 3 Dynamic Palette',
          '  <span class="term-yellow">• Active Theme:</span>    Caelestia Nocturne / Twilight',
          '  <span class="term-yellow">• Wallpapers:</span>      ~/fondos/ (caelestia-nocturne.jpg, caelestia-twilight.jpg)',
          '  <span class="term-yellow">• App Launcher:</span>    Rofi-Wayland / Walker M3 Theme',
          '  <span class="term-yellow">• Control Center:</span>  Quickshell Interactive System Drawer',
          '',
          '<span class="term-dim">Usa "caelestia wallpaper [nocturne|twilight]" para cambiar el fondo.</span>'
        ].join('\n');
      }

      if (sub === 'theme') {
        const theme = args[1];
        if (!theme) return 'Uso: caelestia theme [nocturne|twilight|tokyo|catppuccin|matrix|nord]';
        const themeMap = {
          'nocturne': 'caelestia-nocturne',
          'twilight': 'caelestia-twilight',
          'tokyo': 'tokyo',
          'catppuccin': 'catppuccin',
          'matrix': 'matrix',
          'nord': 'nord'
        };
        const targetTheme = themeMap[theme] || theme;
        if (window.setCaelestiaTheme) {
          window.setCaelestiaTheme(targetTheme);
          return `<span class="term-green">✔ Tema visual establecido en: ${targetTheme}</span>`;
        }
        return `Tema: ${targetTheme}`;
      }

      if (sub === 'shell' || sub === 'reload') {
        if (window.showCaelestiaNotification) {
          window.showCaelestiaNotification('Caelestia Shell', 'Daemon de Quickshell reiniciado con éxito', '🚀');
        }
        return '<span class="term-green">✔ Caelestia Shell daemon reiniciado (quickshell -d)</span>';
      }

      return [
        '<span class="term-bold term-magenta">Comando CLI Caelestia Desktop:</span>',
        '  <span class="term-green">caelestia wallpaper [nocturne|twilight|next]</span>  Cambia el fondo de pantalla',
        '  <span class="term-green">caelestia info</span>                                 Muestra información del entorno',
        '  <span class="term-green">caelestia theme [nombre]</span>                      Aplica una paleta Material 3',
        '  <span class="term-green">caelestia shell -d</span>                           Reinicia el daemon de Quickshell'
      ].join('\n');
    },

    hyprctl: async function(args) {
      const sub = args[0] ? args[0].toLowerCase() : 'workspaces';
      if (sub === 'workspaces') {
        return [
          'workspace ID 1 (1) on monitor DP-1: [kitty (terminal)]',
          'workspace ID 2 (2) on monitor DP-1: [kitty maximized]',
          'workspace ID 3 (3) on monitor DP-1: [thunar (file manager)]',
          'workspace ID 4 (4) on monitor DP-1: [missions & lab]',
          'workspace ID 5 (5) on monitor DP-1: [btop & caelestia settings]'
        ].join('\n');
      }
      if (sub === 'activewindow') {
        return [
          'Window 559b12e0 -> kitty (bash):',
          '  title: bash — usuario@arch-simulator',
          '  class: kitty',
          '  workspace: 1 (1)',
          '  floating: 0',
          '  fullscreen: 0',
          '  monitor: 0'
        ].join('\n');
      }
      if (sub === 'monitors') {
        return 'Monitor DP-1 (ID 0): 3840x2160@144.00Hz at 0x0 (active: true, focused: true)';
      }
      if (sub === 'dispatch') {
        const action = args[1];
        const val = args[2];
        if (action === 'workspace' && val && window.switchWorkspace) {
          window.switchWorkspace(parseInt(val, 10));
          return `Cambiando a espacio de trabajo ${val}`;
        }
      }
      return 'hyprctl: comando ejecutado. (Subcomandos: workspaces, activewindow, monitors, dispatch)';
    },

    rofi: async function() {
      if (window.openAppLauncher) {
        window.openAppLauncher();
        return '<span class="term-green">Lanzador Rofi / Caelestia abierto.</span>';
      }
      return 'Lanzador activado.';
    },

    launcher: async function() {
      return this.commands.rofi.call(this);
    },

    control: async function() {
      if (window.toggleControlCenter) {
        window.toggleControlCenter();
        return '<span class="term-green">Centro de Control alternado.</span>';
      }
      return 'Centro de Control.';
    },

    cowsay: async function(args, pipeInput) {
      let text = args.length > 0 ? args.join(' ') : (pipeInput || '¡Linux es el mejor sistema operativo!');
      text = this.stripHtml(text);
      const border = '-'.repeat(text.length + 2);
      return [
        ` ${border}`,
        `< ${this.escapeHtml(text)} >`,
        ` ${border}`,
        `        \\   ^__^`,
        `         \\  (oo)\\_______`,
        `            (__)\\       )\\/\\`,
        `                ||----w |`,
        `                ||     ||`
      ].join('\n');
    },

    sl: async function() {
      return [
        '<span class="term-magenta">      ====        ________                ___________ </span>',
        '<span class="term-magenta">  _D _|  |_______/        \\__I_I_____===__|_________| </span>',
        '<span class="term-magenta">   |(_)---  |   H\\________/ _____ |   | = |___ ___|   </span>',
        '<span class="term-magenta">   /     |  |   H  |  |     |   | |   | = |   |   |   </span>',
        '<span class="term-magenta">  |      |  |   H  |__--------------------|___|___|   </span>',
        '<span class="term-magenta">  | ________|___H__/__|_____/[][]~\\_______|__         </span>',
        '<span class="term-magenta">  |/ |   |_____I_____I_____I_____I_____I_____|___     </span>',
        '<span class="term-magenta">__(O)(O)___(_)__(_)___(_)__(_)___(_)__(_)___(_)__     </span>',
        '<span class="term-dim">¡Choo-choo! ¿Querías escribir \'ls\' en lugar de \'sl\'? ;)</span>'
      ].join('\n');
    },

    nano: async function(args) {
      const fileName = args[0];
      if (!fileName) {
        throw new Error('nano: especifica un archivo para editar');
      }
      const fullPath = this.fs.resolvePath(this.terminal.cwd, fileName);
      let content = '';
      if (this.fs.exists(fullPath)) {
        content = this.fs.readFile(fullPath);
      }
      // Open modal nano editor
      if (window.openNanoEditor) {
        window.openNanoEditor(fullPath, content);
        return `<span class="term-green">Editor nano abierto para: ${this.escapeHtml(fileName)}</span>`;
      }
      return '';
    },

    alias: async function(args) {
      if (args.length === 0) {
        return [
          'alias cls=\'clear\'',
          'alias l=\'ls -CF\'',
          'alias la=\'ls -A\'',
          'alias ll=\'ls -alF\''
        ].join('\n');
      }
      return '<span class="term-green">Alias guardado.</span>';
    },

    help: async function(args) {
      if (args[0]) {
        return this.commands.man.call(this, args);
      }

      return [
        '<span class="term-bold term-cyan">=== SIMULADOR DE COMANDOS LINUX (GNU/Bash) ===</span>',
        '<span class="term-dim">Escribe "man &lt;comando&gt;" para ver el manual detallado de cualquiera.</span>',
        '',
        '<span class="term-yellow">Navegación & Exploración:</span>',
        '  <span class="term-green">pwd</span>             Muestra la ruta del directorio de trabajo actual',
        '  <span class="term-green">ls</span> [-l -a -h]    Lista los archivos y directorios',
        '  <span class="term-green">cd</span> &lt;dir&gt;         Cambia el directorio de trabajo (ej: cd .., cd ~, cd -)',
        '  <span class="term-green">tree</span>            Muestra la estructura jerárquica en forma de árbol',
        '  <span class="term-green">find</span> &lt;dir&gt; -name  Busca archivos por patrón de nombre',
        '',
        '<span class="term-yellow">Gestión de Archivos & Carpetas:</span>',
        '  <span class="term-green">mkdir</span> [-p] &lt;dir&gt;  Crea uno o varios directorios',
        '  <span class="term-green">touch</span> &lt;file&gt;     Crea un archivo vacío o actualiza su fecha',
        '  <span class="term-green">rm</span> [-r -f] &lt;dest&gt; Elimina archivos o directorios de forma segura',
        '  <span class="term-green">cp</span> [-r] &lt;or&gt; &lt;des&gt; Copia archivos o directorios completos',
        '  <span class="term-green">mv</span> &lt;origen&gt; &lt;des&gt; Mueve o renombra archivos y directorios',
        '  <span class="term-green">nano</span> &lt;archivo&gt;   Abre el editor de texto interactivo integrado',
        '',
        '<span class="term-yellow">Lectura, Filtros & Pipes:</span>',
        '  <span class="term-green">cat</span> [-n] &lt;file&gt;   Visualiza el contenido completo de un archivo',
        '  <span class="term-green">head</span> [-n 5] &lt;f&gt;   Muestra las primeras N líneas',
        '  <span class="term-green">tail</span> [-n 5] &lt;f&gt;   Muestra las últimas N líneas',
        '  <span class="term-green">grep</span> [-i -n -v]   Filtra líneas que coincidan con un patrón',
        '  <span class="term-green">wc</span> [-l -w -c]     Cuenta líneas, palabras y bytes',
        '  <span class="term-green">sort</span> [-r -n]      Ordena líneas de texto alfabética o numéricamente',
        '  <span class="term-green">echo</span> &lt;texto&gt;     Imprime texto (admite redirección &gt; y &gt;&gt; y pipes |)',
        '',
        '<span class="term-yellow">Permisos & Procesos:</span>',
        '  <span class="term-green">chmod</span> &lt;modo&gt; &lt;f&gt;  Cambia permisos (ej: chmod 755 script.sh, chmod +x)',
        '  <span class="term-green">ps</span> [aux]          Lista los procesos activos en ejecución',
        '  <span class="term-green">htop / top</span>      Monitor dinámico de CPU, memoria y procesos',
        '  <span class="term-green">kill</span> &lt;PID&gt;        Finaliza un proceso por su ID numérico',
        '',
        '<span class="term-yellow">Sistema & Utilidades:</span>',
        '  <span class="term-green">neofetch</span>        Muestra el logo ASCII y resumen de hardware/software',
        '  <span class="term-green">whoami / id</span>     Muestra el usuario y grupos actuales',
        '  <span class="term-green">uname -a</span>        Información del kernel y arquitectura',
        '  <span class="term-green">df -h / free</span>    Uso de disco y memoria RAM disponible',
        '  <span class="term-green">history</span>         Historial de comandos ejecutados en la sesión',
        '  <span class="term-green">clear</span>           Limpia la pantalla de la terminal',
        '  <span class="term-green">cowsay / sl</span>     Curiosidades clásicas del mundo Linux'
      ].join('\n');
    },

    man: async function(args) {
      const cmd = args[0];
      if (!cmd) {
        throw new Error('¿Qué página de manual deseas? Ejemplo: man ls');
      }

      const manualPages = {
        ls: {
          name: 'ls - lista el contenido de directorios',
          synopsis: 'ls [OPCIÓN]... [ARCHIVO]...',
          desc: 'Lista información sobre los ARCHIVOS (del directorio actual por defecto). Ordena las entradas alfabéticamente si no se indica otra cosa.',
          options: [
            '-a, --all        no ignora las entradas que empiezan por . (muestra archivos ocultos)',
            '-l               utiliza el formato de listado largo (permisos, propietario, tamaño, fecha)',
            '-h, --human-readable  con -l, imprime tamaños en formato legible (p. ej., 1K 234M 2G)',
            '-1               muestra un solo archivo por línea'
          ],
          examples: [
            'ls -la           Muestra todo detallado incluyendo ocultos',
            'ls -lh documentos  Muestra el contenido de documentos legible'
          ]
        },
        cd: {
          name: 'cd - cambia el directorio de trabajo del shell',
          synopsis: 'cd [DIRECTORIO]',
          desc: 'Cambia el directorio de trabajo actual a DIRECTORIO. Si no se indica DIRECTORIO, se traslada al directorio home del usuario (~).',
          options: [
            '~                acceso directo a la carpeta personal (/home/usuario)',
            '..               directorio padre (subir un nivel)',
            '-                directorio de trabajo previo'
          ],
          examples: [
            'cd ..            Sube un nivel en la jerarquía',
            'cd ~/proyectos   Va directo a la carpeta proyectos',
            'cd -             Vuelve a la carpeta donde estabas antes'
          ]
        },
        chmod: {
          name: 'chmod - cambia los permisos de acceso a archivos',
          synopsis: 'chmod [OPCIÓN]... MODO[,MODO]... ARCHIVO...',
          desc: 'Modifica los permisos de cada ARCHIVO según el MODO especificado, ya sea en formato numérico octal (r=4, w=2, x=1) o simbólico (+x, -x).',
          options: [
            '755              rwxr-xr-x (lectura y ejecución para todos, escritura sólo dueño)',
            '644              rw-r--r-- (lectura para todos, escritura sólo dueño)',
            '777              rwxrwxrwx (control total para todos)',
            '+x               otorga permiso de ejecución a todos'
          ],
          examples: [
            'chmod +x script.sh    Hace ejecutable el script',
            'chmod 755 script.sh   Asigna permisos estándar de ejecución'
          ]
        },
        grep: {
          name: 'grep - imprime líneas que coinciden con un patrón',
          synopsis: 'grep [OPCIÓN]... PATRÓN [ARCHIVO]...',
          desc: 'Busca el PATRÓN en cada ARCHIVO o en la entrada estándar (pipes). Imprime cada línea coincidente.',
          options: [
            '-i, --ignore-case  ignora mayúsculas y minúsculas',
            '-v, --invert-match invierte el criterio para seleccionar líneas que NO coincidan',
            '-n, --line-number  antepone el número de línea de origen'
          ],
          examples: [
            'grep -i "error" /var/log/syslog',
            'cat notas.txt | grep chmod'
          ]
        },
        mkdir: {
          name: 'mkdir - crea directorios',
          synopsis: 'mkdir [OPCIÓN]... DIRECTORIO...',
          desc: 'Crea los DIRECTORIOS indicados si no existen todavía.',
          options: [
            '-p, --parents    crea los directorios padres si no existen sin dar error'
          ],
          examples: [
            'mkdir prueba',
            'mkdir -p proyectos/node/backend'
          ]
        },
        rm: {
          name: 'rm - borra archivos o directorios',
          synopsis: 'rm [OPCIÓN]... [ARCHIVO]...',
          desc: 'rm borra cada archivo especificado. Por defecto, no borra directorios a menos que se indique -r.',
          options: [
            '-r, -R, --recursive  elimina directorios y sus contenidos de forma recursiva',
            '-f, --force          ignora archivos y argumentos inexistentes, no pregunta'
          ],
          examples: [
            'rm archivo.txt',
            'rm -rf carpeta_antigua'
          ]
        }
      };

      const page = manualPages[cmd];
      if (!page) {
        return `<span class="term-yellow">No hay entrada de manual detallada para '${this.escapeHtml(cmd)}'.</span>\nUsa <span class="term-cyan">help</span> para ver la descripción breve y lista de comandos.`;
      }

      return [
        `<span class="term-bold term-cyan">${page.name.toUpperCase()}</span>`,
        '',
        `<span class="term-bold term-yellow">SINOPSIS:</span>`,
        `  ${this.escapeHtml(page.synopsis)}`,
        '',
        `<span class="term-bold term-yellow">DESCRIPCIÓN:</span>`,
        `  ${this.escapeHtml(page.desc)}`,
        '',
        `<span class="term-bold term-yellow">OPCIONES:</span>`,
        ...page.options.map(opt => `  ${this.escapeHtml(opt)}`),
        '',
        `<span class="term-bold term-yellow">EJEMPLOS PRÁCTICOS:</span>`,
        ...page.examples.map(ex => `  <span class="term-green">$ ${this.escapeHtml(ex)}</span>`)
      ].join('\n');
    }
  };
}

window.CommandEngine = CommandEngine;
