# Local Drop Shipping

Next.js application for the LocalDropshipping storefront, marketplace, dashboards, and system documentation simulator.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` starts the Next.js development server.
- `npm run build` creates a production Next.js build.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint across the project.

## Project Structure

- `app/` contains the Next.js App Router entrypoints.
- `components/` contains reusable client components and the interactive simulator shell.
- `views/` contains the storefront, marketplace, dashboard, and documentation screens.
- `store/` contains the Zustand application state and mock data.
- `public/` contains static assets served from the site root.
