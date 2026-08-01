import mineflayer from 'mineflayer';
import express from 'express';

// 1. إعداد سيرفر Express لإبقاء Render شغالاً
const PORT = parseInt(process.env.PORT || '10000', 10);
const app = express();
app.get('/', (_req, res) => res.status(200).send('Spawner Bot Active'));
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Server running on port ${PORT}`);
});

// منع انهيار العملية عند حدوث أخطاء قراءة الحزم (Packet Parsing Errors)
process.on('uncaughtException', (err) => {
  if (err.message.includes('abnormally large') || err.message.includes('Chunk size') || err.message.includes('Read error')) {
    console.log('[Spawner-Bot] 🛡️ تم التقاط وتجاهل خطأ حزمة عابر لتفادي الخروج.');
  } else {
    console.error('[UncaughtException]', err);
  }
});

// 2. إعدادات البوت
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

  const bot = mineflayer.createBot({
    ...BOT_CONFIG,
    viewDistance: 'tiny',
    physicsEnabled: true, // تفعيل الفيزيائيات البسيطة لمنع طرد الـ AFK
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

  // استقبال رسائل الشات والرد التلقائي
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);
    
    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول')) {
      console.log('[Spawner-Bot] 🔑 إرسال رمز الدخول...');
      bot.chat('/login AZERTY65');
      
      setTimeout(() => {
        console.log('[Spawner-Bot] 🌐 التحويل إلى /server smp...');
        bot.chat('/server smp');
      }, 3000);
    }
  });

  bot.on('spawn', () => {
    console.log('[Spawner-Bot] 🎉 البوت رسبرن (Spawn) وظهر داخل العالم بشكل ثابت!');
    if (spawnerInterval) clearInterval(spawnerInterval);
    if (antiAfkInterval) clearInterval(antiAfkInterval);
    isFirstTime = true;

    // حركة خفيفة كل 30 ثانية لمنع طرد الـ AFK من السيرفر
    antiAfkInterval = setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 30000);

    setTimeout(() => {
      bot.setControlState('sneak', true);
      interactWithSpawner();

      spawnerInterval = setInterval(() => {
        interactWithSpawner();
      }, 300000);

    }, 5000);
  });

  // تحسين قراءة سبب الطرد (Parsing Kick Reason)
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
