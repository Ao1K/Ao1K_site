import { defineBackend } from '@aws-amplify/backend';
// import { auth } from './auth/resource';
// import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
});


backend.addOutput({
  storage: {
    aws_region: "us-east-1",
    bucket_name: "daily-scramble-string"
  },
});
