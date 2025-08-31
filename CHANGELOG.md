# Changelog

All notable changes to Git Analyzer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-08-31

### 🎉 Major Release - Advanced Code Analysis

### Added
- **ファイル内容解析機能** - 各ファイルの役割、目的、構造を自動分析
  - ファイルタイプの自動検出（React/Vue/Angular コンポーネント、API、テストファイルなど）
  - コード構造の解析（関数数、クラス数、複雑度）
  - 特徴の検出（非同期処理、エラーハンドリング、状態管理など）
  - 依存関係の分析

- **完全なDiff表示** - 各ファイルの実際のコード変更を表示
  - Markdownレポートに完全なdiffを含む
  - ターミナル表示でのdiffプレビュー

- **ターミナル表示機能** - 解析結果を直接ターミナルに表示
  - カラフルで見やすいフォーマット
  - ファイル変更の詳細表示
  - コミット統計とインサイト

- **機能変更の追跡** - 修正ファイルの機能的な変更を分析
  - 追加/削除された関数とメソッド
  - 追加/削除されたクラス
  - 依存関係の変更
  - 複雑度の変化

- **AI解析スキップオプション** - `--skip-ai`で高速解析

### Changed
- AI CLIの役割を統一（各CLIが包括的な解析を実行）
- レポート形式の改善（より詳細な情報を含む）
- ヘルプシステムの拡充

### Fixed
- Git diffの順序問題を修正（target...source）
- ファイルの追加/削除行数が正しく表示されない問題を修正

### Improved
- ドキュメントの大幅な改善
- フィルタリング機能の使いやすさ向上

## [2.0.0] - 2025-08-30

### Added
- **複数リポジトリ管理** - 複数のGitリポジトリを一元管理
- **強制Pull機能** - 自動バックアップ付き強制Pull
- **多言語対応** - 日本語/英語の切り替え
- **AI CLI動的選択** - プロジェクトごとの設定

### Changed
- リポジトリ選択UIの改善
- 設定ファイルの構造変更

## [1.0.0] - 2025-08-25

### Added
- 初回リリース
- 基本的な差分解析機能
- AI CLI統合（Claude, Gemini, Codex）
- 複数の出力形式（Markdown, Excel, CSV, HTML, Text）
- ブランチ環境の自動検出

---

## Roadmap

### Planned Features
- [ ] GitHub/GitLab/Bitbucket API統合
- [ ] リアルタイム解析ダッシュボード
- [ ] CI/CDパイプライン統合
- [ ] カスタムルールエンジン
- [ ] チームコラボレーション機能
- [ ] 高度な可視化チャート
- [ ] プラグインシステム
- [ ] VSCode拡張機能

### Under Consideration
- WebUI版の開発
- モバイルアプリ対応
- クラウドサービス連携
- 機械学習による予測分析