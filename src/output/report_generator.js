import fs from 'fs-extra';
import path from 'path';
import { marked } from 'marked';
import XLSX from 'xlsx';
import { createObjectCsvWriter } from 'csv-writer';
import chalk from 'chalk';
import moment from 'moment';

export class ReportGenerator {
    constructor(analysisResult) {
        this.result = analysisResult;
        this.outputDir = path.join(process.cwd(), '.git-analyzer', 'reports');
    }

    async generate(format, options = {}) {
        await fs.ensureDir(this.outputDir);
        
        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
        const baseFileName = `analysis_${this.result.summary.sourceBranch}_to_${this.result.summary.targetBranch}_${timestamp}`;
        
        switch (format.toLowerCase()) {
            case 'markdown':
            case 'md':
                return await this.generateMarkdown(baseFileName, options);
            case 'excel':
            case 'xlsx':
                return await this.generateExcel(baseFileName, options);
            case 'csv':
                return await this.generateCSV(baseFileName, options);
            case 'text':
            case 'txt':
                return await this.generateText(baseFileName, options);
            case 'html':
                return await this.generateHTML(baseFileName, options);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    async generateMarkdown(baseFileName, options) {
        const content = this.buildMarkdownContent();
        const filePath = path.join(
            options.output || this.outputDir,
            `${baseFileName}.md`
        );
        
        await fs.writeFile(filePath, content, this.getEncoding(options));
        console.log(chalk.green(`✅ Markdown report saved to: ${filePath}`));
        
        return filePath;
    }

    buildMarkdownContent() {
        let content = `# Git Analysis Report\n\n`;
        content += `**Generated:** ${moment().format('YYYY-MM-DD HH:mm:ss')}\n\n`;
        
        content += `## 📊 Summary\n\n`;
        content += `- **Source Branch:** ${this.result.summary.sourceBranch}\n`;
        content += `- **Target Branch:** ${this.result.summary.targetBranch}\n`;
        content += `- **Files Changed:** ${this.result.summary.filesChanged}\n`;
        content += `- **Lines Added:** ${this.result.summary.insertions} ➕\n`;
        content += `- **Lines Deleted:** ${this.result.summary.deletions} ➖\n`;
        content += `- **Total Commits:** ${this.result.summary.commits}\n\n`;
        
        // Add file changes overview
        content += this.buildFileChangesOverview();
        
        if (this.result.insights && this.result.insights.length > 0) {
            content += `## 💡 Insights\n\n`;
            for (const insight of this.result.insights) {
                const icon = this.getInsightIcon(insight.type);
                content += `### ${icon} ${insight.message}\n`;
                content += `${insight.detail}\n\n`;
            }
        }
        
        // Add detailed change analysis
        content += this.buildDetailedChanges();
        
        content += `## 📁 Files Changed\n\n`;
        content += this.buildFileTable();
        
        if (this.result.commits) {
            content += `## 📝 Commit Analysis\n\n`;
            content += this.buildCommitAnalysis();
        }
        
        if (this.result.metrics) {
            content += `## 📈 Code Metrics\n\n`;
            content += this.buildMetricsSection();
        }
        
        if (this.result.aiAnalysis) {
            content += `## 🤖 AI Analysis\n\n`;
            content += this.buildAIAnalysisSection();
        }
        
        if (this.result.recommendations && this.result.recommendations.length > 0) {
            content += `## 🎯 Recommendations\n\n`;
            for (const rec of this.result.recommendations) {
                content += `- ${rec}\n`;
            }
            content += '\n';
        }
        
        return content;
    }

    buildFileChangesOverview() {
        let content = '## 📂 File Changes Overview\n\n';
        
        // Group files by status
        const filesByStatus = {
            added: [],
            modified: [],
            deleted: [],
            renamed: []
        };
        
        for (const file of this.result.files) {
            if (filesByStatus[file.status]) {
                filesByStatus[file.status].push(file);
            }
        }
        
        // Added files
        if (filesByStatus.added.length > 0) {
            content += `### ✨ Added Files (${filesByStatus.added.length})\n\n`;
            for (const file of filesByStatus.added) {
                content += `- **${file.path}**\n`;
                if (file.additions) {
                    content += `  - Lines added: +${file.additions}\n`;
                }
                if (file.language) {
                    content += `  - Language: ${file.language}\n`;
                }
            }
            content += '\n';
        }
        
        // Modified files
        if (filesByStatus.modified.length > 0) {
            content += `### 📝 Modified Files (${filesByStatus.modified.length})\n\n`;
            for (const file of filesByStatus.modified) {
                content += `- **${file.path}**\n`;
                if (file.additions || file.deletions) {
                    content += `  - Changes: +${file.additions || 0}/-${file.deletions || 0} lines\n`;
                }
                if (file.language) {
                    content += `  - Language: ${file.language}\n`;
                }
                if (file.diff && file.diff.length > 0) {
                    const diffPreview = this.extractDiffHighlights(file.diff);
                    if (diffPreview.length > 0) {
                        content += `  - Key changes:\n`;
                        for (const highlight of diffPreview) {
                            content += `    - ${highlight}\n`;
                        }
                    }
                }
            }
            content += '\n';
        }
        
        // Deleted files
        if (filesByStatus.deleted.length > 0) {
            content += `### 🗑️ Deleted Files (${filesByStatus.deleted.length})\n\n`;
            for (const file of filesByStatus.deleted) {
                content += `- **${file.path}**\n`;
                if (file.deletions) {
                    content += `  - Lines removed: -${file.deletions}\n`;
                }
            }
            content += '\n';
        }
        
        // Renamed files
        if (filesByStatus.renamed.length > 0) {
            content += `### 🔄 Renamed Files (${filesByStatus.renamed.length})\n\n`;
            for (const file of filesByStatus.renamed) {
                content += `- **${file.path}**\n`;
            }
            content += '\n';
        }
        
        return content;
    }
    
    extractDiffHighlights(diff) {
        const highlights = [];
        if (!diff) return highlights;
        
        const lines = diff.split('\n');
        const functionChanges = new Set();
        const importChanges = new Set();
        
        for (const line of lines) {
            // Extract function/method changes
            if (line.match(/^[+-]\s*(function|const|let|var|class|export)\s+\w+/)) {
                const match = line.match(/\b(\w+)\s*[=(]/);
                if (match) {
                    const prefix = line.startsWith('+') ? 'Added' : 'Removed';
                    functionChanges.add(`${prefix}: ${match[1]}`);
                }
            }
            // Extract import changes
            if (line.match(/^[+-]\s*(import|require)/)) {
                const prefix = line.startsWith('+') ? 'Added import' : 'Removed import';
                const cleanLine = line.substring(1).trim();
                const importStr = cleanLine.length > 50 ? cleanLine.substring(0, 50) + '...' : cleanLine;
                importChanges.add(`${prefix}: ${importStr}`);
            }
        }
        
        // Add up to 3 highlights
        [...functionChanges].slice(0, 2).forEach(h => highlights.push(h));
        [...importChanges].slice(0, 1).forEach(h => highlights.push(h));
        
        return highlights.slice(0, 3);
    }
    
    buildDetailedChanges() {
        let content = '## 🔍 Detailed File Changes\n\n';
        
        // Show ALL files with their complete diffs
        if (this.result.files.length > 0) {
            for (const file of this.result.files) {
                const totalChanges = (file.additions || 0) + (file.deletions || 0);
                content += `### 📄 ${file.path}\n\n`;
                
                // File metadata
                content += `**Status:** ${this.getStatusText(file.status)}\n`;
                content += `**Language:** ${file.language || 'unknown'}\n`;
                content += `**Changes:** +${file.additions || 0} / -${file.deletions || 0} lines\n`;
                
                if (file.impact?.level) {
                    content += `**Impact:** ${file.impact.level} (score: ${file.impact.score})\n`;
                }
                
                // File content analysis
                if (file.contentAnalysis) {
                    content += '\n**ファイルの内容解析:**\n';
                    content += `- **ファイルタイプ:** ${file.contentAnalysis.type}\n`;
                    content += `- **目的:** ${file.contentAnalysis.purpose.join('、')}\n`;
                    content += `- **説明:** ${file.contentAnalysis.description}\n`;
                    
                    if (file.contentAnalysis.structure) {
                        content += `- **構造:** ${file.contentAnalysis.structure.lines}行 `;
                        content += `(関数: ${file.contentAnalysis.structure.functions}, `;
                        content += `クラス: ${file.contentAnalysis.structure.classes}, `;
                        content += `インポート: ${file.contentAnalysis.structure.imports})\n`;
                    }
                    
                    if (file.contentAnalysis.dependencies.length > 0) {
                        content += `- **依存関係:** ${file.contentAnalysis.dependencies.slice(0, 5).join(', ')}\n`;
                    }
                    
                    if (file.contentAnalysis.characteristics.length > 0) {
                        content += `- **特徴:** ${file.contentAnalysis.characteristics.join('、')}\n`;
                    }
                    
                    if (file.contentAnalysis.complexity > 10) {
                        content += `- **⚠️ 複雑度警告:** ${file.contentAnalysis.complexity} (リファクタリング推奨)\n`;
                    }
                }
                
                // Change description
                content += '\n**修正内容の説明:**\n';
                content += this.getChangeDescription(file);
                
                // Functional changes for modified files
                if (file.status === 'modified' && file.functionalChanges) {
                    content += '\n**機能的な変更:**\n';
                    
                    if (file.functionalChanges.addedFunctions.length > 0) {
                        content += `- **追加された関数:** ${file.functionalChanges.addedFunctions.join(', ')}\n`;
                    }
                    if (file.functionalChanges.removedFunctions.length > 0) {
                        content += `- **削除された関数:** ${file.functionalChanges.removedFunctions.join(', ')}\n`;
                    }
                    if (file.functionalChanges.addedClasses.length > 0) {
                        content += `- **追加されたクラス:** ${file.functionalChanges.addedClasses.join(', ')}\n`;
                    }
                    if (file.functionalChanges.removedClasses.length > 0) {
                        content += `- **削除されたクラス:** ${file.functionalChanges.removedClasses.join(', ')}\n`;
                    }
                    if (file.functionalChanges.addedDependencies.length > 0) {
                        content += `- **新しい依存関係:** ${file.functionalChanges.addedDependencies.join(', ')}\n`;
                    }
                    if (file.functionalChanges.removedDependencies.length > 0) {
                        content += `- **削除された依存関係:** ${file.functionalChanges.removedDependencies.join(', ')}\n`;
                    }
                    if (file.functionalChanges.complexityChange !== 0) {
                        const changeType = file.functionalChanges.complexityChange > 0 ? '増加' : '減少';
                        content += `- **複雑度の変化:** ${Math.abs(file.functionalChanges.complexityChange)} ${changeType}\n`;
                    }
                    if (file.functionalChanges.purposeChange) {
                        content += `- **目的の変更:** ${file.functionalChanges.purposeChange.from.join('、')} → ${file.functionalChanges.purposeChange.to.join('、')}\n`;
                    }
                }
                
                // Show complete diff
                if (file.diff && file.diff.length > 0) {
                    content += '\n**実際のコード変更:**\n';
                    content += '```diff\n';
                    content += file.diff;
                    content += '```\n';
                } else if (file.status === 'added') {
                    content += '\n**新規追加ファイル**\n';
                } else if (file.status === 'deleted') {
                    content += '\n**ファイル削除**\n';
                }
                
                content += '\n---\n\n';
            }
        } else {
            content += '_No file changes detected_\n\n';
        }
        
        return content;
    }
    
    getStatusText(status) {
        const statusMap = {
            'added': '✨ 新規追加',
            'modified': '📝 修正',
            'deleted': '🗑️ 削除',
            'renamed': '🔄 名前変更'
        };
        return statusMap[status] || status;
    }
    
    getChangeDescription(file) {
        let description = '';
        
        if (file.status === 'added') {
            description += `- 新しい${file.language || ''}ファイルが追加されました\n`;
            description += `- ${file.additions || 0}行のコードが追加されました\n`;
        } else if (file.status === 'modified') {
            description += `- 既存ファイルが修正されました\n`;
            if (file.additions > 0) {
                description += `- ${file.additions}行が追加されました\n`;
            }
            if (file.deletions > 0) {
                description += `- ${file.deletions}行が削除されました\n`;
            }
            
            // Extract key changes from diff
            if (file.diff) {
                const keyChanges = this.extractKeyChanges(file.diff);
                if (keyChanges.length > 0) {
                    description += `- 主な変更点:\n`;
                    keyChanges.forEach(change => {
                        description += `  - ${change}\n`;
                    });
                }
            }
        } else if (file.status === 'deleted') {
            description += `- ファイルが削除されました\n`;
            description += `- ${file.deletions || 0}行のコードが削除されました\n`;
        } else if (file.status === 'renamed') {
            description += `- ファイル名が変更されました\n`;
        }
        
        return description;
    }
    
    extractKeyChanges(diff) {
        const changes = [];
        const lines = diff.split('\n');
        
        for (const line of lines) {
            // Extract function/method additions
            if (line.match(/^\+\s*(function|const|let|var|class|export|async)\s+\w+/)) {
                const match = line.match(/\b(\w+)\s*[=(]/);
                if (match) {
                    changes.push(`関数/メソッド "${match[1]}" が追加されました`);
                }
            }
            // Extract function/method deletions
            if (line.match(/^-\s*(function|const|let|var|class|export|async)\s+\w+/)) {
                const match = line.match(/\b(\w+)\s*[=(]/);
                if (match) {
                    changes.push(`関数/メソッド "${match[1]}" が削除されました`);
                }
            }
            // Extract import changes
            if (line.match(/^\+\s*(import|require)/)) {
                changes.push(`新しいインポートが追加されました`);
            }
            if (line.match(/^-\s*(import|require)/)) {
                changes.push(`インポートが削除されました`);
            }
        }
        
        return [...new Set(changes)].slice(0, 5); // Return unique changes, max 5
    }
    
    buildFileTable() {
        let table = '| File | Status | Language | Impact | Changes | Issues |\n';
        table += '|------|--------|----------|--------|---------|--------|\n';
        
        for (const file of this.result.files) {
            const status = this.getStatusEmoji(file.status);
            const impact = this.getImpactBadge(file.impact?.level);
            const issueCount = this.countFileIssues(file);
            const changes = `+${file.additions || 0}/-${file.deletions || 0}`;
            
            table += `| ${file.path} | ${status} ${file.status} | ${file.language || 'unknown'} | ${impact} | ${changes} | ${issueCount} |\n`;
        }
        
        return table + '\n';
    }

    buildCommitAnalysis() {
        let content = '';
        
        if (this.result.commits.byType) {
            content += `### Commits by Type\n\n`;
            content += '| Type | Count | Percentage |\n';
            content += '|------|-------|------------|\n';
            
            const total = this.result.commits.total;
            for (const [type, count] of Object.entries(this.result.commits.byType)) {
                const percentage = ((count / total) * 100).toFixed(1);
                content += `| ${type} | ${count} | ${percentage}% |\n`;
            }
            content += '\n';
        }
        
        if (this.result.commits.byAuthor) {
            content += `### Top Contributors\n\n`;
            const authors = Object.entries(this.result.commits.byAuthor)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10);
            
            for (const [author, data] of authors) {
                content += `- **${author}**: ${data.count} commits\n`;
            }
            content += '\n';
        }
        
        if (this.result.commits.patterns && this.result.commits.patterns.length > 0) {
            content += `### Commit Patterns\n\n`;
            for (const pattern of this.result.commits.patterns) {
                content += `- **${pattern.type}** (${pattern.confidence} confidence): ${pattern.description}\n`;
            }
            content += '\n';
        }
        
        return content;
    }

    buildMetricsSection() {
        const metrics = this.result.metrics;
        let content = '';
        
        if (metrics.complexity) {
            content += `### Complexity Metrics\n\n`;
            content += `- **Average Complexity:** ${metrics.complexity.average.toFixed(2)}\n`;
            content += `- **High Complexity Files:** ${metrics.complexity.high}\n`;
            content += `- **Total Complexity:** ${metrics.complexity.total}\n\n`;
        }
        
        if (metrics.quality) {
            content += `### Quality Metrics\n\n`;
            content += `- **Total Issues:** ${metrics.quality.issues}\n`;
            content += `- **Security Issues:** ${metrics.quality.securityIssues} 🔒\n`;
            content += `- **Performance Issues:** ${metrics.quality.performanceIssues} ⚡\n\n`;
        }
        
        if (metrics.coverage) {
            content += `### Test Coverage\n\n`;
            content += `- **Has Tests:** ${metrics.coverage.hasTests ? 'Yes ✅' : 'No ❌'}\n`;
            content += `- **Test Files:** ${metrics.coverage.testFiles}\n`;
            content += `- **Source Files:** ${metrics.coverage.sourceFiles}\n`;
            const ratio = metrics.coverage.sourceFiles > 0 
                ? (metrics.coverage.testFiles / metrics.coverage.sourceFiles * 100).toFixed(1)
                : 0;
            content += `- **Test/Source Ratio:** ${ratio}%\n\n`;
        }
        
        return content;
    }

    buildAIAnalysisSection() {
        const ai = this.result.aiAnalysis;
        let content = '';
        
        // 新しい詳細フィールドを追加
        if (ai.title) {
            content += `### 📌 ${ai.title}\n\n`;
        }
        
        if (ai.content) {
            content += `### 📝 変更内容\n\n${ai.content}\n\n`;
        }
        
        if (ai.mergeUnit) {
            content += `### 🔀 マージ単位\n\n${ai.mergeUnit}\n\n`;
        }
        
        if (ai.details) {
            content += `### 📋 詳細\n\n${ai.details}\n\n`;
        }
        
        if (ai.concerns && ai.concerns.length > 0) {
            content += `### ⚠️ 懸念点\n\n`;
            for (const concern of ai.concerns) {
                content += `- ${concern}\n`;
            }
            content += '\n';
        }
        
        if (ai.relatedTickets && ai.relatedTickets.length > 0) {
            content += `### 🎫 関連チケット\n\n`;
            for (const ticket of ai.relatedTickets) {
                content += `- ${ticket}\n`;
            }
            content += '\n';
        }
        
        if (ai.relatedCode && ai.relatedCode.length > 0) {
            content += `### 📂 関連コード\n\n`;
            for (const code of ai.relatedCode) {
                content += `- \`${code}\`\n`;
            }
            content += '\n';
        }
        
        if (ai.testPoints && ai.testPoints.length > 0) {
            content += `### 🧪 テスト観点\n\n`;
            for (const point of ai.testPoints) {
                content += `- ${point}\n`;
            }
            content += '\n';
        }
        
        // 従来のフィールドも保持
        if (ai.summary) {
            content += `### Summary\n\n${ai.summary}\n\n`;
        }
        
        if (ai.issues && ai.issues.length > 0) {
            content += `### Detected Issues\n\n`;
            for (const issue of ai.issues) {
                content += `- ${issue}\n`;
            }
            content += '\n';
        }
        
        if (ai.security && ai.security.length > 0) {
            content += `### Security Concerns 🔒\n\n`;
            for (const concern of ai.security) {
                content += `- ${concern}\n`;
            }
            content += '\n';
        }
        
        if (ai.performance && ai.performance.length > 0) {
            content += `### Performance Considerations ⚡\n\n`;
            for (const perf of ai.performance) {
                content += `- ${perf}\n`;
            }
            content += '\n';
        }
        
        if (ai.recommendations && ai.recommendations.length > 0) {
            content += `### 💡 Recommendations\n\n`;
            for (const rec of ai.recommendations) {
                content += `- ${rec}\n`;
            }
            content += '\n';
        }
        
        return content;
    }

    async generateExcel(baseFileName, options) {
        const workbook = XLSX.utils.book_new();
        
        this.addSummarySheet(workbook);
        this.addFilesSheet(workbook);
        this.addCommitsSheet(workbook);
        this.addIssuesSheet(workbook);
        
        const filePath = path.join(
            options.output || this.outputDir,
            `${baseFileName}.xlsx`
        );
        
        XLSX.writeFile(workbook, filePath);
        console.log(chalk.green(`✅ Excel report saved to: ${filePath}`));
        
        return filePath;
    }

    addSummarySheet(workbook) {
        const summaryData = [
            ['Git Analysis Report'],
            ['Generated', moment().format('YYYY-MM-DD HH:mm:ss')],
            [],
            ['Source Branch', this.result.summary.sourceBranch],
            ['Target Branch', this.result.summary.targetBranch],
            ['Files Changed', this.result.summary.filesChanged],
            ['Lines Added', this.result.summary.insertions],
            ['Lines Deleted', this.result.summary.deletions],
            ['Total Commits', this.result.summary.commits]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, ws, 'Summary');
    }

    addFilesSheet(workbook) {
        const filesData = [
            ['File Path', 'Status', 'Language', 'Impact Level', 'Impact Score']
        ];
        
        for (const file of this.result.files) {
            filesData.push([
                file.path,
                file.status,
                file.language || 'unknown',
                file.impact?.level || 'unknown',
                file.impact?.score || 0
            ]);
        }
        
        const ws = XLSX.utils.aoa_to_sheet(filesData);
        XLSX.utils.book_append_sheet(workbook, ws, 'Files');
    }

    addCommitsSheet(workbook) {
        if (!this.result.commits || !this.result.commits.timeline) return;
        
        const commitsData = [
            ['Hash', 'Date', 'Author', 'Message']
        ];
        
        for (const commit of this.result.commits.timeline) {
            commitsData.push([
                commit.hash,
                commit.date,
                commit.author,
                commit.message
            ]);
        }
        
        const ws = XLSX.utils.aoa_to_sheet(commitsData);
        XLSX.utils.book_append_sheet(workbook, ws, 'Commits');
    }

    addIssuesSheet(workbook) {
        const issuesData = [
            ['File', 'Type', 'Severity', 'Message']
        ];
        
        for (const file of this.result.files) {
            if (file.changes?.issues) {
                const allIssues = [
                    ...file.changes.issues.bugs || [],
                    ...file.changes.issues.security || [],
                    ...file.changes.issues.performance || []
                ];
                
                for (const issue of allIssues) {
                    issuesData.push([
                        file.path,
                        issue.type,
                        issue.severity,
                        issue.message
                    ]);
                }
            }
        }
        
        const ws = XLSX.utils.aoa_to_sheet(issuesData);
        XLSX.utils.book_append_sheet(workbook, ws, 'Issues');
    }

    async generateCSV(baseFileName, options) {
        const filePath = path.join(
            options.output || this.outputDir,
            `${baseFileName}.csv`
        );
        
        const records = this.result.files.map(file => ({
            path: file.path,
            status: file.status,
            language: file.language || 'unknown',
            additions: file.additions || 0,
            deletions: file.deletions || 0,
            totalChanges: (file.additions || 0) + (file.deletions || 0),
            impact: file.impact?.level || 'unknown',
            score: file.impact?.score || 0,
            issues: this.countFileIssues(file)
        }));
        
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'path', title: 'File Path' },
                { id: 'status', title: 'Status' },
                { id: 'language', title: 'Language' },
                { id: 'additions', title: 'Lines Added' },
                { id: 'deletions', title: 'Lines Deleted' },
                { id: 'totalChanges', title: 'Total Changes' },
                { id: 'impact', title: 'Impact Level' },
                { id: 'score', title: 'Impact Score' },
                { id: 'issues', title: 'Issue Count' }
            ]
        });
        
        await csvWriter.writeRecords(records);
        console.log(chalk.green(`✅ CSV report saved to: ${filePath}`));
        
        return filePath;
    }

    async generateText(baseFileName, options) {
        const content = this.buildTextContent();
        const filePath = path.join(
            options.output || this.outputDir,
            `${baseFileName}.txt`
        );
        
        await fs.writeFile(filePath, content, this.getEncoding(options));
        console.log(chalk.green(`✅ Text report saved to: ${filePath}`));
        
        return filePath;
    }

    buildTextContent() {
        let content = '='.repeat(60) + '\n';
        content += 'GIT ANALYSIS REPORT\n';
        content += '='.repeat(60) + '\n\n';
        
        content += `Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n\n`;
        
        content += 'SUMMARY\n';
        content += '-'.repeat(40) + '\n';
        content += `Source Branch: ${this.result.summary.sourceBranch}\n`;
        content += `Target Branch: ${this.result.summary.targetBranch}\n`;
        content += `Files Changed: ${this.result.summary.filesChanged}\n`;
        content += `Lines Added: ${this.result.summary.insertions}\n`;
        content += `Lines Deleted: ${this.result.summary.deletions}\n`;
        content += `Total Commits: ${this.result.summary.commits}\n\n`;
        
        // Add file changes by status
        content += this.buildTextFileChanges();
        
        content += 'DETAILED FILE LIST\n';
        content += '-'.repeat(40) + '\n';
        for (const file of this.result.files) {
            const changes = file.additions || file.deletions 
                ? ` (+${file.additions || 0}/-${file.deletions || 0})`
                : '';
            content += `${file.status.toUpperCase()}: ${file.path}${changes}\n`;
        }
        
        return content;
    }
    
    buildTextFileChanges() {
        let content = 'FILE CHANGES BY STATUS\n';
        content += '-'.repeat(40) + '\n\n';
        
        // Group files by status
        const filesByStatus = {
            added: [],
            modified: [],
            deleted: [],
            renamed: []
        };
        
        for (const file of this.result.files) {
            if (filesByStatus[file.status]) {
                filesByStatus[file.status].push(file);
            }
        }
        
        // Added files
        if (filesByStatus.added.length > 0) {
            content += `ADDED FILES (${filesByStatus.added.length}):\n`;
            for (const file of filesByStatus.added) {
                content += `  + ${file.path}`;
                if (file.additions) content += ` (+${file.additions} lines)`;
                content += '\n';
            }
            content += '\n';
        }
        
        // Modified files
        if (filesByStatus.modified.length > 0) {
            content += `MODIFIED FILES (${filesByStatus.modified.length}):\n`;
            for (const file of filesByStatus.modified) {
                content += `  * ${file.path}`;
                if (file.additions || file.deletions) {
                    content += ` (+${file.additions || 0}/-${file.deletions || 0} lines)`;
                }
                content += '\n';
            }
            content += '\n';
        }
        
        // Deleted files
        if (filesByStatus.deleted.length > 0) {
            content += `DELETED FILES (${filesByStatus.deleted.length}):\n`;
            for (const file of filesByStatus.deleted) {
                content += `  - ${file.path}`;
                if (file.deletions) content += ` (-${file.deletions} lines)`;
                content += '\n';
            }
            content += '\n';
        }
        
        // Renamed files
        if (filesByStatus.renamed.length > 0) {
            content += `RENAMED FILES (${filesByStatus.renamed.length}):\n`;
            for (const file of filesByStatus.renamed) {
                content += `  ~ ${file.path}\n`;
            }
            content += '\n';
        }
        
        return content;
    }

    async generateHTML(baseFileName, options) {
        const markdown = this.buildMarkdownContent();
        const html = marked(markdown);
        
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Git Analysis Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1, h2, h3 { color: #333; }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th { background-color: #f4f4f4; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
        }
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
        
        const filePath = path.join(
            options.output || this.outputDir,
            `${baseFileName}.html`
        );
        
        await fs.writeFile(filePath, htmlContent, 'utf8');
        console.log(chalk.green(`✅ HTML report saved to: ${filePath}`));
        
        return filePath;
    }

    getEncoding(options) {
        const encoding = options.encoding || 'utf8';
        return encoding === 'sjis' ? 'shift_jis' : encoding;
    }

    getStatusEmoji(status) {
        const emojis = {
            added: '➕',
            modified: '✏️',
            deleted: '❌',
            renamed: '📝',
            copied: '📋'
        };
        return emojis[status] || '❓';
    }

    getImpactBadge(level) {
        const badges = {
            high: '🔴 High',
            medium: '🟡 Medium',
            low: '🟢 Low'
        };
        return badges[level] || '⚪ Unknown';
    }

    getInsightIcon(type) {
        const icons = {
            warning: '⚠️',
            info: 'ℹ️',
            attention: '🔍',
            success: '✅',
            error: '❌'
        };
        return icons[type] || '💡';
    }

    countFileIssues(file) {
        if (!file.changes?.issues) return 0;
        
        let count = 0;
        count += (file.changes.issues.bugs || []).length;
        count += (file.changes.issues.security || []).length;
        count += (file.changes.issues.performance || []).length;
        count += (file.changes.issues.style || []).length;
        count += (file.changes.issues.maintenance || []).length;
        
        return count;
    }
}