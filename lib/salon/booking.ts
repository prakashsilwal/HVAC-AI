import { createServiceClient } from '@/lib/supabase/server'
import { sendPendingBookingNotification } from '@/lib/resend/emails'
import type { BookAppointmentInput, BookAppointmentResult } from '@/lib/retell/tools'
import type { JobType } from '@/lib/database.types'

// Service durations in minutes (used for display; actual slot confirmed by staff)
const SERVICE_DURATIONS: Record<string, number> = {
  eyebrow_threading: 15,
  upper_lip_threading: 10,
  chin_threading: 10,
  full_face_threading: 30,
  side_burns_threading: 10,
  neck_threading: 10,
  forehead_threading: 10,
  eyebrow_waxing: 15,
  upper_lip_waxing: 10,
  chin_waxing: 10,
  full_face_waxing: 30,
  basic_facial: 45,
  deep_cleansing_facial: 60,
  other: 30,
}

function formatServiceName(serviceType: string): string {
  return serviceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function resolvePreferredStart(preferredDate?: string, preferredTimeWindow?: string): string {
  const base = preferredDate ? new Date(preferredDate) : new Date()
  const window = (preferredTimeWindow ?? 'morning').toLowerCase()

  if (window.includes('afternoon') || window.includes('pm')) {
    base.setHours(13, 0, 0, 0)
  } else if (window.includes('evening')) {
    base.setHours(16, 0, 0, 0)
  } else if (/^\d{1,2}(:\d{2})?\s*(am|pm)?$/i.test(window)) {
    // specific time like "10am" or "2pm"
    const match = window.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
    if (match) {
      let hour = parseInt(match[1])
      const isPM = match[3]?.toLowerCase() === 'pm'
      if (isPM && hour < 12) hour += 12
      if (!isPM && hour === 12) hour = 0
      base.setHours(hour, parseInt(match[2] ?? '0'), 0, 0)
    }
  } else {
    base.setHours(10, 0, 0, 0) // default morning = 10am
  }

  // If resolved time is in the past, push to next day same time
  if (base < new Date()) base.setDate(base.getDate() + 1)

  return base.toISOString()
}

export async function createPendingBooking(
  input: BookAppointmentInput,
  businessId: string,
  callId: string | null,
): Promise<BookAppointmentResult> {
  console.log('[salon/booking] createPendingBooking called', { businessId, callId, input })

  try {
    const supabase = createServiceClient()
    const resolvedBusinessId = businessId || '00000000-0000-0000-0000-000000000001'

    // Resolve the Supabase call UUID from the Retell call ID
    let supabaseCallId: string | null = null
    if (callId) {
      const { data: callRow } = await supabase
        .from('calls')
        .select('id')
        .eq('retell_call_id', callId)
        .maybeSingle()
      supabaseCallId = callRow?.id ?? null
    }

    const scheduledStart = resolvePreferredStart(input.preferred_date, input.preferred_time_window)
    const durationMinutes = SERVICE_DURATIONS[input.service_type] ?? 30
    const scheduledEnd = new Date(new Date(scheduledStart).getTime() + durationMinutes * 60 * 1000).toISOString()

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        business_id: resolvedBusinessId,
        call_id: supabaseCallId,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_email: input.customer_email ?? null,
        job_type: input.service_type as JobType,
        urgency: 'scheduled',
        notes: [
          input.notes,
          input.preferred_date ? `Preferred date: ${input.preferred_date}` : null,
          input.preferred_time_window ? `Preferred time: ${input.preferred_time_window}` : null,
          input.language ? `Language: ${input.language}` : null,
        ].filter(Boolean).join(' | ') || null,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        status: 'pending',
        estimated_value: null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[salon/booking] Supabase insert error:', error)
      return {
        success: false,
        confirmation_message:
          "I'm sorry, I had trouble saving your request. Please call us back and we'll get you booked.",
        error: error.message,
      }
    }

    // Notify the salon owner
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

      const ownerEmail = ownerProfile?.email
      const ownerName = ownerProfile?.full_name ?? business?.owner_first_name ?? 'there'

      if (ownerEmail) {
        sendPendingBookingNotification({
          to: ownerEmail,
          ownerName,
          customerName: input.customer_name,
          customerPhone: input.customer_phone,
          serviceType: formatServiceName(input.service_type),
          preferredDate: input.preferred_date,
          preferredTime: input.preferred_time_window,
          notes: input.notes,
          language: input.language,
        }).catch(e => console.error('[salon/booking] email notification error:', e))
      }
    } catch (emailErr) {
      console.error('[salon/booking] email dispatch error:', emailErr)
    }

    return {
      success: true,
      booking_id: booking?.id,
      scheduled_start: scheduledStart,
      confirmation_message: `Appointment request submitted. Tell the customer: their request for ${formatServiceName(input.service_type)} has been received, the team will confirm the time and send them a message at ${input.customer_phone} shortly.`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[salon/booking] createPendingBooking failed:', message)
    return {
      success: false,
      confirmation_message:
        "I wasn't able to save your request, but I've noted your details and someone will call you back shortly.",
      error: message,
    }
  }
}
