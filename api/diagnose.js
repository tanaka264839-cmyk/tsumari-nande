export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { answers } = req.body;
  if (!answers) {
    return res.status(400).json({ error: 'answers is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `あなたは「つまりなんで？」というツールのAIです。
ユーザーが「最近なんかうまく回らない」と感じているとき、その原因を優しく、でも的確に言語化してあげてください。
責めず、押しつけず、「そうそう、それだよ」と思ってもらえる言葉を選んでください。

【ユーザーの状態】
- 睡眠の質：${answers.sleep}/5
- 部屋の散らかり：${answers.room}/5
- 未返信・未処理の連絡：${answers.messages}/5
- お金の不安：${answers.money}/5
- やることの多さ：${answers.tasks}/5
- 人間関係のストレス：${answers.relations}/5
- 運動不足：${answers.exercise}/5
- 食事の乱れ：${answers.food}/5

（1=全然大丈夫 〜 5=かなりしんどい）

以下のJSON形式のみで返してください。前置き・説明文は不要です：
{
  "main_cause": "つまりなんで？を20〜30文字で。「〜が原因です」ではなく「〜が溜まってるから」「〜が追いついてないから」のような言い方で",
  "detail": "もう少し掘り下げた説明を50〜80文字で。「そうそうそれ」と思えるような共感ベースで",
  "actions": [
    "今日5分でできる小さなアクション①（15文字以内・具体的に）",
    "今日5分でできる小さなアクション②（15文字以内・具体的に）",
    "今日5分でできる小さなアクション③（15文字以内・具体的に）"
  ],
  "message": "最後にひとこと。30〜40文字。頑張れではなく、ほっとできる言葉で"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'AI API error' });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    // JSON部分だけ抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'Invalid AI response format' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
