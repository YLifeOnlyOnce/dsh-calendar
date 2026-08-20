import Schema from '@deepseek-ai/schemastery'

/** dsh-calendar configuration. */
export interface Config {
  /** How many per-day buckets each session projection retains (covers the year view). */
  keepDays: number
  /** How many recent activity intervals each session projection retains. */
  intervalCap: number
  /** How many days feed each session's 24-hour activity profile. */
  hourProfileDays: number
}

export const Config: Schema<Config> = Schema.object({
  keepDays: Schema.number()
    .description('Per-day buckets retained per session (the year view needs ~400)')
    .default(400),
  intervalCap: Schema.number()
    .description('Recent activity intervals retained per session (day/week view precision)')
    .default(1000),
  hourProfileDays: Schema.number()
    .description('Days feeding each session\'s 24-hour activity profile')
    .default(30),
})
