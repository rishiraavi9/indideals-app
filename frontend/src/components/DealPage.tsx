import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './Layout';
import AdBlock from './AdBlock';
import PriceHistoryChart from './PriceHistoryChart';
import PriceAlertModal from './PriceAlertModal';
import WishlistButton from './WishlistButton';
import DealImage from './DealImage';
import { dealsApi } from '../api/deals';
import { commentsApi } from '../api/comments';
import { getDealQualityScore } from '../api/ai';
import type { Deal, Comment } from '../types';
import { useAuth } from '../context/AuthContext';

export default function DealPage() {
  const { t } = useTranslation();
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [priceAlertSuccess, setPriceAlertSuccess] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Scroll to top when deal page loads
    window.scrollTo(0, 0);

    if (dealId) {
      loadDealDetails();
      loadComments();
      loadAIScore();
    }
  }, [dealId]);

  const loadAIScore = async () => {
    if (!dealId) return;
    try {
      const scoreData = await getDealQualityScore(dealId);
      setAiScore(scoreData.totalScore);
    } catch (error) {
      console.error('Failed to load AI score:', error);
      setAiScore(null);
    }
  };

  const loadDealDetails = async () => {
    if (!dealId) return;
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
    if (!dealId) return;
    try {
      const commentsData = await commentsApi.getComments(dealId);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated || !dealId) return;

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
    if (!replyText.trim() || !isAuthenticated || !dealId) return;

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
      <Layout onPostDealClick={() => navigate('/')}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}>
          <div style={{
            background: '#fff',
            padding: 40,
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }}>
            <p style={{ color: '#1f2937', fontSize: 18, margin: 0 }}>{t('dealPage.loadingDeal')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!deal) {
    return (
      <Layout onPostDealClick={() => navigate('/')}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}>
          <div style={{
            background: '#fff',
            padding: 40,
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#1f2937', fontSize: 18, margin: 0 }}>{t('dealPage.dealNotFound')}</p>
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: 20,
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('dealPage.goBackHome')}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const savings = deal.originalPrice ? deal.originalPrice - deal.price : null;

  return (
    <Layout onPostDealClick={() => navigate('/')}>
      {/* Main Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 24,
      }}>
        {/* Left Column - Deal Details */}
        <div>
          {/* Deal Header */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 32,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {/* Image */}
              <DealImage
                src={deal.imageUrl}
                alt={deal.title}
                dealId={deal.id}
                merchantUrl={deal.url}
                style={{
                  width: 300,
                  height: 300,
                  borderRadius: 8,
                  flexShrink: 0,
                  border: '1px solid #e5e7eb',
                  background: '#f3f4f6',
                }}
              />

              {/* Details */}
              <div style={{ flex: 1, minWidth: 300 }}>
                {/* Badges */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  {deal.discountPercentage && (
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#f44336',
                      fontSize: 14,
                      fontWeight: 900,
                      color: '#fff',
                    }}>
                      -{deal.discountPercentage}% {t('dealPage.off')}
                    </span>
                  )}

                  {/* AI Quality Score Badge */}
                  {aiScore !== null && (
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: aiScore >= 80 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                 aiScore >= 70 ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
                                 aiScore >= 60 ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' :
                                 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {aiScore >= 90 ? '💎' : aiScore >= 80 ? '🔥' : aiScore >= 70 ? '⭐' : aiScore >= 60 ? '👍' : '📊'} AI: {aiScore}
                    </span>
                  )}
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
                      {t('dealPage.youSave')} ₹{savings.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {/* Merchant & Posted By */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 16, margin: '0 0 8px 0', color: '#374151' }}>
                    {t('dealPage.availableAt')} <strong>{deal.merchant}</strong>
                  </p>
                  {deal.user && (
                    <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                      {t('dealPage.postedBy')}{' '}
                      <span style={{
                        fontWeight: 700,
                        color: '#2676ff',
                      }}>
                        {deal.user.username}
                      </span>
                      {' '}{t('dealPage.on')}{' '}
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
                <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleGoToDeal}
                    style={{
                      flex: 1,
                      minWidth: 200,
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
                    🛒 {t('dealPage.getThisDeal')}
                  </button>

                  {/* Wishlist Button */}
                  <WishlistButton
                    dealId={deal.id}
                    size="large"
                    showLabel={true}
                  />

                  {/* Price Alert Button */}
                  <button
                    onClick={() => {
                      if (isAuthenticated) {
                        setShowPriceAlertModal(true);
                      }
                    }}
                    disabled={!isAuthenticated}
                    style={{
                      padding: '14px 24px',
                      borderRadius: 8,
                      border: priceAlertSuccess ? '2px solid #10b981' : '1px solid #d1d5db',
                      background: priceAlertSuccess ? '#ecfdf5' : '#ffffff',
                      color: priceAlertSuccess ? '#10b981' : '#374151',
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                      opacity: isAuthenticated ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    title={isAuthenticated ? 'Set price alert' : 'Login to set price alerts'}
                  >
                    {priceAlertSuccess ? '✅' : '🔔'} {priceAlertSuccess ? t('dealPage.alertSet') : t('dealPage.priceAlert')}
                  </button>
                </div>

                {/* Voting Row */}
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button
                    onClick={() => handleVoteDeal(deal.userVote === 1 ? 0 : 1)}
                    disabled={!isAuthenticated}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: deal.userVote === 1
                        ? '2px solid #4caf50'
                        : '1px solid #d1d5db',
                      background: deal.userVote === 1
                        ? '#ecfdf5'
                        : '#ffffff',
                      color: deal.userVote === 1 ? '#10b981' : '#374151',
                      fontSize: 14,
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
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: deal.userVote === -1
                        ? '2px solid #f44336'
                        : '1px solid #d1d5db',
                      background: deal.userVote === -1
                        ? '#fef2f2'
                        : '#ffffff',
                      color: deal.userVote === -1 ? '#ef4444' : '#374151',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                      opacity: isAuthenticated ? 1 : 0.5,
                    }}
                  >
                    👎 {deal.downvotes}
                  </button>

                  <span style={{
                    fontSize: 14,
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: 'auto',
                  }}>
                    💬 {deal.commentCount} {t('dealPage.comments')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Price History Section */}
          <div style={{ marginBottom: 24 }}>
            <PriceHistoryChart dealId={deal.id} currentPrice={deal.price} />
          </div>

          {/* Comments Section */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 24, fontWeight: 900, color: '#1f2937' }}>
              💬 {t('dealPage.communityDiscussion')} ({deal.commentCount})
            </h2>

            {/* Comment Form */}
            {isAuthenticated ? (
              <form onSubmit={handleSubmitComment} style={{ marginBottom: 24 }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t('dealPage.sharethoughts')}
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
                  {submittingComment ? t('dealPage.posting') : t('dealPage.postComment')}
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
                {t('dealPage.loginToComment')}
              </p>
            )}

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>
                  {t('dealPage.noComments')}
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
                        <div style={{
                          fontWeight: 700,
                          color: '#1f2937',
                          fontSize: 14,
                        }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
                        💬 {t('dealPage.reply')}
                      </button>
                      <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 'auto' }}>
                        {t('dealPage.score')}: {comment.upvotes - comment.downvotes}
                      </span>
                    </div>

                    {/* Reply form */}
                    {replyingTo === comment.id && isAuthenticated && (
                      <div style={{ marginTop: 12, marginLeft: 48 }}>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={t('dealPage.writeReply')}
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
                            {submittingComment ? t('dealPage.posting') : t('dealPage.postReply')}
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
                            {t('dealPage.cancel')}
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
                                <div style={{
                                  fontWeight: 700,
                                  color: '#1f2937',
                                  fontSize: 13,
                                }}>
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
                                {t('dealPage.score')}: {reply.upvotes - reply.downvotes}
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

        {/* Right Sidebar - Ad Zones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Ad Zone 1 - Top Banner */}
          <AdBlock type="rectangle" />

          {/* Ad Zone 2 - Sticky Ad */}
          <div style={{ position: 'sticky', top: 100 }}>
            <AdBlock type="sidebar" />
          </div>
        </div>
      </div>

      {/* Price Alert Modal */}
      {showPriceAlertModal && deal && (
        <PriceAlertModal
          dealId={deal.id}
          dealTitle={deal.title}
          currentPrice={deal.price}
          onClose={() => setShowPriceAlertModal(false)}
          onSuccess={() => {
            setShowPriceAlertModal(false);
            setPriceAlertSuccess(true);
          }}
        />
      )}
    </Layout>
  );
}
