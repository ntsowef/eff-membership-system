import { WhatsAppProviderManager } from './whatsappProviderManager';
import { WhatsAppMemberService, MemberInfo } from './whatsappMemberService';
import { executeQuery } from '../config/database';
import { logger } from '../utils/logger';
import { MessageTemplates } from '../config/whatsappConfig';
import { DigitalMembershipCardModel } from '../models/digitalMembershipCard';
import { InteractiveButton, InteractiveListSection } from '../types/whatsappProvider';

/** Bot response: either plain text or an interactive message */
interface BotResponse {
  text: string;
  interactive?: {
    type: 'buttons' | 'list';
    buttons?: InteractiveButton[];
    listSections?: InteractiveListSection[];
    listButtonText?: string;
    header?: string;
    footer?: string;
  };
}

interface IncomingMessage {
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string;
    cleanedSenderPn?: string;
    cleanedParticipantPn?: string;
  };
  messageBody: string;
  message: any;
}

interface BotSession {
  phone_number: string;
  member_id?: number;
  current_state: string;
  context: any;
  linked_member?: MemberInfo | null;
}

export class WhatsAppBotService {

  // Deduplication: track recently processed message IDs to prevent double replies
  private static processedMessageIds = new Set<string>();
  // Content-based dedup: track phone+content hash to catch duplicates with different IDs
  private static processedContentHashes = new Set<string>();

  // Intent patterns for message classification
  private static intentPatterns = {
    greeting: /^(hi|hello|hey|sawubona|dumelang|molo|thobela|howzit|heita)/i,
    help: /^(help|menu|\?|options)/i,
    member_lookup: /^(status|check|my status|membership|1)/i,
    id_provided: /^\d{13}$/,  // 13-digit SA ID number
    payment: /^(pay|renew|payment|2)/i,
    update_info: /^(update|change|edit|modify|details|3)/i,  // Update member details
    card_request: /^(card|membership card|my card|download card|get card|4)/i,  // Card request
    // New menu items
    events: /^(events|rally|rallies|meetings|gathering|5)$/i,  // Events & Rallies
    news: /^(news|updates|announcements|press|6)$/i,  // News & Updates
    voting: /^(vote|voting|election|ballot|station|7)$/i,  // Voting Station Info
    branch: /^(branch|office|location|find|nearest|8)$/i,  // Branch Locator
    learn: /^(learn|education|manifesto|policy|policies|9)$/i,  // Political Education
    report: /^(report|feedback|complain|complaint|issue|10)$/i,  // Report Issues
    refer: /^(refer|invite|friend|recruit|share)$/i,  // Refer a Friend
    poll: /^(poll|survey|opinion)$/i,  // Quick Poll (removed 'vote' to avoid conflict)
    sos: /^(sos|emergency|help me|urgent|contacts)$/i,  // Emergency Contacts
    // Non-member engagement intents
    join: /^(join|register|signup|sign up|become|enroll|enlist|join eff)$/i,  // Join EFF
    benefits: /^(benefits|why join|advantages|perks|what do i get)$/i,  // Membership Benefits
    labour_desk: /^(labour|labor|labour desk|worker|employment|retrenchment|unfair dismissal|dismissal|ccma|workplace)$/i,  // Labour Desk
    gbv_desk: /^(gbv|gender|violence|abuse|domestic|assault|gbv desk|rape|harassment)$/i,  // GBV Desk
    appointment: /^(appointment|book|schedule|consult|consultation|meet)$/i,  // Book Appointment
    cancel: /^(cancel|stop|exit|quit|0)$/i,
    yes: /^(yes|y|yebo|ja|correct|confirm)$/i,
    no: /^(no|n|cha|nee|wrong)$/i,
    // Update field selections (only used in update_menu state)
    update_email: /^(email|e-mail|update_email|1)$/i,
    update_phone: /^(phone|cell|cellphone|mobile|number|update_phone|2)$/i,
    update_address: /^(address|ward|location|update_address|3)$/i,
    // Report type selections (only used in report_menu state)
    report_community: /^(community|service|municipal|report_community|1)$/i,
    report_party: /^(party|branch|internal|report_party|2)$/i,
    report_feedback: /^(feedback|suggestion|idea|report_feedback|3)$/i,
  };

  static async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    console.log(' [WhatsApp Bot] handleIncomingMessage called with:', JSON.stringify(message, null, 2));

    const senderPhone = message.key.cleanedParticipantPn || message.key.cleanedSenderPn;
    const messageText = message.messageBody?.trim() || '';
    const messageId = message.key.id;

    console.log('[WhatsApp Bot] Extracted:', { senderPhone, messageText, messageId, fromMe: message.key.fromMe });

    // Deduplication: skip if this message ID was already processed
    if (messageId && this.processedMessageIds.has(messageId)) {
      console.log('[WhatsApp Bot] Duplicate message ID, skipping:', messageId);
      return;
    }
    // Track this message ID and auto-clean after 5 minutes
    if (messageId) {
      this.processedMessageIds.add(messageId);
      setTimeout(() => this.processedMessageIds.delete(messageId), 5 * 60 * 1000);
    }

    // Content-based dedup: catch duplicates with different message IDs (e.g. messages.received vs messages.upsert)
    const contentHash = `${senderPhone}:${messageText}`;
    if (this.processedContentHashes.has(contentHash)) {
      console.log('[WhatsApp Bot] Duplicate content hash, skipping:', contentHash);
      return;
    }
    this.processedContentHashes.add(contentHash);
    setTimeout(() => this.processedContentHashes.delete(contentHash), 10 * 1000); // 10 second window

    if (!senderPhone || message.key.fromMe) {
      console.log('[WhatsApp Bot] Skipping - no sender or fromMe');
      return; // Ignore if no sender or message is from bot
    }

    console.log(' [WhatsApp Bot] Processing message from:', senderPhone);
    logger.info('Processing incoming WhatsApp message', {
      phone: senderPhone,
      messageLength: messageText.length
    });

    try {
      // Log incoming message
      await this.logMessage({
        phone_number: senderPhone,
        direction: 'inbound',
        message_type: 'text',
        message_content: messageText,
        wasender_message_id: messageId,
      });

      // Get or create bot session
      const session = await this.getOrCreateSession(senderPhone);

      // Detect intent
      const intent = this.detectIntent(messageText, session.current_state);

      // Process based on intent and current state
      const response = await this.processMessage(messageText, intent, session);

      // Send response (interactive or text)
      if (response) {
        await this.sendBotResponse(senderPhone, response, intent, !!session.linked_member);
      }
    } catch (error: any) {
      logger.error('Error handling WhatsApp message', {
        phone: senderPhone,
        error: error.message
      });

      // Send error message to user
      await WhatsAppProviderManager.sendTextMessage(
        senderPhone,
        MessageTemplates.ERROR
      );
    }
  }

  /**
   * Send bot response — uses interactive buttons/lists for menus, plain text otherwise.
   */
  private static async sendBotResponse(phone: string, text: string, intent: string, isLinkedMember: boolean = false): Promise<void> {
    try {
      // Determine if we should send an interactive message based on intent and membership status
      const interactive = this.getInteractiveForIntent(intent, isLinkedMember);

      if (interactive?.type === 'buttons' && interactive.buttons) {
        await WhatsAppProviderManager.sendInteractiveButtons(
          phone, text, interactive.buttons,
          { header: interactive.header, footer: interactive.footer }
        );
      } else if (interactive?.type === 'list' && interactive.sections) {
        await WhatsAppProviderManager.sendInteractiveList(
          phone, text, interactive.buttonText || 'Menu',
          interactive.sections,
          { header: interactive.header, footer: interactive.footer }
        );
      } else {
        await WhatsAppProviderManager.sendTextMessage(phone, text);
      }

      await this.logMessage({
        phone_number: phone,
        direction: 'outbound',
        message_type: interactive ? 'interactive' : 'text',
        message_content: text,
        intent_detected: intent,
      });
    } catch (error: any) {
      logger.error('Failed to send bot response, falling back to text', { phone, error: error.message });
      // Fallback to plain text if interactive fails
      try {
        await WhatsAppProviderManager.sendTextMessage(phone, text);
      } catch (fallbackErr: any) {
        logger.error('Fallback text send also failed', { phone, error: fallbackErr.message });
      }
    }
  }

  /**
   * Map intents to interactive message configs.
   * Returns null for intents that should use plain text.
   * @param isLinkedMember - true if user is a linked EFF member (affects greeting/help menus)
   */
  private static getInteractiveForIntent(intent: string, isLinkedMember: boolean = false): {
    type: 'buttons' | 'list';
    buttons?: InteractiveButton[];
    sections?: InteractiveListSection[];
    buttonText?: string;
    header?: string;
    footer?: string;
  } | null {
    switch (intent) {
      case 'greeting':
        if (isLinkedMember) {
          // Member greeting: show member services list
          return {
            type: 'list',
            buttonText: 'View Options',
            header: 'EFF Membership Services',
            footer: 'Economic Freedom In Our Lifetime!',
            sections: [{
              title: 'Services',
              rows: [
                { id: '1', title: 'Membership Status', description: 'Check your membership' },
                { id: '2', title: 'Payment Info', description: 'Renewal & payment details' },
                { id: '3', title: 'Update Details', description: 'Change email/phone/address' },
                { id: '4', title: 'Membership Card', description: 'Get your digital card' },
                { id: '5', title: 'Events & Rallies', description: 'Upcoming events' },
                { id: '6', title: 'News & Updates', description: 'Latest announcements' },
              { id: 'help', title: ' Help / Full Menu', description: 'See all available options' },
              ]
            }]
          };
        }
        // Non-member greeting: persuasive buttons
        return {
          type: 'buttons',
          header: 'Welcome to the EFF!',
          footer: 'Economic Freedom In Our Lifetime!',
          buttons: [
            { id: 'join', title: ' Join the EFF' },
            { id: 'benefits', title: 'ℹ Why Join?' },
            { id: 'help', title: ' Get Help' },
          ]
        };

      case 'help':
        if (isLinkedMember) {
          // Member help: full menu list
          return {
            type: 'list',
            buttonText: 'Full Menu',

            footer: 'Economic Freedom In Our Lifetime!',
            sections: [
              {
                title: 'Membership Services',
                rows: [
                  { id: '1', title: 'Membership Status' },
                  { id: '2', title: 'Payment/Renewal' },
                  { id: '3', title: 'Update Details' },
                  { id: '4', title: 'Membership Card' },
                ]
              },
              {
                title: 'Information',
                rows: [
                  { id: '5', title: 'Events & Rallies' },
                  { id: '6', title: 'News & Updates' },
                  { id: '7', title: 'Voting Station Info' },
                  { id: '8', title: 'Find Your Branch' },
                ]
              },
              {
                title: 'More',
                rows: [
                  { id: '9', title: 'Political Education' },
                  { id: '10', title: 'Report/Feedback' },
                ]
              }
            ]
          };
        }
        // Non-member help: tailored list with join + help desks
        return {
          type: 'list',
          buttonText: 'View Options',
          header: 'EFF — How Can We Help?',
          footer: 'Economic Freedom In Our Lifetime!',
          sections: [
            {
              title: 'Join the Movement',
              rows: [
                { id: 'join', title: 'Become a Member', description: 'Join for just R10 / 2 years' },
                { id: 'benefits', title: 'Why Join EFF?', description: 'Membership benefits' },
                { id: 'learn', title: 'Political Education', description: 'Learn about the EFF' },
              ]
            },
            {
              title: 'Get Assistance',
              rows: [
                { id: 'labour_desk', title: 'Labour Desk', description: 'Workplace issues & disputes' },
                { id: 'gbv_desk', title: 'GBV Support', description: 'Gender-based violence help' },
                { id: 'appointment', title: 'Book Consultation', description: 'Schedule an appointment' },
                { id: 'sos', title: 'Emergency Contacts', description: 'Urgent help numbers' },
              ]
            },
            {
              title: 'Information',
              rows: [
                { id: '5', title: 'Events & Rallies', description: 'Upcoming EFF events' },
                { id: '6', title: 'News & Updates', description: 'Latest EFF news' },
              ]
            }
          ]
        };

      case 'join':
        return {
          type: 'buttons',
          header: 'Join the EFF',
          footer: 'Economic Freedom In Our Lifetime!',
          buttons: [
            { id: 'benefits', title: ' See Benefits' },
            { id: 'branch', title: ' Find a Branch' },
            { id: 'learn', title: ' Learn About EFF' },
          ]
        };

      case 'benefits':
        return {
          type: 'buttons',
          header: 'EFF Membership Benefits',
          footer: 'R10 for 2 years!',
          buttons: [
            { id: 'join', title: ' Join Now' },
            { id: 'labour_desk', title: ' Labour Desk' },
            { id: 'gbv_desk', title: '🛡️ GBV Support' },
          ]
        };

      case 'labour_desk':
        return {
          type: 'buttons',
          header: 'EFF Labour Desk',
          buttons: [
            { id: 'appointment', title: ' Book Consult' },
            { id: 'join', title: ' Join EFF' },
            { id: 'help', title: ' Main Menu' },
          ]
        };

      case 'gbv_desk':
        return {
          type: 'buttons',
          header: 'EFF GBV Support',
          buttons: [
            { id: 'appointment', title: '📅 Book Consult' },
            { id: 'sos', title: ' Emergency #s' },
            { id: 'help', title: ' Main Menu' },
          ]
        };

      case 'appointment':
        return {
          type: 'buttons',
          header: 'Book a Consultation',
          buttons: [
            { id: 'labour_desk', title: '⚖️ Labour Issues' },
            { id: 'gbv_desk', title: '🛡️ GBV Support' },
            { id: 'branch', title: '📍 Find Branch' },
          ]
        };

      case 'update_email':
      case 'update_phone':
      case 'update_address':
        return null;

      case 'id_provided_for_update':
        return {
          type: 'buttons',
          buttons: [
            { id: 'update_email', title: 'Email Address' },
            { id: 'update_phone', title: 'Phone Number' },
            { id: 'update_address', title: 'Address' },
          ]
        };

      case 'voting':
        return {
          type: 'buttons',
          header: 'Voting Information',
          buttons: [
            { id: 'help', title: 'Help' },
          ]
        };

      case 'confirm_yes':
      case 'confirm_no':
      case 'link_yes':
      case 'link_no':
      case 'unlink_yes':
      case 'unlink_no':
      case 'invalid_link_confirmation':
      case 'invalid_id':
      case 'update_link_phone':
      case 'update_unlink_phone':
        return null;

      case 'id_provided_for_greeting':
        return {
          type: 'buttons',
          header: 'Link Your Number?',
          buttons: [
            { id: 'link_yes', title: ' Yes, Link It' },
            { id: 'link_no', title: ' No Thanks' },
          ]
        };

      case 'report':
        return {
          type: 'buttons',
          header: 'Report Issues / Feedback',
          buttons: [
            { id: 'report_community', title: 'Community Issue' },
            { id: 'report_party', title: 'Party/Branch Issue' },
            { id: 'report_feedback', title: 'Feedback/Suggestion' },
          ]
        };

      case 'learn':
        return {
          type: 'list',
          buttonText: 'Learn More',
          header: 'EFF Political Education',
          footer: 'Economic Freedom In Our Lifetime!',
          sections: [{
            title: 'Topics',
            rows: [
              { id: 'learn_1', title: 'Founding Manifesto', description: 'Our vision for economic freedom' },
              { id: 'learn_2', title: '7 Non-Negotiables', description: 'Core pillars of the EFF' },
              { id: 'learn_3', title: 'Cardinal Pillars', description: 'Guiding principles' },
              { id: 'learn_4', title: 'Key Policies', description: 'Land, nationalization, education' },
            ]
          }]
        };

      default:
        return null;
    }
  }

  private static detectIntent(message: string, currentState: string): string {
    const lowerMessage = message.toLowerCase().trim();

    // If waiting for ID input (for initial greeting flow)
    if (currentState === 'awaiting_id_for_greeting' && this.intentPatterns.id_provided.test(message)) {
      return 'id_provided_for_greeting';
    }
    if (currentState === 'awaiting_id_for_greeting') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      return 'invalid_id';
    }

    // If waiting for link confirmation after ID verification
    if (currentState === 'awaiting_link_confirmation') {
      if (this.intentPatterns.yes.test(lowerMessage)) return 'link_yes';
      if (this.intentPatterns.no.test(lowerMessage) || this.intentPatterns.cancel.test(lowerMessage)) return 'link_no';
      return 'invalid_link_confirmation';
    }

    // If waiting for unlink confirmation
    if (currentState === 'awaiting_unlink_confirmation') {
      if (this.intentPatterns.yes.test(lowerMessage)) return 'unlink_yes';
      if (this.intentPatterns.no.test(lowerMessage) || this.intentPatterns.cancel.test(lowerMessage)) return 'unlink_no';
      return 'invalid_link_confirmation';
    }

    // If waiting for ID input (for status check)
    if (currentState === 'awaiting_id' && this.intentPatterns.id_provided.test(message)) {
      return 'id_provided';
    }

    // If waiting for ID input (for card generation)
    if (currentState === 'awaiting_id_for_card' && this.intentPatterns.id_provided.test(message)) {
      return 'id_provided_for_card';
    }

    // If waiting for ID input (for update)
    if (currentState === 'awaiting_id_for_update' && this.intentPatterns.id_provided.test(message)) {
      return 'id_provided_for_update';
    }

    // If showing update menu, detect field selection
    if (currentState === 'update_menu') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      if (this.intentPatterns.update_email.test(lowerMessage)) return 'update_email';
      if (this.intentPatterns.update_phone.test(lowerMessage)) return 'update_phone';
      if (this.intentPatterns.update_address.test(lowerMessage)) return 'update_address';
      if (/^(link|link phone|link_phone|4)$/i.test(lowerMessage)) return 'update_link_phone';
      if (/^(unlink|unlink phone|unlink_phone|4)$/i.test(lowerMessage)) return 'update_unlink_phone';
      return 'invalid_selection';
    }

    // If waiting for new email value
    if (currentState === 'awaiting_new_email') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      return 'email_value_provided';
    }

    // If waiting for new phone value
    if (currentState === 'awaiting_new_phone') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      return 'phone_value_provided';
    }

    // If waiting for new address value
    if (currentState === 'awaiting_new_address') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      return 'address_value_provided';
    }

    // If waiting for confirmation
    if (currentState === 'confirm_update') {
      if (this.intentPatterns.yes.test(lowerMessage)) return 'confirm_yes';
      if (this.intentPatterns.no.test(lowerMessage) || this.intentPatterns.cancel.test(lowerMessage)) return 'confirm_no';
      return 'invalid_confirmation';
    }

    // If in report menu, detect report type selection
    if (currentState === 'report_menu') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      if (this.intentPatterns.report_community.test(lowerMessage)) return 'report_community';
      if (this.intentPatterns.report_party.test(lowerMessage)) return 'report_party';
      if (this.intentPatterns.report_feedback.test(lowerMessage)) return 'report_feedback';
      // If unrecognized, return unknown to trigger help in processMessage
      return 'unknown';
    }

    // If in learn menu, handle selections
    if (currentState === 'learn_menu') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      // Learn menu selections are handled in processMessage default case
      return 'unknown';
    }

    // If awaiting report text, return as report submission
    if (currentState === 'awaiting_report') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      return 'report_submitted';
    }

    // Check each pattern
    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }

    return 'unknown';
  }

  private static async processMessage(
    message: string,
    intent: string,
    session: BotSession
  ): Promise<string> {
    switch (intent) {
      case 'greeting':
        // If phone is linked to member, show personalized greeting (skip ID)
        if (session.linked_member) {
          await this.updateSessionState(session.phone_number, 'idle', {});
          return this.getPersonalizedWelcome(session.linked_member);
        }
        // Non-linked: ask for ID number immediately
        await this.updateSessionState(session.phone_number, 'awaiting_id_for_greeting', {});
        return MessageTemplates.GREETING_ASK_ID;

      case 'id_provided_for_greeting':
        return await this.handleGreetingIdProvided(message, session);

      case 'invalid_id':
        return `❌ That doesn't look like a valid 13-digit SA ID number.\n\nPlease enter your *13-digit ID number* (e.g. 8501015800085)\n\nReply *CANCEL* or *0* to go back.`;

      case 'link_yes':
        return await this.handleLinkConfirmation(true, session);

      case 'link_no':
        return await this.handleLinkConfirmation(false, session);

      case 'invalid_link_confirmation':
        return `Please reply *YES* to link your number or *NO* to skip.`;

      case 'unlink_yes':
        return await this.handleUnlinkConfirmation(true, session);

      case 'unlink_no':
        return await this.handleUnlinkConfirmation(false, session);

      case 'update_link_phone':
        return await this.handleUpdateLinkPhone(session);

      case 'update_unlink_phone':
        return await this.handleUpdateUnlinkPhone(session);

      case 'help':
        await this.updateSessionState(session.phone_number, 'idle', {});
        // Non-members get a tailored help menu with join/help desk options
        if (!session.linked_member) {
          return MessageTemplates.NON_MEMBER_HELP_MENU;
        }
        return MessageTemplates.HELP_MENU;

      case 'join':
        await this.updateSessionState(session.phone_number, 'idle', {});
        if (session.linked_member) {
          return `You're already an EFF member, ${session.linked_member.firstname}! ✊\n\nReply *STATUS* to view your membership.\nReply *REFER* to invite friends to join.\n\n_Economic Freedom In Our Lifetime!_`;
        }
        return MessageTemplates.JOIN_INFO;

      case 'benefits':
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.MEMBERSHIP_BENEFITS;

      case 'labour_desk':
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.LABOUR_DESK;

      case 'gbv_desk':
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.GBV_DESK;

      case 'appointment':
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.APPOINTMENT_INFO;

      case 'member_lookup':
        // If phone is already linked to a member, show status directly
        if (session.linked_member) {
          return MessageTemplates.formatMemberStatus(session.linked_member as any);
        }
        // Otherwise ask for ID
        await this.updateSessionState(session.phone_number, 'awaiting_id', {});
        return MessageTemplates.REQUEST_ID;

      case 'id_provided':
        return await this.handleMemberLookup(message, session);

      case 'id_provided_for_card':
        return await this.handleCardRequestWithId(message, session);

      case 'payment':
        // If linked member, show personalized payment info
        if (session.linked_member) {
          return this.getPersonalizedPaymentInfo(session.linked_member);
        }
        return MessageTemplates.PAYMENT_INFO;

      case 'cancel':
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.CANCELLED;

      case 'card_request':
        // Handle membership card request
        return await this.handleCardRequest(session);

      // ============================================
      // Update Information Flow
      // ============================================

      case 'update_info':
        // Handle update information request
        return await this.handleUpdateRequest(session);

      case 'id_provided_for_update':
        return await this.handleUpdateWithId(message, session);

      case 'update_email':
        await this.updateSessionState(session.phone_number, 'awaiting_new_email', session.context);
        return MessageTemplates.UPDATE_EMAIL_PROMPT;

      case 'update_phone':
        await this.updateSessionState(session.phone_number, 'awaiting_new_phone', session.context);
        return MessageTemplates.UPDATE_PHONE_PROMPT;

      case 'update_address':
        await this.updateSessionState(session.phone_number, 'awaiting_new_address', session.context);
        return MessageTemplates.UPDATE_ADDRESS_PROMPT;

      case 'email_value_provided':
        return await this.handleEmailValueProvided(message, session);

      case 'phone_value_provided':
        return await this.handlePhoneValueProvided(message, session);

      case 'address_value_provided':
        return await this.handleAddressValueProvided(message, session);

      case 'confirm_yes':
        return await this.handleUpdateConfirmation(true, session);

      case 'confirm_no':
        return await this.handleUpdateConfirmation(false, session);

      case 'invalid_selection': {
        const menuMember = (session.context?.update_member || session.linked_member) as any;
        return MessageTemplates.UPDATE_MENU_WITH_LINK(menuMember, !!session.linked_member);
      }

      case 'invalid_confirmation':
        return `Please reply *YES* to confirm or *NO* to cancel.`;

      // ============================================
      // New Menu Features
      // ============================================

      case 'events':
        return MessageTemplates.EVENTS_MENU;

      case 'news':
        return MessageTemplates.NEWS_MENU;

      case 'voting':
        if (session.linked_member) {
          return MessageTemplates.VOTING_INFO(session.linked_member as any);
        }
        return MessageTemplates.VOTING_NOT_LINKED;

      case 'branch':
        if (session.linked_member) {
          return MessageTemplates.BRANCH_INFO(session.linked_member as any);
        }
        return MessageTemplates.BRANCH_NOT_LINKED;

      case 'learn':
        await this.updateSessionState(session.phone_number, 'learn_menu', {});
        return MessageTemplates.LEARN_MENU;

      case 'report':
        await this.updateSessionState(session.phone_number, 'report_menu', {});
        return MessageTemplates.REPORT_MENU;

      case 'report_community':
      case 'report_party':
      case 'report_feedback':
        await this.updateSessionState(session.phone_number, 'awaiting_report', {
          report_type: intent.replace('report_', '')
        });
        return MessageTemplates.REPORT_PROMPT;

      case 'report_submitted':
        // Handle report submission
        return await this.handleReportSubmission(message, session);

      case 'refer':
        if (session.linked_member) {
          return MessageTemplates.REFER_MENU(session.linked_member as any);
        }
        return MessageTemplates.REFER_NOT_LINKED;

      case 'poll':
        return MessageTemplates.POLL_MENU;

      case 'sos':
        return MessageTemplates.SOS_MENU;

      default:
        // Check for learn menu selections
        if (session.current_state === 'learn_menu') {
          return this.handleLearnSelection(message, session);
        }

        // Check if this might be a phone-linked user typing something else
        if (session.linked_member) {
          return `Hi ${session.linked_member.firstname}! I didn't understand that.

Reply *HELP* to see all available options.

_Economic Freedom In Our Lifetime!_`;
        }
        return MessageTemplates.NON_MEMBER_UNRECOGNIZED;
    }
  }

  /**
   * Personalized welcome message for phone-linked members
   */
  private static getPersonalizedWelcome(member: MemberInfo): string {
    return `*Welcome back, ${member.firstname}!*

Your membership status: *${member.membership_status_name}*

I can help you with:
1. View full membership status
2. Payment/renewal information
3. Update your details

Reply with a number or type *HELP* for more options.

_Economic Freedom In Our Lifetime!_`;
  }

  /**
   * Personalized payment info for phone-linked members
   */
  private static getPersonalizedPaymentInfo(member: MemberInfo): string {
    const isExpired = member.membership_status_name === 'Expired' ||
      (member.days_until_expiry && member.days_until_expiry < 0);

    const expiryStatus = member.days_until_expiry
      ? (member.days_until_expiry > 0
        ? `expires in *${member.days_until_expiry} days*`
        : `expired *${Math.abs(member.days_until_expiry)} days* ago`)
      : '';

    return `*Payment Information for ${member.firstname}*

${isExpired ? 'Your membership has expired!' : `Your membership ${expiryStatus}`}

*Standard Membership: R10/2 years*

Payment methods:
- EFT to EFF account
- Pay at your local branch

${isExpired ? 'Renew now to maintain your membership benefits!' : ''}

Reply *STATUS* to check your membership details.

_Economic Freedom In Our Lifetime!_`;
  }

  private static async handleMemberLookup(idNumber: string, session: BotSession): Promise<string> {
    try {
      const member = await WhatsAppMemberService.getMemberByIdNumber(idNumber);

      if (!member) {
        // Check if there's a pending application
        const application = await WhatsAppMemberService.getApplicationByIdNumber(idNumber);

        if (application) {
          await this.updateSessionState(session.phone_number, 'idle', {});
          return MessageTemplates.formatApplicationStatus(application);
        }

        return MessageTemplates.MEMBER_NOT_FOUND;
      }

      // If not already linked, ask about linking after showing status
      if (!session.linked_member) {
        await this.updateSessionState(session.phone_number, 'awaiting_link_confirmation', {
          pending_member_id: member.member_id,
          pending_member_name: member.firstname
        });
        return `${MessageTemplates.formatMemberStatus(member)}\n\n---\n\n${MessageTemplates.LINK_PHONE_ASK(member.firstname)}`;
      }

      // Already linked - just show status
      await this.updateSessionState(session.phone_number, 'idle', {});
      return MessageTemplates.formatMemberStatus(member);
    } catch (error: any) {
      logger.error('Member lookup failed', { idNumber, error: error.message });
      return MessageTemplates.ERROR;
    }
  }

  // ============================================
  // Phone Linking Handlers
  // ============================================

  /**
   * Handle ID provided during greeting flow (first-time/non-linked users)
   */
  private static async handleGreetingIdProvided(idNumber: string, session: BotSession): Promise<string> {
    try {
      const member = await WhatsAppMemberService.getMemberByIdNumber(idNumber);

      if (!member) {
        const application = await WhatsAppMemberService.getApplicationByIdNumber(idNumber);
        if (application) {
          await this.updateSessionState(session.phone_number, 'idle', {});
          return MessageTemplates.formatApplicationStatus(application);
        }
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.MEMBER_NOT_FOUND;
      }

      // Member found — ask if they want to link
      await this.updateSessionState(session.phone_number, 'awaiting_link_confirmation', {
        pending_member_id: member.member_id,
        pending_member_name: member.firstname
      });

      return MessageTemplates.LINK_PHONE_ASK(member.firstname);
    } catch (error: any) {
      logger.error('Greeting ID lookup failed', { idNumber, error: error.message });
      return MessageTemplates.ERROR;
    }
  }

  /**
   * Handle link confirmation (YES/NO) after ID verification
   */
  private static async handleLinkConfirmation(confirmed: boolean, session: BotSession): Promise<string> {
    const memberId = session.context?.pending_member_id;
    const memberName = session.context?.pending_member_name || 'Member';

    if (confirmed && memberId) {
      // Link the phone to the member
      await this.linkSessionToMember(session.phone_number, memberId);
      await this.updateSessionState(session.phone_number, 'idle', {});
      return MessageTemplates.LINK_PHONE_SUCCESS;
    }

    // Declined — continue without linking
    await this.updateSessionState(session.phone_number, 'idle', {});
    return MessageTemplates.LINK_PHONE_DECLINED;
  }

  /**
   * Handle unlink confirmation (from update menu)
   */
  private static async handleUnlinkConfirmation(confirmed: boolean, session: BotSession): Promise<string> {
    if (confirmed) {
      await this.unlinkSessionFromMember(session.phone_number);
      await this.updateSessionState(session.phone_number, 'idle', {});
      return MessageTemplates.UNLINK_PHONE_SUCCESS;
    }
    await this.updateSessionState(session.phone_number, 'idle', {});
    return MessageTemplates.UPDATE_CANCELLED;
  }

  /**
   * Handle "Link Phone" option from update menu
   */
  private static async handleUpdateLinkPhone(session: BotSession): Promise<string> {
    if (session.linked_member) {
      // Already linked — redirect to unlink flow
      return await this.handleUpdateUnlinkPhone(session);
    }
    // Not linked — they should be in the update flow with a verified member in context
    const memberId = session.context?.member_id;
    if (memberId) {
      await this.linkSessionToMember(session.phone_number, memberId);
      await this.updateSessionState(session.phone_number, 'idle', {});
      return MessageTemplates.LINK_PHONE_SUCCESS;
    }
    await this.updateSessionState(session.phone_number, 'idle', {});
    return `❌ No member found to link. Please try *STATUS* first to verify your membership.`;
  }

  /**
   * Handle "Unlink Phone" option from update menu
   */
  private static async handleUpdateUnlinkPhone(session: BotSession): Promise<string> {
    if (!session.linked_member) {
      return `❌ Your phone is not currently linked to any membership.\n\nReply *HELP* for more options.`;
    }
    await this.updateSessionState(session.phone_number, 'awaiting_unlink_confirmation', {});
    return MessageTemplates.UNLINK_PHONE_CONFIRM;
  }

  /**
   * Unlink phone from member (set member_id to NULL)
   */
  private static async unlinkSessionFromMember(phoneNumber: string): Promise<void> {
    await executeQuery(`
      UPDATE whatsapp_bot_sessions
      SET member_id = NULL, updated_at = NOW()
      WHERE phone_number = $1
    `, [phoneNumber]);
  }

  /**
   * Handle membership card request
   * Generates and sends the digital membership card PDF via WhatsApp
   */
  private static async handleCardRequest(session: BotSession): Promise<string> {
    try {
      // Check if user has a linked member
      if (!session.linked_member) {
        // Ask for ID number to identify the member
        await this.updateSessionState(session.phone_number, 'awaiting_id_for_card', {});
        return MessageTemplates.CARD_REQUEST_ID;
      }

      const member = session.linked_member;

      // Generate and send the card (regardless of membership status)
      return await this.generateAndSendCard(session.phone_number, member);
    } catch (error: any) {
      logger.error('Card request failed', {
        phone: session.phone_number,
        error: error.message
      });
      return MessageTemplates.CARD_ERROR;
    }
  }

  /**
   * Handle card request when user provides ID number
   * Used when user is not already linked to a member
   */
  private static async handleCardRequestWithId(idNumber: string, session: BotSession): Promise<string> {
    try {
      // Look up member by ID number
      const member = await WhatsAppMemberService.getMemberByIdNumber(idNumber);

      if (!member) {
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.CARD_MEMBER_NOT_FOUND;
      }

      // Update session with member info and link to member
      await this.updateSessionState(session.phone_number, 'idle', {
        member_id: member.member_id
      });
      await this.linkSessionToMember(session.phone_number, member.member_id);

      // Generate and send the card
      return await this.generateAndSendCard(session.phone_number, member);
    } catch (error: any) {
      logger.error('Card request with ID failed', {
        phone: session.phone_number,
        idNumber,
        error: error.message
      });
      return MessageTemplates.CARD_ERROR;
    }
  }

  /**
   * Generate the membership card image and send it via WhatsApp
   */
  private static async generateAndSendCard(phoneNumber: string, member: MemberInfo): Promise<string> {
    try {
      console.log(`🪪 [WhatsApp Bot] Generating membership card image for member ${member.member_id}`);

      // Send "generating" message first
      await WhatsAppProviderManager.sendTextMessage(phoneNumber, MessageTemplates.CARD_GENERATING);

      // Generate the digital membership card as PNG image
      const cardResult = await DigitalMembershipCardModel.generateMembershipCardImage(
        member.member_id.toString(),
        {
          issued_by: 'WhatsApp Bot',
          template: 'standard'
        }
      );

      console.log(`🪪 [WhatsApp Bot] Card image generated, size: ${cardResult.image_buffer.length} bytes`);

      // Convert image buffer to base64
      const imageBase64 = cardResult.image_buffer.toString('base64');

      // Generate caption
      const caption = MessageTemplates.formatCardCaption(member as any);

      // Wait to respect WhatsApp rate limit (1 message per 5 seconds with account protection)
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Send the image via WhatsApp
      console.log(`🪪 [WhatsApp Bot] Sending card image to ${phoneNumber}`);
      await WhatsAppProviderManager.sendImageBase64(
        phoneNumber,
        imageBase64,
        'image/png',
        caption
      );

      console.log(`🪪 [WhatsApp Bot] Card image sent successfully to ${phoneNumber}`);

      // Log the card generation
      await this.logCardGeneration(phoneNumber, member.member_id, cardResult.card.card_id);

      return MessageTemplates.CARD_SENT;
    } catch (error: any) {
      logger.error('Failed to generate/send membership card image', {
        phone: phoneNumber,
        memberId: member.member_id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Log card generation for audit purposes
   */
  private static async logCardGeneration(
    phoneNumber: string,
    memberId: number,
    cardId: string
  ): Promise<void> {
    try {
      await executeQuery(`
        INSERT INTO whatsapp_bot_logs
        (phone_number, direction, message_type, message_content, intent_detected)
        VALUES ($1, 'outbound', 'document', $2, 'card_generated')
      `, [phoneNumber, `Membership card generated: ${cardId} for member ${memberId}`]);
    } catch (error: any) {
      logger.error('Failed to log card generation', { error: error.message });
      // Don't throw - logging failure shouldn't break the flow
    }
  }

  // ============================================
  // Update Information Handlers
  // ============================================

  /**
   * Handle initial update information request
   * Asks for ID number to identify the member
   */
  private static async handleUpdateRequest(session: BotSession): Promise<string> {
    try {
      // Always ask for ID number to identify the member
      await this.updateSessionState(session.phone_number, 'awaiting_id_for_update', {});
      return MessageTemplates.UPDATE_REQUEST_ID;
    } catch (error: any) {
      logger.error('Update request failed', {
        phone: session.phone_number,
        error: error.message
      });
      return MessageTemplates.ERROR;
    }
  }

  /**
   * Handle update request when user provides ID number
   * Looks up the member by ID number and shows the update menu
   */
  private static async handleUpdateWithId(idNumber: string, session: BotSession): Promise<string> {
    try {
      // Look up the member by ID number
      const member = await WhatsAppMemberService.getMemberByIdNumber(idNumber);

      if (!member) {
        await this.updateSessionState(session.phone_number, 'idle', {});
        return `*Member Not Found*

We could not find a member with ID number ${idNumber}.

Please check the ID number and try again, or reply *HELP* for more options.`;
      }

      // Store the looked-up member in context for use by subsequent handlers
      await this.updateSessionState(session.phone_number, 'update_menu', {
        member_id: member.member_id,
        verified_id: idNumber,
        update_member: member
      });

      // Show update menu with link/unlink option
      return `*Member Found*

${MessageTemplates.UPDATE_MENU_WITH_LINK(member as any, !!session.linked_member)}`;
    } catch (error: any) {
      logger.error('Update with ID failed', {
        phone: session.phone_number,
        idNumber,
        error: error.message
      });
      return MessageTemplates.ERROR;
    }
  }

  /**
   * Handle email value provided by user
   */
  private static async handleEmailValueProvided(email: string, session: BotSession): Promise<string> {
    // Validate email format
    if (!WhatsAppMemberService.validateEmail(email)) {
      return MessageTemplates.UPDATE_INVALID_EMAIL;
    }

    // Store the pending update in context and ask for confirmation
    const member = session.context?.update_member || session.linked_member;
    const oldEmail = member?.email || 'Not set';
    await this.updateSessionState(session.phone_number, 'confirm_update', {
      ...session.context,
      update_field: 'email',
      old_value: oldEmail,
      new_value: email
    });

    return MessageTemplates.UPDATE_CONFIRM('Email Address', oldEmail, email);
  }

  /**
   * Handle phone value provided by user
   */
  private static async handlePhoneValueProvided(phone: string, session: BotSession): Promise<string> {
    // Validate phone format
    if (!WhatsAppMemberService.validatePhoneNumber(phone)) {
      return MessageTemplates.UPDATE_INVALID_PHONE;
    }

    // Clean phone number for display
    let cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.startsWith('27') && cleanedPhone.length === 11) {
      cleanedPhone = '0' + cleanedPhone.substring(2);
    }

    // Store the pending update in context and ask for confirmation
    const member = session.context?.update_member || session.linked_member;
    const oldPhone = member?.cell_number || 'Not set';
    await this.updateSessionState(session.phone_number, 'confirm_update', {
      ...session.context,
      update_field: 'phone',
      old_value: oldPhone,
      new_value: cleanedPhone
    });

    return MessageTemplates.UPDATE_CONFIRM('Phone Number', oldPhone, cleanedPhone);
  }

  /**
   * Handle address value provided by user
   */
  private static async handleAddressValueProvided(address: string, session: BotSession): Promise<string> {
    // Validate address is not too short
    const trimmedAddress = address.trim();
    if (trimmedAddress.length < 5) {
      return MessageTemplates.UPDATE_INVALID_ADDRESS;
    }

    // Store the pending update in context and ask for confirmation
    const member = session.context?.update_member || session.linked_member;
    const oldAddress = member?.residential_address || 'Not set';

    await this.updateSessionState(session.phone_number, 'confirm_update', {
      ...session.context,
      update_field: 'address',
      old_value: oldAddress,
      new_value: trimmedAddress
    });

    return MessageTemplates.UPDATE_CONFIRM('Address', oldAddress, trimmedAddress);
  }

  /**
   * Handle update confirmation (YES/NO)
   */
  private static async handleUpdateConfirmation(confirmed: boolean, session: BotSession): Promise<string> {
    if (!confirmed) {
      // User cancelled
      await this.updateSessionState(session.phone_number, 'idle', {});
      return MessageTemplates.UPDATE_CANCELLED;
    }

    // Get update details from context
    const { update_field, new_value } = session.context;
    const memberId = session.context?.member_id || session.context?.update_member?.member_id || session.member_id || session.linked_member?.member_id;

    if (!memberId) {
      await this.updateSessionState(session.phone_number, 'idle', {});
      return MessageTemplates.ERROR;
    }

    try {
      // Perform the update based on field
      let success = false;
      let displayValue = new_value;

      switch (update_field) {
        case 'email':
          success = await WhatsAppMemberService.updateMemberEmail(memberId, new_value);
          break;
        case 'phone':
          success = await WhatsAppMemberService.updateMemberPhone(memberId, new_value);
          break;
        case 'address':
          success = await WhatsAppMemberService.updateMemberAddress(memberId, new_value);
          break;
        default:
          await this.updateSessionState(session.phone_number, 'idle', {});
          return MessageTemplates.ERROR;
      }

      if (success) {
        // Log the update (use 'outbound' as direction since 'system' is not allowed by constraint)
        await this.logMessage({
          phone_number: session.phone_number,
          direction: 'outbound',
          message_type: 'text',
          message_content: `[UPDATE] Updated ${update_field} to ${new_value}`,
          intent_detected: 'update_confirmed'
        });

        // Reset session state
        await this.updateSessionState(session.phone_number, 'idle', {});

        // Return success message
        const fieldNames: Record<string, string> = {
          email: 'Email Address',
          phone: 'Phone Number',
          address: 'Address'
        };
        return MessageTemplates.UPDATE_SUCCESS(fieldNames[update_field] || update_field, displayValue);
      } else {
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.ERROR;
      }
    } catch (error: any) {
      logger.error('Update confirmation failed', {
        phone: session.phone_number,
        field: update_field,
        error: error.message
      });
      await this.updateSessionState(session.phone_number, 'idle', {});
      return MessageTemplates.ERROR;
    }
  }

  private static async getOrCreateSession(phoneNumber: string): Promise<BotSession> {
    const existing = await executeQuery<BotSession[]>(`
      SELECT phone_number, member_id, current_state, context
      FROM whatsapp_bot_sessions
      WHERE phone_number = $1
    `, [phoneNumber]);

    if (existing && existing.length > 0) {
      // Update last activity
      await executeQuery(`
        UPDATE whatsapp_bot_sessions
        SET last_activity_at = NOW(), updated_at = NOW()
        WHERE phone_number = $1
      `, [phoneNumber]);

      const session = existing[0];

      // If session already has a linked member, fetch member info
      if (session.member_id) {
        const memberResult = await executeQuery<MemberInfo[]>(`
          SELECT m.*, ms.status_name as membership_status_name,
                 (m.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
                 w.ward_name,
                 mun.municipality_name,
                 p.province_name,
                 vd.voting_district_name as voting_station_name
          FROM members_consolidated m
          LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
          LEFT JOIN wards w ON m.ward_code = w.ward_code
          LEFT JOIN municipalities mun ON w.municipality_code = mun.municipality_code
          LEFT JOIN provinces p ON mun.province_code = p.province_code
          LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
          WHERE m.member_id = $1
        `, [session.member_id]);

        if (memberResult && memberResult.length > 0) {
          session.linked_member = memberResult[0];
        }
      }

      return session;
    }

    // New session - do NOT auto-link. User must verify via ID and opt-in to linking.
    console.log('📱 [WhatsApp Bot] New session created (no auto-link) for:', phoneNumber);

    // Create new session without member_id (user must opt-in to linking)
    await executeQuery(`
      INSERT INTO whatsapp_bot_sessions (phone_number, member_id, current_state, context)
      VALUES ($1, NULL, 'idle', '{}')
    `, [phoneNumber]);

    return {
      phone_number: phoneNumber,
      member_id: undefined,
      current_state: 'idle',
      context: {},
      linked_member: null
    };
  }

  private static async updateSessionState(
    phoneNumber: string,
    state: string,
    context: any
  ): Promise<void> {
    await executeQuery(`
      UPDATE whatsapp_bot_sessions 
      SET current_state = $1, context = $2, updated_at = NOW()
      WHERE phone_number = $3
    `, [state, JSON.stringify(context), phoneNumber]);
  }

  private static async linkSessionToMember(phoneNumber: string, memberId: number): Promise<void> {
    await executeQuery(`
      UPDATE whatsapp_bot_sessions 
      SET member_id = $1, updated_at = NOW()
      WHERE phone_number = $2
    `, [memberId, phoneNumber]);
  }

  private static async logMessage(data: {
    phone_number: string;
    direction: string;
    message_type: string;
    message_content: string;
    wasender_message_id?: string;
    intent_detected?: string;
  }): Promise<void> {
    await executeQuery(`
      INSERT INTO whatsapp_bot_logs 
      (phone_number, direction, message_type, message_content, wasender_message_id, intent_detected)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      data.phone_number,
      data.direction,
      data.message_type,
      data.message_content,
      data.wasender_message_id || null,
      data.intent_detected || null
    ]);
  }

  static async handleMessageStatus(data: any): Promise<void> {
    // Update message delivery status in logs
    if (data.msgId) {
      await executeQuery(`
        UPDATE whatsapp_bot_logs 
        SET status = $1, updated_at = NOW()
        WHERE wasender_message_id = $2
      `, [data.status, data.msgId]);
    }
  }

  static async getServiceStatus(): Promise<any> {
    const [sessionCount] = await executeQuery<any[]>(`
      SELECT COUNT(*) as count FROM whatsapp_bot_sessions
      WHERE last_activity_at > NOW() - INTERVAL '24 hours'
    `);

    const [messageCount] = await executeQuery<any[]>(`
      SELECT COUNT(*) as count FROM whatsapp_bot_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    return {
      active_sessions_24h: sessionCount?.count || 0,
      messages_24h: messageCount?.count || 0,
      bot_enabled: true
    };
  }

  // ============================================
  // New Feature Handlers
  // ============================================

  /**
   * Handle political education menu selections
   */
  private static handleLearnSelection(message: string, session: BotSession): string {
    const selection = message.trim();

    switch (selection) {
      case '1':
      case 'learn_1':
        return MessageTemplates.LEARN_MANIFESTO;
      case '2':
      case 'learn_2':
        return MessageTemplates.LEARN_PILLARS;
      case '3':
      case 'learn_3':
        return MessageTemplates.LEARN_PILLARS; // Cardinal pillars same as 7 pillars
      case '4':
      case 'learn_4':
        return `*Key EFF Policies*

*Land Reform:*
Expropriation of land without compensation for equitable redistribution.

*Nationalization:*
State ownership of mines, banks, and strategic sectors of the economy.

*Education:*
Free, quality, decolonized education from early childhood to tertiary level.

*Healthcare:*
Free, quality healthcare for all South Africans.

*Housing:*
Decent housing for all, ending informal settlements.

Reply *LEARN* for more topics.

_Economic Freedom In Our Lifetime!_`;
      default:
        return MessageTemplates.LEARN_MENU;
    }
  }

  /**
   * Handle report/feedback submission
   */
  private static async handleReportSubmission(message: string, session: BotSession): Promise<string> {
    try {
      const reportType = session.context?.report_type || 'general';
      const memberId = session.linked_member?.member_id || null;

      // Log the report (in a real implementation, save to a reports table)
      await this.logMessage({
        phone_number: session.phone_number,
        direction: 'inbound',
        message_type: 'report',
        message_content: `[REPORT:${reportType.toUpperCase()}] ${message}`,
        intent_detected: 'report_submitted'
      });

      logger.info('Report submitted', {
        phone: session.phone_number,
        memberId,
        reportType,
        messageLength: message.length
      });

      // Reset session state
      await this.updateSessionState(session.phone_number, 'idle', {});

      return MessageTemplates.REPORT_SUBMITTED;
    } catch (error: any) {
      logger.error('Failed to submit report', {
        phone: session.phone_number,
        error: error.message
      });
      await this.updateSessionState(session.phone_number, 'idle', {});
      return MessageTemplates.ERROR;
    }
  }
}