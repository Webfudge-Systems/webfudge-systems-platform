/** Fallback if @types/nodemailer is not resolved in CI. */
declare module 'nodemailer' {
  export interface Transporter {
    sendMail(mail: unknown): Promise<unknown>
  }

  export function createTransport(options: unknown): Transporter

  const nodemailer: { createTransport: typeof createTransport }
  export default nodemailer
}
