import type { Request, Response } from 'express';
import { CreateProductUseCase } from '../../../../../application/ports/in/products/create-product';
import { DeleteProductUseCase } from '../../../../../application/ports/in/products/delete-product';
import { GetProductUseCase } from '../../../../../application/ports/in/products/get-product';
import { ListAdminProductsUseCase } from '../../../../../application/ports/in/products/list-admin-products';
import { ListProductsUseCase } from '../../../../../application/ports/in/products/list-products';
import { RemoveProductReviewUseCase } from '../../../../../application/ports/in/products/remove-product-review';
import { SaveProductReviewUseCase } from '../../../../../application/ports/in/products/save-product-review';
import { UpdateProductUseCase } from '../../../../../application/ports/in/products/update-product';
import { actorOf } from '../middlewares/authenticate';
import { idParam, localeQuery } from '../schemas/common.schemas';
import {
  createProductBody,
  listProductsQuery,
  reviewBody,
  updateProductBody,
} from '../schemas/product.schemas';

export interface ProductsUseCases {
  listProducts: ListProductsUseCase;
  getProduct: GetProductUseCase;
  listAdminProducts: ListAdminProductsUseCase;
  createProduct: CreateProductUseCase;
  updateProduct: UpdateProductUseCase;
  deleteProduct: DeleteProductUseCase;
  saveProductReview: SaveProductReviewUseCase;
  removeProductReview: RemoveProductReviewUseCase;
}

export function productsController(useCases: ProductsUseCases) {
  return {
    async list(req: Request, res: Response) {
      const query = listProductsQuery.parse(req.query);
      res.json(
        await useCases.listProducts.execute({
          locale: query.locale,
          status: query.status,
          topicSlug: query.topic,
          reviewed: query.reviewed,
        }),
      );
    },

    async get(req: Request, res: Response) {
      const { id } = idParam.parse(req.params);
      const { locale } = localeQuery.parse(req.query);
      res.json(await useCases.getProduct.execute({ productId: id, locale }));
    },

    async listAdmin(req: Request, res: Response) {
      const { locale } = localeQuery.parse(req.query);
      res.json(await useCases.listAdminProducts.execute({ actor: actorOf(res), locale }));
    },

    async create(req: Request, res: Response) {
      const body = createProductBody.parse(req.body);
      const output = await useCases.createProduct.execute({ actor: actorOf(res), ...body });
      res.status(201).json(output);
    },

    async update(req: Request, res: Response) {
      const { id } = idParam.parse(req.params);
      const body = updateProductBody.parse(req.body);
      await useCases.updateProduct.execute({ actor: actorOf(res), productId: id, ...body });
      res.status(204).end();
    },

    async remove(req: Request, res: Response) {
      const { id } = idParam.parse(req.params);
      await useCases.deleteProduct.execute({ actor: actorOf(res), productId: id });
      res.status(204).end();
    },

    async saveReview(req: Request, res: Response) {
      const { id } = idParam.parse(req.params);
      const body = reviewBody.parse(req.body);
      await useCases.saveProductReview.execute({ actor: actorOf(res), productId: id, ...body });
      res.status(204).end();
    },

    async removeReview(req: Request, res: Response) {
      const { id } = idParam.parse(req.params);
      await useCases.removeProductReview.execute({ actor: actorOf(res), productId: id });
      res.status(204).end();
    },
  };
}
