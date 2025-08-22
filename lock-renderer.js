const { ipcRenderer } = require('electron');

console.log('[LOCK-RENDERER] Script da tela de bloqueio carregado.');

const returnBtn = document.getElementById('return-login-btn');

if (returnBtn) {
    console.log('[LOCK-RENDERER] Botão "return-login-btn" encontrado.');
    returnBtn.addEventListener('click', () => {
        console.log('[LOCK-RENDERER] Botão clicado! Enviando mensagem "request-unlock" para o processo principal...');
        // Envia a mensagem para o processo principal pedindo o desbloqueio
        ipcRenderer.send('request-unlock');
        console.log('[LOCK-RENDERER] Mensagem enviada.');
    });
} else {
    console.error('[LOCK-RENDERER] ERRO CRÍTICO: O botão "return-login-btn" não foi encontrado no HTML.');
}