import request from 'supertest';

jest.mock('@nurulizyansyaza/courier-service-core', () => ({
  parseInputBlock: jest.fn(),
  estimateCost: jest.fn(),
  estimateDelivery: jest.fn(),
  estimateDetailedDelivery: jest.fn(),
  calculateDeliveryTimeWithTransit: jest.fn(),
  toOfferArray: jest.fn((x: unknown) => x),
  DEFAULT_CALC_OFFERS: { MOCK: true },
}));

import { app } from '../src/app';
import {
  parseInputBlock,
  estimateCost,
  estimateDelivery,
  estimateDetailedDelivery,
  calculateDeliveryTimeWithTransit,
  toOfferArray,
} from '@nurulizyansyaza/courier-service-core';

const mockParseInputBlock = parseInputBlock as jest.MockedFunction<typeof parseInputBlock>;
const mockEstimateCost = estimateCost as jest.MockedFunction<typeof estimateCost>;
const mockEstimateDelivery = estimateDelivery as jest.MockedFunction<typeof estimateDelivery>;
const mockEstimateDetailedDelivery = estimateDetailedDelivery as jest.MockedFunction<typeof estimateDetailedDelivery>;
const mockCalculateTransit = calculateDeliveryTimeWithTransit as jest.MockedFunction<typeof calculateDeliveryTimeWithTransit>;
const mockToOfferArray = toOfferArray as jest.MockedFunction<typeof toOfferArray>;

beforeEach(() => {
  jest.clearAllMocks();
  mockToOfferArray.mockImplementation((x: any) => x);
});

// ─── POST /api/cost ─────────────────────────────────────────────────────────

describe('POST /api/cost (unit)', () => {
  it('returns 400 when input is missing', async () => {
    const res = await request(app).post('/api/cost').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockParseInputBlock).not.toHaveBeenCalled();
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
    mockParseInputBlock.mockReturnValue({
      baseCost: 100,
      packages: [{ id: 'PKG1', weight: 5, distance: 5, offerCode: 'OFR001' }],
    } as any);
    mockEstimateCost.mockReturnValue([
      { id: 'PKG1', discount: 10, cost: 165, extraField: 'should be stripped' },
    ] as any);

    const res = await request(app).post('/api/cost').send({ input: '100 1\nPKG1 5 5 OFR001' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ id: 'PKG1', discount: 10, cost: 165 }]);
    expect(res.body.results[0]).not.toHaveProperty('extraField');
  });

  it('returns 400 with error message when parseInputBlock throws', async () => {
    mockParseInputBlock.mockImplementation(() => {
      throw new Error('Invalid header format');
    });

    const res = await request(app).post('/api/cost').send({ input: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid header format');
  });

  it('maps only id, discount, cost from results', async () => {
    mockParseInputBlock.mockReturnValue({ baseCost: 50, packages: [] } as any);
    mockEstimateCost.mockReturnValue([
      { id: 'A', discount: 0, cost: 100, weight: 5, distance: 10, offerCode: 'X' },
      { id: 'B', discount: 5, cost: 200, weight: 15, distance: 20, offerCode: 'Y' },
    ] as any);

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
    expect(mockParseInputBlock).not.toHaveBeenCalled();
  });

  it('returns 400 when vehicles info is missing from parsed result', async () => {
    mockParseInputBlock.mockReturnValue({
      baseCost: 100,
      packages: [],
      vehicles: undefined,
    } as any);

    const res = await request(app).post('/api/delivery').send({ input: '100 0' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Vehicle/i);
  });

  it('returns 200 with standard results when detailed is not set', async () => {
    mockParseInputBlock.mockReturnValue({
      baseCost: 100,
      packages: [{ id: 'PKG1', weight: 50, distance: 30, offerCode: 'OFR001' }],
      vehicles,
    } as any);
    mockEstimateDelivery.mockReturnValue([
      { id: 'PKG1', discount: 0, cost: 750, time: 0.43, extra: 'strip' },
    ] as any);

    const res = await request(app).post('/api/delivery').send({ input: 'valid' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ id: 'PKG1', discount: 0, cost: 750, time: 0.43 }]);
    expect(mockEstimateDelivery).toHaveBeenCalled();
    expect(mockEstimateDetailedDelivery).not.toHaveBeenCalled();
  });

  it('returns 200 with detailed results when detailed=true (boolean)', async () => {
    mockParseInputBlock.mockReturnValue({
      baseCost: 100,
      packages: [{ id: 'PKG1', weight: 50, distance: 30, offerCode: 'OFR001' }],
      vehicles,
    } as any);
    const detailedResult = [{ id: 'PKG1', vehicleId: 'V1', deliveryRound: 1, deliveryTime: 0.43 }];
    mockEstimateDetailedDelivery.mockReturnValue(detailedResult as any);

    const res = await request(app).post('/api/delivery').send({ input: 'valid', detailed: true });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual(detailedResult);
    expect(mockEstimateDetailedDelivery).toHaveBeenCalled();
    expect(mockEstimateDelivery).not.toHaveBeenCalled();
  });

  it('returns 200 with detailed results when detailed="true" (string)', async () => {
    mockParseInputBlock.mockReturnValue({
      baseCost: 100,
      packages: [],
      vehicles,
    } as any);
    mockEstimateDetailedDelivery.mockReturnValue([] as any);

    const res = await request(app).post('/api/delivery').send({ input: 'valid', detailed: 'true' });

    expect(res.status).toBe(200);
    expect(mockEstimateDetailedDelivery).toHaveBeenCalled();
    expect(mockEstimateDelivery).not.toHaveBeenCalled();
  });

  it('does NOT use detailed when detailed="false"', async () => {
    mockParseInputBlock.mockReturnValue({
      baseCost: 100,
      packages: [],
      vehicles,
    } as any);
    mockEstimateDelivery.mockReturnValue([] as any);

    const res = await request(app).post('/api/delivery').send({ input: 'valid', detailed: 'false' });

    expect(res.status).toBe(200);
    expect(mockEstimateDelivery).toHaveBeenCalled();
    expect(mockEstimateDetailedDelivery).not.toHaveBeenCalled();
  });

  it('does NOT use detailed when detailed=0', async () => {
    mockParseInputBlock.mockReturnValue({
      baseCost: 100,
      packages: [],
      vehicles,
    } as any);
    mockEstimateDelivery.mockReturnValue([] as any);

    const res = await request(app).post('/api/delivery').send({ input: 'valid', detailed: 0 });

    expect(res.status).toBe(200);
    expect(mockEstimateDelivery).toHaveBeenCalled();
    expect(mockEstimateDetailedDelivery).not.toHaveBeenCalled();
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
      { MOCK: true },
    );
  });

  it('defaults to empty array when transitPackages not provided', async () => {
    mockCalculateTransit.mockReturnValue({ output: 'ok' } as any);

    const res = await request(app).post('/api/delivery/transit').send({ input: 'valid' });

    expect(res.status).toBe(200);
    expect(mockCalculateTransit).toHaveBeenCalledWith('valid', [], { MOCK: true });
  });

  it('handles array transitPackages correctly', async () => {
    const pkgs = [
      { id: 'A', weight: 5, distance: 10, offerCode: 'O1' },
      { id: 'B', weight: 15, distance: 20, offerCode: 'O2' },
    ];
    mockCalculateTransit.mockReturnValue({ output: 'ok' } as any);

    const res = await request(app).post('/api/delivery/transit').send({ input: 'valid', transitPackages: pkgs });

    expect(res.status).toBe(200);
    expect(mockCalculateTransit).toHaveBeenCalledWith('valid', pkgs, { MOCK: true });
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
