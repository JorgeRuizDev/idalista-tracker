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
- `better-sqlite3`
- `tailwindcss`
- `typescript`
- `@types/better-sqlite3`

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

```bash
# With test data
curl http://localhost:3000/?page=2
```

Or navigate in browser and use pagination controls.

## Common Issues

### Database not found

**Error**: `SqliteError: unable to open database file`

**Solution**: Ensure `idealista_properties.db` exists in the project root and the path in `lib/db.ts` is correct.

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
],
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `../idealista_properties.db` | Path to SQLite database |
| `NEXT_PUBLIC_PAGE_SIZE` | `20` | Properties per page |

## Performance Tips

- Use static export for fastest page loads
- Database queries are synchronous (better-sqlite3) for simplicity
- Pagination limits data transferred per request
- Price distribution computed in SQL (faster than JS)

## Next Steps

- [ ] Implement `PropertyList` component
- [ ] Implement `PriceChart` component  
- [ ] Add pagination controls
- [ ] Style with Tailwind
- [ ] Add loading and error states
