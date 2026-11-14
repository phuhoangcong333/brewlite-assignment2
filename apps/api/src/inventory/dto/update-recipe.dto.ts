import { Type } from 'class-transformer';
import { Size } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsEnum,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class RecipeIngredientDto {
  @IsOptional()
  @IsEnum(Size)
  size?: Size;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  ingredientId!: number;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantity!: number;
}

// Compatibility for PATCH /products/:id/recipe; canonical TV4 DTO uses items/amountRequired.
export class UpdateRecipeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique(
    (entry: RecipeIngredientDto) =>
      `${entry?.size ?? 'ALL'}:${entry?.ingredientId}`,
  )
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
}
