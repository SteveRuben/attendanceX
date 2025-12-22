import { Response } from "express";
import { AuthenticatedRequest } from "../../types/middleware.types";
import { parallelRunService } from "../../rebac/services/ParallelRunService";

export class ParallelRunController {
  static async getStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    const limit = ParallelRunController.parseLimit(req.query?.limit);
    const stats = await parallelRunService.getStats(limit);

    res.json({
      success: true,
      data: stats,
    });
  }

  private static parseLimit(value: unknown): number {
    if (typeof value !== "string") {
      return 25;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return 25;
    }
    return Math.min(parsed, 100);
  }
}

export default ParallelRunController;
