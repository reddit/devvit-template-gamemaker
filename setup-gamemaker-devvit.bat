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
set CLIENT_PUBLIC=%cd%\public

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
if not exist "public" (
    echo Error: This doesn't appear to be a Devvit project directory
    echo Make sure you're running this script from the root of your Devvit project
    exit /b 1
)

echo Setting up GameMaker game in Devvit project...
echo GameMaker directory: %GAMEMAKER_DIR%
echo Project name: %PROJECT_NAME%
echo Devvit project: %cd%

:: Copy all files from runner directory to public directory
echo Copying GameMaker files to game directory...
xcopy "%RUNNER_DIR%\*" "%CLIENT_PUBLIC%\" /Y /Q

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
echo - Core runtime files → public\ (root level)
echo.
