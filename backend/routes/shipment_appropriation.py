from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Spacer, Paragraph, Image, HRFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

from database import trades_col, partners_col
from auth import get_current_user

pdfmetrics.registerFont(TTFont('FreeSans', '/usr/share/fonts/truetype/freefont/FreeSans.ttf'))
pdfmetrics.registerFont(TTFont('FreeSansBold', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSansOblique', '/usr/share/fonts/truetype/freefont/FreeSansOblique.ttf'))
pdfmetrics.registerFontFamily('FreeSans', normal='FreeSans', bold='FreeSansBold', italic='FreeSansOblique')

router = APIRouter(prefix="/api/shipment-appropriation", tags=["shipment-appropriation"])

PIR_GREEN = colors.HexColor("#1B7A3D")
DARK_TEXT = colors.HexColor("#1A1A1A")
GREY_TEXT = colors.HexColor("#666666")
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "pir-logo.jpeg")


def fmt_num(v):
    if v is None:
        return "-"
    try:
        return f"{float(v):,.3f}"
    except (ValueError, TypeError):
        return str(v)


def fmt_date_slash(d):
    """Convert dd/MM/yyyy or ISO to dd.MM.yyyy"""
    if not d:
        return "-"
    import re
    m = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', str(d))
    if m:
        return f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
    try:
        dt = datetime.fromisoformat(str(d).replace('Z', '+00:00'))
        return dt.strftime('%d.%m.%Y')
    except Exception:
        return str(d)


def fmt_date_long(d):
    """Convert to dd-MMM-yyyy format"""
    if not d:
        return "-"
    import re
    m = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', str(d))
    if m:
        try:
            dt = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
            return dt.strftime('%d-%b-%Y').upper()
        except Exception:
            return str(d)
    try:
        dt = datetime.fromisoformat(str(d).replace('Z', '+00:00'))
        return dt.strftime('%d-%b-%Y').upper()
    except Exception:
        return str(d)


@router.get("/{trade_id}/pdf")
def generate_shipment_appropriation_pdf(trade_id: str, user=Depends(get_current_user)):
    trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    # Get buyer partner details
    buyer = None
    if trade.get("buyerId"):
        buyer = partners_col.find_one({"_id": ObjectId(trade["buyerId"])})

    buyer_name = trade.get("buyerName") or (buyer.get("companyName") if buyer else "-")
    buyer_address_parts = []
    if buyer:
        if buyer.get("address"):
            buyer_address_parts.append(buyer["address"])
        city_country = ", ".join(filter(None, [buyer.get("city"), buyer.get("country")]))
        if city_country:
            buyer_address_parts.append(city_country)
    buyer_address = "<br/>".join(buyer_address_parts) if buyer_address_parts else ""

    contract_no = trade.get("pirContractNumber") or trade.get("contractNumber") or "-"
    contract_date = fmt_date_slash(trade.get("contractDate"))
    contract_date_long = fmt_date_long(trade.get("contractDate"))
    quantity = trade.get("quantity") or 0
    commodity = trade.get("commodityName") or "-"
    origin = trade.get("originName") or "-"
    bl_number = trade.get("blNumber") or "-"
    bl_date = fmt_date_slash(trade.get("blDate"))
    bl_date_long = fmt_date_long(trade.get("blDate"))
    bl_quantity = trade.get("blQuantity") or quantity
    vessel = trade.get("vesselName") or "-"
    load_port = trade.get("loadingPortName") or trade.get("basePortName") or "-"
    load_country = trade.get("loadingPortCountry") or ""
    discharge_port = trade.get("dischargePortName") or "-"
    discharge_country = trade.get("dischargePortCountry") or ""
    price = trade.get("pricePerMT") or 0
    currency = trade.get("currency") or "USD"

    load_port_full = f"{load_port}, {load_country}" if load_country else load_port
    discharge_port_full = f"{discharge_port}, {discharge_country}" if discharge_country else discharge_port
    invoice_value = bl_quantity * price if bl_quantity and price else quantity * price

    # Styles
    s_title = ParagraphStyle('Title', fontName='FreeSansBold', fontSize=16, textColor=PIR_GREEN, alignment=TA_CENTER, spaceAfter=4)
    s_normal = ParagraphStyle('Normal', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, leading=14, spaceAfter=6)
    s_bold = ParagraphStyle('Bold', fontName='FreeSansBold', fontSize=10, textColor=DARK_TEXT, leading=14, spaceAfter=6)
    s_label = ParagraphStyle('Label', fontName='FreeSansBold', fontSize=10, textColor=DARK_TEXT, leading=14)
    s_body = ParagraphStyle('Body', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, leading=16, spaceAfter=10)
    s_bullet = ParagraphStyle('Bullet', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, leading=15, leftIndent=20, spaceAfter=4)
    s_closing = ParagraphStyle('Closing', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, leading=14, spaceAfter=2)
    s_sign = ParagraphStyle('Sign', fontName='FreeSansBold', fontSize=10, textColor=PIR_GREEN, leading=14)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=25 * mm, rightMargin=25 * mm)
    story = []

    # Logo
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=50 * mm, height=50 * mm)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 4 * mm))

    # Title
    story.append(Paragraph("SHIPMENT APPROPRIATION", s_title))
    story.append(Spacer(1, 2 * mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PIR_GREEN, spaceAfter=6))
    story.append(Spacer(1, 4 * mm))

    # TO and DATE
    to_text = f"<b>TO:</b> {buyer_name}"
    if buyer_address:
        to_text += f"<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{buyer_address}"
    story.append(Paragraph(to_text, s_body))
    story.append(Paragraph(f"<b>DATE:</b> {bl_date_long}", s_body))
    story.append(Spacer(1, 4 * mm))

    # REF paragraph
    ref_text = (
        f"<b>REF:</b> Appropriation of Contract No. <b>{contract_no}</b> "
        f"dated <b>{contract_date}</b> covering <b>{fmt_num(quantity)} MT</b> "
        f"of <b>{commodity}</b>."
    )
    story.append(Paragraph(ref_text, s_body))
    story.append(Spacer(1, 2 * mm))

    # Main body paragraph
    body1 = (
        f"We hereby appropriate on behalf of Seller, under the usual reserves, "
        f"in full fulfilment of the above-mentioned Contract No. <b>{contract_no}</b> "
        f"dated <b>{contract_date}</b> the quantity of "
        f"<b>{fmt_num(bl_quantity)} MT GROSS/NETT</b>."
    )
    story.append(Paragraph(body1, s_body))

    body2 = (
        f"<b>{origin}</b> origin <b>{commodity}</b>, in bulk, "
        f"shipped as per <b>M/V \"{vessel}\"</b> under the following details:"
    )
    story.append(Paragraph(body2, s_body))
    story.append(Spacer(1, 2 * mm))

    # Bullet details
    bullets = [
        f"<b>B/L No.:</b> {bl_number}",
        f"<b>B/L Date:</b> {bl_date}",
        f"<b>Quantity:</b> {fmt_num(bl_quantity)} MT GROSS/NETT",
        f"<b>Port of Loading:</b> {load_port_full}",
        f"<b>Port of Discharge:</b> {discharge_port_full}",
    ]
    for b in bullets:
        story.append(Paragraph(f"&bull;&nbsp;&nbsp;{b}", s_bullet))

    story.append(Spacer(1, 4 * mm))

    # Invoice value
    inv_text = f"<b>Invoice Value:</b> {currency} {invoice_value:,.2f}"
    story.append(Paragraph(inv_text, s_body))
    story.append(Spacer(1, 4 * mm))

    # Closing
    story.append(Paragraph(
        "Please find attached the set of B/Ls. We will revert with the balance documents as soon as possible.",
        s_body
    ))
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Best regards,", s_closing))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("PIR GRAIN &amp; PULSES LTD.", s_sign))

    doc.build(story)
    buf.seek(0)

    filename = f"Shipment_Appropriation_{contract_no}_{trade_id[-6:]}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
