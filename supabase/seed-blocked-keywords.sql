-- Seed Blocked Keywords
-- This script adds example blocked keywords across different categories
-- Replace 'YOUR_ADMIN_USER_ID' with an actual admin user's clerk_id

-- Note: You'll need to replace 'YOUR_ADMIN_USER_ID' with an actual admin user's clerk_id
-- You can find this by running: SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1;

-- Violence Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('kill yourself', 'violence', 'high', 'contains', 'Content promoting self-harm or violence is not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('murder', 'violence', 'high', 'contains', 'Content promoting violence is not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('suicide', 'violence', 'high', 'contains', 'We care about your wellbeing. Please reach out for support if you need help.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('bomb threat', 'violence', 'high', 'contains', 'Threats of violence are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('shoot you', 'violence', 'high', 'contains', 'Threats of violence are not allowed.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('stab', 'violence', 'high', 'contains', 'Content promoting violence is not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('beat you up', 'violence', 'medium', 'contains', 'Threatening behavior is not acceptable.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('hurt you', 'violence', 'medium', 'contains', 'Threatening behavior is not acceptable.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Hate Speech Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('nazi', 'hate_speech', 'high', 'contains', 'Hate speech and discriminatory content is not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('kkk', 'hate_speech', 'high', 'contains', 'Hate speech and discriminatory content is not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('white power', 'hate_speech', 'high', 'contains', 'Hate speech is strictly prohibited on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('racial slur', 'hate_speech', 'high', 'contains', 'Racist language and hate speech will not be tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Bullying Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('you are ugly', 'bullying', 'medium', 'contains', 'Bullying and harassment are not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('nobody likes you', 'bullying', 'medium', 'contains', 'Bullying behavior is not acceptable. Please treat others with respect.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('you are worthless', 'bullying', 'high', 'contains', 'Bullying and harassment will not be tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('kill yourself', 'bullying', 'high', 'contains', 'This type of harmful content is strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Sexual Harassment Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('send nudes', 'sexual_harassment', 'high', 'contains', 'Sexual harassment is not permitted on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('sexual content request', 'sexual_harassment', 'high', 'contains', 'Inappropriate sexual content requests are not allowed.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Self Harm Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('cut myself', 'self_harm', 'high', 'contains', 'We care about your wellbeing. Please reach out for support if you need help.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('end my life', 'self_harm', 'high', 'contains', 'If you are in crisis, please contact a mental health professional or crisis hotline.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('want to die', 'self_harm', 'high', 'contains', 'Your life has value. Please seek help from a mental health professional.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Offensive Language Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('f*** you', 'offensive_language', 'medium', 'contains', 'Please use respectful language when communicating with others.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('stupid idiot', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('damn', 'offensive_language', 'low', 'contains', 'Please use respectful language.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('hell', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('b****', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('a**hole', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('b******', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('c***', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('d***', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('p***', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('s***', 'offensive_language', 'medium', 'contains', 'Please use respectful language when communicating with others.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('shut up', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('shut the f*** up', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('go to hell', 'offensive_language', 'medium', 'contains', 'Please use respectful language when communicating with others.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('you suck', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('you are an idiot', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('you are stupid', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('moron', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('imbecile', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('retard', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('retarded', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('f*** off', 'offensive_language', 'high', 'contains', 'Offensive language is not permitted. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('piss off', 'offensive_language', 'medium', 'contains', 'Please use respectful language when communicating with others.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('screw you', 'offensive_language', 'medium', 'contains', 'Please use respectful language when communicating with others.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('screw off', 'offensive_language', 'medium', 'contains', 'Please use respectful language when communicating with others.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('get lost', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('drop dead', 'offensive_language', 'medium', 'contains', 'Please use respectful language when communicating with others.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('you are a loser', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('you are pathetic', 'offensive_language', 'low', 'contains', 'Please maintain respectful communication.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('you are worthless', 'offensive_language', 'medium', 'contains', 'Please use respectful language when communicating with others.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Homophobia Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('faggot', 'homophobia', 'high', 'contains', 'Homophobic language and discrimination are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('gay slur', 'homophobia', 'high', 'contains', 'Discriminatory language based on sexual orientation is prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Body Shaming Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('you are fat', 'body_shaming', 'medium', 'contains', 'Body shaming and negative comments about appearance are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('you are too skinny', 'body_shaming', 'medium', 'contains', 'Please be respectful and avoid making negative comments about others'' bodies.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('ugly body', 'body_shaming', 'medium', 'contains', 'Body shaming is not acceptable. Please be respectful.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Gender Discrimination Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('women belong in kitchen', 'gender_discrimination', 'high', 'contains', 'Gender discrimination and sexist comments are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('men are trash', 'gender_discrimination', 'medium', 'contains', 'Please avoid making discriminatory statements based on gender.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Racism Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('nigga', 'racism', 'high', 'contains', 'Racist language and slurs are strictly prohibited on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('nigger', 'racism', 'high', 'contains', 'Racist language and slurs are strictly prohibited on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('n*gga', 'racism', 'high', 'contains', 'Racist language and slurs are strictly prohibited on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('n*gger', 'racism', 'high', 'contains', 'Racist language and slurs are strictly prohibited on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('chink', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('gook', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('wetback', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('spic', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('towelhead', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('sand n*gger', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('t*rd', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('p*ki', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('coon', 'racism', 'high', 'contains', 'Racist slurs and discriminatory language are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('monkey', 'racism', 'high', 'contains', 'Racist language and dehumanizing terms are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('ape', 'racism', 'high', 'contains', 'Racist language and dehumanizing terms are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('all lives matter', 'racism', 'medium', 'contains', 'Please be respectful and avoid divisive statements that may be used to dismiss racial inequality.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('white lives matter', 'racism', 'medium', 'contains', 'Please be respectful and avoid divisive statements.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('reverse racism', 'racism', 'low', 'contains', 'Please be respectful in discussions about race and discrimination.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('race traitor', 'racism', 'high', 'contains', 'Racist language and discriminatory statements are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('uncle tom', 'racism', 'high', 'contains', 'Racist language and discriminatory statements are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('oreo', 'racism', 'high', 'contains', 'Racist language and discriminatory statements are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('banana', 'racism', 'high', 'contains', 'Racist language and discriminatory statements are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('coconut', 'racism', 'high', 'contains', 'Racist language and discriminatory statements are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('yellow peril', 'racism', 'high', 'contains', 'Racist language and discriminatory statements are not tolerated.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('model minority', 'racism', 'low', 'contains', 'Please be respectful in discussions about race and avoid stereotypes.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Spam Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('click here for free money', 'spam', 'medium', 'contains', 'Spam and promotional content are not permitted.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('make money fast', 'spam', 'low', 'contains', 'Spam content is not allowed on our platform.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('get rich quick', 'spam', 'low', 'contains', 'Spam and scam content is prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

-- Scam Keywords
INSERT INTO blocked_keywords (keyword, category, severity, match_type, custom_message, is_active, created_by)
VALUES
  ('nigerian prince', 'scam', 'high', 'contains', 'Scam content is strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('send me your password', 'scam', 'high', 'contains', 'Phishing and scam attempts are not allowed.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1)),
  ('verify your account now', 'scam', 'high', 'contains', 'Phishing attempts are strictly prohibited.', TRUE, (SELECT clerk_id FROM profiles WHERE is_admin = TRUE LIMIT 1))
ON CONFLICT (keyword, match_type) WHERE is_active = TRUE DO NOTHING;

