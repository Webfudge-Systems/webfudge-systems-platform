/**
 * Embeddable website form (ticket G7). Copied from Grow Settings → Lead sources and pasted into any site.
 * - Works without JavaScript (plain form POST → thank-you page or the org's redirect URL).
 * - With JavaScript: posts as application/x-www-form-urlencoded (a "simple" CORS request, no preflight),
 *   shows the result inline, and adds UTM params (first touch, kept in localStorage), gclid/fbclid,
 *   page URL, landing URL and referrer.
 * - Spam: hidden honeypot field `_wf_hp` and render timestamp `_wf_ts` (server rejects < 2 s).
 * Field names match the backend web-form mapper (apps/backend/src/utils/lead-capture/mappers.js).
 */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function buildFormSnippet(endpointUrl, { formName = 'Website enquiry', button = 'Send enquiry' } = {}) {
  const id = `wf-lead-${Math.random().toString(36).slice(2, 8)}`;
  return `<!-- Fudge Grow lead form: leads go straight into Grow. Change labels and styles freely; keep the field names. -->
<form id="${id}" action="${esc(endpointUrl)}" method="POST" style="display:grid;gap:10px;max-width:420px;font-family:inherit">
  <input name="name" placeholder="Your name" required autocomplete="name" style="padding:10px;border:1px solid #ccc;border-radius:6px">
  <input name="email" type="email" placeholder="Email" autocomplete="email" style="padding:10px;border:1px solid #ccc;border-radius:6px">
  <input name="phone" type="tel" placeholder="Phone" autocomplete="tel" style="padding:10px;border:1px solid #ccc;border-radius:6px">
  <input name="company" placeholder="Company (optional)" autocomplete="organization" style="padding:10px;border:1px solid #ccc;border-radius:6px">
  <textarea name="message" rows="4" placeholder="How can we help?" style="padding:10px;border:1px solid #ccc;border-radius:6px"></textarea>
  <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave this empty <input name="_wf_hp" tabindex="-1" autocomplete="off"></label></div>
  <input type="hidden" name="_wf_form" value="${esc(formName)}">
  <button type="submit" style="padding:11px;border:0;border-radius:6px;background:#ea580c;color:#fff;font-weight:600;cursor:pointer">${esc(button)}</button>
  <p data-wf-status role="status" style="margin:0;font-size:14px"></p>
</form>
<script>
(function () {
  var f = document.getElementById('${id}'); if (!f) return;
  var keys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','msclkid'];
  var q = new URLSearchParams(location.search), stored = {};
  try { stored = JSON.parse(localStorage.getItem('wf_utm') || '{}'); } catch (e) {}
  if (keys.some(function (k) { return q.get(k); })) {
    stored = { landing: location.href, ref: document.referrer };
    keys.forEach(function (k) { if (q.get(k)) stored[k] = q.get(k); });
    try { localStorage.setItem('wf_utm', JSON.stringify(stored)); } catch (e) {}
  }
  function add(n, v) { if (!v) return; var i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; f.appendChild(i); }
  keys.forEach(function (k) { add(k, q.get(k) || stored[k]); });
  add('_wf_page', location.href);
  add('_wf_landing', stored.landing);
  add('_wf_ref', document.referrer || stored.ref);
  add('_wf_ts', String(Date.now()));
  f.addEventListener('submit', function (ev) {
    if (!window.fetch) return;
    ev.preventDefault();
    var s = f.querySelector('[data-wf-status]'), b = f.querySelector('button[type=submit]');
    if (!f.email.value && !f.phone.value) { s.textContent = 'Please enter your email or phone.'; return; }
    b.disabled = true; s.textContent = 'Sending…';
    fetch(f.action, { method: 'POST', body: new URLSearchParams(new FormData(f)), headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (x.ok) { f.reset(); s.textContent = (x.j && x.j.message) || 'Thank you! We will get in touch shortly.'; }
        else { s.textContent = (x.j && x.j.error && x.j.error.message) || 'Could not send. Please try again.'; }
      })
      .catch(function () { s.textContent = 'Could not send. Please check your connection and try again.'; })
      .then(function () { b.disabled = false; });
  });
})();
</script>`;
}

/** curl examples shown for webhook sources (with sample bodies), for testing a connection by hand. */
export function sampleRequest(source) {
  const url = source.endpointUrl;
  if (!url) return '';
  switch (source.key) {
    case 'google_ads':
      return `curl -X POST '${url}' -H 'Content-Type: application/json' -d '{"lead_id":"test-1","google_key":"${source.googleKey}","is_test":false,"user_column_data":[{"column_id":"FULL_NAME","string_value":"Test Lead"},{"column_id":"PHONE_NUMBER","string_value":"+919800000000"}]}'`;
    case 'indiamart':
      return `curl -X POST '${url}' -H 'Content-Type: application/json' -d '{"CODE":200,"STATUS":"SUCCESS","RESPONSE":{"UNIQUE_QUERY_ID":"test-1","QUERY_TYPE":"W","SENDER_NAME":"Test Buyer","SENDER_MOBILE":"+91-9800000000","SUBJECT":"Requirement for test product"}}'`;
    case 'justdial':
      return `curl '${url}?leadid=test-1&name=Test%20Caller&mobile=9800000000&category=Test%20Category&city=Mumbai'`;
    default:
      return `curl -X POST '${url}' -H 'Content-Type: application/json' -d '{"lead_id":"test-1","name":"Test Buyer","mobile":"9800000000","project_name":"Test Project"}'`;
  }
}
