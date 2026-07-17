import mineflayer from 'mineflayer';
import express from 'express';

const PORT = process.env.PORT || '10000';
const app = express();
app.get('/', (_req, res) => {
  res.status(200).send('Bot is active');
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
let sellCooldown = false; // لمنع تكرار إرسال أمر البيع بشكل عشوائي متزامن

const THREE_HOURS_MS = 10500000; 

function scheduleReconnect(reason: string) {
  if (reconnectTimeout) return;
  console.log(`[Disconnect] سيتم إعادة الاتصال خلال 5 ثوانٍ... السبب: ${reason}`);
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

  // دالة البيع السريع بـ Shift + Click لجميع محتويات الحقيبة
  async function fastShiftSell(window: any) {
    const inventoryStartSlot = window.inventoryStart; 
    let stackCounter = 0;

    for (let slotId = inventoryStartSlot; slotId < window.slots.length; slotId++) {
      const item = window.slots[slotId];
      
      if (item) {
        try {
          await bot.clickWindow(slotId, 0, 1);
          stackCounter++;

          if (stackCounter === 3) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            stackCounter = 0;
          } else {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          // تجاوز الأخطاء الصامتة
        }
      }
    }

    // إغلاق الواجهة تلقائياً بعد إنهاء النقل لتأكيد عملية البيع
    setTimeout(() => {
      try {
        bot.closeWindow(window);
      } catch (e) {}
    }, 1000);
  }

  // محفز فحص الحقيبة وطلب أمر البيع تلقائياً عند دخول أي غرض
  function triggerAutoSell() {
    // إذا كان البوت يبيع حالياً أو في فترة الانتظار، نتجاهل الطلب مؤقتاً
    if (sellCooldown || bot.currentWindow) return;

    const items = bot.inventory.items();
    if (items.length === 0) return;

    sellCooldown = true;
    
    // ننتظر 5 ثوانٍ من دخول أول غرض لتجميع باقي الأغراض التي قد تسقط بالحقيبة قبل كتابة الأمر
    setTimeout(() => {
      if (bot.currentWindow) {
        sellCooldown = false;
        return;
      }
      bot.chat('/sell');
      
      // مهلة أمان مدتها 15 ثانية بين كل عملية بيع تالية لمنع السيرفر من رصد نشاط البوت كسبام
      setTimeout(() => {
        sellCooldown = false;
      }, 15000);

    }, 5000);
  }

  // عند فتح واجهة الـ /sell
  bot.on('windowOpen', (window) => {
    if (window.type.includes('chest') || window.type.includes('container')) {
      setTimeout(() => {
        fastShiftSell(window);
      }, 1500); 
    }
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

      // المراقبة التلقائية للحقيبة: بمجرد تحديث أي خانة ودخول آيتم، يتحفز نظام البيع
      bot.inventory.on('updateSlot', () => {
        triggerAutoSell();
      });

      // تشغيل بيع أولي بعد 10 ثوانٍ من الرسبنة في حال كان جيبه ممتلئاً مسبقاً قبل الدخول
      setTimeout(() => {
        triggerAutoSell();
      }, 10000); 

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
