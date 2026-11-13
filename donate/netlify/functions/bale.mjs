// وب‌هوک بازوی حمایت مالی @virodonitbot — Saba Apps Studio
// متغیرهای محیطی در Netlify (Site settings → Environment variables):
//   BOT_TOKEN        توکن بازو
//   PROVIDER_TOKEN   توکن کیف‌پول بازو از @botfather (برای تست: WALLET-TEST-1111111111111111)
//   REPORT_CHAT_ID   شناسه کانال خصوصی گزارش‌ها
//   WEBHOOK_SECRET   یک رشته تصادفی؛ همان را در آدرس وب‌هوک ?k= می‌گذاریم
const API = (m) => `https://tapi.bale.ai/bot${process.env.BOT_TOKEN}/${m}`;
const AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000]; // تومان
const MIN = 10000, MAX = 50000000;
const fa = (n) => Number(n).toLocaleString("fa-IR");
const PAGE = process.env.PAGE_URL || "";

async function call(method, body) {
  const r = await fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

const toLatin = (s) =>
  String(s || "")
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[^\d]/g, "");

function menu(chatId) {
  const rows = [];
  for (let i = 0; i < AMOUNTS.length; i += 3)
    rows.push(AMOUNTS.slice(i, i + 3).map((t) => ({
      text: t >= 1e6 ? `${fa(t / 1e6)} میلیون تومان` : `${fa(t / 1000)} هزار تومان`,
      callback_data: `d${t}`,
    })));
  return call("sendMessage", {
    chat_id: chatId,
    text:
      "💚 ممنون که از اپ‌های رایگان Saba Apps Studio حمایت می‌کنید.\n\n" +
      "یکی از مبلغ‌ها را بزنید، یا مبلغ دلخواه را به تومان بنویسید (مثلاً 75000).\n⚠️ هنگام پرداخت فیلترشکن را خاموش کنید." +
      (PAGE ? `\n\nصفحه حمایت: ${PAGE}` : ""),
    reply_markup: { inline_keyboard: rows },
  });
}

function invoice(chatId, toman) {
  return call("sendInvoice", {
    chat_id: chatId,
    title: "حمایت از Saba Apps Studio",
    description: `حمایت ${fa(toman)} تومانی از ساخت اپ‌های رایگان فارسی هوش مصنوعی. ممنونیم 💚`,
    payload: `don:${toman}:${Date.now()}`,
    provider_token: process.env.PROVIDER_TOKEN,
    prices: [{ label: "حمایت مالی", amount: toman * 10 }], // ریال
  });
}

async function askAmount(chatId, toman) {
  if (!toman || toman < MIN)
    return call("sendMessage", { chat_id: chatId, text: `حداقل مبلغ ${fa(MIN)} تومان است.` });
  if (toman > MAX)
    return call("sendMessage", { chat_id: chatId, text: `حداکثر مبلغ ${fa(MAX)} تومان است.` });
  return invoice(chatId, toman);
}

function who(u = {}) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "بی‌نام";
  return { name, user: u.username ? "@" + u.username : "—", id: u.id };
}

async function report(from, toman, txId, track, via) {
  if (!process.env.REPORT_CHAT_ID) return;
  const w = who(from);
  const when = new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
  const rep = await call("sendMessage", {
    chat_id: process.env.REPORT_CHAT_ID.trim(),
    text:
      `💚 حمایت جدید\n` +
      `مبلغ: ${fa(toman)} تومان\n` +
      `نام: ${w.name}\nنام کاربری: ${w.user}\nشناسه: ${w.id}\n` +
      `زمان: ${when}\n` +
      `شناسه تراکنش: ${txId || "—"}\n` +
      `شماره پیگیری: ${track || "—"}` + (via ? `\n(${via})` : ""),
  });
  if (!rep || !rep.ok) console.error("report failed", JSON.stringify(rep));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// کلید مخفی آدرس وب‌هوک: WEBHOOK_SECRET یا (اگر نبود) هش توکن بازو
async function hookKey() {
  if (process.env.WEBHOOK_SECRET) return process.env.WEBHOOK_SECRET;
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("saba-donate:" + process.env.BOT_TOKEN));
  return [...new Uint8Array(d)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async (req) => {
  const url = new URL(req.url);
  const key = await hookKey();

  // راه‌اندازی یک‌باره: باز کردن ‎/.netlify/functions/bale?setup=1‎ وب‌هوک بازو را روی همین آدرس تنظیم می‌کند
  if (req.method === "GET" && url.searchParams.get("setup") === "1") {
    const hook = `${url.origin}${url.pathname}?k=${key}`;
    const r = await call("setWebhook", { url: hook });
    return new Response(r && r.ok ? "وب‌هوک تنظیم شد ✅" : "خطا در تنظیم وب‌هوک: " + JSON.stringify(r), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  // عیب‌یابی: ‎?diag=1&k=KEY‎ یک پیام آزمایشی به کانال گزارش می‌فرستد و پاسخ بله را نشان می‌دهد
  if (req.method === "GET" && url.searchParams.get("diag") === "1") {
    if (url.searchParams.get("k") !== key) return new Response("forbidden", { status: 403 });
    const rc = process.env.REPORT_CHAT_ID || "";
    const r = await call("sendMessage", { chat_id: rc.trim(), text: "🔧 پیام آزمایشی گزارش از سرور Netlify" });
    return new Response(JSON.stringify({ report_chat_id_set: !!rc, report_chat_id_len: rc.length, provider_token_set: !!process.env.PROVIDER_TOKEN, bale: r }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
  }
  if (req.method !== "POST") return new Response("ok");
  if (url.searchParams.get("k") !== key) return new Response("forbidden", { status: 403 });

  let u;
  try { u = await req.json(); } catch { return new Response("ok"); }

  try {
    // ۱) تأیید نهایی پیش از پرداخت (باید زیر ۱۰ ثانیه جواب بدهیم)
    if (u.pre_checkout_query) {
      const q = u.pre_checkout_query;
      await call("answerPreCheckoutQuery", { pre_checkout_query_id: q.id, ok: true });
      // بله همیشه successful_payment را به وب‌هوک نمی‌فرستد؛ پس وضعیت را خودمان استعلام می‌کنیم
      for (let i = 0; i < 6; i++) {
        await sleep(800);
        const t = await call("inquireTransaction", { transaction_id: q.id });
        const st = t && t.result && t.result.status;
        if (st === "paid") {
          const toman = Math.round(q.total_amount / 10);
          await call("sendMessage", { chat_id: q.from.id, text: `🙏 پرداخت ${fa(toman)} تومانی شما رسید. از حمایت‌تان صمیمانه ممنونیم!\n— سید صبا میری، Saba Apps Studio` });
          await report(q.from, toman, q.id, t.result.id, "تأیید با استعلام");
          break;
        }
        if (st === "failed" || st === "rejected") break;
      }
      return new Response("ok");
    }

    // ۲) دکمه‌های مبلغ داخل بازو
    if (u.callback_query) {
      const cq = u.callback_query;
      await call("answerCallbackQuery", { callback_query_id: cq.id }).catch(() => {});
      const m = /^d(\d+)$/.exec(cq.data || "");
      if (m) await askAmount(cq.message?.chat?.id || cq.from.id, parseInt(m[1], 10));
      return new Response("ok");
    }

    const msg = u.message;
    if (!msg) return new Response("ok");
    const chatId = msg.chat.id;

    // ۳) پرداخت موفق → تشکر + گزارش به کانال خصوصی
    if (msg.successful_payment) {
      // پشتیبان: اگر بله این پیام را فرستاد، گزارش آن هم ثبت می‌شود
      const p = msg.successful_payment;
      await report(msg.from, Math.round(p.total_amount / 10), p.telegram_payment_charge_id, p.provider_payment_charge_id, "رسید پرداخت");
      return new Response("ok");
    }

    const text = (msg.text || "").trim();
    // ۴) /start از صفحه حمایت: /start d200000
    if (text.startsWith("/start")) {
      const m = /d(\d+)/.exec(text.split(" ")[1] || "");
      if (m) await askAmount(chatId, parseInt(m[1], 10));
      else await menu(chatId);
      return new Response("ok");
    }

    // ۵) عدد دلخواه
    const n = parseInt(toLatin(text) || "0", 10);
    if (n) await askAmount(chatId, n);
    else await menu(chatId);
  } catch (e) {
    console.error(e);
  }
  return new Response("ok");
};
