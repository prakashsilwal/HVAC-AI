import { google } from 'googleapis'
import { getAuthenticatedClient } from './oauth'
import type { BookAppointmentInput, BookAppointmentResult } from '@/lib/retell/tools'
import { createServiceClient } from '@/lib/supabase/server'
import { sendBookingConfirmation, sendNewBookingNotification } from '@/lib/resend/emails'

// Duration in minutes by job type
const JOB_DURATIONS: Record<string, number> = {
  ac_repair: 90,
  ac_not_turning_on: 90,
  furnace_repair: 90,
  furnace_not_turning_on: 90,
  installation: 240,
  maintenance: 60,
  ductwork: 120,
  thermostat: 60,
  refrigerant: 90,
  emergency: 120,
  other: 90,
}

// Estimated values by job type (USD)
const JOB_VALUES: Record<string, number> = {
  ac_repair: 450,
  ac_not_turning_on: 350,
  furnace_repair: 450,
  furnace_not_turning_on: 350,
  installation: 3500,
  maintenance: 150,
  ductwork: 800,
  thermostat: 200,
  refrigerant: 300,
  emergency: 600,
  other: 350,
}

function resolveStartTime(input: BookAppointmentInput, timezone: string): Date {
  const now = new Date()

  if (input.urgency === 'emergency') {
    // First available: next morning 8am or 2 hours from now if during business hours
    const candidate = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const hour = candidate.getHours()
    if (hour >= 8 && hour < 16) return candidate
    // Otherwise next morning 8am
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(8, 0, 0, 0)
    return tomorrow
  }

  if (input.preferred_date) {
    const base = new Date(input.preferred_date)
    const window = (input.preferred_time_window ?? 'morning').toLowerCase()
    if (window.includes('afternoon') || window.includes('pm')) {
      base.setHours(13, 0, 0, 0)
    } else if (window.includes('evening')) {
      base.setHours(16, 0, 0, 0)
    } else {
      base.setHours(8, 0, 0, 0)
    }
    // If in the past, move to tomorrow same time
    if (base < now) base.setDate(base.getDate() + 1)
    return base
  }

  // Default: next business morning
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(8, 0, 0, 0)
  // Skip Sunday
  if (next.getDay() === 0) next.setDate(next.getDate() + 1)
  return next
}

export async function createCalendarAppointment(
  input: BookAppointmentInput,
  businessId: string,
  callId: string | null,
  timezone: string = 'America/Chicago',
): Promise<BookAppointmentResult> {
  console.log('[calendar] createCalendarAppointment called', { businessId, callId, input })
  try {
    const auth = await getAuthenticatedClient(businessId)
    const calendar = google.calendar({ version: 'v3', auth })

    const durationMinutes = JOB_DURATIONS[input.job_type] ?? 90
    const startTime = resolveStartTime(input, timezone)
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

    const urgencyLabel = input.urgency === 'emergency' ? '🚨 EMERGENCY — ' : ''
    const eventSummary = `${urgencyLabel}${input.job_type.replace(/_/g, ' ')} — ${input.customer_name}`

    const description = [
      `Customer: ${input.customer_name}`,
      `Phone: ${input.customer_phone}`,
      input.customer_email ? `Email: ${input.customer_email}` : null,
      `Service Address: ${input.service_address}`,
      `Job Type: ${input.job_type.replace(/_/g, ' ')}`,
      `Urgency: ${input.urgency}`,
      input.notes ? `Notes: ${input.notes}` : null,
      callId ? `Call ID: ${callId}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventSummary,
        description,
        location: input.service_address,
        start: { dateTime: startTime.toISOString(), timeZone: timezone },
        end: { dateTime: endTime.toISOString(), timeZone: timezone },
        colorId: input.urgency === 'emergency' ? '11' : input.urgency === 'soon' ? '5' : '2',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    })

    const googleEventId = event.data.id ?? null

    // Persist booking to Supabase
    const supabase = createServiceClient()
    const estimatedValue = input.estimated_value ?? JOB_VALUES[input.job_type] ?? 350

    // callId here is the Retell call ID — look up the Supabase UUID
    const resolvedBusinessId = businessId || '00000000-0000-0000-0000-000000000001'
    let supabaseCallId: string | null = null
    if (callId) {
      const { data: callRow } = await supabase
        .from('calls')
        .select('id')
        .eq('retell_call_id', callId)
        .maybeSingle()
      supabaseCallId = callRow?.id ?? null
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        business_id: resolvedBusinessId,
        call_id: supabaseCallId,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_email: input.customer_email ?? null,
        customer_address: input.service_address,
        job_type: input.job_type as import('@/lib/database.types').JobType,
        urgency: input.urgency,
        notes: input.notes ?? null,
        scheduled_start: startTime.toISOString(),
        scheduled_end: endTime.toISOString(),
        calendar_event_id: googleEventId,
        status: 'confirmed',
        estimated_value: estimatedValue,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[calendar] Supabase booking insert error:', error)
    }

    // Fire emails — fetch business info + owner profile
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('name, phone_number, owner_first_name')
        .eq('id', resolvedBusinessId)
        .maybeSingle()

      const { data: ownerProfile } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('business_id', resolvedBusinessId)
        .eq('role', 'owner')
        .maybeSingle()

      const businessName = business?.name ?? 'Your Service Provider'
      const businessPhone = business?.phone_number ?? undefined
      const ownerEmail = ownerProfile?.email
      const ownerName = ownerProfile?.full_name ?? business?.owner_first_name ?? 'there'

      if (input.customer_email) {
        sendBookingConfirmation({
          to: input.customer_email,
          customerName: input.customer_name,
          businessName,
          jobType: input.job_type,
          scheduledStart: startTime.toISOString(),
          address: input.service_address,
          businessPhone,
        }).catch(e => console.error('[calendar] sendBookingConfirmation error:', e))
      }

      if (ownerEmail) {
        sendNewBookingNotification({
          to: ownerEmail,
          ownerName,
          customerName: input.customer_name,
          customerPhone: input.customer_phone,
          jobType: input.job_type,
          scheduledStart: startTime.toISOString(),
          address: input.service_address,
          notes: input.notes,
          estimatedValue,
        }).catch(e => console.error('[calendar] sendNewBookingNotification error:', e))
      }
    } catch (emailErr) {
      console.error('[calendar] email dispatch error:', emailErr)
    }

    const formattedDate = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const formattedTime = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    return {
      success: true,
      booking_id: booking?.id ?? undefined,
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      calendar_event_id: googleEventId ?? undefined,
      confirmation_message: `Booked for ${formattedDate} at ${formattedTime}. Confirmation text will be sent to ${input.customer_phone}.`,
    } satisfies BookAppointmentResult
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[calendar] createCalendarAppointment failed:', message)

    return {
      success: false,
      confirmation_message:
        "I wasn't able to book that automatically, but I've noted all your details and someone will call you back shortly to confirm a time.",
      error: message,
    }
  }
}
