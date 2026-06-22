import type Anthropic from '@anthropic-ai/sdk'

export const SARAH_TOOLS: Anthropic.Tool[] = [
  {
    name: 'book_appointment',
    description:
      'Submit a salon appointment request. Call this ONLY after the customer has confirmed: their name, phone number, service, and preferred date/time. Always read back the details and get explicit confirmation before calling this tool.',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Full name of the customer',
        },
        customer_phone: {
          type: 'string',
          description: 'Customer phone number for confirmation',
        },
        customer_email: {
          type: 'string',
          description: 'Customer email address (only if they provided it)',
        },
        service_type: {
          type: 'string',
          enum: [
            'eyebrow_threading',
            'upper_lip_threading',
            'chin_threading',
            'full_face_threading',
            'side_burns_threading',
            'neck_threading',
            'forehead_threading',
            'eyebrow_waxing',
            'upper_lip_waxing',
            'chin_waxing',
            'full_face_waxing',
            'basic_facial',
            'deep_cleansing_facial',
            'other',
          ],
          description: 'The beauty service the customer wants',
        },
        preferred_date: {
          type: 'string',
          description: 'Preferred date in ISO format (YYYY-MM-DD), e.g. "2026-06-25"',
        },
        preferred_time_window: {
          type: 'string',
          description: 'Preferred time or window, e.g. "morning", "afternoon", "10am", "2pm-4pm"',
        },
        notes: {
          type: 'string',
          description: 'Any extra details mentioned by the customer (first time, sensitive skin, specific style preference, etc.)',
        },
        language: {
          type: 'string',
          enum: ['english', 'spanish'],
          description: 'Language the customer spoke during the call',
        },
      },
      required: ['customer_name', 'customer_phone', 'service_type'],
    },
  },
]

export type BookAppointmentInput = {
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_type: string
  preferred_date?: string
  preferred_time_window?: string
  notes?: string
  language?: 'english' | 'spanish'
}

export type BookAppointmentResult = {
  success: boolean
  booking_id?: string
  scheduled_start?: string
  confirmation_message: string
  error?: string
}
