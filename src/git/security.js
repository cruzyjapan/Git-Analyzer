import { ERROR_CODES } from '../core/error_handler.js';

export class SecurityManager {
    constructor() {
        this.allowedCommands = [
            'git fetch',
            'git pull --ff-only',
            'git log',
            'git diff',
            'git show',
            'git status',
            'git branch',
            'git remote',
            'git rev-parse',
            'git symbolic-ref',
            'git config --get',
            'git rev-list',
            'git ls-tree',
            'git cat-file'
        ];

        this.blockedCommands = [
            'git push',
            'git commit',
            'git merge',
            'git rebase',
            'git checkout -b',
            'git branch -d',
            'git branch -D',
            'git tag',
            'git reset',
            'git clean',
            'git rm',
            'git add',
            'git stash',
            'git cherry-pick',
            'git revert',
            'git config --set',
            'git config --unset',
            'git remote add',
            'git remote remove',
            'git remote set-url'
        ];

        this.blockedPatterns = [
            /--force/,
            /-f\b/,
            /--hard/,
            /--soft/,
            /--mixed/,
            />>/,
            /\|.*>/,
            /&&.*>/,
            /;.*>/
        ];
    }

    validateGitCommand(command) {
        const normalizedCommand = command.trim().toLowerCase();

        for (const blocked of this.blockedCommands) {
            if (normalizedCommand.startsWith(blocked)) {
                throw {
                    code: ERROR_CODES.SECURITY_COMMAND_BLOCKED,
                    message: `Blocked command: ${blocked}`,
                    command: command,
                    reason: 'Write operations are not allowed'
                };
            }
        }

        for (const pattern of this.blockedPatterns) {
            if (pattern.test(normalizedCommand)) {
                throw {
                    code: ERROR_CODES.SECURITY_COMMAND_BLOCKED,
                    message: `Dangerous pattern detected in command`,
                    command: command,
                    pattern: pattern.toString(),
                    reason: 'Command contains potentially dangerous patterns'
                };
            }
        }

        const isAllowed = this.allowedCommands.some(allowed => 
            normalizedCommand.startsWith(allowed)
        );

        if (!isAllowed && normalizedCommand.startsWith('git')) {
            console.warn(`Warning: Unrecognized git command: ${command}`);
        }

        return true;
    }

    sanitizePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw {
                code: ERROR_CODES.SECURITY_PATH_INVALID,
                message: 'Invalid file path',
                path: filePath
            };
        }

        if (filePath.includes('..')) {
            throw {
                code: ERROR_CODES.SECURITY_PATH_TRAVERSAL,
                message: 'Path traversal detected',
                path: filePath,
                reason: 'Paths containing ".." are not allowed'
            };
        }

        const dangerousPatterns = [
            /^\//,
            /^~/,
            /\$\{/,
            /\$\(/,
            /`/,
            /\|/,
            /;/,
            /&/,
            />/,
            /</
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(filePath)) {
                throw {
                    code: ERROR_CODES.SECURITY_PATH_INVALID,
                    message: 'Dangerous path pattern detected',
                    path: filePath,
                    pattern: pattern.toString()
                };
            }
        }

        return filePath.replace(/[^\w\-_.\/]/g, '');
    }

    validateEnvironment() {
        const requiredEnvVars = [];
        const recommendedEnvVars = [
            'GIT_TERMINAL_PROMPT',
            'GIT_ASKPASS'
        ];

        const issues = [];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                issues.push({
                    level: 'error',
                    variable: envVar,
                    message: `Required environment variable ${envVar} is not set`
                });
            }
        }

        for (const envVar of recommendedEnvVars) {
            if (!process.env[envVar]) {
                issues.push({
                    level: 'warning',
                    variable: envVar,
                    message: `Recommended environment variable ${envVar} is not set`
                });
            }
        }

        return {
            valid: issues.filter(i => i.level === 'error').length === 0,
            issues
        };
    }

    createSecureEnvironment() {
        return {
            GIT_TERMINAL_PROMPT: '0',
            GIT_ASKPASS: 'echo',
            GIT_SSH_COMMAND: 'ssh -o BatchMode=yes -o StrictHostKeyChecking=no',
            GIT_HTTP_LOW_SPEED_LIMIT: '1000',
            GIT_HTTP_LOW_SPEED_TIME: '30'
        };
    }

    validateFileAccess(filePath, mode = 'read') {
        const allowedModes = ['read'];
        
        if (!allowedModes.includes(mode)) {
            throw {
                code: ERROR_CODES.SECURITY_WRITE_BLOCKED,
                message: `File access mode '${mode}' is not allowed`,
                path: filePath,
                allowedModes
            };
        }

        const sanitized = this.sanitizePath(filePath);
        
        return {
            path: sanitized,
            mode: mode,
            allowed: true
        };
    }

    checkCommandInjection(input) {
        const dangerousPatterns = [
            /;/,
            /&&/,
            /\|\|/,
            /\|/,
            />/,
            /</,
            /`/,
            /\$\(/,
            /\$\{/,
            /\n/,
            /\r/
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(input)) {
                return {
                    safe: false,
                    pattern: pattern.toString(),
                    reason: 'Potential command injection detected'
                };
            }
        }

        return {
            safe: true,
            sanitized: input.replace(/[^\w\s\-_.\/]/g, '')
        };
    }

    validateAPIKey(key, service) {
        if (!key || typeof key !== 'string') {
            return {
                valid: false,
                reason: 'API key is required'
            };
        }

        if (key.length < 20) {
            return {
                valid: false,
                reason: 'API key appears to be too short'
            };
        }

        const patterns = {
            gemini: /^AIza[0-9A-Za-z\-_]+$/,
            claude: /^sk-[0-9A-Za-z\-_]+$/,
            openai: /^sk-[0-9A-Za-z\-_]+$/
        };

        if (patterns[service]) {
            if (!patterns[service].test(key)) {
                return {
                    valid: false,
                    reason: `API key format is invalid for ${service}`
                };
            }
        }

        return {
            valid: true
        };
    }

    auditLog(action, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            details,
            user: process.env.USER || 'unknown',
            pid: process.pid
        };

        console.log('[AUDIT]', JSON.stringify(logEntry));
        
        return logEntry;
    }

    validateConfiguration(config) {
        const issues = [];

        if (!config || typeof config !== 'object') {
            issues.push({
                level: 'error',
                field: 'config',
                message: 'Configuration must be an object'
            });
            return { valid: false, issues };
        }

        if (config.allowWrites === true) {
            issues.push({
                level: 'error',
                field: 'allowWrites',
                message: 'Write operations cannot be enabled for security reasons'
            });
        }

        if (config.commands) {
            for (const command of config.commands) {
                try {
                    this.validateGitCommand(command);
                } catch (error) {
                    issues.push({
                        level: 'error',
                        field: 'commands',
                        message: `Invalid command in configuration: ${command}`
                    });
                }
            }
        }

        return {
            valid: issues.filter(i => i.level === 'error').length === 0,
            issues
        };
    }
}