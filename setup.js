const { ipcRenderer } = require('electron');

const stationIdInput = document.getElementById('station-id-input');
const saveButton = document.getElementById('save-station-id-button');
const setupError = document.getElementById('setup-error');

saveButton.addEventListener('click', () => {
    const stationId = stationIdInput.value;
    if (!stationId || isNaN(parseInt(stationId))) {
        setupError.innerText = 'Por favor, insira um ID numérico válido.';
        return;
    }
    // Envia o ID para o processo main salvar
    ipcRenderer.send('save-station-id', parseInt(stationId));
});