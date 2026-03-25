"""Documentary Instructions CRUD and email endpoints"""
import os
import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from database import doc_instructions_col, trades_col, partners_col, ports_col, disport_agents_col, serialize_doc
from auth import get_current_user

try:
    import resend
    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "PIR Grain <onboarding@resend.dev>")
except ImportError:
    resend = None
    SENDER_EMAIL = ""

router = APIRouter(prefix="/api/doc-instructions", tags=["doc-instructions"])


class DocInstructionCreate(BaseModel):
    tradeId: str
    dischargePort: str = ""
    agentId: str = ""
    agentName: str = ""
    agentPhone: str = ""
    agentFax: str = ""
    agentMobile: str = ""
    agentEmail: str = ""
    agentWeb: str = ""
    agentAddress: str = ""
    surveyor: str = ""
    originalDocsAddress: str = ""
    consigneeOption: str = "to_order"
    consigneeCustom: str = ""
    consigneeBuyerId: str = ""
    notifyOption: str = "buyer_details"
    notifyCustom: str = ""
    notifyBuyerId: str = ""


class DocInstructionUpdate(BaseModel):
    dischargePort: Optional[str] = None
    agentId: Optional[str] = None
    agentName: Optional[str] = None
    agentPhone: Optional[str] = None
    agentFax: Optional[str] = None
    agentMobile: Optional[str] = None
    agentEmail: Optional[str] = None
    agentWeb: Optional[str] = None
    agentAddress: Optional[str] = None
    surveyor: Optional[str] = None
    originalDocsAddress: Optional[str] = None
    consigneeOption: Optional[str] = None
    consigneeCustom: Optional[str] = None
    consigneeBuyerId: Optional[str] = None
    notifyOption: Optional[str] = None
    notifyCustom: Optional[str] = None
    notifyBuyerId: Optional[str] = None


def get_buyer_display(buyer_id):
    """Get buyer company details for display"""
    if not buyer_id:
        return ""
    try:
        buyer = partners_col.find_one({"_id": ObjectId(buyer_id)})
        if buyer:
            lines = [buyer.get("companyName", "")]
            if buyer.get("address"):
                lines.append(buyer["address"])
            return "\n".join(lines)
    except Exception:
        pass
    return ""


@router.get("/")
async def list_doc_instructions(tradeId: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if tradeId:
        query["tradeId"] = tradeId
    docs = list(doc_instructions_col.find(query).sort("createdAt", -1))
    return [serialize_doc(d) for d in docs]


@router.get("/{di_id}")
async def get_doc_instruction(di_id: str, user=Depends(get_current_user)):
    doc = doc_instructions_col.find_one({"_id": ObjectId(di_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Documentary Instruction not found")
    return serialize_doc(doc)


@router.post("/")
async def create_doc_instruction(data: DocInstructionCreate, user=Depends(get_current_user)):
    # Verify trade exists
    trade = trades_col.find_one({"_id": ObjectId(data.tradeId)})
    if not trade:
        raise HTTPException(status_code=404, detail="Contract not found")

    doc = data.dict()
    doc["createdBy"] = user.get("username")
    doc["createdByName"] = user.get("name", user.get("username"))
    doc["createdAt"] = datetime.now(timezone.utc).isoformat()
    doc["updatedAt"] = datetime.now(timezone.utc).isoformat()

    # Store resolved buyer details
    if data.consigneeBuyerId:
        doc["consigneeBuyerText"] = get_buyer_display(data.consigneeBuyerId)
    if data.notifyBuyerId:
        doc["notifyBuyerText"] = get_buyer_display(data.notifyBuyerId)

    result = doc_instructions_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/{di_id}")
async def update_doc_instruction(di_id: str, data: DocInstructionUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
    updates["updatedBy"] = user.get("username")

    if data.consigneeBuyerId:
        updates["consigneeBuyerText"] = get_buyer_display(data.consigneeBuyerId)
    if data.notifyBuyerId:
        updates["notifyBuyerText"] = get_buyer_display(data.notifyBuyerId)

    result = doc_instructions_col.update_one({"_id": ObjectId(di_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documentary Instruction not found")

    doc = doc_instructions_col.find_one({"_id": ObjectId(di_id)})
    return serialize_doc(doc)


@router.delete("/{di_id}")
async def delete_doc_instruction(di_id: str, user=Depends(get_current_user)):
    result = doc_instructions_col.delete_one({"_id": ObjectId(di_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documentary Instruction not found")
    return {"message": "Deleted"}


@router.post("/{di_id}/send-email")
async def send_di_email(di_id: str, user=Depends(get_current_user)):
    """Send the DI to the seller via email"""
    doc = doc_instructions_col.find_one({"_id": ObjectId(di_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Documentary Instruction not found")

    trade = trades_col.find_one({"_id": ObjectId(doc["tradeId"])})
    if not trade:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Get seller email
    seller = partners_col.find_one({"_id": ObjectId(trade.get("sellerId", ""))})
    if not seller or not seller.get("email"):
        raise HTTPException(status_code=400, detail="Seller has no email address")

    seller_email = seller["email"]
    contract_num = trade.get("pirContractNumber", "N/A")

    # Build consignee/notify text
    consignee = "TO ORDER"
    if doc.get("consigneeOption") == "buyer_details":
        consignee = doc.get("consigneeBuyerText", "BUYER DETAILS")
    elif doc.get("consigneeOption") == "other":
        consignee = doc.get("consigneeCustom", "—")

    notify = doc.get("notifyBuyerText", "BUYER DETAILS")
    if doc.get("notifyOption") == "other":
        notify = doc.get("notifyCustom", "—")

    # Build HTML email
    html = f"""
    <html><body style="font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 20px;">
    <h2 style="text-align: center; color: #15803d;">DOCUMENTARY INSTRUCTIONS TO SELLER</h2>
    <p style="text-align: center; color: #666;">Contract Reference: {contract_num}</p>

    <h3 style="color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 4px;">1. Shipment & Port Details</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr><th style="border: 1px solid #ccc; padding: 8px; background: #f3f4f6; width: 200px; text-align: left;">Discharge Port</th><td style="border: 1px solid #ccc; padding: 8px;">{doc.get('dischargePort', '—')}</td></tr>
      <tr><th style="border: 1px solid #ccc; padding: 8px; background: #f3f4f6; text-align: left;">Agent at Discharge Port</th><td style="border: 1px solid #ccc; padding: 8px;">{doc.get('agentName', '—')}</td></tr>
      <tr><th style="border: 1px solid #ccc; padding: 8px; background: #f3f4f6; text-align: left;">Agent Contacts</th><td style="border: 1px solid #ccc; padding: 8px;">Tel: {doc.get('agentPhone', '—')} &bull; Fax: {doc.get('agentFax', '—')} &bull; Mob: {doc.get('agentMobile', '—')}</td></tr>
      <tr><th style="border: 1px solid #ccc; padding: 8px; background: #f3f4f6; text-align: left;">Agent Email / Web</th><td style="border: 1px solid #ccc; padding: 8px;">{doc.get('agentEmail', '—')} &bull; {doc.get('agentWeb', '—')}</td></tr>
      <tr><th style="border: 1px solid #ccc; padding: 8px; background: #f3f4f6; text-align: left;">Surveyor at Load Port</th><td style="border: 1px solid #ccc; padding: 8px;">{doc.get('surveyor', '—')}</td></tr>
    </table>

    <h3 style="color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 4px;">2. Address for Original Documents</h3>
    <div style="border: 1px solid #ccc; padding: 10px; background: #f9fafb; white-space: pre-wrap; margin-bottom: 16px;">{doc.get('originalDocsAddress', '—')}</div>

    <h3 style="color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 4px;">3. Required Documents</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><th style="border: 1px solid #ccc; padding: 6px; background: #f3f4f6; width: 30px; text-align: center;">#</th><th style="border: 1px solid #ccc; padding: 6px; background: #f3f4f6; text-align: left;">Document</th><th style="border: 1px solid #ccc; padding: 6px; background: #f3f4f6; text-align: left;">Details</th></tr>
    """
    docs_list = [
        ("Signed Commercial Invoice (Original)", f"Consignee: {consignee}"),
        ('3/3 Original B/L – "Clean on Board", "Freight Prepaid"', f"Consignee: {consignee}<br>Notify: {notify}"),
        ("Certificate of Origin (Original + 2 Copies)", f"Consignee: {consignee}<br>Notify: {notify}"),
        ("Phytosanitary Certificate (Original + 2 Copies)", f"Consignee: {consignee}"),
        ("Non-Radiation Certificate (CS134 & CS137 < 370 Bq/Kg)", f"Consignee: {consignee}<br>Notify: {notify}"),
        ("Fumigation Certificate (Original, if any)", f"Consignee: {consignee}<br>Notify: {notify}"),
        ("Quality Certificate (GAFTA Approved Surveyor)", f"Consignee: {consignee}<br>Notify: {notify}"),
        ("Weight Certificate (GAFTA Approved Surveyor)", f"Consignee: {consignee}<br>Notify: {notify}"),
        ("Holds Cleanliness Certificate (GAFTA Approved Surveyor)", f"Consignee: {consignee}<br>Notify: {notify}"),
        ("Holds Sealing Certificate (GAFTA Approved Surveyor)", f"Consignee: {consignee}<br>Notify: {notify}"),
        ("Insurance Certificate (GAFTA – 102% of value)", f"Assured: {consignee}"),
        ("Master's Receipt", "Confirming dispatch of 1 Original Phytosanitary Certificate + 1 Non-Negotiable B/L Copy"),
        ("Non-Dioxin Analysis + GAFTA Non-Dioxin Certificate", f"Include all PCB and Dioxin parameters.<br>Consignee: {consignee}<br>Notify: {notify}"),
    ]
    for i, (title, details) in enumerate(docs_list, 1):
        html += f'<tr><td style="border: 1px solid #ccc; padding: 6px; text-align: center; font-weight: 600;">{i}</td><td style="border: 1px solid #ccc; padding: 6px; font-weight: 500;">{title}</td><td style="border: 1px solid #ccc; padding: 6px; font-size: 12px;">{details}</td></tr>'

    html += """</table>
    <br><p style="font-size: 11px; color: #999;">This email was sent from PIR Grain & Pulses Trading Platform.</p>
    </body></html>"""

    if not resend or not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")

    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [seller_email],
            "subject": f"Documentary Instructions - Contract {contract_num}",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)

        # Mark as sent
        doc_instructions_col.update_one(
            {"_id": ObjectId(di_id)},
            {"$set": {"sentAt": datetime.now(timezone.utc).isoformat(), "sentTo": seller_email}}
        )
        return {"message": f"Email sent to {seller_email}", "sentTo": seller_email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
