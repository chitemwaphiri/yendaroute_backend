export const jwtConstants = {
  secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  expiresIn: 3600,
};