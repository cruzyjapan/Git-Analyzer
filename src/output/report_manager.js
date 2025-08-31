import { DiffAnalyzer } from '../git/diff_analyzer.js';
import { ReportGenerator } from './report_generator.js';
import { Repository } from '../git/repository.js';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';

export class ReportManager {
    constructor(repoPath = process.cwd()) {
        this.repository = new Repository(repoPath);
        this.analyzer = new DiffAnalyzer();
    }

    async generateAllEnvironmentReports(options = {}) {
        await this.repository.loadEnvironmentConfig();
        const environments = this.repository.environments;
        
        if (!environments.production) {
            throw new Error('Production branch not configured. Run "git-analyzer init" first.');
        }
        
        const reports = [];
        
        if (environments.development && environments.staging) {
            console.log(chalk.blue('\n📊 Generating development → staging report...'));
            const devToStaging = await this.generateReport(
                environments.development,
                environments.staging,
                { ...options, suffix: 'dev_to_staging' }
            );
            reports.push(devToStaging);
        }
        
        if (environments.staging && environments.production) {
            console.log(chalk.blue('\n📊 Generating staging → production report...'));
            const stagingToProd = await this.generateReport(
                environments.staging,
                environments.production,
                { ...options, suffix: 'staging_to_prod' }
            );
            reports.push(stagingToProd);
        }
        
        if (environments.development && environments.production) {
            console.log(chalk.blue('\n📊 Generating development → production report...'));
            const devToProd = await this.generateReport(
                environments.development,
                environments.production,
                { ...options, suffix: 'dev_to_prod' }
            );
            reports.push(devToProd);
        }
        
        await this.generateSummaryReport(reports, options);
        
        console.log(chalk.green('\n✅ All environment reports generated successfully!'));
        return reports;
    }

    async generateEnvironmentReport(environment, options = {}) {
        await this.repository.loadEnvironmentConfig();
        const environments = this.repository.environments;
        
        const envBranch = environments[environment.toLowerCase()];
        if (!envBranch) {
            throw new Error(`Environment '${environment}' not configured`);
        }
        
        const targetEnv = environment === 'development' ? 'staging' : 
                         environment === 'staging' ? 'production' : null;
        
        if (!targetEnv) {
            throw new Error(`Cannot determine target environment for '${environment}'`);
        }
        
        const targetBranch = environments[targetEnv];
        if (!targetBranch) {
            throw new Error(`Target environment '${targetEnv}' not configured`);
        }
        
        console.log(chalk.blue(`\n📊 Generating ${environment} → ${targetEnv} report...`));
        
        return await this.generateReport(envBranch, targetBranch, options);
    }

    async generateDefaultReport(options = {}) {
        await this.repository.loadEnvironmentConfig();
        const environments = this.repository.environments;
        
        if (environments.development && environments.production) {
            console.log(chalk.blue('\n📊 Generating default report (development → production)...'));
            return await this.generateReport(
                environments.development,
                environments.production,
                options
            );
        }
        
        const currentBranch = await this.repository.getCurrentBranch();
        const defaultBranch = await this.repository.getDefaultBranch() || 'main';
        
        console.log(chalk.blue(`\n📊 Generating default report (${currentBranch} → ${defaultBranch})...`));
        return await this.generateReport(currentBranch, defaultBranch, options);
    }

    async generateReport(sourceBranch, targetBranch, options = {}) {
        const analysis = await this.analyzer.analyzeBranchDiff(
            sourceBranch,
            targetBranch,
            options
        );
        
        const generator = new ReportGenerator(analysis);
        const format = options.format || 'markdown';
        
        let outputPath = options.output;
        if (options.suffix) {
            const dir = path.dirname(outputPath || '.');
            const ext = path.extname(outputPath || `.${format}`);
            const base = path.basename(outputPath || `report.${format}`, ext);
            outputPath = path.join(dir, `${base}_${options.suffix}${ext}`);
            options.output = outputPath;
        }
        
        const reportPath = await generator.generate(format, options);
        
        return {
            path: reportPath,
            analysis,
            source: sourceBranch,
            target: targetBranch
        };
    }

    async generateSummaryReport(reports, options = {}) {
        const summaryPath = path.join(
            options.output || path.join(process.cwd(), '.git-analyzer', 'reports'),
            'summary.md'
        );
        
        let content = '# Git Analysis Summary Report\n\n';
        content += `Generated: ${new Date().toISOString()}\n\n`;
        
        content += '## 📊 Environment Analysis Overview\n\n';
        
        for (const report of reports) {
            content += `### ${report.source} → ${report.target}\n\n`;
            content += `- **Files Changed:** ${report.analysis.summary.filesChanged}\n`;
            content += `- **Lines Added:** ${report.analysis.summary.insertions}\n`;
            content += `- **Lines Deleted:** ${report.analysis.summary.deletions}\n`;
            content += `- **Commits:** ${report.analysis.summary.commits}\n`;
            content += `- **Report:** [View Report](${path.relative(path.dirname(summaryPath), report.path)})\n\n`;
        }
        
        content += '## 🎯 Key Metrics\n\n';
        
        const totalFiles = reports.reduce((sum, r) => sum + r.analysis.summary.filesChanged, 0);
        const totalInsertions = reports.reduce((sum, r) => sum + r.analysis.summary.insertions, 0);
        const totalDeletions = reports.reduce((sum, r) => sum + r.analysis.summary.deletions, 0);
        const totalCommits = reports.reduce((sum, r) => sum + r.analysis.summary.commits, 0);
        
        content += `- **Total Files Changed:** ${totalFiles}\n`;
        content += `- **Total Lines Added:** ${totalInsertions}\n`;
        content += `- **Total Lines Deleted:** ${totalDeletions}\n`;
        content += `- **Total Commits:** ${totalCommits}\n\n`;
        
        await fs.ensureDir(path.dirname(summaryPath));
        await fs.writeFile(summaryPath, content, 'utf8');
        
        console.log(chalk.green(`\n✅ Summary report saved to: ${summaryPath}`));
        return summaryPath;
    }

    async generateComparisonMatrix(options = {}) {
        await this.repository.loadEnvironmentConfig();
        const branches = await this.repository.getAllBranches();
        
        const matrix = {};
        
        for (const source of branches) {
            matrix[source] = {};
            for (const target of branches) {
                if (source !== target) {
                    try {
                        const diff = await this.repository.getDiff(source, target);
                        matrix[source][target] = {
                            files: diff.summary.filesChanged,
                            additions: diff.summary.insertions,
                            deletions: diff.summary.deletions
                        };
                    } catch (error) {
                        matrix[source][target] = { error: error.message };
                    }
                }
            }
        }
        
        return matrix;
    }

    async generateCustomReport(template, data, options = {}) {
        const templatePath = path.resolve(template);
        
        if (!await fs.pathExists(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }
        
        let templateContent = await fs.readFile(templatePath, 'utf8');
        
        for (const [key, value] of Object.entries(data)) {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            templateContent = templateContent.replace(placeholder, value);
        }
        
        const outputPath = options.output || path.join(
            process.cwd(),
            '.git-analyzer',
            'reports',
            `custom_report_${Date.now()}.md`
        );
        
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, templateContent, 'utf8');
        
        console.log(chalk.green(`✅ Custom report saved to: ${outputPath}`));
        return outputPath;
    }
}