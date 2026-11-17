#!/bin/bash

# GameMaker to Devvit Setup Script (Linux/macOS)
# Usage: ./setup-gamemaker-devvit.sh "path/to/gamemaker/export/directory" "project-name"

set -e  # Exit on any error

if [ "$#" -ne 2 ]; then
    echo "Error: Please provide both GameMaker export directory path and project name"
    echo "Usage: $0 \"path/to/gamemaker/export/directory\" \"project-name\""
    echo "Example: $0 \"/path/to/mygame_12345_VM\" \"my-awesome-game\""
    exit 1
fi

GAMEMAKER_DIR="$1"
PROJECT_NAME="$2"
# Properly replace dash with underscore for subreddit name (needs to follow the pattern: ^[a-zA-Z][a-zA-Z0-9_]*$)
SUBREDDIT_NAME="${PROJECT_NAME//-/_}"
RUNNER_DIR="$GAMEMAKER_DIR/runner"
CLIENT_PUBLIC="$(pwd)/src/client/public"
CLIENT_ASSETS="$CLIENT_PUBLIC/assets"

# Check if GameMaker directory exists
if [ ! -d "$GAMEMAKER_DIR" ]; then
    echo "Error: GameMaker directory does not exist: $GAMEMAKER_DIR"
    exit 1
fi

# Check if runner directory exists
if [ ! -d "$RUNNER_DIR" ]; then
    echo "Error: Runner directory does not exist: $RUNNER_DIR"
    exit 1
fi

# Check if we're in a Devvit project directory
if [ ! -d "src/client/public" ]; then
    echo "Error: This doesn't appear to be a Devvit project directory"
    echo "Make sure you're running this script from the root of your Devvit project"
    exit 1
fi

echo "Setting up GameMaker game in Devvit project..."
echo "GameMaker directory: $GAMEMAKER_DIR"
echo "Project name: $PROJECT_NAME"
echo "Devvit project: $(pwd)"

# Create assets directory if it doesn't exist
mkdir -p "$CLIENT_ASSETS"

# Copy all files from GameMaker export directory (excluding runner directory) to assets
echo "Copying GameMaker files to game directory..."
echo "Copying files from main export directory to assets..."
find "$GAMEMAKER_DIR" -maxdepth 1 -type f -exec cp {} "$CLIENT_ASSETS/" \;

# Copy all files from runner directory to game directory
echo "Copying files from runner directory to public..."
cp -r "$RUNNER_DIR"/* "$CLIENT_PUBLIC/"

# Generate manifest of .js files in assets directory
echo "Generating assets manifest..."
ASSETS_MANIFEST="$CLIENT_PUBLIC/assets-manifest.json"

# Collect all .js files first
js_files=()
for jsfile in "$CLIENT_ASSETS"/*.js; do
    if [ -f "$jsfile" ]; then
        js_files+=("$(basename "$jsfile")")
    fi
done

# Write JSON array
echo "[" > "$ASSETS_MANIFEST"
for i in "${!js_files[@]}"; do
    if [ $i -eq $((${#js_files[@]} - 1)) ]; then
        # Last item, no comma
        echo "  \"assets/${js_files[$i]}\"" >> "$ASSETS_MANIFEST"
    else
        # Not last item, add comma
        echo "  \"assets/${js_files[$i]}\"," >> "$ASSETS_MANIFEST"
    fi
done
echo "]" >> "$ASSETS_MANIFEST"
echo "Assets manifest created with ${#js_files[@]} JavaScript file(s)"

echo ""
echo "GameMaker game setup complete!"
echo ""
echo "Project configured:"
echo "- Name: $PROJECT_NAME"
echo "- GameMaker files: Copied"
echo ""
echo "Next steps:"
echo "1. Run \"npm run dev\" to start the development server"
echo "2. Your GameMaker game should now load in the Devvit app"
echo ""
echo "Files copied:"
echo "- Export directory files → src/client/public/assets/"
echo "- Core runtime files → src/client/public/ (root level)"
echo "- Assets manifest → src/client/public/assets-manifest.json"
echo ""
echo "Note: Asset JavaScript files will be loaded automatically before runner.js"
echo ""