import assert from 'node:assert/strict';
import test from 'node:test';
import { renderNotificationEmail } from '../src/server/email-template';

test('notification email safely escapes user-facing text and sanitizes its subject', () => {
  const email = renderNotificationEmail({
    fullName: '<img src="x">',
    title: 'Quote\nready',
    body: 'Review <script>alert("x")</script> & approve.',
  });

  assert.equal(email.subject, 'TECHUP | Quote ready');
  assert.match(email.text, /Review <script>alert\("x"\)<\/script> & approve\./);
  assert.match(email.html, /&lt;img src=&quot;x&quot;&gt;/);
  assert.match(email.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; approve\./);
  assert.doesNotMatch(email.html, /<script>|<img src=/);
  assert.match(email.html, /https:\/\/techup\.rw/);
});
