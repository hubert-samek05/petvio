'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { FileText, Eye, CheckCircle, XCircle, Search, Plus, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [viewPost, setViewPost] = useState<any>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await api.get('/api/admin/blog-posts');
      const postsData = response.data?.posts || [];
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (error) {
      console.error('Error loading blog posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await api.put(`/api/admin/blog-posts/${id}/publish`);
      loadPosts();
    } catch (error) {
      console.error('Error publishing post:', error);
    }
  };

  const handleUnpublish = async (id: number) => {
    try {
      await api.put(`/api/admin/blog-posts/${id}/unpublish`);
      loadPosts();
    } catch (error) {
      console.error('Error unpublishing post:', error);
    }
  };

  const handleCreatePost = async () => {
    try {
      await api.post('/api/admin/blog-posts', newPost);
      setShowCreateModal(false);
      setNewPost({ title: '', content: '' });
      loadPosts();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Nie udało się utworzyć posta');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten post?')) return;
    try {
      await api.delete(`/api/admin/blog-posts/${id}`);
      setViewPost(null);
      loadPosts();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Nie udało się usunąć posta');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-medium">Opublikowany</span>;
      case 'draft':
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Szkic</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Blog" description="Publikuj posty blogowe" />
      <div className="pv-card">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj postu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tytuł</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Autor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data publikacji</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data utworzenia</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Ładowanie...</td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Brak postów</td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <p className="font-medium text-gray-900 truncate max-w-md">{post.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{post.first_name} {post.last_name}</td>
                    <td className="px-6 py-4">{getStatusBadge(post.status)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('pl-PL') : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(post.created_at).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewPost(post)}
                          className="p-2 text-gray-400 hover:text-brand-dark hover:bg-brand-mint rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {post.status === 'draft' ? (
                          <button
                            onClick={() => handlePublish(post.id)}
                            className="p-2 text-gray-400 hover:text-brand-dark hover:bg-brand-mint rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnpublish(post.id)}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewPost(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold truncate pr-4">{viewPost.title}</h2>
              <button onClick={() => setViewPost(null)} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
                {getStatusBadge(viewPost.status)}
                <span>•</span>
                <span>utworzono: {new Date(viewPost.created_at).toLocaleDateString('pl-PL')}</span>
                {viewPost.published_at && (
                  <>
                    <span>•</span>
                    <span>publikacja: {new Date(viewPost.published_at).toLocaleDateString('pl-PL')}</span>
                  </>
                )}
              </div>
              <div className="whitespace-pre-wrap text-gray-800">{viewPost.content}</div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => handleDelete(viewPost.id)}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Usuń post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Nowy post blogowy</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tytuł</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Treść</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreatePost}
                className="flex-1 px-4 py-2 bg-brand-dark text-white rounded-lg"
              >
                Utwórz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
