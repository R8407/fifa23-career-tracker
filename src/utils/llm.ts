const LLM_BASE_URL = 'http://localhost:8080';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function isLLMAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${LLM_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateDMReply(
  senderName: string,
  senderRole: string,
  originalMessage: string,
  playerReply: string,
  playerData: {
    name: string;
    ovr: number;
    goals: number;
    assists: number;
    avgRating: string;
    motm: number;
    club: string;
    age: number;
  },
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const systemPrompt = `You are roleplaying as ${senderName}, a famous football ${senderRole}.

Your persona:
${senderRole === 'legend' ? `- You are a legendary retired footballer who gives genuine, heartfelt advice to young players.
- You speak from experience and are encouraging but honest.
- You reference your own career when relevant.` : ''}
${senderRole === 'agent' ? `- You are a top football agent who represents elite players.
- You are professional, strategic, and always looking at the bigger picture.
- You talk about market value, transfers, and career moves.` : ''}
${senderRole === 'coach' ? `- You are a professional football coach managing Spezia.
- You are direct, constructive, and focused on development.
- You balance praise with areas for improvement.` : ''}

The young player you are messaging:
- Name: ${playerData.name}
- Age: ${playerData.age}
- Overall Rating: ${playerData.ovr}
- Current Club: ${playerData.club}
- Season Stats: ${playerData.goals} goals, ${playerData.assists} assists
- Average Rating: ${playerData.avgRating}
- MOTM Awards: ${playerData.motm}

Keep your response under 100 words. Be authentic and specific to this player's situation.`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'assistant', content: originalMessage },
  ];

  // Add chat history
  if (chatHistory) {
    for (const msg of chatHistory) {
      messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
    }
  }

  messages.push({ role: 'user', content: playerReply });

  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3',
        messages,
        temperature: 0.8,
        max_tokens: 200,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error('LLM request failed');
    const data: LLMResponse = await res.json();
    return data.choices[0]?.message?.content || getFallbackReply(senderRole);
  } catch {
    return getFallbackReply(senderRole);
  }
}

function getFallbackReply(role: string): string {
  const replies: Record<string, string[]> = {
    legend: [
      'Thank you for your message. Keep working hard and never stop believing in yourself.',
      'I appreciate the kind words. The road to greatness is long but you are on the right path.',
      'That means a lot coming from you. I will keep pushing to improve every day.',
    ],
    agent: [
      'We will discuss this further in our next meeting. For now, focus on your performances.',
      'I have several options on the table. Let me handle the business side while you focus on football.',
      'Your value is increasing with every game. We are in a strong position.',
    ],
    coach: [
      'Good attitude. Keep this up and you will be a key player for us.',
      'I will keep monitoring your development. Stay focused and disciplined.',
      'Your training performances have been excellent. Keep it going.',
    ],
  };
  const options = replies[legend] || replies.legend;
  return options[Math.floor(Math.random() * options.length)];
}
