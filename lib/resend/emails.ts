import { resend, FROM } from './client'

type BookingConfirmationProps = {
  to: string
  customerName: string
  businessName: string
  jobType: string
  scheduledStart: string
  address: string
  businessPhone?: string
}

type NewBookingNotificationProps = {
  to: string
  ownerName: string
  customerName: string
  customerPhone: string
  jobType: string
  scheduledStart: string
  address: string
  notes?: string
  estimatedValue?: number
}

type MissedCallNotificationProps = {
  to: string
  ownerName: string
  callerNumber: string
  callerName?: string
  calledAt: string
  businessName: string
}

function formatJob(job: string): string {
  return job.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ── Booking confirmation → sent to customer ───────────────────
export async function sendBookingConfirmation(props: BookingConfirmationProps) {
  const { to, customerName, businessName, jobType, scheduledStart, address, businessPhone } = props

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:#18181b;padding:28px 32px">
      <p style="margin:0;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:1px">${businessName}</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">Appointment Confirmed ✓</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="margin:0 0 24px;color:#3f3f46;font-size:15px">Hi ${customerName},</p>
      <p style="margin:0 0 24px;color:#3f3f46;font-size:15px">
        Your appointment has been booked. Here are the details:
      </p>

      <!-- Details card -->
      <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:13px;width:100px">Service</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${formatJob(jobType)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:13px">When</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${formatDateTime(scheduledStart)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:13px">Address</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${address}</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 8px;color:#3f3f46;font-size:14px">
        Need to reschedule? ${businessPhone ? `Call us at <strong>${businessPhone}</strong>` : 'Reply to this email'} and we\'ll take care of it.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f4f4f5">
      <p style="margin:0;color:#a1a1aa;font-size:12px">
        This confirmation was sent by ${businessName}'s AI receptionist.
      </p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Appointment Confirmed — ${formatJob(jobType)} on ${new Date(scheduledStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    html,
  })

  if (error) console.error('[resend] booking confirmation failed:', error)
  else console.log('[resend] booking confirmation sent to:', to)
}

// ── New booking alert → sent to business owner ────────────────
export async function sendNewBookingNotification(props: NewBookingNotificationProps) {
  const { to, ownerName, customerName, customerPhone, jobType, scheduledStart, address, notes, estimatedValue } = props

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <div style="background:#16a34a;padding:28px 32px">
      <p style="margin:0;color:#bbf7d0;font-size:12px;text-transform:uppercase;letter-spacing:1px">New Booking</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">📅 Job Booked by AI</h1>
    </div>

    <div style="padding:32px">
      <p style="margin:0 0 20px;color:#3f3f46;font-size:15px">Hi ${ownerName}, your AI receptionist just booked a new job:</p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#16a34a;font-size:13px;width:110px">Customer</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${customerName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#16a34a;font-size:13px">Phone</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${customerPhone}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#16a34a;font-size:13px">Service</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${formatJob(jobType)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#16a34a;font-size:13px">When</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${formatDateTime(scheduledStart)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#16a34a;font-size:13px">Address</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${address}</td>
          </tr>
          ${estimatedValue ? `
          <tr>
            <td style="padding:6px 0;color:#16a34a;font-size:13px">Est. Value</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">$${estimatedValue.toLocaleString()}</td>
          </tr>` : ''}
          ${notes ? `
          <tr>
            <td style="padding:6px 0;color:#16a34a;font-size:13px;vertical-align:top">Notes</td>
            <td style="padding:6px 0;color:#3f3f46;font-size:13px">${notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <p style="margin:0;color:#71717a;font-size:13px">This job was booked automatically by your AI receptionist.</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `New Job Booked — ${customerName} · ${formatJob(jobType)}`,
    html,
  })

  if (error) console.error('[resend] new booking notification failed:', error)
  else console.log('[resend] new booking notification sent to:', to)
}

// ── Missed call alert → sent to business owner ────────────────
export async function sendMissedCallNotification(props: MissedCallNotificationProps) {
  const { to, ownerName, callerNumber, callerName, calledAt, businessName } = props

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <div style="background:#dc2626;padding:28px 32px">
      <p style="margin:0;color:#fecaca;font-size:12px;text-transform:uppercase;letter-spacing:1px">Missed Call</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">📞 Missed Call Alert</h1>
    </div>

    <div style="padding:32px">
      <p style="margin:0 0 20px;color:#3f3f46;font-size:15px">Hi ${ownerName}, someone called ${businessName} but the call was missed:</p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#dc2626;font-size:13px;width:100px">Caller</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${callerName ?? callerNumber}</td>
          </tr>
          ${callerName ? `
          <tr>
            <td style="padding:6px 0;color:#dc2626;font-size:13px">Phone</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${callerNumber}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:6px 0;color:#dc2626;font-size:13px">Time</td>
            <td style="padding:6px 0;color:#18181b;font-size:13px;font-weight:600">${formatDateTime(calledAt)}</td>
          </tr>
        </table>
      </div>

      <p style="margin:0;color:#3f3f46;font-size:14px;font-weight:600">
        Consider calling them back — missed calls are missed revenue.
      </p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Missed Call from ${callerName ?? callerNumber}`,
    html,
  })

  if (error) console.error('[resend] missed call notification failed:', error)
  else console.log('[resend] missed call notification sent to:', to)
}
