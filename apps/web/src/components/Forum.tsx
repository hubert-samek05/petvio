'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Edit2,
  Trash2,
  X,
  Check,
  Image as ImageIcon,
  Send,
  MoreHorizontal,
  Search
} from 'lucide-react';

interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  category: string;
  title: string;
  content: string;
  images?: string[];
  likes: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt?: string;
  reported: boolean;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  images?: string[];
  likes: string[];
  createdAt: string;
  reported: boolean;
}

const categories = [
  { id: 'all', name: 'Wszystkie', color: '#1B6B4A' },
  { id: 'health', name: 'Zdrowie', color: '#1B6B4A' },
  { id: 'training', name: 'Trening', color: '#1B6B4A' },
  { id: 'nutrition', name: 'Żywienie', color: '#1B6B4A' },
  { id: 'behavior', name: 'Zachowanie', color: '#1B6B4A' },
  { id: 'breeding', name: 'Rozród', color: '#1B6B4A' },
  { id: 'other', name: 'Inne', color: '#1B6B4A' },
];

export default function Forum() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);

  const [newPost, setNewPost] = useState({
    category: 'health',
    title: '',
    content: '',
    images: [] as string[],
  });

  const [newComment, setNewComment] = useState({
    postId: '',
    content: '',
    images: [] as string[],
  });

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
      const user = JSON.parse(userData);
      setCurrentUser(user);

      const savedPosts = localStorage.getItem('forumPosts');
      if (savedPosts) {
        setPosts(JSON.parse(savedPosts));
      } else {
        // Mock data
        const mockPosts: ForumPost[] = [
          {
            id: '1',
            authorId: '1',
            authorName: 'Anna Kowalska',
            category: 'health',
            title: 'Jak często szczepić psa?',
            content: 'Witam! Mam pytanie odnośnie szczepień. Mój pies ma 2 lata i zastanawiam się jak często powinnam go szczepić? Weterynarz mówi co roku, ale czytałam że można rzadziej.',
            likes: ['2', '3'],
            comments: [
              {
                id: '1',
                authorId: '2',
                authorName: 'Jan Nowak',
                content: 'Ja szczepię co roku i nie miałem żadnych problemów. Lepiej dmuchać na zimne!',
                likes: ['1'],
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                reported: false,
              }
            ],
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            reported: false,
          },
          {
            id: '2',
            authorId: '2',
            authorName: 'Jan Nowak',
            category: 'training',
            title: 'Pies ciągnie na smyczy - porady?',
            content: 'Mój labrador ma 6 miesięcy i strasznie ciągnie na smyczy. Próbowałem różnych metod ale nic nie pomaga. Macie jakieś sprawdzone sposoby?',
            likes: ['1', '3', '4'],
            comments: [],
            createdAt: new Date(Date.now() - 10800000).toISOString(),
            reported: false,
          }
        ];
        setPosts(mockPosts);
        localStorage.setItem('forumPosts', JSON.stringify(mockPosts));
      }
    }
  }, []);

  const filteredPosts = posts.filter(post => {
    if (selectedCategory !== 'all' && post.category !== selectedCategory) return false;
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase()) && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAddPost = () => {
    if (!currentUser || !newPost.title || !newPost.content) return;

    const post: ForumPost = {
      id: Date.now().toString(),
      authorId: currentUser.id || '1',
      authorName: `${currentUser.firstName || 'User'} ${currentUser.lastName || ''}`.trim(),
      category: newPost.category,
      title: newPost.title,
      content: newPost.content,
      images: newPost.images,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      reported: false,
    };

    const updated = [post, ...posts];
    setPosts(updated);
    localStorage.setItem('forumPosts', JSON.stringify(updated));

    setNewPost({
      category: 'health',
      title: '',
      content: '',
      images: [],
    });
    setShowAddPostModal(false);
  };

  const handleUpdatePost = () => {
    if (!editingPost || !newPost.title || !newPost.content) return;

    const updated = posts.map(p => p.id === editingPost.id ? {
      ...p,
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      images: newPost.images,
      updatedAt: new Date().toISOString(),
    } : p);

    setPosts(updated);
    localStorage.setItem('forumPosts', JSON.stringify(updated));

    setEditingPost(null);
    setNewPost({
      category: 'health',
      title: '',
      content: '',
      images: [],
    });
    setShowAddPostModal(false);
  };

  const handleDeletePost = (postId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten post?')) return;

    const updated = posts.filter(p => p.id !== postId);
    setPosts(updated);
    localStorage.setItem('forumPosts', JSON.stringify(updated));
  };

  const handleLikePost = (postId: string) => {
    if (!currentUser) return;

    const updated = posts.map(p => {
      if (p.id === postId) {
        const likes = p.likes.includes(currentUser.id)
          ? p.likes.filter(id => id !== currentUser.id)
          : [...p.likes, currentUser.id];
        return { ...p, likes };
      }
      return p;
    });

    setPosts(updated);
    localStorage.setItem('forumPosts', JSON.stringify(updated));
  };

  const handleAddComment = (postId: string) => {
    if (!currentUser || !newComment.content) return;

    const comment: Comment = {
      id: Date.now().toString(),
      authorId: currentUser.id || '1',
      authorName: `${currentUser.firstName || 'User'} ${currentUser.lastName || ''}`.trim(),
      content: newComment.content,
      images: newComment.images,
      likes: [],
      createdAt: new Date().toISOString(),
      reported: false,
    };

    const updated = posts.map(p => {
      if (p.id === postId) {
        return { ...p, comments: [...p.comments, comment] };
      }
      return p;
    });

    setPosts(updated);
    localStorage.setItem('forumPosts', JSON.stringify(updated));

    setNewComment({
      postId: '',
      content: '',
      images: [],
    });
  };

  const handleLikeComment = (postId: string, commentId: string) => {
    if (!currentUser) return;

    const updated = posts.map(p => {
      if (p.id === postId) {
        const comments = p.comments.map(c => {
          if (c.id === commentId) {
            const likes = c.likes.includes(currentUser.id)
              ? c.likes.filter(id => id !== currentUser.id)
              : [...c.likes, currentUser.id];
            return { ...c, likes };
          }
          return c;
        });
        return { ...p, comments };
      }
      return p;
    });

    setPosts(updated);
    localStorage.setItem('forumPosts', JSON.stringify(updated));
  };

  const handleReportPost = (postId: string) => {
    if (!confirm('Czy na pewno chcesz zgłosić ten post?')) return;

    const updated = posts.map(p => p.id === postId ? { ...p, reported: true } : p);
    setPosts(updated);
    localStorage.setItem('forumPosts', JSON.stringify(updated));
    alert('Post został zgłoszony do moderacji');
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;
    return then.toLocaleDateString('pl-PL');
  };

  return (
    <div className="space-y-5">
      {/* Categories */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
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
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj postów..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand-dark focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Add Post Button */}
      <button
        onClick={() => setShowAddPostModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all"
      >
        <Plus className="w-6 h-6" />
        Dodaj post
      </button>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-brand" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak postów</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Brak postów spełniających kryteria' : 'Dodaj pierwszy post na forum'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post) => {
            const isAuthor = currentUser && post.authorId === currentUser.id;
            const isLiked = currentUser && post.likes.includes(currentUser.id);
            const showingComments = showComments === post.id;

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg transition-all overflow-hidden"
              >
                {/* Post Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-semibold">
                        {post.authorName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{post.authorName}</div>
                        <div className="text-xs text-gray-500">{getTimeAgo(post.createdAt)}</div>
                      </div>
                    </div>

                    {isAuthor && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingPost(post);
                            setNewPost({
                              category: post.category,
                              title: post.title,
                              content: post.content,
                              images: post.images || [],
                            });
                            setShowAddPostModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-dark transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mb-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-brand-dark/10 text-brand-dark text-xs font-semibold">
                      {categories.find(c => c.id === post.category)?.name}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>

                  {post.images && post.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {post.images.map((img, idx) => (
                        <div key={idx} className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Post Actions */}
                <div className="px-5 py-3 flex items-center gap-4 border-b border-gray-100">
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      isLiked
                        ? 'bg-red-50 text-red-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">{post.likes.length}</span>
                  </button>

                  <button
                    onClick={() => setShowComments(showingComments ? null : post.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.comments.length}</span>
                  </button>

                  {!isAuthor && (
                    <button
                      onClick={() => handleReportPost(post.id)}
                      className="ml-auto p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Comments Section */}
                {showingComments && (
                  <div className="p-5 bg-gray-50">
                    {/* Add Comment */}
                    <div className="mb-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {currentUser?.firstName?.[0] || 'U'}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newComment.postId === post.id ? newComment.content : ''}
                            onChange={(e) => setNewComment({ ...newComment, postId: post.id, content: e.target.value })}
                            placeholder="Dodaj komentarz..."
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none"
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => handleAddComment(post.id)}
                              disabled={!newComment.content || newComment.postId !== post.id}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send className="w-4 h-4" />
                              Wyślij
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3">
                      {post.comments.map((comment) => {
                        const isCommentLiked = currentUser && comment.likes.includes(currentUser.id);

                        return (
                          <div key={comment.id} className="bg-white rounded-xl p-4">
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {comment.authorName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900 text-sm">{comment.authorName}</span>
                                  <span className="text-xs text-gray-500">{getTimeAgo(comment.createdAt)}</span>
                                </div>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>

                                <div className="flex items-center gap-3 mt-2">
                                  <button
                                    onClick={() => handleLikeComment(post.id, comment.id)}
                                    className={`flex items-center gap-1 text-xs ${
                                      isCommentLiked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                                    }`}
                                  >
                                    <Heart className={`w-4 h-4 ${isCommentLiked ? 'fill-current' : ''}`} />
                                    {comment.likes.length > 0 && <span>{comment.likes.length}</span>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Post Modal */}
      {showAddPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">
                {editingPost ? 'Edytuj post' : 'Dodaj post'}
              </h3>
              <button
                onClick={() => {
                  setShowAddPostModal(false);
                  setEditingPost(null);
                  setNewPost({
                    category: 'health',
                    title: '',
                    content: '',
                    images: [],
                  });
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Kategoria</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark"
                >
                  {categories.filter(c => c.id !== 'all').map(cat => (
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
                    setEditingPost(null);
                    setNewPost({
                      category: 'health',
                      title: '',
                      content: '',
                      images: [],
                    });
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={editingPost ? handleUpdatePost : handleAddPost}
                  disabled={!newPost.title || !newPost.content}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-dark text-white font-medium hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  {editingPost ? 'Zapisz' : 'Opublikuj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
