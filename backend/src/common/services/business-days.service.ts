import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Business-day helper for the payout hold window.
 *
 * Per platform policy:
 *  - Sunday is the only weekly off
 *  - Holiday rows in the `holidays` table (where `isActive=true`) are also non-business
 *
 * Holidays are cached in-process for 1 hour so the daily payout-release cron and the
 * settlement creation path don't hammer the DB. Call `refresh()` after admin edits if
 * you need an immediate refresh.
 */
@Injectable()
export class BusinessDaysService {
  private readonly logger = new Logger(BusinessDaysService.name);
  private cache: { set: Set<string>; loadedAt: number } | null = null;
  private static readonly TTL_MS = 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async refresh(): Promise<void> {
    this.cache = null;
    await this.loadHolidays();
  }

  /** Add `count` business days to `start`, skipping Sundays and active holidays. */
  async addBusinessDays(start: Date, count: number): Promise<Date> {
    const holidays = await this.loadHolidays();
    const result = new Date(start.getTime());
    let added = 0;
    let safety = 0;
    while (added < count) {
      result.setUTCDate(result.getUTCDate() + 1);
      if (this.isBusinessDay(result, holidays)) added += 1;
      // Safety net: if for some reason a year's worth of days have no business
      // day (shouldn't happen with real data), bail out so we never loop forever.
      if (++safety > 366) {
        this.logger.warn('addBusinessDays exceeded 366 iterations; returning best-effort date');
        break;
      }
    }
    return result;
  }

  /** True iff the given date is a working day (not Sunday, not an active holiday). */
  async isBusinessDayAsync(d: Date): Promise<boolean> {
    const holidays = await this.loadHolidays();
    return this.isBusinessDay(d, holidays);
  }

  private isBusinessDay(d: Date, holidays: Set<string>): boolean {
    if (d.getUTCDay() === 0) return false; // Sunday
    const key = this.toDateKey(d);
    return !holidays.has(key);
  }

  private toDateKey(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private async loadHolidays(): Promise<Set<string>> {
    if (this.cache && Date.now() - this.cache.loadedAt < BusinessDaysService.TTL_MS) {
      return this.cache.set;
    }
    try {
      const rows = await this.prisma.holiday.findMany({
        where: { isActive: true },
        select: { date: true },
      });
      const set = new Set(rows.map((r) => this.toDateKey(r.date)));
      this.cache = { set, loadedAt: Date.now() };
      return set;
    } catch (err: any) {
      // If the `holidays` table hasn't been migrated yet (e.g. tests on an older DB)
      // fall back to Sundays-only so the rest of the system keeps working.
      this.logger.warn(`Holiday calendar unavailable, falling back to Sundays-only: ${err.message}`);
      const empty = new Set<string>();
      this.cache = { set: empty, loadedAt: Date.now() };
      return empty;
    }
  }
}
