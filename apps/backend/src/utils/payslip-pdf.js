'use strict';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const COLORS = {
  brand: '#ea580c',
  brandDark: '#c2410c',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  surface: '#f9fafb',
  white: '#ffffff',
  netPayBg: '#fff7ed',
  netPayBorder: '#fdba74',
};

function formatInr(amount) {
  return `₹ ${Number(amount || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function resolvePeriodLabel(run = {}) {
  const month = Number(run.month);
  const year = Number(run.year);
  if (month >= 1 && month <= 12 && year) {
    return `${MONTH_NAMES[month - 1]} ${year}`;
  }
  if (run.month && run.year) return `${run.month}/${run.year}`;
  return '—';
}

function resolveEmployeeName(orgUser = {}) {
  const user = orgUser.user || {};
  const fromUser = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fromUser || user.username || user.email || 'Employee';
}

function resolveCompanyName(payslip = {}) {
  return payslip.organization?.name || 'Webfudge Systems';
}

function drawFilledRect(doc, x, y, width, height, fill) {
  doc.save().fillColor(fill).rect(x, y, width, height).fill().restore();
}

function drawStrokeRect(doc, x, y, width, height, stroke = COLORS.border, lineWidth = 1) {
  doc.save().lineWidth(lineWidth).strokeColor(stroke).rect(x, y, width, height).stroke().restore();
}

function drawLabelValueRows(doc, x, y, width, rows, { labelWidth = 110, rowHeight = 20 } = {}) {
  let cursorY = y;
  rows.forEach(({ label, value }) => {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(label, x, cursorY + 5, { width: labelWidth });
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(String(value || '—'), x + labelWidth, cursorY + 5, { width: width - labelWidth - 8 });
    cursorY += rowHeight;
  });
  return cursorY;
}

function drawAmountTable(doc, { x, y, width, title, rows, totalLabel, totalAmount }) {
  const headerHeight = 28;
  const rowHeight = 22;
  const totalHeight = 26;
  const bodyRows = rows.length;
  const tableHeight = headerHeight + bodyRows * rowHeight + totalHeight;

  drawStrokeRect(doc, x, y, width, tableHeight, COLORS.border);

  drawFilledRect(doc, x, y, width, headerHeight, COLORS.surface);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(title, x + 12, y + 9);

  let rowY = y + headerHeight;
  const labelColWidth = width * 0.62;
  const amountColWidth = width - labelColWidth;

  rows.forEach((row, index) => {
    if (index > 0) {
      doc
        .save()
        .strokeColor(COLORS.border)
        .moveTo(x, rowY)
        .lineTo(x + width, rowY)
        .stroke()
        .restore();
    }

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(row.label, x + 12, rowY + 6, { width: labelColWidth - 16 });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(formatInr(row.amount), x + labelColWidth, rowY + 6, {
        width: amountColWidth - 12,
        align: 'right',
      });

    rowY += rowHeight;
  });

  doc
    .save()
    .strokeColor(COLORS.border)
    .moveTo(x, rowY)
    .lineTo(x + width, rowY)
    .stroke()
    .restore();

  drawFilledRect(doc, x, rowY, width, totalHeight, COLORS.surface);
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(totalLabel, x + 12, rowY + 8, { width: labelColWidth - 16 });
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.brandDark)
    .text(formatInr(totalAmount), x + labelColWidth, rowY + 8, {
      width: amountColWidth - 12,
      align: 'right',
    });

  return y + tableHeight;
}

async function buildPayslipPdfBuffer(payslip) {
  const PDFDocument = require('pdfkit');

  const row = payslip.payrollLineItem || {};
  const run = payslip.payrollRun || {};
  const orgUser = payslip.organizationUser || {};
  const profile = row.employeeProfile || {};
  const companyName = resolveCompanyName(payslip);
  const employeeName = resolveEmployeeName(orgUser);
  const periodLabel = resolvePeriodLabel(run);
  const generatedAt = payslip.generatedAt || payslip.createdAt || new Date().toISOString();

  const margin = 40;
  const pageWidth = 595.28;
  const contentWidth = pageWidth - margin * 2;

  const doc = new PDFDocument({ size: 'A4', margin });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Header band
  const headerHeight = 88;
  drawFilledRect(doc, margin, margin, contentWidth, headerHeight, COLORS.brand);

  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor(COLORS.white)
    .text(companyName, margin + 20, margin + 18, { width: contentWidth - 40 });
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#ffedd5')
    .text('Salary Slip', margin + 20, margin + 44);
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(COLORS.white)
    .text(periodLabel, margin + 20, margin + 60);

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#ffedd5')
    .text('CONFIDENTIAL', margin + contentWidth - 120, margin + 22, {
      width: 100,
      align: 'right',
    });

  let cursorY = margin + headerHeight + 18;

  // Employee details card
  const detailsHeight = 118;
  drawStrokeRect(doc, margin, cursorY, contentWidth, detailsHeight, COLORS.border);
  drawFilledRect(doc, margin, cursorY, contentWidth, 26, COLORS.surface);

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.text)
    .text('Employee Details', margin + 14, cursorY + 8);

  const leftColX = margin + 14;
  const rightColX = margin + contentWidth / 2 + 8;
  const colWidth = contentWidth / 2 - 22;
  const detailsStartY = cursorY + 34;

  const leftRows = [
    { label: 'Payslip No.', value: payslip.payslipNumber || '—' },
    { label: 'Employee', value: employeeName },
    { label: 'Employee ID', value: profile.employeeCode || '—' },
    { label: 'Department', value: orgUser.primaryDepartment?.name || '—' },
    { label: 'Designation', value: profile.designation || '—' },
  ];
  const rightRows = [
    { label: 'Pay Period', value: periodLabel },
    { label: 'Payroll Run', value: run.runNumber || '—' },
    { label: 'Generated On', value: formatDate(generatedAt) },
    { label: 'Run Status', value: run.status ? String(run.status).toUpperCase() : '—' },
  ];

  drawLabelValueRows(doc, leftColX, detailsStartY, colWidth, leftRows);
  drawLabelValueRows(doc, rightColX, detailsStartY, colWidth, rightRows);

  cursorY += detailsHeight + 18;

  // Earnings & deductions tables
  const tableGap = 16;
  const tableWidth = (contentWidth - tableGap) / 2;
  const earningsRows = [
    { label: 'Basic Salary', amount: row.basic },
    { label: 'House Rent Allowance (HRA)', amount: row.hra },
    { label: 'Special Allowance', amount: row.specialAllowance },
    { label: 'Flexible Benefits (FBP)', amount: row.fbp },
  ];
  if (Number(row.overtimePay || 0) > 0) {
    earningsRows.push({
      label: `Overtime Pay (${row.overtimeHours || 0} hrs)`,
      amount: row.overtimePay,
    });
  }
  const deductionRows = [
    { label: 'Provident Fund (PF)', amount: row.pf },
    { label: 'Employee State Insurance (ESI)', amount: row.esi },
    { label: 'Professional Tax (PT)', amount: row.pt },
    {
      label: row.tdsEstimate === false ? 'Tax Deducted at Source (TDS)' : 'Tax Deducted at Source (TDS) — Est.',
      amount: row.tds,
    },
  ];

  const earningsBottom = drawAmountTable(doc, {
    x: margin,
    y: cursorY,
    width: tableWidth,
    title: 'Earnings',
    rows: earningsRows,
    totalLabel: 'Gross Earnings',
    totalAmount: row.gross,
  });

  const deductionsBottom = drawAmountTable(doc, {
    x: margin + tableWidth + tableGap,
    y: cursorY,
    width: tableWidth,
    title: 'Deductions',
    rows: deductionRows,
    totalLabel: 'Total Deductions',
    totalAmount: row.deductionsTotal,
  });

  cursorY = Math.max(earningsBottom, deductionsBottom) + 20;

  // Net pay highlight
  const netPayHeight = 58;
  drawFilledRect(doc, margin, cursorY, contentWidth, netPayHeight, COLORS.netPayBg);
  drawStrokeRect(doc, margin, cursorY, contentWidth, netPayHeight, COLORS.netPayBorder, 1.2);

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COLORS.brandDark)
    .text('Net Pay', margin + 18, cursorY + 14);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text('Amount credited to employee', margin + 18, cursorY + 30);

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(COLORS.text)
    .text(formatInr(row.net), margin, cursorY + 16, {
      width: contentWidth - 18,
      align: 'right',
    });

  cursorY += netPayHeight + 24;

  // Footer
  doc
    .save()
    .strokeColor(COLORS.border)
    .moveTo(margin, cursorY)
    .lineTo(margin + contentWidth, cursorY)
    .stroke()
    .restore();

  cursorY += 10;
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      'This is a system-generated payslip and does not require a signature. Amounts are computed from payroll records for the selected period. For queries, contact your HR department.',
      margin,
      cursorY,
      { width: contentWidth, align: 'center', lineGap: 2 },
    );

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  buildPayslipPdfBuffer,
};
