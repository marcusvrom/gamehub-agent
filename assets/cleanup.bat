@echo off
echo.
echo ===================================================
echo      INICIANDO LIMPEZA DE SESSAO - GAME HUB
echo ===================================================
echo.

:: --- ENCERRA PROCESSOS PARA LIBERAR ARQUIVOS ---
echo Encerrando aplicativos abertos...
taskkill /F /IM chrome.exe /T > nul 2>&1
taskkill /F /IM msedge.exe /T > nul 2>&1
taskkill /F /IM steam.exe /T > nul 2>&1
taskkill /F /IM Discord.exe /T > nul 2>&1
taskkill /F /IM Spotify.exe /T > nul 2>&1
taskkill /F /IM WhatsApp.exe /T > nul 2>&1
taskkill /F /IM RiotClientServices.exe /T > nul 2>&1
taskkill /F /IM LeagueofLegends.exe /T > nul 2>&1
taskkill /F /IM VALORANT.exe /T > nul 2>&1
timeout /t 2 > nul


:: --- LIMPEZA DE NAVEGADORES ---
echo Limpando dados do Google Chrome...
rmdir /s /q "%localappdata%\Google\Chrome\User Data\Default"

echo Limpando dados do Microsoft Edge...
rmdir /s /q "%localappdata%\Microsoft\Edge\User Data\Default"


:: --- LIMPEZA DE APLICATIVOS DE JOGOS E COMUNICAÇÃO ---

echo Deslogando da Steam...
IF EXIST "C:\Program Files (x86)\Steam" (
    del /f /q "C:\Program Files (x86)\Steam\config\loginusers.vdf"
    del /f /q "C:\Program Files (x86)\Steam\config\config.vdf"
) ELSE (
    echo Steam nao encontrado no caminho padrao.
)

:: --- NOVA LIMPEZA DO RIOT CLIENT (VALORANT, LOL) ---
echo Deslogando do Riot Client...
IF EXIST "%localappdata%\Riot Games" (
    rmdir /s /q "%localappdata%\Riot Games"
) ELSE (
    echo Riot Client nao encontrado.
)

echo Deslogando do Discord...
IF EXIST "%appdata%\discord" (
    rmdir /s /q "%appdata%\discord\Cache"
    rmdir /s /q "%appdata%\discord\Local Storage"
    rmdir /s /q "%appdata%\discord\Session Storage"
) ELSE (
    echo Discord nao encontrado.
)

echo Deslogando do Spotify...
IF EXIST "%appdata%\Spotify" (
    rmdir /s /q "%appdata%\Spotify"
    rmdir /s /q "%localappdata%\Spotify"
) ELSE (
    echo Spotify nao encontrado.
)

echo Deslogando do WhatsApp...
IF EXIST "%appdata%\WhatsApp" (
    rmdir /s /q "%appdata%\WhatsApp"
) ELSE (
    echo WhatsApp nao encontrado.
)


:: --- LIMPEZA DE ARQUIVOS TEMPORARIOS DO WINDOWS ---
echo Limpando arquivos temporarios do sistema...
rmdir /s /q "%temp%"
mkdir "%temp%" > nul 2>&1
rmdir /s /q "%userprofile%\AppData\Local\Temp"
mkdir "%userprofile%\AppData\Local\Temp" > nul 2>&1

echo.
echo ===================================================
echo            LIMPEZA CONCLUIDA!
echo ===================================================
echo.