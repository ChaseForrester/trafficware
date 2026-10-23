# Trafficware

Website and yard for an Australian traffic company. The public site is at `/`, with the two roles and the six-step guide. The desktop office is at `/app`. The field phone is at `/field`. Printable dockets are at `/dockets`.

A Super Admin signs in at `/start`. A client on the tools signs in at `/join`. Firebase Authentication is on for project `trafficware-yard` (Sydney, Blaze). The browser still does not talk to Firestore directly. `/api/yard` does, with the admin key, and only after the access code in `TRAFFICWARE_PIN`. `/api/session` checks the Firebase sign-in token and the role on that account.

Xero is a real OAuth connection. Create a web app, set the redirect URI to `https://trafficware.vercel.app/api/xero-callback`, and put `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` on the server. Connect it from Office, Integrations. Send invoices creates draft ACCREC invoices and still downloads the CSV. Payroll, GPS and HR onboarding remain file or demo switches. The steps are also on the Integrations screen and in `public/llms.txt`.

```bash
npm install
npm run dev
```

Open `/`. On a wide screen the office uses the side menu. On a phone it uses the tabs. Add the field screen to the home screen if you want the installed app. `/site` redirects home.

Grok calls stay on the server. Put the key in `.env` as `XAI_API_KEY` (see `.env.example`). Do not prefix it with `VITE_`. On Vercel, set the same variable in the project environment so `/api/grok` can reach xAI. Optional `TRAFFICWARE_PIN` makes the app ask for a code before it will spend the key. A signed-in Super Admin can ask Grok to place crew, fill open slots, approve clean dockets, raise invoices, or open a job. A signed-in client can ask Grok to accept, decline, or sign only their own shift. The rules engine still blocks an illegal move.

## Where the data lives

`src/lib/persistence.ts` keeps a copy in local storage. `src/lib/yardCloud.ts` loads and saves the same yard through `/api/yard` when the access code is entered on Integrations. The screens talk only to `src/lib/store.tsx`.

## Vercel

The project is a static Vite build. `vercel.json` sends every path back to `index.html` so client routes work.

```bash
npm run build
```

Deploy the project when the Vercel account is connected. Set the output to `dist`.
