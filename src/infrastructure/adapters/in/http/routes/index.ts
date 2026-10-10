import { Router } from 'express';
import type { Registry } from 'prom-client';
import type { Express } from 'express';
import { AuthProvider } from '../../../../../application/ports/out/auth/auth-provider';
import { SyncUserUseCase } from '../../../../../application/ports/in/users/sync-user';
import { ProductsUseCases, productsController } from '../controllers/products.controller';
import { imagesController } from '../controllers/images.controller';
import { ImageQueries } from '../../../../../application/ports/out/products/image-queries';
import { MeUseCases, meController } from '../controllers/me.controller';
import { TopicsUseCases, topicsController } from '../controllers/topics.controller';
import { uploadsController } from '../controllers/uploads.controller';
import { webhooksController } from '../controllers/webhooks.controller';
import { UploadProductImageUseCase } from '../../../../../application/ports/in/products/upload-product-image';
import { RateLimiter } from '../../../../../application/ports/out/shared/rate-limiter';
import type { Logger } from '../../../../logging/logger';
import { auditAdminWrites } from '../middlewares/audit-log';
import { RATE_LIMITS, rateLimit } from '../middlewares/rate-limit';
import { UnauthenticatedError } from '../../../../../domain/errors/unauthenticated-error';
import { authenticate } from '../middlewares/authenticate';
import { privateNoStore, publicCache } from '../middlewares/cache-headers';
import { imageUpload } from '../middlewares/upload';

export interface HttpDependencies {
  auth: AuthProvider;
  clerkWebhookSecret?: string;
  imageQueries?: ImageQueries;
  rateLimiter: RateLimiter;
  logger: Logger;
  metrics?: { registry: Registry; token: string };
  useCases: ProductsUseCases &
    TopicsUseCases &
    MeUseCases & {
      syncUser: SyncUserUseCase;
      uploadProductImage: UploadProductImageUseCase;
    };
}

export function registerRoutes(deps: HttpDependencies): (app: Express) => void {
  const { useCases } = deps;
  const products = productsController(useCases);
  const topics = topicsController(useCases);
  const me = meController(useCases);
  const uploads = uploadsController(useCases.uploadProductImage);
  const logged = authenticate(deps.auth, useCases.syncUser);

  return (app) => {
    const api = Router();
    const publicRead = rateLimit(deps.rateLimiter, RATE_LIMITS.publicRead);
    const adminWrite = rateLimit(deps.rateLimiter, RATE_LIMITS.adminWrite);
    const voteLimit = rateLimit(deps.rateLimiter, RATE_LIMITS.vote);
    const uploadLimit = rateLimit(deps.rateLimiter, RATE_LIMITS.upload);

    api.use(auditAdminWrites(deps.logger));

    api.get('/products', publicRead, publicCache(15), products.list);
    api.get('/products/:id', publicRead, publicCache(30), products.get);
    api.post('/products', logged, adminWrite, products.create);
    api.patch('/products/:id', logged, adminWrite, products.update);
    api.delete('/products/:id', logged, adminWrite, products.remove);
    api.put('/products/:id/review', logged, adminWrite, products.saveReview);
    api.delete('/products/:id/review', logged, adminWrite, products.removeReview);
    api.post('/products/:id/vote', logged, voteLimit, me.toggleVote);

    api.get('/admin/products', logged, privateNoStore(), products.listAdmin);
    api.post('/uploads/product-image', logged, uploadLimit, imageUpload, uploads.productImage);

    api.get('/me', logged, privateNoStore(), me.me);
    api.get('/me/votes', logged, privateNoStore(), me.myVotes);

    api.get('/topics', publicRead, publicCache(60), topics.list);
    api.post('/topics', logged, adminWrite, topics.create);
    api.put('/topics/order', logged, adminWrite, topics.reorder);
    api.patch('/topics/:id', logged, adminWrite, topics.update);
    api.delete('/topics/:id', logged, adminWrite, topics.remove);

    if (deps.clerkWebhookSecret) {
      api.post(
        '/webhooks/clerk',
        webhooksController(useCases.syncUser, deps.clerkWebhookSecret).clerk,
      );
    }

    if (deps.metrics) {
      const { registry, token } = deps.metrics;
      app.get('/metrics', async (req, res) => {
        if (req.header('authorization') !== `Bearer ${token}`) throw new UnauthenticatedError();
        res.setHeader('Content-Type', registry.contentType);
        res.send(await registry.metrics());
      });
    }

    if (deps.imageQueries) {
      app.get('/files/:fileName', imagesController(deps.imageQueries).get);
    }

    app.use('/api', api);
  };
}
