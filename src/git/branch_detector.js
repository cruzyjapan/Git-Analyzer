import chalk from 'chalk';

export class BranchDetector {
    constructor() {
        this.patterns = {
            production: [
                { pattern: /^(origin\/)?main$/, priority: 1 },
                { pattern: /^(origin\/)?master$/, priority: 2 },
                { pattern: /^(origin\/)?production$/, priority: 3 },
                { pattern: /^(origin\/)?prod$/, priority: 4 },
                { pattern: /^(origin\/)?release$/, priority: 5 },
                { pattern: /^(origin\/)?live$/, priority: 6 }
            ],
            staging: [
                { pattern: /^(origin\/)?staging$/, priority: 1 },
                { pattern: /^(origin\/)?stage$/, priority: 2 },
                { pattern: /^(origin\/)?test$/, priority: 3 },
                { pattern: /^(origin\/)?testing$/, priority: 4 },
                { pattern: /^(origin\/)?qa$/, priority: 5 },
                { pattern: /^(origin\/)?uat$/, priority: 6 },
                { pattern: /^(origin\/)?pre-prod$/, priority: 7 },
                { pattern: /^(origin\/)?preprod$/, priority: 8 }
            ],
            development: [
                { pattern: /^(origin\/)?develop$/, priority: 1 },
                { pattern: /^(origin\/)?development$/, priority: 2 },
                { pattern: /^(origin\/)?dev$/, priority: 3 },
                { pattern: /^(origin\/)?next$/, priority: 4 },
                { pattern: /^(origin\/)?integration$/, priority: 5 }
            ]
        };
    }

    async detectEnvironments(branches, defaultBranch = null) {
        const environments = {
            production: null,
            staging: null,
            development: null
        };

        environments.production = this.detectProductionBranch(branches, defaultBranch);
        environments.staging = this.detectBranch(branches, 'staging');
        environments.development = this.detectBranch(branches, 'development');

        this.logDetectionResults(environments);
        
        return environments;
    }

    detectProductionBranch(branches, defaultBranch = null) {
        if (defaultBranch && branches.includes(defaultBranch)) {
            return defaultBranch;
        }

        if (defaultBranch) {
            const withOrigin = `origin/${defaultBranch}`;
            if (branches.includes(withOrigin)) {
                return withOrigin;
            }
        }

        return this.detectBranch(branches, 'production');
    }

    detectBranch(branches, environment) {
        const patterns = this.patterns[environment];
        if (!patterns) return null;

        const matches = [];

        for (const branch of branches) {
            for (const { pattern, priority } of patterns) {
                if (pattern.test(branch)) {
                    matches.push({ branch, priority });
                    break;
                }
            }
        }

        if (matches.length === 0) {
            return this.fuzzyDetect(branches, environment);
        }

        matches.sort((a, b) => a.priority - b.priority);
        return matches[0].branch;
    }

    fuzzyDetect(branches, environment) {
        const keywords = {
            production: ['main', 'master', 'prod', 'release'],
            staging: ['stag', 'test', 'qa', 'uat'],
            development: ['dev', 'next', 'feat']
        };

        const envKeywords = keywords[environment];
        if (!envKeywords) return null;

        for (const keyword of envKeywords) {
            const found = branches.find(branch => 
                branch.toLowerCase().includes(keyword)
            );
            if (found) return found;
        }

        return null;
    }

    analyzeEnvironmentRelations(branches, environments) {
        const relations = {
            hasProduction: !!environments.production,
            hasStaging: !!environments.staging,
            hasDevelopment: !!environments.development,
            suggestions: []
        };

        if (!relations.hasProduction) {
            relations.suggestions.push({
                type: 'warning',
                message: 'No production branch detected. Consider setting one manually.',
                recommendation: 'git-analyzer branch set-prod <branch-name>'
            });
        }

        if (!relations.hasStaging && relations.hasProduction) {
            relations.suggestions.push({
                type: 'info',
                message: 'No staging branch detected. You might want to set up a staging environment.',
                recommendation: 'Create a staging branch for testing before production'
            });
        }

        if (!relations.hasDevelopment) {
            const featureBranches = this.detectFeatureBranches(branches);
            if (featureBranches.length > 0) {
                relations.suggestions.push({
                    type: 'info',
                    message: `Found ${featureBranches.length} feature branches but no main development branch.`,
                    recommendation: 'Consider creating a develop branch for integration'
                });
            }
        }

        return relations;
    }

    detectFeatureBranches(branches) {
        const featurePatterns = [
            /^(origin\/)?(feature|feat)\//,
            /^(origin\/)?(bugfix|fix)\//,
            /^(origin\/)?(hotfix)\//,
            /^(origin\/)?(release)\//,
            /^(origin\/)?(chore)\//,
            /^(origin\/)?(refactor)\//
        ];

        return branches.filter(branch => 
            featurePatterns.some(pattern => pattern.test(branch))
        );
    }

    detectBranchingStrategy(branches) {
        const hasGitFlow = this.isGitFlowStrategy(branches);
        const hasGitHubFlow = this.isGitHubFlowStrategy(branches);
        const hasGitLabFlow = this.isGitLabFlowStrategy(branches);

        if (hasGitFlow) {
            return {
                strategy: 'GitFlow',
                confidence: 'high',
                description: 'Detected GitFlow branching strategy with develop and feature branches'
            };
        }

        if (hasGitHubFlow) {
            return {
                strategy: 'GitHub Flow',
                confidence: 'medium',
                description: 'Detected GitHub Flow with main branch and feature branches'
            };
        }

        if (hasGitLabFlow) {
            return {
                strategy: 'GitLab Flow',
                confidence: 'medium',
                description: 'Detected GitLab Flow with environment branches'
            };
        }

        return {
            strategy: 'Custom',
            confidence: 'low',
            description: 'Using custom branching strategy'
        };
    }

    isGitFlowStrategy(branches) {
        const hasDevelop = branches.some(b => /^(origin\/)?(develop|development)$/.test(b));
        const hasMaster = branches.some(b => /^(origin\/)?(master|main)$/.test(b));
        const hasFeatures = this.detectFeatureBranches(branches).length > 0;

        return hasDevelop && hasMaster && hasFeatures;
    }

    isGitHubFlowStrategy(branches) {
        const hasMain = branches.some(b => /^(origin\/)?(main|master)$/.test(b));
        const hasFeatures = this.detectFeatureBranches(branches).length > 0;
        const noDevelop = !branches.some(b => /^(origin\/)?develop/.test(b));

        return hasMain && hasFeatures && noDevelop;
    }

    isGitLabFlowStrategy(branches) {
        const hasMain = branches.some(b => /^(origin\/)?(main|master)$/.test(b));
        const hasEnvironments = branches.some(b => 
            /^(origin\/)?(production|staging|pre-prod)/.test(b)
        );

        return hasMain && hasEnvironments;
    }

    logDetectionResults(environments) {
        console.log(chalk.cyan('\n🎯 Environment Detection Results:\n'));
        
        Object.entries(environments).forEach(([env, branch]) => {
            const envName = env.charAt(0).toUpperCase() + env.slice(1);
            if (branch) {
                console.log(`  ${chalk.green('✓')} ${chalk.bold(envName)}: ${branch}`);
            } else {
                console.log(`  ${chalk.yellow('⚠')} ${chalk.bold(envName)}: ${chalk.gray('Not detected')}`);
            }
        });
    }

    validateEnvironmentSetup(environments) {
        const issues = [];

        if (!environments.production) {
            issues.push({
                level: 'error',
                message: 'Production branch is required but not set'
            });
        }

        if (environments.staging === environments.production) {
            issues.push({
                level: 'warning',
                message: 'Staging and production branches are the same'
            });
        }

        if (environments.development === environments.production) {
            issues.push({
                level: 'warning',
                message: 'Development and production branches are the same'
            });
        }

        return {
            valid: issues.filter(i => i.level === 'error').length === 0,
            issues
        };
    }
}