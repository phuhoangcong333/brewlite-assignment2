import {
  IsIn,
  IsInt,
  IsString,
  IsOptional,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647) // khớp kiểu Int của Postgres, tránh lỗi 500 khi orderId quá lớn
  orderId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsString()
  @IsIn(['CARD', 'WALLET'])
  method!: 'CARD' | 'WALLET';

  // Mock: chỉ nhận số thẻ dạng chữ số (cho phép khoảng trắng/gạch ngang).
  // Số cuối 0000 = giả lập thanh toán lỗi.
  @ValidateIf((dto: CreatePaymentDto) => dto.method === 'CARD')
  @IsString()
  @MinLength(4)
  @MaxLength(32)
  @Matches(/^[0-9][0-9 -]*[0-9]$/, { message: 'cardNumber chỉ gồm chữ số' })
  cardNumber?: string;

  @ValidateIf((dto: CreatePaymentDto) => dto.method === 'WALLET')
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  walletId?: string;
}
