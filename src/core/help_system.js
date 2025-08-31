import chalk from 'chalk';
import inquirer from 'inquirer';
import { getLanguageManager } from './language.js';

export class HelpSystem {
    constructor() {
        this.langManager = getLanguageManager();
        this.helpData = this.initializeHelpData();
    }

    initializeHelpData() {
        return {
            ja: {
                categories: {
                    repository: {
                        title: '🗂️ リポジトリ管理',
                        description: 'Git リポジトリの登録・管理・選択',
                        commands: [
                            {
                                name: 'add-repo',
                                syntax: 'git-analyzer add-repo [path] [options]',
                                description: 'リポジトリを登録します',
                                options: [
                                    { name: '--name <name>', description: 'リポジトリ名を指定' },
                                    { name: '--id <id>', description: 'カスタムIDを指定' },
                                    { name: '--auto-pull', description: '自動プル機能を有効化（デフォルト: true）' }
                                ],
                                examples: [
                                    'git-analyzer add-repo /path/to/repo --name "My Project"',
                                    'git-analyzer add-repo . --id my-app',
                                    'git-analyzer add-repo ~/projects/webapp --auto-pull false'
                                ],
                                tips: ['現在のディレクトリを追加する場合、パスを省略できます', '自動プル機能は解析時にリポジトリを最新状態に保ちます']
                            },
                            {
                                name: 'list-repos',
                                syntax: 'git-analyzer list-repos',
                                description: '登録済みリポジトリ一覧を表示',
                                examples: ['git-analyzer list-repos'],
                                tips: ['各リポジトリのIDと最終アクセス時刻も表示されます']
                            },
                            {
                                name: 'remove-repo',
                                syntax: 'git-analyzer remove-repo <id>',
                                description: 'リポジトリを登録から削除',
                                examples: ['git-analyzer remove-repo my-project'],
                                tips: ['IDまたはリポジトリパスで指定できます']
                            },
                            {
                                name: 'set-default',
                                syntax: 'git-analyzer set-default <id>',
                                description: 'デフォルトリポジトリを設定',
                                examples: ['git-analyzer set-default main-app'],
                                tips: ['デフォルト設定により、リポジトリ選択が自動化されます']
                            }
                        ]
                    },
                    analysis: {
                        title: '🔍 解析コマンド',
                        description: 'ブランチ比較・コミット解析・レポート生成',
                        commands: [
                            {
                                name: 'init',
                                syntax: 'git-analyzer init [path] [options]',
                                description: 'Git Analyzerの初期化とブランチ環境の設定',
                                options: [
                                    { name: '--auto-detect', description: 'ブランチ名から環境を自動検出' },
                                    { name: '--interactive', description: 'インタラクティブモードで設定' },
                                    { name: '--config <file>', description: '設定ファイルを使用' }
                                ],
                                examples: [
                                    'git-analyzer init --interactive',
                                    'git-analyzer init /path/to/repo --auto-detect',
                                    'git-analyzer init --config my-config.json'
                                ],
                                tips: ['初回実行時は --interactive オプションを推奨', '環境ブランチの適切な設定で精度向上']
                            },
                            {
                                name: 'analyze',
                                syntax: 'git-analyzer analyze [options]',
                                description: 'ブランチ間の差分解析を実行',
                                options: [
                                    { name: '--source <branch>', description: '比較元ブランチ（main-main等の重複名も対応）' },
                                    { name: '--target <branch>', description: '比較先ブランチ（同一指定で時系列比較）' },
                                    { name: '--commit <id>', description: '特定コミットを解析' },
                                    { name: '--from-commit <id>', description: '開始コミットID（範囲解析用）' },
                                    { name: '--to-commit <id>', description: '終了コミットID（範囲解析用）' },
                                    { name: '--since <date>', description: '指定日以降のコミット（YYYY-MM-DD）' },
                                    { name: '--until <date>', description: '指定日以前のコミット（YYYY-MM-DD）' },
                                    { name: '--author <name>', description: '作者名でフィルタリング' },
                                    { name: '--file <path>', description: '特定ファイル・パターンを解析' },
                                    { name: '--files <patterns>', description: '含めるファイルパターン（カンマ区切り）' },
                                    { name: '--exclude <patterns>', description: '除外するファイルパターン（カンマ区切り）' },
                                    { name: '--cli <type>', description: '使用するAI CLI（gemini|claude|codex）' },
                                    { name: '--ask-cli', description: 'CLI選択を強制的に表示' },
                                    { name: '--skip-ai', description: 'AI解析をスキップして高速実行' },
                                    { name: '--output <file>', description: '出力ファイルパス' },
                                    { name: '--format <type>', description: '出力形式（md|excel|csv|txt|html|terminal）' },
                                    { name: '--encoding <type>', description: '文字エンコーディング（utf8|sjis）' }
                                ],
                                examples: [
                                    'git-analyzer analyze --source develop --target main',
                                    'git-analyzer analyze --source main-main --target develop',
                                    'git-analyzer analyze --source main --target main --since "2 weeks ago"',
                                    'git-analyzer analyze --since "7 days ago" --author "John Doe"',
                                    'git-analyzer analyze --files "src/**/*.js" --exclude "*.test.js"',
                                    'git-analyzer analyze --cli claude --format terminal',
                                    'git-analyzer analyze --from-commit HEAD~10 --to-commit HEAD',
                                    'git-analyzer analyze --skip-ai --format markdown'
                                ],
                                tips: [
                                    'ブランチ未指定時は対話的選択になります',
                                    '重複パターン（main-main等）のブランチ名に対応',
                                    '同一ブランチ指定で時系列比較（デフォルト1週間）',
                                    'ファイルフィルタでより精密な解析が可能',
                                    '--skip-aiオプションで高速解析（AI分析なし）',
                                    '--format terminalでファイル出力なしで表示',
                                    '解析結果は自動的にターミナルに表示されます',
                                    'ファイル内容解析により各ファイルの役割が明確に',
                                    '環境変数DEFAULT_AI_CLIで自動CLI選択可能',
                                    '大規模な変更セットは時間がかかる場合があります'
                                ]
                            }
                        ]
                    },
                    branch: {
                        title: '🌿 ブランチ管理',
                        description: 'ブランチの管理と環境設定',
                        commands: [
                            {
                                name: 'branch list',
                                syntax: 'git-analyzer branch list',
                                description: 'ブランチ一覧と環境マッピングを表示',
                                examples: ['git-analyzer branch list'],
                                tips: ['各ブランチに対応する環境（本番/ステージング/開発）も表示']
                            },
                            {
                                name: 'branch detect',
                                syntax: 'git-analyzer branch detect',
                                description: '環境ブランチを自動検出',
                                examples: ['git-analyzer branch detect'],
                                tips: ['ブランチ名のパターンから環境を推測します']
                            },
                            {
                                name: 'branch set-prod',
                                syntax: 'git-analyzer branch set-prod [branch]',
                                description: '本番ブランチを手動設定',
                                examples: ['git-analyzer branch set-prod main'],
                                tips: ['ブランチ名省略時は対話的選択になります']
                            }
                        ]
                    },
                    git: {
                        title: '⚡ Git操作',
                        description: 'プル・バックアップ・状態確認',
                        commands: [
                            {
                                name: 'pull',
                                syntax: 'git-analyzer pull [options]',
                                description: 'リモートから最新変更を取得',
                                options: [
                                    { name: '--force', description: 'ローカル変更を破棄して強制プル' },
                                    { name: '--yes', description: '確認プロンプトをスキップ' },
                                    { name: '--backup', description: '強制プル前にバックアップ作成' },
                                    { name: '--no-backup', description: 'バックアップ作成をスキップ' },
                                    { name: '--preserve <files>', description: '保持するファイル（カンマ区切り）' },
                                    { name: '--dry-run', description: '実行せずに影響を確認' }
                                ],
                                examples: [
                                    'git-analyzer pull',
                                    'git-analyzer pull --force --backup',
                                    'git-analyzer pull --force --preserve ".env,config.json"',
                                    'git-analyzer pull --dry-run'
                                ],
                                tips: [
                                    '⚠️ --force は全てのローカル変更を破棄します',
                                    'バックアップは ~/.git-analyzer/backups に保存',
                                    '--dry-run で事前に影響を確認することを推奨'
                                ]
                            },
                            {
                                name: 'restore-backup',
                                syntax: 'git-analyzer restore-backup [options]',
                                description: 'バックアップからリストア',
                                options: [
                                    { name: '--latest', description: '最新のバックアップを使用（デフォルト）' },
                                    { name: '--date <timestamp>', description: '特定日時のバックアップを指定' }
                                ],
                                examples: [
                                    'git-analyzer restore-backup',
                                    'git-analyzer restore-backup --date 2024-01-15T10:30:00'
                                ],
                                tips: ['バックアップ一覧から選択してリストアできます']
                            },
                            {
                                name: 'check-status',
                                syntax: 'git-analyzer check-status',
                                description: 'リポジトリ状態を詳細確認',
                                examples: ['git-analyzer check-status'],
                                tips: ['プル前の状態確認に最適です']
                            }
                        ]
                    },
                    report: {
                        title: '📊 レポート生成',
                        description: '解析結果のレポート出力',
                        commands: [
                            {
                                name: 'report',
                                syntax: 'git-analyzer report [options]',
                                description: '解析レポートを生成',
                                options: [
                                    { name: '--all', description: '全環境のレポートを生成' },
                                    { name: '--env <type>', description: '特定環境のレポートのみ' },
                                    { name: '--template <file>', description: 'カスタムテンプレートを使用' }
                                ],
                                examples: [
                                    'git-analyzer report --all',
                                    'git-analyzer report --env production',
                                    'git-analyzer report --template my-template.md'
                                ],
                                tips: ['多様な出力形式（MD/Excel/CSV）に対応']
                            }
                        ]
                    },
                    settings: {
                        title: '⚙️ 設定',
                        description: '言語・AI CLI・その他設定',
                        commands: [
                            {
                                name: 'language',
                                syntax: 'git-analyzer language [lang]',
                                description: '表示言語の設定・確認',
                                examples: [
                                    'git-analyzer language',
                                    'git-analyzer language ja',
                                    'git-analyzer language en'
                                ],
                                tips: ['対応言語: ja（日本語）、en（英語）']
                            },
                            {
                                name: 'cli',
                                syntax: 'git-analyzer cli [action]',
                                description: 'AI CLI設定の管理',
                                examples: [
                                    'git-analyzer cli status',
                                    'git-analyzer cli config',
                                    'git-analyzer cli reset'
                                ],
                                tips: ['利用可能なCLIツールの確認と設定が可能']
                            }
                        ]
                    }
                },
                global: {
                    title: 'グローバルオプション',
                    options: [
                        { name: '--repo <id>', description: '特定リポジトリをIDで指定' },
                        { name: '--repo-path <path>', description: 'リポジトリをパスで指定' },
                        { name: '--last-used', description: '最後に使用したリポジトリを使用' }
                    ]
                },
                quickReference: {
                    title: 'クイックリファレンス',
                    sections: [
                        {
                            title: '初回セットアップ',
                            steps: [
                                'git-analyzer add-repo . --name "My Project"',
                                'git-analyzer init --interactive',
                                'git-analyzer analyze --source develop --target main'
                            ]
                        },
                        {
                            title: '日常的な使用',
                            steps: [
                                'git-analyzer pull --force --backup  # 最新状態に更新',
                                'git-analyzer analyze  # ブランチ比較解析',
                                'git-analyzer report --all  # レポート生成'
                            ]
                        },
                        {
                            title: '高度なフィルタリング',
                            steps: [
                                'git-analyzer analyze --files "*.js,*.ts" --exclude "*.test.*"',
                                'git-analyzer analyze --since 2024-01-01 --author "John"',
                                'git-analyzer analyze --cli claude --format excel'
                            ]
                        }
                    ]
                }
            },
            en: {
                categories: {
                    repository: {
                        title: '🗂️ Repository Management',
                        description: 'Register, manage, and select Git repositories',
                        commands: [
                            {
                                name: 'add-repo',
                                syntax: 'git-analyzer add-repo [path] [options]',
                                description: 'Add a repository to registry',
                                options: [
                                    { name: '--name <name>', description: 'Specify repository name' },
                                    { name: '--id <id>', description: 'Specify custom ID' },
                                    { name: '--auto-pull', description: 'Enable auto-pull feature (default: true)' }
                                ],
                                examples: [
                                    'git-analyzer add-repo /path/to/repo --name "My Project"',
                                    'git-analyzer add-repo . --id my-app',
                                    'git-analyzer add-repo ~/projects/webapp --auto-pull false'
                                ],
                                tips: ['Path can be omitted when adding current directory', 'Auto-pull keeps repository up-to-date during analysis']
                            },
                            {
                                name: 'list-repos',
                                syntax: 'git-analyzer list-repos',
                                description: 'List all registered repositories',
                                examples: ['git-analyzer list-repos'],
                                tips: ['Shows repository IDs and last access times']
                            },
                            {
                                name: 'remove-repo',
                                syntax: 'git-analyzer remove-repo <id>',
                                description: 'Remove repository from registry',
                                examples: ['git-analyzer remove-repo my-project'],
                                tips: ['Can specify by ID or repository path']
                            },
                            {
                                name: 'set-default',
                                syntax: 'git-analyzer set-default <id>',
                                description: 'Set default repository',
                                examples: ['git-analyzer set-default main-app'],
                                tips: ['Default setting automates repository selection']
                            }
                        ]
                    },
                    analysis: {
                        title: '🔍 Analysis Commands',
                        description: 'Branch comparison, commit analysis, and report generation',
                        commands: [
                            {
                                name: 'init',
                                syntax: 'git-analyzer init [path] [options]',
                                description: 'Initialize Git Analyzer and configure branch environments',
                                options: [
                                    { name: '--auto-detect', description: 'Auto-detect environments from branch names' },
                                    { name: '--interactive', description: 'Use interactive mode for setup' },
                                    { name: '--config <file>', description: 'Use configuration file' }
                                ],
                                examples: [
                                    'git-analyzer init --interactive',
                                    'git-analyzer init /path/to/repo --auto-detect',
                                    'git-analyzer init --config my-config.json'
                                ],
                                tips: ['Recommend --interactive for first-time setup', 'Proper environment branch configuration improves accuracy']
                            },
                            {
                                name: 'analyze',
                                syntax: 'git-analyzer analyze [options]',
                                description: 'Perform branch difference analysis',
                                options: [
                                    { name: '--source <branch>', description: 'Source branch for comparison' },
                                    { name: '--target <branch>', description: 'Target branch for comparison' },
                                    { name: '--commit <id>', description: 'Analyze specific commit' },
                                    { name: '--from-commit <id>', description: 'Start commit ID (for range analysis)' },
                                    { name: '--to-commit <id>', description: 'End commit ID (for range analysis)' },
                                    { name: '--since <date>', description: 'Commits since date (YYYY-MM-DD)' },
                                    { name: '--until <date>', description: 'Commits until date (YYYY-MM-DD)' },
                                    { name: '--author <name>', description: 'Filter by author name' },
                                    { name: '--file <path>', description: 'Analyze specific file/pattern' },
                                    { name: '--files <patterns>', description: 'Include file patterns (comma-separated)' },
                                    { name: '--exclude <patterns>', description: 'Exclude file patterns (comma-separated)' },
                                    { name: '--cli <type>', description: 'AI CLI to use (gemini|claude|codex)' },
                                    { name: '--ask-cli', description: 'Force CLI selection dialog' },
                                    { name: '--output <file>', description: 'Output file path' },
                                    { name: '--format <type>', description: 'Output format (md|excel|csv|txt)' },
                                    { name: '--encoding <type>', description: 'Character encoding (utf8|sjis)' }
                                ],
                                examples: [
                                    'git-analyzer analyze --source develop --target main',
                                    'git-analyzer analyze --since 2024-01-01 --author "John Doe"',
                                    'git-analyzer analyze --files "*.js,*.ts" --exclude "*.test.*"',
                                    'git-analyzer analyze --cli claude --format excel',
                                    'git-analyzer analyze --from-commit abc123 --to-commit def456'
                                ],
                                tips: [
                                    'Interactive selection when branches not specified',
                                    'File filters enable more precise analysis',
                                    'AI CLI selection changes analysis perspective',
                                    'Large changesets may take time to process'
                                ]
                            }
                        ]
                    },
                    branch: {
                        title: '🌿 Branch Management',
                        description: 'Manage branches and environment configuration',
                        commands: [
                            {
                                name: 'branch list',
                                syntax: 'git-analyzer branch list',
                                description: 'Display branch list and environment mappings',
                                examples: ['git-analyzer branch list'],
                                tips: ['Shows environment (prod/staging/dev) for each branch']
                            },
                            {
                                name: 'branch detect',
                                syntax: 'git-analyzer branch detect',
                                description: 'Auto-detect environment branches',
                                examples: ['git-analyzer branch detect'],
                                tips: ['Infers environments from branch name patterns']
                            },
                            {
                                name: 'branch set-prod',
                                syntax: 'git-analyzer branch set-prod [branch]',
                                description: 'Manually set production branch',
                                examples: ['git-analyzer branch set-prod main'],
                                tips: ['Interactive selection when branch name omitted']
                            }
                        ]
                    },
                    git: {
                        title: '⚡ Git Operations',
                        description: 'Pull, backup, and status operations',
                        commands: [
                            {
                                name: 'pull',
                                syntax: 'git-analyzer pull [options]',
                                description: 'Pull latest changes from remote',
                                options: [
                                    { name: '--force', description: 'Discard local changes and force pull' },
                                    { name: '--yes', description: 'Skip confirmation prompts' },
                                    { name: '--backup', description: 'Create backup before force pull' },
                                    { name: '--no-backup', description: 'Skip backup creation' },
                                    { name: '--preserve <files>', description: 'Files to preserve (comma-separated)' },
                                    { name: '--dry-run', description: 'Show what would be done without doing it' }
                                ],
                                examples: [
                                    'git-analyzer pull',
                                    'git-analyzer pull --force --backup',
                                    'git-analyzer pull --force --preserve ".env,config.json"',
                                    'git-analyzer pull --dry-run'
                                ],
                                tips: [
                                    '⚠️ --force will discard ALL local changes',
                                    'Backups stored in ~/.git-analyzer/backups',
                                    'Recommend --dry-run to check impact first'
                                ]
                            },
                            {
                                name: 'restore-backup',
                                syntax: 'git-analyzer restore-backup [options]',
                                description: 'Restore from backup',
                                options: [
                                    { name: '--latest', description: 'Use latest backup (default)' },
                                    { name: '--date <timestamp>', description: 'Specify backup by date' }
                                ],
                                examples: [
                                    'git-analyzer restore-backup',
                                    'git-analyzer restore-backup --date 2024-01-15T10:30:00'
                                ],
                                tips: ['Can select from available backup list']
                            },
                            {
                                name: 'check-status',
                                syntax: 'git-analyzer check-status',
                                description: 'Check detailed repository status',
                                examples: ['git-analyzer check-status'],
                                tips: ['Perfect for pre-pull status verification']
                            }
                        ]
                    },
                    report: {
                        title: '📊 Report Generation',
                        description: 'Generate analysis result reports',
                        commands: [
                            {
                                name: 'report',
                                syntax: 'git-analyzer report [options]',
                                description: 'Generate analysis reports',
                                options: [
                                    { name: '--all', description: 'Generate reports for all environments' },
                                    { name: '--env <type>', description: 'Generate report for specific environment' },
                                    { name: '--template <file>', description: 'Use custom template file' }
                                ],
                                examples: [
                                    'git-analyzer report --all',
                                    'git-analyzer report --env production',
                                    'git-analyzer report --template my-template.md'
                                ],
                                tips: ['Supports multiple output formats (MD/Excel/CSV)']
                            }
                        ]
                    },
                    settings: {
                        title: '⚙️ Settings',
                        description: 'Language, AI CLI, and other configurations',
                        commands: [
                            {
                                name: 'language',
                                syntax: 'git-analyzer language [lang]',
                                description: 'Set or show display language',
                                examples: [
                                    'git-analyzer language',
                                    'git-analyzer language ja',
                                    'git-analyzer language en'
                                ],
                                tips: ['Supported languages: ja (Japanese), en (English)']
                            },
                            {
                                name: 'cli',
                                syntax: 'git-analyzer cli [action]',
                                description: 'Manage AI CLI settings',
                                examples: [
                                    'git-analyzer cli status',
                                    'git-analyzer cli config',
                                    'git-analyzer cli reset'
                                ],
                                tips: ['Check and configure available CLI tools']
                            }
                        ]
                    }
                },
                global: {
                    title: 'Global Options',
                    options: [
                        { name: '--repo <id>', description: 'Specify repository by ID' },
                        { name: '--repo-path <path>', description: 'Specify repository by path' },
                        { name: '--last-used', description: 'Use last accessed repository' }
                    ]
                },
                quickReference: {
                    title: 'Quick Reference',
                    sections: [
                        {
                            title: 'Initial Setup',
                            steps: [
                                'git-analyzer add-repo . --name "My Project"',
                                'git-analyzer init --interactive',
                                'git-analyzer analyze --source develop --target main'
                            ]
                        },
                        {
                            title: 'Daily Usage',
                            steps: [
                                'git-analyzer pull --force --backup  # Update to latest',
                                'git-analyzer analyze  # Branch comparison',
                                'git-analyzer report --all  # Generate reports'
                            ]
                        },
                        {
                            title: 'Advanced Filtering',
                            steps: [
                                'git-analyzer analyze --files "*.js,*.ts" --exclude "*.test.*"',
                                'git-analyzer analyze --since 2024-01-01 --author "John"',
                                'git-analyzer analyze --cli claude --format excel'
                            ]
                        }
                    ]
                }
            }
        };
    }

    async showHelp(command = null, options = {}) {
        const lang = this.langManager.getLanguage();
        const helpData = this.helpData[lang];

        if (!command) {
            return await this.showMainHelp(helpData, options);
        } else {
            return await this.showCommandHelp(command, helpData, options);
        }
    }

    async showMainHelp(helpData, options = {}) {
        console.log(this.createBanner());
        
        if (options.interactive) {
            return await this.showInteractiveHelp(helpData);
        }

        if (options.quick) {
            return this.showQuickReference(helpData);
        }

        this.showCategoryOverview(helpData);
        this.showGlobalOptions(helpData);
        this.showNavigationHelp();
    }

    async showInteractiveHelp(helpData) {
        const choices = [
            { name: `${helpData.quickReference.title} (クイックスタート)`, value: 'quick' },
            ...Object.entries(helpData.categories).map(([key, category]) => ({
                name: `${category.title} - ${category.description}`,
                value: key
            })),
            { name: '終了 / Exit', value: 'exit' }
        ];

        while (true) {
            console.clear();
            console.log(this.createBanner());
            
            const { selection } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selection',
                    message: 'ヘルプの種類を選択してください / Select help category:',
                    choices,
                    pageSize: 10
                }
            ]);

            if (selection === 'exit') break;
            
            if (selection === 'quick') {
                this.showQuickReference(helpData);
                await this.waitForKeyPress();
                continue;
            }

            const category = helpData.categories[selection];
            await this.showCategoryDetail(category, helpData);
            await this.waitForKeyPress();
        }
    }

    async showCategoryDetail(category, helpData) {
        console.clear();
        console.log(chalk.cyan(`\n${category.title}\n${'='.repeat(50)}\n`));
        console.log(chalk.gray(category.description + '\n'));

        for (const command of category.commands) {
            this.displayCommandDetail(command);
            console.log(''); // Add spacing between commands
        }

        // Show if user wants to see specific command help
        const commandChoices = category.commands.map(cmd => ({
            name: `${cmd.name} - ${cmd.description}`,
            value: cmd.name
        }));
        commandChoices.push({ name: '戻る / Back', value: 'back' });

        const { commandSelection } = await inquirer.prompt([
            {
                type: 'list',
                name: 'commandSelection',
                message: '詳細を見るコマンドを選択 / Select command for details:',
                choices: commandChoices
            }
        ]);

        if (commandSelection !== 'back') {
            const selectedCommand = category.commands.find(cmd => cmd.name === commandSelection);
            this.showDetailedCommandHelp(selectedCommand);
            await this.waitForKeyPress();
        }
    }

    showCategoryOverview(helpData) {
        console.log(chalk.yellow('\n📖 Available Command Categories:\n'));
        
        Object.entries(helpData.categories).forEach(([key, category]) => {
            console.log(`  ${category.title}`);
            console.log(chalk.gray(`    ${category.description}`));
            console.log(chalk.gray(`    コマンド数 / Commands: ${category.commands.length}\n`));
        });
    }

    showGlobalOptions(helpData) {
        console.log(chalk.yellow(`${helpData.global.title}:\n`));
        helpData.global.options.forEach(option => {
            console.log(`  ${chalk.white(option.name.padEnd(25))} ${chalk.gray(option.description)}`);
        });
        console.log('');
    }

    showQuickReference(helpData) {
        console.log(chalk.cyan(`\n${helpData.quickReference.title}\n${'='.repeat(50)}\n`));
        
        helpData.quickReference.sections.forEach(section => {
            console.log(chalk.yellow(`${section.title}:`));
            section.steps.forEach((step, index) => {
                console.log(`  ${index + 1}. ${chalk.white(step)}`);
            });
            console.log('');
        });
    }

    showNavigationHelp() {
        const lang = this.langManager.getLanguage();
        if (lang === 'ja') {
            console.log(chalk.gray('\n使用方法:'));
            console.log('  git-analyzer help --interactive  # 対話型ヘルプ');
            console.log('  git-analyzer help --quick        # クイックリファレンス');
            console.log('  git-analyzer help <command>      # 特定コマンドのヘルプ');
            console.log('  git-analyzer <command> --help    # Commander.jsネイティブヘルプ');
        } else {
            console.log(chalk.gray('\nUsage:'));
            console.log('  git-analyzer help --interactive  # Interactive help');
            console.log('  git-analyzer help --quick        # Quick reference');
            console.log('  git-analyzer help <command>      # Specific command help');
            console.log('  git-analyzer <command> --help    # Commander.js native help');
        }
    }

    async showCommandHelp(commandName, helpData, options = {}) {
        // Search for command across all categories
        let foundCommand = null;
        let foundCategory = null;

        for (const [categoryKey, category] of Object.entries(helpData.categories)) {
            const command = category.commands.find(cmd => 
                cmd.name === commandName || cmd.name.includes(commandName)
            );
            if (command) {
                foundCommand = command;
                foundCategory = category;
                break;
            }
        }

        if (!foundCommand) {
            console.log(chalk.red(`\nCommand '${commandName}' not found in help system.\n`));
            console.log(chalk.gray('Available commands:'));
            
            Object.values(helpData.categories).forEach(category => {
                category.commands.forEach(cmd => {
                    console.log(`  ${cmd.name}`);
                });
            });
            return;
        }

        console.log(chalk.cyan(`\n${foundCategory.title}\n`));
        this.displayCommandDetail(foundCommand);
        
        if (options.context) {
            await this.showContextAwareHelp(commandName, foundCommand);
        }
    }

    displayCommandDetail(command) {
        console.log(chalk.white.bold(`${command.name}`));
        console.log(chalk.gray(`  ${command.description}\n`));
        
        console.log(chalk.yellow('Syntax:'));
        console.log(`  ${chalk.white(command.syntax)}\n`);

        if (command.options && command.options.length > 0) {
            console.log(chalk.yellow('Options:'));
            command.options.forEach(option => {
                console.log(`  ${chalk.white(option.name.padEnd(25))} ${chalk.gray(option.description)}`);
            });
            console.log('');
        }

        if (command.examples && command.examples.length > 0) {
            console.log(chalk.yellow('Examples:'));
            command.examples.forEach((example, index) => {
                console.log(`  ${index + 1}. ${chalk.green(example)}`);
            });
            console.log('');
        }

        if (command.tips && command.tips.length > 0) {
            console.log(chalk.yellow('Tips:'));
            command.tips.forEach(tip => {
                console.log(`  💡 ${chalk.cyan(tip)}`);
            });
            console.log('');
        }
    }

    showDetailedCommandHelp(command) {
        console.clear();
        console.log(chalk.cyan(`\n${command.name} - Detailed Help\n${'='.repeat(50)}\n`));
        this.displayCommandDetail(command);
    }

    async showContextAwareHelp(commandName, command) {
        // Check repository state and provide contextual suggestions
        try {
            const { RepositoryRegistry } = await import('./repository_registry.js');
            const registry = new RepositoryRegistry();
            const repos = await registry.listRepositories();
            
            console.log(chalk.yellow('\n🎯 Context-Aware Suggestions:\n'));
            
            if (repos.length === 0 && commandName !== 'add-repo') {
                console.log(chalk.cyan('  💡 No repositories registered yet. Try:'));
                console.log(`     ${chalk.white('git-analyzer add-repo . --name "My Project"')}`);
            }
            
            if (commandName === 'analyze') {
                console.log(chalk.cyan('  🔍 For better analysis results:'));
                console.log(`     • Run ${chalk.white('git-analyzer pull --force --backup')} first`);
                console.log(`     • Use ${chalk.white('--files "*.js,*.ts"')} to focus on specific file types`);
                console.log(`     • Try ${chalk.white('--cli claude')} for detailed code review`);
            }
            
        } catch (error) {
            // Context-aware help is optional, don't fail if it can't load
        }
    }

    createBanner() {
        return chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                     📖 Git Analyzer Help                    ║
║                    Enhanced Help System v2.0                ║
╚══════════════════════════════════════════════════════════════╝`);
    }

    async waitForKeyPress() {
        const lang = this.langManager.getLanguage();
        const message = lang === 'ja' 
            ? '\n続けるにはEnterキーを押してください...' 
            : '\nPress Enter to continue...';
            
        await inquirer.prompt([
            {
                type: 'input',
                name: 'continue',
                message: chalk.gray(message),
            }
        ]);
    }

    // Utility method to search commands by keyword
    searchCommands(keyword) {
        const lang = this.langManager.getLanguage();
        const helpData = this.helpData[lang];
        const results = [];

        Object.entries(helpData.categories).forEach(([categoryKey, category]) => {
            category.commands.forEach(command => {
                if (command.name.includes(keyword) || 
                    command.description.toLowerCase().includes(keyword.toLowerCase()) ||
                    command.examples?.some(ex => ex.includes(keyword))) {
                    results.push({
                        command: command.name,
                        category: category.title,
                        description: command.description
                    });
                }
            });
        });

        return results;
    }

    // Method to show help based on filters (for filtering documentation)
    showFilteringHelp() {
        const lang = this.langManager.getLanguage();
        const title = lang === 'ja' ? '🎯 高度なフィルタリング' : '🎯 Advanced Filtering';
        const description = lang === 'ja' ? 
            '解析対象を精密に制御するためのフィルタリングオプション' :
            'Filtering options for precise control of analysis targets';

        console.log(chalk.cyan(`\n${title}\n${'='.repeat(50)}\n`));
        console.log(chalk.gray(description + '\n'));

        const filterOptions = [
            {
                category: lang === 'ja' ? 'ファイルフィルタ' : 'File Filters',
                options: [
                    { name: '--files <patterns>', description: lang === 'ja' ? 'インクルードパターン（カンマ区切り）' : 'Include patterns (comma-separated)' },
                    { name: '--exclude <patterns>', description: lang === 'ja' ? 'エクスクルードパターン（カンマ区切り）' : 'Exclude patterns (comma-separated)' },
                    { name: '--file <path>', description: lang === 'ja' ? '特定ファイルのみ解析' : 'Analyze specific file only' }
                ]
            },
            {
                category: lang === 'ja' ? '時間フィルタ' : 'Time Filters',
                options: [
                    { name: '--since <date>', description: lang === 'ja' ? '指定日以降のコミット (YYYY-MM-DD)' : 'Commits since date (YYYY-MM-DD)' },
                    { name: '--until <date>', description: lang === 'ja' ? '指定日以前のコミット (YYYY-MM-DD)' : 'Commits until date (YYYY-MM-DD)' },
                    { name: '--from-commit <id>', description: lang === 'ja' ? '開始コミットID' : 'Start commit ID' },
                    { name: '--to-commit <id>', description: lang === 'ja' ? '終了コミットID' : 'End commit ID' }
                ]
            },
            {
                category: lang === 'ja' ? '作者フィルタ' : 'Author Filters',
                options: [
                    { name: '--author <name>', description: lang === 'ja' ? '作者名で絞り込み' : 'Filter by author name' }
                ]
            }
        ];

        filterOptions.forEach(section => {
            console.log(chalk.yellow(`${section.category}:`));
            section.options.forEach(option => {
                console.log(`  ${chalk.white(option.name.padEnd(25))} ${chalk.gray(option.description)}`);
            });
            console.log('');
        });

        console.log(chalk.yellow(lang === 'ja' ? 'フィルタリング例:' : 'Filtering Examples:'));
        const examples = [
            'git-analyzer analyze --files "*.js,*.ts" --exclude "*.test.*,*.spec.*"',
            'git-analyzer analyze --since 2024-01-01 --until 2024-12-31',
            'git-analyzer analyze --author "John Doe" --files "src/**/*.js"',
            'git-analyzer analyze --from-commit abc123 --to-commit def456'
        ];

        examples.forEach((example, index) => {
            console.log(`  ${index + 1}. ${chalk.green(example)}`);
        });
    }
}

// Singleton instance
let helpSystem = null;

export function getHelpSystem() {
    if (!helpSystem) {
        helpSystem = new HelpSystem();
    }
    return helpSystem;
}