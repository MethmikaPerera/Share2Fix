import { env } from './config/env';
import './config/firebase';
import { createApp } from './app';
import { aiService } from './services/ai.service';

const app = createApp();
// Server startup
app.listen(env.PORT, () => {
  console.log(`Share2Fix API listening on http://localhost:${env.PORT}`);
  console.log(`  Firebase project : ${env.FIREBASE_PROJECT_ID}`);
  console.log(`  Gemini           : ${aiService.isConfigured ? `enabled (${env.GEMINI_MODEL})` : 'NOT configured - manual categories only'}`);
  console.log(`  CORS origins     : ${env.corsOrigins.join(', ')}`);
});
