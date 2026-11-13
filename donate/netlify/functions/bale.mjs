// وب‌هوک بازوی حمایت مالی @virodonitbot — Saba Apps Studio
// متغیرهای محیطی در Netlify (Site settings → Environment variables):
//   BOT_TOKEN        توکن بازو
//   PROVIDER_TOKEN   توکن کیف‌پول بازو از @botfather (برای تست: WALLET-TEST-1111111111111111)
//   REPORT_CHAT_ID   شناسه کانال خصوصی گزارش‌ها (5211222990)
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
      "یکی از مبلغ‌ها را بزنید، یا مبلغ دلخواه را به تومان بنویسید (مثلاً 75000)." +
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

export default async (req) => {
  const url = new URL(req.url);
  if (req.method !== "POST") return new Response("ok");
  if (process.env.WEBHOOK_SECRET && url.searchParams.get("k") !== process.env.WEBHOOK_SECRET)
    return new Response("forbidden", { status: 403 });

  let u;
  try { u = await req.json(); } catch { return new Response("ok"); }

  try {
    // ۱) تأیید نهایی پیش از پرداخت (باید زیر ۱۰ ثانیه جواب بدهیم)
    if (u.pre_checkout_query) {
      await call("answerPreCheckoutQuery", { pre_checkout_query_id: u.pre_checkout_query.id, ok: true });
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
      const p = msg.successful_payment;
      const toman = Math.round(p.total_amount / 10);
      const w = who(msg.from);
      const when = new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
      await call("sendMessage", {
        chat_id: chatId,
        text: `🙏 پرداخت ${fa(toman)} تومانی شما رسید. از حمایت‌تان صمیمانه ممنونیم!\n— سید صبا میری، Saba Apps Studio`,
      });
      if (process.env.REPORT_CHAT_ID)
        await call("sendMessage", {
          chat_id: process.env.REPORT_CHAT_ID,
          text:
            `💚 حمایت جدید\n` +
            `مبلغ: ${fa(toman)} تومان\n` +
            `نام: ${w.name}\nنام کاربری: ${w.user}\nشناسه: ${w.id}\n` +
            `زمان: ${when}\n` +
            `شناسه تراکنش: ${p.telegram_payment_charge_id || "—"}\n` +
            `شماره پیگیری: ${p.provider_payment_charge_id || "—"}`,
        });
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
