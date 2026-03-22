from datetime import datetime
from typing import Optional
import random
import string
import os
import base64

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from bson import ObjectId

from database import (
    trades_col, partners_col, commodities_col, origins_col, ports_col,
    invoices_col, serialize_doc, create_notification
)
from auth import get_current_user, require_roles
from models import TradeCreate, TradeStatusUpdate
from config import TRADE_STATUSES

non_accountant = require_roles("admin", "user")


def generate_ref():
    year = datetime.now().strftime("%y")
    num = random.randint(1000, 9999)
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    return f"PIR-{year}-{letters}{num}"


router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("")
def list_trades(status: Optional[str] = None, search: Optional[str] = None, user=Depends(non_accountant)):
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


@router.post("")
def create_trade(trade: TradeCreate, user=Depends(non_accountant)):
    data = trade.dict()
    data["referenceNumber"] = data.get("contractNumber") or generate_ref()
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    for field, col, name_field, code_field in [
        ("buyerId", partners_col, "buyerName", "buyerCode"),
        ("sellerId", partners_col, "sellerName", "sellerCode"),
        ("brokerId", partners_col, "brokerName", "brokerCode"),
        ("coBrokerId", partners_col, "coBrokerName", "coBrokerCode"),
        ("commodityId", commodities_col, "commodityName", None),
        ("originId", origins_col, "originName", None),
        ("basePortId", ports_col, "basePortName", None),
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
                    # Store port country
                    if "Port" in name_field and doc.get("country"):
                        data[name_field.replace("Name", "Country")] = doc.get("country", "")
            except Exception:
                pass
    # Compose commodity display name with origin adjective and crop year
    if data.get("originId"):
        try:
            origin_doc = origins_col.find_one({"_id": ObjectId(data["originId"])})
            if origin_doc and origin_doc.get("adjective"):
                data["originAdjective"] = origin_doc["adjective"]
        except Exception:
            pass
    adj = data.get("originAdjective") or ""
    cname = data.get("commodityName") or ""
    cyear = data.get("cropYear") or ""
    if adj and cname and cyear:
        data["commodityDisplayName"] = f"{adj} {cname}, Crop {cyear}"
    elif adj and cname:
        data["commodityDisplayName"] = f"{adj} {cname}"
    else:
        data["commodityDisplayName"] = cname
    qty = data.get("quantity") or 0
    brok = data.get("brokeragePerMT") or 0
    data["totalCommission"] = round(qty * brok, 2)
    result = trades_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("trade", f"New trade created: {data.get('referenceNumber', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)


@router.get("/stats/overview")
def trade_stats(user=Depends(non_accountant)):
    total = trades_col.count_documents({})
    completed = trades_col.count_documents({"status": "completed"})
    cancelled = trades_col.count_documents({"status": {"$in": ["cancelled", "washout"]}})
    active_trades = list(trades_col.find({"status": {"$nin": ["completed", "cancelled", "washout"]}}))
    ongoing = sum(1 for t in active_trades if t.get("vesselName"))
    pending = sum(1 for t in active_trades if not t.get("vesselName"))
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_dist = {item["_id"]: item["count"] for item in trades_col.aggregate(pipeline)}
    return {
        "totalTrades": total,
        "activeTrades": ongoing,
        "pendingTrades": pending,
        "completedTrades": completed,
        "completionRate": round((completed / total * 100) if total > 0 else 0, 1),
        "statusDistribution": status_dist
    }


@router.get("/{trade_id}")
def get_trade(trade_id: str, user=Depends(non_accountant)):
    trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return serialize_doc(trade)


@router.put("/{trade_id}")
def update_trade(trade_id: str, body: dict, user=Depends(non_accountant)):
    # Separate null fields (to unset) from non-null fields (to set)
    fields_to_unset = {k: "" for k, v in body.items() if v is None}
    data = {k: v for k, v in body.items() if v is not None}
    data["updatedAt"] = datetime.utcnow()
    for field, col, name_field, code_field in [
        ("buyerId", partners_col, "buyerName", "buyerCode"),
        ("sellerId", partners_col, "sellerName", "sellerCode"),
        ("brokerId", partners_col, "brokerName", "brokerCode"),
        ("coBrokerId", partners_col, "coBrokerName", "coBrokerCode"),
        ("commodityId", commodities_col, "commodityName", None),
        ("originId", origins_col, "originName", None),
        ("basePortId", ports_col, "basePortName", None),
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
                    # Store port country
                    if "Port" in name_field and doc.get("country"):
                        data[name_field.replace("Name", "Country")] = doc.get("country", "")
            except Exception:
                pass
    # Compose commodity display name with origin adjective and crop year on update
    if data.get("originId") or data.get("commodityId") or data.get("cropYear"):
        existing_t = trades_col.find_one({"_id": ObjectId(trade_id)}) or {}
        if data.get("originId"):
            try:
                origin_doc = origins_col.find_one({"_id": ObjectId(data["originId"])})
                if origin_doc and origin_doc.get("adjective"):
                    data["originAdjective"] = origin_doc["adjective"]
            except Exception:
                pass
        adj = data.get("originAdjective") or existing_t.get("originAdjective") or ""
        cname = data.get("commodityName") or existing_t.get("commodityName") or ""
        cyear = data.get("cropYear") or existing_t.get("cropYear") or ""
        if adj and cname and cyear:
            data["commodityDisplayName"] = f"{adj} {cname}, Crop {cyear}"
        elif adj and cname:
            data["commodityDisplayName"] = f"{adj} {cname}"
        else:
            data["commodityDisplayName"] = cname
    if "quantity" in data or "brokeragePerMT" in data:
        existing = trades_col.find_one({"_id": ObjectId(trade_id)})
        qty = data.get("quantity", existing.get("quantity", 0) if existing else 0) or 0
        brok = data.get("brokeragePerMT", existing.get("brokeragePerMT", 0) if existing else 0) or 0
        data["totalCommission"] = round(qty * brok, 2)
    old_trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    old_status = old_trade.get("status") if old_trade else None
    update_ops = {"$set": data}
    if fields_to_unset:
        update_ops["$unset"] = fields_to_unset
    trades_col.update_one({"_id": ObjectId(trade_id)}, update_ops)
    updated = trades_col.find_one({"_id": ObjectId(trade_id)})
    create_notification("trade", f"Trade updated: {updated.get('referenceNumber', trade_id)}", trade_id, user.get("username"))

    # Auto-create commission invoice when trade is completed via PUT
    if data.get("status") == "completed" and old_status != "completed":
        existing_inv = invoices_col.find_one({"tradeId": trade_id, "autoGenerated": True})
        if not existing_inv:
            brokerage_per_mt = updated.get("brokeragePerMT") or 0
            quantity = updated.get("quantity") or 0
            commission_amount = brokerage_per_mt * quantity
            contract_num = updated.get("pirContractNumber") or updated.get("referenceNumber") or trade_id
            broker_name = updated.get("brokerName") or "Broker"
            commodity_name = updated.get("commodityName") or ""
            currency = updated.get("currency") or "USD"
            seller_name = updated.get("sellerName") or ""
            buyer_name = updated.get("buyerName") or ""
            invoice_data = {
                "invoiceNumber": f"COMM-{contract_num}",
                "vendorName": broker_name,
                "amount": commission_amount,
                "currency": currency,
                "dueDate": datetime.utcnow().strftime("%Y-%m-%d"),
                "category": "Commission Payment",
                "description": f"Brokerage commission for {commodity_name} trade {contract_num} ({seller_name} -> {buyer_name}). Qty: {quantity:,.0f} MT x {brokerage_per_mt} {currency}/MT",
                "status": "pending",
                "direction": "incoming",
                "tradeId": trade_id,
                "autoGenerated": True,
                "createdAt": datetime.utcnow(),
            }
            invoices_col.insert_one(invoice_data)
            create_notification("accounting", f"Commission invoice auto-created for trade {contract_num}", trade_id, user.get("username"))

    return serialize_doc(updated)


@router.patch("/{trade_id}/status")
def update_trade_status(trade_id: str, body: TradeStatusUpdate, user=Depends(non_accountant)):
    old_trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    old_status = old_trade.get("status") if old_trade else None
    trades_col.update_one({"_id": ObjectId(trade_id)}, {"$set": {"status": body.status, "updatedAt": datetime.utcnow()}})
    t = trades_col.find_one({"_id": ObjectId(trade_id)})
    create_notification("trade", f"Trade {t.get('referenceNumber', trade_id)} status changed to {body.status}", trade_id, user.get("username"))

    # Auto-create commission invoice when trade is completed
    if body.status == "completed" and old_status != "completed":
        existing = invoices_col.find_one({"tradeId": trade_id, "autoGenerated": True})
        if not existing:
            brokerage_per_mt = t.get("brokeragePerMT") or 0
            quantity = t.get("quantity") or 0
            commission_amount = brokerage_per_mt * quantity
            contract_num = t.get("pirContractNumber") or t.get("referenceNumber") or trade_id
            broker_name = t.get("brokerName") or "Broker"
            commodity_name = t.get("commodityName") or ""
            currency = t.get("currency") or "USD"
            seller_name = t.get("sellerName") or ""
            buyer_name = t.get("buyerName") or ""

            invoice_data = {
                "invoiceNumber": f"COMM-{contract_num}",
                "vendorName": broker_name,
                "amount": commission_amount,
                "currency": currency,
                "dueDate": datetime.utcnow().strftime("%Y-%m-%d"),
                "category": "Commission Payment",
                "description": f"Brokerage commission for {commodity_name} trade {contract_num} ({seller_name} -> {buyer_name}). Qty: {quantity:,.0f} MT x {brokerage_per_mt} {currency}/MT",
                "status": "pending",
                "direction": "incoming",
                "tradeId": trade_id,
                "autoGenerated": True,
                "createdAt": datetime.utcnow(),
            }
            invoices_col.insert_one(invoice_data)
            create_notification("accounting", f"Commission invoice auto-created for trade {contract_num}", trade_id, user.get("username"))

    return serialize_doc(t)


@router.delete("/{trade_id}")
def delete_trade(trade_id: str, user=Depends(non_accountant)):
    t = trades_col.find_one({"_id": ObjectId(trade_id)})
    result = trades_col.delete_one({"_id": ObjectId(trade_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trade not found")
    create_notification("trade", f"Trade deleted: {t.get('referenceNumber', trade_id) if t else trade_id}", trade_id, user.get("username"))
    return {"message": "Trade deleted"}


UPLOAD_DIR = "/app/backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/trades/{trade_id}/upload-di")
async def upload_di_document(trade_id: str, file: UploadFile = File(...), user=Depends(non_accountant)):
    if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")
    ext = file.filename.rsplit('.', 1)[-1]
    filename = f"di_{trade_id}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    trades_col.update_one(
        {"_id": ObjectId(trade_id)},
        {"$set": {"diDocumentFilename": file.filename, "diDocumentPath": filename}}
    )
    return {"filename": file.filename, "path": filename}


@router.get("/trades/{trade_id}/download-di")
def download_di_document(trade_id: str, user=Depends(non_accountant)):
    from fastapi.responses import FileResponse
    trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    if not trade or not trade.get("diDocumentPath"):
        raise HTTPException(status_code=404, detail="No DI document found")
    filepath = os.path.join(UPLOAD_DIR, trade["diDocumentPath"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath, filename=trade.get("diDocumentFilename", "di_document"), media_type="application/octet-stream")
