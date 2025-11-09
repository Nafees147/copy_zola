import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();
  let vite: ViteDevServer;

  if (!isProd) {
    // Development server logic
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    // Use Vite's connect instance as middleware for HMR and asset serving
    app.use(vite.middlewares);
  } else {
    // Production server logic
    // Add compression middleware for better performance
    app.use((await import('compression')).default());
    // Serve static files from the client build directory
    // index: false prevents express from automatically serving index.html on '/'
    app.use(
      express.static(path.resolve(__dirname, 'dist/client'), {
        index: false,
      })
    );
  }

  // Universal SSR handler for all requests
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    let template, render;

    try {
      if (!isProd) {
        // In development, read and transform index.html on the fly
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        // Load the server entry module using Vite's SSR loader
        render = (await vite.ssrLoadModule('/entry-server.tsx')).render;
      } else {
        // In production, read the pre-built index.html
        template = fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8');
        // Dynamically import the built server entry module
        render = (await import('./dist/server/entry-server.js')).render;
      }

      // Render the application's HTML
      const appHtml = await render(url);
      // Inject the rendered HTML into the template
      const html = template.replace(`<!--ssr-outlet-->`, appHtml);

      // Send the final HTML response
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      // If an error occurs, let Vite fix the stack trace in dev
      if (vite) {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });

  const port = process.env.PORT || 5173;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer();
