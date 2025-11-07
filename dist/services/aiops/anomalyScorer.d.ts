export declare class AnomalyScorer {
    /**
     * Calculate Z-scores for a dataset
     * Z-score = (x - μ) / σ
     */
    static calculateZScore(data: number[]): number[];
    /**
     * Detect anomalies using Z-score method
     * @param data - Array of numeric values
     * @param threshold - Z-score threshold (default: 3)
     * @returns true if anomalies detected
     */
    static detectAnomalies(data: number[], threshold?: number): boolean;
    /**
     * Get anomaly score for a single value
     */
    static getAnomalyScore(data: number[], value: number): number;
    /**
     * Get anomaly severity level
     */
    static getSeverity(zScore: number): 'low' | 'medium' | 'high';
}
//# sourceMappingURL=anomalyScorer.d.ts.map