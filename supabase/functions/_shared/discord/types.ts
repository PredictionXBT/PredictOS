export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    global_name?: string;
  };
  timestamp: string;
  channel_id: string;
}

export interface DiscordConfig {
  token: string;
  channelId: string;
}

export interface TGEDetectionResult {
  detected: boolean;
  project?: string;
  keywords?: string[];
  message?: DiscordMessage;
  confidence?: number;
}

