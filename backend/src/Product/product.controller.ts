import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ProductService } from "./product.service";

@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Get()
    async getProducts() {
        return await this.productService.getAllProducts();
    }

    @Get(':id')
    async getProductDetail(@Param('id', ParseIntPipe) id: number) {
        return await this.productService.getProductById(id);
    }
}