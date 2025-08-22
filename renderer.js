const { io } = require("socket.io-client");
const { ipcRenderer } = require("electron");

// --- VARIÁVEIS GLOBAIS ---
const API_URL = "https://gamehub-api-lvep.onrender.com";
let STATION_ID;
let currentClient = null;
let sessionInterval;
let socket;

// --- GARANTE QUE O CÓDIGO SÓ RODE DEPOIS QUE O HTML ESTIVER PRONTO ---
window.addEventListener("DOMContentLoaded", () => {
  // Mapeamento de Elementos do HTML
  const loginScreen = document.getElementById("login-screen");
  const sessionScreen = document.getElementById("session-screen");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const logoImage = document.getElementById("logo-image");
  const cpfInput = document.getElementById("cpf-input");
  const loginError = document.getElementById("login-error");
  const clientNameSpan = document.getElementById("client-name");
  const timeLeftSpan = document.getElementById("time-left");
  const widgetToggle = document.getElementById("widget-toggle");

  // Elementos do novo Modal de PIN
  const pinModal = document.getElementById("pin-modal");
  const pinInput = document.getElementById("pin-input");
  const pinConfirmBtn = document.getElementById("pin-confirm-btn");
  const pinCancelBtn = document.getElementById("pin-cancel-btn");
  const pinError = document.getElementById("pin-error");

  // Extrai parâmetros da URL da janela
  const params = new URLSearchParams(window.location.search);
  const stationIdFromQuery = params.get("stationId");
  const clientDataEncoded = params.get("client");

  // --- LÓGICA DE INICIALIZAÇÃO ---

  // Se for a janela de LOGIN (tem stationId, mas não tem clientData)
  if (stationIdFromQuery && !clientDataEncoded) {
    STATION_ID = parseInt(stationIdFromQuery);
    console.log(`Este agente está configurado como Estação ID: ${STATION_ID}`);

    // Conecta ao servidor SÓ AGORA que temos o ID
    setupSocketConnection();
    setupDragListeners();

    if (loginButton) {
      loginButton.addEventListener("click", handleLogin);
      window.addEventListener("keydown", handleResetShortcut);
    }
    if (logoImage) {
      setupEmergencyClickListener(logoImage); // Configura o botão de emergência
    }
  }

  // Se for a janela do WIDGET (tem clientData)
  if (clientDataEncoded) {
    currentClient = JSON.parse(
      Buffer.from(clientDataEncoded, "base64").toString("utf-8")
    );
    STATION_ID = currentClient.stationId; // O stationId também é passado junto com os dados do cliente

    setupSocketConnection();

    // Configura a UI do Widget
    loginScreen.style.display = "none";
    sessionScreen.classList.remove("hidden");
    clientNameSpan.innerText = currentClient.name;
    startSessionTimer(currentClient.hours_balance);

    // --- LÓGICA DE CLIQUE E ARRASTAR CORRIGIDA ---

    // Evento de clique para expandir/recolher, agora no container principal
    sessionScreen.addEventListener("click", () => {
      sessionScreen.classList.toggle("expanded");
    });

    // Evento de clique para o botão de logout
    logoutButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Impede que o clique no botão também acione o toggle do widget
      if (!currentClient) return;
      if (confirm("Tem certeza que deseja encerrar a sessão?")) {
        socket.emit("agentRequestLogout", {
          clientId: currentClient.id,
          stationId: STATION_ID,
        });
      }
    });

    // Lógica para arrastar
    let isDragging = false;
    let lastMousePos = { x: 0, y: 0 };

    if (draggableArea) {
      draggableArea.addEventListener("mousedown", (e) => {
        // Impede que o início do arrasto também acione o toggle do widget
        e.stopPropagation();
        isDragging = true;
        lastMousePos = { x: e.screenX, y: e.screenY };
      });
    }
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaY = e.screenY - lastMousePos.y;
      ipcRenderer.send("drag-widget", { deltaY });
      lastMousePos = { x: e.screenX, y: e.screenY };
    });
    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  // --- FUNÇÕES DE LÓGICA ---

  function setupSocketConnection() {
    if (socket) return; // Impede múltiplas conexões
    socket = io(API_URL);

    socket.on("connect", () => {
      console.log("Conectado ao servidor!");
      socket.emit("agentConnect", STATION_ID);
    });
    socket.on("lockScreen", () => ipcRenderer.send("show-lock-screen"));
    socket.on("updateTimer", (newBalance) => {
      if (currentClient) {
        currentClient.hours_balance = newBalance;
        startSessionTimer(newBalance);
      }
    });
    socket.on("sessionEnded", () => {
      if (sessionInterval) clearInterval(sessionInterval);
      ipcRenderer.send("end-session-widget");
    });
  }

  async function handleLogin() {
    loginError.innerText = "";
    const cpf = cpfInput.value;
    try {
      const response = await fetch(`${API_URL}/api/client-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      // Avisa o servidor que a sessão começou
      socket.emit("sessionStarted", {
        clientId: data.id,
        stationId: STATION_ID,
      });

      // Pede ao main process para trocar para a janela do widget, passando os dados
      ipcRenderer.send("login-successful", { ...data, stationId: STATION_ID });
    } catch (error) {
      loginError.innerText = error.message;
    }
  }

  function handleResetShortcut(e) {
    if (e.ctrlKey && e.shiftKey && e.key === "F12") {
      if (
        confirm(
          "Deseja resetar a configuração de ID da Estação? O aplicativo será reiniciado."
        )
      ) {
        ipcRenderer.send("reset-config");
      }
    }
  }

  function setupDragListeners() {
    let isDragging = false;
    let lastMousePos = { x: 0, y: 0 };
    const dragTarget = document.querySelector(".draggable"); // O elemento que pode ser arrastado

    if (dragTarget) {
      dragTarget.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        isDragging = true;
        lastMousePos = { x: e.screenX, y: e.screenY };
      });
    }
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaY = e.screenY - lastMousePos.y;
      ipcRenderer.send("drag-widget", { deltaY });
      lastMousePos = { x: e.screenX, y: e.screenY };
    });
    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  function startSessionTimer(initialHours) {
    if (sessionInterval) clearInterval(sessionInterval);

    let remainingSeconds = initialHours * 3600;

    // Constantes para o sistema de alerta
    const WARNING_THRESHOLD_SECONDS = 15 * 60; // 15 minutos
    const SOUND_INTERVAL_SECONDS = 3 * 60; // 3 minutos
    let nextSoundAlertTime = WARNING_THRESHOLD_SECONDS;
    const warningSound = new Audio("./assets/sounds/time-warning.mp3");

    const sessionScreen = document.getElementById("session-screen");
    const timeLeftSpan = document.getElementById("time-left");

    const updateDisplay = () => {
      if (remainingSeconds < 0) remainingSeconds = 0;

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = Math.floor(remainingSeconds % 60);

      if (timeLeftSpan)
        timeLeftSpan.innerText = `${hours}h ${minutes}m ${seconds}s`;

      // --- LÓGICA DO ALERTA VISUAL ---
      if (remainingSeconds <= WARNING_THRESHOLD_SECONDS) {
        sessionScreen.classList.add("warning"); // Adiciona a classe de aviso
      } else {
        sessionScreen.classList.remove("warning"); // Remove se o tempo for adicionado
      }

      // --- LÓGICA DO ALERTA SONORO ---
      if (remainingSeconds <= nextSoundAlertTime && remainingSeconds > 0) {
        console.log(
          `[ALERTA] Tempo baixo! Tocando som de aviso. Próximo em ${SOUND_INTERVAL_SECONDS / 60} min.`
        );
        warningSound
          .play()
          .catch((e) => console.error("Erro ao tocar som:", e));
        // Define o próximo ponto de alerta
        nextSoundAlertTime -= SOUND_INTERVAL_SECONDS;
      }

      if (remainingSeconds === 0) {
        clearInterval(sessionInterval);
      }
      remainingSeconds--;
    };

    updateDisplay(); // Roda uma vez imediatamente
    sessionInterval = setInterval(updateDisplay, 1000);
  }

  function setupEmergencyClickListener(element) {
    let clickCount = 0;
    let clickTimer;

    element.addEventListener("click", () => {
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 2000);

      if (clickCount >= 5) {
        clickCount = 0;
        pinError.innerText = "";
        pinInput.value = "";
        pinModal.classList.remove("hidden");
        pinInput.focus();
      }
    });
  }

  // Configura os botões do modal de PIN
  if (pinConfirmBtn) {
    pinConfirmBtn.addEventListener("click", () => {
      const EMERGENCY_PIN = "2512";
      if (pinInput.value === EMERGENCY_PIN) {
        ipcRenderer.send("emergency-quit");
      } else {
        pinError.innerText = "PIN incorreto.";
        // Limpa o campo após um erro para nova tentativa
        pinInput.value = "";
        pinInput.focus();
      }
    });
  }

  if (pinCancelBtn) {
    pinCancelBtn.addEventListener("click", () => {
      pinModal.classList.add("hidden");
    });
  }

  // Chama a função para configurar o listener da logo
  if (logoImage) {
    setupEmergencyClickListener(logoImage);
  }
});
