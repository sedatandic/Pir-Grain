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

# ─── MongoDB ────────────────────────────────────────────────
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
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

def generate_trade_ref():
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
    buyerId: Optional[str] = None
    sellerId: Optional[str] = None
    brokerId: Optional[str] = None
    commodityId: Optional[str] = None
    origin: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = "MT"
    price: Optional[float] = None
    priceUnit: Optional[str] = "USD/MT"
    currency: Optional[str] = "USD"
    contractNumber: Optional[str] = None
    contractDate: Optional[str] = None
    shipmentWindowStart: Optional[str] = None
    shipmentWindowEnd: Optional[str] = None
    loadingPort: Optional[str] = None
    dischargePort: Optional[str] = None
    vesselId: Optional[str] = None
    surveyorId: Optional[str] = None
    brokerage: Optional[float] = None
    brokerageUnit: Optional[str] = "USD/MT"
    paymentTerms: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "pending"

class TradeUpdate(TradeCreate):
    pass

class PartnerCreate(BaseModel):
    companyName: str
    contactPerson: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    type: str = "buyer"  # buyer, seller, co-broker

class VesselCreate(BaseModel):
    name: str
    imo: Optional[str] = None
    flag: Optional[str] = None
    dwt: Optional[float] = None
    built: Optional[str] = None
    vesselType: Optional[str] = None

class SurveyorCreate(BaseModel):
    name: str
    contactPerson: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class ItemCreate(BaseModel):
    name: str

class EventCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = "general"
    tradeId: Optional[str] = None

# ─── Seed Data ──────────────────────────────────────────────
def seed_data():
    # Seed demo user
    if users_col.count_documents({}) == 0:
        users_col.insert_one({
            "username": "salihkaragoz",
            "password": pwd_context.hash("salih123"),
            "role": "admin",
            "fullName": "Salih Karagoz",
            "email": "salih@pirgrains.com",
            "createdAt": datetime.utcnow()
        })
        print("Seeded demo user: salihkaragoz / salih123")

    # Seed commodities
    if commodities_col.count_documents({}) == 0:
        commodities = ["Wheat", "Barley", "Corn", "Chickpeas", "Red Lentils", "Green Lentils",
                       "Yellow Peas", "Sunflower Seeds", "Soybeans", "Rice", "Millet", "Oats"]
        for c in commodities:
            commodities_col.insert_one({"name": c, "createdAt": datetime.utcnow()})
        print(f"Seeded {len(commodities)} commodities")

    # Seed origins
    if origins_col.count_documents({}) == 0:
        origins = ["Turkey", "Russia", "Ukraine", "Kazakhstan", "India", "Canada",
                   "Australia", "Argentina", "USA", "Bulgaria", "Romania", "France"]
        for o in origins:
            origins_col.insert_one({"name": o, "createdAt": datetime.utcnow()})
        print(f"Seeded {len(origins)} origins")

    # Seed ports
    if ports_col.count_documents({}) == 0:
        ports = ["Mersin", "Istanbul", "Novorossiysk", "Odessa", "Mumbai", "Karachi",
                 "Jeddah", "Dubai", "Alexandria", "Constanta", "Santos", "Vancouver"]
        for p in ports:
            ports_col.insert_one({"name": p, "createdAt": datetime.utcnow()})
        print(f"Seeded {len(ports)} ports")

    # Seed partners
    if partners_col.count_documents({}) == 0:
        partners = [
            {"companyName": "AgroTrade International", "contactPerson": "Ahmed Hassan", "email": "ahmed@agrotrade.com", "phone": "+971 4 000 0000", "city": "Dubai", "country": "UAE", "type": "buyer", "address": "Trade Center, Dubai"},
            {"companyName": "Black Sea Exports Ltd", "contactPerson": "Ivan Petrov", "email": "ivan@bsexports.com", "phone": "+7 863 000 0000", "city": "Rostov", "country": "Russia", "type": "seller", "address": "Port District, Rostov-on-Don"},
            {"companyName": "Balkan Grains OOD", "contactPerson": "Georgi Dimitrov", "email": "georgi@balkangrains.bg", "phone": "+359 32 000 000", "city": "Plovdiv", "country": "Bulgaria", "type": "seller", "address": "Industrial Zone, Plovdiv"},
            {"companyName": "Al Manar Trading", "contactPerson": "Khalid Al Rashid", "email": "khalid@almanar.sa", "phone": "+966 1 000 0000", "city": "Jeddah", "country": "Saudi Arabia", "type": "buyer", "address": "King Fahd Rd, Jeddah"},
            {"companyName": "Mediterranean Brokers", "contactPerson": "Marco Rossi", "email": "marco@medbrokers.it", "phone": "+39 02 000 0000", "city": "Milan", "country": "Italy", "type": "co-broker", "address": "Via Roma 12, Milan"},
            {"companyName": "Asia Pulses Corp", "contactPerson": "Rajesh Kumar", "email": "rajesh@asiapulses.in", "phone": "+91 22 000 0000", "city": "Mumbai", "country": "India", "type": "buyer", "address": "Nariman Point, Mumbai"},
        ]
        for p in partners:
            p["createdAt"] = datetime.utcnow()
            p["updatedAt"] = datetime.utcnow()
            partners_col.insert_one(p)
        print(f"Seeded {len(partners)} partners")

    # Seed vessels
    if vessels_col.count_documents({}) == 0:
        vessels = [
            {"name": "MV Grain Star", "imo": "9876543", "flag": "Panama", "dwt": 45000, "built": "2018", "vesselType": "Bulk Carrier"},
            {"name": "MV Black Sea", "imo": "9765432", "flag": "Liberia", "dwt": 32000, "built": "2015", "vesselType": "Bulk Carrier"},
            {"name": "MV Mediterranean", "imo": "9654321", "flag": "Marshall Islands", "dwt": 58000, "built": "2020", "vesselType": "Bulk Carrier"},
        ]
        for v in vessels:
            v["createdAt"] = datetime.utcnow()
            v["updatedAt"] = datetime.utcnow()
            vessels_col.insert_one(v)
        print(f"Seeded {len(vessels)} vessels")

    # Seed surveyors
    if surveyors_col.count_documents({}) == 0:
        surveyors = [
            {"name": "SGS Turkey", "contactPerson": "Mehmet Yilmaz", "email": "mehmet@sgs.com.tr", "phone": "+90 212 000 0000", "city": "Istanbul", "country": "Turkey"},
            {"name": "Bureau Veritas", "contactPerson": "Jean Dupont", "email": "jean@bureauveritas.com", "phone": "+33 1 000 0000", "city": "Paris", "country": "France"},
        ]
        for s in surveyors:
            s["createdAt"] = datetime.utcnow()
            surveyors_col.insert_one(s)
        print(f"Seeded {len(surveyors)} surveyors")

    # Seed trades
    if trades_col.count_documents({}) == 0:
        buyers = list(partners_col.find({"type": "buyer"}))
        sellers = list(partners_col.find({"type": "seller"}))
        comms = list(commodities_col.find())
        
        statuses = ["pending", "ongoing", "contract", "confirmation", "nomination-sent", "di-sent", "appropriation", "disch", "completed"]
        
        trades = []
        for i in range(8):
            buyer = buyers[i % len(buyers)]
            seller = sellers[i % len(sellers)]
            comm = comms[i % len(comms)]
            status = statuses[i % len(statuses)]
            
            base_date = datetime.utcnow() - timedelta(days=random.randint(1, 60))
            ship_start = base_date + timedelta(days=random.randint(30, 60))
            ship_end = ship_start + timedelta(days=random.randint(15, 30))
            
            trade = {
                "tradeRef": generate_trade_ref(),
                "buyerId": str(buyer["_id"]),
                "buyerName": buyer["companyName"],
                "sellerId": str(seller["_id"]),
                "sellerName": seller["companyName"],
                "commodityId": str(comm["_id"]),
                "commodityName": comm["name"],
                "origin": random.choice(["Turkey", "Russia", "Ukraine", "Kazakhstan", "India"]),
                "quantity": random.choice([5000, 10000, 15000, 20000, 25000, 30000]),
                "unit": "MT",
                "price": round(random.uniform(200, 600), 2),
                "priceUnit": "USD/MT",
                "currency": "USD",
                "contractNumber": f"CNT-{random.randint(1000,9999)}",
                "contractDate": base_date.isoformat(),
                "shipmentWindowStart": ship_start.isoformat(),
                "shipmentWindowEnd": ship_end.isoformat(),
                "loadingPort": random.choice(["Mersin", "Novorossiysk", "Odessa", "Constanta"]),
                "dischargePort": random.choice(["Mumbai", "Jeddah", "Dubai", "Karachi", "Alexandria"]),
                "brokerage": round(random.uniform(1, 5), 2),
                "brokerageUnit": "USD/MT",
                "paymentTerms": random.choice(["CAD", "LC at sight", "LC 30 days", "TT in advance"]),
                "status": status,
                "notes": "",
                "createdAt": base_date,
                "updatedAt": datetime.utcnow()
            }
            trades.append(trade)
        
        trades_col.insert_many(trades)
        print(f"Seeded {len(trades)} trades")

    # Seed events
    if events_col.count_documents({}) == 0:
        events = [
            {"title": "Contract Review Meeting", "date": (datetime.utcnow() + timedelta(days=2)).isoformat(), "time": "10:00", "type": "meeting", "description": "Review pending contracts"},
            {"title": "Shipment Deadline - PIR-24-AB1234", "date": (datetime.utcnow() + timedelta(days=5)).isoformat(), "time": "14:00", "type": "deadline", "description": "Shipment window closing"},
            {"title": "Payment Due - CNT-5678", "date": (datetime.utcnow() + timedelta(days=7)).isoformat(), "time": "09:00", "type": "payment", "description": "Payment due for contract CNT-5678"},
            {"title": "Vessel Arrival - MV Grain Star", "date": (datetime.utcnow() + timedelta(days=10)).isoformat(), "time": "06:00", "type": "vessel", "description": "Expected arrival at Mersin port"},
        ]
        for e in events:
            e["createdAt"] = datetime.utcnow()
            events_col.insert_one(e)
        print(f"Seeded {len(events)} events")

# ─── App ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_data()
    yield

app = FastAPI(title="PIR Grain & Pulses API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── Auth Endpoints ─────────────────────────────────────────
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
            "fullName": user.get("fullName", user["username"]),
            "email": user.get("email", "")
        }
    }

@app.get("/api/auth/me")
def get_me(user=Depends(get_current_user)):
    user.pop("password", None)
    return user

# ─── Trades Endpoints ───────────────────────────────────────
@app.get("/api/trades")
def list_trades(
    status: Optional[str] = None,
    search: Optional[str] = None,
    user=Depends(get_current_user)
):
    query = {}
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [
            {"tradeRef": {"$regex": search, "$options": "i"}},
            {"buyerName": {"$regex": search, "$options": "i"}},
            {"sellerName": {"$regex": search, "$options": "i"}},
            {"commodityName": {"$regex": search, "$options": "i"}},
        ]
    trades = list(trades_col.find(query).sort("createdAt", -1))
    return [serialize_doc(t) for t in trades]

@app.post("/api/trades")
def create_trade(trade: TradeCreate, user=Depends(get_current_user)):
    data = trade.dict()
    data["tradeRef"] = generate_trade_ref()
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    
    # Resolve names
    if data.get("buyerId"):
        buyer = partners_col.find_one({"_id": ObjectId(data["buyerId"])})
        data["buyerName"] = buyer["companyName"] if buyer else ""
    if data.get("sellerId"):
        seller = partners_col.find_one({"_id": ObjectId(data["sellerId"])})
        data["sellerName"] = seller["companyName"] if seller else ""
    if data.get("commodityId"):
        comm = commodities_col.find_one({"_id": ObjectId(data["commodityId"])})
        data["commodityName"] = comm["name"] if comm else ""
    
    result = trades_col.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)

@app.get("/api/trades/{trade_id}")
def get_trade(trade_id: str, user=Depends(get_current_user)):
    trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return serialize_doc(trade)

@app.put("/api/trades/{trade_id}")
def update_trade(trade_id: str, trade: TradeUpdate, user=Depends(get_current_user)):
    data = {k: v for k, v in trade.dict().items() if v is not None}
    data["updatedAt"] = datetime.utcnow()
    
    if data.get("buyerId"):
        buyer = partners_col.find_one({"_id": ObjectId(data["buyerId"])})
        data["buyerName"] = buyer["companyName"] if buyer else ""
    if data.get("sellerId"):
        seller = partners_col.find_one({"_id": ObjectId(data["sellerId"])})
        data["sellerName"] = seller["companyName"] if seller else ""
    if data.get("commodityId"):
        comm = commodities_col.find_one({"_id": ObjectId(data["commodityId"])})
        data["commodityName"] = comm["name"] if comm else ""
    
    trades_col.update_one({"_id": ObjectId(trade_id)}, {"$set": data})
    updated = trades_col.find_one({"_id": ObjectId(trade_id)})
    return serialize_doc(updated)

@app.delete("/api/trades/{trade_id}")
def delete_trade(trade_id: str, user=Depends(get_current_user)):
    result = trades_col.delete_one({"_id": ObjectId(trade_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"message": "Trade deleted"}

@app.get("/api/trades/stats/overview")
def trade_stats(user=Depends(get_current_user)):
    total = trades_col.count_documents({})
    active = trades_col.count_documents({"status": {"$in": ["ongoing", "contract", "confirmation", "nomination-sent", "di-sent", "appropriation", "dox", "pmt", "disch"]}})
    pending = trades_col.count_documents({"status": "pending"})
    completed = trades_col.count_documents({"status": "completed"})
    
    # Status distribution
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

# ─── Partners Endpoints ────────────────────────────────────
@app.get("/api/partners")
def list_partners(
    type: Optional[str] = None,
    search: Optional[str] = None,
    user=Depends(get_current_user)
):
    query = {}
    if type and type != "all":
        query["type"] = type
    if search:
        query["$or"] = [
            {"companyName": {"$regex": search, "$options": "i"}},
            {"contactPerson": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    partners = list(partners_col.find(query).sort("companyName", 1))
    return [serialize_doc(p) for p in partners]

@app.post("/api/partners")
def create_partner(partner: PartnerCreate, user=Depends(get_current_user)):
    data = partner.dict()
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    result = partners_col.insert_one(data)
    data["_id"] = result.inserted_id
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
    return serialize_doc(updated)

@app.delete("/api/partners/{partner_id}")
def delete_partner(partner_id: str, user=Depends(get_current_user)):
    result = partners_col.delete_one({"_id": ObjectId(partner_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"message": "Partner deleted"}

# ─── Vessels Endpoints ──────────────────────────────────────
@app.get("/api/vessels")
def list_vessels(search: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"imo": {"$regex": search, "$options": "i"}},
        ]
    vessels = list(vessels_col.find(query).sort("name", 1))
    return [serialize_doc(v) for v in vessels]

@app.post("/api/vessels")
def create_vessel(vessel: VesselCreate, user=Depends(get_current_user)):
    data = vessel.dict()
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    result = vessels_col.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)

@app.put("/api/vessels/{vessel_id}")
def update_vessel(vessel_id: str, vessel: VesselCreate, user=Depends(get_current_user)):
    data = vessel.dict()
    data["updatedAt"] = datetime.utcnow()
    vessels_col.update_one({"_id": ObjectId(vessel_id)}, {"$set": data})
    updated = vessels_col.find_one({"_id": ObjectId(vessel_id)})
    return serialize_doc(updated)

@app.delete("/api/vessels/{vessel_id}")
def delete_vessel(vessel_id: str, user=Depends(get_current_user)):
    result = vessels_col.delete_one({"_id": ObjectId(vessel_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return {"message": "Vessel deleted"}

# ─── Documents Endpoints ────────────────────────────────────
@app.get("/api/documents")
def list_documents(tradeId: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if tradeId:
        query["tradeId"] = tradeId
    docs = list(documents_col.find(query).sort("createdAt", -1))
    return [serialize_doc(d) for d in docs]

@app.post("/api/documents")
async def upload_document(
    file: UploadFile = File(...),
    tradeId: str = Form(""),
    tradeRef: str = Form(""),
    docType: str = Form("Other Document"),
    user=Depends(get_current_user)
):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    saved_name = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_name)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    doc = {
        "fileName": file.filename,
        "savedName": saved_name,
        "fileUrl": f"/api/uploads/{saved_name}",
        "fileSize": len(content),
        "docType": docType,
        "tradeId": tradeId,
        "tradeRef": tradeRef,
        "uploadedBy": user.get("username", ""),
        "createdAt": datetime.utcnow()
    }
    result = documents_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str, user=Depends(get_current_user)):
    doc = documents_col.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Delete file
    file_path = os.path.join(UPLOAD_DIR, doc.get("savedName", ""))
    if os.path.exists(file_path):
        os.remove(file_path)
    documents_col.delete_one({"_id": ObjectId(doc_id)})
    return {"message": "Document deleted"}

# ─── Reference Data Endpoints ──────────────────────────────
@app.get("/api/commodities")
def list_commodities(user=Depends(get_current_user)):
    items = list(commodities_col.find().sort("name", 1))
    return [serialize_doc(i) for i in items]

@app.post("/api/commodities")
def create_commodity(item: ItemCreate, user=Depends(get_current_user)):
    data = {"name": item.name, "createdAt": datetime.utcnow()}
    result = commodities_col.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)

@app.delete("/api/commodities/{item_id}")
def delete_commodity(item_id: str, user=Depends(get_current_user)):
    commodities_col.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Deleted"}

@app.get("/api/origins")
def list_origins(user=Depends(get_current_user)):
    items = list(origins_col.find().sort("name", 1))
    return [serialize_doc(i) for i in items]

@app.post("/api/origins")
def create_origin(item: ItemCreate, user=Depends(get_current_user)):
    data = {"name": item.name, "createdAt": datetime.utcnow()}
    result = origins_col.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)

@app.delete("/api/origins/{item_id}")
def delete_origin(item_id: str, user=Depends(get_current_user)):
    origins_col.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Deleted"}

@app.get("/api/ports")
def list_ports(user=Depends(get_current_user)):
    items = list(ports_col.find().sort("name", 1))
    return [serialize_doc(i) for i in items]

@app.post("/api/ports")
def create_port(item: ItemCreate, user=Depends(get_current_user)):
    data = {"name": item.name, "createdAt": datetime.utcnow()}
    result = ports_col.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)

@app.delete("/api/ports/{item_id}")
def delete_port(item_id: str, user=Depends(get_current_user)):
    ports_col.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Deleted"}

@app.get("/api/surveyors")
def list_surveyors(user=Depends(get_current_user)):
    items = list(surveyors_col.find().sort("name", 1))
    return [serialize_doc(i) for i in items]

@app.post("/api/surveyors")
def create_surveyor(item: SurveyorCreate, user=Depends(get_current_user)):
    data = item.dict()
    data["createdAt"] = datetime.utcnow()
    result = surveyors_col.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)

@app.delete("/api/surveyors/{item_id}")
def delete_surveyor(item_id: str, user=Depends(get_current_user)):
    surveyors_col.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Deleted"}

# ─── Events Endpoints ───────────────────────────────────────
@app.get("/api/events")
def list_events(user=Depends(get_current_user)):
    events = list(events_col.find().sort("date", 1))
    return [serialize_doc(e) for e in events]

@app.post("/api/events")
def create_event(event: EventCreate, user=Depends(get_current_user)):
    data = event.dict()
    data["createdAt"] = datetime.utcnow()
    result = events_col.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)

@app.delete("/api/events/{event_id}")
def delete_event(event_id: str, user=Depends(get_current_user)):
    events_col.delete_one({"_id": ObjectId(event_id)})
    return {"message": "Deleted"}

# ─── Health ─────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "healthy", "app": "PIR Grain & Pulses"}
