export const RESPONSE_MESSAGES = {
  AUTH: {
    USER_REGISTRY_SUCCESSFULLY: (email: string): string => {
      return `User with this email ${email} successfully registered.`;
    },
    USER_SIGN_OUT_SUCCESSFULLY: (): string => {
      return 'User successfully sign out';
    },
  },
} as const;
