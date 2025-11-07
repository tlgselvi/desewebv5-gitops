/**
 * Start FinBot event consumer
 */
export declare function startFinBotConsumer(): Promise<void>;
/**
 * Stop FinBot event consumer
 */
export declare function stopFinBotConsumer(): Promise<void>;
/**
 * Get consumer status
 */
export declare function getConsumerStatus(): {
    isRunning: boolean;
    stream: string;
    consumerGroup: string;
    consumerName: string;
};
//# sourceMappingURL=finbot-consumer.d.ts.map