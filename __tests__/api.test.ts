import request from 'supertest';
import { app } from '../src/app';

describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/cost', () => {
  describe('Given valid cost input', () => {
    it('should return cost results for each package', async () => {
      const res = await request(app)
        .post('/api/cost')
        .send({ input: '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003' });

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0]).toEqual({ id: 'PKG1', discount: 0, cost: 175 });
      expect(res.body.results[1]).toEqual({ id: 'PKG2', discount: 0, cost: 275 });
      expect(res.body.results[2]).toEqual({ id: 'PKG3', discount: 35, cost: 665 });
    });
  });

  describe('Given missing input field', () => {
    it('should return 400', async () => {
      const res = await request(app).post('/api/cost').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Given malformed input', () => {
    it('should return 400 with error message', async () => {
      const res = await request(app)
        .post('/api/cost')
        .send({ input: 'bad input' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});

describe('POST /api/delivery', () => {
  describe('Given valid delivery input', () => {
    it('should return detailed delivery results', async () => {
      const input = '100 5\nPKG1 50 30 OFR001\nPKG2 75 125 OFR008\nPKG3 175 100 OFR003\nPKG4 110 60 OFR002\nPKG5 155 95 NA\n2 70 200';
      const res = await request(app)
        .post('/api/delivery')
        .send({ input });

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(5);
      // Results are returned in delivery round order (not input order)
      expect(res.body.results[0].id).toBe('PKG4');
      expect(res.body.results[0].discount).toBe(105);
      expect(res.body.results[0].totalCost).toBe(1395);
      expect(res.body.results[0].deliveryTime).toBeCloseTo(0.85, 2);
      expect(res.body.results[0]).toHaveProperty('vehicleId');
      expect(res.body.results[0]).toHaveProperty('deliveryRound');
      expect(res.body.results[4].id).toBe('PKG1');
      expect(res.body.results[4].discount).toBe(0);
      expect(res.body.results[4].totalCost).toBe(750);
      expect(res.body.results[4].deliveryTime).toBeCloseTo(4.0, 2);
    });
  });

  describe('Given undeliverable package', () => {
    it('should mark it as undeliverable', async () => {
      const input = '100 1\nPKG1 300 100 OFR001\n1 70 200';
      const res = await request(app)
        .post('/api/delivery')
        .send({ input });

      expect(res.status).toBe(200);
      expect(res.body.results[0].undeliverable).toBe(true);
      expect(res.body.results[0].undeliverableReason).toBeDefined();
    });
  });

  describe('Given missing input', () => {
    it('should return 400', async () => {
      const res = await request(app).post('/api/delivery').send({});
      expect(res.status).toBe(400);
    });
  });
});

describe('POST /api/delivery/transit', () => {
  describe('Given input with transit packages', () => {
    it('should merge transit packages and return transit-aware result', async () => {
      const input = '100 1\nPKG1 50 30 OFR001\n2 70 200';
      const transitPackages = [
        { id: 'PKG2', weight: 30, distance: 80, offerCode: 'OFR003' },
      ];
      const res = await request(app)
        .post('/api/delivery/transit')
        .send({ input, transitPackages });

      expect(res.status).toBe(200);
      expect(res.body.output).toBeDefined();
      expect(res.body.clearedFromTransit).toHaveLength(1);
      expect(res.body.stillInTransit).toHaveLength(0);
    });
  });

  describe('Given input with conflicting transit IDs', () => {
    it('should rename conflicting packages', async () => {
      const input = '100 1\nPKG1 50 30 OFR001\n2 70 200';
      const transitPackages = [
        { id: 'PKG1', weight: 30, distance: 80, offerCode: 'OFR003' },
      ];
      const res = await request(app)
        .post('/api/delivery/transit')
        .send({ input, transitPackages });

      expect(res.status).toBe(200);
      expect(res.body.renamedPackages).toHaveLength(1);
      expect(res.body.renamedPackages[0].oldId).toBe('PKG1');
    });
  });

  describe('Given no transit packages', () => {
    it('should work like regular delivery', async () => {
      const input = '100 1\nPKG1 50 30 OFR001\n1 70 200';
      const res = await request(app)
        .post('/api/delivery/transit')
        .send({ input });

      expect(res.status).toBe(200);
      expect(res.body.output).toBeDefined();
      expect(res.body.newTransitPackages).toHaveLength(0);
    });
  });
});
