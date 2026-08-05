import { useState, useRef, useEffect } from "react";

const SG_BLUE = "#2B579A";
const SG_LIGHT = "#D5E8F0";
const SG_TEAL = "#4FA8A0";
const SG_DARK_GRAY = "#333333";
const SG_LIGHT_GRAY = "#F2F2F2";
const SG_BORDER_GRAY = "#CCCCCC";
import SG_LOGO from "./sg_logo.png";


const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #F2F5FA; color: #333333; }

  .header {
    background: #1a3a6b;
    padding: 0 40px;
    display: flex; align-items: center; gap: 20px;
    height: 68px;
    border-bottom: 4px solid ${SG_TEAL};
    box-shadow: 0 2px 12px rgba(0,0,0,0.18);
  }
  .header-logo-wrap {
    background: white;
    border-radius: 6px;
    padding: 5px 10px;
    display: flex; align-items: center; justify-content: center;
    height: 48px;
    flex-shrink: 0;
  }
  .header-logo-img { height: 36px; width: auto; display: block; }
  .header-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.25); flex-shrink: 0; }
  .header-text { display: flex; flex-direction: column; gap: 2px; }
  .header-title { font-size: 15px; font-weight: 600; color: white; letter-spacing: 0.2px; }
  .header-sub { font-size: 10px; color: rgba(255,255,255,0.5); font-weight: 400; letter-spacing: 1.4px; text-transform: uppercase; }
  .header-right { margin-left: auto; font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 0.5px; }

  .home { max-width: 860px; margin: 0 auto; padding: 72px 24px 60px; text-align: center; }
  .home h1 { font-size: 44px; font-weight: 600; color: ${SG_BLUE}; line-height: 1.1; margin-bottom: 12px; letter-spacing: -0.5px; }
  .home > p { font-size: 15px; color: #5a6a80; max-width: 460px; margin: 0 auto 52px; line-height: 1.65; font-weight: 300; }
  .doc-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; max-width: 860px; margin: 0 auto; }
  .doc-card { background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 28px 24px 24px; cursor: pointer; transition: all 0.18s; text-align: left; position: relative; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .doc-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:${SG_BLUE}; transform:scaleX(0); transition:transform 0.18s; }
  .doc-card:hover { border-color:${SG_BLUE}; transform:translateY(-2px); box-shadow:0 10px 36px rgba(43,87,154,0.14); }
  .doc-card:hover::before { transform:scaleX(1); }
  .doc-card .icon { font-size: 28px; margin-bottom: 14px; }
  .doc-card h3 { font-size: 16px; font-weight: 600; color: #1a2332; margin-bottom: 7px; }
  .doc-card p { font-size: 12px; color: #7a8a9a; line-height: 1.55; font-weight: 300; }
  .doc-card .badge { display:inline-block; font-size:10px; font-weight:600; padding:3px 9px; border-radius:4px; margin-top:14px; letter-spacing:0.4px; text-transform:uppercase; }
  .badge-a { background:${SG_LIGHT}; color:${SG_BLUE}; }
  .badge-p { background:#d5f0ec; color:#0a6554; }
  .badge-proj { background:#fde8cc; color:#7a3e00; }

  .api-notice { background:#fffbeb; border:1px solid #fcd34d; border-radius:8px; padding:14px 18px; font-size:13px; color:#92400e; margin-bottom:20px; }
  .api-notice a { color:${SG_BLUE}; }
  .api-key-bar { display:flex; gap:10px; margin-top:10px; }
  .api-key-bar input { flex:1; border:1.5px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; }
  .api-key-bar input:focus { border-color:${SG_BLUE}; }
  .api-key-bar button { background:${SG_BLUE}; color:white; border:none; border-radius:6px; padding:8px 16px; font-size:13px; font-family:'DM Sans',sans-serif; cursor:pointer; }
  .api-ok { font-size:13px; color:#1D9E75; background:#e1f5ee; border-radius:6px; padding:8px 14px; margin-bottom:20px; display:flex; align-items:center; gap:8px; }
  .api-ok button { background:none; border:none; color:#9aa5b4; cursor:pointer; font-size:12px; text-decoration:underline; margin-left:auto; }

  /* FORM LAYOUT — sidebar + main */
  .form-outer { display: flex; gap: 0; min-height: calc(100vh - 72px); }

  /* WATER SIDEBAR */
  .water-sidebar {
    width: 88px;
    flex-shrink: 0;
    background: #0e2a52;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 0 28px;
    position: sticky;
    top: 0;
    height: calc(100vh - 59px);
    overflow: hidden;
  }
  .water-label-top {
    font-size: 9px;
    font-weight: 600;
    color: rgba(255,255,255,0.35);
    letter-spacing: 1.2px;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    margin-bottom: 14px;
  }
  .water-tank {
    flex: 1;
    width: 38px;
    background: rgba(255,255,255,0.06);
    border-radius: 19px;
    border: 1.5px solid rgba(255,255,255,0.1);
    position: relative;
    overflow: hidden;
  }
  .water-fill {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    border-radius: 0 0 17px 17px;
    transition: height 0.6s cubic-bezier(0.34, 1.26, 0.64, 1);
    background: linear-gradient(180deg, #5BC8F5 0%, #2196D3 40%, #1565A8 100%);
    overflow: hidden;
  }
  .wave-wrap {
    position: absolute;
    top: -10px; left: -20px; right: -20px;
    height: 20px;
    overflow: hidden;
  }
  .wave {
    width: 200%;
    height: 20px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
    animation: waveflow 2.4s linear infinite;
  }
  .wave2 {
    width: 200%;
    height: 20px;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
    animation: waveflow 3.2s linear infinite reverse;
    margin-top: -14px;
  }
  @keyframes waveflow { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

  /* bubbles */
  .bubble {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.25);
    animation: bubblerise linear infinite;
  }
  @keyframes bubblerise {
    0% { transform: translateY(0) translateX(0); opacity:0.6; }
    50% { opacity:0.4; transform: translateY(-40%) translateX(4px); }
    100% { transform: translateY(-100%) translateX(-2px); opacity:0; }
  }

  .water-pct {
    font-size: 13px;
    font-weight: 600;
    color: white;
    margin-top: 12px;
  }
  .water-label-bottom {
    font-size: 9px;
    font-weight: 500;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-top: 4px;
    text-align: center;
    line-height: 1.3;
  }

  /* MAIN FORM AREA */
  .form-main { flex: 1; min-width: 0; padding: 36px 40px 80px 36px; }
  .form-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:#7a8a9a; cursor:pointer; margin-bottom:22px; transition:color 0.15s; background:none; border:none; padding:0; font-family:'DM Sans',sans-serif; }
  .form-back:hover { color:${SG_BLUE}; }
  .form-title { font-size:28px; font-weight:600; color:${SG_BLUE}; margin-bottom:4px; letter-spacing:-0.3px; }
  .form-subtitle { font-size:13px; color:#7a8a9a; margin-bottom:26px; font-weight:300; }

  .section { background:white; border:1px solid ${SG_BORDER_GRAY}; border-radius:8px; padding:24px 28px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
  .section-title { font-size:11px; font-weight:700; color:white; background:${SG_BLUE}; text-transform:uppercase; letter-spacing:1.2px; margin:-24px -28px 20px; padding:10px 18px; border-radius:7px 7px 0 0; display:flex; align-items:center; gap:8px; }
  .section-title .pill { font-size:10px; font-weight:600; padding:2px 8px; border-radius:3px; background:rgba(255,255,255,0.2); color:white; letter-spacing:0; text-transform:none; }
  .section-title .pill.green { background:rgba(79,168,160,0.35); color:white; }

  .upload-outer { border:2px dashed #c8d4e8; border-radius:6px; transition:all 0.18s; background:#fafbfc; }
  .upload-outer:hover, .upload-outer.drag { border-color:${SG_BLUE}; background:${SG_LIGHT}; }
  .upload-inner { padding:26px 30px; text-align:center; cursor:pointer; }
  .upload-icon-big { font-size:34px; margin-bottom:9px; }
  .upload-inner h4 { font-size:14px; font-weight:500; color:#2d3748; margin-bottom:3px; }
  .upload-inner p { font-size:12px; color:#9aa5b4; font-weight:300; }
  .uploaded-list { padding:10px 14px; display:flex; flex-direction:column; gap:5px; }
  .uploaded-file { display:flex; align-items:center; gap:9px; background:${SG_LIGHT}; border-radius:4px; padding:6px 11px; font-size:13px; color:${SG_BLUE}; }
  .uploaded-file .fname { font-weight:500; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .uploaded-file .fsize { font-size:11px; color:#9aa5b4; }
  .uploaded-file button { background:none; border:none; color:#9aa5b4; cursor:pointer; font-size:16px; line-height:1; padding:0 2px; }
  .uploaded-file button:hover { color:#e24b4a; }

  .paste-box { border:1.5px solid #e2e8f0; border-radius:10px; padding:11px 13px; background:#fafbfc; margin-top:12px; }
  .paste-box textarea { width:100%; border:none; background:transparent; font-size:13px; font-family:'DM Sans',sans-serif; color:#1a2332; resize:vertical; min-height:90px; outline:none; line-height:1.6; }

  .parse-bar { margin-top:14px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .btn-parse { background:${SG_TEAL}; color:white; border:none; border-radius:9px; padding:10px 20px; font-size:13px; font-weight:500; font-family:'DM Sans',sans-serif; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.18s; }
  .btn-parse:hover:not(:disabled) { background:#3a9898; transform:translateY(-1px); }
  .btn-parse:disabled { opacity:0.5; cursor:not-allowed; }
  .parse-hint { font-size:12px; color:#9aa5b4; font-style:italic; }
  .parsed-banner { display:flex; align-items:center; gap:8px; font-size:13px; color:#1D9E75; background:#e1f5ee; border-radius:8px; padding:8px 13px; margin-top:10px; }

  .field-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .field { display:flex; flex-direction:column; gap:5px; }
  .field label { font-size:11px; font-weight:500; color:#4a5568; letter-spacing:0.2px; display:flex; align-items:center; gap:4px; }
  .field label .req { color:#e24b4a; }
  .field label .opt { color:#b0bbc8; font-weight:400; font-style:italic; font-size:10px; }
  .field .ai-badge { font-size:10px; color:${SG_TEAL}; background:#d5f0ec; padding:1px 6px; border-radius:3px; font-weight:600; letter-spacing:0.3px; }
  .field input, .field select, .field textarea {
    border:1px solid ${SG_BORDER_GRAY}; border-radius:4px; padding:8px 11px;
    font-size:13px; font-family:'DM Sans',sans-serif; color:#333333;
    background:white; transition:border-color 0.15s, box-shadow 0.15s; outline:none;
  }
  .field input:focus, .field select:focus, .field textarea:focus { border-color:${SG_BLUE}; box-shadow:0 0 0 3px rgba(43,87,154,0.1); }
  .field input.err, .field select.err, .field textarea.err { border-color:#e24b4a; background:#fff8f8; }
  .field input.ai-filled, .field select.ai-filled, .field textarea.ai-filled { border-color:${SG_TEAL}; background:#f0fdf9; }
  .field textarea { resize:vertical; min-height:82px; line-height:1.5; }

  .err-banner { background:#fff5f5; border:1px solid #fca5a5; border-radius:6px; padding:12px 16px; font-size:13px; color:#991b1b; margin-bottom:14px; display:flex; gap:9px; }

  .gen-bar { background:white; border:1px solid ${SG_BORDER_GRAY}; border-radius:6px; padding:20px 28px; display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:18px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
  .revision-box { background:white; border:1px solid ${SG_TEAL}; border-radius:6px; padding:22px 28px; margin-top:16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
  .revision-box h4 { font-size:14px; font-weight:600; color:${SG_BLUE}; margin-bottom:4px; }
  .revision-box p { font-size:12px; color:#7a8a9a; margin-bottom:12px; font-weight:300; }
  .revision-box textarea { width:100%; border:1.5px solid #e2e8f0; border-radius:6px; padding:10px 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#333; resize:vertical; min-height:90px; outline:none; line-height:1.6; }
  .revision-box textarea:focus { border-color:${SG_BLUE}; }
  .revision-actions { display:flex; gap:10px; margin-top:10px; justify-content:flex-end; }
  .btn-revise { background:${SG_TEAL}; color:white; border:none; border-radius:4px; padding:9px 20px; font-size:13px; font-weight:500; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.18s; }
  .btn-revise:hover:not(:disabled) { background:#3a9898; }
  .btn-revise:disabled { opacity:0.5; cursor:not-allowed; }
  .gen-info { font-size:13px; color:#7a8a9a; font-weight:300; line-height:1.7; }
  .gen-info strong { color:#333333; font-weight:600; }
  .btn-gen { background:${SG_BLUE}; color:white; border:none; border-radius:4px; padding:12px 26px; font-size:14px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.18s; display:flex; align-items:center; gap:7px; white-space:nowrap; letter-spacing:0.2px; }
  .btn-gen:hover:not(:disabled) { background:#1e4380; box-shadow:0 4px 16px rgba(43,87,154,0.28); }
  .btn-gen:disabled { opacity:0.55; cursor:not-allowed; }

  .overlay { position:fixed; inset:0; background:rgba(18,26,42,0.65); display:flex; align-items:center; justify-content:center; z-index:200; backdrop-filter:blur(4px); }
  .overlay-card { background:white; border-radius:8px; padding:40px 44px; text-align:center; max-width:380px; width:90%; box-shadow:0 24px 80px rgba(0,0,0,0.2); }
  .overlay-logo { height:40px; width:auto; margin:0 auto 16px; display:block; background:white; border-radius:4px; padding:4px 8px; }
  .spinner { width:46px; height:46px; border-radius:50%; border:3px solid ${SG_LIGHT}; border-top-color:${SG_BLUE}; animation:spin 0.85s linear infinite; margin:0 auto 16px; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .overlay-card h3 { font-size:17px; font-weight:600; color:${SG_BLUE}; margin-bottom:6px; }
  .overlay-card p { font-size:13px; color:#7a8a9a; font-weight:300; line-height:1.5; }
  .steps { margin-top:16px; text-align:left; }
  .step { display:flex; align-items:center; gap:9px; font-size:12px; padding:5px 0; color:#b0bbc8; }
  .step.done { color:#1D9E75; }
  .step.active { color:${SG_BLUE}; font-weight:500; }
  .dot { width:7px; height:7px; border-radius:50%; background:#e2e8f0; flex-shrink:0; }
  .dot.done { background:#1D9E75; }
  .dot.active { background:${SG_BLUE}; animation:pulse 1s ease infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)} }

  /* footer bar */
  .app-footer { background:${SG_BLUE}; border-top:2px solid ${SG_TEAL}; padding:10px 40px; display:flex; align-items:center; justify-content:space-between; }
  .app-footer span { font-size:11px; color:rgba(255,255,255,0.45); }

  @media(max-width:680px){
    .doc-cards{grid-template-columns:1fr 1fr;}
    .field-grid{grid-template-columns:1fr;}
    .water-sidebar{width:60px;}
    .water-tank{width:28px;}
    .form-main{padding:24px 20px 60px 18px;}
    .home h1{font-size:32px;}
    .gen-bar{flex-direction:column;align-items:stretch;}
    .header{padding:0 20px;}
  }
`;

// ── fields ────────────────────────────────────────────────────────────────────

const PIPELINE_FIELDS = [
  { key:"pipeline", label:"Pipeline", required:true, type:"select", options:[
    {value:"",label:"Select pipeline…"},
    {value:"Project",label:"Project (one-time)"},
    {value:"Reoccurring",label:"Reoccurring (ongoing contract)"},
  ]},
  { key:"dealAmount",           label:"Deal Amount",                       required:true,  placeholder:"$150,000" },
  { key:"closeDate",            label:"Expected Close Date",               required:true,  type:"date" },
  { key:"closeProbability",     label:"Probability of Closing (%)",        required:false, placeholder:"75", type:"number" },
  { key:"sgContactName",        label:"Primary SG Contact Name",           required:true,  placeholder:"Ted Winkelman" },
  { key:"sgContactEmail",       label:"Primary SG Contact Email",          required:true,  placeholder:"twinkelman@solutionmgt.com" },
  { key:"customerContactName",  label:"Primary Customer Contact Name",     required:false, placeholder:"John Doe" },
  { key:"customerContactEmail", label:"Primary Customer Contact Email",    required:false, placeholder:"jdoe@client.com" },
];

const ASSESSMENT_FIELDS = [
  { key:"clientLegalName",    label:"Client Legal Name",       required:true,  placeholder:"Acme Corporation" },
  { key:"clientShortName",    label:"Client Short Name",       required:false, placeholder:"Acme" },
  { key:"facilityName",       label:"Facility Name",           required:false, placeholder:"Indianapolis Plant" },
  { key:"facilityAddress",    label:"Facility Address",        required:false, placeholder:"123 Industrial Blvd, Indianapolis, IN 46201" },
  { key:"industry",           label:"Industry / What They Do", required:false, placeholder:"Food & beverage manufacturing" },
  { key:"assessmentDate",     label:"Date of Site Visit",      required:false, type:"date" },
  { key:"assessmentTeam",     label:"SG Assessment Team",      required:false, placeholder:"Jane Smith – Regional Manager" },
  { key:"systemsAssessed",    label:"Systems Assessed",        required:false, placeholder:"Wastewater treatment, boilers, cooling towers" },
  { key:"regulatoryAuthority",label:"Regulatory Authority",    required:false, placeholder:"Indiana IDEM" },
  { key:"permitNumber",       label:"Permit Number",           required:false, placeholder:"IND-0012345" },
  { key:"executiveSummary",   label:"Executive Summary",       required:false, full:true, type:"textarea", placeholder:"Auto-populated from uploaded files — or summarize the key findings and context." },
  { key:"inScope",            label:"Key Findings / Systems Assessed", required:false, full:true, type:"textarea", placeholder:"Auto-populated from uploaded files — or describe findings per system." },
  { key:"additionalInstructions", label:"Any Additional Instructions", required:false, full:true, type:"textarea", placeholder:"Optional — guide Claude on tone, length, formality, or emphasis.\n\nExamples: \"Keep it concise\", \"Use a formal tone\", \"Emphasize compliance risk throughout\"", help:"Adjust tone, length, formality, emphasis, or specific sections." },
];

const PROPOSAL_FIELDS = [
  { key:"clientLegalName",    label:"Client Legal Name",           required:true,  placeholder:"Acme Corporation" },
  { key:"clientShortName",    label:"Client Short Name",           required:false, placeholder:"Acme" },
  { key:"facilityAddress",    label:"Facility Address",            required:false, placeholder:"123 Industrial Blvd, Indianapolis, IN 46201" },
  { key:"proposalDate",       label:"Proposal Date",               required:false, type:"date" },
  { key:"monthlyFeeTotal",    label:"Total Monthly Fee",           required:false, placeholder:"$12,500" },
  { key:"timeline",           label:"Project Timeline (optional)", required:false, full:true, type:"textarea", placeholder:"Optional — paste or describe a timeline and it will be included as a table.\n\nExample: Weeks 1-4: Procurement | Weeks 5-6: Installation | Week 7: Commissioning" },
  { key:"includeSignature",   label:"Include Signature Block?",    required:false, type:"select", options:[{value:"",label:"No signature block"},{value:"yes",label:"Yes — include signature block"}] },
  { key:"executiveSummary",   label:"Executive Summary",           required:false, full:true, type:"textarea", placeholder:"Auto-populated from uploaded files — or describe the service being proposed and the value to the client." },
  { key:"inScope",            label:"In-Scope Services",           required:false, full:true, type:"textarea", placeholder:"Auto-populated from uploaded files — or list what Solution Group will provide under this agreement." },
  { key:"additionalInstructions", label:"Any Additional Instructions", required:false, full:true, type:"textarea", placeholder:"Optional — guide Claude on tone, length, formality, or emphasis.\n\nExamples: \"Keep it concise and executive-friendly\", \"Use a more technical tone\", \"Emphasize regulatory compliance\"", help:"Adjust tone, length, formality, emphasis, or specific sections." },
];

const OTHER_FIELDS = [
  { key:"documentTitle", label:"Document Title / Purpose", required:true, placeholder:"Describe what document you need" },
  { key:"clientName",    label:"Client / Company Name",    required:true, placeholder:"Company name" },
];

const PROJECT_PROPOSAL_FIELDS = [
  { key:"clientLegalName",    label:"Client Legal Name",     required:true,  placeholder:"Sabrosura Foods, LLC" },
  { key:"clientShortName",    label:"Client Short Name",     required:false, placeholder:"Sabrosura" },
  { key:"projectTitle",       label:"Project Title",         required:true,  placeholder:"pH Adjust System Replacement" },
  { key:"proposalDate",       label:"Proposal Date",         required:false, type:"date" },
  { key:"timeline",           label:"Project Timeline (optional)", required:false, full:true, type:"textarea", placeholder:"Optional — describe a timeline and it will be included as a table.\n\nExample: Weeks 1-4: Parts procurement | Weeks 5-6: Build and ship | Weeks 7-8: Install and startup" },
  { key:"includeSignature",   label:"Include Signature Block?", required:false, type:"select", options:[{value:"",label:"No signature block"},{value:"yes",label:"Yes — include signature block"}] },
  { key:"executiveSummary",   label:"Executive Summary",     required:false, full:true, type:"textarea", placeholder:"Auto-populated from uploaded files — or describe the system and the value it delivers to the client." },
  { key:"inScope",            label:"In-Scope Deliverables", required:false, full:true, type:"textarea", placeholder:"Auto-populated from uploaded files — or list what Solution Group will supply, install, and deliver." },
  { key:"additionalInstructions", label:"Any Additional Instructions", required:false, full:true, type:"textarea",
    placeholder:"Optional — guide Claude on tone, length, formality, emphasis, or anything else.\n\nExamples: \"Keep it concise and executive-friendly\", \"Use a more technical tone\", \"Emphasize regulatory compliance throughout\"",
    help:"Adjust tone, length, formality, emphasis, or specific sections." },
];

const DOC_TYPES = [
  { id:"assessment", icon:"🔍", title:"Assessment",         desc:"Operational & technical findings report with recommendations. No pricing.", badge:"Assessment",  badgeClass:"badge-a" },
  { id:"proposal",   icon:"📄", title:"Reoccurring Proposal", desc:"4–5 page O&M service proposal with service confirmation and pricing summary.", badge:"O&M Proposal", badgeClass:"badge-p" },
  { id:"project",    icon:"🏗️", title:"Project Proposal",   desc:"Full capital project proposal: scope, architecture, schedule, itemized pricing, and signature block.", badge:"CapEx Project", badgeClass:"badge-proj" },
];

const PARSE_STEPS = ["Reading uploaded files","Extracting data with Claude","Populating form fields"];
const GEN_STEPS   = ["Extracting file content","Sending to server","Building branded document","Preparing download"];

// ── helpers ───────────────────────────────────────────────────────────────────

function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

async function readDocxAsText(file) {
  // Load mammoth from CDN if not already loaded
  if (!window.mammoth) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
      s.onload = res;
      s.onerror = () => rej(new Error("Failed to load mammoth"));
      document.head.appendChild(s);
    });
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function buildParsePrompt(docType, pastedText, fileNames) {
  const allKeys = [
    ...PIPELINE_FIELDS,
    ...(docType==="assessment" ? ASSESSMENT_FIELDS : docType==="proposal" ? PROPOSAL_FIELDS : docType==="project" ? PROJECT_PROPOSAL_FIELDS : OTHER_FIELDS),
  ].map(f => f.key);
  return `You are a data extraction assistant for Solution Group. Extract fields from the provided files/text.
${pastedText ? `\nPASTED TEXT:\n${pastedText}\n` : ""}
${fileNames.length ? `Files provided: ${fileNames.join(", ")}` : ""}

Return ONLY valid JSON (no markdown, no preamble) with values for any of these keys you can find:
${JSON.stringify(allKeys)}

FIELD MAPPING GUIDANCE — be aggressive about inferring these:
- "sgContactName": look for the SG rep, account manager, or "Prepared By" on the SG side. If none found, default to "Ted Winkelman".
- "sgContactEmail": if none found and sgContactName defaults to Ted Winkelman, use "twinkelman@solutionmgt.com".
- "dealAmount": look for ANY total dollar figure — "TOTAL PROJECT INVESTMENT", "Total", "Grand Total", "Project Total", "Monthly Fee Total", "Total Amount", "TOTAL". Include the $ sign and commas exactly as written, e.g. "$209,509.48". This is the single most important field — do not miss it.
- "closeDate": use the proposal date, contract date, or any date on the document as a best-guess close date. Format YYYY-MM-DD.
- "proposalDate": look for "Proposal Date", "Date", document date on cover page. Format YYYY-MM-DD.
- "clientLegalName" / "clientShortName": look for "Prepared For", client name on cover, or anywhere the customer is named.
- "projectTitle": look for the main project heading or title.
- "executiveSummary": extract the full Executive Summary section verbatim, including all paragraphs.
- "inScope": extract the full In-Scope Deliverables / Project Scope section verbatim, preserving all bullet points.
- "pricingLineItems": extract the full pricing table rows verbatim, pipe-separated.
- "implementationPhases": extract the implementation/schedule table rows verbatim.

Dates → YYYY-MM-DD. closeProbability → number 0-100. Empty string for not found. Be aggressive — infer from context if not labeled exactly.`;
}

function buildDocPrompt(docType, formData, pastedText, uploadedFiles) {
  const fields = JSON.stringify(formData, null, 2);
  const pasteNote = pastedText.trim() ? `\n\nAdditional context:\n${pastedText}` : "";
  const fileNote  = uploadedFiles.length ? `\nAttached: ${uploadedFiles.map(f=>f.name).join(", ")}` : "";

  if (docType==="assessment") return `You are the Solution Group site assessment generator.
SG: Environmental Management Solutions, Inc. d/b/a Solution Group | 6239 S. East Street, Suite F, Indianapolis, IN 46227 | (800) 465-8200 | solutionmgt.com

INTAKE:
${fields}${pasteNote}${fileNote}

Generate a complete site assessment:
1. Executive Summary  2. Site Overview  3. Regulatory Context  4. Systems Assessment (per system: condition, findings, risks)  5. Staffing & Operations  6. Monitoring & Data Management  7. Prioritized Recommendations (Quick Wins / Medium-Term / Major Projects)  8. Conclusion

RULES: No pricing/signatures. Link findings to customer goals. Use [To be confirmed] for missing fields. Markdown ## headers. Title: "SITE ASSESSMENT REPORT".
${formData.additionalInstructions ? `\nADDITIONAL INSTRUCTIONS FROM USER: ${formData.additionalInstructions}` : ""}`;

  if (docType==="proposal") return `You are the Solution Group executive proposal generator.
SG: Environmental Management Solutions, Inc. d/b/a Solution Group | 6239 S. East Street, Suite F, Indianapolis, IN 46227 | (800) 465-8200 | solutionmgt.com
Default signatory: ${formData.sgSignatoryName||"Mike Silver"}, VP Operations | Contract: 36mo, 12mo auto-renew, 60-day notice, 3% escalator | Bill Back: cost+10%, $5k threshold | OT: $125/hr, 4hr min

INTAKE:
${fields}${pasteNote}${fileNote}

Generate EXACTLY 5 sections:
1. Proposal Introduction (1 paragraph)  2. Service Confirmation (2-3 sentences)  3. Commercial Summary (pricing table + context)  4. Key Assumptions & Exclusions (4-8 bullets)  5. Next Steps (3-5 bullets)

RULES: Max 5 pages. No SOW/appendices/signature blocks. Title: "EXECUTIVE SERVICE PROPOSAL". Valid 30 days.
${formData.additionalInstructions ? `\nADDITIONAL INSTRUCTIONS FROM USER: ${formData.additionalInstructions}` : ""}`;

  if (docType==="project") return `You are the Solution Group capital project proposal generator.
SG: Environmental Management Solutions, Inc. d/b/a Solution Group | 6239 S. East Street, Suite F, Indianapolis, IN 46227 | (800) 465-8200 | solutionmgt.com

INTAKE:
${fields}${pasteNote}${fileNote}

Generate a complete capital project proposal with EXACTLY 8 numbered sections:

1. Executive Summary
   - Two paragraphs: (1) system description and problem solved, (2) value and outcome for client
   - Do not include pricing here

2. Project Scope
   - In-Scope Deliverables: bulleted list of exactly what SG will supply, install, and deliver
   - Out-of-Scope: bulleted list of exclusions

3. System Architecture
   - 3–5 subsections describing the technology, key components, and how the system works
   - Technical but readable by a plant manager or operations executive

4. [Site-Specific Technical Section — title varies by project]
   - e.g., "Hydraulic Integration", "Electrical Scope", "Civil Requirements"
   - Include only if there is meaningful standalone site-specific content; if not, skip and renumber sections 5–8 accordingly

5. Implementation Schedule
   - Table format: Phase | Key Activities | Est. Duration
   - Alternate light gray background on phase rows
   - Phases should be logical and sequential (Engineering → Fabrication → Installation → Commissioning)

6. Pricing Summary
   - Table format: Activity/Description | Qty | Rate | Amount
   - Total row in bold
   - Pricing notes below table (3–5 bullets)
   - Payment milestones: ${formData.paymentMilestones || "50% deposit / 25% at mechanical completion / 25% at project handover"}
   - "Pricing is valid for 30 days from proposal date."

7. Terms & Conditions
   - Warranty: ${formData.warrantyDuration || "6 months"} on equipment and installation; sensor calibration and reagent consumables excluded
   - Change Orders clause: "Any changes to the agreed scope of work must be submitted in writing and approved by both parties prior to execution. Changes may affect project schedule and pricing."
   - Assumptions & Exclusions: bulleted list
   - Close with: "Questions? Contact the Solution Group project team to discuss this proposal."

8. Proposal Acceptance
   - Two-column signature block: Client (left) | Solution Group (right)
   - Four lines each: Signature / Print Name / Title / Date

RULES:
- This is the full scope document — include complete technical detail
- If rebranding an uploaded document: reproduce ALL content verbatim, change only visual formatting
- Use [To be confirmed] for any missing required field
- Markdown ## for section headers, ### for subsections
- Title: "PROJECT PROPOSAL" then client name and project title
- Prepared by: ${formData.preparedBy || "Solution Group Engineering Team"}
- Payment milestones: 50% deposit / 25% at mechanical completion / 25% at project handover
${formData.additionalInstructions ? `\nADDITIONAL INSTRUCTIONS FROM USER: ${formData.additionalInstructions}` : ""}`;

  return `Generate a professional document for Solution Group (water treatment & facility management).
INTAKE:\n${fields}${pasteNote}${fileNote}\nProfessional tone, markdown formatting, appropriate sections for the described purpose.`;
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type:"text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

async function callClaude(messageContent, maxTokens=8000, attempt=1) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 120000);
  try {
    const resp = await fetch("/api/anthropic-proxy", {
      method:"POST",
      signal: controller.signal,
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:maxTokens, messages:[{role:"user",content:messageContent}] }),
    });
    clearTimeout(tid);
    if (!resp.ok) {
      const e = await resp.json().catch(()=>({}));
      const msg = e?.error?.message || `API error ${resp.status}`;
      if (attempt < 3 && (resp.status === 529 || resp.status >= 500)) {
        await new Promise(r => setTimeout(r, 4000 * attempt));
        return callClaude(messageContent, maxTokens, attempt + 1);
      }
      throw new Error(msg);
    }
    const data = await resp.json();
    return data.content.map(b=>b.text||"").join("\n");
  } catch(e) {
    clearTimeout(tid);
    if (e.name === "AbortError") throw new Error("Request timed out — try reducing pasted text or using fewer files.");
    if (attempt < 3 && e.message.includes("network")) {
      await new Promise(r => setTimeout(r, 3000));
      return callClaude(messageContent, maxTokens, attempt + 1);
    }
    throw e;
  }
}

// ── Water sidebar component ───────────────────────────────────────────────────

function WaterBar({ pct }) {
  // clamp between 4% (so tank never looks totally empty) and 98%
  const fillPct = Math.max(4, Math.min(98, pct));
  const isComplete = pct >= 100;

  const messages = [
    { at:0,   text:"Empty" },
    { at:15,  text:"Getting started" },
    { at:35,  text:"Taking shape" },
    { at:55,  text:"Looking good" },
    { at:75,  text:"Almost there" },
    { at:95,  text:"Ready!" },
  ];
  const msg = [...messages].reverse().find(m => pct >= m.at) || messages[0];

  return (
    <div className="water-sidebar">
      <div className="water-label-top">Detail level</div>
      <div className="water-tank">
        <div className="water-fill" style={{ height:`${fillPct}%` }}>
          <div className="wave-wrap">
            <div className="wave" />
            <div className="wave2" />
          </div>
          {/* bubbles */}
          {[0,1,2,3].map(i => (
            <div key={i} className="bubble" style={{
              width: `${5+i*2}px`, height:`${5+i*2}px`,
              left:`${15+i*18}%`,
              bottom:`${10+i*12}%`,
              animationDuration:`${2.2+i*0.7}s`,
              animationDelay:`${i*0.4}s`,
            }} />
          ))}
        </div>
      </div>
      <div className="water-pct" style={{ color: isComplete ? "#5BC8F5" : "white" }}>
        {Math.round(pct)}%
      </div>
      <div className="water-label-bottom">{msg.text}</div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {

  const [page,        setPage]        = useState("home");
  const [docType,     setDocType]     = useState(null);
  const [formData,    setFormData]    = useState({});
  const [aiKeys,      setAiKeys]      = useState(new Set());
  const [pastedText,  setPastedText]  = useState("");
  const [files,       setFiles]       = useState([]);
  const [dragOver,    setDragOver]    = useState(false);
  const [errors,      setErrors]      = useState({});
  const [parsing,     setParsing]     = useState(false);
  const [parseStep,   setParseStep]   = useState(0);
  const [parsed,      setParsed]      = useState(false);
  const [parseErr,    setParseErr]    = useState("");
  const [generating,  setGenerating]  = useState(false);
  const [genStep,     setGenStep]     = useState(0);
  const [genErr,      setGenErr]      = useState("");
  const [generated,   setGenerated]   = useState(false);
  const [revisions,   setRevisions]   = useState("");
  const fileRef = useRef();



  const selectDoc = (type) => {
    setDocType(type); setErrors({});
    setPastedText(""); setFiles([]); setAiKeys(new Set());
    setParsed(false); setParseErr(""); setGenErr("");
    setGenerated(false); setRevisions("");
    // auto-set pipeline based on doc type
    const defaultPipeline = type === "project" ? "Project" : type === "proposal" ? "Reoccurring" : "";
    setFormData({ pipeline: defaultPipeline });
    setPage("form");
  };

  const setField = (key,val) => {
    setFormData(p=>({...p,[key]:val}));
    if (errors[key]) setErrors(p=>({...p,[key]:false}));
  };

  const addFiles = (incoming) => {
    const ok = Array.from(incoming).filter(f=>
      ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
       "application/vnd.ms-excel",
       "text/plain","text/csv","application/csv",
       "image/png","image/jpeg"].includes(f.type)
      || f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );
    setFiles(p=>[...p,...ok].slice(0,5));
    setParsed(false);
  };

  const docFields = docType==="assessment" ? ASSESSMENT_FIELDS : docType==="proposal" ? PROPOSAL_FIELDS : docType==="project" ? PROJECT_PROPOSAL_FIELDS : OTHER_FIELDS;
  const allFields = [...PIPELINE_FIELDS, ...docFields];

  // ── completion percentage across ALL fields (required + optional) ──
  const totalFields = allFields.length;
  const filledAll   = allFields.filter(f => formData[f.key]?.toString().trim()).length;
  const completePct = Math.round((filledAll / totalFields) * 100);

  // required-only for gate
  const reqFields  = allFields.filter(f=>f.required);
  const filledReq  = reqFields.filter(f=>formData[f.key]?.toString().trim()).length;
  const reqPct     = Math.round((filledReq/reqFields.length)*100);

  // ── parse ──
  const handleParse = async () => {
    if (!files.length && !pastedText.trim()) { setParseErr("Add a file or paste text first."); return; }
    setParseErr(""); setParsing(true); setParseStep(0);
    try {
      const content = [];
      setParseStep(0);
      for (const f of files) {
        if (f.type==="application/pdf") {
          const b64 = await readFileAsBase64(f);
          content.push({ type:"document", source:{type:"base64",media_type:"application/pdf",data:b64} });
        } else if (f.type.startsWith("image/")) {
          const b64 = await readFileAsBase64(f);
          content.push({ type:"image", source:{type:"base64",media_type:f.type,data:b64} });
        } else if (f.name.endsWith(".docx") || f.type.includes("wordprocessingml")) {
          const text = await readDocxAsText(f);
          content.push({ type:"text", text:`[Document: ${f.name}]\n${text}` });
        } else if (f.name.endsWith(".csv") || f.type==="text/csv" || f.type==="application/csv" || f.type==="text/plain") {
          const text = await f.text();
          content.push({ type:"text", text:`[File: ${f.name}]\n${text}` });
        } else if (f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.type.includes("spreadsheetml")) {
          content.push({ type:"text", text:`[Spreadsheet attached: ${f.name} — extract any pricing, schedule, or field data visible in this file]` });
        }
      }
      content.push({ type:"text", text:buildParsePrompt(docType, pastedText, files.map(f=>f.name)) });
      const raw = await callClaude(content, 1500);
      // Extract JSON even if Claude wraps it in extra text or markdown
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response — try again.");
      const extracted = JSON.parse(jsonMatch[0]);
      setParseStep(2);
      const filled = new Set();
      const merged = {...formData};
      Object.entries(extracted).forEach(([k,v])=>{ if(v&&String(v).trim()){merged[k]=String(v).trim();filled.add(k);} });
      setFormData(merged); setAiKeys(filled); setParsed(true);
    } catch(e) {
      if (e.message === "CORS_BLOCKED") {
        setParseErr("Browser blocked the API call (CORS). This app must be deployed to a web server to call the Anthropic API — it cannot run from a local file or from inside Claude.ai. Deploy to Vercel or Netlify and it will work.");
      } else {
        setParseErr(`Parse failed: ${e.message}`);
      }
    }
    finally    { setParsing(false); }
  };

  // ── generate ──
  const validate = () => {
    const errs={};
    allFields.filter(f=>f.required).forEach(f=>{ if(!formData[f.key]?.toString().trim()) errs[f.key]=true; });
    setErrors(errs);
    return Object.keys(errs).length===0;
  };

  const handleGenerate = async () => {
    if (!validate()) { setGenErr("Please fill in all required fields."); return; }
    setGenErr(""); setGenerating(true); setGenStep(0);
    try {
      const content = [];
      setGenStep(0);
      // Extract text content from files to send to the server
      const fileContents = [];
      for (const f of files) {
        if (f.name.endsWith(".docx") || f.type.includes("wordprocessingml")) {
          const text = await readDocxAsText(f);
          fileContents.push(`[Document: ${f.name}]\n${text}`);
        } else if (f.name.endsWith(".csv") || f.type==="text/csv" || f.type==="text/plain") {
          const text = await f.text();
          fileContents.push(`[File: ${f.name}]\n${text}`);
        }
      }
      setGenStep(1);
      const resp = await fetch("/api/generate-document", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ docType, formData, pastedText, fileContents }),
      });
      setGenStep(2);
      if (!resp.ok) {
        const err = await resp.json().catch(()=>({}));
        throw new Error(err?.error || `Server error ${resp.status}`);
      }
      const blob = await resp.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const client = (formData.clientShortName||formData.clientLegalName||formData.clientName||"Client").replace(/\s+/g,"_");
      const date   = new Date().toISOString().split("T")[0].replace(/-/g,"");
      const label  = docType==="assessment"?"Assessment":docType==="proposal"?"Proposal":docType==="project"?"Project_Proposal":"Document";
      setGenStep(3);
      a.href=dlUrl; a.download=`${client}_${label}_${date}.docx`; a.click();
      URL.revokeObjectURL(dlUrl);
      setGenerating(false);
      setGenerated(true);
    } catch(e) {
      setGenerating(false);
      setGenErr(`Generation failed: ${e.message}`);
    }
  };

  const renderField = (f) => {
    const isAI = aiKeys.has(f.key);
    const cls  = errors[f.key] ? "err" : isAI ? "ai-filled" : "";
    return (
      <div key={f.key} className="field" style={f.full?{gridColumn:"1 / -1"}:{}}>
        <label>
          {f.label}
          {f.required ? <span className="req"> *</span> : <span className="opt"> optional</span>}
          {isAI && <span className="ai-badge">auto-filled</span>}
        </label>
        {f.type==="textarea" ? (
          <textarea className={cls} placeholder={f.placeholder} value={formData[f.key]||""} onChange={e=>setField(f.key,e.target.value)} />
        ) : f.type==="select" ? (
          <select className={cls} value={formData[f.key]||""} onChange={e=>setField(f.key,e.target.value)}>
            {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input type={f.type||"text"} className={cls} placeholder={f.placeholder} value={formData[f.key]||""} onChange={e=>setField(f.key,e.target.value)} />
        )}
        {f.help && <div style={{fontSize:11,color:"#9aa5b4",marginTop:3,fontStyle:"italic"}}>{f.help}</div>}
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>

      <header className="header">
        <div className="header-logo-wrap">
          <img src={SG_LOGO} alt="Solution Group" className="header-logo-img" />
        </div>
        <div className="header-divider" />
        <div className="header-text">
          <div className="header-title">Document Generator</div>
          <div className="header-sub">Solution Group · Internal Tool</div>
        </div>
        <div className="header-right">solutionmgt.com</div>
      </header>

      {/* ── HOME ── */}
      {page==="home" && (
        <div className="home">
          <h1>Generate<br />a Document</h1>
          <p>Build a branded assessment or proposal in minutes. Upload your notes, and Claude does the writing.</p>

                    <div className="doc-cards">
            {DOC_TYPES.map(dt=>(
              <div key={dt.id} className="doc-card" onClick={()=>selectDoc(dt.id)}>
                <div className="icon">{dt.icon}</div>
                <h3>{dt.title}</h3>
                <p>{dt.desc}</p>
                <span className={`badge ${dt.badgeClass}`}>{dt.badge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {page==="form" && (
        <div className="form-outer">
          <WaterBar pct={completePct} />

          <div className="form-main">
            <button className="form-back" onClick={()=>setPage("home")}>← Back</button>
            <div className="form-title">
              {docType==="assessment"?"Assessment":docType==="proposal"?"Reoccurring Proposal":docType==="project"?"Project Proposal":"Custom Document"}
            </div>
            <div className="form-subtitle">
              Upload files or paste notes first — Claude auto-fills the form. More detail = richer document.
            </div>

            {/* CORS warning — show when running from file:// or localhost without a proxy */}
            {(window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && (
              <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#92400e",marginBottom:16,lineHeight:1.6}}>
                <strong>⚠ Running locally</strong> — the Anthropic API blocks direct browser calls from localhost due to CORS.
                {" "}To test locally, set up a simple proxy (see README). To go live, deploy to{" "}
                <a href="https://vercel.com" target="_blank" rel="noreferrer" style={{color:SG_BLUE}}>Vercel</a> or{" "}
                <a href="https://netlify.com" target="_blank" rel="noreferrer" style={{color:SG_BLUE}}>Netlify</a> — CORS is resolved automatically on a real domain.
              </div>
            )}

            {genErr && <div className="err-banner"><span>⚠</span><span>{genErr}</span></div>}

            {/* STEP 1 */}
            <div className="section">
              <div className="section-title">Step 1 — Upload Files or Paste Notes <span className="pill">Start here</span></div>
              <div
                className={`upload-outer${dragOver?" drag":""}`}
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files);}}
              >
                <div className="upload-inner" onClick={()=>fileRef.current?.click()}>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.xlsx,.txt,.png,.jpg"
                    onChange={e=>addFiles(e.target.files)} style={{display:"none"}} accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg" />
                  <div className="upload-icon-big">📎</div>
                  <h4>Drop files here or click to upload</h4>
                  <p>PDF, DOCX, XLSX, CSV, TXT, images · up to 5 files · Claude extracts all relevant data</p>
                </div>
                {files.length>0 && (
                  <div className="uploaded-list">
                    {files.map((f,i)=>(
                      <div key={i} className="uploaded-file">
                        📄 <span className="fname">{f.name}</span>
                        <span className="fsize">{(f.size/1024).toFixed(0)} KB</span>
                        <button onClick={e=>{e.stopPropagation();setFiles(p=>p.filter((_,j)=>j!==i));setParsed(false);}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="paste-box">
                <div style={{fontSize:11,fontWeight:500,color:"#4a5568",marginBottom:5}}>Or paste notes, call summary, email thread…</div>
                <textarea
                  placeholder="Paste any context here — site visit notes, discovery call summary, email threads, intake form contents…"
                  value={pastedText}
                  onChange={e=>{setPastedText(e.target.value);setParsed(false);}}
                />
              </div>

              <div className="parse-bar">
                <button className="btn-parse" onClick={handleParse} disabled={(!files.length&&!pastedText.trim())||parsing}>
                  {parsing?"⏳ Parsing…":"✦ Parse & Auto-Fill Form"}
                </button>
                {!parsed && !parseErr && <span className="parse-hint">Claude reads your files and fills the fields below</span>}
                {parseErr && <span style={{fontSize:12,color:"#991b1b"}}>⚠ {parseErr}</span>}
              </div>
              {parsed && (
                <div className="parsed-banner">
                  ✓ {aiKeys.size} fields auto-filled — review below and correct anything that needs adjusting
                </div>
              )}
            </div>

            {/* STEP 2 */}
            <div className="section">
              <div className="section-title">Step 2 — Deal Information</div>
              <div className="field-grid">
                {PIPELINE_FIELDS.slice(0,4).map(renderField)}
              </div>
              <div className="field-grid" style={{marginTop:12}}>
                {PIPELINE_FIELDS.slice(4).map(renderField)}
              </div>
            </div>

            {/* STEP 3 */}
            <div className="section">
              <div className="section-title">
                Step 3 — {docType==="assessment"?"Assessment Details":docType==="proposal"?"Proposal Details":docType==="project"?"Project Details":"Document Details"}
                {parsed && aiKeys.size>0 && <span className="pill green">Auto-filled</span>}
              </div>
              <div className="field-grid">
                {docFields.filter(f=>!f.full&&f.type!=="textarea").map(renderField)}
              </div>
              {docFields.filter(f=>f.full||f.type==="textarea").map(f=>(
                <div key={f.key} style={{marginTop:12}}>{renderField(f)}</div>
              ))}
            </div>

            {/* GENERATE */}
            <div className="gen-bar">
              <div className="gen-info">
                <div><strong>{filledReq} of {reqFields.length}</strong> required fields complete</div>
                <div style={{fontSize:12,color:"#9aa5b4",marginTop:2}}>
                  {filledAll} of {totalFields} total fields filled · more detail = better document
                </div>
                {reqPct===100 && <div style={{fontSize:12,color:"#1D9E75",marginTop:2}}>✓ Ready to generate</div>}
              </div>
              <button className="btn-gen" onClick={handleGenerate} disabled={generating}>
                ⬇ Generate & Download
              </button>
            </div>

            {/* REVISION BOX — shown after successful download */}
            {generated && (
              <div className="revision-box">
                <h4>Need to make some changes?</h4>
                <p>Describe the changes that need to be made — the more detail the better.</p>
                <textarea
                  placeholder="e.g. 'Shorten the engineering scope section', 'Add a note about permit timeline in assumptions', 'The total should be $380,000 not $411,000'..."
                  value={revisions}
                  onChange={e=>setRevisions(e.target.value)}
                />
                <div className="revision-actions">
                  <button
                    className="btn-revise"
                    disabled={!revisions.trim() || generating}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, additionalInstructions: (prev.additionalInstructions ? prev.additionalInstructions + "\n\nREVISION INSTRUCTIONS: " : "REVISION INSTRUCTIONS: ") + revisions }));
                      setRevisions("");
                      setGenerated(false);
                      setTimeout(() => handleGenerate(), 100);
                    }}
                  >
                    ↻ Regenerate with Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {parsing && (
        <div className="overlay">
          <div className="overlay-card">
            <img src={SG_LOGO} alt="Solution Group" className="overlay-logo" />
            <div className="spinner" />
            <h3>Reading your files…</h3>
            <p>Claude is extracting relevant data to pre-fill the form.</p>
            <div className="steps">
              {PARSE_STEPS.map((s,i)=>(
                <div key={i} className={`step ${i<parseStep?"done":i===parseStep?"active":""}`}>
                  <div className={`dot ${i<parseStep?"done":i===parseStep?"active":""}`} />{s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {generating && (
        <div className="overlay">
          <div className="overlay-card">
            <img src={SG_LOGO} alt="Solution Group" className="overlay-logo" />
            <div className="spinner" />
            <h3>Generating document…</h3>
            <p>Claude is writing your {docType==="assessment"?"assessment":docType==="proposal"?"reoccurring proposal":docType==="project"?"project proposal":"document"}.</p>
            <div className="steps">
              {GEN_STEPS.map((s,i)=>(
                <div key={i} className={`step ${i<genStep?"done":i===genStep?"active":""}`}>
                  <div className={`dot ${i<genStep?"done":i===genStep?"active":""}`} />{s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <span>6239 S. East Street, Suite F, Indianapolis, IN 46227 · (800) 465-8200 · solutionmgt.com</span>
        <span>© {new Date().getFullYear()} Environmental Management Solutions, Inc. d/b/a Solution Group</span>
      </footer>
    </>
  );
}
