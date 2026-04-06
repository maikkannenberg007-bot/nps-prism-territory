import { useState, useRef } from "react";

const API_URL = "/api/chat";

function extractObject(text) {
  const clean = text.replace(/```json|```/g, "");
  let depth = 0, start = -1;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === "{") { if (depth === 0) start = i; depth++; }
    else if (clean[i] === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = clean.slice(start, i + 1)
          .replace(/,(\s*[}\]])/g, "$1")
          .replace(/:\s*\.{3}\s*([,}])/g, ': ""$1');
        try { return JSON.parse(slice); } catch { return null; }
      }
    }
  }
  return null;
}

async function fetchAccount(name, vertical) {
  const prompt = `You are a senior sales intelligence analyst at NPS Prism, Bain & Company's CX benchmarking SaaS platform.

Research the company "${name}" and return a JSON qualification report.

NPS PRISM CONTEXT:
- Bain-backed CX benchmarking SaaS, ~$40M ARR, 500+ companies benchmarked globally
- Surveys 20,000+ consumers per industry every 90 days (double-blind panels)
- Covered industries: Consumer Banking, Credit Cards, Wealth Management, Mortgage, Insurance, Grocery/Retail, Auto, Airlines, Telecom, Utilities, Pharmacy, Restaurants
- KEY VALUE: Shows companies how they compare to named competitors at the episode/journey level — not just their own NPS score
- ACV: Enterprise $400K-$600K+ | Mid-market $100K-$300K
- Primary buyers: CCO, VP CX, Head of Insights, CMO, Strategy leads
- Biggest competitor to displace: JD Power ("clients use JD Power for the score, NPS Prism for how it moves")
${vertical ? `Vertical hint: ${vertical}` : ""}

USE WEB SEARCH to research "${name}":
1. Industry, size, revenue, publicly traded or private
2. New CCO / VP CX / Head of Insights hired in last 12 months
3. IF PUBLIC: Search for latest earnings call or 10-K. Find 3 near-verbatim executive quotes about customer satisfaction, NPS, churn, retention, or CX investment
4. Tech stack: JD Power? Qualtrics? Medallia? (check job postings, G2, press)
5. Real names + LinkedIn URLs for CX leaders
6. M&A, CX crisis, or digital transformation news

SCORING (max 100):
- New CX leader hired last 12mo: +25 | Earnings headwind: +25 | Post-merger: +25 | Brand crisis: +25
- JD Power relationship: +15 | Qualtrics/Medallia customer: +15 | Digital CX transformation: +15 | Churn signals: +15
- Covered vertical: +10 | CX conference activity: +8
GO=55+, WARM=30-54, COLD=<30

Return ONLY a single valid JSON object. No markdown. No text before or after:

{
  "companyName": "official name",
  "vertical": "NPS Prism vertical",
  "isPublic": true,
  "score": 72,
  "tier": "GO",
  "expectedDeal": "$400K-$600K",
  "dealType": "Enterprise",
  "cycleMonths": "6-9 months",
  "dealRationale": "one sentence on sizing",
  "leadSignal": "6-8 word strongest signal",
  "signals": [
    {"type": "positive", "label": "specific signal"},
    {"type": "neutral", "label": "context"}
  ],
  "competitorScores": [
    {"competitor": "JD Power", "score": 8, "evidence": "evidence found"},
    {"competitor": "Qualtrics", "score": 4, "evidence": "evidence found"},
    {"competitor": "Medallia", "score": 3, "evidence": "evidence found"},
    {"competitor": "Ipsos / Kantar", "score": 5, "evidence": "evidence found"},
    {"competitor": "Internal / Homegrown", "score": 2, "evidence": "evidence found"}
  ],
  "earningsSource": "Q4 2024 Earnings Call",
  "earningsItems": [
    {"quote": "near-verbatim executive quote", "speaker": "CEO First Last", "relevance": "NPS Prism angle — why this matters"},
    {"quote": "second quote — different theme", "speaker": "CFO First Last", "relevance": "NPS Prism angle"},
    {"quote": "third quote", "speaker": "CCO First Last", "relevance": "NPS Prism angle"}
  ],
  "personas": [
    {"department": "CX / Customer", "name": "real name or empty", "title": "specific title", "linkedinUrl": "url or empty", "painPoint": "specific pain", "openingHook": "exact first sentence"},
    {"department": "Insights / Analytics", "name": "", "title": "specific title", "linkedinUrl": "", "painPoint": "specific pain", "openingHook": "exact first sentence"},
    {"department": "Strategy / Marketing", "name": "", "title": "specific title", "linkedinUrl": "", "painPoint": "specific pain", "openingHook": "exact first sentence"}
  ],
  "researchSummary": "4-5 sentences with specific facts and named sources.",
  "openingLine": "exact first cold call sentence — real signal, never mention NPS Prism",
  "emailSubject": "under 8 words — specific real signal",
  "emailBody": "3 short paragraphs under 150 words. P1: specific real company fact. P2: competitive gap. P3: soft CTA. Sign: [Your name] | NPS Prism, Bain & Company"
}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      if (res.status === 529 || data.error?.type === "overloaded_error") {
        await new Promise(r => setTimeout(r, (attempt + 1) * 10000));
        continue;
      }
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);

      const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const obj = extractObject(raw);
      if (obj) return { ...obj, companyName: obj.companyName || name };
      throw new Error("Could not parse response");
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  throw new Error("Max retries reached");
}

// ─── STYLES — CLEAN LIGHT THEME ───────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:#F4F6F9;font-family:'Inter',sans-serif;color:#0F1E2E;font-size:15px;overflow:hidden}
#root{height:100%}
.app{display:flex;flex-direction:column;height:100vh;overflow:hidden}

.nav{background:#0F1E2E;border-bottom:3px solid #CC0000;padding:0 32px;display:flex;align-items:stretch;flex-shrink:0;height:56px}
.nav-left{display:flex;align-items:center;gap:16px}
.bmark{background:#CC0000;width:30px;height:30px;border-radius:3px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.bmark svg{width:17px;height:17px}
.ndiv{width:1px;background:#1C3856;height:30px}
.nname{font-family:'Libre Baskerville',serif;font-size:15px;font-weight:700;color:#fff;letter-spacing:.2px}
.nsub{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#4B6A8A;font-family:'JetBrains Mono',monospace;margin-top:2px}
.nav-right{margin-left:auto;display:flex;align-items:center;gap:12px}
.npill{background:#1C3856;color:#7BA7CC;font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:2px;padding:5px 11px;border-radius:2px;text-transform:uppercase;border:1px solid #2A4A6A}
.nbain{font-size:10px;color:#CC0000;font-family:'JetBrains Mono',monospace;letter-spacing:1px}

.layout{flex:1;display:flex;overflow:hidden;min-height:0}

.sidebar{width:320px;flex-shrink:0;background:#fff;border-right:1px solid #E2E8F0;display:flex;flex-direction:column;overflow:hidden;box-shadow:2px 0 8px rgba(0,0,0,.04)}
.sidebar-input{padding:20px 18px;border-bottom:1px solid #E2E8F0;display:flex;flex-direction:column;gap:12px}
.ey{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#94A3B8;margin-bottom:3px}
.ptitle{font-family:'Libre Baskerville',serif;font-size:15px;font-weight:700;color:#0F1E2E;line-height:1.3}
.psub{font-size:11px;color:#64748B;line-height:1.6;margin-top:2px}
.fld{display:flex;flex-direction:column;gap:4px}
.flbl{font-size:11px;font-weight:600;color:#374151;letter-spacing:.4px}
textarea,input[type=text]{width:100%;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;padding:9px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#0F1E2E;outline:none;transition:border-color .2s;line-height:1.6}
input[type=text]{font-family:'Inter',sans-serif;font-size:13px}
textarea{resize:none;min-height:90px}
textarea:focus,input:focus{border-color:#CC0000;background:#fff}
textarea::placeholder,input::placeholder{color:#94A3B8;font-family:'Inter',sans-serif}

.runbtn{width:100%;padding:11px;background:#CC0000;border:none;border-radius:4px;color:#fff;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;letter-spacing:.3px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.runbtn:hover:not(:disabled){background:#AA0000;box-shadow:0 4px 16px rgba(204,0,0,.25)}
.runbtn:disabled{background:#CBD5E1;color:#94A3B8;cursor:not-allowed}
.sampbtn{background:none;border:1px dashed #CBD5E1;border-radius:4px;padding:7px;font-size:11px;color:#94A3B8;cursor:pointer;width:100%;font-family:'Inter',sans-serif;transition:all .2s}
.sampbtn:hover{border-color:#CC0000;color:#CC0000}

.acct-list{flex:1;overflow-y:auto;padding:8px 0;background:#fff}
.acct-list::-webkit-scrollbar{width:3px}
.acct-list::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:2px}
.list-item{padding:11px 18px;cursor:pointer;transition:background .15s;border-left:3px solid transparent;display:flex;align-items:center;gap:12px;border-bottom:1px solid #F8FAFC}
.list-item:hover{background:#F8FAFC}
.list-item.active{background:#FFF5F5;border-left-color:#CC0000}
.list-item.loading-item{opacity:.6;cursor:default}
.li-rank{font-family:'Libre Baskerville',serif;font-size:18px;font-weight:700;color:#CBD5E1;width:24px;flex-shrink:0;text-align:right;line-height:1}
.list-item.active .li-rank{color:#CC0000}
.li-main{flex:1;min-width:0}
.li-name{font-weight:600;font-size:13px;color:#0F1E2E;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list-item.active .li-name{color:#CC0000}
.li-signal{font-size:11px;color:#94A3B8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.li-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
.li-score{font-family:'Libre Baskerville',serif;font-size:20px;font-weight:700;line-height:1}
.s-go{color:#16A34A}.s-warm{color:#CA8A04}.s-cold{color:#DC2626}
.tbadge{font-size:8px;font-weight:700;letter-spacing:2px;padding:2px 6px;border-radius:2px;text-transform:uppercase;font-family:'JetBrains Mono',monospace}
.tb-go{background:#DCFCE7;color:#15803D}.tb-warm{background:#FEF9C3;color:#854D0E}.tb-cold{background:#FEE2E2;color:#991B1B}
.spin-sm{display:inline-block;width:14px;height:14px;border:2px solid #E2E8F0;border-top-color:#CC0000;border-radius:50%;animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.main{flex:1;overflow-y:auto;background:#F4F6F9}
.main::-webkit-scrollbar{width:4px}
.main::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:2px}

.center-state{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;text-align:center;padding:60px}
.cs-icon{font-size:56px;opacity:.15}
.cs-title{font-family:'Libre Baskerville',serif;font-size:22px;font-weight:700;color:#0F1E2E;opacity:.3}
.cs-sub{font-size:13px;color:#94A3B8;max-width:280px;line-height:1.7}

.detail{padding:28px 36px 60px;max-width:980px;margin:0 auto}

.hero{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:32px 36px;margin-bottom:24px;position:relative;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#CC0000,#FF4444,#CC0000)}
.hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:16px}
.hero-eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#94A3B8;margin-bottom:8px}
.hero-company{font-family:'Libre Baskerville',serif;font-size:30px;font-weight:700;color:#0F1E2E;line-height:1.1;margin-bottom:5px}
.hero-vertical{font-size:12px;color:#94A3B8;font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px}
.hero-signal{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#CC0000;margin-bottom:10px}
.hero-opening{font-size:13px;color:#64748B;line-height:1.65;font-style:italic;padding:11px 15px;background:#FFF5F5;border-radius:6px;border-left:3px solid #CC0000;max-width:560px}
.hero-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0}
.big-score{width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:3px solid;flex-shrink:0}
.bs-go{border-color:#16A34A;background:#F0FFF4}.bs-warm{border-color:#CA8A04;background:#FFFBEB}.bs-cold{border-color:#DC2626;background:#FEF2F2}
.bs-num{font-family:'Libre Baskerville',serif;font-size:28px;font-weight:700;line-height:1}
.bs-go .bs-num{color:#16A34A}.bs-warm .bs-num{color:#CA8A04}.bs-cold .bs-num{color:#DC2626}
.bs-lbl{font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;opacity:.5;margin-top:1px}
.tbadge-lg{font-size:10px;font-weight:700;letter-spacing:2.5px;padding:5px 14px;border-radius:3px;text-transform:uppercase;font-family:'JetBrains Mono',monospace}
.tbl-go{background:#DCFCE7;color:#15803D;border:1px solid #BBF7D0}.tbl-warm{background:#FEF9C3;color:#854D0E;border:1px solid #FDE68A}.tbl-cold{background:#FEE2E2;color:#991B1B;border:1px solid #FECACA}
.hero-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid #F1F5F9}
.htag{font-size:10px;color:#64748B;background:#F8FAFC;border:1px solid #E2E8F0;padding:4px 10px;border-radius:3px;font-family:'JetBrains Mono',monospace;letter-spacing:.5px}

.sig-row{display:flex;flex-wrap:wrap;gap:7px}
.spill{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:4px;font-size:12px;font-weight:500}
.sp-pos{background:#F0FFF4;color:#15803D;border:1px solid #BBF7D0}.sp-neu{background:#F8FAFC;color:#64748B;border:1px solid #E2E8F0}

.section{margin-bottom:24px}
.sec-hdr{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.sec-title{font-family:'Libre Baskerville',serif;font-size:14px;font-weight:700;color:#0F1E2E;white-space:nowrap;letter-spacing:.2px}
.sec-line{flex:1;height:1px;background:#E2E8F0}

.earn-wrap{background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.earn-hdr{background:#0F1E2E;padding:12px 20px;display:flex;align-items:center;gap:10px}
.earn-hdr-title{font-family:'Libre Baskerville',serif;font-size:13px;font-weight:700;color:#fff}
.earn-src{font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:2px;text-transform:uppercase;color:#4B6A8A;margin-left:auto}
.earn-private{padding:20px;font-size:12px;color:#94A3B8;font-style:italic}
.earn-items{padding:20px;display:flex;flex-direction:column;gap:22px}
.earn-item{display:grid;grid-template-columns:3px 1fr;gap:0 16px}
.earn-bar{background:#CC0000;border-radius:2px}
.earn-num{display:inline-block;background:#CC0000;color:#fff;font-size:8px;font-family:'JetBrains Mono',monospace;letter-spacing:1.5px;padding:2px 8px;border-radius:2px;text-transform:uppercase;margin-bottom:8px}
.earn-quote{font-family:'Libre Baskerville',serif;font-size:15px;color:#0F1E2E;line-height:1.8;font-style:italic;margin-bottom:5px}
.earn-speaker{font-size:11px;color:#94A3B8;font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
.earn-angle-tag{display:inline-block;background:#FFF0F0;color:#CC0000;font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:1.5px;padding:2px 8px;border-radius:2px;text-transform:uppercase;border:1px solid #FECACA;margin-bottom:5px}
.earn-rel{font-size:12px;color:#64748B;line-height:1.6}

.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.card-box{background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.card-box-title{font-size:9px;color:#94A3B8;font-family:'JetBrains Mono',monospace;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}
.rev3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-top:1px solid #F1F5F9;padding-top:12px;margin-top:8px}
.rit{text-align:center;padding:0 8px;border-right:1px solid #F1F5F9}
.rit:last-child{border-right:none}
.rinum{font-family:'Libre Baskerville',serif;font-size:16px;font-weight:700;color:#CC0000;line-height:1;margin-bottom:4px}
.rilbl{font-size:9px;color:#94A3B8;font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;line-height:1.4}
.rirat{font-size:11px;color:#64748B;line-height:1.55}

.comp-item{margin-bottom:11px}
.comp-item:last-child{margin-bottom:0}
.comp-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.comp-name{font-size:11px;font-weight:600;color:#374151}
.comp-score{font-family:'Libre Baskerville',serif;font-size:13px;font-weight:700}
.cs-low{color:#16A34A}.cs-mid{color:#CA8A04}.cs-hi{color:#DC2626}
.comp-bar{height:4px;background:#F1F5F9;border-radius:2px;overflow:hidden;margin-bottom:3px}
.cb-fill{height:100%;border-radius:2px}
.cbf-low{background:#22C55E}.cbf-mid{background:#F59E0B}.cbf-hi{background:#EF4444}
.comp-ev{font-size:10px;color:#94A3B8;line-height:1.4}

.per-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.per-card{background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:5px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.per-dept{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#CC0000;font-family:'JetBrains Mono',monospace}
.per-name{font-size:14px;font-weight:700;color:#0F1E2E}
.per-title{font-size:11px;color:#64748B;margin-bottom:4px}
.per-pain{font-size:12px;color:#374151;line-height:1.6}
.per-hook{font-size:12px;font-style:italic;color:#CC0000;line-height:1.5;padding-top:8px;border-top:1px solid #F1F5F9}
.li-btn{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-family:'JetBrains Mono',monospace;color:#0077B5;text-decoration:none;padding:4px 9px;background:#EFF8FF;border-radius:3px;border:1px solid #BFDBFE;margin-top:4px;cursor:pointer;transition:all .2s;width:fit-content}
.li-btn:hover{background:#DBEAFE}
.li-none{font-size:10px;color:#94A3B8;font-family:'JetBrains Mono',monospace;padding:4px 9px;background:#F8FAFC;border-radius:3px;border:1px solid #E2E8F0;display:inline-block;margin-top:4px}

.email-box{background:#fff;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.email-hdr{background:#0F1E2E;padding:13px 20px;display:flex;align-items:center;gap:10px}
.email-hdr-title{font-family:'Libre Baskerville',serif;font-size:13px;font-weight:700;color:#fff}
.email-body-wrap{padding:20px}
.email-subj{font-size:13px;font-weight:700;color:#0F1E2E;margin-bottom:12px;border-bottom:1px solid #F1F5F9;padding-bottom:10px}
.email-body{font-size:13px;color:#374151;line-height:1.85;white-space:pre-wrap}
.copy-btn{margin-top:14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;padding:8px 16px;color:#64748B;font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:1px;cursor:pointer;text-transform:uppercase;transition:all .2s}
.copy-btn:hover{border-color:#CC0000;color:#CC0000}
.copy-btn.ok{background:#F0FFF4;border-color:#22C55E;color:#15803D}

.res-box{background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:18px;font-size:13px;color:#64748B;line-height:1.75;box-shadow:0 1px 3px rgba(0,0,0,.04)}

.prog-bar{flex:1;height:4px;background:#E2E8F0;border-radius:2px;overflow:hidden}
.prog-fill{height:100%;background:#CC0000;border-radius:2px;transition:width .5s ease}
.prog-pct{font-size:10px;color:#CC0000;font-family:'JetBrains Mono',monospace;flex-shrink:0}
.prog-ring{width:40px;height:40px;border:3px solid #E2E8F0;border-top-color:#CC0000;border-radius:50%;animation:spin .9s linear infinite}
.spinner{display:inline-block;width:11px;height:11px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle}

@media(max-width:900px){.sidebar{width:260px}.two-col,.per-grid{grid-template-columns:1fr}}
`;

const tierSC  = t => t==="GO"?"bs-go":t==="WARM"?"bs-warm":"bs-cold";
const tierC   = t => t==="GO"?"s-go":t==="WARM"?"s-warm":"s-cold";
const tierTB  = t => t==="GO"?"tb-go":t==="WARM"?"tb-warm":"tb-cold";
const tierTBL = t => t==="GO"?"tbl-go":t==="WARM"?"tbl-warm":"tbl-cold";
const compNum = s => s<=3?"cs-low":s<=6?"cs-mid":"cs-hi";
const compBar = s => s<=3?"cbf-low":s<=6?"cbf-mid":"cbf-hi";

function LiBtn({ url, name }) {
  if (url && url.startsWith("http")) {
    return (
      <a className="li-btn" href={url} target="_blank" rel="noopener noreferrer">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        View on LinkedIn
      </a>
    );
  }
  return <span className="li-none">🔍 Search: {name || "Unknown"}</span>;
}

function DetailView({ acct }) {
  const [copied, setCopied] = useState(false);
  if (!acct) return null;

  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${acct.emailSubject}\n\n${acct.emailBody}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const ei = acct.earningsItems;

  return (
    <div className="detail">

      <div className="hero">
        <div className="hero-top">
          <div style={{flex:1}}>
            <div className="hero-eyebrow">NPS Prism · Account Intelligence Report</div>
            <div className="hero-company">{acct.companyName}</div>
            <div className="hero-vertical">{acct.vertical || "Unknown Vertical"}</div>
            <div className="hero-signal">▶ {acct.leadSignal}</div>
            {acct.openingLine && <div className="hero-opening">"{acct.openingLine}"</div>}
          </div>
          <div className="hero-right">
            <div className={`big-score ${tierSC(acct.tier)}`}>
              <div className="bs-num">{acct.score}</div>
              <div className="bs-lbl">/100</div>
            </div>
            <span className={`tbadge-lg ${tierTBL(acct.tier)}`}>{acct.tier}</span>
          </div>
        </div>
        <div className="hero-tags">
          {acct.expectedDeal && <span className="htag">{acct.expectedDeal}</span>}
          {acct.dealType && <span className="htag">{acct.dealType}</span>}
          {acct.cycleMonths && <span className="htag">{acct.cycleMonths}</span>}
          <span className="htag">{acct.isPublic ? "Public Company" : "Private Company"}</span>
        </div>
      </div>

      {acct.signals?.length > 0 && (
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">BUYING SIGNALS</div><div className="sec-line"/></div>
          <div className="sig-row">
            {acct.signals.map((s,i) => (
              <span key={i} className={`spill ${s.type==="positive"?"sp-pos":"sp-neu"}`}>
                {s.type==="positive"?"✓":"◉"} {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {ei?.length > 0 && (
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">EXECUTIVE VOICE — SPEAK THEIR LANGUAGE</div><div className="sec-line"/></div>
          <div className="earn-wrap">
            <div className="earn-hdr">
              <span style={{fontSize:16}}>📊</span>
              <div className="earn-hdr-title">Latest Earnings Intelligence</div>
              {acct.earningsSource && <div className="earn-src">{acct.earningsSource}</div>}
            </div>
            {acct.isPublic === false ? (
              <div className="earn-private">Private company — no public filings. Using press & LinkedIn for context.</div>
            ) : (
              <div className="earn-items">
                {ei.map((item,i) => (
                  <div key={i} className="earn-item">
                    <div className="earn-bar"/>
                    <div>
                      <div className="earn-num">Signal #{i+1}</div>
                      <div className="earn-quote">"{item.quote}"</div>
                      <div className="earn-speaker">— {item.speaker}</div>
                      <div className="earn-angle-tag">NPS Prism Angle</div>
                      <div className="earn-rel">{item.relevance}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section">
        <div className="sec-hdr"><div className="sec-title">DEAL SIZING & COMPETITIVE EXPOSURE</div><div className="sec-line"/></div>
        <div className="two-col">
          <div className="card-box">
            <div className="card-box-title">Revenue Target</div>
            {acct.dealRationale && <div className="rirat" style={{marginBottom:10}}>{acct.dealRationale}</div>}
            <div className="rev3">
              <div className="rit"><div className="rinum">{acct.expectedDeal||"—"}</div><div className="rilbl">Expected ACV</div></div>
              <div className="rit"><div className="rinum">{acct.dealType||"—"}</div><div className="rilbl">Deal Type</div></div>
              <div className="rit"><div className="rinum">{acct.cycleMonths||"—"}</div><div className="rilbl">Cycle</div></div>
            </div>
          </div>
          <div className="card-box">
            <div className="card-box-title">Competitor Exposure (0–10)</div>
            {(acct.competitorScores||[]).map((c,i) => {
              const sc = Math.max(0,Math.min(10,Math.round(Number(c.score)||0)));
              return (
                <div key={i} className="comp-item">
                  <div className="comp-row">
                    <span className="comp-name">{c.competitor}</span>
                    <span className={`comp-score ${compNum(sc)}`}>{sc}/10</span>
                  </div>
                  <div className="comp-bar"><div className={`cb-fill ${compBar(sc)}`} style={{width:`${sc*10}%`}}/></div>
                  {c.evidence && <div className="comp-ev">{c.evidence}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {acct.personas?.length > 0 && (
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">KEY PERSONAS TO REACH</div><div className="sec-line"/></div>
          <div className="per-grid">
            {acct.personas.map((p,i) => (
              <div key={i} className="per-card">
                <div className="per-dept">{p.department}</div>
                {p.name && <div className="per-name">{p.name}</div>}
                <div className="per-title">{p.title}</div>
                <div className="per-pain">{p.painPoint}</div>
                <div className="per-hook">"{p.openingHook}"</div>
                <LiBtn url={p.linkedinUrl} name={p.name}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {acct.researchSummary && (
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">RESEARCH SUMMARY</div><div className="sec-line"/></div>
          <div className="res-box">{acct.researchSummary}</div>
        </div>
      )}

      {(acct.emailSubject || acct.emailBody) && (
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">FIRST TOUCH EMAIL</div><div className="sec-line"/></div>
          <div className="email-box">
            <div className="email-hdr">
              <span style={{fontSize:16}}>📧</span>
              <div className="email-hdr-title">Personalized Outreach · Ready to Send</div>
            </div>
            <div className="email-body-wrap">
              <div className="email-subj">Subject: {acct.emailSubject}</div>
              <div className="email-body">{acct.emailBody}</div>
              <button className={`copy-btn ${copied?"ok":""}`} onClick={copy}>
                {copied?"✓ Copied!":"Copy Email"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const SAMPLE = `Truist Bank\nAllstate Insurance\nSouthwest Airlines\nT-Mobile\nKroger`;

export default function App() {
  const [acctText, setAcctText] = useState("");
  const [vertical, setVertical] = useState("");
  const [items, setItems]       = useState([]);
  const [running, setRunning]   = useState(false);
  const [progress, setProgress] = useState({ done:0, total:0, msg:"" });
  const [selected, setSelected] = useState(null);
  const abortRef = useRef(false);

  const lines = acctText.split("\n").map(l=>l.trim()).filter(Boolean);

  const run = async () => {
    if (!lines.length) return;
    abortRef.current = false;
    setRunning(true);
    setItems([]);
    setSelected(null);
    setProgress({ done:0, total:lines.length, msg:"" });

    for (let i = 0; i < lines.length; i++) {
      if (abortRef.current) break;
      const name = lines[i];
      setItems(prev => [...prev, { type:"loading", name }]);
      setProgress(p => ({ ...p, msg:`Researching ${name}…`, done:i }));

      try {
        const data = await fetchAccount(name, vertical);
        setItems(prev => prev.map((it,idx) => idx===i ? { type:"done", name, data } : it));
        if (i===0) setSelected(0);
      } catch (err) {
        setItems(prev => prev.map((it,idx) => idx===i ? { type:"error", name, error:err.message } : it));
      }

      setProgress(p => ({ ...p, done:i+1 }));
      if (i < lines.length-1 && !abortRef.current) await new Promise(r=>setTimeout(r,2500));
    }

    setProgress(p => ({ ...p, msg:"" }));
    setRunning(false);
  };

  const reset = () => {
    abortRef.current = true;
    setItems([]); setRunning(false); setSelected(null);
    setProgress({ done:0, total:0, msg:"" });
  };

  const doneItems = [...items].filter(it=>it.type==="done").sort((a,b)=>(b.data?.score||0)-(a.data?.score||0));
  const counts = { GO:0, WARM:0, COLD:0 };
  doneItems.forEach(it => { const t=it.data?.tier; if(t in counts) counts[t]++; });
  const pct = progress.total>0 ? Math.round((progress.done/progress.total)*100) : 0;
  const selectedData = selected !== null && items[selected]?.type==="done" ? items[selected].data : null;

  return (
    <>
      <style>{G}</style>
      <div className="app">

        <div className="nav">
          <div className="nav-left">
            <div className="bmark">
              <svg viewBox="0 0 20 20" fill="white">
                <rect x="2" y="4" width="16" height="2.5" rx="1"/>
                <rect x="2" y="8.75" width="12" height="2.5" rx="1"/>
                <rect x="2" y="13.5" width="16" height="2.5" rx="1"/>
              </svg>
            </div>
            <div className="ndiv"/>
            <div>
              <div className="nname">NPS Prism Territory Intelligence</div>
              <div className="nsub">Backed by Bain & Company · Account Prioritization Engine</div>
            </div>
          </div>
          <div className="nav-right">
            <div className="nbain">Bain & Company</div>
            <div className="npill">AE Sales Tool</div>
          </div>
        </div>

        <div className="layout">

          <div className="sidebar">
            <div className="sidebar-input">
              <div>
                <div className="ey">Territory Prioritization</div>
                <div className="ptitle">Account Intelligence Engine</div>
                <div className="psub">Up to 5 accounts. Earnings intel, personas, competitor scores, deal sizing.</div>
              </div>

              <div className="fld">
                <div className="flbl">Target Accounts (one per line, up to 5)</div>
                <textarea
                  value={acctText}
                  onChange={e => {
                    const ls = e.target.value.split("\n");
                    setAcctText(ls.slice(0,5).join("\n"));
                  }}
                  placeholder={"Truist Bank\nAllstate Insurance\nSouthwest Airlines\nT-Mobile\nKroger"}
                  rows={5}
                />
                <button className="sampbtn" onClick={()=>setAcctText(SAMPLE)}>
                  Load demo accounts →
                </button>
              </div>

              <div className="fld">
                <div className="flbl">Vertical (optional)</div>
                <input value={vertical} onChange={e=>setVertical(e.target.value)} placeholder="e.g. Financial Services"/>
              </div>

              <button className="runbtn" onClick={running ? reset : run} disabled={!lines.length && !running}>
                {running
                  ? <><span className="spinner"/> Stop ({progress.done}/{progress.total})</>
                  : `▶ Run on ${lines.length||0} Account${lines.length!==1?"s":""}`}
              </button>

              {running && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div className="prog-bar"><div className="prog-fill" style={{width:`${pct}%`}}/></div>
                  <div className="prog-pct">{pct}%</div>
                </div>
              )}
            </div>

            <div className="acct-list">
              {running && items.length===0 && (
                <div style={{padding:"20px 18px",fontSize:12,color:"#94A3B8",fontFamily:"'JetBrains Mono',monospace"}}>
                  {progress.msg||"Starting research…"}
                </div>
              )}

              {items.map((it,i) => {
                if (it.type==="loading") return (
                  <div key={i} className="list-item loading-item">
                    <div className="spin-sm" style={{flexShrink:0}}/>
                    <div className="li-main">
                      <div className="li-name">{it.name}</div>
                      <div className="li-signal">Researching…</div>
                    </div>
                  </div>
                );
                if (it.type==="error") return (
                  <div key={i} className="list-item" style={{borderLeftColor:"#DC2626",opacity:.6}}>
                    <div style={{color:"#DC2626",fontSize:14,flexShrink:0}}>✕</div>
                    <div className="li-main">
                      <div className="li-name">{it.name}</div>
                      <div className="li-signal" style={{color:"#DC2626"}}>Research failed</div>
                    </div>
                  </div>
                );
                const rank = doneItems.findIndex(d=>d.name===it.name)+1;
                const d = it.data;
                return (
                  <div key={i} className={`list-item ${selected===i?"active":""}`} onClick={()=>setSelected(i)}>
                    <div className="li-rank">{rank||"—"}</div>
                    <div className="li-main">
                      <div className="li-name">{d.companyName}</div>
                      <div className="li-signal">{d.leadSignal}</div>
                    </div>
                    <div className="li-right">
                      <div className={`li-score ${tierC(d.tier)}`}>{d.score}</div>
                      <span className={`tbadge ${tierTB(d.tier)}`}>{d.tier}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {doneItems.length>0 && (
              <div style={{padding:"12px 18px",borderTop:"1px solid #F1F5F9",display:"flex",gap:16,alignItems:"center",background:"#fff"}}>
                {[["GO",counts.GO,"#16A34A"],["WARM",counts.WARM,"#CA8A04"],["COLD",counts.COLD,"#DC2626"]].map(([l,n,c])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontFamily:"'Libre Baskerville',serif",fontSize:18,fontWeight:700,color:c,lineHeight:1}}>{n}</div>
                    <div style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,textTransform:"uppercase",color:"#94A3B8",marginTop:2}}>{l}</div>
                  </div>
                ))}
                {!running && (
                  <button onClick={reset} style={{marginLeft:"auto",background:"none",border:"1px solid #E2E8F0",borderRadius:3,padding:"5px 10px",color:"#94A3B8",fontSize:9,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,cursor:"pointer",textTransform:"uppercase"}}>
                    ← Reset
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="main">
            {!selectedData && items.length===0 && (
              <div className="center-state">
                <div className="cs-icon">◈</div>
                <div className="cs-title">Territory Intelligence</div>
                <div className="cs-sub">Enter up to 5 accounts on the left. Each is researched for earnings quotes, personas, competitor exposure, and deal sizing. Click any account to see the full report.</div>
              </div>
            )}
            {!selectedData && items.length>0 && running && (
              <div className="center-state">
                <div className="prog-ring"/>
                <div className="cs-title" style={{opacity:1}}>Researching…</div>
                <div className="cs-sub">{progress.msg}</div>
              </div>
            )}
            {!selectedData && items.length>0 && !running && (
              <div className="center-state">
                <div className="cs-icon">👆</div>
                <div className="cs-title">Select an account</div>
                <div className="cs-sub">Click any account on the left to view the full intelligence report.</div>
              </div>
            )}
            {selectedData && <DetailView acct={selectedData}/>}
          </div>

        </div>
      </div>
    </>
  );
}
