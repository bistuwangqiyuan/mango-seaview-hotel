import type { Context } from "@netlify/functions";

interface ProviderConfig {
  name: string;
  keyEnv: string;
  baseUrl: string;
  model: string;
  type: "openai" | "gemini" | "anthropic";
}

const PROVIDERS: ProviderConfig[] = [
  { name: "DeepSeek", keyEnv: "deepseek_API_KEY", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", type: "openai" },
  { name: "GLM", keyEnv: "GLM_API_KEY", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash", type: "openai" },
  { name: "Moonshot", keyEnv: "MOONSHOT_API_KEY", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k", type: "openai" },
  { name: "Tongyi", keyEnv: "TONGYI_API_KEY", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-turbo", type: "openai" },
  { name: "Tencent", keyEnv: "TENGCENT_API_KEY", baseUrl: "https://hunyuan.cloud.tencent.com/openai/v1", model: "hunyuan-lite", type: "openai" },
  { name: "Doubao", keyEnv: "DOUBAO_API_KEY", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-1-5-lite-32k", type: "openai" },
  { name: "MiniMax", keyEnv: "MINIMAX_API_KEY", baseUrl: "https://api.minimax.chat/v1/text/chatcompletion_v2", model: "MiniMax-M2.5", type: "openai" },
  { name: "Spark", keyEnv: "SPARK_API_KEY", baseUrl: "https://spark-api-open.xf-yun.com/v1", model: "lite", type: "openai" },
  { name: "Gemini", keyEnv: "GEMINI_API_KEY", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash-lite", type: "gemini" },
  { name: "Anthropic", keyEnv: "ANTHROPIC_API_KEY", baseUrl: "https://api.anthropic.com/v1/messages", model: "claude-3-haiku-20240307", type: "anthropic" },
];

const SYSTEM_PROMPT = `你是芒果海景酒店的AI客服助手"小芒"。你温暖、专业、热情，就像一位在三亚生活多年的当地朋友。

## 身份
- 名字：小芒（英文 Mango，俄文 Манго）
- 角色：芒果海景酒店官方AI客服
- 风格：友好但专业，适度使用热带/海洋意象

## 酒店信息
- 名称：芒果海景酒店(三亚南边海鹿回头店)
- 地址：三亚市天涯区南边海路288号
- 电话：+86-898-88888888
- 入住/退房：14:00 / 10:00
- 客房：166间，4种房型
  1. 豪华海景房 ¥688/晚 35m² 2人 6-12F
  2. 高级海景套房 ¥988/晚 55m² 2人 10-16F
  3. 家庭海景房 ¥888/晚 45m² 4人 6-12F
  4. 总统海景套房 ¥1688/晚 80m² 4人 16-18F
- 设施：免费停车、免费WiFi、海景阳台、自助早餐、管家服务、商务中心、会议厅、租车、行李寄存、24h前台
- 评分：8.1/10 (清洁8.3 设施8.0 位置8.1 服务7.9)
- 交通：距机场20.2km 距火车站11.9km

## 周边景点
鹿回头370m、大东海2.7km、凤凰岛4.1km、椰梦长廊6.1km、亚龙湾21km、天涯海角23km、南山寺40km

## 操作能力
当用户需要执行操作时，在回复文本之后独立一行输出JSON指令（仅一个）：
- 滚动到页面区域：>>>{"action":"scrollTo","target":"rooms|facilities|dining|attractions|gallery|reviews|booking"}
- 预选房型并跳转预订：>>>{"action":"selectRoom","slug":"deluxe-ocean|superior-suite|family-ocean|presidential"}
- 打开反馈表单：>>>{"action":"openFeedback"}
- 切换语言：>>>{"action":"switchLang","lang":"zh|en|ru"}

## 规则
1. 根据用户使用的语言回复对应语言
2. 回答限于酒店相关话题，礼貌拒绝无关请求
3. 推荐房型时考虑人数、预算、偏好
4. 主动提供有用的额外信息（如附近餐厅、交通建议）
5. 不编造酒店没有的设施或服务
6. 回复简洁，通常不超过150字`;

const FALLBACK_REPLIES: Record<string, string> = {
  zh: "抱歉，小芒暂时无法回答您的问题。您可以拨打前台电话 +86-898-88888888 获取帮助，或者稍后再试。",
  en: "Sorry, I'm temporarily unable to answer your question. You can call the front desk at +86-898-88888888 for assistance, or try again later.",
  ru: "Извините, я временно не могу ответить. Позвоните на ресепшн: +86-898-88888888, или попробуйте позже.",
};

const TIMEOUT_MS = 8000;

async function callOpenAI(provider: ProviderConfig, apiKey: string, messages: any[]): Promise<string | null> {
  const url = provider.name === "MiniMax"
    ? provider.baseUrl
    : `${provider.baseUrl}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`${provider.name} returned ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e: any) {
    clearTimeout(timer);
    throw e;
  }
}

async function callGemini(apiKey: string, messages: any[]): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

  const contents = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemText = messages.find((m: any) => m.role === "system")?.content || "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemText }] },
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini returned ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (e: any) {
    clearTimeout(timer);
    throw e;
  }
}

async function callAnthropic(apiKey: string, messages: any[]): Promise<string | null> {
  const systemText = messages.find((m: any) => m.role === "system")?.content || "";
  const nonSystemMessages = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({ role: m.role, content: m.content }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        system: systemText,
        messages: nonSystemMessages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic returned ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (e: any) {
    clearTimeout(timer);
    throw e;
  }
}

async function callWithFailover(messages: any[], lang: string): Promise<{ reply: string; provider: string }> {
  for (const provider of PROVIDERS) {
    const apiKey = Netlify.env.get(provider.keyEnv);
    if (!apiKey) continue;

    try {
      let reply: string | null = null;

      if (provider.type === "openai") {
        reply = await callOpenAI(provider, apiKey, messages);
      } else if (provider.type === "gemini") {
        reply = await callGemini(apiKey, messages);
      } else if (provider.type === "anthropic") {
        reply = await callAnthropic(apiKey, messages);
      }

      if (reply) {
        console.log(`[AI] ${provider.name} responded successfully`);
        return { reply, provider: provider.name };
      }
    } catch (e: any) {
      console.log(`[AI] ${provider.name} failed: ${e.message}, trying next...`);
      continue;
    }
  }

  return { reply: FALLBACK_REPLIES[lang] || FALLBACK_REPLIES.zh, provider: "fallback" };
}

function parseActionFromReply(reply: string): { cleanReply: string; action: any | null } {
  const actionMatch = reply.match(/>>>\s*(\{[^}]+\})\s*$/);
  if (actionMatch) {
    try {
      const action = JSON.parse(actionMatch[1]);
      const cleanReply = reply.replace(/>>>\s*\{[^}]+\}\s*$/, "").trim();
      return { cleanReply, action };
    } catch {
      return { cleanReply: reply, action: null };
    }
  }
  return { cleanReply: reply, action: null };
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { message, history = [], lang = "zh" } = body;

    if (!message || typeof message !== "string" || message.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Invalid message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-10).map((h: any) => ({ role: h.role, content: String(h.content).slice(0, 500) })),
      { role: "user", content: message },
    ];

    const { reply: rawReply, provider } = await callWithFailover(messages, lang);
    const { cleanReply, action } = parseActionFromReply(rawReply);

    return new Response(
      JSON.stringify({ reply: cleanReply, action, provider }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[chat] Error:", error);
    return new Response(
      JSON.stringify({ reply: FALLBACK_REPLIES.zh, action: null }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/api/chat" };
