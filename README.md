# Git Analyzer 🔍

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/cruzyjapan/Git-Analyzer/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)](https://github.com/cruzyjapan/Git-Analyzer)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org)
[![AI Powered](https://img.shields.io/badge/AI-Powered-purple.svg)](https://github.com/cruzyjapan/Git-Analyzer#ai-cli統合)
[![Multi-language](https://img.shields.io/badge/i18n-JA%20%7C%20EN-blue.svg)](https://github.com/cruzyjapan/Git-Analyzer#多言語対応)

強力な**読み取り専用**Git リポジトリ解析ツール。AI CLIツール（Claude、Gemini、Codex）を活用して変更履歴を自動解析し、包括的なレポートを生成します。

## ✨ 主な機能

### 🗂️ 複数リポジトリ管理
- 複数のGitリポジトリを一元管理
- インタラクティブなリポジトリ選択UI
- デフォルトリポジトリの設定
- 最後に使用したリポジトリの記憶

### 🔄 強制Pull機能
- ローカル変更の完全破棄と最新状態への更新
- 自動バックアップ機能
- バックアップからの復元
- ドライラン（実行せずに影響確認）

### 🌍 多言語対応
- 日本語・英語の切り替え可能
- デフォルト言語：日本語
- レポート・メッセージの完全ローカライズ

### 🤖 AI CLI統合
- **ローカルCLIツールとの連携**（APIキー不要）
  - Claude CLI (`claude`) - 包括的な解析（コードレビュー、パフォーマンス、セキュリティ）
  - Gemini CLI (`gemini`) - 包括的な解析（コードレビュー、パフォーマンス、セキュリティ）
  - Codex CLI (`codex`) - 包括的な解析（コードレビュー、パフォーマンス、セキュリティ）
- **対話的なCLI選択** - 解析ごとに最適なCLIを選択
- **プロジェクト別設定** - プロジェクトごとにデフォルトCLI設定
- **AI解析スキップ** - `--skip-ai`オプションでAI解析をスキップ可能
- 自動的なコード品質分析
- セキュリティ問題の検出
- パフォーマンス改善提案

### 📊 高度な解析機能
- 🔒 **100% 読み取り専用操作** - リポジトリを変更しません
- 🎯 **環境自動検出** - 本番/ステージング/開発ブランチを自動識別
- 📈 **包括的メトリクス** - 複雑度、品質スコア、保守性指標
- 🔍 **深層コード解析** - バグ、セキュリティ、パフォーマンス問題検出
- 📝 **多様な出力形式** - Markdown、Excel、CSV、HTML、テキスト、ターミナル
- 📋 **ファイル内容解析** - ファイルの役割、目的、構造を自動分析
- 🔄 **機能変更追跡** - 追加/削除された関数、クラス、依存関係を検出
- 🖥️ **ターミナル表示** - 解析結果を直接ターミナルに表示
- 🎨 **完全なdiff表示** - 各ファイルの実際のコード変更を表示
- 🌿 **柔軟なブランチ名対応** - 様々な命名規則に対応（main-main、dev-dev等）
- ⏱️ **同一ブランチ時系列比較** - 同じブランチの過去と現在を比較

## 🚀 クイックスタート

### 自動セットアップ（推奨）

```bash
# リポジトリをクローン
git clone https://github.com/cruzyjapan/Git-Analyzer.git
cd Git-Analyzer

# 初期化スクリプトを実行（対話的セットアップ）
./init.sh
```

初期化スクリプト（`init.sh`）は以下を自動的に行います：
- ✅ Node.js/Git バージョンチェック
- ✅ npm 依存関係のインストール
- ✅ グローバルコマンドの登録
- ✅ AI CLIツールの確認
- ✅ デフォルト言語の設定
- ✅ 初回リポジトリの登録

### 手動インストール

```bash
# リポジトリをクローン
git clone https://github.com/cruzyjapan/Git-Analyzer.git
cd Git-Analyzer

# 依存関係をインストール
npm install

# CLIツールをグローバルで利用可能に
npm link

# 言語設定（オプション）
git-analyzer language ja  # 日本語設定
```

### AI CLIツールのインストール (オプション)

```bash
# Claude CLIのインストール
npm install -g @anthropic/claude-cli

# Gemini CLIのインストール  
npm install -g @google/gemini-cli

# Codex CLIのインストール
npm install -g @openai/codex-cli
```

*注: AI CLIツールがインストールされていない場合は、モック解析が使用されます。*

### 基本的な使い方

```bash
# リポジトリを追加
git-analyzer add-repo /path/to/repo --name "プロジェクト名"

# リポジトリ選択画面を表示
git-analyzer

# 言語を設定（デフォルト：日本語）
git-analyzer language ja  # 日本語
git-analyzer language en  # English

# ブランチ間の差分を解析（対話的にCLIを選択）
git-analyzer analyze --source develop --target main

# 特定のCLIを指定して解析
git-analyzer analyze --source develop --target main --cli claude

# 全環境のレポートを生成
git-analyzer report --all --format excel

# 強制Pull（ローカル変更を破棄）
git-analyzer pull --force --backup
```

### 🤖 AI CLI の動的選択

```bash
# 解析ごとにCLIを選択（デフォルト動作）
git-analyzer analyze --source develop --target main

# 強制的にCLI選択画面を表示
git-analyzer analyze --source develop --target main --ask-cli

# CLI設定を管理
git-analyzer cli status   # 現在の設定を表示
git-analyzer cli config   # 設定を変更
git-analyzer cli reset    # 設定をリセット
```

#### CLI選択画面の例
```
🤖 AI CLI選択

利用可能なCLI:
  🤖 Claude CLI
     詳細なコードレビューと品質分析
  🚀 Gemini CLI
     パフォーマンスと最適化の解析
  🔒 Codex CLI
     セキュリティと脆弱性の検出

使用するAI CLIを選択してください:
❯ Claude CLI - 詳細なコードレビューと品質分析
  Gemini CLI - パフォーマンスと最適化の解析
  Codex CLI - セキュリティと脆弱性の検出

この選択を保存しますか？
❯ 今回のみ
  このプロジェクトのデフォルトに設定
  全体のデフォルトに設定
  毎回選択する
```

## 📖 コマンド一覧

### リポジトリ管理

| コマンド | 説明 |
|---------|------|
| `add-repo [path]` | リポジトリをレジストリに追加 |
| `list-repos` | 登録済みリポジトリを一覧表示 |
| `remove-repo <id>` | リポジトリを削除 |
| `set-default <id>` | デフォルトリポジトリを設定 |
| `update-repo <id>` | リポジトリ設定を更新 |

### Git操作

| コマンド | 説明 |
|---------|------|
| `pull` | 通常のGit Pull |
| `pull --force` | 強制Pull（ローカル変更を破棄） |
| `pull --force --backup` | バックアップ付き強制Pull |
| `check-status` | リポジトリステータスを確認 |
| `restore-backup` | 最新のバックアップから復元 |

### 解析・レポート

| コマンド | 説明 |
|---------|------|
| `init` | Git Analyzerを初期化 |
| `analyze` | ブランチ間の差分を解析 |
| `report` | 解析レポートを生成 |
| `branch <action>` | ブランチ管理操作 |

### その他

| コマンド | 説明 |
|---------|------|
| `language [lang]` | 言語を設定 (ja/en) |
| `help [command]` | ヘルプを表示 |

## 🔧 オプション

### グローバルオプション

```bash
--repo <id>           # 特定のリポジトリをIDで指定
--repo-path <path>    # 特定のリポジトリをパスで指定
--last-used          # 最後に使用したリポジトリを使用
```

### 解析オプション

```bash
# 基本オプション
--source <branch>     # 比較元ブランチ（main-main等の重複名にも対応）
--target <branch>     # 比較先ブランチ（同一ブランチ指定で時系列比較）
--cli <type>         # 使用するAI CLI (claude|gemini|codex)
--output <file>      # 出力ファイルパス
--format <type>      # 出力形式 (md|excel|csv|txt|html|terminal)

# フィルタリングオプション
--commit <id>        # 特定のコミットを解析
--from-commit <id>   # 開始コミットID (例: HEAD~10)
--to-commit <id>     # 終了コミットID (例: HEAD)
--since <date>       # 指定日以降のコミット (例: "2024-01-01")
--until <date>       # 指定日までのコミット (例: "2024-12-31")
--author <name>      # 特定の作者でフィルタ
--file <path>        # 特定のファイルパターン (例: "src/**/*.js")
--files <patterns>   # 複数ファイルパターン (例: "src/*.js,test/*.js")
--exclude <patterns> # 除外パターン (例: "*.test.js,*.spec.js")
```

### 強制Pullオプション

```bash
--force              # 強制実行（ローカル変更を破棄）
--yes               # 確認プロンプトをスキップ
--backup            # バックアップを作成
--no-backup         # バックアップをスキップ
--preserve <files>  # 特定ファイルを保持（カンマ区切り）
--dry-run          # 実行せずに影響を確認
```

## 🔍 フィルタリング使用例

### ブランチ名パターン
```bash
# 重複パターンのブランチ名対応
git-analyzer analyze --source main-main --target develop
git-analyzer analyze --source dev-dev --target staging-staging

# 同一ブランチの時系列比較（自動で1週間前からの変更を表示）
git-analyzer analyze --source main --target main

# 同一ブランチで期間を指定
git-analyzer analyze --source main --target main --since "2 weeks ago"
```

### 期間指定の解析
```bash
# 過去30日間の変更を解析
git-analyzer analyze --source develop --target main --since "30 days ago"

# 特定期間の変更を解析
git-analyzer analyze --source develop --target main --since "2024-01-01" --until "2024-03-31"
```

### ファイルパターン指定
```bash
# JavaScriptファイルのみ解析
git-analyzer analyze --source develop --target main --file "**/*.js"

# 複数のパターンを指定
git-analyzer analyze --source develop --target main --files "src/**/*.js,test/**/*.spec.js"

# テストファイルを除外
git-analyzer analyze --source develop --target main --exclude "*.test.js,*.spec.js"
```

### コミット指定
```bash
# 特定のコミットを解析
git-analyzer analyze --source develop --target main --commit abc123

# コミット範囲を指定
git-analyzer analyze --source develop --target main --from-commit HEAD~10 --to-commit HEAD
```

### 作者指定
```bash
# 特定の作者の変更のみ解析
git-analyzer analyze --source develop --target main --author "John Doe"
```

### 複合フィルタ
```bash
# 複数のフィルタを組み合わせて解析
git-analyzer analyze \
  --source develop \
  --target main \
  --since "7 days ago" \
  --author "Jane" \
  --file "src/**/*.js" \
  --exclude "*.test.js"
```

### AI解析なしで実行
```bash
# AI解析をスキップして高速に実行
git-analyzer analyze --source develop --target main --skip-ai
```

## 🗂️ リポジトリ選択画面

```
╔════════════════════════════════════════════╗
║     Git Analyzer - リポジトリ選択          ║
╚════════════════════════════════════════════╝

登録済みリポジトリ:

  1. プロジェクトA - ECサイト
     📁 /Users/dev/projects/ec-site
     🕒 最終解析: 2025-01-01 10:00
     
  2. プロジェクトB - 管理システム
     📁 /Users/dev/projects/admin-system
     🕒 最終解析: 2024-12-25 15:30
     
  3. プロジェクトC - モバイルAPI
     📁 /Users/dev/projects/mobile-api
     🕒 最終解析: 未実施
     
  4. 新規リポジトリを追加
  
  0. 終了

リポジトリを選択してください [1-4, 0]: _
```

## 🔄 強制Pull実行フロー

1. **ローカル状態の記録**
2. **ローカル変更の破棄** (`git reset --hard HEAD`)
3. **未追跡ファイルの削除** (`git clean -fd`)
4. **リモート情報の取得** (`git fetch --all --prune`)
5. **ブランチの強制更新** (`git reset --hard origin/branch`)
6. **サブモジュールの更新** (該当する場合)

## 💾 バックアップ機能

強制Pull実行前に自動的にバックアップを作成：

```
.git-analyzer/
└── backups/
    └── 2025-01-03_143022/
        ├── changed_files/    # 変更されたファイル
        ├── added_files/      # 追加されたファイル
        ├── untracked_files/  # 未追跡ファイル
        └── backup_info.json  # バックアップ情報
```

復元コマンド：
```bash
git-analyzer restore-backup --latest     # 最新のバックアップから復元
git-analyzer restore-backup --date 2025-01-03_143022  # 特定のバックアップから復元
```

## 📊 解析結果の表示

### ターミナル表示
解析実行時、結果が自動的にターミナルに表示されます：

```
╔════════════════════════════╗
║   📊 Git Analysis Report   ║
╚════════════════════════════╝

━━━ File Changes ━━━
✨ Added Files (2)
  component.js (+45/-0)
    📋 react-component - UIコンポーネント
    Reactコンポーネントとして機能し、5個の関数を含みます
    ⚡ 非同期処理、状態管理、イベント処理

📝 Modified Files (3)
  api/users.js (+25/-10)
    📋 api-rest - RESTful API、ビジネスロジック
    🔄 Changes: +2 functions, +1 deps
    主な変更: 認証機能の追加、エラーハンドリング改善
```

## 🎯 新機能の詳細

### 📋 ファイル内容解析
各ファイルの詳細な解析結果を提供：

- **ファイルタイプの自動検出**: React/Vue/Angular コンポーネント、API、データベースモデル、テストファイルなど
- **ファイルの目的と役割**: APIエンドポイント、UIコンポーネント、ビジネスロジック、ユーティリティなど
- **コード構造の解析**: 関数数、クラス数、インポート、エクスポート、複雑度
- **特徴の検出**: 非同期処理、エラーハンドリング、状態管理、API通信、データベース操作など
- **依存関係の分析**: 使用しているライブラリとモジュール

### 🔄 機能変更の追跡
修正ファイルの機能的な変更を詳細に分析：

- **追加/削除された関数とメソッド**
- **追加/削除されたクラス**
- **依存関係の変更**
- **複雑度の変化**
- **ファイルの目的の変更**

### 📝 完全なDiff表示
各ファイルの実際のコード変更を表示：

```diff
@@ -1,5 +1,8 @@
 function existingFunction() {
   // existing code
 }
+
+function newFunction() {
+  // new implementation
+}
```

## 📊 レポート形式

### Markdown レポート
- 包括的な解析結果とフォーマット
- ドキュメントやコードレビューに最適
- 絵文字インジケーター付き
- **ファイル内容解析**: 各ファイルの役割、目的、構造を詳細表示
- **完全なdiff表示**: 実際のコード変更を含む
- **機能変更の追跡**: 追加/削除された関数、クラス、依存関係

### Excel レポート
- 複数シート構成（サマリー、ファイル、コミット、問題）
- 管理レポートに理想的
- フィルター・ソート可能

### CSV レポート
- シンプルな表形式
- 他ツールへのインポートが容易
- データ処理パイプラインに適合

### HTML レポート
- スタイル付きの読みやすい形式
- ブラウザで開ける
- 非技術者との共有に最適

## 🛠️ トラブルシューティング

### init.sh が実行できない場合

```bash
# 実行権限を付与
chmod +x init.sh

# Bashで直接実行
bash init.sh
```

### npm link でエラーが発生する場合

```bash
# sudo権限で実行（macOS/Linux）
sudo npm link

# Windows の場合は管理者権限でコマンドプロンプトを開いて実行
npm link
```

### AI CLIツールが認識されない場合

各CLIツールがPATHに含まれているか確認：
```bash
which claude   # Claude CLI
which gemini   # Gemini CLI
which codex    # Codex CLI
```

## 🔒 セキュリティ機能

- **読み取り専用操作**: すべてのGitコマンドは厳密に読み取り専用
- **コマンド検証**: 危険なコマンドをブロック
- **パス検証**: パストラバーサル攻撃を防止
- **入力検証**: すべてのユーザー入力をサニタイズ
- **監査ログ**: セキュリティレビュー用にすべての操作を記録

## 🎯 使用例

### 1. リリース前の解析
```bash
git-analyzer analyze --source develop --target main --cli claude
```

### 2. 全環境レポート生成
```bash
git-analyzer report --all --format excel
```

### 3. 強制Pullとバックアップ
```bash
git-analyzer pull --force --backup
```

### 4. 特定リポジトリの直接解析
```bash
git-analyzer analyze --repo project-a --source feature/new --target develop
```

## 📈 解析されるメトリクス

- **複雑度メトリクス**
  - 循環的複雑度
  - 認知的複雑度
  - ネストの深さ
  - Halsteadメトリクス

- **品質指標**
  - コード重複
  - ドキュメントカバレッジ
  - テストカバレッジ比率
  - 保守性指標

- **問題検出**
  - 潜在的バグ
  - セキュリティ脆弱性
  - パフォーマンスボトルネック
  - コードスメル

## 🤝 貢献

貢献を歓迎します！Pull Requestをお気軽に送信してください。

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 🆘 サポート

- **ドキュメント**: [docs](docs/)フォルダを参照
- **問題報告**: [GitHub Issues](https://github.com/cruzyjapan/Git-Analyzer/issues)
- **質問**: [GitHub Discussions](https://github.com/cruzyjapan/Git-Analyzer/discussions)

## 🏗️ アーキテクチャ

```
git-analyzer/
├── src/
│   ├── core/          # コアCLI、エラー処理、言語管理
│   ├── git/           # Git操作（読み取り専用）、強制Pull
│   ├── ai/            # AI CLI統合（ローカルCLI）
│   ├── analysis/      # コード解析エンジン
│   └── output/        # レポート生成
├── config/            # デフォルト設定
├── templates/         # レポートテンプレート
├── tests/            # テストスイート
├── init.sh           # 初期化スクリプト
├── package.json      # プロジェクト設定
└── README.md         # ドキュメント
```

## ⚡ パフォーマンス

- 10,000以上のコミットを持つリポジトリに対応
- 最大1GBのコードベースを解析
- ほとんどのリポジトリで30秒以内にレポート生成
- パフォーマンス向上のための解析結果キャッシュ

## 🔄 ロードマップ

- [ ] GitHub/GitLab/Bitbucket API統合
- [ ] リアルタイム解析ダッシュボード
- [ ] CI/CDパイプライン統合
- [ ] カスタムルールエンジン
- [ ] チームコラボレーション機能
- [ ] 高度な可視化チャート
- [ ] プラグインシステム

## 👥 作者

- Development Team

## 🙏 謝辞

- Node.jsと最新のJavaScriptで構築
- AI CLIツール（Claude、Gemini、Codex）を活用
- コード解析のベストプラクティスに基づく

---

**バージョン**: 3.0.0  
**最終更新**: 2025-08-31

## 📝 更新履歴

### v3.0.0 (2025-08-31)
- ✨ ファイル内容の詳細解析機能を追加
- ✨ 完全なdiff表示機能を実装
- ✨ ターミナルでの解析結果直接表示
- ✨ 機能変更の追跡（関数、クラス、依存関係）
- ✨ 高度なフィルタリング機能の強化
- 🐛 Git diffの順序修正
- 📚 ドキュメントとヘルプシステムの改善

### v2.0.0
- 複数リポジトリ管理機能
- 強制Pull機能
- 多言語対応
- AI CLI動的選択

### v1.0.0
- 初回リリース
- 基本的な解析機能
- AI CLI統合