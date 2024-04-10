const Resend = require('resend').Resend;
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;