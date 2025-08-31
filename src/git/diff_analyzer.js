import { Repository } from './repository.js';
import { CodeAnalyzer } from '../analysis/code_analyzer.js';
import { FileContentAnalyzer } from '../analysis/file_content_analyzer.js';
import chalk from 'chalk';

export class DiffAnalyzer {
    constructor() {
        this.codeAnalyzer = new CodeAnalyzer();
        this.fileContentAnalyzer = new FileContentAnalyzer();
    }

    async analyzeBranchDiff(sourceBranch, targetBranch, options = {}) {
        const repo = new Repository(options.repoPath || process.cwd());
        await repo.validate();

        // Build filter object from options
        const filters = {
            commit: options.commit,
            fromCommit: options.fromCommit,
            toCommit: options.toCommit,
            since: options.since,
            until: options.until,
            author: options.author,
            file: options.file,
            files: options.files,
            exclude: options.exclude
        };

        // Clean up undefined values
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) delete filters[key];
        });

        // Display analysis scope
        let scopeMessage = `\n📊 Analyzing differences between ${sourceBranch} and ${targetBranch}`;
        if (Object.keys(filters).length > 0) {
            scopeMessage += ' with filters:';
            if (filters.commit) scopeMessage += `\n  - Commit: ${filters.commit}`;
            if (filters.fromCommit || filters.toCommit) scopeMessage += `\n  - Commit range: ${filters.fromCommit || 'start'} to ${filters.toCommit || 'end'}`;
            if (filters.since || filters.until) scopeMessage += `\n  - Date range: ${filters.since || 'start'} to ${filters.until || 'now'}`;
            if (filters.author) scopeMessage += `\n  - Author: ${filters.author}`;
            if (filters.file || filters.files) scopeMessage += `\n  - Files: ${filters.file || filters.files}`;
            if (filters.exclude) scopeMessage += `\n  - Excluding: ${filters.exclude}`;
        }
        console.log(chalk.blue(scopeMessage + '...\n'));

        const diff = await repo.getDiff(sourceBranch, targetBranch, filters);
        const commits = await this.getCommitsBetweenBranches(repo, sourceBranch, targetBranch, filters);

        const analysis = {
            summary: {
                sourceBranch,
                targetBranch,
                filesChanged: diff.summary.filesChanged,
                insertions: diff.summary.insertions,
                deletions: diff.summary.deletions,
                commits: commits.length,
                analyzedAt: new Date().toISOString(),
                filters: Object.keys(filters).length > 0 ? filters : undefined
            },
            files: await this.analyzeFiles(repo, diff.files, sourceBranch, targetBranch, filters),
            commits: this.analyzeCommits(commits),
            insights: await this.generateInsights(diff, commits),
            recommendations: []
        };

        if (options.cli && !options.skipAi) {
            analysis.aiAnalysis = await this.performAIAnalysis(diff, options.cli);
            analysis.recommendations = analysis.aiAnalysis.recommendations || [];
        }

        analysis.metrics = this.calculateMetrics(analysis);

        return analysis;
    }

    async analyzeFiles(repo, files, sourceBranch, targetBranch, filters = {}) {
        const analyzedFiles = [];

        for (const file of files) {
            const fileAnalysis = {
                path: file.path,
                status: file.status,
                extension: this.getFileExtension(file.path),
                language: this.detectLanguage(file.path),
                changes: {},
                additions: file.additions || 0,
                deletions: file.deletions || 0,
                diff: file.diff || '' // Include the actual diff content
            };

            // Analyze file content based on status
            if (file.status === 'added' || file.status === 'modified') {
                const content = await repo.getFileContent(
                    file.status === 'added' ? sourceBranch : targetBranch, 
                    file.path
                );
                
                if (content) {
                    // Perform detailed content analysis
                    fileAnalysis.contentAnalysis = await this.fileContentAnalyzer.analyzeFileContent(
                        file.path,
                        content,
                        fileAnalysis.language
                    );
                    
                    // Existing code analysis
                    fileAnalysis.changes = await this.codeAnalyzer.analyzeCode(
                        content,
                        fileAnalysis.language
                    );
                }
            }

            if (file.status === 'modified') {
                const sourceContent = await repo.getFileContent(sourceBranch, file.path);
                const targetContent = await repo.getFileContent(targetBranch, file.path);
                
                if (sourceContent && targetContent) {
                    fileAnalysis.changes.comparison = this.compareVersions(
                        sourceContent,
                        targetContent
                    );
                    
                    // Analyze what changed in functionality
                    fileAnalysis.functionalChanges = await this.analyzeFunctionalChanges(
                        sourceContent,
                        targetContent,
                        fileAnalysis.language
                    );
                }
            }

            if (file.status === 'deleted') {
                const content = await repo.getFileContent(targetBranch, file.path);
                if (content) {
                    fileAnalysis.contentAnalysis = await this.fileContentAnalyzer.analyzeFileContent(
                        file.path,
                        content,
                        fileAnalysis.language
                    );
                }
            }

            fileAnalysis.impact = this.calculateImpact(fileAnalysis);
            analyzedFiles.push(fileAnalysis);
        }

        return analyzedFiles;
    }

    async getCommitsBetweenBranches(repo, sourceBranch, targetBranch, filters = {}) {
        // Apply filters to source branch commits
        const sourceCommits = await repo.getCommitHistory(sourceBranch, 500, filters);
        
        // For target commits, we don't apply the same filters
        // We just need them to identify what's unique to source
        const targetCommits = await repo.getCommitHistory(targetBranch, 500);

        const targetHashes = new Set(targetCommits.map(c => c.hash));
        
        // Return source commits that aren't in target
        const uniqueCommits = sourceCommits.filter(commit => !targetHashes.has(commit.hash));
        
        // If specific commit filter is applied, return only that commit
        if (filters.commit) {
            return uniqueCommits.filter(c => 
                c.hash.startsWith(filters.commit) || 
                c.abbrevHash.startsWith(filters.commit)
            );
        }
        
        return uniqueCommits;
    }

    analyzeCommits(commits) {
        const analysis = {
            total: commits.length,
            byAuthor: {},
            byType: {},
            timeline: [],
            patterns: []
        };

        for (const commit of commits) {
            if (!analysis.byAuthor[commit.author]) {
                analysis.byAuthor[commit.author] = {
                    count: 0,
                    commits: []
                };
            }
            analysis.byAuthor[commit.author].count++;
            analysis.byAuthor[commit.author].commits.push(commit.abbrevHash);

            const type = this.detectCommitType(commit.message);
            analysis.byType[type] = (analysis.byType[type] || 0) + 1;

            analysis.timeline.push({
                hash: commit.abbrevHash,
                date: commit.date,
                message: commit.message,
                author: commit.author
            });
        }

        analysis.patterns = this.detectCommitPatterns(commits);

        return analysis;
    }

    detectCommitType(message) {
        const types = {
            feat: /^feat(\(.+\))?:/i,
            fix: /^fix(\(.+\))?:/i,
            docs: /^docs(\(.+\))?:/i,
            style: /^style(\(.+\))?:/i,
            refactor: /^refactor(\(.+\))?:/i,
            test: /^test(\(.+\))?:/i,
            chore: /^chore(\(.+\))?:/i,
            perf: /^perf(\(.+\))?:/i,
            ci: /^ci(\(.+\))?:/i,
            build: /^build(\(.+\))?:/i,
            revert: /^revert(\(.+\))?:/i
        };

        for (const [type, pattern] of Object.entries(types)) {
            if (pattern.test(message)) {
                return type;
            }
        }

        if (/merge/i.test(message)) return 'merge';
        if (/hotfix/i.test(message)) return 'hotfix';
        if (/bugfix|bug/i.test(message)) return 'fix';
        if (/feature/i.test(message)) return 'feat';

        return 'other';
    }

    detectCommitPatterns(commits) {
        const patterns = [];

        const conventionalCommits = commits.filter(c => 
            /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?:/i.test(c.message)
        );

        if (conventionalCommits.length > commits.length * 0.7) {
            patterns.push({
                type: 'conventional-commits',
                confidence: 'high',
                description: 'Project follows Conventional Commits specification'
            });
        }

        const hasTicketRefs = commits.filter(c => 
            /\b[A-Z]+-\d+\b/.test(c.message)
        );

        if (hasTicketRefs.length > commits.length * 0.5) {
            patterns.push({
                type: 'ticket-references',
                confidence: 'medium',
                description: 'Commits frequently reference issue/ticket numbers'
            });
        }

        return patterns;
    }

    async generateInsights(diff, commits) {
        const insights = [];

        if (diff.summary.filesChanged > 100) {
            insights.push({
                type: 'warning',
                category: 'size',
                message: 'Large number of files changed',
                detail: `${diff.summary.filesChanged} files modified. Consider breaking into smaller changes.`
            });
        }

        if (diff.summary.deletions > diff.summary.insertions * 2) {
            insights.push({
                type: 'info',
                category: 'refactoring',
                message: 'Significant code reduction',
                detail: `Removed ${diff.summary.deletions} lines while adding ${diff.summary.insertions}. Good refactoring!`
            });
        }

        const hotspots = this.detectHotspots(diff.files);
        if (hotspots.length > 0) {
            insights.push({
                type: 'attention',
                category: 'hotspots',
                message: 'Critical files modified',
                detail: `Changes to critical files: ${hotspots.join(', ')}`
            });
        }

        return insights;
    }

    detectHotspots(files) {
        const criticalPatterns = [
            /^(src\/)?index\.(js|ts|jsx|tsx)$/,
            /^(src\/)?main\.(js|ts|jsx|tsx)$/,
            /^(src\/)?app\.(js|ts|jsx|tsx)$/,
            /package\.json$/,
            /yarn\.lock$/,
            /package-lock\.json$/,
            /\.env/,
            /config\//,
            /database\//,
            /auth/,
            /security/,
            /payment/
        ];

        return files
            .filter(file => 
                criticalPatterns.some(pattern => pattern.test(file.path))
            )
            .map(file => file.path);
    }

    calculateImpact(fileAnalysis) {
        let score = 0;

        if (fileAnalysis.status === 'added') score += 3;
        if (fileAnalysis.status === 'deleted') score += 2;
        if (fileAnalysis.status === 'modified') score += 1;

        if (fileAnalysis.path.includes('test')) score *= 0.5;
        if (fileAnalysis.path.includes('config')) score *= 2;
        if (fileAnalysis.path.includes('security')) score *= 3;

        if (fileAnalysis.changes?.complexity?.cyclomatic > 10) score *= 1.5;
        if (fileAnalysis.changes?.issues?.security?.length > 0) score *= 3;

        return {
            score: Math.round(score),
            level: score > 5 ? 'high' : score > 2 ? 'medium' : 'low'
        };
    }

    compareVersions(sourceContent, targetContent) {
        const sourceLines = sourceContent.split('\n').length;
        const targetLines = targetContent ? targetContent.split('\n').length : 0;

        return {
            linesAdded: Math.max(0, targetLines - sourceLines),
            linesRemoved: Math.max(0, sourceLines - targetLines),
            sizeChange: targetLines - sourceLines
        };
    }

    calculateMetrics(analysis) {
        const metrics = {
            complexity: {
                total: 0,
                average: 0,
                high: 0
            },
            quality: {
                issues: 0,
                securityIssues: 0,
                performanceIssues: 0
            },
            coverage: {
                hasTests: false,
                testFiles: 0,
                sourceFiles: 0
            }
        };

        for (const file of analysis.files) {
            if (file.changes?.complexity) {
                metrics.complexity.total += file.changes.complexity.cyclomatic || 0;
                if (file.changes.complexity.cyclomatic > 10) {
                    metrics.complexity.high++;
                }
            }

            if (file.changes?.issues) {
                metrics.quality.issues += (file.changes.issues.bugs || []).length;
                metrics.quality.securityIssues += (file.changes.issues.security || []).length;
                metrics.quality.performanceIssues += (file.changes.issues.performance || []).length;
            }

            if (file.path.includes('test') || file.path.includes('spec')) {
                metrics.coverage.testFiles++;
            } else {
                metrics.coverage.sourceFiles++;
            }
        }

        if (analysis.files.length > 0) {
            metrics.complexity.average = metrics.complexity.total / analysis.files.length;
        }

        metrics.coverage.hasTests = metrics.coverage.testFiles > 0;

        return metrics;
    }

    async performAIAnalysis(diff, cliType) {
        const { AIAnalyzer } = await import('../ai/base_client.js');
        const analyzer = new AIAnalyzer(cliType);
        
        // 実際の差分データを含む詳細情報を渡す
        const enhancedDiff = {
            ...diff,
            rawDiff: diff.detailed || '', // 生の差分データ
            filesContent: diff.files || [], // ファイルごとの変更内容
        };
        
        return await analyzer.analyzeDiff(enhancedDiff);
    }

    async analyzeFunctionalChanges(oldContent, newContent, language) {
        const oldAnalysis = await this.fileContentAnalyzer.analyzeFileContent('', oldContent, language);
        const newAnalysis = await this.fileContentAnalyzer.analyzeFileContent('', newContent, language);
        
        const changes = {
            addedFunctions: [],
            removedFunctions: [],
            modifiedFunctions: [],
            addedClasses: [],
            removedClasses: [],
            addedDependencies: [],
            removedDependencies: [],
            purposeChange: null,
            complexityChange: 0
        };
        
        // Compare functions
        const oldFuncNames = new Set(oldAnalysis.functions.map(f => f.name));
        const newFuncNames = new Set(newAnalysis.functions.map(f => f.name));
        
        newAnalysis.functions.forEach(func => {
            if (!oldFuncNames.has(func.name)) {
                changes.addedFunctions.push(func.name);
            }
        });
        
        oldAnalysis.functions.forEach(func => {
            if (!newFuncNames.has(func.name)) {
                changes.removedFunctions.push(func.name);
            }
        });
        
        // Compare classes
        const oldClassNames = new Set(oldAnalysis.classes.map(c => c.name));
        const newClassNames = new Set(newAnalysis.classes.map(c => c.name));
        
        newAnalysis.classes.forEach(cls => {
            if (!oldClassNames.has(cls.name)) {
                changes.addedClasses.push(cls.name);
            }
        });
        
        oldAnalysis.classes.forEach(cls => {
            if (!newClassNames.has(cls.name)) {
                changes.removedClasses.push(cls.name);
            }
        });
        
        // Compare dependencies
        const oldDeps = new Set(oldAnalysis.dependencies);
        const newDeps = new Set(newAnalysis.dependencies);
        
        newDeps.forEach(dep => {
            if (!oldDeps.has(dep)) {
                changes.addedDependencies.push(dep);
            }
        });
        
        oldDeps.forEach(dep => {
            if (!newDeps.has(dep)) {
                changes.removedDependencies.push(dep);
            }
        });
        
        // Compare complexity
        changes.complexityChange = newAnalysis.complexity - oldAnalysis.complexity;
        
        // Check if purpose changed
        const oldPurpose = oldAnalysis.purpose.join(',');
        const newPurpose = newAnalysis.purpose.join(',');
        if (oldPurpose !== newPurpose) {
            changes.purposeChange = {
                from: oldAnalysis.purpose,
                to: newAnalysis.purpose
            };
        }
        
        return changes;
    }

    getFileExtension(filePath) {
        const parts = filePath.split('.');
        return parts.length > 1 ? parts.pop() : '';
    }

    detectLanguage(filePath) {
        const extensionMap = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            py: 'python',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            cs: 'csharp',
            go: 'go',
            rs: 'rust',
            rb: 'ruby',
            php: 'php',
            swift: 'swift',
            kt: 'kotlin',
            scala: 'scala',
            r: 'r',
            m: 'objective-c',
            lua: 'lua',
            dart: 'dart',
            html: 'html',
            css: 'css',
            scss: 'scss',
            sass: 'sass',
            less: 'less',
            json: 'json',
            xml: 'xml',
            yaml: 'yaml',
            yml: 'yaml',
            md: 'markdown',
            sql: 'sql',
            sh: 'shell',
            bash: 'shell',
            zsh: 'shell',
            dockerfile: 'dockerfile',
            makefile: 'makefile'
        };

        const extension = this.getFileExtension(filePath).toLowerCase();
        return extensionMap[extension] || 'unknown';
    }
}