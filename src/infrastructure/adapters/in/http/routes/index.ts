import { Router } from 'express';
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
import { authenticate } from '../middlewares/authenticate';
import { privateNoStore, publicCache } from '../middlewares/cache-headers';
import { imageUpload } from '../middlewares/upload';

export interface HttpDependencies {
  auth: AuthProvider;
  clerkWebhookSecret?: string;
  imageQueries?: ImageQueries;
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

    api.get('/products', publicCache(15), products.list);
    api.get('/products/:id', publicCache(30), products.get);
    api.post('/products', logged, products.create);
    api.patch('/products/:id', logged, products.update);
    api.delete('/products/:id', logged, products.remove);
    api.put('/products/:id/review', logged, products.saveReview);
    api.delete('/products/:id/review', logged, products.removeReview);
    api.post('/products/:id/vote', logged, me.toggleVote);

    api.get('/admin/products', logged, privateNoStore(), products.listAdmin);
    api.post('/uploads/product-image', logged, imageUpload, uploads.productImage);

    api.get('/me', logged, privateNoStore(), me.me);
    api.get('/me/votes', logged, privateNoStore(), me.myVotes);

    api.get('/topics', publicCache(60), topics.list);
    api.post('/topics', logged, topics.create);
    api.put('/topics/order', logged, topics.reorder);
    api.patch('/topics/:id', logged, topics.update);
    api.delete('/topics/:id', logged, topics.remove);

    if (deps.clerkWebhookSecret) {
      api.post(
        '/webhooks/clerk',
        webhooksController(useCases.syncUser, deps.clerkWebhookSecret).clerk,
      );
    }

    if (deps.imageQueries) {
      app.get('/files/:fileName', imagesController(deps.imageQueries).get);
    }

    app.use('/api', api);
  };
}
