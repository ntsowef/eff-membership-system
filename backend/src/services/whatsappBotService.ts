import { WasenderApiService } from './wasenderApiService';
import { WhatsAppMemberService, MemberInfo } from './whatsappMemberService';
import { executeQuery } from '../config/database';
import { logger } from '../utils/logger';
import { MessageTemplates } from '../config/whatsappConfig';

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
    cancel: /^(cancel|stop|exit|quit)/i,
    yes: /^(yes|y|yebo|ja|correct|confirm)/i,
    no: /^(no|n|cha|nee|wrong)/i,
  };

  static async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    console.log('📱 [WhatsApp Bot] handleIncomingMessage called with:', JSON.stringify(message, null, 2));

    const senderPhone = message.key.cleanedParticipantPn || message.key.cleanedSenderPn;
    const messageText = message.messageBody?.trim() || '';
    const messageId = message.key.id;

    console.log('📱 [WhatsApp Bot] Extracted:', { senderPhone, messageText, messageId, fromMe: message.key.fromMe });

    if (!senderPhone || message.key.fromMe) {
      console.log('📱 [WhatsApp Bot] Skipping - no sender or fromMe');
      return; // Ignore if no sender or message is from bot
    }

    console.log('📱 [WhatsApp Bot] Processing message from:', senderPhone);
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
    
    // If waiting for ID input
    if (currentState === 'awaiting_id' && this.intentPatterns.id_provided.test(message)) {
      return 'id_provided';
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

      case 'payment':
        // If linked member, show personalized payment info
        if (session.linked_member) {
          return this.getPersonalizedPaymentInfo(session.linked_member);
        }
        return MessageTemplates.PAYMENT_INFO;

      case 'cancel':
        await this.updateSessionState(session.phone_number, 'idle', {});
        return MessageTemplates.CANCELLED;

      default:
        // Check if this might be a phone-linked user typing something else
        if (session.linked_member) {
          return `Hi ${session.linked_member.firstname}! I didn't understand that.

Reply *1* or *STATUS* to check your membership
Reply *2* or *PAY* for payment info
Reply *HELP* for more options`;
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

${isExpired ? '👉 Renew now to maintain your membership benefits!' : ''}

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
                 EXTRACT(DAY FROM m.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry
          FROM members_consolidated m
          LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.membership_status_id
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
}