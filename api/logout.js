'use strict';
const { clearSessionCookie } = require('./_lib');

module.exports = function handler(req, res) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true });
};
