#!/usr/bin/env node

import chalk from 'chalk';
import { CLIParser } from './core/cli_parser.js';
import { errorHandler } from './core/error_handler.js';
import dotenv from 'dotenv';

dotenv.config();

const displayBanner = () => {
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ██████╗ ██╗████████╗     █████╗ ███╗   ██╗ █████╗       ║
║    ██╔════╝ ██║╚══██╔══╝    ██╔══██╗████╗  ██║██╔══██╗      ║
║    ██║  ███╗██║   ██║       ███████║██╔██╗ ██║███████║      ║
║    ██║   ██║██║   ██║       ██╔══██║██║╚██╗██║██╔══██║      ║
║    ╚██████╔╝██║   ██║       ██║  ██║██║ ╚████║██║  ██║      ║
║     ╚═════╝ ╚═╝   ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝      ║
║                                                              ║
║            Git Repository Analysis Tool v1.0.0               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`));
};

const main = async () => {
    try {
        // Check if no command provided or basic help requested without arguments
        if (process.argv.length === 2 || (process.argv[2] === 'help' && process.argv.length === 3)) {
            displayBanner();
            
            // Check for repository selection when no command
            if (process.argv.length === 2) {
                const { RepositoryRegistry } = await import('./core/repository_registry.js');
                const registry = new RepositoryRegistry();
                
                const repo = await registry.selectRepository();
                
                if (repo === 'add_new') {
                    // Handle add new repository
                    const inquirer = (await import('inquirer')).default;
                    const { path } = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'path',
                            message: 'Enter repository path:',
                            default: process.cwd()
                        }
                    ]);
                    
                    const { name } = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'name',
                            message: 'Enter repository name:',
                            default: require('path').basename(path)
                        }
                    ]);
                    
                    await registry.addRepository(path, name);
                    console.log(chalk.green('\n✅ Repository added successfully!'));
                    console.log(chalk.gray('Run git-analyzer again to select it.'));
                    process.exit(0);
                } else if (repo) {
                    // Repository selected, show available commands
                    console.log(chalk.cyan(`\n📁 Selected: ${repo.name}`));
                    console.log(chalk.gray(`   Path: ${repo.path}\n`));
                    
                    console.log(chalk.yellow('Available commands:\n'));
                    console.log('  analyze            Analyze branch differences');
                    console.log('  report             Generate analysis reports');
                    console.log('  branch             Manage branches');
                    console.log('  pull               Pull latest changes');
                    console.log('  pull --force       Force pull (discard local changes)');
                    console.log('  check-status       Check repository status');
                    console.log('  help               Show enhanced interactive help');
                    console.log('\nExamples:');
                    console.log('  git-analyzer analyze --source develop --target main');
                    console.log('  git-analyzer report --all');
                    console.log('  git-analyzer pull --force --backup');
                } else {
                    // No repository selected or cancelled
                    console.log(chalk.yellow('\n👋 No repository selected. Exiting.'));
                    process.exit(0);
                }
            } else {
                // Enhanced Help command
                try {
                    const { getHelpSystem } = await import('./core/help_system.js');
                    const helpSystem = getHelpSystem();
                    await helpSystem.showHelp(null, { interactive: false });
                } catch (error) {
                    // Fallback to basic help if enhanced system fails
                    console.log(chalk.yellow('\n📖 Git Analyzer - Help\n'));
                    console.log('Usage: git-analyzer [command] [options]\n');
                    console.log('Repository Management:');
                    console.log('  add-repo [path]       Add repository to registry');
                    console.log('  list-repos            List all repositories');
                    console.log('  remove-repo <id>      Remove repository');
                    console.log('  set-default <id>      Set default repository');
                    console.log('\nAnalysis Commands:');
                    console.log('  init                  Initialize in repository');
                    console.log('  analyze               Analyze branches');
                    console.log('  report                Generate reports');
                    console.log('  branch <action>       Manage branches');
                    console.log('\nGit Operations:');
                    console.log('  pull                  Pull latest changes');
                    console.log('  pull --force          Force pull (discard local)');
                    console.log('  check-status          Check repository status');
                    console.log('  restore-backup        Restore from backup');
                    console.log('\nOptions:');
                    console.log('  --repo <id>           Use specific repository');
                    console.log('  --repo-path <path>    Use repository at path');
                    console.log('  --last-used           Use last accessed repository');
                    console.log('\nFor enhanced help: git-analyzer help --interactive');
                }
                process.exit(0);
            }
        } else {
            // Normal command execution
            const cli = new CLIParser();
            await cli.parse(process.argv);
        }
    } catch (error) {
        errorHandler.handle(error);
    }
};

process.on('uncaughtException', (error) => {
    console.error(chalk.red('\n❌ Uncaught Exception:'));
    errorHandler.handle(error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('\n❌ Unhandled Rejection:'));
    errorHandler.handle(reason);
});

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Operation cancelled by user'));
    process.exit(0);
});

main();