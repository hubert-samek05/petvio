export const GROUP_CATEGORIES = [
  { id: 'general', name: 'Ogólne' },
  { id: 'dogs', name: 'Psy' },
  { id: 'cats', name: 'Koty' },
  { id: 'health', name: 'Zdrowie' },
  { id: 'training', name: 'Tresura' },
  { id: 'nutrition', name: 'Żywienie' },
  { id: 'breeding', name: 'Hodowla' },
  { id: 'local', name: 'Lokalne' },
  { id: 'other', name: 'Inne' },
];

export const groupCategoryName = (id: string) =>
  GROUP_CATEGORIES.find((c) => c.id === id)?.name || id;

export interface PetGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  privacy: 'public' | 'private';
  coverUrl: string | null;
  postApproval: boolean;
  memberPosting: 'everyone' | 'mods';
  memberComments: boolean;
  ownerId: string;
  ownerName?: string;
  memberCount: number;
  postCount: number;
  pendingCount?: number;
  pendingPostCount?: number;
  myRole: 'owner' | 'moderator' | 'member' | null;
  myStatus: 'active' | 'pending' | null;
  limited?: boolean;
  createdAt: string;
}
