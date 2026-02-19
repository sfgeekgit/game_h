import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App.js';

vi.mock('../api.js', () => ({
  api: {
    get: vi.fn((path: string) => {
      if (path === '/auth/status') {
        return Promise.resolve({
          authenticated: true,
          userId: 'test-uuid',
          isRegistered: false,
        });
      }
      return Promise.reject(new Error('Not found'));
    }),
    post: vi.fn().mockResolvedValue({}),
  },
}));

describe('App — welcome screen', () => {
  it('renders the game title', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Town Square')).toBeInTheDocument();
    });
  });

  it('shows Play (Frontend) button', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Play (Frontend)')).toBeInTheDocument();
    });
  });

  it('shows Play (Backend) button', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Play (Backend)')).toBeInTheDocument();
    });
  });

  it('shows anonymous player status', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Anonymous player')).toBeInTheDocument();
    });
  });

  it('shows welcome intro text', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/small town square/i)).toBeInTheDocument();
    });
  });
});
