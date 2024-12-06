import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Pdf: a
    .model({
      name: a.string(),
      pdfUrl: a.string(), // URL to the PDF file stored in S3
      summary: a.string(),
      partiesInvolved: a.string(),
      keyClauses: a.string(),
      datesAndTimelines: a.string(),
      obligationsAndLiabilities: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});