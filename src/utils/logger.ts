/**
 * Backend Logging System for Fuel Station Management
 * Comprehensive server-side logging for production debugging
 */

import fs from 'fs';
import path from 'path';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4
}

export enum LogCategory {
    API = 'API',
    DATABASE = 'DATABASE',
    AUTHENTICATION = 'AUTHENTICATION',
    BUSINESS_LOGIC = 'BUSINESS_LOGIC',
    SECURITY = 'SECURITY',
    PERFORMANCE = 'PERFORMANCE',
    ERROR = 'ERROR',
    SYSTEM = 'SYSTEM'
}

export interface BackendLogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    category: LogCategory;
    message: string;
    endpoint?: string;
    method?: string;
    userId?: string;
    sessionId?: string;
    ip?: string;
    userAgent?: string;
    data?: any;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    performance?: {
        duration: number;
        memoryUsage?: number;
    };
    database?: {
        query: string;
        duration: number;
        rowsAffected?: number;
    };
}

class BackendLogger {
    private logs: BackendLogEntry[] = [];
    private maxLogs = 5000; // Keep last 5000 logs in memory
    private logDir: string;
    private logFile: string;

    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private createLogEntry(
        level: LogLevel,
        category: LogCategory,
        message: string,
        data?: any,
        context?: {
            endpoint?: string;
            method?: string;
            userId?: string;
            sessionId?: string;
            ip?: string;
            userAgent?: string;
        }
    ): BackendLogEntry {
        return {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            endpoint: context?.endpoint,
            method: context?.method,
            userId: context?.userId,
            sessionId: context?.sessionId,
            ip: context?.ip,
            userAgent: context?.userAgent,
            data,
            performance: {
                duration: 0,
                memoryUsage: process.memoryUsage().heapUsed
            }
        };
    }

    private writeToFile(entry: BackendLogEntry): void {
        const logLine = JSON.stringify(entry) + '\n';
        fs.appendFileSync(this.logFile, logLine);
    }

    private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
        switch (level) {
            case LogLevel.DEBUG:
                return console.debug;
            case LogLevel.INFO:
                return console.info;
            case LogLevel.WARN:
                return console.warn;
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                return console.error;
            default:
                return console.log;
        }
    }

    log(
        level: LogLevel,
        category: LogCategory,
        message: string,
        data?: any,
        context?: {
            endpoint?: string;
            method?: string;
            userId?: string;
            sessionId?: string;
            ip?: string;
            userAgent?: string;
        }
    ): void {
        const entry = this.createLogEntry(level, category, message, data, context);

        // Add to in-memory logs
        this.logs.push(entry);

        // Keep only last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output
        const consoleMethod = this.getConsoleMethod(level);
        const logMessage = `[${LogCategory[category]}] ${message}`;

        if (data) {
            consoleMethod(logMessage, data);
        } else {
            consoleMethod(logMessage);
        }

        // Write to file
        this.writeToFile(entry);
    }

    // Convenience methods
    debug(message: string, data?: any, context?: any): void {
        this.log(LogLevel.DEBUG, LogCategory.BUSINESS_LOGIC, message, data, context);
    }

    info(message: string, data?: any, context?: any): void {
        this.log(LogLevel.INFO, LogCategory.BUSINESS_LOGIC, message, data, context);
    }

    warn(message: string, data?: any, context?: any): void {
        this.log(LogLevel.WARN, LogCategory.BUSINESS_LOGIC, message, data, context);
    }

    error(message: string, data?: any, context?: any): void {
        this.log(LogLevel.ERROR, LogCategory.ERROR, message, data, context);
    }

    critical(message: string, data?: any, context?: any): void {
        this.log(LogLevel.CRITICAL, LogCategory.ERROR, message, data, context);
    }

    // API logging
    apiRequest(method: string, endpoint: string, startTime: number, status?: number, context?: any): void {
        const duration = Date.now() - startTime;
        this.log(LogLevel.INFO, LogCategory.API, `API Request: ${method} ${endpoint}`, {
            method,
            endpoint,
            status,
            duration
        }, context);
    }

    // Database logging
    databaseQuery(query: string, duration: number, rowsAffected?: number, context?: any): void {
        this.log(LogLevel.DEBUG, LogCategory.DATABASE, `Database Query`, {
            database: {
                query,
                duration,
                rowsAffected
            }
        }, context);
    }

    // Authentication logging
    authEvent(event: string, success: boolean, userId?: string, context?: any): void {
        this.log(
            success ? LogLevel.INFO : LogLevel.WARN,
            LogCategory.AUTHENTICATION,
            `Auth Event: ${event} - ${success ? 'Success' : 'Failed'}`,
            { event, success, userId },
            context
        );
    }

    // Security logging
    securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any, context?: any): void {
        const level = severity === 'critical' ? LogLevel.CRITICAL :
            severity === 'high' ? LogLevel.ERROR :
                severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;

        this.log(level, LogCategory.SECURITY, `Security Event: ${event}`, {
            event,
            severity,
            ...data
        }, context);
    }

    // Get logs
    getLogs(filter?: {
        level?: LogLevel;
        category?: LogCategory;
        endpoint?: string;
        userId?: string;
        startTime?: string;
        endTime?: string;
    }): BackendLogEntry[] {
        let filteredLogs = [...this.logs];

        if (filter) {
            if (filter.level !== undefined) {
                filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
            }
            if (filter.category) {
                filteredLogs = filteredLogs.filter(log => log.category === filter.category);
            }
            if (filter.endpoint) {
                filteredLogs = filteredLogs.filter(log => log.endpoint?.includes(filter.endpoint!));
            }
            if (filter.userId) {
                filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
            }
            if (filter.startTime) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
            }
            if (filter.endTime) {
                filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
            }
        }

        return filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Export logs
    exportLogs(format: 'json' | 'csv' = 'json'): string {
        const logs = this.getLogs();

        if (format === 'csv') {
            const headers = ['Timestamp', 'Level', 'Category', 'Endpoint', 'Message', 'Data'];
            const rows = logs.map(log => [
                log.timestamp,
                LogLevel[log.level],
                LogCategory[log.category],
                log.endpoint || '',
                log.message,
                JSON.stringify(log.data || {})
            ]);

            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }

        return JSON.stringify(logs, null, 2);
    }

    // Clear logs
    clearLogs(): void {
        this.logs = [];
    }

    // Get system stats
    getStats(): {
        totalLogs: number;
        errorCount: number;
        warningCount: number;
        criticalCount: number;
        memoryUsage: NodeJS.MemoryUsage;
    } {
        const errorCount = this.logs.filter(log => log.level >= LogLevel.ERROR).length;
        const warningCount = this.logs.filter(log => log.level === LogLevel.WARN).length;
        const criticalCount = this.logs.filter(log => log.level === LogLevel.CRITICAL).length;

        return {
            totalLogs: this.logs.length,
            errorCount,
            warningCount,
            criticalCount,
            memoryUsage: process.memoryUsage()
        };
    }
}

// Create singleton instance
export const backendLogger = new BackendLogger();

// Export convenience functions
export const log = {
    debug: (message: string, data?: any, context?: any) => backendLogger.debug(message, data, context),
    info: (message: string, data?: any, context?: any) => backendLogger.info(message, data, context),
    warn: (message: string, data?: any, context?: any) => backendLogger.warn(message, data, context),
    error: (message: string, data?: any, context?: any) => backendLogger.error(message, data, context),
    critical: (message: string, data?: any, context?: any) => backendLogger.critical(message, data, context),
    api: (method: string, endpoint: string, startTime: number, status?: number, context?: any) =>
        backendLogger.apiRequest(method, endpoint, startTime, status, context),
    database: (query: string, duration: number, rowsAffected?: number, context?: any) =>
        backendLogger.databaseQuery(query, query, duration, rowsAffected, context),
    auth: (event: string, success: boolean, userId?: string, context?: any) =>
        backendLogger.authEvent(event, success, userId, context),
    security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any, context?: any) =>
        backendLogger.securityEvent(event, severity, data, context)
};
