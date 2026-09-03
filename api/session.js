'use strict';
const { isAuthed } = require('./_lib');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    authed: isAuthed(req),
    configured: Boolean(process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET),
  });
};
