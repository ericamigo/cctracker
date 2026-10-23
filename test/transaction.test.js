const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { parseBanks, transaction, endpointURL, sendTransaction } = require('../transaction')
const entry = { date: '2026-10-24', bank: 'BDO', amount: '1250.50', description: 'Groceries' }
test('custom banks trim whitespace, ignore empty entries, and remove duplicates', () => {
    const banks = parseBanks(' Custom Bank, RCBC, , Custom Bank, ')
    assert.deepEqual(banks, ['Custom Bank', 'RCBC'])
    assert.equal(transaction({ ...entry, bank: 'Custom Bank' }, banks).bank, 'Custom Bank')
    assert.throws(() => transaction(entry, banks), /saved list/)
    assert.throws(() => parseBanks(' , , '), /at least one/)
    assert.throws(() => transaction(entry), /saved list/)
})
test('validates dates, bank choices, amounts and descriptions', () => {
    assert.deepEqual(transaction(entry, [entry.bank]), { ...entry, amount: 1250.5 })
    for (const changes of [
        { date: '2026-02-30' },
        { bank: 'Other' },
        { amount: '-1' },
        { amount: '1.001' },
        { amount: '0' },
        { description: ' ' },
    ]) {
        assert.throws(() => transaction({ ...entry, ...changes }, [entry.bank]))
    }
    assert.throws(() => endpointURL('file:///tmp/entry'))
    assert.throws(() => endpointURL('https://user:password@example.com'))
})
test('posts the expected JSON and reports endpoint errors', async (t) => {
    let received
    const server = http.createServer(async (request, response) => {
        if (request.url === '/result') {
            assert.equal(request.method, 'GET')
            response.writeHead(200)
            return response.end('OK')
        }
        let body = ''
        for await (const chunk of request) body += chunk
        received = { method: request.method, type: request.headers['content-type'], body: JSON.parse(body) }
        if (request.url === '/redirect') {
            response.writeHead(302, { Location: '/result' })
            return response.end()
        }
        response.writeHead(request.url === '/fail' ? 422 : 204)
        response.end()
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    t.after(() => new Promise((resolve) => server.close(resolve)))
    const base = `http://127.0.0.1:${server.address().port}`
    await sendTransaction(base, entry, [entry.bank])
    assert.deepEqual(received, { method: 'POST', type: 'application/json', body: { ...entry, amount: 1250.5 } })
    await assert.rejects(sendTransaction(`${base}/fail`, entry, [entry.bank]), /HTTP 422/)
    await sendTransaction(`${base}/redirect`, entry, [entry.bank])
    await sendTransaction(base, { ...entry, bank: 'Custom Bank' }, ['Custom Bank'])
    assert.equal(received.body.bank, 'Custom Bank')
})
test('includes the underlying network failure in the error message', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => {
        throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })
    })
    await assert.rejects(
        sendTransaction('http://localhost:1234', entry, [entry.bank]),
        /Connection refused.*ECONNREFUSED/,
    )
})

