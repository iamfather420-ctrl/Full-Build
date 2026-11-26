import { timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { verifyOidcTenantToken } from '../../packages/db/src/index.js';
import daisyBackendRouter from './DaisyBackendRouter.js';

const router = Router();

function equalSecret(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected || expected.length < 32 || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}

const verifyProxyAndTenant: (req: Request, res: Response, next: NextFunction) => Promise<void> =
  async (req, res, next) => {
    const expectedProxySecret = process.env.DAISY_PROXY_SHARED_SECRET;
    if (!equalSecret(req.get('x-daisy-proxy-key'), expectedProxySecret)) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(401).json({ success: false, status: 'BLOCKED', code: 'PROXY_AUTHENTICATION_REQUIRED' });
      return;
    }

    const authorization = req.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ') || authorization.length > 8_200) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(401).json({ success: false, status: 'BLOCKED', code: 'TENANT_TOKEN_REQUIRED' });
      return;
    }

    try {
      const token = authorization.slice(7);
      const claims = await verifyOidcTenantToken(token);
      const userId = claims?.user_id;
      const tenantId = claims?.tenant_id;
      const role = claims?.role;
      if (!claims || typeof userId !== 'string' || !userId ||
          typeof tenantId !== 'string' || !tenantId ||
          !['OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER'].includes(String(role))) {
        res.setHeader('Cache-Control', 'no-store');
        res.status(401).json({ success: false, status: 'BLOCKED', code: 'TENANT_TOKEN_INVALID' });
        return;
      }

      const request = req as Request & {
        user?: { id: string };
        tenantClaims?: Record<string, unknown>;
        tenantToken?: string;
        isAuthenticated?: () => boolean;
      };
      request.user = { id: userId };
      request.tenantClaims = claims;
      request.tenantToken = token;
      request.isAuthenticated = () => true;
      next();
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json({ success: false, status: 'BLOCKED', code: 'TENANT_TOKEN_VERIFICATION_UNAVAILABLE' });
    }
  };

router.use(verifyProxyAndTenant, daisyBackendRouter);
export default router;
