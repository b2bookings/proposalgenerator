/**
 * SG Document Generator — Azure Function
 * Route: POST /api/generate-document
 *
 * Accepts: { docType, formData, pastedText, fileContents[] }
 * Returns: branded .docx binary (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 *
 * Flow:
 *   1. Receive form data + any extracted file text from the frontend
 *   2. Call Claude API to generate a structured JSON config
 *   3. Pass that config into the appropriate docx builder (proposal / assessment / project)
 *   4. Return the .docx binary as a download
 */

const https  = require('https');
const path   = require('path');
const fs     = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, ImageRun, LevelFormat, TabStopType, TabStopPosition, SimpleField
} = require('docx');

const API_KEY  = process.env.ANTHROPIC_API_KEY;
const LOGO     = fs.readFileSync(path.join(__dirname, 'sg_logo.png'));

// ── Colors ────────────────────────────────────────────────────────────────────
const BLUE  = '2B579A';
const LBLUE = 'D5E8F0';
const GRAY  = '333333';
const WHITE = 'FFFFFF';
const BGRAY = 'CCCCCC';
const LGRAY = 'F2F2F2';

// ── Shared helpers ─────────────────────────────────────────────────────────────
const sp  = (before = 0, after = 120) => ({ before, after });
const cb  = { style: BorderStyle.SINGLE, size: 1, color: BGRAY };
const brd = { top: cb, bottom: cb, left: cb, right: cb };
const nb  = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: nb, bottom: nb, left: nb, right: nb };
const mg  = { top: 80, bottom: 80, left: 120, right: 120 };
const fmt = n => n != null && n !== 0 ? '$' + Number(n).toLocaleString('en-US') : '[TBD]';
const annual = n => n != null ? n * 12 : null;

function blueBar(text, size = 16) {
  return new Paragraph({
    spacing: sp(240, 120),
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 4 } },
    children: [new TextRun({ text, bold: true, size: size * 2, color: BLUE, font: 'Calibri' })]
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: sp(0, 120),
    children: [new TextRun({ text: text || '', size: 22, color: GRAY, font: 'Calibri', ...opts })]
  });
}
function bullet(text) {
  return new Paragraph({
    spacing: sp(0, 80),
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text: text || '', size: 22, color: GRAY, font: 'Calibri' })]
  });
}
function spacer(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ spacing: sp(0, 0), children: [] }));
}
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function makeHeader(clientShortName, docLabel) {
  return new Header({
    children: [new Paragraph({
      spacing: sp(0, 60),
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 2 } },
      children: [
        new ImageRun({ data: LOGO, transformation: { width: 53, height: 44 }, type: 'png' }),
        new TextRun({ text: `   ${(clientShortName || '').toUpperCase()} | ${docLabel}`, size: 16, color: BLUE, font: 'Calibri' })
      ]
    })]
  });
}

function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      spacing: sp(60, 0),
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 2 } },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: '6239 S. East Street, Suite F, Indianapolis, IN 46227  |  (800) 465-8200  |  solutionmgt.com', size: 16, color: '666666', font: 'Calibri' }),
        new TextRun({ text: '\tPage ', size: 16, color: '666666', font: 'Calibri' }),
        new SimpleField('PAGE')
      ]
    })]
  });
}

function coverPage(cfg) {
  const c = cfg.client || {};
  const sg = cfg.sg_signer || {};
  return [
    ...spacer(2),
    new Paragraph({ spacing: sp(0, 200), children: [new ImageRun({ data: LOGO, transformation: { width: 120, height: 100 }, type: 'png' })] }),
    new Paragraph({ spacing: sp(0, 80), children: [new TextRun({ text: 'SOLUTION GROUP', bold: true, size: 52, color: BLUE, font: 'Calibri' })] }),
    new Paragraph({ spacing: sp(0, 240), children: [new TextRun({ text: cfg.proposal_title || cfg.document_title || 'Document', bold: true, size: 32, color: BLUE, font: 'Calibri' })] }),
    new Paragraph({ spacing: sp(0, 240), border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE } }, children: [] }),
    new Paragraph({ spacing: sp(200, 40), children: [new TextRun({ text: 'Prepared for:', bold: true, size: 20, color: GRAY, font: 'Calibri' })] }),
    new Paragraph({ spacing: sp(0, 40), children: [new TextRun({ text: c.name || '[Client]', bold: true, size: 28, color: BLUE, font: 'Calibri' })] }),
    new Paragraph({ spacing: sp(0, 40), children: [new TextRun({ text: c.address || '', size: 22, color: GRAY, font: 'Calibri' })] }),
    ...(c.site_contact ? [new Paragraph({ spacing: sp(0, 160), children: [new TextRun({ text: `${c.site_contact}  |  ${c.site_contact_title || ''}`, size: 22, color: GRAY, font: 'Calibri' })] })] : []),
    new Paragraph({ spacing: sp(0, 40), children: [new TextRun({ text: 'Prepared by:', bold: true, size: 20, color: GRAY, font: 'Calibri' })] }),
    new Paragraph({ spacing: sp(0, 40), children: [new TextRun({ text: `${sg.name || 'Solution Group'},  ${sg.title || ''}  —  Solution Group`, size: 22, color: GRAY, font: 'Calibri' })] }),
    new Paragraph({ spacing: sp(0, 40), children: [new TextRun({ text: `Date: ${cfg.proposal_date || cfg.date || new Date().toLocaleDateString()}`, size: 22, color: GRAY, font: 'Calibri' })] }),
    new Paragraph({ spacing: sp(0, 40), children: [new TextRun({ text: 'Valid for 30 days from date above.', size: 18, italic: true, color: '888888', font: 'Calibri' })] }),
    pb()
  ];
}

// ── PROPOSAL BUILDER ──────────────────────────────────────────────────────────
function buildProposal(cfg) {
  const pricing = cfg.pricing || {};
  const lineItems = pricing.line_items || [];

  const pricingHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({ borders: brd, width: { size: 5400, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ children: [new TextRun({ text: 'Service Component', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
      new TableCell({ borders: brd, width: { size: 1980, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Monthly', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
      new TableCell({ borders: brd, width: { size: 1980, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Annual', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
    ]
  });

  const pricingLineRows = lineItems.map((li, i) => new TableRow({
    children: [
      new TableCell({ borders: brd, width: { size: 5400, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ children: [new TextRun({ text: li.description || '', size: 20, color: GRAY, font: 'Calibri' })] })] }),
      new TableCell({ borders: brd, width: { size: 1980, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(li.monthly), size: 20, color: GRAY, font: 'Calibri' })] })] }),
      new TableCell({ borders: brd, width: { size: 1980, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(annual(li.monthly)), size: 20, color: GRAY, font: 'Calibri' })] })] }),
    ]
  }));

  const totalRow = new TableRow({
    children: [
      new TableCell({ borders: brd, width: { size: 5400, type: WidthType.DXA }, shading: { fill: LBLUE, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ children: [new TextRun({ text: 'Total Monthly Service Fee', bold: true, size: 22, color: BLUE, font: 'Calibri' })] })] }),
      new TableCell({ borders: brd, width: { size: 1980, type: WidthType.DXA }, shading: { fill: LBLUE, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(pricing.monthly_total), bold: true, size: 22, color: BLUE, font: 'Calibri' })] })] }),
      new TableCell({ borders: brd, width: { size: 1980, type: WidthType.DXA }, shading: { fill: LBLUE, type: ShadingType.CLEAR }, margins: mg,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(pricing.annual_total || annual(pricing.monthly_total)), bold: true, size: 22, color: BLUE, font: 'Calibri' })] })] }),
    ]
  });

  const children = [
    ...coverPage(cfg),
    blueBar('1. Proposal Introduction'), ...spacer(1),
    body(cfg.sections?.introduction || cfg.intro_text || ''),
    ...spacer(1),
    blueBar('2. Service Confirmation'), ...spacer(1),
    body(cfg.sections?.service_confirmation || cfg.service_confirmation_text || ''),
    ...spacer(1),
    blueBar('3. Commercial Summary'), ...spacer(1),
    new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [5400, 1980, 1980], rows: [pricingHeaderRow, ...pricingLineRows, totalRow] }),
    ...spacer(1),
    body('Fees adjust annually by the greater of 3% or the annualized regional CPI.', { italic: true }),
    body(`This proposal is valid for 30 days from the date above.`, { italic: true }),
    ...spacer(1),
    blueBar('4. Key Assumptions & Exclusions'), ...spacer(1),
    ...(cfg.assumptions_exclusions || []).map(bullet),
    ...spacer(1),
    blueBar('5. Next Steps'), ...spacer(1),
    ...(cfg.next_steps || []).map(bullet),
    ...spacer(1),
    body('We look forward to moving forward on your timeline.'),
  ];

  return new Document({
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 900, left: 1080 } } },
      headers: { default: makeHeader(cfg.client?.short_name, cfg.proposal_title || 'Executive Service Proposal') },
      footers: { default: makeFooter() },
      children
    }]
  });
}

// ── ASSESSMENT BUILDER ────────────────────────────────────────────────────────
function buildAssessment(cfg) {
  const c = cfg.client || {};
  const site = cfg.site_overview || {};
  const regs = cfg.regulatory || {};
  const systems = cfg.systems || [];
  const sm = cfg.staffing_model || {};
  const mon = cfg.monitoring || {};
  const recs = cfg.recommendations || {};

  function hdrCell(text, width) {
    return new TableCell({ borders: brd, width: { size: width, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg,
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] });
  }
  function bodyCell(text, width, fill = WHITE) {
    return new TableCell({ borders: brd, width: { size: width, type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR }, margins: mg,
      children: [new Paragraph({ children: [new TextRun({ text: text || '—', size: 20, color: GRAY, font: 'Calibri' })] })] });
  }

  const allRisks = systems.flatMap(sys => (sys.risks || []).map(r => ({
    system: sys.name,
    description: typeof r === 'string' ? r : r.description,
    severity: typeof r === 'string' ? 'Medium' : (r.severity || 'Medium'),
    business_impact: typeof r === 'string' ? null : r.business_impact,
  })));

  const allRecs = systems.flatMap(sys => sys.recommendations || []);
  const quickWins = allRecs.filter(r => r.priority?.toLowerCase().includes('quick'));
  const medTerm   = allRecs.filter(r => r.priority?.toLowerCase().includes('medium'));
  const major     = allRecs.filter(r => r.priority?.toLowerCase().includes('major'));

  function recTier(label, color, items) {
    if (!items.length) return [];
    return [
      new Paragraph({ spacing: sp(200, 60), children: [new TextRun({ text: label, bold: true, size: 24, color, font: 'Calibri' })] }),
      ...items.flatMap(r => [
        new Paragraph({ spacing: sp(80, 20), numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: r.action || r, bold: true, size: 22, color: GRAY, font: 'Calibri' })] }),
        ...(r.business_goal ? [new Paragraph({ spacing: sp(0, 100), children: [
          new TextRun({ text: '     Business goal: ', bold: true, size: 20, color, font: 'Calibri' }),
          new TextRun({ text: r.business_goal, size: 20, color: GRAY, font: 'Calibri' }),
        ]})] : []),
      ]),
      ...spacer(1),
    ];
  }

  const children = [
    ...coverPage(cfg),

    // S1 Executive Summary
    blueBar('1. Executive Summary'), ...spacer(1),
    body(cfg.executive_summary || '[Executive summary to be completed.]'),
    ...spacer(1), pb(),

    // S2 Site Overview
    blueBar('2. Site & Operations Overview'), ...spacer(1),
    ...(Object.entries({ 'Industry': site.industry, 'Operating Hours': site.operating_hours, 'Annual Production': site.annual_production, 'Primary Contact': c.site_contact }).map(([k, v]) =>
      v ? new Paragraph({ spacing: sp(0, 80), children: [new TextRun({ text: `${k}: `, bold: true, size: 22, color: BLUE, font: 'Calibri' }), new TextRun({ text: v, size: 22, color: GRAY, font: 'Calibri' })] }) : null
    ).filter(Boolean)),
    ...spacer(1), pb(),

    // S3 Regulatory
    blueBar('3. Regulatory & Compliance'), ...spacer(1),
    ...(regs.authority ? [new Paragraph({ spacing: sp(0, 80), children: [new TextRun({ text: 'Regulatory Authority: ', bold: true, size: 22, color: BLUE, font: 'Calibri' }), new TextRun({ text: regs.authority, size: 22, color: GRAY, font: 'Calibri' })] })] : []),
    ...(regs.permit_number ? [new Paragraph({ spacing: sp(0, 80), children: [new TextRun({ text: 'Permit Number: ', bold: true, size: 22, color: BLUE, font: 'Calibri' }), new TextRun({ text: regs.permit_number, size: 22, color: GRAY, font: 'Calibri' })] })] : []),
    body(regs.compliance_status || ''),
    ...spacer(1), pb(),

    // S4–S6 Systems
    ...systems.flatMap(sys => [
      blueBar(`4. ${sys.name} — System Assessment`), ...spacer(1),
      body(sys.current_state || ''),
      ...spacer(1),
      ...(sys.findings?.length ? [new Paragraph({ spacing: sp(160, 60), children: [new TextRun({ text: 'Key Findings', bold: true, size: 24, color: BLUE, font: 'Calibri' })] }), ...sys.findings.map(bullet)] : []),
      ...spacer(1),
    ]),

    // S7 Staffing
    blueBar('7. Operations & Maintenance Practices'), ...spacer(1),
    body(sm.current || '[Staffing model to be confirmed.]'),
    ...spacer(1), pb(),

    // S8 Risks
    blueBar('8. Risks, Deficiencies & Observations'), ...spacer(1),
    ...allRisks.flatMap(item => [
      new Paragraph({ spacing: sp(160, 40), children: [new TextRun({ text: item.description || '', bold: true, size: 22, color: BLUE, font: 'Calibri' })] }),
      new Paragraph({ spacing: sp(0, 40), children: [new TextRun({ text: `System: ${item.system}     Severity: `, size: 20, color: GRAY, font: 'Calibri' }), new TextRun({ text: item.severity, bold: true, size: 20, color: item.severity?.toLowerCase() === 'high' ? 'C0392B' : item.severity?.toLowerCase() === 'medium' ? 'E67E22' : '27AE60', font: 'Calibri' })] }),
      ...(item.business_impact ? [body(`Business Impact: ${item.business_impact}`, { size: 20 })] : []),
      ...spacer(1),
    ]),
    pb(),

    // S9 Recommendations
    blueBar('9. Recommendations'), ...spacer(1),
    ...recTier('Quick Wins  (0–60 days)', '27AE60', quickWins),
    ...recTier('Medium-Term Improvements  (60–180 days)', 'E67E22', medTerm),
    ...recTier('Major Projects', 'C0392B', major),
    ...(allRecs.length === 0 ? [body('Recommendations to be documented following site visit analysis.')] : []),

    // Closing
    new Paragraph({ spacing: sp(0, 120), border: { top: { style: BorderStyle.SINGLE, size: 6, color: BLUE } }, children: [] }),
    body(`This assessment provides ${c.short_name || 'your team'} with an operational baseline and actionable recommendations. Contact Solution Group at (800) 465-8200 or info@solutionmgt.com to discuss next steps.`, { italic: true }),
  ];

  return new Document({
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 900, left: 1080 } } },
      headers: { default: makeHeader(c.short_name, 'Site Assessment Report') },
      footers: { default: makeFooter() },
      children
    }]
  });
}

// ── PROJECT PROPOSAL BUILDER ──────────────────────────────────────────────────
function buildProject(cfg) {
  const pricing = cfg.pricing || {};
  const lineItems = pricing.line_items || [];
  const phases = cfg.implementation_phases || [];

  const pricingHeaderRow = new TableRow({ tableHeader: true, children: [
    new TableCell({ borders: brd, width: { size: 5040, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [new TextRun({ text: 'Activity / Description', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1080, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Qty', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1620, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Rate', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1620, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Amount', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
  ]});

  const pricingRows = lineItems.map((li, i) => new TableRow({ children: [
    new TableCell({ borders: brd, width: { size: 5040, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [new TextRun({ text: li.description || '', size: 20, color: GRAY, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1080, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: String(li.qty || '1'), size: 20, color: GRAY, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1620, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(li.rate), size: 20, color: GRAY, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1620, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(li.amount), size: 20, color: GRAY, font: 'Calibri' })] })] }),
  ]}));

  const totalRow = new TableRow({ children: [
    new TableCell({ borders: brd, width: { size: 5040, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL PROJECT INVESTMENT', bold: true, size: 22, color: WHITE, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1080, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [] })] }),
    new TableCell({ borders: brd, width: { size: 1620, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [] })] }),
    new TableCell({ borders: brd, width: { size: 1620, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(pricing.total), bold: true, size: 22, color: WHITE, font: 'Calibri' })] })] }),
  ]});

  const scheduleHeaderRow = new TableRow({ tableHeader: true, children: [
    new TableCell({ borders: brd, width: { size: 3120, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [new TextRun({ text: 'Phase', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 4680, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [new TextRun({ text: 'Key Activities', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1560, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Est. Duration', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })] }),
  ]});

  const scheduleRows = phases.map((ph, i) => new TableRow({ children: [
    new TableCell({ borders: brd, width: { size: 3120, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [new TextRun({ text: ph.name || '', bold: true, size: 20, color: GRAY, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 4680, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ children: [new TextRun({ text: ph.activities || '', size: 20, color: GRAY, font: 'Calibri' })] })] }),
    new TableCell({ borders: brd, width: { size: 1560, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? WHITE : LGRAY, type: ShadingType.CLEAR }, margins: mg, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: ph.duration || '', size: 20, color: GRAY, font: 'Calibri' })] })] }),
  ]}));

  const children = [
    ...coverPage(cfg),
    blueBar('1. Executive Summary'), ...spacer(1), body(cfg.executive_summary || ''), ...spacer(1), pb(),
    blueBar('2. Project Scope'), ...spacer(1),
    ...(cfg.in_scope?.length ? [new Paragraph({ spacing: sp(120, 60), children: [new TextRun({ text: 'In-Scope Deliverables', bold: true, size: 24, color: BLUE, font: 'Calibri' })] }), ...cfg.in_scope.map(bullet)] : []),
    ...spacer(1),
    ...(cfg.out_of_scope?.length ? [new Paragraph({ spacing: sp(120, 60), children: [new TextRun({ text: 'Out of Scope', bold: true, size: 24, color: BLUE, font: 'Calibri' })] }), ...cfg.out_of_scope.map(bullet)] : []),
    ...spacer(1), pb(),
    blueBar('3. System Architecture'), ...spacer(1), body(cfg.system_architecture || ''), ...spacer(1), pb(),
    ...(cfg.site_specific ? [blueBar('4. Site-Specific Technical Notes'), ...spacer(1), body(cfg.site_specific), ...spacer(1), pb()] : []),
    blueBar('5. Implementation Schedule'), ...spacer(1),
    ...(scheduleRows.length ? [new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3120, 4680, 1560], rows: [scheduleHeaderRow, ...scheduleRows] })] : [body('[Schedule to be confirmed.]')]),
    ...spacer(1), pb(),
    blueBar('6. Pricing Summary'), ...spacer(1),
    new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [5040, 1080, 1620, 1620], rows: [pricingHeaderRow, ...pricingRows, totalRow] }),
    ...spacer(1),
    ...(cfg.pricing_notes || []).map(bullet),
    body('Payment: 50% deposit / 25% at mechanical completion / 25% at project handover.', { italic: true }),
    body('Pricing is valid for 30 days from proposal date.', { italic: true }),
    ...spacer(1), pb(),
    blueBar('7. Terms & Conditions'), ...spacer(1),
    body(`Warranty: ${cfg.warranty_duration || '6 months'} on equipment and installation; sensor calibration and reagent consumables excluded.`),
    body('Change Orders: Any changes to the agreed scope of work must be submitted in writing and approved by both parties prior to execution. Changes may affect project schedule and pricing.'),
    ...spacer(1),
    ...(cfg.assumptions_exclusions || []).map(bullet),
    ...spacer(1),
    body('Questions? Contact the Solution Group project team to discuss this proposal.'),
    pb(),
    blueBar('8. Proposal Acceptance'), ...spacer(1),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680],
      borders: { top: nb, bottom: nb, left: nb, right: nb, insideH: nb, insideV: nb },
      rows: [new TableRow({ children: [
        new TableCell({ borders: noBorders, width: { size: 4680, type: WidthType.DXA }, children: [
          new Paragraph({ children: [new TextRun({ text: cfg.client?.name || 'Client', bold: true, size: 22, color: BLUE, font: 'Calibri' })] }),
          ...['Signature: ___________________________', 'Print Name: __________________________', 'Title: _______________________________', 'Date: ________________________________'].map(l => body(l)),
        ]}),
        new TableCell({ borders: noBorders, width: { size: 4680, type: WidthType.DXA }, children: [
          new Paragraph({ children: [new TextRun({ text: 'Solution Group', bold: true, size: 22, color: BLUE, font: 'Calibri' })] }),
          ...['Signature: ___________________________', 'Print Name: __________________________', 'Title: _______________________________', 'Date: ________________________________'].map(l => body(l)),
        ]}),
      ]})]
    }),
  ];

  return new Document({
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 900, left: 1080 } } },
      headers: { default: makeHeader(cfg.client?.short_name, cfg.proposal_title || 'Project Proposal') },
      footers: { default: makeFooter() },
      children
    }]
  });
}

// ── Claude API call ───────────────────────────────────────────────────────────
function callClaude(messages, maxTokens = 4096) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages });
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.content.map(b => b.text || '').join('\n'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Config extraction prompts ─────────────────────────────────────────────────
function proposalConfigPrompt(formData, fileText) {
  return `You are a Solution Group proposal data extractor. Given this form data and any file content, return a JSON config object for building a branded executive proposal.

FORM DATA: ${JSON.stringify(formData)}
${fileText ? `FILE CONTENT:\n${fileText}` : ''}

Return ONLY valid JSON (no markdown, no preamble) matching this structure:
{
  "proposal_title": "string — e.g. 'Industrial Wastewater Monitoring & Services'",
  "proposal_date": "string — formatted date",
  "client": { "name": "full legal name", "short_name": "short name", "address": "address", "site_contact": "contact name", "site_contact_title": "title" },
  "sg_signer": { "name": "SG rep name", "title": "title", "phone": "phone", "email": "email" },
  "sections": {
    "introduction": "full paragraph for section 1",
    "service_confirmation": "full paragraph for section 2"
  },
  "pricing": {
    "monthly_total": number,
    "annual_total": number,
    "line_items": [{ "description": "string", "monthly": number }]
  },
  "assumptions_exclusions": ["bullet string", ...],
  "next_steps": ["bullet string", ...]
}

Be thorough. Extract everything available from the file content. Use [To be confirmed] for missing required fields.`;
}

function assessmentConfigPrompt(formData, fileText) {
  return `You are a Solution Group assessment data extractor. Given this form data and any file content, return a JSON config for building a branded site assessment report.

FORM DATA: ${JSON.stringify(formData)}
${fileText ? `FILE CONTENT:\n${fileText}` : ''}

Return ONLY valid JSON (no markdown, no preamble) matching this structure:
{
  "document_title": "Site Assessment Report",
  "date": "string",
  "client": { "name": "full name", "short_name": "short", "address": "address", "site_contact": "name", "site_contact_title": "title" },
  "sg_signer": { "name": "SG rep", "title": "title" },
  "executive_summary": "2-3 paragraph executive summary string",
  "site_overview": { "industry": "string", "operating_hours": "string", "annual_production": "string" },
  "regulatory": { "authority": "string", "permit_number": "string", "compliance_status": "string" },
  "systems": [{
    "name": "system name",
    "current_state": "description paragraph",
    "findings": ["finding string", ...],
    "risks": [{ "description": "string", "severity": "High|Medium|Low", "business_impact": "string" }],
    "recommendations": [{ "action": "string", "priority": "Quick Win|Medium-Term|Major Project", "business_goal": "string" }]
  }],
  "staffing_model": { "current": "string" },
  "monitoring": { "current": "string", "gaps": ["string"] }
}`;
}

function projectConfigPrompt(formData, fileText) {
  return `You are a Solution Group project proposal data extractor. Given this form data and any file content, return a JSON config for building a branded capital project proposal.

FORM DATA: ${JSON.stringify(formData)}
${fileText ? `FILE CONTENT:\n${fileText}` : ''}

Return ONLY valid JSON (no markdown, no preamble) matching this structure:
{
  "proposal_title": "project title string",
  "date": "string",
  "client": { "name": "full name", "short_name": "short", "address": "address", "site_contact": "name", "site_contact_title": "title" },
  "sg_signer": { "name": "SG rep", "title": "title" },
  "executive_summary": "2 paragraph string",
  "in_scope": ["bullet string", ...],
  "out_of_scope": ["bullet string", ...],
  "system_architecture": "multi-paragraph technical description",
  "site_specific": "site-specific technical notes or null",
  "implementation_phases": [{ "name": "Phase 1 – Engineering", "activities": "description", "duration": "3 weeks" }],
  "pricing": {
    "total": number,
    "line_items": [{ "description": "string", "qty": "string", "rate": number, "amount": number }]
  },
  "pricing_notes": ["bullet string"],
  "warranty_duration": "6 months",
  "assumptions_exclusions": ["bullet string", ...]
}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (!API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' }); return;
  }

  try {
    const { docType, formData, fileContents } = req.body;
    const fileText = (fileContents || []).join('\n\n---\n\n');

    // 1. Get the right prompt
    let prompt;
    if (docType === 'proposal')   prompt = proposalConfigPrompt(formData, fileText);
    else if (docType === 'assessment') prompt = assessmentConfigPrompt(formData, fileText);
    else if (docType === 'project')    prompt = projectConfigPrompt(formData, fileText);
    else throw new Error(`Unknown docType: ${docType}`);

    // 2. Call Claude → get JSON config
    const raw = await callClaude([{ role: 'user', content: prompt }], 4096);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude did not return valid JSON config.');
    const cfg = JSON.parse(jsonMatch[0]);

    // 3. Build the docx
    let doc;
    if (docType === 'proposal')        doc = buildProposal(cfg);
    else if (docType === 'assessment') doc = buildAssessment(cfg);
    else                               doc = buildProject(cfg);

    const buffer = await Packer.toBuffer(doc);

    const client = (cfg.client?.short_name || cfg.client?.name || 'Client').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const label   = docType === 'proposal' ? 'Proposal' : docType === 'assessment' ? 'Assessment' : 'Project_Proposal';
    const filename = `${client}_${label}_${dateStr}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
