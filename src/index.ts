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
let spawnTimeout: ReturnType<typeof setTimeout> | null = null;

function startBot() {
  const bot = mineflayer.createBot({
    ...BOT_CONFIG,
    viewDistance: 'tiny',
    physicsEnabled: false
  });

  // هذه الدالة تنقر على كل آيتم في الحقيبة وتنقله للـ GUI المفتوح
  async function fastSellItems(window: any) {
    const items = bot.inventory.items();
    if (items.length === 0) return;

    for (const item of items) {
      // النقر الأيسر على الآيتم في الحقيبة (مع التنسيق الصحيح للـ Slot)
      await bot.clickWindow(item.slot, 0, 0);
      // النقر في أول خانة متاحة في الصندوق (غالباً الخانات من 0 إلى 26)
      await bot.clickWindow(0, 0, 0); 
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  bot.on('windowOpen', (window) => {
    // بمجرد فتح أي نافذة، انتظر ثانية ثم ابدأ البيع
    setTimeout(() => {
      fastSellItems(window);
    }, 1000);
  });

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول')) {
      bot.chat('/login AZERTY65'); 
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

  bot.on('error', (err) => console.log(`[Error] ${err.message}`));
  bot.on('kicked', () => setTimeout(startBot, RECONNECT_DELAY_MS));
  bot.on('end', () => setTimeout(startBot, RECONNECT_DELAY_MS));
}

startBot();
