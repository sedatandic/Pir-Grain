from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import UPLOAD_DIR
from seed import seed_data
from routes.auth_routes import router as auth_router
from routes.trades import router as trades_router
from routes.partners import router as partners_router
from routes.vessels import router as vessels_router
from routes.documents import router as documents_router
from routes.reference_data import router as reference_data_router
from routes.events import router as events_router
from routes.accounting import router as accounting_router
from routes.notifications import router as notifications_router
from routes.users import router as users_router
from routes.commission_invoice import router as commission_invoice_router
from routes.bank_accounts import router as bank_accounts_router
from routes.vendors import router as vendors_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_data()
    yield

app = FastAPI(title="PIR Grain & Pulses API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(trades_router)
app.include_router(partners_router)
app.include_router(vessels_router)
app.include_router(documents_router)
app.include_router(reference_data_router)
app.include_router(events_router)
app.include_router(accounting_router)
app.include_router(notifications_router)
app.include_router(users_router)
app.include_router(commission_invoice_router)
app.include_router(bank_accounts_router)
app.include_router(vendors_router)


@app.get("/api/health")
def health():
    return {"status": "healthy", "app": "PIR Grain & Pulses"}
