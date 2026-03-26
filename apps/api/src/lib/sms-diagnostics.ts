/**
 * SMS Diagnostics — run with: npx tsx apps/api/src/lib/sms-diagnostics.ts [phone]
 *
 * Without a phone number: runs config checklist and balance check only.
 * With a phone number: also sends a test SMS and checks DLR after 20s.
 */
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error(`No .env.local found at ${envPath}`);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const e = encodeURIComponent;

async function checkBalance(apiKey: string) {
  console.log('\n=== Route Credit Balance ===');
  for (const routeId of ['1', '2']) {
    const label = routeId === '1' ? 'Transactional (OTP/alerts)' : 'Promotional (marketing)';
    try {
      const url = `https://smsfortius.work/V2/http-credit.php?apikey=${e(apiKey)}&route_id=${routeId}&format=json`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = JSON.parse(await res.text());
      const balance = data.balance ?? '?';
      const ok = Number(balance) > 0;
      console.log(`  ${ok ? '✓' : '✗'} Route ${routeId} (${label}): ${balance} credits`);
    } catch {
      console.log(`  ? Route ${routeId} (${label}): could not check`);
    }
  }
  console.log('\n  ⚠  OTP messages REQUIRE transactional credits (Route 1).');
  console.log('  If Route 1 balance is 0, contact Fortius to allocate transactional credits.');
}

async function main() {
  loadEnv();

  const phone = process.argv[2];

  console.log('══════════════════════════════════════════════');
  console.log('       Fortius SMS Diagnostic Checklist       ');
  console.log('══════════════════════════════════════════════\n');

  const apiKey = process.env.FORTIUS_API_KEY?.trim();
  const senderId = process.env.FORTIUS_SENDER_ID?.trim();
  const templateId = process.env.FORTIUS_OTP_TEMPLATE_ID?.trim();
  const msgTpl = process.env.FORTIUS_OTP_MESSAGE?.trim();
  const smsUrl = process.env.FORTIUS_SMS_URL || 'https://smsfortius.work/V2/apikey.php';

  console.log('=== Environment Variables ===\n');

  const checks = [
    { label: 'FORTIUS_API_KEY', val: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '', ok: !!apiKey },
    { label: 'FORTIUS_SENDER_ID', val: `"${senderId}" (${senderId?.length ?? 0} chars)`, ok: !!senderId },
    { label: 'Sender ID = 6 chars (Fortius requirement)', val: '', ok: senderId?.length === 6,
      fix: senderId && senderId.length !== 6 ? `Current: "${senderId}" — check your Fortius/DLT portal for the registered 6-char sender ID` : '' },
    { label: 'FORTIUS_OTP_TEMPLATE_ID', val: templateId || '(empty)', ok: !!templateId },
    { label: 'FORTIUS_OTP_MESSAGE set', val: msgTpl ? `"${msgTpl.slice(0, 50)}..."` : '(empty)', ok: !!msgTpl },
    { label: 'Message contains {#var#}', val: String(!!msgTpl?.includes('{#var#}')), ok: !!msgTpl?.includes('{#var#}'),
      fix: msgTpl && !msgTpl.includes('{#var#}') ? 'LIKELY: # was parsed as comment. Wrap value in double quotes in .env.local' : '' },
  ];

  let allOk = true;
  for (const c of checks) {
    const icon = c.ok ? '✓' : '✗';
    const valStr = c.val ? ` ${c.val}` : '';
    console.log(`  ${icon} ${c.label}${valStr}`);
    if (!c.ok) {
      allOk = false;
      if ('fix' in c && c.fix) console.log(`    → FIX: ${c.fix}`);
    }
  }

  if (!apiKey) {
    console.error('\n✗ Cannot proceed without FORTIUS_API_KEY');
    process.exit(1);
  }

  await checkBalance(apiKey);

  if (!phone) {
    console.log('\n── To send a test SMS, re-run with a phone number: ──');
    console.log('   npx tsx apps/api/src/lib/sms-diagnostics.ts 9876543210\n');
    return;
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    console.error(`\n✗ Invalid phone number: ${phone}. Must be 10-digit Indian mobile.`);
    process.exit(1);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  let message: string;
  if (msgTpl && msgTpl.includes('{#var#}')) {
    message = msgTpl.split('{#var#}').join(otp);
  } else if (msgTpl && msgTpl.includes('{otp}')) {
    message = msgTpl.split('{otp}').join(otp);
  } else {
    message = `${otp} is your Xelnova verification code. Valid for 10 minutes. Do not share this code with anyone.`;
    console.log('\n⚠  Using FALLBACK message (template env var missing/broken)');
  }

  console.log(`\n=== Sending Test SMS ===`);
  console.log(`  Phone:       ${phone}`);
  console.log(`  OTP:         ${otp}`);
  console.log(`  Sender ID:   "${senderId}"`);
  console.log(`  Template ID: ${templateId || '(none)'}`);
  console.log(`  Message:     "${message}"`);

  let url = `${smsUrl}?apikey=${e(apiKey)}&senderid=${e(senderId || 'XELN')}`;
  if (templateId) url += `&templateid=${e(templateId)}`;
  url += `&number=${e(phone)}&message=${e(message)}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const raw = await res.text();
    console.log(`\n=== Fortius Response (HTTP ${res.status}) ===`);
    console.log(`  ${raw}`);

    let data: any;
    try { data = JSON.parse(raw); } catch { console.error('  Non-JSON response'); return; }

    if (data.code !== '011') {
      console.log(`\n✗ Fortius REJECTED the request: code=${data.code} — ${data.description || data.message || 'unknown'}`);
      return;
    }

    const msgid = data.data?.messageid;
    console.log(`\n✓ Fortius ACCEPTED (msgid: ${msgid}) — but acceptance ≠ delivery!`);
    console.log('  Waiting 20s to check delivery report...\n');

    await new Promise(r => setTimeout(r, 20000));

    const dlrUrl = `https://smsfortius.work/V2/http-dlr.php?apikey=${e(apiKey)}&msgid=${e(msgid)}&format=json`;
    const dlrRes = await fetch(dlrUrl, { headers: { Accept: 'application/json' } });
    const dlrRaw = await dlrRes.text();
    console.log('=== Delivery Report (DLR) ===');
    console.log(`  ${dlrRaw}\n`);

    try {
      const dlr = JSON.parse(dlrRaw);
      if (dlr.data && Array.isArray(dlr.data)) {
        const statusMap: Record<string, string> = {
          '1': 'DELIVERED',
          '2': 'FAILED',
          '3': 'SUBMITTED (pending)',
          '4': 'REJECTED by operator',
        };
        for (const entry of dlr.data) {
          const statusLabel = statusMap[entry.status] || `unknown (${entry.status})`;
          console.log(`  Mobile: ${entry.mobile} | Status: ${statusLabel} | Time: ${entry.delvd_time}`);
        }
        const delivered = dlr.data.some((d: any) => d.status === '1' || d.status === 'delivered');
        const rejected = dlr.data.some((d: any) => d.status === '4');
        const failed = dlr.data.some((d: any) => d.status === '2');

        if (delivered) {
          console.log('\n✓ SMS DELIVERED successfully! Check your phone.');
        } else {
          console.log('\n✗ SMS NOT delivered.');
          if (rejected || failed) {
            console.log('\n  Troubleshooting checklist:');
            console.log('  1. SENDER ID: Must be exactly 6 chars and match DLT portal registration');
            console.log('  2. TEMPLATE TEXT: Must match DLT-registered template character-for-character');
            console.log('  3. TEMPLATE ID: Must match the DLT template ID exactly');
            console.log('  4. ROUTE: OTP/transactional SMS needs transactional credits (Route 1)');
            console.log('  5. If Route 1 balance=0: contact Fortius to move credits or buy transactional pack');
            console.log('  6. DND: Promotional route cannot deliver to DND-enabled numbers');
          }
        }
      }
    } catch {
      console.log('  Could not parse DLR response');
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

main();
