import type { DiscordMessage } from "./types.ts";

export class DiscordMonitor {
  private token: string;
  private baseUrl = "https://discord.com/api/v10";

  constructor(token: string) {
    this.token = token;
  }

  async getMessages(channelId: string, limit: number = 10): Promise<DiscordMessage[]> {
    const response = await fetch(
      `${this.baseUrl}/channels/${channelId}/messages?limit=${limit}`,
      {
        headers: {
          Authorization: `Bot ${this.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const messages = await response.json();

    return (messages || []).map((msg: Record<string, unknown>) => ({
      id: String(msg.id || ""),
      content: String(msg.content || ""),
      author: {
        id: String((msg.author as { id?: string })?.id || ""),
        username: String((msg.author as { username?: string })?.username || ""),
        global_name: (msg.author as { global_name?: string })?.global_name,
      },
      timestamp: String(msg.timestamp || ""),
      channel_id: String(msg.channel_id || channelId),
    }));
  }

  async getLatestMessage(channelId: string): Promise<DiscordMessage | null> {
    const messages = await this.getMessages(channelId, 1);
    return messages.length > 0 ? messages[0] : null;
  }
}

