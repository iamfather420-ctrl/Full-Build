import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const { getUserSubscriptions } = await import("./db-extended");
    const { getParadoxProductById } = await import("./db");
    const subs = await getUserSubscriptions(ctx.user.id);
    return Promise.all(
      subs.map(async (sub: any) => ({
        ...sub,
        paradoxName: (await getParadoxProductById(sub.paradoxId))?.name || "Unknown",
      }))
    );
  }),

  getNodes: protectedProcedure.query(async ({ ctx }) => {
    const { getUserNodes } = await import("./db-extended");
    return await getUserNodes(ctx.user.id);
  }),

  getDevices: protectedProcedure.query(async ({ ctx }) => {
    const { getUserDevices } = await import("./db-extended");
    return await getUserDevices(ctx.user.id);
  }),

  getEnterpriseSettings: protectedProcedure.query(async ({ ctx }) => {
    const { getEnterpriseSettings } = await import("./db-extended");
    return await getEnterpriseSettings(ctx.user.id);
  }),

  getAccessLogs: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const { getUserAccessLogs } = await import("./db-extended");
      return await getUserAccessLogs(ctx.user.id, input.limit, input.offset);
    }),

  updateEnterpriseSettings: protectedProcedure
    .input(
      z.object({
        companyName: z.string().optional(),
        maxDevicesPerNode: z.number().optional(),
        enableDeviceSync: z.boolean().optional(),
        enableOfflineAccess: z.boolean().optional(),
        enableAuditLogging: z.boolean().optional(),
        enableIPRestriction: z.boolean().optional(),
        enableTwoFactor: z.boolean().optional(),
        dataRetentionDays: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { updateEnterpriseSettings } = await import("./db-extended");
      await updateEnterpriseSettings(ctx.user.id, input);
      return { success: true };
    }),

  generateApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    const { generateApiKey } = await import("./db-extended");
    const apiKey = await generateApiKey(ctx.user.id);
    return { apiKey };
  }),

  revokeDevice: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { revokeDevice } = await import("./db-extended");
      await revokeDevice(input.deviceId);
      return { success: true };
    }),

  purchaseNodes: protectedProcedure
    .input(
      z.object({
        paradoxId: z.string(),
        nodeCount: z.number().min(1).max(10),
        paymentMethod: z.enum(["eth", "usdc", "btc"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { createNodePurchase } = await import("./db-extended");
      const { getParadoxProductById } = await import("./db");
      const { logAuditEvent } = await import("./db-extended");
      const product = await getParadoxProductById(input.paradoxId);

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const pricePerNode =
        input.paymentMethod === "eth"
          ? product.priceEth
          : input.paymentMethod === "usdc"
            ? product.priceUsdc
            : product.priceBtc;

      const totalPrice = (parseFloat(pricePerNode.toString()) * input.nodeCount).toFixed(8);
      const purchaseId = await createNodePurchase(
        ctx.user.id,
        input.paradoxId,
        input.nodeCount,
        pricePerNode.toString(),
        totalPrice,
        input.paymentMethod
      );

      const vaultAddress = `solvex-vault-${purchaseId}`;

      await logAuditEvent(
        "node_purchase_created",
        "success",
        {
          purchaseId,
          nodeCount: input.nodeCount,
          totalPrice,
          paymentMethod: input.paymentMethod,
        },
        ctx.user.id
      );

      return { purchaseId, vaultAddress, totalPrice };
    }),
});
