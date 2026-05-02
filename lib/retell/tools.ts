import type Anthropic from '@anthropic-ai/sdk'

export const SARAH_TOOLS: Anthropic.Tool[] = [
  {
    name: 'book_appointment',
    description:
      'Book a service appointment on the business calendar. Call this once you have confirmed: customer name, phone number, service address, job type, and a preferred date/time window. Always confirm these details with the customer before calling this tool.',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Full name of the customer',
        },
        customer_phone: {
          type: 'string',
          description: 'Customer callback phone number',
        },
        customer_email: {
          type: 'string',
          description: 'Customer email address (optional — only if provided)',
        },
        service_address: {
          type: 'string',
          description: 'Full service address including street, city, and state',
        },
        job_type: {
          type: 'string',
          enum: [
            'ac_repair',
            'ac_not_turning_on',
            'furnace_repair',
            'furnace_not_turning_on',
            'installation',
            'maintenance',
            'ductwork',
            'thermostat',
            'refrigerant',
            'emergency',
            'other',
          ],
          description: 'Type of HVAC service needed',
        },
        urgency: {
          type: 'string',
          enum: ['emergency', 'soon', 'scheduled'],
          description:
            'Urgency level: emergency = same-day/ASAP, soon = within a few days, scheduled = flexible',
        },
        preferred_date: {
          type: 'string',
          description: 'Preferred date in ISO format (YYYY-MM-DD), e.g. "2026-05-02"',
        },
        preferred_time_window: {
          type: 'string',
          description: 'Preferred time window, e.g. "morning", "afternoon", "8am-12pm", "2pm-5pm"',
        },
        notes: {
          type: 'string',
          description:
            'Any additional details the customer mentioned: symptoms, age of unit, previous repairs, special instructions',
        },
        estimated_value: {
          type: 'number',
          description:
            'Estimated job value in USD based on job type (optional). AC repair ~450, installation ~3500, maintenance ~150, emergency ~600',
        },
      },
      required: ['customer_name', 'customer_phone', 'service_address', 'job_type', 'urgency'],
    },
  },
]

export type BookAppointmentInput = {
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_address: string
  job_type: string
  urgency: 'emergency' | 'soon' | 'scheduled'
  preferred_date?: string
  preferred_time_window?: string
  notes?: string
  estimated_value?: number
}

export type BookAppointmentResult = {
  success: boolean
  booking_id?: string
  scheduled_start?: string
  scheduled_end?: string
  calendar_event_id?: string
  confirmation_message: string
  error?: string
}
