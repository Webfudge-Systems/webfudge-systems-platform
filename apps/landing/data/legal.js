/**
 * Legal pages. Drafted to match how Webfudge works today (per-app subscriptions, 14-day trials,
 * Razorpay payments in INR, data kept 90 days after an app locks).
 * TODO before launch: have these reviewed by your lawyer and add the registered address and GSTIN.
 */

const UPDATED = '2 November 2026'

export const LEGAL = {
  terms: {
    title: 'Terms of Service',
    updated: UPDATED,
    intro: 'These terms apply when you or your organization use Webfudge CRM, Webfudge Projects, Webfudge Accounts or any other app we provide (the “Service”). By creating an account you agree to them.',
    sections: [
      ['Who we are', ['The Service is provided by Webfudge Systems, Pune, Maharashtra, India (“Webfudge”, “we”, “us”). You can reach us at contact@webfudge.in.']],
      ['Your account', [
        'You must give accurate details when you sign up and keep your password safe. You are responsible for activity under your account.',
        'The person who creates an organization is its owner and can add admins. Admins decide who joins the organization, what each person can see, and which apps and plans the organization uses.',
      ]],
      ['Trials, plans and billing', [
        'Each app can be tried free for 14 days. No payment details are needed for a trial.',
        'When a trial ends, the app becomes read-only for 7 days and then locks until a plan is chosen.',
        'Paid plans are charged per app and per user, in advance, monthly or yearly, in Indian rupees. Prices shown exclude GST, which is added to every invoice.',
        'Payments are processed by Razorpay. We do not store your card or bank details.',
        'If a paid period ends without renewal, the app becomes read-only for 7 days and then locks. You can renew at any time to unlock it.',
        'We may change prices with at least 30 days’ notice by email. Changes apply from your next billing period.',
      ]],
      ['Acceptable use', [
        'Don’t use the Service to break the law, send spam, store content you have no right to, attempt to access other organizations’ data, or interfere with the Service’s security or performance.',
        'We may suspend access that puts the Service or other customers at risk, and will tell you why where we can.',
      ]],
      ['Your data', [
        'You own the data you put into the Service. We process it only to provide and support the Service, as described in our Privacy Policy.',
        'After an app locks, we keep its data for 90 days so you can come back. After that it may be permanently deleted. You can ask us for an export at any time while your account is active.',
      ]],
      ['Availability and changes', [
        'We work to keep the Service available and secure, but we can’t promise it will be uninterrupted or error-free. We may improve or change features over time.',
      ]],
      ['Liability', [
        'To the extent the law allows, our total liability for any claim relating to the Service is limited to the amount you paid us for the affected app in the 12 months before the claim. We are not liable for indirect or consequential losses.',
      ]],
      ['Ending your use', [
        'You can stop using an app at any time from Apps & billing. Paid periods are not refunded except as set out in our Refund and Cancellation Policy.',
        'We may end these terms if you seriously breach them and don’t fix the problem after we tell you.',
      ]],
      ['Governing law', ['These terms are governed by the laws of India. Courts in Pune, Maharashtra have jurisdiction.']],
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    updated: UPDATED,
    intro: 'This policy explains what personal data Webfudge Systems collects when you use our website and apps, why, and the choices you have.',
    sections: [
      ['What we collect', [
        'Account details: your name, work email, optional mobile number and password (stored only as a secure hash).',
        'Organization details: organization name, industry, team size and, for billing, legal name, GSTIN and address.',
        'Content you add to the apps, such as companies, contacts, deals, projects and tasks. Your organization controls this content.',
        'Usage and device data such as log-ins, pages used, IP address and browser, used to keep the Service secure and working.',
        'Payment records (amount, date, Razorpay payment reference). Card and bank details are handled by Razorpay, not us.',
      ]],
      ['How we use it', [
        'To provide the apps, sign you in, send verification codes and important account emails (such as trial and billing reminders), issue invoices, give support, keep the Service secure and improve it.',
        'We send occasional product news only if you sign up for it, and you can unsubscribe at any time.',
      ]],
      ['Who we share it with', [
        'Service providers who help us run Webfudge — hosting, email delivery and payments (Razorpay) — under agreements that protect your data.',
        'Authorities when the law requires it.',
        'We do not sell your personal data.',
      ]],
      ['How long we keep it', [
        'While your account is active, and for 90 days after an app locks so you can return. Invoices and payment records are kept as long as tax law requires.',
      ]],
      ['Your choices and rights', [
        'You can view and update your profile in Webfudge Accounts, ask us for a copy of your data, or ask us to delete your account by writing to contact@webfudge.in.',
      ]],
      ['Security', ['Data is encrypted in transit, passwords are hashed, and access to customer data inside Webfudge is limited to people who need it to support you.']],
      ['Cookies', ['We use essential cookies to keep you signed in across Webfudge apps. We don’t use advertising cookies.']],
      ['Contact', ['Questions about privacy: contact@webfudge.in, Webfudge Systems, Pune, Maharashtra, India.']],
    ],
  },

  refunds: {
    title: 'Refund and Cancellation Policy',
    updated: UPDATED,
    intro: 'Every Webfudge app comes with a free 14-day trial so you can be sure it fits before you pay. This policy explains cancellations and refunds for paid plans.',
    sections: [
      ['Cancelling a plan', [
        'Admins can cancel a paid plan at any time from Apps & billing in Webfudge Accounts. The app keeps working until the end of the period you’ve paid for, and isn’t charged again.',
        'You can resume a cancelled plan before its period ends.',
      ]],
      ['Refunds', [
        'Monthly plans: payments are not refundable once a billing month has started.',
        'Yearly plans: if you cancel within 14 days of a yearly payment, we refund it in full. After that, yearly payments are not refundable.',
        'If you were charged in error or twice for the same period, write to us and we’ll refund the extra charge in full.',
      ]],
      ['Changing plans or users', [
        'Upgrading during a paid period: you pay for the new plan from today, minus a credit for the unused time on your current plan.',
        'Adding users during a paid period: you pay pro rata for the rest of the period.',
        'Removing users or moving to a lower plan takes effect from your next billing period.',
      ]],
      ['How refunds are paid', ['Approved refunds go back to the original payment method through Razorpay, usually within 5–7 working days.']],
      ['Contact', ['For billing questions or refund requests, write to contact@webfudge.in with your organization name and invoice number.']],
    ],
  },
}
