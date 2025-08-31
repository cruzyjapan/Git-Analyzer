import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ERROR_CODES } from './error_handler.js';

export class CLIParser {
    constructor() {
        this.program = new Command();
        this.spinner = ora();
        this.setupCommands();
    }

    setupCommands() {
        this.program
            .name('git-analyzer')
            .description('Git repository change history analyzer with AI CLI integration')
            .version('2.0.0')
            .option('--repo <id>', 'Specify repository by ID')
            .option('--repo-path <path>', 'Specify repository by path')
            .option('--last-used', 'Use last accessed repository');

        this.program
            .command('init')
            .description('Initialize git-analyzer in the current repository')
            .argument('[path]', 'Repository path', process.cwd())
            .option('--auto-detect', 'Auto-detect environments from branch names')
            .option('--interactive', 'Use interactive mode for configuration')
            .option('--config <file>', 'Use configuration file')
            .action(async (path, options) => {
                await this.handleInit(path, options);
            });

        this.program
            .command('analyze')
            .description('Analyze differences between branches or commits')
            .option('--source <branch>', 'Source branch (supports patterns like main-main)')
            .option('--target <branch>', 'Target branch (same as source for time-based comparison)')
            .option('--commit <id>', 'Analyze specific commit')
            .option('--from-commit <id>', 'Start commit ID for range analysis')
            .option('--to-commit <id>', 'End commit ID for range analysis')
            .option('--since <date>', 'Analyze commits since date (YYYY-MM-DD or "2 weeks ago")')
            .option('--until <date>', 'Analyze commits until date (YYYY-MM-DD)')
            .option('--author <name>', 'Filter by author name')
            .option('--file <path>', 'Analyze specific file or pattern')
            .option('--files <patterns>', 'Comma-separated file patterns to include')
            .option('--exclude <patterns>', 'Comma-separated file patterns to exclude')
            .option('--cli <type>', 'AI CLI to use (gemini|claude|codex)')
            .option('--ask-cli', 'Force interactive CLI selection')
            .option('--skip-ai', 'Skip AI analysis')
            .option('--output <file>', 'Output file path')
            .option('--format <type>', 'Output format (md|excel|csv|txt|html|terminal)', 'md')
            .option('--encoding <type>', 'Character encoding (utf8|sjis)', 'utf8')
            .action(async (options) => {
                await this.handleAnalyze(options);
            });

        this.program
            .command('branch')
            .description('Manage branch configurations')
            .argument('<action>', 'Action to perform (list|detect|set-prod)')
            .argument('[value]', 'Value for the action')
            .action(async (action, value) => {
                await this.handleBranch(action, value);
            });

        this.program
            .command('report')
            .description('Generate analysis reports')
            .option('--all', 'Generate reports for all environments')
            .option('--env <type>', 'Generate report for specific environment')
            .option('--template <file>', 'Use custom template file')
            .action(async (options) => {
                await this.handleReport(options);
            });

        // Repository management commands
        this.program
            .command('add-repo')
            .description('Add a new repository to registry')
            .argument('[path]', 'Repository path', process.cwd())
            .option('--name <name>', 'Repository name')
            .option('--id <id>', 'Custom repository ID')
            .option('--auto-pull', 'Enable auto-pull on analysis', true)
            .action(async (path, options) => {
                await this.handleAddRepo(path, options);
            });

        this.program
            .command('remove-repo')
            .description('Remove repository from registry')
            .argument('<id>', 'Repository ID or path')
            .action(async (id) => {
                await this.handleRemoveRepo(id);
            });

        this.program
            .command('list-repos')
            .description('List all registered repositories')
            .action(async () => {
                await this.handleListRepos();
            });

        this.program
            .command('update-repo')
            .description('Update repository settings')
            .argument('<id>', 'Repository ID')
            .option('--name <name>', 'New repository name')
            .option('--auto-pull <boolean>', 'Update auto-pull setting')
            .action(async (id, options) => {
                await this.handleUpdateRepo(id, options);
            });

        this.program
            .command('set-default')
            .description('Set default repository')
            .argument('<id>', 'Repository ID')
            .action(async (id) => {
                await this.handleSetDefault(id);
            });

        // Force pull commands
        this.program
            .command('pull')
            .description('Pull latest changes from remote')
            .option('--force', 'Force pull (discard local changes)')
            .option('--yes', 'Skip confirmation prompts')
            .option('--backup', 'Create backup before force pull')
            .option('--no-backup', 'Skip backup creation')
            .option('--preserve <files>', 'Preserve specific files (comma-separated)')
            .option('--dry-run', 'Show what would be done without doing it')
            .action(async (options) => {
                await this.handlePull(options);
            });

        this.program
            .command('restore-backup')
            .description('Restore from backup')
            .option('--latest', 'Restore latest backup', true)
            .option('--date <timestamp>', 'Restore specific backup')
            .action(async (options) => {
                await this.handleRestoreBackup(options);
            });

        this.program
            .command('check-status')
            .description('Check repository status before pull')
            .action(async () => {
                await this.handleCheckStatus();
            });

        // Language command
        this.program
            .command('language [lang]')
            .alias('lang')
            .description('Set or show language (ja/en)')
            .action(async (lang) => {
                await this.handleLanguage(lang);
            });

        // CLI settings command
        this.program
            .command('cli [action]')
            .description('Manage AI CLI settings (status/config/reset)')
            .action(async (action) => {
                await this.handleCLISettings(action);
            });

        // Enhanced Help command
        this.program
            .command('help [command]')
            .description('Display comprehensive help with examples and tips')
            .option('--interactive', 'Show interactive help menu')
            .option('--quick', 'Show quick reference guide')
            .option('--context', 'Show context-aware suggestions')
            .option('--filters', 'Show detailed filtering options documentation')
            .option('--search <keyword>', 'Search commands by keyword')
            .action(async (command, options) => {
                const { getHelpSystem } = await import('./help_system.js');
                const helpSystem = getHelpSystem();

                if (options.filters) {
                    helpSystem.showFilteringHelp();
                    return;
                }

                if (options.search) {
                    const results = helpSystem.searchCommands(options.search);
                    if (results.length > 0) {
                        console.log(chalk.cyan(`\n🔍 Search results for "${options.search}":\n`));
                        results.forEach(result => {
                            console.log(`  ${chalk.white(result.command)} (${chalk.gray(result.category)})`);
                            console.log(`    ${chalk.gray(result.description)}\n`);
                        });
                    } else {
                        console.log(chalk.yellow(`No commands found matching "${options.search}"`));
                    }
                    return;
                }

                await helpSystem.showHelp(command, options);
            });
    }

    async handleInit(path, options) {
        this.spinner.start(chalk.blue('Initializing Git Analyzer...'));
        
        try {
            const { initializeRepository } = await import('../git/repository.js');
            const repository = await initializeRepository(path, options);
            
            if (options.interactive) {
                const answers = await this.promptEnvironmentSetup(repository);
                await repository.saveEnvironmentConfig(answers);
            }
            
            this.spinner.succeed(chalk.green('Git Analyzer initialized successfully!'));
            this.showNextSteps();
        } catch (error) {
            this.spinner.fail(chalk.red('Initialization failed'));
            throw error;
        }
    }

    async handleAnalyze(options) {
        // Skip AI CLI selection if --skip-ai is specified
        if (!options.skipAi) {
            // CLI選択（--cliオプションがない場合、または--ask-cliが指定された場合は対話的に選択）
            if (!options.cli || options.askCli) {
                const { getCLISelector } = await import('./cli_selector.js');
                const selector = getCLISelector();
                
                this.spinner.stop(); // 一時的にスピナーを停止
                
                // --ask-cliが指定された場合は強制的に選択画面を表示
                const selectorOptions = {
                    ...options,
                    forceAsk: options.askCli
                };
                
                options.cli = await selector.selectCLI(selectorOptions);
                console.log(chalk.cyan(`\n🤖 Selected CLI: ${selector.getCLIDisplayName(options.cli)}\n`));
            }
        } else {
            console.log(chalk.yellow('📊 Running analysis without AI assistance...'));
        }
        
        this.spinner.start(chalk.blue('Analyzing repository...'));
        
        try {
            const { DiffAnalyzer } = await import('../git/diff_analyzer.js');
            const analyzer = new DiffAnalyzer();
            
            if (!options.source || !options.target) {
                const branches = await this.selectBranches();
                options.source = branches.source;
                options.target = branches.target;
            }
            
            const analysis = await analyzer.analyzeBranchDiff(
                options.source,
                options.target,
                options
            );
            
            // Display results based on format
            if (options.format === 'terminal') {
                // Terminal display only
                const { TerminalDisplay } = await import('../output/terminal_display.js');
                TerminalDisplay.show(analysis);
            } else {
                // Generate report file
                const { ReportGenerator } = await import('../output/report_generator.js');
                const generator = new ReportGenerator(analysis);
                await generator.generate(options.format, options);
                
                // Also show terminal display for immediate feedback
                const { TerminalDisplay } = await import('../output/terminal_display.js');
                TerminalDisplay.show(analysis);
            }
            
            this.spinner.succeed(chalk.green('Analysis completed successfully!'));
        } catch (error) {
            this.spinner.fail(chalk.red('Analysis failed'));
            throw error;
        }
    }

    async handleBranch(action, value) {
        const { BranchManager } = await import('../git/branch_manager.js');
        const manager = new BranchManager();
        
        switch (action) {
            case 'list':
                await this.listBranches(manager);
                break;
            case 'detect':
                await this.detectEnvironments(manager);
                break;
            case 'set-prod':
                await this.setProductionBranch(manager, value);
                break;
            default:
                console.error(chalk.red(`Unknown action: ${action}`));
        }
    }

    async handleReport(options) {
        this.spinner.start(chalk.blue('Generating reports...'));
        
        try {
            const { ReportManager } = await import('../output/report_manager.js');
            const manager = new ReportManager();
            
            if (options.all) {
                await manager.generateAllEnvironmentReports(options);
            } else if (options.env) {
                await manager.generateEnvironmentReport(options.env, options);
            } else {
                await manager.generateDefaultReport(options);
            }
            
            this.spinner.succeed(chalk.green('Reports generated successfully!'));
        } catch (error) {
            this.spinner.fail(chalk.red('Report generation failed'));
            throw error;
        }
    }

    async promptEnvironmentSetup(repository) {
        const branches = await repository.getAllBranches();
        
        console.log(chalk.cyan('\n🔍 Git repository detected: ') + repository.path);
        console.log(chalk.cyan('\n📋 Branch list:'));
        branches.forEach(branch => {
            console.log(chalk.gray('  ✓ ') + branch);
        });
        
        console.log(chalk.cyan('\n🎯 Environment auto-detection\n'));
        
        const questions = [
            {
                type: 'list',
                name: 'production',
                message: 'Select the production branch:',
                choices: [...branches, 'None'],
                default: this.findDefaultBranch(branches, 'production')
            },
            {
                type: 'list',
                name: 'staging',
                message: 'Select the staging branch:',
                choices: [...branches, 'None'],
                default: this.findDefaultBranch(branches, 'staging')
            },
            {
                type: 'list',
                name: 'development',
                message: 'Select the development branch:',
                choices: [...branches, 'None'],
                default: this.findDefaultBranch(branches, 'development')
            }
        ];
        
        return await inquirer.prompt(questions);
    }

    async selectBranches() {
        const { Repository } = await import('../git/repository.js');
        const repo = new Repository(process.cwd());
        const branches = await repo.getAllBranches();
        
        const questions = [
            {
                type: 'list',
                name: 'source',
                message: 'Select source branch for comparison:',
                choices: branches
            },
            {
                type: 'list',
                name: 'target',
                message: 'Select target branch for comparison:',
                choices: branches
            }
        ];
        
        return await inquirer.prompt(questions);
    }

    async listBranches(manager) {
        const branches = await manager.listBranches();
        const environments = await manager.getEnvironmentMapping();
        
        console.log(chalk.cyan('\n📋 Branch List:\n'));
        branches.forEach(branch => {
            const env = environments[branch];
            const envLabel = env ? chalk.green(` [${env}]`) : '';
            console.log(`  ${chalk.gray('•')} ${branch}${envLabel}`);
        });
    }

    async detectEnvironments(manager) {
        this.spinner.start(chalk.blue('Detecting environments...'));
        
        try {
            const detected = await manager.detectEnvironments();
            this.spinner.succeed(chalk.green('Environment detection completed'));
            
            console.log(chalk.cyan('\n🎯 Detected Environments:\n'));
            Object.entries(detected).forEach(([env, branch]) => {
                console.log(`  ${chalk.green(env)}: ${branch || chalk.gray('Not found')}`);
            });
        } catch (error) {
            this.spinner.fail(chalk.red('Environment detection failed'));
            throw error;
        }
    }

    async setProductionBranch(manager, branch) {
        if (!branch) {
            const branches = await manager.listBranches();
            const { selected } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selected',
                    message: 'Select production branch:',
                    choices: branches
                }
            ]);
            branch = selected;
        }
        
        await manager.setProductionBranch(branch);
        console.log(chalk.green(`✅ Production branch set to: ${branch}`));
    }

    findDefaultBranch(branches, environment) {
        const patterns = {
            production: ['main', 'master', 'production', 'prod'],
            staging: ['staging', 'stage', 'test'],
            development: ['develop', 'development', 'dev']
        };
        
        const envPatterns = patterns[environment] || [];
        
        for (const pattern of envPatterns) {
            const found = branches.find(branch => 
                branch.toLowerCase().includes(pattern)
            );
            if (found) return found;
        }
        
        return 'None';
    }

    showNextSteps() {
        console.log(chalk.cyan('\n📝 Next steps:\n'));
        console.log('  • ' + chalk.white('git-analyzer analyze --source develop --target staging'));
        console.log('  • ' + chalk.white('git-analyzer report --all'));
        console.log('  • ' + chalk.white('git-analyzer branch list'));
    }

    // Repository management handlers
    async handleAddRepo(path, options) {
        const { RepositoryRegistry } = await import('./repository_registry.js');
        const registry = new RepositoryRegistry();
        
        try {
            await registry.addRepository(path, options.name, options);
        } catch (error) {
            console.error(chalk.red(`Failed to add repository: ${error.message}`));
            process.exit(1);
        }
    }

    async handleRemoveRepo(id) {
        const { RepositoryRegistry } = await import('./repository_registry.js');
        const registry = new RepositoryRegistry();
        
        try {
            await registry.removeRepository(id);
        } catch (error) {
            console.error(chalk.red(`Failed to remove repository: ${error.message}`));
            process.exit(1);
        }
    }

    async handleListRepos() {
        const { RepositoryRegistry } = await import('./repository_registry.js');
        const registry = new RepositoryRegistry();
        await registry.displayRepositoryList();
    }

    async handleUpdateRepo(id, options) {
        const { RepositoryRegistry } = await import('./repository_registry.js');
        const registry = new RepositoryRegistry();
        
        try {
            await registry.updateRepository(id, options);
        } catch (error) {
            console.error(chalk.red(`Failed to update repository: ${error.message}`));
            process.exit(1);
        }
    }

    async handleSetDefault(id) {
        const { RepositoryRegistry } = await import('./repository_registry.js');
        const registry = new RepositoryRegistry();
        
        try {
            await registry.setDefaultRepository(id);
        } catch (error) {
            console.error(chalk.red(`Failed to set default: ${error.message}`));
            process.exit(1);
        }
    }

    // Force pull handlers
    async handlePull(options) {
        const { RepositoryRegistry } = await import('./repository_registry.js');
        const { ForcePullManager } = await import('../git/force_pull.js');
        
        const registry = new RepositoryRegistry();
        const repo = await this.selectRepository(registry);
        
        if (!repo) return;
        
        const pullManager = new ForcePullManager(repo.path);
        
        if (options.dryRun) {
            await pullManager.displayStatus();
            console.log(chalk.yellow('\n📝 Dry run mode - no changes will be made'));
            return;
        }
        
        if (options.force) {
            await pullManager.performForcePull({
                skipConfirmation: options.yes,
                createBackup: options.backup !== false,
                preserveFiles: options.preserve ? options.preserve.split(',') : []
            });
        } else {
            // Regular pull
            const git = (await import('simple-git')).default;
            const gitRepo = git(repo.path);
            
            try {
                this.spinner.start('Pulling latest changes...');
                await gitRepo.pull();
                this.spinner.succeed('Pull completed successfully');
            } catch (error) {
                this.spinner.fail('Pull failed');
                console.error(chalk.red(error.message));
                
                if (error.message.includes('conflict')) {
                    console.log(chalk.yellow('\n💡 Tip: Use --force to discard local changes'));
                }
            }
        }
        
        await registry.updateLastAnalyzed(repo.id);
    }

    async handleRestoreBackup(options) {
        const { RepositoryRegistry } = await import('./repository_registry.js');
        const { ForcePullManager } = await import('../git/force_pull.js');
        
        const registry = new RepositoryRegistry();
        const repo = await this.selectRepository(registry);
        
        if (!repo) return;
        
        const pullManager = new ForcePullManager(repo.path);
        
        try {
            if (options.date) {
                await pullManager.restoreBackup(options.date);
            } else {
                await pullManager.restoreBackup('latest');
            }
        } catch (error) {
            console.error(chalk.red(`Restore failed: ${error.message}`));
        }
    }

    async handleCheckStatus() {
        const { RepositoryRegistry } = await import('./repository_registry.js');
        const { ForcePullManager } = await import('../git/force_pull.js');
        
        const registry = new RepositoryRegistry();
        const repo = await this.selectRepository(registry);
        
        if (!repo) return;
        
        const pullManager = new ForcePullManager(repo.path);
        await pullManager.displayStatus();
    }

    async handleLanguage(lang) {
        const { getLanguageManager } = await import('./language.js');
        const langManager = getLanguageManager();
        
        if (!lang) {
            // Show current language
            const current = langManager.getLanguage();
            const langName = current === 'ja' ? '日本語 (Japanese)' : 'English';
            console.log(chalk.cyan(`Current language: ${langName}`));
            console.log(chalk.gray('\nTo change language:'));
            console.log('  git-analyzer language ja    # 日本語');
            console.log('  git-analyzer language en    # English');
        } else {
            // Set language
            try {
                langManager.setLanguage(lang);
                const langName = lang === 'ja' ? '日本語' : 'English';
                const message = lang === 'ja' 
                    ? `✅ 言語を ${langName} に設定しました`
                    : `✅ Language set to ${langName}`;
                console.log(chalk.green(message));
            } catch (error) {
                console.error(chalk.red(error.message));
                console.log(chalk.gray('Supported languages: ja (Japanese), en (English)'));
            }
        }
    }

    async handleCLISettings(action) {
        const { getCLISelector } = await import('./cli_selector.js');
        const selector = getCLISelector();
        
        switch (action) {
            case 'status':
                await selector.showCLIStatus();
                break;
                
            case 'config':
            case 'configure':
                await selector.configureCLISettings();
                break;
                
            case 'reset':
                await selector.resetSettings();
                break;
                
            default:
                // アクションが指定されていない場合はステータスを表示
                await selector.showCLIStatus();
                console.log(chalk.gray('\n使用方法:'));
                console.log('  git-analyzer cli status   # CLIの状態を表示');
                console.log('  git-analyzer cli config   # CLI設定を変更');
                console.log('  git-analyzer cli reset    # 設定をリセット');
                break;
        }
    }

    async selectRepository(registry) {
        const options = this.program.opts();
        
        if (options.repo) {
            return await registry.getRepository(options.repo);
        }
        
        if (options.repoPath) {
            const repos = await registry.listRepositories();
            return repos.find(r => r.path === path.resolve(options.repoPath));
        }
        
        if (options.lastUsed) {
            return await registry.getLastUsed();
        }
        
        return await registry.selectRepository();
    }

    displayExtendedHelp() {
        console.log(chalk.cyan('\n📚 Extended Help:\n'));
        
        console.log(chalk.yellow('Repository Management:'));
        console.log('  git-analyzer add-repo [path]     Add repository to registry');
        console.log('  git-analyzer list-repos          List all registered repositories');
        console.log('  git-analyzer remove-repo <id>    Remove repository from registry');
        console.log('  git-analyzer set-default <id>    Set default repository\n');
        
        console.log(chalk.yellow('Force Pull Operations:'));
        console.log('  git-analyzer pull --force        Discard local changes and pull');
        console.log('  git-analyzer pull --force --backup  Backup before force pull');
        console.log('  git-analyzer restore-backup      Restore from latest backup');
        console.log('  git-analyzer check-status        Check repository status\n');
        
        console.log(chalk.yellow('Analysis Commands:'));
        console.log('  git-analyzer analyze             Analyze branch differences');
        console.log('  git-analyzer report --all        Generate all environment reports');
        console.log('  git-analyzer branch list         List and manage branches\n');
        
        console.log(chalk.yellow('AI CLI Integration:'));
        console.log('  --cli claude    Use Claude CLI for analysis');
        console.log('  --cli gemini    Use Gemini CLI for analysis');
        console.log('  --cli codex     Use Codex CLI for analysis\n');
        
        console.log(chalk.gray('For more info: git-analyzer help <command>'));
    }

    parse(argv) {
        return this.program.parse(argv);
    }
}