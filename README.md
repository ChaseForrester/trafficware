# Trafficware

Booking board, people record and field app for traffic companies. The sample yard runs in the browser. Firebase can replace the database later without rewriting the screens.

```bash
npm install
npm run dev
```

Open the site, then **Open the live board**. Field crew is at `/field`.

## Where the data lives

`src/lib/persistence.ts` loads and saves the workspace. It uses local storage today. To move to Firebase, replace `loadState` and `saveState`. The screens talk only to `src/lib/store.tsx`.

## Vercel

The project is a static Vite build. `vercel.json` sends every path back to `index.html` so client routes work.

```bash
npm run build
```

Deploy the project when the Vercel account is connected. Set the output to `dist`.
