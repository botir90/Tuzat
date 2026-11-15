/** Anything that can send an SMS. Real provider (e.g. Eskiz.uz) comes before launch. */
export interface SmsSender {
  send(phone: string, text: string): Promise<void>;
}

/** Development: prints the SMS to the terminal instead of sending it. */
export class ConsoleSmsSender implements SmsSender {
  async send(phone: string, text: string): Promise<void> {
    console.log(`\n📱 SMS to ${phone}: ${text}\n`);
  }
}
