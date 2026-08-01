import mineflayer from 'mineflayer';
import express from 'express';

// 1. إعداد سيرفر Express لإبقاء Render شغالاً
const PORT = parseInt(process.env.PORT || '10000', 10);
const app = express();
app.get('/', (_req, res) => res.status(200).send('Spawner Bot Active'));
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server running on port ${PORT}`);
});

// منع انهيار العملية عند حدوث أخطاء قراءة الحزم
process.on('uncaughtException', (err) => {
  if (err.message.includes('abnormally large') || err.message.includes('Chunk size') || err.message.includes('Read error')) {
    console.log('[Spawner-Bot] 🛡️ تم التقاط وتجاهل خطأ حزمة عابر لتفادي الخروج.');
  } else {
    console.error('[username 2. إعدادات البوت
const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'atiolp',
  version: '1.20.4',
};

const RECONNECT_DELAY_MS = 5000;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let spawnerInterval: ReturnType<typeof setInterval> | null = null;
let antiAfkInterval: ReturnType<typeof setInterval> | null = null;

let isFirstTime = true;
let hasSentServerSmp = false;

function scheduleReconnect(reason: string) {
  console.log(`[Spawner-Bot] 🔄 إعادة الاتصال خلال 5 ثوانٍ بسبب: ${reason}`);
  if (reconnectTimeout) return;
  if (spawnerInterval) clearInterval(spawnerInterval);
  if (antiAfkInterval) clearInterval(antiAfkInterval);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_DELAY_MS);
}

function startBot() {
  console.log('[Spawner-Bot] ⏳ جاري بدء الاتصال بالسيرفر zero7even.net...');
  hasSentServerSmp = false;

  const bot = mineflayer.createBot({
    ...BOT_CONFIG,
    viewDistance: 'tiny',
    physicsEnabled: true,
    checkTimeoutInterval: 60 * 1000
  });

  bot.on('login', () => {
    console.log('[Spawner-Bot] ✅ تم الاتصال بالهوست وقبول الحساب!');
  });

  async function interactWithSpawner() {
    const spawnerBlock = bot.findBlock({
      matching: (block) => block.name.includes('spawner'),
      maxDistance: 4
    });

    if (spawnerBlock) {
      try {
        console.log('[Spawner-Bot] 🎯 العثور على سبونر، جاري التفاعل...');
        await bot.activateBlock(spawnerBlock);
      } catch (err) {
        console.log('[Spawner-Bot] ❌ خطأ في التفاعل مع السبونر:', err);
      }
    } else {
      console.log('[Spawner-Bot] ⚠️ لم يتم العثور على سبونر في نطاق 4 بلوكات!');
    }
  }

  bot.on('windowOpen', (window) => {
    setTimeout(async () => {
      try {
        if (isFirstTime) {
          console.log('[Spawner-Bot] 🔘 الضغط الأول: الخانة 11');
          await bot.clickWindow(11, 0, 0);
          isFirstTime = false;
        } else {
          console.log('[Spawner-Bot] 🔘 الضغط الدوري (5 دقائق): الخانة 51');
          await bot.clickWindow(51, 0, 0);
        }
      } catch (err) {
        console.log('[Spawner-Bot] ❌ خطأ في الضغط على الخانة:', err);
      } finally {
        setTimeout(() => {
          try { bot.closeWindow(window); } catch (e) {}
        }, 1000);
      }
    }, 1500);
  });

  // 🔑 إدارة الدخول والتسجيل التلقائي الذكي
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);

    const lowerText = text.toLowerCase();

    // التسجيل عند طلب السيرفر
    if (lowerText.includes('/register') || lowerText.includes('register')) {
      console.log('[Spawner-Bot] 🔑 جاري إرسال أمر التسجيل /register...');
      bot.chat('/register AZERTY65 AZERTY65');
    } 
    // تسجيل الدخول عند طلب السيرفر
    else if (lowerText.includes('/login') || lowerText.includes('login') || lowerText.includes('تسجيل الدخول')) {
      console.log('[Spawner-Bot] 🔑 جاري إرسال أمر تسجيل الدخول /login...');
      bot.chat('/login AZERTY65');
    }
  });

  // 🌐 الانقال إلى سيرفر smp فور رسبونة البوت داخل اللوبي
  bot.on('spawn', () => {
    console.log('[Spawner-Bot] 🎉 البوت ريسبون (Spawn) وظهر داخل العالم!');

    // تنفيذ أمر التحويل إلى smp بعد ثانيتين من الدخول لتفادي حظر الـ Spam
    setTimeout(() => {
      console.log('[Spawner-Bot] 🌐 إرسال أمر /server smp للتحويل إلى السيرفر...');
      bot.chat('/server smp');
    }, 2500);

    if (spawnerInterval) clearInterval(spawnerInterval);
    if (antiAfkInterval) clearInterval(antiAfkInterval);
    isFirstTime = true;

    // حركة قفز خفيفة لمنع الطرد بسب الـ AFK
    antiAfkInterval = setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 30000);

    // التفاعل مع السبونر كل 5 دقائق
    setTimeout(() => {
      bot.setControlState('sneak', true);
      interactWithSpawner();

      spawnerInterval = setInterval(() => {
        interactWithSpawner();
      }, 300000);

    }, 7000);
  });

  bot.on('kicked', (reason) => {
    let readableReason = reason;
    try {
      readableReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
    } catch (e) {}
    scheduleReconnect(`Kicked: ${readableReason}`);
  });

  bot.on('end', (reason) => scheduleReconnect(`Disconnected: ${reason}`));

  bot.on('error', (err) => {
    console.log('[Spawner-Bot] ⚠️ تنبيه خطأ:', err.message);
    if (!err.message.includes('abnormally large') && !err.message.includes('Chunk size')) {
      scheduleReconnect(`Error: ${err.message}`);
    }
  });
}

startBot();
