'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { MessageSquare, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminForumPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await api.get('/api/admin/forum-posts');
      const postsData = response.data?.posts || [];
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (error) {
      console.error('Error loading forum posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten post?')) return;
    
    try {
      await api.delete(`/api/forum/posts/${id}`);
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-3 py-1 rounded-full bg-brand-light text-brand-dark text-xs font-medium">Opublikowany</span>;
      case 'pending':
        return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Oczekuje</span>;
      case 'hidden':
        return <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">Ukryty</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Posty forum" description="Moderuj posty na forum" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tytuł</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Autor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data utworzenia</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Ładowanie...</td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Brak postów</td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-gray-400" />
                        <p className="font-medium text-gray-900 truncate max-w-md">{post.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{post.first_name} {post.last_name}</td>
                    <td className="px-6 py-4">{getStatusBadge(post.status)}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(post.created_at).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {/* TODO: View post */}}
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
