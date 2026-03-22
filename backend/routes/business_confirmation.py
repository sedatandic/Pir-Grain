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


def get_partner_block(partner):
    if not partner:
        return "-"
    lines = [f"<b>{partner.get('companyName', '-')}</b>"]
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
    return "<br/>".join(lines)


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
    discharge_rate = trade.get("dischargeRate")
    payment_terms = trade.get("paymentTerms") or "-"
    quality = trade.get("quality") or ""
    aflatoxin = trade.get("aflatoxin") or ""
    more_less = trade.get("moreLess") or "10"
    more_less_option = trade.get("moreLessOption") or "Seller's option"
    brokerage_per_mt = trade.get("brokeragePerMT") or 0
    brokerage_currency = trade.get("brokerageCurrency") or "USD"
    brokerage_account = trade.get("brokerageAccount") or "seller"
    shipment_start = fmt_date_dot(trade.get("shipmentWindowStart"))
    shipment_end = fmt_date_dot(trade.get("shipmentWindowEnd"))
    base_port = trade.get("basePortName") or trade.get("loadingPortName") or "-"
    discharge_port = trade.get("dischargePortName") or "-"
    discharge_country = trade.get("dischargePortCountry") or ""

    # Styles
    s_title = ParagraphStyle('Title', fontName='FreeSansBold', fontSize=18, textColor=PIR_GREEN, alignment=TA_CENTER, spaceAfter=4)
    s_date = ParagraphStyle('Date', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, alignment=TA_CENTER, spaceAfter=6)
    s_greeting = ParagraphStyle('Greeting', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, leading=14, spaceAfter=10)
    s_section = ParagraphStyle('Section', fontName='FreeSansBold', fontSize=11, textColor=PIR_GREEN, leading=16, spaceBefore=10, spaceAfter=4)
    s_body = ParagraphStyle('Body', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, leading=15, spaceAfter=6)
    s_body_indent = ParagraphStyle('BodyIndent', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, leading=15, leftIndent=10, spaceAfter=6)
    s_closing = ParagraphStyle('Closing', fontName='FreeSans', fontSize=10, textColor=DARK_TEXT, leading=14, spaceAfter=2)
    s_sign = ParagraphStyle('Sign', fontName='FreeSansBold', fontSize=10, textColor=PIR_GREEN, leading=14)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=15 * mm, bottomMargin=15 * mm, leftMargin=22 * mm, rightMargin=22 * mm)
    story = []

    # Logo
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=45 * mm, height=45 * mm)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 3 * mm))

    # Title
    story.append(Paragraph("BUSINESS CONFIRMATION", s_title))
    story.append(Spacer(1, 1 * mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PIR_GREEN, spaceAfter=4))
    story.append(Paragraph(f"<b>Date:</b> {contract_date}", s_date))
    story.append(Spacer(1, 3 * mm))

    # Greeting
    story.append(Paragraph("Good day,", s_greeting))
    story.append(Paragraph(
        "Dear Sirs, Madams,<br/><br/>"
        "Please find below the business confirmation for the transaction agreed as follows:",
        s_greeting
    ))
    story.append(Spacer(1, 2 * mm))

    # SELLERS
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("SELLERS", s_section))
    story.append(Paragraph(get_partner_block(seller), s_body_indent))

    # BUYERS
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("BUYERS", s_section))
    story.append(Paragraph(get_partner_block(buyer), s_body_indent))

    # BROKERS
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("BROKERS", s_section))
    broker_block = get_partner_block(broker) if broker else "<b>PIR Grain and Pulses Ltd.</b><br/>Blv. Tsarigradsko Shose No:73<br/>Plovdiv / Bulgaria<br/>ZIP: 4000"
    story.append(Paragraph(broker_block, s_body_indent))

    # GOODS
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("GOODS", s_section))
    goods_lines = [f"<b>Commodity:</b> {origin} {commodity}"]
    if quality:
        goods_lines.append(f"<b>Quality:</b> {quality}")
    if aflatoxin:
        goods_lines.append(f"<b>Aflatoxin:</b> {aflatoxin}")
    story.append(Paragraph("<br/>".join(goods_lines), s_body_indent))

    # QUANTITY
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("QUANTITY", s_section))
    story.append(Paragraph(
        f"<b>{fmt_num(quantity)} MT</b><br/>"
        f"With <b>{more_less}% more or less</b> at {more_less_option}.",
        s_body_indent
    ))

    # SHIPMENT PERIOD
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("SHIPMENT PERIOD", s_section))
    story.append(Paragraph(
        f"<b>{shipment_start} - {shipment_end}</b><br/>Both dates included, at Seller's option.",
        s_body_indent
    ))

    # PRICE
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("PRICE", s_section))
    price_display = f"{currency} {price:,.2f}/MT" if price else "-"
    discharge_full = f"{discharge_port}, {discharge_country}" if discharge_country else discharge_port
    story.append(Paragraph(
        f"<b>{price_display} {delivery_term} {discharge_full}</b>",
        s_body_indent
    ))

    # DISCHARGE RATE
    if discharge_rate:
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
        story.append(Paragraph("DISCHARGE RATE", s_section))
        story.append(Paragraph(
            f"<b>{fmt_num(discharge_rate)} MT SSHEX EIU</b><br/>Half dispatch",
            s_body_indent
        ))

    # PAYMENT TERMS
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("PAYMENT TERMS", s_section))
    story.append(Paragraph(payment_terms, s_body_indent))

    # BROKERAGE
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("BROKERAGE", s_section))
    story.append(Paragraph(
        f"<b>{brokerage_currency} {brokerage_per_mt:.2f} per MT</b>, payable by the <b>{brokerage_account.capitalize()}</b>.",
        s_body_indent
    ))

    # CONTRACT TERMS
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=2))
    story.append(Paragraph("CONTRACT TERMS", s_section))
    gafta = trade.get("gaftaContractNo") or "48"
    story.append(Paragraph(
        f"All terms and conditions not in conflict with the above shall be governed by "
        f"<b>GAFTA Contract No. {gafta}</b>, including <b>GAFTA Arbitration Clause 125</b>, "
        f"with arbitration in <b>London</b>, which all parties acknowledge and accept.",
        s_body_indent
    ))

    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=6))

    story.append(Paragraph("A draft contract will be shared shortly.", s_body))
    story.append(Paragraph("Thank you for the business.", s_body))
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Best Regards,", s_closing))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("PIR Grain &amp; Pulses Ltd.", s_sign))

    doc.build(story)
    buf.seek(0)

    filename = f"Business_Confirmation_{contract_no}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
