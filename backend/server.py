import os
import uuid
import random
import string
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pymongo import MongoClient
from bson import ObjectId
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ─── Config ─────────────────────────────────────────────────
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "pir_grain_pulses")
SECRET_KEY = os.environ.get("SECRET_KEY", "pir-grain-pulses-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
UPLOAD_DIR = "/app/backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

users_col = db["users"]
trades_col = db["trades"]
partners_col = db["partners"]
vessels_col = db["vessels"]
documents_col = db["documents"]
commodities_col = db["commodities"]
origins_col = db["origins"]
ports_col = db["ports"]
surveyors_col = db["surveyors"]
events_col = db["events"]
invoices_col = db["invoices"]
bank_statements_col = db["bank_statements"]
notifications_col = db["notifications"]

# ─── Constants ───────────────────────────────────────────────
TRADE_STATUSES = [
    "confirmation", "draft-contract", "nomination-sent", "di-sent",
    "drafts-confirmation", "appropriation", "dox", "pmt", "disch",
    "shortage", "demurrage", "dispatch", "brokerage",
    "completed", "cancelled", "washout"
]

# ─── Helpers ────────────────────────────────────────────────
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            doc[key] = str(value)
    return doc

def create_notification(ntype, message, entity_ref=None, username=None):
    notifications_col.insert_one({
        "type": ntype,
        "message": message,
        "entityRef": entity_ref,
        "username": username or "system",
        "readBy": [],
        "createdAt": datetime.utcnow()
    })


def generate_ref():
    year = datetime.now().strftime("%y")
    num = random.randint(1000, 9999)
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    return f"PIR-{year}-{letters}{num}"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = users_col.find_one({"username": username})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return serialize_doc(user)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Pydantic Models ───────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TradeCreate(BaseModel):
    sellerId: Optional[str] = None
    buyerId: Optional[str] = None
    brokerId: Optional[str] = None
    coBrokerId: Optional[str] = None
    commodityId: Optional[str] = None
    originId: Optional[str] = None
    quantity: Optional[float] = 0
    tolerance: Optional[str] = None
    deliveryTerm: Optional[str] = None
    pricePerMT: Optional[float] = 0
    currency: Optional[str] = "USD"
    paymentTerms: Optional[str] = None
    incoterms: Optional[str] = None
    loadingPortId: Optional[str] = None
    dischargePortId: Optional[str] = None
    shipmentWindowStart: Optional[str] = None
    shipmentWindowEnd: Optional[str] = None
    vesselName: Optional[str] = None
    surveyorId: Optional[str] = None
    brokeragePerMT: Optional[float] = 0
    contractDate: Optional[str] = None
    contractNumber: Optional[str] = None
    specialConditions: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "confirmation"
    sellerTradeContact: Optional[dict] = None
    sellerExecutionContact: Optional[dict] = None
    buyerTradeContact: Optional[dict] = None
    buyerExecutionContact: Optional[dict] = None
    brokerTradeContact: Optional[dict] = None
    brokerExecutionContact: Optional[dict] = None
    coBrokerTradeContact: Optional[dict] = None
    coBrokerExecutionContact: Optional[dict] = None

class TradeUpdate(TradeCreate):
    pass

class TradeStatusUpdate(BaseModel):
    status: str

class PartnerCreate(BaseModel):
    companyName: str
    companyCode: Optional[str] = None
    contactPerson: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    type: str = "buyer"
    origins: Optional[list] = []
    tradeContacts: Optional[list] = []
    executionContacts: Optional[list] = []
    departments: Optional[list] = []  # [{name, contacts: [{name, email, phone, role}]}]
    notes: Optional[str] = None

class VesselCreate(BaseModel):
    name: str
    imoNumber: Optional[str] = None
    flag: Optional[str] = None
    builtYear: Optional[int] = None
    vesselType: Optional[str] = "Bulk Carrier"

class SurveyorCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    countriesServed: Optional[list] = []

class CommodityCreate(BaseModel):
    name: str
    code: Optional[str] = None
    group: Optional[str] = None
    hsCode: Optional[str] = None
    description: Optional[str] = None

class OriginCreate(BaseModel):
    name: str
    adjective: Optional[str] = None
    code: Optional[str] = None

class PortCreate(BaseModel):
    name: str
    type: Optional[str] = "loading"
    country: Optional[str] = None
    countryCode: Optional[str] = None

class EventCreate(BaseModel):
    title: str
    date: str
    type: Optional[str] = "other"
    description: Optional[str] = None
    tradeId: Optional[str] = None
    partnerId: Optional[str] = None
    paymentDueDate: Optional[str] = None

class InvoiceCreate(BaseModel):
    invoiceNumber: str
    vendorName: str
    amount: float
    currency: Optional[str] = "USD"
    dueDate: str
    category: Optional[str] = "other"
    description: Optional[str] = None
    status: Optional[str] = "pending"

class BankStatementCreate(BaseModel):
    month: int
    year: int
    description: Optional[str] = None
    fileName: Optional[str] = None
    fileData: Optional[str] = None  # base64 encoded

class UserCreate(BaseModel):
    name: str
    username: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    mobile: Optional[str] = None
    password: str
    role: Optional[str] = "user"

# ─── Seed Data ──────────────────────────────────────────────
def seed_data():
    if users_col.count_documents({}) == 0:
        users_col.insert_many([
            {
                "username": "salihkaragoz",
                "password": pwd_context.hash("salih123"),
                "role": "admin",
                "name": "Salih Karagoz",
                "email": "salih@pirgrains.com",
                "status": "active",
                "createdAt": datetime.utcnow()
            },
            {
                "username": "piraccount",
                "password": pwd_context.hash("piraccount123"),
                "role": "accountant",
                "name": "PIR Accountant",
                "email": "accounting@pirgrains.com",
                "status": "active",
                "createdAt": datetime.utcnow()
            }
        ])

    # Always reseed commodities with the canonical list
    commodities_col.delete_many({})
    comms = [
        {"name": "10.5 % Pro. Wheat", "code": "WH", "group": "Grains", "hsCode": "1001.99.00.00.11"},
        {"name": "11.5 % Pro. Wheat", "code": "WH", "group": "Grains", "hsCode": "1001.99.00.00.11"},
        {"name": "12.5 % Pro. Wheat", "code": "WH", "group": "Grains", "hsCode": "1001.99.00.00.11"},
        {"name": "13.5 % Pro. Wheat", "code": "WH", "group": "Grains", "hsCode": "1001.99.00.00.11"},
        {"name": "14.5 % Pro. Wheat", "code": "WH", "group": "Grains", "hsCode": "1001.99.00.00.11"},
        {"name": "15.3 % Pro. Wheat", "code": "WH", "group": "Grains", "hsCode": "1001.99.00.00.11"},
        {"name": "Barley", "code": "BAR", "group": "Grains", "hsCode": "1003.90.00.00.19"},
        {"name": "Yellow Corn", "code": "CORN", "group": "Grains", "hsCode": "1005.90.00.00.19"},
        {"name": "34,5 % Pro. Sunflower Meal Pellets", "code": "SFMP", "group": "Feedstuffs", "hsCode": "2306.30.00.00.00"},
        {"name": "35 % Pro. Sunflower Meal Pellets", "code": "SFMP", "group": "Feedstuffs", "hsCode": "2306.30.00.00.00"},
        {"name": "Sugar Beet Pulp Pellets", "code": "SBPP", "group": "Feedstuffs", "hsCode": "2303.20.10.00.00"},
        {"name": "Sunflower Husk Pellets", "code": "HUSK", "group": "Feedstuffs", "hsCode": "2308.00.90.00.00"},
        {"name": "Wheat Bran Pellets", "code": "WBP", "group": "Feedstuffs", "hsCode": "2302.30.10.00.11"},
        {"name": "Soybeans", "code": "SBS", "group": "Oilseeds", "hsCode": "1201.90.00.00.00"},
        {"name": "Sunflower Seeds", "code": "SFS", "group": "Oilseeds", "hsCode": "1206.00.99.00.19"},
        {"name": "Green Lentils", "code": "WGL", "group": "Pulses & Rice", "hsCode": "0713.40.00.00.12"},
        {"name": "Kabuli Chickpeas", "code": "KCP", "group": "Pulses & Rice", "hsCode": "0713.20.00.00.19"},
        {"name": "Red Lentils", "code": "WRL", "group": "Pulses & Rice", "hsCode": "0713.40.00.00.13"},
        {"name": "White Rice", "code": "RICE", "group": "Pulses & Rice", "hsCode": "1006.30.27.00.00"},
        {"name": "Yellow Peas", "code": "PEAS", "group": "Pulses & Rice", "hsCode": "0713.10.10.00.00"},
    ]
    for c in comms:
        c["createdAt"] = datetime.utcnow()
        commodities_col.insert_one(c)

    # Always reseed origins with the canonical list
    origins_col.delete_many({})
    origins = [
        {"name": "Russia", "adjective": "Russian", "code": "RUS"},
        {"name": "Ukraine", "adjective": "Ukrainian", "code": "UKR"},
        {"name": "Moldova", "adjective": "Moldovian", "code": "MOL"},
        {"name": "Romania", "adjective": "Romanian", "code": "ROM"},
        {"name": "Italy", "adjective": "Italian", "code": "ITA"},
        {"name": "Bulgaria", "adjective": "Bulgarian", "code": "BUL"},
        {"name": "Any", "adjective": "Any", "code": "ANY"},
    ]
    for o in origins:
        o["createdAt"] = datetime.utcnow()
        origins_col.insert_one(o)

    # Always reseed ports with the canonical list
    ports_col.delete_many({})
    ports = [
        # Loading Ports
        {"name": "Azov", "type": "loading", "country": "Russia", "countryCode": "RU"},
        {"name": "Bagaevskaya", "type": "loading", "country": "Russia", "countryCode": "RU"},
        {"name": "Chornomorsk", "type": "loading", "country": "Ukraine", "countryCode": "UA"},
        {"name": "Giurgiulești", "type": "loading", "country": "Moldova", "countryCode": "MOL"},
        {"name": "Izmail", "type": "loading", "country": "Ukraine", "countryCode": "UA"},
        {"name": "Manfredonia", "type": "loading", "country": "Italy", "countryCode": "IT"},
        {"name": "Molfetta", "type": "loading", "country": "Italy", "countryCode": "IT"},
        {"name": "Odessa", "type": "loading", "country": "Ukraine", "countryCode": "UA"},
        {"name": "Pivdennyi", "type": "loading", "country": "Ukraine", "countryCode": "UA"},
        {"name": "Ravenna", "type": "loading", "country": "Italy", "countryCode": "IT"},
        {"name": "Reni", "type": "loading", "country": "Ukraine", "countryCode": "UA"},
        {"name": "Rostov", "type": "loading", "country": "Russia", "countryCode": "RU"},
        {"name": "Taganrog", "type": "loading", "country": "Russia", "countryCode": "RU"},
        {"name": "Trieste", "type": "loading", "country": "Italy", "countryCode": "IT"},
        {"name": "Yeisk", "type": "loading", "country": "Russia", "countryCode": "RU"},
        # Discharge Ports
        {"name": "Adana Sanko", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Alexandria", "type": "discharge", "country": "Egypt", "countryCode": "EG"},
        {"name": "Bandırma", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Bizerte", "type": "discharge", "country": "Tunisia", "countryCode": "TN"},
        {"name": "Catania", "type": "discharge", "country": "Italy", "countryCode": "IT"},
        {"name": "Ceyhan Toros", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Famagusta", "type": "discharge", "country": "Cyprus", "countryCode": "CY"},
        {"name": "Gemlik", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Giresun", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "İskenderun", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "İzmir", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "İzmit", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Karasu", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Mersin", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Pozzallo", "type": "discharge", "country": "Italy", "countryCode": "IT"},
        {"name": "Samsun", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Sfax", "type": "discharge", "country": "Tunisia", "countryCode": "TN"},
        {"name": "Tekirdağ", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
        {"name": "Trabzon", "type": "discharge", "country": "Türkiye", "countryCode": "TR"},
    ]
    for p in ports:
        p["createdAt"] = datetime.utcnow()
        ports_col.insert_one(p)

    if partners_col.count_documents({}) == 0:
        partners = [
            {"companyName": "Pir Grain & Pulses Ltd", "companyCode": "PIR", "contactPerson": "Trade Contact", "email": "trading@pirgrains.com", "phone": "+359 32 000 000", "city": "Plovdiv", "country": "Bulgaria", "type": "broker", "address": "Tsarigradsko Shose Blvd. No:73"},
            {"companyName": "Atria Brokers FZCO", "companyCode": "ATRIA", "contactPerson": "Trade Desk", "email": "trading@atriabrokers.ae", "phone": "+971 4 000 0000", "city": "Dubai", "country": "UAE", "type": "broker", "address": "Dubai Silicon Oasis, DDP"},
            {"companyName": "Nord Star LLC", "companyCode": "NORD", "contactPerson": "Trade Manager", "email": "trade@nordstar.ru", "phone": "+7 863 000 0000", "city": "Rostov-on-Don", "country": "Russia", "type": "broker", "address": "Vasnetsova 10A, Azov"},
            {"companyName": "AgroTrade International", "companyCode": "AGRO", "contactPerson": "Ahmed Hassan", "email": "ahmed@agrotrade.com", "phone": "+971 4 000 0000", "city": "Dubai", "country": "UAE", "type": "buyer", "address": "Trade Center, Dubai"},
            {"companyName": "Al Manar Trading", "companyCode": "ALM", "contactPerson": "Khalid Al Rashid", "email": "khalid@almanar.sa", "phone": "+966 1 000 0000", "city": "Jeddah", "country": "Saudi Arabia", "type": "buyer", "address": "King Fahd Rd"},
            {"companyName": "Asia Pulses Corp", "companyCode": "APC", "contactPerson": "Rajesh Kumar", "email": "rajesh@asiapulses.in", "phone": "+91 22 000 0000", "city": "Mumbai", "country": "India", "type": "buyer", "address": "Nariman Point"},
            {"companyName": "Black Sea Exports Ltd", "companyCode": "BSE", "contactPerson": "Ivan Petrov", "email": "ivan@bsexports.com", "phone": "+7 863 000 0000", "city": "Rostov", "country": "Russia", "type": "seller", "address": "Port District"},
            {"companyName": "Balkan Grains OOD", "companyCode": "BG", "contactPerson": "Georgi Dimitrov", "email": "georgi@balkangrains.bg", "phone": "+359 32 000 000", "city": "Plovdiv", "country": "Bulgaria", "type": "seller", "address": "Industrial Zone"},
            {"companyName": "Anatolia Commodities", "companyCode": "ANA", "contactPerson": "Mehmet Yilmaz", "email": "mehmet@anatoliacm.tr", "phone": "+90 312 000 0000", "city": "Ankara", "country": "Turkey", "type": "seller", "address": "Trade Blvd"},
            {"companyName": "Mediterranean Brokers", "companyCode": "MED", "contactPerson": "Marco Rossi", "email": "marco@medbrokers.it", "phone": "+39 02 000 0000", "city": "Milan", "country": "Italy", "type": "co-broker", "address": "Via Roma 12"},
        ]
        for p in partners:
            p["createdAt"] = datetime.utcnow()
            p["updatedAt"] = datetime.utcnow()
            p["tradeContacts"] = [{"name": p["contactPerson"], "email": p["email"], "phone": p["phone"]}]
            p["executionContacts"] = []
            partners_col.insert_one(p)

    # Always reseed vessels with the canonical list
    from vessel_data import VESSELS
    vessels_col.delete_many({})
    for v in VESSELS:
        v["createdAt"] = datetime.utcnow()
        vessels_col.insert_one(v)

    # Always reseed surveyors with the canonical list
    surveyors_col.delete_many({})
    surveyors = [
        {"name": "Baltic Control", "countriesServed": ["Russia"]},
        {"name": "Bureau Veritas", "countriesServed": ["Russia", "Turkey"]},
        {"name": "Control Union", "countriesServed": ["Turkey", "Ukraine", "Russia", "Romania", "Bulgaria"]},
        {"name": "Cotecna", "countriesServed": ["Turkey", "Ukraine", "Russia", "Italy"]},
        {"name": "General Survey", "countriesServed": ["Kazakhstan", "Turkey", "Ukraine", "Russia"]},
        {"name": "GSP Worldwide", "countriesServed": ["Italy"]},
        {"name": "Inspectorate", "countriesServed": ["Italy"]},
        {"name": "Intertek", "countriesServed": ["Turkey", "Russia", "Ukraine"]},
        {"name": "Navi Mar", "countriesServed": ["Ukraine"]},
        {"name": "Russian Register", "countriesServed": ["Russia"]},
        {"name": "SGS", "countriesServed": ["Ukraine", "Turkey", "Russia", "Italy", "Bulgaria", "Romania", "Kazakhstan"]},
        {"name": "Top Logistic", "countriesServed": ["Russia"]},
        {"name": "TopFrame", "countriesServed": ["Russia"]},
        {"name": "Viglienzone", "countriesServed": ["Italy"]},
    ]
    for s in surveyors:
        s["createdAt"] = datetime.utcnow()
        surveyors_col.insert_one(s)

    if trades_col.count_documents({}) == 0:
        buyers = list(partners_col.find({"type": "buyer"}))
        sellers = list(partners_col.find({"type": "seller"}))
        comms = list(commodities_col.find())
        orig = list(origins_col.find())
        load_ports = list(ports_col.find({"type": "loading"}))
        disch_ports = list(ports_col.find({"type": "discharge"}))

        statuses = ["confirmation", "draft-contract", "nomination-sent", "di-sent", "drafts-confirmation", "appropriation", "dox", "pmt", "disch", "shortage", "demurrage", "dispatch", "brokerage", "completed", "cancelled", "washout"]
        inco_terms = ["FOB", "CFR", "CIF", "FAS"]
        payment_terms = ["CAD", "LC at sight", "LC 30 days", "TT in advance"]
        delivery_terms = ["FOB", "CFR", "CIF"]

        for i in range(8):
            buyer = buyers[i % len(buyers)]
            seller = sellers[i % len(sellers)]
            comm = comms[i % len(comms)]
            origin = orig[i % len(orig)]
            lport = load_ports[i % len(load_ports)]
            dport = disch_ports[i % len(disch_ports)]
            status = statuses[i % len(statuses)]

            base_date = datetime.utcnow() - timedelta(days=random.randint(1, 60))
            ship_start = base_date + timedelta(days=random.randint(30, 60))
            ship_end = ship_start + timedelta(days=random.randint(15, 30))

            trade = {
                "referenceNumber": f"CNT-{2025}-{random.randint(1000,9999)}",
                "sellerId": str(seller["_id"]),
                "sellerName": seller["companyName"],
                "sellerCode": seller.get("companyCode", ""),
                "buyerId": str(buyer["_id"]),
                "buyerName": buyer["companyName"],
                "buyerCode": buyer.get("companyCode", ""),
                "commodityId": str(comm["_id"]),
                "commodityName": comm["name"],
                "originId": str(origin["_id"]),
                "originName": origin["name"],
                "quantity": random.choice([5000, 10000, 15000, 20000, 25000]),
                "tolerance": random.choice(["5", "10", ""]),
                "deliveryTerm": random.choice(delivery_terms),
                "pricePerMT": round(random.uniform(200, 600), 2),
                "currency": "USD",
                "paymentTerms": random.choice(payment_terms),
                "incoterms": random.choice(inco_terms),
                "loadingPortId": str(lport["_id"]),
                "loadingPortName": lport["name"],
                "dischargePortId": str(dport["_id"]),
                "dischargePortName": dport["name"],
                "shipmentWindowStart": ship_start.isoformat(),
                "shipmentWindowEnd": ship_end.isoformat(),
                "vesselName": random.choice(["MV GRAIN STAR", "MV BLACK SEA", "MV MEDITERRANEAN", ""]),
                "brokeragePerMT": round(random.uniform(1, 5), 2),
                "totalCommission": 0,
                "contractDate": base_date.isoformat(),
                "contractNumber": f"CNT-{2025}-{random.randint(1000,9999)}",
                "status": status,
                "notes": "",
                "createdAt": base_date,
                "updatedAt": datetime.utcnow()
            }
            trade["totalCommission"] = round(trade["quantity"] * trade["brokeragePerMT"], 2)
            trades_col.insert_one(trade)

    if events_col.count_documents({}) == 0:
        events = [
            {"title": "GAFTA Conference 2025", "date": (datetime.utcnow() + timedelta(days=15)).isoformat(), "type": "conference", "description": "Annual GAFTA conference"},
            {"title": "Payment Due - CNT-2025-5678", "date": (datetime.utcnow() + timedelta(days=7)).isoformat(), "type": "payment", "description": "Payment due for contract"},
            {"title": "Meeting with AgroTrade", "date": (datetime.utcnow() + timedelta(days=3)).isoformat(), "type": "meeting", "description": "Discuss new trades"},
        ]
        for e in events:
            e["createdAt"] = datetime.utcnow()
            events_col.insert_one(e)

# ─── App ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_data()
    yield

app = FastAPI(title="PIR Grain & Pulses API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── Auth ───────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = users_col.find_one({"username": req.username})
    if not user or not pwd_context.verify(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user["username"]})
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "role": user.get("role", "user"),
            "name": user.get("name", user["username"]),
            "email": user.get("email", "")
        }
    }

@app.get("/api/auth/me")
def get_me(user=Depends(get_current_user)):
    user.pop("password", None)
    return user

# ─── Trades ─────────────────────────────────────────────────
@app.get("/api/trades")
def list_trades(status: Optional[str] = None, search: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"referenceNumber": {"$regex": search, "$options": "i"}},
            {"buyerName": {"$regex": search, "$options": "i"}},
            {"sellerName": {"$regex": search, "$options": "i"}},
            {"commodityName": {"$regex": search, "$options": "i"}},
            {"vesselName": {"$regex": search, "$options": "i"}},
        ]
    return [serialize_doc(t) for t in trades_col.find(query).sort("createdAt", -1)]

@app.post("/api/trades")
def create_trade(trade: TradeCreate, user=Depends(get_current_user)):
    data = trade.dict()
    data["referenceNumber"] = data.get("contractNumber") or generate_ref()
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    # Resolve names
    for field, col, name_field, code_field in [
        ("buyerId", partners_col, "buyerName", "buyerCode"),
        ("sellerId", partners_col, "sellerName", "sellerCode"),
        ("commodityId", commodities_col, "commodityName", None),
        ("originId", origins_col, "originName", None),
        ("loadingPortId", ports_col, "loadingPortName", None),
        ("dischargePortId", ports_col, "dischargePortName", None),
    ]:
        if data.get(field):
            try:
                doc = col.find_one({"_id": ObjectId(data[field])})
                if doc:
                    data[name_field] = doc.get("companyName", doc.get("name", ""))
                    if code_field:
                        data[code_field] = doc.get("companyCode", "")
            except Exception:
                pass
    qty = data.get("quantity") or 0
    brok = data.get("brokeragePerMT") or 0
    data["totalCommission"] = round(qty * brok, 2)
    result = trades_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("trade", f"New trade created: {data.get('referenceNumber', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.get("/api/trades/{trade_id}")
def get_trade(trade_id: str, user=Depends(get_current_user)):
    trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return serialize_doc(trade)

@app.put("/api/trades/{trade_id}")
def update_trade(trade_id: str, body: dict, user=Depends(get_current_user)):
    data = {k: v for k, v in body.items() if v is not None}
    data["updatedAt"] = datetime.utcnow()
    for field, col, name_field, code_field in [
        ("buyerId", partners_col, "buyerName", "buyerCode"),
        ("sellerId", partners_col, "sellerName", "sellerCode"),
        ("commodityId", commodities_col, "commodityName", None),
        ("originId", origins_col, "originName", None),
        ("loadingPortId", ports_col, "loadingPortName", None),
        ("dischargePortId", ports_col, "dischargePortName", None),
    ]:
        if data.get(field):
            try:
                doc = col.find_one({"_id": ObjectId(data[field])})
                if doc:
                    data[name_field] = doc.get("companyName", doc.get("name", ""))
                    if code_field:
                        data[code_field] = doc.get("companyCode", "")
            except Exception:
                pass
    if "quantity" in data or "brokeragePerMT" in data:
        existing = trades_col.find_one({"_id": ObjectId(trade_id)})
        qty = data.get("quantity", existing.get("quantity", 0) if existing else 0) or 0
        brok = data.get("brokeragePerMT", existing.get("brokeragePerMT", 0) if existing else 0) or 0
        data["totalCommission"] = round(qty * brok, 2)
    trades_col.update_one({"_id": ObjectId(trade_id)}, {"$set": data})
    updated = trades_col.find_one({"_id": ObjectId(trade_id)})
    create_notification("trade", f"Trade updated: {updated.get('referenceNumber', trade_id)}", trade_id, user.get("username"))
    return serialize_doc(updated)

@app.patch("/api/trades/{trade_id}/status")
def update_trade_status(trade_id: str, body: TradeStatusUpdate, user=Depends(get_current_user)):
    trades_col.update_one({"_id": ObjectId(trade_id)}, {"$set": {"status": body.status, "updatedAt": datetime.utcnow()}})
    t = trades_col.find_one({"_id": ObjectId(trade_id)})
    create_notification("trade", f"Trade {t.get('referenceNumber', trade_id)} status changed to {body.status}", trade_id, user.get("username"))
    return serialize_doc(t)

@app.delete("/api/trades/{trade_id}")
def delete_trade(trade_id: str, user=Depends(get_current_user)):
    t = trades_col.find_one({"_id": ObjectId(trade_id)})
    result = trades_col.delete_one({"_id": ObjectId(trade_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    create_notification("trade", f"Trade deleted: {t.get('referenceNumber', trade_id) if t else trade_id}", trade_id, user.get("username"))
    return {"message": "Trade deleted"}

@app.get("/api/trades/stats/overview")
def trade_stats(user=Depends(get_current_user)):
    total = trades_col.count_documents({})
    pending_statuses = ["confirmation", "draft-contract", "nomination-sent", "pending", "draft"]
    ongoing_statuses = ["di-sent", "drafts-confirmation", "appropriation", "dox", "pmt", "disch", "shortage", "demurrage", "dispatch", "brokerage", "ongoing", "active"]
    active = trades_col.count_documents({"status": {"$in": ongoing_statuses}})
    pending = trades_col.count_documents({"status": {"$in": pending_statuses}})
    completed = trades_col.count_documents({"status": "completed"})
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_dist = {item["_id"]: item["count"] for item in trades_col.aggregate(pipeline)}
    return {
        "totalTrades": total,
        "activeTrades": active,
        "pendingTrades": pending,
        "completedTrades": completed,
        "completionRate": round((completed / total * 100) if total > 0 else 0, 1),
        "statusDistribution": status_dist
    }

# ─── Partners ───────────────────────────────────────────────
@app.get("/api/partners")
def list_partners(type: Optional[str] = None, search: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if type and type != "all":
        query["type"] = type
    if search:
        query["$or"] = [
            {"companyName": {"$regex": search, "$options": "i"}},
            {"contactPerson": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"companyCode": {"$regex": search, "$options": "i"}},
        ]
    return [serialize_doc(p) for p in partners_col.find(query).sort("companyName", 1)]

@app.post("/api/partners")
def create_partner(partner: PartnerCreate, user=Depends(get_current_user)):
    data = partner.dict()
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    result = partners_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("partner", f"New counterparty added: {data.get('companyName', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.get("/api/partners/{partner_id}")
def get_partner(partner_id: str, user=Depends(get_current_user)):
    partner = partners_col.find_one({"_id": ObjectId(partner_id)})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return serialize_doc(partner)

@app.put("/api/partners/{partner_id}")
def update_partner(partner_id: str, partner: PartnerCreate, user=Depends(get_current_user)):
    data = partner.dict()
    data["updatedAt"] = datetime.utcnow()
    partners_col.update_one({"_id": ObjectId(partner_id)}, {"$set": data})
    updated = partners_col.find_one({"_id": ObjectId(partner_id)})
    create_notification("partner", f"Counterparty updated: {updated.get('companyName', '')}", partner_id, user.get("username"))
    return serialize_doc(updated)

@app.delete("/api/partners/{partner_id}")
def delete_partner(partner_id: str, user=Depends(get_current_user)):
    p = partners_col.find_one({"_id": ObjectId(partner_id)})
    partners_col.delete_one({"_id": ObjectId(partner_id)})
    create_notification("partner", f"Counterparty deleted: {p.get('companyName', '') if p else partner_id}", partner_id, user.get("username"))
    return {"message": "Partner deleted"}

# ─── Vessels ────────────────────────────────────────────────
@app.get("/api/vessels")
def list_vessels(search: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"imoNumber": {"$regex": search, "$options": "i"}}]
    return [serialize_doc(v) for v in vessels_col.find(query).sort("name", 1)]

@app.post("/api/vessels")
def create_vessel(vessel: VesselCreate, user=Depends(get_current_user)):
    data = vessel.dict()
    data["createdAt"] = datetime.utcnow()
    result = vessels_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("vessel", f"New vessel added: {data.get('name', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.put("/api/vessels/{vessel_id}")
def update_vessel(vessel_id: str, vessel: VesselCreate, user=Depends(get_current_user)):
    data = vessel.dict()
    vessels_col.update_one({"_id": ObjectId(vessel_id)}, {"$set": data})
    updated = vessels_col.find_one({"_id": ObjectId(vessel_id)})
    create_notification("vessel", f"Vessel updated: {updated.get('name', '')}", vessel_id, user.get("username"))
    return serialize_doc(updated)

@app.delete("/api/vessels/{vessel_id}")
def delete_vessel(vessel_id: str, user=Depends(get_current_user)):
    v = vessels_col.find_one({"_id": ObjectId(vessel_id)})
    vessels_col.delete_one({"_id": ObjectId(vessel_id)})
    create_notification("vessel", f"Vessel deleted: {v.get('name', '') if v else vessel_id}", vessel_id, user.get("username"))
    return {"message": "Vessel deleted"}

# ─── Documents ──────────────────────────────────────────────
@app.get("/api/documents")
def list_documents(tradeId: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if tradeId:
        query["tradeId"] = tradeId
    return [serialize_doc(d) for d in documents_col.find(query).sort("createdAt", -1)]

@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...), tradeId: str = Form(""), tradeRef: str = Form(""), docType: str = Form("other"), user=Depends(get_current_user)):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    saved_name = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    doc = {
        "fileName": file.filename, "savedName": saved_name, "fileUrl": f"/api/uploads/{saved_name}",
        "fileSize": len(content), "docType": docType, "tradeId": tradeId, "tradeRef": tradeRef,
        "uploadedBy": user.get("username", ""), "createdAt": datetime.utcnow()
    }
    result = documents_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str, user=Depends(get_current_user)):
    doc = documents_col.find_one({"_id": ObjectId(doc_id)})
    if doc:
        file_path = os.path.join(UPLOAD_DIR, doc.get("savedName", ""))
        if os.path.exists(file_path):
            os.remove(file_path)
    documents_col.delete_one({"_id": ObjectId(doc_id)})
    return {"message": "Document deleted"}

# ─── Reference Data ─────────────────────────────────────────
@app.get("/api/commodities")
def list_commodities(user=Depends(get_current_user)):
    return [serialize_doc(i) for i in commodities_col.find().sort("name", 1)]

@app.post("/api/commodities")
def create_commodity(item: CommodityCreate, user=Depends(get_current_user)):
    data = item.dict()
    data["createdAt"] = datetime.utcnow()
    result = commodities_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("settings", f"Commodity added: {data.get('name', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.put("/api/commodities/{item_id}")
def update_commodity(item_id: str, item: CommodityCreate, user=Depends(get_current_user)):
    commodities_col.update_one({"_id": ObjectId(item_id)}, {"$set": item.dict()})
    create_notification("settings", f"Commodity updated: {item.name}", item_id, user.get("username"))
    return serialize_doc(commodities_col.find_one({"_id": ObjectId(item_id)}))

@app.delete("/api/commodities/{item_id}")
def delete_commodity(item_id: str, user=Depends(get_current_user)):
    c = commodities_col.find_one({"_id": ObjectId(item_id)})
    commodities_col.delete_one({"_id": ObjectId(item_id)})
    create_notification("settings", f"Commodity deleted: {c.get('name', '') if c else item_id}", item_id, user.get("username"))
    return {"message": "Deleted"}

@app.get("/api/origins")
def list_origins(user=Depends(get_current_user)):
    return [serialize_doc(i) for i in origins_col.find().sort("name", 1)]

@app.post("/api/origins")
def create_origin(item: OriginCreate, user=Depends(get_current_user)):
    data = item.dict()
    data["createdAt"] = datetime.utcnow()
    result = origins_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("settings", f"Origin added: {data.get('name', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.put("/api/origins/{item_id}")
def update_origin(item_id: str, item: OriginCreate, user=Depends(get_current_user)):
    origins_col.update_one({"_id": ObjectId(item_id)}, {"$set": item.dict()})
    create_notification("settings", f"Origin updated: {item.name}", item_id, user.get("username"))
    return serialize_doc(origins_col.find_one({"_id": ObjectId(item_id)}))

@app.delete("/api/origins/{item_id}")
def delete_origin(item_id: str, user=Depends(get_current_user)):
    o = origins_col.find_one({"_id": ObjectId(item_id)})
    origins_col.delete_one({"_id": ObjectId(item_id)})
    create_notification("settings", f"Origin deleted: {o.get('name', '') if o else item_id}", item_id, user.get("username"))
    return {"message": "Deleted"}

@app.get("/api/ports")
def list_ports(user=Depends(get_current_user)):
    return [serialize_doc(i) for i in ports_col.find().sort("name", 1)]

@app.post("/api/ports")
def create_port(item: PortCreate, user=Depends(get_current_user)):
    data = item.dict()
    data["createdAt"] = datetime.utcnow()
    result = ports_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("settings", f"Port added: {data.get('name', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.put("/api/ports/{item_id}")
def update_port(item_id: str, item: PortCreate, user=Depends(get_current_user)):
    ports_col.update_one({"_id": ObjectId(item_id)}, {"$set": item.dict()})
    create_notification("settings", f"Port updated: {item.name}", item_id, user.get("username"))
    return serialize_doc(ports_col.find_one({"_id": ObjectId(item_id)}))

@app.delete("/api/ports/{item_id}")
def delete_port(item_id: str, user=Depends(get_current_user)):
    p = ports_col.find_one({"_id": ObjectId(item_id)})
    ports_col.delete_one({"_id": ObjectId(item_id)})
    create_notification("settings", f"Port deleted: {p.get('name', '') if p else item_id}", item_id, user.get("username"))
    return {"message": "Deleted"}

@app.get("/api/surveyors")
def list_surveyors(user=Depends(get_current_user)):
    return [serialize_doc(i) for i in surveyors_col.find().sort("name", 1)]

@app.post("/api/surveyors")
def create_surveyor(item: SurveyorCreate, user=Depends(get_current_user)):
    data = item.dict()
    data["createdAt"] = datetime.utcnow()
    result = surveyors_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("settings", f"Surveyor added: {data.get('name', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.put("/api/surveyors/{item_id}")
def update_surveyor(item_id: str, item: SurveyorCreate, user=Depends(get_current_user)):
    surveyors_col.update_one({"_id": ObjectId(item_id)}, {"$set": item.dict()})
    create_notification("settings", f"Surveyor updated: {item.name}", item_id, user.get("username"))
    return serialize_doc(surveyors_col.find_one({"_id": ObjectId(item_id)}))

@app.delete("/api/surveyors/{item_id}")
def delete_surveyor(item_id: str, user=Depends(get_current_user)):
    s = surveyors_col.find_one({"_id": ObjectId(item_id)})
    surveyors_col.delete_one({"_id": ObjectId(item_id)})
    create_notification("settings", f"Surveyor deleted: {s.get('name', '') if s else item_id}", item_id, user.get("username"))
    return {"message": "Deleted"}

# ─── Events ─────────────────────────────────────────────────
@app.get("/api/events")
def list_events(user=Depends(get_current_user)):
    return [serialize_doc(e) for e in events_col.find().sort("date", 1)]

@app.post("/api/events")
def create_event(event: EventCreate, user=Depends(get_current_user)):
    data = event.dict()
    data["createdAt"] = datetime.utcnow()
    result = events_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("event", f"New event: {data.get('title', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.delete("/api/events/{event_id}")
def delete_event(event_id: str, user=Depends(get_current_user)):
    e = events_col.find_one({"_id": ObjectId(event_id)})
    events_col.delete_one({"_id": ObjectId(event_id)})
    create_notification("event", f"Event deleted: {e.get('title', '') if e else event_id}", event_id, user.get("username"))
    return {"message": "Deleted"}

# ─── Invoices (Accounting) ──────────────────────────────────
@app.get("/api/invoices")
def list_invoices(user=Depends(get_current_user)):
    return [serialize_doc(i) for i in invoices_col.find().sort("createdAt", -1)]

@app.post("/api/invoices")
def create_invoice(invoice: InvoiceCreate, user=Depends(get_current_user)):
    data = invoice.dict()
    data["createdAt"] = datetime.utcnow()
    result = invoices_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("accounting", f"New invoice: {data.get('invoiceNumber', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.put("/api/invoices/{invoice_id}")
def update_invoice(invoice_id: str, invoice: InvoiceCreate, user=Depends(get_current_user)):
    data = invoice.dict()
    invoices_col.update_one({"_id": ObjectId(invoice_id)}, {"$set": data})
    create_notification("accounting", f"Invoice updated: {data.get('invoiceNumber', '')}", invoice_id, user.get("username"))
    return serialize_doc(invoices_col.find_one({"_id": ObjectId(invoice_id)}))

@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(invoice_id: str, user=Depends(get_current_user)):
    inv = invoices_col.find_one({"_id": ObjectId(invoice_id)})
    invoices_col.delete_one({"_id": ObjectId(invoice_id)})
    create_notification("accounting", f"Invoice deleted: {inv.get('invoiceNumber', '') if inv else invoice_id}", invoice_id, user.get("username"))
    return {"message": "Deleted"}

# ─── Bank Statements ────────────────────────────────────────
@app.get("/api/bank-statements")
def list_bank_statements(user=Depends(get_current_user)):
    return [serialize_doc(s) for s in bank_statements_col.find().sort("createdAt", -1)]

@app.post("/api/bank-statements")
def create_bank_statement(stmt: BankStatementCreate, user=Depends(get_current_user)):
    data = stmt.dict()
    data["createdAt"] = datetime.utcnow()
    result = bank_statements_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("accounting", f"New bank statement added", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)

@app.delete("/api/bank-statements/{stmt_id}")
def delete_bank_statement(stmt_id: str, user=Depends(get_current_user)):
    bank_statements_col.delete_one({"_id": ObjectId(stmt_id)})
    create_notification("accounting", f"Bank statement deleted", stmt_id, user.get("username"))
    return {"message": "Deleted"}

# ─── Notifications ───────────────────────────────────────────
@app.get("/api/notifications")
def list_notifications(user=Depends(get_current_user)):
    return [serialize_doc(n) for n in notifications_col.find().sort("createdAt", -1).limit(50)]

@app.patch("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, user=Depends(get_current_user)):
    notifications_col.update_one({"_id": ObjectId(notif_id)}, {"$addToSet": {"readBy": user["username"]}})
    return {"message": "Marked read"}

@app.patch("/api/notifications/read-all")
def mark_all_read(user=Depends(get_current_user)):
    notifications_col.update_many({}, {"$addToSet": {"readBy": user["username"]}})
    return {"message": "All marked read"}

# ─── Trade Statuses ──────────────────────────────────────────
@app.get("/api/trade-statuses")
def get_trade_statuses(user=Depends(get_current_user)):
    return TRADE_STATUSES

# ─── Users Management ───────────────────────────────────────
@app.get("/api/users")
def list_users(user=Depends(get_current_user)):
    users = list(users_col.find())
    for u in users:
        u.pop("password", None)
    return [serialize_doc(u) for u in users]

@app.post("/api/users")
def create_user(u: UserCreate, user=Depends(get_current_user)):
    if users_col.find_one({"username": u.username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    data = u.dict()
    data["password"] = pwd_context.hash(data.pop("password"))
    data["status"] = "active"
    data["createdAt"] = datetime.utcnow()
    result = users_col.insert_one(data)
    data["_id"] = result.inserted_id
    data.pop("password", None)
    return serialize_doc(data)

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, user=Depends(get_current_user)):
    users_col.delete_one({"_id": ObjectId(user_id)})
    return {"message": "Deleted"}

@app.put("/api/users/{user_id}")
def update_user(user_id: str, body: dict, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")
    update_fields = {}
    for field in ["name", "email", "whatsapp", "role", "username"]:
        if field in body and body[field] is not None:
            update_fields[field] = body[field]
    if "password" in body and body["password"]:
        update_fields["password"] = pwd_context.hash(body["password"])
    if update_fields:
        users_col.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
    doc = users_col.find_one({"_id": ObjectId(user_id)})
    if doc:
        doc.pop("password", None)
    return serialize_doc(doc)

# ─── Health ─────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "healthy", "app": "PIR Grain & Pulses"}
