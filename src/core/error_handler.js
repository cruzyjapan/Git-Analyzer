import chalk from 'chalk';
import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';

export const ERROR_CODES = {
    GIT_REPO_NOT_FOUND: 1001,
    GIT_BRANCH_NOT_FOUND: 1002,
    GIT_ACCESS_DENIED: 1003,
    GIT_COMMAND_FAILED: 1004,
    GIT_REMOTE_ERROR: 1005,
    
    SECURITY_WRITE_BLOCKED: 2001,
    SECURITY_COMMAND_BLOCKED: 2002,
    SECURITY_PATH_TRAVERSAL: 2003,
    SECURITY_PATH_INVALID: 2004,
    
    AI_CLI_NOT_FOUND: 3001,
    AI_API_ERROR: 3002,
    AI_RATE_LIMIT: 3003,
    AI_AUTH_ERROR: 3004,
    
    OUTPUT_FORMAT_ERROR: 4001,
    OUTPUT_ENCODING_ERROR: 4002,
    OUTPUT_PATH_ERROR: 4003,
    OUTPUT_WRITE_ERROR: 4004,
    
    CONFIG_INVALID: 5001,
    CONFIG_NOT_FOUND: 5002,
    CONFIG_PARSE_ERROR: 5003,
    
    GENERAL_ERROR: 9999
};

export class ErrorHandler {
    constructor() {
        this.logger = this.createLogger();
    }

    createLogger() {
        const logDir = path.join(process.cwd(), '.git-analyzer', 'logs');
        fs.ensureDirSync(logDir);

        return winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({
                    filename: path.join(logDir, 'error.log'),
                    level: 'error',
                    maxsize: 5242880,
                    maxFiles: 5
                }),
                new winston.transports.File({
                    filename: path.join(logDir, 'combined.log'),
                    maxsize: 5242880,
                    maxFiles: 5
                }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    ),
                    level: 'error'
                })
            ]
        });
    }

    handle(error) {
        const errorInfo = this.parseError(error);
        
        this.logError(errorInfo);
        this.notifyUser(errorInfo);
        
        if (this.canRecover(errorInfo)) {
            return this.recover(errorInfo);
        }
        
        this.cleanup();
        process.exit(errorInfo.code);
    }

    parseError(error) {
        if (error.code && ERROR_CODES[error.code]) {
            return {
                code: error.code,
                message: error.message,
                details: error,
                timestamp: new Date().toISOString()
            };
        }

        if (error.message) {
            const errorInfo = this.identifyError(error.message);
            return {
                ...errorInfo,
                originalError: error,
                stack: error.stack,
                timestamp: new Date().toISOString()
            };
        }

        return {
            code: ERROR_CODES.GENERAL_ERROR,
            message: 'An unexpected error occurred',
            details: error,
            timestamp: new Date().toISOString()
        };
    }

    identifyError(message) {
        const errorPatterns = [
            {
                pattern: /not a git repository/i,
                code: ERROR_CODES.GIT_REPO_NOT_FOUND,
                message: 'Not a Git repository',
                suggestion: 'Please run this command in a Git repository or specify a valid path'
            },
            {
                pattern: /branch .* not found/i,
                code: ERROR_CODES.GIT_BRANCH_NOT_FOUND,
                message: 'Branch not found',
                suggestion: 'Please check the branch name and try again'
            },
            {
                pattern: /permission denied/i,
                code: ERROR_CODES.GIT_ACCESS_DENIED,
                message: 'Permission denied',
                suggestion: 'Please check your repository permissions'
            },
            {
                pattern: /rate limit/i,
                code: ERROR_CODES.AI_RATE_LIMIT,
                message: 'API rate limit exceeded',
                suggestion: 'Please wait a moment and try again'
            },
            {
                pattern: /authentication|unauthorized/i,
                code: ERROR_CODES.AI_AUTH_ERROR,
                message: 'Authentication failed',
                suggestion: 'Please check your API credentials'
            },
            {
                pattern: /cannot write|write blocked/i,
                code: ERROR_CODES.SECURITY_WRITE_BLOCKED,
                message: 'Write operation blocked',
                suggestion: 'This tool operates in read-only mode for security'
            }
        ];

        for (const { pattern, code, message, suggestion } of errorPatterns) {
            if (pattern.test(message)) {
                return { code, message, suggestion };
            }
        }

        return {
            code: ERROR_CODES.GENERAL_ERROR,
            message: message,
            suggestion: 'Please check the error details and try again'
        };
    }

    logError(errorInfo) {
        this.logger.error('Error occurred', errorInfo);
    }

    notifyUser(errorInfo) {
        console.error(chalk.red('\n❌ Error: ') + chalk.white(errorInfo.message));
        
        if (errorInfo.suggestion) {
            console.error(chalk.yellow('💡 Suggestion: ') + errorInfo.suggestion);
        }
        
        if (errorInfo.details && process.env.DEBUG) {
            console.error(chalk.gray('\nDebug Information:'));
            console.error(chalk.gray(JSON.stringify(errorInfo.details, null, 2)));
        }
        
        console.error(chalk.gray(`\nError Code: ${errorInfo.code}`));
        console.error(chalk.gray(`Timestamp: ${errorInfo.timestamp}`));
        
        if (errorInfo.stack && process.env.DEBUG) {
            console.error(chalk.gray('\nStack Trace:'));
            console.error(chalk.gray(errorInfo.stack));
        }
    }

    canRecover(errorInfo) {
        const recoverableCodes = [
            ERROR_CODES.GIT_REMOTE_ERROR,
            ERROR_CODES.AI_RATE_LIMIT,
            ERROR_CODES.OUTPUT_ENCODING_ERROR
        ];
        
        return recoverableCodes.includes(errorInfo.code);
    }

    recover(errorInfo) {
        console.log(chalk.blue('\n🔄 Attempting to recover...'));
        
        switch (errorInfo.code) {
            case ERROR_CODES.GIT_REMOTE_ERROR:
                console.log(chalk.yellow('Continuing with local data only'));
                return { recovered: true, useLocal: true };
                
            case ERROR_CODES.AI_RATE_LIMIT:
                console.log(chalk.yellow('Waiting 30 seconds before retry...'));
                setTimeout(() => {
                    return { recovered: true, retry: true };
                }, 30000);
                break;
                
            case ERROR_CODES.OUTPUT_ENCODING_ERROR:
                console.log(chalk.yellow('Falling back to UTF-8 encoding'));
                return { recovered: true, encoding: 'utf8' };
                
            default:
                return { recovered: false };
        }
    }

    cleanup() {
        console.log(chalk.gray('\n🧹 Cleaning up...'));
    }

    createUserFriendlyMessage(code) {
        const messages = {
            [ERROR_CODES.GIT_REPO_NOT_FOUND]: {
                title: 'Git Repository Not Found',
                description: 'The specified directory is not a Git repository.',
                actions: [
                    'Navigate to a Git repository',
                    'Initialize a new repository with `git init`',
                    'Clone an existing repository'
                ]
            },
            [ERROR_CODES.GIT_BRANCH_NOT_FOUND]: {
                title: 'Branch Not Found',
                description: 'The specified branch does not exist in this repository.',
                actions: [
                    'List available branches with `git-analyzer branch list`',
                    'Fetch latest branches with `git fetch --all`',
                    'Check branch name spelling'
                ]
            },
            [ERROR_CODES.SECURITY_WRITE_BLOCKED]: {
                title: 'Write Operation Blocked',
                description: 'This tool operates in read-only mode for security.',
                actions: [
                    'Use Git directly for write operations',
                    'Review generated reports for recommended changes',
                    'Export analysis results for manual implementation'
                ]
            },
            [ERROR_CODES.AI_AUTH_ERROR]: {
                title: 'API Authentication Failed',
                description: 'Could not authenticate with the AI service.',
                actions: [
                    'Check your API key configuration',
                    'Verify API key is valid and active',
                    'Set environment variable for the API key'
                ]
            }
        };
        
        return messages[code] || {
            title: 'Unexpected Error',
            description: 'An unexpected error occurred during execution.',
            actions: [
                'Check the error message for details',
                'Review the logs in .git-analyzer/logs',
                'Report the issue if it persists'
            ]
        };
    }

    formatErrorReport(error) {
        const info = this.createUserFriendlyMessage(error.code);
        
        let report = chalk.red(`\n${'='.repeat(50)}\n`);
        report += chalk.red.bold(`⚠️  ${info.title}\n`);
        report += chalk.red(`${'='.repeat(50)}\n\n`);
        
        report += chalk.white(`${info.description}\n\n`);
        
        report += chalk.yellow('Recommended Actions:\n');
        info.actions.forEach((action, index) => {
            report += chalk.gray(`  ${index + 1}. ${action}\n`);
        });
        
        report += chalk.red(`\n${'='.repeat(50)}\n`);
        
        return report;
    }
}

export const errorHandler = new ErrorHandler();