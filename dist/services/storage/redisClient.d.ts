import Redis from 'ioredis';
declare const redis: Redis;
export interface FeedbackEntry {
    timestamp: number;
    metric: string;
    anomaly: boolean;
    verdict: boolean;
    comment: string;
}
export declare const FeedbackStore: {
    /**
     * Save feedback entry to Redis
     */
    save(entry: FeedbackEntry): Promise<void>;
    /**
     * Get all feedback entries from Redis
     */
    getAll(): Promise<FeedbackEntry[]>;
    /**
     * Clear all feedback entries from Redis
     */
    clear(): Promise<number>;
    /**
     * Get feedback count
     */
    count(): Promise<number>;
};
export { redis };
export default redis;
//# sourceMappingURL=redisClient.d.ts.map