// Telegram.js
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();


const token = '8314275448:AAG6bC-5ms-EsOZyaQ2LozKoyQkSS5gOQhs';

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN не найден в .env");
  process.exit(1);
}

// создаём бота (long polling)
export const bot = new TelegramBot(token, { polling: true });

// приветственное сообщение
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Привет, ${msg.from.first_name || "друг"} 👋\nЯ бот-гид!`);
});
