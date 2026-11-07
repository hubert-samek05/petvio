'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Info, Loader2, MessageCircle, RefreshCcw, X } from 'lucide-react';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ComposerPayload, SocialApi, SocialPost, SocialComment } from './shared';

export default function SocialFeed({
  api,
  user,
  myId,
  canModerate = false,
  showComposer = true,
  composerPlaceholder,
  composerNotice,
  composerVisibility = false,
  composerPageId = null,
  emptyTitle = 'Brak postów',
  emptyText = 'Bądź pierwszy i napisz coś!',
  canDeleteComment,
  canComment = true,
}: {
  api: SocialApi;
  user: { firstName?: string; avatarUrl?: string | null } | null;
  myId: string;
  canModerate?: boolean;
  showComposer?: boolean;
  composerPlaceholder?: string;
  composerNotice?: string;
  composerVisibility?: boolean;
  composerPageId?: number | null;
  emptyTitle?: string;
  emptyText?: string;
  canDeleteComment?: (post: SocialPost, comment: SocialComment) => boolean;
  canComment?: boolean;
}) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');
  const [confirmPost, setConfirmPost] = useState<SocialPost | null>(null);
  const [confirmComment, setConfirmComment] = useState<{ post: SocialPost; comment: SocialComment } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadPosts = async () => {
    try {
      const res = await api.getPosts();
      setPosts(res.posts || []);
      setLoadError('');
    } catch {
      setLoadError('Nie udało się pobrać postów. Sprawdź połączenie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editingPost) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [editingPost]);

  const handleCreate = async (payload: ComposerPayload) => {
    try {
      const res = await api.createPost(payload);
      setPosts((l) => [res.post, ...l]);
      return true;
    } catch (e: any) {
      setListError(e?.response?.data?.error?.message || 'Nie udało się opublikować posta.');
      return false;
    }
  };

  const handleEditSave = async (payload: ComposerPayload) => {
    if (!editingPost) return false;
    try {
      const res = await api.updatePost(editingPost.id, {
        content: payload.content,
        images: payload.images,
        music: payload.music !== undefined ? payload.music : editingPost.music,
        visibility: payload.visibility,
        feeling: payload.feeling !== undefined ? payload.feeling : editingPost.feeling,
        location: payload.location !== undefined ? payload.location : editingPost.location,
        background: payload.background !== undefined ? payload.background : editingPost.background,
      });
      setPosts((l) => l.map((p) => (p.id === res.post.id ? res.post : p)));
      setEditingPost(null);
      setFormError('');
      return true;
    } catch (e: any) {
      setFormError(e?.response?.data?.error?.message || 'Nie udało się zapisać posta.');
      return false;
    }
  };

  const handleDelete = async (post: SocialPost) => {
    setActionBusy(true);
    try {
      await api.deletePost(post.id);
      setPosts((l) => l.filter((p) => p.id !== post.id));
      setConfirmPost(null);
    } catch (e: any) {
      setListError(e?.response?.data?.error?.message || 'Nie udało się usunąć posta.');
      setConfirmPost(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleReact = async (post: SocialPost, reaction: string | null) => {
    // optymistycznie
    const prev = post;
    const optimistic = { ...post };
    if (post.myReaction) {
      optimistic.reactionCounts = { ...optimistic.reactionCounts, [post.myReaction]: (optimistic.reactionCounts[post.myReaction] || 1) - 1 };
      optimistic.totalReactions -= 1;
    }
    if (reaction) {
      optimistic.reactionCounts = { ...optimistic.reactionCounts, [reaction]: (optimistic.reactionCounts[reaction] || 0) + 1 };
      optimistic.totalReactions += 1;
    }
    optimistic.myReaction = reaction;
    setPosts((l) => l.map((p) => (p.id === post.id ? optimistic : p)));
    try {
      const res = await api.reactPost(post.id, reaction);
      setPosts((l) => l.map((p) => (p.id === post.id ? res.post : p)));
    } catch {
      setPosts((l) => l.map((p) => (p.id === post.id ? prev : p)));
    }
  };

  const handlePin = async (post: SocialPost) => {
    if (!api.pinPost) return;
    try {
      await api.pinPost(post.id);
      await loadPosts();
    } catch (e: any) {
      setListError(e?.response?.data?.error?.message || 'Nie udało się przypiąć posta.');
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    try {
      await api.addComment(postId, content);
      setPosts((l) => l.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
    } catch (e: any) {
      setListError(e?.response?.data?.error?.message || 'Nie udało się dodać komentarza.');
    }
  };

  const handleDeleteComment = async (post: SocialPost, comment: SocialComment) => {
    setActionBusy(true);
    try {
      await api.deleteComment(comment.id);
      setPosts((l) => l.map((p) => (p.id === post.id ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p)));
      setConfirmComment(null);
    } catch (e: any) {
      setListError(e?.response?.data?.error?.message || 'Nie udało się usunąć komentarza.');
      setConfirmComment(null);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {showComposer && (
        <>
          {composerNotice && (
            <div className="pv-card px-4 py-3 flex items-center gap-2.5 text-sm text-amber-700 bg-amber-50/60">
              <Info className="w-4 h-4 flex-shrink-0" /> {composerNotice}
            </div>
          )}
          <PostComposer
            user={user}
            placeholder={composerPlaceholder}
            onSubmit={handleCreate}
            showVisibility={composerVisibility}
            pageId={composerPageId}
          />
        </>
      )}

      {listError && (
        <div className="pv-card px-4 py-3 text-sm text-red-600 bg-red-50/60 flex items-center justify-between gap-3">
          {listError}
          <button onClick={() => setListError('')} className="text-red-400 hover:text-red-600" aria-label="Zamknij">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
      ) : posts.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">{emptyTitle}</h3>
          <p className="text-gray-500">{emptyText}</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            myId={myId}
            myName={user?.firstName}
            myAvatar={user?.avatarUrl}
            canModerate={canModerate}
            onReact={handleReact}
            onEdit={(p) => {
              setFormError('');
              setEditingPost(p);
            }}
            onDelete={(p) => setConfirmPost(p)}
            onPin={api.pinPost ? handlePin : undefined}
            loadComments={async (id) => (await api.getComments(id)).comments}
            onAddComment={handleAddComment}
            onDeleteComment={(p, c) => setConfirmComment({ post: p, comment: c })}
            canDeleteComment={canDeleteComment ? (c) => canDeleteComment(post, c) : undefined}
            canComment={canComment}
          />
        ))
      )}

      {/* Modal edycji posta */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900">Edytuj post</h3>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
              )}
              <PostComposer
                bare
                attachments={false}
                user={user}
                initialContent={editingPost.content}
                initialImages={editingPost.images}
                initialMusic={editingPost.music}
                initialFeeling={editingPost.feeling}
                initialLocation={editingPost.location || ''}
                initialBackground={editingPost.background}
                submitLabel="Zapisz"
                onSubmit={handleEditSave}
                onCancel={() => setEditingPost(null)}
                showVisibility
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmPost}
        title="Usunąć post?"
        description="Post zostanie usunięty wraz z komentarzami i reakcjami."
        confirmLabel="Usuń"
        loading={actionBusy}
        onConfirm={() => confirmPost && handleDelete(confirmPost)}
        onCancel={() => setConfirmPost(null)}
      />
      <ConfirmModal
        isOpen={!!confirmComment}
        title="Usunąć komentarz?"
        description={confirmComment ? `Komentarz zostanie trwale usunięty.` : ''}
        confirmLabel="Usuń"
        loading={actionBusy}
        onConfirm={() => confirmComment && handleDeleteComment(confirmComment.post, confirmComment.comment)}
        onCancel={() => setConfirmComment(null)}
      />
    </div>
  );
}
