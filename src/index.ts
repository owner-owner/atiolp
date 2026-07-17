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

  async function forceShiftSell() {
    let stackCounter = 0;

    // نفض الخانات الثابتة للجيب من 9 إلى 44 غصب بـ Shift-Click
    for (let slotId = 9; slotId <= 44; slotId++) {
      try {
        await bot.clickWindow(slotId, 0, 1); 
        stackCounter++;

        if (stackCounter === 3) {
          await new Promise(resolve => setTimeout(resolve, 2000)); 
          stackCounter = 0;
        } else {
          await new Promise(resolve => setTimeout(resolve, 300)); 
        }
      } catch (err) {}
    }

    setTimeout(() => {
      try { bot.closeWindow(bot.currentWindow || (bot as any).openWindow); } catch(e){}
    }, 1000);
  }

  bot.on('windowOpen', (window) => {
    setTimeout(() => {
      forceShiftSell();
    }, 2000); 
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

      // التايمر الدوري صار الحين 30000 ملي ثانية (يعني 30 ثانية بالضبط)
      mainInterval = setInterval(() => {
        if (!bot.currentWindow) {
          bot.chat('/sell');
        }
      }, 30000); 

      // أول بيعة سريعة عند الرسبنة مباشرة
      bot.chat('/sell');

    }, 5000);
  });

  bot.on('kicked', () => scheduleReconnect());
  bot.on('end', () => scheduleReconnect());
  bot.on('error', () => scheduleReconnect());
}

startBot();
