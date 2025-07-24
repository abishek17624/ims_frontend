export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  email_verified: boolean;
  mobile_verified: boolean;
}

export interface LoginResponse {
  success: number;
  message: string;
  accessToken: string;
  user: User;
}