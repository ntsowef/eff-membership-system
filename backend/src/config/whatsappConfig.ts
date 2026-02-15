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

  return `*${lang.welcome}!*

${personalGreeting}

_[${lang.languageName}]_

*EFF Membership Services*

I can help you with:
1. Check membership status
2. Payment/renewal info
3. Update your details
4. Membership card
5. Events & rallies
6. News & updates

Reply with a number or type *HELP* for all options.

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

  const isEnglish = ('languageCode' in lang ? lang.languageCode : lang.primaryLanguage) === 'en';

  // For English speakers, use standard English greeting
  if (isEnglish) {
    return `*Welcome back, ${member.firstname}!*

Your membership status: *${member.membership_status_name}*

Quick actions:
1. Full membership status
2. Payment/renewal info
3. Update your details
4. Membership card
5. Events & rallies

Reply with a number or type *HELP* for all options.

_Economic Freedom In Our Lifetime!_`;
  }

  // Multilingual greeting in member's specific language
  return `*${lang.greeting}, ${member.firstname}!*

_[${lang.languageName}]_

Your membership status: *${member.membership_status_name}*

${lang.welcome}! Quick actions:
1. Full membership status
2. Payment/renewal info
3. Update your details
4. Membership card
5. Events & rallies

Reply with a number or type *HELP* for all options.

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
  WELCOME: `*Welcome to EFF Membership Services*

I can help you with:
1. Check membership status
2. Payment/renewal info
3. Update your details
4. Membership card
5. Events & rallies
6. News & updates

Reply with a number or type *HELP* for all options.

_Economic Freedom In Our Lifetime!_`,

  HELP_MENU: `*EFF Membership Bot - Full Menu*

*Membership Services:*
- *1* or *STATUS* - Check membership status
- *2* or *PAY* - Payment/renewal info
- *3* or *UPDATE* - Update your details
- *4* or *CARD* - Digital membership card

*Information:*
- *5* or *EVENTS* - Events & rallies
- *6* or *NEWS* - News & updates
- *7* or *VOTE* - Voting station info
- *8* or *BRANCH* - Find your branch

*More:*
- *9* or *LEARN* - Political education
- *10* or *REPORT* - Report issues/feedback
- *REFER* - Refer a friend
- *POLL* - Quick polls & surveys
- *SOS* - Emergency contacts

Reply with a command to get started.

_Economic Freedom In Our Lifetime!_`,

  REQUEST_ID: `*Membership Status Check*

Please enter your 13-digit South African ID number.

Example: 8501015800085`,

  MEMBER_NOT_FOUND: `*Member Not Found*

We couldn't find a membership record with that ID number.

But don't worry — joining the EFF family is easy!

✊ *Membership is only R10 for 2 years!*

Reply *JOIN* to learn how to become a member.
Reply *HELP* for other options.

_Economic Freedom In Our Lifetime!_`,

  PAYMENT_INFO: `*EFF Membership Payment Information*

*Standard Membership: R10/2 years*


Payment methods:
- EFT to EFF account
- Pay at your local branch
- Mobile payment apps

For specific payment queries, please contact your branch office.

Reply *STATUS* to check if your payment has been recorded.`,

  CANCELLED: `Action cancelled.

Reply *HELP* anytime to see available options.`,

  UNRECOGNIZED: `I didn't understand that.

Reply *HELP* to see what I can assist with, or *STATUS* to check your membership.`,

  ERROR: `Sorry, something went wrong. Please try again later.

If the problem persists, contact your local branch office.`,

  // Invalid ID format
  INVALID_ID: `*Invalid ID Number*

Please enter a valid 13-digit South African ID number.

Example: 8501015800085

Reply *CANCEL* to go back to the main menu.`,

  // Session timeout
  SESSION_TIMEOUT: `Your session has timed out due to inactivity.

Reply *HELP* to start a new conversation.`,

  // Format member status response
  formatMemberStatus: (member: MemberBotInfo): string => {
    const expiryInfo = member.days_until_expiry
      ? (member.days_until_expiry > 0
        ? `Expires in ${member.days_until_expiry} days`
        : `Expired ${Math.abs(member.days_until_expiry)} days ago`)
      : 'N/A';

    return `*EFF Membership Status*

*Status:* ${member.membership_status_name}

*Name:* ${member.firstname} ${member.surname}
*ID:* ${member.id_number}


*Location:*
   Ward: ${member.ward_name || member.ward_code}
   ${member.municipality_name ? `Municipality: ${member.municipality_name}` : ''}
   ${member.province_name ? `Province: ${member.province_name}` : ''}

*Expiry:* ${expiryInfo}
${member.last_payment_date ? `Last Payment: ${new Date(member.last_payment_date).toLocaleDateString('en-ZA')}` : ''}

${member.membership_status_name === 'Expired' ? '\nYour membership has expired. Reply *PAY* for renewal information.' : ''}

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
  },

  // Format application status response
  formatApplicationStatus: (app: ApplicationBotInfo): string => {
    return `*Membership Application Status*

*Status:* ${app.status}

*Name:* ${app.first_name} ${app.last_name}
*ID:* ${app.id_number}
*Applied:* ${new Date(app.created_at).toLocaleDateString('en-ZA')}

${app.status === 'Submitted' || app.status === 'Under Review'
        ? 'Your application is being processed. Please check back later.'
        : app.status === 'Approved'
          ? 'Your application has been approved! Your membership card will be available soon.'
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

Standard Membership: R10/2 years

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
  },

  // ============================================
  // Membership Card Templates
  // ============================================

  // Request ID for card generation (when user is not linked)
  CARD_REQUEST_ID: `*Digital Membership Card*

To generate your digital membership card, please enter your 13-digit South African ID number.

Example: 8501015800085

Reply *CANCEL* to go back to the main menu.`,

  // Card generation in progress
  CARD_GENERATING: `*Generating Your Membership Card*

Please wait while we generate your digital membership card...

This may take a few seconds.`,

  // Card sent successfully
  CARD_SENT: `*Membership Card Sent!*

Your digital membership card has been sent above.

You can save this card to your phone and use it as proof of membership.

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`,

  // Card generation failed
  CARD_ERROR: `*Card Generation Failed*

Sorry, we couldn't generate your membership card at this time.

Please try again later or contact your local branch office for assistance.

Reply *HELP* for more options.`,

  // Member not found for card
  CARD_MEMBER_NOT_FOUND: `*Member Not Found*

We couldn't find a membership record with that ID number.

If you're a new member, your application may still be processing.

Reply *HELP* for options or contact your local branch.`,

  // Membership expired - cannot generate card
  CARD_MEMBERSHIP_EXPIRED: (member: MemberBotInfo): string => {
    const daysExpired = member.days_until_expiry ? Math.abs(member.days_until_expiry) : 0;
    return `*Membership Card Unavailable*

Hi ${member.firstname}, your membership expired *${daysExpired} days* ago.

To receive your digital membership card, please renew your membership first.

Reply *PAY* for payment/renewal information.

_Economic Freedom In Our Lifetime!_`;
  },

  // Format card caption for document message (includes membership status info)
  formatCardCaption: (member: MemberBotInfo): string => {
    const statusInfo = member.days_until_expiry && member.days_until_expiry < 0
      ? `Status: Expired (${Math.abs(member.days_until_expiry)} days ago)\nReply *PAY* to renew your membership.`
      : `Status: ${member.membership_status_name || 'Active'}`;

    return `*EFF Digital Membership Card*

${member.firstname} ${member.surname}
${member.membership_number || 'Pending'}
${statusInfo}

_Economic Freedom In Our Lifetime!_`;
  },

  // ============================================
  // Update Information Templates
  // ============================================

  // Request ID for update - always required for security verification
  UPDATE_REQUEST_ID: `*Update Your Details*

For security, please verify your identity by entering your 13-digit South African ID number.

Example: 8501015800085

Reply *CANCEL* or *0* to go back to the main menu.`,

  // Update menu - show what can be updated
  UPDATE_MENU: (member: MemberBotInfo): string => {
    return `*Update Your Details*

Hi ${member.firstname}, what would you like to update?

1. *Email Address*
   Current: ${member.email || 'Not set'}

2. *Phone Number*
   Current: ${member.cell_number || 'Not set'}

3. *Address*
   Current: ${member.residential_address || 'Not set'}

Reply with the number (1, 2, or 3) of what you want to update.

Reply *CANCEL* or *0* to go back to the main menu.`;
  },

  // Prompt for new email
  UPDATE_EMAIL_PROMPT: `*Update Email Address*

Please enter your new email address.

Example: yourname@example.com

Reply *CANCEL* or *0* to go back to the main menu.`,

  // Prompt for new phone number
  UPDATE_PHONE_PROMPT: `*Update Phone Number*

Please enter your new phone number.

Example: 0821234567 or +27821234567

Reply *CANCEL* or *0* to go back to the main menu.`,

  // Prompt for address
  UPDATE_ADDRESS_PROMPT: `*Update Address*

Please enter your new residential address.

Example: 123 Main Street, Sandton, Johannesburg

Reply *CANCEL* or *0* to go back to the main menu.`,

  // Confirmation prompt
  UPDATE_CONFIRM: (field: string, oldValue: string, newValue: string): string => {
    return `*Confirm Update*

You are about to update your *${field}*:

Old: ${oldValue || 'Not set'}
New: *${newValue}*

Is this correct?

Reply *YES* to confirm or *NO* to cancel.`;
  },

  // Update success
  UPDATE_SUCCESS: (field: string, newValue: string): string => {
    return `*Update Successful!*

Your *${field}* has been updated to:
*${newValue}*

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
  },

  // Update cancelled
  UPDATE_CANCELLED: `*Update Cancelled*

Your information has not been changed.

Reply *HELP* for more options or *3* to try updating again.`,

  // Invalid email format
  UPDATE_INVALID_EMAIL: `*Invalid Email Address*

Please enter a valid email address.

Example: yourname@example.com

Reply *CANCEL* or *0* to go back to the main menu.`,

  // Invalid phone format
  UPDATE_INVALID_PHONE: `*Invalid Phone Number*

Please enter a valid South African phone number.

Examples:
- 0821234567
- +27821234567
- 27821234567

Reply *CANCEL* or *0* to go back to the main menu.`,

  // Invalid address
  UPDATE_INVALID_ADDRESS: `*Invalid Address*

Please enter a valid address (at least 5 characters).

Example: 123 Main Street, Sandton, Johannesburg

Reply *CANCEL* or *0* to go back to the main menu.`,

  // ============================================
  // Events & Rallies Templates
  // ============================================

  EVENTS_MENU: `*EFF Events & Rallies*

Upcoming events in your area:

*National Events*
   Check back for upcoming national gatherings

*Provincial Events*
   Events will be announced soon

To stay updated:
- Follow EFF on social media
- Check with your local branch

Reply *BRANCH* to find your nearest branch.
Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`,

  EVENTS_DETAIL: (event: { name: string; date: string; location: string; description: string }): string => {
    return `*${event.name}*

Date: ${event.date}
Location: ${event.location}

${event.description}

Reply *RSVP* to confirm attendance.
Reply *EVENTS* to see more events.

_Economic Freedom In Our Lifetime!_`;
  },

  // ============================================
  // News & Updates Templates
  // ============================================

  NEWS_MENU: `*EFF News & Updates*

Latest from the Economic Freedom Fighters:

*Press Releases*
   Official statements and announcements

*Media Coverage*
   EFF in the news

*Leadership Updates*
   Messages from CIC and leadership

Visit our official channels:
- Website: www.effonline.org
- Twitter/X: @EFFSouthAfrica
- Facebook: Economic Freedom Fighters

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`,

  // ============================================
  // Voting Station Templates
  // ============================================

  VOTING_INFO: (member: { is_registered_voter?: boolean; voting_station_name?: string; voting_district_code?: string; ward_code?: string; ward_name?: string; municipality_name?: string; province_name?: string }): string => {
    if (member.is_registered_voter) {
      const vdNameLine = member.voting_station_name
        ? `*Voting District:* ${member.voting_station_name}`
        : (member.voting_district_code ? `*Voting District Code:* ${member.voting_district_code}` : '');

      return `*Voting Information*

You are registered to vote.

${vdNameLine}
Ward: ${member.ward_name || member.ward_code || 'Not set'}
Municipality: ${member.municipality_name || 'Not set'}
Province: ${member.province_name || 'Not set'}

*Important Dates:*
- Check IEC website for election dates
- Registration weekends announced by IEC

_Economic Freedom In Our Lifetime!_`;
    }

    return `*Voting Information*

You are not registered to vote.

*Voter Registration:*
Visit www.elections.org.za or your nearest IEC office to register.

_Economic Freedom In Our Lifetime!_`;
  },

  VOTING_NOT_LINKED: `*Voting Information*

To view your voting station details, we need to verify your membership first.

Reply *1* or *STATUS* and enter your ID number to link your account.

_Economic Freedom In Our Lifetime!_`,

  // ============================================
  // Branch Locator Templates
  // ============================================

  BRANCH_INFO: (member: { province_name?: string; municipality_name?: string; ward_code?: string }): string => {
    return `*Find Your EFF Branch*

Based on your location:
Province: ${member.province_name || 'Not set'}
Municipality: ${member.municipality_name || 'Not set'}
Ward: ${member.ward_code || 'Not set'}

*Contact Your Branch:*
Visit your nearest EFF branch office for:
- Membership queries
- Event information
- Community issues
- Political education

*Provincial Office:*
Contact your provincial office for branch details.

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
  },

  BRANCH_NOT_LINKED: `*Find Your EFF Branch*

To find your nearest branch, we need to verify your membership first.

Reply *1* or *STATUS* and enter your ID number to link your account.

_Economic Freedom In Our Lifetime!_`,

  // ============================================
  // Political Education Templates
  // ============================================

  LEARN_MENU: `*EFF Political Education*

Learn about the movement:

1. *Founding Manifesto*
   Our vision for economic freedom

2. *7 Non-Negotiables*
   Core pillars of the EFF

3. *Cardinal Pillars*
   Guiding principles

4. *Key Policies*
   Land, nationalization, education

Reply with a number to learn more.
Reply *HELP* for main menu.

_Economic Freedom In Our Lifetime!_`,

  LEARN_MANIFESTO: `*EFF Founding Manifesto*

The EFF was founded on July 26, 2013, with a clear vision:

*Economic Freedom in Our Lifetime*

Key Focus Areas:
- Expropriation of land without compensation
- Nationalization of mines, banks & strategic sectors
- Free quality education, healthcare & housing
- Massive protected industrial development
- African unity and self-determination

The EFF is a radical, leftist, anti-capitalist and anti-imperialist movement.

Reply *LEARN* for more topics.

_Economic Freedom In Our Lifetime!_`,

  LEARN_PILLARS: `*7 Non-Negotiable Cardinal Pillars*

1. Expropriation of land without compensation
2. Nationalization of mines
3. Nationalization of banks
4. Nationalization of strategic sectors
5. Free quality education & healthcare
6. Massive protected industrial development
7. African unity and self-determination

These pillars guide all EFF policies and actions.

Reply *LEARN* for more topics.

_Economic Freedom In Our Lifetime!_`,

  // ============================================
  // Report Issues / Feedback Templates
  // ============================================

  REPORT_MENU: `*Report Issues / Feedback*

What would you like to report?

1. *Community Issue*
   Service delivery, municipal problems

2. *Party/Branch Issue*
   Internal matters, branch concerns

3. *Feedback/Suggestion*
   Ideas to improve our services

Reply with a number to continue.
Reply *CANCEL* or *0* to go back.

_Economic Freedom In Our Lifetime!_`,

  REPORT_PROMPT: `*Submit Your Report*

Please describe your issue or feedback in detail.

Include:
- Location (if applicable)
- Date/time of incident
- Any relevant details

Type your message and send.
Reply *CANCEL* to go back.`,

  REPORT_SUBMITTED: `*Report Submitted*

Thank you for your feedback!

Your report has been received and will be reviewed by the relevant team.

Reference: #RPT${Date.now().toString().slice(-8)}

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`,

  // ============================================
  // Refer a Friend Templates
  // ============================================

  REFER_MENU: (member: { firstname: string; member_id: number }): string => {
    const referralCode = `EFF${member.member_id}`;
    return `*Refer a Friend*

Hi ${member.firstname}! Help grow the movement!

*Your Referral Code:*
   ${referralCode}

Share this message with friends:
_"Join the EFF! Use my referral code ${referralCode} when you register. Together we fight for Economic Freedom In Our Lifetime!"_

*How to Join:*
- Visit your nearest EFF branch
- Register online at effonline.org
- Mention referral code: ${referralCode}

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
  },

  REFER_NOT_LINKED: `*Refer a Friend*

To get your personal referral code, we need to verify your membership first.

Reply *1* or *STATUS* and enter your ID number to link your account.

_Economic Freedom In Our Lifetime!_`,

  // ============================================
  // Quick Poll Templates
  // ============================================

  POLL_MENU: `*Quick Polls*

Participate in current polls and surveys:

*Active Polls:*
   No active polls at the moment.

Check back soon for new polls where your voice matters!

Your participation helps shape EFF policies and priorities.

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`,

  POLL_QUESTION: (poll: { question: string; options: string[] }): string => {
    const optionsList = poll.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    return `*Poll Question*

${poll.question}

${optionsList}

Reply with the number of your choice.
Reply *SKIP* to skip this poll.`;
  },

  POLL_THANKS: `*Thank You!*

Your vote has been recorded.

Reply *POLL* to see more polls.
Reply *HELP* for main menu.

_Economic Freedom In Our Lifetime!_`,

  // ============================================
  // Emergency Contacts Templates
  // ============================================

  SOS_MENU: `*Emergency & Important Contacts*

*Emergency Services:*
Police: 10111
Ambulance: 10177
Fire: 10177

*EFF Contacts:*
National Office: [Contact Number]
Email: info@effonline.org
Website: www.effonline.org

*Legal Aid:*
Legal Aid SA: 0800 110 110

*Report Corruption:*
Anti-Corruption Hotline: 0800 701 701

*Gender-Based Violence:*
GBV Command Centre: 0800 428 428

Reply *HELP* for more options.

_Stay Safe, Fighter!_`,

  // ============================================
  // Non-Member Welcome & Engagement Templates
  // ============================================

  NON_MEMBER_WELCOME: `✊ *Welcome to the Economic Freedom Fighters!*

You've reached the EFF Membership Bot.

 *Why Join the EFF?*
• Be part of Africa's fastest-growing movement
• Fight for land, jobs & economic freedom
• Get your digital membership card
• Access events, rallies & political education
• Exercise your voting rights within the party

💰 *Membership is only R10 for 2 years!*

Ready to be part of the change?

Reply *JOIN* to become a member
Reply *LEARN* for political education
Reply *SOS* if you need help

_Economic Freedom In Our Lifetime!_ `,

  NON_MEMBER_HELP_MENU: `*EFF Bot — How Can We Help?*

*Join the Movement:*
- *JOIN* — Become an EFF member
- *BENEFITS* — Why join the EFF?
- *LEARN* — Political education

*Get Assistance:*
- *LABOUR* — Labour desk (workplace issues)
- *GBV* — Gender-based violence support
- *APPOINTMENT* — Book a consultation
- *SOS* — Emergency contacts

*Information:*
- *EVENTS* — Upcoming events & rallies
- *NEWS* — Latest EFF news
- *STATUS* — Check membership (existing members)

Reply with a keyword to get started.

_Economic Freedom In Our Lifetime!_`,

  JOIN_INFO: `✊ *Join the EFF — It's Easy!*

*Membership Fee:* R10 for 2 years

*How to Register:*
1️⃣ Visit your nearest EFF branch
2️⃣ Register online at effonline.org
3️⃣ Contact your local branch for assistance

*What You'll Need:*
• South African ID number
• Cellphone number
• Residential address

*What You Get:*
✅ Official EFF membership card
✅ Voting rights in party elections
✅ Access to events, rallies & conferences
✅ Political education programmes
✅ Branch-level participation
✅ Labour & legal support access

Reply *BENEFITS* for more on what members enjoy.
Reply *BRANCH* to find your nearest branch.

_Economic Freedom In Our Lifetime!_ ✊`,

  MEMBERSHIP_BENEFITS: `🔴 *EFF Membership Benefits*

*Political Participation:*
✅ Vote in party elections & conferences
✅ Stand for leadership positions
✅ Participate in branch activities
✅ Shape party policy & direction

*Support & Services:*
✅ Labour desk — workplace dispute assistance
✅ GBV support desk — gender-based violence help
✅ Legal guidance referrals
✅ Community issue reporting

*Education & Development:*
✅ Political education programmes
✅ Leadership development
✅ Community organizing skills

*Access & Belonging:*
✅ Official digital membership card
✅ Event & rally access
✅ WhatsApp member services
✅ Part of 2M+ strong movement

All this for just *R10 for 2 years!*

Reply *JOIN* to get started.
Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`,

  LABOUR_DESK: `⚖️ *EFF Labour Desk*

The EFF Labour Desk assists workers with:
• Unfair dismissals & retrenchments
• Workplace disputes & grievances
• CCMA representation guidance
• Labour law information
• Exploitation & unfair practices

*Key Contacts:*
 EFF Labour Desk: 010 XXX XXXX
 labour@effonline.org
 www.effonline.org/labour

*Emergency Numbers:*
Department of Labour: 0800 030 007
CCMA: 011 377 6650

*What to Prepare:*
• Employment contract (if available)
• Details of the dispute/incident
• Employer information
• Any written warnings or letters

Reply *APPOINTMENT* to schedule a consultation.
Reply *HELP* for more options.

_Workers Unite for Economic Freedom!_`,

  GBV_DESK: ` *EFF Gender-Based Violence Desk*

*You are not alone.* The EFF GBV Desk provides:
• Confidential support & counselling referrals
• Protection order guidance
• Legal advice referrals
• Safe house information
• Case follow-up assistance

*24/7 Emergency Numbers:*
 GBV Command Centre: *0800 428 428*
 Childline: *116*
 SAPS: *10111*
 Lifeline Crisis: *0861 322 322*

*EFF GBV Desk:*
 010 XXX XXXX
 gbv@effonline.org

 *If you are in immediate danger, call 10111 now.*

Reply *APPOINTMENT* to schedule a private consultation.
Reply *HELP* for more options.

_Together We End Gender-Based Violence!_`,

  APPOINTMENT_INFO: ` *Book a Consultation*

The EFF can assist you with:

1️⃣ *Labour Issues* — Workplace disputes, unfair dismissal
2️⃣ *GBV Support* — Gender-based violence assistance
3️⃣ *Membership Queries* — Registration & general enquiries
4️⃣ *Community Issues* — Service delivery, local matters

*How to Book:*
 Call your nearest EFF branch
 Email: appointments@effonline.org
 Or reply *BRANCH* to find your nearest office

*Office Hours:*
Monday–Friday: 08:00 – 17:00
Saturday: 09:00 – 13:00

Reply *LABOUR* for labour desk info.
Reply *GBV* for GBV desk info.
Reply *HELP* for the main menu.

_Economic Freedom In Our Lifetime!_`,

  NON_MEMBER_UNRECOGNIZED: `I didn't quite catch that! 🤔

Here are some things I can help with:

• *JOIN* — Become an EFF member
• *HELP* — See all options
• *LABOUR* — Workplace help
• *GBV* — Gender-based violence support
• *SOS* — Emergency contacts

Reply with a keyword above or type *HELP*.

_Economic Freedom In Our Lifetime!_`,

  // ============================================
  // Phone Linking Templates
  // ============================================

  GREETING_ASK_ID: `*Welcome to EFF Membership Services!* 

To get started, please provide your *13-digit South African ID number* so we can verify your membership.

Example: 8501015800085

_Your information is safe and only used for membership verification._`,

  LINK_PHONE_ASK: (firstname: string): string => {
    return ` *Welcome, ${firstname}!*

Would you like to *link this WhatsApp number* to your membership for faster service in the future?

🔗 Benefits of linking:
• Skip ID verification next time
• Instant personalized greeting
• Quick access to all services

Reply *YES* to link or *NO* to continue without linking.`;
  },

  LINK_PHONE_SUCCESS: ` *Phone Number Linked Successfully!*

Your WhatsApp number is now linked to your membership. Next time you message us, we'll greet you by name and skip the ID verification!

Reply *HELP* for all available options.

_Economic Freedom In Our Lifetime!_`,

  LINK_PHONE_DECLINED: ` *No Problem!*

You can still use all our services — you'll just need to verify your ID each time.

You can link your number later anytime by choosing *Update Details* → *Link Phone*.

Reply *HELP* for all available options.

_Economic Freedom In Our Lifetime!_`,

  UNLINK_PHONE_CONFIRM: ` *Unlink Phone Number?*

Are you sure you want to unlink your WhatsApp number from your membership?

You'll need to enter your ID number each time you use the bot.

Reply *YES* to unlink or *NO* to cancel.`,

  UNLINK_PHONE_SUCCESS: ` *Phone Number Unlinked*

Your WhatsApp number has been unlinked from your membership. You'll need to verify your ID each session.

Reply *HELP* for more options.

_Economic Freedom In Our Lifetime!_`,

  // Update menu with phone linking option
  UPDATE_MENU_WITH_LINK: (member: MemberBotInfo, isLinked: boolean): string => {
    const linkOption = isLinked
      ? `4. *Unlink Phone Number*\n   Status:  Linked`
      : `4. *Link Phone Number*\n   Status:  Not linked`;
    return `*Update Your Details*

Hi ${member.firstname}, what would you like to update?

1. *Email Address*
   Current: ${member.email || 'Not set'}

2. *Phone Number*
   Current: ${member.cell_number || 'Not set'}

3. *Address*
   Current: ${member.residential_address || 'Not set'}

${linkOption}

Reply with the number (1-4) of what you want to update.

Reply *CANCEL* or *0* to go back to the main menu.`;
  }
};