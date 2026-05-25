import mineflayer from 'mineflayer';
import express from 'express';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app = express();
app.get('/', (_req, res) => {
  res.send('البوت شغال 24 ساعة بدون قفز!');
});
app.listen(PORT, () => {
  console.log(`الموقع جاهز للربط مع UptimeRobot على بورت ${PORT}`);
});

const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'iolp', 
};

// جعل وقت إعادة الاتصال بارد (كل دقيقتين) عشان ما يسبب سبام للسيرفر
const RECONNECT_DELAY_MS = 30000; 
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleReconnect(reason: string) {
  if (reconnectTimeout) return;
  console.log(`[Reconnect] سيتم إعادة الاتصال خلال ${RECONNECT_DELAY_MS / 1000} ثانية... السبب: ${reason}`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_DELAY_MS);
}

function extractText(obj: unknown): string {
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object' && obj !== null) {
    const o = obj as Record<string, unknown>;
    if (o.value !== undefined) return extractText(o.value);
    if (Array.isArray(o)) return (o as unknown[]).map(extractText).join('');
    const parts: string[] = [];
    if (o.text) parts.push(extractText(o.text));
    if (o.extra) parts.push(extractText(o.extra));
    return parts.join('');
  }
  if (Array.isArray(obj)) return (obj as unknown[]).map(extractText).join('');
  return String(obj);
}

function startBot() {
  console.log('[Bot] جاري الاتصال بالسيرفر...');

  const bot = mineflayer.createBot(BOT_CONFIG);

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);

    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول')) {
      console.log('[Bot] 🔑 تم رصد رسالة الحماية! جاري تسجيل الدخول...');
      bot.chat('/login iolp'); 
    }
  });

  bot.on('spawn', () => {
    console.log('[Bot] ✓ البوت رسبن رسميّاً وهو الآن واقف وثابت بدون حركة.');
  });

  bot.on('kicked', (reason) => {
    const readable = extractText(reason);
    console.log(`[Kicked] النص: "${readable}"`);
    scheduleReconnect(`kicked: ${readable}`);
  });

  bot.on('end', (reason) => {
    console.log(`[End] سبب انتهاء الاتصال: "${reason}"`);
    scheduleReconnect(`end: ${reason}`);
  });

  bot.on('error', (err) => {
    console.log(`[Error] نوع الخطأ: ${err.name}, الرسالة: ${err.message}`);
  });
}

startBot();
