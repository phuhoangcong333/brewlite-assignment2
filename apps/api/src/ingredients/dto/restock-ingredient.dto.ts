import { IsNumber, Max, Min } from 'class-validator';

export class RestockIngredientDto {
  @IsNumber({ maxDecimalPlaces: 3, allowNaN: false, allowInfinity: false })
  @Min(0.001)
  @Max(1_000_000_000)
  quantity!: number;
}
