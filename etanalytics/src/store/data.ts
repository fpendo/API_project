import { 
  Issuer, 
  ETF, 
  ShareRegister, 
  ShareRegisterEntry,
  ETFColumn,
  KnownEntity, 
  OwnershipAnalysis,
  DailyChange,
  AnalysisReport,
  EntityType
} from '../types'

// Sample Issuers - All major UCITS ETF providers
export const sampleIssuers: Issuer[] = [
  {
    id: 'amundi',
    name: 'Amundi',
    etfCount: 42,
    totalAum: 98500000000,
    createdAt: '2024-06-15'
  },
  {
    id: 'blackrock',
    name: 'BlackRock (iShares)',
    etfCount: 89,
    totalAum: 456000000000,
    createdAt: '2024-01-15'
  },
  {
    id: 'vanguard',
    name: 'Vanguard',
    etfCount: 28,
    totalAum: 156000000000,
    createdAt: '2024-03-20'
  },
  {
    id: 'invesco',
    name: 'Invesco',
    etfCount: 67,
    totalAum: 82000000000,
    createdAt: '2024-08-01'
  },
  {
    id: 'spdr',
    name: 'SPDR (State Street)',
    etfCount: 45,
    totalAum: 124000000000,
    createdAt: '2024-02-10'
  },
  {
    id: 'xtrackers',
    name: 'Xtrackers (DWS)',
    etfCount: 38,
    totalAum: 68000000000,
    createdAt: '2024-04-05'
  }
]

// Sample ETFs
export const sampleETFs: ETF[] = [
  {
    id: 'etf-001',
    issuerId: 'iss-001',
    name: 'Amundi MSCI World UCITS ETF',
    isin: 'IE00B4L5Y983',
    ticker: 'MWRD',
    aum: 12500000000,
    nav: 98.45,
    sharesOutstanding: 126952000,
    currency: 'USD',
    domicile: 'Ireland',
    lastUpdated: '2026-01-13'
  },
  {
    id: 'etf-002',
    issuerId: 'iss-001',
    name: 'Amundi S&P 500 UCITS ETF',
    isin: 'IE00B5BMR087',
    ticker: 'SP5C',
    aum: 8200000000,
    nav: 156.32,
    sharesOutstanding: 52458000,
    currency: 'USD',
    domicile: 'Ireland',
    lastUpdated: '2026-01-13'
  },
  {
    id: 'etf-003',
    issuerId: 'iss-002',
    name: 'Vanguard FTSE All-World UCITS ETF',
    isin: 'IE00BK5BQT80',
    ticker: 'VWRL',
    aum: 28400000000,
    nav: 112.87,
    sharesOutstanding: 251622000,
    currency: 'USD',
    domicile: 'Ireland',
    lastUpdated: '2026-01-13'
  }
]

// Known Entities Database - Comprehensive custody chain database
export const knownEntities: KnownEntity[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CENTRAL SECURITIES DEPOSITORIES (CSDs) - Always Level 1 in custody chain
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-001',
    name: 'Euroclear Bank SA/NV',
    nameVariations: ['EUROCLEAR BANK', 'EUROCLEAR BANK SA', 'EUROCLEAR BANK NV', 'EUROCLEAR NOMINEES LIMITED'],
    type: 'csd',
    country: 'Belgium',
    lei: '549300OZ46BRLZ8Y6F65',
    nomineeNames: ['EUROCLEAR NOMINEES LIMITED', 'EUROCLEAR BANK NOMINEES'],
    tags: ['icsd', 'tier1', 'always_drill_down'],
    notes: 'International CSD - always requires drilling down to see underlying custodians',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-002',
    name: 'Clearstream Banking S.A.',
    nameVariations: ['CLEARSTREAM BANKING', 'CLEARSTREAM', 'CBL', 'CLEARSTREAM NOMINEES LIMITED'],
    type: 'csd',
    country: 'Luxembourg',
    lei: '549300LLGWCQ4E2SZT69',
    nomineeNames: ['CLEARSTREAM NOMINEES LIMITED', 'CLEARSTREAM BANKING NOMINEES'],
    tags: ['icsd', 'tier1', 'always_drill_down'],
    notes: 'International CSD - always requires drilling down to see underlying custodians',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-003',
    name: 'Euroclear UK & International (CREST)',
    nameVariations: ['CREST', 'CRESTCO', 'EUROCLEAR UK', 'CREST NOMINEES LIMITED', 'CREST DEPOSITORY LIMITED'],
    type: 'csd',
    country: 'United Kingdom',
    lei: '5493009EWX2BL11BVO80',
    nomineeNames: ['CREST NOMINEES LIMITED', 'CREST INTERNATIONAL NOMINEES LIMITED'],
    tags: ['csd', 'uk', 'always_drill_down'],
    notes: 'UK CSD - requires drilling down',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-004',
    name: 'DTC (Depository Trust Company)',
    nameVariations: ['DTC', 'DEPOSITORY TRUST COMPANY', 'CEDE & CO', 'CEDE AND CO'],
    type: 'csd',
    country: 'United States',
    lei: '549300QUFBJX1WNVCS06',
    nomineeNames: ['CEDE & CO', 'DTC PARTICIPANTS'],
    tags: ['csd', 'us', 'always_drill_down'],
    notes: 'US CSD - nominee name is Cede & Co',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-005',
    name: 'Japan Securities Depository Center (JASDEC)',
    nameVariations: ['JASDEC', 'JAPAN SECURITIES DEPOSITORY CENTER'],
    type: 'csd',
    country: 'Japan',
    lei: '353800DH3S3W6QHKJ267',
    nomineeNames: ['JASDEC NOMINEES'],
    tags: ['csd', 'japan', 'always_drill_down'],
    notes: 'Japanese CSD - requires drilling through regional/local custodians',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-006',
    name: 'Monte Titoli S.p.A.',
    nameVariations: ['MONTE TITOLI', 'MONTE TITOLI SPA'],
    type: 'csd',
    country: 'Italy',
    lei: '815600AD83A5E3C59D96',
    nomineeNames: ['MONTE TITOLI NOMINEES'],
    tags: ['csd', 'italy', 'always_drill_down'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-007',
    name: 'Clearstream Banking AG (Frankfurt)',
    nameVariations: ['CLEARSTREAM AG', 'CLEARSTREAM BANKING AG', 'CBF'],
    type: 'csd',
    country: 'Germany',
    lei: '549300298FD7M9JREC62',
    nomineeNames: ['CLEARSTREAM BANKING AG NOMINEES'],
    tags: ['csd', 'germany', 'always_drill_down'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-008',
    name: 'Euroclear France',
    nameVariations: ['EUROCLEAR FRANCE', 'EUROCLEAR FRANCE SA'],
    type: 'csd',
    country: 'France',
    lei: '969500NW5DUFLMFPNQ77',
    nomineeNames: ['EUROCLEAR FRANCE NOMINEES'],
    tags: ['csd', 'france', 'always_drill_down'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL CUSTODIANS - Can be Level 2 under CSDs or direct
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-010',
    name: 'State Street Bank and Trust Company',
    nameVariations: ['STATE STREET', 'STATE STREET BANK', 'SSB', 'STATE STREET CORPORATION'],
    type: 'global_custodian',
    country: 'United States',
    lei: '571474TGEMMWANRLN572',
    nomineeNames: ['STATE STREET NOMINEES LIMITED', 'STATE STREET CUSTODIAL SERVICES', 'SSB NOMINEES'],
    dedicatedAccountPattern: 'STATE STREET NOMINEES LIMITED A/C [0-9]+[A-Z]?',
    tags: ['global_custodian', 'tier1'],
    notes: 'Dedicated accounts have format "12N", "45B" etc. Pooled account has no suffix.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-011',
    name: 'The Bank of New York Mellon',
    nameVariations: ['BNY MELLON', 'BANK OF NEW YORK MELLON', 'BNYM', 'BNY'],
    type: 'global_custodian',
    country: 'United States',
    lei: 'HPFHU0OQ28E4N0NFVK49',
    nomineeNames: ['BNY MELLON NOMINEES LIMITED', 'BNYM NOMINEES LTD', 'THE BANK OF NEW YORK NOMINEES'],
    dedicatedAccountPattern: 'BNY MELLON NOMINEES LIMITED A/C [0-9]+',
    tags: ['global_custodian', 'tier1'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-012',
    name: 'Northern Trust Company',
    nameVariations: ['NORTHERN TRUST', 'NTC', 'NTRS', 'NORTHERN TRUST CORPORATION'],
    type: 'global_custodian',
    country: 'United States',
    lei: '6PTKHDJ8HDUF78PFWH30',
    nomineeNames: ['NORTRUST NOMINEES LIMITED', 'NORTHERN TRUST NOMINEES LTD', 'NTC NOMINEES'],
    tags: ['global_custodian', 'tier1'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-013',
    name: 'JPMorgan Chase Bank',
    nameVariations: ['JPMORGAN', 'JP MORGAN', 'JPMORGAN CHASE', 'JPM'],
    type: 'global_custodian',
    country: 'United States',
    lei: '7H6GLXDRUGQFU57RNE97',
    nomineeNames: ['JPMORGAN NOMINEES LIMITED', 'JPMORGAN CHASE NOMINEES', 'JPM NOMINEES'],
    tags: ['global_custodian', 'tier1'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-014',
    name: 'Citibank N.A.',
    nameVariations: ['CITIBANK', 'CITI', 'CITIGROUP'],
    type: 'global_custodian',
    country: 'United States',
    lei: 'E57ODZWZ7FF32TWEFA76',
    nomineeNames: ['CITIBANK NOMINEES LIMITED', 'CITI NOMINEES', 'CITIBANK NA NOMINEES'],
    tags: ['global_custodian', 'tier1'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-015',
    name: 'HSBC Bank plc',
    nameVariations: ['HSBC', 'HSBC BANK', 'HSBC HOLDINGS'],
    type: 'global_custodian',
    country: 'United Kingdom',
    lei: 'MP6I5ZYZBEU3UXPYFY54',
    nomineeNames: ['HSBC NOMINEES LIMITED', 'HSBC GLOBAL CUSTODY NOMINEES'],
    tags: ['global_custodian', 'tier1', 'uk'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-016',
    name: 'Brown Brothers Harriman',
    nameVariations: ['BBH', 'BROWN BROTHERS HARRIMAN', 'BROWN BROTHERS'],
    type: 'global_custodian',
    country: 'United States',
    lei: '5493006KMX1VFTPYPW19',
    nomineeNames: ['BBH NOMINEES LIMITED', 'BROWN BROTHERS HARRIMAN NOMINEES'],
    tags: ['global_custodian', 'tier1'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REGIONAL/LOCAL CUSTODIANS - Level 3+ for international chains
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-017',
    name: 'Mizuho Trust & Banking',
    nameVariations: ['MIZUHO TRUST', 'MIZUHO TRUST AND BANKING', 'MIZUHO'],
    type: 'local_custodian',
    country: 'Japan',
    lei: '5493006WIFL8N6V9JL85',
    nomineeNames: ['MIZUHO TRUST NOMINEES'],
    tags: ['local_custodian', 'japan'],
    notes: 'Japanese local custodian - often appears under global custodians for Japanese clients',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-018',
    name: 'SMBC Trust Bank',
    nameVariations: ['SMBC TRUST', 'SUMITOMO MITSUI TRUST', 'SMTB'],
    type: 'local_custodian',
    country: 'Japan',
    lei: '353800XVDQZTWK2CGA12',
    nomineeNames: ['SMBC TRUST NOMINEES'],
    tags: ['local_custodian', 'japan'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-019',
    name: 'Caceis Bank',
    nameVariations: ['CACEIS', 'CACEIS BANK FRANCE'],
    type: 'local_custodian',
    country: 'France',
    lei: '96950022GQ8F1SMRDF62',
    nomineeNames: ['CACEIS NOMINEES'],
    tags: ['local_custodian', 'france', 'europe'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WEALTH MANAGERS - Level 0 (Final destination - investment decision maker)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-020',
    name: 'Brewin Dolphin',
    nameVariations: ['BREWIN DOLPHIN LIMITED', 'BREWIN DOLPHIN HOLDINGS', 'BREWIN'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '213800UV6S1GCYQ3L187',
    fcaRef: '124973',
    nomineeNames: ['BREWIN DOLPHIN NOMINEES LIMITED', 'BREWIN NOMINEES LTD', 'BREWIN NOMINEES'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    notes: 'Dedicated nominee account - no further drilling required. Investment decision maker.',
    aumBand: '£50bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-021',
    name: 'Rathbones Group Plc',
    nameVariations: ['RATHBONES', 'RATHBONE BROTHERS', 'RATHBONES INVESTMENT MANAGEMENT'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '213800FKBV1LKXDJ3S19',
    fcaRef: '119293',
    nomineeNames: ['RATHBONE NOMINEES LIMITED', 'RATHBONES NOMINEES LTD'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    aumBand: '£80bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-022',
    name: 'St. James\'s Place Wealth Management',
    nameVariations: ['SJP', 'ST JAMES PLACE', 'ST JAMESS PLACE', 'SAINT JAMES PLACE'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '213800WZF26SWHWNHY44',
    fcaRef: '162518',
    nomineeNames: ['SJP NOMINEES LIMITED', 'ST JAMES PLACE NOMINEES LTD'],
    tags: ['wealth_manager', 'advisory', 'uk', 'large', 'level_0'],
    aumBand: '£150bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-023',
    name: 'Evelyn Partners',
    nameVariations: ['EVELYN PARTNERS', 'TILNEY SMITH WILLIAMSON', 'TILNEY', 'SMITH WILLIAMSON'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '213800LVT2E6FKXMP691',
    fcaRef: '124778',
    nomineeNames: ['EVELYN NOMINEES LIMITED', 'TILNEY NOMINEES LTD', 'EVELYN PARTNERS NOMINEES'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    aumBand: '£60bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-024',
    name: 'Quilter Cheviot',
    nameVariations: ['QUILTER CHEVIOT', 'QUILTER', 'QUILTER PLC'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '21380049MW7RM20VDQ96',
    fcaRef: '124854',
    nomineeNames: ['QUILTER NOMINEES LIMITED', 'QUILTER CHEVIOT NOMINEES'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    aumBand: '£25bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-025',
    name: 'Charles Stanley',
    nameVariations: ['CHARLES STANLEY', 'CHARLES STANLEY GROUP'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '213800TYHVGSQXNQES15',
    fcaRef: '124412',
    nomineeNames: ['CHARLES STANLEY NOMINEES LIMITED'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    aumBand: '£25bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-026',
    name: 'Investec Wealth & Investment',
    nameVariations: ['INVESTEC', 'INVESTEC WEALTH', 'INVESTEC W&I'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: 'N1B5LYH2T0K7P9Z3QV67',
    fcaRef: '119742',
    nomineeNames: ['INVESTEC NOMINEES LIMITED', 'INVESTEC WEALTH NOMINEES'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    aumBand: '£40bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-027',
    name: 'Cazenove Capital',
    nameVariations: ['CAZENOVE', 'CAZENOVE CAPITAL MANAGEMENT'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: 'K5XF3DWMH8V6WVZ2JL98',
    fcaRef: '155158',
    nomineeNames: ['CAZENOVE NOMINEES LIMITED', 'CAZENOVE CAPITAL NOMINEES'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    aumBand: '£30bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-028',
    name: 'Saltus Investment Management',
    nameVariations: ['SALTUS', 'SALTUS PARTNERS'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '',
    fcaRef: '472478',
    nomineeNames: ['SALTUS NOMINEES LIMITED'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    aumBand: '£3bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-029',
    name: 'Brooks Macdonald',
    nameVariations: ['BROOKS MACDONALD', 'BROOKS MACDONALD GROUP'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '213800WLMH6ZR8GBHA95',
    fcaRef: '141505',
    nomineeNames: ['BROOKS MACDONALD NOMINEES LIMITED'],
    tags: ['wealth_manager', 'discretionary', 'uk', 'level_0'],
    aumBand: '£17bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE BANKS - Level 0 (Final destination - UHNW investment decision maker)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-030',
    name: 'Coutts & Co',
    nameVariations: ['COUTTS', 'COUTTS BANK', 'COUTTS AND CO'],
    type: 'private_bank',
    country: 'United Kingdom',
    lei: 'XQNP5BKNM1RNZPCCX78',
    fcaRef: '122136',
    nomineeNames: ['COUTTS NOMINEES LIMITED', 'COUTTS & CO NOMINEES'],
    tags: ['private_bank', 'uhnw', 'uk', 'level_0'],
    aumBand: '£30bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-031',
    name: 'Julius Baer',
    nameVariations: ['JULIUS BAER', 'JULIUS BAER GROUP', 'JULIUS BÄR', 'JULIUS BAR'],
    type: 'private_bank',
    country: 'Switzerland',
    lei: '5299007MF0AQBXLA4K54',
    nomineeNames: ['JULIUS BAER NOMINEES LIMITED', 'JULIUS BAER NOMINEES'],
    tags: ['private_bank', 'uhnw', 'swiss', 'level_0'],
    aumBand: 'CHF 400bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-032',
    name: 'UBS Wealth Management',
    nameVariations: ['UBS', 'UBS AG', 'UBS WEALTH'],
    type: 'private_bank',
    country: 'Switzerland',
    lei: 'BFM8T61CT2L1QCEMIK50',
    nomineeNames: ['UBS NOMINEES LIMITED', 'UBS WEALTH NOMINEES'],
    tags: ['private_bank', 'uhnw', 'swiss', 'level_0'],
    aumBand: '$2tn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-033',
    name: 'Credit Suisse (now UBS)',
    nameVariations: ['CREDIT SUISSE', 'CS', 'CREDIT SUISSE AG'],
    type: 'private_bank',
    country: 'Switzerland',
    lei: 'ANGGYXNX0JLX3X63JN86',
    nomineeNames: ['CREDIT SUISSE NOMINEES LIMITED'],
    tags: ['private_bank', 'uhnw', 'swiss', 'level_0', 'legacy'],
    aumBand: 'Merged with UBS',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-034',
    name: 'Lombard Odier',
    nameVariations: ['LOMBARD ODIER', 'LOMBARD ODIER GROUP'],
    type: 'private_bank',
    country: 'Switzerland',
    lei: '549300NHJOG9IZKU7E26',
    nomineeNames: ['LOMBARD ODIER NOMINEES LIMITED'],
    tags: ['private_bank', 'uhnw', 'swiss', 'level_0'],
    aumBand: 'CHF 300bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-035',
    name: 'Pictet',
    nameVariations: ['PICTET', 'PICTET GROUP', 'PICTET & CIE'],
    type: 'private_bank',
    country: 'Switzerland',
    lei: '5493008GNK8YM6M3HT64',
    nomineeNames: ['PICTET NOMINEES LIMITED', 'PICTET & CIE NOMINEES'],
    tags: ['private_bank', 'uhnw', 'swiss', 'level_0'],
    aumBand: 'CHF 600bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-036',
    name: 'HSBC Private Bank',
    nameVariations: ['HSBC PRIVATE BANK', 'HSBC PB', 'HSBC PRIVATE BANKING'],
    type: 'private_bank',
    country: 'United Kingdom',
    lei: 'MP6I5ZYZBEU3UXPYFY54',
    fcaRef: '114216',
    nomineeNames: ['HSBC PRIVATE BANK NOMINEES LIMITED'],
    tags: ['private_bank', 'uhnw', 'uk', 'level_0'],
    aumBand: '$300bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-037',
    name: 'Barclays Private Bank',
    nameVariations: ['BARCLAYS PRIVATE BANK', 'BARCLAYS PB', 'BARCLAYS WEALTH'],
    type: 'private_bank',
    country: 'United Kingdom',
    lei: 'G5GSEF7VJP5I7OUK5573',
    fcaRef: '122169',
    nomineeNames: ['BARCLAYS PRIVATE BANK NOMINEES LIMITED', 'BARCLAYS WEALTH NOMINEES'],
    tags: ['private_bank', 'uhnw', 'uk', 'level_0'],
    aumBand: '£150bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTION-ONLY PLATFORMS - Level 0 (No further drilling - next is retail)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-040',
    name: 'Hargreaves Lansdown',
    nameVariations: ['HL', 'HARGREAVES LANSDOWN PLC', 'HARGREAVES'],
    type: 'platform',
    country: 'United Kingdom',
    lei: '2138005CXYJHBLZYFSPE',
    fcaRef: '115248',
    nomineeNames: ['HARGREAVES LANSDOWN NOMINEES LIMITED', 'HL NOMINEES LTD', 'HARGREAVES NOMINEES'],
    tags: ['platform', 'execution_only', 'uk', 'retail', 'level_0'],
    notes: 'Execution-only platform. Next level is end retail client - no need to drill further.',
    aumBand: '£130bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-041',
    name: 'Interactive Investor',
    nameVariations: ['II', 'INTERACTIVE INVESTOR SERVICES', 'II LIMITED'],
    type: 'platform',
    country: 'United Kingdom',
    lei: '213800UPSSS9T6P1E969',
    fcaRef: '141282',
    nomineeNames: ['INTERACTIVE INVESTOR NOMINEES LIMITED', 'II NOMINEES'],
    tags: ['platform', 'execution_only', 'uk', 'retail', 'level_0'],
    notes: 'Execution-only platform. Next level is end retail client.',
    aumBand: '£70bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-042',
    name: 'AJ Bell',
    nameVariations: ['AJ BELL PLC', 'AJBELL', 'AJ BELL YOUINVEST'],
    type: 'platform',
    country: 'United Kingdom',
    lei: '213800IMNH4EA9MLKSEO',
    fcaRef: '155593',
    nomineeNames: ['AJ BELL NOMINEES LIMITED', 'AJBELL NOMINEES'],
    tags: ['platform', 'execution_only', 'uk', 'retail', 'level_0'],
    notes: 'Execution-only platform. Next level is end retail client.',
    aumBand: '£80bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-043',
    name: 'Fidelity Personal Investing',
    nameVariations: ['FIDELITY', 'FIDELITY PI', 'FIL'],
    type: 'platform',
    country: 'United Kingdom',
    lei: '5493007NBR52XDQY9S88',
    fcaRef: '122169',
    nomineeNames: ['FIDELITY NOMINEES LIMITED', 'FIL NOMINEES LIMITED'],
    tags: ['platform', 'execution_only', 'uk', 'retail', 'level_0'],
    aumBand: '£90bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-044',
    name: 'Vanguard Personal Investor',
    nameVariations: ['VANGUARD PI', 'VANGUARD PERSONAL', 'VANGUARD INVESTOR'],
    type: 'platform',
    country: 'United Kingdom',
    lei: '549300CFFP7LDCV3EF85',
    fcaRef: '527239',
    nomineeNames: ['VANGUARD NOMINEES LIMITED', 'VANGUARD INVESTOR NOMINEES'],
    tags: ['platform', 'execution_only', 'uk', 'retail', 'level_0'],
    aumBand: '£40bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-045',
    name: 'Charles Schwab UK',
    nameVariations: ['SCHWAB', 'CHARLES SCHWAB', 'SCHWAB UK'],
    type: 'platform',
    country: 'United Kingdom',
    lei: '549300VSGCJ7E698NM86',
    nomineeNames: ['CHARLES SCHWAB NOMINEES LIMITED'],
    tags: ['platform', 'execution_only', 'uk', 'retail', 'level_0'],
    aumBand: '£10bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-046',
    name: 'Trading 212',
    nameVariations: ['TRADING 212', 'TRADING212', 'T212'],
    type: 'platform',
    country: 'United Kingdom',
    lei: '',
    fcaRef: '609146',
    nomineeNames: ['TRADING 212 NOMINEES LIMITED'],
    tags: ['platform', 'execution_only', 'uk', 'retail', 'level_0', 'fintech'],
    aumBand: '£5bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-047',
    name: 'Freetrade',
    nameVariations: ['FREETRADE', 'FREETRADE LTD'],
    type: 'platform',
    country: 'United Kingdom',
    lei: '',
    fcaRef: '771281',
    nomineeNames: ['FREETRADE NOMINEES LIMITED'],
    tags: ['platform', 'execution_only', 'uk', 'retail', 'level_0', 'fintech'],
    aumBand: '£1bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ASSET MANAGERS - Level 0 (Final destination - institutional decision maker)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-050',
    name: 'Schroders Investment Management',
    nameVariations: ['SCHRODERS', 'SCHRODERS PLC', 'SCHRODERS IM'],
    type: 'asset_manager',
    country: 'United Kingdom',
    lei: '21380049M1NXH3ICVF67',
    fcaRef: '122102',
    nomineeNames: ['SCHRODERS NOMINEES LIMITED', 'SCHRODERS IM NOMINEES'],
    tags: ['asset_manager', 'institutional', 'uk', 'level_0'],
    aumBand: '£700bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-051',
    name: 'Legal & General Investment Management',
    nameVariations: ['LGIM', 'LEGAL AND GENERAL', 'L&G', 'LEGAL GENERAL'],
    type: 'asset_manager',
    country: 'United Kingdom',
    lei: '213800JXNLC9FPY3MB67',
    fcaRef: '119272',
    nomineeNames: ['LGIM NOMINEES LIMITED', 'LEGAL GENERAL NOMINEES', 'L&G NOMINEES'],
    tags: ['asset_manager', 'institutional', 'uk', 'passive', 'level_0'],
    aumBand: '£1.2tn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-052',
    name: 'Baillie Gifford',
    nameVariations: ['BAILLIE GIFFORD', 'BG', 'BAILLIE GIFFORD & CO'],
    type: 'asset_manager',
    country: 'United Kingdom',
    lei: '213800LBGA72ZNPNFP96',
    fcaRef: '119179',
    nomineeNames: ['BAILLIE GIFFORD NOMINEES LIMITED'],
    tags: ['asset_manager', 'institutional', 'uk', 'active', 'level_0'],
    aumBand: '£230bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-053',
    name: 'abrdn (Aberdeen Standard)',
    nameVariations: ['ABRDN', 'ABERDEEN', 'ABERDEEN STANDARD', 'ASI'],
    type: 'asset_manager',
    country: 'United Kingdom',
    lei: '549300RHHQVVPITXXI15',
    fcaRef: '181655',
    nomineeNames: ['ABRDN NOMINEES LIMITED', 'ABERDEEN NOMINEES', 'ASI NOMINEES'],
    tags: ['asset_manager', 'institutional', 'uk', 'level_0'],
    aumBand: '£500bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-054',
    name: 'M&G Investments',
    nameVariations: ['M&G', 'M AND G', 'M&G PLC'],
    type: 'asset_manager',
    country: 'United Kingdom',
    lei: '254900TWUJUQ44TQJY84',
    fcaRef: '119359',
    nomineeNames: ['M&G NOMINEES LIMITED', 'M AND G NOMINEES'],
    tags: ['asset_manager', 'institutional', 'uk', 'level_0'],
    aumBand: '£340bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-055',
    name: 'Columbia Threadneedle',
    nameVariations: ['COLUMBIA THREADNEEDLE', 'THREADNEEDLE', 'CTI'],
    type: 'asset_manager',
    country: 'United Kingdom',
    lei: '529900MTNO8OYPEVWX49',
    fcaRef: '122169',
    nomineeNames: ['COLUMBIA THREADNEEDLE NOMINEES LIMITED', 'THREADNEEDLE NOMINEES'],
    tags: ['asset_manager', 'institutional', 'uk', 'level_0'],
    aumBand: '£450bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-056',
    name: 'Ninety One',
    nameVariations: ['NINETY ONE', 'NINETYONE', 'INVESTEC ASSET MANAGEMENT'],
    type: 'asset_manager',
    country: 'United Kingdom',
    lei: '549300HUSRV3YQF8O426',
    fcaRef: '119169',
    nomineeNames: ['NINETY ONE NOMINEES LIMITED'],
    tags: ['asset_manager', 'institutional', 'uk', 'level_0'],
    aumBand: '£130bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-057',
    name: 'Jupiter Asset Management',
    nameVariations: ['JUPITER', 'JUPITER AM', 'JUPITER FUND MANAGEMENT'],
    type: 'asset_manager',
    country: 'United Kingdom',
    lei: '549300OUPBQFMJFQGK19',
    fcaRef: '122169',
    nomineeNames: ['JUPITER NOMINEES LIMITED'],
    tags: ['asset_manager', 'institutional', 'uk', 'active', 'level_0'],
    aumBand: '£50bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-058',
    name: 'Nomura Asset Management',
    nameVariations: ['NOMURA AM', 'NOMURA ASSET', 'NOMURA'],
    type: 'asset_manager',
    country: 'Japan',
    lei: '353800C5S1YO2XEQ6Q02',
    nomineeNames: ['NOMURA NOMINEES LIMITED'],
    tags: ['asset_manager', 'institutional', 'japan', 'level_0'],
    aumBand: '¥60tn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-059',
    name: 'Nikko Asset Management',
    nameVariations: ['NIKKO AM', 'NIKKO ASSET', 'NIKKO'],
    type: 'asset_manager',
    country: 'Japan',
    lei: '353800FA33VLWQ3P2238',
    nomineeNames: ['NIKKO NOMINEES LIMITED'],
    tags: ['asset_manager', 'institutional', 'japan', 'level_0'],
    aumBand: '¥30tn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FUND OF FUNDS - Level 0 (Track underlying fund, but entity is decision maker)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-060',
    name: 'Vanguard LifeStrategy',
    nameVariations: ['VANGUARD LIFESTRATEGY', 'VANGUARD LS'],
    type: 'fund_of_funds',
    country: 'United Kingdom',
    lei: '549300CFFP7LDCV3EF85',
    fcaRef: '527239',
    nomineeNames: ['VANGUARD NOMINEES LIMITED'],
    tags: ['fund_of_funds', 'lifestrategy', 'uk', 'level_0'],
    notes: 'Fund of funds - identifiable but tracks underlying fund holdings',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-061',
    name: 'Nutmeg',
    nameVariations: ['NUTMEG', 'NUTMEG SAVING AND INVESTMENT'],
    type: 'fund_of_funds',
    country: 'United Kingdom',
    lei: '',
    fcaRef: '502899',
    nomineeNames: ['NUTMEG NOMINEES LIMITED'],
    tags: ['fund_of_funds', 'robo_advisor', 'uk', 'level_0', 'fintech'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FAMILY OFFICES - Level 0 (Final destination - UHNW decision maker)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-062',
    name: 'Stonehage Fleming',
    nameVariations: ['STONEHAGE FLEMING', 'STONEHAGE', 'FLEMING FAMILY'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '549300N1SMKPQ1F4T251',
    fcaRef: '178473',
    nomineeNames: ['STONEHAGE FLEMING NOMINEES LIMITED'],
    tags: ['family_office', 'uhnw', 'uk', 'level_0'],
    aumBand: '$80bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-063',
    name: 'Sandaire',
    nameVariations: ['SANDAIRE', 'SANDAIRE LTD'],
    type: 'wealth_manager',
    country: 'United Kingdom',
    lei: '',
    fcaRef: '494583',
    nomineeNames: ['SANDAIRE NOMINEES LIMITED'],
    tags: ['family_office', 'uhnw', 'uk', 'level_0'],
    aumBand: '£5bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PENSION FUNDS - Level 0 (Institutional decision maker)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-064',
    name: 'NEST (National Employment Savings Trust)',
    nameVariations: ['NEST', 'NEST CORPORATION', 'NATIONAL EMPLOYMENT SAVINGS TRUST'],
    type: 'pension_fund',
    country: 'United Kingdom',
    lei: '2138003MTMZQU4BF5J39',
    nomineeNames: ['NEST NOMINEES LIMITED'],
    tags: ['pension_fund', 'institutional', 'uk', 'dc', 'level_0'],
    aumBand: '£30bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-065',
    name: 'Universities Superannuation Scheme',
    nameVariations: ['USS', 'UNIVERSITIES SUPERANNUATION'],
    type: 'pension_fund',
    country: 'United Kingdom',
    lei: '549300LHXWRNQJ5FTP13',
    nomineeNames: ['USS NOMINEES LIMITED'],
    tags: ['pension_fund', 'institutional', 'uk', 'db', 'level_0'],
    aumBand: '£90bn+',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // POOLED NOMINEES - Require disclosure (multiple clients behind one account)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-070',
    name: 'Pershing Securities',
    nameVariations: ['PERSHING', 'PERSHING LLC', 'PERSHING LIMITED'],
    type: 'pooled_nominee',
    parentId: 'ent-011',
    country: 'United States',
    lei: 'ZI8Q1A8EI8LQFJNM0J34',
    nomineeNames: ['PERSHING NOMINEES LIMITED', 'PSNL', 'PERSHING SECURITIES NOMINEES'],
    tags: ['pooled_nominee', 'clearing', 'requires_disclosure'],
    notes: 'Clearing/settlement nominee - pools multiple underlying clients. Always requires disclosure.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-071',
    name: 'Vidacos Nominees',
    nameVariations: ['VIDACOS', 'VIDACOS LIMITED'],
    type: 'pooled_nominee',
    country: 'United Kingdom',
    nomineeNames: ['VIDACOS NOMINEES LIMITED'],
    tags: ['pooled_nominee', 'requires_disclosure'],
    notes: 'Pooled nominee - requires disclosure to identify underlying clients.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-072',
    name: 'Merrill Lynch',
    nameVariations: ['MERRILL LYNCH', 'MERRILL', 'ML'],
    type: 'pooled_nominee',
    parentId: 'ent-011',
    country: 'United States',
    lei: 'GGDZP1BER4PXWP3K2G56',
    nomineeNames: ['MERRILL LYNCH NOMINEES LIMITED', 'ML NOMINEES'],
    tags: ['pooled_nominee', 'requires_disclosure', 'broker'],
    notes: 'Pooled brokerage nominee - requires disclosure.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-073',
    name: 'Goldman Sachs',
    nameVariations: ['GOLDMAN SACHS', 'GS', 'GOLDMAN'],
    type: 'pooled_nominee',
    country: 'United States',
    lei: '784F5XWPLTWKTBV3E584',
    nomineeNames: ['GOLDMAN SACHS NOMINEES LIMITED', 'GS NOMINEES'],
    tags: ['pooled_nominee', 'requires_disclosure', 'broker', 'prime_broker'],
    notes: 'Prime brokerage nominee - requires disclosure.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-074',
    name: 'Morgan Stanley',
    nameVariations: ['MORGAN STANLEY', 'MS'],
    type: 'pooled_nominee',
    country: 'United States',
    lei: 'IGJSJL3JD5P30I6NJZ34',
    nomineeNames: ['MORGAN STANLEY NOMINEES LIMITED', 'MS NOMINEES'],
    tags: ['pooled_nominee', 'requires_disclosure', 'broker', 'prime_broker'],
    notes: 'Prime brokerage nominee - requires disclosure.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MARKET MAKERS - Level 0 (Track but low priority - not investment clients)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ent-080',
    name: 'Jane Street',
    nameVariations: ['JANE STREET', 'JANE STREET CAPITAL', 'JANE STREET GROUP'],
    type: 'market_maker',
    country: 'United States',
    lei: '549300M7WYZNWPPN4K71',
    nomineeNames: ['JANE STREET NOMINEES LIMITED'],
    tags: ['market_maker', 'etf_ap', 'level_0'],
    notes: 'ETF Authorized Participant / Market Maker - inventory, not investment.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-081',
    name: 'Flow Traders',
    nameVariations: ['FLOW TRADERS', 'FLOW TRADERS NV'],
    type: 'market_maker',
    country: 'Netherlands',
    lei: '549300CLJI9XDH12XV51',
    nomineeNames: ['FLOW TRADERS NOMINEES LIMITED'],
    tags: ['market_maker', 'etf_ap', 'level_0'],
    notes: 'ETF Authorized Participant / Market Maker.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ent-082',
    name: 'Citadel Securities',
    nameVariations: ['CITADEL SECURITIES', 'CITADEL'],
    type: 'market_maker',
    country: 'United States',
    lei: '549300PU6MFWRBBQ6L70',
    nomineeNames: ['CITADEL NOMINEES LIMITED'],
    tags: ['market_maker', 'etf_ap', 'level_0'],
    notes: 'Market Maker.',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
]

// Sample Share Register - Matrix format with all ETFs as columns
export const sampleShareRegister: ShareRegister = {
  id: 'reg-001',
  issuerId: 'iss-001',
  uploadDate: '2026-01-13',
  asOfDate: '2026-01-10',
  status: 'pending',
  totalHolders: 20,
  etfColumns: [
    { isin: 'IE00B4L5Y983', name: 'MSCI World UCITS ETF', totalShares: 126952000, nav: 98.45 },
    { isin: 'IE00B5BMR087', name: 'S&P 500 UCITS ETF', totalShares: 82458000, nav: 156.32 },
    { isin: 'IE00BK5BQT80', name: 'FTSE All-World UCITS ETF', totalShares: 104520000, nav: 112.87 },
    { isin: 'IE00B4L5YC18', name: 'Euro Stoxx 50 UCITS ETF', totalShares: 57312000, nav: 45.23 },
    { isin: 'IE00B3RBWM25', name: 'Emerging Markets UCITS ETF', totalShares: 68237000, nav: 38.91 }
  ],
  entries: [
    {
      id: 'entry-001',
      registerId: 'reg-001',
      accountName: 'EUROCLEAR BANK SA/NV',
      accountNumber: 'EU001234',
      holdings: { 'IE00B4L5Y983': 45000000, 'IE00B5BMR087': 28000000, 'IE00BK5BQT80': 32000000, 'IE00B4L5YC18': 18500000, 'IE00B3RBWM25': 22000000 },
      totalShares: 145500000,
      entityType: 'csd',
      confidence: 100,
      requiresDisclosure: true,
      disclosureStatus: 'pending'
    },
    {
      id: 'entry-002',
      registerId: 'reg-001',
      accountName: 'CLEARSTREAM BANKING S.A.',
      accountNumber: 'CL005678',
      holdings: { 'IE00B4L5Y983': 28000000, 'IE00B5BMR087': 18500000, 'IE00BK5BQT80': 24000000, 'IE00B4L5YC18': 12000000, 'IE00B3RBWM25': 15000000 },
      totalShares: 97500000,
      entityType: 'csd',
      confidence: 100,
      requiresDisclosure: true,
      disclosureStatus: 'pending'
    },
    {
      id: 'entry-003',
      registerId: 'reg-001',
      accountName: 'CREST NOMINEES LIMITED',
      accountNumber: 'CR009876',
      holdings: { 'IE00B4L5Y983': 18500000, 'IE00B5BMR087': 12000000, 'IE00BK5BQT80': 16500000, 'IE00B4L5YC18': 9200000, 'IE00B3RBWM25': 11000000 },
      totalShares: 67200000,
      entityType: 'csd',
      confidence: 100,
      requiresDisclosure: true,
      disclosureStatus: 'pending'
    },
    {
      id: 'entry-004',
      registerId: 'reg-001',
      accountName: 'BREWIN DOLPHIN NOMINEES LIMITED',
      accountNumber: 'BD112233',
      holdings: { 'IE00B4L5Y983': 8200000, 'IE00B5BMR087': 5400000, 'IE00BK5BQT80': 7200000, 'IE00B4L5YC18': 4100000, 'IE00B3RBWM25': 4800000 },
      totalShares: 29700000,
      entityType: 'dedicated_nominee',
      resolvedEntity: {
        id: 'ent-020',
        name: 'Brewin Dolphin',
        type: 'wealth_manager',
        country: 'United Kingdom',
        lei: '213800UV6S1GCYQ3L187',
        tags: ['wealth_manager', 'discretionary']
      },
      confidence: 100,
      requiresDisclosure: false
    },
    {
      id: 'entry-005',
      registerId: 'reg-001',
      accountName: 'HARGREAVES LANSDOWN NOMINEES LIMITED',
      accountNumber: 'HL445566',
      holdings: { 'IE00B4L5Y983': 6800000, 'IE00B5BMR087': 4200000, 'IE00BK5BQT80': 5800000, 'IE00B4L5YC18': 3200000, 'IE00B3RBWM25': 3900000 },
      totalShares: 23900000,
      entityType: 'dedicated_nominee',
      resolvedEntity: {
        id: 'ent-040',
        name: 'Hargreaves Lansdown',
        type: 'platform',
        country: 'United Kingdom',
        lei: '2138005CXYJHBLZYF SEQ',
        tags: ['platform', 'execution_only']
      },
      confidence: 100,
      requiresDisclosure: false
    },
    {
      id: 'entry-006',
      registerId: 'reg-001',
      accountName: 'RATHBONE NOMINEES LIMITED',
      accountNumber: 'RN778899',
      holdings: { 'IE00B4L5Y983': 4200000, 'IE00B5BMR087': 2800000, 'IE00BK5BQT80': 3600000, 'IE00B4L5YC18': 2100000, 'IE00B3RBWM25': 2400000 },
      totalShares: 15100000,
      entityType: 'dedicated_nominee',
      resolvedEntity: {
        id: 'ent-021',
        name: 'Rathbones Group Plc',
        type: 'wealth_manager',
        country: 'United Kingdom',
        lei: '213800FKBV1LKXDJ3S19',
        tags: ['wealth_manager', 'discretionary']
      },
      confidence: 100,
      requiresDisclosure: false
    },
    {
      id: 'entry-007',
      registerId: 'reg-001',
      accountName: 'INTERACTIVE INVESTOR NOMINEES LIMITED',
      accountNumber: 'II990011',
      holdings: { 'IE00B4L5Y983': 3800000, 'IE00B5BMR087': 2400000, 'IE00BK5BQT80': 3200000, 'IE00B4L5YC18': 1800000, 'IE00B3RBWM25': 2100000 },
      totalShares: 13300000,
      entityType: 'dedicated_nominee',
      resolvedEntity: {
        id: 'ent-041',
        name: 'Interactive Investor',
        type: 'platform',
        country: 'United Kingdom',
        lei: '213800UPSSS9T6P1E969',
        tags: ['platform', 'execution_only']
      },
      confidence: 100,
      requiresDisclosure: false
    },
    {
      id: 'entry-008',
      registerId: 'reg-001',
      accountName: 'SJP NOMINEES LIMITED',
      accountNumber: 'SJ223344',
      holdings: { 'IE00B4L5Y983': 3200000, 'IE00B5BMR087': 2100000, 'IE00BK5BQT80': 2800000, 'IE00B4L5YC18': 1500000, 'IE00B3RBWM25': 1800000 },
      totalShares: 11400000,
      entityType: 'dedicated_nominee',
      resolvedEntity: {
        id: 'ent-022',
        name: 'St. James\'s Place Wealth Management',
        type: 'wealth_manager',
        country: 'United Kingdom',
        lei: '213800WZF26SWHWNHY44',
        tags: ['wealth_manager', 'advisory']
      },
      confidence: 100,
      requiresDisclosure: false
    },
    {
      id: 'entry-009',
      registerId: 'reg-001',
      accountName: 'PERSHING NOMINEES LIMITED',
      accountNumber: 'PS556677',
      holdings: { 'IE00B4L5Y983': 2800000, 'IE00B5BMR087': 1800000, 'IE00BK5BQT80': 2400000, 'IE00B4L5YC18': 1200000, 'IE00B3RBWM25': 1500000 },
      totalShares: 9700000,
      entityType: 'pooled_nominee',
      confidence: 0,
      requiresDisclosure: true,
      disclosureStatus: 'pending'
    },
    {
      id: 'entry-010',
      registerId: 'reg-001',
      accountName: 'AJ BELL NOMINEES LIMITED',
      accountNumber: 'AJ889900',
      holdings: { 'IE00B4L5Y983': 2100000, 'IE00B5BMR087': 1400000, 'IE00BK5BQT80': 1800000, 'IE00B4L5YC18': 950000, 'IE00B3RBWM25': 1200000 },
      totalShares: 7450000,
      entityType: 'dedicated_nominee',
      resolvedEntity: {
        id: 'ent-042',
        name: 'AJ Bell',
        type: 'platform',
        country: 'United Kingdom',
        lei: '213800IMNH4EA9MLK SEQ',
        tags: ['platform', 'execution_only']
      },
      confidence: 100,
      requiresDisclosure: false
    },
    {
      id: 'entry-011',
      registerId: 'reg-001',
      accountName: 'VIDACOS NOMINEES LIMITED',
      accountNumber: 'VD112244',
      holdings: { 'IE00B4L5Y983': 1850000, 'IE00B5BMR087': 1200000, 'IE00BK5BQT80': 1600000, 'IE00B4L5YC18': 850000, 'IE00B3RBWM25': 1000000 },
      totalShares: 6500000,
      entityType: 'pooled_nominee',
      confidence: 0,
      requiresDisclosure: true,
      disclosureStatus: 'pending'
    },
    {
      id: 'entry-012',
      registerId: 'reg-001',
      accountName: 'COUTTS NOMINEES LIMITED',
      accountNumber: 'CT334455',
      holdings: { 'IE00B4L5Y983': 1500000, 'IE00B5BMR087': 980000, 'IE00BK5BQT80': 1300000, 'IE00B4L5YC18': 720000, 'IE00B3RBWM25': 850000 },
      totalShares: 5350000,
      entityType: 'dedicated_nominee',
      resolvedEntity: {
        id: 'ent-030',
        name: 'Coutts & Co',
        type: 'private_bank',
        country: 'United Kingdom',
        lei: 'XQNP5BKNM1RNZPCCX78',
        tags: ['private_bank', 'uhnw']
      },
      confidence: 100,
      requiresDisclosure: false
    },
    {
      id: 'entry-013',
      registerId: 'reg-001',
      accountName: 'SCHRODERS NOMINEES LIMITED',
      accountNumber: 'SC667788',
      holdings: { 'IE00B4L5Y983': 850000, 'IE00B5BMR087': 550000, 'IE00BK5BQT80': 720000, 'IE00B4L5YC18': 380000, 'IE00B3RBWM25': 480000 },
      totalShares: 2980000,
      entityType: 'dedicated_nominee',
      resolvedEntity: {
        id: 'ent-050',
        name: 'Schroders Investment Management',
        type: 'asset_manager',
        country: 'United Kingdom',
        lei: '21380049M1NXH3ICVF67',
        tags: ['asset_manager', 'institutional']
      },
      confidence: 100,
      requiresDisclosure: false
    },
    {
      id: 'entry-014',
      registerId: 'reg-001',
      accountName: 'UNKNOWN NOMINEE ACCOUNT XYZ',
      accountNumber: 'UN001122',
      holdings: { 'IE00B4L5Y983': 152000, 'IE00B5BMR087': 98000, 'IE00BK5BQT80': 130000, 'IE00B4L5YC18': 72000, 'IE00B3RBWM25': 85000 },
      totalShares: 537000,
      entityType: 'unknown',
      confidence: 0,
      requiresDisclosure: true,
      disclosureStatus: 'pending'
    }
  ]
}

// Sample Daily Changes
export const sampleDailyChanges: DailyChange[] = [
  {
    date: '2026-01-13',
    etfId: 'etf-001',
    nav: 98.45,
    sharesOutstanding: 126952000,
    netNewAssets: 45000000,
    topChanges: [
      { entity: 'Hargreaves Lansdown', shareChange: 280000, percentChange: 4.3 },
      { entity: 'Brewin Dolphin', shareChange: 150000, percentChange: 1.9 },
      { entity: 'AJ Bell', shareChange: -85000, percentChange: -3.9 }
    ]
  },
  {
    date: '2026-01-12',
    etfId: 'etf-001',
    nav: 97.82,
    sharesOutstanding: 126672000,
    netNewAssets: -12000000,
    topChanges: [
      { entity: 'Rathbones', shareChange: -120000, percentChange: -2.8 },
      { entity: 'Interactive Investor', shareChange: 95000, percentChange: 2.6 }
    ]
  },
  {
    date: '2026-01-11',
    etfId: 'etf-001',
    nav: 98.15,
    sharesOutstanding: 126795000,
    netNewAssets: 28000000,
    topChanges: [
      { entity: 'St. James\'s Place', shareChange: 200000, percentChange: 6.7 },
      { entity: 'Coutts', shareChange: 75000, percentChange: 5.3 }
    ]
  }
]

// Generate artificial share register data for upload simulation
export function generateArtificialRegister(etfName: string, isin: string): string {
  const holders = [
    { name: 'EUROCLEAR BANK SA/NV', shares: Math.floor(Math.random() * 50000000) + 30000000 },
    { name: 'CLEARSTREAM BANKING S.A.', shares: Math.floor(Math.random() * 30000000) + 20000000 },
    { name: 'CREST NOMINEES LIMITED', shares: Math.floor(Math.random() * 20000000) + 10000000 },
    { name: 'BREWIN DOLPHIN NOMINEES LIMITED', shares: Math.floor(Math.random() * 10000000) + 2000000 },
    { name: 'HARGREAVES LANSDOWN NOMINEES LIMITED', shares: Math.floor(Math.random() * 8000000) + 2000000 },
    { name: 'RATHBONE NOMINEES LIMITED', shares: Math.floor(Math.random() * 5000000) + 1000000 },
    { name: 'INTERACTIVE INVESTOR NOMINEES LIMITED', shares: Math.floor(Math.random() * 4000000) + 1000000 },
    { name: 'SJP NOMINEES LIMITED', shares: Math.floor(Math.random() * 4000000) + 800000 },
    { name: 'PERSHING NOMINEES LIMITED', shares: Math.floor(Math.random() * 3000000) + 500000 },
    { name: 'AJ BELL NOMINEES LIMITED', shares: Math.floor(Math.random() * 2500000) + 500000 },
    { name: 'VIDACOS NOMINEES LIMITED', shares: Math.floor(Math.random() * 2000000) + 400000 },
    { name: 'COUTTS NOMINEES LIMITED', shares: Math.floor(Math.random() * 2000000) + 300000 },
    { name: 'JULIUS BAER NOMINEES LIMITED', shares: Math.floor(Math.random() * 1500000) + 200000 },
    { name: 'SCHRODERS NOMINEES LIMITED', shares: Math.floor(Math.random() * 1000000) + 200000 },
    { name: 'EVELYN NOMINEES LIMITED', shares: Math.floor(Math.random() * 800000) + 150000 },
    { name: 'LGIM NOMINEES LIMITED', shares: Math.floor(Math.random() * 600000) + 100000 },
    { name: 'NORTRUST NOMINEES LIMITED', shares: Math.floor(Math.random() * 500000) + 100000 },
    { name: 'STATE STREET NOMINEES LIMITED', shares: Math.floor(Math.random() * 400000) + 80000 },
    { name: 'BNY MELLON NOMINEES LIMITED', shares: Math.floor(Math.random() * 300000) + 60000 },
    { name: 'UNKNOWN NOMINEE ACCOUNT XYZ', shares: Math.floor(Math.random() * 150000) + 20000 },
  ]
  
  const totalShares = holders.reduce((sum, h) => sum + h.shares, 0)
  
  let csv = 'Account Name,Account Number,Shares,Percentage\n'
  holders.forEach((h, i) => {
    const pct = ((h.shares / totalShares) * 100).toFixed(4)
    csv += `"${h.name}",ACC${String(i + 1).padStart(6, '0')},${h.shares},${pct}\n`
  })
  
  return csv
}

// Get entity type label
export function getEntityTypeLabel(type: EntityType): string {
  const labels: Record<EntityType, string> = {
    csd: 'Central Securities Depository',
    global_custodian: 'Global Custodian',
    local_custodian: 'Local Custodian',
    dedicated_nominee: 'Dedicated Nominee',
    pooled_nominee: 'Pooled Nominee',
    wealth_manager: 'Wealth Manager',
    private_bank: 'Private Bank',
    platform: 'Platform',
    asset_manager: 'Asset Manager',
    pension_fund: 'Pension Fund',
    insurance: 'Insurance',
    fund_of_funds: 'Fund of Funds',
    market_maker: 'Market Maker',
    unknown: 'Unknown'
  }
  return labels[type] || type
}

// Get entity type color
export function getEntityTypeColor(type: EntityType): string {
  const colors: Record<EntityType, string> = {
    csd: 'bg-purple-500/20 text-purple-400',
    global_custodian: 'bg-indigo-500/20 text-indigo-400',
    local_custodian: 'bg-blue-500/20 text-blue-400',
    dedicated_nominee: 'bg-green-500/20 text-green-400',
    pooled_nominee: 'bg-yellow-500/20 text-yellow-400',
    wealth_manager: 'bg-emerald-500/20 text-emerald-400',
    private_bank: 'bg-cyan-500/20 text-cyan-400',
    platform: 'bg-sky-500/20 text-sky-400',
    asset_manager: 'bg-teal-500/20 text-teal-400',
    pension_fund: 'bg-orange-500/20 text-orange-400',
    insurance: 'bg-amber-500/20 text-amber-400',
    fund_of_funds: 'bg-lime-500/20 text-lime-400',
    market_maker: 'bg-rose-500/20 text-rose-400',
    unknown: 'bg-gray-500/20 text-gray-400'
  }
  return colors[type] || 'bg-gray-500/20 text-gray-400'
}

