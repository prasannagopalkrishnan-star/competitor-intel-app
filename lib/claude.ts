import Anthropic from '@anthropic-ai/sdk';
import { SignalType, Sentiment } from './types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AnalysisResult {
  summary: string;
  signalType: SignalType;
  sentiment: Sentiment;
  isHighPriority: boolean;
}

export async function analyzeSignal(
  competitorName: string,
  article: {
    title: string;
    description: string;
    content?: string;
    url: string;
  }
): Promise<AnalysisResult> {
  const prompt = `Analyze this news article about ${competitorName} and provide:
1. A concise 2-3 sentence summary
2. The signal type (product_launch, funding, leadership_change, earnings_report, social_media, blog_post, or other)
3. Sentiment (positive, negative, or neutral) from the competitor's perspective
4. Whether this is high priority (true for: earnings reports, major funding, significant product launches, C-suite leadership changes)

Article Title: ${article.title}
Description: ${article.description}
${article.content ? `Content: ${article.content.substring(0, 2000)}` : ''}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "your summary here",
  "signalType": "one of the signal types",
  "sentiment": "positive, negative, or neutral",
  "isHighPriority": true or false
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const jsonText = content.text.trim();
      // Remove markdown code blocks if present
      const cleanJson = jsonText.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanJson);

      return {
        summary: result.summary,
        signalType: result.signalType as SignalType,
        sentiment: result.sentiment as Sentiment,
        isHighPriority: result.isHighPriority,
      };
    }

    throw new Error('Unexpected response format from Claude');
  } catch (error) {
    console.error('Error analyzing signal with Claude:', error);
    
    // Fallback analysis
    return {
      summary: article.description || article.title,
      signalType: inferSignalType(article.title, article.description),
      sentiment: 'neutral',
      isHighPriority: false,
    };
  }
}

function inferSignalType(title: string, description: string = ''): SignalType {
  const text = (title + ' ' + description).toLowerCase();

  if (
    text.includes('fund') ||
    text.includes('raised') ||
    text.includes('investment') ||
    text.includes('series')
  ) {
    return 'funding';
  }
  if (
    text.includes('ceo') ||
    text.includes('cto') ||
    text.includes('cfo') ||
    text.includes('appointed') ||
    text.includes('joins') ||
    text.includes('executive')
  ) {
    return 'leadership_change';
  }
  if (
    text.includes('earnings') ||
    text.includes('quarterly') ||
    text.includes('revenue') ||
    text.includes('profit')
  ) {
    return 'earnings_report';
  }
  if (
    text.includes('launch') ||
    text.includes('release') ||
    text.includes('announce') ||
    text.includes('unveil') ||
    text.includes('feature')
  ) {
    return 'product_launch';
  }
  if (text.includes('tweet') || text.includes('twitter') || text.includes('linkedin')) {
    return 'social_media';
  }
  if (text.includes('blog')) {
    return 'blog_post';
  }

  return 'other';
}
