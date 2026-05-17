"""
Telegram Bot Example - TGE Discord Monitoring via PredictOS

Shows how a bot integrates with the TGE Discord Agent:
  - Agent handles detection (Discord + Dome + x402)
  - Bot handles trading (user's own wallet from DB)
"""

import os
import asyncio
from typing import Dict, Any

from telegram import Update, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

from client import PredictOSClient


predictos = PredictOSClient()

# Project configs: Discord channel + Polymarket market
PROJECTS: Dict[str, Dict[str, Any]] = {
    "Base": {
        "channel_id": "1072952844161916938",
        "market_slug": "will-base-launch-tge",
        "side": "YES",
    },
    "Opinion": {
        "channel_id": "your_opinion_channel_id",
        "market_slug": "will-opinion-launch-token",
        "side": "YES",
    },
}

_monitors: Dict[int, bool] = {}


def format_signal(signal: Dict[str, Any], project: str) -> str:
    if not signal.get("detected"):
        return f"[{project}] No TGE detected."

    lines = [
        f"[{project}] TGE DETECTED",
        f"Confidence: {signal.get('confidence', 0):.0%}",
        f"Keywords: {', '.join(signal.get('keywords', []))}",
        f"Action: {signal.get('recommendation', 'N/A')}",
    ]

    msg = signal.get("message")
    if msg:
        lines.append(f"\nSignal: {msg.get('content', '')[:200]}")

    # Dome market data
    for m in signal.get("dome_markets", []):
        prices = m.get("outcome_prices", [])
        yes_price = f"{prices[0]*100:.0f}%" if prices else "?"
        lines.append(f"\nMarket: {m['question']}")
        lines.append(f"  YES: {yes_price} | Vol: ${m.get('volume', 0):,.0f}")

    # x402 info
    tool = signal.get("tool_discovery")
    if tool:
        lines.append(f"\nx402: {tool['name']}")

    return "\n".join(lines)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    keyboard = [
        [KeyboardButton("Check TGE"), KeyboardButton("Start Monitor")],
        [KeyboardButton("Stop Monitor")],
    ]
    await update.message.reply_text(
        "TGE Discord Agent (powered by PredictOS)\n\n"
        "Check TGE - one-time signal check\n"
        "Start Monitor - auto-poll every 60s\n"
        "Stop Monitor - stop polling",
        reply_markup=ReplyKeyboardMarkup(keyboard, resize_keyboard=True),
    )


async def check_tge(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    keyboard = [[KeyboardButton(p) for p in PROJECTS], [KeyboardButton("Back")]]
    await update.message.reply_text(
        "Select project:",
        reply_markup=ReplyKeyboardMarkup(keyboard, resize_keyboard=True),
    )
    context.user_data["mode"] = "check"


async def start_monitor(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    keyboard = [[KeyboardButton(p) for p in PROJECTS], [KeyboardButton("Back")]]
    await update.message.reply_text(
        "Select project to monitor:",
        reply_markup=ReplyKeyboardMarkup(keyboard, resize_keyboard=True),
    )
    context.user_data["mode"] = "monitor"


async def handle_selection(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return

    project = update.message.text
    mode = context.user_data.pop("mode", None)

    if project not in PROJECTS:
        await update.message.reply_text("Unknown project.")
        return

    config = PROJECTS[project]

    if mode == "monitor":
        chat_id = update.message.chat_id
        if _monitors.get(chat_id):
            await update.message.reply_text("Already monitoring. Stop first.")
            return

        _monitors[chat_id] = True
        await update.message.reply_text(f"Monitoring {project} every 60s...")

        async def poll() -> None:
            while _monitors.get(chat_id):
                try:
                    signal = await asyncio.to_thread(
                        predictos.detect,
                        channel_id=config["channel_id"],
                        market_slug=config.get("market_slug"),
                    )
                    if signal.get("detected"):
                        msg = format_signal(signal, project)
                        confidence = signal.get("confidence", 0)

                        if confidence >= 0.6:
                            # ── YOUR BOT TRADES HERE ──
                            # user_wallet = get_wallet_from_db(chat_id)
                            # clob = create_clob_client(user_wallet)
                            # clob.place_order(tokenId=..., price=..., side="BUY")
                            msg += "\n\n>> Your bot would execute trade here <<"

                        await context.bot.send_message(chat_id=chat_id, text=msg)
                except Exception as exc:
                    await context.bot.send_message(chat_id=chat_id, text=f"Error: {exc}")
                await asyncio.sleep(60)

        asyncio.create_task(poll())
        return

    # One-time check
    loading = await update.message.reply_text(f"Checking {project}...")
    signal = await asyncio.to_thread(
        predictos.detect,
        channel_id=config["channel_id"],
        market_slug=config.get("market_slug"),
    )
    await loading.delete()
    await update.message.reply_text(format_signal(signal, project))


async def stop_monitor(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    chat_id = update.message.chat_id
    if _monitors.pop(chat_id, None):
        await update.message.reply_text("Stopped.")
    else:
        await update.message.reply_text("No monitor running.")


async def router(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return
    text = update.message.text
    if context.user_data.get("mode"):
        await handle_selection(update, context)
    elif text == "Check TGE":
        await check_tge(update, context)
    elif text == "Start Monitor":
        await start_monitor(update, context)
    elif text == "Stop Monitor":
        await stop_monitor(update, context)
    elif text == "Back":
        await start(update, context)


def main() -> None:
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        print("TELEGRAM_TOKEN not set")
        return

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, router))
    print("Bot started")
    app.run_polling()


if __name__ == "__main__":
    main()
