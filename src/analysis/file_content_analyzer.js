import fs from 'fs-extra';
import path from 'path';

export class FileContentAnalyzer {
    constructor() {
        this.patterns = this.initializePatterns();
    }

    initializePatterns() {
        return {
            // File type patterns
            component: {
                react: [
                    /import\s+React/,
                    /extends\s+(React\.)?Component/,
                    /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*return\s*\(/,
                    /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*[\s\S]*return\s*\(/,
                    /export\s+default\s+function\s+\w+/
                ],
                vue: [
                    /<template>/,
                    /<script>/,
                    /export\s+default\s*{[\s\S]*data\s*\(\)/,
                    /Vue\.component/
                ],
                angular: [
                    /@Component\s*\(/,
                    /@Injectable\s*\(/,
                    /@NgModule\s*\(/,
                    /import\s*{\s*Component\s*}\s*from\s*['"]@angular/
                ]
            },
            api: {
                rest: [
                    /app\.(get|post|put|delete|patch)\s*\(/,
                    /router\.(get|post|put|delete|patch)\s*\(/,
                    /express\(\)/,
                    /@(Get|Post|Put|Delete|Patch)Mapping/,
                    /@RestController/
                ],
                graphql: [
                    /type\s+Query\s*{/,
                    /type\s+Mutation\s*{/,
                    /GraphQLSchema/,
                    /buildSchema\(/,
                    /@Resolver/
                ]
            },
            database: {
                model: [
                    /mongoose\.Schema/,
                    /sequelize\.define/,
                    /@Entity\s*\(/,
                    /class\s+\w+\s+extends\s+Model/,
                    /CREATE\s+TABLE/i
                ],
                migration: [
                    /exports\.up\s*=/,
                    /exports\.down\s*=/,
                    /class\s+\w+Migration/,
                    /def\s+up\s*\(/,
                    /def\s+down\s*\(/
                ]
            },
            test: {
                unit: [
                    /describe\s*\(/,
                    /it\s*\(/,
                    /test\s*\(/,
                    /expect\s*\(/,
                    /@Test/,
                    /assert/
                ],
                integration: [
                    /supertest/,
                    /request\(app\)/,
                    /@SpringBootTest/,
                    /TestBed\.configureTestingModule/
                ]
            },
            config: {
                build: [
                    /webpack\.config/,
                    /rollup\.config/,
                    /vite\.config/,
                    /tsconfig\.json/,
                    /babel\.config/
                ],
                environment: [
                    /\.env/,
                    /config\.(js|ts|json)$/,
                    /settings\.(py|js|ts)$/
                ]
            },
            style: {
                css: [
                    /\.css$/,
                    /\.scss$/,
                    /\.sass$/,
                    /\.less$/,
                    /styled-components/,
                    /@emotion/
                ]
            },
            documentation: {
                markdown: [
                    /\.md$/,
                    /README/,
                    /CHANGELOG/,
                    /CONTRIBUTING/
                ],
                jsdoc: [
                    /\/\*\*[\s\S]*@param/,
                    /\/\*\*[\s\S]*@returns/,
                    /\/\*\*[\s\S]*@description/
                ]
            }
        };
    }

    async analyzeFileContent(filePath, content, language) {
        const analysis = {
            path: filePath,
            language: language,
            type: this.detectFileType(filePath, content),
            purpose: this.detectFilePurpose(filePath, content),
            structure: this.analyzeStructure(content, language),
            dependencies: this.extractDependencies(content, language),
            exports: this.extractExports(content, language),
            functions: this.extractFunctions(content, language),
            classes: this.extractClasses(content, language),
            complexity: this.calculateComplexity(content),
            characteristics: this.detectCharacteristics(content, language)
        };

        // Generate description
        analysis.description = this.generateFileDescription(analysis);
        
        return analysis;
    }

    detectFileType(filePath, content) {
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath);
        
        // Check by file name patterns
        if (/test\.|spec\.|\.test\.|\.spec\./.test(fileName)) {
            return 'test';
        }
        if (/config|settings|setup/.test(fileName)) {
            return 'configuration';
        }
        if (/index\.(js|ts|jsx|tsx)$/.test(fileName)) {
            return 'entry-point';
        }
        if (/\.(css|scss|sass|less)$/.test(fileName)) {
            return 'stylesheet';
        }
        if (/\.(md|markdown|txt|rst)$/.test(fileName)) {
            return 'documentation';
        }
        
        // Check by content patterns
        for (const [category, types] of Object.entries(this.patterns)) {
            for (const [type, patterns] of Object.entries(types)) {
                if (patterns.some(pattern => pattern.test(content))) {
                    return `${category}-${type}`;
                }
            }
        }
        
        // Default by extension
        const typeMap = {
            '.js': 'javascript',
            '.jsx': 'react-component',
            '.ts': 'typescript',
            '.tsx': 'react-component',
            '.vue': 'vue-component',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php'
        };
        
        return typeMap[ext] || 'unknown';
    }

    detectFilePurpose(filePath, content) {
        const purposes = [];
        
        // API endpoints
        if (/\/(api|routes|controllers)\//.test(filePath)) {
            purposes.push('APIエンドポイント');
        }
        
        // UI Components
        if (/\/(components|views|pages)\//.test(filePath)) {
            purposes.push('UIコンポーネント');
        }
        
        // Database
        if (/\/(models|entities|schemas)\//.test(filePath)) {
            purposes.push('データモデル');
        }
        
        // Services/Business Logic
        if (/\/(services|handlers|use-?cases)\//.test(filePath)) {
            purposes.push('ビジネスロジック');
        }
        
        // Utilities
        if (/\/(utils|helpers|lib)\//.test(filePath)) {
            purposes.push('ユーティリティ');
        }
        
        // Middleware
        if (/\/(middleware|interceptors|filters)\//.test(filePath)) {
            purposes.push('ミドルウェア');
        }
        
        // Based on content
        if (/export\s+default\s+class.*extends.*Component/.test(content)) {
            purposes.push('Reactコンポーネント');
        }
        if (/app\.(get|post|put|delete)\(/.test(content)) {
            purposes.push('RESTful API');
        }
        if (/async\s+function.*fetch|axios|fetch\(/.test(content)) {
            purposes.push('API通信');
        }
        if (/mongoose\.Schema|sequelize\.define/.test(content)) {
            purposes.push('データベースモデル');
        }
        
        return purposes.length > 0 ? purposes : ['汎用モジュール'];
    }

    analyzeStructure(content, language) {
        const structure = {
            lines: content.split('\n').length,
            imports: 0,
            exports: 0,
            functions: 0,
            classes: 0,
            interfaces: 0,
            comments: 0,
            emptyLines: 0
        };
        
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === '') {
                structure.emptyLines++;
            }
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                structure.comments++;
            }
            if (/^import\s/.test(trimmed) || /^const.*require\(/.test(trimmed)) {
                structure.imports++;
            }
            if (/^export\s/.test(trimmed)) {
                structure.exports++;
            }
            if (/^(async\s+)?function\s/.test(trimmed) || /^const\s+\w+\s*=\s*(async\s*)?\(/.test(trimmed)) {
                structure.functions++;
            }
            if (/^class\s/.test(trimmed)) {
                structure.classes++;
            }
            if (/^interface\s/.test(trimmed) || /^type\s/.test(trimmed)) {
                structure.interfaces++;
            }
        }
        
        return structure;
    }

    extractDependencies(content, language) {
        const dependencies = [];
        
        // JavaScript/TypeScript imports
        const importRegex = /import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
        const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
        
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            if (!match[1].startsWith('.')) {
                dependencies.push(match[1]);
            }
        }
        
        while ((match = requireRegex.exec(content)) !== null) {
            if (!match[1].startsWith('.')) {
                dependencies.push(match[1]);
            }
        }
        
        // Python imports
        if (language === 'python') {
            const pythonImportRegex = /^(?:from\s+(\S+)\s+)?import\s+/gm;
            while ((match = pythonImportRegex.exec(content)) !== null) {
                if (match[1]) {
                    dependencies.push(match[1]);
                }
            }
        }
        
        return [...new Set(dependencies)];
    }

    extractExports(content, language) {
        const exports = [];
        
        // Default export
        if (/export\s+default\s+(\w+)/.test(content)) {
            const match = content.match(/export\s+default\s+(\w+)/);
            exports.push({ type: 'default', name: match[1] });
        }
        
        // Named exports
        const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
        let match;
        while ((match = namedExportRegex.exec(content)) !== null) {
            exports.push({ type: 'named', name: match[1] });
        }
        
        // Export from
        const exportFromRegex = /export\s*{\s*([^}]+)\s*}\s*from/g;
        while ((match = exportFromRegex.exec(content)) !== null) {
            const names = match[1].split(',').map(n => n.trim());
            names.forEach(name => {
                exports.push({ type: 'reexport', name });
            });
        }
        
        return exports;
    }

    extractFunctions(content, language) {
        const functions = [];
        
        // Function declarations
        const funcDeclRegex = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
        let match;
        while ((match = funcDeclRegex.exec(content)) !== null) {
            functions.push({
                name: match[1],
                params: match[2].split(',').map(p => p.trim()).filter(p => p),
                async: match[0].includes('async')
            });
        }
        
        // Arrow functions
        const arrowFuncRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
        while ((match = arrowFuncRegex.exec(content)) !== null) {
            functions.push({
                name: match[1],
                params: match[2].split(',').map(p => p.trim()).filter(p => p),
                async: match[0].includes('async'),
                arrow: true
            });
        }
        
        // Class methods
        const methodRegex = /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*{/g;
        while ((match = methodRegex.exec(content)) !== null) {
            if (!['function', 'if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
                functions.push({
                    name: match[1],
                    params: match[2].split(',').map(p => p.trim()).filter(p => p),
                    async: match[0].includes('async'),
                    method: true
                });
            }
        }
        
        return functions;
    }

    extractClasses(content, language) {
        const classes = [];
        
        const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g;
        let match;
        while ((match = classRegex.exec(content)) !== null) {
            classes.push({
                name: match[1],
                extends: match[2] || null
            });
        }
        
        return classes;
    }

    calculateComplexity(content) {
        let complexity = 1;
        
        // Count decision points
        const decisionPatterns = [
            /if\s*\(/g,
            /else\s+if\s*\(/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /do\s*{/g,
            /switch\s*\(/g,
            /case\s+/g,
            /catch\s*\(/g,
            /\?\s*[^:]+\s*:/g, // ternary operator
            /&&/g,
            /\|\|/g
        ];
        
        for (const pattern of decisionPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }
        
        return complexity;
    }

    detectCharacteristics(content, language) {
        const characteristics = [];
        
        // Async operations
        if (/async|await|Promise|then\(/.test(content)) {
            characteristics.push('非同期処理');
        }
        
        // Error handling
        if (/try\s*{|catch\s*\(|throw\s+/.test(content)) {
            characteristics.push('エラーハンドリング');
        }
        
        // State management
        if (/useState|setState|redux|vuex|mobx/.test(content)) {
            characteristics.push('状態管理');
        }
        
        // API calls
        if (/fetch\(|axios|http\.request|ajax/.test(content)) {
            characteristics.push('API通信');
        }
        
        // Event handling
        if (/addEventListener|onClick|onChange|onSubmit|emit\(/.test(content)) {
            characteristics.push('イベント処理');
        }
        
        // Database operations
        if (/SELECT|INSERT|UPDATE|DELETE|find\(|save\(|create\(|update\(/.test(content)) {
            characteristics.push('データベース操作');
        }
        
        // Authentication
        if (/auth|token|jwt|session|login|logout|password/.test(content)) {
            characteristics.push('認証・認可');
        }
        
        // Validation
        if (/validate|validator|schema\.validate|yup|joi/.test(content)) {
            characteristics.push('バリデーション');
        }
        
        // Caching
        if (/cache|redis|memcached|localStorage|sessionStorage/.test(content)) {
            characteristics.push('キャッシュ処理');
        }
        
        // Logging
        if (/console\.log|logger|winston|morgan|debug/.test(content)) {
            characteristics.push('ログ出力');
        }
        
        return characteristics;
    }

    generateFileDescription(analysis) {
        let description = '';
        
        // File type and purpose
        description += `このファイルは${analysis.purpose.join('、')}として機能する${analysis.type}ファイルです。`;
        
        // Structure summary
        if (analysis.structure.classes > 0) {
            description += `${analysis.structure.classes}個のクラス`;
        }
        if (analysis.structure.functions > 0) {
            description += `${description ? '、' : ''}${analysis.structure.functions}個の関数`;
        }
        if (analysis.structure.imports > 0) {
            description += `を含み、${analysis.structure.imports}個の依存関係があります。`;
        } else {
            description += `を含んでいます。`;
        }
        
        // Main exports
        if (analysis.exports.length > 0) {
            const defaultExport = analysis.exports.find(e => e.type === 'default');
            if (defaultExport) {
                description += `主要なエクスポートは${defaultExport.name}です。`;
            }
        }
        
        // Characteristics
        if (analysis.characteristics.length > 0) {
            description += `主な特徴: ${analysis.characteristics.join('、')}。`;
        }
        
        // Complexity
        if (analysis.complexity > 10) {
            description += `複雑度が高い(${analysis.complexity})ため、リファクタリングを検討してください。`;
        }
        
        return description;
    }
}

export default FileContentAnalyzer;