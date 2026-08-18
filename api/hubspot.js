/**
 * SG Document Generator — HubSpot Integration
 * Route: POST /api/hubspot
 */

const https = require('https');

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY;

const PIPELINES = {
  Project:   { pipelineId: '2277462760', stageId: '3670652607' },
  Recurring: { pipelineId: '2276783856', stageId: '3669908170' },
};

// ── Config ────────────────────────────────────────────────────────────────────
module.exports.config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

// ── HTTP helper ───────────────────────────────────────────────────────────────
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
  } catch(e) { console.log('Contact search failed, will try create:', e.message); }

  try {
    const contact = await hubspotRequest('POST', '/crm/v3/objects/contacts', {
      properties: { email, firstname: firstName || '', lastname: lastName || '' },
    });
    return contact.id;
  } catch(e) {
    console.warn('Contact create failed:', e.message);
    return null;
  }
}

// ── Find HubSpot owner by email ───────────────────────────────────────────────
async function findOwnerByEmail(email) {
  if (!email) return null;
  try {
    const result = await hubspotRequest('GET', `/crm/v3/owners/?email=${encodeURIComponent(email)}&limit=1`);
    if (result.results?.length > 0) return result.results[0].id;
  } catch(e) { console.warn('Owner lookup failed:', e.message); }
  return null;
}

// ── Find existing deal ────────────────────────────────────────────────────────
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
  return `${clientName} - ${docType === 'project' ? 'Capital Project' : 'O&M Services'}`;
}

// ── File upload ───────────────────────────────────────────────────────────────
async function uploadAndAttachFile(dealId, docBase64, filename) {
  if (!docBase64 || !dealId) return null;
  try {
    const fileBuffer = Buffer.from(docBase64, 'base64');
    const boundary = `----Boundary${Date.now()}`;
    const nl = '\r\n';

    // Upload to HubSpot Files — PUBLIC_NOT_INDEXABLE so it can be linked from deal
    const meta = JSON.stringify({ access: 'PUBLIC_NOT_INDEXABLE', folderPath: '/proposal-generator', overwrite: false });
    const metaPart = `--${boundary}${nl}Content-Disposition: form-data; name="options"${nl}Content-Type: application/json${nl}${nl}${meta}${nl}`;
    const fileHead = `--${boundary}${nl}Content-Disposition: form-data; name="file"; filename="${filename}"${nl}Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document${nl}${nl}`;
    const closing  = `${nl}--${boundary}--${nl}`;
    const body = Buffer.concat([Buffer.from(metaPart), Buffer.from(fileHead), fileBuffer, Buffer.from(closing)]);

    const uploaded = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.hubapi.com', path: '/files/v3/files', method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      };
      const req = https.request(options, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const p = JSON.parse(data);
            if (res.statusCode >= 400) reject(new Error(`Upload ${res.statusCode}: ${p.message || data}`));
            else resolve(p);
          } catch(e) { reject(new Error(`Upload parse: ${data.slice(0, 200)}`)); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    console.log('File uploaded to HubSpot:', uploaded.id, uploaded.url);

    // Attach to deal via Engagements API (shows as attachment on deal record)
    await hubspotRequest('POST', '/engagements/v1/engagements', {
      engagement: {
        active: true,
        type: 'NOTE',
        timestamp: Date.now(),
      },
      associations: {
        dealIds: [Number(dealId)],
        contactIds: [],
        companyIds: [],
        ownerIds: [],
      },
      metadata: {
        body: `<p><strong>Generated Proposal Document</strong></p><p><a href="${uploaded.url}">${filename}</a></p>`,
      },
      attachments: [{ id: Number(uploaded.id) }],
    });

    console.log('File attached to deal:', dealId);
    return uploaded.id;
  } catch(e) {
    console.warn('File upload/attach failed:', e.message);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (!HUBSPOT_TOKEN) {
    console.error('HUBSPOT_API_KEY not set');
    res.status(500).json({ error: 'HUBSPOT_API_KEY not configured.' });
    return;
  }

  try {
    const body = req.body;
    console.log('HubSpot request received, docType:', body.docType, 'attachOnly:', body.attachOnly, 'existingDealId:', body.existingDealId);

    const {
      docType, clientName, clientShortName, projectTitle,
      pipeline, dealAmount, closeDate, closeProbability,
      sgContactName, sgContactEmail, customerContactName, customerContactEmail,
      existingDealId, docBase64, filename, attachOnly,
      managementCost, equipmentCost, laborCost, technologyCost,
      projectLengthDays, contractLengthDays,
    } = body;

    // ── ATTACH ONLY MODE ──
    if (attachOnly && existingDealId) {
      console.log('Attach-only mode for deal:', existingDealId);
      const fileId = await uploadAndAttachFile(existingDealId, docBase64, filename);
      res.status(200).json({ success: true, fileId });
      return;
    }

    // ── Correct pipeline routing ──
    const pipelineConfig = pipeline === 'Project' ? PIPELINES['Project'] : PIPELINES['Recurring'];
    const effectiveClientName = clientName || clientShortName || 'Unknown Client';
    const dealName = buildDealName(effectiveClientName, docType, projectTitle);

    const parseCost = v => v ? parseFloat(String(v).replace(/[$,]/g, '')) || undefined : undefined;
    const amountNum = dealAmount ? parseFloat(String(dealAmount).replace(/[$,]/g, '')) || undefined : undefined;

    const addDays = (dateStr, days) => {
      if (!dateStr || !days) return undefined;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return undefined;
      d.setDate(d.getDate() + Number(days));
      return String(d.getTime());
    };

    const dealProps = {
      dealname:  dealName,
      pipeline:  pipelineConfig.pipelineId,
      dealstage: pipelineConfig.stageId,
      ...(amountNum        ? { amount: String(amountNum) }                         : {}),
      ...(closeDate        ? { closedate: String(new Date(closeDate).getTime()) }  : {}),
      ...(closeProbability ? { hs_deal_stage_probability: String(Number(closeProbability) / 100) } : {}),
      ...(parseCost(managementCost) ? { management_cost: String(parseCost(managementCost)) }  : {}),
      ...(parseCost(equipmentCost)  ? { equipment_cost:  String(parseCost(equipmentCost))  }  : {}),
      ...(parseCost(laborCost)      ? { labor_cost:      String(parseCost(laborCost))      }  : {}),
      ...(parseCost(technologyCost) ? { technology_cost: String(parseCost(technologyCost)) }  : {}),
      ...(pipeline === 'Project' && projectLengthDays && closeDate
        ? { estimated_project_end_date: addDays(closeDate, projectLengthDays) } : {}),
      ...(pipeline === 'Recurring' && contractLengthDays && closeDate
        ? { estimated_contract_end_date: addDays(closeDate, contractLengthDays) } : {}),
    };

    let dealId;
    let isNew = false;

    const existingDeal = await findDealById(existingDealId);

    if (existingDeal) {
      console.log('Updating existing deal:', existingDealId);
      await hubspotRequest('PATCH', `/crm/v3/objects/deals/${existingDealId}`, { properties: dealProps });
      dealId = existingDealId;
    } else {
      console.log('Creating new deal:', dealName);
      const ownerId = await findOwnerByEmail(sgContactEmail);
      if (ownerId) dealProps.hubspot_owner_id = ownerId;

      const deal = await hubspotRequest('POST', '/crm/v3/objects/deals', { properties: dealProps });
      dealId = deal.id;
      isNew = true;
      console.log('Deal created:', dealId);

      // Associate contact
      const nameParts = (customerContactName || '').trim().split(/\s+/);
      const contactId = await findOrCreateContact(customerContactEmail, nameParts[0] || '', nameParts.slice(1).join(' ') || '');
      if (contactId && dealId) {
        try {
          await hubspotRequest('PUT', `/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`, {});
          console.log('Contact associated:', contactId);
        } catch(e) { console.warn('Contact association failed:', e.message); }
      }
    }

    res.status(200).json({ success: true, dealId, dealName, isNew });

  } catch(err) {
    console.error('HubSpot error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
};
