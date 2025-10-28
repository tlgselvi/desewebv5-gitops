'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { MessageSquare, Send, Star, Trash2, User } from 'lucide-react'
import { apiClient, type Feedback } from '../../lib/api/client'

export default function FeedbackPage() {
  const [newFeedback, setNewFeedback] = useState('')
  const [rating, setRating] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch feedback with SWR
  const { data: feedbacks, error, mutate } = useSWR<Feedback[]>(
    'feedback-list',
    () => apiClient.getFeedback(),
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true,
      onError: (err) => {
        console.error('Feedback fetch error:', err)
        // Return mock data on error
        return [
          {
            id: '1',
            message: 'Great AIOps platform! The anomaly detection is very accurate.',
            rating: 5,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            userId: 'user1'
          },
          {
            id: '2',
            message: 'Could use more detailed correlation explanations.',
            rating: 4,
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            userId: 'user2'
          }
        ]
      }
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFeedback.trim()) return

    setIsSubmitting(true)
    try {
      await apiClient.createFeedback({
        message: newFeedback,
        rating,
        userId: 'current-user'
      })
      setNewFeedback('')
      setRating(5)
      mutate() // Refresh the list
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // Note: This would need a delete endpoint in the API
      console.log('Delete feedback:', id)
      mutate()
    } catch (error) {
      console.error('Failed to delete feedback:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback Panel</h1>
          <p className="text-muted-foreground">Share your thoughts about the AIOps platform</p>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {feedbacks?.length || 0} feedback entries
          </span>
        </div>
      </div>

      {/* Submit Feedback Form */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Submit Feedback</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium mb-2">
              Your Feedback
            </label>
            <textarea
              id="feedback"
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              placeholder="Share your thoughts about the AIOps platform..."
              className="w-full p-3 border rounded-md resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={4}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 transition-colors`}
                >
                  <Star size={20} fill={star <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating} star{rating !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newFeedback.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Feedback</h2>
        
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              Using mock data - API endpoint not available
            </p>
          </div>
        )}

        {feedbacks && feedbacks.length > 0 ? (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {feedback.userId || 'Anonymous'}
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={
                              star <= feedback.rating ? 'text-yellow-400' : 'text-gray-300'
                            }
                            fill={star <= feedback.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(feedback.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{feedback.message}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(feedback.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p>No feedback submitted yet.</p>
            <p className="text-sm">Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  )
}
