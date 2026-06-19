// Entry point for cPanel "Setup Node.js App" (Phusion Passenger).
// Passenger sets process.env.PORT and expects the app to listen on it.
// Run "npm run build" before starting this in production.

const { createServer } = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`QG Impulso ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Falha ao iniciar o QG Impulso:", err);
    process.exit(1);
  });
