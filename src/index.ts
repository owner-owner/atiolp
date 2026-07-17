import mineflayer from 'mineflayer';
import express from 'express';

const PORT = process.env.PORT || '10000';
const app = express();
app.get('/', (_req, res) => res.status(200).send('Bot Active'));
app.listen(PORT, '0.0.0.0');

const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'atiolp',
};

const RECONNECT_DELAY_MS = 5000;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let afkResetTimeout: ReturnType<typeof setTimeout> | null = null;
let mainInterval: ReturnType<typeof setInterval> | null = null;

const THREE_HOURS_MS = 10500000;

function scheduleReconnect() {
  if (reconnectTimeout) return;
  if (mainInterval) clearInterval(mainInterval);
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

  // دالة البيع المضمونة والمحدثة لـ Mineflayer 4.23.0
  async function forceNormalClickSell(window: any) {
    // مصفوفة تعبر عن حالة أول 45 خانة في الصندوق (من 0 إلى 44)
    // نعتبر الخانة فارغة (true) إذا لم يكن بها آيتم في السيرفر
    const availableChestSlots: boolean[] = [];
    for (let i = 0; i < 45; i++) {
      availableChestSlots[i] = window.slots[i] === null || window.slots[i] === undefined;
    }

    let currentTargetChestSlot = 0;

    // خانات جيب اللاعب الثابتة داخل النافذة المفتوحة تبدأ من 54 إلى 89
    // (حيث أن الصندوق يأخذ الخانات من 0 إلى 53)
    const playerInventoryStartInWindow = 54;
    const playerInventoryEndInWindow = 89;

    for (let slotId = playerInventoryStartInWindow; slotId <= playerInventoryEndInWindow; slotId++) {
      const item = window.slots[slotId];

      // إذا وجدت خانة بها غرض في حقيبتك
      if (item) {
        // البحث عن أول خانة بيع فارغة متاحة في الصندوق من 0 إلى 44
        while (currentTargetChestSlot < 45 && !availableChestSlots[currentTargetChestSlot]) {
          currentTargetChestSlot++;
        }

        // إذا تملأت أول 45 خانة بيع تماماً، نتوقف فوراً
        if (currentTargetChestSlot >= 45) {
          break;
        }

        try {
          // 1. النقر كليك يسار عادي لالتقاط الآيتم على الماوس
          await bot.clickWindow(slotId, 0, 0);
          await new Promise(resolve => setTimeout(resolve, 200)); // مهلة انتظار لاستجابة السيرفر

          // 2. النقر كليك يسار عادي في خانة البيع الفارغة بالصندوق لإفلات الآيتم
          await bot.clickWindow(currentTargetChestSlot, 0, 0);
          
          // تحديث حالة الخانة بأنها أصبحت ممتلئة الآن
          availableChestSlots[currentTargetChestSlot] = false;

          // 3. انتظر مهلة الأمان المطلوبة (200ms) قبل الانتقال للآيتم التالي
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          // في حال حدوث أي خطأ مفاجئ، نقوم بإفلات الآيتم العالق في الماوس لئلا يخرب الدورة
          if (bot.inventory.cursor) {
            await bot.clickWindow(slotId, 0, 0).catch(() => {});
          }
        }
      }
    }

    // إغلاق النافذة تلقائياً بعد الانتهاء بثانية واحدة
    setTimeout(() => {
      try {
        bot.closeWindow(window);
      } catch (e) {}
    }, 1000);
  }

  // لقط فتح واجهة الـ /sell وتفعيل نظام الكليك العادي
  bot.on('windowOpen', (window) => {
    setTimeout(() => {
      forceNormalClickSell(window);
    }, 2000); // انتظار ثانيتين لضمان استقرار الواجهة في السيرفر
  });

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول')) {
      bot.chat('/login AZERTY65');
    }
    if (text.includes('وضع - AFK') || text.includes('AFK mode') || text.includes('successfully')) {
      if (afkResetTimeout) clearTimeout(afkResetTimeout);
      afkResetTimeout = setTimeout(() => {
        if (mainInterval) clearInterval(mainInterval);
        bot.quit();
      }, THREE_HOURS_MS);
    }
  });

  bot.on('spawn', () => {
    if (mainInterval) clearInterval(mainInterval);
    
    setTimeout(() => {
      bot.setControlState('sneak', true);

      // إرسال أمر البيع كل 30 ثانية
      mainInterval = setInterval(() => {
        if (!bot.currentWindow) {
          bot.chat('/sell');
        }
      }, 30000);

      bot.chat('/sell');

    }, 5000);
  });

  bot.on('kicked', () => scheduleReconnect());
  bot.on('end', () => scheduleReconnect());
  bot.on('error', () => scheduleReconnect());
}

startBot();
