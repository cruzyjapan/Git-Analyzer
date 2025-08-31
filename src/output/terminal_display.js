import chalk from 'chalk';
import boxen from 'boxen';

export class TerminalDisplay {
    constructor(analysis) {
        this.analysis = analysis;
    }

    display() {
        console.log('\n');
        this.displayHeader();
        this.displaySummary();
        this.displayFileChanges();
        this.displayCommitSummary();
        this.displayFooter();
    }

    displayHeader() {
        const title = boxen('📊 Git Analysis Report', {
            padding: 1,
            margin: 0,
            borderStyle: 'double',
            borderColor: 'cyan'
        });
        console.log(title);
        console.log('');
    }

    displaySummary() {
        console.log(chalk.bold.blue('━━━ Summary ━━━'));
        console.log(chalk.gray(`Source: ${chalk.white(this.analysis.summary.sourceBranch)} → Target: ${chalk.white(this.analysis.summary.targetBranch)}`));
        console.log(chalk.gray(`Files Changed: ${chalk.yellow(this.analysis.summary.filesChanged)}`));
        console.log(chalk.gray(`Lines: ${chalk.green(`+${this.analysis.summary.insertions}`)} / ${chalk.red(`-${this.analysis.summary.deletions}`)}`));
        console.log(chalk.gray(`Commits: ${chalk.cyan(this.analysis.summary.commits)}`));
        console.log('');
    }

    displayFileChanges() {
        console.log(chalk.bold.blue('━━━ File Changes ━━━'));
        console.log('');
        
        if (this.analysis.files.length === 0) {
            console.log(chalk.gray('No file changes detected'));
            return;
        }

        // Group files by status
        const filesByStatus = {
            added: [],
            modified: [],
            deleted: [],
            renamed: []
        };

        for (const file of this.analysis.files) {
            if (filesByStatus[file.status]) {
                filesByStatus[file.status].push(file);
            }
        }

        // Display added files
        if (filesByStatus.added.length > 0) {
            console.log(chalk.green.bold(`✨ Added Files (${filesByStatus.added.length})`));
            for (const file of filesByStatus.added) {
                this.displayFileDetails(file);
            }
            console.log('');
        }

        // Display modified files
        if (filesByStatus.modified.length > 0) {
            console.log(chalk.yellow.bold(`📝 Modified Files (${filesByStatus.modified.length})`));
            for (const file of filesByStatus.modified) {
                this.displayFileDetails(file);
            }
            console.log('');
        }

        // Display deleted files
        if (filesByStatus.deleted.length > 0) {
            console.log(chalk.red.bold(`🗑️  Deleted Files (${filesByStatus.deleted.length})`));
            for (const file of filesByStatus.deleted) {
                this.displayFileDetails(file);
            }
            console.log('');
        }
    }

    displayFileDetails(file) {
        const changes = chalk.dim(`(+${file.additions || 0}/-${file.deletions || 0})`);
        console.log(`  ${chalk.white(file.path)} ${changes}`);
        
        // Show file content analysis
        if (file.contentAnalysis) {
            console.log(chalk.cyan(`    📋 ${file.contentAnalysis.type} - ${file.contentAnalysis.purpose.join('、')}`));
            
            if (file.contentAnalysis.description) {
                const shortDesc = file.contentAnalysis.description.substring(0, 100);
                console.log(chalk.gray(`    ${shortDesc}${file.contentAnalysis.description.length > 100 ? '...' : ''}`));
            }
            
            if (file.contentAnalysis.characteristics && file.contentAnalysis.characteristics.length > 0) {
                console.log(chalk.yellow(`    ⚡ ${file.contentAnalysis.characteristics.slice(0, 3).join('、')}`));
            }
        }
        
        // Show functional changes for modified files
        if (file.functionalChanges) {
            const changes = [];
            if (file.functionalChanges.addedFunctions.length > 0) {
                changes.push(`+${file.functionalChanges.addedFunctions.length} functions`);
            }
            if (file.functionalChanges.removedFunctions.length > 0) {
                changes.push(`-${file.functionalChanges.removedFunctions.length} functions`);
            }
            if (file.functionalChanges.addedDependencies.length > 0) {
                changes.push(`+${file.functionalChanges.addedDependencies.length} deps`);
            }
            if (changes.length > 0) {
                console.log(chalk.magenta(`    🔄 Changes: ${changes.join(', ')}`));
            }
        }
        
        // Show change description
        const description = this.getChangeDescription(file);
        if (description) {
            console.log(chalk.gray(`    ${description}`));
        }

        // Show diff preview (first 5 lines of changes)
        if (file.diff && process.env.SHOW_DIFF !== 'false') {
            console.log(chalk.dim('    --- Diff Preview ---'));
            const diffLines = file.diff.split('\n').filter(line => 
                line.startsWith('+') || line.startsWith('-')
            ).slice(0, 5);
            
            for (const line of diffLines) {
                if (line.startsWith('+')) {
                    console.log(chalk.green(`    ${line}`));
                } else if (line.startsWith('-')) {
                    console.log(chalk.red(`    ${line}`));
                }
            }
            
            if (file.diff.split('\n').length > 5) {
                console.log(chalk.dim(`    ... (${file.diff.split('\n').length - 5} more lines)`));
            }
        }
    }

    getChangeDescription(file) {
        const descriptions = [];
        
        if (file.status === 'added') {
            descriptions.push(`新規${file.language || ''}ファイル`);
        } else if (file.status === 'modified') {
            if (file.additions > 0 && file.deletions > 0) {
                descriptions.push('コード修正');
            } else if (file.additions > 0) {
                descriptions.push('コード追加');
            } else if (file.deletions > 0) {
                descriptions.push('コード削除');
            }
            
            // Extract key changes from diff
            if (file.diff) {
                const keyChanges = this.extractKeyChanges(file.diff);
                if (keyChanges.length > 0) {
                    descriptions.push(...keyChanges.slice(0, 2));
                }
            }
        } else if (file.status === 'deleted') {
            descriptions.push('ファイル削除');
        }
        
        return descriptions.join(', ');
    }

    extractKeyChanges(diff) {
        const changes = [];
        const lines = diff.split('\n');
        
        for (const line of lines) {
            if (line.match(/^\+\s*(function|const|let|var|class|export|async)\s+\w+/)) {
                const match = line.match(/\b(\w+)\s*[=(]/);
                if (match) {
                    changes.push(`+${match[1]}()`);
                }
            }
            if (line.match(/^-\s*(function|const|let|var|class|export|async)\s+\w+/)) {
                const match = line.match(/\b(\w+)\s*[=(]/);
                if (match) {
                    changes.push(`-${match[1]}()`);
                }
            }
        }
        
        return [...new Set(changes)];
    }

    displayCommitSummary() {
        if (!this.analysis.commits || !this.analysis.commits.byType) {
            return;
        }

        console.log(chalk.bold.blue('━━━ Commit Summary ━━━'));
        
        const types = Object.entries(this.analysis.commits.byType);
        if (types.length > 0) {
            console.log(chalk.gray('Commit Types:'));
            for (const [type, count] of types) {
                const percentage = ((count / this.analysis.commits.total) * 100).toFixed(0);
                const bar = this.createBar(percentage);
                console.log(`  ${chalk.cyan(type.padEnd(10))} ${bar} ${count} (${percentage}%)`);
            }
        }

        if (this.analysis.commits.byAuthor) {
            const topAuthors = Object.entries(this.analysis.commits.byAuthor)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 3);
            
            if (topAuthors.length > 0) {
                console.log('');
                console.log(chalk.gray('Top Contributors:'));
                for (const [author, data] of topAuthors) {
                    console.log(`  ${chalk.white(author)}: ${chalk.cyan(data.count)} commits`);
                }
            }
        }
        console.log('');
    }

    createBar(percentage) {
        const width = 20;
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;
        return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    }

    displayFooter() {
        if (this.analysis.insights && this.analysis.insights.length > 0) {
            console.log(chalk.bold.blue('━━━ Insights ━━━'));
            for (const insight of this.analysis.insights.slice(0, 3)) {
                const icon = this.getInsightIcon(insight.type);
                console.log(`${icon} ${chalk.white(insight.message)}`);
                if (insight.detail) {
                    console.log(chalk.gray(`   ${insight.detail}`));
                }
            }
            console.log('');
        }

        console.log(chalk.dim('━'.repeat(50)));
        console.log(chalk.dim(`Generated at: ${new Date().toLocaleString()}`));
    }

    getInsightIcon(type) {
        const icons = {
            warning: chalk.yellow('⚠️ '),
            info: chalk.blue('ℹ️ '),
            success: chalk.green('✅'),
            error: chalk.red('❌'),
            attention: chalk.magenta('👀')
        };
        return icons[type] || '📌';
    }

    // Static method for quick display
    static show(analysis) {
        const display = new TerminalDisplay(analysis);
        display.display();
    }
}

export default TerminalDisplay;