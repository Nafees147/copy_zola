import fs from 'fs';
import path from 'path';
import express from 'express';
import compression from 'compression';

// Helper function to resolve paths from the project root
// FIX: The `process.cwd()` call was causing a TypeScript type error. It's also
// redundant, as path.resolve() uses the current working directory by default.
const resolveFromRoot = (...segments: string[]) => path.resolve(...segments);

// Create the Express app
const app = express();

// In a Vercel environment, the built files are at the root.
const clientDistPath = resolveFromRoot('dist/client');
const serverDistPath = resolveFromRoot('dist/server');
const serverEntryPath = path.join(serverDistPath, 'entry-server.js');

// Add compression middleware
// FIX: Explicitly add path to resolve express.use() overload ambiguity.
app.use('/', compression());

// Serve static files from the client build directory
// Vercel's routing will handle this, but it's good practice for local emulation
// FIX: Explicitly add path to resolve express.use() overload ambiguity.
app.use('/', express.static(clientDistPath, { index: false }));

// Universal SSR handler for all other requests
app.use('*', async (req, res) => {
  try {
    // 1. Read the HTML template
    const template = fs.readFileSync(path.resolve(clientDistPath, 'index.html'), 'utf-8');

    // 2. Import the server-side render function
    const { render } = await import(serverEntryPath);

    // 3. Render the application's HTML
    const appHtml = await render(req.originalUrl);

    // 4. Inject the rendered HTML into the template
    const html = template.replace(`<!--ssr-outlet-->`, appHtml);

    // 5. Send the final HTML response
    res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
  } catch (e) {
    console.error('SSR Error:', e);
    res.status(500).end((e as Error).message);
  }
});

// Export the app for Vercel's runtime
export default app;
