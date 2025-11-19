-- Aktualisiere Admin-Passwort auf SHA-256 Hash
-- "admin123" -> SHA-256 Hash
UPDATE user_credentials 
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE name = 'Admin';