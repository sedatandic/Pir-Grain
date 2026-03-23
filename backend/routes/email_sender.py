import os
import asyncio
import base64
import resend
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

from database import trades_col, partners_col
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["email"])

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")


class EmailSendRequest(BaseModel):
    trade_id: str
    doc_type: str  # "business_confirmation", "shipment_appropriation", "commission_invoice"
    recipient_email: str
    recipient_name: Optional[str] = ""
    subject: Optional[str] = ""


def get_trade_context(trade):
    ref = trade.get("referenceNumber") or ""
    seller_contract = trade.get("sellerContractNumber") or ""
    commodity = trade.get("commodityName") or ""
    seller = trade.get("sellerName") or ""
    buyer = trade.get("buyerName") or ""
    return ref, seller_contract, commodity, seller, buyer


@router.post("/send-document-email")
async def send_document_email(req: EmailSendRequest, user=Depends(get_current_user)):
    trade = trades_col.find_one({"_id": ObjectId(req.trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    ref, seller_contract, commodity, seller, buyer = get_trade_context(trade)
    contract_label = seller_contract or ref

    # Generate the PDF
    if req.doc_type == "business_confirmation":
        from routes.business_confirmation import generate_bc_pdf
        pdf_buf = generate_bc_pdf(trade)
        doc_name = "Business Confirmation"
        filename = f"Business_Confirmation_{contract_label}.pdf"
    elif req.doc_type == "shipment_appropriation":
        from routes.shipment_appropriation import generate_sa_pdf
        pdf_buf = generate_sa_pdf(trade)
        doc_name = "Shipment Appropriation"
        filename = f"Shipment_Appropriation_{contract_label}.pdf"
    elif req.doc_type == "commission_invoice":
        from routes.commission_invoice import generate_ci_pdf
        pdf_buf = generate_ci_pdf(trade)
        doc_name = "Commission Invoice"
        filename = f"Commission_Invoice_{contract_label}.pdf"
    else:
        raise HTTPException(status_code=400, detail="Invalid document type")

    subject = req.subject or f"{doc_name} - {contract_label} ({commodity})"
    recipient_name = req.recipient_name or req.recipient_email

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2d5016; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">PIR Grain & Pulses Ltd</h2>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear {recipient_name},</p>
            <p>Please find attached the <strong>{doc_name}</strong> for the following trade:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f0f0f0; font-weight: bold;">Contract No</td><td style="padding: 8px; border: 1px solid #ddd;">{contract_label}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f0f0f0; font-weight: bold;">PIR Ref. No</td><td style="padding: 8px; border: 1px solid #ddd;">{ref}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f0f0f0; font-weight: bold;">Commodity</td><td style="padding: 8px; border: 1px solid #ddd;">{commodity}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f0f0f0; font-weight: bold;">Seller</td><td style="padding: 8px; border: 1px solid #ddd;">{seller}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f0f0f0; font-weight: bold;">Buyer</td><td style="padding: 8px; border: 1px solid #ddd;">{buyer}</td></tr>
            </table>
            <p>Best Regards,<br><strong>PIR Grain & Pulses Ltd</strong></p>
        </div>
        <div style="background-color: #2d5016; padding: 10px; text-align: center;">
            <p style="color: #ccc; font-size: 12px; margin: 0;">PIR Grain & Pulses Ltd.</p>
        </div>
    </div>
    """

    pdf_bytes = pdf_buf.getvalue()
    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

    params = {
        "from": SENDER_EMAIL,
        "to": [req.recipient_email],
        "subject": subject,
        "html": html_body,
        "attachments": [
            {
                "filename": filename,
                "content": pdf_b64,
                "content_type": "application/pdf",
            }
        ],
    }

    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        # Update trade to track sent status
        sent_field = f"{req.doc_type}Sent"
        trades_col.update_one(
            {"_id": ObjectId(req.trade_id)},
            {"$set": {sent_field: True, f"{sent_field}To": req.recipient_email, f"{sent_field}At": __import__('datetime').datetime.utcnow().isoformat()}}
        )
        return {"status": "success", "message": f"{doc_name} sent to {req.recipient_email}", "email_id": email.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
