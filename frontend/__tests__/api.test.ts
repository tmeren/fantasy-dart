/**
 * API Client Tests
 *
 * Note: `api` is a module-level singleton. We must carefully reset
 * its internal token state between tests using `api.logout()`.
 */

// Mock fetch globally BEFORE importing api
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage with a proper store
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: jest.fn((key: string) => { delete store[key]; }),
  clear: jest.fn(() => { store = {}; }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Import after mocks are set up
import { api } from '../lib/api';

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    store = {};
    api.logout(); // Clears internal this.token + removes from localStorage
  });

  describe('token management', () => {
    it('stores token in localStorage on setToken', () => {
      api.setToken('test-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
    });

    it('removes token from localStorage on setToken(null)', () => {
      api.setToken(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('reads token from localStorage when no cached token', () => {
      // Directly put token in store (simulating a token from a previous page load)
      store['auth_token'] = 'stored-token';
      // getToken should read from localStorage since internal cache is null
      const token = api.getToken();
      expect(token).toBe('stored-token');
    });

    it('logout clears token', () => {
      api.setToken('test-token');
      api.logout();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      // Verify internal state is cleared
      expect(api.getToken()).toBeNull();
    });
  });

  describe('fetch wrapper', () => {
    it('sends Authorization header when token is set', async () => {
      api.setToken('my-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, email: 'test@test.com' }),
      });

      await api.getMe();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('does not send Authorization header when no token', async () => {
      // Ensure clean state (already done in beforeEach, but explicit)
      api.logout();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await api.getMarkets();

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('throws on non-ok response with error detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Not found' }),
      });

      await expect(api.getMarkets()).rejects.toThrow('Not found');
    });

    it('throws generic message when error response has no detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error('parse error'); },
      });

      await expect(api.getMarkets()).rejects.toThrow('Unknown error');
    });
  });

  describe('auth methods', () => {
    it('login stores the returned token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'login-token-123' }),
      });

      const result = await api.login('user@test.com');
      expect(result.access_token).toBe('login-token-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'login-token-123');
    });

    it('register stores the returned token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'register-token-456' }),
      });

      const result = await api.register('user@test.com', 'Test User');
      expect(result.access_token).toBe('register-token-456');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'register-token-456');
    });

    it('login sends POST with email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok' }),
      });

      await api.login('user@test.com');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'user@test.com' }),
        }),
      );
    });
  });

  describe('market methods', () => {
    it('getMarkets fetches without params when no status', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      await api.getMarkets();
      expect(mockFetch).toHaveBeenCalledWith('/api/markets', expect.any(Object));
    });

    it('getMarkets includes status param', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      await api.getMarkets('open');
      expect(mockFetch).toHaveBeenCalledWith('/api/markets?status=open', expect.any(Object));
    });

    it('getMarket fetches by ID', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 5 }) });
      const market = await api.getMarket(5);
      expect(market.id).toBe(5);
      expect(mockFetch).toHaveBeenCalledWith('/api/markets/5', expect.any(Object));
    });
  });

  describe('bet methods', () => {
    it('placeBet sends POST with selection and stake', async () => {
      api.setToken('tok');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, stake: 50 }),
      });

      await api.placeBet(10, 50);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/bets',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ selection_id: 10, stake: 50 }),
        }),
      );
    });
  });
});
