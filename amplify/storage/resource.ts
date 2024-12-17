import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'daily-scramble-strings',
  access: (allow) => ({
    'scrambles/*': [allow.guest.to(['read'])],
  })
});