import 'dotenv/config';
import app from './app';

const port = Number(process.env.API_PORT ?? 3001);
const server = app.listen(port, () => {
  const address = server.address();
  const listeningPort = typeof address === 'object' && address ? address.port : port;
  console.log(`CivicFix API listening on http://localhost:${listeningPort}`);
});
