declare module 'smpp' {
  export interface SMPPSession {
    connect(): void;
    bind_transceiver(options: BindOptions, callback: (pdu: any) => void): void;
    submit_sm(options: SubmitOptions, callback: (pdu: any) => void): void;
    close(): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  export interface BindOptions {
    system_id: string;
    password: string;
    system_type?: string;
    interface_version?: number;
    addr_ton?: number;
    addr_npi?: number;
    address_range?: string;
  }

  export interface SubmitOptions {
    source_addr_ton?: number;
    source_addr_npi?: number;
    source_addr: string;
    dest_addr_ton?: number;
    dest_addr_npi?: number;
    destination_addr: string;
    esm_class?: number;
    protocol_id?: number;
    priority_flag?: number;
    schedule_delivery_time?: string;
    validity_period?: string;
    registered_delivery?: number;
    replace_if_present_flag?: number;
    data_coding?: number;
    sm_default_msg_id?: number;
    short_message: string;
  }

  export interface SMPPOptions {
    host: string;
    port: number;
    debug?: boolean;
    auto_enquire_link_period?: number;
  }

  export function createSession(options: SMPPOptions): SMPPSession;
}
