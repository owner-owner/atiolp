import mineflayer from 'mineflayer';
import express from 'express';

// 1. إعداد سيرفر Express لإبقاء Render شغالاً
const PORT = process.env.PORT || '10000';
const app = express();
app.get('/', (_req, res) => res.status(200).send('Spawner Bot Active'));
app.listen(PORT, '0.0.0.0');

// 2. إعدادات البوت
const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'atiolp_spawner', // اسم حساب بوت السبونر
};

const RECONNECT_DELAY_MS = 5000;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let spawnerInterval: ReturnType<typeof setInterval> | null = null;

// متغير لمتابعة المرة الأولى مقابل المرات القادمة
let isFirstTime = true;

function scheduleReconnect() {
  if (reconnectTimeout) return;
  if (spawnerInterval) clearInterval(spawnerInterval);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_DELAY_MS);
}

function startBot() {
  const bot = mineflayer.createBot({
    ...BOT_CONFIG,
    viewDistance: 'tiny',
    physicsEnabled: false,
    checkTimeoutInterval: 60 * 1000
  });

  // دالة النقر كليك يمين على السبونر القريب
  async function interactWithSpawner() {
    const spawnerBlock = bot.findBlock({
      matching: (block) => block.name.includes('spawner'),
      maxDistance: 4
    });

    if (spawnerBlock) {
      try {
        await bot.activateBlock(spawnerBlock);
      } catch (err) {}
    } else {
      console.log('[Spawner-Bot] ⚠️ لم يتم العثور على سبونر قادم في نطاق 4 بلوكات!');
    }
  }

  // التعامل مع فتح GUI الصندوق
  bot.on('windowOpen', (window) => {
    setTimeout(async () => {
      try {
        if (isFirstTime) {
          console.log('[Spawner-Bot] 🔘 الضغط الأول: الخانة 11');
          await bot.clickWindow(11, 0, 0);
          isFirstTime = false; // المرات القادمة ستصبح الخانة 51
        } else {
          console.log('[Spawner-Bot] 🔘 الضغط الدوري (5 دقائق): الخانة 51');
          await bot.clickWindow(51, 0, 0);
        }
      } catch (err) {
        console.log('[Spawner-Bot] ❌ خطأ في الضغط على الخانة:', err);
      } finally {
        // إغلاق الواجهة بعد 1 ثانية من النقر
        setTimeout(() => {
          try { bot.closeWindow(window); } catch (e) {}
        }, 1000);
      }
    }, 1500);
  });

  // الاستماع للشات وتسجيل الدخول والتحويل
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    
    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول')) {
      console.log('[Spawner-Bot] 🔑 تسجيل الدخول...');
      bot.chat('/login AZERTY65');
      
      setTimeout(() => {
        console.log('[Spawner-Bot] 🌐 تحويل السيرفر إلى /server smp...');
        bot.chat('/server smp');
      }, 3000);
    }
  });

  bot.on('spawn', () => {
    if (spawnerInterval) clearInterval(spawnerInterval);
    isFirstTime = true; // إعادة تعيين للخانة 11 في كل عملية إعادة اتصال جديدة

    setTimeout(() => {
      bot.setControlState('sneak', true);

      // أول كليك فور الدخول والاستقرار
      interactWithSpawner();

      // التكرار كل 5 دقائق (300,000ms) للخانة 51
      spawnerInterval = setInterval(() => {
        interactWithSpawner();
      }, 300000);

    }, 5000);
  });

  bot.on('kicked', () => scheduleReconnect());
  bot.on('end', () => scheduleReconnect());
  bot.on('error', (err) => {
    console.log('[Spawner-Bot] ⚠️ تنبيه خطأ:', err.message);
    // إذا كان الخطأ بسيطاً في قراءة الـ packet لا نخرج مباشرة
    if (!err.message.includes('abnormally large') && !err.message.includes('Chunk size')) {
      scheduleReconnect();
    }
  });
}

startBot();
