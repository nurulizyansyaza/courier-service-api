import request from 'supertest';

jest.mock('@nurulizyansyaza/courier-service-core', () => ({
  parseInput: jest.fn(),
  calculatePackageCost: jest.fn(),
  computeDeliveryResultsFromParsed: jest.fn(),
  calculateDeliveryTimeWithTransit: jest.fn(),
  setOffers: jest.fn(),
  getOffers: jest.fn(() => ({})),
  getOffersRef: jest.fn(() => ({})),
}));

import { app } from '../src/app';
import {
  parseInput,
  calculatePackageCost,
  computeDeliveryResultsFromParsed,
  calculateDeliveryTimeWithTransit,
} from '@nurulizyansyaza/courier-service-core';

const mockParseInput = parseInput as jest.MockedFunction<typeof parseInput>;
const mockCalculatePackageCost = calculatePackageCost as jest.MockedFunction<typeof calculatePackageCost>;
const mockComputeDeliveryResults = computeDeliveryResultsFromParsed as jest.MockedFunction<typeof computeDeliveryResultsFromParsed>;
const mockCalculateTransit = calculateDeliveryTimeWithTransit as jest.MockedFunction<typeof calculateDeliveryTimeWithTransit>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /api/cost ─────────────────────────────────────────────────────────

describe('POST /api/cost (unit)', () => {
  it('returns 400 when input is missing', async () => {
    const res = await request(app).post('/api/cost').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockParseInput).not.toHaveBeenCalled();
  });

  it('returns 400 when input is not a string (number)', async () => {
    const res = await request(app).post('/api/cost').send({ input: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when input is null', async () => {
    const res = await request(app).post('/api/cost').send({ input: null });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when input is empty string', async () => {
    const res = await request(app).post('/api/cost').send({ input: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 200 with correctly mapped results on valid input', async () => {
    mockParseInput.mockReturnValue({
      baseCost: 100,
      packages: [{ id: 'PKG1', weight: 5, distance: 5, offerCode: 'OFR001' }],
    });
    mockCalculatePackageCost.mockReturnValue({
      discount: 10, totalCost: 165, deliveryCost: 175,
    });

    const res = await request(app).post('/api/cost').send({ input: '100 1\nPKG1 5 5 OFR001' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ id: 'PKG1', discount: 10, cost: 165 }]);
  });

  it('returns 400 with error message when parseInput throws', async () => {
    mockParseInput.mockImplementation(() => {
      throw new Error('Invalid header format');
    });

    const res = await request(app).post('/api/cost').send({ input: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid header format');
  });

  it('maps only id, discount, cost from results', async () => {
    mockParseInput.mockReturnValue({
      baseCost: 50,
      packages: [
        { id: 'A', weight: 5, distance: 10, offerCode: 'X' },
        { id: 'B', weight: 15, distance: 20, offerCode: 'Y' },
      ],
    });
    mockCalculatePackageCost
      .mockReturnValueOnce({ discount: 0, totalCost: 100, deliveryCost: 100 })
      .mockReturnValueOnce({ discount: 5, totalCost: 200, deliveryCost: 205 });

    const res = await request(app).post('/api/cost').send({ input: 'valid input' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { id: 'A', discount: 0, cost: 100 },
      { id: 'B', discount: 5, cost: 200 },
    ]);
    for (const r of res.body.results) {
      expect(Object.keys(r)).toEqual(['id', 'discount', 'cost']);
    }
  });
});

// ─── POST /api/delivery ─────────────────────────────────────────────────────

describe('POST /api/delivery (unit)', () => {
  const vehicles = { count: 2, maxSpeed: 70, maxWeight: 200 };

  it('returns 400 when input is missing', async () => {
    const res = await request(app).post('/api/delivery').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockParseInput).not.toHaveBeenCalled();
  });

  it('returns 400 when vehicles info is missing from parsed result', async () => {
    mockParseInput.mockReturnValue({
      baseCost: 100,
      packages: [],
      vehicles: undefined,
    });

    const res = await request(app).post('/api/delivery').send({ input: '100 0' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Vehicle/i);
  });

  it('returns 200 with detailed results', async () => {
    mockParseInput.mockReturnValue({
      baseCost: 100,
      packages: [{ id: 'PKG1', weight: 50, distance: 30, offerCode: 'OFR001' }],
      vehicles,
    });
    const detailedResult = [
      { id: 'PKG1', discount: 0, totalCost: 750, deliveryTime: 0.43, vehicleId: 1, deliveryRound: 1 },
    ];
    mockComputeDeliveryResults.mockReturnValue(detailedResult as any);

    const res = await request(app).post('/api/delivery').send({ input: 'valid' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual(detailedResult);
    expect(mockComputeDeliveryResults).toHaveBeenCalledWith(100, expect.any(Array), vehicles);
  });

  it('handles parseInput errors', async () => {
    mockParseInput.mockImplementation(() => {
      throw new Error('Parse error');
    });

    const res = await request(app).post('/api/delivery').send({ input: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Parse error');
  });
});

// ─── POST /api/delivery/transit ─────────────────────────────────────────────

describe('POST /api/delivery/transit (unit)', () => {
  it('returns 400 when input is missing', async () => {
    const res = await request(app).post('/api/delivery/transit').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockCalculateTransit).not.toHaveBeenCalled();
  });

  it('returns 200 with transit result on valid input', async () => {
    const transitResult = { output: 'some output', clearedFromTransit: [], stillInTransit: [] };
    mockCalculateTransit.mockReturnValue(transitResult as any);

    const res = await request(app)
      .post('/api/delivery/transit')
      .send({ input: 'valid', transitPackages: [{ id: 'T1', weight: 10, distance: 20, offerCode: 'X' }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(transitResult);
    expect(mockCalculateTransit).toHaveBeenCalledWith(
      'valid',
      [{ id: 'T1', weight: 10, distance: 20, offerCode: 'X' }],
    );
  });

  it('defaults to empty array when transitPackages not provided', async () => {
    mockCalculateTransit.mockReturnValue({ output: 'ok' } as any);

    const res = await request(app).post('/api/delivery/transit').send({ input: 'valid' });

    expect(res.status).toBe(200);
    expect(mockCalculateTransit).toHaveBeenCalledWith('valid', []);
  });

  it('handles array transitPackages correctly', async () => {
    const pkgs = [
      { id: 'A', weight: 5, distance: 10, offerCode: 'O1' },
      { id: 'B', weight: 15, distance: 20, offerCode: 'O2' },
    ];
    mockCalculateTransit.mockReturnValue({ output: 'ok' } as any);

    const res = await request(app).post('/api/delivery/transit').send({ input: 'valid', transitPackages: pkgs });

    expect(res.status).toBe(200);
    expect(mockCalculateTransit).toHaveBeenCalledWith('valid', pkgs);
  });

  it('returns 400 when transitPackages has invalid items', async () => {
    const res = await request(app)
      .post('/api/delivery/transit')
      .send({ input: 'valid', transitPackages: [{ id: '', weight: -1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ─── Security middleware ────────────────────────────────────────────────────

describe('Security middleware', () => {
  it('returns security headers from helmet', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('returns CORS headers for allowed origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
