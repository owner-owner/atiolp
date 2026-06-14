import mineflayer from 'mineflayer';
import express from 'express';

const PORT = process.env.PORT || '10000';
const app = express();
app.get('/', (_req, res) => {
  res.status(200).send('بوت الـ Shards المستقر بنظام الـ Relog الذكي كل 3 ساعات شغال!');
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] الموقع مستقر ويستمع على بورت ${PORT}`);
});

const BOT_CONFIG = {
  host: 'zero7even.net', 
  port: 25565,
  username: 'atiolp', 
};

const RECONNECT_DELAY_MS = 3000; 
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let afkResetTimeout: ReturnType<typeof setTimeout> | null = null;
let spawnTimeout: ReturnType<typeof setTimeout> | null = null; // 👈 متغير جديد لحفظ مؤقت الـ 7 ثوانٍ

const THREE_HOURS_MS = 10500000; 

function scheduleReconnect(reason: string) {
  if (reconnectTimeout) return;
  console.log(`[Reconnect] سيتم إعادة الاتصال خلال ${RECONNECT_DELAY_MS / 1000} ثانية... السبب: ${reason}`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_DELAY_MS);
}

function startBot() {
  console.log('[Bot] جاري الاتصال بالسيرفر الجديد...');
  const bot = mineflayer.createBot(BOT_CONFIG);

  function triggerRelog() {
    console.log('[Bot] 🔄 مرت 3 ساعات! جاري الخروج لتصفير عداد الأرباح والعودة بجلسة جديدة 100%...');
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    if (spawnTimeout) clearTimeout(spawnTimeout); // 👈 مسح مؤقت الرسبنة عند الخروج التلقائي
    bot.quit(); 
  }

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);

    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول') || text.includes('Please, login')) {
      console.log('[Bot] 🔑 تم رصد رسالة الحماية! جاري تسجيل الدخول...');
      bot.chat('/login AZERTY65'); 
    }

    if (text.includes('تم تفعيل وضع AFK بنجاح') || text.includes('AFK mode activated') || text.includes('وضع - AFK خلال')) {
      if (text.includes('بنجاح') || text.includes('activated')) {
        console.log('[Bot] 🎉 دخل وضع الـ AFK رسميّاً. تم بدء مؤقت الـ 3 ساعات للحفاظ على الأرباح كاملة.');
        if (afkResetTimeout) clearTimeout(afkResetTimeout);
        afkResetTimeout = setTimeout(() => {
          triggerRelog();
        }, THREE_HOURS_MS);
      }
    }
    
    if (text.includes('انتهت مدة AFK القصوى')) {
      console.log('[Bot] ⚠️ تنبيه: انتهت المدة القصوى، جاري إرسال /afk مجدداً...');
      bot.chat('/afk');
    }
  });

  bot.on('spawn', () => {
    // 👈 إذا كان فيه مؤقت قديم شغال من رسبنة سابقة، نمسحه فوراً عشان ما يسوي تداخل
    if (spawnTimeout) clearTimeout(spawnTimeout);
    
    console.log('[Bot] 🌍 البوت رسبن في العالم الآن! ننتظر 7 ثوانٍ للأمان واستقرار الاتصال...');
    
    spawnTimeout = setTimeout(() => {
      console.log('[Bot] ✓ جاري تفعيل وضع الـ Shift (Sneak)...');
      bot.setControlState('sneak', true); 

      console.log('[Bot] 💤 جاري إرسال أمر الـ /afk لبدء تجميع الـ Shards...');
      bot.chat('/afk');
    }, 5000); 
  });

  bot.on('kicked', (reason) => {
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    if (spawnTimeout) clearTimeout(spawnTimeout); // 👈 إلغاء مؤقت الـ 7 ثوانٍ فوراً لو انطرد
    scheduleReconnect(`kicked من السيرفر: ${reason}`);
  });

  bot.on('end', (reason) => {
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    if (spawnTimeout) clearTimeout(spawnTimeout); // 👈 إلغاء مؤقت الـ 7 ثوانٍ فوراً لو فصل السيرفر
    scheduleReconnect(`انقطع الاتصال (end): ${reason}`);
  });

  bot.on('error', (err) => {
    console.log(`[Error] نوع الخطأ: ${err.name}, الرسالة: ${err.message}`);
  });
}

startBot();
