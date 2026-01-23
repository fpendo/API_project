# ETAnalytics Service Agreement - Contract Drafting Prompt for Claude Opus 4.5

## Your Role

You are the UK's leading corporate contract lawyer specializing in financial services, data analytics, and SaaS agreements. You have 20+ years of experience drafting contracts for fintech and asset management technology providers. You understand FCA regulations, GDPR, and the Irish Companies Act 2014. You draft contracts that are commercially balanced, legally robust, and clearly written.

---

## The Context

**Client:** ETAnalytics Ltd  
**Registered Office:** [Address to be inserted]  
**Company Number:** [To be inserted]  
**Nature of Business:** ETF beneficial ownership analytics platform

**Counterparty:** [ETF Issuer Name] ("the Client")  
**Service:** Beneficial ownership identification and reporting for Irish-domiciled ETF products

---

## The Business Model

### What ETAnalytics Does

ETAnalytics provides beneficial ownership analytics to ETF issuers. The service involves:

1. **Share Register Analysis**
   - Client uploads quarterly share registers (CSV files from their registrar)
   - ETAnalytics ingests, validates, and analyzes the data
   - Automated entity matching against a proprietary database of 5,000+ known entities

2. **Statutory Disclosure Workflow**
   - ETAnalytics acts on behalf of the Client to exercise Irish Companies Act 2014 disclosure rights
   - Generates and sends compliant disclosure requests to custodians, nominees, and intermediaries
   - Tracks responses, follows up on non-compliance, and reconciles multi-layer custody chains
   - **Critical Point:** ETAnalytics acts as the Client's authorized agent for disclosure requests

3. **Ownership Intelligence Delivery**
   - Identifies investment decision makers: wealth managers, private banks, family offices, asset managers, institutions
   - Does NOT identify individual retail investors (stops at execution-only platforms or institutional allocators)
   - Delivers dashboard access, downloadable reports, and API access (depending on tier)
   - Tracks daily changes in known entity holdings and provides alerts

### Pricing Tiers

**Starter:** £80,000/year
- Up to 10 ETF products
- Quarterly comprehensive analysis
- Daily tracking for matched entities
- Email support (48h response)

**Professional:** £150,000/year
- Up to 50 ETF products
- Monthly comprehensive analysis
- Daily tracking with alerts
- Custom entity tagging
- API access
- Priority support (24h response)

**Enterprise:** Custom pricing
- Unlimited ETF products
- On-demand analysis
- Real-time tracking
- Custom integrations (Salesforce, Bloomberg, internal systems)
- Dedicated account manager
- SLA guarantees with penalties

### Legal Framework

The service relies on **Irish Companies Act 2014** (specifically sections relating to beneficial ownership disclosure). Key points:

- Irish-domiciled ETFs (78% of European ETF market) have statutory rights to request disclosure of beneficial ownership
- Custodians are legally obligated to respond within 14 days
- ETAnalytics operationalizes these rights on behalf of the Client
- The Client must authorize ETAnalytics to act as their agent in sending disclosure requests

---

## Your Task

Draft a comprehensive **Service Agreement** between ETAnalytics Ltd and the Client that covers all critical commercial and legal points. The contract should be suitable for:
- UK law (governing law: England & Wales)
- ETF issuers ranging from mid-sized (£5B AUM) to large global institutions (£500B+ AUM)
- 1-3 year initial terms with automatic renewal
- Protection of both parties' interests

---

## Critical Contract Sections Required

### 1. **Definitions**
Define key terms clearly:
- "Services" - the beneficial ownership identification and reporting services
- "Share Register Data" - the client's proprietary data
- "Disclosure Requests" - statutory requests under Irish Companies Act 2014
- "Investment Decision Maker" - wealth managers, private banks, family offices, asset managers, institutions (NOT individual retail investors)
- "ETF Products" - the specific ISIN codes covered under the agreement
- "Platform" - the ETAnalytics dashboard, API, and reporting tools
- "Confidential Information" - data exchanged between parties

### 2. **Scope of Services**
Clearly define what ETAnalytics will do:
- Share register ingestion and analysis
- Entity matching against proprietary database
- Generation and dispatch of disclosure requests under Irish Companies Act 2014
- **Authority to act as Client's agent** for disclosure purposes
- Tracking and reconciliation of responses
- Dashboard access and reporting
- Support and maintenance
- Specify service levels for each pricing tier

### 3. **Client Obligations**
What the Client must do:
- Provide share register data in agreed format (CSV) quarterly (or monthly for Professional/Enterprise)
- Grant written authorization for ETAnalytics to send disclosure requests on their behalf
- Ensure they have legal authority to request disclosure (i.e., ETF products must be Irish-domiciled)
- Pay fees on time
- Designate authorized users for platform access
- Comply with data protection obligations when using the data

### 4. **Authorization and Agency**
**This is critical for the disclosure workflow:**
- Client appoints ETAnalytics as its authorized agent to exercise disclosure rights under Irish Companies Act 2014
- Scope of authority: sending disclosure requests, receiving responses, following up with non-compliant parties
- Client warrants they have the legal right to delegate this authority
- Client indemnifies ETAnalytics for acting in good faith within scope of authority
- ETAnalytics will act in accordance with Client's instructions and applicable law

### 5. **Data Protection and Confidentiality**
**GDPR compliance is essential:**
- Define roles: Is ETAnalytics a Data Processor or Data Controller? (Likely **Processor** for share register data)
- Client remains Data Controller for share register data
- ETAnalytics is Data Controller for its proprietary entity database
- Standard GDPR processor obligations: confidentiality, security, sub-processing, data subject rights, breach notification
- Retention period for share register data (suggest: duration of contract + 3 years for audit)
- Right to audit ETAnalytics' security measures
- Explicit clause: ETAnalytics will NOT share Client's share register data with third parties except as necessary to perform Services (i.e., sending disclosure requests to custodians)

### 6. **Intellectual Property**
Clear ownership:
- Client retains ownership of share register data
- ETAnalytics retains ownership of:
  - Entity database
  - Platform software
  - Matching algorithms
  - Report templates
- **Client owns the output reports** (beneficial ownership data derived from analysis)
- License grants: Client gets non-exclusive license to use Platform during term
- No reverse engineering of ETAnalytics' algorithms or database

### 7. **Fees and Payment Terms**
- Annual fee based on selected tier
- Payment terms: annual in advance OR quarterly in arrears (specify)
- Late payment interest (statutory rate or specified rate, e.g., 8% above Bank of England base rate)
- Fee increases: CPI-linked annual increase or fixed % (suggest: max 5% per year with 90 days notice)
- Additional products/services: how are they priced if Client exceeds tier limits?
- Expenses: are custodian response costs, legal costs, or other expenses passed through? (Recommend: included in annual fee)

### 8. **Term and Termination**
- Initial term: 1 year, 2 years, or 3 years (specify based on tier)
- Auto-renewal: 12 months at a time unless either party gives 90 days notice
- Termination for cause: material breach with 30 days cure period, insolvency, gross negligence
- Termination for convenience: either party with 90 days notice (consider notice period based on tier - longer for Enterprise?)
- Effect of termination:
  - Client loses platform access
  - ETAnalytics must return or destroy share register data (Client's choice)
  - Client retains ownership of all reports generated prior to termination
  - Fees due for services rendered up to termination date (no refunds for pre-paid periods)

### 9. **Service Levels and Performance Guarantees**
Based on tier, specify:
- **Starter:**
  - Quarterly full analysis within 90 days of share register upload
  - Email support response within 48 hours
  - 99% platform uptime (monthly)
- **Professional:**
  - Monthly full analysis within 60 days of share register upload
  - Support response within 24 hours
  - 99.5% platform uptime
  - API availability: 99.5%
- **Enterprise:**
  - On-demand analysis within agreed timelines
  - Support response within 4 hours (business hours) or 24 hours (out of hours)
  - 99.9% platform uptime
  - SLA credits for missed targets (e.g., 5% monthly fee credit per percentage point below SLA)

**Disclosure Request Performance:**
- 95%+ custodian response rate within 30 days (reasonable endeavors basis - ETAnalytics cannot control custodian behavior)
- Escalation process for non-responsive custodians

### 10. **Limitations of Liability**
Standard commercial limitations:
- **Excluded liability:** Neither party excludes liability for death/personal injury, fraud, or deliberate default
- **Capped liability for other claims:**
  - General cap: 100% of fees paid in the 12 months prior to claim (standard SaaS practice)
  - Enterprise tier: consider higher cap or uncapped for data breaches given sensitivity
- **Consequential loss exclusion:** Neither party liable for loss of profits, revenue, business, data, or goodwill (except for Client's data loss caused by ETAnalytics' gross negligence)
- **Accuracy disclaimer:** ETAnalytics makes reasonable efforts to ensure accuracy but does not guarantee 100% accuracy of entity matching (custodian disclosure responses are accurate as received; matching is 95%+ accurate)

### 11. **Warranties and Disclaimers**
**ETAnalytics warrants:**
- Services will be performed with reasonable skill and care
- Platform will materially conform to documentation
- It has authority to enter into this agreement and grant licenses
- Services will comply with applicable laws (GDPR, data protection, etc.)
- It will use commercially reasonable security measures

**Client warrants:**
- It has legal authority to provide share register data to ETAnalytics
- ETF products are Irish-domiciled and subject to Irish Companies Act 2014 disclosure rights
- It has authority to appoint ETAnalytics as its agent for disclosure requests
- Share register data does not infringe third-party rights

**Disclaimer:**
- Services provided "as is" except for express warranties
- No warranty that disclosure requests will always succeed (custodian compliance is outside ETAnalytics' control)
- No warranty of uninterrupted service (subject to SLA)

### 12. **Indemnities**
**Client indemnifies ETAnalytics against:**
- Claims arising from Client's breach of warranties (e.g., Client didn't have right to provide data)
- Claims arising from ETAnalytics acting within scope of authority as Client's agent for disclosure requests
- Client's misuse of beneficial ownership data (e.g., GDPR violations)

**ETAnalytics indemnifies Client against:**
- Third-party IP infringement claims related to Platform
- Data breaches caused by ETAnalytics' negligence or failure to meet security standards
- Claims arising from ETAnalytics exceeding scope of authority as agent

### 13. **Security and Compliance**
**ETAnalytics commits to:**
- Industry-standard security measures (encryption at rest and in transit, access controls, audit logs)
- ISO 27001 certification (in progress) or equivalent security framework
- Regular penetration testing and vulnerability assessments
- SOC 2 Type II certification (in progress) - timeline to be specified
- Secure data deletion protocols upon termination
- Incident response plan with notification to Client within 24 hours of discovering breach

**Compliance with:**
- GDPR and UK Data Protection Act 2018
- FCA regulations (to the extent applicable to the services)
- Irish Companies Act 2014 (for disclosure requests)

### 14. **Force Majeure**
Standard force majeure clause:
- Neither party liable for failure to perform due to events beyond reasonable control
- Examples: pandemic, natural disaster, war, terrorism, government action, strikes, cyber-attacks
- Obligation to mitigate impact and notify other party
- Right to terminate if force majeure continues for 90+ days

### 15. **Dispute Resolution**
- **Escalation:** Disputes first escalated to senior management (30 days to resolve)
- **Mediation:** If not resolved, either party can request mediation (non-binding, 60 days)
- **Arbitration vs. Litigation:**
  - Option A: London Court of International Arbitration (LCIA) - 1 arbitrator, English law, confidential
  - Option B: English courts (High Court, Commercial Court) - public proceedings
  - **Recommendation for ETAnalytics:** Arbitration (keeps disputes confidential, important for reputation in financial services)

### 16. **Governing Law and Jurisdiction**
- Governing law: England and Wales
- Jurisdiction: English courts (if litigation) or LCIA arbitration (if arbitration chosen)

### 17. **General Provisions**
- **Entire agreement:** This contract supersedes all prior agreements/understandings
- **Amendments:** Must be in writing, signed by both parties
- **Assignment:** Neither party can assign without consent (except to affiliates or in case of merger/acquisition with 30 days notice)
- **Notices:** How and where to send formal notices (email + registered mail recommended)
- **Severability:** If any clause is invalid, remainder of contract remains in force
- **Waiver:** Failure to enforce a right doesn't waive that right
- **Relationship:** Parties are independent contractors, not partners or joint venturers (except for agency relationship for disclosure requests)
- **Counterparts:** Contract can be signed in counterparts (each party signs a copy, both together form one agreement)

### 18. **Schedules/Annexes**
Include as attachments:
- **Schedule 1:** List of ETF Products (ISINs) covered by the agreement
- **Schedule 2:** Pricing and payment schedule
- **Schedule 3:** Service Level Agreement (SLA) details
- **Schedule 4:** Form of authorization letter (Client's authorization for ETAnalytics to send disclosure requests)
- **Schedule 5:** Data Processing Addendum (GDPR-compliant processor terms)
- **Schedule 6:** Security standards and compliance certifications
- **Schedule 7:** Support procedures and escalation matrix

---

## Special Considerations for This Contract

### 1. **Regulatory Risk**
The service depends on Irish Companies Act 2014 disclosure rights. Consider:
- What happens if the law changes and disclosure rights are restricted/removed?
- Clause: "If a change in law materially impacts ETAnalytics' ability to perform Services, parties will negotiate in good faith to adjust terms or terminate without penalty."

### 2. **Data Sensitivity**
Share register data is highly sensitive. The contract must:
- Emphasize confidentiality obligations
- Specify security measures (encryption, access controls, SOC 2)
- Provide for immediate termination and data return if data breach occurs due to ETAnalytics' negligence

### 3. **Agent Authority**
The agency relationship for disclosure requests is unusual and critical. Consider:
- Require Client to provide a formal authorization letter (template in Schedule 4)
- Specify scope of authority precisely (what ETAnalytics can and cannot do)
- Include indemnity for ETAnalytics when acting within scope of authority

### 4. **Accuracy of Entity Matching**
ETAnalytics claims 95%+ entity matching accuracy. Consider:
- Disclosure: "Entity matching is based on proprietary algorithms and database. Accuracy is estimated at 95%+ but not guaranteed."
- Client's right to challenge matches and request review
- No liability for matching errors unless gross negligence

### 5. **Competitor Restrictions**
Does ETAnalytics want to restrict Client from:
- Using competitor services during contract term? (Probably not enforceable and commercially unwise)
- Reverse engineering ETAnalytics' database or algorithms? (Yes - include non-circumvention clause)

### 6. **Data Retention After Termination**
- Client likely wants to retain access to historical reports
- Clause: "Upon termination, Client retains ownership of all reports generated prior to termination. ETAnalytics will provide final export of all reports in PDF and CSV format."

---

## Tone and Style Guidelines

- **Clear and commercial:** Avoid legalese where possible. Use plain English.
- **Balanced:** Protect both parties fairly. Don't be one-sided.
- **Specific:** Define obligations precisely (e.g., "within 48 hours" not "promptly")
- **Professional:** This is a high-value B2B contract for sophisticated financial services clients

---

## Deliverable Format

Please provide:

1. **Full draft contract** with all sections above
2. **Executive summary** (1 page) highlighting key commercial terms
3. **Commentary** noting any provisions that are:
   - Non-standard or unusual
   - Particularly favorable/unfavorable to one party
   - Require negotiation or customization for specific clients

---

## Additional Context

**Typical Clients:**
- European ETF issuers (BlackRock, Vanguard, Amundi, State Street, Invesco, DWS, etc.)
- Asset managers launching Irish-domiciled UCITS ETFs
- Boutique ETF providers seeking distribution intelligence

**Contract Negotiation Leverage:**
- ETAnalytics is the only platform operationalizing Irish disclosure rights at scale
- Clients have tried DIY and failed (takes 6-12 months, requires legal expertise)
- Competitive advantage: automation, entity database, expertise

**Risk Tolerance:**
- ETAnalytics is a startup/scale-up - needs to balance protection with commercial flexibility
- Cannot afford uncapped liability exposure
- Must protect proprietary entity database and algorithms

---

## Final Notes

- This contract should be suitable for **all three pricing tiers** with tier-specific terms in Schedule 3 (SLA)
- Consider creating a **shorter "Starter" version** (simplified terms) and a **full "Enterprise" version** (comprehensive terms with SLA penalties)
- Include placeholders for party details (company names, addresses, registration numbers)
- Flag any clauses that typically require negotiation (e.g., liability caps, SLA credits, termination notice periods)

---

**Now draft the contract. Be thorough, be clear, and be commercially sensible. This contract will be used with major financial institutions, so it must be of the highest professional standard.**

---

**Date of Drafting:** [Insert date]  
**Drafted by:** [Your name/firm]  
**For and on behalf of:** ETAnalytics Ltd

---

## Checklist Before Finalizing

- [ ] All defined terms are used consistently throughout
- [ ] Pricing and payment terms are clear
- [ ] Data protection obligations comply with GDPR
- [ ] Agency authority for disclosure requests is clearly defined
- [ ] Liability caps are reasonable and not one-sided
- [ ] Termination rights are balanced
- [ ] Schedules are referenced and attached
- [ ] Signature blocks are included for both parties
- [ ] Contract is dated and witnessed (if required)

---

**Good luck! Draft a world-class Service Agreement.** 🏛️⚖️



