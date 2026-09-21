# CraftConnect — Vercel Deployment

This package is prepared for Vercel using an Express API deployed as a Vercel Node function. Vercel supports Express deployments and the Node runtime. The project uses Node 24.x because Vercel has announced the deprecation of Node 20 for new deployments from October 1, 2026.

## Project structure

```text
CraftConnect_deploy/
├── api/
│   ├── index.js
│   ├── artisans.js
│   ├── p.js
│   └── reqs.js
├── frontend/
│   ├── index.html
│   └── assets/
│       ├── styles.css
│       └── app.js
├── package.json
├── vercel.json
└── .vercelignore
```

## Deploy with Vercel dashboard

1. Upload/push this folder to GitHub.
2. In Vercel, create a new project and import the GitHub repository.
3. Keep the project root as the repository root.
4. Vercel should detect the Node/Express setup from `api/index.js` and `vercel.json`.
5. Deploy.

## Deploy with CLI

From the project root:

```bash
npm install
npx vercel login
npx vercel
npx vercel --prod
```

## Test

After deployment, open:

```text
https://YOUR-DOMAIN.vercel.app/
https://YOUR-DOMAIN.vercel.app/api/v1/health
https://YOUR-DOMAIN.vercel.app/api/v1/products
```

The health endpoint should return JSON with `ok: true`.

## Important data note

The original project used `backend/data/db.json` for writes. Vercel functions are stateless, so this Vercel version intentionally keeps runtime changes in memory rather than pretending local filesystem writes are persistent. Seed products, artisans, and requirements are included in the deployment.

For a real production application, connect the product/inquiry data to a persistent database such as PostgreSQL and use object storage for uploaded images.

## AI note

The `/api/v1/ai/*` routes remain the prototype/demo implementations from the original design. They do not call external AI model providers yet.
