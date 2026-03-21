from datetime import datetime

from fastapi import APIRouter, Depends
from bson import ObjectId

from database import invoices_col, bank_statements_col, serialize_doc, create_notification
from auth import get_current_user
from models import InvoiceCreate, BankStatementCreate

router = APIRouter(prefix="/api", tags=["accounting"])


# ─── Invoices ────────────────────────────────────────────────
@router.get("/invoices")
def list_invoices(user=Depends(get_current_user)):
    return [serialize_doc(i) for i in invoices_col.find().sort("createdAt", -1)]


@router.post("/invoices")
def create_invoice(invoice: InvoiceCreate, user=Depends(get_current_user)):
    data = invoice.dict()
    data["createdAt"] = datetime.utcnow()
    result = invoices_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("accounting", f"New invoice: {data.get('invoiceNumber', '')}", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)


@router.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: str, invoice: InvoiceCreate, user=Depends(get_current_user)):
    data = invoice.dict()
    invoices_col.update_one({"_id": ObjectId(invoice_id)}, {"$set": data})
    create_notification("accounting", f"Invoice updated: {data.get('invoiceNumber', '')}", invoice_id, user.get("username"))
    return serialize_doc(invoices_col.find_one({"_id": ObjectId(invoice_id)}))


@router.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: str, user=Depends(get_current_user)):
    inv = invoices_col.find_one({"_id": ObjectId(invoice_id)})
    invoices_col.delete_one({"_id": ObjectId(invoice_id)})
    create_notification("accounting", f"Invoice deleted: {inv.get('invoiceNumber', '') if inv else invoice_id}", invoice_id, user.get("username"))
    return {"message": "Deleted"}


# ─── Bank Statements ────────────────────────────────────────
@router.get("/bank-statements")
def list_bank_statements(user=Depends(get_current_user)):
    return [serialize_doc(s) for s in bank_statements_col.find().sort("createdAt", -1)]


@router.post("/bank-statements")
def create_bank_statement(stmt: BankStatementCreate, user=Depends(get_current_user)):
    data = stmt.dict()
    data["createdAt"] = datetime.utcnow()
    result = bank_statements_col.insert_one(data)
    data["_id"] = result.inserted_id
    create_notification("accounting", "New bank statement added", str(result.inserted_id), user.get("username"))
    return serialize_doc(data)


@router.delete("/bank-statements/{stmt_id}")
def delete_bank_statement(stmt_id: str, user=Depends(get_current_user)):
    bank_statements_col.delete_one({"_id": ObjectId(stmt_id)})
    create_notification("accounting", "Bank statement deleted", stmt_id, user.get("username"))
    return {"message": "Deleted"}
