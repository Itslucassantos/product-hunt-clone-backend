import { FieldError, ValidationError } from '../errors/validation-error';
import { ProductStatus } from '../value-objects/product-status';
import { Upvotes } from '../value-objects/upvotes';

export class Product {
  private _pendingUpvoteDelta = 0;

  private constructor(
    readonly id: string,
    private _title: string,
    private _description: string,
    private _longDescription: string | null,
    private _url: string,
    private _imageUrl: string | null,
    private _status: ProductStatus,
    private _upvotes: Upvotes,
    private _topicIds: string[],
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(
    id: string,
    title: string,
    description: string,
    longDescription: string | null,
    url: string,
    imageUrl: string | null,
    status: ProductStatus,
    topicIds: string[],
    now: Date,
  ): Product {
    Product.assertValid(title, description, url);
    const product = new Product(
      id,
      title.trim(),
      description.trim(),
      longDescription,
      url.trim(),
      imageUrl,
      status,
      Upvotes.zero(),
      [...new Set(topicIds)],
      now,
      now,
    );
    product.assertHasTopic();
    return product;
  }

  static restore(
    id: string,
    title: string,
    description: string,
    longDescription: string | null,
    url: string,
    imageUrl: string | null,
    status: ProductStatus,
    upvotes: Upvotes,
    topicIds: string[],
    createdAt: Date,
    updatedAt: Date,
  ): Product {
    return new Product(
      id,
      title,
      description,
      longDescription,
      url,
      imageUrl,
      status,
      upvotes,
      topicIds,
      createdAt,
      updatedAt,
    );
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get longDescription(): string | null {
    return this._longDescription;
  }

  get url(): string {
    return this._url;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get status(): ProductStatus {
    return this._status;
  }

  get upvotes(): number {
    return this._upvotes.value;
  }

  get topicIds(): string[] {
    return [...this._topicIds];
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get pendingUpvoteDelta(): number {
    return this._pendingUpvoteDelta;
  }

  clearPendingUpvoteDelta(): void {
    this._pendingUpvoteDelta = 0;
  }

  isVotable(): boolean {
    return this._status === 'PUBLISHED';
  }

  addUpvote(): void {
    this._upvotes = this._upvotes.increment();
    this._pendingUpvoteDelta += 1;
  }

  removeUpvote(): void {
    this._upvotes = this._upvotes.decrement();
    this._pendingUpvoteDelta -= 1;
  }

  publish(now: Date): void {
    this._status = 'PUBLISHED';
    this._updatedAt = now;
  }

  markAsComingSoon(now: Date): void {
    this._status = 'COMING_SOON';
    this._updatedAt = now;
  }

  replaceTopics(topicIds: string[], now: Date): void {
    const unique = [...new Set(topicIds)];
    Product.assertTopicIds(unique);
    this._topicIds = unique;
    this._updatedAt = now;
  }

  assertHasTopic(): void {
    Product.assertTopicIds(this._topicIds);
  }

  hasTopic(topicId: string): boolean {
    return this._topicIds.includes(topicId);
  }

  update(
    title: string,
    description: string,
    longDescription: string | null,
    url: string,
    imageUrl: string | null,
    now: Date,
  ): void {
    Product.assertValid(title, description, url);
    this._title = title.trim();
    this._description = description.trim();
    this._longDescription = longDescription;
    this._url = url.trim();
    this._imageUrl = imageUrl;
    this._updatedAt = now;
  }

  private static assertTopicIds(topicIds: string[]): void {
    if (topicIds.length === 0) {
      throw new ValidationError([{ field: 'topicIds', code: 'REQUIRED' }]);
    }
  }

  private static assertValid(title: string, description: string, url: string): void {
    const errors: FieldError[] = [];

    if (!title.trim()) errors.push({ field: 'title', code: 'REQUIRED' });
    if (!description.trim()) errors.push({ field: 'description', code: 'REQUIRED' });
    if (!url.trim()) {
      errors.push({ field: 'url', code: 'REQUIRED' });
    } else if (!URL.canParse(url.trim())) {
      errors.push({ field: 'url', code: 'INVALID_VALUE' });
    }

    if (errors.length > 0) throw new ValidationError(errors);
  }
}
