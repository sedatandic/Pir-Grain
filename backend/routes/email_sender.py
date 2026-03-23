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


def fmt_qty(val):
    try:
        return f"{float(val):,.0f}"
    except:
        return str(val or "-")


def fmt_price(val, currency="USD"):
    try:
        return f"{float(val):,.2f} {currency}"
    except:
        return str(val or "-")


def row_html(label, value):
    return f'<tr><td style="padding: 10px 14px; border: 1px solid #e0e0e0; background: #f7f7f0; font-weight: 600; width: 200px; color: #2d5016;">{label}</td><td style="padding: 10px 14px; border: 1px solid #e0e0e0;">{value}</td></tr>'


def build_email_body(trade, doc_name, recipient_name):
    ref, seller_contract, commodity, seller, buyer = get_trade_context(trade)
    contract_label = seller_contract or ref
    quantity = trade.get("quantity") or 0
    bl_quantity = trade.get("blQuantity") or quantity
    price = trade.get("price") or 0
    currency = trade.get("currency") or "USD"
    tolerance = trade.get("tolerance") or ""
    origin = trade.get("originName") or trade.get("origin") or ""
    origin_adj = trade.get("originAdjective") or ""
    load_port = trade.get("loadingPortName") or trade.get("basePortName") or ""
    load_country = trade.get("loadingPortCountry") or ""
    discharge_port = trade.get("dischargePortName") or ""
    discharge_country = trade.get("dischargePortCountry") or ""
    vessel = trade.get("vesselName") or "-"
    bl_date = trade.get("blDate") or "-"
    payment_terms = trade.get("paymentTerms") or "-"
    contract_date = trade.get("contractDate") or "-"
    commodity_specs = trade.get("commoditySpecs") or ""
    gafta_term = trade.get("gaftaTerm") or "-"
    broker_name = trade.get("brokerName") or "-"
    brokerage_per_mt = trade.get("brokeragePerMT") or 0
    brokerage_currency = trade.get("brokerageCurrency") or "USD"
    discharge_rate = trade.get("dischargeRate") or ""
    commodity_display = trade.get("commodityDisplayName") or commodity

    load_port_full = f"{load_port}, {load_country}" if load_country else load_port
    discharge_port_full = f"{discharge_port}, {discharge_country}" if discharge_country else discharge_port
    specs_html = commodity_specs.replace("\n", "<br/>") if commodity_specs else "-"

    # Build rows based on document type
    if doc_name == "Business Confirmation":
        rows = "".join([
            row_html("DATE", contract_date),
            row_html("CONTRACT NO", contract_label),
            row_html("PIR GRAIN REF. NO", ref),
            row_html("SELLERS", seller),
            row_html("BUYERS", buyer),
            row_html("BROKER", broker_name),
            row_html("COMMODITY", f"{origin_adj} {commodity}".strip() if origin_adj else commodity),
            row_html("SPECIFICATIONS", specs_html),
            row_html("QUANTITY", f"{fmt_qty(quantity)} MT{(' +/- ' + tolerance + ' at Sellers option') if tolerance else ''}"),
            row_html("PRICE", fmt_price(price, currency)),
            row_html("ORIGIN", origin),
            row_html("SHIPMENT", f"{trade.get('shipmentWindowStart', '')} - {trade.get('shipmentWindowEnd', '')}"),
            row_html("LOADING PORT", load_port_full),
            row_html("DISCHARGE PORT", discharge_port_full),
            row_html("DISCHARGE RATE", f"{fmt_qty(discharge_rate)} Mts/Day" if discharge_rate else "-"),
            row_html("PAYMENT", payment_terms),
            row_html("GAFTA RULE", gafta_term),
        ])
        closing = "A draft contract will be shared shortly. Thank you for the business."

    elif doc_name == "Shipment Appropriation":
        rows = "".join([
            row_html("CONTRACT NO", contract_label),
            row_html("PIR GRAIN REF. NO", ref),
            row_html("COMMODITY", commodity_display),
            row_html("QUANTITY", f"{fmt_qty(bl_quantity)} MT"),
            row_html("VESSEL", vessel),
            row_html("B/L DATE", bl_date),
            row_html("LOADING PORT", load_port_full),
            row_html("DISCHARGE PORT", discharge_port_full),
            row_html("SELLER", seller),
            row_html("BUYER", buyer),
        ])
        closing = "Please find the shipment details above for your reference."

    elif doc_name == "Commission Invoice":
        commission_total = brokerage_per_mt * (bl_quantity or quantity or 0)
        rows = "".join([
            row_html("INVOICE NO", f"COMM-{contract_label}"),
            row_html("CONTRACT NO", contract_label),
            row_html("PIR GRAIN REF. NO", ref),
            row_html("COMMODITY", commodity_display),
            row_html("SELLER", seller),
            row_html("BUYER", buyer),
            row_html("B/L QUANTITY", f"{fmt_qty(bl_quantity)} MT"),
            row_html("BROKERAGE RATE", f"{brokerage_per_mt} {brokerage_currency}/MT"),
            row_html("COMMISSION AMOUNT", f"<strong>{fmt_price(commission_total, brokerage_currency)}</strong>"),
            row_html("VESSEL", vessel),
            row_html("B/L DATE", bl_date),
        ])
        closing = "Please arrange payment at your earliest convenience."
    else:
        rows = ""
        closing = ""

    return f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #e0e0e0;">
        <div style="background-color: #2d5016; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 1px;">PIR Grain &amp; Pulses Ltd</h1>
        </div>
        <div style="padding: 30px 28px; background-color: #fafaf8;">
            <p style="font-size: 15px; color: #333;">Dear {recipient_name},</p>
            <p style="font-size: 15px; color: #333;">Please find below the <strong>{doc_name}</strong> details:</p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                {rows}
            </table>

            <p style="font-size: 14px; color: #555; margin-top: 24px;">{closing}</p>
            <p style="font-size: 14px; color: #333; margin-top: 20px;">Best Regards,<br/><strong>PIR Grain &amp; Pulses Ltd</strong></p>
        </div>
        <div style="background-color: #2d5016; padding: 12px; text-align: center;">
            <p style="color: #aaa; font-size: 11px; margin: 0;">PIR Grain &amp; Pulses Ltd. | Confidential</p>
        </div>
    </div>
    """


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

    # Build detailed HTML email body based on document type
    html_body = build_email_body(trade, doc_name, recipient_name)

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
