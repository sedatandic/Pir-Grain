from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from num2words import num2words
import os

from database import trades_col, partners_col
from auth import get_current_user

router = APIRouter(prefix="/api/commission-invoice", tags=["commission-invoice"])

PIR_GREEN = colors.HexColor("#1B7A3D")
LOGO_PATH = os.path.join(os.path.dirname(__file__), "pir-logo.jpeg")

# PIR company details
PIR_COMPANY = {
    "name": "PIR GRAIN AND PULSES LTD",
    "address1": "Blv. Tsarigradsko Shosse",
    "address2": "No:73",
    "address3": "Plovdiv/BULGARIA",
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
        curr_word = "DOLLARS" if currency == "USD" else currency
        if decimal_part > 0:
            cents_words = num2words(decimal_part, lang='en').upper()
            return f"{words} AND {cents_words} CENTS {curr_word}"
        return f"{words} {curr_word}"
    except Exception:
        return str(amount)


def generate_invoice_pdf(trade, invoice_number, invoice_date, issued_to_name, issued_to_address, issued_to_tax_id):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)

    styles = getSampleStyleSheet()
    elements = []

    # Custom styles
    title_style = ParagraphStyle('InvoiceTitle', parent=styles['Heading1'], fontSize=22, textColor=colors.black, alignment=TA_CENTER, spaceAfter=5)
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=9, textColor=colors.black, fontName='Helvetica-Bold')
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=9, textColor=colors.black)
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=colors.grey)
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=10, textColor=colors.black, fontName='Helvetica-Bold')
    right_bold = ParagraphStyle('RightBold', parent=styles['Normal'], fontSize=14, textColor=colors.black, fontName='Helvetica-Bold', alignment=TA_RIGHT)
    center_style = ParagraphStyle('Center', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)

    # ---- HEADER ----
    # Logo on left, company name + INVOICE on right
    logo = None
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=55*mm, height=25*mm)

    header_data = [
        [
            logo or Paragraph("PIR GRAIN AND PULSES", bold_style),
            Paragraph("<b>PIR GRAIN AND PULSES</b>", ParagraphStyle('RHeader', parent=styles['Normal'], fontSize=11, fontName='Helvetica-Bold', alignment=TA_RIGHT))
        ]
    ]
    header_table = Table(header_data, colWidths=[90*mm, 80*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 5*mm))

    # ---- INVOICE TITLE + NUMBER/DATE ----
    elements.append(Paragraph("INVOICE", title_style))
    elements.append(Spacer(1, 3*mm))

    inv_info = Table([
        [Paragraph("<b>NO:</b>", label_style), Paragraph(str(invoice_number), value_style),
         Paragraph("<b>DATE:</b>", label_style), Paragraph(invoice_date, value_style)]
    ], colWidths=[15*mm, 55*mm, 18*mm, 55*mm])
    inv_info.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(inv_info)
    elements.append(Spacer(1, 5*mm))

    # ---- ISSUED TO / ISSUED BY ----
    issued_to_lines = f"<b>ISSUED TO:</b><br/>{issued_to_name}<br/>"
    if issued_to_address:
        issued_to_lines += f"{issued_to_address}<br/>"
    if issued_to_tax_id:
        issued_to_lines += f"<b>TAX ID NO:</b> {issued_to_tax_id}"

    issued_by_lines = f"<b>ISSUED BY:</b><br/>{PIR_COMPANY['name']}<br/>{PIR_COMPANY['address1']}<br/>{PIR_COMPANY['address2']}<br/>{PIR_COMPANY['address3']}<br/><b>ID NO:</b> {PIR_COMPANY['id_no']}"

    parties_table = Table([
        [Paragraph(issued_to_lines, value_style), Paragraph(issued_by_lines, value_style)]
    ], colWidths=[90*mm, 80*mm])
    parties_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(parties_table)
    elements.append(Spacer(1, 8*mm))

    # ---- TRADE DETAILS (New section) ----
    contract_num = trade.get("pirContractNumber") or trade.get("referenceNumber") or "-"
    vessel_name = trade.get("vesselName") or "-"
    bl_qty = trade.get("blQuantity") or trade.get("quantity") or 0
    loading_port = trade.get("loadingPortName") or trade.get("basePortName") or "-"
    discharge_port = trade.get("dischargePortName") or "-"
    commodity_name = trade.get("commodityName") or "-"
    brokerage_per_mt = trade.get("brokeragePerMT") or 0
    currency = trade.get("currency") or "USD"
    brokerage_account = trade.get("brokerageAccount") or "seller"

    # ---- MAIN TABLE ----
    th_style = ParagraphStyle('TH', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=colors.white, alignment=TA_CENTER)
    td_style = ParagraphStyle('TD', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)
    td_left = ParagraphStyle('TDLeft', parent=styles['Normal'], fontSize=9, alignment=TA_LEFT)
    td_right = ParagraphStyle('TDRight', parent=styles['Normal'], fontSize=9, alignment=TA_RIGHT)

    total_amount = round(bl_qty * brokerage_per_mt, 2)

    description_text = f"Brokerage Commission for<br/>mv {vessel_name}, {commodity_name}"

    table_data = [
        [
            Paragraph("#", th_style),
            Paragraph("DESCRIPTION", th_style),
            Paragraph("CONTRACT", th_style),
            Paragraph("VESSEL", th_style),
            Paragraph("PORT LOAD", th_style),
            Paragraph("PORT DISCH", th_style),
            Paragraph("QTY B/L<br/>(MT)", th_style),
            Paragraph("Brokerage<br/>PMT", th_style),
        ],
        [
            Paragraph("1", td_style),
            Paragraph(description_text, td_left),
            Paragraph(str(contract_num), td_style),
            Paragraph(str(vessel_name), td_style),
            Paragraph(str(loading_port), td_style),
            Paragraph(str(discharge_port), td_style),
            Paragraph(f"{bl_qty:,.3f}" if bl_qty else "-", td_right),
            Paragraph(f"{brokerage_per_mt:.2f} {currency}", td_right),
        ]
    ]

    main_table = Table(table_data, colWidths=[8*mm, 35*mm, 22*mm, 22*mm, 22*mm, 22*mm, 20*mm, 22*mm])
    main_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PIR_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F8F8')]),
    ]))
    elements.append(main_table)
    elements.append(Spacer(1, 8*mm))

    # ---- TOTAL AMOUNT ----
    total_data = [
        [Paragraph("<b>TOTAL AMOUNT:</b>", bold_style), Paragraph(f"<b>${total_amount:,.2f}</b>", right_bold)],
    ]
    total_table = Table(total_data, colWidths=[90*mm, 80*mm])
    total_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, PIR_GREEN),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(total_table)
    elements.append(Spacer(1, 3*mm))

    # ---- AMOUNT IN WORDS ----
    words = amount_in_words(total_amount, currency)
    elements.append(Paragraph(f"<b>AMOUNT IN WORDS:</b> {words}", value_style))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(f"<b>CURRENCY:</b> {currency}", value_style))
    elements.append(Spacer(1, 6*mm))

    # ---- BANK DETAILS ----
    bank_text = f"""<b>BANK DETAILS:</b><br/>
<b>BENEFICIARY:</b> {PIR_BANK['beneficiary']}<br/>
<b>BANK:</b> {PIR_BANK['bank']}<br/>
<b>ADDRESS:</b> {PIR_BANK['address']}<br/>
<b>IBAN:</b> {PIR_BANK['iban']}<br/>
<b>BIC:</b> {PIR_BANK['bic']}"""
    elements.append(Paragraph(bank_text, value_style))
    elements.append(Spacer(1, 10*mm))

    # ---- SIGNATURE ----
    sig_data = [
        [Paragraph("", value_style), Paragraph("<b>SIGNATURE</b>", ParagraphStyle('Sig', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT))],
        [Paragraph("", value_style), Paragraph("SALIH KARAGOZ", ParagraphStyle('SigName', parent=styles['Normal'], fontSize=9, alignment=TA_RIGHT))],
    ]
    sig_table = Table(sig_data, colWidths=[100*mm, 70*mm])
    elements.append(sig_table)
    elements.append(Spacer(1, 8*mm))

    # ---- FOOTER ----
    elements.append(Paragraph("<i>Please mention the invoice number in the details of the payment.</i>", small_style))
    elements.append(Paragraph("<i>Thank you for your cooperation!</i>", small_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


@router.get("/{trade_id}")
def get_commission_invoice_pdf(trade_id: str, account: str = "seller", user=Depends(get_current_user)):
    trade = trades_col.find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    contract_num = trade.get("pirContractNumber") or trade.get("referenceNumber") or trade_id

    # Determine "ISSUED TO" based on brokerage account
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

    # Invoice number and date
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
