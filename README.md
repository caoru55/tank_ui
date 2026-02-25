This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Tank Statuses (Zustand + Flask)

This app reads tank statuses directly from Flask endpoint `/api/tanks/statuses` via Zustand store:

- Store: `src/store/tankStore.ts`
- Dashboard UI: `app/dashboard/page.tsx`

## Environment Variables

Copy env template first:

```bash
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_FLASK_API_BASE_URL=http://163.44.121.247:5000
NEXT_PUBLIC_AUTH_SIGNIN_ENDPOINT=/auth/api/auth:signIn
NEXT_PUBLIC_FILLING_STATION_LAT=
NEXT_PUBLIC_FILLING_STATION_LNG=
```

- `NEXT_PUBLIC_FLASK_API_BASE_URL`: Base URL of Flask backend used by static client fetches.
- `NEXT_PUBLIC_AUTH_SIGNIN_ENDPOINT`: Login API endpoint. For HTTPS production, use same-origin reverse proxy path.
- `NEXT_PUBLIC_FILLING_STATION_LAT` / `NEXT_PUBLIC_FILLING_STATION_LNG`: Coordinates for exception-transition distance checks.

Example Nginx route for login API proxy (HTTP upstream on same host):

```nginx
location /auth/ {
	proxy_pass http://127.0.0.1:8080/;
	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
}
```

## Static Export (Next.js 16)

This project is configured with `output: "export"` in `next.config.ts`.

- App Route APIs and Server Actions are not supported in static export mode.
- The frontend calls Flask APIs directly.

Build static output:

```bash
npm run build
```

Generated static files are written to `out/`.

Then run:

```bash
npm run dev
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
