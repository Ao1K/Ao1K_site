import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  DailyScrambles: a.model({
    date: a.date(),
    scramble3x3: a.string(),
  }).authorization(allow => allow.guest().to(['read', 'create'])),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool', // see docs: https://docs.amplify.aws/nextjs/build-a-backend/data/customize-authz/public-data-access/#add-public-authorization-rule-using-amazon-cognito-identity-pools-unauthenticated-role
  },
});