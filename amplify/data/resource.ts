import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  DailyScrambles: a.model({
      date: a.date(),
      scramble3x3: a.string(),
    }).authorization(allow => allow.publicApiKey().to(['read', 'create'])),
  
  // getDaily: a
  //   .query()

  //   // arguments that this query accepts
  //   .arguments({
  //     date: a.date(),

  //   })
    

  //   // return type of the query
  //   .returns(a.string())
    
  //   .authorization(allow => allow.publicApiKey()),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});