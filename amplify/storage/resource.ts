import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'Ao1K_Images',
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']),
    ]
  })
});