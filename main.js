require('update-electron-app');
const { app, BrowserWindow, ipcMain, screen, globalShortcut, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const log = require('electron-log');

// --- CONFIGURAÇÃO DO SISTEMA DE LOGS ---
// Define o caminho e o formato do arquivo de log
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
log.transports.file.level = 'info'; // Captura info, warn, error
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{l}] [{level}] {text}';
log.transports.file.maxSize = 5 * 1024 * 1024; // Rotaciona o arquivo a cada 5MB

Object.assign(console, log.functions);

console.log('--- INICIANDO APLICAÇÃO GAME HUB AGENT ---');

let loginWindow;
let sessionWidget;
let lockWindow;
let forceQuit = false;

// Caminho para o nosso arquivo de configuração
const configPath = path.join(app.getPath('userData'), 'config.json');
let config;

// Função para carregar a configuração
function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const rawData = fs.readFileSync(configPath);
            config = JSON.parse(rawData);
        } else {
            config = {};
        }
    } catch (error) {
        console.error('Erro ao carregar config.json:', error);
        config = {};
    }
}
loadConfig();

// --- JANELA 1: TELA DE LOGIN ---
function createLoginWindow() {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  if (config && config.stationId) {
    // Se já temos um ID, passa para a tela de login via query param
    const query = { stationId: config.stationId };
    loginWindow.loadFile('index.html', { query });
  } else {
    // Se não, vai para a nova tela de setup
    loginWindow.loadFile('setup.html');
  }
  // loginWindow.webContents.openDevTools();

  // Aplica as regras de segurança assim que a janela estiver pronta
  loginWindow.once('ready-to-show', () => {
    setRestrictiveMode(loginWindow);
  });

  loginWindow.on('closed', () => { loginWindow = null; });
}

// --- JANELA 2: WIDGET DA SESSÃO ATIVA ---
function createSessionWidget(clientData) {
  if (sessionWidget) return;
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  sessionWidget = new BrowserWindow({
    width: 300,
    height: 110,
    x: 0,
    y: height - 200 - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    opacity: 0.85,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  
  sessionWidget.setAlwaysOnTop(true, 'screen-saver');
  sessionWidget.setVisibleOnAllWorkspaces(true);

  const query = { client: Buffer.from(JSON.stringify(clientData)).toString('base64') };
  sessionWidget.loadFile('index.html', { query });

  sessionWidget.on('closed', () => { sessionWidget = null; });
}

// --- JANELA 3: TELA DE BLOQUEIO ---
function createLockWindow() {
  if (lockWindow) return;

  if (sessionWidget) sessionWidget.close();
  if (loginWindow) loginWindow.close();

  lockWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  lockWindow.loadFile('lock-screen.html');
  lockWindow.on('close', (event) => {
    if (!forceQuit) {
      event.preventDefault();
    }
  });
  lockWindow.on('closed', () => {
    lockWindow = null;
    if (!loginWindow) createLoginWindow();
  });
}

// --- FUNÇÕES DE CONTROLE DE MODO ---
function setRestrictiveMode(window) {
  if (!window) return;
  window.setKiosk(true);
  window.setAlwaysOnTop(true, 'screen-saver');
  window.on('close', (event) => {
    if (!forceQuit) { // Só impede se NÃO estivermos forçando o fechamento
      event.preventDefault();
    }
  });
  window.on('blur', () => { if (window) window.focus(); });
}

function setGamingMode(window) {
  if (!window) return;
  window.setKiosk(false);
  window.setAlwaysOnTop(false);
  window.removeAllListeners('close');
  window.removeAllListeners('blur');
}

// --- FUNÇÃO DE LIMPEZA (VERSÃO FINAL COM ELEVAÇÃO E FEEDBACK) --- gamehub-agent-cleanup-x64
function runCleanupScript() {
    Object.assign(console, log.functions);
    const batScriptPath = 'C:\\GameHub\\cleanup.bat';
    const vbsScriptPath = 'C:\\GameHub\\run-as-admin.vbs';
    console.log('[CLEANUP] Solicitando elevação para executar o script de limpeza...');
    
    // Comando que usa o wscript do windows para executar nosso VBS, que por sua vez executa o .bat como admin
    // const command = `wscript.exe "${vbsScriptPath}" "${batScriptPath}"`;
    const command = `"${batScriptPath}"`;
    
    exec(command, (error, stdout, stderr) => {
        // Esta função de callback só será chamada após o UAC e o script terminarem.
        // Erros de permissão (UAC negado) geralmente aparecem aqui.
        if (error) {
            console.error(`[CLEANUP] Erro ao chamar o script de elevação: ${error.message}`);
            // dialog.showErrorBox('Falha na Limpeza', `Não foi possível executar o script de limpeza.\n\nErro: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`[CLEANUP] Erro no script: ${stderr}`);
            //  dialog.showErrorBox('Falha na Limpeza', `O script de limpeza retornou um erro:\n\n${stderr}`);
            return;
        }
        
        console.log(`[CLEANUP] Script de limpeza executado.`);
        // Não mostramos um popup de sucesso para não interromper o fluxo, mas o log confirma.
    });
}


// --- CONTROLE DE EVENTOS DA APLICAÇÃO ---
app.whenReady().then(() => {
  globalShortcut.register('F11', () => {});
  globalShortcut.register('Control+Shift+I', () => {});

  // Configura a aplicação para iniciar junto com o sistema operacional
  // Só tem efeito após o aplicativo ser instalado por um instalador (.exe)
  if (process.env.NODE_ENV !== 'development') {
    app.setLoginItemSettings({
      openAtLogin: true,
    });
  }

  createLoginWindow();
});

ipcMain.on('login-successful', (event, clientData) => {
  if (loginWindow) {
    setGamingMode(loginWindow); // Libera a janela de login antes de fechar
    loginWindow.close();
  }
  createSessionWidget(clientData);
});

ipcMain.on('end-session-widget', () => {
  console.log('[MAIN] Fim de sessão solicitado pelo widget. Executando limpeza...');
  runCleanupScript();
  if (sessionWidget) sessionWidget.close();
  if (!loginWindow) createLoginWindow();
});

ipcMain.on('show-lock-screen', () => {
    runCleanupScript(); // Executa a limpeza ao bloquear
    createLockWindow();
});

ipcMain.on('request-unlock', () => {
    if (lockWindow) {
        lockWindow.destroy();
        runCleanupScript(); // Executa a limpeza ao desbloquear tbm
    }
});

ipcMain.on('drag-widget', (event, { deltaY }) => {
  if (sessionWidget) {
    const [x, y] = sessionWidget.getPosition();
    // Aplica apenas a diferença no eixo Y, mantendo o X fixo
    sessionWidget.setPosition(x, y + deltaY);
  }
});

ipcMain.on('save-station-id', (event, stationId) => {
  config.stationId = stationId;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('ID da estação salvo com sucesso:', stationId);
    
    // Recarrega a janela principal, que agora irá para a tela de login
    if (loginWindow) {
      const query = { stationId: config.stationId };
      loginWindow.loadFile('index.html', { query });
    }
  } catch (error) {
    console.error('Erro ao salvar config.json:', error);
  }
});

ipcMain.on('reset-config', () => {
  try {
    if (fs.existsSync(configPath)) {
      console.log(`[RESET] Deletando arquivo de configuração em: ${configPath}`);
      fs.unlinkSync(configPath); // Apaga o arquivo de configuração
      console.log('[RESET] Configuração resetada. Reiniciando o aplicativo...');
      forceQuit = true;
      app.relaunch(); // Prepara para reiniciar
      app.quit();     // Fecha a aplicação atual
    } else {
        console.log('[RESET] Arquivo de configuração não encontrado. Reiniciando de qualquer forma.');
        forceQuit = true;
        app.relaunch();
        app.quit();
    }
  } catch (error) {
    console.error('Falha ao resetar a configuração:', error);
  }
});

// Ouve o comando de emergência para fechar o aplicativo
ipcMain.on('emergency-quit', () => {
  console.log('[EMERGÊNCIA] Comando de encerramento recebido. Fechando o aplicativo...');
  forceQuit = true;
  app.quit(); // Encerra o aplicativo completamente
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});