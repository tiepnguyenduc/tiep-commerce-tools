export interface NotifierMessage {
  Name: string;
  Channel?: string;
  Payload?: unknown;
}
export interface NotifierContext {
  previewId: string;
  customer?: string;
  isDebug?: boolean;
  endpoint?: string;
}
export class Notifier {
  constructor(context: NotifierContext, messageHandlers?: Record<string, (payload: unknown, message: NotifierMessage) => void>);
  connect(): void;
  handleMessage(event: MessageEvent<string>): void;
  sendMessage(message: NotifierMessage, retry?: boolean): void;
}
