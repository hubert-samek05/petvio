'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  Edit2,
  Trash2,
  MessageCircle,
  Loader2,
  Send,
  Pin,
  PinOff,
  SmilePlus,
  X,
  Clock,
  MessageCircleOff,
  Globe,
  Users,
  Lock,
} from 'lucide-react';
import {
  Avatar,
  REACTIONS,
  SocialPost,
  SocialComment,
  getTimeAgo,
  postBackgroundCss,
  reactionMeta,
} from './shared';
import WalkMap from './WalkMap';
import MusicCard from './MusicCard';

export default function PostCard({
  post,
  myId,
  myName,
  myAvatar,
  canModerate = false,
  onReact,
  onEdit,
  onDelete,
  onPin,
  loadComments,
  onAddComment,
  onDeleteComment,
  canDeleteComment,
  canComment = true,
}: {
  post: SocialPost;
  myId: string;
  myName?: string;
  myAvatar?: string | null;
  canModerate?: boolean;
  onReact: (post: SocialPost, reaction: string | null) => void;
  onEdit?: (post: SocialPost) => void;
  onDelete: (post: SocialPost) => void;
  onPin?: (post: SocialPost) => void;
  loadComments: (postId: string) => Promise<SocialComment[]>;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onDeleteComment: (post: SocialPost, comment: SocialComment) => void;
  canDeleteComment?: (comment: SocialComment) => boolean;
  canComment?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<SocialComment[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isAuthor = !!myId && post.authorId === myId;
  const myReaction = reactionMeta(post.myReaction);
  const topReactions = REACTIONS.filter((r) => (post.reactionCounts?.[r.id] || 0) > 0);

  const toggleComments = async () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    if (comments === null) {
      setCommentsLoading(true);
      try {
        setComments(await loadComments(post.id));
      } catch {
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  const submitComment = async () => {
    const content = commentInput.trim();
    if (!content || commentBusy) return;
    setCommentBusy(true);
    try {
      await onAddComment(post.id, content);
      setCommentInput('');
      setComments(await loadComments(post.id));
    } catch {
      // błąd obsłużony wyżej
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <div className="pv-card pv-feed-card overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={post.authorPageId ? `/dashboard/community/pages/${post.authorPageId}` : `/dashboard/community/user/${post.authorId}`}
            className="flex items-center gap-3 min-w-0 group/author"
          >
            <Avatar name={post.authorName} url={post.authorAvatar} />
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate group-hover/author:text-brand-dark transition-colors">
                {post.authorName}
                {post.wallOwnerName && post.wallOwnerId !== post.authorId && (
                  <span className="font-normal text-gray-500"> → {post.wallOwnerName}</span>
                )}
                {post.feeling && <span className="font-normal text-gray-500"> {post.feeling}</span>}
                {post.location && (
                  <span className="font-normal text-gray-500"> — 📍 {post.location}</span>
                )}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1.5">
                {post.status === 'pending' && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                    <Clock className="w-3 h-3" /> Oczekuje na zatwierdzenie
                  </span>
                )}
                {post.pinned && (
                  <span className="inline-flex items-center gap-1 text-brand-dark font-semibold">
                    <Pin className="w-3 h-3" /> Przypięty
                  </span>
                )}
                {getTimeAgo(post.createdAt)}
                {post.visibility === 'friends' && (
                  <span title="Widoczne tylko dla znajomych"><Users className="w-3 h-3" /></span>
                )}
                {post.visibility === 'only_me' && (
                  <span title="Widoczne tylko dla Ciebie"><Lock className="w-3 h-3" /></span>
                )}
                {(!post.visibility || post.visibility === 'public') && (
                  <span title="Publiczne"><Globe className="w-3 h-3" /></span>
                )}
              </div>
            </div>
          </Link>

          {(isAuthor || canModerate) && (
            <div className="flex gap-1 flex-shrink-0">
              {canModerate && onPin && (
                <button
                  onClick={() => onPin(post)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-brand-mint/60 hover:text-brand-dark transition-all"
                  aria-label={post.pinned ? 'Odepnij post' : 'Przypnij post'}
                  title={post.pinned ? 'Odepnij post' : 'Przypnij post'}
                >
                  {post.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
              )}
              {isAuthor && onEdit && (
                <button
                  onClick={() => onEdit(post)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-dark transition-all"
                  aria-label="Edytuj post"
                  title="Edytuj post"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {(isAuthor || canModerate) && (
                <button
                  onClick={() => onDelete(post)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                  aria-label="Usuń post"
                  title="Usuń post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {post.content && !post.background && (
          <p className="mt-3 text-gray-800 whitespace-pre-wrap break-words">{post.content}</p>
        )}
      </div>

      {/* Post z tłem gradientowym (jak Facebook) */}
      {post.background && postBackgroundCss(post.background) && (
        <div
          className="mx-4 sm:mx-5 mb-3 rounded-2xl px-6 py-14 flex items-center justify-center"
          style={{ background: postBackgroundCss(post.background)! }}
        >
          <p className="text-white text-xl sm:text-2xl font-semibold text-center whitespace-pre-wrap break-words drop-shadow-sm">
            {post.content}
          </p>
        </div>
      )}

      {/* Rolka (wideo) */}
      {post.video && (
        <div className="pb-3">
          <video
            src={post.video}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[480px] bg-black"
          />
        </div>
      )}

      {/* Załącznik: muzyka */}
      {post.music && (
        <div className="px-4 sm:px-5 pb-3">
          <MusicCard music={post.music} />
        </div>
      )}

      {/* Załącznik: spacer z mapą */}
      {post.walk && (
        <div className="px-4 sm:px-5 pb-3">
          <WalkMap walk={post.walk} />
        </div>
      )}

      {/* Zdjęcia */}
      {post.images?.length > 0 && (
        <div className={post.images.length === 1 ? '' : 'px-4 sm:px-5 pb-3 grid grid-cols-2 gap-2'}>
          {post.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              onClick={() => setLightbox(img)}
              className={`cursor-pointer object-cover ${
                post.images.length === 1
                  ? 'w-full max-h-[420px]'
                  : 'w-full aspect-square rounded-2xl border border-gray-100'
              }`}
            />
          ))}
        </div>
      )}

      {/* Podsumowanie reakcji */}
      {(post.totalReactions > 0 || post.commentCount > 0) && (
        <div className="px-4 sm:px-5 py-2 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            {topReactions.slice(0, 3).map((r) => (
              <span key={r.id} className="text-base leading-none">{r.emoji}</span>
            ))}
            {post.totalReactions > 0 && <span className="ml-1">{post.totalReactions}</span>}
          </div>
          {post.commentCount > 0 && (
            <button onClick={toggleComments} className="hover:underline">
              {post.commentCount} {post.commentCount === 1 ? 'komentarz' : post.commentCount < 5 ? 'komentarze' : 'komentarzy'}
            </button>
          )}
        </div>
      )}

      {/* Akcje */}
      <div className="px-4 sm:px-5 py-2 border-t border-gray-100 flex items-center gap-1">
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              myReaction ? 'text-brand-dark bg-brand-mint/60' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {myReaction ? (
              <span className="text-base leading-none">{myReaction.emoji}</span>
            ) : (
              <SmilePlus className="w-5 h-5" />
            )}
            {myReaction ? myReaction.label : 'Reaguj'}
          </button>

          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setPickerOpen(false)} />
              <div className="absolute left-0 bottom-full mb-2 z-40 flex gap-1 p-1.5 bg-white rounded-full shadow-xl border border-gray-100 animate-scale-in">
                {REACTIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setPickerOpen(false);
                      onReact(post, post.myReaction === r.id ? null : r.id);
                    }}
                    title={r.label}
                    className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-transform hover:scale-125 hover:bg-gray-100 ${
                      post.myReaction === r.id ? 'bg-brand-mint ring-2 ring-brand/40' : ''
                    }`}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={toggleComments}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          Komentuj
        </button>
      </div>

      {/* Komentarze */}
      {commentsOpen && (
        <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100">
          {canComment ? (
          <div className="flex gap-3 mb-4">
            <Avatar name={myName || 'Ty'} url={myAvatar} size="sm" />
            <div className="flex-1 min-w-0">
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Napisz komentarz..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark resize-none text-sm"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={submitComment}
                  disabled={!commentInput.trim() || commentBusy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl pv-btn-primary text-sm disabled:opacity-50"
                >
                  {commentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Wyślij
                </button>
              </div>
            </div>
          </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 mb-2 text-sm text-gray-400">
              <MessageCircleOff className="w-4 h-4" /> Komentowanie jest wyłączone w tej grupie
            </div>
          )}

          {commentsLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="w-6 h-6 mx-auto text-brand animate-spin" />
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((c) => {
                const deletable = canDeleteComment ? canDeleteComment(c) : c.authorId === myId;
                return (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={c.authorName} url={c.authorAvatar} size="sm" />
                    <div className="flex-1 min-w-0 bg-white rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm truncate">{c.authorName}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{getTimeAgo(c.createdAt)}</span>
                        {deletable && (
                          <button
                            onClick={() => onDeleteComment(post, c)}
                            className="ml-auto p-1 rounded text-gray-300 hover:text-red-600 transition-all flex-shrink-0"
                            aria-label="Usuń komentarz"
                            title="Usuń komentarz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 py-3">Brak komentarzy — bądź pierwszy</p>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            aria-label="Zamknij podgląd"
          >
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}
