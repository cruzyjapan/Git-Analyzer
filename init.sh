#!/bin/bash

#############################################
# Git Analyzer - 初期化スクリプト
# 
# このスクリプトは Git Analyzer の初期セットアップを行います
# - 依存関係のインストール
# - グローバルコマンドの設定
# - AI CLIツールの確認
# - 初期設定
#############################################

set -e  # エラーが発生したら即座に終了

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# バナー表示
show_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║     ██████╗ ██╗████████╗     █████╗ ███╗   ██╗ █████╗       ║"
    echo "║    ██╔════╝ ██║╚══██╔══╝    ██╔══██╗████╗  ██║██╔══██╗      ║"
    echo "║    ██║  ███╗██║   ██║       ███████║██╔██╗ ██║███████║      ║"
    echo "║    ██║   ██║██║   ██║       ██╔══██║██║╚██╗██║██╔══██║      ║"
    echo "║    ╚██████╔╝██║   ██║       ██║  ██║██║ ╚████║██║  ██║      ║"
    echo "║     ╚═════╝ ╚═╝   ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝      ║"
    echo "║                                                              ║"
    echo "║                 Git Analyzer Setup Script                    ║"
    echo "║                      Version 2.0.0                          ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ステップ表示
print_step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

# 成功メッセージ
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 警告メッセージ
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# エラーメッセージ
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Node.jsバージョンチェック
check_node_version() {
    print_step "Node.js バージョンチェック"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js がインストールされていません"
        echo "Node.js 18.0以上をインストールしてください: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
        print_success "Node.js $(node -v) が検出されました"
    else
        print_error "Node.js 18.0以上が必要です (現在: $(node -v))"
        exit 1
    fi
}

# Gitバージョンチェック
check_git_version() {
    print_step "Git バージョンチェック"
    
    if ! command -v git &> /dev/null; then
        print_error "Git がインストールされていません"
        echo "Git 2.0以上をインストールしてください: https://git-scm.com/"
        exit 1
    fi
    
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_success "Git $GIT_VERSION が検出されました"
}

# npmパッケージインストール
install_dependencies() {
    print_step "npm 依存関係のインストール"
    
    if [ -f "package.json" ]; then
        npm install
        print_success "依存関係のインストールが完了しました"
    else
        print_error "package.json が見つかりません"
        exit 1
    fi
}

# グローバルリンクの作成
create_global_link() {
    print_step "グローバルコマンドの設定"
    
    echo "Git Analyzer をグローバルコマンドとして登録しますか？"
    echo "これにより 'git-analyzer' コマンドがどこからでも使用できるようになります。"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm link
        print_success "グローバルコマンド 'git-analyzer' が登録されました"
    else
        print_warning "グローバルコマンドの登録をスキップしました"
        echo "後で 'npm link' を実行することで登録できます"
    fi
}

# AI CLIツールのチェック
check_ai_cli_tools() {
    print_step "AI CLI ツールの確認"
    
    local claude_installed=false
    local gemini_installed=false
    local codex_installed=false
    
    if command -v claude &> /dev/null; then
        print_success "Claude CLI が検出されました"
        claude_installed=true
    else
        print_warning "Claude CLI が見つかりません"
    fi
    
    if command -v gemini &> /dev/null; then
        print_success "Gemini CLI が検出されました"
        gemini_installed=true
    else
        print_warning "Gemini CLI が見つかりません"
    fi
    
    if command -v codex &> /dev/null; then
        print_success "Codex CLI が検出されました"
        codex_installed=true
    else
        print_warning "Codex CLI が見つかりません"
    fi
    
    if ! $claude_installed && ! $gemini_installed && ! $codex_installed; then
        echo
        print_warning "AI CLI ツールがインストールされていません"
        echo "AI 解析機能を使用するには、以下のいずれかをインストールしてください："
        echo "  • Claude CLI: npm install -g @anthropic/claude-cli"
        echo "  • Gemini CLI: npm install -g @google/gemini-cli"
        echo "  • Codex CLI:  npm install -g @openai/codex-cli"
        echo
        echo "注: AI CLI ツールがなくてもモック解析モードで動作します"
    fi
}

# 初期設定
initial_setup() {
    print_step "初期設定"
    
    # デフォルト言語の設定
    echo "デフォルト言語を選択してください:"
    echo "1) 日本語 (Japanese)"
    echo "2) English"
    read -p "選択 [1-2] (デフォルト: 1): " -n 1 -r lang_choice
    echo
    
    case "$lang_choice" in
        2)
            mkdir -p ~/.git-analyzer
            echo '{"language": "en"}' > ~/.git-analyzer/language-settings.json
            print_success "Default language set to English"
            ;;
        *)
            mkdir -p ~/.git-analyzer
            echo '{"language": "ja"}' > ~/.git-analyzer/language-settings.json
            print_success "デフォルト言語を日本語に設定しました"
            ;;
    esac
    
    # 初回リポジトリ登録
    echo
    read -p "現在のディレクトリをリポジトリとして登録しますか？ (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        CURRENT_DIR=$(pwd)
        REPO_NAME=$(basename "$CURRENT_DIR")
        
        if [ -d ".git" ]; then
            if command -v git-analyzer &> /dev/null; then
                git-analyzer add-repo "$CURRENT_DIR" --name "$REPO_NAME"
            else
                node src/index.js add-repo "$CURRENT_DIR" --name "$REPO_NAME"
            fi
            print_success "リポジトリ '$REPO_NAME' を登録しました"
        else
            print_warning "現在のディレクトリは Git リポジトリではありません"
        fi
    fi
}

# 環境変数ファイルの作成
create_env_file() {
    print_step "環境設定ファイルの作成"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success ".env ファイルを作成しました"
            echo "必要に応じて .env ファイルを編集してください"
        else
            print_warning ".env.example が見つかりません"
        fi
    else
        print_success ".env ファイルは既に存在します"
    fi
}

# 実行権限の付与
set_permissions() {
    print_step "実行権限の設定"
    
    chmod +x init.sh 2>/dev/null || true
    
    if [ -f "src/index.js" ]; then
        # シェバンが存在しない場合は追加
        if ! head -n 1 src/index.js | grep -q "^#!/usr/bin/env node"; then
            sed -i '1i#!/usr/bin/env node' src/index.js 2>/dev/null || \
            sed -i '' '1i\
#!/usr/bin/env node' src/index.js 2>/dev/null || true
        fi
        chmod +x src/index.js
        print_success "実行権限を設定しました"
    fi
}

# 完了メッセージ
show_completion_message() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║              🎉 セットアップが完了しました！ 🎉                ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    echo -e "${CYAN}使用方法:${NC}"
    
    if command -v git-analyzer &> /dev/null; then
        echo "  git-analyzer              # リポジトリ選択画面を表示"
        echo "  git-analyzer help         # ヘルプを表示"
        echo "  git-analyzer add-repo     # 新しいリポジトリを追加"
        echo "  git-analyzer analyze      # 差分解析を実行"
    else
        echo "  node src/index.js         # リポジトリ選択画面を表示"
        echo "  node src/index.js help    # ヘルプを表示"
        echo "  node src/index.js add-repo # 新しいリポジトリを追加"
        echo "  node src/index.js analyze # 差分解析を実行"
    fi
    
    echo
    echo -e "${CYAN}詳細なドキュメント:${NC}"
    echo "  README.md を参照してください"
    echo
    echo -e "${CYAN}言語設定:${NC}"
    if command -v git-analyzer &> /dev/null; then
        echo "  git-analyzer language ja  # 日本語"
        echo "  git-analyzer language en  # English"
    else
        echo "  node src/index.js language ja  # 日本語"
        echo "  node src/index.js language en  # English"
    fi
    echo
}

# エラーハンドラー
handle_error() {
    print_error "エラーが発生しました"
    echo "問題が解決しない場合は、以下を確認してください："
    echo "  1. Node.js 18.0以上がインストールされているか"
    echo "  2. Git 2.0以上がインストールされているか"
    echo "  3. package.json が存在するか"
    echo "  4. ネットワーク接続が正常か"
    exit 1
}

# トラップ設定
trap handle_error ERR

# メイン処理
main() {
    show_banner
    
    echo "Git Analyzer のセットアップを開始します..."
    echo
    
    check_node_version
    check_git_version
    install_dependencies
    create_global_link
    check_ai_cli_tools
    create_env_file
    set_permissions
    initial_setup
    
    show_completion_message
}

# スクリプト実行
main