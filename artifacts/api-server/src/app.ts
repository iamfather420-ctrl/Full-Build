import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { incrementOps } from "./lib/telemetry";
import { getNextTick } from "./lib/lamport";
import { l5ConsensusGate } from "./lib/consensus";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use((req: Request, _res: Response, next: NextFunction) => {
  incrementOps();
  (req as Request & { lamportTick: number }).lamportTick = getNextTick();
  next();
});

app.use("/api", l5ConsensusGate);
app.use("/api", router);

export default app;
