import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  limit: number;
  name: string;
  windowMs: number;
}

export const RATE_LIMIT_KEY = 'dentia:rate-limit';

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
