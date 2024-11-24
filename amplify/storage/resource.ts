import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplifyNotesDrive",
  access: (allow) => ({
    "pdf/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
    "summaries/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
  }),
});
