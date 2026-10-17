import axios from 'axios';
import { AppError } from '../lib/errors.js';

export const mailConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL);
export async function sendMail({ to, subject, text }) {
  if (!mailConfigured()) throw new AppError(503, 'Email delivery is unavailable. Please retry later.', 'EMAIL_UNAVAILABLE');
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || 'LFG' },
      to: [{ email: to }], subject, textContent: text,
    }, { headers: { 'api-key': process.env.BREVO_API_KEY }, timeout: 10_000 });
  } catch { throw new AppError(503, 'Email delivery is unavailable. Please retry later.', 'EMAIL_UNAVAILABLE'); }
}
