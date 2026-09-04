/**
 * Content Moderation Utility
 * Detects hate speech, bullying, harassment, violence, threats, and other inappropriate content
 */

import { containsBlockedDomain } from './blockedDomains';

/**
 * Patterns and keywords for detecting inappropriate content
 * These are organized by category for easier maintenance
 */
const MODERATION_PATTERNS = {
  // Violence and threats
  violence: [
    /\b(kill|killing|murder|murdered|murdering|assassinate|assassination)\b/gi,
    /\b(die|dying|death|dead|suicide|kill yourself|kill yourself|end your life)\b/gi,
    /\b(hurt|hurting|harm|harming|attack|attacking|beat|beating|punch|punching|stab|stabbing|shoot|shooting)\b/gi,
    /\b(violence|violent|assault|assaulting|abuse|abusing|torture|torturing)\b/gi,
    /\b(threat|threatening|threaten|threats|intimidate|intimidation)\b/gi,
    /\b(bomb|bombing|explode|explosion|terrorist|terrorism)\b/gi,
    /\b(weapon|weapons|gun|guns|knife|knives|blade|blades)\b/gi,
  ],
  
  // Hate speech and discrimination
  hateSpeech: [
    /\b(nazi|nazis|hitler|holocaust|genocide)\b/gi,
    /\b(racist|racism|racial slur|racial slurs)\b/gi,
    /\b(hate|hatred|hateful|hater)\b/gi,
    /\b(discriminate|discrimination|discriminatory)\b/gi,
    /\b(superior|inferior|subhuman|untermensch)\b/gi,
    /\b(ethnic cleansing|ethnic purity|white supremacy|white supremacist)\b/gi,
  ],
  
  // Homophobia and LGBTQ+ discrimination
  homophobia: [
    /\b(f\*\*got|faggot|fag|fags|dyke|dykes|queer as a slur|homo|homos)\b/gi,
    /\b(homophobic|homophobia|anti-gay|anti-gays|anti-lgbt|anti-lgbtq)\b/gi,
    /\b(gay is wrong|gays are wrong|homosexuality is wrong|being gay is wrong)\b/gi,
    /\b(no gays|no homosexuals|gays shouldn'?t exist|homosexuals shouldn'?t exist)\b/gi,
    /\b(tr\*\*ny|tranny|shemale|shemales|trap|traps)\b/gi,
    /\b(transphobic|transphobia|anti-trans|anti-transgender)\b/gi,
    /\b(trans people are|transgender people are|trans people shouldn'?t)\b/gi,
    /\b(gender is binary|only two genders|there are only two genders)\b/gi,
    /\b(pronouns are stupid|pronouns don'?t matter|your pronouns are)\b/gi,
  ],
  
  // Body shaming and appearance-based discrimination
  bodyShaming: [
    /\b(fat\s+(pig|whale|slob|loser|disgusting|ugly|gross|disgrace))\b/gi,
    /\b(you'?re\s+(too\s+)?(fat|skinny|thin|ugly|disgusting|gross|hideous))\b/gi,
    /\b(lose\s+weight|you need to lose weight|you should lose weight)\b/gi,
    /\b(you'?re\s+(obese|anorexic|too\s+(big|small|tall|short)))\b/gi,
    /\b(no one wants to see|nobody wants to see|people don'?t want to see)\b/gi,
    /\b(you look like|you look disgusting|you look gross|you look ugly)\b/gi,
    /\b(body shaming|body shame|shaming someone'?s body)\b/gi,
    /\b(you'?re\s+(unattractive|repulsive|revolting|repellent))\b/gi,
    /\b(cover up|put some clothes on|nobody wants to see that)\b/gi,
  ],
  
  // Gender-based discrimination and misogyny
  genderDiscrimination: [
    /\b(women belong|women should|women shouldn'?t|women can'?t)\b/gi,
    /\b(men are superior|men are better|women are inferior|women are weaker)\b/gi,
    /\b(misogynist|misogyny|misogynistic|anti-woman|anti-women)\b/gi,
    /\b(women'?s place|a woman'?s place|know your place woman)\b/gi,
    /\b(you'?re\s+(just\s+)?a\s+(woman|girl|female))\b/gi,
    /\b(typical\s+(woman|women|female|girl|girls))\b/gi,
    /\b(men are trash|all men are|men can'?t|men shouldn'?t)\b/gi,
    /\b(sexist|sexism|sexist remark|sexist comment)\b/gi,
  ],
  
  // Bullying and harassment
  bullying: [
    /\b(bully|bullying|bullied|harass|harassing|harassment|harassed)\b/gi,
    /\b(intimidate|intimidation|intimidating|intimidated)\b/gi,
    /\b(cyberbully|cyberbullying|online harassment)\b/gi,
    /\b(stalk|stalking|stalker|stalked)\b/gi,
    /\b(abuse|abusing|abusive|abuser)\b/gi,
    /\b(terrorize|terrorizing|terrorized)\b/gi,
    /\b(torment|tormenting|tormented)\b/gi,
    /\b(persecute|persecuting|persecuted|persecution)\b/gi,
  ],
  
  // Sexual harassment and inappropriate content
  sexualHarassment: [
    /\b(rape|raping|raped|rapist)\b/gi,
    /\b(sexual assault|sexually assault|molest|molesting|molestation)\b/gi,
    /\b(sexual harassment|sexually harass)\b/gi,
    /\b(incest|incestuous)\b/gi,
    /\b(pedophile|pedophilia|child predator)\b/gi,
  ],
  
  // Self-harm and suicide
  selfHarm: [
    /\b(kill yourself|kill yourself|end your life|end it all)\b/gi,
    /\b(commit suicide|suicide|suicidal|self harm|self-harm|cutting yourself)\b/gi,
    /\b(hang yourself|hang yourself|jump off|jump off a bridge)\b/gi,
    /\b(overdose|overdosing|OD|ODing)\b/gi,
  ],
  
  // Extreme profanity and offensive language (common slurs)
  offensiveLanguage: [
    /\b(f\*\*k you|f\*\*k off|f\*\*king idiot|f\*\*king moron)\b/gi,
    /\b(go to hell|burn in hell|damn you|curse you)\b/gi,
    /\b(retard|retarded|retardation)\b/gi,
    /\b(idiot|moron|imbecile|stupid|dumbass|dumb ass)\b/gi, // Only in aggressive contexts
  ],
  
  // Doxxing and privacy violations
  doxxing: [
    /\b(dox|doxx|doxxing|doxed|doxxed|doxing)\b/gi,
    /\b(leak your address|leak your phone|leak your info|expose your)\b/gi,
    /\b(swat|swatting|call the cops on you|report you to)\b/gi,
  ],
};

/**
 * Context-aware patterns that require surrounding context to be truly harmful
 * These are less strict and may be used in legitimate discussions
 */
const CONTEXTUAL_PATTERNS = {
  // Violence in context (e.g., "I'm going to kill it at the game" vs "I'm going to kill you")
  contextualViolence: [
    /\b(I'?ll kill you|I'?m going to kill you|I'?m gonna kill you|I will kill you)\b/gi,
    /\b(you should die|you deserve to die|I hope you die|wish you were dead)\b/gi,
    /\b(I'?ll hurt you|I'?m going to hurt you|I will hurt you)\b/gi,
    /\b(I'?ll beat you|I'?m going to beat you|I will beat you)\b/gi,
    /\b(I'?ll attack you|I'?m going to attack you|I will attack you)\b/gi,
  ],
  
  // Direct threats
  directThreats: [
    /\b(I'?ll find you|I'?m coming for you|I will find you|watch your back)\b/gi,
    /\b(you'?re dead|you'?re going to die|you will pay|you'?ll pay for this)\b/gi,
    /\b(I'?ll get you|I'?m going to get you|I will get you)\b/gi,
    /\b(you better watch out|you better be careful|you'?re in trouble)\b/gi,
  ],
  
  // Bullying phrases
  bullyingPhrases: [
    /\b(you'?re worthless|you'?re useless|you'?re pathetic|you'?re a loser)\b/gi,
    /\b(no one likes you|everyone hates you|nobody wants you)\b/gi,
    /\b(you should just|why don'?t you just|just go away|just disappear)\b/gi,
    /\b(you'?re nothing|you don'?t matter|you'?re irrelevant)\b/gi,
  ],
  
  // Body shaming phrases
  bodyShamingPhrases: [
    /\b(you'?re\s+(too\s+)?(fat|skinny|ugly|disgusting|gross|hideous|repulsive))\b/gi,
    /\b(you need to|you should|you better)\s+(lose weight|gain weight|work out|exercise)\b/gi,
    /\b(nobody wants to see|no one wants to see|people don'?t want to see)\s+(your\s+)?(body|face|appearance)\b/gi,
    /\b(you look like|you look disgusting|you look gross|you look ugly|you look terrible)\b/gi,
    /\b(cover up|put some clothes on|wear more clothes|dress better)\b/gi,
  ],
  
  // Homophobic and transphobic phrases
  lgbtqPhobiaPhrases: [
    /\b(that'?s\s+(so\s+)?gay|that'?s\s+(so\s+)?queer)\b/gi,
    /\b(you'?re\s+(so\s+)?gay|you'?re\s+(so\s+)?queer|you act gay|you act queer)\b/gi,
    /\b(being\s+(gay|trans|queer|lgbt|lgbtq)\s+is\s+(wrong|bad|disgusting|gross|unnatural))\b/gi,
    /\b((gays|homosexuals|trans people|transgender people)\s+(shouldn'?t|can'?t|don'?t deserve|don'?t have rights))\b/gi,
    /\b(pronouns are|your pronouns are|preferred pronouns are)\s+(stupid|ridiculous|dumb|nonsense)\b/gi,
    /\b(you'?re\s+(not\s+)?(a\s+)?(real\s+)?(man|woman|person))\s+(because|if)\b/gi,
  ],
  
  // Additional discriminatory patterns
  discrimination: [
    /\b(you'?re\s+(not\s+)?(a\s+)?(real\s+)?(man|woman|person|human))\b/gi,
    /\b(you don'?t belong|you shouldn'?t be here|you'?re not welcome)\b/gi,
    /\b(people like you|your kind|people of your type)\b/gi,
    /\b(you'?re\s+(disgusting|gross|repulsive|revolting|pathetic|worthless))\b/gi,
  ],
};

/**
 * Check if text contains inappropriate content
 * Returns an object with category and severity if found
 */
export function checkContentModeration(text: string): {
  isInappropriate: boolean;
  category?: string;
  severity: 'high' | 'medium' | 'low';
  message?: string;
} {
  if (!text || !text.trim()) {
    return { isInappropriate: false, severity: 'low' };
  }

  const normalizedText = text.toLowerCase().trim();

  // Check high-severity patterns (violence, threats, hate speech)
  for (const [category, patterns] of Object.entries(MODERATION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        // Reset regex lastIndex to avoid issues
        pattern.lastIndex = 0;
        
        let message = '';
        switch (category) {
          case 'violence':
            message = 'Content containing references to violence, threats, or harm is not permitted.';
            break;
          case 'hateSpeech':
            message = 'Hate speech and discriminatory content is not allowed on our platform.';
            break;
          case 'bullying':
            message = 'Bullying and harassment are not tolerated. Please treat others with respect.';
            break;
          case 'sexualHarassment':
            message = 'Sexual harassment and inappropriate sexual content is strictly prohibited.';
            break;
          case 'selfHarm':
            message = 'Content promoting self-harm or suicide is not permitted. If you need help, please reach out to support services.';
            break;
          case 'offensiveLanguage':
            message = 'Offensive language and slurs are not allowed. Please communicate respectfully.';
            break;
          case 'doxxing':
            message = 'Doxxing and privacy violations are strictly prohibited.';
            break;
          case 'homophobia':
            message = 'Homophobia, transphobia, and discrimination against LGBTQ+ individuals is not tolerated. We support and respect all sexual orientations and gender identities.';
            break;
          case 'bodyShaming':
            message = 'Body shaming and appearance-based discrimination is not allowed. Please be respectful of others regardless of their appearance.';
            break;
          case 'genderDiscrimination':
            message = 'Gender-based discrimination, sexism, and misogyny are not permitted. We promote equality and respect for all genders.';
            break;
          default:
            message = 'This content violates our community guidelines.';
        }
        
        return {
          isInappropriate: true,
          category,
          severity: 'high',
          message,
        };
      }
    }
  }

  // Check contextual patterns (direct threats, bullying phrases)
  for (const [category, patterns] of Object.entries(CONTEXTUAL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        pattern.lastIndex = 0;
        
        let message = '';
        switch (category) {
          case 'contextualViolence':
          case 'directThreats':
            message = 'Threats of violence or harm are not permitted. Please reconsider your message.';
            break;
          case 'bullyingPhrases':
            message = 'Bullying and hurtful language is not allowed. Please be respectful to others.';
            break;
          case 'bodyShamingPhrases':
            message = 'Body shaming and appearance-based discrimination is not permitted. Please be respectful of others regardless of their appearance.';
            break;
          case 'lgbtqPhobiaPhrases':
            message = 'Homophobia, transphobia, and discrimination against LGBTQ+ individuals is not tolerated. We support and respect all sexual orientations and gender identities.';
            break;
          case 'discrimination':
            message = 'Discriminatory language and hateful comments are not allowed. Please treat everyone with respect and dignity.';
            break;
          default:
            message = 'This content may violate our community guidelines.';
        }
        
        return {
          isInappropriate: true,
          category,
          severity: 'medium',
          message,
        };
      }
    }
  }

  return { isInappropriate: false, severity: 'low' };
}

/**
 * Get a friendly message encouraging users to think before posting
 */
export function getModerationMessage(category?: string, severity?: 'high' | 'medium' | 'low'): string {
  const baseMessage = "Please take a moment to reconsider your message. ";
  
  if (severity === 'high') {
    return baseMessage + "Content containing violence, threats, hate speech, bullying, or harassment violates our community guidelines and will not be published. We encourage respectful communication and a positive community environment.";
  }
  
  if (severity === 'medium') {
    return baseMessage + "Your message may contain language that could be hurtful or inappropriate. Please ensure your communication is respectful and considerate of others.";
  }
  
  return baseMessage + "Please ensure your message is respectful and follows our community guidelines.";
}

/**
 * Combined check for both blocked domains and content moderation
 * Now uses database-backed moderation with fallback to hardcoded patterns
 */
export async function checkContentSafety(text: string): Promise<{
  isSafe: boolean;
  reason?: string;
  category?: string;
}> {
  // Try database-backed moderation first
  try {
    const { checkContentSafety: dbCheck } = await import('./databaseContentModeration');
    const dbResult = await dbCheck(text);
    
    // If database has results, use them
    if (!dbResult.isSafe) {
      return dbResult;
    }
    
    // If database check passed, also check with legacy patterns as fallback
    // This ensures we have coverage even if database is empty
  } catch (error) {
    // If database functions fail, fall back to legacy patterns
    console.warn("Database moderation unavailable, using legacy patterns:", error);
  }
  
  // Fallback to legacy domain check
  const blockedDomain = containsBlockedDomain(text);
  
  if (blockedDomain) {
    return {
      isSafe: false,
      reason: `Your content contains a link to a website that violates our community guidelines. Posts containing links to inappropriate or adult content websites are not allowed.`,
      category: 'blocked_domain',
    };
  }
  
  // Fallback to legacy content moderation
  const moderationResult = checkContentModeration(text);
  
  if (moderationResult.isInappropriate) {
    return {
      isSafe: false,
      reason: moderationResult.message || getModerationMessage(moderationResult.category, moderationResult.severity),
      category: moderationResult.category,
    };
  }
  
  return { isSafe: true };
}

