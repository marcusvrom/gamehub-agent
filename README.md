# Agente de PC - Game Hub Agent

Este é o aplicativo de desktop, construído com Electron.js, que deve ser instalado em cada estação de jogo do Game Hub. Ele é o "braço executor" do sistema, responsável por controlar a experiência do cliente diretamente no computador.

## Principais Funcionalidades

- **Modo Quiosque Seguro:** Inicia em tela cheia e bloqueia atalhos do sistema (`Alt+F4`, `Alt+Tab`, `F11`) para impedir que o cliente saia do ambiente controlado.
- **Configuração por Máquina:** Na primeira execução em um novo PC, o Agente solicita um **ID de Estação**, vinculando aquele computador a uma estação específica no painel de administrador.
- **Login do Cliente:** Oferece uma tela de login para que o cliente inicie sua sessão usando seu CPF.
- **Controle de Sessão em Tempo Real:** Comunica-se via Socket.IO com o servidor para:
    - Iniciar e encerrar sessões.
    - Receber atualizações de tempo (quando um admin adiciona horas remotamente).
    - Receber comandos de bloqueio de tela.
- **Widget de Sessão:** Após o login, exibe um widget discreto e móvel no canto da tela, mostrando o nome do cliente e um cronômetro regressivo com o tempo restante.
- **Alertas Visuais e Sonoros:** O widget muda de cor e emite sons de alerta quando o tempo da sessão está próximo de acabar.
- **Limpeza Automática:** Executa um script de limpeza (`cleanup.bat`) ao final de cada sessão para deslogar contas de jogos (Steam, Riot Client), navegadores e apagar arquivos temporários, garantindo a privacidade e a segurança para o próximo cliente.
- **Atualização Automática:** Possui um sistema de auto-update integrado com o GitHub Releases. Uma vez instalado, o Agente se atualiza sozinho sempre que uma nova versão for publicada.

## Tecnologias Utilizadas

- **Electron.js:** Framework para criar aplicativos de desktop com HTML, CSS e JavaScript.
- **Node.js:** Ambiente de execução para os processos do Electron.
- **Socket.IO Client:** Biblioteca para a comunicação em tempo real com o servidor.
- **`electron-log`:** Para salvar logs de execução em arquivos de texto.
- **`electron-forge`:** Para empacotar e criar o instalador (`.exe`).

## Configuração e Instalação em um Novo PC

1.  **Pré-requisito:** O servidor da API do Game Hub precisa estar no ar e acessível pela internet.
2.  **Gerar o Instalador:** No seu ambiente de desenvolvimento, rode o comando `npm run make` para criar o arquivo de setup `.exe`.
3.  **Instalar:** Leve o instalador gerado para o PC da loja e execute-o.
4.  **Configurar Scripts Externos:**
    * Crie a pasta `C:\GameHub\` no PC.
    * Coloque os scripts `cleanup.bat` e `run-as-admin.vbs` dentro desta pasta. Verifique se os caminhos dentro do `cleanup.bat` (ex: para a pasta da Steam) estão corretos para a instalação daquela máquina.
5.  **Configuração Inicial do Agente:**
    * Execute o Agente pela primeira vez.
    * Uma tela de "Configuração Inicial" aparecerá, pedindo o **ID da Estação**.
    * Insira o número do ID correspondente a este PC (você pode ver os IDs na tela de "Estações" do seu painel de administrador).
    * Salve. O aplicativo será reiniciado e irá para a tela de login normal, agora permanentemente configurado para aquela estação.
6.  **Atalho de Reset:** Se precisar reconfigurar o ID de uma estação, vá para a tela de login e pressione o atalho `Ctrl + Shift + F12`. Após confirmar o PIN, o aplicativo reiniciará na tela de setup.

## Desenvolvimento

- **Instalar dependências:** `npm install`
- **Executar em modo de desenvolvimento:** `npm start`
- **Configuração:** O Agente armazena seu `config.json` e os arquivos de log na pasta de dados do usuário. Para encontrá-la no Windows, pressione `Win + R` e digite `%appdata%\gamehub-agent`.

## Publicando uma Nova Versão (Auto-Update)

1.  Após fazer suas alterações no código, incremente a `version` no arquivo `package.json` (ex: de `1.0.0` para `1.0.1`). Você pode usar o comando `npm version patch`.
2.  Envie suas alterações para o repositório do GitHub, incluindo as tags:
    ```bash
    git push && git push --tags
    ```
3.  No seu terminal, configure seu token de acesso do GitHub e publique:
    ```bash
    # Para Git Bash / PowerShell
    $env:GITHUB_TOKEN="seu_token_aqui"
    npm run publish
    ```
Após a publicação, os Agentes instalados nos PCs irão detectar, baixar e instalar a nova versão automaticamente na próxima vez que forem iniciados.