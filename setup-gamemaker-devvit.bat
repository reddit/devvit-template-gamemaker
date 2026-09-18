@echo off
setlocal enabledelayedexpansion

:: GameMaker to Devvit Setup Script
:: Usage: setup-gamemaker-devvit.bat "path\to\gamemaker\export\directory" "project-name"

if "%~1"=="" (
    echo Error: Please provide the GameMaker export directory path
    echo Usage: %0 "path\to\gamemaker\export\directory" "project-name"
    echo Example: %0 "C:\path\to\mygame_12345_VM" "my-awesome-game"
    exit /b 1
)

if "%~2"=="" (
    echo Error: Please provide a project name
    echo Usage: %0 "path\to\gamemaker\export\directory" "project-name"
    echo Example: %0 "C:\path\to\mygame_12345_VM" "my-awesome-game"
    exit /b 1
)

set GAMEMAKER_DIR=%~1
set PROJECT_NAME=%~2
:: Properly replace dash with underscore for subreddit name (needs to follow the pattern: ^[a-zA-Z][a-zA-Z0-9_]*$)
set "SUBREDDIT_NAME=%PROJECT_NAME:-=_%"
set RUNNER_DIR=%GAMEMAKER_DIR%\runner
set CLIENT_PUBLIC=%cd%\src\client\public
set CLIENT_ASSETS=%CLIENT_PUBLIC%\assets

:: Check if GameMaker directory exists
if not exist "%GAMEMAKER_DIR%" (
    echo Error: GameMaker directory does not exist: %GAMEMAKER_DIR%
    exit /b 1
)

:: Check if runner directory exists
if not exist "%RUNNER_DIR%" (
    echo Error: Runner directory does not exist: %RUNNER_DIR%
    exit /b 1
)

:: Check if we're in a Devvit project directory
if not exist "src\client\public" (
    echo Error: This doesn't appear to be a Devvit project directory
    echo Make sure you're running this script from the root of your Devvit project
    exit /b 1
)

echo Setting up GameMaker game in Devvit project...
echo GameMaker directory: %GAMEMAKER_DIR%
echo Project name: %PROJECT_NAME%
echo Devvit project: %cd%

:: Create assets directory if it doesn't exist
if not exist "%CLIENT_ASSETS%" mkdir "%CLIENT_ASSETS%"

:: Copy all files from GameMaker export directory (excluding subdirectories) to assets
echo Copying GameMaker files to game directory...
echo Copying files from main export directory to assets...
for %%f in ("%GAMEMAKER_DIR%\*") do (
    if not exist "%%f\" (
        copy "%%f" "%CLIENT_ASSETS%\" /Y >nul
    )
)

:: Copy all files from runner directory to public directory
echo Copying files from runner directory to public...
xcopy "%RUNNER_DIR%\*" "%CLIENT_PUBLIC%\" /Y /Q

:: Generate manifest of .js files in assets directory
echo Generating assets manifest...
set ASSETS_MANIFEST=%CLIENT_PUBLIC%\assets-manifest.json

:: Count files first
set count=0
for %%f in ("%CLIENT_ASSETS%\*.js") do (
    if exist "%%f" set /a count+=1
)

:: Write JSON array
echo [ > "%ASSETS_MANIFEST%"
set current=0
for %%f in ("%CLIENT_ASSETS%\*.js") do (
    if exist "%%f" (
        set /a current+=1
        if !current! equ !count! (
            echo   "assets/%%~nxf" >> "%ASSETS_MANIFEST%"
        ) else (
            echo   "assets/%%~nxf", >> "%ASSETS_MANIFEST%"
        )
    )
)
echo ] >> "%ASSETS_MANIFEST%"
echo Assets manifest created with !count! JavaScript file^(s^)

echo.
echo GameMaker game setup complete!
echo.
echo Project configured:
echo - Name: %PROJECT_NAME%
echo - GameMaker files: Copied
echo.
echo Next steps:
echo 1. Run "npm run dev" to start the development server
echo 2. Your GameMaker game should now load in the Devvit app
echo.
echo Files copied:
echo - Export directory files → src\client\public\assets\
echo - Core runtime files → src\client\public\ (root level)
echo - Assets manifest → src\client\public\assets-manifest.json
echo.
echo Note: Asset JavaScript files will be loaded automatically before runner.js
echo.
