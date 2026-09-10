import type { LabelData } from '../calculators/EtichetteCalc/EtichetteCalc';

/** GS1-like product data structure (subset of GS1 3.1 / GPC standard) */
interface GS1Product {
    gtin: string;
    brandName: string;
    descriptionShort: string;
    descriptionLong: string;
    netContent: string;
    ingredients: string;
    allergens: string[];
    manufacturer: {
        name: string;
        address: string;
    };
    countryOfOrigin: string;
    storageInstructions: string;
    nutritionClaims: string[];
    packagingMarking: { description: string; code: string; recycling: string }[];
    labelReference: {
        code: string;
        revision: string;
        revisionDate: string;
    };
}

function buildGS1(data: LabelData): GS1Product {
    const allergenList = data.allergens
        ? data.allergens.split(/[,;]+/).map(a => a.trim()).filter(Boolean)
        : [];

    return {
        gtin: data.codeValue ?? '',
        brandName: data.producer,
        descriptionShort: data.productName,
        descriptionLong: data.legalDenomination || data.productName,
        netContent: data.netWeight,
        ingredients: data.ingredients,
        allergens: allergenList,
        manufacturer: {
            name: data.producer,
            address: [data.address, data.legalAddress].filter(Boolean).join(', '),
        },
        countryOfOrigin: data.countryOrigin,
        storageInstructions: data.storageConditions,
        nutritionClaims: data.claimsSelezionati ?? [],
        packagingMarking: (data.imballi ?? []).map(i => ({
            description: i.descrizione,
            code: i.codice,
            recycling: i.raccolta,
        })),
        labelReference: {
            code: data.schedaCodice,
            revision: data.schedaRevisione,
            revisionDate: data.schedaDataRevisione,
        },
    };
}

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportGS1Json(data: LabelData): void {
    const product = buildGS1(data);
    const blob = new Blob([JSON.stringify(product, null, 2)], { type: 'application/json' });
    const name = (data.productName || 'prodotto').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    triggerDownload(blob, `gs1_${name}_${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportGS1Xml(data: LabelData): void {
    const p = buildGS1(data);

    const escape = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const allergensXml = p.allergens.map(a => `    <allergen>${escape(a)}</allergen>`).join('\n');
    const claimsXml = p.nutritionClaims.map(c => `    <claim>${escape(c)}</claim>`).join('\n');
    const imballi = p.packagingMarking
        .map(i =>
            `    <packagingMarking>\n` +
            `      <description>${escape(i.description)}</description>\n` +
            `      <code>${escape(i.code)}</code>\n` +
            `      <recycling>${escape(i.recycling)}</recycling>\n` +
            `    </packagingMarking>`
        ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gs1Product>
  <gtin>${escape(p.gtin)}</gtin>
  <brandName>${escape(p.brandName)}</brandName>
  <descriptionShort>${escape(p.descriptionShort)}</descriptionShort>
  <descriptionLong>${escape(p.descriptionLong)}</descriptionLong>
  <netContent>${escape(p.netContent)}</netContent>
  <ingredients>${escape(p.ingredients)}</ingredients>
  <allergens>
${allergensXml}
  </allergens>
  <manufacturer>
    <name>${escape(p.manufacturer.name)}</name>
    <address>${escape(p.manufacturer.address)}</address>
  </manufacturer>
  <countryOfOrigin>${escape(p.countryOfOrigin)}</countryOfOrigin>
  <storageInstructions>${escape(p.storageInstructions)}</storageInstructions>
  <nutritionClaims>
${claimsXml}
  </nutritionClaims>
  <packagingMarkings>
${imballi}
  </packagingMarkings>
  <labelReference>
    <code>${escape(p.labelReference.code)}</code>
    <revision>${escape(p.labelReference.revision)}</revision>
    <revisionDate>${escape(p.labelReference.revisionDate)}</revisionDate>
  </labelReference>
</gs1Product>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const name = (data.productName || 'prodotto').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    triggerDownload(blob, `gs1_${name}_${new Date().toISOString().slice(0, 10)}.xml`);
}
