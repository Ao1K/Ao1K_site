import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'daily-scram',
  access: (allow) => ({
    "/*": [
      allow.authenticated.to(["read"]),
      allow.guest.to(["read"]),
    ],
  }),
});