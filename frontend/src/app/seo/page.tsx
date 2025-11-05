'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiMethods, getErrorMessage } from '@/api/client';
import { logger } from '@/utils/logger';

interface SeoMetrics {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  totalBlockingTime?: number;
  speedIndex?: number;
  timeToInteractive?: number;
  analyzedAt: string;
}

interface AnalysisResult {
  projectId: string;
  totalUrls: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  results: SeoMetrics[];
  errors: Array<{ url: string; error: string }>;
  analyzedAt: string;
}

export default function SeoAnalyzerPage() {
  const [projectId, setProjectId] = useState('');
  const [urls, setUrls] = useState('');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [throttling, setThrottling] = useState<'slow3G' | 'fast3G' | '4G' | 'none'>('4G');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!projectId || !urls.trim()) {
      setError('Project ID and at least one URL are required');
      return;
    }

    // Parse URLs from textarea (one per line or comma-separated)
    const urlList = urls
      .split(/[,\n]/)
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));

    if (urlList.length === 0) {
      setError('Please enter at least one valid URL (starting with http:// or https://)');
      return;
    }

    if (urlList.length > 10) {
      setError('Maximum 10 URLs allowed per analysis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiMethods.post<AnalysisResult>('/seo/analyze', {
        projectId,
        urls: urlList,
        options: {
          device,
          throttling,
          categories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
      });

      setAnalysisResult(response);
      logger.info('SEO analysis completed', { 
        projectId: response.projectId,
        totalUrls: response.totalUrls,
        successful: response.successfulAnalyses,
      });
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      logger.error('SEO analysis failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatMetric = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    if (value < 1000) return `${value.toFixed(0)}ms`;
    return `${(value / 1000).toFixed(2)}s`;
  };

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SEO Analyzer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Analyze website performance, accessibility, best practices, and SEO metrics
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-lg">⚠️</span>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Analysis Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project ID
              </label>
              <Input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Enter project ID (UUID)"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URLs (one per line or comma-separated, max 10)
              </label>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://example.com&#10;https://example.com/page1"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device
                </label>
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value as 'mobile' | 'desktop')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Network Throttling
                </label>
                <select
                  value={throttling}
                  onChange={(e) => setThrottling(e.target.value as 'slow3G' | 'fast3G' | '4G' | 'none')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">None</option>
                  <option value="4G">4G</option>
                  <option value="fast3G">Fast 3G</option>
                  <option value="slow3G">Slow 3G</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading || !projectId || !urls.trim()}
              className="w-full"
            >
              {loading ? 'Analyzing...' : 'Analyze URLs'}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {analysisResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {analysisResult.totalUrls}
                    </div>
                    <div className="text-xs text-gray-500">Total URLs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analysisResult.successfulAnalyses}
                    </div>
                    <div className="text-xs text-gray-500">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {analysisResult.failedAnalyses}
                    </div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>

                {analysisResult.errors && analysisResult.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-700 mb-2">Errors:</p>
                    <ul className="space-y-1">
                      {analysisResult.errors.map((err, idx) => (
                        <li key={idx} className="text-xs text-red-600">
                          {err.url}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Analyzed at: {new Date(analysisResult.analyzedAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No analysis results yet. Fill in the form and click "Analyze URLs" to start.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Results */}
      {analysisResult && analysisResult.results && analysisResult.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analysisResult.results.map((result, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{result.url}</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold rounded-lg px-3 py-2 ${getScoreColor(result.performance)}`}>
                            {result.performance}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Performance</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold rounded-lg px-3 py-2 ${getScoreColor(result.accessibility)}`}>
                            {result.accessibility}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Accessibility</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold rounded-lg px-3 py-2 ${getScoreColor(result.bestPractices)}`}>
                            {result.bestPractices}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Best Practices</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold rounded-lg px-3 py-2 ${getScoreColor(result.seo)}`}>
                            {result.seo}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">SEO</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  {(result.firstContentfulPaint || result.largestContentfulPaint || 
                    result.cumulativeLayoutShift || result.totalBlockingTime) && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance Metrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {result.firstContentfulPaint !== undefined && (
                          <div>
                            <div className="text-xs text-gray-500">First Contentful Paint</div>
                            <div className="text-sm font-medium">{formatMetric(result.firstContentfulPaint)}</div>
                          </div>
                        )}
                        {result.largestContentfulPaint !== undefined && (
                          <div>
                            <div className="text-xs text-gray-500">Largest Contentful Paint</div>
                            <div className="text-sm font-medium">{formatMetric(result.largestContentfulPaint)}</div>
                          </div>
                        )}
                        {result.cumulativeLayoutShift !== undefined && (
                          <div>
                            <div className="text-xs text-gray-500">Cumulative Layout Shift</div>
                            <div className="text-sm font-medium">{result.cumulativeLayoutShift.toFixed(3)}</div>
                          </div>
                        )}
                        {result.totalBlockingTime !== undefined && (
                          <div>
                            <div className="text-xs text-gray-500">Total Blocking Time</div>
                            <div className="text-sm font-medium">{formatMetric(result.totalBlockingTime)}</div>
                          </div>
                        )}
                        {result.speedIndex !== undefined && (
                          <div>
                            <div className="text-xs text-gray-500">Speed Index</div>
                            <div className="text-sm font-medium">{formatMetric(result.speedIndex)}</div>
                          </div>
                        )}
                        {result.timeToInteractive !== undefined && (
                          <div>
                            <div className="text-xs text-gray-500">Time to Interactive</div>
                            <div className="text-sm font-medium">{formatMetric(result.timeToInteractive)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-400">
                    Analyzed at: {new Date(result.analyzedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

