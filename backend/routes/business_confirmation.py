from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Spacer, Paragraph, Image, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os, re

from database import trades_col, partners_col
from auth import get_current_user

pdfmetrics.registerFont(TTFont('FreeSans', '/usr/share/fonts/truetype/freefont/FreeSans.ttf'))
pdfmetrics.registerFont(TTFont('FreeSansBold', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSansOblique', '/usr/share/fonts/truetype/freefont/FreeSansOblique.ttf'))
pdfmetrics.registerFontFamily('FreeSans', normal='FreeSans', bold='FreeSansBold', italic='FreeSansOblique')

router = APIRouter(prefix="/api/business-confirmation", tags=["business-confirmation"])

PIR_GREEN = colors.HexColor("#1B7A3D")
DARK_TEXT = colors.HexColor("#1A1A1A")
LIGHT_GREEN = colors.HexColor("#E8F5E9")
BORDER_COLOR = colors.HexColor("#C8E6C9")
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "pir-logo.jpeg")


def fmt_date_dot(d):
    if not d:
        return "-"
    m = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', str(d))
    if m:
        return f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
    try:
        dt = datetime.fromisoformat(str(d).replace('Z', '+00:00'))
        return dt.strftime('%d.%m.%Y')
    except Exception:
        return str(d)


def fmt_date_slash(d):
    if not d:
        return "-"
    m = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', str(d))
    if m:
        return f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
    try:
        dt = datetime.fromisoformat(str(d).replace('Z', '+00:00'))
        return dt.strftime('%d/%m/%Y')
    except Exception:
        return str(d)


def fmt_num(v):
    try:
        return f"{float(v):,.0f}"
    except (ValueError, TypeError):
        return str(v) if v else "-"


def partner_text(partner):
    if not partner:
        return "-"
    lines = [partner.get('companyName', '-')]
    if partner.get('address'):
        lines.append(partner['address'])
    parts = []
    if partner.get('city'):
        parts.append(partner['city'])
    if partner.get('country'):
        parts.append(partner['country'])
    if parts:
        lines.append(" / ".join(parts))
    if partner.get('taxOffice') and partner.get('taxId'):
        lines.append(f"V.D. {partner['taxOffice']} V.N. {partner['taxId']}")
    elif partner.get('taxId'):
        lines.append(f"Tax ID: {partner['taxId']}")
    return "\n".join(lines)


@router.get("/{trade_id}/pdf")
def generate_business_confirmation_pdf(trade_id: str, user=Depends(get_current_user)):
    trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    seller = partners_col.find_one({"_id": ObjectId(trade["sellerId"])}) if trade.get("sellerId") else None
    buyer = partners_col.find_one({"_id": ObjectId(trade["buyerId"])}) if trade.get("buyerId") else None
    broker = partners_col.find_one({"_id": ObjectId(trade["brokerId"])}) if trade.get("brokerId") else None

    contract_date = fmt_date_slash(trade.get("contractDate"))
    contract_no = trade.get("pirContractNumber") or trade.get("contractNumber") or "-"
    commodity = trade.get("commodityName") or "-"
    origin = trade.get("originName") or "-"
    quantity = trade.get("quantity") or 0
    price = trade.get("pricePerMT") or 0
    currency = trade.get("currency") or "USD"
    delivery_term = trade.get("deliveryTerm") or "-"
    discharge_rate = trade.get("dischargeRate") or "-"
    payment_terms = trade.get("paymentTerms") or "-"
    quality = trade.get("quality") or "-"
    aflatoxin = trade.get("aflatoxin") or ""
    more_less = trade.get("moreLess") or "10"
    more_less_option = trade.get("moreLessOption") or "Seller's option"
    brokerage_per_mt = trade.get("brokeragePerMT") or 0
    brokerage_currency = trade.get("brokerageCurrency") or "USD"
    brokerage_account = trade.get("brokerageAccount") or "seller"
    shipment_start = fmt_date_dot(trade.get("shipmentWindowStart"))
    shipment_end = fmt_date_dot(trade.get("shipmentWindowEnd"))
    discharge_port = trade.get("dischargePortName") or "-"
    discharge_country = trade.get("dischargePortCountry") or ""
    discharge_full = f"{discharge_port}, {discharge_country}" if discharge_country else discharge_port
    gafta = trade.get("gaftaContractNo") or "48"

    broker_text = partner_text(broker) if broker else "PIR Grain and Pulses Ltd.\nBlv. Tsarigradsko Shose No:73\nPlovdiv / Bulgaria, ZIP: 4000"

    # Styles
    s_label = ParagraphStyle('Label', fontName='FreeSansBold', fontSize=8, textColor=PIR_GREEN, leading=10)
    s_val = ParagraphStyle('Val', fontName='FreeSans', fontSize=8.5, textColor=DARK_TEXT, leading=11)
    s_val_bold = ParagraphStyle('ValBold', fontName='FreeSansBold', fontSize=8.5, textColor=DARK_TEXT, leading=11)
    s_title = ParagraphStyle('Title', fontName='FreeSansBold', fontSize=14, textColor=PIR_GREEN, alignment=TA_CENTER)
    s_date = ParagraphStyle('Date', fontName='FreeSans', fontSize=9, textColor=DARK_TEXT, alignment=TA_CENTER)
    s_greeting = ParagraphStyle('Greeting', fontName='FreeSans', fontSize=8.5, textColor=DARK_TEXT, leading=12)
    s_closing = ParagraphStyle('Closing', fontName='FreeSans', fontSize=8.5, textColor=DARK_TEXT, leading=11)
    s_sign = ParagraphStyle('Sign', fontName='FreeSansBold', fontSize=9, textColor=PIR_GREEN, leading=12)
    s_small = ParagraphStyle('Small', fontName='FreeSans', fontSize=7.5, textColor=DARK_TEXT, leading=10)

    page_w = A4[0]
    margin = 18 * mm
    table_w = page_w - 2 * margin
    col_label = 32 * mm
    col_val = table_w - col_label

    def row(label, value, style=s_val):
        return [Paragraph(label, s_label), Paragraph(str(value), style)]

    # Build data rows
    data = [
        [Paragraph("SELLERS", s_label), Paragraph(partner_text(seller).replace("\n", "<br/>"), s_val)],
        [Paragraph("BUYERS", s_label), Paragraph(partner_text(buyer).replace("\n", "<br/>"), s_val)],
        [Paragraph("BROKERS", s_label), Paragraph(broker_text.replace("\n", "<br/>"), s_val)],
        row("COMMODITY", f"{origin} {commodity}"),
        row("QUALITY", f"{quality}" + (f"  |  Aflatoxin: {aflatoxin}" if aflatoxin else "")),
        row("QUANTITY", f"{fmt_num(quantity)} MT with {more_less}% more or less at {more_less_option}"),
        row("SHIPMENT", f"{shipment_start} - {shipment_end}, both dates included, at Seller's option"),
        row("PRICE", f"{currency} {price:,.2f}/MT {delivery_term} {discharge_full}", s_val_bold),
        row("DISCH. RATE", f"{discharge_rate} MT SSHEX EIU, Half dispatch" if discharge_rate != "-" else "-"),
        row("PAYMENT", payment_terms, s_small),
        row("BROKERAGE", f"{brokerage_currency} {brokerage_per_mt:.2f} per MT, payable by the {brokerage_account.capitalize()}"),
        row("CONTRACT", f"GAFTA No. {gafta}, Arbitration Clause 125, London"),
    ]

    tbl = Table(data, colWidths=[col_label, col_val])
    tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (0, -1), 6),
        ('LEFTPADDING', (1, 0), (1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), LIGHT_GREEN),
    ]))

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=12 * mm, bottomMargin=12 * mm, leftMargin=margin, rightMargin=margin)
    story = []

    # Logo (smaller)
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=30 * mm, height=30 * mm)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 2 * mm))

    story.append(Paragraph("BUSINESS CONFIRMATION", s_title))
    story.append(Spacer(1, 1 * mm))
    story.append(Paragraph(f"Date: {contract_date}  |  Contract No: {contract_no}", s_date))
    story.append(Spacer(1, 3 * mm))

    story.append(Paragraph(
        "Good day,<br/><br/>"
        "Dear Sirs, Madams,<br/>"
        "Please find below the business confirmation for the transaction agreed as follows:",
        s_greeting
    ))
    story.append(Spacer(1, 3 * mm))

    story.append(tbl)
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("A draft contract will be shared shortly. Thank you for the business.", s_closing))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Best Regards,", s_closing))
    story.append(Spacer(1, 1 * mm))
    story.append(Paragraph("PIR Grain &amp; Pulses Ltd.", s_sign))

    doc.build(story)
    buf.seek(0)

    filename = f"Business_Confirmation_{contract_no}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
