import mineflayer from 'mineflayer';
import express from 'express';

const PORT = process.env.PORT || '10000';
const app = express();
app.get('/', (_req, res) => {
  res.status(200).send('Bot is active on Render');
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Listening on port ${PORT}`);
});

const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'atiolp',
};

const RECONNECT_DELAY_MS = 5000; 
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let afkResetTimeout: ReturnType<typeof setTimeout> | null = null;
let spawnTimeout: ReturnType<typeof setTimeout> | null = null; 

const THREE_HOURS_MS = 10500000; 

function scheduleReconnect(reason: string) {
  if (reconnectTimeout) return;
  console.log(`[Reconnect] سيتم إعادة الاتصال خلال 5 ثوانٍ... السبب: ${reason}`);
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

  function triggerRelog() {
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    if (spawnTimeout) clearTimeout(spawnTimeout); 
    bot.quit(); 
  }

  // الدالة المطورة لبيع الأغراض بأمان وضمان تسجيل النقرات في السيرفر
  async function safeShiftSell(window: any) {
    // 1. انتظر حتى يستقر السيرفر ويحدث بيانات النافذة بالكامل
    await new Promise(resolve => setTimeout(resolve, 2000));

    const inventoryStartSlot = window.inventoryStart; 
    let stackCounter = 0;

    // 2. فحص الخانات الخاصة بحقيبة اللاعب فقط داخل النافذة المفتوحة
    for (let slotId = inventoryStartSlot; slotId < window.slots.length; slotId++) {
      const item = window.slots[slotId];
      
      if (item) {
        try {
          // محاكاة الضغط بـ Shift + Click (النمط 1)
          await bot.clickWindow(slotId, 0, 1);
          stackCounter++;

          // إذا أرسل البوت 3 ستاكات، نهدئ اللعب ثانيتين للأمان من الـ Anti-Cheat
          if (stackCounter === 3) {
            await new Promise(resolve => setTimeout(resolve, 2500));
            stackCounter = 0;
          } else {
            // مهلة نصف ثانية بين الستاكات (طبيعية جداً وتضمن قبول السيرفر للبيع)
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        } catch (err) {
          // تجاهل الأخطاء العابرة
        }
      }
    }

    // 3. نقفل النافذة بعد الانتهاء لتأكيد عملية البيع وتنشيط الـ AFK التلقائي
    setTimeout(() => {
      try {
        bot.closeWindow(window);
      } catch (e) {}
    }, 1000);
  }

  // لقطة فتح واجهة الـ /sell
  bot.on('windowOpen', (window) => {
    // تشغيل عملية البيع الآمنة فوراً
    safeShiftSell(window);
  });

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();

    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول') || text.includes('Please, login')) {
      console.log('[Bot] 🔑 تم رصد طلب الحماية: جاري تسجيل الدخول الآن...');
      bot.chat('/login AZERTY65'); 
    }

    if (text.includes('تم تفعيل وضع AFK بنجاح') || text.includes('AFK mode activated') || text.includes('وضع - AFK خلال') || text.includes('successfully')) {
      if (afkResetTimeout) clearTimeout(afkResetTimeout);
      afkResetTimeout = setTimeout(() => {
        triggerRelog();
      }, THREE_HOURS_MS);
    }
  });

  bot.on('spawn', () => {
    if (spawnTimeout) clearTimeout(spawnTimeout);
    
    spawnTimeout = setTimeout(() => {
      bot.setControlState('sneak', true); 

      // الانتظار 15 ثانية بعد الرسبنة لضمان ثبات اللعبة ثم تشغيل الـ /sell
      setTimeout(() => {
        bot.chat('/sell');
      }, 15000); 

    }, 3000); 
  });

  bot.on('kicked', (reason) => {
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    if (spawnTimeout) clearTimeout(spawnTimeout); 
    console.log(`[Exit/Kick] تم طرد البوت من السيرفر! السبب: ${reason}`);
    scheduleReconnect(`Kicked: ${reason}`);
  });

  bot.on('end', (reason) => {
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    if (spawnTimeout) clearTimeout(spawnTimeout); 
    console.log(`[Exit/End] انقطع الاتصال بالخادم! السبب: ${reason}`);
    scheduleReconnect(`Socket closed (end): ${reason}`);
  });

  bot.on('error', (err) => {
    console.log(`[Error] حدث خطأ في الاتصال: ${err.name} - ${err.message}`);
  });
}

startBot();
