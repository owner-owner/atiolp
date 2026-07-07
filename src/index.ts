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

  async function transferInventoryToChest(window: any) {
    const itemsInInventory = bot.inventory.items();
    if (itemsInInventory.length === 0) return;

    let stackCounter = 0;

    for (const item of itemsInInventory) {
      try {
        await bot.deposit(item.type, null, item.count);
        stackCounter++;

        if (stackCounter === 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          stackCounter = 0;
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (err) {
        // تجاهل الأخطاء الصامتة لراحة الكونسول
      }
    }
  }

  bot.on('windowOpen', (window) => {
    if (window.type.includes('chest') || window.type.includes('container')) {
      setTimeout(() => {
        transferInventoryToChest(window);
      }, 1000);
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

      setTimeout(() => {
        bot.chat('/sell');
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
