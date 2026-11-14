import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateRecipeDto } from '../ingredients/dto/update-recipe.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getProducts() {
    return await this.productService.getAllProducts();
  }

  @Get(':id')
  async getProductDetail(@Param('id', ParseIntPipe) id: number) {
    return await this.productService.getProductById(id);
  }

  @Get(':id/recipe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF')
  getRecipe(@Param('id', ParseIntPipe) id: number) {
    return this.productService.getRecipe(id);
  }

  @Patch(':id/recipe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF')
  updateRecipe(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.productService.updateRecipe(id, dto);
  }
}
