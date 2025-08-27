// Utilities to parse Indian Driving Licence text extracted via OCR
// Returns a normalized object with fields suitable for DriverVerificationScreenSimple

export type IndiaDLParsed = {
  licenseNumber?: string;
  name?: string;
  fatherOrSpouse?: string;
  dob?: string; // yyyy-mm-dd
  issueDate?: string; // yyyy-mm-dd
  validityNT?: string; // yyyy-mm-dd
  validityTR?: string; // yyyy-mm-dd
  address?: string;
  bloodGroup?: string;
  issuingAuthority?: string;
  vehicleClasses?: string[];
  rtoCode?: string;
  raw?: string;
  confidence?: number;
};

const toIso = (d?: string) => {
  if (!d) return undefined;
  const m = d.match(/(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{2,4})/);
  if (!m) return undefined;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${yyyy}-${mm}-${dd}`;
};

export function parseIndiaDL(rawInput: string): IndiaDLParsed {
  const raw = rawInput.replace(/\r/g, '').trim();
  const text = raw.toUpperCase();

  const out: IndiaDLParsed = { raw };

  // License number: handle long sequences and internal separators.
  // Strategy: collect candidates that start with 2 letters, followed by a mix of digits/space/hyphen, lengthy enough.
  // Then normalize by stripping non-alphanumerics and pick the longest plausible.
  const licCandidates = Array.from(text.matchAll(/\b([A-Z]{2}[A-Z0-9\s-]{8,})\b/g)).map(m => m[1]);
  if (licCandidates.length) {
    const normalized = licCandidates
      .map(c => c.replace(/[^A-Z0-9]/g, ''))
      .filter(c => /^[A-Z]{2}\d{8,}$/.test(c)) // must start with 2 letters then at least 8 digits
      .sort((a, b) => b.length - a.length);
    if (normalized[0]) out.licenseNumber = normalized[0];
  }

  // RTO code e.g., TG007
  const rto = text.match(/\b([A-Z]{2}\d{3})\b/);
  if (rto) out.rtoCode = rto[1];

  // Name
  const nameLine = raw.match(/\bNAME\s*:\s*(.*)/i);
  if (nameLine) {
    out.name = nameLine[1].replace(/[,;].*$/, '').trim();
  } else {
    // fallback: line before DOB often
    const dobIdx = raw.search(/DATE OF BIRTH|DOB/i);
    if (dobIdx > 0) {
      const before = raw.slice(Math.max(0, dobIdx - 80), dobIdx).split(/\n/).pop();
      if (before) out.name = before.replace(/NAME\s*:\s*/i, '').trim();
    }
  }

  // Father/Spouse: S/D/W of
  const rel = raw.match(/S\/?D\/?W\s*OF\s*[:\-]?\s*(.*)/i);
  if (rel) out.fatherOrSpouse = rel[1].split(/\n|,|\s{2,}/)[0].trim();

  // DOB
  const dob = raw.match(/(DATE OF BIRTH|DOB)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[2];
  out.dob = toIso(dob);

  // Issue Date (support DOI, ISSUED ON variants)
  const issue = (
    raw.match(/(ISSUE DATE|DATE OF ISSUE)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[2] ||
    raw.match(/\bDOI\b\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1] ||
    raw.match(/ISSUED\s*ON\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1]
  );
  out.issueDate = toIso(issue);

  // Validity NT / TR: support broader variants and missing parentheses
  const nt = (
    raw.match(/VALID(?:ITY)?\s*\(NT\)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1] ||
    raw.match(/VALID\s*(?:UPTO|TILL)\s*\(NT\)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1] ||
    raw.match(/\bNT\b\s*(?:VALIDITY|VALID\s*(?:UPTO|TILL))\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1] ||
    raw.match(/\bNT\b\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1]
  );
  const tr = (
    raw.match(/VALID(?:ITY)?\s*\(TR\)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1] ||
    raw.match(/VALID\s*(?:UPTO|TILL)\s*\(TR\)\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1] ||
    raw.match(/\bTR\b\s*(?:VALIDITY|VALID\s*(?:UPTO|TILL))\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1] ||
    raw.match(/\bTR\b\s*[:\-]?\s*(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/i)?.[1]
  );
  out.validityNT = toIso(nt);
  out.validityTR = toIso(tr);

  // Address block after 'Address:'
  const addrMatch = raw.match(/ADDRESS\s*:\s*([\s\S]*?)(?:\n\s*(BLOOD GROUP|HOLDER|ORG|EMERGENCY|CLASS OF VEHICLE|ISSUED|DL NO\.|VALIDITY)|$)/i);
  if (addrMatch) out.address = addrMatch[1].replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Blood Group
  const bg = raw.match(/BLOOD\s*GROUP\s*[:\-]?\s*([AOBAB+\-\s]+)/i)?.[1];
  if (bg) out.bloodGroup = bg.replace(/\s/g, '');

  // Issuing Authority / RTO name
  const auth = raw.match(/(ISSUED BY|LICENSING AUTHORITY NAME)\s*[:\-]?\s*(.*)/i)?.[2];
  if (auth) out.issuingAuthority = auth.split(/\n|,/)[0].trim();

  // Vehicle classes (LMV, MCWG, etc.) present on back table
  const classes = Array.from(text.matchAll(/\b(LMV|MCWG|MCWOG|HMV|TRANS|NT|TR|PSV)\b/g)).map(m => m[1]);
  if (classes.length) out.vehicleClasses = Array.from(new Set(classes));

  // crude confidence heuristic
  let hits = 0;
  if (out.licenseNumber) hits++;
  if (out.name) hits++;
  if (out.dob) hits++;
  if (out.validityNT || out.validityTR) hits++;
  out.confidence = hits / 4;

  return out;
}
