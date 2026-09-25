# GoDaddy MySQL Test

A minimal React + Vite frontend and Node.js + Express backend for verifying a GoDaddy Hosted MySQL connection. It is independent of any other application.

## Install

From `godaddy-mysql-test`:

```bash
npm install
cd client
npm install
```

Copy `.env.example` to `.env` for local use and fill in the database values. Never commit `.env`.

## Run locally

Start the backend in one terminal:

```bash
npm start
```

Start Vite in a second terminal:

```bash
cd client
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173`. The Vite proxy sends `/api` requests to `http://localhost:5000`. To use a different backend URL, set `VITE_API_URL` before running `npm run build`; it is embedded into the frontend, so it must be a URL only and must never contain secrets.

For a single-process production-style run, build the frontend and start the backend:

```bash
cd client
npm run build
cd ..
npm start
```

Then open `http://localhost:<PORT>`.

## Create the table in GoDaddy

1. Open GoDaddy's Hosted Database area for this application.
2. Open its SQL interface, select the database provided for the app, and run the contents of `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS test_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

The file intentionally does not create or select a database because GoDaddy provides the database selected by `DB_NAME`.

## Environment variables

GoDaddy automatically injects these variables when the Hosted MySQL database is attached:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

The Node backend reads them only in `server.js` to create one reusable `mysql2/promise` connection pool. The frontend never receives or reads them. `PORT` is supplied by the hosting runtime or can be set locally. `VITE_API_URL` is a frontend build-time setting and is blank for same-origin deployment. SMTP settings are also backend-only.

## Deploy to GoDaddy

1. Upload or connect this project to the GoDaddy Node.js application.
2. Set the application's startup file to `server.js` and use the Node.js version supported by the hosting account.
3. Ensure the Hosted MySQL database is attached to the same application so the five `DB_*` variables appear in the Secrets/environment settings.
4. Do not upload `.env`; configure only non-secret frontend settings in the hosting/build process. For a same-origin deployment, leave `VITE_API_URL` empty.
5. Run `npm install` in the project root. The root `postinstall` script installs the client dependencies and builds `client/dist` automatically.
6. If the hosting dashboard has a separate build command, use `npm run build` from the project root.
7. Start the Node application with `npm start`. It listens on `process.env.PORT` and serves `client/dist` as well as the API.

The hosted app must contain the `client` source folder and the root `package.json`. Do not rely on an ignored local `dist` folder being uploaded; GoDaddy should create it by running the install/build step.

If GoDaddy builds the frontend separately, set `VITE_API_URL` to the public backend URL before `npm run build`. Do not put any `DB_*` variable in the client environment.

If the page displays an error saying `<!doctype is not valid JSON`, the frontend is receiving HTML from the API URL. For a single Node application serving both frontend and API, leave `VITE_API_URL` empty, set the startup file to `server.js`, and rebuild the client. If frontend and backend are separate GoDaddy applications, set `VITE_API_URL` to the backend application's public URL, rebuild, and redeploy the frontend.

## Verify the full chain

1. Run the SQL in GoDaddy's Hosted Database SQL interface.
2. Open the deployed app and click **Test Backend**. It should report `Backend is working`.
3. Click **Test Database**. It should report that the database connection succeeded.
4. Enter a name and click **Add User**. The new row should appear in the list.
5. Refresh the page. The row should still be present, proving the list is read from MySQL rather than only browser state.
6. Refresh the SQL interface and run `SELECT * FROM test_users ORDER BY id DESC;`. The inserted row should be visible there as well.
7. If a check fails, inspect the Node server logs. API responses expose only a safe error message and database error code, never the password.

## Test email

Set the Resend API key in `.env` locally or in the hosting environment, then enter the sender, recipient, and subject in the UI and click **Test Email**:

```env
RESEND_API_KEY=re_your_api_key
```

The `from` address must be a verified Resend sender/domain. For initial testing, Resend may provide a test sender/recipient in the dashboard. The API key is backend-only; never use a `VITE_` name for it.
