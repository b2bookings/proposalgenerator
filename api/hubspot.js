/**
 * SG Document Generator — HubSpot Integration
 * Route: POST /api/hubspot
 *
 * - Creates or finds contact
 * - Creates deal on first generation, updates on revision (no duplicates)
 * - Attaches the generated .docx to the deal record
 * - Returns dealId so the frontend can pass it back on revisions
 */

const https  = require('https');
const http   = require('http');
const FormData = require('form-data');

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY;

const PIPELINES = {
  Project:     { pipelineId: '2277462760', stageId: '3670652607' },
  Reoccurring: { pipelineId: '2276783856', stageId: '3669908170' },
};

// ── JSON request helper ───────────────────────────────────────────────────────
function hubspotRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.hubapi.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(`HubSpot ${res.statusCode}: ${parsed.message || data}`));
          else resolve(parsed);
        } catch(e) { reject(new Error(`HubSpot parse error: ${data}`)); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Multipart file upload helper ──────────────────────────────────────────────
function hubspotUpload(fileBuffer, filename, folderId) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Date.now()}`;
    const fileMetadata = JSON.stringify({ access: 'PRIVATE', ...(folderId ? { folderId } : { folderPath: '/proposal-generator' }) });

    // Build multipart body manually (no external form-data lib needed)
    const nl = '\r\n';
    const metaPart = `--${boundary}${nl}Content-Disposition: form-data; name="options"${nl}Content-Type: application/json${nl}${nl}${fileMetadata}${nl}`;
    const filePart  = `--${boundary}${nl}Content-Disposition: form-data; name="file"; filename="${filename}"${nl}Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document${nl}${nl}`;
    const closing   = `${nl}--${boundary}--${nl}`;

    const metaBuf  = Buffer.from(metaPart, 'utf8');
    const fileBuf  = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer, 'base64');
    const closeBuf = Buffer.from(closing, 'utf8');
    const fileHead = Buffer.from(filePart, 'utf8');

    const body = Buffer.concat([metaBuf, fileHead, fileBuf, closeBuf]);

    const options = {
      hostname: 'api.hubapi.com',
      path: '/files/v3/files',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(`File upload ${res.statusCode}: ${parsed.message || data}`));
          else resolve(parsed);
        } catch(e) { reject(new Error(`File upload parse error: ${data}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Find or create contact ────────────────────────────────────────────────────
async function findOrCreateContact(email, firstName, lastName) {
  if (!email) return null;
  try {
    const search = await hubspotRequest('POST', '/crm/v3/objects/contacts/search', {
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
      properties: ['email', 'firstname', 'lastname'],
      limit: 1,
    });
    if (search.results?.length > 0) return search.results[0].id;
  } catch(e) {}

  const contact = await hubspotRequest('POST', '/crm/v3/objects/contacts', {
    properties: { email, firstname: firstName || '', lastname: lastName || '' },
  });
  return contact.id;
}

// ── Find HubSpot owner by email ───────────────────────────────────────────────
async function findOwnerByEmail(email) {
  if (!email) return null;
  try {
    const result = await hubspotRequest('GET', `/crm/v3/owners/?email=${encodeURIComponent(email)}&limit=1`);
    if (result.results?.length > 0) return result.results[0].id;
  } catch(e) {}
  return null;
}

// ── Find existing deal by ID (for updates) ────────────────────────────────────
async function findDealById(dealId) {
  if (!dealId) return null;
  try {
    const result = await hubspotRequest('GET', `/crm/v3/objects/deals/${dealId}`);
    return result?.id ? result : null;
  } catch(e) { return null; }
}

// ── Deal name builder ─────────────────────────────────────────────────────────
function buildDealName(clientName, docType, projectTitle) {
  if (projectTitle) {
    const words = projectTitle.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 4).join(' ');
    return `${clientName} - ${words}`;
  }
  const descriptor = docType === 'project' ? 'Capital Project' : 'O&M Services';
  return `${clientName} - ${descriptor}`;
}

// ── Attach file to deal as a note with link ───────────────────────────────────
async function attachFileToDeal(dealId, fileId, fileUrl, filename) {
  try {
    // Create an engagement (note) on the deal with the file reference
    await hubspotRequest('POST', '/engagements/v1/engagements', {
      engagement: { active: true, type: 'NOTE' },
      associations: { dealIds: [parseInt(dealId)] },
      metadata: {
        body: `<b>Proposal Document:</b> <a href="${fileUrl}">${filename}</a><br/>Generated by SG Document Generator.`,
      },
      attachments: [{ id: fileId }],
    });
  } catch(e) {
    // Fallback: try v3 notes API
    try {
      await hubspotRequest('POST', '/crm/v3/objects/notes', {
        properties: {
          hs_note_body: `Proposal document attached: ${filename} (File ID: ${fileId})`,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [{
          to: { id: dealId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }],
        }],
      });
    } catch(e2) {
      console.warn('Note attachment failed:', e2.message);
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (!HUBSPOT_TOKEN) { res.status(500).json({ error: 'HUBSPOT_API_KEY not configured.' }); return; }

  try {
    const {
      docType,
      clientName,
      clientShortName,
      projectTitle,
      pipeline,
      dealAmount,
      closeDate,
      closeProbability,
      sgContactName,
      sgContactEmail,
      customerContactName,
      customerContactEmail,
      existingDealId,     // passed on revisions to update instead of create
      docBase64,          // base64-encoded .docx for attachment
      filename,           // filename for the attachment
    } = req.body;

    const pipelineConfig = PIPELINES[pipeline] || PIPELINES['Reoccurring'];
    const effectiveClientName = clientName || clientShortName || 'Unknown Client';
    const dealName = buildDealName(effectiveClientName, docType, projectTitle);

    const amountNum = dealAmount
      ? parseFloat(String(dealAmount).replace(/[$,]/g, '')) || undefined
      : undefined;

    const dealProps = {
      dealname:  dealName,
      pipeline:  pipelineConfig.pipelineId,
      dealstage: pipelineConfig.stageId,
      ...(amountNum        ? { amount: amountNum } : {}),
      ...(closeDate        ? { closedate: new Date(closeDate).getTime().toString() } : {}),
      ...(closeProbability ? { hs_deal_stage_probability: String(closeProbability / 100) } : {}),
    };

    let dealId;
    let isNew = false;

    // ── Create or update deal ──
    const existingDeal = await findDealById(existingDealId);

    if (existingDeal) {
      // Update existing deal with latest fields
      await hubspotRequest('PATCH', `/crm/v3/objects/deals/${existingDealId}`, {
        properties: dealProps,
      });
      dealId = existingDealId;
    } else {
      // Find owner and create new deal
      const ownerId = await findOwnerByEmail(sgContactEmail);
      if (ownerId) dealProps.hubspot_owner_id = ownerId;

      const deal = await hubspotRequest('POST', '/crm/v3/objects/deals', { properties: dealProps });
      dealId = deal.id;
      isNew = true;

      // Associate contact to new deal
      const nameParts = (customerContactName || '').trim().split(/\s+/);
      const contactId = await findOrCreateContact(customerContactEmail, nameParts[0] || '', nameParts.slice(1).join(' ') || '');
      if (contactId) {
        try {
          await hubspotRequest(
            'PUT',
            `/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
            {}
          );
        } catch(e) { console.warn('Contact association failed:', e.message); }
      }
    }

    // ── Upload and attach document ──
    let fileId = null;
    let fileUrl = null;
    if (docBase64 && filename && dealId) {
      try {
        const fileBuffer = Buffer.from(docBase64, 'base64');
        const uploaded = await hubspotUpload(fileBuffer, filename);
        fileId  = uploaded.id;
        fileUrl = uploaded.url || uploaded.defaultUrl || '';
        await attachFileToDeal(dealId, fileId, fileUrl, filename);
      } catch(e) {
        console.warn('File attachment failed (non-blocking):', e.message);
      }
    }

    res.status(200).json({
      success: true,
      dealId,
      dealName,
      isNew,
      fileId,
    });

  } catch(err) {
    console.error('HubSpot error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
