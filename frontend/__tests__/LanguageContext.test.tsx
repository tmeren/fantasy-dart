import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider, useLanguage, LanguageToggle } from '../lib/LanguageContext';
import { ReactNode } from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const wrapper = ({ children }: { children: ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe('LanguageContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('useLanguage', () => {
    it('throws when used outside provider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useLanguage());
      }).toThrow('useLanguage must be used within LanguageProvider');
      spy.mockRestore();
    });

    it('defaults to English locale', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });
      expect(result.current.locale).toBe('en');
    });

    it('setLocale changes the locale', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });
      act(() => { result.current.setLocale('tr'); });
      expect(result.current.locale).toBe('tr');
    });

    it('setLocale persists to localStorage', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });
      act(() => { result.current.setLocale('tr'); });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('locale', 'tr');
    });

    it('t() returns a translated string', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper });
      // t should return a string for any valid key
      const translated = result.current.t('nav.brand' as any);
      expect(typeof translated).toBe('string');
      expect(translated.length).toBeGreaterThan(0);
    });
  });

  describe('LanguageToggle', () => {
    it('renders EN/TR toggle button', () => {
      render(
        <LanguageProvider>
          <LanguageToggle />
        </LanguageProvider>
      );
      expect(screen.getByText('EN')).toBeInTheDocument();
      expect(screen.getByText('TR')).toBeInTheDocument();
    });

    it('toggles locale on click', () => {
      // Render a test component that shows locale
      function TestComp() {
        const { locale } = useLanguage();
        return (
          <div>
            <span data-testid="locale">{locale}</span>
            <LanguageToggle />
          </div>
        );
      }

      render(
        <LanguageProvider>
          <TestComp />
        </LanguageProvider>
      );

      expect(screen.getByTestId('locale').textContent).toBe('en');
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('locale').textContent).toBe('tr');
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('locale').textContent).toBe('en');
    });
  });
});
