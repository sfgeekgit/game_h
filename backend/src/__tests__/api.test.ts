import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Set env before any imports that need it
process.env.SESSION_SECRET = 'test-secret-for-vitest';

// Mock DB query layer to prevent real MySQL connections
vi.mock('../db/query.js', () => ({
  getPool: vi.fn().mockReturnValue({}),
  query: vi.fn().mockResolvedValue([]),
  closePool: vi.fn().mockResolvedValue(undefined),
}));

// Mock DB helpers
vi.mock('../db/helpers.js', () => ({
  createUser: vi.fn().mockResolvedValue(undefined),
  createPlayer: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue({
    user_id: 'test-uuid',
    email: null,
    password_hash: null,
    created_at: new Date(),
  }),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  registerUser: vi.fn().mockResolvedValue(undefined),
  getPlayerById: vi.fn().mockResolvedValue({
    user_id: 'test-uuid',
    display_name: null,
    points: 100,
    level: 1,
    last_area_id: null,
    last_x: null,
    last_y: null,
    updated_at: new Date(),
  }),
  updatePlayer: vi.fn().mockResolvedValue(undefined),
  updatePlayerPosition: vi.fn().mockResolvedValue(undefined),
  getAreaDefById: vi.fn().mockResolvedValue(null),
  getPersistentArea: vi.fn().mockResolvedValue(null),
  createArea: vi.fn().mockResolvedValue(1),
}));

vi.mock('../db/schema.js', () => ({
  initializeDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Use express-session with MemoryStore to avoid real MySQL session store
vi.mock('../auth/session.js', async () => {
  const session = (await import('express-session')).default;
  return {
    createSessionMiddleware: () =>
      session({ secret: 'test-secret', resave: false, saveUninitialized: false }),
  };
});

// Mock area store and manager
vi.mock('../area/store.js', () => {
  const entities: unknown[] = [];
  return {
    isAreaLoaded: vi.fn().mockReturnValue(true),
    loadArea: vi.fn(),
    readAreaState: vi.fn().mockReturnValue({
      mapId: 'town_square',
      width: 20,
      height: 15,
      tiles: Array.from({ length: 15 }, () =>
        Array.from({ length: 20 }, () => ({ type: 'grass' })),
      ),
      entities,
    }),
    withAreaLock: vi.fn().mockImplementation(
      (_id: number, fn: (state: { entities: unknown[] }) => void) => {
        fn({ entities });
        return Promise.resolve();
      },
    ),
    findPlayerEntity: vi.fn().mockReturnValue({
      id: 'test-uuid',
      type: 'player',
      x: 9,
      y: 9,
      facing: 'south',
    }),
  };
});

vi.mock('../area/manager.js', async () => {
  const { townSquare } = await import('@game_h/shared');
  return {
    getOrCreatePersistentArea: vi.fn().mockResolvedValue(1),
    getMapDef: vi.fn().mockReturnValue(townSquare),
    TOWN_SQUARE_DEF_ID: 1,
    TOWN_SQUARE_MAP_ID: 'town_square',
  };
});

const { createApp } = await import('../app.js');
const app = createApp();

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('GET /api/auth/status', () => {
  it('returns authenticated after anonymous session creation', async () => {
    const agent = request.agent(app);
    const res = await agent.get('/api/auth/status');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.isRegistered).toBe(false);
  });
});

describe('GET /api/player', () => {
  it('returns player data', async () => {
    const agent = request.agent(app);
    const res = await agent.get('/api/player');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('points');
    expect(res.body).toHaveProperty('level');
    expect(res.body).toHaveProperty('userId');
  });
});

describe('POST /api/player/points', () => {
  it('accepts valid numeric amount', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health'); // establish session
    const res = await agent.post('/api/player/points').send({ amount: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('points');
    expect(res.body).toHaveProperty('level');
  });

  it('rejects non-numeric amount', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent.post('/api/player/points').send({ amount: 'abc' });
    expect(res.status).toBe(400);
  });

  it('rejects non-integer amount', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent.post('/api/player/points').send({ amount: 1.5 });
    expect(res.status).toBe(400);
  });

  it('rejects out-of-range amount', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent.post('/api/player/points').send({ amount: 999999 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/register', () => {
  it('rejects without email', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent.post('/api/auth/register').send({ password: 'longpassword' });
    expect(res.status).toBe(400);
  });

  it('rejects without password', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent.post('/api/auth/register').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email format', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'notanemail', password: 'longpassword' });
    expect(res.status).toBe(400);
  });

  it('accepts valid registration', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'longpassword' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/auth/logout', () => {
  it('succeeds', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/text/:file', () => {
  it('returns welcome text', async () => {
    const res = await request(app).get('/api/text/welcome');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('subtitle');
    expect(res.body).toHaveProperty('intro');
  });

  it('returns ui text', async () => {
    const res = await request(app).get('/api/text/ui');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('buttons');
    expect(res.body).toHaveProperty('labels');
  });

  it('returns 404 for unknown file', async () => {
    const res = await request(app).get('/api/text/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 404 for path traversal attempt', async () => {
    const res = await request(app).get('/api/text/..%2F..%2Fetc%2Fpasswd');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/area/map', () => {
  it('returns town square map def', async () => {
    const res = await request(app).get('/api/area/map');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'town_square');
    expect(res.body).toHaveProperty('width', 20);
    expect(res.body).toHaveProperty('height', 15);
    expect(res.body).toHaveProperty('tiles');
    expect(res.body.tiles).toHaveLength(15);
    expect(res.body.tiles[0]).toHaveLength(20);
  });
});

describe('POST /api/area/join', () => {
  it('joins the area and returns state', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health'); // establish anonymous session
    const res = await agent.post('/api/area/join');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('areaId');
    expect(res.body).toHaveProperty('state');
    expect(res.body.state).toHaveProperty('tiles');
  });
});

describe('POST /api/area/move', () => {
  it('rejects invalid direction', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    await agent.post('/api/area/join');
    const res = await agent.post('/api/area/move').send({ direction: 'up' });
    expect(res.status).toBe(400);
  });

  it('rejects missing direction', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    await agent.post('/api/area/join');
    const res = await agent.post('/api/area/move').send({});
    expect(res.status).toBe(400);
  });

  it('accepts valid direction and returns move result', async () => {
    const agent = request.agent(app);
    await agent.get('/api/health');
    await agent.post('/api/area/join');
    const res = await agent.post('/api/area/move').send({ direction: 'north' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('moveResult');
    expect(res.body).toHaveProperty('state');
    expect(res.body.moveResult).toHaveProperty('newX');
    expect(res.body.moveResult).toHaveProperty('newY');
    expect(res.body.moveResult).toHaveProperty('newFacing');
  });
});
