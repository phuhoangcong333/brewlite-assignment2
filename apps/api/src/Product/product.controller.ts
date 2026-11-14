import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getProducts(@Query('category') category?: string) {
    return await this.productService.getAllProducts(category);
  }

  @Get(':id')
  async getProductDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.productService.getProductById(id);
  }
}