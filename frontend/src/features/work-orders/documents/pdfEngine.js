import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const COLORS = {
  blue: [30, 64, 175],
  navy: [15, 23, 42],
  gray: [100, 116, 139],
  lightGray: [226, 232, 240],
  paleBlue: [239, 246, 255],
  green: [5, 150, 105],
  orange: [234, 88, 12],
  red: [220, 38, 38],
  white: [255, 255, 255]
};

export class PdfReport {
  constructor({
    title,
    subtitle = "",
    branding,
    documentCode = "WO-GEN-F-001",
    version = "1.0",
    orientation = "portrait",
    workOrderUrl = ""
  }) {
    this.doc = new jsPDF({ unit: "mm", format: "a4", orientation });
    this.title = title;
    this.subtitle = subtitle;
    this.branding = branding;
    this.documentCode = documentCode;
    this.version = version || branding.documentVersion || "1.0";
    this.workOrderUrl = workOrderUrl;
    this.orientation = orientation;
    this.margin = 14;
    this.headerHeight = 30;
    this.footerHeight = 12;
    this.y = this.margin;
    this.addHeader();
  }

  pageWidth() {
    return this.doc.internal.pageSize.getWidth();
  }

  pageHeight() {
    return this.doc.internal.pageSize.getHeight();
  }

  contentWidth() {
    return this.pageWidth() - this.margin * 2;
  }

  addHeader() {
    const doc = this.doc;
    const x = this.margin;
    const width = this.contentWidth();
    doc.setFillColor(...COLORS.paleBlue);
    doc.rect(0, 0, this.pageWidth(), 31, "F");
    doc.setDrawColor(...COLORS.lightGray);
    doc.line(this.margin, 31, this.pageWidth() - this.margin, 31);

    if (this.branding.logo) {
      try {
        doc.addImage(this.branding.logo, imageType(this.branding.logo), x, 8, 22, 16, undefined, "FAST");
      } catch {
        this.drawLogoPlaceholder(x, 8);
      }
    } else {
      this.drawLogoPlaceholder(x, 8);
    }

    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(this.branding.companyName || "Maintenance Management System", x + 28, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const companyLines = [
      this.branding.companyAddress,
      [this.branding.phone, this.branding.email, this.branding.website].filter(Boolean).join(" | ")
    ].filter(Boolean);
    doc.text(companyLines, x + 28, 15, { maxWidth: 70 });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(this.title, this.pageWidth() - this.margin, 11, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(this.subtitle, this.pageWidth() - this.margin, 16, { align: "right", maxWidth: 82 });
    doc.text(`Code: ${this.documentCode} | Version: ${this.version}`, this.pageWidth() - this.margin, 23, { align: "right" });
    doc.text(`Generated: ${formatDateTime(new Date())}`, this.pageWidth() - this.margin, 27, { align: "right" });
    this.y = 38;
  }

  drawLogoPlaceholder(x, y) {
    this.doc.setFillColor(...COLORS.blue);
    this.doc.roundedRect(x, y, 22, 16, 2, 2, "F");
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8);
    this.doc.text("CMMS", x + 11, y + 10, { align: "center" });
  }

  addPage(orientation = this.orientation) {
    this.orientation = orientation;
    this.doc.addPage("a4", orientation);
    this.addHeader();
  }

  ensure(height) {
    if (this.y + height <= this.pageHeight() - this.margin - this.footerHeight) return;
    this.addPage(this.orientation);
  }

  section(title) {
    this.ensure(14);
    this.doc.setFillColor(...COLORS.blue);
    this.doc.roundedRect(this.margin, this.y, this.contentWidth(), 8, 1.5, 1.5, "F");
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9);
    this.doc.text(title, this.margin + 3, this.y + 5.5);
    this.y += 12;
  }

  labelValueGrid(rows, columns = 2) {
    const gap = 4;
    const colWidth = (this.contentWidth() - gap * (columns - 1)) / columns;
    rows.forEach((row, index) => {
      if (index % columns === 0) this.ensure(16);
      const column = index % columns;
      const x = this.margin + column * (colWidth + gap);
      const y = this.y;
      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(...COLORS.lightGray);
      this.doc.roundedRect(x, y, colWidth, 12, 1.5, 1.5, "FD");
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...COLORS.gray);
      this.doc.text(String(row.label || "").toUpperCase(), x + 2, y + 4);
      this.doc.setFontSize(8.2);
      this.doc.setTextColor(...COLORS.navy);
      this.doc.text(this.wrap(row.value || "-", colWidth - 4, 1), x + 2, y + 9);
      if (column === columns - 1 || index === rows.length - 1) this.y += 16;
    });
  }

  paragraph(text, options = {}) {
    const fontSize = options.fontSize || 9;
    const lineHeight = options.lineHeight || 5;
    const width = options.width || this.contentWidth();
    const lines = this.wrap(text || "-", width, options.maxLines || 0, fontSize);
    this.ensure(lines.length * lineHeight + 4);
    this.doc.setTextColor(...(options.color || COLORS.navy));
    this.doc.setFont("helvetica", options.bold ? "bold" : "normal");
    this.doc.setFontSize(fontSize);
    this.doc.text(lines, options.x || this.margin, this.y);
    this.y += lines.length * lineHeight + 4;
  }

  table(headers, rows, options = {}) {
    const fontSize = options.fontSize || 7.5;
    const colWidths = options.colWidths || headers.map(() => this.contentWidth() / headers.length);
    const totalWidth = colWidths.reduce((sum, value) => sum + value, 0);
    if (totalWidth > this.contentWidth() && this.orientation !== "landscape") {
      this.addPage("landscape");
    }
    const startX = this.margin;
    const rowGap = 1.5;
    const drawHeader = () => {
      this.ensure(10);
      let x = startX;
      this.doc.setFillColor(...COLORS.navy);
      headers.forEach((header, index) => {
        this.doc.rect(x, this.y, colWidths[index], 8, "F");
        this.doc.setTextColor(...COLORS.white);
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(fontSize);
        this.doc.text(this.wrap(header, colWidths[index] - 3, 1, fontSize), x + 1.5, this.y + 5.2);
        x += colWidths[index];
      });
      this.y += 8;
    };
    drawHeader();
    const safeRows = rows.length ? rows : [headers.map(() => "-")];
    safeRows.forEach(row => {
      const wrapped = row.map((cell, index) => this.wrap(cell || "-", colWidths[index] - 3, 0, fontSize));
      const rowHeight = Math.max(8, ...wrapped.map(lines => lines.length * 4 + rowGap));
      if (this.y + rowHeight > this.pageHeight() - this.margin - this.footerHeight) {
        this.addPage(this.orientation);
        drawHeader();
      }
      let x = startX;
      wrapped.forEach((lines, index) => {
        this.doc.setDrawColor(...COLORS.lightGray);
        this.doc.rect(x, this.y, colWidths[index], rowHeight);
        this.doc.setTextColor(...COLORS.navy);
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(fontSize);
        this.doc.text(lines, x + 1.5, this.y + 4.5);
        x += colWidths[index];
      });
      this.y += rowHeight;
    });
    this.y += 5;
  }

  signatures(names = ["Technician", "Supervisor", "Maintenance Manager", "Operations Manager"]) {
    this.section("Signatures");
    const width = (this.contentWidth() - 6) / 2;
    names.forEach((name, index) => {
      if (index % 2 === 0) this.ensure(24);
      const x = this.margin + (index % 2) * (width + 6);
      const y = this.y;
      this.doc.setDrawColor(...COLORS.lightGray);
      this.doc.roundedRect(x, y, width, 20, 1.5, 1.5);
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...COLORS.navy);
      this.doc.text(name, x + 2, y + 5);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(...COLORS.gray);
      this.doc.text("Name / Signature / Date", x + 2, y + 17);
      if (index % 2 === 1 || index === names.length - 1) this.y += 25;
    });
  }

  qrCode(label) {
    if (!this.workOrderUrl) return;
    this.ensure(34);
    const qr = QRCode.create(this.workOrderUrl, { errorCorrectionLevel: "M" });
    const modules = qr.modules;
    const moduleSize = 28 / modules.size;
    const x = this.pageWidth() - this.margin - 28;
    const y = this.y;
    this.doc.setFillColor(...COLORS.white);
    this.doc.rect(x, y, 28, 28, "F");
    this.doc.setFillColor(...COLORS.navy);
    for (let row = 0; row < modules.size; row += 1) {
      for (let column = 0; column < modules.size; column += 1) {
        if (!modules.data[row * modules.size + column]) continue;
        this.doc.rect(x + column * moduleSize, y + row * moduleSize, moduleSize, moduleSize, "F");
      }
    }
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(...COLORS.gray);
    this.doc.setFontSize(7);
    this.doc.text(label || "Scan to open Work Order", x - 2, y + 31, { align: "right", maxWidth: 44 });
    this.y += 34;
  }

  imageGrid(title, photos = []) {
    this.section(title);
    if (!photos.length) {
      this.paragraph("No photos attached.", { color: COLORS.gray });
      return;
    }
    const width = (this.contentWidth() - 8) / 3;
    const height = 32;
    photos.slice(0, 6).forEach((photo, index) => {
      if (index % 3 === 0) this.ensure(height + 10);
      const x = this.margin + (index % 3) * (width + 4);
      const y = this.y;
      this.doc.setDrawColor(...COLORS.lightGray);
      this.doc.roundedRect(x, y, width, height, 1.5, 1.5);
      try {
        this.doc.addImage(photo, imageType(photo), x + 1, y + 1, width - 2, height - 2, undefined, "FAST");
      } catch {
        this.doc.setTextColor(...COLORS.gray);
        this.doc.setFontSize(8);
        this.doc.text("Image unavailable", x + width / 2, y + height / 2, { align: "center" });
      }
      if (index % 3 === 2 || index === photos.length - 1) this.y += height + 7;
    });
  }

  wrap(value, width, maxLines = 0, fontSize = 8) {
    this.doc.setFontSize(fontSize);
    const lines = this.doc.splitTextToSize(String(value ?? "-"), Math.max(width, 10));
    return maxLines ? lines.slice(0, maxLines) : lines;
  }

  finalize(fileName) {
    const pageCount = this.doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      this.doc.setPage(page);
      this.doc.setDrawColor(...COLORS.lightGray);
      this.doc.line(this.margin, this.pageHeight() - 10, this.pageWidth() - this.margin, this.pageHeight() - 10);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7);
      this.doc.setTextColor(...COLORS.gray);
      this.doc.text(`Page ${page} of ${pageCount}`, this.pageWidth() - this.margin, this.pageHeight() - 5, { align: "right" });
      this.doc.text("Generated by CMMS Document Center", this.margin, this.pageHeight() - 5);
    }
    const blob = this.doc.output("blob");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function imageType(dataUrl) {
  const text = String(dataUrl || "");
  if (text.includes("image/jpeg") || text.includes("image/jpg")) return "JPEG";
  if (text.includes("image/webp")) return "WEBP";
  return "PNG";
}
