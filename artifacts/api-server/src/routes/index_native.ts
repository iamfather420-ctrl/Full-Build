import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth_native";
import productsRouter from "./products";
import ordersRouter from "./orders";
import vaultRouter from "./vault_native";
import libraryRouter from "./library";
import problemsRouter from "./problems";
import solutionsRouter from "./solutions";
import escrowRouter from "./escrow";
import crawlerRouter from "./crawler_native";
import notificationsRouter from "./notifications";
import earningsRouter from "./earnings";
import offersRouter from "./offers";
import ownerRouter from "./owner";
import brainRouter from "./brain";
import telemetryRouter from "./telemetry_native";
import signerRouter from "./signer";
import cryptoRouter from "./crypto";
import kineticRouter from "./kinetic_native";
import deliveryRouter from "./delivery";
import challengesRouter from "./challenges";
import quantumRouter from "./quantum";
import openaiRouter from "./openai";
import outreachRouter from "./outreach_native";

const router: IRouter = Router();
router.use(
  healthRouter, authRouter, productsRouter, ordersRouter, vaultRouter,
  libraryRouter, problemsRouter, solutionsRouter, escrowRouter, crawlerRouter,
  notificationsRouter, earningsRouter, offersRouter, ownerRouter, brainRouter,
  telemetryRouter, signerRouter, cryptoRouter, kineticRouter, deliveryRouter,
  challengesRouter, quantumRouter, openaiRouter, outreachRouter,
);

export default router;
