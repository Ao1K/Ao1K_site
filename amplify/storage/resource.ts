import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'daily-scram',
  access: (allow) => ({
    "daily.txt": [
      allow.authenticated.to(["read"]),
      allow.guest.to(["read"]),
    ],
  }),
});