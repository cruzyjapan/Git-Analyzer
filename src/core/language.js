import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export class LanguageManager {
    constructor() {
        this.configPath = path.join(os.homedir(), '.git-analyzer', 'language-settings.json');
        this.currentLanguage = this.loadLanguage();
        this.translations = this.loadTranslations();
    }

    loadLanguage() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = fs.readJsonSync(this.configPath);
                return config.language || 'ja';
            }
        } catch (error) {
            console.warn('Using default language: Japanese');
        }
        return 'ja'; // Default to Japanese
    }

    saveLanguage(language) {
        const configDir = path.dirname(this.configPath);
        fs.ensureDirSync(configDir);
        fs.writeJsonSync(this.configPath, { language }, { spaces: 2 });
        this.currentLanguage = language;
    }

    setLanguage(language) {
        if (!['ja', 'en'].includes(language)) {
            throw new Error(`Unsupported language: ${language}. Use 'ja' or 'en'`);
        }
        this.saveLanguage(language);
    }

    getLanguage() {
        return this.currentLanguage;
    }

    t(key, ...args) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            value = value?.[k];
            if (!value) break;
        }
        
        if (!value) {
            // Fallback to English if Japanese translation not found
            value = this.translations.en;
            for (const k of keys) {
                value = value?.[k];
                if (!value) break;
            }
        }
        
        if (!value) return key; // Return key if no translation found
        
        // Replace placeholders {0}, {1}, etc.
        if (args.length > 0) {
            for (let i = 0; i < args.length; i++) {
                value = value.replace(new RegExp(`\\{${i}\\}`, 'g'), args[i]);
            }
        }
        
        return value;
    }

    loadTranslations() {
        return {
            ja: {
                commands: {
                    help: 'ヘルプ',
                    interactiveHelp: '対話型ヘルプ',
                    quickHelp: 'クイックリファレンス',
                    contextHelp: 'コンテキスト対応ヘルプ',
                    filterHelp: 'フィルタリングヘルプ',
                    searchHelp: 'コマンド検索',
                    init: 'Git Analyzerを初期化',
                    analyze: 'ブランチ間の差分を解析',
                    report: 'レポートを生成',
                    branch: 'ブランチ管理',
                    pull: '最新の変更を取得',
                    forcePull: '強制Pull (ローカル変更を破棄)',
                    checkStatus: 'リポジトリのステータスを確認',
                    addRepo: 'リポジトリを追加',
                    listRepos: 'リポジトリ一覧',
                    removeRepo: 'リポジトリを削除',
                    setDefault: 'デフォルトリポジトリを設定'
                },
                messages: {
                    welcome: 'Git Analyzer へようこそ',
                    selectRepo: 'リポジトリを選択してください:',
                    repoAdded: 'リポジトリが追加されました: {0}',
                    repoRemoved: 'リポジトリが削除されました: {0}',
                    noRepos: '登録されたリポジトリがありません',
                    analyzing: '解析中...',
                    completed: '完了しました',
                    failed: '失敗しました: {0}',
                    cancelled: '操作がキャンセルされました',
                    confirmForcePull: '⚠️ ローカル変更が破棄されます。続行しますか？',
                    backupCreated: 'バックアップが作成されました: {0}',
                    restoredFromBackup: 'バックアップから復元されました'
                },
                analysis: {
                    summary: '概要',
                    filesChanged: '変更されたファイル',
                    linesAdded: '追加行数',
                    linesDeleted: '削除行数',
                    commits: 'コミット数',
                    insights: 'インサイト',
                    recommendations: '推奨事項',
                    issues: '検出された問題',
                    security: 'セキュリティ',
                    performance: 'パフォーマンス',
                    codeQuality: 'コード品質',
                    complexity: '複雑度',
                    highComplexity: '高複雑度',
                    mediumComplexity: '中複雑度',
                    lowComplexity: '低複雑度'
                },
                report: {
                    title: 'Git解析レポート',
                    generatedAt: '生成日時',
                    sourceBranch: 'ソースブランチ',
                    targetBranch: 'ターゲットブランチ',
                    fileStatus: 'ファイルステータス',
                    added: '追加',
                    modified: '変更',
                    deleted: '削除',
                    impact: '影響度',
                    high: '高',
                    medium: '中',
                    low: '低',
                    commitAnalysis: 'コミット解析',
                    commitsByType: 'タイプ別コミット',
                    topContributors: 'トップコントリビューター',
                    codeMetrics: 'コードメトリクス',
                    testCoverage: 'テストカバレッジ',
                    aiAnalysis: 'AI解析'
                },
                status: {
                    currentBranch: '現在のブランチ',
                    localChanges: 'ローカル変更',
                    modified: '変更',
                    added: '追加',
                    deleted: '削除',
                    untracked: '未追跡',
                    ahead: 'ahead',
                    behind: 'behind',
                    upToDate: '最新',
                    lastFetch: '最終フェッチ'
                },
                errors: {
                    notGitRepo: 'Gitリポジトリではありません',
                    branchNotFound: 'ブランチが見つかりません: {0}',
                    accessDenied: 'アクセスが拒否されました',
                    commandFailed: 'コマンドの実行に失敗しました',
                    fileNotFound: 'ファイルが見つかりません: {0}',
                    invalidConfig: '設定が無効です',
                    networkError: 'ネットワークエラー'
                }
            },
            en: {
                commands: {
                    help: 'Help',
                    interactiveHelp: 'Interactive Help',
                    quickHelp: 'Quick Reference',
                    contextHelp: 'Context-Aware Help',
                    filterHelp: 'Filtering Help',
                    searchHelp: 'Command Search',
                    init: 'Initialize Git Analyzer',
                    analyze: 'Analyze branch differences',
                    report: 'Generate reports',
                    branch: 'Manage branches',
                    pull: 'Pull latest changes',
                    forcePull: 'Force pull (discard local changes)',
                    checkStatus: 'Check repository status',
                    addRepo: 'Add repository',
                    listRepos: 'List repositories',
                    removeRepo: 'Remove repository',
                    setDefault: 'Set default repository'
                },
                messages: {
                    welcome: 'Welcome to Git Analyzer',
                    selectRepo: 'Select a repository:',
                    repoAdded: 'Repository added: {0}',
                    repoRemoved: 'Repository removed: {0}',
                    noRepos: 'No repositories registered',
                    analyzing: 'Analyzing...',
                    completed: 'Completed',
                    failed: 'Failed: {0}',
                    cancelled: 'Operation cancelled',
                    confirmForcePull: '⚠️ Local changes will be discarded. Continue?',
                    backupCreated: 'Backup created: {0}',
                    restoredFromBackup: 'Restored from backup'
                },
                analysis: {
                    summary: 'Summary',
                    filesChanged: 'Files Changed',
                    linesAdded: 'Lines Added',
                    linesDeleted: 'Lines Deleted',
                    commits: 'Commits',
                    insights: 'Insights',
                    recommendations: 'Recommendations',
                    issues: 'Issues Detected',
                    security: 'Security',
                    performance: 'Performance',
                    codeQuality: 'Code Quality',
                    complexity: 'Complexity',
                    highComplexity: 'High Complexity',
                    mediumComplexity: 'Medium Complexity',
                    lowComplexity: 'Low Complexity'
                },
                report: {
                    title: 'Git Analysis Report',
                    generatedAt: 'Generated',
                    sourceBranch: 'Source Branch',
                    targetBranch: 'Target Branch',
                    fileStatus: 'File Status',
                    added: 'Added',
                    modified: 'Modified',
                    deleted: 'Deleted',
                    impact: 'Impact',
                    high: 'High',
                    medium: 'Medium',
                    low: 'Low',
                    commitAnalysis: 'Commit Analysis',
                    commitsByType: 'Commits by Type',
                    topContributors: 'Top Contributors',
                    codeMetrics: 'Code Metrics',
                    testCoverage: 'Test Coverage',
                    aiAnalysis: 'AI Analysis'
                },
                status: {
                    currentBranch: 'Current Branch',
                    localChanges: 'Local Changes',
                    modified: 'Modified',
                    added: 'Added',
                    deleted: 'Deleted',
                    untracked: 'Untracked',
                    ahead: 'ahead',
                    behind: 'behind',
                    upToDate: 'Up to date',
                    lastFetch: 'Last Fetch'
                },
                errors: {
                    notGitRepo: 'Not a Git repository',
                    branchNotFound: 'Branch not found: {0}',
                    accessDenied: 'Access denied',
                    commandFailed: 'Command execution failed',
                    fileNotFound: 'File not found: {0}',
                    invalidConfig: 'Invalid configuration',
                    networkError: 'Network error'
                }
            }
        };
    }
}

// Singleton instance
let languageManager = null;

export function getLanguageManager() {
    if (!languageManager) {
        languageManager = new LanguageManager();
    }
    return languageManager;
}

// Shorthand for translation
export function t(key, ...args) {
    return getLanguageManager().t(key, ...args);
}