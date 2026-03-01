import sgMail from '@sendgrid/mail';

const enabled = String(process.env.SENDGRID_ENABLED || '').toLowerCase() === 'true';
const apiKey = String(process.env.SENDGRID_API_KEY || '').trim();
const fromEmail = String(process.env.SENDGRID_FROM_EMAIL || '').trim();
const fromName = String(process.env.SENDGRID_FROM_NAME || '').trim() || undefined;
const replyTo = String(process.env.SENDGRID_REPLY_TO || '').trim() || undefined;
const sandboxMode = String(process.env.SENDGRID_SANDBOX || '').toLowerCase() === 'true';

if (enabled && apiKey) {
  sgMail.setApiKey(apiKey);
}

export function isSendGridEnabled(): boolean {
  return enabled;
}

export function getSendGridConfigError(): string | null {
  if (!enabled) return 'SENDGRID_ENABLED is false';
  if (!apiKey) return 'Missing SENDGRID_API_KEY';
  if (!fromEmail) return 'Missing SENDGRID_FROM_EMAIL';
  return null;
}

export type SendGridSendInput = {
  to: string;
  subject?: string | null;
  content?: string | null;
  html?: string | null;
  customArgs?: Record<string, string>;
};

export type SendGridSendResult = {
  provider: 'sendgrid';
  providerMessageId: string | null;
  status: 'queued';
};

export async function sendViaSendGrid(input: SendGridSendInput): Promise<SendGridSendResult> {
  const configError = getSendGridConfigError();
  if (configError) throw new Error(configError);

  const text = String(input.content || '').trim();
  const html = String(input.html || '').trim() || undefined;

  const [resp] = await sgMail.send({
    to: input.to,
    from: fromName ? { email: fromEmail, name: fromName } : fromEmail,
    replyTo,
    subject: String(input.subject || '').trim() || '(no subject)',
    text: text || undefined,
    html: html || undefined,
    customArgs: input.customArgs,
    mailSettings: sandboxMode ? { sandboxMode: { enable: true } } : undefined,
  });

  const providerMessageId = String(resp?.headers?.['x-message-id'] || '').trim() || null;
  return {
    provider: 'sendgrid',
    providerMessageId,
    status: 'queued',
  };
}
