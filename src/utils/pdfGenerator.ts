import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFReportData {
    title: string;
    toolName: string;
    userName: string;
    company: string;
    date: string;
    inputs: { label: string; value: string }[];
    outputs: { label: string; value: string }[];
}

export function generatePDFReport(data: PDFReportData): void {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const PAGE_W = 210;
    const MARGIN = 15;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    let y = 0;

    // Header background
    doc.setFillColor(12, 19, 38);
    doc.rect(0, 0, PAGE_W, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AEA Consulenze Alimentari', MARGIN, 16);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(data.toolName, MARGIN, 26);

    doc.setFontSize(9);
    doc.text(`www.aeaconsulenzealimentari.it`, MARGIN, 34);

    // Add Logo
    const logoUrl = 'https://aeaconsulenzealimentari.it/wp-content/uploads/2023/06/LOGO-2023-senza-scritta.png';
    try {
        // Position logo on the top right
        doc.addImage(logoUrl, 'PNG', PAGE_W - MARGIN - 25, 5, 25, 25);
    } catch (error) {
        console.error('Failed to load logo in PDF:', error);
    }

    y = 52;

    // Client info box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(MARGIN, y, CONTENT_W, 22, 3, 3, 'F');
    doc.setTextColor(60, 60, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Azienda:', MARGIN + 4, y + 8);
    doc.text('Operatore:', MARGIN + 4, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(data.company, MARGIN + 24, y + 8);
    doc.text(data.userName, MARGIN + 24, y + 15);
    doc.text(`Data: ${data.date}`, PAGE_W - MARGIN - 40, y + 8);

    y += 32;

    // Inputs section
    doc.setFillColor(12, 19, 38);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATI DI INPUT', MARGIN + 3, y + 5.5);
    y += 12;

    data.inputs.forEach((item, i) => {
        if (i % 2 === 0) {
            doc.setFillColor(249, 250, 252);
            doc.rect(MARGIN, y - 1, CONTENT_W, 7, 'F');
        }
        doc.setTextColor(80, 80, 100);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(item.label + ':', MARGIN + 3, y + 4);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(12, 19, 38);
        doc.text(item.value, MARGIN + CONTENT_W / 2, y + 4);
        y += 8;
    });

    y += 6;

    // Outputs section
    doc.setFillColor(255, 126, 46);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RISULTATI CALCOLATI', MARGIN + 3, y + 5.5);
    y += 12;

    data.outputs.forEach((item, i) => {
        if (i % 2 === 0) {
            doc.setFillColor(240, 252, 248);
            doc.rect(MARGIN, y - 1, CONTENT_W, 8, 'F');
        }
        doc.setTextColor(60, 80, 60);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(item.label + ':', MARGIN + 3, y + 4);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 70, 10);
        doc.text(item.value, MARGIN + CONTENT_W / 2, y + 4);
        y += 9;
    });

    y += 10;

    // Footer
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 282, PAGE_W, 15, 'F');
    doc.setTextColor(120, 120, 140);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.text(
        'Report generato tramite portale AEA Consulenze Alimentari — Documento riservato — Non distribuire',
        MARGIN,
        289
    );
    doc.text(`Pagina 1/1`, PAGE_W - MARGIN - 15, 289);

    // Watermark
    doc.setTextColor(230, 232, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(60);
    doc.text('AEA', 50, 180, { angle: 35 });

    const filename = `AEA_${data.toolName.replace(/\s+/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
}

/**
 * Export scheda etichetta (nutritional label sheet) as PDF
 * Captures the HTML element (typically TabUE) and converts to PDF
 */
export async function generateEtichettaPDF(
    element: HTMLElement,
    fileName: string = 'scheda_etichetta.pdf'
): Promise<void> {
    try {
        // Capture HTML element as canvas
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
        });

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const doc = new jsPDF({
            orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let height = imgHeight;
        let position = 0;

        // Add image, handling multi-page if necessary
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);

        // Handle overflow to multiple pages
        while (height > pageHeight) {
            position -= pageHeight;
            height -= pageHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        }

        doc.save(fileName);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Errore nella generazione del PDF');
    }
}
