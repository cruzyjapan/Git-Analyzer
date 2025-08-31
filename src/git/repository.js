import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import { SecurityManager } from './security.js';
import { ERROR_CODES } from '../core/error_handler.js';

export class Repository {
    constructor(repoPath, environments = {}) {
        this.path = path.resolve(repoPath);
        this.git = simpleGit(this.path);
        this.environments = environments;
        this.security = new SecurityManager();
        this.configPath = path.join(this.path, '.git-analyzer', 'config.json');
    }

    async validate() {
        try {
            const isRepo = await this.git.checkIsRepo();
            if (!isRepo) {
                throw new Error(`Not a git repository: ${this.path}`);
            }
            
            await this.checkReadPermissions();
            return true;
        } catch (error) {
            throw {
                code: ERROR_CODES.GIT_REPO_NOT_FOUND,
                message: error.message,
                path: this.path
            };
        }
    }

    async checkReadPermissions() {
        try {
            await fs.access(this.path, fs.constants.R_OK);
            const gitPath = path.join(this.path, '.git');
            await fs.access(gitPath, fs.constants.R_OK);
        } catch (error) {
            throw {
                code: ERROR_CODES.GIT_ACCESS_DENIED,
                message: 'No read access to repository',
                path: this.path
            };
        }
    }

    async getAllBranches() {
        await this.validate();
        
        const branchSummary = await this.git.branch(['-a']);
        const branches = branchSummary.all
            .map(branch => branch.replace('remotes/', ''))
            .filter(branch => !branch.includes('HEAD'))
            .map(branch => branch.trim());
        
        return [...new Set(branches)];
    }

    async getDefaultBranch() {
        try {
            const remotes = await this.git.getRemotes(true);
            if (remotes.length === 0) return null;
            
            const origin = remotes.find(r => r.name === 'origin') || remotes[0];
            const config = await this.git.listConfig();
            
            const defaultBranchKey = `remote.${origin.name}.HEAD`;
            const defaultBranch = config.all[defaultBranchKey];
            
            if (defaultBranch) {
                return defaultBranch.replace(`refs/remotes/${origin.name}/`, '');
            }
            
            const result = await this.git.raw(['symbolic-ref', `refs/remotes/${origin.name}/HEAD`]);
            if (result) {
                return result.trim().replace(`refs/remotes/${origin.name}/`, '');
            }
        } catch (error) {
            console.warn('Could not determine default branch:', error.message);
        }
        
        return null;
    }

    async fetchLatest() {
        this.security.validateGitCommand('git fetch');
        
        try {
            await this.git.fetch(['--all', '--prune']);
            return true;
        } catch (error) {
            console.warn('Fetch failed (continuing with local data):', error.message);
            return false;
        }
    }

    async getCommitHistory(branch, limit = 100, filters = {}) {
        this.security.validateGitCommand(`git log ${branch}`);
        
        const logOptions = {
            from: branch,
            maxCount: limit,
            format: {
                hash: '%H',
                abbrevHash: '%h',
                author: '%an',
                authorEmail: '%ae',
                date: '%ai',
                message: '%s',
                body: '%b'
            }
        };

        // Add date range filters
        if (filters.since) {
            logOptions['--since'] = filters.since;
        }
        if (filters.until) {
            logOptions['--until'] = filters.until;
        }

        // Add file path filter
        if (filters.file) {
            logOptions.file = filters.file;
        }

        const logs = await this.git.log(logOptions);
        
        // Apply author filter if specified
        let commits = logs.all;
        if (filters.author) {
            commits = commits.filter(commit => 
                commit.author.toLowerCase().includes(filters.author.toLowerCase())
            );
        }

        // Apply commit range filters
        if (filters.fromCommit || filters.toCommit) {
            commits = await this.filterCommitRange(commits, filters.fromCommit, filters.toCommit);
        }

        // Apply specific commit filter
        if (filters.commit) {
            commits = commits.filter(commit => 
                commit.hash.startsWith(filters.commit) || 
                commit.abbrevHash.startsWith(filters.commit)
            );
        }
        
        return commits;
    }

    async filterCommitRange(commits, fromCommit, toCommit) {
        let startIndex = 0;
        let endIndex = commits.length;

        if (fromCommit) {
            const fromIndex = commits.findIndex(c => 
                c.hash.startsWith(fromCommit) || c.abbrevHash.startsWith(fromCommit)
            );
            if (fromIndex !== -1) startIndex = fromIndex;
        }

        if (toCommit) {
            const toIndex = commits.findIndex(c => 
                c.hash.startsWith(toCommit) || c.abbrevHash.startsWith(toCommit)
            );
            if (toIndex !== -1) endIndex = toIndex + 1;
        }

        return commits.slice(startIndex, endIndex);
    }

    async getDiff(sourceBranch, targetBranch, filters = {}) {
        this.security.validateGitCommand(`git diff ${sourceBranch}..${targetBranch}`);
        
        // Note: Git diff uses target...source to show "what's in source but not in target"
        const diffArgs = [`${targetBranch}...${sourceBranch}`];
        
        // Add file pattern filters
        if (filters.files) {
            // Multiple file patterns
            const patterns = filters.files.split(',').map(p => p.trim());
            diffArgs.push('--', ...patterns);
        } else if (filters.file) {
            // Single file pattern
            diffArgs.push('--', filters.file);
        }
        
        // ファイルリストと状態を取得
        const nameStatus = await this.git.diff([
            ...diffArgs,
            '--name-status'
        ]);
        
        // 詳細な差分（パッチ形式）を取得
        const detailedDiff = await this.git.diff([
            ...diffArgs,
            '--unified=5' // コンテキスト行を5行含める
        ]);
        
        // 統計情報を取得
        const stats = await this.git.raw([
            'diff',
            ...diffArgs,
            '--shortstat'
        ]);
        
        // ファイルごとの詳細な差分を取得
        const files = this.parseDiffFiles(nameStatus);
        
        // Apply exclude filter
        let filteredFiles = files;
        if (filters.exclude) {
            const excludePatterns = filters.exclude.split(',').map(p => p.trim());
            filteredFiles = files.filter(file => {
                return !excludePatterns.some(pattern => {
                    // Simple glob pattern matching
                    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
                    return regex.test(file.path);
                });
            });
        }
        
        // 各ファイルの実際の内容変更を取得
        for (const file of filteredFiles) {
            try {
                // ファイルごとの差分を取得
                file.diff = await this.git.diff([
                    `${targetBranch}...${sourceBranch}`,
                    '--',
                    file.path
                ]);
                
                // 追加/削除された行数を取得
                const fileStat = await this.git.raw([
                    'diff',
                    `${targetBranch}...${sourceBranch}`,
                    '--numstat',
                    '--',
                    file.path
                ]);
                
                const statMatch = fileStat.match(/(\d+)\s+(\d+)/);
                if (statMatch) {
                    file.additions = parseInt(statMatch[1]) || 0;
                    file.deletions = parseInt(statMatch[2]) || 0;
                }
            } catch (error) {
                // ファイルが削除された場合などエラーになる可能性がある
                file.diff = '';
                file.additions = 0;
                file.deletions = 0;
            }
        }
        
        return {
            summary: this.parseDiffStats(stats),
            files: filteredFiles,
            detailed: detailedDiff,
            sourceBranch,
            targetBranch,
            rawDiff: detailedDiff, // AI解析用に生の差分も含める
            filters // Include applied filters in result
        };
    }

    parseDiffStats(stats) {
        const match = stats.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
        
        if (match) {
            return {
                filesChanged: parseInt(match[1]) || 0,
                insertions: parseInt(match[2]) || 0,
                deletions: parseInt(match[3]) || 0
            };
        }
        
        return {
            filesChanged: 0,
            insertions: 0,
            deletions: 0
        };
    }

    parseDiffFiles(diff) {
        const lines = diff.split('\n').filter(line => line.trim());
        const files = [];
        
        for (const line of lines) {
            const match = line.match(/^([AMD])\s+(.+)$/);
            if (match) {
                const [, status, filePath] = match;
                files.push({
                    status: this.mapFileStatus(status),
                    path: filePath.trim()
                });
            }
        }
        
        return files;
    }

    mapFileStatus(status) {
        const statusMap = {
            'A': 'added',
            'M': 'modified',
            'D': 'deleted',
            'R': 'renamed',
            'C': 'copied',
            'U': 'updated'
        };
        
        return statusMap[status] || 'unknown';
    }

    async getFileContent(branch, filePath) {
        this.security.validateGitCommand(`git show ${branch}:${filePath}`);
        
        try {
            const content = await this.git.show([`${branch}:${filePath}`]);
            return content;
        } catch (error) {
            return null;
        }
    }

    async saveEnvironmentConfig(config) {
        const configDir = path.dirname(this.configPath);
        await fs.ensureDir(configDir);
        
        const fullConfig = {
            repository: this.path,
            environments: {
                production: config.production !== 'None' ? config.production : null,
                staging: config.staging !== 'None' ? config.staging : null,
                development: config.development !== 'None' ? config.development : null
            },
            created: new Date().toISOString(),
            version: '1.0.0'
        };
        
        await fs.writeJson(this.configPath, fullConfig, { spaces: 2 });
        this.environments = fullConfig.environments;
        
        return fullConfig;
    }

    async loadEnvironmentConfig() {
        try {
            if (await fs.pathExists(this.configPath)) {
                const config = await fs.readJson(this.configPath);
                this.environments = config.environments;
                return config;
            }
        } catch (error) {
            console.warn('Could not load config:', error.message);
        }
        
        return null;
    }

    async getStatus() {
        this.security.validateGitCommand('git status');
        
        const status = await this.git.status();
        return {
            current: status.current,
            tracking: status.tracking,
            ahead: status.ahead,
            behind: status.behind,
            files: status.files,
            modified: status.modified,
            created: status.created,
            deleted: status.deleted,
            renamed: status.renamed
        };
    }

    async getCurrentBranch() {
        const status = await this.getStatus();
        return status.current;
    }

    async getRemotes() {
        const remotes = await this.git.getRemotes(true);
        return remotes.map(remote => ({
            name: remote.name,
            url: remote.refs.fetch || remote.refs.push
        }));
    }
}

export async function initializeRepository(repoPath, options = {}) {
    const repository = new Repository(repoPath);
    
    await repository.validate();
    
    if (options.config) {
        const configPath = path.resolve(options.config);
        const config = await fs.readJson(configPath);
        repository.environments = config.environments;
    } else {
        await repository.loadEnvironmentConfig();
    }
    
    await repository.fetchLatest();
    
    const branches = await repository.getAllBranches();
    
    if (options.autoDetect || (!repository.environments.production && !options.interactive)) {
        const { BranchDetector } = await import('./branch_detector.js');
        const detector = new BranchDetector();
        const detected = await detector.detectEnvironments(branches);
        repository.environments = detected;
        
        if (!options.interactive) {
            await repository.saveEnvironmentConfig({ 
                production: detected.production,
                staging: detected.staging,
                development: detected.development
            });
        }
    }
    
    return repository;
}