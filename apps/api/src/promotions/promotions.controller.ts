import { Body, Controller, HttpCode, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ValidateCartDto } from './dto/validate-cart.dto';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

    /**
   * POST /promotions/validate: báo giá và kiểm tra mã khuyến mãi (không cần JWT); trả 200, không phải 201.
   * Trường ngoài DTO (ví dụ price, unitPrice do client tự thêm) bị từ chối 400 bởi ValidationPipe toàn cục
   * trong main.ts (forbidNonWhitelisted). Giá luôn tính từ dữ liệu server.
   */
  @Post('validate')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  validate(@Body() dto: ValidateCartDto) {
    return this.service.validate(dto);
  }
}
