import { Repository } from './repository.js';
import { BranchDetector } from './branch_detector.js';
import chalk from 'chalk';

export class BranchManager {
    constructor(repoPath = process.cwd()) {
        this.repository = new Repository(repoPath);
        this.detector = new BranchDetector();
    }

    async listBranches() {
        await this.repository.validate();
        return await this.repository.getAllBranches();
    }

    async getEnvironmentMapping() {
        await this.repository.loadEnvironmentConfig();
        return this.repository.environments || {};
    }

    async detectEnvironments() {
        await this.repository.validate();
        const branches = await this.repository.getAllBranches();
        const defaultBranch = await this.repository.getDefaultBranch();
        
        const detected = await this.detector.detectEnvironments(branches, defaultBranch);
        
        const strategy = this.detector.detectBranchingStrategy(branches);
        console.log(chalk.blue(`\n📊 Branching Strategy: ${strategy.strategy} (${strategy.confidence} confidence)`));
        console.log(chalk.gray(strategy.description));
        
        const relations = this.detector.analyzeEnvironmentRelations(branches, detected);
        
        if (relations.suggestions.length > 0) {
            console.log(chalk.yellow('\n💡 Suggestions:'));
            for (const suggestion of relations.suggestions) {
                const icon = suggestion.type === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`  ${icon} ${suggestion.message}`);
                if (suggestion.recommendation) {
                    console.log(chalk.gray(`     ${suggestion.recommendation}`));
                }
            }
        }
        
        return detected;
    }

    async setProductionBranch(branch) {
        await this.repository.validate();
        const branches = await this.repository.getAllBranches();
        
        if (!branches.includes(branch)) {
            throw new Error(`Branch '${branch}' not found in repository`);
        }
        
        await this.repository.loadEnvironmentConfig();
        const config = {
            production: branch,
            staging: this.repository.environments?.staging,
            development: this.repository.environments?.development
        };
        
        await this.repository.saveEnvironmentConfig(config);
        return config;
    }

    async setStagingBranch(branch) {
        await this.repository.validate();
        const branches = await this.repository.getAllBranches();
        
        if (!branches.includes(branch)) {
            throw new Error(`Branch '${branch}' not found in repository`);
        }
        
        await this.repository.loadEnvironmentConfig();
        const config = {
            production: this.repository.environments?.production,
            staging: branch,
            development: this.repository.environments?.development
        };
        
        await this.repository.saveEnvironmentConfig(config);
        return config;
    }

    async setDevelopmentBranch(branch) {
        await this.repository.validate();
        const branches = await this.repository.getAllBranches();
        
        if (!branches.includes(branch)) {
            throw new Error(`Branch '${branch}' not found in repository`);
        }
        
        await this.repository.loadEnvironmentConfig();
        const config = {
            production: this.repository.environments?.production,
            staging: this.repository.environments?.staging,
            development: branch
        };
        
        await this.repository.saveEnvironmentConfig(config);
        return config;
    }

    async getEnvironmentBranch(environment) {
        await this.repository.loadEnvironmentConfig();
        return this.repository.environments?.[environment];
    }

    async validateEnvironmentSetup() {
        await this.repository.loadEnvironmentConfig();
        const validation = this.detector.validateEnvironmentSetup(this.repository.environments);
        
        if (!validation.valid) {
            console.log(chalk.red('\n❌ Environment setup validation failed:'));
            for (const issue of validation.issues) {
                const icon = issue.level === 'error' ? '❌' : '⚠️';
                console.log(`  ${icon} ${issue.message}`);
            }
        } else {
            console.log(chalk.green('\n✅ Environment setup is valid'));
        }
        
        return validation;
    }

    async compareEnvironments(env1, env2) {
        const branch1 = await this.getEnvironmentBranch(env1);
        const branch2 = await this.getEnvironmentBranch(env2);
        
        if (!branch1) {
            throw new Error(`Environment '${env1}' not configured`);
        }
        if (!branch2) {
            throw new Error(`Environment '${env2}' not configured`);
        }
        
        const diff = await this.repository.getDiff(branch1, branch2);
        
        console.log(chalk.cyan(`\n📊 Comparing ${env1} (${branch1}) with ${env2} (${branch2}):`));
        console.log(`  Files changed: ${diff.summary.filesChanged}`);
        console.log(`  Lines added: ${chalk.green('+' + diff.summary.insertions)}`);
        console.log(`  Lines deleted: ${chalk.red('-' + diff.summary.deletions)}`);
        
        return diff;
    }

    async getFeatureBranches() {
        const branches = await this.repository.getAllBranches();
        return this.detector.detectFeatureBranches(branches);
    }

    async getMergedBranches() {
        await this.repository.validate();
        const currentBranch = await this.repository.getCurrentBranch();
        
        const mergedBranches = [];
        const branches = await this.repository.getAllBranches();
        
        for (const branch of branches) {
            if (branch === currentBranch) continue;
            
            try {
                const diff = await this.repository.getDiff(branch, currentBranch);
                if (diff.summary.filesChanged === 0) {
                    mergedBranches.push(branch);
                }
            } catch (error) {
                console.warn(`Could not check if ${branch} is merged: ${error.message}`);
            }
        }
        
        return mergedBranches;
    }

    async getStaleB
ranches(daysOld = 30) {
        const branches = await this.repository.getAllBranches();
        const staleBranches = [];
        
        for (const branch of branches) {
            try {
                const commits = await this.repository.getCommitHistory(branch, 1);
                if (commits.length > 0) {
                    const lastCommitDate = new Date(commits[0].date);
                    const daysSinceLastCommit = (Date.now() - lastCommitDate) / (1000 * 60 * 60 * 24);
                    
                    if (daysSinceLastCommit > daysOld) {
                        staleBranches.push({
                            branch,
                            lastCommit: commits[0],
                            daysOld: Math.floor(daysSinceLastCommit)
                        });
                    }
                }
            } catch (error) {
                console.warn(`Could not check branch ${branch}: ${error.message}`);
            }
        }
        
        return staleBranches;
    }
}