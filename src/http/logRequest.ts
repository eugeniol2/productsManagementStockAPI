import type { NextFunction, Request, Response } from "express";

export function logRequest(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on("close", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    console.log(
      JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        completed: res.writableFinished,
        durationMs: Number(durationMs.toFixed(3)),
      }),
    );
  });

  next();
}
