'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiMethods, getErrorMessage } from '@/api/client';
import { logger } from '@/utils/logger';

interface GeneratedContent {
  id: string;
  title: string;
  content: string;
  contentType: string;
  projectId: string;
  eEatScore?: number;
  qualityScore?: number;
  createdAt: string;
}

export default function ContentGeneratorPage() {
  const [projectId, setProjectId] = useState('');
  const [contentType, setContentType] = useState('blog_post');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [recentContent, setRecentContent] = useState<GeneratedContent[]>([]);

  const handleGenerate = async () => {
    if (!projectId || !topic) {
      setError('Project ID and topic are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiMethods.post<GeneratedContent>('/content/generate', {
        projectId,
        contentType,
        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        targetAudience: topic,
        tone: 'professional',
        wordCount: 1000,
        includeImages: true,
        eEatCompliance: true,
      });

      setGeneratedContent(response);
      
      // Refresh recent content list
      await fetchRecentContent(projectId);
      
      logger.info('Content generated successfully', { contentId: response.id });
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      logger.error('Content generation failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentContent = async (projectIdParam?: string) => {
    const targetProjectId = projectIdParam || projectId;
    if (!targetProjectId) {
      // Don't fetch if no project ID is available
      return;
    }

    try {
      const response = await apiMethods.get<{ content: GeneratedContent[] }>(
        `/content/generated?projectId=${targetProjectId}`
      );
      setRecentContent(response.content || []);
    } catch (err: unknown) {
      logger.warn('Failed to fetch recent content', { error: getErrorMessage(err) });
      // Don't show error to user if it's just that there's no content yet
      if (getErrorMessage(err).includes('404') || getErrorMessage(err).includes('Not Found')) {
        setRecentContent([]);
      }
    }
  };

  React.useEffect(() => {
    if (projectId) {
      fetchRecentContent();
    }
  }, [projectId]);

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Generator</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered content generation for SEO optimization
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
        {/* Content Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Content</CardTitle>
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
                placeholder="Enter project ID"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="blog_post">Blog Post</option>
                <option value="landing_page">Landing Page</option>
                <option value="service_page">Service Page</option>
                <option value="product_page">Product Page</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic
              </label>
              <Input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter content topic"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords (comma-separated)
              </label>
              <Input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="keyword1, keyword2, keyword3"
                className="w-full"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !projectId || !topic}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Content'}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Content Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{generatedContent.title}</h3>
                  <div className="flex gap-2 mb-2">
                    <Badge>{generatedContent.contentType}</Badge>
                    {generatedContent.eEatScore && (
                      <Badge variant="outline">E-EAT: {generatedContent.eEatScore}</Badge>
                    )}
                    {generatedContent.qualityScore && (
                      <Badge variant="outline">Quality: {generatedContent.qualityScore}</Badge>
                    )}
                  </div>
                  <div className="prose max-w-none text-sm text-gray-700 whitespace-pre-wrap">
                    {generatedContent.content}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No content generated yet. Fill in the form and click "Generate Content" to create new content.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Content */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Content</CardTitle>
        </CardHeader>
        <CardContent>
          {recentContent.length > 0 ? (
            <div className="space-y-3">
              {recentContent.map((content) => (
                <div
                  key={content.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{content.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {content.content.substring(0, 150)}...
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{content.contentType}</Badge>
                        {content.eEatScore && (
                          <Badge variant="outline">E-EAT: {content.eEatScore}</Badge>
                        )}
                        {content.qualityScore && (
                          <Badge variant="outline">Quality: {content.qualityScore}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 ml-4">
                      {new Date(content.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No recent content found.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

