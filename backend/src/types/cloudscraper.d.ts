/**
 * Type declarations for cloudscraper module
 * Since @types/cloudscraper doesn't exist, we define our own types
 */

declare module 'cloudscraper' {
  interface CloudScraperOptions {
    uri?: string;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    form?: Record<string, any>;
    body?: any;
    json?: boolean;
    timeout?: number;
    followRedirect?: boolean;
    maxRedirects?: number;
    jar?: any;
    proxy?: string;
    agentOptions?: any;
    cloudflareTimeout?: number;
    cloudflareMaxTimeout?: number;
  }

  interface CloudScraperStatic {
    (options: CloudScraperOptions | string, callback?: (error: any, response: any, body: any) => void): Promise<any>;
    get(options: CloudScraperOptions | string, callback?: (error: any, response: any, body: any) => void): Promise<any>;
    post(options: CloudScraperOptions, callback?: (error: any, response: any, body: any) => void): Promise<any>;
    put(options: CloudScraperOptions, callback?: (error: any, response: any, body: any) => void): Promise<any>;
    patch(options: CloudScraperOptions, callback?: (error: any, response: any, body: any) => void): Promise<any>;
    delete(options: CloudScraperOptions, callback?: (error: any, response: any, body: any) => void): Promise<any>;
    head(options: CloudScraperOptions, callback?: (error: any, response: any, body: any) => void): Promise<any>;
    defaults(options: CloudScraperOptions): CloudScraperStatic;
  }

  const cloudscraper: CloudScraperStatic;
  export = cloudscraper;
}

