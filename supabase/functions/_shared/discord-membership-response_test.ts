import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import {
  discordErrorCode,
  isDiscordUnknownMemberResponse,
} from "./discord-membership-response.ts";

Deno.test("Discord membership loss requires the exact Unknown Member error code", () => {
  assertEquals(discordErrorCode({ code: 10_007 }), 10_007);
  for (
    const value of [null, [], {}, { code: "10007" }, { code: -1 }, {
      code: 1.5,
    }]
  ) {
    assertEquals(discordErrorCode(value), null);
  }
  assert(isDiscordUnknownMemberResponse({
    status: 404,
    error: { code: 10_007, message: "Unknown Member" },
  }));
  assert(
    !isDiscordUnknownMemberResponse({
      status: 404,
      error: { code: 10_004, message: "Unknown Guild" },
    }),
  );
  assert(
    !isDiscordUnknownMemberResponse({
      status: 404,
      error: { message: "Unknown Member" },
    }),
  );
});
