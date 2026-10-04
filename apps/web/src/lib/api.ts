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
      window.location.href = '/login';
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

export const healthRecordApi = {
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

export const foodScannerApi = {
  scan: async (barcode: string, petType?: string, petId?: number) => {
    const response = await api.get('/api/food-scanner/scan', { params: { barcode, petType, petId } });
    return response.data;
  },
  analyze: async (data: { ingredients: string; petType?: string; petId?: number }) => {
    const response = await api.post('/api/food-scanner/analyze', data);
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
  getMine: async (params?: { species?: string; category?: string }) => {
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
  getAll: async (params?: { type?: string; species?: string; lat?: number; lng?: number; city?: string }) => {
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

export const placesApi = {
  nearbySearch: async (params: { lat: number; lng: number; radius?: number; type?: string }) => {
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
};
