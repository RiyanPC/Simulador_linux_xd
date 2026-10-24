/**
 * Gamified Learning Missions & Objectives for Linux Simulator
 * Validates commands and file system state in real time to guide users.
 */
class MissionManager {
  constructor(fs, terminal) {
    this.fs = fs;
    this.terminal = terminal;
    this.activeMissionIndex = 0;
    this.xp = 0;
    this.listeners = [];

    this.missions = [
      {
        id: 'pwd_ls',
        title: 'Nivel 1: El Primer Contacto',
        desc: 'Aprende dónde estás en el sistema de archivos y qué hay a tu alrededor.',
        instruction: 'Ejecuta el comando <code>pwd</code> para ver tu ruta actual, y luego <code>ls</code> para ver los archivos disponibles.',
        hint: 'Escribe <code>pwd</code> y presiona Enter. Luego escribe <code>ls</code>.',
        xpReward: 50,
        completed: false,
        check: (cmd, output, fs, cwd) => {
          return (cmd === 'pwd' || cmd === 'ls' || cmd.startsWith('ls '));
        }
      },
      {
        id: 'cd_cat',
        title: 'Nivel 2: Explorador de Archivos',
        desc: 'Navega hacia la carpeta de documentos y lee el mensaje de bienvenida.',
        instruction: 'Entra a la carpeta de documentos con <code>cd documentos</code> y lee el archivo usando <code>cat bienvenida.txt</code>.',
        hint: 'Escribe <code>cd documentos</code> y luego <code>cat bienvenida.txt</code>.',
        xpReward: 75,
        completed: false,
        check: (cmd, output, fs, cwd) => {
          const inDocs = cwd.includes('documentos');
          return inDocs && (cmd.startsWith('cat bienvenida.txt') || cmd.includes('bienvenida.txt'));
        }
      },
      {
        id: 'mkdir_touch',
        title: 'Nivel 3: El Arquitecto (Crear Carpetas y Archivos)',
        desc: 'Crea tu propia estructura de carpetas y archivos en tu directorio de usuario.',
        instruction: 'Regresa a tu home (<code>cd ~</code>) y crea una carpeta llamada <code>laboratorio</code> con <code>mkdir laboratorio</code>, luego crea un archivo dentro con <code>touch laboratorio/experimento.txt</code>.',
        hint: 'Usa <code>mkdir laboratorio</code> y luego <code>touch laboratorio/experimento.txt</code>.',
        xpReward: 100,
        completed: false,
        check: (cmd, output, fs, cwd) => {
          const labExists = fs.exists('/home/usuario/laboratorio');
          const fileExists = fs.exists('/home/usuario/laboratorio/experimento.txt');
          return labExists && fileExists;
        }
      },
      {
        id: 'redirection_echo',
        title: 'Nivel 4: Escribiendo con Redirección (> y >>)',
        desc: 'Aprende a escribir texto dentro de un archivo directamente desde la terminal.',
        instruction: 'Guarda la frase "Hola Linux" dentro de <code>laboratorio/experimento.txt</code> usando el operador de redirección: <code>echo "Hola Linux" > laboratorio/experimento.txt</code>.',
        hint: 'Ejecuta: <code>echo "Hola Linux" > laboratorio/experimento.txt</code> y compruébalo con <code>cat</code>.',
        xpReward: 120,
        completed: false,
        check: (cmd, output, fs, cwd) => {
          const path = '/home/usuario/laboratorio/experimento.txt';
          if (!fs.exists(path)) return false;
          const content = fs.readFile(path);
          return content.toLowerCase().includes('hola');
        }
      },
      {
        id: 'chmod_permissions',
        title: 'Nivel 5: El Guardián de Permisos (chmod)',
        desc: 'Los scripts requieren permisos de ejecución (+x) para poder correr en Linux.',
        instruction: 'Otorga permisos de ejecución al script de respaldo en <code>proyectos/script_backup.sh</code> usando <code>chmod +x proyectos/script_backup.sh</code> (o <code>chmod 755</code>).',
        hint: 'Prueba: <code>chmod +x ~/proyectos/script_backup.sh</code> o <code>chmod 755 proyectos/script_backup.sh</code>.',
        xpReward: 150,
        completed: false,
        check: (cmd, output, fs, cwd) => {
          const node = fs.getNode('/home/usuario/proyectos/script_backup.sh');
          return node && node.permissions && node.permissions.includes('x');
        }
      },
      {
        id: 'pipes_grep',
        title: 'Nivel 6: Tuberías y Filtros (Pipes | y grep)',
        desc: 'Conecta dos comandos usando el operador pipe (|) para filtrar información en tiempo real.',
        instruction: 'Filtra el registro de sistema <code>/var/log/syslog</code> buscando la palabra "sshd" o "kernel" usando <code>cat /var/log/syslog | grep sshd</code>.',
        hint: 'Escribe: <code>cat /var/log/syslog | grep sshd</code> o <code>grep sshd /var/log/syslog</code>.',
        xpReward: 160,
        completed: false,
        check: (cmd, output, fs, cwd) => {
          return (cmd.includes('grep') && (cmd.includes('syslog') || output.toLowerCase().includes('sshd')));
        }
      },
      {
        id: 'sysadmin_specs',
        title: 'Nivel 7: Administrador de Sistemas (Specs y Hardware)',
        desc: 'Conoce los detalles de tu máquina virtual y los recursos disponibles.',
        instruction: 'Ejecuta <code>neofetch</code> para ver el resumen visual del sistema, y luego comprueba el espacio en disco con <code>df -h</code>.',
        hint: 'Ejecuta <code>neofetch</code> en la terminal.',
        xpReward: 200,
        completed: false,
        check: (cmd, output, fs, cwd) => {
          return cmd === 'neofetch' || cmd === 'fastfetch' || cmd.startsWith('df');
        }
      },
      {
        id: 'caelestia_customizer',
        title: 'Nivel 8: El Maestro de Caelestia (Hyprland & Dotfiles)',
        desc: 'Domina los comandos de personalización y dotfiles de tu entorno Caelestia.',
        instruction: 'Cambia el fondo de pantalla ejecutando <code>caelestia wallpaper twilight</code> (o <code>caelestia wallpaper nocturne</code>), o consulta la configuración de Hyprland con <code>cat ~/.config/hypr/hyprland.conf</code>.',
        hint: 'Escribe <code>caelestia wallpaper twilight</code> o <code>caelestia info</code>.',
        xpReward: 250,
        completed: false,
        check: (cmd, output, fs, cwd) => {
          return cmd.includes('caelestia') || cmd.includes('hyprland.conf') || cmd.startsWith('hyprctl');
        }
      }
    ];
  }

  getCurrentMission() {
    return this.missions[this.activeMissionIndex] || null;
  }

  getAllMissions() {
    return this.missions;
  }

  onMissionUpdate(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getCurrentMission(), this.xp, this.missions));
  }

  onCommandExecuted(rawCommand, output) {
    const current = this.getCurrentMission();
    if (!current || current.completed) return;

    const trimmedCmd = rawCommand.trim();
    const passed = current.check(trimmedCmd, output, this.fs, this.terminal.cwd);

    if (passed) {
      current.completed = true;
      this.xp += current.xpReward;
      if (window.terminalAudio) {
        window.terminalAudio.playSuccess();
      }
      this.terminal.print(`<div class="term-mission-complete">★ ¡MISIÓN COMPLETADA! Ganaste +${current.xpReward} XP ★\nDesbloqueaste el siguiente objetivo.</div>`);
      
      if (this.activeMissionIndex < this.missions.length - 1) {
        this.activeMissionIndex++;
      }
      this.notify();
    }
  }

  selectMission(index) {
    if (index >= 0 && index < this.missions.length) {
      this.activeMissionIndex = index;
      this.notify();
    }
  }
}

window.MissionManager = MissionManager;
