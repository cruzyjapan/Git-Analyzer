import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';

export class CLISelector {
    constructor() {
        this.configPath = path.join(os.homedir(), '.git-analyzer', 'cli-preferences.json');
        this.availableCLIs = [];
        this.preferences = this.loadPreferences();
        this.checkAvailableCLIs();
    }

    loadPreferences() {
        try {
            if (fs.existsSync(this.configPath)) {
                return fs.readJsonSync(this.configPath);
            }
        } catch (error) {
            console.warn('Could not load CLI preferences');
        }
        
        return {
            defaultCLI: null,
            lastUsedCLI: null,
            askEveryTime: true,
            cliPriority: ['claude', 'gemini', 'codex'],
            projectDefaults: {}
        };
    }

    savePreferences() {
        const configDir = path.dirname(this.configPath);
        fs.ensureDirSync(configDir);
        fs.writeJsonSync(this.configPath, this.preferences, { spaces: 2 });
    }

    checkAvailableCLIs() {
        const clis = [
            { 
                name: 'claude', 
                displayName: 'Claude CLI',
                description: '詳細なコードレビューと品質分析',
                command: 'claude',
                installCommand: 'npm install -g @anthropic/claude-cli'
            },
            { 
                name: 'gemini', 
                displayName: 'Gemini CLI',
                description: 'パフォーマンスと最適化の解析',
                command: 'gemini',
                installCommand: 'npm install -g @google/gemini-cli'
            },
            { 
                name: 'codex', 
                displayName: 'Codex CLI',
                description: 'セキュリティと脆弱性の検出',
                command: 'codex',
                installCommand: 'npm install -g @openai/codex-cli'
            }
        ];

        this.availableCLIs = [];
        
        for (const cli of clis) {
            try {
                execSync(`which ${cli.command}`, { stdio: 'ignore' });
                this.availableCLIs.push(cli);
            } catch {
                // CLI not available
            }
        }

        // モックCLIは追加しない（実際のCLIのみ使用）
    }

    async selectCLI(options = {}) {
        // コマンドラインで指定されている場合
        if (options.cli) {
            const selected = this.availableCLIs.find(c => c.name === options.cli);
            if (selected) {
                this.updateLastUsed(selected.name);
                return selected.name;
            }
            console.warn(chalk.yellow(`⚠️ Specified CLI '${options.cli}' is not available`));
        }

        // プロジェクト固有のデフォルトCLIがある場合
        const projectPath = options.projectPath || process.cwd();
        if (this.preferences.projectDefaults[projectPath] && !options.forceAsk) {
            const projectDefault = this.preferences.projectDefaults[projectPath];
            if (this.isAvailable(projectDefault)) {
                console.log(chalk.gray(`Using project default CLI: ${projectDefault}`));
                this.updateLastUsed(projectDefault);
                return projectDefault;
            }
        }

        // 毎回聞かない設定で、デフォルトCLIが設定されている場合
        if (!this.preferences.askEveryTime && this.preferences.defaultCLI && !options.forceAsk) {
            if (this.isAvailable(this.preferences.defaultCLI)) {
                console.log(chalk.gray(`Using default CLI: ${this.preferences.defaultCLI}`));
                this.updateLastUsed(this.preferences.defaultCLI);
                return this.preferences.defaultCLI;
            }
        }

        // 対話的に選択
        return await this.promptCLISelection(options);
    }

    async promptCLISelection(options = {}) {
        console.log(chalk.cyan('\n🤖 AI CLI選択\n'));

        // 利用可能なCLIを表示
        this.displayAvailableCLIs();

        // 利用可能なCLIがない場合
        if (this.availableCLIs.length === 0) {
            console.log(chalk.red('\n❌ AI CLIツールがインストールされていません'));
            console.log('以下のコマンドでインストールしてください:');
            console.log('  • Claude: npm install -g @anthropic/claude-cli');
            console.log('  • Gemini: npm install -g @google/gemini-cli');
            console.log('  • Codex:  npm install -g @openai/codex-cli\n');
            
            throw new Error('No AI CLI tools available. Please install at least one CLI tool.');
        }

        // CLI選択のプロンプト
        const choices = this.availableCLIs.map(cli => ({
            name: `${cli.displayName} - ${cli.description}`,
            value: cli.name,
            short: cli.displayName
        }));

        // 最後に使用したCLIを優先
        const defaultChoice = this.preferences.lastUsedCLI && 
                             this.isAvailable(this.preferences.lastUsedCLI) 
                             ? this.preferences.lastUsedCLI 
                             : this.availableCLIs[0].name;

        const questions = [
            {
                type: 'list',
                name: 'selectedCLI',
                message: '使用するAI CLIを選択してください:',
                choices,
                default: defaultChoice
            }
        ];

        // 設定保存のオプション
        if (!options.noSaveOption) {
            questions.push({
                type: 'list',
                name: 'savePreference',
                message: 'この選択を保存しますか？',
                choices: [
                    { name: '今回のみ', value: 'once' },
                    { name: 'このプロジェクトのデフォルトに設定', value: 'project' },
                    { name: '全体のデフォルトに設定', value: 'global' },
                    { name: '毎回選択する', value: 'always' }
                ],
                default: 'once'
            });
        }

        const answers = await inquirer.prompt(questions);

        // 設定の保存
        if (answers.savePreference) {
            await this.saveSelection(answers.selectedCLI, answers.savePreference, options.projectPath);
        }

        this.updateLastUsed(answers.selectedCLI);
        return answers.selectedCLI;
    }

    displayAvailableCLIs() {
        console.log(chalk.green('利用可能なCLI:'));
        
        for (const cli of this.availableCLIs) {
            if (cli.name !== 'mock') {
                const icon = this.getCLIIcon(cli.name);
                console.log(`  ${icon} ${chalk.bold(cli.displayName)}`);
                console.log(`     ${chalk.gray(cli.description)}`);
            }
        }

        // インストールされていないCLIを表示
        const allCLIs = ['claude', 'gemini', 'codex'];
        const installedCLIs = this.availableCLIs.map(c => c.name);
        const notInstalled = allCLIs.filter(c => !installedCLIs.includes(c));

        if (notInstalled.length > 0) {
            console.log(chalk.gray('\n未インストール:'));
            for (const cliName of notInstalled) {
                console.log(chalk.gray(`  • ${this.getCLIDisplayName(cliName)}`));
            }
        }
    }

    async saveSelection(cliName, saveType, projectPath) {
        switch (saveType) {
            case 'project':
                const project = projectPath || process.cwd();
                this.preferences.projectDefaults[project] = cliName;
                console.log(chalk.green(`✅ ${path.basename(project)} のデフォルトCLIを ${cliName} に設定しました`));
                break;
                
            case 'global':
                this.preferences.defaultCLI = cliName;
                this.preferences.askEveryTime = false;
                console.log(chalk.green(`✅ デフォルトCLIを ${cliName} に設定しました`));
                break;
                
            case 'always':
                this.preferences.askEveryTime = true;
                console.log(chalk.green(`✅ 毎回CLIを選択するように設定しました`));
                break;
                
            case 'once':
            default:
                // 今回のみなので何も保存しない
                break;
        }
        
        this.savePreferences();
    }

    updateLastUsed(cliName) {
        this.preferences.lastUsedCLI = cliName;
        this.savePreferences();
    }

    isAvailable(cliName) {
        return this.availableCLIs.some(c => c.name === cliName);
    }

    getCLIIcon(cliName) {
        const icons = {
            claude: '🤖',
            gemini: '🚀',
            codex: '🔒',
            mock: '📝'
        };
        return icons[cliName] || '❓';
    }

    getCLIDisplayName(cliName) {
        const names = {
            claude: 'Claude CLI',
            gemini: 'Gemini CLI',
            codex: 'Codex CLI',
            mock: 'Mock Analysis'
        };
        return names[cliName] || cliName;
    }

    async configureCLISettings() {
        console.log(chalk.cyan('\n⚙️ AI CLI設定\n'));

        const questions = [
            {
                type: 'list',
                name: 'askEveryTime',
                message: 'CLIの選択方法:',
                choices: [
                    { name: '毎回選択する', value: true },
                    { name: 'デフォルトを使用する', value: false }
                ],
                default: this.preferences.askEveryTime
            }
        ];

        if (this.availableCLIs.length > 1) {
            questions.push({
                type: 'list',
                name: 'defaultCLI',
                message: 'デフォルトCLI:',
                choices: this.availableCLIs.map(c => ({
                    name: c.displayName,
                    value: c.name
                })),
                when: (answers) => !answers.askEveryTime,
                default: this.preferences.defaultCLI
            });
        }

        questions.push({
            type: 'checkbox',
            name: 'priority',
            message: 'CLI優先順位（上から順に試行）:',
            choices: ['claude', 'gemini', 'codex'].map(name => ({
                name: this.getCLIDisplayName(name),
                value: name,
                checked: this.preferences.cliPriority.includes(name)
            }))
        });

        const answers = await inquirer.prompt(questions);

        this.preferences.askEveryTime = answers.askEveryTime;
        if (answers.defaultCLI) {
            this.preferences.defaultCLI = answers.defaultCLI;
        }
        if (answers.priority && answers.priority.length > 0) {
            this.preferences.cliPriority = answers.priority;
        }

        this.savePreferences();
        console.log(chalk.green('\n✅ CLI設定を保存しました'));
    }

    async showCLIStatus() {
        console.log(chalk.cyan('\n📊 AI CLI ステータス\n'));

        // インストール状況
        console.log(chalk.bold('インストール状況:'));
        const allCLIs = [
            { name: 'claude', command: 'claude' },
            { name: 'gemini', command: 'gemini' },
            { name: 'codex', command: 'codex' }
        ];

        for (const cli of allCLIs) {
            try {
                const version = execSync(`${cli.command} --version 2>/dev/null`, { encoding: 'utf8' }).trim();
                console.log(`  ${chalk.green('✓')} ${this.getCLIDisplayName(cli.name)}: ${version}`);
            } catch {
                console.log(`  ${chalk.red('✗')} ${this.getCLIDisplayName(cli.name)}: ${chalk.gray('未インストール')}`);
            }
        }

        // 現在の設定
        console.log(chalk.bold('\n現在の設定:'));
        console.log(`  • 選択方法: ${this.preferences.askEveryTime ? '毎回選択' : 'デフォルト使用'}`);
        if (!this.preferences.askEveryTime && this.preferences.defaultCLI) {
            console.log(`  • デフォルトCLI: ${this.getCLIDisplayName(this.preferences.defaultCLI)}`);
        }
        if (this.preferences.lastUsedCLI) {
            console.log(`  • 最後に使用: ${this.getCLIDisplayName(this.preferences.lastUsedCLI)}`);
        }

        // プロジェクト固有の設定
        if (Object.keys(this.preferences.projectDefaults).length > 0) {
            console.log(chalk.bold('\nプロジェクト設定:'));
            for (const [project, cli] of Object.entries(this.preferences.projectDefaults)) {
                console.log(`  • ${path.basename(project)}: ${this.getCLIDisplayName(cli)}`);
            }
        }

        // 使用統計（将来の拡張用）
        if (this.preferences.usageStats) {
            console.log(chalk.bold('\n使用統計:'));
            for (const [cli, count] of Object.entries(this.preferences.usageStats)) {
                console.log(`  • ${this.getCLIDisplayName(cli)}: ${count}回`);
            }
        }
    }

    async resetSettings() {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'CLI設定をリセットしますか？',
                default: false
            }
        ]);

        if (confirm) {
            this.preferences = {
                defaultCLI: null,
                lastUsedCLI: null,
                askEveryTime: true,
                cliPriority: ['claude', 'gemini', 'codex'],
                projectDefaults: {}
            };
            this.savePreferences();
            console.log(chalk.green('✅ CLI設定をリセットしました'));
        }
    }
}

// シングルトンインスタンス
let cliSelector = null;

export function getCLISelector() {
    if (!cliSelector) {
        cliSelector = new CLISelector();
    }
    return cliSelector;
}