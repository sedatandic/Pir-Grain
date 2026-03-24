"""
Market Data API Routes
- Commodity prices from Alpha Vantage/Yahoo Finance
- Turkish exchange prices (KTB, GTB)
- Market notes CRUD
- TMO Tenders CRUD
- Telegram channel management
"""

import os
import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from bson import ObjectId

from database import (
    market_prices_col, market_notes_col, tmo_tenders_col,
    telegram_channels_col, market_commodities_col, turkish_exchange_prices_col,
    serialize_doc
)
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/market", tags=["market"])

# Alpha Vantage API key (free tier)
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "demo")

# ============== MODELS ==============

class MarketNote(BaseModel):
    commodity: str
    period: str  # daily, monthly, yearly
    content: str
    tags: Optional[List[str]] = []

class TMOTender(BaseModel):
    tenderDate: str
    commodity: str  # Wheat, Corn, Barley
    quantities: Optional[dict] = {}  # port: quantity
    shipmentPeriodStart: Optional[str] = ""
    shipmentPeriodEnd: Optional[str] = ""
    status: Optional[str] = "open"  # open, closed, awarded
    results: Optional[List[dict]] = []  # [{company, price, port, quantity}]

class TelegramChannel(BaseModel):
    name: str
    channelId: str
    description: Optional[str] = ""
    isActive: Optional[bool] = True

class TurkishExchangePrice(BaseModel):
    exchange: str  # KTB, GTB
    product: str
    price: float
    unit: str
    date: str
    category: Optional[str] = ""

# ============== COMMODITY PRICES ==============

# Default market commodities to track
DEFAULT_COMMODITIES = [
    {"symbol": "WHEAT", "name": "Wheat", "type": "agricultural", "unit": "USD/bushel"},
    {"symbol": "CORN", "name": "Corn", "type": "agricultural", "unit": "USD/bushel"},
    {"symbol": "SOYBEAN", "name": "Soybeans", "type": "agricultural", "unit": "USD/bushel"},
    {"symbol": "BARLEY", "name": "Barley", "type": "agricultural", "unit": "USD/MT"},
    {"symbol": "SUNFLOWER", "name": "Sunflower", "type": "agricultural", "unit": "USD/MT"},
    {"symbol": "GOLD", "name": "Gold", "type": "metal", "unit": "USD/oz"},
    {"symbol": "CRUDE_OIL", "name": "Crude Oil", "type": "energy", "unit": "USD/barrel"},
    {"symbol": "EUR_USD", "name": "EUR/USD", "type": "currency", "unit": ""},
    {"symbol": "USD_RUB", "name": "USD/RUB", "type": "currency", "unit": ""},
    {"symbol": "USD_TRY", "name": "USD/TRY", "type": "currency", "unit": ""},
]

async def fetch_alpha_vantage_price(symbol: str, function: str = "GLOBAL_QUOTE"):
    """Fetch price from Alpha Vantage API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://www.alphavantage.co/query?function={function}&symbol={symbol}&apikey={ALPHA_VANTAGE_KEY}"
            response = await client.get(url)
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Alpha Vantage error for {symbol}: {e}")
    return None


async def fetch_live_currency_rates():
    """Fetch live currency rates from free exchangerate API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Use free open.er-api.com (no key required, reliable)
            url = "https://open.er-api.com/v6/latest/USD"
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                if data.get("result") == "success" and data.get("rates"):
                    return data["rates"]
    except Exception as e:
        print(f"Currency API error: {e}")
    return None


async def scrape_barchart_forex(symbol: str):
    """Scrape forex rate from Barchart.com"""
    import re
    try:
        url_map = {
            "EUR_USD": "https://www.barchart.com/forex/quotes/%5EEURUSD/overview",
            "USD_RUB": "https://www.barchart.com/forex/quotes/%5EUSDRUB/overview",
            "USD_TRY": "https://www.barchart.com/forex/quotes/%5EUSDTRY/overview",
        }
        
        url = url_map.get(symbol)
        if not url:
            return None
            
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code == 200:
                html = response.text
                
                # Extract from JSON in page: "lastPrice":"1.15864","priceChange":"-0.00270"
                price_match = re.search(r'"lastPrice"[:\s]*"?(\d+\.\d+)"?', html)
                change_match = re.search(r'"priceChange"[:\s]*"?([+-]?\d+\.\d+)"?', html)
                pct_match = re.search(r'"percentChange"[:\s]*"?([+-]?\d+\.\d+)%?"?', html)
                
                if price_match:
                    price = float(price_match.group(1))
                    change = float(change_match.group(1)) if change_match else 0
                    change_pct = float(pct_match.group(1)) if pct_match else 0
                    
                    return {
                        "price": price,
                        "change": change,
                        "changePercent": change_pct,
                        "source": "Barchart"
                    }
                    
    except Exception as e:
        print(f"Barchart scraping error for {symbol}: {e}")
    
    return None


async def fetch_commodity_price(symbol: str):
    """Fetch commodity price - try different sources"""
    # Map our symbols to Alpha Vantage symbols
    av_symbols = {
        "WHEAT": "WHEAT",
        "CORN": "CORN", 
        "SOYBEAN": "SOYBEAN",
        "GOLD": "XAUUSD",
        "CRUDE_OIL": "WTI",
        "EUR_USD": "EUR/USD",
        "USD_RUB": "USD/RUB",
        "USD_TRY": "USD/TRY",
    }
    
    av_symbol = av_symbols.get(symbol, symbol)
    
    # For forex - try Barchart scraping first, then fallback to API
    if symbol in ["EUR_USD", "USD_RUB", "USD_TRY"]:
        # Try Barchart first
        barchart_data = await scrape_barchart_forex(symbol)
        if barchart_data:
            # Cache the price
            market_prices_col.update_one(
                {"symbol": symbol},
                {"$set": {
                    "symbol": symbol, 
                    "price": barchart_data["price"], 
                    "change": barchart_data["change"], 
                    "changePercent": barchart_data["changePercent"], 
                    "source": "Barchart",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            return {
                "symbol": symbol,
                "price": round(barchart_data["price"], 5),
                "change": round(barchart_data["change"], 5),
                "changePercent": round(barchart_data["changePercent"], 2),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "isLive": True,
                "source": "Barchart"
            }
        
        # Fallback to open.er-api.com
        live_rates = await fetch_live_currency_rates()
        if live_rates:
            currency_map = {
                "EUR_USD": ("EUR", True),   # Need to invert (1/EUR rate)
                "USD_RUB": ("RUB", False),
                "USD_TRY": ("TRY", False),
            }
            curr_code, invert = currency_map.get(symbol, (None, False))
            if curr_code and curr_code in live_rates:
                rate = live_rates[curr_code]
                if invert:
                    rate = 1 / rate if rate else 0
                
                # Get cached price for change calculation
                cached = market_prices_col.find_one({"symbol": symbol}, sort=[("timestamp", -1)])
                old_price = cached.get("price", rate) if cached else rate
                change = rate - old_price
                change_pct = (change / old_price * 100) if old_price else 0
                
                # Cache the new price
                market_prices_col.update_one(
                    {"symbol": symbol},
                    {"$set": {"symbol": symbol, "price": rate, "change": change, "changePercent": change_pct, "timestamp": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
                
                return {
                    "symbol": symbol,
                    "price": round(rate, 4),
                    "change": round(change, 4),
                    "changePercent": round(change_pct, 2),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "isLive": True
                }
        
        # Fallback to Alpha Vantage
        from_curr, to_curr = symbol.replace("_", "/").split("/")
        data = await fetch_alpha_vantage_price(f"{from_curr}{to_curr}", "CURRENCY_EXCHANGE_RATE")
        if data and "Realtime Currency Exchange Rate" in data:
            rate_data = data["Realtime Currency Exchange Rate"]
            return {
                "symbol": symbol,
                "price": float(rate_data.get("5. Exchange Rate", 0)),
                "change": 0,
                "changePercent": 0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    # For commodities/stocks
    data = await fetch_alpha_vantage_price(av_symbol)
    if data and "Global Quote" in data:
        quote = data["Global Quote"]
        return {
            "symbol": symbol,
            "price": float(quote.get("05. price", 0)),
            "change": float(quote.get("09. change", 0)),
            "changePercent": float(quote.get("10. change percent", "0%").replace("%", "")),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    # Return cached or mock data if API fails
    cached = market_prices_col.find_one({"symbol": symbol}, sort=[("timestamp", -1)])
    if cached:
        return serialize_doc(cached)
    
    # Generate realistic mock data
    mock_prices = {
        "WHEAT": {"price": 585.25, "change": 2.50, "changePercent": 0.43},
        "CORN": {"price": 445.75, "change": -1.25, "changePercent": -0.28},
        "SOYBEAN": {"price": 1025.50, "change": 5.75, "changePercent": 0.56},
        "BARLEY": {"price": 210.00, "change": 1.00, "changePercent": 0.48},
        "SUNFLOWER": {"price": 520.00, "change": -2.00, "changePercent": -0.38},
        "GOLD": {"price": 2345.80, "change": 12.40, "changePercent": 0.53},
        "CRUDE_OIL": {"price": 78.45, "change": -0.85, "changePercent": -1.07},
        "EUR_USD": {"price": 1.0875, "change": 0.0012, "changePercent": 0.11},
        "USD_RUB": {"price": 92.45, "change": 0.35, "changePercent": 0.38},
        "USD_TRY": {"price": 34.25, "change": 0.08, "changePercent": 0.23},
    }
    
    mock = mock_prices.get(symbol, {"price": 100.00, "change": 0, "changePercent": 0})
    return {
        "symbol": symbol,
        "price": mock["price"],
        "change": mock["change"],
        "changePercent": mock["changePercent"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "isMock": True
    }


@router.get("/prices")
async def get_market_prices(user=Depends(get_current_user)):
    """Get all commodity prices"""
    prices = []
    for commodity in DEFAULT_COMMODITIES:
        price_data = await fetch_commodity_price(commodity["symbol"])
        if price_data:
            price_data["name"] = commodity["name"]
            price_data["type"] = commodity["type"]
            price_data["unit"] = commodity["unit"]
            prices.append(price_data)
    return prices


@router.get("/prices/{symbol}")
async def get_commodity_price(symbol: str, user=Depends(get_current_user)):
    """Get price for a specific commodity"""
    commodity = next((c for c in DEFAULT_COMMODITIES if c["symbol"] == symbol), None)
    if not commodity:
        raise HTTPException(status_code=404, detail="Commodity not found")
    
    price_data = await fetch_commodity_price(symbol)
    if price_data:
        price_data["name"] = commodity["name"]
        price_data["type"] = commodity["type"]
        price_data["unit"] = commodity["unit"]
    return price_data


@router.get("/prices/{symbol}/history")
async def get_price_history(
    symbol: str,
    period: str = Query("daily", enum=["daily", "monthly", "yearly"]),
    user=Depends(get_current_user)
):
    """Get historical prices for charts"""
    # Try Alpha Vantage time series
    function_map = {
        "daily": "TIME_SERIES_DAILY",
        "monthly": "TIME_SERIES_MONTHLY",
        "yearly": "TIME_SERIES_MONTHLY"  # Use monthly for yearly view
    }
    
    # For now, return mock historical data
    import random
    base_prices = {
        "WHEAT": 580, "CORN": 440, "SOYBEAN": 1020, "BARLEY": 205,
        "SUNFLOWER": 515, "GOLD": 2300, "CRUDE_OIL": 77,
        "EUR_USD": 1.08, "USD_RUB": 91, "USD_TRY": 34
    }
    
    base = base_prices.get(symbol, 100)
    days = {"daily": 30, "monthly": 12, "yearly": 5}[period]
    
    history = []
    for i in range(days, 0, -1):
        if period == "daily":
            date = datetime.now(timezone.utc) - timedelta(days=i)
        elif period == "monthly":
            date = datetime.now(timezone.utc) - timedelta(days=i*30)
        else:
            date = datetime.now(timezone.utc) - timedelta(days=i*365)
        
        variance = base * 0.05  # 5% variance
        price = base + random.uniform(-variance, variance)
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": round(price, 2),
            "open": round(price - random.uniform(0, variance/2), 2),
            "high": round(price + random.uniform(0, variance/2), 2),
            "low": round(price - random.uniform(0, variance/2), 2),
            "close": round(price, 2)
        })
    
    return {"symbol": symbol, "period": period, "history": history}


# ============== TURKISH EXCHANGE PRICES ==============

@router.get("/turkish-exchanges")
async def get_turkish_exchange_prices(user=Depends(get_current_user)):
    """Get prices from Turkish commodity exchanges (KTB, GTB)"""
    prices = list(turkish_exchange_prices_col.find().sort("date", -1).limit(100))
    return [serialize_doc(p) for p in prices]


@router.post("/turkish-exchanges")
async def add_turkish_exchange_price(data: TurkishExchangePrice, user=Depends(require_roles("admin"))):
    """Manually add Turkish exchange price"""
    doc = {
        **data.dict(),
        "createdBy": user.get("username"),
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    result = turkish_exchange_prices_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.delete("/turkish-exchanges/{price_id}")
async def delete_turkish_exchange_price(price_id: str, user=Depends(require_roles("admin"))):
    """Delete Turkish exchange price entry"""
    turkish_exchange_prices_col.delete_one({"_id": ObjectId(price_id)})
    return {"message": "Deleted"}


# ============== MARKET NOTES ==============

@router.get("/notes")
async def get_market_notes(
    commodity: Optional[str] = None,
    period: Optional[str] = None,
    tag: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Get market notes with optional filters"""
    query = {}
    if commodity:
        query["commodity"] = commodity
    if period:
        query["period"] = period
    if tag:
        query["tags"] = tag
    
    notes = list(market_notes_col.find(query).sort("createdAt", -1).limit(100))
    return [serialize_doc(n) for n in notes]


@router.post("/notes")
async def create_market_note(note: MarketNote, user=Depends(get_current_user)):
    """Create a new market note"""
    doc = {
        **note.dict(),
        "createdBy": user.get("username"),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    result = market_notes_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/notes/{note_id}")
async def update_market_note(note_id: str, note: MarketNote, user=Depends(get_current_user)):
    """Update a market note"""
    update_data = {
        **note.dict(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "updatedBy": user.get("username")
    }
    market_notes_col.update_one(
        {"_id": ObjectId(note_id)},
        {"$set": update_data}
    )
    updated = market_notes_col.find_one({"_id": ObjectId(note_id)})
    return serialize_doc(updated)


@router.delete("/notes/{note_id}")
async def delete_market_note(note_id: str, user=Depends(get_current_user)):
    """Delete a market note"""
    market_notes_col.delete_one({"_id": ObjectId(note_id)})
    return {"message": "Note deleted"}


# ============== TMO TENDERS ==============

@router.get("/tenders")
async def get_tmo_tenders(
    status: Optional[str] = None,
    commodity: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Get TMO tenders with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if commodity:
        query["commodity"] = commodity
    
    tenders = list(tmo_tenders_col.find(query).sort("tenderDate", -1))
    return [serialize_doc(t) for t in tenders]


@router.post("/tenders")
async def create_tmo_tender(tender: TMOTender, user=Depends(require_roles("admin"))):
    """Create a new TMO tender"""
    doc = {
        **tender.dict(),
        "createdBy": user.get("username"),
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    result = tmo_tenders_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/tenders/{tender_id}")
async def update_tmo_tender(tender_id: str, tender: TMOTender, user=Depends(require_roles("admin"))):
    """Update a TMO tender"""
    update_data = {
        **tender.dict(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "updatedBy": user.get("username")
    }
    tmo_tenders_col.update_one(
        {"_id": ObjectId(tender_id)},
        {"$set": update_data}
    )
    updated = tmo_tenders_col.find_one({"_id": ObjectId(tender_id)})
    return serialize_doc(updated)


@router.post("/tenders/{tender_id}/results")
async def add_tender_result(tender_id: str, result: dict, user=Depends(require_roles("admin"))):
    """Add a result to a TMO tender"""
    tmo_tenders_col.update_one(
        {"_id": ObjectId(tender_id)},
        {
            "$push": {"results": {**result, "addedAt": datetime.now(timezone.utc).isoformat()}},
            "$set": {"updatedAt": datetime.now(timezone.utc).isoformat()}
        }
    )
    updated = tmo_tenders_col.find_one({"_id": ObjectId(tender_id)})
    return serialize_doc(updated)


@router.delete("/tenders/{tender_id}")
async def delete_tmo_tender(tender_id: str, user=Depends(require_roles("admin"))):
    """Delete a TMO tender"""
    tmo_tenders_col.delete_one({"_id": ObjectId(tender_id)})
    return {"message": "Tender deleted"}


# ============== TELEGRAM CHANNELS ==============

@router.get("/telegram/channels")
async def get_telegram_channels(user=Depends(get_current_user)):
    """Get list of Telegram channels"""
    channels = list(telegram_channels_col.find())
    return [serialize_doc(c) for c in channels]


@router.post("/telegram/channels")
async def add_telegram_channel(channel: TelegramChannel, user=Depends(require_roles("admin"))):
    """Add a Telegram channel"""
    doc = {
        **channel.dict(),
        "createdBy": user.get("username"),
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    result = telegram_channels_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.delete("/telegram/channels/{channel_id}")
async def delete_telegram_channel(channel_id: str, user=Depends(require_roles("admin"))):
    """Delete a Telegram channel"""
    telegram_channels_col.delete_one({"_id": ObjectId(channel_id)})
    return {"message": "Channel deleted"}


@router.get("/telegram/messages")
async def get_telegram_messages(user=Depends(get_current_user)):
    """
    Get messages from Telegram channels.
    Requires TELEGRAM_BOT_TOKEN environment variable.
    """
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        return {"error": "Telegram bot token not configured", "messages": []}
    
    channels = list(telegram_channels_col.find({"isActive": True}))
    all_messages = []
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for channel in channels:
            try:
                # Get updates from Telegram Bot API
                url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        for update in data.get("result", [])[-20:]:  # Last 20 messages
                            msg = update.get("channel_post") or update.get("message")
                            if msg:
                                all_messages.append({
                                    "channelName": channel.get("name"),
                                    "channelId": channel.get("channelId"),
                                    "text": msg.get("text", ""),
                                    "date": msg.get("date"),
                                    "messageId": msg.get("message_id")
                                })
            except Exception as e:
                print(f"Error fetching Telegram messages: {e}")
    
    # Sort by date descending
    all_messages.sort(key=lambda x: x.get("date", 0), reverse=True)
    return {"messages": all_messages[:50]}


# ============== COMMODITIES CONFIG ==============

@router.get("/commodities")
async def get_market_commodities(user=Depends(get_current_user)):
    """Get list of tracked commodities"""
    commodities = list(market_commodities_col.find())
    if not commodities:
        # Initialize with defaults
        for comm in DEFAULT_COMMODITIES:
            market_commodities_col.insert_one(comm)
        commodities = list(market_commodities_col.find())
    return [serialize_doc(c) for c in commodities]


@router.post("/commodities")
async def add_market_commodity(commodity: dict, user=Depends(require_roles("admin"))):
    """Add a new commodity to track"""
    result = market_commodities_col.insert_one(commodity)
    commodity["_id"] = result.inserted_id
    return serialize_doc(commodity)


@router.delete("/commodities/{commodity_id}")
async def delete_market_commodity(commodity_id: str, user=Depends(require_roles("admin"))):
    """Remove a commodity from tracking"""
    market_commodities_col.delete_one({"_id": ObjectId(commodity_id)})
    return {"message": "Commodity removed"}
