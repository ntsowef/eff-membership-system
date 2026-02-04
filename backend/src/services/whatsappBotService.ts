import { WasenderApiService } from './wasenderApiService';
import { WhatsAppMemberService, MemberInfo } from './whatsappMemberService';
import { executeQuery } from '../config/database';
import { logger } from '../utils/logger';
import { MessageTemplates } from '../config/whatsappConfig';
import { DigitalMembershipCardModel } from '../models/digitalMembershipCard';

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
    cancel: /^(cancel|stop|exit|quit|0)$/i,
    yes: /^(yes|y|yebo|ja|correct|confirm)$/i,
    no: /^(no|n|cha|nee|wrong)$/i,
    // Update field selections (only used in update_menu state)
    update_email: /^(email|e-mail|1)$/i,
    update_phone: /^(phone|cell|cellphone|mobile|number|2)$/i,
    update_address: /^(address|ward|location|3)$/i,
    // Report type selections (only used in report_menu state)
    report_community: /^(community|service|municipal|1)$/i,
    report_party: /^(party|branch|internal|2)$/i,
    report_feedback: /^(feedback|suggestion|idea|3)$/i,
  };

  static async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    console.log(' [WhatsApp Bot] handleIncomingMessage called with:', JSON.stringify(message, null, 2));

    const senderPhone = message.key.cleanedParticipantPn || message.key.cleanedSenderPn;
    const messageText = message.messageBody?.trim() || '';
    const messageId = message.key.id;

    console.log('[WhatsApp Bot] Extracted:', { senderPhone, messageText, messageId, fromMe: message.key.fromMe });

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

      // Send response
      if (response) {
        await WasenderApiService.sendTextMessage(senderPhone, response);

        // Log outbound message
        await this.logMessage({
          phone_number: senderPhone,
          direction: 'outbound',
          message_type: 'text',
          message_content: response,
          intent_detected: intent,
        });
      }
    } catch (error: any) {
      logger.error('Error handling WhatsApp message', {
        phone: senderPhone,
        error: error.message
      });

      // Send error message to user
      await WasenderApiService.sendTextMessage(
        senderPhone,
        MessageTemplates.ERROR
      );
    }
  }

  private static detectIntent(message: string, currentState: string): string {
    const lowerMessage = message.toLowerCase().trim();

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

    // If waiting for new ward value
    if (currentState === 'awaiting_new_ward') {
      if (this.intentPatterns.cancel.test(lowerMessage)) return 'cancel';
      return 'ward_value_provided';
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
        await this.updateSessionState(session.phone_number, 'idle', {});
        // If phone is linked to member, show personalized greeting
        if (session.linked_member) {
          return this.getPersonalizedWelcome(session.linked_member);
        }
        return MessageTemplates.WELCOME;

      case 'help':
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.HELP_MENU;

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
        await this.updateSessionState(session.phone_number, 'awaiting_new_ward', session.context);
        return MessageTemplates.UPDATE_WARD_PROMPT;

      case 'email_value_provided':
        return await this.handleEmailValueProvided(message, session);

      case 'phone_value_provided':
        return await this.handlePhoneValueProvided(message, session);

      case 'ward_value_provided':
        return await this.handleWardValueProvided(message, session);

      case 'confirm_yes':
        return await this.handleUpdateConfirmation(true, session);

      case 'confirm_no':
        return await this.handleUpdateConfirmation(false, session);

      case 'invalid_selection':
        return MessageTemplates.UPDATE_MENU(session.linked_member as any);

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
        return MessageTemplates.UNRECOGNIZED;
    }
  }

  /**
   * Personalized welcome message for phone-linked members
   */
  private static getPersonalizedWelcome(member: MemberInfo): string {
    const statusEmoji = member.membership_status_name === 'Good Standing' ? '✅' : '⚠️';

    return ` Welcome back, ${member.firstname}!*

${statusEmoji} Your membership status: *${member.membership_status_name}*

I can help you with:
1️⃣ View full membership status
2️⃣ Payment/renewal information
3️⃣ Update your details

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

    return ` *Payment Information for ${member.firstname}*

${isExpired ? ' Your membership has expired!' : `Your membership ${expiryStatus}`}

*Standard Membership: R10/2 years*

Payment methods:
• EFT to EFF account
• Pay at your local branch

${isExpired ? ' Renew now to maintain your membership benefits!' : ''}

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

      // Update session with member info
      await this.updateSessionState(session.phone_number, 'idle', {
        member_id: member.member_id
      });

      // Link session to member
      await this.linkSessionToMember(session.phone_number, member.member_id);

      return MessageTemplates.formatMemberStatus(member);
    } catch (error: any) {
      logger.error('Member lookup failed', { idNumber, error: error.message });
      return MessageTemplates.ERROR;
    }
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

      // Check if membership is expired
      if (member.days_until_expiry && member.days_until_expiry < 0) {
        return MessageTemplates.CARD_MEMBERSHIP_EXPIRED(member as any);
      }

      // Generate and send the card
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

      // Check if membership is expired
      if (member.days_until_expiry && member.days_until_expiry < 0) {
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.CARD_MEMBERSHIP_EXPIRED(member as any);
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
      await WasenderApiService.sendTextMessage(phoneNumber, MessageTemplates.CARD_GENERATING);

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

      // Send the image via WhatsApp
      console.log(`🪪 [WhatsApp Bot] Sending card image to ${phoneNumber}`);
      await WasenderApiService.sendImageBase64(
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
   * Only allows updates if phone is already linked to a member (security measure)
   */
  private static async handleUpdateRequest(session: BotSession): Promise<string> {
    try {
      // Security: Only allow updates if phone is already linked to a member
      if (!session.linked_member) {
        return `🔐 *Verification Required*

To update your details, we first need to verify your membership.

Please reply *1* or *STATUS* and enter your ID number to link your phone to your membership.

Once verified, you can update your information.

Reply *HELP* for more options.`;
      }

      // Phone is linked - ask for ID verification
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
   * Verifies the ID matches the linked member for security
   */
  private static async handleUpdateWithId(idNumber: string, session: BotSession): Promise<string> {
    try {
      // Security check: Phone must be linked to a member
      if (!session.linked_member) {
        await this.updateSessionState(session.phone_number, 'idle', {});
        return `🔐 *Verification Required*

To update your details, we first need to verify your membership.

Please reply *1* or *STATUS* and enter your ID number to link your phone to your membership.

Reply *HELP* for more options.`;
      }

      // Verify the ID matches the linked member
      if (session.linked_member.id_number !== idNumber) {
        await this.updateSessionState(session.phone_number, 'idle', {});
        return `❌ *ID Verification Failed*

The ID number you provided does not match the member linked to this phone number.

For security reasons, you can only update your own information.

Reply *HELP* for more options.`;
      }

      // ID verified - show update menu
      await this.updateSessionState(session.phone_number, 'update_menu', {
        member_id: session.linked_member.member_id,
        verified_id: idNumber
      });

      // Show update menu with verification confirmation
      return `✅ *ID Verified*

${MessageTemplates.UPDATE_MENU(session.linked_member as any)}`;
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
    const oldEmail = session.linked_member?.email || 'Not set';
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
    const oldPhone = session.linked_member?.cell_number || 'Not set';
    await this.updateSessionState(session.phone_number, 'confirm_update', {
      ...session.context,
      update_field: 'phone',
      old_value: oldPhone,
      new_value: cleanedPhone
    });

    return MessageTemplates.UPDATE_CONFIRM('Phone Number', oldPhone, cleanedPhone);
  }

  /**
   * Handle ward value provided by user
   */
  private static async handleWardValueProvided(wardCode: string, session: BotSession): Promise<string> {
    // Validate ward code format
    if (!WhatsAppMemberService.validateWardCodeFormat(wardCode)) {
      return MessageTemplates.UPDATE_INVALID_WARD;
    }

    // Validate ward code exists
    const wardValidation = await WhatsAppMemberService.validateWardCode(wardCode);
    if (!wardValidation.valid) {
      return MessageTemplates.UPDATE_WARD_NOT_FOUND;
    }

    // Store the pending update in context and ask for confirmation
    const oldWard = session.linked_member?.ward_name || session.linked_member?.ward_code || 'Not set';
    const newWard = `${wardCode} (${wardValidation.wardName})`;

    await this.updateSessionState(session.phone_number, 'confirm_update', {
      ...session.context,
      update_field: 'ward',
      old_value: oldWard,
      new_value: wardCode,
      new_ward_name: wardValidation.wardName
    });

    return MessageTemplates.UPDATE_CONFIRM('Ward/Address', oldWard, newWard);
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
    const { update_field, new_value, new_ward_name } = session.context;
    const memberId = session.member_id || session.linked_member?.member_id;

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
        case 'ward':
          success = await WhatsAppMemberService.updateMemberWard(memberId, new_value);
          displayValue = `${new_value} (${new_ward_name})`;
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
          ward: 'Ward/Address'
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
                 (m.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry
          FROM members_consolidated m
          LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
          WHERE m.member_id = $1
        `, [session.member_id]);

        if (memberResult && memberResult.length > 0) {
          session.linked_member = memberResult[0];
        }
      }

      return session;
    }

    // New session - Try to auto-lookup member by phone number
    console.log('📱 [WhatsApp Bot] New session - attempting phone lookup for:', phoneNumber);
    let linkedMember: MemberInfo | null = null;
    let memberId: number | null = null;

    try {
      linkedMember = await WhatsAppMemberService.getMemberByPhoneNumber(phoneNumber);
      if (linkedMember) {
        memberId = linkedMember.member_id;
        console.log('📱 [WhatsApp Bot] Auto-linked member by phone:', linkedMember.firstname, linkedMember.surname);
      }
    } catch (err: any) {
      console.log('📱 [WhatsApp Bot] Phone lookup failed:', err.message);
    }

    // Create new session (with member_id if found)
    await executeQuery(`
      INSERT INTO whatsapp_bot_sessions (phone_number, member_id, current_state, context)
      VALUES ($1, $2, 'idle', '{}')
    `, [phoneNumber, memberId]);

    return {
      phone_number: phoneNumber,
      member_id: memberId || undefined,
      current_state: 'idle',
      context: {},
      linked_member: linkedMember
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
        return MessageTemplates.LEARN_MANIFESTO;
      case '2':
        return MessageTemplates.LEARN_PILLARS;
      case '3':
        return MessageTemplates.LEARN_PILLARS; // Cardinal pillars same as 7 pillars
      case '4':
        return `🎓 *Key EFF Policies*

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