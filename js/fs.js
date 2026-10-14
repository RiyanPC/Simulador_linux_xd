/**
 * Virtual File System (VFS) for Linux Terminal Simulator
 * Emulates a hierarchical Unix filesystem with permissions, metadata, and path resolution.
 */
class VirtualFileSystem {
  constructor() {
    this.listeners = [];
    this.root = this.getInitialState();
  }

  getInitialState() {
    return {
      name: '/',
      type: 'dir',
      permissions: 'rwxr-xr-x',
      owner: 'root',
      group: 'root',
      mtime: new Date('2026-09-01T12:00:00'),
      children: {
        'bin': {
          name: 'bin',
          type: 'dir',
          permissions: 'rwxr-xr-x',
          owner: 'root',
          group: 'root',
          mtime: new Date('2026-09-01T12:00:00'),
          children: {
            'bash': { name: 'bash', type: 'file', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 1183448, content: '[ELF 64-bit LSB executable, x86-64]' },
            'ls': { name: 'ls', type: 'file', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 142144, content: '[ELF 64-bit LSB executable]' },
            'cat': { name: 'cat', type: 'file', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 43440, content: '[ELF 64-bit LSB executable]' },
            'grep': { name: 'grep', type: 'file', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 154240, content: '[ELF 64-bit LSB executable]' },
            'mkdir': { name: 'mkdir', type: 'file', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 84320, content: '[ELF 64-bit LSB executable]' },
            'rm': { name: 'rm', type: 'file', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 72112, content: '[ELF 64-bit LSB executable]' },
            'nano': { name: 'nano', type: 'file', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 284100, content: '[ELF 64-bit LSB executable]' },
            'neofetch': { name: 'neofetch', type: 'file', permissions: 'rwxr-xr-x', owner: 'root', group: 'root', size: 104230, content: '#!/usr/bin/env bash\n# Neofetch CLI system info' }
          }
        },
        'etc': {
          name: 'etc',
          type: 'dir',
          permissions: 'rwxr-xr-x',
          owner: 'root',
          group: 'root',
          mtime: new Date('2026-09-05T08:30:00'),
          children: {
            'hostname': { name: 'hostname', type: 'file', permissions: 'rw-r--r--', owner: 'root', group: 'root', size: 14, content: 'arch-simulator\n' },
            'os-release': {
              name: 'os-release',
              type: 'file',
              permissions: 'rw-r--r--',
              owner: 'root',
              group: 'root',
              size: 215,
              content: 'NAME="Arch Linux Simulator"\nPRETTY_NAME="Arch Linux Edu v2.5"\nID=arch\nBUILD_ID=rolling\nANSI_COLOR="38;2;23;147;209"\nHOME_URL="https://archlinux.org/"\nSUPPORT_URL="https://bbs.archlinux.org/"\nBUG_REPORT_URL="https://bugs.archlinux.org/"\n'
            },
            'passwd': {
              name: 'passwd',
              type: 'file',
              permissions: 'rw-r--r--',
              owner: 'root',
              group: 'root',
              size: 248,
              content: 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\nusuario:x:1000:1000:Usuario Linux:/home/usuario:/bin/bash\n'
            },
            'hosts': {
              name: 'hosts',
              type: 'file',
              permissions: 'rw-r--r--',
              owner: 'root',
              group: 'root',
              size: 82,
              content: '127.0.0.1\tlocalhost\n127.0.1.1\tarch-simulator.localdomain\tarch-simulator\n::1\tlocalhost ip6-localhost ip6-loopback\n'
            }
          }
        },
        'home': {
          name: 'home',
          type: 'dir',
          permissions: 'rwxr-xr-x',
          owner: 'root',
          group: 'root',
          mtime: new Date('2026-09-01T12:00:00'),
          children: {
            'usuario': {
              name: 'usuario',
              type: 'dir',
              permissions: 'rwxr-xr-x',
              owner: 'usuario',
              group: 'usuario',
              mtime: new Date('2026-10-10T14:22:00'),
              children: {
                'documentos': {
                  name: 'documentos',
                  type: 'dir',
                  permissions: 'rwxr-xr-x',
                  owner: 'usuario',
                  group: 'usuario',
                  mtime: new Date('2026-10-10T15:00:00'),
                  children: {
                    'bienvenida.txt': {
                      name: 'bienvenida.txt',
                      type: 'file',
                      permissions: 'rw-r--r--',
                      owner: 'usuario',
                      group: 'usuario',
                      size: 295,
                      content: '¡Bienvenido al simulador de Linux interactivo!\n\nEste entorno te permite practicar los comandos fundamentales sin miedo a romper nada.\n\nComandos que puedes probar ahora mismo:\n - ls -la (ver archivos ocultos y permisos)\n - pwd (ver tu ruta actual)\n - cat bienvenida.txt\n - neofetch (info visual del sistema)\n'
                    },
                    'comandos_clave.md': {
                      name: 'comandos_clave.md',
                      type: 'file',
                      permissions: 'rw-r--r--',
                      owner: 'usuario',
                      group: 'usuario',
                      size: 430,
                      content: '# Cheat Sheet de Comandos Esenciales\n\n- `pwd`: Muestra el directorio de trabajo actual.\n- `ls`: Lista archivos y carpetas.\n- `cd <dir>`: Cambia de directorio.\n- `mkdir <dir>`: Crea una nueva carpeta.\n- `touch <archivo>`: Crea un archivo vacío o actualiza timestamp.\n- `cat <archivo>`: Concatena y muestra el contenido.\n- `grep <patron> <archivo>`: Busca coincidencias de texto.\n- `chmod <perm> <archivo>`: Cambia permisos.\n- `rm <archivo>`: Elimina archivos.\n'
                    },
                    'notas.txt': {
                      name: 'notas.txt',
                      type: 'file',
                      permissions: 'rw-rw-r--',
                      owner: 'usuario',
                      group: 'usuario',
                      size: 112,
                      content: 'Recordatorio:\n1. Aprender a usar tuberías (pipes |).\n2. Configurar permisos con chmod 755.\n3. Practicar grep y sort.\n'
                    }
                  }
                },
                'proyectos': {
                  name: 'proyectos',
                  type: 'dir',
                  permissions: 'rwxr-xr-x',
                  owner: 'usuario',
                  group: 'usuario',
                  mtime: new Date('2026-10-11T10:15:00'),
                  children: {
                    'servidor_web': {
                      name: 'servidor_web',
                      type: 'dir',
                      permissions: 'rwxr-xr-x',
                      owner: 'usuario',
                      group: 'usuario',
                      mtime: new Date('2026-10-11T10:16:00'),
                      children: {
                        'index.html': {
                          name: 'index.html',
                          type: 'file',
                          permissions: 'rw-r--r--',
                          owner: 'usuario',
                          group: 'usuario',
                          size: 184,
                          content: '<!DOCTYPE html>\n<html>\n<head><title>Mi Servidor Linux</title></head>\n<body>\n  <h1>¡Servidor Funcionando con Éxito!</h1>\n  <p>Ejecutado en entorno Linux Simulator.</p>\n</body>\n</html>\n'
                        },
                        'servidor.js': {
                          name: 'servidor.js',
                          type: 'file',
                          permissions: 'rwxr-xr-x',
                          owner: 'usuario',
                          group: 'usuario',
                          size: 156,
                          content: 'const http = require("http");\nhttp.createServer((req, res) => {\n  res.writeHead(200, {"Content-Type": "text/plain"});\n  res.end("Hola Mundo desde Node.js\\n");\n}).listen(8080);\n'
                        }
                      }
                    },
                    'script_backup.sh': {
                      name: 'script_backup.sh',
                      type: 'file',
                      permissions: 'rwxr-xr-x',
                      owner: 'usuario',
                      group: 'usuario',
                      size: 142,
                      content: '#!/bin/bash\n# Script de respaldo automatizado\nFECHA=$(date +%Y%m%d)\necho "Creando respaldo de /home/usuario/documentos..."\ntar -czf "backup-$FECHA.tar.gz" ../documentos\n'
                    }
                  }
                },
                'descargas': {
                  name: 'descargas',
                  type: 'dir',
                  permissions: 'rwxr-xr-x',
                  owner: 'usuario',
                  group: 'usuario',
                  mtime: new Date('2026-10-12T09:00:00'),
                  children: {
                    'paquete_v2.tar.gz': {
                      name: 'paquete_v2.tar.gz',
                      type: 'file',
                      permissions: 'rw-r--r--',
                      owner: 'usuario',
                      group: 'usuario',
                      size: 450912,
                      content: '[Archivo comprimido binario GZIP]'
                    }
                  }
                },
                '.bashrc': {
                  name: '.bashrc',
                  type: 'file',
                  permissions: 'rw-r--r--',
                  owner: 'usuario',
                  group: 'usuario',
                  size: 260,
                  content: '# ~/.bashrc: ejecutado por bash para shells no de login\nalias ll="ls -alF"\nalias la="ls -A"\nalias l="ls -CF"\nalias cls="clear"\nPS1="\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ "\n'
                },
                '.bash_history': {
                  name: '.bash_history',
                  type: 'file',
                  permissions: 'rw-------',
                  owner: 'usuario',
                  group: 'usuario',
                  size: 94,
                  content: 'ls\npwd\ncd documentos\ncat bienvenida.txt\nneofetch\n'
                }
              }
            }
          }
        },
        'var': {
          name: 'var',
          type: 'dir',
          permissions: 'rwxr-xr-x',
          owner: 'root',
          group: 'root',
          mtime: new Date('2026-09-01T12:00:00'),
          children: {
            'log': {
              name: 'log',
              type: 'dir',
              permissions: 'rwxr-xr-x',
              owner: 'root',
              group: 'root',
              mtime: new Date('2026-10-13T20:00:00'),
              children: {
                'syslog': {
                  name: 'syslog',
                  type: 'file',
                  permissions: 'rw-r-----',
                  owner: 'root',
                  group: 'adm',
                  size: 610,
                  content: 'Oct 13 20:00:01 arch-sim systemd[1]: Starting Daily apt download activities...\nOct 13 20:01:15 arch-sim kernel: [    0.000000] Linux version 6.8.0-arch1-1 (gcc 13.2.1)\nOct 13 20:05:42 arch-sim sshd[1284]: Accepted publickey for usuario from 192.168.1.15 port 54102 ssh2\nOct 13 20:10:00 arch-sim CRON[1430]: (root) CMD (/usr/sbin/logrotate /etc/logrotate.conf)\nOct 13 21:00:00 arch-sim systemd[1]: Finished Linux Terminal Virtual Environment.\n'
                },
                'auth.log': {
                  name: 'auth.log',
                  type: 'file',
                  permissions: 'rw-r-----',
                  owner: 'root',
                  group: 'adm',
                  size: 280,
                  content: 'Oct 13 20:05:40 arch-sim login: pam_unix(login:session): session opened for user usuario(uid=1000) by LOGIN(uid=0)\nOct 13 20:05:42 arch-sim sudo: usuario : TTY=pts/0 ; PWD=/home/usuario ; USER=root ; COMMAND=/usr/bin/apt update\n'
                }
              }
            }
          }
        },
        'tmp': {
          name: 'tmp',
          type: 'dir',
          permissions: 'rwxrwxrwt',
          owner: 'root',
          group: 'root',
          mtime: new Date('2026-10-13T21:00:00'),
          children: {
            'sesion.lock': {
              name: 'sesion.lock',
              type: 'file',
              permissions: 'rw-rw-r--',
              owner: 'usuario',
              group: 'usuario',
              size: 22,
              content: 'pid=1204;status=active\n'
            }
          }
        }
      }
    };
  }

  reset() {
    this.root = this.getInitialState();
    this.notifyChange({ type: 'reset' });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyChange(change) {
    this.listeners.forEach(cb => {
      try { cb(change); } catch (e) { console.error('FS listener error:', e); }
    });
  }

  /**
   * Resolve relative or absolute path based on current working directory.
   */
  resolvePath(currentWorkingDir, targetPath) {
    if (!targetPath || targetPath.trim() === '') {
      return currentWorkingDir;
    }
    targetPath = targetPath.trim();

    // Replace ~ with /home/usuario
    if (targetPath === '~' || targetPath.startsWith('~/')) {
      targetPath = '/home/usuario' + targetPath.slice(1);
    }

    let absolute;
    if (targetPath.startsWith('/')) {
      absolute = targetPath;
    } else {
      absolute = (currentWorkingDir === '/' ? '' : currentWorkingDir) + '/' + targetPath;
    }

    // Normalize . and ..
    const segments = absolute.split('/').filter(Boolean);
    const resolved = [];

    for (const seg of segments) {
      if (seg === '.') {
        continue;
      }
      if (seg === '..') {
        if (resolved.length > 0) {
          resolved.pop();
        }
      } else {
        resolved.push(seg);
      }
    }

    return '/' + resolved.join('/');
  }

  /**
   * Traverse tree to get node at path.
   */
  getNode(path) {
    if (path === '/' || path === '') {
      return this.root;
    }

    const segments = path.split('/').filter(Boolean);
    let current = this.root;

    for (const seg of segments) {
      if (current.type !== 'dir') return null;
      if (!current.children || !current.children[seg]) return null;
      current = current.children[seg];
    }

    return current;
  }

  /**
   * Check if a path exists.
   */
  exists(path) {
    return this.getNode(path) !== null;
  }

  /**
   * Get parent node and target name
   */
  getParentAndName(path) {
    if (path === '/') return { parent: null, name: '' };
    const segments = path.split('/').filter(Boolean);
    const name = segments.pop();
    const parentPath = '/' + segments.join('/');
    const parent = this.getNode(parentPath);
    return { parent, name, parentPath };
  }

  /**
   * Create a new directory
   */
  createDirectory(path, recursive = false) {
    if (this.exists(path)) {
      throw new Error(`cannot create directory '${path}': File exists`);
    }

    const segments = path.split('/').filter(Boolean);
    let current = this.root;
    let accumulatedPath = '';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accumulatedPath += '/' + seg;
      const isLast = (i === segments.length - 1);

      if (!current.children[seg]) {
        if (isLast || recursive) {
          current.children[seg] = {
            name: seg,
            type: 'dir',
            permissions: 'rwxr-xr-x',
            owner: 'usuario',
            group: 'usuario',
            mtime: new Date(),
            children: {}
          };
          current = current.children[seg];
        } else {
          throw new Error(`cannot create directory '${path}': No such file or directory`);
        }
      } else {
        if (current.children[seg].type !== 'dir') {
          throw new Error(`cannot create directory '${path}': Not a directory`);
        }
        current = current.children[seg];
      }
    }

    this.notifyChange({ type: 'create_dir', path });
    return true;
  }

  /**
   * Create or update a file
   */
  createFile(path, content = '', permissions = 'rw-r--r--') {
    const { parent, name } = this.getParentAndName(path);
    if (!parent) {
      throw new Error(`cannot create file '${path}': Invalid path`);
    }
    if (parent.type !== 'dir') {
      throw new Error(`cannot create file '${path}': Not a directory`);
    }

    const exists = !!parent.children[name];
    if (exists && parent.children[name].type === 'dir') {
      throw new Error(`cannot create file '${path}': Is a directory`);
    }

    const now = new Date();
    if (exists) {
      parent.children[name].content = content;
      parent.children[name].size = new TextEncoder().encode(content).length;
      parent.children[name].mtime = now;
    } else {
      parent.children[name] = {
        name,
        type: 'file',
        permissions,
        owner: 'usuario',
        group: 'usuario',
        size: new TextEncoder().encode(content).length,
        content,
        mtime: now
      };
    }

    this.notifyChange({ type: exists ? 'update_file' : 'create_file', path });
    return parent.children[name];
  }

  /**
   * Append content to a file (for >> operator)
   */
  appendFile(path, content) {
    const node = this.getNode(path);
    if (!node) {
      return this.createFile(path, content);
    }
    if (node.type === 'dir') {
      throw new Error(`cannot append to '${path}': Is a directory`);
    }
    node.content = (node.content || '') + content;
    node.size = new TextEncoder().encode(node.content).length;
    node.mtime = new Date();
    this.notifyChange({ type: 'update_file', path });
    return node;
  }

  /**
   * Read file contents
   */
  readFile(path) {
    const node = this.getNode(path);
    if (!node) {
      throw new Error(`cannot open '${path}': No such file or directory`);
    }
    if (node.type === 'dir') {
      throw new Error(`cannot read '${path}': Is a directory`);
    }
    return node.content || '';
  }

  /**
   * Remove a file or directory
   */
  remove(path, recursive = false) {
    if (path === '/') {
      throw new Error(`cannot remove root directory '/'`);
    }
    const { parent, name } = this.getParentAndName(path);
    if (!parent || !parent.children[name]) {
      throw new Error(`cannot remove '${path}': No such file or directory`);
    }

    const target = parent.children[name];
    if (target.type === 'dir') {
      if (!recursive) {
        throw new Error(`cannot remove '${path}': Is a directory (use -r)`);
      }
    }

    delete parent.children[name];
    this.notifyChange({ type: 'delete', path });
    return true;
  }

  /**
   * Copy a file or directory
   */
  copy(srcPath, destPath, recursive = false) {
    const srcNode = this.getNode(srcPath);
    if (!srcNode) {
      throw new Error(`cp: cannot stat '${srcPath}': No such file or directory`);
    }

    if (srcNode.type === 'dir' && !recursive) {
      throw new Error(`cp: -r not specified; omitting directory '${srcPath}'`);
    }

    const { parent: destParent, name: destName } = this.getParentAndName(destPath);
    if (!destParent) {
      throw new Error(`cp: cannot create destination '${destPath}': No such file or directory`);
    }

    // Deep clone helper
    const deepClone = (node, newName) => {
      const clone = {
        name: newName || node.name,
        type: node.type,
        permissions: node.permissions,
        owner: 'usuario',
        group: 'usuario',
        size: node.size || 0,
        content: node.content !== undefined ? node.content : undefined,
        mtime: new Date()
      };
      if (node.children) {
        clone.children = {};
        for (const childKey of Object.keys(node.children)) {
          clone.children[childKey] = deepClone(node.children[childKey], childKey);
        }
      }
      return clone;
    };

    // If destination exists and is directory, copy inside it
    const existingDest = this.getNode(destPath);
    if (existingDest && existingDest.type === 'dir') {
      existingDest.children[srcNode.name] = deepClone(srcNode, srcNode.name);
    } else {
      destParent.children[destName] = deepClone(srcNode, destName);
    }

    this.notifyChange({ type: 'copy', src: srcPath, dest: destPath });
    return true;
  }

  /**
   * Move/Rename a file or directory
   */
  move(srcPath, destPath) {
    const srcNode = this.getNode(srcPath);
    if (!srcNode) {
      throw new Error(`mv: cannot stat '${srcPath}': No such file or directory`);
    }

    const { parent: srcParent, name: srcName } = this.getParentAndName(srcPath);
    if (!srcParent) {
      throw new Error(`mv: invalid source '${srcPath}'`);
    }

    let finalDestParent = null;
    let finalDestName = null;

    const existingDest = this.getNode(destPath);
    if (existingDest && existingDest.type === 'dir') {
      finalDestParent = existingDest;
      finalDestName = srcName;
    } else {
      const { parent, name } = this.getParentAndName(destPath);
      if (!parent) {
        throw new Error(`mv: cannot move to '${destPath}': No such file or directory`);
      }
      finalDestParent = parent;
      finalDestName = name;
    }

    delete srcParent.children[srcName];
    srcNode.name = finalDestName;
    finalDestParent.children[finalDestName] = srcNode;

    this.notifyChange({ type: 'move', src: srcPath, dest: destPath });
    return true;
  }

  /**
   * Change permissions (chmod)
   */
  chmod(path, modeStr) {
    const node = this.getNode(path);
    if (!node) {
      throw new Error(`chmod: cannot access '${path}': No such file or directory`);
    }

    // Handle numeric chmod e.g. 755, 644, 777
    if (/^[0-7]{3,4}$/.test(modeStr)) {
      const num = modeStr.slice(-3);
      const permMap = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
      const u = permMap[parseInt(num[0], 10)];
      const g = permMap[parseInt(num[1], 10)];
      const o = permMap[parseInt(num[2], 10)];
      node.permissions = u + g + o;
    } else if (modeStr === '+x') {
      let p = node.permissions;
      node.permissions = p[0] + p[1] + 'x' + p[3] + p[4] + 'x' + p[6] + p[7] + 'x';
    } else if (modeStr === '-x') {
      let p = node.permissions;
      node.permissions = p[0] + p[1] + '-' + p[3] + p[4] + '-' + p[6] + p[7] + '-';
    } else {
      throw new Error(`chmod: invalid mode '${modeStr}'`);
    }

    this.notifyChange({ type: 'chmod', path });
    return node.permissions;
  }

  /**
   * Return array of entries in directory
   */
  listDirectory(path) {
    const node = this.getNode(path);
    if (!node) {
      throw new Error(`ls: cannot access '${path}': No such file or directory`);
    }
    if (node.type !== 'dir') {
      return [node];
    }
    return Object.values(node.children || {});
  }

  /**
   * Generate tree representation
   */
  getTreeStructure(startPath = '/', maxDepth = 4) {
    const rootNode = this.getNode(startPath);
    if (!rootNode) return null;

    const buildTree = (node, currentDepth) => {
      const item = {
        name: node.name,
        type: node.type,
        permissions: node.permissions,
        size: node.size || 0,
        path: currentDepth === 0 ? startPath : undefined
      };

      if (node.type === 'dir' && node.children && currentDepth < maxDepth) {
        item.children = Object.values(node.children)
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map(child => buildTree(child, currentDepth + 1));
      }
      return item;
    };

    return buildTree(rootNode, 0);
  }
}

window.VirtualFileSystem = VirtualFileSystem;
