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
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "PIR Grain <onboarding@resend.dev>")
CC_EMAILS = ["melisa.karagoz@pirgrain.com", "salih.karagoz@pirgrain.com"]

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "pir-logo.jpeg")
LOGO_B64 = ""
if os.path.exists(LOGO_PATH):
    with open(LOGO_PATH, "rb") as f:
        LOGO_B64 = base64.b64encode(f.read()).decode()

# Public logo URL for emails (Gmail blocks base64 images)
APP_URL = os.environ.get("APP_URL", "")
LOGO_URL = f"{APP_URL}/api/static/pir-logo.jpeg" if APP_URL else ""


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


def fmt_date_ddmmyyyy(d):
    """Format date to DD-MM-YYYY. Handles ISO (2025-07-01), slash (01/07/2025), and datetime."""
    if not d or d == "-":
        return "-"
    import re
    # ISO format: 2025-07-01 or 2025-07-01T...
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', str(d))
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    # dd/MM/yyyy
    m = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', str(d))
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    # dd.MM.yyyy
    m = re.match(r'^(\d{2})\.(\d{2})\.(\d{4})$', str(d))
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    try:
        from datetime import datetime as dt_cls
        parsed = dt_cls.fromisoformat(str(d).replace('Z', '+00:00'))
        return parsed.strftime('%d-%m-%Y')
    except Exception:
        return str(d)


def row_html(label, value):
    return f'<tr><td style="padding: 10px 14px; border: 1px solid #e0e0e0; background: #E8F5E9; font-weight: 600; width: 200px; color: #1B7A3D;">{label}</td><td style="padding: 10px 14px; border: 1px solid #e0e0e0;">{value}</td></tr>'


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
    price = trade.get("pricePerMT") or trade.get("price") or 0
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
    demurrage_rate = trade.get("demurrageRate") or ""
    crop_year = trade.get("cropYear") or ""
    delivery_term = trade.get("deliveryTerm") or ""
    commodity_display = trade.get("commodityDisplayName") or commodity

    load_port_full = f"{load_port}, {load_country}" if load_country else load_port
    discharge_port_full = f"{discharge_port}, {discharge_country}" if discharge_country else discharge_port
    specs_html = commodity_specs.replace("\n", "<br/>") if commodity_specs else "-"

    # Build commodity display: "Yellow Corn, Crop 2025" (no origin adjective)
    commodity_with_crop = commodity
    if crop_year:
        commodity_with_crop = f"{commodity}, Crop {crop_year}"

    # Format date as DD-MM-YYYY
    formatted_date = fmt_date_ddmmyyyy(contract_date)

    # Format shipment dates as DD-MM-YYYY
    shipment_start = fmt_date_ddmmyyyy(trade.get("shipmentWindowStart", ""))
    shipment_end = fmt_date_ddmmyyyy(trade.get("shipmentWindowEnd", ""))

    # Build price with delivery term and base port
    base_port = trade.get("basePortName") or discharge_port
    base_port_country = trade.get("basePortCountry") or ""
    base_port_full = f"{base_port}, {base_port_country}" if base_port_country else base_port
    price_display = f"{currency} {float(price):,.2f}/MT {delivery_term} {base_port_full}".strip() if price else "-"

    logo_html = ""
    if LOGO_URL:
        logo_html = f'''
            <table style="width: 100%;" cellpadding="0" cellspacing="0"><tr>
                <td style="text-align: center; padding: 10px 0;">
                    <img src="{LOGO_URL}" style="height: 50px; vertical-align: middle;" alt="PIR" />
                    <span style="color: #ffffff; font-size: 22px; font-weight: bold; vertical-align: middle; margin-left: 12px;">PIR Grain &amp; Pulses Ltd</span>
                </td>
            </tr></table>'''
    elif LOGO_B64:
        logo_html = f'''
            <table style="width: 100%;" cellpadding="0" cellspacing="0"><tr>
                <td style="text-align: center; padding: 10px 0;">
                    <img src="data:image/jpeg;base64,{LOGO_B64}" style="height: 50px; vertical-align: middle;" alt="PIR" />
                    <span style="color: #ffffff; font-size: 22px; font-weight: bold; vertical-align: middle; margin-left: 12px;">PIR Grain &amp; Pulses Ltd</span>
                </td>
            </tr></table>'''

    if doc_name == "Business Confirmation":
        rows = "".join([
            row_html("DATE", formatted_date),
            row_html("CONTRACT NO", contract_label),
            row_html("PIR GRAIN REF. NO", ref),
            row_html("SELLERS", seller),
            row_html("BUYERS", buyer),
            row_html("BROKER", broker_name),
            row_html("COMMODITY", commodity_with_crop),
            row_html("SPECIFICATIONS", specs_html),
            row_html("QUANTITY", f"{fmt_qty(quantity)} MT{(' +/- ' + tolerance + ' at Sellers option') if tolerance else ''}"),
            row_html("PRICE", price_display),
            row_html("ORIGIN", origin),
            row_html("SHIPMENT", f"{shipment_start}<br/>{shipment_end}" if shipment_start != "-" else "-"),
            row_html("DISCHARGE RATE", f"{fmt_qty(discharge_rate)} Mts/Day" if discharge_rate else "-"),
            row_html("DEMURRAGE RATE", f"{currency} {float(demurrage_rate):,.2f}/Day" if demurrage_rate else "-"),
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

    elif doc_name == "Vessel Nomination":
        vessel_imo = trade.get("vesselIMO") or "-"
        vessel_flag = trade.get("vesselFlag") or "-"
        vessel_built = trade.get("vesselBuilt") or "-"
        vessel_dwt = trade.get("vesselDWT") or "-"
        rows = "".join([
            row_html("CONTRACT NO", contract_label),
            row_html("PIR GRAIN REF. NO", ref),
            row_html("COMMODITY", commodity_with_crop),
            row_html("QUANTITY", f"{fmt_qty(quantity)} MT"),
            row_html("VESSEL NAME", f"<strong>{vessel}</strong>"),
            row_html("IMO NUMBER", vessel_imo),
            row_html("FLAG", vessel_flag),
            row_html("BUILT", vessel_built),
            row_html("DWT", fmt_qty(vessel_dwt) if vessel_dwt != "-" else "-"),
            row_html("LOADING PORT", load_port_full),
            row_html("DISCHARGE PORT", discharge_port_full),
            row_html("SELLER", seller),
            row_html("BUYER", buyer),
        ])
        closing = "Please confirm acceptance of the above vessel nomination."

    else:
        rows = ""
        closing = ""

    return f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #e0e0e0;">
        <div style="background-color: #1B7A3D; padding: 20px; text-align: center;">
            {logo_html if logo_html else '<h1 style="color: #ffffff; margin: 0; font-size: 22px;">PIR Grain &amp; Pulses Ltd</h1>'}
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
        <div style="background-color: #1B7A3D; padding: 12px; text-align: center;">
            <p style="color: rgba(255,255,255,0.7); font-size: 11px; margin: 0;">PIR Grain &amp; Pulses Ltd. | Confidential</p>
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

    # Generate the PDF (skip for business_confirmation and vessel_nomination)
    attachment = None
    if req.doc_type == "business_confirmation":
        doc_name = "Business Confirmation"
        filename = None
    elif req.doc_type == "vessel_nomination":
        doc_name = "Vessel Nomination"
        filename = None
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

    if filename and req.doc_type not in ("business_confirmation", "vessel_nomination"):
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
            }
            if attachment:
                params["attachments"] = [attachment]
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
            }
            if attachment:
                params["attachments"] = [attachment]
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
            }
            if attachment:
                params["attachments"] = [attachment]
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
