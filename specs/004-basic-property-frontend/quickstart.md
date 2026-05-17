# Quickstart: Basic Property Frontend

**Feature**: Basic Property Frontend  
**Date**: 2026-05-17

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Existing SQLite database at `../idealista_properties.db` (relative to frontend directory)

## Installation

### 1. Navigate to frontend directory

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

Required packages:
- `next`
- `react`
- `react-dom`
- `recharts`
- `sql.js` (pure JavaScript SQLite - no native dependencies)
- `tailwindcss`
- `typescript`
- `@types/sql.js`

### 3. Configure database path

Create `.env.local`:

```env
DATABASE_PATH=../idealista_properties.db
```

Or use the default path in `lib/db.ts`.

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build for Production

### Static Export (Recommended)

```bash
npm run build
```

This generates a static site in `dist/` with:
- Pre-rendered pages
- All property data fetched at build time
- No runtime database connection needed

### Serve static build

```bash
npx serve dist
```

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx         # Main page (Server Component)
│   ├── layout.tsx       # Root layout
│   ├── loading.tsx      # Loading UI
│   └── error.tsx        # Error boundary
├── components/
│   ├── PropertyList.tsx
│   ├── PropertyCard.tsx
│   ├── PriceChart.tsx
│   └── Pagination.tsx
├── lib/
│   ├── db.ts            # Database connection
│   └── utils.ts         # Helpers
├── types/
│   └── property.ts      # TypeScript types
└── tests/
    └── ...
```

## Development Workflow

### Adding a new component

1. Create file in `components/`
2. Add TypeScript interface for props
3. Export component as default
4. Add unit test in `tests/unit/`

### Modifying data queries

1. Edit `lib/db.ts`
2. Update SQL queries
3. Update TypeScript types if return shape changes
4. Update `data-model.md` in specs

### Testing pagination

Pagination is handled client-side for static export compatibility:

1. Navigate to the main page
2. Use the Previous/Next buttons or page numbers
3. The page updates instantly without reload

**Note**: For static export, pagination is done client-side. All properties are loaded at build time, and the client-side component handles pagination.

## Common Issues

### Database not found

**Error**: `Failed to initialize database` or file not found errors

**Solution**: Ensure `idealista_properties.db` exists in the project root and the path in `lib/db.ts` is correct. The default path is `../idealista_properties.db` (relative to the frontend directory).

### Port already in use

**Error**: `Port 3000 is already in use`

**Solution**: Kill existing process or use different port:

```bash
npm run dev -- --port 3001
```

### Tailwind styles not applied

**Solution**: Ensure `tailwind.config.ts` includes the correct content paths:

```typescript
content: [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
  './lib/**/*.{js,ts,jsx,tsx,mdx}',
],
```

### better-sqlite3 compilation errors

**Error**: `gyp ERR! configure error` or Visual Studio build tools required

**Solution**: This project uses `sql.js` (pure JavaScript) instead of `better-sqlite3` to avoid native compilation issues. If you encounter this error, ensure you're using the updated `package.json` that includes `sql.js` instead of `better-sqlite3`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `../idealista_properties.db` | Path to SQLite database |
| `NEXT_PUBLIC_PAGE_SIZE` | `20` | Properties per page |

## Performance Tips

- Use static export for fastest page loads
- Database queries use `sql.js` (pure JavaScript SQLite)
- Pagination limits data transferred per request
- Price distribution computed in SQL (faster than JS)
- Data is fetched at build time for static export (no runtime database needed)

## Implementation Status

✅ All components implemented:
- ✅ `PropertyList` component with pagination
- ✅ `PriceChart` component with Recharts
- ✅ `PropertyCard` with status badges and property details
- ✅ `Pagination` controls with responsive design
- ✅ Tailwind styling throughout
- ✅ Loading and error states
- ✅ Responsive layout for mobile/desktop

## Troubleshooting

### Windows-specific issues

If you encounter permission errors during `npm install`:
```bash
# Run PowerShell as Administrator
# Or use:
npm install --legacy-peer-deps
```

### sql.js WASM file loading

The database module loads the sql.js WASM file from a CDN by default. For offline/air-gapped environments, you can:
1. Download the WASM file from https://sql.js.org/dist/sql-wasm.wasm
2. Place it in the `public/` folder
3. Update `lib/db.ts` to use a local path:
   ```typescript
   locateFile: (file) => `/sql-wasm.wasm`
   ```
