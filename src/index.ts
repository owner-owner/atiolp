import mineflayer from 'mineflayer';
import express from 'express';

const PORT = process.env.PORT || '10000';
const app = express();
app.get('/', (_req, res) => {
  res.status(200).send('بوت الـ Shards شغال بنظام الـ Relog الذكي كل 3 ساعات!');
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] الموقع مستقر ويستمع على بورت ${PORT}`);
});

const BOT_CONFIG = {
  host: 'اكتب_آيبي_السيرفر_هنا', // 👈 ضع آيبي السيرفر الجديد هنا
  port: 25565,
  username: 'اسم_الحساب', // 👈 ضع اسم حساب البوت هنا
};

const RECONNECT_DELAY_MS = 30000; // مهلة أمان 30 ثانية قبل إعادة الاتصال
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let afkResetTimeout: ReturnType<typeof setTimeout> | null = null;

// لأمان أكبر، سيقوم البوت بالخروج وتجديد الجلسة كل ساعتين و55 دقيقة (10500000 ملث)
// هذا يضمن كسر الـ AFK قبل أن تنزل الأرباح إلى 50% ولو بدقيقة واحدة
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

  // دالة الخروج الذكي لتصفير عداد الأرباح 100%
  function triggerRelog() {
    console.log('[Bot] 🔄 مرت 3 ساعات! جاري الخروج من السيرفر لتصفير عداد الأرباح وضمان نسبة 100%...');
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    
    // إجبار البوت على فصل الاتصال بنفسه
    bot.quit();
  }

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);

    // 1. رصد رسالة الحماية وتسجيل الدخول
    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول') || text.includes('Please, login')) {
      console.log('[Bot] 🔑 تم رصد رسالة الحماية! جاري تسجيل الدخول...');
      bot.chat('/login AZERTY65'); 
    }

    // 2. تفعيل وضع الـ AFK بعد نجاح تسجيل الدخول بـ 5 ثوانٍ
    if (text.includes('Successfully logged in') || text.includes('تم تسجيل الدخول بنجاح') || text.includes('logged in')) {
      console.log('[Bot] 🏃 تم تسجيل الدخول بنجاح! ننتظر 5 ثوانٍ لاستقرار الحساب...');
      setTimeout(() => {
        console.log('[Bot] 💤 جاري إرسال أمر الـ /afk لبدء تجميع الـ Shards...');
        bot.chat('/afk'); 
      }, 5000);
    }

    // 3. بدء مؤقت الـ 3 ساعات فور تفعيل الـ AFK بنجاح
    if (text.includes('تم تفعيل وضع AFK بنجاح')) {
      console.log('[Bot] 🎉 دخل وضع الـ AFK رسميّاً. تم بدء مؤقت الـ 3 ساعات للحفاظ على الأرباح كاملة.');
      
      if (afkResetTimeout) clearTimeout(afkResetTimeout);
      
      // بدء العد التنازلي للخروج التلقائي وتجديد الأرباح
      afkResetTimeout = setTimeout(() => {
        triggerRelog();
      }, THREE_HOURS_MS);
    }
    
    // حماية احتياطية لو طرد السيرفر الـ AFK لأي سبب آخر
    if (text.includes('انتهت مدة AFK القصوى')) {
      console.log('[Bot] ⚠️ تنبيه: انتهت المدة القصوى، جاري إرسال /afk مجدداً...');
      bot.chat('/afk');
    }
  });

  // تفعيل وضع الـ Shift للتخفي لحماية الحساب فور رسبنته
  bot.on('spawn', () => {
    setTimeout(() => {
      console.log('[Bot] ✓ جاري تفعيل وضع الـ Shift (Sneak) للتخفي التام...');
      bot.setControlState('sneak', true); 
    }, 1000);
  });

  // عند خروج البوت (سواء بـ bot.quit أو بطرد من السيرفر)
  bot.on('kicked', (reason) => {
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    scheduleReconnect(`kicked من السيرفر: ${reason}`);
  });

  bot.on('end', (reason) => {
    if (afkResetTimeout) clearTimeout(afkResetTimeout);
    scheduleReconnect(`انقطع الاتصال (end): ${reason}`);
  });

  bot.on('error', (err) => {
    console.log(`[Error] نوع الخطأ: ${err.name}, الرسالة: ${err.message}`);
  });
}

startBot();
