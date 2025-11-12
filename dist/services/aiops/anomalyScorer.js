import { mean, std } from 'mathjs';
export class AnomalyScorer {
    /**
     * Calculate Z-scores for a dataset
     * Z-score = (x - μ) / σ
     */
    static calculateZScore(data) {
        if (data.length === 0)
            return [];
        const μ = mean(data);
        const σ = std(data, 'uncorrected');
        const safeSigma = σ === 0 ? 1 : σ;
        return data.map((x) => (x - μ) / safeSigma);
    }
    /**
     * Detect anomalies using Z-score method
     * @param data - Array of numeric values
     * @param threshold - Z-score threshold (default: 3)
     * @returns true if anomalies detected
     */
    static detectAnomalies(data, threshold = 3) {
        if (data.length === 0)
            return false;
        const zScores = this.calculateZScore(data);
        return zScores.some(z => Math.abs(z) > threshold);
    }
    /**
     * Get anomaly score for a single value
     */
    static getAnomalyScore(data, value) {
        if (data.length === 0)
            return 0;
        const zScores = this.calculateZScore([...data, value]);
        return zScores[zScores.length - 1] ?? 0;
    }
    /**
     * Get anomaly severity level
     */
    static getSeverity(zScore) {
        const absZ = Math.abs(zScore);
        if (absZ > 3)
            return 'high';
        if (absZ > 2)
            return 'medium';
        return 'low';
    }
}
//# sourceMappingURL=anomalyScorer.js.map