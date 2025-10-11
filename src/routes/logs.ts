import { Router } from 'express';
import { backendLogger, LogLevel, LogCategory } from '../utils/logger';

const router = Router();

// Store frontend logs
const frontendLogs: any[] = [];

// Receive frontend logs
router.post('/', async (req, res) => {
    try {
        const logEntry = req.body;
        frontendLogs.push({
            ...logEntry,
            receivedAt: new Date().toISOString(),
            source: 'frontend'
        });

        // Log to backend logger
        backendLogger.log(
            logEntry.level || LogLevel.INFO,
            logEntry.category || LogCategory.API,
            `Frontend: ${logEntry.message}`,
            logEntry.data,
            {
                endpoint: '/api/logs',
                method: 'POST',
                sessionId: logEntry.sessionId,
                userAgent: logEntry.userAgent
            }
        );

        res.json({ success: true });
    } catch (error) {
        backendLogger.error('Failed to store frontend log', { error });
        res.status(500).json({ error: 'Failed to store log' });
    }
});

// Get all logs (frontend + backend)
router.get('/', (req, res) => {
    try {
        const {
            level,
            category,
            page,
            endpoint,
            userId,
            startTime,
            endTime,
            limit = 1000
        } = req.query;

        // Get backend logs
        const backendLogs = backendLogger.getLogs({
            level: level ? Number(level) : undefined,
            category: category as LogCategory,
            endpoint: endpoint as string,
            userId: userId as string,
            startTime: startTime as string,
            endTime: endTime as string
        });

        // Get frontend logs
        let filteredFrontendLogs = [...frontendLogs];
        if (level) {
            filteredFrontendLogs = filteredFrontendLogs.filter(log => log.level >= Number(level));
        }
        if (category) {
            filteredFrontendLogs = filteredFrontendLogs.filter(log => log.category === category);
        }
        if (page) {
            filteredFrontendLogs = filteredFrontendLogs.filter(log => log.page === page);
        }
        if (startTime) {
            filteredFrontendLogs = filteredFrontendLogs.filter(log => log.timestamp >= startTime);
        }
        if (endTime) {
            filteredFrontendLogs = filteredFrontendLogs.filter(log => log.timestamp <= endTime);
        }

        // Combine and sort logs
        const allLogs = [...backendLogs, ...filteredFrontendLogs]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, Number(limit));

        res.json({
            logs: allLogs,
            total: allLogs.length,
            backendCount: backendLogs.length,
            frontendCount: filteredFrontendLogs.length
        });
    } catch (error) {
        backendLogger.error('Failed to retrieve logs', { error });
        res.status(500).json({ error: 'Failed to retrieve logs' });
    }
});

// Get log statistics
router.get('/stats', (req, res) => {
    try {
        const backendStats = backendLogger.getStats();
        const frontendStats = {
            totalLogs: frontendLogs.length,
            errorCount: frontendLogs.filter(log => log.level >= LogLevel.ERROR).length,
            warningCount: frontendLogs.filter(log => log.level === LogLevel.WARN).length,
            criticalCount: frontendLogs.filter(log => log.level === LogLevel.CRITICAL).length
        };

        res.json({
            backend: backendStats,
            frontend: frontendStats,
            combined: {
                totalLogs: backendStats.totalLogs + frontendStats.totalLogs,
                errorCount: backendStats.errorCount + frontendStats.errorCount,
                warningCount: backendStats.warningCount + frontendStats.warningCount,
                criticalCount: backendStats.criticalCount + frontendStats.criticalCount
            }
        });
    } catch (error) {
        backendLogger.error('Failed to get log statistics', { error });
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Export logs
router.get('/export', (req, res) => {
    try {
        const { format = 'json' } = req.query;
        const backendLogs = backendLogger.exportLogs(format as 'json' | 'csv');

        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.${format}"`);
        res.send(backendLogs);
    } catch (error) {
        backendLogger.error('Failed to export logs', { error });
        res.status(500).json({ error: 'Failed to export logs' });
    }
});

// Clear logs
router.delete('/', (req, res) => {
    try {
        backendLogger.clearLogs();
        frontendLogs.length = 0; // Clear frontend logs array

        backendLogger.info('All logs cleared', {
            endpoint: '/api/logs',
            method: 'DELETE'
        });

        res.json({ success: true, message: 'All logs cleared' });
    } catch (error) {
        backendLogger.error('Failed to clear logs', { error });
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

// Get logs by page
router.get('/page/:page', (req, res) => {
    try {
        const { page } = req.params;
        const { limit = 100 } = req.query;

        const pageLogs = frontendLogs
            .filter(log => log.page === page)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, Number(limit));

        res.json({
            page,
            logs: pageLogs,
            count: pageLogs.length
        });
    } catch (error) {
        backendLogger.error('Failed to get logs by page', { error, page: req.params.page });
        res.status(500).json({ error: 'Failed to get page logs' });
    }
});

// Get error logs
router.get('/errors', (req, res) => {
    try {
        const { limit = 100 } = req.query;

        const errorLogs = [...backendLogger.getLogs(), ...frontendLogs]
            .filter(log => log.level >= LogLevel.ERROR)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, Number(limit));

        res.json({
            errors: errorLogs,
            count: errorLogs.length
        });
    } catch (error) {
        backendLogger.error('Failed to get error logs', { error });
        res.status(500).json({ error: 'Failed to get error logs' });
    }
});

export default router;
