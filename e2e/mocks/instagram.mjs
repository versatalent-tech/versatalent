/**
 * A pretend Instagram oEmbed endpoint for the tests, so adding a post never
 * depends on Instagram itself. The site only uses it when
 * INSTAGRAM_OEMBED_BASE is set to an address on this machine.
 *
 *   GET /instagram_oembed?url=…   200 for any post, except:
 *     a code containing "Gone"    400 "Media Not Found" (deleted or private)
 *     a code containing "Flaky"   500 (Instagram not answering)
 */
import http from 'node:http';

const PORT = Number(process.env.INSTAGRAM_MOCK_PORT || 4011);

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (url.pathname === '/__health') return json(res, 200, { ok: true });

    if (req.method === 'GET' && url.pathname === '/instagram_oembed') {
      const postUrl = url.searchParams.get('url') ?? '';
      if (postUrl.includes('Gone')) {
        return json(res, 400, {
          error: {
            message: 'Media Not Found',
            error_user_msg: 'The requested media could not be embedded either because it does not exist or you don’t have permission to embed it.',
          },
        });
      }
      if (postUrl.includes('Flaky')) return json(res, 500, { error: { message: 'An unexpected error has occurred.' } });
      return json(res, 200, { version: '1.0', provider_name: 'Instagram', type: 'rich', width: 658, html: '<blockquote></blockquote>' });
    }

    json(res, 404, { message: 'Unknown mock route' });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Mock Instagram on http://127.0.0.1:${PORT}`));
