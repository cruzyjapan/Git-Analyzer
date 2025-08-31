export class CodeAnalyzer {
    constructor() {
        this.languagePatterns = this.initializeLanguagePatterns();
    }

    initializeLanguagePatterns() {
        return {
            javascript: {
                functions: /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>|(\w+)\s*:\s*(?:async\s*)?\(.*?\)\s*=>/g,
                classes: /class\s+(\w+)/g,
                imports: /import\s+.*?from\s+['"](.+?)['"]/g,
                exports: /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g,
                comments: /\/\*[\s\S]*?\*\/|\/\/.*/g
            },
            typescript: {
                functions: /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>|(\w+)\s*:\s*(?:async\s*)?\(.*?\)\s*=>/g,
                classes: /class\s+(\w+)/g,
                interfaces: /interface\s+(\w+)/g,
                types: /type\s+(\w+)/g,
                imports: /import\s+.*?from\s+['"](.+?)['"]/g,
                exports: /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g,
                comments: /\/\*[\s\S]*?\*\/|\/\/.*/g
            },
            python: {
                functions: /def\s+(\w+)\s*\(/g,
                classes: /class\s+(\w+)/g,
                imports: /import\s+(\w+)|from\s+(\w+)\s+import/g,
                decorators: /@(\w+)/g,
                comments: /#.*/g
            },
            java: {
                functions: /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+(?:\s*,\s*\w+)*)?\s*\{/g,
                classes: /class\s+(\w+)/g,
                interfaces: /interface\s+(\w+)/g,
                imports: /import\s+([\w.]+);/g,
                annotations: /@(\w+)/g,
                comments: /\/\*[\s\S]*?\*\/|\/\/.*/g
            }
        };
    }

    async analyzeCode(content, language) {
        if (!content) {
            return {
                error: 'No content to analyze'
            };
        }

        const analysis = {
            language,
            metrics: this.calculateMetrics(content),
            complexity: this.calculateComplexity(content, language),
            structure: this.analyzeStructure(content, language),
            issues: await this.detectIssues(content, language),
            quality: this.assessQuality(content, language)
        };

        return analysis;
    }

    calculateMetrics(content) {
        const lines = content.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        const codeLines = nonEmptyLines.filter(line => 
            !line.trim().startsWith('//') && 
            !line.trim().startsWith('#') &&
            !line.trim().startsWith('*')
        );

        return {
            totalLines: lines.length,
            codeLines: codeLines.length,
            emptyLines: lines.length - nonEmptyLines.length,
            commentLines: nonEmptyLines.length - codeLines.length,
            averageLineLength: this.calculateAverageLineLength(lines),
            longestLine: Math.max(...lines.map(l => l.length))
        };
    }

    calculateAverageLineLength(lines) {
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        if (nonEmptyLines.length === 0) return 0;
        
        const totalLength = nonEmptyLines.reduce((sum, line) => sum + line.length, 0);
        return Math.round(totalLength / nonEmptyLines.length);
    }

    calculateComplexity(content, language) {
        const complexity = {
            cyclomatic: 1,
            cognitive: 0,
            nesting: this.calculateMaxNesting(content),
            halstead: this.calculateHalsteadMetrics(content, language)
        };

        const controlFlowPatterns = [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bdo\b/g,
            /\bswitch\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\?\s*.*\s*:/g
        ];

        for (const pattern of controlFlowPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                complexity.cyclomatic += matches.length;
            }
        }

        const logicalOperators = /&&|\|\|/g;
        const logicalMatches = content.match(logicalOperators);
        if (logicalMatches) {
            complexity.cyclomatic += logicalMatches.length;
        }

        complexity.cognitive = this.calculateCognitiveComplexity(content);

        return complexity;
    }

    calculateMaxNesting(content) {
        let maxNesting = 0;
        let currentNesting = 0;
        
        for (const char of content) {
            if (char === '{' || char === '(' || char === '[') {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            } else if (char === '}' || char === ')' || char === ']') {
                currentNesting = Math.max(0, currentNesting - 1);
            }
        }
        
        return maxNesting;
    }

    calculateHalsteadMetrics(content, language) {
        const operators = this.extractOperators(content, language);
        const operands = this.extractOperands(content, language);
        
        const n1 = new Set(operators).size;
        const n2 = new Set(operands).size;
        const N1 = operators.length;
        const N2 = operands.length;
        
        const vocabulary = n1 + n2;
        const length = N1 + N2;
        const volume = length * Math.log2(vocabulary || 1);
        const difficulty = (n1 / 2) * (N2 / (n2 || 1));
        const effort = volume * difficulty;
        
        return {
            vocabulary,
            length,
            volume: Math.round(volume),
            difficulty: Math.round(difficulty * 100) / 100,
            effort: Math.round(effort)
        };
    }

    extractOperators(content, language) {
        const operatorPatterns = [
            /\+\+|--|==|!=|<=|>=|&&|\|\||<<|>>|[+\-*/%=<>!&|^~]/g
        ];
        
        const operators = [];
        for (const pattern of operatorPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                operators.push(...matches);
            }
        }
        
        return operators;
    }

    extractOperands(content, language) {
        const identifierPattern = /\b[a-zA-Z_]\w*\b/g;
        const numberPattern = /\b\d+(\.\d+)?\b/g;
        const stringPattern = /["'`].*?["'`]/g;
        
        const operands = [];
        
        const identifiers = content.match(identifierPattern);
        if (identifiers) operands.push(...identifiers);
        
        const numbers = content.match(numberPattern);
        if (numbers) operands.push(...numbers);
        
        const strings = content.match(stringPattern);
        if (strings) operands.push(...strings);
        
        return operands;
    }

    calculateCognitiveComplexity(content) {
        let complexity = 0;
        let nestingLevel = 0;
        
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.includes('{')) {
                nestingLevel++;
            }
            
            if (/\b(if|else if|for|while|do|switch)\b/.test(trimmed)) {
                complexity += 1 + nestingLevel;
            }
            
            if (/\bcatch\b/.test(trimmed)) {
                complexity += 1;
            }
            
            if (/\bbreak\b|\bcontinue\b/.test(trimmed)) {
                complexity += 1;
            }
            
            const logicalOperators = (trimmed.match(/&&|\|\|/g) || []).length;
            complexity += logicalOperators;
            
            if (trimmed.includes('}')) {
                nestingLevel = Math.max(0, nestingLevel - 1);
            }
        }
        
        return complexity;
    }

    analyzeStructure(content, language) {
        const patterns = this.languagePatterns[language] || this.languagePatterns.javascript;
        const structure = {
            functions: [],
            classes: [],
            imports: [],
            exports: [],
            interfaces: [],
            types: []
        };

        if (patterns.functions) {
            const functionMatches = [...content.matchAll(patterns.functions)];
            structure.functions = functionMatches.map(match => match[1] || match[2] || match[3]).filter(Boolean);
        }

        if (patterns.classes) {
            const classMatches = [...content.matchAll(patterns.classes)];
            structure.classes = classMatches.map(match => match[1]).filter(Boolean);
        }

        if (patterns.imports) {
            const importMatches = [...content.matchAll(patterns.imports)];
            structure.imports = importMatches.map(match => match[1] || match[2]).filter(Boolean);
        }

        if (patterns.exports) {
            const exportMatches = [...content.matchAll(patterns.exports)];
            structure.exports = exportMatches.map(match => match[1]).filter(Boolean);
        }

        if (patterns.interfaces) {
            const interfaceMatches = [...content.matchAll(patterns.interfaces)];
            structure.interfaces = interfaceMatches.map(match => match[1]).filter(Boolean);
        }

        if (patterns.types) {
            const typeMatches = [...content.matchAll(patterns.types)];
            structure.types = typeMatches.map(match => match[1]).filter(Boolean);
        }

        return structure;
    }

    async detectIssues(content, language) {
        const issues = {
            bugs: [],
            security: [],
            performance: [],
            style: [],
            maintenance: []
        };

        issues.bugs.push(...this.detectPotentialBugs(content, language));
        issues.security.push(...this.detectSecurityIssues(content));
        issues.performance.push(...this.detectPerformanceIssues(content, language));
        issues.style.push(...this.detectStyleIssues(content, language));
        issues.maintenance.push(...this.detectMaintenanceIssues(content, language));

        return issues;
    }

    detectPotentialBugs(content, language) {
        const bugs = [];
        
        if (/==\s*null|!=\s*null/.test(content) && language === 'javascript') {
            bugs.push({
                type: 'null-comparison',
                severity: 'low',
                message: 'Use === or !== for null comparisons',
                pattern: '== null or != null'
            });
        }

        if (/console\.(log|error|warn|info)/.test(content)) {
            bugs.push({
                type: 'console-statement',
                severity: 'low',
                message: 'Console statements found in code',
                pattern: 'console.*'
            });
        }

        if (/TODO|FIXME|XXX|HACK/.test(content)) {
            bugs.push({
                type: 'todo-comment',
                severity: 'info',
                message: 'TODO/FIXME comments found',
                pattern: 'TODO|FIXME|XXX|HACK'
            });
        }

        return bugs;
    }

    detectSecurityIssues(content) {
        const issues = [];
        
        if (/eval\s*\(/.test(content)) {
            issues.push({
                type: 'eval-usage',
                severity: 'high',
                message: 'eval() usage detected - potential security risk',
                pattern: 'eval('
            });
        }

        if (/innerHTML\s*=/.test(content)) {
            issues.push({
                type: 'innerHTML',
                severity: 'medium',
                message: 'innerHTML assignment detected - potential XSS risk',
                pattern: 'innerHTML ='
            });
        }

        if (/password|secret|api[_-]?key/i.test(content)) {
            const hardcodedPattern = /(password|secret|api[_-]?key)\s*=\s*["'][^"']+["']/i;
            if (hardcodedPattern.test(content)) {
                issues.push({
                    type: 'hardcoded-secret',
                    severity: 'critical',
                    message: 'Potential hardcoded secret detected',
                    pattern: 'hardcoded password/secret/api-key'
                });
            }
        }

        return issues;
    }

    detectPerformanceIssues(content, language) {
        const issues = [];
        
        if (language === 'javascript' || language === 'typescript') {
            if (/\.forEach\(/.test(content) && content.length > 1000) {
                issues.push({
                    type: 'forEach-usage',
                    severity: 'low',
                    message: 'Consider using for...of for better performance',
                    pattern: '.forEach('
                });
            }

            const nestedLoops = /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/;
            if (nestedLoops.test(content)) {
                issues.push({
                    type: 'nested-loops',
                    severity: 'medium',
                    message: 'Nested loops detected - potential performance issue',
                    pattern: 'nested for loops'
                });
            }
        }

        return issues;
    }

    detectStyleIssues(content, language) {
        const issues = [];
        
        const lines = content.split('\n');
        const longLines = lines.filter(line => line.length > 120);
        
        if (longLines.length > 0) {
            issues.push({
                type: 'long-lines',
                severity: 'info',
                message: `${longLines.length} lines exceed 120 characters`,
                count: longLines.length
            });
        }

        if (language === 'javascript' || language === 'typescript') {
            if (/var\s+\w+\s*=/.test(content)) {
                issues.push({
                    type: 'var-usage',
                    severity: 'low',
                    message: 'Use const or let instead of var',
                    pattern: 'var declaration'
                });
            }
        }

        return issues;
    }

    detectMaintenanceIssues(content, language) {
        const issues = [];
        
        const complexity = this.calculateComplexity(content, language);
        
        if (complexity.cyclomatic > 10) {
            issues.push({
                type: 'high-complexity',
                severity: 'medium',
                message: `High cyclomatic complexity: ${complexity.cyclomatic}`,
                value: complexity.cyclomatic
            });
        }

        if (complexity.nesting > 5) {
            issues.push({
                type: 'deep-nesting',
                severity: 'medium',
                message: `Deep nesting level: ${complexity.nesting}`,
                value: complexity.nesting
            });
        }

        const metrics = this.calculateMetrics(content);
        if (metrics.totalLines > 500) {
            issues.push({
                type: 'large-file',
                severity: 'low',
                message: `Large file: ${metrics.totalLines} lines`,
                value: metrics.totalLines
            });
        }

        return issues;
    }

    assessQuality(content, language) {
        const metrics = this.calculateMetrics(content);
        const complexity = this.calculateComplexity(content, language);
        const issues = this.detectIssues(content, language);
        
        let score = 100;
        
        if (complexity.cyclomatic > 10) score -= 10;
        if (complexity.cyclomatic > 20) score -= 10;
        if (complexity.nesting > 5) score -= 5;
        
        if (metrics.totalLines > 500) score -= 5;
        if (metrics.totalLines > 1000) score -= 10;
        
        const commentRatio = metrics.commentLines / (metrics.codeLines || 1);
        if (commentRatio < 0.1) score -= 5;
        
        score = Math.max(0, Math.min(100, score));
        
        return {
            score,
            grade: this.getGrade(score),
            factors: {
                complexity: complexity.cyclomatic <= 10 ? 'good' : 'needs-improvement',
                size: metrics.totalLines <= 500 ? 'good' : 'large',
                documentation: commentRatio >= 0.1 ? 'adequate' : 'insufficient'
            }
        };
    }

    getGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }
}