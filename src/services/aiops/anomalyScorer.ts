import { mean, std } from 'mathjs';

export class AnomalyScorer {
  /**
   * Calculate Z-scores for a dataset
   * Z-score = (x - μ) / σ
   */
  static calculateZScore(data: number[]): number[] {
    if (data.length === 0) return [];
    
    const μ = mean(data) as number;
    const σ = std(data, 'uncorrected') as number;
    const safeSigma = σ === 0 ? 1 : σ;
    
    return data.map((x: number) => (x - μ) / safeSigma);
  }

  /**
   * Detect anomalies using Z-score method
   * @param data - Array of numeric values
   * @param threshold - Z-score threshold (default: 3)
   * @returns true if anomalies detected
   */
  static detectAnomalies(data: number[], threshold: number = 3): boolean {
    if (data.length === 0) return false;
    
    const zScores = this.calculateZScore(data);
    return zScores.some(z => Math.abs(z) > threshold);
  }

  /**
   * Get anomaly score for a single value
   */
  static getAnomalyScore(data: number[], value: number): number {
    if (data.length === 0) return 0;
    
    const zScores = this.calculateZScore([...data, value]);
    return zScores[zScores.length - 1];
  }

  /**
   * Get anomaly severity level
   */
  static getSeverity(zScore: number): 'low' | 'medium' | 'high' {
    const absZ = Math.abs(zScore);
    if (absZ > 3) return 'high';
    if (absZ > 2) return 'medium';
    return 'low';
  }
}

