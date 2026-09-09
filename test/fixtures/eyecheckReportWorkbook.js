import { zipSync, strToU8 } from 'fflate';
import { buildTextCell } from '../../src/utils/xlsxSheetXml.js';

export function reportWorkbookBytes() {
  const row = (r, vals) =>
    `<row r="${r}">${Object.entries(vals)
      .map(([col, value]) => buildTextCell(`${col}${r}`, null, value))
      .join('')}</row>`;
  const sheet = (rows) =>
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
  const parts = {
    '[Content_Types].xml':
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
    '_rels/.rels':
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="점등장비" sheetId="1" r:id="rId1"/><sheet name="소등장비" sheetId="2" r:id="rId2"/><sheet name="전자_Eyecheck" sheetId="3" r:id="rId3"/></sheets><calcPr calcId="1"/></workbook>',
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${[1, 2, 3].map((n) => `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`).join('')}</Relationships>`,
    'xl/worksheets/sheet1.xml': sheet(
      row(1, { A: 'Check Date' }) +
        row(2, { C: 'Hostname', D: '위치', L: '담당자' }) +
        row(3, {
          A: '2026-09-09',
          C: 'TEST-HOST-01',
          D: 'SA3A-1',
          I: '주황 점등',
          L: '테스트 책임',
        }) +
        row(4, {
          A: '2026-09-09',
          C: 'TEST-HOST-02',
          D: 'SA3A-2',
          I: '빨강 점등',
          L: '테스트 책임',
        })
    ),
    'xl/worksheets/sheet2.xml': sheet(
      row(1, { A: 'Check Date' }) + row(2, { C: 'Hostname' })
    ),
    'xl/worksheets/sheet3.xml': sheet(
      row(26, { B: '점검대상', C: '점 검 내 역', O: '점검대상' }) +
        row(27, { B: '3A 구역', O: 'A-1,2' })
    ),
  };
  return zipSync(
    Object.fromEntries(
      Object.entries(parts).map(([key, value]) => [key, strToU8(value)])
    )
  );
}
