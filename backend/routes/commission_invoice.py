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
LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pir-logo.jpeg")

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

    # --- Fonts ---
    F = 'FreeSans'
    FB = 'FreeSansBold'
    FI = 'FreeSansOblique'

    # --- Colors ---
    GREEN = PIR_GREEN
    BG_LIGHT = PIR_GREEN_LIGHT
    BG_MED = PIR_GREEN_MED
    DARK = DARK_TEXT
    GREY = GREY_TEXT
    BORDER = colors.HexColor("#E0E0E0")

    # =====================================================
    # HEADER: Logo left + Invoice title/number right
    # =====================================================
    logo_cell = []
    if os.path.exists(LOGO_PATH):
        logo_cell.append(Image(LOGO_PATH, width=38*mm, height=17*mm))
    else:
        logo_cell.append(Paragraph("PIR Grain &amp; Pulses", ParagraphStyle('FallbackLogo', fontName=FB, fontSize=14, textColor=GREEN)))

    title_block = [
        Paragraph("COMMISSION INVOICE", ParagraphStyle('InvTitle', fontName=FB, fontSize=18, textColor=GREEN, alignment=TA_RIGHT, leading=22)),
        Spacer(1, 3*mm),
        Paragraph(f"<b>No:</b> {invoice_number}", ParagraphStyle('InvNo', fontName=F, fontSize=9, textColor=DARK, alignment=TA_RIGHT, leading=13)),
        Paragraph(f"<b>Date:</b> {invoice_date}", ParagraphStyle('InvDt', fontName=F, fontSize=9, textColor=DARK, alignment=TA_RIGHT, leading=13)),
    ]

    header_tbl = Table([[logo_cell, title_block]], colWidths=[W*0.40, W*0.60])
    header_tbl.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(header_tbl)
    elements.append(Spacer(1, 1*mm))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=GREEN, spaceAfter=5*mm))

    # =====================================================
    # INVOICE TO: Clean card
    # =====================================================
    to_lines = f"<b>{issued_to_name}</b>"
    if issued_to_address:
        to_lines += f"<br/>{issued_to_address}"
    if issued_to_tax_id:
        to_lines += f"<br/>Tax ID: {issued_to_tax_id}"

    s_card_label = ParagraphStyle('CardLbl', fontName=FB, fontSize=7.5, textColor=GREEN, leading=10)
    s_card_val = ParagraphStyle('CardVal', fontName=F, fontSize=9, textColor=DARK, leading=13)

    inv_to_card = Table(
        [[Paragraph("INVOICE TO:", s_card_label)], [Paragraph(to_lines, s_card_val)]],
        colWidths=[W * 0.55]
    )
    inv_to_card.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 1), (-1, 1), 2),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, BG_MED),
    ]))
    # Wrap in outer table to left-align the card
    wrap = Table([[inv_to_card, ""]], colWidths=[W*0.55, W*0.45])
    wrap.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(wrap)
    elements.append(Spacer(1, 6*mm))

    # =====================================================
    # TRADE DETAILS: Compact 2-column key-value grid
    # =====================================================
    contract_num = trade.get("pirContractNumber") or trade.get("referenceNumber") or "-"
    vessel_name = trade.get("vesselName") or "-"
    bl_qty = trade.get("blQuantity") or trade.get("quantity") or 0
    loading_port = trade.get("loadingPortName") or trade.get("basePortName") or "-"
    loading_country = trade.get("loadingPortCountry") or ""
    loading_full = f"{loading_port}, {loading_country}" if loading_country else loading_port
    discharge_port = trade.get("dischargePortName") or "-"
    discharge_country = trade.get("dischargePortCountry") or ""
    discharge_full = f"{discharge_port}, {discharge_country}" if discharge_country else discharge_port
    commodity_name = trade.get("commodityName") or "-"
    crop_year = trade.get("cropYear") or ""
    commodity_display = f"{commodity_name}, Crop {crop_year}" if crop_year else commodity_name
    brokerage_per_mt = trade.get("brokeragePerMT") or 0
    brokerage_currency = trade.get("brokerageCurrency") or "USD"
    currency = brokerage_currency
    total_amount = round(bl_qty * brokerage_per_mt, 2)
    seller_name = trade.get("sellerName") or "-"
    buyer_name = trade.get("buyerName") or "-"
    origin = trade.get("originName") or "-"
    delivery_term = trade.get("deliveryTerm") or "-"
    shipment_from = trade.get("shipmentWindowStart") or trade.get("shipmentFrom") or ""
    shipment_to = trade.get("shipmentWindowEnd") or trade.get("shipmentTo") or ""
    shipment_period = f"{shipment_from} - {shipment_to}" if shipment_from and shipment_to else "-"

    elements.append(Paragraph("TRADE DETAILS", ParagraphStyle('SecTitle', fontName=FB, fontSize=10, textColor=GREEN, spaceBefore=0, spaceAfter=2*mm)))

    s_lbl = ParagraphStyle('DLbl', fontName=FB, fontSize=7.5, textColor=GREY, leading=10)
    s_dval = ParagraphStyle('DVal', fontName=F, fontSize=8.5, textColor=DARK, leading=12)

    detail_pairs = [
        ("Contract No", contract_num, "Commodity", commodity_display),
        ("Seller", seller_name, "Buyer", buyer_name),
        ("Origin", origin, "Delivery Term", delivery_term),
        ("Vessel", vessel_name, "Shipment", shipment_period),
        ("Load Port", loading_full, "Discharge Port", discharge_full),
    ]

    detail_rows = []
    for lbl1, val1, lbl2, val2 in detail_pairs:
        detail_rows.append([
            Paragraph(lbl1, s_lbl), Paragraph(str(val1), s_dval),
            Paragraph(lbl2, s_lbl), Paragraph(str(val2), s_dval),
        ])

    lbl_w = 22*mm
    val_w = (W - 2*lbl_w) / 2
    d_tbl = Table(detail_rows, colWidths=[lbl_w, val_w, lbl_w, val_w])
    d_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, BORDER),
        ('BACKGROUND', (0, 0), (0, -1), BG_LIGHT),
        ('BACKGROUND', (2, 0), (2, -1), BG_LIGHT),
    ]))
    elements.append(d_tbl)
    elements.append(Spacer(1, 6*mm))

    # =====================================================
    # COMMISSION TABLE: Green header, clean rows
    # =====================================================
    curr_symbol = "$" if currency == "USD" else currency + " "

    s_th = ParagraphStyle('TH', fontName=FB, fontSize=8, textColor=colors.white, alignment=TA_CENTER, leading=11)
    s_th_l = ParagraphStyle('THL', fontName=FB, fontSize=8, textColor=colors.white, alignment=TA_LEFT, leading=11)
    s_td_l = ParagraphStyle('TDL', fontName=F, fontSize=8.5, textColor=DARK, leading=12)
    s_td_r = ParagraphStyle('TDR', fontName=F, fontSize=8.5, textColor=DARK, alignment=TA_RIGHT, leading=12)
    s_td_rb = ParagraphStyle('TDRB', fontName=FB, fontSize=9, textColor=DARK, alignment=TA_RIGHT, leading=12)

    calc_header = [
        Paragraph("DESCRIPTION", s_th_l),
        Paragraph("B/L QTY (Mts)", s_th),
        Paragraph(f"RATE ({currency}/MT)", s_th),
        Paragraph(f"AMOUNT ({currency})", s_th),
    ]
    desc_text = f"Brokerage commission for mv {vessel_name}<br/><font size=7.5 color='#666666'>{commodity_name} ({seller_name} / {buyer_name})</font>"
    calc_row = [
        Paragraph(desc_text, s_td_l),
        Paragraph(f"{bl_qty:,.3f}" if bl_qty else "-", s_td_r),
        Paragraph(f"{brokerage_per_mt:,.2f}", s_td_r),
        Paragraph(f"{curr_symbol}{total_amount:,.2f}", s_td_rb),
    ]

    calc_cw = [W*0.42, W*0.18, W*0.18, W*0.22]
    calc_tbl = Table([calc_header, calc_row], colWidths=calc_cw)
    calc_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 1), (-1, -1), 0.5, BORDER),
        ('LINEBELOW', (0, 0), (-1, 0), 1, GREEN),
    ]))
    elements.append(calc_tbl)
    elements.append(Spacer(1, 4*mm))

    # =====================================================
    # TOTAL AMOUNT: Highlighted green box, right-aligned
    # =====================================================
    s_total_lbl = ParagraphStyle('TotLbl', fontName=FB, fontSize=10, textColor=DARK, alignment=TA_RIGHT, leading=14)
    s_total_val = ParagraphStyle('TotVal', fontName=FB, fontSize=14, textColor=GREEN, alignment=TA_RIGHT, leading=18)

    total_row = Table(
        [[Paragraph("TOTAL AMOUNT:", s_total_lbl), Paragraph(f"{curr_symbol}{total_amount:,.2f}", s_total_val)]],
        colWidths=[W*0.60, W*0.40]
    )
    total_row.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (1, 0), (1, 0), BG_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (1, 0), (1, 0), 10),
        ('ROUNDEDCORNERS', [0, 4, 4, 0]),
        ('BOX', (1, 0), (1, 0), 0.5, BG_MED),
    ]))
    elements.append(total_row)
    elements.append(Spacer(1, 2*mm))

    # Amount in words
    words = amount_in_words(total_amount, currency)
    elements.append(Paragraph(f"<i>{words}</i>", ParagraphStyle('AW', fontName=FI, fontSize=7.5, textColor=GREY, alignment=TA_RIGHT)))
    elements.append(Spacer(1, 8*mm))

    # =====================================================
    # BANK DETAILS: Card style
    # =====================================================
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=4*mm))
    elements.append(Paragraph("BANK DETAILS", ParagraphStyle('BankSec', fontName=FB, fontSize=10, textColor=GREEN, spaceAfter=3*mm)))

    accounts_to_show = bank_accounts if bank_accounts else [PIR_BANK]
    s_bk_lbl = ParagraphStyle('BkL', fontName=FB, fontSize=7.5, textColor=GREY, leading=10)
    s_bk_val = ParagraphStyle('BkV', fontName=F, fontSize=8.5, textColor=DARK, leading=12)
    s_bk_val_b = ParagraphStyle('BkVB', fontName=FB, fontSize=8.5, textColor=DARK, leading=12)

    for idx, acct in enumerate(accounts_to_show):
        if idx > 0:
            elements.append(Spacer(1, 3*mm))
        beneficiary = acct.get("beneficiary", acct.get("accountName", ""))
        bank_name = acct.get("bank", acct.get("bankName", ""))
        address = acct.get("address", acct.get("bankAddress", ""))
        iban = acct.get("iban", "")
        bic = acct.get("bic", acct.get("swift", ""))
        currency_label = acct.get("currency", "")

        bank_rows = []
        if currency_label:
            bank_rows.append([Paragraph("Currency", s_bk_lbl), Paragraph(f"<b>{currency_label}</b>", s_bk_val_b)])
        bank_rows += [
            [Paragraph("Beneficiary", s_bk_lbl), Paragraph(beneficiary, s_bk_val_b)],
            [Paragraph("Bank", s_bk_lbl), Paragraph(bank_name, s_bk_val)],
            [Paragraph("Address", s_bk_lbl), Paragraph(address, s_bk_val)],
            [Paragraph("IBAN", s_bk_lbl), Paragraph(f"<b>{iban}</b>", s_bk_val_b)],
            [Paragraph("BIC/SWIFT", s_bk_lbl), Paragraph(bic, s_bk_val)],
        ]

        b_tbl = Table(bank_rows, colWidths=[22*mm, W - 22*mm])
        b_tbl.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 0), (0, -1), BG_LIGHT),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor("#FAFAFA")),
            ('LINEBELOW', (0, 0), (-1, -2), 0.3, BORDER),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ]))
        elements.append(b_tbl)

    elements.append(Spacer(1, 12*mm))

    # =====================================================
    # SIGNATURE with stamp image
    # =====================================================
    STAMP_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pir-stamp-signature.png")
    sig_line = ParagraphStyle('SigLine', fontName=F, fontSize=9, alignment=TA_CENTER, textColor=GREY)
    sig_name = ParagraphStyle('SigName', fontName=FB, fontSize=8, alignment=TA_CENTER, textColor=DARK, leading=11)

    sig_rows = []
    if os.path.exists(STAMP_PATH):
        sig_rows.append(["", Image(STAMP_PATH, width=35*mm, height=35*mm)])
    sig_rows.append(["", Paragraph("_______________________________", sig_line)])
    sig_rows.append(["", Paragraph("<b>Authorized Signature</b><br/>SALIH KARAGOZ<br/>PIR Grain and Pulses Ltd", sig_name)])

    sig_tbl = Table(sig_rows, colWidths=[W*0.55, W*0.45])
    sig_tbl.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('ALIGN', (1, 0), (1, -1), 'CENTER')]))
    elements.append(sig_tbl)
    elements.append(Spacer(1, 6*mm))

    # =====================================================
    # FOOTER
    # =====================================================
    elements.append(HRFlowable(width="100%", thickness=1, color=GREEN, spaceAfter=2*mm))
    elements.append(Paragraph(
        "Please mention the invoice number in the payment details. Thank you for your business!",
        ParagraphStyle('Foot', fontName=F, fontSize=7, textColor=GREY, alignment=TA_CENTER)
    ))

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
