# Quick Start Guide - Git Analyzer

## 📦 Installation (5 minutes)

### Option 1: Automated Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/cruzyjapan/Git-Analyzer.git
cd Git-Analyzer

# Run automated setup
./init.sh
```

### Option 2: Manual Setup
```bash
# Clone the repository
git clone https://github.com/cruzyjapan/Git-Analyzer.git
cd Git-Analyzer

# Install dependencies
npm install

# Link as global command
npm link

# Set language preference (optional)
git-analyzer language ja  # For Japanese
```

## 🚀 First Analysis (2 minutes)

### Basic Usage
```bash
# Navigate to your Git repository
cd /path/to/your/repo

# Run analysis (interactive branch selection)
git-analyzer analyze

# Or specify branches directly
git-analyzer analyze --source develop --target main
```

### Output Example
```
╔════════════════════════════╗
║   📊 Git Analysis Report   ║
╚════════════════════════════╝

━━━ Summary ━━━
Source: develop → Target: main
Files Changed: 15
Lines: +245 / -82
Commits: 7

━━━ File Changes ━━━
✨ Added Files (3)
  components/UserProfile.jsx (+120/-0)
    📋 react-component - UIコンポーネント
    ⚡ 状態管理、イベント処理、API通信
```

## 💡 Common Use Cases

### 1. Quick Analysis Without AI
```bash
# Fast analysis, AI analysis skipped
git-analyzer analyze --skip-ai
```

### 2. Recent Changes Only
```bash
# Analyze last 7 days
git-analyzer analyze --since "7 days ago"

# Analyze specific date range
git-analyzer analyze --since "2024-01-01" --until "2024-01-31"
```

### 3. Focus on Specific Files
```bash
# JavaScript files only
git-analyzer analyze --file "**/*.js"

# Exclude test files
git-analyzer analyze --exclude "*.test.js,*.spec.js"
```

### 4. Generate Different Report Formats
```bash
# Markdown report
git-analyzer analyze --format markdown

# Excel report for management
git-analyzer analyze --format excel --output ./report

# CSV for data processing
git-analyzer analyze --format csv
```

## 🎯 Advanced Features

### Multiple Repository Management
```bash
# Add repositories
git-analyzer add-repo /path/to/repo1 --name "Frontend"
git-analyzer add-repo /path/to/repo2 --name "Backend"

# List all repositories
git-analyzer list-repos

# Select and analyze
git-analyzer  # Interactive selection
```

### AI-Powered Analysis
```bash
# Choose AI CLI interactively
git-analyzer analyze --ask-cli

# Use specific AI CLI
git-analyzer analyze --cli claude  # Comprehensive analysis
git-analyzer analyze --cli gemini  # Performance focus
git-analyzer analyze --cli codex   # Security focus
```

### Filtering Options
```bash
# By author
git-analyzer analyze --author "John Doe"

# By commit range
git-analyzer analyze --from-commit HEAD~10 --to-commit HEAD

# Combined filters
git-analyzer analyze \
  --since "30 days ago" \
  --author "Jane" \
  --file "src/**/*.js" \
  --exclude "*.test.js"
```

## 📊 Understanding the Output

### File Content Analysis
Each file shows:
- **Type**: Component, API, test file, etc.
- **Purpose**: What the file does
- **Structure**: Functions, classes, imports
- **Characteristics**: Async, error handling, etc.

### Change Tracking
For modified files:
- Added/removed functions
- Dependency changes
- Complexity changes
- Full diff display

### Terminal Colors
- 🟢 Green: Added files/lines
- 🟡 Yellow: Modified files
- 🔴 Red: Deleted files/lines
- 🔵 Blue: Information
- ⚪ White: File names

## 🛠️ Configuration

### Language Settings
```bash
# Set to Japanese (default)
git-analyzer language ja

# Set to English
git-analyzer language en
```

### Default Repository
```bash
# Set default repository
git-analyzer set-default <repo-id>

# Use last repository
git-analyzer --last-used
```

## 📋 Command Reference

| Command | Description |
|---------|-------------|
| `analyze` | Analyze branch differences |
| `add-repo` | Add repository to registry |
| `list-repos` | List all repositories |
| `pull --force` | Force pull with backup |
| `help` | Show detailed help |
| `help --quick` | Show this quick guide |

## 🆘 Troubleshooting

### "Not a Git repository" Error
```bash
# Make sure you're in a Git repository
git status

# Or specify repository path
git-analyzer analyze --repo-path /path/to/repo
```

### Permission Denied
```bash
# Add execute permission to init script
chmod +x init.sh

# Use sudo for global installation
sudo npm link
```

### AI CLI Not Found
```bash
# AI CLIs are optional, skip with:
git-analyzer analyze --skip-ai
```

## 📚 Next Steps

- Read full [README](README.md) for detailed features
- Check [CHANGELOG](CHANGELOG.md) for latest updates
- Report issues at [GitHub Issues](https://github.com/cruzyjapan/Git-Analyzer/issues)

## 🎉 Tips

1. **Start simple**: Use `--skip-ai` for quick analysis
2. **Use filters**: Focus on what matters with date/file filters
3. **Save reports**: Use `--output` to keep analysis history
4. **Terminal is enough**: Full analysis appears in terminal
5. **Combine filters**: Mix date, author, and file filters

---

**Happy Analyzing! 🚀**