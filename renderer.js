const $ = (id) => document.getElementById(id);
function resetForm() {
  $('transaction-form').reset();
  const now = new Date();
  $('date').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
resetForm();
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function showSettings(show) {
  $('entry').hidden = show;
  $('settings').hidden = !show;
  $('settings-toggle').setAttribute('aria-expanded', String(show));
  status('');
  if (show) $('endpoint').focus();
}
function connection(endpoint) {
  $('endpoint').value = endpoint || '';
  $('connection').textContent = endpoint ? `Sending to ${new URL(endpoint).host}` : 'Set an endpoint to get started';
  $('connection').title = endpoint || '';
  $('connection-dot').classList.toggle('ready', Boolean(endpoint));
}
function updateBanks(banks) {
  const selected = $('bank').value;
  const placeholder = new Option('Select a bank', '', true, true);
  placeholder.disabled = true;
  if (!banks.length) placeholder.textContent = 'Add banks in Settings';
  $('bank').replaceChildren(placeholder, ...banks.map((bank) => new Option(bank, bank)));
  if (banks.includes(selected)) $('bank').value = selected;
  $('banks').value = banks.join(', ');
}
$('settings-toggle').addEventListener('click', () => showSettings($('settings').hidden));
$('back').addEventListener('click', () => showSettings(false));
$('settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const result = await window.tracker.saveSettings({ endpoint: $('endpoint').value.trim(), banks: $('banks').value });
    if (!result.ok) return status(result.error, true);
    connection(result.endpoint);
    updateBanks(result.banks);
    showSettings(false);
    status('Settings saved.');
  } catch { status('Could not save settings.', true); }
  finally { button.disabled = false; }
});
$('transaction-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('send').disabled = true;
  status('Sending transaction…');
  try {
    const result = await window.tracker.send(Object.fromEntries(new FormData(event.target)));
    if (!result.ok) return status(result.error, true);
    resetForm();
    status('Transaction sent successfully.');
    $('bank').focus();
  } catch { status('Could not send. Check the endpoint before retrying.', true); }
  finally { $('send').disabled = false; }
});
window.tracker.getSettings().then((result) => {
  if (!result.ok) return status(result.error, true);
  connection(result.endpoint);
  updateBanks(result.banks);
}).catch(() => status('Could not load endpoint settings.', true));
