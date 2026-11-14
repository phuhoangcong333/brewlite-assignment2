import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class RestockIngredientDto {
  // Hỗ trợ cả 'amount' hoặc 'quantity' hoặc 'stockQuantity' từ Frontend gửi lên
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  stockQuantity?: number;
}

export class CreateIngredientDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit!: string;

  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  stockQuantity!: number;
}

export class RecipeItemInputDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  ingredientId!: number;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amountRequired!: number;
}

export class UpdateProductRecipeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique((item: RecipeItemInputDto) => item?.ingredientId)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemInputDto)
  items!: RecipeItemInputDto[];
}
