/**
 * A pretend SumUp for the tests: just the online checkout API the site uses,
 * plus a payment page with Pay / Decline links. The site only talks to it
 * when SUMUP_API_BASE is set and it isn't running in production.
 *
 *   POST /v0.1/checkouts        create a checkout (returns a payment page link)
 *   GET  /v0.1/checkouts/:id    read it back
 *   GET  /pay/:id               the payment page; ?result=paid|failed|expired settles it
 *   GET  /__checkouts           every checkout, for tests to inspect
 */
import http from 'node:http';

const PORT = Number(process.env.SUMUP_MOCK_PORT || 4010);
const checkouts = new Map();
let count = 0;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (url.pathname === '/__health') return json(res, 200, { ok: true });
      if (url.pathname === '/__checkouts') return json(res, 200, [...checkouts.values()]);

      if (req.method === 'POST' && url.pathname === '/v0.1/checkouts') {
        if (!String(req.headers.authorization || '').startsWith('Bearer sup_sk_')) return json(res, 401, { message: 'Unauthorised' });
        const body = JSON.parse(raw || '{}');
        if ([...checkouts.values()].some((c) => c.checkout_reference === body.checkout_reference)) {
          return json(res, 409, { message: 'Checkout reference already used' });
        }
        const id = `mock_chk_${++count}_${Date.now().toString(36)}`;
        checkouts.set(id, {
          id,
          status: 'PENDING',
          amount: body.amount,
          currency: body.currency,
          checkout_reference: body.checkout_reference,
          merchant_code: body.merchant_code,
          description: body.description,
          redirect_url: body.redirect_url,
          return_url: body.return_url,
        });
        return json(res, 200, { id, hosted_checkout_url: `http://127.0.0.1:${PORT}/pay/${id}` });
      }

      let match = url.pathname.match(/^\/v0\.1\/checkouts\/([^/]+)$/);
      if (req.method === 'GET' && match) {
        const checkout = checkouts.get(decodeURIComponent(match[1]));
        if (!checkout) return json(res, 404, { message: 'Not found' });
        // What SumUp's API returns (not the page links or description we keep for the pretend page)
        const publicFields = Object.fromEntries(
          Object.entries(checkout).filter(([key]) => !['redirect_url', 'return_url', 'description'].includes(key))
        );
        return json(res, 200, publicFields);
      }

      match = url.pathname.match(/^\/pay\/([^/]+)$/);
      if (match) {
        const checkout = checkouts.get(match[1]);
        if (!checkout) return json(res, 404, { message: 'Not found' });
        const result = url.searchParams.get('result');
        if (!result) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(
            `<!doctype html><meta charset="utf-8"><title>Mock SumUp</title><h1>Mock SumUp</h1>` +
              `<p>${checkout.description ?? ''}</p><p>Amount: ${checkout.currency} ${checkout.amount}</p>` +
              `<a href="?result=paid">Pay</a> <a href="?result=failed">Decline</a> <a href="?result=expired">Let it expire</a>`
          );
        }
        checkout.status = { paid: 'PAID', failed: 'FAILED', expired: 'EXPIRED' }[result] ?? 'FAILED';
        if (checkout.status === 'PAID') {
          checkout.transactions = [{ transaction_code: `TX${count}${Date.now().toString(36).toUpperCase()}`, status: 'SUCCESSFUL', amount: checkout.amount, currency: checkout.currency }];
        }
        if (url.searchParams.get('redirect') === '0') return json(res, 200, checkout);
        res.writeHead(302, { Location: checkout.redirect_url });
        return res.end();
      }

      json(res, 404, { message: 'Unknown mock route' });
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Mock SumUp on http://127.0.0.1:${PORT}`));
