from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph, Image, HRFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from num2words import num2words
import os

from database import trades_col, partners_col, bank_accounts_col

# Register FreeSans fonts (supports Turkish characters: ş, ı, ö, ü, ç, ğ, İ, Ş, Ö, Ü, Ç, Ğ)
pdfmetrics.registerFont(TTFont('FreeSans', '/usr/share/fonts/truetype/freefont/FreeSans.ttf'))
pdfmetrics.registerFont(TTFont('FreeSansBold', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSansOblique', '/usr/share/fonts/truetype/freefont/FreeSansOblique.ttf'))
pdfmetrics.registerFont(TTFont('FreeSansBoldOblique', '/usr/share/fonts/truetype/freefont/FreeSansBoldOblique.ttf'))
pdfmetrics.registerFontFamily('FreeSans', normal='FreeSans', bold='FreeSansBold', italic='FreeSansOblique', boldItalic='FreeSansBoldOblique')
from auth import get_current_user

router = APIRouter(prefix="/api/commission-invoice", tags=["commission-invoice"])

PIR_GREEN = colors.HexColor("#1B7A3D")
PIR_GREEN_LIGHT = colors.HexColor("#F0F7F2")
PIR_GREEN_MED = colors.HexColor("#D4EADB")
DARK_TEXT = colors.HexColor("#1A1A1A")
GREY_TEXT = colors.HexColor("#666666")
LIGHT_BORDER = colors.HexColor("#D0D0D0")
LOGO_PATH = os.path.join(os.path.dirname(__file__), "pir-logo.jpeg")

PIR_COMPANY = {
    "name": "PIR GRAIN AND PULSES LTD",
    "address": "Blv. Tsarigradsko Shosse No:73, Plovdiv/BULGARIA",
    "id_no": "206597892",
}

PIR_BANK = {
    "beneficiary": "PIR GRAIN AND PULSES LTD",
    "bank": "UNICREDIT BULBANK",
    "address": "STR. IVAN VAZOV 31 Plovdiv/BULGARIA",
    "iban": "BG76UNCR70001525611113",
    "bic": "UNCRBGSF",
}


def amount_in_words(amount, currency="USD"):
    try:
        integer_part = int(amount)
        decimal_part = round((amount - integer_part) * 100)
        words = num2words(integer_part, lang='en').upper()
        curr_word = "US DOLLARS" if currency == "USD" else currency
        if decimal_part > 0:
            cents_words = num2words(decimal_part, lang='en').upper()
            return f"{words} AND {cents_words}/100 {curr_word}"
        return f"{words} {curr_word} ONLY"
    except Exception:
        return str(amount)


def generate_invoice_pdf(trade, invoice_number, invoice_date, issued_to_name, issued_to_address, issued_to_tax_id, bank_accounts=None):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)

    elements = []
    W = 170*mm

    # --- Styles (FreeSans for Turkish character support) ---
    FONT = 'FreeSans'
    FONT_B = 'FreeSansBold'
    FONT_I = 'FreeSansOblique'
    FONT_BI = 'FreeSansBoldOblique'

    s_header = ParagraphStyle('Header', fontSize=18, fontName=FONT_B, textColor=PIR_GREEN, alignment=TA_CENTER, spaceAfter=1*mm)
    s_sub = ParagraphStyle('Sub', fontSize=8, fontName=FONT, textColor=GREY_TEXT, alignment=TA_CENTER)
    s_section = ParagraphStyle('Section', fontSize=10, fontName=FONT_B, textColor=PIR_GREEN, spaceBefore=2*mm)
    s_label = ParagraphStyle('Lbl', fontSize=8, fontName=FONT_B, textColor=GREY_TEXT)
    s_val = ParagraphStyle('Val', fontSize=9, fontName=FONT, textColor=DARK_TEXT)
    s_val_b = ParagraphStyle('ValB', fontSize=9, fontName=FONT_B, textColor=DARK_TEXT)
    s_small = ParagraphStyle('Sm', fontSize=7.5, fontName=FONT, textColor=GREY_TEXT)
    s_right = ParagraphStyle('R', fontSize=9, fontName=FONT, alignment=TA_RIGHT)
    s_right_b = ParagraphStyle('RB', fontSize=12, fontName=FONT_B, alignment=TA_RIGHT, textColor=PIR_GREEN)
    s_th = ParagraphStyle('TH', fontSize=7.5, fontName=FONT_B, textColor=colors.white, alignment=TA_CENTER)
    s_td = ParagraphStyle('TD', fontSize=8, fontName=FONT, alignment=TA_CENTER, textColor=DARK_TEXT)
    s_td_l = ParagraphStyle('TDL', fontSize=8, fontName=FONT, textColor=DARK_TEXT)
    s_td_r = ParagraphStyle('TDR', fontSize=8, fontName=FONT, alignment=TA_RIGHT, textColor=DARK_TEXT)
    s_footer = ParagraphStyle('Footer', fontSize=7, fontName=FONT, textColor=GREY_TEXT, alignment=TA_CENTER)

    # ===== HEADER SECTION =====
    # Logo top-left + COMMISSION INVOICE top-right
    header_left = []
    if os.path.exists(LOGO_PATH):
        header_left.append(Image(LOGO_PATH, width=40*mm, height=18*mm))
    else:
        header_left.append(Paragraph(PIR_COMPANY['name'], s_section))

    header_right = [
        Paragraph("<b>COMMISSION INVOICE</b>", ParagraphStyle('IT', fontSize=16, fontName=FONT_B, textColor=PIR_GREEN, alignment=TA_RIGHT)),
        Spacer(1, 2*mm),
        Paragraph(f"Invoice No: <b>{invoice_number}</b>", ParagraphStyle('IN', fontSize=9, fontName=FONT, alignment=TA_RIGHT, textColor=DARK_TEXT)),
        Paragraph(f"Date: <b>{invoice_date}</b>", ParagraphStyle('ID', fontSize=9, fontName=FONT, alignment=TA_RIGHT, textColor=DARK_TEXT)),
    ]

    h_tbl = Table([[header_left, header_right]], colWidths=[W*0.45, W*0.55])
    h_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(h_tbl)
    elements.append(Spacer(1, 2*mm))
    elements.append(HRFlowable(width="100%", thickness=2, color=PIR_GREEN, spaceAfter=4*mm))

    # ===== BILL TO / FROM =====
    to_content = f"<b>{issued_to_name}</b>"
    if issued_to_address:
        to_content += f"<br/>{issued_to_address}"
    if issued_to_tax_id:
        to_content += f"<br/>Tax ID: {issued_to_tax_id}"

    from_content = f"<b>{PIR_COMPANY['name']}</b><br/>{PIR_COMPANY['address']}<br/>ID No: {PIR_COMPANY['id_no']}"

    parties_data = [[
        [Paragraph("BILL TO", ParagraphStyle('BT', fontSize=8, fontName=FONT_B, textColor=PIR_GREEN)), Spacer(1, 1*mm), Paragraph(to_content, s_val)],
        [Paragraph("FROM", ParagraphStyle('FR', fontSize=8, fontName=FONT_B, textColor=PIR_GREEN)), Spacer(1, 1*mm), Paragraph(from_content, s_val)],
    ]]
    p_tbl = Table(parties_data, colWidths=[W*0.5, W*0.5])
    p_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), PIR_GREEN_LIGHT),
        ('BACKGROUND', (1, 0), (1, 0), PIR_GREEN_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ROUNDEDCORNERS', [3, 3, 3, 3]),
    ]))
    elements.append(p_tbl)
    elements.append(Spacer(1, 5*mm))

    # ===== TRADE DETAILS SECTION =====
    contract_num = trade.get("pirContractNumber") or trade.get("referenceNumber") or "-"
    vessel_name = trade.get("vesselName") or "-"
    bl_qty = trade.get("blQuantity") or trade.get("quantity") or 0
    loading_port = trade.get("loadingPortName") or trade.get("basePortName") or "-"
    discharge_port = trade.get("dischargePortName") or "-"
    commodity_name = trade.get("commodityName") or "-"
    brokerage_per_mt = trade.get("brokeragePerMT") or 0
    currency = trade.get("currency") or "USD"
    total_amount = round(bl_qty * brokerage_per_mt, 2)
    seller_name = trade.get("sellerName") or "-"
    buyer_name = trade.get("buyerName") or "-"
    origin = trade.get("originName") or "-"
    delivery_term = trade.get("deliveryTerm") or "-"
    shipment_from = trade.get("shipmentFrom") or ""
    shipment_to = trade.get("shipmentTo") or ""
    shipment_period = f"{shipment_from} - {shipment_to}" if shipment_from and shipment_to else "-"

    elements.append(Paragraph("TRADE DETAILS", s_section))
    elements.append(Spacer(1, 2*mm))

    # Trade info grid - 2 columns of key-value pairs
    detail_pairs = [
        ("Contract No:", str(contract_num), "Commodity:", str(commodity_name)),
        ("Seller:", str(seller_name), "Buyer:", str(buyer_name)),
        ("Origin:", str(origin), "Delivery Term:", str(delivery_term)),
        ("Vessel:", str(vessel_name), "Shipment Period:", str(shipment_period)),
        ("Load Port:", str(loading_port), "Discharge Port:", str(discharge_port)),
    ]

    detail_rows = []
    for lbl1, val1, lbl2, val2 in detail_pairs:
        detail_rows.append([
            Paragraph(f"<b>{lbl1}</b>", s_label),
            Paragraph(val1, s_val),
            Paragraph(f"<b>{lbl2}</b>", s_label),
            Paragraph(val2, s_val),
        ])

    d_tbl = Table(detail_rows, colWidths=[24*mm, W*0.5 - 24*mm, 28*mm, W*0.5 - 28*mm])
    d_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#EEEEEE')),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.HexColor('#EEEEEE')),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(d_tbl)
    elements.append(Spacer(1, 6*mm))

    # ===== COMMISSION CALCULATION TABLE =====
    elements.append(Paragraph("COMMISSION CALCULATION", s_section))
    elements.append(Spacer(1, 2*mm))

    curr_symbol = "$" if currency == "USD" else currency + " "

    calc_header = [
        Paragraph("#", s_th),
        Paragraph("DESCRIPTION", s_th),
        Paragraph("B/L QUANTITY (Mts)", s_th),
        Paragraph(f"RATE ({currency}/MT)", s_th),
        Paragraph(f"AMOUNT ({currency})", s_th),
    ]
    calc_row = [
        Paragraph("1", s_td),
        Paragraph(f"Brokerage commission for mv {vessel_name}<br/>{commodity_name} ({seller_name} / {buyer_name})", s_td_l),
        Paragraph(f"{bl_qty:,.3f}" if bl_qty else "-", s_td_r),
        Paragraph(f"{brokerage_per_mt:,.2f}", s_td_r),
        Paragraph(f"<b>{curr_symbol}{total_amount:,.2f}</b>", s_td_r),
    ]

    calc_cw = [10*mm, 68*mm, 28*mm, 28*mm, 36*mm]
    calc_tbl = Table([calc_header, calc_row], colWidths=calc_cw)
    calc_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PIR_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, 0), 0.5, PIR_GREEN),
        ('GRID', (0, 1), (-1, -1), 0.5, LIGHT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(calc_tbl)
    elements.append(Spacer(1, 4*mm))

    # ===== TOTAL BOX =====
    total_data = [
        ["", Paragraph("<b>TOTAL AMOUNT:</b>", ParagraphStyle('TL', fontSize=10, fontName=FONT_B, alignment=TA_RIGHT, textColor=DARK_TEXT)),
         Paragraph(f"<b>{curr_symbol}{total_amount:,.2f}</b>", ParagraphStyle('TV', fontSize=13, fontName=FONT_B, alignment=TA_RIGHT, textColor=PIR_GREEN))],
    ]
    t_tbl = Table(total_data, colWidths=[W*0.35, W*0.30, W*0.35])
    t_tbl.setStyle(TableStyle([
        ('BACKGROUND', (1, 0), (-1, 0), PIR_GREEN_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (-1, 0), (-1, 0), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [0, 3, 3, 0]),
    ]))
    elements.append(t_tbl)
    elements.append(Spacer(1, 2*mm))

    # Amount in words
    words = amount_in_words(total_amount, currency)
    elements.append(Paragraph(f"<b>Amount in words:</b> <i>{words}</i>", ParagraphStyle('AW', fontSize=8, textColor=GREY_TEXT)))
    elements.append(Spacer(1, 8*mm))

    # ===== BANK DETAILS =====
    elements.append(HRFlowable(width="100%", thickness=0.5, color=LIGHT_BORDER, spaceAfter=3*mm))
    elements.append(Paragraph("BANK DETAILS", s_section))
    elements.append(Spacer(1, 2*mm))

    # Use provided bank accounts or fall back to default
    accounts_to_show = bank_accounts if bank_accounts else [PIR_BANK]

    for idx, acct in enumerate(accounts_to_show):
        if idx > 0:
            elements.append(Spacer(1, 3*mm))
        beneficiary = acct.get("beneficiary", acct.get("accountName", ""))
        bank_name = acct.get("bank", acct.get("bankName", ""))
        address = acct.get("address", acct.get("bankAddress", ""))
        iban = acct.get("iban", "")
        bic = acct.get("bic", acct.get("swift", ""))
        currency_label = acct.get("currency", "")

        bank_rows = [
            [Paragraph("<b>Beneficiary:</b>", s_small), Paragraph(beneficiary, s_val)],
            [Paragraph("<b>Bank:</b>", s_small), Paragraph(bank_name, s_val)],
            [Paragraph("<b>Address:</b>", s_small), Paragraph(address, s_val)],
            [Paragraph("<b>IBAN:</b>", s_small), Paragraph(f"<b>{iban}</b>", s_val_b)],
            [Paragraph("<b>BIC/SWIFT:</b>", s_small), Paragraph(bic, s_val)],
        ]
        if currency_label:
            bank_rows.insert(0, [Paragraph("<b>Currency:</b>", s_small), Paragraph(f"<b>{currency_label}</b>", s_val_b)])

        b_tbl = Table(bank_rows, colWidths=[25*mm, W - 25*mm])
        b_tbl.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 1.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
            ('LEFTPADDING', (0, 0), (0, -1), 4),
            ('BACKGROUND', (0, 0), (-1, -1), PIR_GREEN_LIGHT),
            ('ROUNDEDCORNERS', [3, 3, 3, 3]),
        ]))
        elements.append(b_tbl)

    elements.append(Spacer(1, 14*mm))

    # ===== SIGNATURE =====
    sig_data = [[
        "",
        Paragraph("_______________________________", ParagraphStyle('SL', fontSize=9, alignment=TA_CENTER, textColor=GREY_TEXT)),
    ], [
        "",
        Paragraph("<b>Authorized Signature</b><br/>SALIH KARAGOZ<br/>PIR Grain and Pulses Ltd", ParagraphStyle('SN', fontSize=7.5, alignment=TA_CENTER, textColor=GREY_TEXT)),
    ]]
    sig_tbl = Table(sig_data, colWidths=[W*0.55, W*0.45])
    elements.append(sig_tbl)
    elements.append(Spacer(1, 8*mm))

    # ===== FOOTER =====
    elements.append(HRFlowable(width="100%", thickness=1, color=PIR_GREEN, spaceAfter=2*mm))
    elements.append(Paragraph("Please mention the invoice number in the payment details. Thank you for your business!", s_footer))

    doc.build(elements)
    buffer.seek(0)
    return buffer


@router.get("/{trade_id}")
def get_commission_invoice_pdf(trade_id: str, account: str = "seller", bankIds: str = "", user=Depends(get_current_user)):
    trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    contract_num = trade.get("pirContractNumber") or trade.get("referenceNumber") or trade_id
    brokerage_account = account or trade.get("brokerageAccount") or "seller"

    if brokerage_account == "buyer":
        partner_id = trade.get("buyerId")
    else:
        partner_id = trade.get("sellerId")

    issued_to_name = ""
    issued_to_address = ""
    issued_to_tax_id = ""

    if partner_id:
        try:
            partner = partners_col.find_one({"_id": ObjectId(partner_id)})
            if partner:
                issued_to_name = partner.get("companyName", "")
                addr_parts = [partner.get("address", ""), partner.get("city", ""), partner.get("country", "")]
                issued_to_address = ", ".join([p for p in addr_parts if p])
                issued_to_tax_id = partner.get("taxId", partner.get("taxNumber", ""))
        except Exception:
            pass

    if not issued_to_name:
        issued_to_name = trade.get("buyerName" if brokerage_account == "buyer" else "sellerName", "-")

    # Fetch selected bank accounts
    selected_banks = []
    if bankIds:
        for bid in bankIds.split(","):
            bid = bid.strip()
            if bid:
                try:
                    bank = bank_accounts_col.find_one({"_id": ObjectId(bid)})
                    if bank:
                        bank.pop("_id", None)
                        selected_banks.append(bank)
                except Exception:
                    pass

    invoice_number = f"COMM-{contract_num}"
    invoice_date = datetime.utcnow().strftime("%d.%m.%Y")

    pdf_buffer = generate_invoice_pdf(
        trade=trade,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        issued_to_name=issued_to_name,
        issued_to_address=issued_to_address,
        issued_to_tax_id=issued_to_tax_id,
        bank_accounts=selected_banks if selected_banks else None,
    )

    filename = f"Commission_Invoice_{contract_num}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
