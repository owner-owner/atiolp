import mineflayer from 'mineflayer';
import express from 'express';

const PORT = process.env.PORT || '10000';
const app = express();
app.get('/', (_req, res) => res.status(200).send('Spawner Bot Active'));
app.listen(PORT, '0.0.0.0');

const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'atiolp', // اسم حساب بوت السبونر
};

const RECONNECT_DELAY_MS = 5000;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let spawnerInterval: ReturnType<typeof setInterval> | null = null;

let isFirstTime = true; // متغير لمتابعة هل هي المرة الأولى أم تكرار الـ 5 دقائق

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
    physicsEnabled: false
  });

  // دالة النقر كليك يمين على السبونر الملاين للبوت
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
      console.log('[Spawner-Bot] ⚠️ لم يتم العثور على سبونر قريب!');
    }
  }

  // التعامل مع فتح القائمة واختيار الخانة المناسبة
  bot.on('windowOpen', (window) => {
    setTimeout(async () => {
      try {
        if (isFirstTime) {
          // المرة الأولى: الضغط على الخانة 11
          console.log('[Spawner-Bot] 🔘 الضغط الأول على الخانة 11...');
          await bot.clickWindow(11, 0, 0);
          isFirstTime = false; // تحويل الحالة للمرات القادمة
        } else {
          // المرات القادمة (كل 5 دقائق): الضغط على الخانة 51
          console.log('[Spawner-Bot] 🔘 الضغط الدوري كل 5 دقائق على الخانة 51...');
          await bot.clickWindow(51, 0, 0);
        }
      } catch (err) {
        console.log('[Spawner-Bot] ❌ حدث خطأ أثناء النقر:', err);
      } finally {
        // إغلاق النافذة بعد الضغط
        setTimeout(() => {
          try { bot.closeWindow(window); } catch (e) {}
        }, 1000);
      }
    }, 1500); // مهلة ثانيتان لاستقرار السيرفر
  });

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    
    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول')) {
      bot.chat('/login AZERTY65');
      setTimeout(() => {
        bot.chat('/server smp');
      }, 3000);
    }
  });

  bot.on('spawn', () => {
    if (spawnerInterval) clearInterval(spawnerInterval);
    isFirstTime = true; // إعادة تصفير الحالة عند الدخول الجديد

    setTimeout(() => {
      bot.setControlState('sneak', true);

      // أول ضغطة فورية (ستفعل الخانة 11)
      interactWithSpawner();

      // حلقة تكرارية كل 5 دقائق (300,000 ملي ثانية) تضغط على الخانة 51
      spawnerInterval = setInterval(() => {
        interactWithSpawner();
      }, 300000);

    }, 5000);
  });

  bot.on('kicked', () => scheduleReconnect());
  bot.on('end', () => scheduleReconnect());
  bot.on('error', () => scheduleReconnect());
}

startBot();
