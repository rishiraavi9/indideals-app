import { useState, useEffect } from 'react';
import { dealsApi } from '../api/deals';
import { commentsApi } from '../api/comments';
import type { Deal, Comment } from '../types';
import { useAuth } from '../context/AuthContext';

interface DealDetailsPageProps {
  dealId: string;
  onClose: () => void;
  onVote?: (voteType: number) => void;
  onUserClick?: (userId: string | null) => void;
}

export default function DealDetailsPage({ dealId, onClose, onVote, onUserClick }: DealDetailsPageProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadDealDetails();
    loadComments();
  }, [dealId]);

  const loadDealDetails = async () => {
    try {
      const dealData = await dealsApi.getDeal(dealId);
      setDeal(dealData);
    } catch (error) {
      console.error('Failed to load deal details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const commentsData = await commentsApi.getComments(dealId);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;

    setSubmittingComment(true);
    try {
      await commentsApi.createComment(dealId, commentText);
      setCommentText('');
      loadComments();
      loadDealDetails();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || !isAuthenticated) return;

    setSubmittingComment(true);
    try {
      await commentsApi.createReply(dealId, parentId, replyText);
      setReplyText('');
      setReplyingTo(null);
      loadComments();
      loadDealDetails();
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVoteComment = async (commentId: string, voteType: number, currentUserVote: number) => {
    if (!isAuthenticated) return;

    try {
      const newVoteType = currentUserVote === voteType ? 0 : voteType;
      await commentsApi.voteComment(commentId, newVoteType);
      loadComments();
    } catch (error) {
      console.error('Failed to vote on comment:', error);
    }
  };

  const handleVoteDeal = async (voteType: number) => {
    if (!isAuthenticated || !deal) return;

    try {
      const result = await dealsApi.voteDeal(deal.id, voteType);
      setDeal({
        ...deal,
        upvotes: result.upvotes,
        downvotes: result.downvotes,
        userVote: result.userVote,
      });
      if (onVote) {
        onVote(voteType);
      }
    } catch (error) {
      console.error('Failed to vote on deal:', error);
    }
  };

  const handleGoToDeal = () => {
    if (deal?.url) {
      window.open(deal.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          background: '#fff',
          padding: 40,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <p style={{ color: '#1f2937', fontSize: 18, margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }} onClick={onClose}>
        <div style={{
          background: '#fff',
          padding: 40,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <p style={{ color: '#1f2937', fontSize: 18, margin: 0 }}>Deal not found</p>
        </div>
      </div>
    );
  }

  const score = deal.upvotes - deal.downvotes;
  const savings = deal.originalPrice ? deal.originalPrice - deal.price : null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        overflowY: 'auto',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '40px auto 40px',
          padding: '0 20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#ffffff',
            color: '#1f2937',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            zIndex: 1001,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          ✕ Close
        </button>

        {/* Deal Header */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 32,
          marginBottom: 20,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {/* Image */}
            <div style={{
              width: 300,
              height: 300,
              borderRadius: 8,
              background: deal.imageUrl
                ? `url(${deal.imageUrl}) center/cover`
                : '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid #e5e7eb',
            }}>
              {!deal.imageUrl && (
                <div style={{ fontSize: 80, opacity: 0.3 }}>
                  {deal.category?.icon || '🏷️'}
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{ flex: 1, minWidth: 300 }}>
              {/* Badges */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {deal.discountPercentage && (
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#f44336',
                    fontSize: 14,
                    fontWeight: 900,
                    color: '#fff',
                  }}>
                    -{deal.discountPercentage}% OFF
                  </span>
                )}
                <span style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: score > 50 ? '#4caf50' : '#2676ff',
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#fff',
                }}>
                  🔥 {score} Score
                </span>
                {deal.category && (
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#374151',
                  }}>
                    {deal.category.icon} {deal.category.name}
                  </span>
                )}
              </div>

              <h1 style={{
                margin: '0 0 16px 0',
                fontSize: 28,
                fontWeight: 900,
                color: '#1f2937',
                lineHeight: 1.3,
              }}>
                {deal.title}
              </h1>

              {/* Price */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#10b981' }}>
                    ₹{deal.price.toLocaleString('en-IN')}
                  </span>
                  {deal.originalPrice && (
                    <span style={{
                      fontSize: 20,
                      color: '#9ca3af',
                      textDecoration: 'line-through',
                    }}>
                      ₹{deal.originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                {savings && (
                  <div style={{ fontSize: 16, color: '#10b981', fontWeight: 700 }}>
                    You Save ₹{savings.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Merchant & Posted By */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 16, margin: '0 0 8px 0', color: '#374151' }}>
                  Available at <strong>{deal.merchant}</strong>
                </p>
                {deal.user && (
                  <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                    Posted by{' '}
                    <span
                      onClick={() => onUserClick && onUserClick(deal.userId)}
                      style={{
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: '#2676ff',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#1e5dd9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#2676ff';
                      }}
                    >
                      {deal.user.username}
                    </span>
                    {' on '}
                    {new Date(deal.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {/* Description */}
              {deal.description && (
                <p style={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: '#4b5563',
                  marginBottom: 20,
                }}>
                  {deal.description}
                </p>
              )}

              {/* Festive Tags */}
              {deal.festiveTags && deal.festiveTags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                  {deal.festiveTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 4,
                        background: '#fef3c7',
                        border: '1px solid #fbbf24',
                        color: '#b45309',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      🎉 {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  onClick={handleGoToDeal}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #2676ff 0%, #1e5dd9 100%)',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🛒 Get This Deal
                </button>

                <button
                  onClick={() => handleVoteDeal(deal.userVote === 1 ? 0 : 1)}
                  disabled={!isAuthenticated}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 8,
                    border: deal.userVote === 1
                      ? '2px solid #4caf50'
                      : '1px solid #d1d5db',
                    background: deal.userVote === 1
                      ? '#ecfdf5'
                      : '#ffffff',
                    color: deal.userVote === 1 ? '#10b981' : '#374151',
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                    opacity: isAuthenticated ? 1 : 0.5,
                  }}
                >
                  👍 {deal.upvotes}
                </button>

                <button
                  onClick={() => handleVoteDeal(deal.userVote === -1 ? 0 : -1)}
                  disabled={!isAuthenticated}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 8,
                    border: deal.userVote === -1
                      ? '2px solid #f44336'
                      : '1px solid #d1d5db',
                    background: deal.userVote === -1
                      ? '#fef2f2'
                      : '#ffffff',
                    color: deal.userVote === -1 ? '#ef4444' : '#374151',
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                    opacity: isAuthenticated ? 1 : 0.5,
                  }}
                >
                  👎 {deal.downvotes}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: 24, fontWeight: 900, color: '#1f2937' }}>
            💬 Community Discussion ({deal.commentCount})
          </h2>

          {/* Comment Form */}
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} style={{ marginBottom: 24 }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts about this deal..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  color: '#1f2937',
                  fontSize: 15,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                style={{
                  marginTop: 12,
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: submittingComment || !commentText.trim()
                    ? '#d1d5db'
                    : '#2676ff',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submittingComment || !commentText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          ) : (
            <p style={{
              padding: 16,
              borderRadius: 8,
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              color: '#b45309',
              marginBottom: 24,
            }}>
              Please log in to post comments
            </p>
          )}

          {/* Comments List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comments.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2676ff, #4caf50)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#fff',
                    }}>
                      {comment.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div
                        onClick={() => onUserClick && onUserClick(comment.userId)}
                        style={{
                          fontWeight: 700,
                          color: '#1f2937',
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#2676ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#1f2937';
                        }}
                      >
                        {comment.user.username}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#374151',
                    marginBottom: 12,
                  }}>
                    {comment.content}
                  </p>

                  {/* Vote buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => handleVoteComment(comment.id, 1, comment.userVote || 0)}
                      disabled={!isAuthenticated}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: `1px solid ${comment.userVote === 1 ? '#4caf50' : '#d1d5db'}`,
                        background: comment.userVote === 1 ? '#ecfdf5' : '#ffffff',
                        color: comment.userVote === 1 ? '#10b981' : '#6b7280',
                        cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        opacity: isAuthenticated ? 1 : 0.5,
                      }}
                    >
                      👍 {comment.upvotes}
                    </button>
                    <button
                      onClick={() => handleVoteComment(comment.id, -1, comment.userVote || 0)}
                      disabled={!isAuthenticated}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: `1px solid ${comment.userVote === -1 ? '#f44336' : '#d1d5db'}`,
                        background: comment.userVote === -1 ? '#fef2f2' : '#ffffff',
                        color: comment.userVote === -1 ? '#ef4444' : '#6b7280',
                        cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        opacity: isAuthenticated ? 1 : 0.5,
                      }}
                    >
                      👎 {comment.downvotes}
                    </button>
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      disabled={!isAuthenticated}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: `1px solid ${replyingTo === comment.id ? '#2676ff' : '#d1d5db'}`,
                        background: replyingTo === comment.id ? '#eff6ff' : '#ffffff',
                        color: replyingTo === comment.id ? '#2676ff' : '#6b7280',
                        cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        opacity: isAuthenticated ? 1 : 0.5,
                      }}
                    >
                      💬 Reply
                    </button>
                    <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 'auto' }}>
                      Score: {comment.upvotes - comment.downvotes}
                    </span>
                  </div>

                  {/* Reply form */}
                  {replyingTo === comment.id && isAuthenticated && (
                    <div style={{ marginTop: 12, marginLeft: 48 }}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        style={{
                          width: '100%',
                          minHeight: 80,
                          padding: 12,
                          borderRadius: 8,
                          border: '1px solid #d1d5db',
                          background: '#f9fafb',
                          color: '#1f2937',
                          fontSize: 14,
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={submittingComment || !replyText.trim()}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            border: 'none',
                            background: submittingComment || !replyText.trim() ? '#d1d5db' : '#2676ff',
                            color: '#fff',
                            cursor: submittingComment || !replyText.trim() ? 'not-allowed' : 'pointer',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {submittingComment ? 'Posting...' : 'Post Reply'}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText('');
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            border: '1px solid #d1d5db',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show replies if any */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div style={{ marginTop: 12, marginLeft: 48, borderLeft: '2px solid #e5e7eb', paddingLeft: 16 }}>
                      {comment.replies.map((reply: Comment) => (
                        <div key={reply.id} style={{ marginTop: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #2676ff, #4caf50)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              color: '#fff',
                            }}>
                              {reply.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div
                                onClick={() => onUserClick && onUserClick(reply.userId)}
                                style={{
                                  fontWeight: 700,
                                  color: '#1f2937',
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#2676ff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#1f2937';
                                }}
                              >
                                {reply.user.username}
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>
                                {new Date(reply.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#374151', marginLeft: 36 }}>
                            {reply.content}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 36 }}>
                            <button
                              onClick={() => handleVoteComment(reply.id, 1, reply.userVote || 0)}
                              disabled={!isAuthenticated}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                border: `1px solid ${reply.userVote === 1 ? '#4caf50' : '#d1d5db'}`,
                                background: reply.userVote === 1 ? '#ecfdf5' : '#ffffff',
                                color: reply.userVote === 1 ? '#10b981' : '#6b7280',
                                cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                                fontSize: 11,
                                fontWeight: 700,
                                opacity: isAuthenticated ? 1 : 0.5,
                              }}
                            >
                              👍 {reply.upvotes}
                            </button>
                            <button
                              onClick={() => handleVoteComment(reply.id, -1, reply.userVote || 0)}
                              disabled={!isAuthenticated}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                border: `1px solid ${reply.userVote === -1 ? '#f44336' : '#d1d5db'}`,
                                background: reply.userVote === -1 ? '#fef2f2' : '#ffffff',
                                color: reply.userVote === -1 ? '#ef4444' : '#6b7280',
                                cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                                fontSize: 11,
                                fontWeight: 700,
                                opacity: isAuthenticated ? 1 : 0.5,
                              }}
                            >
                              👎 {reply.downvotes}
                            </button>
                            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
                              Score: {reply.upvotes - reply.downvotes}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
