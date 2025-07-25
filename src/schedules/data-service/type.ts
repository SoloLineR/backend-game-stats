export interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
}

export interface TwitchResponse {
  data: TwitchGame[];
  pagination?: {
    cursor?: string;
  };
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}
