function parseBanks(value) {
  if (typeof value !== 'string') throw new Error('Enter bank names separated by commas.');
  const banks = [...new Set(value.split(',').map((bank) => bank.trim()).filter(Boolean))];
  if (!banks.length) throw new Error('Enter at least one bank.');
  return banks;
}

function endpointURL(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Enter an HTTP or HTTPS endpoint without embedded credentials.');
  }
  return url.href;
}

function transaction(input, banks = []) {
  if (!input || typeof input !== 'object') throw new Error('Invalid transaction.');
  const { date, bank, amount, description } = input;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('Choose a valid date.');
  }
  if (!banks.includes(bank)) throw new Error('Choose a bank from your saved list.');
  if (typeof amount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(amount.trim()) ||
      !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error('Enter a positive amount with up to two decimal places.');
  }
  if (typeof description !== 'string' || !description.trim() || description.length > 500) {
    throw new Error('Enter a description (up to 500 characters).');
  }
  return { date, bank, amount: Number(amount), description: description.trim() };
}

async function sendTransaction(endpoint, input, banks = []) {
  const url = endpointURL(endpoint);
  const body = JSON.stringify(transaction(input, banks));
  let response;
  try {
    response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });
  } catch (error) {
    if (error.name === 'TimeoutError') throw error;
    const code = error.cause?.code;
    const reasons = {
      ENOTFOUND: 'Endpoint hostname was not found.',
      EAI_AGAIN: 'DNS lookup failed. Check your internet connection.',
      ECONNREFUSED: 'Connection refused. Check the endpoint server and port.',
      ECONNRESET: 'The server closed the connection.',
      CERT_HAS_EXPIRED: 'The endpoint TLS certificate has expired.',
      DEPTH_ZERO_SELF_SIGNED_CERT: 'The endpoint TLS certificate is self-signed.',
      UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'The endpoint TLS certificate could not be verified.',
    };
    throw new Error(`${reasons[code] || 'Could not reach the endpoint.'}${code ? ` (${code})` : ''} Check the server before retrying to avoid duplicates.`, { cause: error });
  }
  if (new URL(response.url).hostname === 'accounts.google.com') {
    throw new Error('Google requires sign-in. Check the Apps Script deployment access settings.');
  }
  if (!response.ok) throw new Error(`Endpoint returned HTTP ${response.status}.`);
}

module.exports = { parseBanks, endpointURL, transaction, sendTransaction };
