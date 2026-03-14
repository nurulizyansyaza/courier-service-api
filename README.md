# @nurulizyansyaza/courier-service-api

Express REST API for the **Courier Service** App Calculator. Wraps the core library with HTTP endpoints, security middleware, input validation, and rate limiting.

## Setup

```bash
npm install
npm run build   # compile TypeScript to dist/
```

Requires [`courier-service-core`](https://github.com/nurulizyansyaza/courier-service-core) to be built and available as a sibling directory (linked via `file:../courier-service-core`).

## Usage

```bash
# Development (ts-node)
npm run dev

# Production
npm start       # runs dist/index.js
```

Server starts on `http://localhost:3000` (override with `PORT` env variable).

## API Endpoints

### `GET /api/health`

Health check. Returns `{ "status": "ok" }`.

### `POST /api/cost`

Calculate delivery cost with offer discounts.

```json
// Request
{ "input": "100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003" }

// Response
{ "results": [{ "id": "PKG1", "discount": 0, "cost": 175 }, ...] }
```

### `POST /api/delivery`

Calculate delivery time estimation.

```json
// Request
{ "input": "100 5\nPKG1 50 30 OFR001\n...\n2 70 200", "detailed": false }

// Response
{ "results": [{ "id": "PKG1", "discount": 0, "cost": 750, "time": 3.98 }, ...] }
```

Set `"detailed": true` for vehicle assignment details.

### `POST /api/delivery/transit`

Calculate delivery time with transit package tracking.

```json
// Request
{ "input": "...", "transitPackages": [{ "id": "T1", "weight": 10, "distance": 20, "offerCode": "X" }] }
```

## Security Middleware

All requests pass through:

| Middleware | Purpose |
|-----------|---------|
| **Helmet** | Security headers (X-Content-Type-Options, X-Frame-Options, etc.) |
| **CORS** | Restricts origins to `localhost:5173` (Vite dev) and `localhost:3000` |
| **Rate Limiter** | Global: 100 requests / 15 min. Calculation endpoints: 30 requests / min |
| **Morgan** | HTTP request logging |
| **Body Limit** | JSON body capped at 10kb |
| **Zod Validation** | Schema-based input validation on all POST endpoints |

## Testing

```bash
npm test
```

- **Unit tests** — mocked core library, tests route logic and validation
- **Integration tests** — real core library, end-to-end calculations via supertest

## Project Structure

```
src/
  app.ts                  # Express app setup with middleware stack
  index.ts                # Server entry point
  middleware/
    security.ts           # helmet, cors, rate-limit, morgan config
    validation.ts         # Zod schemas + validate() middleware
  routes/
    cost.ts               # POST /api/cost
    delivery.ts           # POST /api/delivery, POST /api/delivery/transit
__tests__/
  routes.unit.test.ts     # Unit tests with mocked core
  api.test.ts             # Integration tests
```
