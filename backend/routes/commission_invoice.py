from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph, Image, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from num2words import num2words
import os

from database import trades_col, partners_col
from auth import get_current_user

router = APIRouter(prefix="/api/commission-invoice", tags=["commission-invoice"])

PIR_GREEN = colors.HexColor("#1B7A3D")
PIR_GREEN_LIGHT = colors.HexColor("#E8F5E9")
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


def generate_invoice_pdf(trade, invoice_number, invoice_date, issued_to_name, issued_to_address, issued_to_tax_id):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=12*mm, bottomMargin=12*mm)
    
    styles = getSampleStyleSheet()
    elements = []
    W = 174*mm  # usable width

    # Styles
    s_title = ParagraphStyle('Title', fontSize=20, fontName='Helvetica-Bold', textColor=PIR_GREEN, alignment=TA_CENTER, spaceAfter=2*mm)
    s_subtitle = ParagraphStyle('Sub', fontSize=9, textColor=colors.grey, alignment=TA_CENTER)
    s_label = ParagraphStyle('Lbl', fontSize=8, fontName='Helvetica-Bold', textColor=colors.HexColor('#555555'))
    s_value = ParagraphStyle('Val', fontSize=9, textColor=colors.black)
    s_value_bold = ParagraphStyle('ValB', fontSize=9, fontName='Helvetica-Bold', textColor=colors.black)
    s_small = ParagraphStyle('Sm', fontSize=7.5, textColor=colors.grey)
    s_right = ParagraphStyle('R', fontSize=9, alignment=TA_RIGHT)
    s_right_bold = ParagraphStyle('RB', fontSize=11, fontName='Helvetica-Bold', alignment=TA_RIGHT, textColor=PIR_GREEN)
    s_center = ParagraphStyle('C', fontSize=9, alignment=TA_CENTER)
    s_th = ParagraphStyle('TH', fontSize=8, fontName='Helvetica-Bold', textColor=colors.white, alignment=TA_CENTER)
    s_td = ParagraphStyle('TD', fontSize=8.5, alignment=TA_CENTER)
    s_td_l = ParagraphStyle('TDL', fontSize=8.5)
    s_td_r = ParagraphStyle('TDR', fontSize=8.5, alignment=TA_RIGHT)

    # ===== HEADER: Logo centered + green line =====
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=50*mm, height=22*mm)
        logo.hAlign = 'CENTER'
        elements.append(logo)
    elements.append(Spacer(1, 2*mm))
    elements.append(HRFlowable(width="100%", thickness=2, color=PIR_GREEN, spaceAfter=3*mm))

    # ===== INVOICE TITLE =====
    elements.append(Paragraph("COMMISSION INVOICE", s_title))
    elements.append(Spacer(1, 4*mm))

    # ===== INVOICE INFO BAR (No, Date) =====
    info_data = [[
        Paragraph(f"<b>Invoice No:</b> {invoice_number}", s_value),
        Paragraph(f"<b>Date:</b> {invoice_date}", ParagraphStyle('DR', fontSize=9, alignment=TA_RIGHT)),
    ]]
    info_tbl = Table(info_data, colWidths=[W/2, W/2])
    info_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PIR_GREEN_LIGHT),
        ('ROUNDEDCORNERS', [3, 3, 3, 3]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_tbl)
    elements.append(Spacer(1, 5*mm))

    # ===== ISSUED TO / ISSUED BY =====
    to_lines = f"<b>{issued_to_name}</b>"
    if issued_to_address:
        to_lines += f"<br/>{issued_to_address}"
    if issued_to_tax_id:
        to_lines += f"<br/>Tax ID: {issued_to_tax_id}"

    by_lines = f"<b>{PIR_COMPANY['name']}</b><br/>{PIR_COMPANY['address']}<br/>ID No: {PIR_COMPANY['id_no']}"

    parties = [[
        [Paragraph("<font color='#1B7A3D'><b>BILL TO:</b></font>", s_label), Spacer(1, 1*mm), Paragraph(to_lines, s_value)],
        [Paragraph("<font color='#1B7A3D'><b>FROM:</b></font>", s_label), Spacer(1, 1*mm), Paragraph(by_lines, s_value)],
    ]]
    p_tbl = Table(parties, colWidths=[W/2, W/2])
    p_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(p_tbl)
    elements.append(Spacer(1, 6*mm))

    # ===== TRADE DETAILS TABLE =====
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

    desc = f"Brokerage Commission<br/>mv {vessel_name}<br/>{commodity_name}<br/>{seller_name} / {buyer_name}"

    # Column widths: #, Desc, Contract, Vessel, Load, Disch, BL Qty, Rate
    cw = [8*mm, 38*mm, 20*mm, 22*mm, 20*mm, 20*mm, 22*mm, 24*mm]

    t_header = [
        Paragraph("#", s_th),
        Paragraph("DESCRIPTION", s_th),
        Paragraph("CONTRACT", s_th),
        Paragraph("VESSEL", s_th),
        Paragraph("LOAD PORT", s_th),
        Paragraph("DISCH PORT", s_th),
        Paragraph("B/L QTY<br/>(MT)", s_th),
        Paragraph(f"RATE<br/>({currency}/MT)", s_th),
    ]

    t_row = [
        Paragraph("1", s_td),
        Paragraph(desc, s_td_l),
        Paragraph(str(contract_num), s_td),
        Paragraph(str(vessel_name), s_td),
        Paragraph(str(loading_port), s_td),
        Paragraph(str(discharge_port), s_td),
        Paragraph(f"{bl_qty:,.3f}" if bl_qty else "-", s_td_r),
        Paragraph(f"{brokerage_per_mt:,.2f}", s_td_r),
    ]

    main_tbl = Table([t_header, t_row], colWidths=cw)
    main_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PIR_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, 0), 0.5, PIR_GREEN),
        ('GRID', (0, 1), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(main_tbl)
    elements.append(Spacer(1, 6*mm))

    # ===== TOTAL BOX =====
    curr_symbol = "$" if currency == "USD" else currency + " "
    total_data = [
        [Paragraph("", s_value), Paragraph("<b>TOTAL AMOUNT</b>", ParagraphStyle('T', fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
         Paragraph(f"<b>{curr_symbol}{total_amount:,.2f}</b>", ParagraphStyle('TA', fontSize=14, fontName='Helvetica-Bold', textColor=PIR_GREEN, alignment=TA_RIGHT))],
    ]
    total_tbl = Table(total_data, colWidths=[W*0.4, W*0.3, W*0.3])
    total_tbl.setStyle(TableStyle([
        ('LINEABOVE', (1, 0), (-1, 0), 1.5, PIR_GREEN),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(total_tbl)
    elements.append(Spacer(1, 3*mm))

    # ===== AMOUNT IN WORDS =====
    words = amount_in_words(total_amount, currency)
    elements.append(Paragraph(f"<b>Amount in words:</b> <i>{words}</i>", s_value))
    elements.append(Spacer(1, 8*mm))

    # ===== BANK DETAILS (boxed) =====
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E0E0E0'), spaceAfter=3*mm))
    elements.append(Paragraph("<font color='#1B7A3D'><b>BANK DETAILS</b></font>", s_label))
    elements.append(Spacer(1, 2*mm))

    bank_rows = [
        [Paragraph("<b>Beneficiary:</b>", s_small), Paragraph(PIR_BANK['beneficiary'], s_value)],
        [Paragraph("<b>Bank:</b>", s_small), Paragraph(PIR_BANK['bank'], s_value)],
        [Paragraph("<b>Address:</b>", s_small), Paragraph(PIR_BANK['address'], s_value)],
        [Paragraph("<b>IBAN:</b>", s_small), Paragraph(f"<b>{PIR_BANK['iban']}</b>", s_value_bold)],
        [Paragraph("<b>BIC/SWIFT:</b>", s_small), Paragraph(PIR_BANK['bic'], s_value)],
    ]
    bank_tbl = Table(bank_rows, colWidths=[25*mm, W - 25*mm])
    bank_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING', (0, 0), (0, -1), 2),
    ]))
    elements.append(bank_tbl)
    elements.append(Spacer(1, 12*mm))

    # ===== SIGNATURE =====
    sig_data = [[
        Paragraph("", s_value),
        Paragraph("_______________________________", ParagraphStyle('SigLine', fontSize=9, alignment=TA_CENTER, textColor=colors.grey)),
    ], [
        Paragraph("", s_value),
        Paragraph("<b>Authorized Signature</b><br/>SALIH KARAGOZ", ParagraphStyle('SigName', fontSize=8, alignment=TA_CENTER, textColor=colors.grey)),
    ]]
    sig_tbl = Table(sig_data, colWidths=[W*0.55, W*0.45])
    elements.append(sig_tbl)
    elements.append(Spacer(1, 8*mm))

    # ===== FOOTER =====
    elements.append(HRFlowable(width="100%", thickness=0.5, color=PIR_GREEN, spaceAfter=2*mm))
    elements.append(Paragraph("Please mention the invoice number in the details of the payment. Thank you for your cooperation!", 
                              ParagraphStyle('Footer', fontSize=7.5, textColor=colors.grey, alignment=TA_CENTER)))

    doc.build(elements)
    buffer.seek(0)
    return buffer


@router.get("/{trade_id}")
def get_commission_invoice_pdf(trade_id: str, account: str = "seller", user=Depends(get_current_user)):
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

    invoice_number = f"COMM-{contract_num}"
    invoice_date = datetime.utcnow().strftime("%d.%m.%Y")

    pdf_buffer = generate_invoice_pdf(
        trade=trade,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        issued_to_name=issued_to_name,
        issued_to_address=issued_to_address,
        issued_to_tax_id=issued_to_tax_id,
    )

    filename = f"Commission_Invoice_{contract_num}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
