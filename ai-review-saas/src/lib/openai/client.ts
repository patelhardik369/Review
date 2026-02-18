import OpenAI from 'openai'

export interface GenerateResponseParams {
  reviewText: string
  rating: number
  businessName: string
  businessType?: string
  brandVoice?: 'professional' | 'friendly' | 'casual' | 'formal'
  greeting?: string
  closing?: string
}

export interface GeneratedResponse {
  content: string
  tokensUsed: number
  model: string
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateReviewResponse({
  reviewText,
  rating,
  businessName,
  businessType = 'business',
  brandVoice = 'professional',
  greeting,
  closing,
}: GenerateResponseParams): Promise<GeneratedResponse> {
  const toneInstructions = {
    professional: 'Use a professional, formal tone. Be courteous and businesslike.',
    friendly: 'Use a warm, friendly tone. Be personable and approachable.',
    casual: 'Use a casual, relaxed tone. Be conversational and laid-back.',
    formal: 'Use a very formal, polite tone. Be respectful and elegant.',
  }

  const prompt = `You are a ${businessType} called "${businessName}" responding to a customer review.

${greeting ? `Use this greeting: "${greeting}"` : ''}

Review: "${reviewText}"
Rating: ${rating}/5 stars

${toneInstructions[brandVoice]}

Guidelines:
1. Thank the customer for their feedback
2. Address specific points they mentioned
3. If negative, acknowledge their concerns and offer to make things right
4. If positive, express gratitude and encourage continued business
5. ${closing ? `End with: "${closing}"` : 'End with a friendly closing'}
6. Keep the response under 150 words
7. Never mention the rating number in your response`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a professional business owner responding to customer reviews.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  })

  const response = completion.choices[0]?.message?.content || ''
  const tokensUsed = completion.usage?.total_tokens || 0

  return {
    content: response,
    tokensUsed,
    model: completion.model,
  }
}

export async function analyzeSentiment(reviewText: string): Promise<'positive' | 'neutral' | 'negative'> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Analyze the sentiment of this review. Respond with only one word: positive, neutral, or negative.',
      },
      {
        role: 'user',
        content: reviewText,
      },
    ],
    max_tokens: 10,
    temperature: 0,
  })

  const sentiment = completion.choices[0]?.message?.content?.toLowerCase().trim() || 'neutral'
  
  if (sentiment.includes('positive')) return 'positive'
  if (sentiment.includes('negative')) return 'negative'
  return 'neutral'
}

export function calculateCost(tokensUsed: number): number {
  const inputCostPer1K = 0.00015 // $0.15 per 1M tokens = $0.00015 per 1K
  const outputCostPer1K = 0.0006 // $0.60 per 1M tokens = $0.0006 per 1K
  const estimatedOutput = Math.floor(tokensUsed * 0.7)
  const estimatedInput = tokensUsed - estimatedOutput
  
  return Math.round((estimatedInput * inputCostPer1K + estimatedOutput * outputCostPer1K) * 100)
}
