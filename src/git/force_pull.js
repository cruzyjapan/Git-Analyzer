import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import moment from 'moment';
import inquirer from 'inquirer';
import { SecurityManager } from './security.js';
import ora from 'ora';

export class ForcePullManager {
    constructor(repoPath) {
        this.repoPath = path.resolve(repoPath);
        this.git = simpleGit(this.repoPath);
        this.security = new SecurityManager();
        this.backupDir = path.join(this.repoPath, '.git-analyzer', 'backups');
        this.settings = this.loadSettings();
    }

    loadSettings() {
        const defaultSettings = {
            always_backup: true,
            backup_retention_days: 7,
            skip_confirmation: false,
            ignore_patterns: [
                '.env*',
                '*.log',
                'node_modules/',
                '.DS_Store'
            ],
            preserve_files: [
                '.env.local',
                'config/local-settings.json'
            ],
            auto_clean_untracked: true,
            submodules_update: true
        };

        try {
            const configPath = path.join(this.repoPath, '.git-analyzer', 'force-pull-settings.json');
            if (fs.existsSync(configPath)) {
                return { ...defaultSettings, ...fs.readJsonSync(configPath) };
            }
        } catch (error) {
            console.warn('Using default force pull settings');
        }

        return defaultSettings;
    }

    async checkStatus() {
        const status = await this.git.status();
        const currentBranch = status.current;
        
        const localChanges = {
            modified: status.modified,
            added: status.created,
            deleted: status.deleted,
            renamed: status.renamed,
            untracked: status.not_added
        };

        const hasChanges = status.modified.length > 0 || 
                          status.created.length > 0 || 
                          status.deleted.length > 0 || 
                          status.renamed.length > 0 ||
                          status.not_added.length > 0;

        const ahead = status.ahead;
        const behind = status.behind;

        const lastFetch = await this.getLastFetchTime();

        return {
            currentBranch,
            localChanges,
            hasChanges,
            ahead,
            behind,
            lastFetch,
            totalChangedFiles: this.countTotalChanges(localChanges),
            estimatedSize: await this.estimateChangesSize(localChanges)
        };
    }

    countTotalChanges(changes) {
        return changes.modified.length + 
               changes.added.length + 
               changes.deleted.length + 
               changes.renamed.length + 
               changes.untracked.length;
    }

    async estimateChangesSize(changes) {
        let totalSize = 0;
        
        const allFiles = [
            ...changes.modified,
            ...changes.added,
            ...changes.untracked
        ];

        for (const file of allFiles) {
            try {
                const filePath = path.join(this.repoPath, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            } catch (error) {
                // File might not exist or be accessible
            }
        }

        return this.formatSize(totalSize);
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async getLastFetchTime() {
        try {
            const fetchHead = path.join(this.repoPath, '.git', 'FETCH_HEAD');
            if (await fs.pathExists(fetchHead)) {
                const stats = await fs.stat(fetchHead);
                const hoursSince = (Date.now() - stats.mtime) / (1000 * 60 * 60);
                
                if (hoursSince < 1) {
                    return `${Math.round(hoursSince * 60)}分前`;
                } else if (hoursSince < 24) {
                    return `${Math.round(hoursSince)}時間前`;
                } else {
                    return `${Math.round(hoursSince / 24)}日前`;
                }
            }
        } catch (error) {
            console.warn('Could not determine last fetch time');
        }
        
        return '不明';
    }

    async displayStatus() {
        const status = await this.checkStatus();

        console.log(chalk.cyan('\n╔════════════════════════════════════════════╗'));
        console.log(chalk.cyan('║     強制Pull前チェック                     ║'));
        console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));

        console.log(`📁 リポジトリ: ${this.repoPath}`);
        console.log(`🌿 ブランチ: ${status.currentBranch}\n`);

        if (status.hasChanges) {
            console.log(chalk.yellow('ローカル状態:'));
            if (status.localChanges.modified.length > 0) {
                console.log(`  • 変更ファイル: ${status.localChanges.modified.length}`);
            }
            if (status.localChanges.added.length > 0) {
                console.log(`  • 追加ファイル: ${status.localChanges.added.length}`);
            }
            if (status.localChanges.deleted.length > 0) {
                console.log(`  • 削除ファイル: ${status.localChanges.deleted.length}`);
            }
            if (status.localChanges.untracked.length > 0) {
                console.log(`  • 未追跡: ${status.localChanges.untracked.length}`);
            }
            console.log(`  • 合計サイズ: ${status.estimatedSize}\n`);
        } else {
            console.log(chalk.green('ローカル変更なし\n'));
        }

        console.log('リモート状態:');
        if (status.behind > 0) {
            console.log(chalk.yellow(`  • 未取得コミット: ${status.behind}`));
        } else {
            console.log(chalk.green('  • 最新状態'));
        }
        console.log(`  • 最終フェッチ: ${status.lastFetch}\n`);

        if (status.hasChanges) {
            console.log(chalk.yellow('推定影響:'));
            console.log(`  • 破棄されるデータ: ${status.estimatedSize}`);
            console.log(`  • 影響ファイル数: ${status.totalChangedFiles}`);
        }

        return status;
    }

    async confirmAction(status) {
        if (this.settings.skip_confirmation) {
            return true;
        }

        if (status.hasChanges) {
            console.log(chalk.red('\n╔════════════════════════════════════════════╗'));
            console.log(chalk.red('║     ⚠️  ローカル変更が検出されました        ║'));
            console.log(chalk.red('╚════════════════════════════════════════════╝\n'));

            console.log('検出された変更:\n');
            
            if (status.localChanges.modified.length > 0) {
                console.log(chalk.yellow(`  修正: ${status.localChanges.modified.length} ファイル`));
                status.localChanges.modified.slice(0, 5).forEach(file => {
                    console.log(chalk.gray(`    M ${file}`));
                });
                if (status.localChanges.modified.length > 5) {
                    console.log(chalk.gray(`    ... 他 ${status.localChanges.modified.length - 5} ファイル`));
                }
            }

            if (status.localChanges.added.length > 0) {
                console.log(chalk.green(`\n  追加: ${status.localChanges.added.length} ファイル`));
                status.localChanges.added.slice(0, 5).forEach(file => {
                    console.log(chalk.gray(`    A ${file}`));
                });
                if (status.localChanges.added.length > 5) {
                    console.log(chalk.gray(`    ... 他 ${status.localChanges.added.length - 5} ファイル`));
                }
            }

            if (status.localChanges.deleted.length > 0) {
                console.log(chalk.red(`\n  削除: ${status.localChanges.deleted.length} ファイル`));
                status.localChanges.deleted.slice(0, 5).forEach(file => {
                    console.log(chalk.gray(`    D ${file}`));
                });
            }

            if (status.localChanges.untracked.length > 0) {
                console.log(chalk.blue(`\n  未追跡: ${status.localChanges.untracked.length} ファイル`));
                status.localChanges.untracked.slice(0, 5).forEach(file => {
                    console.log(chalk.gray(`    ? ${file}`));
                });
                if (status.localChanges.untracked.length > 5) {
                    console.log(chalk.gray(`    ... 他 ${status.localChanges.untracked.length - 5} ファイル`));
                }
            }

            console.log(chalk.red('\n⚠️ 警告: これらの変更は全て破棄されます！\n'));

            const choices = [
                { name: 'バックアップ後に実行', value: 'backup' },
                { name: 'はい - 全ての変更を破棄して最新化', value: 'force' },
                { name: 'キャンセル', value: 'cancel' }
            ];

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: '強制Pullを実行しますか？',
                    choices,
                    default: 'backup'
                }
            ]);

            return action;
        } else {
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Git Pullを実行しますか？',
                    default: true
                }
            ]);

            return confirm ? 'force' : 'cancel';
        }
    }

    async createBackup() {
        const timestamp = moment().format('YYYY-MM-DD_HHmmss');
        const backupPath = path.join(this.backupDir, timestamp);
        
        await fs.ensureDir(backupPath);

        const status = await this.git.status();
        const backupInfo = {
            timestamp,
            branch: status.current,
            files: {
                modified: [],
                added: [],
                deleted: [],
                untracked: []
            }
        };

        console.log(chalk.blue('\nバックアップを作成しています...\n'));
        console.log(`📁 バックアップ先:\n${backupPath}\n`);

        const spinner = ora('変更ファイルをバックアップ中...').start();

        // Backup modified files
        for (const file of status.modified) {
            const srcPath = path.join(this.repoPath, file);
            const destPath = path.join(backupPath, 'changed_files', file.replace(/\//g, '_'));
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(srcPath, destPath);
            backupInfo.files.modified.push(file);
        }

        // Backup added files
        for (const file of status.created) {
            const srcPath = path.join(this.repoPath, file);
            const destPath = path.join(backupPath, 'added_files', file.replace(/\//g, '_'));
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(srcPath, destPath);
            backupInfo.files.added.push(file);
        }

        // Record deleted files
        for (const file of status.deleted) {
            backupInfo.files.deleted.push(file);
        }

        // Backup untracked files
        for (const file of status.not_added) {
            if (!this.shouldIgnore(file)) {
                const srcPath = path.join(this.repoPath, file);
                const destPath = path.join(backupPath, 'untracked_files', file.replace(/\//g, '_'));
                await fs.ensureDir(path.dirname(destPath));
                
                try {
                    const stats = await fs.stat(srcPath);
                    if (stats.isFile()) {
                        await fs.copy(srcPath, destPath);
                        backupInfo.files.untracked.push(file);
                    }
                } catch (error) {
                    console.warn(`Could not backup ${file}: ${error.message}`);
                }
            }
        }

        // Save backup info
        await fs.writeJson(path.join(backupPath, 'backup_info.json'), backupInfo, { spaces: 2 });

        // Save current git status
        const statusOutput = await this.git.raw(['status', '--short']);
        await fs.writeFile(path.join(backupPath, 'git_status.txt'), statusOutput);

        spinner.succeed('バックアップ完了');

        console.log('\n保存内容:');
        console.log(`  • 変更されたファイル: ${backupInfo.files.modified.length}個`);
        console.log(`  • 追加されたファイル: ${backupInfo.files.added.length}個`);
        console.log(`  • 削除されたファイル: ${backupInfo.files.deleted.length}個`);
        console.log(`  • 未追跡ファイル: ${backupInfo.files.untracked.length}個`);
        console.log(chalk.green('\n✅ バックアップ完了\n'));

        await this.cleanOldBackups();

        return backupPath;
    }

    shouldIgnore(file) {
        for (const pattern of this.settings.ignore_patterns) {
            if (pattern.endsWith('/')) {
                if (file.startsWith(pattern)) return true;
            } else if (pattern.startsWith('*.')) {
                if (file.endsWith(pattern.slice(1))) return true;
            } else if (file.includes(pattern)) {
                return true;
            }
        }
        return false;
    }

    async cleanOldBackups() {
        if (this.settings.backup_retention_days <= 0) return;

        try {
            const backups = await fs.readdir(this.backupDir);
            const cutoffDate = moment().subtract(this.settings.backup_retention_days, 'days');

            for (const backup of backups) {
                const backupDate = moment(backup, 'YYYY-MM-DD_HHmmss');
                if (backupDate.isBefore(cutoffDate)) {
                    await fs.remove(path.join(this.backupDir, backup));
                    console.log(chalk.gray(`Cleaned old backup: ${backup}`));
                }
            }
        } catch (error) {
            console.warn('Could not clean old backups:', error.message);
        }
    }

    async executeForcePull(options = {}) {
        const spinner = ora('強制Pull実行中...').start();
        const logLines = [];

        try {
            // Step 1: Record current state
            spinner.text = '[1/6] ローカル状態を記録';
            const statusLog = await this.git.raw(['status', '--short']);
            const logPath = path.join(this.repoPath, '.git-analyzer', 'last-local-changes.log');
            await fs.ensureDir(path.dirname(logPath));
            await fs.writeFile(logPath, statusLog);
            logLines.push(`完了: ${logPath}`);

            // Step 2: Reset hard
            spinner.text = '[2/6] ローカル変更を破棄 (git reset --hard)';
            await this.git.reset(['--hard', 'HEAD']);
            const modifiedCount = (statusLog.match(/^M /gm) || []).length;
            logLines.push(`${modifiedCount} ファイルをリセット`);

            // Step 3: Clean untracked files
            spinner.text = '[3/6] 未追跡ファイルを削除 (git clean -fd)';
            const cleanResult = await this.git.clean('f', ['-d']);
            const cleanedCount = cleanResult.length;
            logLines.push(`${cleanedCount} ファイルを削除`);

            // Step 4: Fetch all
            spinner.text = '[4/6] リモート情報を取得 (git fetch)';
            await this.git.fetch(['--all', '--prune']);
            logLines.push('origin: 最新情報を取得');

            // Step 5: Reset to remote
            spinner.text = '[5/6] ブランチを強制更新';
            const currentBranch = (await this.git.status()).current;
            await this.git.reset(['--hard', `origin/${currentBranch}`]);
            logLines.push(`${currentBranch} → origin/${currentBranch}`);

            // Step 6: Update submodules
            if (this.settings.submodules_update) {
                spinner.text = '[6/6] サブモジュール更新';
                try {
                    await this.git.submoduleUpdate(['--init', '--recursive', '--force']);
                    logLines.push('サブモジュールを更新');
                } catch (error) {
                    logLines.push('サブモジュールなし');
                }
            }

            spinner.succeed('強制Pull完了！');

            // Get new status
            const newStatus = await this.git.status();
            const log = await this.git.log(['-10', '--oneline']);

            console.log(chalk.green('\n✅ 強制Pull完了！\n'));
            console.log('結果:');
            logLines.forEach((line, index) => {
                console.log(`  [${index + 1}/6] ${line}`);
            });

            console.log('\n現在の状態:');
            console.log(`  • ブランチ: ${newStatus.current}`);
            console.log(`  • 最新コミット: ${log.latest.hash.substring(0, 7)} - ${log.latest.message}`);

            return {
                success: true,
                branch: newStatus.current,
                logs: logLines
            };

        } catch (error) {
            spinner.fail('強制Pullに失敗しました');
            throw error;
        }
    }

    async performForcePull(options = {}) {
        console.log(chalk.cyan('\n🔄 強制Pullを開始します...\n'));

        // Check status
        const status = await this.checkStatus();
        
        if (!status.hasChanges && status.behind === 0) {
            console.log(chalk.green('✅ リポジトリは既に最新状態です。'));
            return { success: true, alreadyUpToDate: true };
        }

        // Confirm action
        const action = await this.confirmAction(status);

        if (action === 'cancel') {
            console.log(chalk.yellow('\n❌ 操作がキャンセルされました'));
            return { success: false, cancelled: true };
        }

        // Create backup if requested
        let backupPath = null;
        if (action === 'backup' || (this.settings.always_backup && status.hasChanges)) {
            backupPath = await this.createBackup();
        }

        // Execute force pull
        const result = await this.executeForcePull(options);
        result.backupPath = backupPath;

        return result;
    }

    async restoreBackup(backupId = 'latest') {
        const backups = await fs.readdir(this.backupDir);
        
        if (backups.length === 0) {
            throw new Error('No backups found');
        }

        let backupPath;
        if (backupId === 'latest') {
            backups.sort().reverse();
            backupPath = path.join(this.backupDir, backups[0]);
        } else {
            backupPath = path.join(this.backupDir, backupId);
        }

        if (!await fs.pathExists(backupPath)) {
            throw new Error(`Backup not found: ${backupId}`);
        }

        const backupInfo = await fs.readJson(path.join(backupPath, 'backup_info.json'));
        
        console.log(chalk.blue(`\n📂 Restoring backup from ${backupInfo.timestamp}...`));

        // Restore modified files
        const changedDir = path.join(backupPath, 'changed_files');
        if (await fs.pathExists(changedDir)) {
            const files = await fs.readdir(changedDir);
            for (const file of files) {
                const destFile = file.replace(/_/g, '/');
                const srcPath = path.join(changedDir, file);
                const destPath = path.join(this.repoPath, destFile);
                await fs.ensureDir(path.dirname(destPath));
                await fs.copy(srcPath, destPath, { overwrite: true });
                console.log(chalk.gray(`  Restored: ${destFile}`));
            }
        }

        // Restore added files
        const addedDir = path.join(backupPath, 'added_files');
        if (await fs.pathExists(addedDir)) {
            const files = await fs.readdir(addedDir);
            for (const file of files) {
                const destFile = file.replace(/_/g, '/');
                const srcPath = path.join(addedDir, file);
                const destPath = path.join(this.repoPath, destFile);
                await fs.ensureDir(path.dirname(destPath));
                await fs.copy(srcPath, destPath, { overwrite: true });
                console.log(chalk.gray(`  Restored: ${destFile}`));
            }
        }

        // Restore untracked files
        const untrackedDir = path.join(backupPath, 'untracked_files');
        if (await fs.pathExists(untrackedDir)) {
            const files = await fs.readdir(untrackedDir);
            for (const file of files) {
                const destFile = file.replace(/_/g, '/');
                const srcPath = path.join(untrackedDir, file);
                const destPath = path.join(this.repoPath, destFile);
                await fs.ensureDir(path.dirname(destPath));
                await fs.copy(srcPath, destPath, { overwrite: true });
                console.log(chalk.gray(`  Restored: ${destFile}`));
            }
        }

        console.log(chalk.green('\n✅ Backup restored successfully'));
        
        return backupInfo;
    }

    async listBackups() {
        await fs.ensureDir(this.backupDir);
        const backups = await fs.readdir(this.backupDir);
        
        if (backups.length === 0) {
            console.log(chalk.yellow('No backups found'));
            return [];
        }

        const backupList = [];
        
        for (const backup of backups.sort().reverse()) {
            const backupPath = path.join(this.backupDir, backup);
            try {
                const info = await fs.readJson(path.join(backupPath, 'backup_info.json'));
                const stats = await fs.stat(backupPath);
                
                backupList.push({
                    id: backup,
                    timestamp: info.timestamp,
                    branch: info.branch,
                    filesCount: info.files.modified.length + 
                               info.files.added.length + 
                               info.files.untracked.length,
                    size: await this.getDirectorySize(backupPath)
                });
            } catch (error) {
                console.warn(`Could not read backup ${backup}: ${error.message}`);
            }
        }

        return backupList;
    }

    async getDirectorySize(dirPath) {
        let totalSize = 0;
        
        async function calculateSize(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    await calculateSize(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                }
            }
        }
        
        await calculateSize(dirPath);
        return this.formatSize(totalSize);
    }
}