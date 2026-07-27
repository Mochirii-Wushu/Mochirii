import "server-only";
import { createMochiPetsTesterRateLimiter } from "./tester-rate-limit-core";

const limiter = createMochiPetsTesterRateLimiter();

export const checkMochiPetsTesterRateLimit = limiter.check;
export const clearMochiPetsTesterFailures = limiter.clear;
export const recordMochiPetsTesterFailure = limiter.recordFailure;
