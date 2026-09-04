-- Seed Blocked Domains
-- This script adds example blocked domains across different categories
-- Replace 'YOUR_ADMIN_USER_ID' with an actual admin user's clerk_id

-- Note: You'll need to replace 'YOUR_ADMIN_USER_ID' with an actual admin user's clerk_id
-- You can find this by running: SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1;

-- Adult Content Domains
INSERT INTO blocked_domains (domain, category, severity, custom_message, is_active, created_by)
VALUES
  ('pornhub.com', 'adult_content', 'high', 'Adult content links are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('xvideos.com', 'adult_content', 'high', 'Adult content links are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('xhamster.com', 'adult_content', 'high', 'Adult content links are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('redtube.com', 'adult_content', 'high', 'Adult content links are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('youporn.com', 'adult_content', 'high', 'Adult content links are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('porn.com', 'adult_content', 'high', 'Adult content links are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('tube8.com', 'adult_content', 'high', 'Adult content links are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('spankwire.com', 'adult_content', 'high', 'Adult content links are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (domain) WHERE is_active = TRUE DO NOTHING;

-- Gambling Domains
INSERT INTO blocked_domains (domain, category, severity, custom_message, is_active, created_by)
VALUES
  ('bet365.com', 'gambling', 'medium', 'Gambling website links are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('paddypower.com', 'gambling', 'medium', 'Gambling website links are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('betfair.com', 'gambling', 'medium', 'Gambling website links are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('casino.com', 'gambling', 'medium', 'Gambling website links are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('888casino.com', 'gambling', 'medium', 'Gambling website links are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (domain) WHERE is_active = TRUE DO NOTHING;

-- Scam Domains
INSERT INTO blocked_domains (domain, category, severity, custom_message, is_active, created_by)
VALUES
  ('free-money-now.com', 'scam', 'high', 'This domain has been flagged as a scam. Links to scam websites are prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('get-rich-quick.net', 'scam', 'high', 'This domain has been flagged as a scam. Links to scam websites are prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('prize-winner.com', 'scam', 'high', 'This domain has been flagged as a scam. Links to scam websites are prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (domain) WHERE is_active = TRUE DO NOTHING;

-- Phishing Domains
INSERT INTO blocked_domains (domain, category, severity, custom_message, is_active, created_by)
VALUES
  ('verify-account-now.com', 'phishing', 'high', 'This domain has been flagged for phishing. Phishing links are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('update-password-urgent.net', 'phishing', 'high', 'This domain has been flagged for phishing. Phishing links are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('secure-login-verify.com', 'phishing', 'high', 'This domain has been flagged for phishing. Phishing links are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (domain) WHERE is_active = TRUE DO NOTHING;

-- Malware Domains
INSERT INTO blocked_domains (domain, category, severity, custom_message, is_active, created_by)
VALUES
  ('download-virus-free.com', 'malware', 'high', 'This domain has been flagged for malware distribution. Links to malware sites are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('free-software-download.net', 'malware', 'high', 'This domain has been flagged for malware distribution. Links to malware sites are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (domain) WHERE is_active = TRUE DO NOTHING;

-- Hate Site Domains
INSERT INTO blocked_domains (domain, category, severity, custom_message, is_active, created_by)
VALUES
  ('hate-site-example.com', 'hate_site', 'high', 'Links to hate sites are not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('discriminatory-content.org', 'hate_site', 'high', 'Links to sites promoting hate or discrimination are prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (domain) WHERE is_active = TRUE DO NOTHING;

-- Spam Domains
INSERT INTO blocked_domains (domain, category, severity, custom_message, is_active, created_by)
VALUES
  ('spam-site.com', 'spam', 'medium', 'Spam website links are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('promotional-spam.net', 'spam', 'medium', 'Spam website links are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (domain) WHERE is_active = TRUE DO NOTHING;

