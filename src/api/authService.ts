import { api } from './client';

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export const changePassword = (payload: ChangePasswordPayload) =>
  api.post<ChangePasswordResponse>('/api/auth/change-password', payload);

// Email OTP
export type SendEmailOtpPayload = { email: string };
export type SendEmailOtpResponse = { message: string; devOtp?: string };
export const sendEmailOtp = (payload: SendEmailOtpPayload) =>
  api.post<SendEmailOtpResponse>('/api/auth/email-otp/send', payload);

export type VerifyEmailOtpPayload = { email: string; code: string };
export type VerifyEmailOtpResponse = {
  _id: string;
  name: string;
  email?: string;
  token: string;
  isNew?: boolean;
};
export const verifyEmailOtp = (payload: VerifyEmailOtpPayload) =>
  api.post<VerifyEmailOtpResponse>('/api/auth/email-otp/verify', payload);
