# AI Teaching Assistant Frontend

The `client/` workspace contains the Next.js interface for the AI Teaching Assistant platform. It provides instructor and student dashboards for managing courses, uploading content, and chatting with the AI assistant that is powered by the backend service.

## Stack at a Glance

- **Framework:** Next.js 15 (App Router) with React 19
- **Styling:** Tailwind CSS, Radix UI primitives, shadcn/ui components
- **State & Data:** React hooks with context providers (e.g., authentication), API client that talks to the FastAPI backend
- **Tooling:** TypeScript, ESLint, Turbopack-powered dev server

## Project Structure

```
client/
├── src/
│   ├── app/                # App Router routes grouped by role (e.g., instructor dashboard)
│   ├── components/         # Shared UI elements (forms, navigation, charts, auth wrappers, etc.)
│   ├── contexts/           # React context providers (authentication, theme)
│   ├── hooks/              # Reusable logic such as data fetching helpers
│   ├── lib/                # API client, utilities, and service helpers
│   └── providers/          # Global providers composed for the App Router
├── public/                 # Static assets
├── Dockerfile              # Production container build definition
└── ...                     # Config (Tailwind, ESLint, tsconfig, etc.)
```

## Environment Variables

Create `client/.env.local` (ignored by git) with at least:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000  # URL of the FastAPI backend
```

Optional variables support mocked demo logins (e.g., `NEXT_PUBLIC_INST_1_*`, `NEXT_PUBLIC_STU_1_*`). Populate them with non-sensitive sample values if you need seeded accounts for local demos.

## Local Development

```bash
cd client
yarn install
yarn dev
```

The dev server runs on http://localhost:3000 by default. API calls are proxied to `NEXT_PUBLIC_API_URL`.

### Useful Scripts

- `yarn dev` – start the Next.js development server (Turbopack)
- `yarn build` – create an optimized production build
- `yarn start` – serve the production build locally
- `yarn lint` – run ESLint using the project config

## Working with the Backend

The frontend assumes the FastAPI backend from `server/` is running with OpenAI and database services configured. See the root README or `server/README.md` for backend instructions.

## Deployment Notes

- Ensure required environment variables are injected in your hosting platform (e.g., Vercel, Docker compose)
- Disable or replace any mock/demo tokens before deploying to a public environment
- Run `yarn build` locally or via CI to validate the bundle before releasing changes

## Contributing Tips

- Keep UI components in `src/components` small and reusable; container logic should live alongside routes in `src/app`
- When adding new API calls, extend the client in `src/lib/services/api.ts` to maintain a single integration surface
- Prefer the provided context providers for authentication to ensure role-based routing continues to work
