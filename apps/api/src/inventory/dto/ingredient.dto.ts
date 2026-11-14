import { Type } from 'class-transformer';
import { Size } from '@prisma/client';
import {
  IsEnum,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RestockIngredientDto {
  // Hỗ trợ cả 'amount' hoặc 'quantity' hoặc 'stockQuantity' từ Frontend gửi lên
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  stockQuantity?: number;
}

export class CreateIngredientDto {
  @IsString()
  name!: string;

  @IsString()
  unit!: string;

  @IsInt()
  @Min(0)
  stockQuantity!: number;
}

export class RecipeItemInputDto {
  @IsEnum(Size)
  size!: Size;

  @IsInt()
  @Min(1)
  ingredientId!: number;

  @IsInt()
  @Min(1)
  amountRequired!: number;
}

export class UpdateProductRecipeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemInputDto)
  items!: RecipeItemInputDto[];
}
