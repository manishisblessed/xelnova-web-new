import { Injectable } from '@nestjs/common';
import { sellers, products } from '../../data/mock-data';

@Injectable()
export class SellersService {
  findById(id: string) {
    return sellers.find((s) => s.id === id) || null;
  }

  findProducts(id: string) {
    return products.filter((p) => p.sellerId === id);
  }
}
