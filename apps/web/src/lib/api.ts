import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/welcome';
    }
    // 402 = limit planu / funkcja premium → globalny popup „przejdź na wyższy plan”
    const body = error.response?.data?.error;
    if (error.response?.status === 402 && body?.code && !(error.config as any)?.silentUpgrade) {
      try {
        window.dispatchEvent(new CustomEvent('pv:upgrade', { detail: { ...body, message: body.message } }));
      } catch {}
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
  // כניסה חברתית — provider 'google' | 'apple'; idToken מספק הזהות
  oauth: async (provider: 'google' | 'apple', data: { idToken: string; firstName?: string; lastName?: string }) => {
    const response = await api.post(`/api/auth/${provider}`, data);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
  updateProfile: async (data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string | null }) => {
    const response = await api.patch('/api/auth/me', data);
    return response.data;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await api.post('/api/auth/change-password', data);
    return response.data;
  },
  deleteAccount: async (password: string) => {
    const response = await api.delete('/api/auth/me', { data: { password } });
    return response.data;
  },
};

export const petApi = {
  getAll: async () => {
    const response = await api.get('/api/pets');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/pets/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/pets', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/pets/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/pets/${id}`);
    return response.data;
  },
};

export const aiAssistantApi = {
  ask: async (data: { message: string; petId?: string | number | null; role?: string; history?: { role: 'user' | 'assistant'; content: string }[] }) => {
    const response = await api.post('/api/ai-assistant/ask', data);
    return response.data;
  },
};

export const lostPetsApi = {
  getAll: async (params?: { status?: string; city?: string; lat?: number; lng?: number; radius?: number }) => {
    const response = await api.get('/api/lost-pets', { params });
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/lost-pets', data);
    return response.data;
  },
  markFound: async (id: string | number) => {
    const response = await api.patch(`/api/lost-pets/${id}/found`);
    return response.data;
  },
  markLost: async (id: string | number) => {
    const response = await api.patch(`/api/lost-pets/${id}/lost`);
    return response.data;
  },
  delete: async (id: string | number) => {
    const response = await api.delete(`/api/lost-pets/${id}`);
    return response.data;
  },
};

export const adoptionsApi = {
  getAll: async (params?: { status?: string }) => {
    const response = await api.get('/api/adoptions', { params });
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/adoptions', data);
    return response.data;
  },
  toggleLike: async (id: string | number) => {
    const response = await api.post(`/api/adoptions/${id}/like`);
    return response.data;
  },
  updateStatus: async (id: string | number, status: 'available' | 'reserved' | 'adopted') => {
    const response = await api.patch(`/api/adoptions/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: string | number) => {
    const response = await api.delete(`/api/adoptions/${id}`);
    return response.data;
  },
};

export const sharingApi = {
  getAll: async () => {
    const response = await api.get('/api/sharing');
    return response.data;
  },
  invite: async (data: { email: string; role: string; petIds: (string | number)[]; permissions: Record<string, boolean> }) => {
    const response = await api.post('/api/sharing/invite', data);
    return response.data;
  },
  respond: async (id: string | number, accept: boolean) => {
    const response = await api.post(`/api/sharing/${id}/respond`, { accept });
    return response.data;
  },
  update: async (id: string | number, data: { petIds?: (string | number)[]; permissions?: Record<string, boolean> }) => {
    const response = await api.patch(`/api/sharing/${id}`, data);
    return response.data;
  },
  remove: async (id: string | number) => {
    const response = await api.delete(`/api/sharing/${id}`);
    return response.data;
  },
  getSharedPets: async () => {
    const response = await api.get('/api/sharing/shared-pets');
    return response.data;
  },
  getSharedPetDetail: async (petId: string | number) => {
    const response = await api.get(`/api/sharing/shared-pets/${petId}`);
    return response.data;
  },
};

export const forumApi = {
  getPosts: async (params?: { category?: string; search?: string; mine?: boolean }) => {
    const response = await api.get('/api/forum/posts', { params });
    return response.data;
  },
  createPost: async (data: { category: string; title: string; content: string }) => {
    const response = await api.post('/api/forum/posts', data);
    return response.data;
  },
  updatePost: async (id: string | number, data: { category: string; title: string; content: string }) => {
    const response = await api.patch(`/api/forum/posts/${id}`, data);
    return response.data;
  },
  deletePost: async (id: string | number) => {
    const response = await api.delete(`/api/forum/posts/${id}`);
    return response.data;
  },
  likePost: async (id: string | number) => {
    const response = await api.post(`/api/forum/posts/${id}/like`);
    return response.data;
  },
  reportPost: async (id: string | number) => {
    const response = await api.post(`/api/forum/posts/${id}/report`);
    return response.data;
  },
  getComments: async (postId: string | number) => {
    const response = await api.get(`/api/forum/posts/${postId}/comments`);
    return response.data;
  },
  addComment: async (postId: string | number, content: string) => {
    const response = await api.post(`/api/forum/posts/${postId}/comments`, { content });
    return response.data;
  },
  deleteComment: async (id: string | number) => {
    const response = await api.delete(`/api/forum/comments/${id}`);
    return response.data;
  },
  likeComment: async (id: string | number) => {
    const response = await api.post(`/api/forum/comments/${id}/like`);
    return response.data;
  },
};

export interface PostAttachmentPayload {
  content: string;
  images?: string[];
  video?: string | null;
  music?: { title: string; artist: string; url?: string } | null;
  walkId?: number | null;
  wallUserId?: number | null;
  visibility?: 'public' | 'friends' | 'only_me';
  pageId?: number | null;
  feeling?: string | null;
  location?: string | null;
  background?: string | null;
}

export const groupsApi = {
  getGroups: async (params?: { search?: string; filter?: 'all' | 'mine' }) => {
    const response = await api.get('/api/groups', { params });
    return response.data;
  },
  createGroup: async (data: { name: string; description?: string; category?: string; privacy?: string; coverUrl?: string | null }) => {
    const response = await api.post('/api/groups', data);
    return response.data;
  },
  getGroup: async (id: string | number) => {
    const response = await api.get(`/api/groups/${id}`);
    return response.data;
  },
  updateGroup: async (id: string | number, data: {
    name?: string; description?: string; category?: string; privacy?: string; coverUrl?: string | null;
    postApproval?: boolean; memberPosting?: 'everyone' | 'mods'; memberComments?: boolean;
  }) => {
    const response = await api.patch(`/api/groups/${id}`, data);
    return response.data;
  },
  deleteGroup: async (id: string | number) => {
    const response = await api.delete(`/api/groups/${id}`);
    return response.data;
  },
  joinGroup: async (id: string | number) => {
    const response = await api.post(`/api/groups/${id}/join`);
    return response.data;
  },
  leaveGroup: async (id: string | number) => {
    const response = await api.delete(`/api/groups/${id}/leave`);
    return response.data;
  },
  getMembers: async (id: string | number) => {
    const response = await api.get(`/api/groups/${id}/members`);
    return response.data;
  },
  approveMember: async (id: string | number, userId: string | number) => {
    const response = await api.post(`/api/groups/${id}/members/${userId}/approve`);
    return response.data;
  },
  removeMember: async (id: string | number, userId: string | number) => {
    const response = await api.delete(`/api/groups/${id}/members/${userId}`);
    return response.data;
  },
  setMemberRole: async (id: string | number, userId: string | number, role: 'member' | 'moderator') => {
    const response = await api.patch(`/api/groups/${id}/members/${userId}`, { role });
    return response.data;
  },
  getPosts: async (id: string | number) => {
    const response = await api.get(`/api/groups/${id}/posts`);
    return response.data;
  },
  getPendingPosts: async (id: string | number) => {
    const response = await api.get(`/api/groups/${id}/pending-posts`);
    return response.data;
  },
  createPost: async (id: string | number, data: PostAttachmentPayload) => {
    const response = await api.post(`/api/groups/${id}/posts`, data);
    return response.data;
  },
  approvePost: async (postId: string | number) => {
    const response = await api.post(`/api/groups/posts/${postId}/approve`);
    return response.data;
  },
  rejectPost: async (postId: string | number) => {
    const response = await api.post(`/api/groups/posts/${postId}/reject`);
    return response.data;
  },
  updatePost: async (postId: string | number, data: { content: string; images?: string[]; music?: { title: string; artist: string; url?: string } | null }) => {
    const response = await api.patch(`/api/groups/posts/${postId}`, data);
    return response.data;
  },
  deletePost: async (postId: string | number) => {
    const response = await api.delete(`/api/groups/posts/${postId}`);
    return response.data;
  },
  pinPost: async (postId: string | number) => {
    const response = await api.post(`/api/groups/posts/${postId}/pin`);
    return response.data;
  },
  reactPost: async (postId: string | number, reaction: string | null) => {
    const response = await api.post(`/api/groups/posts/${postId}/react`, { reaction });
    return response.data;
  },
  getComments: async (postId: string | number) => {
    const response = await api.get(`/api/groups/posts/${postId}/comments`);
    return response.data;
  },
  addComment: async (postId: string | number, content: string) => {
    const response = await api.post(`/api/groups/posts/${postId}/comments`, { content });
    return response.data;
  },
  deleteComment: async (commentId: string | number) => {
    const response = await api.delete(`/api/groups/comments/${commentId}`);
    return response.data;
  },
  // Wydarzenia
  getEvents: async (groupId: string | number) => {
    const response = await api.get(`/api/groups/${groupId}/events`);
    return response.data;
  },
  createEvent: async (groupId: string | number, data: {
    title: string; description?: string; location?: string; startsAt: string; coverImage?: string | null;
    ticketsEnabled?: boolean; ticketTotal?: number; ticketPrice?: number | null; ticketInfo?: string;
  }) => {
    const response = await api.post(`/api/groups/${groupId}/events`, data);
    return response.data;
  },
  respondEvent: async (eventId: string | number, status: 'going' | 'interested' | 'not_going' | null) => {
    const response = await api.post(`/api/groups/events/${eventId}/respond`, { status });
    return response.data;
  },
  claimTickets: async (eventId: string | number, quantity: number) => {
    const response = await api.post(`/api/groups/events/${eventId}/tickets`, { quantity });
    return response.data;
  },
  unclaimTickets: async (eventId: string | number) => {
    const response = await api.delete(`/api/groups/events/${eventId}/tickets`);
    return response.data;
  },
  deleteEvent: async (eventId: string | number) => {
    const response = await api.delete(`/api/groups/events/${eventId}`);
    return response.data;
  },
  // Ankiety
  getPolls: async (groupId: string | number) => {
    const response = await api.get(`/api/groups/${groupId}/polls`);
    return response.data;
  },
  createPoll: async (groupId: string | number, data: { question: string; options: string[]; endsAt?: string | null }) => {
    const response = await api.post(`/api/groups/${groupId}/polls`, data);
    return response.data;
  },
  votePoll: async (pollId: string | number, optionIndex: number) => {
    const response = await api.post(`/api/groups/polls/${pollId}/vote`, { optionIndex });
    return response.data;
  },
  deletePoll: async (pollId: string | number) => {
    const response = await api.delete(`/api/groups/polls/${pollId}`);
    return response.data;
  },
  // Konkursy
  getContests: async (groupId: string | number) => {
    const response = await api.get(`/api/groups/${groupId}/contests`);
    return response.data;
  },
  getContest: async (contestId: string | number) => {
    const response = await api.get(`/api/groups/contests/${contestId}`);
    return response.data;
  },
  createContest: async (groupId: string | number, data: { title: string; description?: string; endsAt: string }) => {
    const response = await api.post(`/api/groups/${groupId}/contests`, data);
    return response.data;
  },
  addContestEntry: async (contestId: string | number, data: { body?: string; image?: string | null }) => {
    const response = await api.post(`/api/groups/contests/${contestId}/entries`, data);
    return response.data;
  },
  deleteContestEntry: async (entryId: string | number) => {
    const response = await api.delete(`/api/groups/contests/entries/${entryId}`);
    return response.data;
  },
  pickContestWinner: async (contestId: string | number, userId: string | number) => {
    const response = await api.post(`/api/groups/contests/${contestId}/winner`, { userId });
    return response.data;
  },
  deleteContest: async (contestId: string | number) => {
    const response = await api.delete(`/api/groups/contests/${contestId}`);
    return response.data;
  },
};

export const businessPagesApi = {
  getAll: async (params?: { q?: string; category?: string }) => {
    const response = await api.get('/api/business-pages', { params });
    return response.data;
  },
  getMine: async () => {
    const response = await api.get('/api/business-pages/mine');
    return response.data;
  },
  getById: async (id: string | number) => {
    const response = await api.get(`/api/business-pages/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/business-pages', data);
    return response.data;
  },
  update: async (id: string | number, data: any) => {
    const response = await api.patch(`/api/business-pages/${id}`, data);
    return response.data;
  },
  remove: async (id: string | number) => {
    const response = await api.delete(`/api/business-pages/${id}`);
    return response.data;
  },
};

export const postsApi = {
  getPosts: async (params?: { author?: 'me'; type?: 'reel'; user_id?: number | string; page_id?: number | string; sort?: 'newest' | 'oldest' | 'popular' | 'foryou' }) => {
    const response = await api.get('/api/posts', { params });
    return response.data;
  },
  createPost: async (data: PostAttachmentPayload) => {
    const response = await api.post('/api/posts', data);
    return response.data;
  },
  updatePost: async (id: string | number, data: { content: string; images?: string[]; music?: { title: string; artist: string; url?: string } | null; visibility?: 'public' | 'friends' | 'only_me'; feeling?: string | null; location?: string | null; background?: string | null }) => {
    const response = await api.patch(`/api/posts/${id}`, data);
    return response.data;
  },
  deletePost: async (id: string | number) => {
    const response = await api.delete(`/api/posts/${id}`);
    return response.data;
  },
  reactPost: async (id: string | number, reaction: string | null) => {
    const response = await api.post(`/api/posts/${id}/react`, { reaction });
    return response.data;
  },
  getComments: async (postId: string | number) => {
    const response = await api.get(`/api/posts/${postId}/comments`);
    return response.data;
  },
  addComment: async (postId: string | number, content: string) => {
    const response = await api.post(`/api/posts/${postId}/comments`, { content });
    return response.data;
  },
  deleteComment: async (commentId: string | number) => {
    const response = await api.delete(`/api/posts/comments/${commentId}`);
    return response.data;
  },
};

export const storiesApi = {
  getAll: async () => {
    const response = await api.get('/api/stories');
    return response.data;
  },
  create: async (data: {
    image?: string;
    mediaType?: 'image' | 'video' | null;
    text?: string;
    bgColor?: string;
    meta?: {
      texts?: { content: string; x: number; y: number; color: string; size: 'sm' | 'md' | 'lg' }[];
      stickers?: { emoji: string; x: number; y: number; scale: number }[];
      music?: { title: string; artist: string; url?: string } | null;
    };
  }) => {
    const response = await api.post('/api/stories', data);
    return response.data;
  },
  view: async (id: string | number) => {
    const response = await api.post(`/api/stories/${id}/view`);
    return response.data;
  },
  delete: async (id: string | number) => {
    const response = await api.delete(`/api/stories/${id}`);
    return response.data;
  },
};

export const friendsApi = {
  list: async () => {
    const response = await api.get('/api/friends');
    return response.data;
  },
  requests: async () => {
    const response = await api.get('/api/friends/requests');
    return response.data;
  },
  search: async (q: string) => {
    const response = await api.get('/api/friends/search', { params: { q } });
    return response.data;
  },
  profile: async (userId: string | number) => {
    const response = await api.get(`/api/friends/profile/${userId}`);
    return response.data;
  },
  userFriends: async (userId: string | number) => {
    const response = await api.get(`/api/friends/${userId}/friends`);
    return response.data;
  },
  request: async (userId: string | number) => {
    const response = await api.post('/api/friends/request', { userId });
    return response.data;
  },
  accept: async (userId: string | number) => {
    const response = await api.post('/api/friends/accept', { userId });
    return response.data;
  },
  decline: async (userId: string | number) => {
    const response = await api.post('/api/friends/decline', { userId });
    return response.data;
  },
  remove: async (userId: string | number) => {
    const response = await api.delete(`/api/friends/${userId}`);
    return response.data;
  },
  follow: async (userId: string | number) => {
    const response = await api.post('/api/friends/follow', { userId });
    return response.data;
  },
  unfollow: async (userId: string | number) => {
    const response = await api.delete(`/api/friends/follow/${userId}`);
    return response.data;
  },
  getSettings: async () => {
    const response = await api.get('/api/friends/settings');
    return response.data;
  },
  updateSettings: async (data: {
    bio?: string;
    city?: string;
    birthday?: string;
    wall_setting?: 'friends' | 'nobody';
    messages_from?: 'everyone' | 'friends';
    birthday_visibility?: 'public' | 'friends' | 'private';
  }) => {
    const response = await api.patch('/api/friends/settings', data);
    return response.data;
  },
  block: async (userId: string | number) => {
    const response = await api.post('/api/friends/block', { userId });
    return response.data;
  },
  unblock: async (userId: string | number) => {
    const response = await api.delete(`/api/friends/block/${userId}`);
    return response.data;
  },
  blocked: async () => {
    const response = await api.get('/api/friends/blocked');
    return response.data;
  },
};

export const messagesApi = {
  conversations: async () => {
    const response = await api.get('/api/messages/conversations');
    return response.data;
  },
  open: async (userId: string | number) => {
    const response = await api.post('/api/messages/conversations', { userId });
    return response.data;
  },
  messages: async (convId: string | number, afterId?: number, beforeId?: number) => {
    const response = await api.get(`/api/messages/conversations/${convId}/messages`, {
      params: { ...(afterId ? { afterId } : {}), ...(beforeId ? { beforeId } : {}) },
    });
    return response.data;
  },
  hide: async (convId: string | number) => {
    const response = await api.post(`/api/messages/conversations/${convId}/hide`);
    return response.data;
  },
  send: async (convId: string | number, body: string) => {
    const response = await api.post(`/api/messages/conversations/${convId}/messages`, { body });
    return response.data;
  },
  markRead: async (convId: string | number, messageId: number) => {
    const response = await api.post(`/api/messages/conversations/${convId}/read`, { messageId });
    return response.data;
  },
  setFlags: async (convId: string | number, data: { pinned?: boolean; muted?: boolean }) => {
    const response = await api.post(`/api/messages/conversations/${convId}/flags`, data);
    return response.data;
  },
  setFolder: async (convId: string | number, folderId: string | number | null) => {
    const response = await api.post(`/api/messages/conversations/${convId}/folder`, { folderId });
    return response.data;
  },
  folders: async () => {
    const response = await api.get('/api/messages/folders');
    return response.data;
  },
  createFolder: async (name: string) => {
    const response = await api.post('/api/messages/folders', { name });
    return response.data;
  },
  renameFolder: async (id: string | number, name: string) => {
    const response = await api.patch(`/api/messages/folders/${id}`, { name });
    return response.data;
  },
  deleteFolder: async (id: string | number) => {
    const response = await api.delete(`/api/messages/folders/${id}`);
    return response.data;
  },
  unread: async () => {
    const response = await api.get('/api/messages/unread');
    return response.data;
  },
};

export const shopApi = {
  getCategories: async () => {
    const response = await api.get('/api/shop/categories');
    return response.data;
  },
  getProducts: async (params?: { search?: string; category?: number; sort?: string; page?: number; limit?: number }) => {
    const response = await api.get('/api/shop/products', { params });
    return response.data;
  },
  getProduct: async (id: string | number) => {
    const response = await api.get(`/api/shop/products/${id}`);
    return response.data;
  },
  getCheckoutLink: async (items: { id: number; qty: number }[]) => {
    const response = await api.get('/api/shop/checkout-link', {
      params: { items: items.map((i) => `${i.id}:${i.qty}`).join(',') },
    });
    return response.data;
  },
  getCheckoutInfo: async (items: { id: number; qty: number }[]) => {
    const response = await api.get('/api/shop/checkout-info', {
      params: { items: items.map((i) => `${i.id}:${i.qty}`).join(',') },
    });
    return response.data;
  },
  getMyOrders: async () => {
    const response = await api.get('/api/shop/my-orders');
    return response.data;
  },
  createOrder: async (data: {
    items: { id: number; qty: number }[];
    customer_name: string;
    email: string;
    phone?: string;
    delivery_type: string;
    address?: string;
    postcode?: string;
    paczkomat_code?: string;
    payment_method: 'p24' | 'blik' | 'przy_odbiorze';
    notes?: string;
    discount_code?: string;
    terms: boolean;
  }) => {
    const response = await api.post('/api/shop/order', data);
    return response.data;
  },
  validateCode: async (code: string, items: { id: number; qty: number }[]) => {
    const response = await api.post('/api/shop/validate-code', { code, items });
    return response.data;
  },
  checkDelivery: async (address: string, postcode: string) => {
    const response = await api.post('/api/shop/check-delivery', { address, postcode });
    return response.data;
  },
  getPaczkomaty: async (q: string) => {
    const response = await api.get('/api/shop/paczkomaty', { params: { q } });
    return response.data;
  },
};

export const breedingApi = {
  getCycles: async () => {
    const response = await api.get('/api/breeding/cycles');
    return response.data;
  },
  addCycle: async (data: any) => {
    const response = await api.post('/api/breeding/cycles', data);
    return response.data;
  },
  deleteCycle: async (id: string | number) => {
    const response = await api.delete(`/api/breeding/cycles/${id}`);
    return response.data;
  },
  getPregnancies: async () => {
    const response = await api.get('/api/breeding/pregnancies');
    return response.data;
  },
  addPregnancy: async (data: any) => {
    const response = await api.post('/api/breeding/pregnancies', data);
    return response.data;
  },
  updatePregnancy: async (id: string | number, data: any) => {
    const response = await api.patch(`/api/breeding/pregnancies/${id}`, data);
    return response.data;
  },
  deletePregnancy: async (id: string | number) => {
    const response = await api.delete(`/api/breeding/pregnancies/${id}`);
    return response.data;
  },
  getLitters: async () => {
    const response = await api.get('/api/breeding/litters');
    return response.data;
  },
  addLitter: async (data: any) => {
    const response = await api.post('/api/breeding/litters', data);
    return response.data;
  },
  deleteLitter: async (id: string | number) => {
    const response = await api.delete(`/api/breeding/litters/${id}`);
    return response.data;
  },
};

export const notificationsApi = {
  getAll: async () => {
    const response = await api.get('/api/notifications');
    return response.data;
  },
  markRead: async (id: string | number) => {
    const response = await api.post(`/api/notifications/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.post('/api/notifications/read-all');
    return response.data;
  },
  registerDevice: async (token: string, platform: string) => {
    const response = await api.post('/api/notifications/devices', { token, platform });
    return response.data;
  },
  removeDevice: async (token: string) => {
    const response = await api.delete('/api/notifications/devices', { data: { token } });
    return response.data;
  },
};

export type DashboardEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  petId: number;
  petName: string;
  source: 'record' | 'calendar';
  reminder: boolean;
};

export type DashboardSummary = {
  stats: {
    vaccinationsThisMonth: number;
    nextVaccinationDate: string | null;
    upcomingVisits: number;
    nextVisitDate: string | null;
    activeReminders: number;
    overdueReminders: number;
  };
  upcomingEvents: DashboardEvent[];
  minutesByDay: number[];
  checklist: { hasHealthRecord: boolean; hasReminder: boolean };
};

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get('/api/dashboard/summary');
    return response.data;
  },
};

export const herbalAdvisorApi = {
  ask: async (data: { message: string; petId?: string | number; history?: { role: 'user' | 'assistant'; content: string }[] }) => {
    const response = await api.post('/api/herbal-advisor/ask', data);
    return response.data;
  },
};

export const healthRecordApi = {
  getAll: async () => {
    const response = await api.get('/api/health-records');
    return response.data;
  },
  getByPet: async (petId: number) => {
    const response = await api.get(`/api/health-records/pet/${petId}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/health-records', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/health-records/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/health-records/${id}`);
    return response.data;
  },
};

export const calendarApi = {
  getAll: async () => {
    const response = await api.get('/api/health-calendar');
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/health-calendar', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/health-calendar/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/health-calendar/${id}`);
    return response.data;
  },
};

export const userPreferencesApi = {
  get: async (key: string) => {
    const response = await api.get(`/api/user-preferences/${key}`);
    return response.data;
  },
  set: async (key: string, value: any) => {
    const response = await api.put(`/api/user-preferences/${key}`, { value });
    return response.data;
  },
};

export const bloodAnalysisApi = {
  getAll: async (opts?: { silent?: boolean }) => {
    const response = await api.get('/api/blood-analyses', { silentUpgrade: opts?.silent } as any);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/blood-analyses', data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/blood-analyses/${id}`);
    return response.data;
  },
};

export const foodScannerApi = {
  scan: async (barcode: string, petType?: string, petId?: number) => {
    const response = await api.get('/api/food-scanner/scan', { params: { barcode, petType, petId } });
    return response.data;
  },
  analyze: async (data: { ingredients: string; petType?: string; petId?: number }) => {
    const response = await api.post('/api/food-scanner/analyze', data);
    return response.data;
  },
  search: async (q: string, petType?: string) => {
    const response = await api.get('/api/food-scanner/search', { params: { q, petType } });
    return response.data;
  },
};

export const calorieCalculatorApi = {
  getBreeds: async () => {
    const response = await api.get('/api/calorie-calculator/breeds');
    return response.data;
  },
  calculate: async (data: any) => {
    const response = await api.post('/api/calorie-calculator/calculate', data);
    return response.data;
  },
};

export const feedingLogApi = {
  getLogs: async (params?: { petId?: number; date?: string; type?: string; from?: string; to?: string }) => {
    const response = await api.get('/api/feeding-logs', { params });
    return response.data;
  },
  getSummary: async (params: { petId: number; date: string }) => {
    const response = await api.get('/api/feeding-logs/summary', { params });
    return response.data;
  },
  getByPet: async (petId: number) => {
    const response = await api.get(`/api/feeding-logs/pet/${petId}`);
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/feeding-logs/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/feeding-logs', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/feeding-logs/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/feeding-logs/${id}`);
    return response.data;
  },
};

export const specialDietApi = {
  getAll: async (params?: { petId?: number }) => {
    const response = await api.get('/api/special-diets', { params });
    return response.data;
  },
  getByPet: async (petId: number) => {
    const response = await api.get(`/api/special-diets/pet/${petId}`);
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/special-diets/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/special-diets', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/special-diets/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/special-diets/${id}`);
    return response.data;
  },
};

export const recipeApi = {
  getMine: async (params?: { species?: string; category?: string; search?: string }) => {
    const response = await api.get('/api/recipes/mine', { params });
    return response.data;
  },
  getCommunity: async (params?: { species?: string; category?: string; sort?: string; search?: string }) => {
    const response = await api.get('/api/recipes/community', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/recipes/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/api/recipes', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/recipes/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/recipes/${id}`);
    return response.data;
  },
  toggleLike: async (id: number) => {
    const response = await api.post(`/api/recipes/${id}/like`);
    return response.data;
  },
};

export const barfApi = {
  getIngredients: async (params?: { category?: string; species?: string; search?: string; status?: string }) => {
    const response = await api.get('/api/barf/ingredients', { params });
    return response.data;
  },
  calculate: async (data: {
    weightKg: number;
    activityLevel: string;
    ratioModel: string;
    customRatios?: { musclePct: number; bonePct: number; liverPct: number; otherOrganPct: number; vegFruitPct: number };
    mealsPerDay: number;
  }) => {
    const response = await api.post('/api/barf/calculate', data);
    return response.data;
  },
  getPlans: async (petId?: number) => {
    const response = await api.get('/api/barf/plans', { params: petId ? { petId } : undefined });
    return response.data;
  },
  getPlanByPet: async (petId: number) => {
    const response = await api.get(`/api/barf/plans/pet/${petId}`);
    return response.data;
  },
  savePlan: async (data: any) => {
    const response = await api.post('/api/barf/plans', data);
    return response.data;
  },
  deletePlan: async (petId: number) => {
    const response = await api.delete(`/api/barf/plans/pet/${petId}`);
    return response.data;
  },
};

export const specialistApi = {
  getAll: async (params?: { type?: string; species?: string; lat?: number; lng?: number; city?: string; radius?: number }) => {
    const response = await api.get('/api/specialists', { params });
    return response.data;
  },
  getMine: async () => {
    const response = await api.get('/api/specialists/mine');
    return response.data;
  },
  create: async (data: {
    name: string;
    specialistType: string;
    species?: string;
    description?: string;
    phone?: string;
    email?: string;
    website?: string;
    city?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    priceInfo?: string;
  }) => {
    const response = await api.post('/api/specialists', data);
    return response.data;
  },
  getPending: async () => {
    const response = await api.get('/api/specialists/admin/pending');
    return response.data;
  },
  approve: async (id: number) => {
    const response = await api.post(`/api/specialists/${id}/approve`);
    return response.data;
  },
  reject: async (id: number, reason?: string) => {
    const response = await api.post(`/api/specialists/${id}/reject`, { reason });
    return response.data;
  },
  remove: async (id: number) => {
    const response = await api.delete(`/api/specialists/${id}`);
    return response.data;
  },
};

export const sportDietApi = {
  getTemplates: async (species?: string) => {
    const response = await api.get('/api/sport-diets/templates', { params: species ? { species } : undefined });
    return response.data;
  },
  getAssignments: async (petId?: number) => {
    const response = await api.get('/api/sport-diets/assignments', { params: petId ? { petId } : undefined });
    return response.data;
  },
  getByPet: async (petId: number) => {
    const response = await api.get(`/api/sport-diets/pet/${petId}`);
    return response.data;
  },
  assign: async (petId: number, templateId: number) => {
    const response = await api.post('/api/sport-diets/assign', { petId, templateId });
    return response.data;
  },
  unassign: async (petId: number) => {
    const response = await api.delete(`/api/sport-diets/pet/${petId}`);
    return response.data;
  },
};

export const walkApi = {
  getAll: async (params?: { petId?: number }) => {
    const response = await api.get('/api/walks', { params });
    return response.data;
  },
  create: async (data: {
    petId: number;
    startedAt: string;
    durationSeconds: number;
    distanceMeters: number;
    points: { lat: number; lng: number; timestamp: number }[];
  }) => {
    const response = await api.post('/api/walks', data);
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/api/walks/${id}`);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/api/walks/${id}`);
    return response.data;
  },
};

export const placesApi = {
  nearbySearch: async (params: { lat: number; lng: number; radius?: number; type?: string; keyword?: string }) => {
    const response = await api.get('/api/places/nearby', { params });
    return response.data;
  },
  getPlaceDetails: async (placeId: string) => {
    const response = await api.get(`/api/places/details/${placeId}`);
    return response.data;
  },
  autocomplete: async (params: { input: string; location?: string }) => {
    const response = await api.get('/api/places/autocomplete', { params });
    return response.data;
  },
  geocode: async (address: string) => {
    const response = await api.get('/api/places/geocode', { params: { address } });
    return response.data;
  },
};

export const subscriptionApi = {
  getMe: async () => {
    const response = await api.get('/api/subscription/me');
    return response.data;
  },
  startTrial: async (plan: 'family' | 'xl') => {
    const response = await api.post('/api/subscription/trial', { plan });
    return response.data;
  },
  checkout: async (priceKey: 'family_monthly' | 'family_yearly' | 'xl_monthly' | 'xl_yearly') => {
    const response = await api.post('/api/subscription/checkout', { priceKey });
    return response.data as { url: string };
  },
  confirm: async (paymentMethodId: string) => {
    const response = await api.post('/api/subscription/confirm', { paymentMethodId });
    return response.data;
  },
  paylog: (data: { step: string; type?: string; code?: string; message?: string }) => {
    api.post('/api/subscription/paylog', data).catch(() => {});
  },
  paymentSession: async (priceKey: 'family_monthly' | 'family_yearly' | 'xl_monthly' | 'xl_yearly') => {
    const response = await api.post('/api/subscription/payment-session', { priceKey });
    return response.data as {
      clientSecret: string;
      mode: 'payment' | 'setup';
      trial: boolean;
      billing?: { name?: string; email?: string };
    };
  },
  portal: async () => {
    const response = await api.post('/api/subscription/portal');
    return response.data as { url: string };
  },
  cancel: async () => {
    const response = await api.post('/api/subscription/cancel');
    return response.data as { ok: boolean; accessUntil: string | null; alreadyCanceled?: boolean };
  },
  resume: async () => {
    const response = await api.post('/api/subscription/resume');
    return response.data as { ok: boolean; alreadyActive?: boolean };
  },
  history: async () => {
    const response = await api.get('/api/subscription/history');
    return response.data as {
      events: {
        event_type: string;
        plan: string | null;
        billing: string | null;
        source: string | null;
        amount_grosz: number | null;
        currency: string | null;
        note: string | null;
        created_at: string;
      }[];
    };
  },
};

export const adminSubscriptionsApi = {
  stats: async () => (await api.get('/api/admin/subscriptions/stats')).data,
  list: async (params: { search?: string; plan?: string; source?: string; page?: number; limit?: number }) =>
    (await api.get('/api/admin/subscriptions', { params })).data,
  events: async (params: { type?: string; page?: number; limit?: number }) =>
    (await api.get('/api/admin/subscriptions/events', { params })).data,
  grant: async (userId: number, data: { plan: 'family' | 'xl'; days: number; note?: string }) =>
    (await api.post(`/api/admin/subscriptions/${userId}/grant`, data)).data,
  revoke: async (userId: number, note?: string) =>
    (await api.post(`/api/admin/subscriptions/${userId}/revoke`, { note })).data,
};
