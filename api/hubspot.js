/**
 * SG Document Generator — HubSpot Integration
 * Route: POST /api/hubspot
 *
 * Creates or finds a contact, creates a deal, and associates them.
 * Called silently after document generation — never blocks the download.
 */

const https = require('https');

const HUBSPOT_TOKEN = process.env.HUBSPOT_API_KEY;

const PIPELINES = {
  Project:     { pipelineId: '2277462760', stageId: '3670652607' },
  Reoccurring: { pipelineId: '2276783856', stageId: '3669908170' },
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
          if (res.statusCode >= 400) {
            reject(new Error(`HubSpot ${res.statusCode}: ${parsed.message || data}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`HubSpot parse error: ${data}`));
        }
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

  // Search for existing contact by email
  try {
    const search = await hubspotRequest('POST', '/crm/v3/objects/contacts/search', {
      filterGroups: [{
        filters: [{ propertyName: 'email', operator: 'EQ', value: email }]
      }],
      properties: ['email', 'firstname', 'lastname'],
      limit: 1,
    });

    if (search.results?.length > 0) {
      return search.results[0].id;
    }
  } catch (e) {
    // If search fails, try to create anyway
  }

  // Create new contact
  const contact = await hubspotRequest('POST', '/crm/v3/objects/contacts', {
    properties: {
      email,
      firstname: firstName || '',
      lastname: lastName || '',
    },
  });
  return contact.id;
}

// ── Find HubSpot owner by email ───────────────────────────────────────────────
async function findOwnerByEmail(email) {
  if (!email) return null;
  try {
    const result = await hubspotRequest('GET', `/crm/v3/owners/?email=${encodeURIComponent(email)}&limit=1`);
    if (result.results?.length > 0) return result.results[0].id;
  } catch (e) {}
  return null;
}

// ── Generate deal name ────────────────────────────────────────────────────────
function buildDealName(clientName, docType, projectTitle) {
  if (projectTitle) {
    // Use first 4-5 words of project title as descriptor
    const words = projectTitle.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 4).join(' ');
    return `${clientName} - ${words}`;
  }
  const descriptor = docType === 'project' ? 'Capital Project'
    : docType === 'proposal' ? 'O&M Services'
    : 'Assessment';
  return `${clientName} - ${descriptor}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (!HUBSPOT_TOKEN) {
    res.status(500).json({ error: 'HUBSPOT_API_KEY not configured.' }); return;
  }

  try {
    const {
      docType,
      clientName,
      clientShortName,
      projectTitle,
      pipeline,           // "Project" or "Reoccurring"
      dealAmount,
      closeDate,
      closeProbability,
      sgContactName,
      sgContactEmail,
      customerContactName,
      customerContactEmail,
    } = req.body;

    const pipelineConfig = PIPELINES[pipeline] || PIPELINES['Reoccurring'];

    // 1. Find or create customer contact
    const nameParts = (customerContactName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';
    const contactId = await findOrCreateContact(customerContactEmail, firstName, lastName);

    // 2. Find SG owner ID in HubSpot
    const ownerId = await findOwnerByEmail(sgContactEmail);

    // 3. Build deal name
    const effectiveClientName = clientName || clientShortName || 'Unknown Client';
    const dealName = buildDealName(effectiveClientName, docType, projectTitle);

    // 4. Parse deal amount — strip $ and commas
    const amountNum = dealAmount
      ? parseFloat(String(dealAmount).replace(/[$,]/g, '')) || undefined
      : undefined;

    // 5. Create the deal
    const dealProps = {
      dealname:    dealName,
      pipeline:    pipelineConfig.pipelineId,
      dealstage:   pipelineConfig.stageId,
      ...(amountNum    ? { amount: amountNum }           : {}),
      ...(closeDate    ? { closedate: new Date(closeDate).getTime().toString() } : {}),
      ...(closeProbability ? { hs_deal_stage_probability: String(closeProbability / 100) } : {}),
      ...(ownerId      ? { hubspot_owner_id: ownerId }   : {}),
    };

    const deal = await hubspotRequest('POST', '/crm/v3/objects/deals', {
      properties: dealProps,
    });

    // 6. Associate contact to deal
    if (contactId && deal.id) {
      await hubspotRequest(
        'PUT',
        `/crm/v3/objects/deals/${deal.id}/associations/contacts/${contactId}/deal_to_contact`,
        {}
      );
    }

    res.status(200).json({
      success: true,
      dealId: deal.id,
      dealName,
      contactId,
    });

  } catch (err) {
    console.error('HubSpot error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
