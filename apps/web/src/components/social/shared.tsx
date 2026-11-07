export interface WalkShare {
  id: string;
  petName?: string | null;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  points: { lat: number; lng: number }[];
}

export interface PostMusic {
  title: string;
  artist: string;
  url?: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  wallOwnerId?: string | null;
  wallOwnerName?: string | null;
  content: string;
  visibility?: 'public' | 'friends' | 'only_me';
  authorPageId?: string | null;
  feeling?: string | null;
  location?: string | null;
  background?: string | null;
  images: string[];
  postType?: 'text' | 'reel' | 'walk';
  video?: string | null;
  music?: PostMusic | null;
  walk?: WalkShare | null;
  status?: 'approved' | 'pending';
  pinned?: boolean;
  reactionCounts: Record<string, number>;
  totalReactions: number;
  myReaction: string | null;
  commentCount: number;
  createdAt: string;
}

export interface ComposerPayload {
  content: string;
  images: string[];
  video?: string | null;
  music?: PostMusic | null;
  walkId?: number | null;
  visibility?: 'public' | 'friends' | 'only_me';
  pageId?: number | null;
  feeling?: string | null;
  location?: string | null;
  background?: string | null;
}

export interface SocialComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
}

export interface SocialApi {
  getPosts(): Promise<{ posts: SocialPost[] }>;
  createPost(data: ComposerPayload): Promise<{ post: SocialPost }>;
  updatePost(id: string, data: { content: string; images: string[]; music?: PostMusic | null; visibility?: 'public' | 'friends' | 'only_me'; feeling?: string | null; location?: string | null; background?: string | null }): Promise<{ post: SocialPost }>;
  deletePost(id: string): Promise<unknown>;
  reactPost(id: string, reaction: string | null): Promise<{ post: SocialPost }>;
  getComments(id: string): Promise<{ comments: SocialComment[] }>;
  addComment(id: string, content: string): Promise<{ comment: SocialComment }>;
  deleteComment(id: string): Promise<unknown>;
  pinPost?(id: string): Promise<unknown>;
}

export const REACTIONS = [
  { id: 'like', emoji: '👍', label: 'Lubię to' },
  { id: 'love', emoji: '❤️', label: 'Uwielbiam' },
  { id: 'haha', emoji: '😂', label: 'Ha ha' },
  { id: 'wow', emoji: '😮', label: 'Ooo' },
  { id: 'sad', emoji: '😢', label: 'Przykro mi' },
] as const;

export const reactionMeta = (id: string | null | undefined) =>
  REACTIONS.find((r) => r.id === id) || null;

// Tła postów tekstowych — klucze zgodne z backendową whitelistą
export const POST_BACKGROUNDS: { id: string; label: string; gradient: string }[] = [
  { id: 'mint', label: 'Mięta', gradient: 'linear-gradient(135deg,#0f7a55 0%,#2fbf8f 60%,#7ce3b8 100%)' },
  { id: 'sunset', label: 'Zachód', gradient: 'linear-gradient(135deg,#f97316 0%,#ef4444 55%,#be123c 100%)' },
  { id: 'ocean', label: 'Ocean', gradient: 'linear-gradient(135deg,#0369a1 0%,#0ea5e9 60%,#67e8f9 100%)' },
  { id: 'berry', label: 'Jagoda', gradient: 'linear-gradient(135deg,#7e22ce 0%,#c026d3 55%,#f472b6 100%)' },
  { id: 'amber', label: 'Bursztyn', gradient: 'linear-gradient(135deg,#b45309 0%,#f59e0b 60%,#fcd34d 100%)' },
  { id: 'night', label: 'Noc', gradient: 'linear-gradient(135deg,#0f172a 0%,#334155 55%,#64748b 100%)' },
  { id: 'lavender', label: 'Lawenda', gradient: 'linear-gradient(135deg,#6d28d9 0%,#8b5cf6 55%,#d8b4fe 100%)' },
];

export const postBackgroundCss = (id?: string | null) =>
  POST_BACKGROUNDS.find((b) => b.id === id)?.gradient || null;

// Aktywności / samopoczucie — jak „czuje się..." na Facebooku
export const FEELINGS = [
  'czuje się radosny/a', 'czuje się wdzięczny/a', 'czuje się dumny/a',
  'czuje się zakochany/a', 'czuje się zrelaksowany/a', 'czuje się zmartwiony/a',
  'jest na spacerze', 'jest na treningu', 'świętuje', 'jest u weterynarza',
  'jest w podróży', 'odpoczywa z pupilem', 'jest na wystawie', 'szuka zaginionego pupila',
] as const;

export const downscaleImage = (file: File, maxW = 1000): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const getTimeAgo = (date: string) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Teraz';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;
  return new Date(date).toLocaleDateString('pl-PL');
};

export function Avatar({
  name,
  url,
  size = 'md',
}: {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cls =
    size === 'sm'
      ? 'w-8 h-8 text-sm'
      : size === 'lg'
        ? 'w-12 h-12 text-base'
        : 'w-10 h-10 text-sm';
  if (url) {
    return <img src={url} alt={name} className={`${cls} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-brand-dark to-brand flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {(name[0] || 'U').toUpperCase()}
    </div>
  );
}
