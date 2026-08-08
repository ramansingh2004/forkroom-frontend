export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  display_name: string;
};

export type MessageResponse = {
  detail: string;
};

export type LoginBackendResponse = {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in: number;
};

export type TokenBackendResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in: number;
};