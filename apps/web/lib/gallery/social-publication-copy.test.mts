import assert from "node:assert/strict";
import test from "node:test";
import {
  SOCIAL_PUBLICATION_COPY_ERROR,
  SOCIAL_PUBLICATION_COPY_ERROR_CODE,
  socialPublicationCopyContainsSiteReference,
  socialPublicationCopyContainsUrlLikeReference,
  validateSocialPublicationCopy,
} from "./social-publication-copy.ts";

test("publication copy rejects URLs plus canonical, credential-confusion, and obfuscated site references", () => {
  const blocked = [
    "mochirii.com",
    "Visit mochirii.com.",
    "WWW.MOCHIRII.COM/path",
    "https://social.mochirii.com/gallery",
    "https://mochirii.com@unrelated.example/path",
    "https://person@mochirii.com/path",
    "https://mochirii.com.example.test/path",
    "https://www.mochirii.com.example.test/path",
    "https://notmochirii.com/path",
    "https://mochirii.company/path",
    "hello@mochirii.com.example.test",
    "MＯＣＨＩＲＩＩ．ＣＯＭ",
    "mo\u200bchirii.com",
    "mo chirii [.] c om",
    "mochirii (dot) com",
    "mochirii d o t com",
    "mochirii%2Ecom",
    "mochirii%252ecom",
    "mochirii&#46;com",
    String.raw`mochirii\u002ecom`,
    "cdn [dot] mochirii [dot] com",
  ];

  for (const value of blocked) {
    assert.equal(
      socialPublicationCopyContainsSiteReference(value),
      true,
      value,
    );
  }
});

test("publication copy allows ordinary non-URL copy", () => {
  const allowed = [
    "A pretty gameplay showcase from Mōchirīī.",
    "The mochirii community gathered for an event.",
  ];

  for (const value of allowed) {
    assert.equal(
      socialPublicationCopyContainsSiteReference(value),
      false,
      value,
    );
  }
});

test("both Meta destinations reject every URL-like publication reference", () => {
  for (const value of [
    "https://example.com/path",
    "www.example.com",
    "example.com",
    "support@example.com",
    "mochirii [dot] com",
    "h t t p s : / / example.com",
    "www\u200b.example.com",
  ]) {
    assert.equal(
      socialPublicationCopyContainsUrlLikeReference(value),
      true,
      value,
    );
    assert.equal(validateSocialPublicationCopy([value]).ok, false, value);
  }
});

test("ordinary sparse guild copy remains allowed", () => {
  for (const value of [
    "A member portrait from Wushu land.",
    "Pretty armor beneath the pavilion lanterns.",
    "Cupcake won the duel 3 to 0.",
  ]) {
    assert.equal(validateSocialPublicationCopy([value]).ok, true, value);
  }
});

test("multi-field validation returns one provider-neutral failure contract", () => {
  assert.deepEqual(validateSocialPublicationCopy(["Approved caption", "Approved alt text"]), {
    ok: true,
    error: null,
    message: null,
  });
  assert.deepEqual(validateSocialPublicationCopy(["Approved caption", "See mochirii [dot] com"]), {
    ok: false,
    error: SOCIAL_PUBLICATION_COPY_ERROR_CODE,
    message: SOCIAL_PUBLICATION_COPY_ERROR,
  });
});
