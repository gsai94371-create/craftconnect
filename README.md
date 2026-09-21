# CraftConnect — Vercel-ready full-stack frontend + backend

CraftConnect is a responsive artisan marketplace prototype with buyer and artisan flows plus prototype AI services.

## Included

- Responsive frontend extracted from the original single HTML file
- Express backend exposed through Vercel's Node runtime
- Product/artisan/requirements/inquiry API routes
- Prototype AI endpoints for speech, translation, vision, catalog generation, image processing and pricing
- Vercel routing configuration
- Node 24.x runtime configuration

## Local development

```bash
npm install
npx vercel dev
```

Open the local URL shown by Vercel.

## API

- `GET /api/v1/health`
- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`
- `DELETE /api/v1/products/:id`
- `GET /api/v1/artisans`
- `GET /api/v1/requirements`
- `GET /api/v1/inquiries`
- `POST /api/v1/inquiries`
- `POST /api/v1/ai/speech/transcribe`
- `POST /api/v1/ai/translate`
- `POST /api/v1/ai/vision/analyze`
- `POST /api/v1/ai/catalog/generate`
- `POST /api/v1/ai/image/process`
- `POST /api/v1/ai/pricing/suggest`

## Persistence

This Vercel version does not use local `db.json` persistence because Vercel functions are stateless. Mutations are runtime-only. Use PostgreSQL or another persistent database before treating the app as production data storage.

## Photo upload fix
The Vercel-ready build uses the browser File API for product photos, validates image type/size, resets the file input so the same photo can be selected again, and does not load the old duplicate app.js bundle. Uploaded photos are previews in the current browser session; permanent production photo storage should use object storage (for example Vercel Blob or another storage provider).
