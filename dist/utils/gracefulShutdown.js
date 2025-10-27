import { logger } from './logger.js';
export function gracefulShutdown(server, cleanup, options = {}) {
    const { timeout = 10000, // 10 seconds
    signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'], } = options;
    let isShuttingDown = false;
    const shutdown = async (signal) => {
        if (isShuttingDown) {
            logger.warn(`Received ${signal} during shutdown, ignoring`);
            return;
        }
        isShuttingDown = true;
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        // Set timeout for forced shutdown
        const forceShutdown = setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, timeout);
        try {
            // Stop accepting new connections
            server.close(async (err) => {
                if (err) {
                    logger.error('Error during server shutdown:', err);
                }
                else {
                    logger.info('HTTP server closed');
                }
                // Run cleanup function
                if (cleanup) {
                    try {
                        await cleanup();
                        logger.info('Cleanup completed');
                    }
                    catch (error) {
                        logger.error('Error during cleanup:', error);
                    }
                }
                // Clear timeout and exit
                clearTimeout(forceShutdown);
                process.exit(err ? 1 : 0);
            });
        }
        catch (error) {
            logger.error('Error during graceful shutdown:', error);
            clearTimeout(forceShutdown);
            process.exit(1);
        }
    };
    // Register signal handlers
    signals.forEach((signal) => {
        process.on(signal, () => shutdown(signal));
    });
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        shutdown('UNCAUGHT_EXCEPTION');
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        shutdown('UNHANDLED_REJECTION');
    });
    logger.info('Graceful shutdown handlers registered');
}
//# sourceMappingURL=gracefulShutdown.js.map