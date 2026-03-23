import os
import asyncio
import base64
import resend
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from database import trades_col, partners_col
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["email"])

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "alenakaragoz@pirgrain.com")
CC_EMAILS = ["melisa.karagoz@pirgrain.com", "salih.karagoz@pirgrain.com"]

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "pir-logo.jpeg")
LOGO_B64 = ""
if os.path.exists(LOGO_PATH):
    with open(LOGO_PATH, "rb") as f:
        LOGO_B64 = base64.b64encode(f.read()).decode()


class EmailSendRequest(BaseModel):
    trade_id: str
    doc_type: str
    seller_email: Optional[str] = ""
    buyer_email: Optional[str] = ""
    subject: Optional[str] = ""


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


def get_partner_email(partner_id):
    if not partner_id:
        return ""
    try:
        partner = partners_col.find_one({"_id": ObjectId(partner_id)})
        if partner:
            email = partner.get("email") or ""
            if email:
                return email
            contacts = partner.get("contacts") or []
            for c in contacts:
                if c.get("email"):
                    return c["email"]
    except:
        pass
    return ""


def build_email_body(trade, doc_name, recipient_name, recipient_role):
    ref = trade.get("referenceNumber") or ""
    seller_contract = trade.get("sellerContractNumber") or ""
    contract_label = seller_contract or ref
    commodity = trade.get("commodityName") or ""
    seller = trade.get("sellerName") or ""
    buyer = trade.get("buyerName") or ""
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

    logo_html = ""
    if LOGO_B64:
        logo_html = f'<img src="data:image/jpeg;base64,{LOGO_B64}" style="height: 50px; margin: 0 auto; display: block;" alt="PIR Grain & Pulses Ltd" />'

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
        <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #2d5016;">
            {logo_html}
        </div>
        <div style="padding: 30px 28px; background-color: #fafaf8;">
            <h2 style="color: #2d5016; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #2d5016; padding-bottom: 10px;">{doc_name}</h2>
            <p style="font-size: 15px; color: #333;">Dear {recipient_name},</p>
            <p style="font-size: 15px; color: #333;">Please find below the <strong>{doc_name}</strong> details. The formal PDF document is attached.</p>

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

    ref = trade.get("referenceNumber") or ""
    seller_contract = trade.get("sellerContractNumber") or ""
    contract_label = seller_contract or ref
    commodity = trade.get("commodityName") or ""
    seller_name = trade.get("sellerName") or ""
    buyer_name = trade.get("buyerName") or ""

    # Resolve emails
    seller_email = req.seller_email or get_partner_email(trade.get("sellerId"))
    buyer_email = req.buyer_email or get_partner_email(trade.get("buyerId"))

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

    pdf_bytes = pdf_buf.getvalue()
    pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
    attachment = {"filename": filename, "content": pdf_b64, "content_type": "application/pdf"}

    sent_to = []
    errors = []

    # Send to seller (separate email - no buyer info in CC)
    if seller_email:
        seller_body = build_email_body(trade, doc_name, seller_name, "seller")
        seller_cc = [e for e in CC_EMAILS if e != seller_email]
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [seller_email],
                "cc": seller_cc,
                "subject": subject,
                "html": seller_body,
                "attachments": [attachment],
            }
            await asyncio.to_thread(resend.Emails.send, params)
            sent_to.append(f"Seller: {seller_email}")
        except Exception as e:
            errors.append(f"Seller ({seller_email}): {str(e)}")

    # Send to buyer (separate email - no seller info in CC)
    if buyer_email:
        buyer_body = build_email_body(trade, doc_name, buyer_name, "buyer")
        buyer_cc = [e for e in CC_EMAILS if e != buyer_email]
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [buyer_email],
                "cc": buyer_cc,
                "subject": subject,
                "html": buyer_body,
                "attachments": [attachment],
            }
            await asyncio.to_thread(resend.Emails.send, params)
            sent_to.append(f"Buyer: {buyer_email}")
        except Exception as e:
            errors.append(f"Buyer ({buyer_email}): {str(e)}")

    # If no emails provided, send to CC only
    if not seller_email and not buyer_email:
        body = build_email_body(trade, doc_name, "Team", "internal")
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": CC_EMAILS,
                "subject": subject,
                "html": body,
                "attachments": [attachment],
            }
            await asyncio.to_thread(resend.Emails.send, params)
            sent_to.append(f"Internal: {', '.join(CC_EMAILS)}")
        except Exception as e:
            errors.append(f"Internal: {str(e)}")

    # Track sent status
    sent_field = f"{req.doc_type}Sent"
    trades_col.update_one(
        {"_id": ObjectId(req.trade_id)},
        {"$set": {
            sent_field: True,
            f"{sent_field}At": datetime.utcnow().isoformat(),
            f"{sent_field}SentTo": sent_to,
        }}
    )

    if errors and not sent_to:
        raise HTTPException(status_code=500, detail=f"Failed to send: {'; '.join(errors)}")

    return {
        "status": "success",
        "sent_to": sent_to,
        "errors": errors if errors else None,
        "message": f"{doc_name} sent to {', '.join(sent_to)}" + (f" (errors: {'; '.join(errors)})" if errors else ""),
    }
