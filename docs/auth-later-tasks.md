# Auth: later tasks

- POST /auth/password/forgot and POST /auth/password/reset are not built yet.
- They need a way to send email (an SMTP account or a mail service), and there is none yet.
- Plan: forgot creates a one-time reset token (hashed, expires in 1 hour) and emails a link.
  reset takes that token and a new password, then revokes all refresh tokens.
