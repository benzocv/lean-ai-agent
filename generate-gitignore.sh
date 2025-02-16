#!/bin/bash

# Define the list of directory and file patterns to ignore
IGNORE_PATTERNS=(
  "node_modules"   # Node.js dependencies
  "dist"           # Build output folder
  "build"          # Build folder
  "*.log"          # Log files
  "*.tmp"          # Temporary files
  "coverage"       # Test coverage reports
  "*.env"          # Environment files
  ".DS_Store"      # macOS metadata files
  "*.lock"         # Lock files
  "tmp"            # Temporary folders
  "*.bak"          # Backup files
  "*.swp"          # Swap files
  "__pycache__/"   # Compiled Python files
  "*.py[cod]"      # Python bytecode
  ".pytest_cache/" # pytest cache
  ".venv/"         # Python virtual environment
  "*.class"        # Compiled Java classes
  ".idea/"         # IntelliJ IDEA configuration
  "target/"        # Maven build folder
  ".gradle/"       # Gradle files
  ".next/"         # Next.js build directory
  ".nuxt/"         # Nuxt.js build directory
  "*.js.map"       # JavaScript source maps
  ".angular/"      # Angular CLI cache
  "*.iml"          # IntelliJ project files
  ".vscode/"       # VS Code settings
  "*.exe"          # Executables
  ".circleci/"     # CircleCI configuration
  ".github/"       # GitHub workflows
  ".gitlab-ci.yml" # GitLab CI configuration
  "vendor/"        # PHP dependencies
  "log/"           # Log folders
  "docs/_build/"   # Documentation build output
  "env/"           # Custom virtual environment
  "logs/"          # Log folder
  "tmp_data/"      # Temporary data folder
)

# Set the path for the .gitignore file in the root of your repository
GITIGNORE_FILE="$(git rev-parse --show-toplevel)/.gitignore"

# Check if the .gitignore file already exists
if [ -f "$GITIGNORE_FILE" ]; then
  echo "Updating existing .gitignore file at $GITIGNORE_FILE..."
else
  echo "Creating new .gitignore file at $GITIGNORE_FILE..."
fi

# Function to check if a parent directory is already in .gitignore
is_parent_ignored() {
  local path="$1"
  while [[ "$path" != "." && "$path" != "/" ]]; do
    path=$(dirname "$path")
    if grep -Fxq "$path" "$GITIGNORE_FILE"; then
      return 0
    fi
  done
  return 1
}

# Traverse the directory structure and find matches
find_matches() {
  for pattern in "${IGNORE_PATTERNS[@]}"; do
    # Find directories or files matching the pattern
    matches=$(find . -type d -name "$pattern" -o -type f -name "$pattern")
    for match in $matches; do
      # Remove the leading './' from the match
      clean_match=${match#./}
      # Check if the parent directory is already ignored
      if ! is_parent_ignored "$clean_match"; then
        # Add the match to the .gitignore file if not already present
        if ! grep -Fxq "$clean_match" "$GITIGNORE_FILE" 2>/dev/null; then
          echo "$clean_match" >> "$GITIGNORE_FILE"
          echo "Added $clean_match to .gitignore"
        else
          echo "$clean_match already exists in .gitignore"
        fi
      else
        echo "Skipped $clean_match as its parent is already ignored"
      fi
    done
  done
}

# Run the find_matches function
find_matches

# Remove duplicates (if any) and sort the .gitignore file
sort -u "$GITIGNORE_FILE" -o "$GITIGNORE_FILE"

echo "Updated .gitignore successfully:"
cat "$GITIGNORE_FILE"
