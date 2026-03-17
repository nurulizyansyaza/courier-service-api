# @nurulizyansyaza/courier-service-api

Express REST API for the **Courier Service** App Calculator. Wraps the core library with HTTP endpoints, security middleware, input validation and rate limiting.

## Setup

### Prerequisites

- **Node.js** 18 or 20 — check with `node --version`
- **npm** — check with `npm --version`
- **courier-service-core** must be built first (see below)

### Step 1 — Build the core library first

The API depends on the core library. If you haven't built it yet:

```bash
cd courier-service-core
npm install
npm run build
cd ..
```

### Step 2 — Install dependencies

```bash
cd courier-service-api
npm install
```

### Step 3 — Build the API

```bash
npm run build
```

This compiles TypeScript to `dist/`.

### Step 4 — Start the API

```bash
# Development mode (auto-reloads on change)
npm run dev

# Or production mode (runs compiled JS)
npm start
```

The server starts on `http://localhost:3000` (override with `PORT` env variable).

### Step 5 — Check it's working

Open a **new terminal** and run:

```bash
curl http://localhost:3000/api/health
```

You should see: `{"status":"ok"}`

### Step 6 — Run the tests

```bash
npm test
```

You should see all **33 tests** pass across **2 test suites**.

> On `SIGTERM`/`SIGINT`, the server shuts down gracefully — in-flight requests complete before the process exits.

## API Endpoints

### `GET /api/health`

Health check. Returns `{ "status": "ok" }`.

### `POST /api/cost`

Calculate delivery cost with offer discounts.

```json
// Request
{ "input": "100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003" }

// Response (200)
{
  "results": [
    { "id": "PKG1", "discount": 0, "cost": 175 },
    { "id": "PKG2", "discount": 0, "cost": 275 },
    { "id": "PKG3", "discount": 35, "cost": 665 }
  ]
}
```

### `POST /api/delivery`

Calculate delivery time estimation.

```json
// Request
{
  "input": "100 5\nPKG1 50 30 OFR001\nPKG2 75 125 NA\nPKG3 175 100 OFR003\nPKG4 110 60 OFR002\nPKG5 155 95 NA\n2 70 200"
}

// Response (200) — always returns detailed results with vehicle assignment
{
  "results": [
    { "id": "PKG1", "discount": 0, "totalCost": 750, "deliveryTime": 4.00, "deliveryRound": 4, "vehicleId": 1, ... },
    { "id": "PKG2", "discount": 0, "totalCost": 1475, "deliveryTime": 1.78, "deliveryRound": 1, "vehicleId": 1, ... },
    { "id": "PKG3", "discount": 0, "totalCost": 2350, "deliveryTime": 1.42, "deliveryRound": 2, "vehicleId": 2, ... },
    { "id": "PKG4", "discount": 105, "totalCost": 1395, "deliveryTime": 0.85, "deliveryRound": 1, "vehicleId": 1, ... },
    { "id": "PKG5", "discount": 0, "totalCost": 2125, "deliveryTime": 4.21, "deliveryRound": 3, "vehicleId": 2, ... }
  ]
}
```

### `POST /api/delivery/transit`

Calculate delivery time with transit package tracking.

```json
// Request
{
  "input": "100 1\nPKG1 50 30 OFR001\n2 70 200",
  "transitPackages": [
    { "id": "PKG2", "weight": 30, "distance": 80, "offerCode": "OFR003" }
  ]
}

// Response (200)
{
  "output": "PKG1 0 750 0.42\nPKG2 0 630 1.14",
  "results": [
    {
      "vehicleId": 1, "deliveryRound": 1, "packagesRemaining": 0,
      "currentTime": 0.42, "vehicleReturnTime": 0.85, "roundTripTime": 0.85,
      "baseCost": 100, "weight": 50, "distance": 30, "offerCode": "OFR001",
      "deliveryCost": 750, "undeliverable": false
    },
    {
      "vehicleId": 1, "deliveryRound": 2, "packagesRemaining": 0,
      "currentTime": 1.14, "vehicleReturnTime": 2.28, "roundTripTime": 2.28,
      "baseCost": 100, "weight": 30, "distance": 80, "offerCode": "OFR003",
      "deliveryCost": 630, "undeliverable": false
    }
  ],
  "newTransitPackages": [],
  "clearedFromTransit": [{ "id": "PKG2", "weight": 30, "distance": 80, "offerCode": "OFR003" }],
  "stillInTransit": [],
  "renamedPackages": []
}
```

### Error Responses

All endpoints return `400` with an `error` field for invalid input. The parser collects **all** errors and returns them together (newline-separated):

```json
// Request
{ "input": "abc xyz\nBAD -5 abc WRONG" }

// Response (400)
{
  "error": "Line 1: Base cost \"abc\" must be a number\nLine 1: Package count \"xyz\" must be a whole number\nLine 2: Invalid package ID \"BAD\": Must be \"PKG\" followed by digits (e.g., PKG1, pkg2)\nLine 2: Invalid weight \"-5\": Must be a number\nLine 2: Invalid distance \"abc\": Must be a number\nLine 2: Invalid offer code \"WRONG\": Must be one of: OFR001/OFR002/OFR003, NA (case-insensitive)"
}
```

## Request Flow

```mermaid
sequenceDiagram
    participant Client as Client
    participant MW as Middleware Stack
    participant Route as Route Handler
    participant Core as @courier-service-core

    Client->>MW: POST /api/cost
    MW->>MW: Helmet (security headers)
    MW->>MW: CORS (origin check)
    MW->>MW: Rate Limiter (100/15min)
    MW->>MW: Morgan (log request)
    MW->>Route: Validated request
    Route->>Route: Zod schema validation
    Route->>Core: calculatePackageCost()
    Core-->>Route: Results
    Route-->>Client: JSON response
```

## Security Middleware

All requests pass through:

| Middleware | Purpose |
|-----------|---------|
| **Helmet** | Security headers (X-Content-Type-Options, X-Frame-Options, etc.) |
| **CORS** | Restricts origins to `localhost:5173`, `localhost:3000`, and `CLOUDFRONT_DOMAIN` env var |
| **Rate Limiter** | Global: 100 requests / 15 min. Calculation endpoints: 30 requests / min |
| **Morgan** | HTTP request logging |
| **Body Limit** | JSON body capped at 10kb |
| **Zod Validation** | Schema-based input validation on all POST endpoints |

## Testing

```bash
npm test
```

You should see all **33 tests** pass across **2 test suites**:

- **Unit tests** (`routes.unit.test.ts`) — mocked core library, tests route logic, validation, and error handling (18 tests)
- **Integration tests** (`api.test.ts`) — real core library, end-to-end calculations via supertest (15 tests)

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`:

1. **Test** — checks out `courier-service-core`, builds it, then runs API tests on Node 18 + 20
2. **Trigger Staging Deploy** — on push to `main`, triggers a staging deploy on [`courier-service`](https://github.com/nurulizyansyaza/courier-service), which triggers the staging deployment pipeline

Requires a `DEPLOY_TRIGGER_TOKEN` secret (fine-grained PAT with Actions + Contents write access on the `courier-service` repo).

## API Testing with Bruno

A [Bruno](https://www.usebruno.com/) collection is included in [`bruno/`](https://github.com/nurulizyansyaza/courier-service-api/tree/main/bruno) for manual and interactive API testing.

### How to set up Bruno

1. **Download and install Bruno** from [usebruno.com/downloads](https://www.usebruno.com/downloads) (or run `brew install bruno` on macOS)
2. **Open Bruno** on your machine
3. **Click "Open Collection"** in Bruno
4. **Navigate to** the `bruno/` folder inside this repository and select it
5. **Select an environment** — click the environment dropdown at the **top right corner** and choose **Local**

> **Important:** Make sure the API is running (`npm run dev`) before sending requests with the **Local** environment.

### Environments

| Environment | Base URL | When to use |
|---|---|---|
| **Local** | `http://localhost:3000` | When running the API locally with `npm run dev` |
| **Staging** | `https://d28gbmf77bx81u.cloudfront.net` | Test against the staging deployment |
| **Production** | `https://d31r5a2wvtwynh.cloudfront.net` | Test against the production deployment |

> Staging and Production environments also include an `apiGatewayUrl` variable for testing the API Gateway endpoint directly, bypassing CloudFront.

### How to run requests

- **Run a single request** — click any request in the sidebar, then click **Send** (or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd>)
- **Run all requests in a folder** — right-click a folder (e.g. `cost`) and select **Run All Requests** to execute all requests with assertions
- **Switch environment** — use the dropdown at the top right to test against Local, Staging or Production

### Collection structure

```
bruno/
├── environments/
│   ├── Local.bru               # localhost:3000
│   ├── Staging.bru             # CloudFront staging
│   └── Production.bru          # CloudFront production
├── health/
│   └── Health Check            # GET  /api/health
├── cost/
│   ├── Calculate Cost - Multiple Packages    # POST /api/cost (3 packages)
│   ├── Calculate Cost - Single Package       # POST /api/cost (1 package)
│   ├── Calculate Cost - With Discount        # POST /api/cost (OFR003 verified)
│   ├── Validation - Missing Input            # 400: empty body
│   ├── Validation - Empty Input              # 400: empty string
│   └── Validation - Malformed Input          # 400: unparseable
├── cost-validation/
│   ├── Header - Non-Numeric Base Cost        # 400: abc as base cost
│   ├── Header - Non-Numeric Package Count    # 400: abc as count
│   ├── Header - Extra Fields                 # 400: 3 values instead of 2
│   ├── Header - Decimal Package Count        # 400: 2.5 as count
│   ├── Package - Invalid ID With Hyphen      # 400: -pkg1, PKG-1
│   ├── Package - Space In Package ID         # 400: PKG 1 → PKG1
│   ├── Package - Space In Offer Code         # 400: OFR 001 → OFR001
│   ├── Package - Non-Numeric Weight          # 400: abc / 5kg
│   ├── Package - Non-Numeric Distance        # 400: 10km
│   ├── Package - Invalid Offer Code          # 400: BADCODE
│   ├── Package - Offer Code With Hyphen      # 400: OFR-001
│   ├── Package - Non-Incremental IDs         # 400: PKG1, PKG3
│   ├── Package - Duplicate IDs               # 400: PKG1, PKG1
│   ├── Multi-Error - All Errors At Once      # 400: 6 errors in one response
│   ├── Multi-Error - Multiple Package Lines  # 400: errors across 3 lines
│   └── Case - Lowercase Input Accepted       # 200: pkg1/ofr001 normalized
├── delivery/
│   ├── Calculate Delivery - 5 Packages       # POST /api/delivery (full scenario)
│   ├── Calculate Delivery - Undeliverable    # POST /api/delivery (overweight)
│   └── Validation - Missing Input            # 400: empty body
├── delivery-validation/
│   ├── Delivery - Missing Vehicle Line       # 400: no vehicle info
│   ├── Delivery - Vehicle Line Wrong Count   # 400: extra vehicle fields
│   ├── Delivery - Invalid Package And Vehicle  # 400: pkg + vehicle errors
│   └── Delivery - Multi-Error All Lines      # 400: header + pkg + vehicle errors
└── delivery-transit/
    ├── Transit - With Packages               # POST /api/delivery/transit (merge)
    ├── Transit - Conflicting IDs             # POST /api/delivery/transit (rename)
    ├── Transit - No Packages                 # POST /api/delivery/transit (fallback)
    └── Validation - Invalid Transit Packages # 400: bad data
```

Each request includes inline **assertions**, **test scripts**, and **docs** that explain expected behavior and formulas.

## Project Structure

```
src/
  app.ts                  # Express app setup with middleware stack
  config.ts               # Centralized configuration constants
  index.ts                # Server entry point with graceful shutdown
  middleware/
    security.ts           # helmet, cors, rate-limit, morgan config
    validation.ts         # Zod schemas + validate() middleware
  routes/
    cost.ts               # POST /api/cost
    delivery.ts           # POST /api/delivery, POST /api/delivery/transit
bruno/                    # Bruno API testing collection (see above)
__tests__/
  routes.unit.test.ts     # Unit tests with mocked core (18 tests)
  api.test.ts             # Integration tests (15 tests)
```

## Configuration

All tuneable values are centralised in `src/config.ts`:

| Constant | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port (overridable via `PORT` env var) |
| `GLOBAL_RATE_LIMIT` | 100 req / 15 min | Global rate limit |
| `CALC_RATE_LIMIT` | 30 req / 1 min | Calculation endpoint rate limit |
| `CORS_ORIGINS` | localhost:5173, :3000, CloudFront | Allowed CORS origins |
| `MAX_BODY_SIZE` | `10kb` | JSON body size limit |
| `MAX_INPUT_LENGTH` | 10 000 chars | Max input string length |
