import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

export class RepositoryRegistry {
    constructor() {
        this.configDir = path.join(os.homedir(), '.git-analyzer');
        this.registryPath = path.join(this.configDir, 'repository-registry.json');
        this.lastUsedPath = path.join(this.configDir, 'last-used.json');
        this.ensureConfigDir();
    }

    async ensureConfigDir() {
        await fs.ensureDir(this.configDir);
    }

    async loadRegistry() {
        try {
            if (await fs.pathExists(this.registryPath)) {
                return await fs.readJson(this.registryPath);
            }
        } catch (error) {
            console.warn('Could not load repository registry:', error.message);
        }
        
        return {
            repositories: [],
            default_repository: null,
            version: '1.0.0'
        };
    }

    async saveRegistry(registry) {
        await this.ensureConfigDir();
        await fs.writeJson(this.registryPath, registry, { spaces: 2 });
    }

    async addRepository(repoPath, name, options = {}) {
        const registry = await this.loadRegistry();
        
        const absolutePath = path.resolve(repoPath);
        
        if (!await fs.pathExists(path.join(absolutePath, '.git'))) {
            throw new Error(`Not a git repository: ${absolutePath}`);
        }
        
        const existing = registry.repositories.find(r => r.path === absolutePath);
        if (existing) {
            throw new Error(`Repository already registered: ${existing.name}`);
        }
        
        const repoId = options.id || `repo-${uuidv4().slice(0, 8)}`;
        
        const simpleGit = (await import('simple-git')).default;
        const git = simpleGit(absolutePath);
        
        let defaultBranch = 'main';
        try {
            const branches = await git.branch();
            defaultBranch = branches.current;
        } catch (error) {
            console.warn('Could not determine default branch:', error.message);
        }
        
        const repository = {
            id: repoId,
            name: name || path.basename(absolutePath),
            path: absolutePath,
            remote: options.remote || 'origin',
            default_branch: options.defaultBranch || defaultBranch,
            last_analyzed: null,
            auto_pull: options.autoPull !== false,
            added_at: new Date().toISOString()
        };
        
        registry.repositories.push(repository);
        
        if (!registry.default_repository) {
            registry.default_repository = repoId;
        }
        
        await this.saveRegistry(registry);
        
        console.log(chalk.green(`✅ Repository added: ${repository.name}`));
        console.log(chalk.gray(`   ID: ${repository.id}`));
        console.log(chalk.gray(`   Path: ${repository.path}`));
        
        return repository;
    }

    async removeRepository(repoId) {
        const registry = await this.loadRegistry();
        
        const index = registry.repositories.findIndex(r => 
            r.id === repoId || r.path === repoId
        );
        
        if (index === -1) {
            throw new Error(`Repository not found: ${repoId}`);
        }
        
        const removed = registry.repositories[index];
        registry.repositories.splice(index, 1);
        
        if (registry.default_repository === removed.id) {
            registry.default_repository = registry.repositories[0]?.id || null;
        }
        
        await this.saveRegistry(registry);
        
        console.log(chalk.yellow(`🗑️  Repository removed: ${removed.name}`));
        
        return removed;
    }

    async updateRepository(repoId, updates) {
        const registry = await this.loadRegistry();
        
        const repo = registry.repositories.find(r => 
            r.id === repoId || r.path === repoId
        );
        
        if (!repo) {
            throw new Error(`Repository not found: ${repoId}`);
        }
        
        Object.assign(repo, updates, {
            updated_at: new Date().toISOString()
        });
        
        await this.saveRegistry(registry);
        
        console.log(chalk.green(`✅ Repository updated: ${repo.name}`));
        
        return repo;
    }

    async getRepository(repoId) {
        const registry = await this.loadRegistry();
        
        if (!repoId) {
            return registry.repositories.find(r => r.id === registry.default_repository);
        }
        
        return registry.repositories.find(r => 
            r.id === repoId || r.path === repoId || r.name === repoId
        );
    }

    async listRepositories() {
        const registry = await this.loadRegistry();
        return registry.repositories;
    }

    async setDefaultRepository(repoId) {
        const registry = await this.loadRegistry();
        
        const repo = registry.repositories.find(r => 
            r.id === repoId || r.path === repoId
        );
        
        if (!repo) {
            throw new Error(`Repository not found: ${repoId}`);
        }
        
        registry.default_repository = repo.id;
        await this.saveRegistry(registry);
        
        console.log(chalk.green(`✅ Default repository set to: ${repo.name}`));
        
        return repo;
    }

    async getDefaultRepository() {
        const registry = await this.loadRegistry();
        
        if (!registry.default_repository) {
            return null;
        }
        
        return registry.repositories.find(r => r.id === registry.default_repository);
    }

    async updateLastAnalyzed(repoId) {
        await this.updateRepository(repoId, {
            last_analyzed: new Date().toISOString()
        });
    }

    async setLastUsed(repoId) {
        await this.ensureConfigDir();
        
        const data = {
            repository_id: repoId,
            used_at: new Date().toISOString()
        };
        
        await fs.writeJson(this.lastUsedPath, data, { spaces: 2 });
    }

    async getLastUsed() {
        try {
            if (await fs.pathExists(this.lastUsedPath)) {
                const data = await fs.readJson(this.lastUsedPath);
                return await this.getRepository(data.repository_id);
            }
        } catch (error) {
            console.warn('Could not load last used repository:', error.message);
        }
        
        return null;
    }

    async displayRepositoryList() {
        const repositories = await this.listRepositories();
        const registry = await this.loadRegistry();
        
        if (repositories.length === 0) {
            console.log(chalk.yellow('\n📭 No repositories registered yet.'));
            console.log(chalk.gray('Use "git-analyzer add-repo" to add your first repository.\n'));
            return null;
        }
        
        console.log(chalk.cyan('\n登録済みリポジトリ:\n'));
        
        repositories.forEach((repo, index) => {
            const isDefault = repo.id === registry.default_repository;
            const lastAnalyzed = repo.last_analyzed 
                ? moment(repo.last_analyzed).format('YYYY-MM-DD HH:mm')
                : '未実施';
            
            console.log(chalk.white(`  ${index + 1}. ${repo.name}`) + 
                       (isDefault ? chalk.green(' [デフォルト]') : ''));
            console.log(chalk.gray(`     📁 ${repo.path}`));
            console.log(chalk.gray(`     🕒 最終解析: ${lastAnalyzed}`));
            console.log();
        });
        
        return repositories;
    }

    async selectRepository(prompt = true) {
        const repositories = await this.listRepositories();
        
        if (repositories.length === 0) {
            console.log(chalk.yellow('\n📭 No repositories registered.'));
            return null;
        }
        
        if (repositories.length === 1) {
            return repositories[0];
        }
        
        if (!prompt) {
            return await this.getDefaultRepository();
        }
        
        const inquirer = (await import('inquirer')).default;
        
        await this.displayRepositoryList();
        
        const choices = [
            ...repositories.map((repo, index) => ({
                name: `${index + 1}. ${repo.name}`,
                value: repo.id
            })),
            { name: '➕ 新規リポジトリを追加', value: 'add_new' },
            { name: '❌ 終了', value: 'exit' }
        ];
        
        const { selected } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selected',
                message: 'リポジトリを選択してください:',
                choices,
                pageSize: 10
            }
        ]);
        
        if (selected === 'exit') {
            return null;
        }
        
        if (selected === 'add_new') {
            return 'add_new';
        }
        
        const selectedRepo = await this.getRepository(selected);
        await this.setLastUsed(selected);
        
        return selectedRepo;
    }

    async validateRepository(repoPath) {
        const absolutePath = path.resolve(repoPath);
        
        if (!await fs.pathExists(absolutePath)) {
            return {
                valid: false,
                error: 'Path does not exist'
            };
        }
        
        if (!await fs.pathExists(path.join(absolutePath, '.git'))) {
            return {
                valid: false,
                error: 'Not a git repository'
            };
        }
        
        try {
            const stats = await fs.stat(absolutePath);
            if (!stats.isDirectory()) {
                return {
                    valid: false,
                    error: 'Path is not a directory'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
        
        return {
            valid: true,
            path: absolutePath
        };
    }

    async importFromDirectory(searchDir) {
        const absolutePath = path.resolve(searchDir);
        const found = [];
        
        async function findGitRepos(dir, depth = 0) {
            if (depth > 3) return;
            
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (!entry.isDirectory()) continue;
                    if (entry.name.startsWith('.') && entry.name !== '.git') continue;
                    if (entry.name === 'node_modules') continue;
                    
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.name === '.git') {
                        found.push(path.dirname(fullPath));
                    } else {
                        await findGitRepos(fullPath, depth + 1);
                    }
                }
            } catch (error) {
                console.warn(`Could not search ${dir}:`, error.message);
            }
        }
        
        await findGitRepos(absolutePath);
        
        const registry = await this.loadRegistry();
        const existing = new Set(registry.repositories.map(r => r.path));
        
        const newRepos = found.filter(repo => !existing.has(repo));
        
        if (newRepos.length === 0) {
            console.log(chalk.yellow('No new repositories found.'));
            return [];
        }
        
        console.log(chalk.cyan(`\nFound ${newRepos.length} new repositories:`));
        newRepos.forEach(repo => {
            console.log(chalk.gray(`  • ${repo}`));
        });
        
        const inquirer = (await import('inquirer')).default;
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Import all ${newRepos.length} repositories?`,
                default: true
            }
        ]);
        
        if (!confirm) {
            return [];
        }
        
        const imported = [];
        
        for (const repoPath of newRepos) {
            try {
                const repo = await this.addRepository(
                    repoPath,
                    path.basename(repoPath)
                );
                imported.push(repo);
            } catch (error) {
                console.error(chalk.red(`Failed to import ${repoPath}: ${error.message}`));
            }
        }
        
        console.log(chalk.green(`\n✅ Imported ${imported.length} repositories`));
        
        return imported;
    }

    async exportRegistry(outputPath) {
        const registry = await this.loadRegistry();
        const exportPath = outputPath || path.join(process.cwd(), 'repository-registry-export.json');
        
        await fs.writeJson(exportPath, registry, { spaces: 2 });
        
        console.log(chalk.green(`✅ Registry exported to: ${exportPath}`));
        
        return exportPath;
    }

    async importRegistry(importPath) {
        if (!await fs.pathExists(importPath)) {
            throw new Error(`Import file not found: ${importPath}`);
        }
        
        const imported = await fs.readJson(importPath);
        
        if (!imported.repositories || !Array.isArray(imported.repositories)) {
            throw new Error('Invalid registry format');
        }
        
        const registry = await this.loadRegistry();
        const existing = new Set(registry.repositories.map(r => r.path));
        
        let importedCount = 0;
        
        for (const repo of imported.repositories) {
            if (!existing.has(repo.path)) {
                registry.repositories.push(repo);
                importedCount++;
            }
        }
        
        if (importedCount > 0) {
            await this.saveRegistry(registry);
            console.log(chalk.green(`✅ Imported ${importedCount} repositories`));
        } else {
            console.log(chalk.yellow('No new repositories to import'));
        }
        
        return importedCount;
    }
}