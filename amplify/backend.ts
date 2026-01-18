import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  storage,
});