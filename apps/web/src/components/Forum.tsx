'use client';

import { useState, useEffect } from 'react';
import { forumApi } from '@/lib/api';
import { Avatar, getTimeAgo } from '@/components/social/shared';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Plus,
  Heart,
  MessageCircle,
  Flag,
  Edit2,
  Trash2,
  X,
  Check,
  Send,
  Search,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  User,
} from 'lucide-react';

interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  category: string;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  reported: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ForumComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  likeCount: number;
  liked: boolean;
  createdAt: string;
}

const categories = [
  { id: 'all', name: 'Wszystkie' },
  { id: 'health', name: 'Zdrowie' },
  { id: 'training', name: 'Trening' },
  { id: 'nutrition', name: 'Żywienie' },
  { id: 'behavior', name: 'Zachowanie' },
  { id: 'breeding', name: 'Rozród' },
  { id: 'other', name: 'Inne' },
];

export default function Forum() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, ForumComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [newPost, setNewPost] = useState({ category: 'health', title: '', content: '' });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; run: () => Promise<void> } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const loadPosts = async () => {
    try {
      const res = await forumApi.getPosts({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        mine: onlyMine || undefined,
      });
      setPosts(res.posts || []);
      setLoadError('');
    } catch (e) {
      console.error('Forum load error:', e);
      setLoadError('Nie udało się pobrać postów. Sprawdź połączenie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showAddPostModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showAddPostModal]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch {}
    }
  }, []);

  // Filtrowanie po stronie serwera — debounce 300 ms przy szukaniu
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(loadPosts, searchQuery ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, onlyMine, searchQuery]);

  useEffect(() => {
    if (!showAddPostModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddPostModal(false);
        resetForm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAddPostModal]);

  const loadComments = async (postId: string) => {
    setCommentsLoading(postId);
    try {
      const res = await forumApi.getComments(postId);
      setCommentsMap((m) => ({ ...m, [postId]: res.comments || [] }));
    } catch {
      // cicho — sekcja pokaże pustą listę
    } finally {
      setCommentsLoading(null);
    }
  };

  const toggleComments = (postId: string) => {
    if (showComments === postId) {
      setShowComments(null);
    } else {
      setShowComments(postId);
      loadComments(postId);
    }
  };

  const myId = currentUser ? String(currentUser.id ?? '') : '';

  const filteredPosts = posts;

  const resetForm = () => {
    setNewPost({ category: 'health', title: '', content: '' });
    setEditingPost(null);
    setFormError('');
  };

  const handleSavePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    setSubmitting(true);
    setFormError('');
    try {
      if (editingPost) {
        await forumApi.updatePost(editingPost.id, newPost);
      } else {
        await forumApi.createPost(newPost);
      }
      setShowAddPostModal(false);
      resetForm();
      await loadPosts();
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się zapisać posta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = (post: ForumPost) => {
    setConfirmAction({
      title: 'Usunąć ten post?',
      description: `Post „${post.title}" zostanie trwale usunięty wraz ze wszystkimi komentarzami.`,
      run: async () => {
        try {
          await forumApi.deletePost(post.id);
          setPosts((l) => l.filter((p) => p.id !== post.id));
          if (showComments === post.id) setShowComments(null);
        } catch (e: any) {
          setActionError(e?.response?.data?.error?.message || 'Nie udało się usunąć posta.');
        }
      },
    });
  };

  const handleLikePost = async (post: ForumPost) => {
    if (!currentUser) return;
    setPosts((l) =>
      l.map((p) =>
        p.id === post.id ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) } : p
      )
    );
    try {
      const res = await forumApi.likePost(post.id);
      setPosts((l) => l.map((p) => (p.id === post.id ? { ...p, liked: res.liked, likeCount: res.likeCount } : p)));
    } catch {
      setPosts((l) => l.map((p) => (p.id === post.id ? { ...p, liked: post.liked, likeCount: post.likeCount } : p)));
    }
  };

  const handleAddComment = async (post: ForumPost) => {
    const content = (commentInputs[post.id] || '').trim();
    if (!content || !currentUser) return;
    setCommentBusy(post.id);
    try {
      await forumApi.addComment(post.id, content);
      setCommentInputs((m) => ({ ...m, [post.id]: '' }));
      setPosts((l) => l.map((p) => (p.id === post.id ? { ...p, commentCount: p.commentCount + 1 } : p)));
      await loadComments(post.id);
    } catch (e: any) {
      setActionError(e?.response?.data?.error?.message || 'Nie udało się dodać komentarza.');
    } finally {
      setCommentBusy(null);
    }
  };

  const handleLikeComment = async (postId: string, comment: ForumComment) => {
    if (!currentUser) return;
    setCommentsMap((m) => ({
      ...m,
      [postId]: (m[postId] || []).map((c) =>
        c.id === comment.id ? { ...c, liked: !c.liked, likeCount: c.likeCount + (c.liked ? -1 : 1) } : c
      ),
    }));
    try {
      const res = await forumApi.likeComment(comment.id);
      setCommentsMap((m) => ({
        ...m,
        [postId]: (m[postId] || []).map((c) =>
          c.id === comment.id ? { ...c, liked: res.liked, likeCount: res.likeCount } : c
        ),
      }));
    } catch {
      setCommentsMap((m) => ({
        ...m,
        [postId]: (m[postId] || []).map((c) =>
          c.id === comment.id ? { ...c, liked: comment.liked, likeCount: comment.likeCount } : c
        ),
      }));
    }
  };

  const handleDeleteComment = (postId: string, comment: ForumComment) => {
    setConfirmAction({
      title: 'Usunąć komentarz?',
      description: 'Komentarz zostanie trwale usunięty.',
      run: async () => {
        try {
          await forumApi.deleteComment(comment.id);
          setCommentsMap((m) => ({ ...m, [postId]: (m[postId] || []).filter((x) => x.id !== comment.id) }));
          setPosts((l) => l.map((p) => (p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p)));
        } catch (e: any) {
          setActionError(e?.response?.data?.error?.message || 'Nie udało się usunąć komentarza.');
        }
      },
    });
  };

  const handleReportPost = (post: ForumPost) => {
    setConfirmAction({
      title: 'Zgłosić ten post?',
      description: 'Post trafi do moderacji. Zgłoszenie jest anonimowe dla autora.',
      run: async () => {
        try {
          await forumApi.reportPost(post.id);
          setPosts((l) => l.map((p) => (p.id === post.id ? { ...p, reported: true } : p)));
        } catch (e: any) {
          setActionError(e?.response?.data?.error?.message || 'Nie udało się zgłosić posta.');
        }
      },
    });
  };

  const myPostsCount = myId ? posts.filter((p) => p.authorId === myId).length : 0;

  return (
    <div className="space-y-5">
      {actionError && (
        <div className="pv-card p-3.5 flex items-center justify-between gap-3 border-l-4 border-red-400">
          <p className="text-sm text-red-600">{actionError}</p>
          <button onClick={() => setActionError('')} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Categories */}
      <div className="pv-card p-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {currentUser && (
            <>
              <button
                onClick={() => setOnlyMine((v) => !v)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl whitespace-nowrap transition-all border font-medium ${
                  onlyMine
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-brand-dark border-brand-dark/40 hover:border-brand-dark'
                }`}
              >
                <User className="w-4 h-4" />
                Moje posty{myPostsCount > 0 ? ` (${myPostsCount})` : ''}
              </button>
              <div className="w-px self-stretch bg-gray-200 mx-1 flex-shrink-0" />
            </>
          )}
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all border font-medium ${
                selectedCategory === cat.id
                  ? 'bg-brand-dark text-white border-brand-dark'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="pv-card p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj postów..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
          />
        </div>
      </div>

      {/* Add Post Button */}
      <button
        onClick={() => {
          resetForm();
          setShowAddPostModal(true);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl pv-btn-primary"
      >
        <Plus className="w-6 h-6" />
        Dodaj post
      </button>

      {/* Posts List */}
      {loading ? (
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Ładowanie postów...</p>
        </div>
      ) : loadError ? (
        <div className="pv-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
          <p className="text-gray-700 mb-4">{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadPosts();
            }}
            className="pv-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">Brak postów</h3>
          <p className="text-gray-500">
            {onlyMine
              ? 'Nie masz jeszcze postów w tym widoku — dodaj pierwszy!'
              : searchQuery || selectedCategory !== 'all'
                ? 'Brak postów spełniających kryteria'
                : 'Dodaj pierwszy post na forum'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post) => {
            const isAuthor = myId && post.authorId === myId;
            const showingComments = showComments === post.id;
            const comments = commentsMap[post.id];

            return (
              <div key={post.id} className="pv-card hover:shadow-lg transition-all overflow-hidden">
                {/* Post Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={post.authorName} url={post.authorAvatar} size="md" />
                      <div>
                        <div className="font-semibold text-gray-900">{post.authorName}</div>
                        <div className="text-xs text-gray-500">
                          {getTimeAgo(post.createdAt)}
                          {post.updatedAt && post.updatedAt !== post.createdAt && ' · (edyt.)'}
                        </div>
                      </div>
                    </div>

                    {isAuthor && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingPost(post);
                            setNewPost({ category: post.category, title: post.title, content: post.content });
                            setShowAddPostModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-dark transition-all"
                          aria-label="Edytuj post"
                          title="Edytuj post"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                          aria-label="Usuń post"
                          title="Usuń post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-brand-dark/10 text-brand-dark text-xs font-semibold">
                      {categories.find((c) => c.id === post.category)?.name || post.category}
                    </span>
                    {post.reported && (
                      <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold">
                        Zgłoszony
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Actions */}
                <div className="px-5 py-3 flex items-center gap-4 border-b border-gray-100">
                  <button
                    onClick={() => handleLikePost(post)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      post.liked ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">{post.likeCount}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-brand-mint/60 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.commentCount}</span>
                  </button>

                  {!isAuthor && !post.reported && (
                    <button
                      onClick={() => handleReportPost(post)}
                      className="ml-auto p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                      aria-label="Zgłoś post"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Comments */}
                {showingComments && (
                  <div className="p-5 bg-gray-50">
                    <div className="mb-4">
                      <div className="flex gap-3">
                        <Avatar
                          name={currentUser?.firstName || 'U'}
                          url={currentUser?.avatar_url || null}
                          size="sm"
                        />
                        <div className="flex-1">
                          <textarea
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs((m) => ({ ...m, [post.id]: e.target.value }))}
                            placeholder="Dodaj komentarz..."
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => handleAddComment(post)}
                              disabled={!(commentInputs[post.id] || '').trim() || commentBusy === post.id}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {commentBusy === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Wyślij
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {commentsLoading === post.id ? (
                      <div className="py-6 text-center">
                        <Loader2 className="w-6 h-6 mx-auto text-brand animate-spin" />
                      </div>
                    ) : comments && comments.length > 0 ? (
                      <div className="space-y-3">
                        {comments.map((comment) => {
                          const isCommentAuthor = myId && comment.authorId === myId;
                          return (
                            <div key={comment.id} className="bg-white rounded-xl p-4">
                              <div className="flex gap-3">
                                <Avatar name={comment.authorName} url={comment.authorAvatar} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 text-sm">{comment.authorName}</span>
                                    <span className="text-xs text-gray-500">{getTimeAgo(comment.createdAt)}</span>
                                    {isCommentAuthor && (
                                      <button
                                        onClick={() => handleDeleteComment(post.id, comment)}
                                        className="ml-auto p-1 rounded text-gray-300 hover:text-red-600 transition-all"
                                        aria-label="Usuń komentarz"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <button
                                      onClick={() => handleLikeComment(post.id, comment)}
                                      className={`flex items-center gap-1 text-xs ${
                                        comment.liked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                                      }`}
                                    >
                                      <Heart className={`w-4 h-4 ${comment.liked ? 'fill-current' : ''}`} />
                                      {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-gray-400 py-4">Brak komentarzy — bądź pierwszy</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Post Modal */}
      {showAddPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">{editingPost ? 'Edytuj post' : 'Dodaj post'}</h3>
              <button
                onClick={() => {
                  setShowAddPostModal(false);
                  resetForm();
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Kategoria</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                >
                  {categories.filter((c) => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Tytuł</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="np. Jak często szczepić psa?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Treść</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Opisz swoje pytanie lub podziel się doświadczeniem..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddPostModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSavePost}
                  disabled={submitting || !newPost.title.trim() || !newPost.content.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl pv-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {editingPost ? 'Zapisz' : 'Opublikuj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        title={confirmAction?.title || ''}
        description={confirmAction?.description}
        loading={confirmBusy}
        onConfirm={async () => {
          if (!confirmAction) return;
          setConfirmBusy(true);
          try {
            await confirmAction.run();
            setConfirmAction(null);
          } finally {
            setConfirmBusy(false);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
