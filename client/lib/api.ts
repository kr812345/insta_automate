import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = Cookies.get('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          Cookies.remove('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      },
    );
  }

  // Auth
  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    if (data.access_token) {
      Cookies.set('token', data.access_token, { expires: 7 });
    }
    return data;
  }

  async register(email: string, password: string, name?: string) {
    const { data } = await this.client.post('/auth/register', { email, password, name });
    if (data.access_token) {
      Cookies.set('token', data.access_token, { expires: 7 });
    }
    return data;
  }

  async getProfile() {
    const { data } = await this.client.get('/auth/profile');
    return data;
  }

  async getInstagramOAuthUrl() {
    const { data } = await this.client.get('/auth/instagram/oauth-url');
    return data.url;
  }

  // Social Accounts
  async getAccounts() {
    const { data } = await this.client.get('/accounts');
    return data;
  }

  async connectInstagram(code: string) {
    const { data } = await this.client.post('/accounts/instagram/connect', { code });
    return data;
  }

  async disconnectAccount(accountId: string) {
    const { data } = await this.client.delete(`/accounts/${accountId}`);
    return data;
  }

  // Posts
  async getPosts(status?: string) {
    const { data } = await this.client.get('/posts', { params: { status } });
    return data;
  }

  async getPost(postId: string) {
    const { data } = await this.client.get(`/posts/${postId}`);
    return data;
  }

  async createPost(post: {
    socialAccountId: string;
    postType: 'IMAGE' | 'CAROUSEL' | 'REEL';
    caption?: string;
    scheduledAt: string;
    mediaAssetIds: string[];
  }) {
    const { data } = await this.client.post('/posts', post);
    return data;
  }

  async updatePost(postId: string, updates: { caption?: string; scheduledAt?: string }) {
    const { data } = await this.client.put(`/posts/${postId}`, updates);
    return data;
  }

  async deletePost(postId: string) {
    const { data } = await this.client.delete(`/posts/${postId}`);
    return data;
  }

  async retryPost(postId: string) {
    const { data } = await this.client.post(`/posts/${postId}/retry`);
    return data;
  }

  // Media
  async uploadMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await this.client.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }

  async deleteMedia(mediaId: string) {
    const { data } = await this.client.delete(`/media/${mediaId}`);
    return data;
  }

  logout() {
    Cookies.remove('token');
    window.location.href = '/login';
  }
}

export const api = new ApiClient();

