/**
 * WhatsApp Bot Configuration and Message Templates
 * EFF Membership System - WasenderAPI Integration
 */

import { MemberBotInfo, ApplicationBotInfo } from '../types/whatsapp';

// Re-export types for backward compatibility
export type MemberInfo = MemberBotInfo;
export type ApplicationInfo = ApplicationBotInfo;

// ============================================
// Province Language Configuration
// ============================================

// South African provinces and their predominant local languages
// Gauteng uses English as default (most multilingual province)
export type SupportedLanguage =
  | 'en'       // English (default for Gauteng)
  | 'zu'       // isiZulu (KwaZulu-Natal)
  | 'xh'       // isiXhosa (Eastern Cape)
  | 'st'       // Sesotho (Free State)
  | 'tn'       // Setswana (North West)
  | 'nso'      // Sepedi/Northern Sotho (Limpopo)
  | 'ss'       // siSwati (Mpumalanga)
  | 'af'       // Afrikaans (Northern Cape, Western Cape)
  | 've'       // Tshivenda (Limpopo)
  | 'ts'       // Xitsonga (Limpopo, Mpumalanga)
  | 'nr';      // isiNdebele

// ============================================
// Language-Based Greetings (for member's specific language)
// ============================================

export interface LanguageGreeting {
  languageName: string;
  languageCode: SupportedLanguage;
  greeting: string;
  welcome: string;
  thankYou: string;
  goodbye: string;
}

// Mapping by language NAME (as stored in member's language_name field)
export const LanguageGreetings: Record<string, LanguageGreeting> = {
  'English': {
    languageName: 'English',
    languageCode: 'en',
    greeting: 'Hello',
    welcome: 'Welcome',
    thankYou: 'Thank you',
    goodbye: 'Goodbye'
  },
  'isiZulu': {
    languageName: 'isiZulu',
    languageCode: 'zu',
    greeting: 'Sawubona',
    welcome: 'Siyakwamukela',
    thankYou: 'Ngiyabonga',
    goodbye: 'Hamba kahle'
  },
  'isiXhosa': {
    languageName: 'isiXhosa',
    languageCode: 'xh',
    greeting: 'Molo',
    welcome: 'Wamkelekile',
    thankYou: 'Enkosi',
    goodbye: 'Hamba kakuhle'
  },
  'Afrikaans': {
    languageName: 'Afrikaans',
    languageCode: 'af',
    greeting: 'Hallo',
    welcome: 'Welkom',
    thankYou: 'Dankie',
    goodbye: 'Totsiens'
  },
  'Sepedi': {
    languageName: 'Sepedi',
    languageCode: 'nso',
    greeting: 'Thobela',
    welcome: 'Re a go amogela',
    thankYou: 'Ke a leboga',
    goodbye: 'Šala gabotse'
  },
  'Sesotho': {
    languageName: 'Sesotho',
    languageCode: 'st',
    greeting: 'Dumela',
    welcome: 'Rea u amohela',
    thankYou: 'Ke a leboha',
    goodbye: 'Sala hantle'
  },
  'Setswana': {
    languageName: 'Setswana',
    languageCode: 'tn',
    greeting: 'Dumelang',
    welcome: 'Re a go amogela',
    thankYou: 'Ke a leboga',
    goodbye: 'Tsamaya sentle'
  },
  'siSwati': {
    languageName: 'siSwati',
    languageCode: 'ss',
    greeting: 'Sawubona',
    welcome: 'Wemukelekile',
    thankYou: 'Ngiyabonga',
    goodbye: 'Hamba kahle'
  },
  'Tshivenda': {
    languageName: 'Tshivenda',
    languageCode: 've',
    greeting: 'Ndaa',
    welcome: 'Vho tanganedzwa',
    thankYou: 'Ndo livhuwa',
    goodbye: 'Kha vha sale zwavhudi'
  },
  'Xitsonga': {
    languageName: 'Xitsonga',
    languageCode: 'ts',
    greeting: 'Avuxeni',
    welcome: 'Mi amukelekile',
    thankYou: 'Ndza khensa',
    goodbye: 'Salani kahle'
  },
  'isiNdebele': {
    languageName: 'isiNdebele',
    languageCode: 'nr',
    greeting: 'Lotjhani',
    welcome: 'Wamukelekile',
    thankYou: 'Ngiyathokoza',
    goodbye: 'Sala kuhle'
  }
};

// Get greeting by member's language name
export function getLanguageGreeting(languageName?: string): LanguageGreeting {
  if (!languageName) {
    return LanguageGreetings['English']; // Default to English
  }
  return LanguageGreetings[languageName] || LanguageGreetings['English'];
}

// ============================================
// Province-Based Language Mapping (fallback)
// ============================================

export interface ProvinceLanguageMapping {
  provinceName: string;
  provinceCode: string;
  primaryLanguage: SupportedLanguage;
  languageName: string;
  greeting: string;
  welcome: string;
  thankYou: string;
  goodbye: string;
}

// Province to language mapping (used as fallback when member's language is not set)
export const ProvinceLanguages: Record<string, ProvinceLanguageMapping> = {
  'Eastern Cape': {
    provinceName: 'Eastern Cape',
    provinceCode: 'EC',
    primaryLanguage: 'xh',
    languageName: 'isiXhosa',
    greeting: 'Molo',
    welcome: 'Wamkelekile',
    thankYou: 'Enkosi',
    goodbye: 'Hamba kakuhle'
  },
  'Free State': {
    provinceName: 'Free State',
    provinceCode: 'FS',
    primaryLanguage: 'st',
    languageName: 'Sesotho',
    greeting: 'Dumela',
    welcome: 'Rea u amohela',
    thankYou: 'Ke a leboha',
    goodbye: 'Sala hantle'
  },
  'Gauteng': {
    provinceName: 'Gauteng',
    provinceCode: 'GP',
    primaryLanguage: 'en',
    languageName: 'English',
    greeting: 'Hello',
    welcome: 'Welcome',
    thankYou: 'Thank you',
    goodbye: 'Goodbye'
  },
  'KwaZulu-Natal': {
    provinceName: 'KwaZulu-Natal',
    provinceCode: 'KZN',
    primaryLanguage: 'zu',
    languageName: 'isiZulu',
    greeting: 'Sawubona',
    welcome: 'Siyakwamukela',
    thankYou: 'Ngiyabonga',
    goodbye: 'Hamba kahle'
  },
  'Limpopo': {
    provinceName: 'Limpopo',
    provinceCode: 'LP',
    primaryLanguage: 'nso',
    languageName: 'Sepedi',
    greeting: 'Thobela',
    welcome: 'Re a go amogela',
    thankYou: 'Ke a leboga',
    goodbye: 'Šala gabotse'
  },
  'Mpumalanga': {
    provinceName: 'Mpumalanga',
    provinceCode: 'MP',
    primaryLanguage: 'ss',
    languageName: 'siSwati',
    greeting: 'Sawubona',
    welcome: 'Wemukelekile',
    thankYou: 'Ngiyabonga',
    goodbye: 'Hamba kahle'
  },
  'Northern Cape': {
    provinceName: 'Northern Cape',
    provinceCode: 'NC',
    primaryLanguage: 'af',
    languageName: 'Afrikaans',
    greeting: 'Hallo',
    welcome: 'Welkom',
    thankYou: 'Dankie',
    goodbye: 'Totsiens'
  },
  'North West': {
    provinceName: 'North West',
    provinceCode: 'NW',
    primaryLanguage: 'tn',
    languageName: 'Setswana',
    greeting: 'Dumelang',
    welcome: 'Re a go amogela',
    thankYou: 'Ke a leboga',
    goodbye: 'Tsamaya sentle'
  },
  'Western Cape': {
    provinceName: 'Western Cape',
    provinceCode: 'WC',
    primaryLanguage: 'af',
    languageName: 'Afrikaans',
    greeting: 'Hallo',
    welcome: 'Welkom',
    thankYou: 'Dankie',
    goodbye: 'Totsiens'
  }
};

// Helper function to get language info for a province
export function getProvinceLanguage(provinceName?: string): ProvinceLanguageMapping {
  if (!provinceName) {
    return ProvinceLanguages['Gauteng']; // Default to English
  }
  return ProvinceLanguages[provinceName] || ProvinceLanguages['Gauteng'];
}

// ============================================
// Bot Configuration
// ============================================

export const WhatsAppBotConfig = {
  // Session timeout in minutes (inactive sessions will be reset)
  sessionTimeoutMinutes: 30,

  // Maximum message length for WhatsApp
  maxMessageLength: 4096,

  // Rate limiting for bot responses (messages per minute per user)
  rateLimitPerUser: 10,

  // ID number validation pattern (South African 13-digit ID)
  idNumberPattern: /^\d{13}$/,

  // Phone number patterns
  phonePatterns: {
    southAfrica: /^(\+27|27|0)[6-8][0-9]{8}$/,
    international: /^\+[1-9]\d{6,14}$/
  },

  // Intent patterns for message classification
  intentPatterns: {
    greeting: /^(hi|hello|hey|sawubona|dumelang|molo|thobela|dumela|heita|howzit)/i,
    help: /^(help|menu|\?|options|commands)/i,
    memberLookup: /^(status|check|my status|membership|member)/i,
    payment: /^(pay|renew|payment|subscribe|fee)/i,
    cancel: /^(cancel|stop|exit|quit|bye|end)/i,
    yes: /^(yes|y|yebo|ja|correct|confirm|1)/i,
    no: /^(no|n|cha|nee|wrong|cancel|2)/i
  }
};

// ============================================
// Message Templates
// ============================================

/**
 * Generate a multilingual welcome message based on the member's province
 * @param provinceName - The member's province name
 * @param memberName - Optional member's first name for personalization
 * @returns Localized welcome message
 */
export function getMultilingualWelcome(provinceName?: string, memberName?: string): string {
  const lang = getProvinceLanguage(provinceName);

  // For Gauteng, use default English welcome
  if (lang.primaryLanguage === 'en') {
    return MessageTemplates.WELCOME;
  }

  // Multilingual welcome with local greeting
  const personalGreeting = memberName
    ? `${lang.greeting} ${memberName}!`
    : `${lang.greeting}!`;

  return ` *${lang.welcome}!*

${personalGreeting}

_[${lang.languageName}]_

*EFF Membership Services*

I can help you with:
1️⃣ Check membership status
2️⃣ Payment/renewal information
3️⃣ Update your details

Reply with a number or type *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
}

/**
 * Generate a multilingual personalized welcome for known members
 * Uses member's specific language first, then falls back to province default
 */
export function getMultilingualPersonalizedWelcome(member: MemberBotInfo): string {
  // First try member's specific language, then fall back to province
  const lang = member.language_name
    ? getLanguageGreeting(member.language_name)
    : getProvinceLanguage(member.province_name);

  const statusEmoji = member.membership_status_name === 'Good Standing' ? '✅' : '⚠️';
  const isEnglish = ('languageCode' in lang ? lang.languageCode : lang.primaryLanguage) === 'en';

  // For English speakers, use standard English greeting
  if (isEnglish) {
    return ` *Welcome back, ${member.firstname}!*

${statusEmoji} Your membership status: *${member.membership_status_name}*

I can help you with:
1️⃣ View full membership status
2️⃣ Payment/renewal information
3️⃣ Update your details

Reply with a number or type *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
  }

  // Multilingual greeting in member's specific language
  return ` *${lang.greeting}, ${member.firstname}!*

_[${lang.languageName}]_

${statusEmoji} Your membership status: *${member.membership_status_name}*

${lang.welcome}! I can help you with:
1️⃣ View full membership status
2️⃣ Payment/renewal information
3️⃣ Update your details

Reply with a number or type *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
}

/**
 * Generate a multilingual goodbye message
 * @param languageName - Member's specific language (preferred)
 * @param provinceName - Member's province (fallback)
 * @param memberName - Member's first name
 */
export function getMultilingualGoodbye(languageName?: string, provinceName?: string, memberName?: string): string {
  // Use member's language first, then province
  const lang = languageName
    ? getLanguageGreeting(languageName)
    : getProvinceLanguage(provinceName);

  const personalGoodbye = memberName
    ? `${lang.goodbye}, ${memberName}!`
    : `${lang.goodbye}!`;

  const isEnglish = ('languageCode' in lang ? lang.languageCode : lang.primaryLanguage) === 'en';

  if (isEnglish) {
    return `${personalGoodbye}

${lang.thankYou} for using EFF Membership Services.

_Economic Freedom In Our Lifetime!_`;
  }

  return `${personalGoodbye}

_[${lang.languageName}]_

${lang.thankYou} for using EFF Membership Services.

_Economic Freedom In Our Lifetime!_`;
}

export const MessageTemplates = {
  WELCOME: `🔴⚫🟢 *Welcome to EFF Membership Services*

I can help you with:
1️⃣ Check membership status
2️⃣ Payment/renewal information
3️⃣ Update your details

Reply with a number or type *HELP* for more options.`,

  HELP_MENU: ` *EFF Membership Bot - Help Menu*

Available commands:
• *STATUS* - Check your membership status
• *PAY* - Get payment information
• *HELP* - Show this menu

To check your status, reply with *STATUS* and I'll ask for your ID number.`,

  REQUEST_ID: ` *Membership Status Check*

Please enter your 13-digit South African ID number.

Example: 8501015800085`,

  MEMBER_NOT_FOUND: ` *Member Not Found*

We couldn't find a membership record with that ID number.

If you're a new member, your application may still be processing.

Need help? Reply *HELP* for options or contact your local branch.`,

  PAYMENT_INFO: ` *EFF Membership Payment Information*

*Standard Membership: R10/2 years*


Payment methods:
• EFT to EFF account
• Pay at your local branch
• Mobile payment apps

For specific payment queries, please contact your branch office.

Reply *STATUS* to check if your payment has been recorded.`,

  CANCELLED: ` Action cancelled. 

Reply *HELP* anytime to see available options.`,

  UNRECOGNIZED: ` I didn't understand that.

Reply *HELP* to see what I can assist with, or *STATUS* to check your membership.`,

  ERROR: ` Sorry, something went wrong. Please try again later.

If the problem persists, contact your local branch office.`,

  // Invalid ID format
  INVALID_ID: ` *Invalid ID Number*

Please enter a valid 13-digit South African ID number.

Example: 8501015800085

Reply *CANCEL* to go back to the main menu.`,

  // Session timeout
  SESSION_TIMEOUT: ` Your session has timed out due to inactivity.

Reply *HELP* to start a new conversation.`,

  // Format member status response
  formatMemberStatus: (member: MemberBotInfo): string => {
    const statusEmoji = member.membership_status_name === 'Good Standing' ? '✅' :
      member.membership_status_name === 'Expired' ? '⚠️' : '❌';

    const expiryInfo = member.days_until_expiry
      ? (member.days_until_expiry > 0
        ? `Expires in ${member.days_until_expiry} days`
        : `Expired ${Math.abs(member.days_until_expiry)} days ago`)
      : 'N/A';

    return ` *EFF Membership Status*

${statusEmoji} *Status:* ${member.membership_status_name}

 *Name:* ${member.firstname} ${member.surname}
 *ID:* ${member.id_number}
 *Member #:* ${member.membership_number || 'Pending'}

 *Location:*
   Ward: ${member.ward_name || member.ward_code}
   ${member.municipality_name ? `Municipality: ${member.municipality_name}` : ''}
   ${member.province_name ? `Province: ${member.province_name}` : ''}

*Expiry:* ${expiryInfo}
${member.last_payment_date ? ` Last Payment: ${new Date(member.last_payment_date).toLocaleDateString('en-ZA')}` : ''}

${member.membership_status_name === 'Expired' ? '\n Your membership has expired. Reply *PAY* for renewal information.' : ''}

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
  },

  // Format application status response
  formatApplicationStatus: (app: ApplicationBotInfo): string => {
    const statusEmoji = app.status === 'Approved' ? '✅' :
      app.status === 'Rejected' ? '❌' : '⏳';

    return `📋 *Membership Application Status*

${statusEmoji} *Status:* ${app.status}

*Name:* ${app.first_name} ${app.last_name}
*ID:* ${app.id_number}
*Applied:* ${new Date(app.created_at).toLocaleDateString('en-ZA')}

${app.status === 'Submitted' || app.status === 'Under Review'
        ? '⏳ Your application is being processed. Please check back later.'
        : app.status === 'Approved'
          ? '✅ Your application has been approved! Your membership card will be available soon.'
          : ''}

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
  },

  // Payment reminder template (for outbound campaigns)
  paymentReminder: (member: MemberBotInfo): string => {
    return `EFF Membership Renewal Reminder*

Hi ${member.firstname},

Your EFF membership is ${member.days_until_expiry && member.days_until_expiry > 0
        ? `expiring in ${member.days_until_expiry} days`
        : 'expired'}.

To renew your membership, please visit your local branch or make an EFT payment.

Standard Membership: R20/year

Reply *PAY* for payment details.

_Economic Freedom In Our Lifetime!_`;
  },

  // Expiry warning notification
  expiryWarning: (member: MemberBotInfo, daysUntilExpiry: number): string => {
    return `Membership Expiry Warning*

Hi ${member.firstname},

Your EFF membership will expire in *${daysUntilExpiry} days*.

Don't lose your membership benefits! Renew now to stay connected with the movement.

Reply *PAY* for payment details.

_Economic Freedom In Our Lifetime!_`;
  }
};