import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RestockIngredientDto } from './dto/restock-ingredient.dto';
import { IngredientsService } from './ingredients.service';

@Controller('ingredients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF')
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get()
  list() {
    return this.ingredients.list();
  }

  @Patch(':id/restock')
  restock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RestockIngredientDto,
  ) {
    return this.ingredients.restock(id, dto.quantity);
  }
}
