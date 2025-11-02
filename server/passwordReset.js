// passwordReset.js (ESM)
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export function registerPasswordReset(app, pool) {
  const RESET_TTL_MIN = Number(process.env.RESET_TTL_MIN || 15);
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const MAIL_FROM = process.env.MAIL_FROM;

  if (!process.env.MAILERSEND_SMTP_KEY || !MAIL_FROM) {
    console.warn('[passwordReset] MAILERSEND_SMTP_KEY / MAIL_FROM are not set!');
  }

  // MailerSend SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.mailersend.net',
    port: 587,
    secure: false,
    auth: { user: 'apikey', pass: process.env.MAILERSEND_SMTP_KEY },
  });

  // ШАГ 1: запрос письма на сброс
  app.post('/api/auth/password/forgot', async (req, res) => {
    const { email } = req.body || {};
    // одинаковый ответ, чтобы не палить наличие почты
    if (!email || !email.includes('@')) return res.json({ ok: true });

    try {
      const normEmail = String(email).trim().toLowerCase();
      const { rows } = await pool.query(
        'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
        [normEmail]
      );
      const user = rows[0];

      // генерируем токен всегда; в БД пишем только если юзер найден
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);

      if (user) {
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)`,
          [user.id, tokenHash, expiresAt]
        );

        const resetLink = `${FRONTEND_URL.replace(/\/+$/, '')}/reset-password?token=${rawToken}`;
        const html = `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#111">
            <p>Вы запросили сброс пароля.</p>
            <p>Перейдите по ссылке в течение ${RESET_TTL_MIN} минут:</p>
            <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
            <p style="color:#666">Если это были не вы — просто проигнорируйте письмо.</p>
          </div>
        `;

        await transporter.sendMail({
          to: user.email,
          from: MAIL_FROM,           // например: no-reply@yourdomain.com (домен в MailerSend должен быть верифицирован)
          subject: 'Сброс пароля',
          html,
        });
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error('[forgot]', e);
      return res.json({ ok: true });
    }
  });

  // ШАГ 2: установка нового пароля
  app.post('/api/auth/password/reset', async (req, res) => {
    const { token, password, password2 } = req.body || {};
    if (!token || !password || password !== password2) {
      return res.status(400).json({ error: 'INVALID_INPUT' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
      const { rows } = await pool.query(
        `SELECT id, user_id, expires_at, used
         FROM password_reset_tokens
         WHERE token_hash = $1
         LIMIT 1`,
        [tokenHash]
      );
      const rec = rows[0];
      if (!rec || rec.used || new Date(rec.expires_at) < new Date()) {
        return res.status(400).json({ error: 'TOKEN_INVALID_OR_EXPIRED' });
      }

      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash(password, 10);

      await pool.query('BEGIN');
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rec.user_id]);
      await pool.query('UPDATE password_reset_tokens SET used = TRUE, used_at = now() WHERE id = $1', [rec.id]);
      await pool.query('COMMIT');

      return res.json({ ok: true });
    } catch (e) {
      await pool.query('ROLLBACK').catch(() => {});
      console.error('[reset]', e);
      return res.status(500).json({ error: 'INTERNAL' });
    }
  });
}
